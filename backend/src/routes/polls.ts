import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '../models/db';
import { polls, users, pollAuditors, pollEditors, pollParticipants } from '../models/schema';
import { AppBindings, JWTPayload } from '../types';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, adminMiddleware, subAdminMiddleware } from '../middleware/auth';

const pollRoutes = new Hono<{ Bindings: AppBindings; Variables: { user?: JWTPayload } }>();

// Ballot option schema
const ballotOptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  link: z.string().optional(),
  image: z.string().optional(),
});

// Ballot question schema
const ballotQuestionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  randomizedOrder: z.boolean().optional().default(false),
  minSelection: z.number().optional().default(1),
  maxSelection: z.number().optional().default(1),
  attachments: z.array(z.string()).optional().default([]),
  options: z.array(ballotOptionSchema),
});

// Poll settings schema
const pollSettingsSchema = z.object({
  showParticipantNames: z.boolean().optional().default(false),
  showVoteWeights: z.boolean().optional().default(false),
  showVoteCounts: z.boolean().optional().default(false),
  showResultsBeforeEnd: z.boolean().optional().default(false),
  allowResultsView: z.boolean().optional().default(true),
  voteWeightEnabled: z.boolean().optional().default(false),
});

// Create poll schema
const createPollSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startDate: z.number(),
  endDate: z.number(),
  managerId: z.string(),
  settings: pollSettingsSchema.optional().default({}),
  ballot: z.array(ballotQuestionSchema).optional().default([]),
});

// Update poll schema
const updatePollSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  settings: pollSettingsSchema.optional(),
  ballot: z.array(ballotQuestionSchema).optional(),
});

// Apply auth middleware to all routes
pollRoutes.use('/*', authMiddleware);

// Create poll (admin only)
pollRoutes.post('/', adminMiddleware, zValidator('json', createPollSchema), async (c) => {
  const pollData = c.req.valid('json');
  const currentUser = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    // Verify manager exists and is a sub-admin
    const manager = await db.select().from(users).where(eq(users.id, pollData.managerId)).get();
    if (!manager || manager.role !== 'sub-admin') {
      return c.json({ error: 'Manager must be a sub-admin' }, 400);
    }

    // Create poll
    const newPoll = await db.insert(polls).values({
      title: pollData.title,
      description: pollData.description,
      startDate: pollData.startDate,
      endDate: pollData.endDate,
      managerId: pollData.managerId,
      createdById: currentUser.userId,
      settings: pollData.settings,
      ballot: pollData.ballot,
    }).returning().get();

    return c.json({
      message: 'Poll created successfully',
      poll: newPoll,
    });
  } catch (error) {
    console.error('Create poll error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get all polls (admin sees all, sub-admin sees assigned and auditing)
pollRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    let userPolls;

    if (user.role === 'admin') {
      // Admin sees all polls
      userPolls = await db.select().from(polls).all();
    } else if (user.role === 'sub-admin') {
      // Sub-admin sees polls they manage or audit
      const managedPolls = await db.select().from(polls).where(eq(polls.managerId, user.userId)).all();
      const auditedPolls = await db.select({
        id: polls.id,
        title: polls.title,
        description: polls.description,
        startDate: polls.startDate,
        endDate: polls.endDate,
        status: polls.status,
        managerId: polls.managerId,
        createdById: polls.createdById,
        settings: polls.settings,
        ballot: polls.ballot,
        createdAt: polls.createdAt,
        updatedAt: polls.updatedAt,
      }).from(polls)
        .innerJoin(pollAuditors, eq(pollAuditors.pollId, polls.id))
        .where(eq(pollAuditors.userId, user.userId))
        .all();

      userPolls = [...managedPolls, ...auditedPolls];
    } else {
      // Regular users see polls they're participating in
      userPolls = await db.select({
        id: polls.id,
        title: polls.title,
        description: polls.description,
        startDate: polls.startDate,
        endDate: polls.endDate,
        status: polls.status,
        managerId: polls.managerId,
        createdById: polls.createdById,
        settings: polls.settings,
        ballot: polls.ballot,
        createdAt: polls.createdAt,
        updatedAt: polls.updatedAt,
      }).from(polls)
        .innerJoin(pollParticipants, eq(pollParticipants.pollId, polls.id))
        .where(and(
          eq(pollParticipants.userId, user.userId),
          eq(pollParticipants.status, 'approved')
        ))
        .all();
    }

    return c.json({ polls: userPolls });
  } catch (error) {
    console.error('Get polls error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get poll by ID
pollRoutes.get('/:id', async (c) => {
  const pollId = c.req.param('id');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check if user has access to this poll
    let hasAccess = false;
    if (user.role === 'admin') {
      hasAccess = true;
    } else if (user.role === 'sub-admin') {
      // Check if user is manager or auditor
      const isManager = poll.managerId === user.userId;
      const isAuditor = await db.select().from(pollAuditors)
        .where(and(eq(pollAuditors.pollId, pollId), eq(pollAuditors.userId, user.userId)))
        .get();
      hasAccess = isManager || !!isAuditor;
    } else {
      // Check if user is a participant
      const isParticipant = await db.select().from(pollParticipants)
        .where(and(
          eq(pollParticipants.pollId, pollId),
          eq(pollParticipants.userId, user.userId),
          eq(pollParticipants.status, 'approved')
        ))
        .get();
      hasAccess = !!isParticipant;
    }

    if (!hasAccess) {
      return c.json({ error: 'Access denied' }, 403);
    }

    return c.json({ poll });
  } catch (error) {
    console.error('Get poll error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update poll (admin or assigned sub-admin)
pollRoutes.put('/:id', zValidator('json', updatePollSchema), async (c) => {
  const pollId = c.req.param('id');
  const updateData = c.req.valid('json');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check permissions
    if (user.role !== 'admin' && poll.managerId !== user.userId) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Check if poll has started (only certain updates allowed)
    if (poll.status === 'active' && poll.startDate <= Date.now()) {
      // Only allow specific updates after poll has started
      const allowedUpdates = ['settings'];
      const updateKeys = Object.keys(updateData);
      const hasRestrictedUpdates = updateKeys.some(key => !allowedUpdates.includes(key));
      
      if (hasRestrictedUpdates) {
        return c.json({ error: 'Cannot modify poll details after it has started' }, 400);
      }
    }

    // Update poll
    const updatedPoll = await db.update(polls)
      .set({
        ...updateData,
        updatedAt: Date.now(),
      })
      .where(eq(polls.id, pollId))
      .returning()
      .get();

    return c.json({
      message: 'Poll updated successfully',
      poll: updatedPoll,
    });
  } catch (error) {
    console.error('Update poll error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete poll (admin only)
pollRoutes.delete('/:id', adminMiddleware, async (c) => {
  const pollId = c.req.param('id');
  const db = getDb(c.env.DB);

  try {
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    await db.delete(polls).where(eq(polls.id, pollId));

    return c.json({ message: 'Poll deleted successfully' });
  } catch (error) {
    console.error('Delete poll error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default pollRoutes;

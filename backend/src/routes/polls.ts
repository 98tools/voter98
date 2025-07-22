import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '../models/db';
import { polls, users, pollAuditors, pollEditors, pollParticipants, pollVotes } from '../models/schema';
import { AppBindings, JWTPayload } from '../types';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, adminMiddleware, subAdminMiddleware } from '../middleware/auth';
import { verifyPassword, generateRandomToken } from '../utils/auth';

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
  allowVoteChanges: z.boolean().optional().default(false),
});

// Create poll schema
const createPollSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
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
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
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

    // Default start and end dates for drafts (can be updated later)
    const defaultStartDate = pollData.startDate || Date.now();
    const defaultEndDate = pollData.endDate || (Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Create poll
    const newPoll = await db.insert(polls).values({
      title: pollData.title,
      description: pollData.description,
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      managerId: pollData.managerId,
      createdById: currentUser.userId,
      settings: pollData.settings,
      ballot: pollData.ballot,
      status: 'draft', // Always create as draft initially
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

// Get participants for a poll (poll manager or admin)
pollRoutes.get('/:id/participants', async (c) => {
  const pollId = c.req.param('id');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    // Check if poll exists
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check permissions - only poll manager or admin can view participants
    if (user.role !== 'admin' && poll.managerId !== user.userId) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Get all participants for this poll
    const participants = await db.select().from(pollParticipants)
      .where(eq(pollParticipants.pollId, pollId))
      .all();

    return c.json({ participants });
  } catch (error) {
    console.error('Get participants error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Add participant to poll (poll manager or admin)
const addParticipantSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  isUser: z.boolean().optional().default(false),
  voteWeight: z.number().positive().optional().default(1.0),
  token: z.string().optional(),
});

pollRoutes.post('/:id/participants', zValidator('json', addParticipantSchema), async (c) => {
  const pollId = c.req.param('id');
  const { email, name, isUser, voteWeight, token } = c.req.valid('json');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    // Check if poll exists
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check permissions - only poll manager or admin can add participants
    if (user.role !== 'admin' && poll.managerId !== user.userId) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Check if participant already exists for this poll
    const existingParticipant = await db.select()
      .from(pollParticipants)
      .where(and(eq(pollParticipants.pollId, pollId), eq(pollParticipants.email, email)))
      .get();
    
    if (existingParticipant) {
      return c.json({ error: 'Participant already exists for this poll' }, 400);
    }

    // For user participants, check if user exists
    let userId = null;
    if (isUser) {
      const existingUser = await db.select().from(users).where(eq(users.email, email)).get();
      if (!existingUser) {
        return c.json({ error: 'User with this email does not exist' }, 400);
      }
      userId = existingUser.id;
    }

    // Generate token for non-user participants
    const participantToken = !isUser ? (token || generateRandomToken()) : null;

    // Create participant with all required fields
    const participant = await db.insert(pollParticipants)
      .values({
        pollId,
        userId,
        email,
        name,
        isUser,
        token: participantToken,
        tokenUsed: false,
        voteWeight,
        status: 'approved', // Auto-approve for manager-created participants
        hasVoted: false,
      })
      .returning()
      .get();

    return c.json({
      message: 'Participant added successfully',
      participant: {
        id: participant.id,
        email: participant.email,
        name: participant.name,
        isUser: participant.isUser,
        token: participant.token,
        voteWeight: participant.voteWeight,
        status: participant.status,
        hasVoted: participant.hasVoted,
      },
    });
  } catch (error) {
    console.error('Add participant error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Remove participant from poll (poll manager or admin)
pollRoutes.delete('/:id/participants/:participantId', async (c) => {
  const pollId = c.req.param('id');
  const participantId = c.req.param('participantId');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    // Check if poll exists
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check permissions - only poll manager or admin can remove participants
    if (user.role !== 'admin' && poll.managerId !== user.userId) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Remove participant
    const deletedParticipant = await db.delete(pollParticipants)
      .where(and(
        eq(pollParticipants.id, participantId),
        eq(pollParticipants.pollId, pollId)
      ))
      .returning()
      .get();

    if (!deletedParticipant) {
      return c.json({ error: 'Participant not found' }, 404);
    }

    return c.json({ message: 'Participant removed successfully' });
  } catch (error) {
    console.error('Remove participant error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update participant (poll manager or admin)
const updateParticipantSchema = z.object({
  voteWeight: z.number().positive().optional(),
  token: z.string().optional(),
});

pollRoutes.put('/:id/participants/:participantId', zValidator('json', updateParticipantSchema), async (c) => {
  const pollId = c.req.param('id');
  const participantId = c.req.param('participantId');
  const updateData = c.req.valid('json');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    // Check if poll exists
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check permissions - only poll manager or admin can update participants
    if (user.role !== 'admin' && poll.managerId !== user.userId) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Update participant
    const updatedParticipant = await db.update(pollParticipants)
      .set({
        ...updateData,
        updatedAt: Date.now(),
      })
      .where(and(
        eq(pollParticipants.id, participantId),
        eq(pollParticipants.pollId, pollId)
      ))
      .returning()
      .get();

    if (!updatedParticipant) {
      return c.json({ error: 'Participant not found' }, 404);
    }

    return c.json({ 
      message: 'Participant updated successfully',
      participant: updatedParticipant
    });
  } catch (error) {
    console.error('Update participant error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Public poll access endpoint - no auth middleware
const publicPollRoutes = new Hono<{ Bindings: AppBindings }>();

// Get poll for public participation (no auth required)
publicPollRoutes.get('/:id/public', async (c) => {
  const pollId = c.req.param('id');
  const db = getDb(c.env.DB);

  try {
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Only return active polls for public access
    if (poll.status !== 'active') {
      return c.json({ error: 'Poll is not currently active' }, 403);
    }

    // Check if poll is within the voting period
    const now = Date.now();
    if (now < poll.startDate || now > poll.endDate) {
      return c.json({ error: 'Poll is not currently open for voting' }, 403);
    }

    // Return poll data without sensitive information
    const publicPoll = {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      startDate: poll.startDate,
      endDate: poll.endDate,
      status: poll.status,
      settings: poll.settings,
      ballot: poll.ballot,
    };

    return c.json({ poll: publicPoll });
  } catch (error) {
    console.error('Get public poll error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Validate participant access
const validateParticipantSchema = z.object({
  email: z.string().email().optional(),
  token: z.string().optional(),
  password: z.string().optional(),
}).refine(data => data.email || data.token, {
  message: "Either email or token must be provided"
});

publicPollRoutes.post('/:id/validate-access', zValidator('json', validateParticipantSchema), async (c) => {
  const pollId = c.req.param('id');
  const { email, token, password } = c.req.valid('json');
  const db = getDb(c.env.DB);

  try {
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    if (poll.status !== 'active') {
      return c.json({ error: 'Poll is not currently active' }, 403);
    }

    const now = Date.now();
    if (now < poll.startDate || now > poll.endDate) {
      return c.json({ error: 'Poll is not currently open for voting' }, 403);
    }

    let participant = null;

    if (token) {
      // Token-based access (non-user participants)
      console.log(`Looking for participant with token: ${token} in poll: ${pollId}`);
      participant = await db.select().from(pollParticipants)
        .where(and(
          eq(pollParticipants.pollId, pollId),
          eq(pollParticipants.token, token),
          eq(pollParticipants.status, 'approved')
        ))
        .get();

      if (!participant) {
        console.log(`No participant found with token: ${token}`);
        return c.json({ error: 'Invalid token or not authorized for this poll' }, 401);
      }

      console.log(`Found participant: ${participant.name}, hasVoted: ${participant.hasVoted}`);
      // Don't mark token as used yet - only mark it when vote is submitted

    } else if (email && password) {
      // User login-based access
      const user = await db.select().from(users).where(eq(users.email, email)).get();
      if (!user) {
        return c.json({ error: 'Invalid credentials' }, 401);
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        return c.json({ error: 'Invalid credentials' }, 401);
      }

      participant = await db.select().from(pollParticipants)
        .where(and(
          eq(pollParticipants.pollId, pollId),
          eq(pollParticipants.userId, user.id),
          eq(pollParticipants.status, 'approved')
        ))
        .get();

      if (!participant) {
        return c.json({ error: 'You are not authorized to participate in this poll' }, 403);
      }
    }

    if (!participant) {
      return c.json({ error: 'Invalid access credentials' }, 401);
    }

    if (participant.hasVoted) {
      const pollSettings = poll.settings as any;
      
      // Generate session token even for voted users (for results and potential re-voting)
      const sessionToken = crypto.randomUUID();
      
      // Store session in KV for 1 hour
      await c.env.VOTER_KV.put(`vote_session:${sessionToken}`, JSON.stringify({
        pollId: pollId,
        participantId: participant.id,
        expires: Date.now() + (60 * 60 * 1000) // 1 hour
      }), { expirationTtl: 3600 });
      
      return c.json({ 
        success: true,
        hasVoted: true,
        allowVoteChanges: pollSettings.allowVoteChanges || false,
        sessionToken,
        participant: {
          id: participant.id,
          name: participant.name,
          email: participant.email,
          voteWeight: participant.voteWeight
        }
      });
    }

    // Generate a temporary session token for voting
    const sessionToken = crypto.randomUUID();
    
    // Store session in KV for 1 hour
    await c.env.VOTER_KV.put(`vote_session:${sessionToken}`, JSON.stringify({
      pollId: pollId,
      participantId: participant.id,
      expires: Date.now() + (60 * 60 * 1000) // 1 hour
    }), { expirationTtl: 3600 });

    return c.json({ 
      success: true,
      sessionToken,
      participant: {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        voteWeight: participant.voteWeight
      }
    });
  } catch (error) {
    console.error('Validate access error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Submit vote
const submitVoteSchema = z.object({
  sessionToken: z.string(),
  votes: z.record(z.array(z.string())), // questionId -> array of selected option IDs
});

publicPollRoutes.post('/:id/vote', zValidator('json', submitVoteSchema), async (c) => {
  const pollId = c.req.param('id');
  const { sessionToken, votes } = c.req.valid('json');
  const db = getDb(c.env.DB);

  try {
    // Validate session token
    const sessionData = await c.env.VOTER_KV.get(`vote_session:${sessionToken}`);
    if (!sessionData) {
      return c.json({ error: 'Invalid or expired session' }, 401);
    }

    const session = JSON.parse(sessionData);
    if (session.pollId !== pollId || session.expires < Date.now()) {
      return c.json({ error: 'Invalid or expired session' }, 401);
    }

    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    const participant = await db.select().from(pollParticipants)
      .where(eq(pollParticipants.id, session.participantId))
      .get();

    if (!participant) {
      return c.json({ error: 'Participant not found' }, 404);
    }

    const pollSettings = poll.settings as any;
    if (participant.hasVoted && !pollSettings.allowVoteChanges) {
      return c.json({ error: 'Vote already submitted and changes are not allowed' }, 403);
    }

    // Validate votes against ballot
    const ballot = poll.ballot as any[];
    for (const question of ballot) {
      const questionVotes = votes[question.id] || [];
      
      if (questionVotes.length < (question.minSelection || 1)) {
        return c.json({ error: `Please select at least ${question.minSelection || 1} option(s) for "${question.title}"` }, 400);
      }
      
      if (questionVotes.length > (question.maxSelection || 1)) {
        return c.json({ error: `Please select at most ${question.maxSelection || 1} option(s) for "${question.title}"` }, 400);
      }

      // Validate that selected options exist
      const validOptionIds = question.options.map((opt: any) => opt.id);
      const invalidSelections = questionVotes.filter(optId => !validOptionIds.includes(optId));
      if (invalidSelections.length > 0) {
        return c.json({ error: `Invalid option selections for "${question.title}"` }, 400);
      }
    }

    // If re-voting, delete existing votes first
    if (participant.hasVoted && pollSettings.allowVoteChanges) {
      await db.delete(pollVotes)
        .where(and(
          eq(pollVotes.pollId, pollId),
          eq(pollVotes.participantId, participant.id)
        ));
    }

    // Store votes
    const voteRecords = [];
    for (const [questionId, selectedOptions] of Object.entries(votes)) {
      voteRecords.push({
        pollId: pollId,
        participantId: participant.id,
        questionId: questionId,
        selectedOptions: selectedOptions,
        voteWeight: participant.voteWeight,
      });
    }

    // Store votes and mark participant as voted
    for (const vote of voteRecords) {
      await db.insert(pollVotes).values(vote);
    }
    
    // Mark participant as voted and token as used (if token-based)
    const updateData: any = { hasVoted: true, updatedAt: Date.now() };
    if (!participant.isUser && participant.token) {
      updateData.tokenUsed = true;
    }
    
    await db.update(pollParticipants)
      .set(updateData)
      .where(eq(pollParticipants.id, participant.id));

    // Clean up session
    await c.env.VOTER_KV.delete(`vote_session:${sessionToken}`);

    return c.json({ 
      success: true,
      message: 'Vote submitted successfully' 
    });
  } catch (error) {
    console.error('Submit vote error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Check if participant has voted
publicPollRoutes.get('/:id/vote-status/:sessionToken', async (c) => {
  const pollId = c.req.param('id');
  const sessionToken = c.req.param('sessionToken');

  try {
    // Validate session token
    const sessionData = await c.env.VOTER_KV.get(`vote_session:${sessionToken}`);
    if (!sessionData) {
      return c.json({ error: 'Invalid session' }, 401);
    }

    const session = JSON.parse(sessionData);
    if (session.pollId !== pollId) {
      return c.json({ error: 'Invalid session' }, 401);
    }

    const db = getDb(c.env.DB);
    const participant = await db.select().from(pollParticipants)
      .where(eq(pollParticipants.id, session.participantId))
      .get();

    if (!participant) {
      return c.json({ error: 'Participant not found' }, 404);
    }

    return c.json({ 
      hasVoted: participant.hasVoted,
      participant: {
        name: participant.name,
        email: participant.email
      }
    });
  } catch (error) {
    console.error('Check vote status error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get poll results (admin, manager, auditors, and participants based on settings)
pollRoutes.get('/:id/results', async (c) => {
  const pollId = c.req.param('id');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check permissions
    let hasAccess = false;
    let accessLevel = 'none'; // 'admin', 'manager', 'auditor', 'participant'

    if (user.role === 'admin') {
      hasAccess = true;
      accessLevel = 'admin';
    } else if (user.role === 'sub-admin') {
      if (poll.managerId === user.userId) {
        hasAccess = true;
        accessLevel = 'manager';
      } else {
        // Check if user is an auditor
        const isAuditor = await db.select().from(pollAuditors)
          .where(and(eq(pollAuditors.pollId, pollId), eq(pollAuditors.userId, user.userId)))
          .get();
        if (isAuditor) {
          hasAccess = true;
          accessLevel = 'auditor';
        }
      }
    } else {
      // Check if user is a participant
      const participant = await db.select().from(pollParticipants)
        .where(and(
          eq(pollParticipants.pollId, pollId),
          eq(pollParticipants.userId, user.userId),
          eq(pollParticipants.status, 'approved')
        ))
        .get();
      
      if (participant && poll.settings.allowResultsView) {
        hasAccess = true;
        accessLevel = 'participant';
      }
    }

    if (!hasAccess) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Get poll results data
    const results = await calculatePollResults(db, poll, accessLevel);
    
    return c.json({ results });
  } catch (error) {
    console.error('Get poll results error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Public poll results (for participants with session tokens)
publicPollRoutes.get('/:id/results/:sessionToken?', async (c) => {
  const pollId = c.req.param('id');
  const sessionToken = c.req.param('sessionToken');
  const db = getDb(c.env.DB);

  try {
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check if results are allowed for participants
    if (!poll.settings.allowResultsView) {
      return c.json({ error: 'Results viewing is not allowed for this poll' }, 403);
    }

    let participant = null;
    
    // If session token provided, validate it
    if (sessionToken) {
      const sessionData = await c.env.VOTER_KV.get(`vote_session:${sessionToken}`);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.pollId === pollId) {
          participant = await db.select().from(pollParticipants)
            .where(eq(pollParticipants.id, session.participantId))
            .get();
        }
      }
    }

    // Calculate results with participant-level access
    const results = await calculatePollResults(db, poll, 'participant', participant);
    
    return c.json({ results });
  } catch (error) {
    console.error('Get public poll results error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Helper function to calculate poll results
async function calculatePollResults(db: any, poll: any, accessLevel: string, participant?: any) {
  const pollId = poll.id;
  const settings = poll.settings;
  const now = Date.now();
  const pollEnded = now > poll.endDate || poll.status === 'completed';

  // Get all participants
  const participants = await db.select().from(pollParticipants)
    .where(eq(pollParticipants.pollId, pollId))
    .all();

  // Get all votes
  const votes = await db.select().from(pollVotes)
    .where(eq(pollVotes.pollId, pollId))
    .all();

  // Get poll manager and auditors
  const manager = await db.select().from(users)
    .where(eq(users.id, poll.managerId))
    .get();

  const auditors = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
  }).from(pollAuditors)
    .innerJoin(users, eq(pollAuditors.userId, users.id))
    .where(eq(pollAuditors.pollId, pollId))
    .all();

  // Calculate basic statistics
  const totalParticipants = participants.length;
  const votedParticipants = participants.filter(p => p.hasVoted).length;
  const participationRate = totalParticipants > 0 ? (votedParticipants / totalParticipants) * 100 : 0;

  // Calculate total vote weight
  const totalVoteWeight = votes.reduce((sum, vote) => sum + vote.voteWeight, 0);

  // Process votes by question
  const questionResults = poll.ballot.map((question: any) => {
    const questionVotes = votes.filter(vote => vote.questionId === question.id);
    
    // Calculate results by option
    const optionResults = question.options.map((option: any) => {
      const optionVotes = questionVotes.filter(vote => 
        (vote.selectedOptions as string[]).includes(option.id)
      );
      
      const voteCount = optionVotes.length;
      const weightedVoteCount = optionVotes.reduce((sum, vote) => sum + vote.voteWeight, 0);
      const percentage = questionVotes.length > 0 ? (voteCount / questionVotes.length) * 100 : 0;
      const weightedPercentage = totalVoteWeight > 0 ? (weightedVoteCount / totalVoteWeight) * 100 : 0;

      return {
        optionId: option.id,
        title: option.title,
        voteCount,
        weightedVoteCount,
        percentage: Math.round(percentage * 100) / 100,
        weightedPercentage: Math.round(weightedPercentage * 100) / 100,
      };
    });

    return {
      questionId: question.id,
      title: question.title,
      totalVotes: questionVotes.length,
      totalWeightedVotes: questionVotes.reduce((sum, vote) => sum + vote.voteWeight, 0),
      options: optionResults,
    };
  });

  // Build participant data based on access level and settings
  let participantData = [];
  if (accessLevel === 'admin' || accessLevel === 'manager' || accessLevel === 'auditor') {
    // Full access - can see all participant details
    participantData = participants.map(p => {
      const participantVotes = votes.filter(v => v.participantId === p.id);
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        isUser: p.isUser,
        voteWeight: p.voteWeight,
        hasVoted: p.hasVoted,
        votedAt: participantVotes.length > 0 ? Math.max(...participantVotes.map(v => v.createdAt)) : null,
      };
    });
  } else if (accessLevel === 'participant') {
    // Limited access based on poll settings
    if (settings.showParticipantNames) {
      participantData = participants
        .filter(p => p.hasVoted)
        .map(p => ({
          name: p.name,
          voteWeight: settings.showVoteWeights ? p.voteWeight : undefined,
          hasVoted: true,
        }));
    } else {
      // Only show anonymous vote weights if enabled
      if (settings.voteWeightEnabled) {
        participantData = participants
          .filter(p => p.hasVoted)
          .map(p => ({
            voteWeight: p.voteWeight,
            hasVoted: true,
          }));
      }
    }
  }

  // Determine what data to show based on access level and settings
  const showVoteCounts = pollEnded || settings.showVoteCounts || 
    ['admin', 'manager', 'auditor'].includes(accessLevel);
  
  const showResultsBreakdown = pollEnded || settings.showResultsBeforeEnd || 
    ['admin', 'manager', 'auditor'].includes(accessLevel);

  return {
    poll: {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      startDate: poll.startDate,
      endDate: poll.endDate,
      status: poll.status,
      manager: {
        name: manager?.name,
        email: manager?.email,
      },
      auditors: auditors,
      voteWeightEnabled: settings.voteWeightEnabled,
    },
    statistics: {
      totalParticipants,
      votedParticipants,
      participationRate: Math.round(participationRate * 100) / 100,
      totalVoteWeight: settings.voteWeightEnabled ? totalVoteWeight : undefined,
    },
    questions: showResultsBreakdown ? questionResults : questionResults.map(q => ({
      questionId: q.questionId,
      title: q.title,
      totalVotes: showVoteCounts ? q.totalVotes : undefined,
      totalWeightedVotes: showVoteCounts && settings.voteWeightEnabled ? q.totalWeightedVotes : undefined,
    })),
    participants: participantData,
    permissions: {
      canViewFullResults: ['admin', 'manager', 'auditor'].includes(accessLevel),
      canViewVoteCounts: showVoteCounts,
      canViewResultsBreakdown: showResultsBreakdown,
      canViewParticipantNames: ['admin', 'manager', 'auditor'].includes(accessLevel) || (accessLevel === 'participant' && settings.showParticipantNames),
      canViewVoteWeights: ['admin', 'manager', 'auditor'].includes(accessLevel) || (accessLevel === 'participant' && settings.showVoteWeights),
    },
  };
}

export { publicPollRoutes };
export default pollRoutes;

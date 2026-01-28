import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '../models/db';
import { polls, users, pollAuditors, pollEditors, pollParticipants, pollVotes, userGroups, auditEvents } from '../models/schema';
import { AppBindings, JWTPayload } from '../types';
import { eq, and, not, inArray, ne } from 'drizzle-orm';
import { authMiddleware, adminMiddleware, subAdminMiddleware, pollAccessMiddleware } from '../middleware/auth';
import { verifyPassword, generateRandomToken } from '../utils/auth';
import { toLocaleDateString } from '../utils/timezone';

// Helper function to log audit events for active polls
async function logAuditEvent(
  db: any,
  eventType: string,
  actorUserId: string,
  pollId: string,
  participantId: string | null,
  meta: any,
  ipAddress: string | null,
  userAgent: string | null
) {
  try {
    await db.insert(auditEvents).values({
      eventType,
      actorUserId,
      pollId,
      participantId,
      meta: meta ? JSON.stringify(meta) : null,
      ipAddress,
      userAgent,
      createdAt: Date.now()
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}

// Helper function to check if poll is active and audit logging should be enabled
async function shouldAuditPoll(db: any, pollId: string): Promise<boolean> {
  const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
  return poll && poll.status === 'active';
}

// Permission types for different poll roles
type PollPermissions = {
  canView: boolean;
  canEdit: boolean;
  canManage: boolean;
  canAudit: boolean;
  canViewResults: boolean;
  canViewParticipants: boolean;
  canManageParticipants: boolean;
  canViewSettings: boolean;
  canEditSettings: boolean;
  canDelete: boolean;
};

// Helper function to check user permissions for a specific poll
async function getUserPollPermissions(
  db: any,
  userId: string,
  userRole: string,
  pollId: string
): Promise<PollPermissions> {
  const permissions: PollPermissions = {
    canView: false,
    canEdit: false,
    canManage: false,
    canAudit: false,
    canViewResults: false,
    canViewParticipants: false,
    canManageParticipants: false,
    canViewSettings: false,
    canEditSettings: false,
    canDelete: false,
  };

  // Get poll details
  const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
  if (!poll) return permissions;

  // Admin has all permissions
  if (userRole === 'admin') {
    return {
      canView: true,
      canEdit: true,
      canManage: true,
      canAudit: true,
      canViewResults: true,
      canViewParticipants: true,
      canManageParticipants: true,
      canViewSettings: true,
      canEditSettings: true,
      canDelete: true,
    };
  }

  // Check if user is the poll manager
  if (poll.managerId === userId) {
    return {
      canView: true,
      canEdit: true,
      canManage: true,
      canAudit: true,
      canViewResults: true,
      canViewParticipants: true,
      canManageParticipants: true,
      canViewSettings: true,
      canEditSettings: true,
      canDelete: false, // Only admin can delete
    };
  }

  // Check if user is an auditor
  const auditor = await db.select().from(pollAuditors)
    .where(and(eq(pollAuditors.pollId, pollId), eq(pollAuditors.userId, userId)))
    .get();
  
  if (auditor) {
    permissions.canView = true;
    permissions.canAudit = true;
    permissions.canViewResults = true;
    permissions.canViewParticipants = true;
    permissions.canViewSettings = true;
    // Auditors can view but not edit
  }

  // Check if user is an editor
  const editor = await db.select().from(pollEditors)
    .where(and(eq(pollEditors.pollId, pollId), eq(pollEditors.userId, userId)))
    .get();
  
  if (editor) {
    permissions.canView = true;
    permissions.canEdit = true;
    permissions.canViewResults = true;
    permissions.canViewParticipants = true;
    permissions.canManageParticipants = true;
    permissions.canViewSettings = true;
    permissions.canEditSettings = true;
    // Editors can edit poll content and some settings
  }

  // Check if user is a participant
  const participant = await db.select().from(pollParticipants)
    .where(and(
      eq(pollParticipants.pollId, pollId), 
      eq(pollParticipants.userId, userId),
      eq(pollParticipants.status, 'approved')
    ))
    .get();
  
  if (participant) {
    permissions.canView = true;
    permissions.canViewResults = true; // Depends on poll settings
  }

  return permissions;
}

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
  image: z.string().optional(),
  options: z.array(ballotOptionSchema),
});

// Poll settings schema
const pollSettingsSchema = z.object({
  showParticipantNames: z.boolean().optional().default(false),
  showParticipantInitials: z.boolean().optional().default(false),
  showVoteWeights: z.boolean().optional().default(false),
  showVoteCounts: z.boolean().optional().default(false),
  showResultsBeforeEnd: z.boolean().optional().default(false),
  allowResultsView: z.boolean().optional().default(true),
  voteWeightEnabled: z.boolean().optional().default(false),
  allowVoteChanges: z.boolean().optional().default(false),
  allowInPersonVoting: z.boolean().optional().default(false),
  mailTemplateId: z.string().optional(),
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

// Create poll (admin and sub-admin)
pollRoutes.post('/', subAdminMiddleware, zValidator('json', createPollSchema), async (c) => {
  const pollData = c.req.valid('json');
  const currentUser = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    // Determine manager ID
    let managerId = pollData.managerId;
    if (!managerId) {
      // If no manager specified, sub-admins become the manager by default
      if (currentUser.role === 'sub-admin') {
        managerId = currentUser.userId;
      } else {
        return c.json({ error: 'Manager must be specified for admin-created polls' }, 400);
      }
    }

    // Verify manager exists and is a sub-admin
    const manager = await db.select().from(users).where(eq(users.id, managerId)).get();
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
      managerId: managerId,
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

// Get all polls (admin sees all, sub-admin sees assigned, auditing, and editing)
pollRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    let userPolls;

    if (user.role === 'admin') {
      // Admin sees all polls
      userPolls = await db.select().from(polls).all();
    } else if (user.role === 'sub-admin') {
      // Sub-admin sees polls they manage, audit, or edit
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

      const editedPolls = await db.select({
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
        .innerJoin(pollEditors, eq(pollEditors.pollId, polls.id))
        .where(eq(pollEditors.userId, user.userId))
        .all();

      // Combine and deduplicate polls
      const allPolls = [...managedPolls, ...auditedPolls, ...editedPolls];
      const uniquePolls = allPolls.filter((poll, index, self) => 
        index === self.findIndex(p => p.id === poll.id)
      );
      userPolls = uniquePolls;
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

// Get other polls (polls user doesn't manage/audit/edit)
pollRoutes.get('/other', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    if (user.role === 'admin') {
      // Admins have access to all polls
      return c.json({ polls: [] });
    }

    if (user.role === 'sub-admin') {
      // Get polls the sub-admin doesn't manage, audit, or edit
      const managedPollIds = await db.select({ id: polls.id })
        .from(polls)
        .where(eq(polls.managerId, user.userId))
        .all();
      
      const auditedPollIds = await db.select({ pollId: pollAuditors.pollId })
        .from(pollAuditors)
        .where(eq(pollAuditors.userId, user.userId))
        .all();

      const editedPollIds = await db.select({ pollId: pollEditors.pollId })
        .from(pollEditors)
        .where(eq(pollEditors.userId, user.userId))
        .all();

      const excludedIds = [
        ...managedPollIds.map(p => p.id),
        ...auditedPollIds.map(p => p.pollId),
        ...editedPollIds.map(p => p.pollId)
      ];

      let otherPolls;
      if (excludedIds.length > 0) {
        otherPolls = await db.select().from(polls)
          .where(not(inArray(polls.id, excludedIds)))
          .all();
      } else {
        otherPolls = await db.select().from(polls).all();
      }

      return c.json({ polls: otherPolls });
    } else {
      // Regular users get all polls for viewing only
      const allPolls = await db.select().from(polls).all();
      return c.json({ polls: allPolls });
    }
  } catch (error) {
    console.error('Get other polls error:', error);
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
      // Check if user is manager, auditor, or editor
      const isManager = poll.managerId === user.userId;
      const isAuditor = await db.select().from(pollAuditors)
        .where(and(eq(pollAuditors.pollId, pollId), eq(pollAuditors.userId, user.userId)))
        .get();
      const isEditor = await db.select().from(pollEditors)
        .where(and(eq(pollEditors.pollId, pollId), eq(pollEditors.userId, user.userId)))
        .get();
      hasAccess = isManager || !!isAuditor || !!isEditor;
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

// Update poll (admin, manager, or editor with appropriate permissions)
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

    // Check permissions using the new permission system
    const permissions = await getUserPollPermissions(db, user.userId, user.role, pollId);
    
    if (!permissions.canEdit) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Check if poll has started (only certain updates allowed)
    if (poll.status === 'active' && poll.startDate <= Date.now()) {
      // Only allow specific updates after poll has started
      const allowedUpdates = ['settings'];
      const updateKeys = Object.keys(updateData);
      const hasRestrictedUpdates = updateKeys.some(key => !allowedUpdates.includes(key));
      
      if (hasRestrictedUpdates && !permissions.canManage) {
        return c.json({ error: 'Cannot modify poll details after it has started' }, 400);
      }
    }

    // Editors can only update certain fields
    if (!permissions.canManage) {
      const editorAllowedFields = ['title', 'description', 'ballot', 'settings'];
      const updateKeys = Object.keys(updateData);
      const hasRestrictedUpdates = updateKeys.some(key => !editorAllowedFields.includes(key));
      
      if (hasRestrictedUpdates) {
        return c.json({ error: 'Insufficient permissions to modify these fields' }, 403);
      }
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

    // Store old values for audit
    const oldValues: any = {};
    if (updateData.title !== undefined) oldValues.oldTitle = poll.title;
    if (updateData.description !== undefined) oldValues.oldDescription = poll.description;
    if (updateData.startDate !== undefined) oldValues.oldStartDate = poll.startDate;
    if (updateData.endDate !== undefined) oldValues.oldEndDate = poll.endDate;
    if (updateData.status !== undefined) oldValues.oldStatus = poll.status;
    if (updateData.settings !== undefined) oldValues.oldSettings = poll.settings;
    if (updateData.ballot !== undefined) oldValues.oldBallot = poll.ballot;

    // Update poll
    const updatedPoll = await db.update(polls)
      .set({
        ...updateData,
        updatedAt: Date.now(),
      })
      .where(eq(polls.id, pollId))
      .returning()
      .get();

    // Audit log if poll is active
    if (await shouldAuditPoll(db, pollId)) {
      await logAuditEvent(
        db,
        'POLL_UPDATED',
        user.userId,
        pollId,
        null,
        {
          updatedFields: Object.keys(updateData),
          ...oldValues,
          newTitle: updateData.title,
          newDescription: updateData.description,
          newStartDate: updateData.startDate,
          newEndDate: updateData.endDate,
          newStatus: updateData.status,
          settingsChanged: !!updateData.settings,
          ballotChanged: !!updateData.ballot
        },
        c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null,
        c.req.header('user-agent') || null
      );
    }

    return c.json({
      message: 'Poll updated successfully',
      poll: updatedPoll,
    });
  } catch (error) {
    console.error('Update poll error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Toggle willSendEmails for a poll (manager or admin only)
pollRoutes.patch('/:id/toggle-emails', async (c) => {
  const pollId = c.req.param('id');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check permissions - only manager or admin can toggle email sending
    const permissions = await getUserPollPermissions(db, user.userId, user.role, pollId);
    
    if (!permissions.canManage) {
      return c.json({ error: 'Access denied. Only poll managers and admins can toggle email sending.' }, 403);
    }

    // Only allow toggling for active polls
    if (poll.status !== 'active') {
      return c.json({ error: 'Email sending can only be toggled for active polls' }, 400);
    }

    // Toggle the willSendEmails field
    const newValue = !poll.willSendEmails;
    const updatedPoll = await db.update(polls)
      .set({
        willSendEmails: newValue,
        updatedAt: Date.now(),
      })
      .where(eq(polls.id, pollId))
      .returning()
      .get();

    return c.json({
      message: `Email sending ${newValue ? 'enabled' : 'disabled'} successfully`,
      poll: updatedPoll,
    });
  } catch (error) {
    console.error('Toggle email sending error:', error);
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

// Get participants for a poll (poll manager, admin, editors, auditors)
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

    // Check permissions - admin, poll manager, editors, or auditors can view participants
    const isManager = poll.managerId === user.userId;
    const isAdmin = user.role === 'admin';
    
    // Check if user is an editor
    const isEditor = await db.select().from(pollEditors)
      .where(and(eq(pollEditors.pollId, pollId), eq(pollEditors.userId, user.userId)))
      .get();
    
    // Check if user is an auditor
    const isAuditor = await db.select().from(pollAuditors)
      .where(and(eq(pollAuditors.pollId, pollId), eq(pollAuditors.userId, user.userId)))
      .get();

    if (!isAdmin && !isManager && !isEditor && !isAuditor) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Get all participants for this poll
    const participants = await db.select().from(pollParticipants)
      .where(eq(pollParticipants.pollId, pollId))
      .all();

    // Remove tokens from response for security
    const sanitizedParticipants = participants.map(p => {
      const { token, ...rest } = p;
      return rest;
    });

    return c.json({ participants: sanitizedParticipants });
  } catch (error) {
    console.error('Get participants error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get user permissions for a specific poll
pollRoutes.get('/:id/permissions', async (c) => {
  const pollId = c.req.param('id');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    const permissions = await getUserPollPermissions(db, user.userId, user.role, pollId);
    return c.json({ permissions });
  } catch (error) {
    console.error('Get permissions error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Add participant to poll (poll manager, admin, or editors)
const addParticipantSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().optional(), // Optional - will use email if not provided, or system name if user exists
  isUser: z.boolean().optional(), // Optional - will be auto-detected if not provided
  voteWeight: z.number().positive('Vote weight must be positive').optional().default(1.0),
  token: z.string().optional(),
});

pollRoutes.post('/:id/participants', zValidator('json', addParticipantSchema, (result, c) => {
  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    return c.json({ 
      error: 'Validation failed', 
      details: errors,
      message: errors[0]?.message || 'Invalid input data'
    }, 400);
  }
}), async (c) => {
  const pollId = c.req.param('id');
  const { email, name, isUser, voteWeight, token } = c.req.valid('json');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();
    
    // Check if poll exists
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check permissions - admin, poll manager, or editors can add participants
    const isManager = poll.managerId === user.userId;
    const isAdmin = user.role === 'admin';
    
    // Check if user is an editor
    const isEditor = await db.select().from(pollEditors)
      .where(and(eq(pollEditors.pollId, pollId), eq(pollEditors.userId, user.userId)))
      .get();

    if (!isAdmin && !isManager && !isEditor) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Check if participant already exists for this poll
    const existingParticipant = await db.select()
      .from(pollParticipants)
      .where(and(eq(pollParticipants.pollId, pollId), eq(pollParticipants.email, normalizedEmail)))
      .get();
    
    if (existingParticipant) {
      return c.json({ error: 'Participant already exists for this poll' }, 400);
    }

    // Auto-detect if user exists in the system if isUser is not explicitly provided
    let userId = null;
    let finalIsUser = isUser;
    let finalName = name;
    let systemNameUsed = false;
    
    // Check if user exists in the database
    const existingUser = await db.select().from(users).where(eq(users.email, normalizedEmail)).get();
    
    if (finalIsUser === undefined) {
      // Auto-detect: if user exists in database, set as user participant
      finalIsUser = !!existingUser;
    }
    
    if (finalIsUser) {
      if (!existingUser) {
        return c.json({ error: 'User with this email does not exist in the system' }, 400);
      }
      userId = existingUser.id;
      // For system users, always use the system name regardless of provided name
      if (finalName !== existingUser.name) {
        systemNameUsed = true;
      }
      finalName = existingUser.name;
    } else {
      // For non-users, use provided name or email as fallback
      if (!finalName || finalName.trim() === '') {
        finalName = normalizedEmail;
      }
    }

    // Generate token for non-user participants
    const participantToken = !finalIsUser ? (token || generateRandomToken()) : null;
    // If a custom token was provided, mark tokenViewed as true for security
    const tokenWasCustom = !finalIsUser && !!token;

    // Create participant with all required fields
    const participant = await db.insert(pollParticipants)
      .values({
        pollId,
        userId,
        email: normalizedEmail,
        name: finalName,
        isUser: finalIsUser,
        token: participantToken,
        tokenUsed: false,
        tokenViewed: tokenWasCustom, // Mark as viewed if custom token was provided
        voteWeight,
        status: 'approved', // Auto-approve for manager-created participants
        hasVoted: false,
      })
      .returning()
      .get();

    // Audit log if poll is active
    if (await shouldAuditPoll(db, pollId)) {
      await logAuditEvent(
        db,
        'PARTICIPANT_ADDED',
        user.userId,
        pollId,
        participant.id,
        {
          participantEmail: participant.email,
          participantName: participant.name,
          isUser: participant.isUser,
          voteWeight: participant.voteWeight,
          customTokenProvided: tokenWasCustom
        },
        c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null,
        c.req.header('user-agent') || null
      );
    }

    return c.json({
      message: 'Participant added successfully',
      participant: {
        id: participant.id,
        email: participant.email,
        name: participant.name,
        isUser: participant.isUser,
        voteWeight: participant.voteWeight,
        status: participant.status,
        hasVoted: participant.hasVoted,
        tokenViewed: participant.tokenViewed,
      },
      systemNameUsed, // Indicate if system name was used instead of provided name
    });
  } catch (error) {
    console.error('Add participant error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Remove participant from poll (poll manager, admin, or editors)
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

    // Check permissions - admin, poll manager, or editors can remove participants
    const isManager = poll.managerId === user.userId;
    const isAdmin = user.role === 'admin';
    
    // Check if user is an editor
    const isEditor = await db.select().from(pollEditors)
      .where(and(eq(pollEditors.pollId, pollId), eq(pollEditors.userId, user.userId)))
      .get();

    if (!isAdmin && !isManager && !isEditor) {
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

    // Audit log if poll is active
    if (await shouldAuditPoll(db, pollId)) {
      await logAuditEvent(
        db,
        'PARTICIPANT_REMOVED',
        user.userId,
        pollId,
        participantId,
        {
          participantEmail: deletedParticipant.email,
          participantName: deletedParticipant.name,
          hadVoted: deletedParticipant.hasVoted,
          voteWeight: deletedParticipant.voteWeight
        },
        c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null,
        c.req.header('user-agent') || null
      );
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
  name: z.string().optional(),
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

    // Check permissions - admin, poll manager, or editors can update participants
    const isManager = poll.managerId === user.userId;
    const isAdmin = user.role === 'admin';
    
    // Check if user is an editor
    const isEditor = await db.select().from(pollEditors)
      .where(and(eq(pollEditors.pollId, pollId), eq(pollEditors.userId, user.userId)))
      .get();

    if (!isAdmin && !isManager && !isEditor) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // If token is being updated, check for uniqueness (excluding current participant)
    let tokenWasCustomUpdated = false;
    if (typeof updateData.token === 'string') {
      // If token is empty or only whitespace, remove from updateData
      if (updateData.token.trim() === '') {
        delete updateData.token;
      } else {
        const tokenConflict = await db.select().from(pollParticipants)
          .where(and(
            eq(pollParticipants.pollId, pollId),
            eq(pollParticipants.token, updateData.token),
            ne(pollParticipants.id, participantId)
          ))
          .get();
        if (tokenConflict) {
          return c.json({ error: 'Token already in use by another participant' }, 409);
        }
        // Mark that a custom token was provided
        tokenWasCustomUpdated = true;
      }
    }

    // Prepare update data
    const finalUpdateData: any = {
      ...updateData,
      updatedAt: Date.now(),
    };

    // If a custom token was updated, mark tokenViewed as true
    if (tokenWasCustomUpdated) {
      finalUpdateData.tokenViewed = true;
    }

    // Update participant
    const updatedParticipant = await db.update(pollParticipants)
      .set(finalUpdateData)
      .where(and(
        eq(pollParticipants.id, participantId),
        eq(pollParticipants.pollId, pollId)
      ))
      .returning()
      .get();

    if (!updatedParticipant) {
      return c.json({ error: 'Participant not found' }, 404);
    }

    // Audit log if poll is active
    if (await shouldAuditPoll(db, pollId)) {
      await logAuditEvent(
        db,
        'PARTICIPANT_UPDATED',
        user.userId,
        pollId,
        participantId,
        {
          updatedFields: Object.keys(updateData),
          voteWeight: updateData.voteWeight,
          tokenUpdated: tokenWasCustomUpdated,
          nameUpdated: !!updateData.name
        },
        c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null,
        c.req.header('user-agent') || null
      );
    }

    // Remove token from response for security
    const { token, ...sanitizedParticipant } = updatedParticipant;

    return c.json({ 
      message: 'Participant updated successfully',
      participant: sanitizedParticipant
    });
  } catch (error) {
    console.error('Update participant error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get participant token - with audit logging (poll manager, admin, or editors)
pollRoutes.get('/:id/participants/:participantId/token', async (c) => {
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

    // Check permissions - admin, poll manager, or editors can view tokens
    const isManager = poll.managerId === user.userId;
    const isAdmin = user.role === 'admin';
    
    // Check if user is an editor
    const isEditor = await db.select().from(pollEditors)
      .where(and(eq(pollEditors.pollId, pollId), eq(pollEditors.userId, user.userId)))
      .get();

    if (!isAdmin && !isManager && !isEditor) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Get participant
    const participant = await db.select().from(pollParticipants)
      .where(and(
        eq(pollParticipants.id, participantId),
        eq(pollParticipants.pollId, pollId)
      ))
      .get();

    if (!participant) {
      return c.json({ error: 'Participant not found' }, 404);
    }

    // Only non-user participants have tokens // TODO this will change after giving also users tokens
    if (participant.isUser) {
      return c.json({ error: 'User participants do not have tokens' }, 400);
    }

    // Get request metadata for audit
    const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';

    // Create audit event
    await db.insert(auditEvents).values({
      actorUserId: user.userId,
      pollId: pollId,
      participantId: participantId,
      eventType: 'TOKEN_VIEWED',
      meta: JSON.stringify({
        participantEmail: participant.email,
        participantName: participant.name,
        actorRole: user.role,
      }),
      ipAddress,
      userAgent,
    });

    // Mark token as viewed
    await db.update(pollParticipants)
      .set({
        tokenViewed: true,
        updatedAt: Date.now(),
      })
      .where(eq(pollParticipants.id, participantId));

    return c.json({
      token: participant.token,
      participantId: participant.id,
      participantName: participant.name,
      participantEmail: participant.email,
    });
  } catch (error) {
    console.error('Get participant token error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Revoke participant token - with audit logging (poll manager, admin, or editors)
pollRoutes.post('/:id/participants/:participantId/revoke-token', async (c) => {
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

    // Check permissions - admin, poll manager, or editors can revoke tokens
    const isManager = poll.managerId === user.userId;
    const isAdmin = user.role === 'admin';
    
    // Check if user is an editor
    const isEditor = await db.select().from(pollEditors)
      .where(and(eq(pollEditors.pollId, pollId), eq(pollEditors.userId, user.userId)))
      .get();

    if (!isAdmin && !isManager && !isEditor) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Get participant
    const participant = await db.select().from(pollParticipants)
      .where(and(
        eq(pollParticipants.id, participantId),
        eq(pollParticipants.pollId, pollId)
      ))
      .get();

    if (!participant) {
      return c.json({ error: 'Participant not found' }, 404);
    }

    // Only non-user participants have tokens
    if (participant.isUser) {
      return c.json({ error: 'User participants do not have tokens' }, 400);
    }

    // Generate new token
    const newToken = generateRandomToken();

    // Get request metadata for audit
    const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';

    // Create audit event
    await db.insert(auditEvents).values({
      actorUserId: user.userId,
      pollId: pollId,
      participantId: participantId,
      eventType: 'TOKEN_REVOKED',
      meta: JSON.stringify({
        participantEmail: participant.email,
        participantName: participant.name,
        actorRole: user.role,
        hasVoted: participant.hasVoted,
        oldTokenUsed: participant.tokenUsed,
        oldTokenViewed: participant.tokenViewed,
      }),
      ipAddress,
      userAgent,
    });

    // Update participant with new token and reset flags
    await db.update(pollParticipants)
      .set({
        token: newToken,
        tokenViewed: false,
        tokenUsed: false,
        tokenLastRevokedAt: Date.now(),
        updatedAt: Date.now(),
      })
      .where(eq(pollParticipants.id, participantId));

    return c.json({
      message: 'Token revoked successfully',
      participantId: participant.id,
      participantName: participant.name,
      participantEmail: participant.email,
      tokenLastRevokedAt: Date.now(),
    });
  } catch (error) {
    console.error('Revoke participant token error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get participant audit events (poll manager, admin, or auditors only)
pollRoutes.get('/:id/participants/:participantId/audit-events', async (c) => {
  const pollId = c.req.param('id');
  const participantId = c.req.param('participantId');
  const db = getDb(c.env.DB);
  const user = c.get('user')!;

  try {
    // Get the poll
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check permissions
    const isAdmin = user.role === 'admin';
    const isManager = poll.managerId === user.userId;
    
    // Check if user is an auditor
    const isAuditor = await db
      .select()
      .from(pollAuditors)
      .where(and(eq(pollAuditors.pollId, pollId), eq(pollAuditors.userId, user.userId)))
      .get();

    if (!isAdmin && !isManager && !isAuditor) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Verify participant exists
    const participant = await db
      .select()
      .from(pollParticipants)
      .where(and(eq(pollParticipants.pollId, pollId), eq(pollParticipants.id, participantId)))
      .get();

    if (!participant) {
      return c.json({ error: 'Participant not found' }, 404);
    }

    // Get audit events for this participant
    const events = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.participantId, participantId))
      .orderBy(auditEvents.createdAt)
      .all();

    // If no events, return empty array
    if (!events || events.length === 0) {
      return c.json({ events: [] });
    }

    // Fetch actor user details for each event
    const eventsWithActors = await Promise.all(
      events.map(async (event) => {
        let actorName = 'System';
        if (event.actorUserId) {
          try {
            const actor = await db
              .select({ name: users.name, email: users.email })
              .from(users)
              .where(eq(users.id, event.actorUserId))
              .get();
            if (actor) {
              actorName = `${actor.name} (${actor.email})`;
            }
          } catch (err) {
            console.error('Error fetching actor for event:', event.id, err);
          }
        }
        return {
          ...event,
          actorName,
        };
      })
    );

    return c.json({ events: eventsWithActors });
  } catch (error: any) {
    console.error('Get participant audit events error:', error);
    console.error('Error details:', error?.message, error?.stack);
    return c.json({ error: 'Internal server error', details: error?.message }, 500);
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

    // Only return polls that are active or scheduled to be active
    if (poll.status !== 'active') {
      return c.json({ error: 'Poll is not currently active' }, 403);
    }

    // Check poll status and allow viewing if poll is upcoming, active, or ended
    const now = Date.now();
    let pollStatus = 'ended';
    
    if (now < poll.startDate) {
      pollStatus = 'upcoming';
    } else if (now >= poll.startDate && now <= poll.endDate) {
      pollStatus = 'active';
    }

    // Return poll data without sensitive information
    // Include pollStatus so frontend knows the current state
    const publicPoll = {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      startDate: poll.startDate,
      endDate: poll.endDate,
      status: poll.status,
      pollStatus: pollStatus, // 'upcoming', 'active', or 'ended'
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
    let userId: string | null = null;

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
      userId = participant.userId;
      // Don't mark token as used yet - only mark it when vote is submitted

    } else if (email && password) {
      // User login-based access
      const normalizedEmail = email.toLowerCase();
      const user = await db.select().from(users).where(eq(users.email, normalizedEmail)).get();
      if (!user) {
        return c.json({ error: 'Invalid credentials' }, 401);
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.password);
      if (!isValidPassword) {
        return c.json({ error: 'Invalid credentials' }, 401);
      }

      userId = user.id;
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

    // Check for in-person voting events if enabled
    const pollSettings = poll.settings as any;
    let inPersonVotingCount = 0;
    let inPersonParticipants: any[] = [];

    if (userId && pollSettings.allowInPersonVoting) {
      // Query audit events where this user marked others as voted in-person
      const inPersonEvents = await db.select()
        .from(auditEvents)
        .where(and(
          eq(auditEvents.pollId, pollId),
          eq(auditEvents.actorUserId, userId),
          eq(auditEvents.eventType, 'MARKED_AS_IN_PERSON_VOTED')
        ))
        .all();

      inPersonVotingCount = inPersonEvents.length;

      // Get the participants who were marked
      if (inPersonVotingCount > 0) {
        for (const event of inPersonEvents) {
          if (!event.participantId) continue;
          const markedParticipant = await db.select()
            .from(pollParticipants)
            .where(eq(pollParticipants.id, event.participantId))
            .get();
          
          if (markedParticipant) {
            inPersonParticipants.push({
              id: markedParticipant.id,
              name: markedParticipant.name,
              email: markedParticipant.email,
              voteWeight: markedParticipant.voteWeight
            });
          }
        }
      }
    }

    if (participant.hasVoted && inPersonVotingCount === 0) {
      return c.json({ 
        success: true,
        hasVoted: true,
        allowVoteChanges: pollSettings.allowVoteChanges || false,
        participantToken: participant.token,
        participant: {
          id: participant.id,
          name: participant.name,
          email: participant.email,
          voteWeight: participant.voteWeight
        }
      });
    }

    return c.json({ 
      success: true,
      participantToken: participant.token,
      participant: {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        voteWeight: participant.voteWeight
      },
      inPersonVoting: inPersonVotingCount > 0 ? {
        count: inPersonVotingCount,
        participants: inPersonParticipants
      } : undefined
    });
  } catch (error) {
    console.error('Validate access error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Submit vote
const submitVoteSchema = z.object({
  participantToken: z.string(),
  votes: z.record(z.array(z.string())), // questionId -> array of selected option IDs
  inPersonParticipantId: z.string().optional(), // For in-person voting
});

publicPollRoutes.post('/:id/vote', zValidator('json', submitVoteSchema), async (c) => {
  const pollId = c.req.param('id');
  const { participantToken, votes, inPersonParticipantId } = c.req.valid('json');
  const db = getDb(c.env.DB);

  try {
    // Validate participant token (this is the admin/editor or regular participant)
    const authenticatedParticipant = await db.select().from(pollParticipants)
      .where(and(
        eq(pollParticipants.pollId, pollId),
        eq(pollParticipants.token, participantToken),
        eq(pollParticipants.status, 'approved')
      ))
      .get();

    if (!authenticatedParticipant) {
      return c.json({ error: 'Invalid participant token' }, 401);
    }

    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check if poll has ended
    const now = Date.now();
    if (poll.endDate < now) {
      return c.json({ error: 'This poll has ended. Voting is no longer allowed.' }, 403);
    }

    let targetParticipant = authenticatedParticipant;

    // Handle in-person voting
    if (inPersonParticipantId) {
      const pollSettings = poll.settings as any;
      
      if (!pollSettings.allowInPersonVoting) {
        return c.json({ error: 'In-person voting is not enabled for this poll' }, 403);
      }

      // Verify that the authenticated user marked this participant for in-person voting
      if (!authenticatedParticipant.userId) {
        return c.json({ error: 'Only authenticated users can cast in-person votes' }, 403);
      }
      
      const inPersonEvent = await db.select()
        .from(auditEvents)
        .where(and(
          eq(auditEvents.pollId, pollId),
          eq(auditEvents.participantId, inPersonParticipantId),
          eq(auditEvents.actorUserId, authenticatedParticipant.userId),
          eq(auditEvents.eventType, 'MARKED_AS_IN_PERSON_VOTED')
        ))
        .get();

      if (!inPersonEvent) {
        return c.json({ error: 'You are not authorized to cast an in-person vote for this participant' }, 403);
      }

      // Check if this in-person vote has already been cast
      const existingInPersonVote = await db.select()
        .from(auditEvents)
        .where(and(
          eq(auditEvents.pollId, pollId),
          eq(auditEvents.participantId, inPersonParticipantId),
          eq(auditEvents.actorUserId, authenticatedParticipant.userId),
          eq(auditEvents.eventType, 'IN_PERSON_VOTE_CAST')
        ))
        .get();

      if (existingInPersonVote) {
        return c.json({ error: 'You have already cast an in-person vote for this participant' }, 403);
      }

      // Get the target participant
      const foundParticipant = await db.select()
        .from(pollParticipants)
        .where(eq(pollParticipants.id, inPersonParticipantId))
        .get();

      if (!foundParticipant) {
        return c.json({ error: 'Target participant not found' }, 404);
      }
      
      targetParticipant = foundParticipant;
    }

    const pollSettings = poll.settings as any;
    if (targetParticipant.hasVoted && !inPersonParticipantId && !pollSettings.allowVoteChanges) {
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
    if (targetParticipant.hasVoted && pollSettings.allowVoteChanges && !inPersonParticipantId) {
      await db.delete(pollVotes)
        .where(and(
          eq(pollVotes.pollId, pollId),
          eq(pollVotes.participantId, targetParticipant.id)
        ));
    }

    // Store votes
    const voteRecords = [];
    for (const [questionId, selectedOptions] of Object.entries(votes)) {
      voteRecords.push({
        pollId: pollId,
        participantId: targetParticipant.id,
        questionId: questionId,
        selectedOptions: selectedOptions,
        voteWeight: targetParticipant.voteWeight,
      });
    }

    // Store votes and mark participant as voted
    for (const vote of voteRecords) {
      await db.insert(pollVotes).values(vote);
    }
    
    // Mark participant as voted and log the event
    if (!inPersonParticipantId) {
      // Regular voting - mark participant as voted
      await db.update(pollParticipants)
        .set({ 
          hasVoted: true,
          tokenUsed: targetParticipant.userId ? false : true // Only track token usage for non-user participants
        })
        .where(eq(pollParticipants.id, targetParticipant.id));
    } else {
      // In-person voting - log the event
      await logAuditEvent(
        db,
        pollId,
        targetParticipant.id,
        'IN_PERSON_VOTE_CAST',
        authenticatedParticipant.userId,
        { 
          actorName: authenticatedParticipant.name,
          participantName: targetParticipant.name,
          voteWeight: targetParticipant.voteWeight 
        },
        c.req.raw.headers.get('CF-Connecting-IP') || c.req.raw.headers.get('X-Forwarded-For') || 'unknown',
        c.req.raw.headers.get('User-Agent') || 'unknown'
      );
    }

    return c.json({ 
      success: true,
      message: inPersonParticipantId 
        ? `In-person vote cast successfully for ${targetParticipant.name}` 
        : 'Vote submitted successfully' 
    });
  } catch (error) {
    console.error('Submit vote error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Check if participant has voted
publicPollRoutes.get('/:id/vote-status/:participantToken', async (c) => {
  const pollId = c.req.param('id');
  const participantToken = c.req.param('participantToken');

  try {
    // Validate participant token
    const db = getDb(c.env.DB);
    const participant = await db.select().from(pollParticipants)
      .where(and(
        eq(pollParticipants.pollId, pollId),
        eq(pollParticipants.token, participantToken),
        eq(pollParticipants.status, 'approved')
      ))
      .get();

    if (!participant) {
      return c.json({ error: 'Invalid participant token' }, 401);
    }

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
    let accessLevel = 'none'; // 'admin', 'manager', 'auditor', 'editor', 'participant'

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
        } else {
          // Check if user is an editor
          const isEditor = await db.select().from(pollEditors)
            .where(and(eq(pollEditors.pollId, pollId), eq(pollEditors.userId, user.userId)))
            .get();
          if (isEditor) {
            hasAccess = true;
            accessLevel = 'editor';
          }
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
publicPollRoutes.get('/:id/results/:participantToken?', async (c) => {
  const pollId = c.req.param('id');
  const participantToken = c.req.param('participantToken');
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
    
    // If participant token provided, validate it
    if (participantToken) {
      participant = await db.select().from(pollParticipants)
        .where(and(
          eq(pollParticipants.pollId, pollId),
          eq(pollParticipants.token, participantToken),
          eq(pollParticipants.status, 'approved')
        ))
        .get();
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
    } else if (settings.showParticipantInitials) {
      // Show initials with masked characters
      const { formatNameWithInitials } = await import('../utils/formatting');
      participantData = participants
        .filter(p => p.hasVoted)
        .map(p => ({
          name: formatNameWithInitials(p.name),
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
      canViewParticipantInitials: ['admin', 'manager', 'auditor'].includes(accessLevel) || (accessLevel === 'participant' && settings.showParticipantInitials),
      canViewVoteWeights: ['admin', 'manager', 'auditor'].includes(accessLevel) || (accessLevel === 'participant' && settings.showVoteWeights),
    },
  };
}

// Get available sub-admins for auditor/editor assignment (manager, admin only)
pollRoutes.get('/:id/available-subadmins', async (c) => {
  const pollId = c.req.param('id');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    // Get poll and verify access
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check permissions - only admin or poll manager can view/manage
    if (user.role !== 'admin' && poll.managerId !== user.userId) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Get all sub-admins
    const allSubAdmins = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
    }).from(users).where(eq(users.role, 'sub-admin'));

    // Get currently assigned auditors and editors for this poll
    const assignedAuditors = await db.select({ userId: pollAuditors.userId })
      .from(pollAuditors)
      .where(eq(pollAuditors.pollId, pollId));

    const assignedEditors = await db.select({ userId: pollEditors.userId })
      .from(pollEditors)
      .where(eq(pollEditors.pollId, pollId));

    // Create set of assigned user IDs
    const assignedUserIds = new Set([
      ...assignedAuditors.map(a => a.userId),
      ...assignedEditors.map(e => e.userId)
    ]);

    // Filter out already assigned sub-admins
    const availableSubAdmins = allSubAdmins.filter(subAdmin => 
      !assignedUserIds.has(subAdmin.id)
    );

    return c.json({
      availableSubAdmins
    });
  } catch (error) {
    console.error('Error fetching available sub-admins:', error);
    return c.json({ error: 'Failed to fetch available sub-admins' }, 500);
  }
});

// Get poll auditors and editors (manager, admin, editors, auditors can view)
pollRoutes.get('/:id/auditors-editors', async (c) => {
  const pollId = c.req.param('id');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    // Get poll and verify access
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check permissions - admin, poll manager, editors, or auditors can view
    const isManager = poll.managerId === user.userId;
    const isAdmin = user.role === 'admin';
    
    // Check if user is an editor
    const isEditor = await db.select().from(pollEditors)
      .where(and(eq(pollEditors.pollId, pollId), eq(pollEditors.userId, user.userId)))
      .get();
    
    // Check if user is an auditor
    const isAuditor = await db.select().from(pollAuditors)
      .where(and(eq(pollAuditors.pollId, pollId), eq(pollAuditors.userId, user.userId)))
      .get();

    if (!isAdmin && !isManager && !isEditor && !isAuditor) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Get poll manager details
    const manager = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users)
      .where(eq(users.id, poll.managerId))
      .get();

    // Get auditors with user details
    const auditors = await db.select({
      id: pollAuditors.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.role, // Using role as status for now
      addedAt: pollAuditors.createdAt,
      lastAccess: users.updatedAt,
    }).from(pollAuditors)
      .innerJoin(users, eq(pollAuditors.userId, users.id))
      .where(eq(pollAuditors.pollId, pollId));

    // Get editors with user details
    const editors = await db.select({
      id: pollEditors.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.role, // Using role as status for now
      addedAt: pollEditors.createdAt,
      lastAccess: users.updatedAt,
    }).from(pollEditors)
      .innerJoin(users, eq(pollEditors.userId, users.id))
      .where(eq(pollEditors.pollId, pollId));

    return c.json({
      manager: manager ? {
        id: manager.id,
        name: manager.name,
        email: manager.email,
        role: 'manager',
        status: 'active',
        permissions: {
          managePoll: true,
          editQuestions: true,
          editSettings: true,
          viewResults: true,
          viewParticipants: true,
          viewAuditLog: true,
          downloadResults: true,
          manageAuditors: true,
          manageEditors: true
        },
        assignedAt: new Date(poll.createdAt).toISOString().split('T')[0],
        lastAccess: new Date(manager.updatedAt).toISOString().split('T')[0]
      } : null,
      auditors: auditors.map(a => ({
        id: a.id,
        userId: a.userId,
        name: a.name,
        email: a.email,
        role: 'auditor',
        status: 'active',
        permissions: {
          viewResults: true,
          viewParticipants: true,
          viewAuditLog: true,
          downloadResults: true
        },
        addedAt: new Date(a.addedAt).toISOString().split('T')[0],
        lastAccess: new Date(a.lastAccess).toISOString().split('T')[0]
      })),
      editors: editors.map(e => ({
        id: e.id,
        userId: e.userId,
        name: e.name,
        email: e.email,
        role: 'editor',
        status: 'active',
        permissions: {
          editQuestions: true,
          editSettings: true,
          managePoll: false,
          deleteQuestions: false
        },
        addedAt: new Date(e.addedAt).toISOString().split('T')[0],
        lastAccess: new Date(e.lastAccess).toISOString().split('T')[0]
      }))
    });
  } catch (error) {
    console.error('Error fetching auditors and editors:', error);
    return c.json({ error: 'Failed to fetch auditors and editors' }, 500);
  }
});

// Add auditor to poll (manager, admin only)
pollRoutes.post('/:id/auditors', zValidator('json', z.object({
  userId: z.string().min(1),
})), async (c) => {
  const pollId = c.req.param('id');
  const { userId } = c.req.valid('json');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    // Get poll and verify access
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check permissions
    if (user.role !== 'admin' && poll.managerId !== user.userId) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Find target user and verify they are a sub-admin
    const targetUser = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (targetUser.role !== 'sub-admin') {
      return c.json({ error: 'Only sub-admins can be assigned as auditors' }, 400);
    }

    // Check if already an auditor
    const existingAuditor = await db.select().from(pollAuditors)
      .where(and(eq(pollAuditors.pollId, pollId), eq(pollAuditors.userId, targetUser.id)))
      .get();

    if (existingAuditor) {
      return c.json({ error: 'User is already an auditor for this poll' }, 400);
    }

    // Add as auditor
    const newAuditor = await db.insert(pollAuditors).values({
      pollId,
      userId: targetUser.id,
    }).returning().get();

    return c.json({
      message: 'Auditor added successfully',
      auditor: {
        id: newAuditor.id,
        userId: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: 'auditor',
        status: 'active',
        permissions: {
          viewResults: true,
          viewParticipants: true,
          viewAuditLog: true,
          downloadResults: true
        },
        addedAt: new Date(newAuditor.createdAt).toISOString().split('T')[0],
        lastAccess: null
      }
    });
  } catch (error) {
    console.error('Error adding auditor:', error);
    return c.json({ error: 'Failed to add auditor' }, 500);
  }
});

// Add editor to poll (manager, admin only)
pollRoutes.post('/:id/editors', zValidator('json', z.object({
  userId: z.string().min(1),
})), async (c) => {
  const pollId = c.req.param('id');
  const { userId } = c.req.valid('json');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    // Get poll and verify access
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check permissions
    if (user.role !== 'admin' && poll.managerId !== user.userId) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Find target user and verify they are a sub-admin
    const targetUser = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (targetUser.role !== 'sub-admin') {
      return c.json({ error: 'Only sub-admins can be assigned as editors' }, 400);
    }

    // Check if already an editor
    const existingEditor = await db.select().from(pollEditors)
      .where(and(eq(pollEditors.pollId, pollId), eq(pollEditors.userId, targetUser.id)))
      .get();

    if (existingEditor) {
      return c.json({ error: 'User is already an editor for this poll' }, 400);
    }

    // Add as editor
    const newEditor = await db.insert(pollEditors).values({
      pollId,
      userId: targetUser.id,
    }).returning().get();

    return c.json({
      message: 'Editor added successfully',
      editor: {
        id: newEditor.id,
        userId: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: 'editor',
        status: 'active',
        permissions: {
          editQuestions: true,
          editSettings: true,
          managePoll: false,
          deleteQuestions: false
        },
        addedAt: new Date(newEditor.createdAt).toISOString().split('T')[0],
        lastAccess: null
      }
    });
  } catch (error) {
    console.error('Error adding editor:', error);
    return c.json({ error: 'Failed to add editor' }, 500);
  }
});

// Remove auditor from poll (manager, admin only)
pollRoutes.delete('/:id/auditors/:auditorId', async (c) => {
  const pollId = c.req.param('id');
  const auditorId = c.req.param('auditorId');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    // Get poll and verify access
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check permissions
    if (user.role !== 'admin' && poll.managerId !== user.userId) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Remove auditor
    const deletedAuditor = await db.delete(pollAuditors)
      .where(and(eq(pollAuditors.id, auditorId), eq(pollAuditors.pollId, pollId)))
      .returning()
      .get();

    if (!deletedAuditor) {
      return c.json({ error: 'Auditor not found' }, 404);
    }

    return c.json({ message: 'Auditor removed successfully' });
  } catch (error) {
    console.error('Error removing auditor:', error);
    return c.json({ error: 'Failed to remove auditor' }, 500);
  }
});

// Remove editor from poll (manager, admin only)
pollRoutes.delete('/:id/editors/:editorId', async (c) => {
  const pollId = c.req.param('id');
  const editorId = c.req.param('editorId');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    // Get poll and verify access
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check permissions
    if (user.role !== 'admin' && poll.managerId !== user.userId) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Remove editor
    const deletedEditor = await db.delete(pollEditors)
      .where(and(eq(pollEditors.id, editorId), eq(pollEditors.pollId, pollId)))
      .returning()
      .get();

    if (!deletedEditor) {
      return c.json({ error: 'Editor not found' }, 404);
    }

    return c.json({ message: 'Editor removed successfully' });
  } catch (error) {
    console.error('Error removing editor:', error);
    return c.json({ error: 'Failed to remove editor' }, 500);
  }
});

// Add group members as participants (poll manager, admin, or editors)
const addGroupParticipantsSchema = z.object({
  groupId: z.string().min(1, 'Group ID is required'),
  voteWeight: z.number().positive('Vote weight must be positive').optional().default(1.0),
});

pollRoutes.post('/:id/participants/group', zValidator('json', addGroupParticipantsSchema, (result, c) => {
  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    return c.json({ 
      error: 'Validation failed', 
      details: errors,
      message: errors[0]?.message || 'Invalid input data'
    }, 400);
  }
}), async (c) => {
  const pollId = c.req.param('id');
  const { groupId, voteWeight } = c.req.valid('json');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    // Check if poll exists
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check permissions - admin, poll manager, or editors can add participants
    const isManager = poll.managerId === user.userId;
    const isAdmin = user.role === 'admin';
    
    // Check if user is an editor
    const isEditor = await db.select().from(pollEditors)
      .where(and(eq(pollEditors.pollId, pollId), eq(pollEditors.userId, user.userId)))
      .get();

    if (!isAdmin && !isManager && !isEditor) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Check if group exists
    const group = await db.select().from(userGroups).where(eq(userGroups.id, groupId)).get();
    if (!group) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Get all users in the group
    const allUsers = await db.select().from(users).all();
    const groupMembers = allUsers.filter(user => 
      (user.groupIDs as string[] || []).includes(groupId)
    );

    if (groupMembers.length === 0) {
      return c.json({ error: 'Group has no members' }, 400);
    }

    // Check for existing participants to avoid duplicates
    const existingParticipants = await db.select()
      .from(pollParticipants)
      .where(eq(pollParticipants.pollId, pollId))
      .all();

    const existingEmails = new Set(existingParticipants.map(p => p.email));

    // Add group members as participants
    const addedParticipants = [];
    const skippedParticipants = [];
    const errors = [];

    for (const member of groupMembers) {
      if (existingEmails.has(member.email)) {
        skippedParticipants.push({
          email: member.email,
          name: member.name,
          reason: 'Already a participant'
        });
        continue;
      }

      try {
        const participant = await db.insert(pollParticipants)
          .values({
            pollId,
            userId: member.id,
            email: member.email,
            name: member.name,
            isUser: true,
            token: null, // Users don't need tokens
            tokenUsed: false,
            voteWeight,
            status: 'approved',
            hasVoted: false,
          })
          .returning()
          .get();

        addedParticipants.push({
          id: participant.id,
          email: participant.email,
          name: participant.name,
          isUser: participant.isUser,
          voteWeight: participant.voteWeight,
          status: participant.status,
          hasVoted: participant.hasVoted,
        });

        existingEmails.add(member.email); // Add to set to prevent duplicates in same batch
      } catch (error) {
        console.error(`Error adding participant ${member.email}:`, error);
        errors.push({
          email: member.email,
          name: member.name,
          error: 'Failed to add participant'
        });
      }
    }

    // Audit log if poll is active and participants were added
    if (addedParticipants.length > 0 && await shouldAuditPoll(db, pollId)) {
      await logAuditEvent(
        db,
        'GROUP_PARTICIPANTS_ADDED',
        user.userId,
        pollId,
        null,
        {
          groupId: groupId,
          groupName: group.name,
          totalMembers: groupMembers.length,
          addedCount: addedParticipants.length,
          skippedCount: skippedParticipants.length,
          errorsCount: errors.length,
          voteWeight: voteWeight
        },
        c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null,
        c.req.header('user-agent') || null
      );
    }

    return c.json({
      message: `Group members added successfully`,
      group: {
        id: group.id,
        name: group.name,
        description: group.description
      },
      summary: {
        total: groupMembers.length,
        added: addedParticipants.length,
        skipped: skippedParticipants.length,
        errors: errors.length
      },
      addedParticipants,
      skippedParticipants,
      errors
    });
  } catch (error) {
    console.error('Add group participants error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Send email to participant (manager, admin only)
pollRoutes.post('/:id/participants/:participantId/send-email', async (c) => {
  const pollId = c.req.param('id');
  const participantId = c.req.param('participantId');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    // Get poll and verify access
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check permissions
    if (user.role !== 'admin' && poll.managerId !== user.userId) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Check if poll is active
    if (poll.status !== 'active') {
      return c.json({ error: 'Can only send emails for active polls' }, 400);
    }

    // Get participant
    const participant = await db.select().from(pollParticipants)
      .where(and(eq(pollParticipants.id, participantId), eq(pollParticipants.pollId, pollId)))
      .get();

    if (!participant) {
      return c.json({ error: 'Participant not found' }, 404);
    }

    // Import the sendEmailWithTemplate function from mail utils
    const { sendEmailWithTemplate, TemplateVariables } = await import('../utils/mail');

    // Prepare email content with poll-specific information
    const pollUrl = `${c.env.FRONTEND_URL || 'http://localhost:5173'}/poll/${pollId}${participant.token ? `?token=${participant.token}` : ''}`;
    
    // Prepare template variables
    const templateVariables: TemplateVariables = {
      participantName: participant.name,
      pollTitle: poll.title,
      pollDescription: poll.description || 'No description provided',
      pollUrl: pollUrl,
      pollStartDate: toLocaleDateString(poll.startDate, c.env),
      pollEndDate: toLocaleDateString(poll.endDate, c.env),
    };
    
    // Get template ID from poll settings (if exists)
    const pollSettings = typeof poll.settings === 'string' ? JSON.parse(poll.settings) : poll.settings;
    const templateId = pollSettings?.mailTemplateId || null;

    // Send email using template
    const result = await sendEmailWithTemplate(
      db,
      'next-available',
      participant.email,
      templateId,
      templateVariables,
      false // not a cron job
    );

    if (result.success) {
      // Update lastEmailSentAt timestamp
      await db.update(pollParticipants)
        .set({ 
          lastEmailSentAt: Date.now(),
          updatedAt: Date.now()
        })
        .where(eq(pollParticipants.id, participantId))
        .run();

      return c.json({ 
        message: 'Email sent successfully',
        lastEmailSentAt: Date.now()
      });
    } else {
      return c.json({ error: result.error }, 400);
    }
  } catch (error) {
    console.error('Error sending email to participant:', error);
    return c.json({ error: 'Failed to send email' }, 500);
  }
});

// Mark participant as voted in-person (manager, admin, editor only)
pollRoutes.post('/:id/participants/:participantId/mark-voted', async (c) => {
  const pollId = c.req.param('id');
  const participantId = c.req.param('participantId');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    // Get poll and verify access
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    // Check if in-person voting is enabled
    const pollSettings = typeof poll.settings === 'string' ? JSON.parse(poll.settings) : poll.settings;
    if (!pollSettings.allowInPersonVoting) {
      return c.json({ error: 'In-person voting is not enabled for this poll' }, 403);
    }

    // Check permissions - only admin, manager, or editor can mark as voted
    const permissions = await getUserPollPermissions(db, user.userId, user.role, pollId);
    if (!permissions.canManageParticipants && user.role !== 'admin') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    // Check if poll is active
    if (poll.status !== 'active') {
      return c.json({ error: 'Can only mark participants as voted for active polls' }, 400);
    }

    // Check if poll is within voting period
    const now = Date.now();
    if (now < poll.startDate || now > poll.endDate) {
      return c.json({ error: 'Poll is not currently open for voting' }, 400);
    }

    // Get participant
    const participant = await db.select().from(pollParticipants)
      .where(and(eq(pollParticipants.id, participantId), eq(pollParticipants.pollId, pollId)))
      .get();

    if (!participant) {
      return c.json({ error: 'Participant not found' }, 404);
    }

    // Check if participant has already voted
    if (participant.hasVoted) {
      return c.json({ error: 'Participant has already voted' }, 400);
    }

    // Mark participant as voted
    await db.update(pollParticipants)
      .set({ 
        hasVoted: true,
        updatedAt: Date.now()
      })
      .where(eq(pollParticipants.id, participantId))
      .run();

    // Log audit event
    const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || null;
    const userAgent = c.req.header('user-agent') || null;

    await logAuditEvent(
      db,
      'MARKED_AS_IN_PERSON_VOTED',
      user.userId,
      pollId,
      participantId,
      {
        participantName: participant.name,
        participantEmail: participant.email,
        markedBy: user.email
      },
      ipAddress,
      userAgent
    );

    return c.json({ 
      message: 'Participant marked as voted successfully',
      participant: {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        hasVoted: true
      }
    });
  } catch (error) {
    console.error('Error marking participant as voted:', error);
    return c.json({ error: 'Failed to mark participant as voted' }, 500);
  }
});

export { publicPollRoutes };
export default pollRoutes;
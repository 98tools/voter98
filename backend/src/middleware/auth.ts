import { Context, Next } from 'hono';
import { verifyToken } from '../utils/auth';
import { AppBindings, JWTPayload } from '../types';
import { getDb } from '../models/db';
import { polls, pollAuditors, pollEditors } from '../models/schema';
import { eq, and } from 'drizzle-orm';

type Variables = {
  user?: JWTPayload;
};

export async function authMiddleware(c: Context<{ Bindings: AppBindings; Variables: Variables }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  c.set('user', payload);
  await next();
}

export async function adminMiddleware(c: Context<{ Bindings: AppBindings; Variables: Variables }>, next: Next) {
  const user = c.get('user');
  
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }

  await next();
}

export async function subAdminMiddleware(c: Context<{ Bindings: AppBindings; Variables: Variables }>, next: Next) {
  const user = c.get('user');
  
  if (!user || (user.role !== 'admin' && user.role !== 'sub-admin')) {
    return c.json({ error: 'Sub-admin access required' }, 403);
  }

  await next();
}

// Middleware to check if user has access to a specific poll
export async function pollAccessMiddleware(c: Context<{ Bindings: AppBindings; Variables: Variables }>, next: Next) {
  const user = c.get('user');
  const pollId = c.req.param('id');
  
  if (!user || !pollId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const db = getDb(c.env.DB);
  
  try {
    // Admin has access to all polls
    if (user.role === 'admin') {
      await next();
      return;
    }

    // Check if user is poll manager
    const poll = await db.select().from(polls).where(eq(polls.id, pollId)).get();
    if (poll && poll.managerId === user.userId) {
      await next();
      return;
    }

    // Check if user is an auditor
    const auditor = await db.select().from(pollAuditors)
      .where(and(eq(pollAuditors.pollId, pollId), eq(pollAuditors.userId, user.userId)))
      .get();
    
    if (auditor) {
      await next();
      return;
    }

    // Check if user is an editor
    const editor = await db.select().from(pollEditors)
      .where(and(eq(pollEditors.pollId, pollId), eq(pollEditors.userId, user.userId)))
      .get();
    
    if (editor) {
      await next();
      return;
    }

    return c.json({ error: 'Access denied' }, 403);
  } catch (error) {
    console.error('Poll access check error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
}

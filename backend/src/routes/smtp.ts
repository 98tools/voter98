import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '../models/db';
import { smtpConfig } from '../models/schema';
import { AppBindings, JWTPayload } from '../types';
import { eq, sql } from 'drizzle-orm';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const smtpRoutes = new Hono<{ Bindings: AppBindings; Variables: { user?: JWTPayload } }>();

const smtpSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
  secure: z.boolean(),
  dailyLimit: z.number().int().min(1).optional(),
});

// Apply auth middleware to all routes
smtpRoutes.use('/*', authMiddleware, adminMiddleware);

// Get all SMTP configs
smtpRoutes.get('/', async (c) => {
  const db = getDb(c.env.DB);
  try {
    const configs = await db.select().from(smtpConfig).orderBy(smtpConfig.order).all();
    return c.json({ configs });
  } catch (error) {
    console.error('Get SMTP configs error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// PATCH endpoint to update order of SMTP configs
smtpRoutes.patch('/order', async (c) => {
  const db = getDb(c.env.DB);
  const updates = await c.req.json(); // Expecting [{id, order}, ...]
  if (!Array.isArray(updates)) {
    return c.json({ error: 'Invalid payload' }, 400);
  }
  try {
    for (const { id, order } of updates) {
      if (!id || typeof order !== 'number') continue;
      await db.update(smtpConfig).set({ order }).where(eq(smtpConfig.id, id)).run();
    }
    return c.json({ message: 'Order updated' });
  } catch (error) {
    console.error('Update SMTP order error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Add new SMTP config
smtpRoutes.post('/', zValidator('json', smtpSchema), async (c) => {
  const db = getDb(c.env.DB);
  const data = c.req.valid('json');
  try {
    // Get the current max order
    const maxOrderRow = await db.select({ max: sql`MAX("order")` }).from(smtpConfig).get();
    const nextOrder = Number(maxOrderRow?.max ?? 0) + 1;
    const inserted = await db.insert(smtpConfig).values({
      ...data,
      dailyLimit: data.dailyLimit ?? 100,
      order: nextOrder,
    }).returning().get();
    return c.json({ message: 'SMTP config added', config: inserted });
  } catch (error) {
    console.error('Add SMTP config error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update SMTP config
smtpRoutes.put('/:id', zValidator('json', smtpSchema), async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const data = c.req.valid('json');
  try {
    const updated = await db.update(smtpConfig).set({
      ...data,
      dailyLimit: data.dailyLimit ?? 100,
      updatedAt: Date.now(),
    }).where(eq(smtpConfig.id, id)).returning().get();
    if (!updated) {
      return c.json({ error: 'SMTP config not found' }, 404);
    }
    return c.json({ message: 'SMTP config updated', config: updated });
  } catch (error) {
    console.error('Update SMTP config error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete SMTP config
smtpRoutes.delete('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  try {
    const deleted = await db.delete(smtpConfig).where(eq(smtpConfig.id, id)).run();
    if (deleted.meta.changes === 0) {
      return c.json({ error: 'SMTP config not found' }, 404);
    }
    return c.json({ message: 'SMTP config deleted' });
  } catch (error) {
    console.error('Delete SMTP config error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default smtpRoutes;

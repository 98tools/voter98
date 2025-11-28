import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '../models/db';
import { mailTemplates } from '../models/schema';
import { AppBindings, JWTPayload } from '../types';
import { eq } from 'drizzle-orm';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const mailTemplateRoutes = new Hono<{ Bindings: AppBindings; Variables: { user?: JWTPayload } }>();

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  htmlBody: z.string().optional(),
  isDefault: z.boolean().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  htmlBody: z.string().optional(),
  isDefault: z.boolean().optional(),
});

// Apply auth middleware to all routes
mailTemplateRoutes.use('/*', authMiddleware, adminMiddleware);

// Get all mail templates
mailTemplateRoutes.get('/', async (c) => {
  const db = getDb(c.env.DB);
  
  try {
    const templates = await db.select().from(mailTemplates).all();
    return c.json({ templates });
  } catch (error) {
    console.error('Get templates error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get a specific mail template
mailTemplateRoutes.get('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  
  try {
    const template = await db.select().from(mailTemplates).where(eq(mailTemplates.id, id)).get();
    
    if (!template) {
      return c.json({ error: 'Template not found' }, 404);
    }
    
    return c.json({ template });
  } catch (error) {
    console.error('Get template error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get the default mail template
mailTemplateRoutes.get('/default/get', async (c) => {
  const db = getDb(c.env.DB);
  
  try {
    const template = await db.select().from(mailTemplates)
      .where(eq(mailTemplates.isDefault, true))
      .get();
    
    return c.json({ template: template || null });
  } catch (error) {
    console.error('Get default template error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create a new mail template
mailTemplateRoutes.post('/', zValidator('json', createTemplateSchema), async (c) => {
  const db = getDb(c.env.DB);
  const data = c.req.valid('json');
  
  try {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await db.update(mailTemplates)
        .set({ isDefault: false, updatedAt: Date.now() })
        .where(eq(mailTemplates.isDefault, true))
        .run();
    }
    
    const template = await db.insert(mailTemplates).values({
      name: data.name,
      subject: data.subject,
      body: data.body,
      htmlBody: data.htmlBody,
      isDefault: data.isDefault || false,
    }).returning().get();
    
    return c.json({ message: 'Template created successfully', template }, 201);
  } catch (error) {
    console.error('Create template error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update a mail template
mailTemplateRoutes.put('/:id', zValidator('json', updateTemplateSchema), async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  const data = c.req.valid('json');
  
  try {
    const existing = await db.select().from(mailTemplates).where(eq(mailTemplates.id, id)).get();
    
    if (!existing) {
      return c.json({ error: 'Template not found' }, 404);
    }
    
    // If setting as default, unset other defaults
    if (data.isDefault === true) {
      await db.update(mailTemplates)
        .set({ isDefault: false, updatedAt: Date.now() })
        .where(eq(mailTemplates.isDefault, true))
        .run();
    }
    
    const template = await db.update(mailTemplates)
      .set({
        ...data,
        updatedAt: Date.now(),
      })
      .where(eq(mailTemplates.id, id))
      .returning()
      .get();
    
    return c.json({ message: 'Template updated successfully', template });
  } catch (error) {
    console.error('Update template error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete a mail template
mailTemplateRoutes.delete('/:id', async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param('id');
  
  try {
    const template = await db.select().from(mailTemplates).where(eq(mailTemplates.id, id)).get();
    
    if (!template) {
      return c.json({ error: 'Template not found' }, 404);
    }
    
    // Prevent deletion of default template without warning
    if (template.isDefault) {
      return c.json({ error: 'Cannot delete the default template. Please set another template as default first.' }, 400);
    }
    
    await db.delete(mailTemplates).where(eq(mailTemplates.id, id)).run();
    
    return c.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Delete template error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default mailTemplateRoutes;

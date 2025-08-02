import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '../models/db';
import { users, userGroups } from '../models/schema';
import { hashPassword } from '../utils/auth';
import { AppBindings, JWTPayload } from '../types';
import { eq } from 'drizzle-orm';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const userRoutes = new Hono<{ Bindings: AppBindings; Variables: { user?: JWTPayload } }>();

// Create sub-admin schema
const createSubAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

// Create user schema (for any role)
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['user', 'sub-admin', 'admin']).default('user'),
  groupIDs: z.array(z.string()).optional().default([]),
});

// Update user schema
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['user', 'sub-admin', 'admin']).optional(),
  groupIDs: z.array(z.string()).optional(),
});

// Apply auth middleware to all routes
userRoutes.use('/*', authMiddleware);

// Get current user profile
userRoutes.get('/profile', async (c) => {
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    const userData = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, user.userId)).get();

    if (!userData) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user: userData });
  } catch (error) {
    console.error('Profile error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create sub-admin (admin only)
userRoutes.post('/sub-admin', adminMiddleware, zValidator('json', createSubAdminSchema), async (c) => {
  const { email, password, name } = c.req.valid('json');
  const db = getDb(c.env.DB);

  try {
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).get();
    if (existingUser) {
      return c.json({ error: 'User already exists' }, 400);
    }

    // Hash password and create sub-admin
    const hashedPassword = await hashPassword(password);
    const newSubAdmin = await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
      role: 'sub-admin',
    }).returning().get();

    return c.json({
      message: 'Sub-admin created successfully',
      user: {
        id: newSubAdmin.id,
        email: newSubAdmin.email,
        name: newSubAdmin.name,
        role: newSubAdmin.role,
      },
    });
  } catch (error) {
    console.error('Create sub-admin error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get all users (admin only)
userRoutes.get('/all', adminMiddleware, async (c) => {
  const db = getDb(c.env.DB);

  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      groupIDs: users.groupIDs,
      createdAt: users.createdAt,
    }).from(users).all();

    const allGroups = await db.select({
      id: userGroups.id,
      name: userGroups.name,
      description: userGroups.description,
    }).from(userGroups).all();

    // Get groups for each user
    const usersWithGroups = allUsers.map((user) => {
      const userGroupIDs = user.groupIDs as string[] || [];
      const userGroups = allGroups.filter(group => userGroupIDs.includes(group.id));

      return {
        ...user,
        groups: userGroups,
      };
    });

    return c.json({ users: usersWithGroups });
  } catch (error) {
    console.error('Get all users error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create user (admin only)
userRoutes.post('/create', adminMiddleware, zValidator('json', createUserSchema), async (c) => {
  const { email, password, name, role, groupIDs } = c.req.valid('json');
  const db = getDb(c.env.DB);

  try {
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).get();
    if (existingUser) {
      return c.json({ error: 'User already exists' }, 400);
    }

    // Validate group IDs if provided
    if (groupIDs && groupIDs.length > 0) {
      for (const groupId of groupIDs) {
        const group = await db.select().from(userGroups).where(eq(userGroups.id, groupId)).get();
        if (!group) {
          return c.json({ error: `Group with ID ${groupId} not found` }, 400);
        }
      }
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const newUser = await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
      role,
      groupIDs: groupIDs || [],
    }).returning().get();

    return c.json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        groupIDs: newUser.groupIDs,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get sub-admins (admin only)
userRoutes.get('/sub-admins', adminMiddleware, async (c) => {
  const db = getDb(c.env.DB);

  try {
    const subAdmins = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.role, 'sub-admin')).all();

    return c.json({ subAdmins });
  } catch (error) {
    console.error('Get sub-admins error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update user by ID (admin only)
userRoutes.put('/:id', adminMiddleware, zValidator('json', updateUserSchema), async (c) => {
  const db = getDb(c.env.DB);
  const userId = c.req.param('id');
  const updateData = c.req.valid('json');

  try {
    // Check if user exists
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // If email is being updated, check for conflicts
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await db.select().from(users).where(eq(users.email, updateData.email)).get();
      if (emailExists) {
        return c.json({ error: 'Email already exists' }, 400);
      }
    }

    // Validate group IDs if provided
    if (updateData.groupIDs && updateData.groupIDs.length > 0) {
      for (const groupId of updateData.groupIDs) {
        const group = await db.select().from(userGroups).where(eq(userGroups.id, groupId)).get();
        if (!group) {
          return c.json({ error: `Group with ID ${groupId} not found` }, 400);
        }
      }
    }

    // Prepare update object
    const updateObject: any = {};
    if (updateData.name) updateObject.name = updateData.name;
    if (updateData.email) updateObject.email = updateData.email;
    if (updateData.role) updateObject.role = updateData.role;
    if (updateData.password) {
      updateObject.password = await hashPassword(updateData.password);
    }
    if (updateData.groupIDs !== undefined) updateObject.groupIDs = updateData.groupIDs;

    // Update user
    const updatedUser = await db.update(users)
      .set(updateObject)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .get();

    return c.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete user by ID (admin only)
userRoutes.delete('/:id', adminMiddleware, async (c) => {
  const db = getDb(c.env.DB);
  const userId = c.req.param('id');
  try {
    // Check if user exists first
    const existingUser = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!existingUser) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    await db.delete(users).where(eq(users.id, userId)).run();
    return c.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default userRoutes;

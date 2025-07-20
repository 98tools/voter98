import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '../models/db';
import { users } from '../models/schema';
import { hashPassword, verifyPassword, generateToken } from '../utils/auth';
import { AppBindings } from '../types';
import { eq } from 'drizzle-orm';

const auth = new Hono<{ Bindings: AppBindings }>();

// Registration schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  adminKey: z.string().optional(), // Special key for creating first admin
});

// Login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Register endpoint
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, name, adminKey } = c.req.valid('json');
  const db = getDb(c.env.DB);

  try {
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).get();
    if (existingUser) {
      return c.json({ error: 'User already exists' }, 400);
    }

    // Check if this is the first user or if admin key is provided
    const allUsers = await db.select().from(users).all();
    const isFirstUser = allUsers.length === 0;
    const isAdminCreation = adminKey === 'FIRST_ADMIN_2025';

    // Determine role
    let role = 'user';
    if (isFirstUser || isAdminCreation) {
      role = 'admin';
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    const newUser = await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
      role,
    }).returning().get();

    // Generate token
    const token = generateToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
    }, c.env.JWT_SECRET);

    return c.json({
      message: `${role === 'admin' ? 'Admin' : 'User'} registered successfully`,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Login endpoint
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const db = getDb(c.env.DB);

  try {
    // Find user by email
    const user = await db.select().from(users).where(eq(users.email, email)).get();
    if (!user) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    }, c.env.JWT_SECRET);

    return c.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default auth;

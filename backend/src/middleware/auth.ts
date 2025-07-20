import { Context, Next } from 'hono';
import { verifyToken } from '../utils/auth';
import { AppBindings, JWTPayload } from '../types';

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

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { AppBindings } from './types';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import pollRoutes from './routes/polls';
import { describeRoute } from 'hono-openapi';

const app = new Hono<{ Bindings: AppBindings }>();

// Middleware
app.use('/*', cors());
app.use('/*', logger());

// Health check
app.get('/', (c) => {
  return c.json({ message: 'Voter API is running' });
});

// Routes
app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);
app.route('/api/polls', pollRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Route not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;

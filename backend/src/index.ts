import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { AppBindings } from './types';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import pollRoutes, { publicPollRoutes } from './routes/polls';
import seedRoutes from './routes/seed';
import smtpRoutes from './routes/smtp';
import { sendEmailsToParticipants } from './utils/cron';

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
app.route('/api/poll', publicPollRoutes); // Public poll access routes
app.route('/api/dev', seedRoutes); // Development routes
app.route('/api/smtp', smtpRoutes);

// Cron job endpoint for Cloudflare Workers
app.post('/api/cron/send-emails', async (c) => {
  try {
    const result = await sendEmailsToParticipants(c.env);
    return c.json(result);
  } catch (error) {
    console.error('Cron job error:', error);
    return c.json({ 
      success: false, 
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Route not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// Handle cron triggers
addEventListener('scheduled', (event: ScheduledEvent) => {
  event.waitUntil(handleCronTrigger(event));
});

async function handleCronTrigger(event: ScheduledEvent) {
  console.log('Cron trigger fired:', event.cron);
  
  try {
    // Create a mock environment context for the cron function
    // This will be replaced with actual environment bindings at runtime
    const env = {
      DB: (globalThis as any).DB,
      VOTER_KV: (globalThis as any).VOTER_KV,
      JWT_SECRET: (globalThis as any).JWT_SECRET
    };
    
    const result = await sendEmailsToParticipants(env);
    console.log('Cron job completed successfully:', result);
  } catch (error) {
    console.error('Cron job failed:', error);
  }
}

// Export the app for HTTP requests
export default app;

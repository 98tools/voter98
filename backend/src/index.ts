import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { AppBindings } from './types';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import groupRoutes from './routes/groups';
import pollRoutes, { publicPollRoutes } from './routes/polls';
import seedRoutes from './routes/seed';
import smtpRoutes from './routes/smtp';
import { sendEmailsToParticipants, resetDailyEmailCounts } from './utils/cron';

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
app.route('/api/groups', groupRoutes);
app.route('/api/polls', pollRoutes);
app.route('/api/poll', publicPollRoutes); // Public poll access routes
app.route('/api/dev', seedRoutes); // Development routes
app.route('/api/smtp', smtpRoutes);

// Cron job endpoints for Cloudflare Workers
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

app.post('/api/cron/reset-daily-counts', async (c) => {
  try {
    const result = await resetDailyEmailCounts(c.env);
    return c.json(result);
  } catch (error) {
    console.error('Daily reset cron job error:', error);
    return c.json({ 
      success: false, 
      error: 'Daily reset cron job failed',
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

// Cron job handler function
async function handleCronJob(controller: ScheduledController, env: AppBindings) {
  console.log('Cron trigger fired:', controller.cron);
  
  try {
    // Create environment context for the cron function
    const cronEnv = {
      DB: env.DB,
      VOTER_KV: env.VOTER_KV,
      JWT_SECRET: env.JWT_SECRET,
      FRONTEND_URL: env.FRONTEND_URL || 'http://localhost:5173'
    };
    
    let result;
    
    // Determine which cron job to run based on the cron pattern
    if (controller.cron === '*/5 * * * *') {
      // Every 5 minutes - send emails to participants
      console.log('Running 5-minute email sending cron job...');
      result = await sendEmailsToParticipants(cronEnv);
    } else if (controller.cron === '0 0 * * *') {
      // Daily at midnight - reset daily email counts
      console.log('Running daily email count reset cron job...');
      result = await resetDailyEmailCounts(cronEnv);
    } else {
      console.log('Unknown cron pattern:', controller.cron);
      return;
    }
    
    console.log('Cron job completed successfully:', result);
  } catch (error) {
    console.error('Cron job failed:', error);
  }
}

// Export using the explicit pattern recommended by Cloudflare Workers
export default {
  fetch: app.fetch,
  scheduled: handleCronJob
};

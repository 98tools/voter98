import { getDb } from '../models/db';
import { polls, pollParticipants, smtpConfig } from '../models/schema';
import { eq, and, isNull, sql, gte, lte } from 'drizzle-orm';
import { sendEmail, sendEmailWithTemplate, resetCronSentCounts, resetDailySentCounts, TemplateVariables } from './mail';
import { toLocaleDateString } from './timezone';

export interface CronJobResult {
  success: boolean;
  pollsProcessed: number;
  emailsSent: number;
  errors: string[];
  message?: string;
}

export async function sendEmailsToParticipants(env: any): Promise<CronJobResult> {
  const db = getDb(env.DB);
  const result: CronJobResult = {
    success: true,
    pollsProcessed: 0,
    emailsSent: 0,
    errors: []
  };

  try {
    // Reset cron sent counts at the start of each cron execution
    await resetCronSentCounts(db);

    // Get all active polls with willSendEmails enabled that are currently running
    const now = Date.now();
    const activePolls = await db.select().from(polls)
      .where(and(
        eq(polls.status, 'active'),
        eq(polls.willSendEmails, true),
        lte(polls.startDate, now), // Poll has started
        gte(polls.endDate, now)    // Poll hasn't ended yet
      ))
      .all();

    if (activePolls.length === 0) {
      result.message = 'No active polls with email sending enabled that are currently running';
      console.log(result.message);
      return result;
    }

    console.log(`Found ${activePolls.length} active polls with email sending enabled`);

    for (const poll of activePolls) {
      try {
        // Get participants who haven't received an email yet (lastEmailSentAt is null)
        // and who haven't voted yet
        const participants = await db.select().from(pollParticipants)
          .where(and(
            eq(pollParticipants.pollId, poll.id),
            isNull(pollParticipants.lastEmailSentAt),
            eq(pollParticipants.hasVoted, false),
            eq(pollParticipants.status, 'approved') // Only send to approved participants
          ))
          .all();

        if (participants.length === 0) {
          console.log(`No eligible participants for poll ${poll.id}`);
          continue;
        }

        console.log(`Processing ${participants.length} eligible participants for poll ${poll.id}`);

        // Send emails to participants in order
        for (const participant of participants) {
          try {
            // Check if any SMTP config is available
            const availableConfigs = await db.select().from(smtpConfig)
              .where(and(
                sql`"daily_sent" < "daily_limit"`,
                sql`"cron_sent" < "cron_limit"`
              ))
              .orderBy(smtpConfig.order)
              .all();

            if (availableConfigs.length === 0) {
              console.log('No available SMTP configurations, stopping email sending');
              result.message = 'All SMTP configurations have reached their limits';
              break;
            }

            // Prepare email content with poll-specific information
            const pollUrl = `${env.FRONTEND_URL || 'http://localhost:5173'}/poll/${poll.id}?token=${participant.token}`;
            
            // Prepare template variables
            const templateVariables: TemplateVariables = {
              participantName: participant.name,
              pollTitle: poll.title,
              pollDescription: poll.description || 'No description provided',
              pollUrl: pollUrl,
              pollStartDate: toLocaleDateString(poll.startDate, env),
              pollEndDate: toLocaleDateString(poll.endDate, env),
            };
            
            // Get template ID from poll settings (if exists)
            const pollSettings = typeof poll.settings === 'string' ? JSON.parse(poll.settings) : poll.settings;
            const templateId = pollSettings?.mailTemplateId || null;
            
            // Send email using template
            const emailResult = await sendEmailWithTemplate(
              db,
              'next-available',
              participant.email,
              templateId,
              templateVariables,
              true // isCronJob
            );

            if (emailResult.success) {
              // Update participant's lastEmailSentAt timestamp
              await db.update(pollParticipants)
                .set({ 
                  lastEmailSentAt: Date.now(),
                  updatedAt: Date.now()
                })
                .where(eq(pollParticipants.id, participant.id))
                .run();

              result.emailsSent++;
              console.log(`Email sent successfully to ${participant.email} for poll ${poll.id}`);
            } else {
              console.error(`Failed to send email to ${participant.email}: ${emailResult.error}`);
              result.errors.push(`Failed to send email to ${participant.email}: ${emailResult.error}`);
              
              // If it's an SMTP limit error, stop processing this poll
              if (emailResult.error?.includes('limit')) {
                console.log('SMTP limit reached, stopping email sending for this poll');
                break;
              }
            }

          } catch (error) {
            console.error(`Error processing participant ${participant.id}:`, error);
            result.errors.push(`Error processing participant ${participant.id}: ${error}`);
          }
        }

        result.pollsProcessed++;

      } catch (error) {
        console.error(`Error processing poll ${poll.id}:`, error);
        result.errors.push(`Error processing poll ${poll.id}: ${error}`);
      }
    }

  } catch (error) {
    console.error('Cron job error:', error);
    result.success = false;
    result.errors.push(`Cron job error: ${error}`);
  }

  console.log(`Cron job completed: ${result.emailsSent} emails sent to ${result.pollsProcessed} polls`);
  return result;
}

export async function resetDailyEmailCounts(env: any): Promise<CronJobResult> {
  const db = getDb(env.DB);
  const result: CronJobResult = {
    success: true,
    pollsProcessed: 0,
    emailsSent: 0,
    errors: []
  };

  try {
    console.log('Starting daily email count reset...');
    
    // Reset daily sent counts for all SMTP configurations
    await resetDailySentCounts(db);
    
    result.message = 'Daily email counts reset successfully';
    console.log(result.message);
    
  } catch (error) {
    console.error('Daily reset cron job error:', error);
    result.success = false;
    result.errors.push(`Daily reset error: ${error}`);
  }

  return result;
} 
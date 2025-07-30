import { getDb } from '../models/db';
import { polls, pollParticipants, smtpConfig } from '../models/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { sendEmail, resetCronSentCounts } from './mail';

export interface CronJobResult {
  success: boolean;
  pollsProcessed: number;
  emailsSent: number;
  errors: string[];
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

    // Get all active polls with willSendEmails enabled
    const activePolls = await db.select().from(polls)
      .where(and(
        eq(polls.status, 'active'),
        eq(polls.willSendEmails, true)
      ))
      .all();

    if (activePolls.length === 0) {
      console.log('No active polls with email sending enabled');
      return result;
    }

    console.log(`Found ${activePolls.length} active polls with email sending enabled`);

    for (const poll of activePolls) {
      try {
        // Get participants who haven't received an email yet (lastEmailSentAt is null)
        const participants = await db.select().from(pollParticipants)
          .where(and(
            eq(pollParticipants.pollId, poll.id),
            isNull(pollParticipants.lastEmailSentAt)
          ))
          .all();

        if (participants.length === 0) {
          console.log(`No participants without emails for poll ${poll.id}`);
          continue;
        }

        console.log(`Processing ${participants.length} participants for poll ${poll.id}`);

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
              break;
            }

            // Prepare email content
            const emailData = {
              to: participant.email,
              subject: `Voting Invitation: ${poll.title}`,
              body: `Hello ${participant.name},\n\nYou have been invited to participate in the poll: "${poll.title}".\n\nPlease visit the poll link to cast your vote.\n\nBest regards,\nPoll System`,
              html: `
                <h2>Voting Invitation</h2>
                <p>Hello ${participant.name},</p>
                <p>You have been invited to participate in the poll: <strong>${poll.title}</strong>.</p>
                <p>Please visit the poll link to cast your vote.</p>
                <p>Best regards,<br>Poll System</p>
              `
            };

            // Send email using next available SMTP config
            const emailResult = await sendEmail(db, 'next-available', emailData, true);

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
              console.log(`Email sent successfully to ${participant.email}`);
            } else {
              console.error(`Failed to send email to ${participant.email}: ${emailResult.error}`);
              result.errors.push(`Failed to send email to ${participant.email}: ${emailResult.error}`);
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
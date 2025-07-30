import { smtpConfig, SmtpConfig } from '../models/schema';
import { eq, sql } from 'drizzle-orm';
import { WorkerMailer } from 'worker-mailer';

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export async function sendEmail(
  db: any, 
  smtpId: string, 
  emailData: EmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    let config: SmtpConfig;
    
    // Handle "next-available" case
    if (smtpId === 'next-available') {
      // Get all SMTP configs ordered by priority (order field)
      const configs = await db.select().from(smtpConfig).orderBy(smtpConfig.order).all();
      
      if (configs.length === 0) {
        return { success: false, error: 'No SMTP configurations available' };
      }

      // Find the first available SMTP config (dailySent < dailyLimit)
      config = configs.find((cfg: SmtpConfig) => cfg.dailySent < cfg.dailyLimit);
      
      if (!config) {
        return { success: false, error: 'All SMTP configurations have reached their daily limits' };
      }
    } else {
      // Get specific SMTP configuration
      config = await db.select().from(smtpConfig).where(eq(smtpConfig.id, smtpId)).get();
      if (!config) {
        return { success: false, error: 'SMTP configuration not found' };
      }

      // Check daily limit
      if (config.dailySent >= config.dailyLimit) {
        return { success: false, error: 'Daily email limit reached' };
      }
    }

    // Send email using worker-mailer
    const mailer = await WorkerMailer.connect({
      host: config.host,
      port: config.port,
      secure: config.secure,
      startTls: !config.secure,
      credentials: {
        username: config.user,
        password: config.password,
      },
      authType: 'plain',
    });

    await mailer.send({
      from: config.user,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.body,
      html: emailData.html || emailData.body,
    });

    await mailer.close();

    // Update daily sent count
    await db.update(smtpConfig)
      .set({ 
        dailySent: sql`"daily_sent" + 1`,
        updatedAt: Date.now()
      })
      .where(eq(smtpConfig.id, config.id))
      .run();

    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Email sending failed' 
    };
  }
}

export async function resetDailySentCounts(db: any): Promise<void> {
  try {
    await db.update(smtpConfig)
      .set({ 
        dailySent: 0,
        updatedAt: Date.now()
      })
      .run();
  } catch (error) {
    console.error('Error resetting daily sent counts:', error);
  }
} 
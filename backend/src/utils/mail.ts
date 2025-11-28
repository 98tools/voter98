import { smtpConfig, SmtpConfig, mailTemplates, MailTemplate } from '../models/schema';
import { eq, sql } from 'drizzle-orm';
import { WorkerMailer } from 'worker-mailer';

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

// Available template variables
export interface TemplateVariables {
  participantName?: string;
  pollTitle?: string;
  pollDescription?: string;
  pollUrl?: string;
  pollStartDate?: string;
  pollEndDate?: string;
  [key: string]: string | undefined;
}

// Replace variables in template
export function replaceTemplateVariables(template: string, variables: TemplateVariables): string {
  let result = template;
  
  // Replace all {{variable}} patterns
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
  }
  
  return result;
}

// Get available template variables list
export function getAvailableVariables(): string[] {
  return [
    'participantName',
    'pollTitle',
    'pollDescription',
    'pollUrl',
    'pollStartDate',
    'pollEndDate'
  ];
}

export async function sendEmail(
  db: any, 
  smtpId: string, 
  emailData: EmailData,
  isCronJob: boolean = false
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

      // Find the first available SMTP config based on limits
      config = configs.find((cfg: SmtpConfig) => {
        if (isCronJob) {
          // For cron jobs, check both daily and cron limits
          return cfg.dailySent < cfg.dailyLimit && cfg.cronSent < cfg.cronLimit;
        } else {
          // For manual sending, only check daily limit
          return cfg.dailySent < cfg.dailyLimit;
        }
      });
      
      if (!config) {
        if (isCronJob) {
          return { success: false, error: 'All SMTP configurations have reached their daily or cron limits' };
        } else {
          return { success: false, error: 'All SMTP configurations have reached their daily limits' };
        }
      }
    } else {
      // Get specific SMTP configuration
      config = await db.select().from(smtpConfig).where(eq(smtpConfig.id, smtpId)).get();
      if (!config) {
        return { success: false, error: 'SMTP configuration not found' };
      }

      // Check limits based on context
      if (isCronJob) {
        if (config.dailySent >= config.dailyLimit) {
          return { success: false, error: 'Daily email limit reached' };
        }
        if (config.cronSent >= config.cronLimit) {
          return { success: false, error: 'Cron email limit reached' };
        }
      } else {
        if (config.dailySent >= config.dailyLimit) {
          return { success: false, error: 'Daily email limit reached' };
        }
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

    // Update sent counts
    const updateData: any = {
      dailySent: sql`"daily_sent" + 1`,
      updatedAt: Date.now()
    };
    
    if (isCronJob) {
      updateData.cronSent = sql`"cron_sent" + 1`;
    }
    
    await db.update(smtpConfig)
      .set(updateData)
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

export async function resetCronSentCounts(db: any): Promise<void> {
  try {
    await db.update(smtpConfig)
      .set({ 
        cronSent: 0,
        updatedAt: Date.now()
      })
      .run();
  } catch (error) {
    console.error('Error resetting cron sent counts:', error);
  }
}

// Send email using a mail template
export async function sendEmailWithTemplate(
  db: any,
  smtpId: string,
  to: string,
  templateId: string | null,
  variables: TemplateVariables,
  isCronJob: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    let template: MailTemplate | undefined;
    
    // Get template (specific or default)
    if (templateId) {
      template = await db.select().from(mailTemplates)
        .where(eq(mailTemplates.id, templateId))
        .get();
    }
    
    // If no specific template or not found, get default
    if (!template) {
      template = await db.select().from(mailTemplates)
        .where(eq(mailTemplates.isDefault, true))
        .get();
    }
    
    // If still no template, use hardcoded default
    if (!template) {
      const subject = `Voting Invitation: {{pollTitle}}`;
      const body = `Hello {{participantName}},

You have been invited to participate in the poll: "{{pollTitle}}".

Poll Description: {{pollDescription}}

Please visit the following link to cast your vote:
{{pollUrl}}

This poll is active from {{pollStartDate}} to {{pollEndDate}}.

Best regards,
Poll System`;
      const html = `
        <h2>Voting Invitation</h2>
        <p>Hello {{participantName}},</p>
        <p>You have been invited to participate in the poll: <strong>{{pollTitle}}</strong>.</p>
        <p><strong>Description:</strong> {{pollDescription}}</p>
        <p>Please visit the following link to cast your vote:</p>
        <p><a href="{{pollUrl}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Vote Now</a></p>
        <p><strong>Poll Period:</strong> {{pollStartDate}} to {{pollEndDate}}</p>
        <p>Best regards,<br>Poll System</p>
      `;
      
      return await sendEmail(db, smtpId, {
        to,
        subject: replaceTemplateVariables(subject, variables),
        body: replaceTemplateVariables(body, variables),
        html: replaceTemplateVariables(html, variables),
      }, isCronJob);
    }
    
    // Use the template with variable replacement
    const emailData: EmailData = {
      to,
      subject: replaceTemplateVariables(template.subject, variables),
      body: replaceTemplateVariables(template.body, variables),
      html: template.htmlBody ? replaceTemplateVariables(template.htmlBody, variables) : undefined,
    };
    
    return await sendEmail(db, smtpId, emailData, isCronJob);
  } catch (error) {
    console.error('Send email with template error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email with template'
    };
  }
} 
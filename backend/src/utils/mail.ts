import { getDb } from '../models/db';
import { smtpConfig } from '../models/schema';
import { eq, sql } from 'drizzle-orm';
import { WorkerMailer } from 'worker-mailer';

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface SMTPConfig {
  id: string;
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
  dailyLimit: number;
  dailySent: number;
  order: number;
}

export async function getSMTPConfig(db: any, smtpId: string): Promise<SMTPConfig | null> {
  try {
    const config = await db.select().from(smtpConfig).where(eq(smtpConfig.id, smtpId)).get();
    return config || null;
  } catch (error) {
    console.error('Error fetching SMTP config:', error);
    return null;
  }
}

export async function updateDailySentCount(db: any, smtpId: string): Promise<void> {
  try {
    await db.update(smtpConfig)
      .set({ 
        dailySent: sql`"daily_sent" + 1`,
        updatedAt: Date.now()
      })
      .where(eq(smtpConfig.id, smtpId))
      .run();
  } catch (error) {
    console.error('Error updating daily sent count:', error);
  }
}

export async function sendEmail(
  db: any, 
  smtpId: string, 
  emailData: EmailData
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    // Get SMTP configuration
    const config = await getSMTPConfig(db, smtpId);
    if (!config) {
      return { success: false, error: 'SMTP configuration not found' };
    }

    // Check daily limit
    if (config.dailySent >= config.dailyLimit) {
      return { success: false, error: 'Daily email limit reached for this SMTP configuration' };
    }

    // For Cloudflare Workers, we'll use a simple SMTP client approach
    // This is a basic implementation - in production, you might want to use a service like Resend, SendGrid, etc.
    const smtpResponse = await sendSMTPEmail(config, emailData);
    
    if (smtpResponse.success) {
      // Update daily sent count
      console.log(`Email sent successfully, message ID: ${smtpResponse.messageId}`);
      await updateDailySentCount(db, smtpId);
      return { success: true, messageId: smtpResponse.messageId };
    } else {
      return { success: false, error: smtpResponse.error };
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

async function sendSMTPEmail(config: SMTPConfig, emailData: EmailData): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    // Use actual SMTP sending via a third-party service
    // We'll use a service like EmailJS or similar that works with Cloudflare Workers
    const smtpResponse = await sendViaSMTPService(config, emailData);
    
    if (smtpResponse.success) {
      console.log('Email sent via SMTP service:', smtpResponse.messageId);
      return { success: true, messageId: smtpResponse.messageId };
    } else {
      return { success: false, error: smtpResponse.error };
    }
  } catch (error) {
    console.error('SMTP error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'SMTP error occurred' 
    };
  }
}

async function sendViaSMTPService(config: SMTPConfig, emailData: EmailData): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    console.log(`Connecting to SMTP server: ${config.host}:${config.port}`);
    
    // Connect to SMTP server using worker-mailer
    const mailer = await WorkerMailer.connect({
      host: config.host,
      port: config.port,
      secure: config.secure,
      startTls: !config.secure, // Use STARTTLS if not using SSL/TLS
      credentials: {
        username: config.user,
        password: config.password,
      },
      authType: 'plain', // You can change this to 'login' or 'cram-md5' if needed
    });

    console.log('SMTP connection established successfully');

    // Send the email
    await mailer.send({
      from: config.user,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.body,
      html: emailData.html || emailData.body,
    });

    // Close the connection
    await mailer.close();
    
    console.log(`Email sent successfully via SMTP to ${emailData.to}`);
    return { success: true, messageId: `smtp-${Date.now()}` };
    
  } catch (error) {
    console.error('SMTP service error:', error);
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'SMTP service error occurred';
    
    if (error instanceof Error) {
      const errorStr = error.message.toLowerCase();
      
      if (errorStr.includes('authentication') || errorStr.includes('auth')) {
        errorMessage = 'Authentication failed: Invalid username or password';
      } else if (errorStr.includes('connection') || errorStr.includes('connect')) {
        errorMessage = 'Connection failed: Could not connect to SMTP server';
      } else if (errorStr.includes('timeout')) {
        errorMessage = 'Connection timeout: SMTP server did not respond';
      } else if (errorStr.includes('port')) {
        errorMessage = 'Port error: Invalid port number or port not accessible';
      } else {
        errorMessage = error.message;
      }
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

// Function to reset daily sent counts (can be called by a cron job)
export async function resetDailySentCounts(db: any): Promise<void> {
  try {
    await db.update(smtpConfig)
      .set({ 
        dailySent: 0,
        updatedAt: Date.now()
      })
      .run();
    console.log('Daily sent counts reset successfully');
  } catch (error) {
    console.error('Error resetting daily sent counts:', error);
  }
} 
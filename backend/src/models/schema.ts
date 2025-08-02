import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('user'), // 'admin', 'sub-admin', 'user'
  groupIDs: text('group_ids', { mode: 'json' }).notNull().default('[]'), // JSON array of group IDs
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now())
});

// User groups table
export const userGroups = sqliteTable('user_groups', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  description: text('description'),
  createdById: text('created_by_id').notNull().references(() => users.id),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now())
});

// Polls table
export const polls = sqliteTable('polls', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  title: text('title').notNull(),
  description: text('description'),
  startDate: integer('start_date').notNull(),
  endDate: integer('end_date').notNull(),
  status: text('status').notNull().default('draft'), // 'draft', 'active', 'completed', 'cancelled'
  managerId: text('manager_id').notNull().references(() => users.id),
  createdById: text('created_by_id').notNull().references(() => users.id),
  settings: text('settings', { mode: 'json' }).notNull().default('{}'), // JSON object for poll settings
  ballot: text('ballot', { mode: 'json' }).notNull().default('[]'), // JSON array of ballot questions
  willSendEmails: integer('will_send_emails', { mode: 'boolean' }).notNull().default(false), // Enable automatic email sending
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now())
});

// Poll auditors table (many-to-many relationship)
export const pollAuditors = sqliteTable('poll_auditors', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  pollId: text('poll_id').notNull().references(() => polls.id),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now())
});

// Poll editors table (many-to-many relationship)
export const pollEditors = sqliteTable('poll_editors', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  pollId: text('poll_id').notNull().references(() => polls.id),
  userId: text('user_id').notNull().references(() => users.id),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now())
});

// Poll participants table
export const pollParticipants = sqliteTable('poll_participants', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  pollId: text('poll_id').notNull().references(() => polls.id),
  userId: text('user_id').references(() => users.id), // null for non-user participants
  name: text('name').notNull(),
  email: text('email').notNull(),
  isUser: integer('is_user', { mode: 'boolean' }).notNull().default(false),
  token: text('token').unique(), // one-time use token for non-user participants
  tokenUsed: integer('token_used', { mode: 'boolean' }).notNull().default(false),
  voteWeight: real('vote_weight').notNull().default(1.0),
  status: text('status').notNull().default('pending'), // 'pending', 'approved', 'rejected'
  hasVoted: integer('has_voted', { mode: 'boolean' }).notNull().default(false),
  lastEmailSentAt: integer('last_email_sent_at'), // timestamp when last email was sent
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now())
});

// Poll votes table
export const pollVotes = sqliteTable('poll_votes', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  pollId: text('poll_id').notNull().references(() => polls.id),
  participantId: text('participant_id').notNull().references(() => pollParticipants.id),
  questionId: text('question_id').notNull(), // ID of the ballot question
  selectedOptions: text('selected_options', { mode: 'json' }).notNull(), // JSON array of selected option IDs
  voteWeight: real('vote_weight').notNull().default(1.0),
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now())
});

// SMTP table for storing email configurationss
export const smtpConfig = sqliteTable('smtp_config', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  host: text('host').notNull(),
  port: integer('port').notNull(),
  user: text('user').notNull(),
  password: text('password').notNull(),
  secure: integer('secure', { mode: 'boolean' }).notNull().default(false), // true for SSL, false for TLS
  createdAt: integer('created_at').notNull().$defaultFn(() => Date.now()),
  updatedAt: integer('updated_at').notNull().$defaultFn(() => Date.now()),
  dailyLimit: integer('daily_limit').notNull().default(100), // Daily email sending limit
  dailySent: integer('daily_sent').notNull().default(0), // Emails sent today
  cronLimit: integer('cron_limit').notNull().default(10), // Emails sent per cron job execution
  cronSent: integer('cron_sent').notNull().default(0), // Emails sent in current cron execution
  order: integer('order').notNull().default(1), // Order for prioritization
});


// Types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserGroup = typeof userGroups.$inferSelect;
export type NewUserGroup = typeof userGroups.$inferInsert;
export type Poll = typeof polls.$inferSelect;
export type NewPoll = typeof polls.$inferInsert;
export type PollParticipant = typeof pollParticipants.$inferSelect;
export type NewPollParticipant = typeof pollParticipants.$inferInsert;
export type PollVote = typeof pollVotes.$inferSelect;
export type NewPollVote = typeof pollVotes.$inferInsert;
export type SmtpConfig = typeof smtpConfig.$inferSelect;
export type NewSmtpConfig = typeof smtpConfig.$inferInsert;

// Ballot question and option types
export interface BallotOption {
  id: string;
  title: string;
  shortDescription?: string;
  longDescription?: string;
  link?: string;
  image?: string;
}

export interface BallotQuestion {
  id: string;
  title: string;
  description?: string;
  randomizedOrder?: boolean;
  minSelection?: number;
  maxSelection?: number;
  attachments?: string[];
  options: BallotOption[];
}

export interface PollSettings {
  showParticipantNames?: boolean;
  showVoteWeights?: boolean;
  showVoteCounts?: boolean;
  showResultsBeforeEnd?: boolean;
  allowResultsView?: boolean;
  voteWeightEnabled?: boolean;
}
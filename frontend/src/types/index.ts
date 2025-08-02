export interface UserGroup {
  id: string;
  name: string;
  description?: string;
  memberCount?: number;
  createdAt?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'sub-admin' | 'user';
  groupIDs?: string[];
  createdAt: number;
  groups?: UserGroup[];
}

export interface PollPermissions {
  canView: boolean;
  canEdit: boolean;
  canManage: boolean;
  canAudit: boolean;
  canViewResults: boolean;
  canViewParticipants: boolean;
  canManageParticipants: boolean;
  canViewSettings: boolean;
  canEditSettings: boolean;
  canDelete: boolean;
}

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
  allowVoteChanges?: boolean;
}

export interface Poll {
  id: string;
  title: string;
  description?: string;
  startDate: number;
  endDate: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  managerId: string;
  createdById: string;
  settings: PollSettings;
  ballot: BallotQuestion[];
  willSendEmails: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PollParticipant {
  id: string;
  pollId: string;
  userId?: string;
  name: string;
  email: string;
  isUser: boolean;
  token?: string;
  tokenUsed: boolean;
  voteWeight: number;
  status: 'pending' | 'approved' | 'rejected';
  hasVoted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface PollOptionResult {
  optionId: string;
  title: string;
  voteCount: number;
  weightedVoteCount: number;
  percentage: number;
  weightedPercentage: number;
}

export interface PollQuestionResult {
  questionId: string;
  title: string;
  totalVotes?: number;
  totalWeightedVotes?: number;
  options: PollOptionResult[];
}

export interface PollResultParticipant {
  id?: string;
  name?: string;
  email?: string;
  isUser?: boolean;
  voteWeight?: number;
  hasVoted: boolean;
  votedAt?: number;
}

export interface PollResults {
  poll: {
    id: string;
    title: string;
    description?: string;
    startDate: number;
    endDate: number;
    status: string;
    manager: {
      name?: string;
      email?: string;
    };
    auditors: Array<{
      id: string;
      name: string;
      email: string;
    }>;
    voteWeightEnabled: boolean;
  };
  statistics: {
    totalParticipants: number;
    votedParticipants: number;
    participationRate: number;
    totalVoteWeight?: number;
  };
  questions: PollQuestionResult[];
  participants: PollResultParticipant[];
  permissions: {
    canViewFullResults: boolean;
    canViewVoteCounts: boolean;
    canViewResultsBreakdown: boolean;
    canViewParticipantNames: boolean;
    canViewVoteWeights: boolean;
  };
}

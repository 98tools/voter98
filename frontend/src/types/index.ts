export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'sub-admin' | 'user';
  createdAt: number;
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

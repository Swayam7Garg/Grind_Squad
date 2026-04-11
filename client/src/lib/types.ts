export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type Platform   = 'LEETCODE' | 'GFG' | 'CODEFORCES' | 'OTHER';

export interface User {
  id: string;
  clerkId: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
  bio?: string | null;
  streak: number;
  maxStreak: number;
  totalPoints: number;
  lastSolvedAt?: string | null;
  _count?: { solves: number; notifications: number };
}

export interface UserSolve {
  id: string;
  userId: string;
  problemId: string;
  timeTaken?: number;
  approachNote?: string;
  solvedAt: string;
}

export interface Squad {
  id: string;
  name: string;
  description?: string | null;
  inviteCode: string;
  isPublic: boolean;
  avatarUrl?: string | null;
  memberLimit: number;
  tags: string[];
  members?: SquadMember[];
  _count?: { members: number; problems: number };
}

export interface SquadMember {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  points: number;
  joinedAt: string;
  userId: string;
  squadId: string;
  user: Pick<User, 'id' | 'username' | 'avatarUrl' | 'streak' | 'totalPoints'>;
}

export interface Problem {
  id: string;
  slug: string;
  title: string;
  url: string;
  difficulty: Difficulty;
  platform: Platform;
  tags: string[];
  createdAt: string;
}

export interface SquadProblem {
  id: string;
  note?: string | null;
  sharedAt: string;
  sharedBy: Pick<User, 'id' | 'username' | 'avatarUrl'>;
}

export interface ProblemFeedItem extends Problem {
  squadProblem: SquadProblem;
  solvedBy: Pick<User, 'id' | 'username' | 'avatarUrl'>[];
  isSolvedByMe: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl?: string | null;
  points: number;
  streak: number;
}

export interface Notification {
  id: string;
  type: string;
  payload: any;
  isRead: boolean;
  createdAt: string;
}

export interface SolveResult {
  pointsEarned: number;
  newStreak: number;
  totalPoints: number;
}

export interface Duel {
  id: string;
  challengerId: string;
  opponentId: string;
  problemId: string;
  squadId: string;
  winnerId?: string | null;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  timeLimit: number;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  challenger: Pick<User, 'id' | 'username' | 'avatarUrl'>;
  opponent: Pick<User, 'id' | 'username' | 'avatarUrl'>;
  winner?: Pick<User, 'id' | 'username' | 'avatarUrl'>;
  problem: Problem;
}

export interface Reaction {
  emoji: string;
  userId: string;
}

export interface Discussion {
  id: string;
  content: string;
  isSpoiler: boolean;
  userId: string;
  problemId: string;
  squadId: string;
  parentId?: string | null;
  createdAt: string;
  user: Pick<User, 'id' | 'username' | 'avatarUrl'>;
  replies?: Discussion[];
  reactions: Reaction[];
  _count?: { replies: number; reactions: number };
}

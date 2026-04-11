import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Clerk token to every request
export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

// ── Auth ──────────────────────────────────────────────────
export const syncUser = (data: { clerkId: string; email: string; username: string; avatarUrl?: string }) =>
  api.post('/api/auth/sync', data);

// ── Squads ────────────────────────────────────────────────
export const getMySquads = () => api.get('/api/users/me/squads');
export const createSquad = (data: { name: string; description?: string; isPublic?: boolean }) =>
  api.post('/api/squads', data);
export const getSquad = (squadId: string) => api.get(`/api/squads/${squadId}`);
export const joinSquad = (inviteCode: string) => api.post('/api/squads/join', { inviteCode });
export const leaveSquad = (squadId: string) => api.delete(`/api/squads/${squadId}/leave`);
export const deleteSquad = (squadId: string) => api.delete(`/api/squads/${squadId}`);
export const getSquadMembers = (squadId: string) =>
  api.get(`/api/squads/${squadId}`).then(r => r.data?.data?.members ?? []);

export const addMember = (squadId: string, userId: string) =>
  api.post(`/api/squads/${squadId}/members`, { userId });

export const removeMember = (squadId: string, memberUserId: string) =>
  api.delete(`/api/squads/${squadId}/members/${memberUserId}`);

// ── Problems ──────────────────────────────────────────────
export const getSquadProblems = (
  squadId: string,
  params?: { tag?: string; difficulty?: string; page?: number; limit?: number; solved?: boolean }
) => api.get(`/api/squads/${squadId}/problems`, { params });

export const shareToSquad = (
  squadId: string,
  data: { url: string; title: string; difficulty: string; tags: string[]; note?: string }
) => api.post(`/api/squads/${squadId}/problems`, data);

export const markSolved = (
  squadId: string,
  problemId: string,
  data?: { timeTaken?: number; approachNote?: string }
) => api.post(`/api/squads/${squadId}/problems/${problemId}/solve`, data ?? {});

export const listProblems = (params?: { platform?: string; difficulty?: string; tag?: string; search?: string }) =>
  api.get('/api/problems', { params });

// ── Leaderboard ───────────────────────────────────────────
export const getSquadLeaderboard = (squadId: string, type: 'alltime' | 'weekly' = 'alltime') =>
  api.get(`/api/leaderboard/squad/${squadId}`, { params: { type } });

export const getGlobalLeaderboard = () => api.get('/api/leaderboard/global');

// ── Notifications ─────────────────────────────────────────
export const getNotifications = () => api.get('/api/notifications');
export const markNotificationsRead = (ids: string[]) =>
  api.post('/api/notifications/read', { notificationIds: ids });

// ── Users ─────────────────────────────────────────────────
export const getMe = () => api.get('/api/users/me');
export const updateProfile = (data: { username?: string; bio?: string; avatarUrl?: string }) =>
  api.patch('/api/users/me', data);
export const getActivities = () => api.get('/api/users/me/activities');
export const searchUsers = (q: string) => api.get('/api/users/search', { params: { q } });

// ── Duels ─────────────────────────────────────────────────
export const getSquadDuels = (squadId: string) => api.get(`/api/squads/${squadId}/duels`); // Wait, does squad have /duels endpoint? Actually we list duels via /api/duels? No, let's look at duels backend.
export const createDuel = (data: { opponentId: string; problemId: string; squadId: string; timeLimit?: number }) => api.post('/api/duels', data);
export const getDuel = (duelId: string) => api.get(`/api/duels/${duelId}`);
export const acceptDuel = (duelId: string) => api.patch(`/api/duels/${duelId}/accept`);
export const completeDuel = (duelId: string) => api.patch(`/api/duels/${duelId}/complete`);
export const cancelDuel = (duelId: string) => api.patch(`/api/duels/${duelId}/cancel`);

// ── Discussions ───────────────────────────────────────────
export const createDiscussion = (data: { content: string; problemId: string; squadId: string; isSpoiler?: boolean; parentId?: string }) => api.post('/api/discussions', data);
export const listDiscussions = (problemId: string, squadId: string, page = 1) => api.get('/api/discussions', { params: { problemId, squadId, page } });
export const addReaction = (discussionId: string, emoji: string) => api.post(`/api/discussions/${discussionId}/reactions`, { emoji });
export const deleteDiscussion = (discussionId: string) => api.delete(`/api/discussions/${discussionId}`);

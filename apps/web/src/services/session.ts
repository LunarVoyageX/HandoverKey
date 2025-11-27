import api from "./api";

export interface Session {
  id: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  lastActivity: string;
  expiresAt: string;
  createdAt: string;
  isCurrent?: boolean;
}

export const sessionApi = {
  getSessions: async () => {
    const response = await api.get("/api/v1/sessions");
    return response.data.sessions as Session[];
  },

  invalidateSession: async (sessionId: string) => {
    const response = await api.delete(`/api/v1/sessions/${sessionId}`);
    return response.data;
  },

  invalidateAllOtherSessions: async () => {
    const response = await api.post("/api/v1/sessions/invalidate-others");
    return response.data;
  },
};

import api from "./api";

export interface InactivitySettings {
  userId: string;
  thresholdDays: number;
  warningDays: number;
  requireMajority: boolean;
  isPaused: boolean;
  pausedUntil?: string;
  lastCheckIn?: string;
  nextCheckInDeadline?: string;
}

export interface UpdateInactivitySettingsData {
  thresholdDays?: number;
  warningDays?: number;
  requireMajority?: boolean;
  isPaused?: boolean;
  pausedUntil?: string | null;
}

export const inactivityApi = {
  getSettings: async () => {
    const response = await api.get("/api/v1/inactivity/settings");
    return response.data as InactivitySettings;
  },

  updateSettings: async (settings: UpdateInactivitySettingsData) => {
    const response = await api.put("/api/v1/inactivity/settings", settings);
    return response.data as InactivitySettings;
  },

  pauseSwitch: async (pauseUntil?: string) => {
    const response = await api.post("/api/v1/inactivity/pause", { pauseUntil });
    return response.data;
  },

  resumeSwitch: async () => {
    const response = await api.post("/api/v1/inactivity/resume", {});
    return response.data;
  },

  checkIn: async () => {
    const response = await api.post("/api/v1/activity/check-in", {});
    return response.data;
  },
};

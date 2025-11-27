import api from "./api";

export interface Successor {
  id: string;
  email: string;
  name?: string;
  verified: boolean;
  handoverDelayDays: number;
  createdAt: string;
}

export interface AddSuccessorData {
  email: string;
  name?: string;
  handoverDelayDays?: number;
}

export interface UpdateSuccessorData {
  name?: string;
  handoverDelayDays?: number;
}

export const successorApi = {
  getSuccessors: async (): Promise<Successor[]> => {
    const response = await api.get("/api/v1/successors");
    return response.data.successors;
  },

  getSuccessor: async (id: string): Promise<Successor> => {
    const response = await api.get(`/api/v1/successors/${id}`);
    return response.data;
  },

  addSuccessor: async (data: AddSuccessorData): Promise<Successor> => {
    const response = await api.post("/api/v1/successors", data);
    return response.data.successor;
  },

  updateSuccessor: async (
    id: string,
    data: UpdateSuccessorData,
  ): Promise<Successor> => {
    const response = await api.put(`/api/v1/successors/${id}`, data);
    return response.data.successor;
  },

  deleteSuccessor: async (id: string): Promise<void> => {
    await api.delete(`/api/v1/successors/${id}`);
  },

  verifySuccessor: async (
    id: string,
    verificationToken: string,
  ): Promise<void> => {
    await api.post(`/api/v1/successors/${id}/verify`, { verificationToken });
  },
};

import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";
import { clearMasterKey } from "../services/encryption";
import { realtimeClient } from "../services/realtime";

interface User {
  id: string;
  email: string;
  name?: string;
  createdAt?: string;
  twoFactorEnabled?: boolean;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/auth/profile");
        setUser(response.data.user);
      } catch {
        // Not authenticated or cookie expired -- that's fine
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      realtimeClient.connect();
      return;
    }
    realtimeClient.disconnect();
  }, [user]);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Even if logout API fails, clear local state
    }
    setUser(null);
    realtimeClient.disconnect();
    clearMasterKey();
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

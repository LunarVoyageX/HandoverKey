import React, { useEffect, useState } from "react";
import { AxiosError } from "axios";
import api from "../services/api";
import { useToast } from "../contexts/ToastContext";

interface DashboardStats {
  totalUsers: number;
  verifiedUsers: number;
  lockedUsers: number;
  activeHandovers: number;
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLogin: string | null;
  createdAt: string;
}

const AdminDashboard: React.FC = () => {
  const { success, error: showError } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isForbidden, setIsForbidden] = useState(false);

  const loadDashboard = async () => {
    try {
      const [statsResponse, usersResponse] = await Promise.all([
        api.get("/admin/dashboard"),
        api.get("/admin/users?limit=25"),
      ]);
      setStats(statsResponse.data?.stats || null);
      setUsers(usersResponse.data?.users || []);
      setIsForbidden(false);
    } catch (err) {
      const error = err as AxiosError;
      if (error.response?.status === 403) {
        setIsForbidden(true);
      } else {
        showError("Failed to load admin dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const handleSearch = async () => {
    try {
      const response = await api.get(
        `/admin/users?limit=25&search=${encodeURIComponent(search)}`,
      );
      setUsers(response.data?.users || []);
    } catch {
      showError("Failed to search users");
    }
  };

  const handleUnlock = async (userId: string) => {
    try {
      await api.post(`/admin/users/${userId}/unlock`);
      success("Account unlocked");
      await handleSearch();
      await loadDashboard();
    } catch {
      showError("Failed to unlock account");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Admin Access Required
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Your account is not configured in the admin allowlist.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-700">
          Operational visibility, account lockout management, and user lookup.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="card p-4">
          <p className="text-xs uppercase text-gray-500">Total Users</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {stats?.totalUsers ?? 0}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-gray-500">Verified Users</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {stats?.verifiedUsers ?? 0}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-gray-500">Locked Users</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {stats?.lockedUsers ?? 0}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-gray-500">Active Handovers</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {stats?.activeHandovers ?? 0}
          </p>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            className="input"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSearch}
          >
            Search
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map((user) => {
                const isLocked =
                  user.lockedUntil &&
                  new Date(user.lockedUntil).getTime() > Date.now();
                return (
                  <tr key={user.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <p className="font-medium">{user.name || "Unknown"}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {isLocked ? "Locked" : "Active"}
                      {user.failedLoginAttempts > 0 && (
                        <span className="ml-2 text-xs text-amber-700">
                          ({user.failedLoginAttempts} failed attempts)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {isLocked ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleUnlock(user.id)}
                        >
                          Unlock
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">
                          No action needed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

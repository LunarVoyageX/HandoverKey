import React, { useState, useEffect } from "react";
import {
  TrashIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";
import { sessionApi, Session } from "../services/session";

const SessionManager: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await sessionApi.getSessions();
      setSessions(data);
    } catch (err) {
      setError("Failed to load sessions.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!window.confirm("Are you sure you want to revoke this session?"))
      return;
    try {
      await sessionApi.invalidateSession(sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));
    } catch (err) {
      setError("Failed to revoke session.");
      console.error(err);
    }
  };

  const handleRevokeOthers = async () => {
    if (!window.confirm("Are you sure you want to revoke all other sessions?"))
      return;
    try {
      await sessionApi.invalidateAllOtherSessions();
      await fetchSessions();
    } catch (err) {
      setError("Failed to revoke sessions.");
      console.error(err);
    }
  };

  if (loading)
    return <div className="text-center py-4">Loading sessions...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Active Sessions</h3>
        {sessions.length > 1 && (
          <button
            onClick={handleRevokeOthers}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Revoke All Others
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {sessions.map((session) => (
            <li key={session.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                    {session.userAgent?.toLowerCase().includes("mobile") ? (
                      <DevicePhoneMobileIcon className="h-6 w-6" />
                    ) : (
                      <ComputerDesktopIcon className="h-6 w-6" />
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {session.ipAddress || "Unknown IP"}
                      {session.isCurrent && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Last active:{" "}
                      {new Date(session.lastActivity).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400 truncate max-w-xs sm:max-w-sm">
                      {session.userAgent}
                    </div>
                  </div>
                </div>
                {!session.isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    className="ml-4 p-2 text-gray-400 hover:text-red-600 transition-colors"
                    aria-label="Revoke session"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SessionManager;

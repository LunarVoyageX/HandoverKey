import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import InactivitySettingsModal from "../components/InactivitySettingsModal";
import SessionManager from "../components/SessionManager";
import SuccessorManagement from "../components/SuccessorManagement";
import { inactivityApi, InactivitySettings } from "../services/inactivity";
import { successorApi, Successor } from "../services/successor";
import { vaultApi } from "../services/vault";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSuccessorModal, setShowSuccessorModal] = useState(false);
  const [settings, setSettings] = useState<InactivitySettings | null>(null);
  const [successors, setSuccessors] = useState<Successor[]>([]);
  const [vaultCount, setVaultCount] = useState<number>(0);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchSuccessors();
    fetchVaultCount();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await inactivityApi.getSettings();
      setSettings(data);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const fetchSuccessors = async () => {
    try {
      const data = await successorApi.getSuccessors();
      setSuccessors(data);
    } catch (error) {
      console.error("Failed to fetch successors:", error);
    }
  };

  const fetchVaultCount = async () => {
    try {
      const entries = await vaultApi.getEntries();
      setVaultCount(entries.length);
    } catch (error) {
      console.error("Failed to fetch vault count:", error);
    }
  };

  const handleCheckIn = async () => {
    try {
      setCheckingIn(true);
      await inactivityApi.checkIn();
      await fetchSettings(); // Refresh settings to update last check-in
      window.alert("Check-in successful!");
    } catch (error) {
      console.error("Check-in failed:", error);
      window.alert("Check-in failed. Please try again.");
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back, {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Vault Status
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total entries:</span>
              <span className="font-medium">{vaultCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Encrypted:</span>
              <span className="font-medium text-green-600">✓ Yes</span>
            </div>
          </div>
          <button
            onClick={() => navigate("/vault")}
            className="mt-4 btn-primary w-full"
          >
            {vaultCount > 0 ? "Manage Vault" : "Add New Entry"}
          </button>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Successors</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Trusted contacts:</span>
              <span className="font-medium">{successors.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Verified:</span>
              <span className="font-medium">
                {successors.filter((s) => s.verified).length}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowSuccessorModal(true)}
            className="mt-4 btn-primary w-full"
          >
            Manage Successors
          </button>
        </div>

        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Handover Settings
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Inactivity period:</span>
              <span className="font-medium">
                {settings ? `${settings.thresholdDays} days` : "Loading..."}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span
                className={`font-medium ${
                  settings?.isPaused ? "text-yellow-600" : "text-green-600"
                }`}
              >
                {settings
                  ? settings.isPaused
                    ? "Paused"
                    : "Active"
                  : "Loading..."}
              </span>
            </div>
            {settings?.nextCheckInDeadline && (
              <div className="flex justify-between">
                <span className="text-gray-600">Next Deadline:</span>
                <span className="font-medium text-sm">
                  {new Date(settings.nextCheckInDeadline).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="btn-secondary flex-1"
            >
              Configure
            </button>
            <button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="btn-primary flex-1"
            >
              {checkingIn ? "..." : "Check In"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="text-center py-8 text-gray-500">
            <p>No recent activity</p>
            <p className="text-sm mt-2">Your vault activity will appear here</p>
          </div>
        </div>

        <div className="card">
          <SessionManager />
        </div>
      </div>

      <div className="mt-8">
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Security Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  Two-Factor Authentication
                </p>
                <p className="text-sm text-gray-600">
                  Add an extra layer of security
                </p>
              </div>
              <button className="btn-secondary">
                {user?.twoFactorEnabled ? "Configure" : "Enable"}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Last Login</p>
                <p className="text-sm text-gray-600">
                  {user?.lastActivity
                    ? new Date(user.lastActivity).toLocaleString()
                    : "Never"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSettingsModal && (
        <InactivitySettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSave={() => {
            setShowSettingsModal(false);
            fetchSettings();
          }}
        />
      )}

      {showSuccessorModal && (
        <SuccessorManagement
          onClose={() => {
            setShowSuccessorModal(false);
            fetchSuccessors();
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;

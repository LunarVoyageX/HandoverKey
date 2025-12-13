import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import ConfirmationModal from "../components/ConfirmationModal";

interface InactivitySettings {
  thresholdDays: number;
  requireMajority: boolean;
  isPaused: boolean;
  pausedUntil?: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<InactivitySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get("/inactivity/settings");
      setSettings(response.data);
    } catch (error) {
      console.error("Failed to fetch settings", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setMessage("");
    try {
      await api.put("/inactivity/settings", {
        thresholdDays: Number(settings.thresholdDays),
        requireMajority: settings.requireMajority,
        isPaused: settings.isPaused,
      });
      setMessage("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings", error);
      setMessage("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete("/auth/delete-account");
      logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to delete account", error);
      setMessage("Failed to delete account");
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!settings) return <div>Error loading settings</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Settings
          </h2>
        </div>
      </div>

      <div className="card p-6">
        <form onSubmit={handleSave} className="space-y-6">
          {message && (
            <div
              className={`p-4 rounded-md ${message.includes("Failed") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
            >
              {message}
            </div>
          )}

          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Inactivity Threshold
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              How many days of inactivity before the handover process begins.
            </p>
            <div className="mt-4">
              <label
                htmlFor="threshold"
                className="block text-sm font-medium text-gray-700"
              >
                Days
              </label>
              <input
                type="number"
                id="threshold"
                min="1"
                className="input mt-1 max-w-xs"
                value={settings.thresholdDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    thresholdDays: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Security
            </h3>
            <div className="mt-4 flex items-start">
              <div className="flex h-6 items-center">
                <input
                  id="majority"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  checked={settings.requireMajority}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      requireMajority: e.target.checked,
                    })
                  }
                />
              </div>
              <div className="ml-3 text-sm leading-6">
                <label htmlFor="majority" className="font-medium text-gray-900">
                  Require Majority Consensus
                </label>
                <p className="text-gray-500">
                  If checked, a majority of your successors must verify the
                  handover request.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Dead Man's Switch
            </h3>
            <div className="mt-4 flex items-start">
              <div className="flex h-6 items-center">
                <input
                  id="paused"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  checked={settings.isPaused}
                  onChange={(e) =>
                    setSettings({ ...settings, isPaused: e.target.checked })
                  }
                />
              </div>
              <div className="ml-3 text-sm leading-6">
                <label htmlFor="paused" className="font-medium text-gray-900">
                  Pause Switch
                </label>
                <p className="text-gray-500">
                  Temporarily disable the inactivity check. Useful if you are
                  going on a long trip without internet.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200 flex justify-end">
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6 mt-8 border-red-200 bg-red-50">
        <h3 className="text-lg font-medium leading-6 text-red-900">
          Danger Zone
        </h3>
        <div className="mt-2 max-w-xl text-sm text-red-700">
          <p>
            Once you delete your account, there is no going back. Please be
            certain.
          </p>
        </div>
        <div className="mt-5">
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost."
        confirmText={isDeleting ? "Deleting..." : "Delete Account"}
        type="danger"
      />
    </div>
  );
};

export default Settings;

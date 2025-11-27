import React, { useState, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  inactivityApi,
  InactivitySettings,
  UpdateInactivitySettingsData,
} from "../services/inactivity";

interface InactivitySettingsModalProps {
  onClose: () => void;
  onSave: () => void;
}

const InactivitySettingsModal: React.FC<InactivitySettingsModalProps> = ({
  onClose,
  onSave,
}) => {
  const [settings, setSettings] = useState<InactivitySettings | null>(null);
  const [formData, setFormData] = useState<UpdateInactivitySettingsData>({
    thresholdDays: 90,
    warningDays: 7,
    requireMajority: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await inactivityApi.getSettings();
      setSettings(data);
      setFormData({
        thresholdDays: data.thresholdDays,
        warningDays: data.warningDays,
        requireMajority: data.requireMajority,
      });
    } catch (err) {
      setError("Failed to load settings.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setSaving(true);

    try {
      await inactivityApi.updateSettings(formData);
      setSuccessMessage("Settings updated successfully!");
      setTimeout(() => {
        onSave();
      }, 1500);
    } catch (err) {
      setError("Failed to update settings.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handlePauseToggle = async () => {
    if (!settings) return;
    setError("");
    setSuccessMessage("");
    setSaving(true);

    try {
      if (settings.isPaused) {
        await inactivityApi.resumeSwitch();
        setSuccessMessage("Dead man's switch resumed.");
      } else {
        await inactivityApi.pauseSwitch();
        setSuccessMessage("Dead man's switch paused.");
      }
      // Refresh settings
      await fetchSettings();
    } catch (err) {
      setError("Failed to toggle pause state.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Handover Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-green-800 text-sm">{successMessage}</p>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
            <div>
              <h3 className="font-medium text-gray-900">Status</h3>
              <p className="text-sm text-gray-500">
                {settings?.isPaused ? "Paused" : "Active"}
              </p>
            </div>
            <button
              type="button"
              onClick={handlePauseToggle}
              disabled={saving}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                settings?.isPaused
                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                  : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
              }`}
            >
              {settings?.isPaused ? "Resume" : "Pause"}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="thresholdDays"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Inactivity Threshold (Days)
              </label>
              <input
                id="thresholdDays"
                type="number"
                min="1"
                value={formData.thresholdDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    thresholdDays: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Days of inactivity before handover is triggered.
              </p>
            </div>

            <div>
              <label
                htmlFor="warningDays"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Warning Period (Days)
              </label>
              <input
                id="warningDays"
                type="number"
                min="1"
                value={formData.warningDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    warningDays: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Days before handover to start sending warnings.
              </p>
            </div>

            <div className="flex items-center">
              <input
                id="requireMajority"
                type="checkbox"
                checked={formData.requireMajority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    requireMajority: e.target.checked,
                  })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="requireMajority"
                className="ml-2 block text-sm text-gray-900"
              >
                Require majority of successors to confirm
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InactivitySettingsModal;

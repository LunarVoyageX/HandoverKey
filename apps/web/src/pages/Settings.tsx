import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import api from "../services/api";
import ConfirmationModal from "../components/ConfirmationModal";
import {
  decryptData,
  deriveAuthKey,
  deriveMasterKey,
  encryptDataWithKey,
  generateEncryptionSalt,
} from "../services/encryption";

interface InactivitySettings {
  thresholdDays: number;
  requireMajority: boolean;
  isPaused: boolean;
  pausedUntil?: string;
}

interface RawVaultEntry {
  id: string;
  encryptedData: string;
  iv: string;
  category?: string;
  tags?: string[];
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<InactivitySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [settingUpTwoFactor, setSettingUpTwoFactor] = useState(false);
  const [enablingTwoFactor, setEnablingTwoFactor] = useState(false);
  const [disablingTwoFactor, setDisablingTwoFactor] = useState(false);
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [setupQrCode, setSetupQrCode] = useState<string | null>(null);
  const [setupRecoveryCodes, setSetupRecoveryCodes] = useState<string[]>([]);
  const [setupToken, setSetupToken] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableToken, setDisableToken] = useState("");
  const [disableRecoveryCode, setDisableRecoveryCode] = useState("");
  const [profileName, setProfileName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { user, login, logout } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsResponse, profileResponse] = await Promise.all([
          api.get("/inactivity/settings"),
          api.get("/auth/profile"),
        ]);
        setSettings(settingsResponse.data);
        setProfileName(profileResponse.data.user?.name || "");
        setIsTwoFactorEnabled(
          Boolean(profileResponse.data.user?.twoFactorEnabled),
        );
      } catch {
        showError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSavingSettings(true);
    try {
      await api.put("/inactivity/settings", {
        thresholdDays: Number(settings.thresholdDays),
        requireMajority: settings.requireMajority,
        isPaused: settings.isPaused,
      });
      success("Inactivity settings updated");
    } catch {
      showError("Failed to update inactivity settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showError("Name is required");
      return;
    }

    setSavingProfile(true);
    try {
      const response = await api.put("/auth/profile", { name: profileName });
      login(response.data.user);
      success("Profile updated");
    } catch {
      showError("Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) {
      showError("Unable to determine account email");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError("New password and confirmation do not match");
      return;
    }
    if (newPassword.length < 12) {
      showError("New password must be at least 12 characters");
      return;
    }

    setChangingPassword(true);
    try {
      const vaultResponse = await api.get("/vault/entries");
      const rawEntries: RawVaultEntry[] = Array.isArray(vaultResponse.data.data)
        ? vaultResponse.data.data
        : vaultResponse.data;

      const decryptedEntries = await Promise.all(
        rawEntries.map(async (entry) => {
          const decrypted = await decryptData({
            encryptedData: entry.encryptedData,
            iv: entry.iv,
          });

          if (decrypted === null) {
            throw new Error("Failed to decrypt one or more vault entries");
          }

          return {
            id: entry.id,
            category: entry.category,
            tags: entry.tags,
            plaintext: decrypted,
          };
        }),
      );

      const newSalt = generateEncryptionSalt();
      const newMasterKey = await deriveMasterKey(newPassword, newSalt);
      const reEncryptedEntries = await Promise.all(
        decryptedEntries.map(async (entry) => {
          const encrypted = await encryptDataWithKey(
            entry.plaintext,
            newMasterKey,
          );
          return {
            id: entry.id,
            encryptedData: encrypted.encryptedData,
            iv: encrypted.iv,
            salt: encrypted.salt,
            algorithm: encrypted.algorithm,
            category: entry.category,
            tags: entry.tags,
          };
        }),
      );

      const currentAuthKey = await deriveAuthKey(currentPassword, user.email);
      const newAuthKey = await deriveAuthKey(newPassword, user.email);

      await api.put("/auth/change-password", {
        currentPassword: currentAuthKey,
        newPassword: newAuthKey,
        confirmPassword: newAuthKey,
        newSalt,
        reEncryptedEntries,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      success("Password changed. Please sign in again.");
      await logout();
      navigate("/login");
    } catch (error) {
      const apiError = error as {
        response?: {
          data?: { message?: string; error?: { message?: string } };
        };
      };
      showError(
        apiError.response?.data?.error?.message ||
          apiError.response?.data?.message ||
          "Failed to change password",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSetupTwoFactor = async () => {
    setSettingUpTwoFactor(true);
    try {
      const response = await api.post("/auth/2fa/setup", {});
      setSetupQrCode(response.data.qrCodeDataUrl);
      setSetupRecoveryCodes(response.data.recoveryCodes || []);
      setSetupToken("");
      success("Two-factor setup generated. Verify a code to enable it.");
    } catch {
      showError("Failed to initialize two-factor setup");
    } finally {
      setSettingUpTwoFactor(false);
    }
  };

  const handleEnableTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupToken || setupToken.length !== 6) {
      showError("Enter a valid 6-digit authenticator code");
      return;
    }

    setEnablingTwoFactor(true);
    try {
      await api.post("/auth/2fa/enable", { token: setupToken });
      setIsTwoFactorEnabled(true);
      setSetupQrCode(null);
      setSetupRecoveryCodes([]);
      setSetupToken("");
      success("Two-factor authentication enabled");
    } catch {
      showError("Failed to enable two-factor authentication");
    } finally {
      setEnablingTwoFactor(false);
    }
  };

  const handleDisableTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) {
      showError("Unable to determine account email");
      return;
    }
    if (!disablePassword) {
      showError("Current password is required");
      return;
    }
    if (!disableToken && !disableRecoveryCode) {
      showError("Provide a 2FA code or recovery code");
      return;
    }

    setDisablingTwoFactor(true);
    try {
      const currentAuthKey = await deriveAuthKey(disablePassword, user.email);
      await api.post("/auth/2fa/disable", {
        currentPassword: currentAuthKey,
        token: disableToken || undefined,
        recoveryCode: disableRecoveryCode
          ? disableRecoveryCode.toUpperCase().trim()
          : undefined,
      });
      setIsTwoFactorEnabled(false);
      setDisablePassword("");
      setDisableToken("");
      setDisableRecoveryCode("");
      success("Two-factor authentication disabled");
    } catch {
      showError("Failed to disable two-factor authentication");
    } finally {
      setDisablingTwoFactor(false);
    }
  };

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.delete("/auth/delete-account");
      await logout();
      navigate("/login");
    } catch {
      showError("Failed to delete account");
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
    <div className="max-w-3xl mx-auto">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Settings
          </h2>
        </div>
      </div>

      <div className="card p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900">Profile</h3>
        <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="profile-name"
              className="block text-sm font-medium text-gray-700"
            >
              Display Name
            </label>
            <input
              id="profile-name"
              className="input mt-1"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="btn btn-primary"
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900">
          Inactivity Controls
        </h3>
        <form onSubmit={handleSaveSettings} className="space-y-6 mt-4">
          <div>
            <label
              htmlFor="threshold"
              className="block text-sm font-medium text-gray-700"
            >
              Inactivity threshold (days)
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

          <div className="flex items-start">
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
                Require majority successor consensus
              </label>
              <p className="text-gray-500">
                If enabled, vault handover requires majority participation.
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex h-6 items-center">
              <input
                id="paused"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                checked={settings.isPaused}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    isPaused: e.target.checked,
                  })
                }
              />
            </div>
            <div className="ml-3 text-sm leading-6">
              <label htmlFor="paused" className="font-medium text-gray-900">
                Pause dead man's switch
              </label>
              <p className="text-gray-500">
                Temporarily disable inactivity checks when needed.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="btn btn-primary"
            >
              {savingSettings ? "Saving..." : "Save Inactivity Settings"}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
        <p className="mt-1 text-sm text-gray-500">
          Changing your password rotates your vault encryption key and securely
          re-encrypts all vault entries.
        </p>
        <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
          <div>
            <label
              htmlFor="current-password"
              className="block text-sm font-medium text-gray-700"
            >
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              className="input mt-1"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-gray-700"
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              className="input mt-1"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-gray-700"
            >
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              className="input mt-1"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={changingPassword}
              className="btn btn-primary"
            >
              {changingPassword ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900">
          Two-Factor Authentication
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Protect your account with time-based one-time passwords and recovery
          codes.
        </p>

        {!isTwoFactorEnabled ? (
          <div className="mt-4">
            <button
              onClick={handleSetupTwoFactor}
              disabled={settingUpTwoFactor}
              className="btn btn-primary"
            >
              {settingUpTwoFactor ? "Preparing..." : "Set Up 2FA"}
            </button>

            {setupQrCode && (
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Scan this QR code with your authenticator app
                  </p>
                  <img
                    src={setupQrCode}
                    alt="Two-factor QR code"
                    className="mt-3 w-56 h-56 border rounded-md"
                  />
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Recovery codes
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Save these codes now. Each code can be used once.
                  </p>
                  <div className="mt-2 rounded-md border border-gray-200 p-3 bg-gray-50">
                    {setupRecoveryCodes.map((code) => (
                      <p key={code} className="font-mono text-sm text-gray-700">
                        {code}
                      </p>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleEnableTwoFactor} className="space-y-3">
                  <div>
                    <label
                      htmlFor="setup-token"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Authenticator Code
                    </label>
                    <input
                      id="setup-token"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={setupToken}
                      onChange={(e) =>
                        setSetupToken(e.target.value.replace(/\D/g, ""))
                      }
                      className="input mt-1 max-w-xs"
                      placeholder="123456"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={enablingTwoFactor}
                      className="btn btn-primary"
                    >
                      {enablingTwoFactor ? "Enabling..." : "Enable 2FA"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleDisableTwoFactor} className="mt-4 space-y-4">
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
              Two-factor authentication is currently enabled.
            </p>
            <div>
              <label
                htmlFor="disable-password"
                className="block text-sm font-medium text-gray-700"
              >
                Current Password
              </label>
              <input
                id="disable-password"
                type="password"
                className="input mt-1"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="disable-token"
                className="block text-sm font-medium text-gray-700"
              >
                2FA Code (optional if using recovery code)
              </label>
              <input
                id="disable-token"
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="input mt-1 max-w-xs"
                value={disableToken}
                onChange={(e) =>
                  setDisableToken(e.target.value.replace(/\D/g, ""))
                }
                placeholder="123456"
              />
            </div>
            <div>
              <label
                htmlFor="disable-recovery"
                className="block text-sm font-medium text-gray-700"
              >
                Recovery Code (optional if using 2FA code)
              </label>
              <input
                id="disable-recovery"
                type="text"
                className="input mt-1 font-mono"
                value={disableRecoveryCode}
                onChange={(e) =>
                  setDisableRecoveryCode(
                    e.target.value.toUpperCase().replace(/[^A-F0-9-]/g, ""),
                  )
                }
                placeholder="A1B2C3-D4E5F6"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={disablingTwoFactor}
                className="btn btn-primary"
              >
                {disablingTwoFactor ? "Disabling..." : "Disable 2FA"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card p-6 border-red-200 bg-red-50">
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

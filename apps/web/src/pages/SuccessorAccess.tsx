import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ShieldCheckIcon,
  LockOpenIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { useToast } from "../contexts/ToastContext";
import { reconstructSecret } from "@handoverkey/crypto";
import { importRawMasterKey, decryptDataWithKey } from "../services/encryption";

interface VaultEntry {
  id: string;
  category: string;
  tags: string[];
  encryptedData: string;
  iv: string;
  algorithm: string;
  version: string;
}

/**
 * Successor Access Page
 *
 * This component handles the secure vault unlocking process for successors.
 *
 * Flow:
 * 1. Verifies the successor token via API.
 * 2. If verified and handover is active, allows user to input their key share and peer shares.
 * 3. Client-side reconstruction of the master key using Shamir's Secret Sharing.
 * 4. Imports the reconstructed raw key into Web Crypto API.
 * 5. Fetches encrypted vault entries from the API.
 * 6. Decrypts each entry locally using the master key.
 * 7. Displays decrypted data ephemerally (not saved to disk/storage).
 */
const SuccessorAccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success, error: showError, info } = useToast();

  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [status, setStatus] = useState<
    "IDLE" | "VERIFIED" | "ACCESS_DENIED" | "ERROR"
  >("IDLE");
  const [metadata, setMetadata] = useState<{
    userName?: string;
    handoverStatus?: string;
  }>({});

  const [myShare, setMyShare] = useState("");
  const [peerShares, setPeerShares] = useState<string[]>([""]);
  const [decryptedEntries, setDecryptedEntries] = useState<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array<VaultEntry & { decryptedData: any }>
  >([]);

  const verifyToken = useCallback(async () => {
    try {
      const response = await api.get(`/successors/verify?token=${token}`);
      if (response.data.success) {
        setMetadata({
          userName: response.data.userName,
          handoverStatus: response.data.handoverStatus,
        });

        const allowedStatuses = ["AWAITING_SUCCESSORS", "COMPLETED"];
        if (
          response.data.handoverStatus &&
          allowedStatuses.includes(response.data.handoverStatus)
        ) {
          setStatus("VERIFIED");
        } else {
          setStatus("ACCESS_DENIED");
        }
      } else {
        setStatus("ERROR");
      }
    } catch (err) {
      console.error("Token verification failed", err);
      setStatus("ERROR");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setStatus("ERROR");
      setLoading(false);
      return;
    }
    verifyToken();
  }, [token, verifyToken]);

  const handleAddPeerShare = () => {
    setPeerShares([...peerShares, ""]);
  };

  const handlePeerShareChange = (index: number, value: string) => {
    const newShares = [...peerShares];
    newShares[index] = value;
    setPeerShares(newShares);
  };

  const handleUnlockVault = async () => {
    if (!myShare) {
      showError("Please enter your key share.");
      return;
    }

    const allShares = [myShare, ...peerShares.filter((s) => s.trim() !== "")];

    setUnlocking(true);
    info("Reconstructing key and decrypting vault...");

    try {
      // 1. Fetch encrypted entries
      const response = await api.get(`/vault/successor-access?token=${token}`);
      const encryptedEntries: VaultEntry[] = response.data.entries;

      // 2. Convert shares from Base64 string to Uint8Array
      const shareBuffers = allShares.map((s) => {
        try {
          const binary = atob(s);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          return bytes;
        } catch {
          throw new Error("Invalid base64 share provided");
        }
      });

      // 3. Reconstruct secret
      const rawMasterKey = reconstructSecret(shareBuffers);

      // 4. Import key
      const masterKey = await importRawMasterKey(rawMasterKey);

      // 5. Decrypt entries
      const decrypted = await Promise.all(
        encryptedEntries.map(async (entry) => {
          const data = await decryptDataWithKey(
            { encryptedData: entry.encryptedData, iv: entry.iv },
            masterKey,
          );
          return { ...entry, decryptedData: data };
        }),
      );

      setDecryptedEntries(decrypted.filter((d) => d.decryptedData !== null));
      success("Vault unlocked successfully!");
    } catch (err) {
      console.error("Unlock failed", err);
      showError(
        "Failed to unlock vault. Please check if you have entered enough valid shares.",
      );
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
            role="status"
            aria-label="Loading"
          ></div>
        </div>
      </div>
    );
  }

  if (status === "ERROR") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Invalid Link
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              The access link you used is invalid or has expired.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 btn btn-primary w-full"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "ACCESS_DENIED") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <ShieldCheckIcon className="mx-auto h-12 w-12 text-yellow-500" />
            <h2 className="mt-6 text-2xl font-bold text-gray-900">
              Access Not Yet Available
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {metadata.userName}'s vault is not yet open for successors. The
              handover process status is currently:{" "}
              <span className="font-semibold text-blue-600">
                {metadata.handoverStatus}
              </span>
              .
            </p>
            <p className="mt-4 text-xs text-gray-500 italic">
              Access is only granted after the inactivity period and handover
              process has started.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 btn btn-primary w-full"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-blue-600">
            <h3 className="text-lg leading-6 font-medium text-white flex items-center gap-2">
              <LockOpenIcon className="h-6 w-6" />
              Secure Successor Access
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-blue-100">
              Unlocking {metadata.userName}'s Vault
            </p>
          </div>

          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {decryptedEntries.length === 0 ? (
              <div className="space-y-8">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon
                        className="h-5 w-5 text-yellow-400"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        To unlock this vault, you need to combine your unique
                        key share with shares from other successors. The total
                        number of shares must meet the threshold set by the
                        owner.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="my-share"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Your Key Share (Base64)
                    </label>
                    <div className="mt-1">
                      <textarea
                        id="my-share"
                        rows={3}
                        className="input font-mono text-xs"
                        placeholder="Paste your share here..."
                        value={myShare}
                        onChange={(e) => setMyShare(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Peer Key Shares
                    </label>
                    <div className="space-y-4">
                      {peerShares.map((share, index) => (
                        <div key={index} className="flex gap-2">
                          <label
                            htmlFor={`peer-share-${index}`}
                            className="sr-only"
                          >
                            Key share from successor #{index + 2}
                          </label>
                          <textarea
                            id={`peer-share-${index}`}
                            rows={2}
                            className="input font-mono text-xs"
                            placeholder={`Paste share from successor #${index + 2}...`}
                            value={share}
                            onChange={(e) =>
                              handlePeerShareChange(index, e.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPeerShare}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Add another share
                    </button>
                  </div>
                </div>

                <div className="pt-5">
                  <button
                    onClick={handleUnlockVault}
                    disabled={unlocking || !myShare}
                    className="w-full btn btn-primary py-3 text-lg flex justify-center items-center gap-2"
                  >
                    {unlocking ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Unlocking...
                      </>
                    ) : (
                      <>
                        <LockOpenIcon className="h-6 w-6" />
                        Unlock {metadata.userName}'s Vault
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <ShieldCheckIcon
                        className="h-5 w-5 text-green-400"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-700">
                        Vault successfully unlocked. Decrypted data is shown
                        below.
                        <span className="font-bold"> Important:</span> This data
                        is only available in your browser and is not saved
                        anywhere.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {decryptedEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="card p-6 border-l-4 border-blue-500"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 uppercase">
                            {entry.category}
                          </span>
                          <h4 className="mt-2 text-lg font-bold text-gray-900">
                            {entry.decryptedData.title ||
                              entry.decryptedData.name ||
                              "Untitled Entry"}
                          </h4>
                        </div>
                      </div>

                      <div className=" prose prose-sm max-w-none text-gray-600">
                        {typeof entry.decryptedData === "object" ? (
                          <pre className="bg-gray-50 p-4 rounded-md overflow-auto text-xs">
                            {JSON.stringify(entry.decryptedData, null, 2)}
                          </pre>
                        ) : (
                          <p>{entry.decryptedData}</p>
                        )}
                      </div>

                      {entry.tags && entry.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {entry.tags.map((tag: string) => (
                            <span key={tag} className="text-xs text-gray-400">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessorAccess;

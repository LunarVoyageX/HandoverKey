import React, { useRef, useState, useEffect } from "react";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import VaultEntryModal, { VaultEntryData } from "../components/VaultEntryModal";
import ConfirmationModal from "../components/ConfirmationModal";
import {
  encryptData,
  decryptData,
  arrayBufferToBase64,
} from "../services/encryption";
import { useToast } from "../contexts/ToastContext";

interface VaultEntry {
  id: string;
  name: string;
  category: string;
  createdAt: string;
  // Decrypted data
  secret?: string;
  type?: "text" | "file";
  mimeType?: string;
  fileName?: string;
}

const MAX_VAULT_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const Vault: React.FC = () => {
  const { success, error: showError } = useToast();
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<VaultEntry | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await api.get(`/vault/entries?t=${Date.now()}`);
      const rawEntries = response.data.data || response.data;

      // Decrypt entries to get name and category
      const decryptedEntries = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rawEntries.map(async (entry: any) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const bufferToBase64 = (bufferObj: any) => {
              if (!bufferObj) return "";
              if (typeof bufferObj === "string") return bufferObj;
              if (
                bufferObj.type === "Buffer" &&
                Array.isArray(bufferObj.data)
              ) {
                return arrayBufferToBase64(
                  new Uint8Array(bufferObj.data).buffer,
                );
              }
              return "";
            };

            const decrypted = await decryptData({
              encryptedData: bufferToBase64(entry.encryptedData),
              iv: bufferToBase64(entry.iv),
            });

            const data = decrypted as VaultEntryData;
            return {
              ...entry,
              name: data.name,
              secret: data.secret,
              type: data.type,
              mimeType: data.mimeType,
              fileName: data.fileName,
            };
          } catch (e) {
            console.error("Failed to decrypt entry", entry.id, e);
            return { ...entry, name: "Error Decrypting", category: "Unknown" };
          }
        }),
      );

      setEntries(decryptedEntries);
    } catch (error) {
      console.error("Failed to fetch vault entries", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEntry = async (data: VaultEntryData) => {
    try {
      const encrypted = await encryptData(data);

      const payload = {
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        salt: encrypted.salt,
        algorithm: encrypted.algorithm,
        category: data.category,
        tags: [],
      };

      if (selectedEntry) {
        await api.put(`/vault/entries/${selectedEntry.id}`, payload);
        success("Secret updated successfully!");
      } else {
        await api.post("/vault/entries", payload);
        success("Secret created successfully!");
      }

      // Refresh list
      fetchEntries();
    } catch (error) {
      console.error("Failed to save entry", error);
      showError("Failed to save secret");
    }
  };

  const handleDeleteEntry = async () => {
    if (!selectedEntry) {
      console.error("No entry selected for deletion");
      return;
    }

    console.log("Deleting entry:", selectedEntry.id);

    try {
      await api.delete(`/vault/entries/${selectedEntry.id}`);
      console.log("Delete successful");
      success("Secret deleted successfully!");
      setIsModalOpen(false);
      setIsDeleteModalOpen(false);
      setSelectedEntry(null);
      fetchEntries();
    } catch (error) {
      console.error("Failed to delete entry", error);
      showError("Failed to delete secret");
    }
  };

  const handleEntryClick = (entry: VaultEntry) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const handleExportVault = async () => {
    setExporting(true);
    try {
      const response = await api.get("/vault/export");
      const payload = response.data;
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `handoverkey-vault-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      success("Vault export downloaded");
    } catch {
      showError("Failed to export vault");
    } finally {
      setExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > MAX_VAULT_IMPORT_FILE_SIZE_BYTES) {
      showError("Import file is too large. Maximum supported size is 5 MB.");
      event.target.value = "";
      return;
    }

    setImporting(true);
    try {
      const fileContent = await file.text();
      const parsed = JSON.parse(fileContent) as
        | { entries?: unknown; mode?: "merge" | "replace" }
        | unknown[];

      const entries = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.entries)
          ? parsed.entries
          : null;

      if (!entries) {
        throw new Error("Invalid import file format");
      }

      await api.post("/vault/import", {
        mode:
          !Array.isArray(parsed) && parsed.mode === "replace"
            ? "replace"
            : "merge",
        entries,
      });

      success("Vault import completed");
      await fetchEntries();
    } catch {
      showError("Failed to import vault file");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const filteredEntries = entries.filter(
    (entry) =>
      entry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.category?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">
            Vault
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            A secure list of all your encrypted secrets, passwords, and
            documents.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={handleExportVault}
            disabled={exporting}
            className="btn btn-secondary mr-3"
          >
            {exporting ? "Exporting..." : "Export Vault"}
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            disabled={importing}
            className="btn btn-secondary mr-3"
          >
            {importing ? "Importing..." : "Import Vault"}
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add Secret
          </button>
        </div>
      </div>

      <div className="mt-8">
        <div className="relative max-w-md mb-6">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon
              className="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
          </div>
          <input
            type="text"
            className="input pl-10"
            placeholder="Search vault..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredEntries.length === 0 && entries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <LockClosedIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              No secrets yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first secret.
            </p>
            <button
              onClick={() => {
                setSelectedEntry(null);
                setIsModalOpen(true);
              }}
              className="mt-4 btn btn-primary inline-flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Add Your First Secret
            </button>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              No results found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search term.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="card p-6 hover:shadow-apple-lg transition-shadow cursor-pointer group"
                onClick={() => handleEntryClick(entry)}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    {entry.category}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {entry.name || "Untitled Secret"}
                </h3>
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                  Click to view details and decrypt.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <VaultEntryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEntry(null);
        }}
        onSave={handleSaveEntry}
        onDelete={
          selectedEntry
            ? () => {
                console.log("Delete button clicked in modal");
                setIsModalOpen(false);
                setTimeout(() => setIsDeleteModalOpen(true), 100);
              }
            : undefined
        }
        initialData={
          selectedEntry
            ? {
                name: selectedEntry.name,
                category: selectedEntry.category,
                secret: selectedEntry.secret || "",
                type: selectedEntry.type,
                mimeType: selectedEntry.mimeType,
                fileName: selectedEntry.fileName,
              }
            : null
        }
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteEntry}
        title="Delete Secret"
        message="Are you sure you want to delete this secret? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImportFile}
      />
    </div>
  );
};

export default Vault;

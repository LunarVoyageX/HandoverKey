import React, { useState, useEffect } from "react";
import { AxiosError } from "axios";
import { PlusIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { useToast } from "../contexts/ToastContext";
import ConfirmationModal from "../components/ConfirmationModal";

interface Successor {
  id: string;
  name: string;
  email: string;
  handoverDelayDays: number;
  verified: boolean;
  createdAt: string;
}

const Successors: React.FC = () => {
  const { success, error: showError } = useToast();
  const [successors, setSuccessors] = useState<Successor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [successorToDelete, setSuccessorToDelete] = useState<string | null>(
    null,
  );

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [delay, setDelay] = useState(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSuccessors();
  }, []);

  const fetchSuccessors = async () => {
    try {
      const response = await api.get("/successors");
      // API returns { successors: [...] } or just [...] depending on implementation
      // Controller says res.json({ successors })
      setSuccessors(response.data.successors || []);
    } catch (error) {
      console.error("Failed to fetch successors", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccessor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/successors", {
        name,
        email,
        handoverDelayDays: Number(delay),
      });
      setIsModalOpen(false);
      setName("");
      setEmail("");
      setDelay(30);
      fetchSuccessors();
      success("Successor added successfully!");
    } catch (err) {
      const error = err as AxiosError<{
        error?: { message: string };
        message?: string;
      }>;
      setError(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "Failed to add successor",
      );
    }
  };

  const handleDeleteSuccessor = (successorId: string) => {
    setSuccessorToDelete(successorId);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteSuccessor = async () => {
    if (!successorToDelete) return;

    try {
      await api.delete(`/successors/${successorToDelete}`);
      fetchSuccessors();
      success("Successor removed successfully!");
    } catch (error) {
      console.error("Failed to delete successor", error);
      showError("Failed to remove successor");
    } finally {
      setSuccessorToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const handleResendVerification = async (successorId: string) => {
    try {
      await api.post(`/successors/${successorId}/resend-verification`, {});
      success("Verification email has been resent successfully!");
    } catch (err) {
      const error = err as {
        response?: {
          data?: {
            error?: { message?: string; details?: Array<{ message?: string }> };
            message?: string;
          };
        };
      };
      console.error("Failed to resend verification", error);

      const message =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        "Failed to resend verification email";

      const details = error.response?.data?.error?.details?.[0]?.message;

      showError(details ? `${message}: ${details}` : message);
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">
            Successors
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage the people who will receive access to your vault after the
            inactivity period.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add Successor
          </button>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : successors.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">
              No successors
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding a trusted contact.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {successors.map((successor) => (
              <div key={successor.id} className="card p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${successor.verified ? "bg-green-50 text-green-700 ring-green-600/20" : "bg-yellow-50 text-yellow-800 ring-yellow-600/20"}`}
                  >
                    {successor.verified ? "Verified" : "Pending"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {successor.handoverDelayDays} days delay
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {successor.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4">{successor.email}</p>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  {!successor.verified && (
                    <button
                      onClick={() => handleResendVerification(successor.id)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      Resend Verification
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteSuccessor(successor.id)}
                    className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors ml-auto"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Simple Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              aria-hidden="true"
              onClick={() => setIsModalOpen(false)}
            ></div>
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3
                    className="text-lg leading-6 font-medium text-gray-900"
                    id="modal-title"
                  >
                    Add New Successor
                  </h3>
                  <div className="mt-2">
                    {error && (
                      <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                        {error}
                      </div>
                    )}
                    <form onSubmit={handleAddSuccessor} className="space-y-4">
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          required
                          className="input mt-1"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          required
                          className="input mt-1"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="delay"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Handover Delay (Days)
                        </label>
                        <input
                          type="number"
                          id="delay"
                          required
                          min="1"
                          className="input mt-1"
                          value={delay}
                          onChange={(e) => setDelay(Number(e.target.value))}
                        />
                      </div>
                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                          Add Successor
                        </button>
                        <button
                          type="button"
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                          onClick={() => setIsModalOpen(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteSuccessor}
        title="Remove Successor"
        message="Are you sure you want to remove this successor? This action cannot be undone."
        confirmText="Remove"
        type="danger"
      />
    </div>
  );
};

export default Successors;

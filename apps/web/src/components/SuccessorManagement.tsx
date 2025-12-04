import React, { useState, useEffect } from "react";
import {
  successorApi,
  Successor,
  AddSuccessorData,
} from "../services/successor";

interface SuccessorManagementProps {
  onClose?: () => void;
}

const SuccessorManagement: React.FC<SuccessorManagementProps> = ({
  onClose,
}) => {
  const [successors, setSuccessors] = useState<Successor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<AddSuccessorData>({
    email: "",
    name: "",
    handoverDelayDays: 90,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSuccessors();
  }, []);

  const fetchSuccessors = async () => {
    try {
      setLoading(true);
      const data = await successorApi.getSuccessors();
      setSuccessors(data);
    } catch (error) {
      console.error("Failed to fetch successors:", error);
      window.alert("Failed to load successors");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await successorApi.updateSuccessor(editingId, {
          name: formData.name,
          handoverDelayDays: formData.handoverDelayDays,
        });
      } else {
        await successorApi.addSuccessor(formData);
      }
      setFormData({ email: "", name: "", handoverDelayDays: 90 });
      setShowAddForm(false);
      setEditingId(null);
      await fetchSuccessors();
    } catch (error) {
      console.error("Failed to save successor:", error);
      window.alert("Failed to save successor");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this successor?"))
      return;

    try {
      await successorApi.deleteSuccessor(id);
      await fetchSuccessors();
    } catch (error) {
      console.error("Failed to delete successor:", error);
      window.alert("Failed to delete successor");
    }
  };

  const handleEdit = (successor: Successor) => {
    setFormData({
      email: successor.email,
      name: successor.name || "",
      handoverDelayDays: successor.handoverDelayDays,
    });
    setEditingId(successor.id);
    setShowAddForm(true);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-900">
            Manage Successors
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </div>

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Successor
          </button>
        )}

        {showAddForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 p-4 border rounded bg-gray-50"
          >
            <h4 className="text-lg font-semibold mb-3">
              {editingId ? "Edit Successor" : "Add New Successor"}
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  disabled={!!editingId}
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Handover Delay (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.handoverDelayDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      handoverDelayDays: parseInt(e.target.value),
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                {editingId ? "Update" : "Add"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                  setFormData({ email: "", name: "", handoverDelayDays: 90 });
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : successors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No successors added yet. Add your first successor to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {successors.map((successor) => (
              <div
                key={successor.id}
                className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium text-gray-900">
                    {successor.name || successor.email}
                  </div>
                  <div className="text-sm text-gray-600">{successor.email}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Handover delay: {successor.handoverDelayDays} days
                    {successor.verified ? (
                      <span className="ml-2 text-green-600">✓ Verified</span>
                    ) : (
                      <span className="ml-2 text-yellow-600">
                        ⚠ Not verified
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(successor)}
                    className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded border border-blue-600 hover:bg-blue-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(successor.id)}
                    className="text-red-600 hover:text-red-800 px-3 py-1 rounded border border-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuccessorManagement;

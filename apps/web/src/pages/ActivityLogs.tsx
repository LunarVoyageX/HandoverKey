import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useToast } from "../contexts/ToastContext";

interface ActivityLogItem {
  id: string;
  activity_type: string;
  client_type?: string;
  ip_address?: string | null;
  created_at: string;
}

const PAGE_SIZE = 25;

const formatActivityType = (type: string): string =>
  type
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const ActivityLogs: React.FC = () => {
  const { error: showError } = useToast();
  const [items, setItems] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const fetchLogs = async (offset: number, append = false) => {
    try {
      const response = await api.get(
        `/activity?limit=${PAGE_SIZE}&offset=${offset}&t=${Date.now()}`,
      );
      const data: ActivityLogItem[] = response.data?.data || [];
      setItems((prev) => (append ? [...prev, ...data] : data));
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      showError("Failed to load activity logs");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void fetchLogs(0, false);
  }, []);

  const handleLoadMore = () => {
    setLoadingMore(true);
    void fetchLogs(items.length, true);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Activity Audit Trail
        </h1>
        <p className="mt-2 text-sm text-gray-700">
          Review recent account events and security-relevant actions.
        </p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No activity recorded yet.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatActivityType(item.activity_type)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.client_type || "web"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.ip_address || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="border-t border-gray-200 px-4 py-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="btn btn-secondary"
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ActivityLogs;

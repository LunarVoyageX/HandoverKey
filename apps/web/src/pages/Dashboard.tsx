import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  ShieldCheckIcon,
  UserGroupIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import api from "../services/api";
import { Link } from "react-router-dom";

interface ActivityLog {
  id: string;
  activity_type: string;
  created_at: string;
  ip_address?: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState([
    {
      name: "Total Secrets",
      stat: "...",
      icon: ShieldCheckIcon,
      color: "bg-blue-500",
    },
    {
      name: "Successors",
      stat: "...",
      icon: UserGroupIcon,
      color: "bg-green-500",
    },
    {
      name: "Days Active",
      stat: "...",
      icon: ClockIcon,
      color: "bg-purple-500",
    },
  ]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vaultRes, successorsRes, activityRes] = await Promise.all([
          api.get("/vault/entries"),
          api.get("/successors"),
          api.get("/activity?limit=5"),
        ]);

        // Vault returns array directly
        const vaultCount = Array.isArray(vaultRes.data)
          ? vaultRes.data.length
          : 0;
        // Successors returns { successors: [...] }
        const successorCount = successorsRes.data.successors?.length || 0;

        // Calculate days active from user account creation date
        const daysActive = user?.createdAt
          ? Math.floor(
              (new Date().getTime() - new Date(user.createdAt).getTime()) /
                (1000 * 3600 * 24),
            )
          : 0;

        setStats([
          {
            name: "Total Secrets",
            stat: vaultCount.toString(),
            icon: ShieldCheckIcon,
            color: "bg-blue-500",
          },
          {
            name: "Successors",
            stat: successorCount.toString(),
            icon: UserGroupIcon,
            color: "bg-green-500",
          },
          {
            name: "Days Active",
            stat: daysActive.toString(),
            icon: ClockIcon,
            color: "bg-purple-500",
          },
        ]);

        // Activity returns { data: [...], pagination: {...} }
        setActivities(activityRes.data.data || []);
      } catch {
        // Ignore error
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return date.toLocaleDateString();
  };

  const formatActivityType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Welcome back, {user?.name || user?.email?.split("@")[0] || "User"}
          </h2>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <Link to="/vault" className="btn btn-primary">
            Add Secret
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-base font-semibold leading-6 text-gray-900">
          Overview
        </h3>
        <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((item) => (
            <div
              key={item.name}
              className="card px-4 py-5 sm:p-6 flex items-center"
            >
              <div className={`flex-shrink-0 rounded-md p-3 ${item.color}`}>
                <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dt className="truncate text-sm font-medium text-gray-500">
                  {item.name}
                </dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900">
                    {loading ? "..." : item.stat}
                  </div>
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-8">
        <h3 className="text-base font-semibold leading-6 text-gray-900">
          Recent Activity
        </h3>
        <div className="mt-4 card">
          {activities.length > 0 ? (
            <ul role="list" className="divide-y divide-gray-100">
              {activities.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-x-4 py-5 px-6 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-6 text-gray-900">
                      {formatActivityType(item.activity_type)}
                    </p>
                    <p className="mt-1 truncate text-xs leading-5 text-gray-500">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm">
              No recent activity found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

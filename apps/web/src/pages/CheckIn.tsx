import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import api from "../services/api";
import { getApiErrorMessage } from "../services/api-error";

type CheckInStatus = "loading" | "ready" | "success" | "error";

const CheckIn: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<CheckInStatus>("loading");
  const [message, setMessage] = useState("Validating secure check-in link...");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const validate = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Missing check-in token.");
        return;
      }

      try {
        await api.get(
          `/activity/check-in-link?token=${encodeURIComponent(token)}`,
        );
        setStatus("ready");
        setMessage(
          "Your secure check-in link is valid. Confirm check-in to reset inactivity tracking.",
        );
      } catch (err) {
        setStatus("error");
        setMessage(
          getApiErrorMessage(
            err,
            "This check-in link is invalid or has expired.",
          ),
        );
      }
    };

    validate();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/activity/check-in-link", { token });
      setStatus("success");
      setMessage(response.data.message || "Check-in completed successfully.");
    } catch (err) {
      setStatus("error");
      setMessage(
        getApiErrorMessage(err, "Failed to complete secure check-in."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="card p-8 text-center">
          <div className="flex justify-center mb-6">
            <Link
              to="/"
              className="bg-blue-50 p-3 rounded-2xl border border-blue-100 shadow-sm focus:outline-none"
            >
              <ShieldCheckIcon className="h-10 w-10 text-blue-600" />
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-gray-900">Secure Check-In</h1>
          <p className="mt-4 text-sm text-gray-600">{message}</p>

          {status === "loading" && (
            <div className="mt-6 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {status === "ready" && (
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="mt-6 w-full btn btn-primary"
            >
              {submitting ? "Confirming..." : "Confirm Check-In"}
            </button>
          )}

          {(status === "success" || status === "error") && (
            <div className="mt-6">
              <Link to="/login" className="btn btn-primary w-full">
                Go to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckIn;

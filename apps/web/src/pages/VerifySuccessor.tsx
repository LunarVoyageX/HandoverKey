import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { getApiErrorMessage } from "../services/api-error";

const VerifySuccessor: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    verifySuccessor();
  }, []);

  const verifySuccessor = async () => {
    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing.");
      return;
    }

    try {
      const response = await api.get(`/successors/verify?token=${token}`);
      setStatus("success");
      setMessage(
        response.data.message ||
          "Your successor status has been verified successfully!",
      );
    } catch (err) {
      setStatus("error");
      setMessage(
        getApiErrorMessage(
          err,
          "Failed to verify successor. The link may be invalid or expired.",
        ),
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="card p-8 text-center">
          {status === "loading" && (
            <div>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Verifying...
              </h2>
              <p className="text-gray-600">
                Please wait while we verify your successor status.
              </p>
            </div>
          )}

          {status === "success" && (
            <div>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Verification Successful!
              </h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link
                to={token ? `/successor-access?token=${token}` : "/"}
                className="btn btn-primary inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg w-auto"
              >
                Continue to Vault Access
              </Link>
            </div>
          )}

          {status === "error" && (
            <div>
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Verification Failed
              </h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link
                to="/"
                className="btn btn-primary inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg w-auto"
              >
                Go to Homepage
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifySuccessor;

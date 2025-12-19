import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import api from "../services/api";

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "already-verified" | "resend"
  >("loading");
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link. No token provided.");
        return;
      }

      try {
        const response = await api.get(`/auth/verify-email?token=${token}`);

        if (response.data.message.includes("already verified")) {
          setStatus("already-verified");
          setMessage("Your email is already verified. You can now login.");
        } else {
          setStatus("success");
          setMessage("Email verified successfully! You can now login.");
        }

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } catch (error: unknown) {
        const errorMessage =
          error.response?.data?.message ||
          "Failed to verify email. The link may be expired or invalid.";

        // If token is expired/invalid, allow resending
        if (errorMessage.includes("Invalid or expired verification token")) {
          setStatus("resend");
          setMessage(
            "Your verification link has expired. Enter your email address below to receive a new verification link.",
          );
        } else {
          setStatus("error");
          setMessage(errorMessage);
        }
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendLoading(true);

    try {
      const response = await api.post("/auth/resend-verification", {
        email: resendEmail,
      });

      if (response.data.alreadyVerified) {
        setMessage("Your email is already verified. You can now login.");
        setStatus("already-verified");
      } else {
        setMessage(
          "Verification email sent successfully! Please check your email for the new verification link.",
        );
        setStatus("success");
      }

      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error: unknown) {
      setMessage(
        error.response?.data?.message ||
          "Failed to send verification email. Please try again.",
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Link
              to="/"
              className="bg-blue-50 p-3 rounded-2xl border border-blue-100 shadow-sm focus:outline-none"
            >
              <ShieldCheckIcon className="h-10 w-10 text-blue-600" />
            </Link>
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Email Verification
          </h2>
        </div>

        <div className="card p-8">
          {status === "loading" && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Verifying your email...</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center">
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm mb-4">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {message}
                </div>
              </div>
              <p className="text-gray-600">Redirecting to login...</p>
            </div>
          )}

          {status === "already-verified" && (
            <div className="text-center">
              <div className="bg-blue-50 border border-blue-200 text-blue-600 px-4 py-3 rounded-lg text-sm mb-4">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {message}
                </div>
              </div>
              <p className="text-gray-600">Redirecting to login...</p>
            </div>
          )}

          {status === "resend" && (
            <div>
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-600 px-4 py-3 rounded-lg text-sm mb-6">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {message}
                </div>
              </div>

              <form onSubmit={handleResendVerification} className="space-y-4">
                <div>
                  <label
                    htmlFor="resendEmail"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </label>
                  <input
                    id="resendEmail"
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email address"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resendLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendLoading ? "Sending..." : "Send Verification Email"}
                </button>
              </form>

              <div className="mt-6 space-y-4">
                <button
                  onClick={() => navigate("/login")}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Login
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Register Again
                </button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
                <div className="flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {message}
                </div>
              </div>
              <div className="space-y-4">
                <button
                  onClick={() => navigate("/login")}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Login
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Register Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

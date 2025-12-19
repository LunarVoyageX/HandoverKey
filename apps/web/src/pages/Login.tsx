import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import { setMasterKey, deriveAuthKey } from "../services/encryption";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import Spinner from "../components/Spinner";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // 1. Derive Auth Key (Client-side Hashing)
      // We use the email as salt for the Auth Key
      const authKey = await deriveAuthKey(password, email);

      // 2. Send Login Request with Auth Key
      const response = await api.post("/auth/login", {
        email,
        password: authKey,
      });

      const { tokens, user: userData } = response.data;

      // 3. Set Master Key using the Salt returned by the server
      // The server returns the encryption salt (which we sent during registration)
      if (userData.salt) {
        await setMasterKey(password, userData.salt);
      }

      login(tokens.accessToken, userData);
      navigate("/dashboard");
    } catch (err: unknown) {
      const error = err as {
        response?: {
          data?: {
            error?: { message?: string };
            message?: string;
          };
        };
      };
      setError(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "Failed to login",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner className="h-8 w-8 text-blue-500" />
      </div>
    );
  }

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
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
            Welcome back, {user?.name || "User"}
          </h2>
          <p className="text-gray-500 font-medium tracking-tight">
            Sign in to <span className="text-gray-900">Handover</span>
            <span className="text-blue-600">Key</span>
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Or{" "}
            <Link
              to="/register"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              create a new account
            </Link>
          </p>
        </div>

        <div className="card p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="text-sm">
                  <Link
                    to="/forgot-password"
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary flex justify-center"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-5 w-5" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

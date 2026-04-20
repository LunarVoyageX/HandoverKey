import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import { setMasterKey, deriveAuthKey } from "../services/encryption";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import Spinner from "../components/Spinner";
import { getApiErrorMessage } from "../services/api-error";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
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
        twoFactorCode:
          !useRecoveryCode && twoFactorCode ? twoFactorCode : undefined,
        recoveryCode:
          useRecoveryCode && recoveryCode
            ? recoveryCode.toUpperCase().trim()
            : undefined,
      });

      const { user: userData } = response.data;

      // 3. Set Master Key using the Salt returned by the server
      // The server returns the encryption salt (which we sent during registration)
      if (userData.salt) {
        await setMasterKey(password, userData.salt);
      }

      login(userData);
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to login"));
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
            Welcome back
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

            {show2FA && (
              <div className="rounded-md border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Use recovery code
                  </label>
                  <input
                    type="checkbox"
                    checked={useRecoveryCode}
                    onChange={(e) => setUseRecoveryCode(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                </div>
                {!useRecoveryCode ? (
                  <div className="mt-3">
                    <label
                      htmlFor="two-factor-code"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Two-Factor Code
                    </label>
                    <input
                      id="two-factor-code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={(e) =>
                        setTwoFactorCode(e.target.value.replace(/\D/g, ""))
                      }
                      className="input mt-1"
                      placeholder="123456"
                    />
                  </div>
                ) : (
                  <div className="mt-3">
                    <label
                      htmlFor="recovery-code"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Recovery Code
                    </label>
                    <input
                      id="recovery-code"
                      type="text"
                      value={recoveryCode}
                      onChange={(e) =>
                        setRecoveryCode(
                          e.target.value
                            .toUpperCase()
                            .replace(/[^A-F0-9-]/g, ""),
                        )
                      }
                      className="input mt-1 font-mono"
                      placeholder="A1B2C3-D4E5F6"
                    />
                  </div>
                )}
              </div>
            )}

            {!show2FA && (
              <button
                type="button"
                onClick={() => setShow2FA(true)}
                className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              >
                Have a two-factor or recovery code?
              </button>
            )}

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

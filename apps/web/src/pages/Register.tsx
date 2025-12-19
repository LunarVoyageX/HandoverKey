import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../services/api";
import {
  setMasterKey,
  deriveAuthKey,
  generateEncryptionSalt,
} from "../services/encryption";
import { ShieldCheckIcon } from "@heroicons/react/24/outline";
import LoadingButton from "../components/LoadingButton";

const Register: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 12) {
      setError("Password must be at least 12 characters long");
      return;
    }

    setLoading(true);

    try {
      // 1. Generate Encryption Salt (for Master Key)
      const encryptionSalt = generateEncryptionSalt();

      // 2. Derive Auth Key (Client-side Hashing)
      // This is what we send to the server as the "password"
      const authKey = await deriveAuthKey(password, email);

      // 3. Send Registration Request
      // We send the authKey as the password, and the encryptionSalt to be stored
      const response = await api.post("/auth/register", {
        name,
        email,
        password: authKey,
        confirmPassword: authKey,
        salt: encryptionSalt, // We need to update backend to accept this
      });

      // 4. Set Master Key in Memory
      // We use the original password and the generated salt
      await setMasterKey(password, encryptionSalt);

      login(response.data.tokens.accessToken, response.data.user);
      navigate("/dashboard");
    } catch (err) {
      const error = err as {
        response?: {
          data?: {
            error?: { message?: string; details?: Array<{ message?: string }> };
            message?: string;
          };
        };
      };
      // Handle Zod validation errors which might be an array
      const message =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        "Failed to register";
      const details = error.response?.data?.error?.details?.[0]?.message;
      setError(details ? `${message}: ${details}` : message);
    } finally {
      setLoading(false);
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
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
            Secure your legacy
          </h2>
          <p className="text-gray-500 font-medium tracking-tight">
            Create your <span className="text-gray-900">Handover</span>
            <span className="text-blue-600">Key</span> account
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in
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
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="John Doe"
                />
              </div>
            </div>

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
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="Min 12 chars, uppercase, lowercase, number, special"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 12 characters with uppercase, lowercase,
                number, and special character.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="Confirm your password"
                />
              </div>
            </div>

            <div>
              <LoadingButton
                type="submit"
                loading={loading}
                className="w-full btn btn-primary flex justify-center"
              >
                Create Account
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;

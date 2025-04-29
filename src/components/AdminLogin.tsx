"use client";

import { useState } from "react";
import { useAdminAuth } from "~/hooks/useAdminAuth";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, showAuthPrompt, setShowAuthPrompt } = useAdminAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    const success = login(password);
    if (!success) {
      setError("Incorrect password");
    }
  };

  if (!showAuthPrompt) return null;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h2 className="mb-6 text-center text-2xl font-bold">Admin Login</h2>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 rounded bg-red-100 p-2 text-center text-red-700">
              {error}
            </div>
          )}
          <div className="mb-6">
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Enter admin password"
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowAuthPrompt(false)}
              className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

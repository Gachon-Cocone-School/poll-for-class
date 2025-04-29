"use client";

import Link from "next/link";
import { useAdminAuth } from "~/hooks/useAdminAuth";

export default function Navbar() {
  const { isAuthenticated, logout } = useAdminAuth();

  return (
    <nav className="bg-gray-800 p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="text-xl font-bold text-white">Poll App</div>
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="rounded px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Polls
          </Link>
          <Link
            href="/groups"
            className="rounded px-3 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Groups
          </Link>

          {isAuthenticated && (
            <div className="ml-4 flex items-center">
              <span className="mr-2 rounded-full bg-green-500 px-2 py-1 text-xs font-medium text-white">
                Admin
              </span>
              <button
                onClick={logout}
                className="flex items-center rounded bg-red-600 px-3 py-2 font-medium text-white hover:bg-red-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-1 h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zm5 6a1 1 0 100 2h4a1 1 0 100-2H8z"
                    clipRule="evenodd"
                  />
                  <path d="M10 14a1 1 0 100-2 1 1 0 000 2z" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

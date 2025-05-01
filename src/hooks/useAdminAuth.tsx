"use client";

import { useState, useEffect, createContext, useContext } from "react";
import type { ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  verifyAdminPassword,
  saveAdminAuth,
  getAdminAuth,
  clearAdminAuth,
} from "~/lib/adminAuth/adminAuthService";

// Define the context type
interface AdminAuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  checkAuth: () => boolean;
  showAuthPrompt: boolean;
  setShowAuthPrompt: (show: boolean) => void;
}

// Create the context with a default value
const AdminAuthContext = createContext<AdminAuthContextType>({
  isAuthenticated: false,
  login: () => false,
  logout: () => {},
  checkAuth: () => false,
  showAuthPrompt: false,
  setShowAuthPrompt: () => {},
});

// Paths that don't require admin authentication
const PUBLIC_PATHS = [
  /^\/polls\/answer\/.*$/, // All poll answer pages
];

// Provider component
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();

  // Initialize auth state from localStorage on component mount
  useEffect(() => {
    const auth = getAdminAuth();
    setIsAuthenticated(auth);
    setAuthChecked(true);
  }, []);

  // Check if the current path requires authentication
  useEffect(() => {
    if (!pathname || !authChecked) return;

    // Check if current path matches any of the public paths
    const isPublicPath = PUBLIC_PATHS.some((pattern) => pattern.test(pathname));

    // If not a public path and not authenticated, show auth prompt
    if (!isPublicPath && !isAuthenticated) {
      setShowAuthPrompt(true);
    } else {
      setShowAuthPrompt(false);
    }
  }, [pathname, isAuthenticated, authChecked]);

  const login = (password: string): boolean => {
    const isValid = verifyAdminPassword(password);
    if (isValid) {
      saveAdminAuth();
      setIsAuthenticated(true);
      setShowAuthPrompt(false);
    }
    return isValid;
  };

  const logout = () => {
    clearAdminAuth();
    setIsAuthenticated(false);
    // Redirect to home page after logout
    router.push("/");
  };

  const checkAuth = (): boolean => {
    const auth = getAdminAuth();
    setIsAuthenticated(auth);
    return auth;
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        checkAuth,
        showAuthPrompt,
        setShowAuthPrompt,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

// Hook for using the auth context
export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};

import { env } from "~/env";

// Local storage key for admin authentication state
const ADMIN_AUTH_KEY = "poll_admin_auth";

// Admin auth type
interface AdminAuth {
  isAuthenticated: boolean;
  timestamp: number;
}

// Check if password matches the environment variable
export const verifyAdminPassword = (password: string): boolean => {
  return password === env.NEXT_PUBLIC_ADMIN_PASSWORD;
};

// Save admin authentication to local storage
export const saveAdminAuth = (): void => {
  const auth: AdminAuth = {
    isAuthenticated: true,
    timestamp: Date.now(),
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(auth));
    } catch (error) {
      console.error("Failed to save admin auth to localStorage:", error);
    }
  }
};

// Check if admin is authenticated in local storage
export const getAdminAuth = (): boolean => {
  if (typeof window === "undefined") return false;

  try {
    const authString = localStorage.getItem(ADMIN_AUTH_KEY);
    if (!authString) return false;

    const auth = JSON.parse(authString) as AdminAuth;
    // Auth expires after 7 days (increased from 24 hours)
    if (Date.now() - auth.timestamp > 7 * 24 * 60 * 60 * 1000) {
      clearAdminAuth();
      return false;
    }

    return auth.isAuthenticated;
  } catch (error) {
    console.error("Failed to parse admin auth:", error);
    return false;
  }
};

// Clear admin authentication from local storage
export const clearAdminAuth = (): void => {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(ADMIN_AUTH_KEY);
    } catch (error) {
      console.error("Failed to clear admin auth from localStorage:", error);
    }
  }
};

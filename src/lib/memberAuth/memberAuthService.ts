import { useState, useEffect } from "react";
import type { Member } from "../types";

const MEMBER_AUTH_KEY = "poll_member_auth";

export interface MemberAuth {
  member_id: string; // Combined member_name and member_no as unique ID
  member_name: string;
  member_no: string;
  timestamp: number;
}

// Create a unique member ID from name and number
export const createMemberId = (name: string, no: string): string => {
  return `${name.trim().toLowerCase()}_${no.trim()}`;
};

// Save member authentication to local storage
export const saveMemberAuth = (member: Member): MemberAuth => {
  const auth: MemberAuth = {
    member_id: createMemberId(member.member_name, member.member_no),
    member_name: member.member_name,
    member_no: member.member_no,
    timestamp: Date.now(),
  };

  localStorage.setItem(MEMBER_AUTH_KEY, JSON.stringify(auth));
  return auth;
};

// Get member authentication from local storage
export const getMemberAuth = (): MemberAuth | null => {
  const authString = localStorage.getItem(MEMBER_AUTH_KEY);
  if (!authString) return null;

  try {
    return JSON.parse(authString) as MemberAuth;
  } catch (error) {
    console.error("Failed to parse member auth:", error);
    return null;
  }
};

// Remove member authentication from local storage
export const clearMemberAuth = (): void => {
  localStorage.removeItem(MEMBER_AUTH_KEY);
};

// React hook to use member authentication
export const useMemberAuth = () => {
  const [memberAuth, setMemberAuth] = useState<MemberAuth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize from localStorage
    const auth = getMemberAuth();
    setMemberAuth(auth);
    setLoading(false);
  }, []);

  const login = (member: Member) => {
    const newAuth = saveMemberAuth(member);
    setMemberAuth(newAuth);
    return newAuth;
  };

  const logout = () => {
    clearMemberAuth();
    setMemberAuth(null);
  };

  return {
    memberAuth,
    isLoggedIn: !!memberAuth,
    loading,
    login,
    logout,
  };
};

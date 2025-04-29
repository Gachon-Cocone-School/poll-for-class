import {
  subscribeToGroups,
  subscribeToGroup,
  subscribeToGroupMembers,
} from "../lib/groupService";
import { Group, Member } from "../lib/types";
import { useFirebaseQuery } from "./useFirebaseSubscription";

/**
 * Hook to get all groups with real-time updates
 */
export function useGroups() {
  return useFirebaseQuery<Group[]>((setData, setError) => {
    return subscribeToGroups(
      (groups) => setData(groups),
      (error) => setError(error),
    );
  }, []);
}

/**
 * Hook to get a single group with real-time updates
 *
 * @param groupId The ID of the group to get
 */
export function useGroup(groupId: string | undefined) {
  return useFirebaseQuery<Group | null>(
    (setData, setError) => {
      if (!groupId) {
        setData(null);
        return () => {};
      }

      return subscribeToGroup(
        groupId,
        (group) => setData(group),
        (error) => setError(error),
      );
    },
    null,
    [groupId],
  );
}

/**
 * Hook to get all members of a group with real-time updates
 *
 * @param groupId The ID of the group to get members for
 */
export function useGroupMembers(groupId: string | undefined) {
  return useFirebaseQuery<Member[]>(
    (setData, setError) => {
      if (!groupId) {
        setData([]);
        return () => {};
      }

      return subscribeToGroupMembers(
        groupId,
        (members) => setData(members),
        (error) => setError(error),
      );
    },
    [],
    [groupId],
  );
}

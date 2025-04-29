import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  collectionGroup,
  where,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { Group, Member } from "./types";

const GROUPS_COLLECTION = "groups";
const MEMBERS_COLLECTION = "members";

// Get all groups
export const getGroups = async (): Promise<Group[]> => {
  const groupsCol = collection(db, GROUPS_COLLECTION);
  const groupSnapshot = await getDocs(groupsCol);
  return groupSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Group, "id">),
  }));
};

// Subscribe to all groups with real-time updates
export const subscribeToGroups = (
  onData: (groups: Group[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const groupsCol = collection(db, GROUPS_COLLECTION);

  return onSnapshot(
    groupsCol,
    (snapshot) => {
      try {
        const groups = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Group, "id">),
        }));

        onData(groups);
      } catch (error) {
        console.error("Error in groups subscription:", error);
        if (onError) onError(error as Error);
      }
    },
    (error) => {
      console.error("Groups subscription error:", error);
      if (onError) onError(error);
    },
  );
};

// Get a single group by ID
export const getGroupById = async (id: string): Promise<Group | null> => {
  const groupRef = doc(db, GROUPS_COLLECTION, id);
  const groupDoc = await getDoc(groupRef);

  if (!groupDoc.exists()) return null;

  return {
    id: groupDoc.id,
    ...(groupDoc.data() as Omit<Group, "id">),
  };
};

// Subscribe to a single group with real-time updates
export const subscribeToGroup = (
  id: string,
  onData: (group: Group | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const groupRef = doc(db, GROUPS_COLLECTION, id);

  return onSnapshot(
    groupRef,
    (docSnapshot) => {
      try {
        if (!docSnapshot.exists()) {
          onData(null);
          return;
        }

        const group = {
          id: docSnapshot.id,
          ...(docSnapshot.data() as Omit<Group, "id">),
        };

        onData(group);
      } catch (error) {
        console.error("Error in group subscription:", error);
        if (onError) onError(error as Error);
      }
    },
    (error) => {
      console.error("Group subscription error:", error);
      if (onError) onError(error);
    },
  );
};

// Create a new group
export const createGroup = async (
  group: Omit<Group, "id">,
): Promise<string> => {
  const docRef = await addDoc(collection(db, GROUPS_COLLECTION), group);
  return docRef.id;
};

// Update an existing group
export const updateGroup = async (
  id: string,
  group: Partial<Omit<Group, "id">>,
): Promise<void> => {
  const groupRef = doc(db, GROUPS_COLLECTION, id);
  await updateDoc(groupRef, group);
};

// Delete a group and its subcollections (members)
export const deleteGroup = async (id: string): Promise<void> => {
  // First, delete all members in the group
  const membersCol = collection(db, GROUPS_COLLECTION, id, MEMBERS_COLLECTION);
  const memberSnapshot = await getDocs(membersCol);

  // Delete each member document
  const deleteMemberPromises = memberSnapshot.docs.map(async (doc) => {
    await deleteDoc(doc.ref);
  });

  // Wait for all members to be deleted
  await Promise.all(deleteMemberPromises);

  // Then delete the group document itself
  const groupRef = doc(db, GROUPS_COLLECTION, id);
  await deleteDoc(groupRef);
};

// Get all members of a group
export const getGroupMembers = async (groupId: string): Promise<Member[]> => {
  const membersCol = collection(
    db,
    GROUPS_COLLECTION,
    groupId,
    MEMBERS_COLLECTION,
  );
  const memberSnapshot = await getDocs(membersCol);
  return memberSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Member),
  }));
};

// Subscribe to group members with real-time updates
export const subscribeToGroupMembers = (
  groupId: string,
  onData: (members: Member[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const membersCol = collection(
    db,
    GROUPS_COLLECTION,
    groupId,
    MEMBERS_COLLECTION,
  );

  return onSnapshot(
    membersCol,
    (snapshot) => {
      try {
        const members = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Member),
        }));

        onData(members);
      } catch (error) {
        console.error("Error in group members subscription:", error);
        if (onError) onError(error as Error);
      }
    },
    (error) => {
      console.error("Group members subscription error:", error);
      if (onError) onError(error);
    },
  );
};

// Add a member to a group
export const addMemberToGroup = async (
  groupId: string,
  member: Member,
): Promise<string> => {
  const membersCol = collection(
    db,
    GROUPS_COLLECTION,
    groupId,
    MEMBERS_COLLECTION,
  );
  const docRef = await addDoc(membersCol, member);
  return docRef.id;
};

// Remove a member from a group
export const removeMemberFromGroup = async (
  groupId: string,
  memberId: string,
): Promise<void> => {
  const memberRef = doc(
    db,
    GROUPS_COLLECTION,
    groupId,
    MEMBERS_COLLECTION,
    memberId,
  );
  await deleteDoc(memberRef);
};

// Check if a member belongs to a group
export const checkMemberInGroup = async (
  groupId: string,
  memberName: string,
  memberNo: string,
): Promise<boolean> => {
  const membersCol = collection(
    db,
    GROUPS_COLLECTION,
    groupId,
    MEMBERS_COLLECTION,
  );

  const q = query(
    membersCol,
    where("member_name", "==", memberName),
    where("member_no", "==", memberNo),
  );

  const memberSnapshot = await getDocs(q);
  return !memberSnapshot.empty;
};

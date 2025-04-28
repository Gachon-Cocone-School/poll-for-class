import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { Poll, Question } from "./types";

const POLLS_COLLECTION = "polls";
const QUESTIONS_COLLECTION = "questions";

// Get all polls
export const getPolls = async (): Promise<Poll[]> => {
  const pollsCol = collection(db, POLLS_COLLECTION);
  const pollSnapshot = await getDocs(pollsCol);

  return pollSnapshot.docs.map((doc) => {
    const data = doc.data() as Omit<Poll, "id">;
    return {
      id: doc.id,
      ...data,
    };
  });
};

// Get a single poll by ID
export const getPollById = async (id: string): Promise<Poll | null> => {
  const pollRef = doc(db, POLLS_COLLECTION, id);
  const pollDoc = await getDoc(pollRef);

  if (!pollDoc.exists()) return null;

  return {
    id: pollDoc.id,
    ...(pollDoc.data() as Omit<Poll, "id">),
  };
};

// Create a new poll
export const createPoll = async (poll: Omit<Poll, "id">): Promise<string> => {
  const docRef = await addDoc(collection(db, POLLS_COLLECTION), poll);
  return docRef.id;
};

// Update an existing poll
export const updatePoll = async (
  id: string,
  poll: Partial<Omit<Poll, "id">>,
): Promise<void> => {
  const pollRef = doc(db, POLLS_COLLECTION, id);
  await updateDoc(pollRef, poll);
};

// Delete a poll
export const deletePoll = async (id: string): Promise<void> => {
  const pollRef = doc(db, POLLS_COLLECTION, id);
  await deleteDoc(pollRef);
};

// Get poll questions
export const getPollQuestions = async (pollId: string): Promise<Question[]> => {
  const questionsCol = collection(
    db,
    POLLS_COLLECTION,
    pollId,
    QUESTIONS_COLLECTION,
  );
  const questionSnapshot = await getDocs(questionsCol);

  return questionSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Question, "id">),
  }));
};

// Create a new question for a poll
export const createQuestion = async (
  pollId: string,
  question: Omit<Question, "id">,
): Promise<string> => {
  const questionsCol = collection(
    db,
    POLLS_COLLECTION,
    pollId,
    QUESTIONS_COLLECTION,
  );
  const docRef = await addDoc(questionsCol, question);
  return docRef.id;
};

// Update a question
export const updateQuestion = async (
  pollId: string,
  questionId: string,
  questionData: Partial<Omit<Question, "id">>,
): Promise<void> => {
  const questionRef = doc(
    db,
    POLLS_COLLECTION,
    pollId,
    QUESTIONS_COLLECTION,
    questionId,
  );
  await updateDoc(questionRef, questionData);
};

// Delete a question
export const deleteQuestion = async (
  pollId: string,
  questionId: string,
): Promise<void> => {
  const questionRef = doc(
    db,
    POLLS_COLLECTION,
    pollId,
    QUESTIONS_COLLECTION,
    questionId,
  );
  await deleteDoc(questionRef);
};

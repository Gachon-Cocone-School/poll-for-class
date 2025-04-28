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
import { Poll, Question, Answer } from "./types";

const POLLS_COLLECTION = "polls";
const QUESTIONS_COLLECTION = "questions";
const ANSWERS_COLLECTION = "answers";
const GROUPS_COLLECTION = "groups";

// Get all polls
export const getPolls = async (): Promise<Poll[]> => {
  const pollsCol = collection(db, POLLS_COLLECTION);
  const pollSnapshot = await getDocs(pollsCol);

  const polls = await Promise.all(
    pollSnapshot.docs.map(async (doc) => {
      const data = doc.data() as Omit<Poll, "id">;

      // Fetch group data to get the group name
      let groupData = { id: data.poll_group.id };
      try {
        const groupDoc = await getDoc(data.poll_group);
        if (groupDoc.exists()) {
          groupData = {
            id: groupDoc.id,
            ...groupDoc.data(),
          };
        }
      } catch (error) {
        console.error("Error fetching group data:", error);
      }

      return {
        id: doc.id,
        ...data,
        poll_group: groupData,
      };
    }),
  );

  return polls;
};

// Get a single poll by ID
export const getPollById = async (id: string): Promise<Poll | null> => {
  const pollRef = doc(db, POLLS_COLLECTION, id);
  const pollDoc = await getDoc(pollRef);

  if (!pollDoc.exists()) return null;

  const data = pollDoc.data() as Omit<Poll, "id">;

  // Fetch group data to get the group name
  let groupData = { id: data.poll_group.id };
  try {
    const groupDoc = await getDoc(data.poll_group);
    if (groupDoc.exists()) {
      groupData = {
        id: groupDoc.id,
        ...groupDoc.data(),
      };
    }
  } catch (error) {
    console.error("Error fetching group data:", error);
  }

  return {
    id: pollDoc.id,
    ...data,
    poll_group: groupData,
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

// Delete a poll and its subcollections (questions)
export const deletePoll = async (id: string): Promise<void> => {
  // First, delete all questions in the poll
  const questionsCol = collection(
    db,
    POLLS_COLLECTION,
    id,
    QUESTIONS_COLLECTION,
  );
  const questionSnapshot = await getDocs(questionsCol);

  // Delete each question document
  const deleteQuestionPromises = questionSnapshot.docs.map(async (doc) => {
    await deleteDoc(doc.ref);
  });

  // Wait for all questions to be deleted
  await Promise.all(deleteQuestionPromises);

  // Then delete the poll document itself
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

// Update active question for a poll
export const updateActiveQuestion = async (
  pollId: string,
  questionId: string | null,
): Promise<void> => {
  const pollRef = doc(db, POLLS_COLLECTION, pollId);
  await updateDoc(pollRef, {
    active_question: questionId,
  });
};

// Get active question for a poll
export const getActiveQuestion = async (
  pollId: string,
): Promise<string | null> => {
  const pollRef = doc(db, POLLS_COLLECTION, pollId);
  const pollDoc = await getDoc(pollRef);

  if (!pollDoc.exists()) return null;

  const data = pollDoc.data();
  return data.active_question || null;
};

// Get a question by ID
export const getQuestionById = async (
  pollId: string,
  questionId: string,
): Promise<Question | null> => {
  const questionRef = doc(
    db,
    POLLS_COLLECTION,
    pollId,
    QUESTIONS_COLLECTION,
    questionId,
  );
  const questionDoc = await getDoc(questionRef);

  if (!questionDoc.exists()) return null;

  return {
    id: questionDoc.id,
    ...(questionDoc.data() as Omit<Question, "id">),
  };
};

// Submit an answer to a question
export const submitAnswer = async (
  pollId: string,
  questionId: string,
  answer: Omit<Answer, "id" | "created_at">,
): Promise<string> => {
  const answersCol = collection(
    db,
    POLLS_COLLECTION,
    pollId,
    QUESTIONS_COLLECTION,
    questionId,
    ANSWERS_COLLECTION,
  );

  const answerWithTimestamp = {
    ...answer,
    created_at: Date.now(),
  };

  const docRef = await addDoc(answersCol, answerWithTimestamp);
  return docRef.id;
};

// Get member's answer to a question
export const getMemberAnswer = async (
  pollId: string,
  questionId: string,
  memberId: string,
): Promise<Answer | null> => {
  const answersCol = collection(
    db,
    POLLS_COLLECTION,
    pollId,
    QUESTIONS_COLLECTION,
    questionId,
    ANSWERS_COLLECTION,
  );

  const q = query(answersCol, where("member_id", "==", memberId));
  const answerSnapshot = await getDocs(q);

  if (answerSnapshot.empty) return null;

  // Return the most recent answer if multiple exist
  const answers = answerSnapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Answer, "id">),
    }))
    .sort((a, b) => b.created_at - a.created_at);

  return answers[0];
};

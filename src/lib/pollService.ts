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
  onSnapshot,
  DocumentReference,
  DocumentData,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import { Poll, Question, Answer, QuestionResult } from "./types";

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

// Subscribe to polls with real-time updates
export const subscribeToPolls = (
  onData: (polls: Poll[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const pollsCol = collection(db, POLLS_COLLECTION);

  return onSnapshot(
    pollsCol,
    async (snapshot) => {
      try {
        const polls = await Promise.all(
          snapshot.docs.map(async (doc) => {
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

        onData(polls);
      } catch (error) {
        console.error("Error in polls subscription:", error);
        if (onError) onError(error as Error);
      }
    },
    (error) => {
      console.error("Polls subscription error:", error);
      if (onError) onError(error);
    },
  );
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

// Subscribe to a single poll with real-time updates
export const subscribeToPoll = (
  id: string,
  onData: (poll: Poll | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const pollRef = doc(db, POLLS_COLLECTION, id);

  return onSnapshot(
    pollRef,
    async (docSnapshot) => {
      try {
        if (!docSnapshot.exists()) {
          onData(null);
          return;
        }

        const data = docSnapshot.data() as Omit<Poll, "id">;

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

        const poll = {
          id: docSnapshot.id,
          ...data,
          poll_group: groupData,
        };

        onData(poll);
      } catch (error) {
        console.error("Error in poll subscription:", error);
        if (onError) onError(error as Error);
      }
    },
    (error) => {
      console.error("Poll subscription error:", error);
      if (onError) onError(error);
    },
  );
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

// Subscribe to poll questions with real-time updates
export const subscribeToPollQuestions = (
  pollId: string,
  onData: (questions: Question[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const questionsCol = collection(
    db,
    POLLS_COLLECTION,
    pollId,
    QUESTIONS_COLLECTION,
  );

  return onSnapshot(
    questionsCol,
    (snapshot) => {
      try {
        const questions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Question, "id">),
        }));

        onData(questions);
      } catch (error) {
        console.error("Error in questions subscription:", error);
        if (onError) onError(error as Error);
      }
    },
    (error) => {
      console.error("Questions subscription error:", error);
      if (onError) onError(error);
    },
  );
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

// Subscribe to active question changes
export const subscribeToActiveQuestion = (
  pollId: string,
  onData: (questionId: string | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const pollRef = doc(db, POLLS_COLLECTION, pollId);

  return onSnapshot(
    pollRef,
    (docSnapshot) => {
      try {
        if (!docSnapshot.exists()) {
          onData(null);
          return;
        }

        const data = docSnapshot.data();
        onData(data.active_question || null);
      } catch (error) {
        console.error("Error in active question subscription:", error);
        if (onError) onError(error as Error);
      }
    },
    (error) => {
      console.error("Active question subscription error:", error);
      if (onError) onError(error);
    },
  );
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

// Subscribe to a question with real-time updates
export const subscribeToQuestion = (
  pollId: string,
  questionId: string,
  onData: (question: Question | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const questionRef = doc(
    db,
    POLLS_COLLECTION,
    pollId,
    QUESTIONS_COLLECTION,
    questionId,
  );

  return onSnapshot(
    questionRef,
    (docSnapshot) => {
      try {
        if (!docSnapshot.exists()) {
          onData(null);
          return;
        }

        const question = {
          id: docSnapshot.id,
          ...(docSnapshot.data() as Omit<Question, "id">),
        };

        onData(question);
      } catch (error) {
        console.error("Error in question subscription:", error);
        if (onError) onError(error as Error);
      }
    },
    (error) => {
      console.error("Question subscription error:", error);
      if (onError) onError(error);
    },
  );
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

// Subscribe to member's answer
export const subscribeToMemberAnswer = (
  pollId: string,
  questionId: string,
  memberId: string,
  onData: (answer: Answer | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const answersCol = collection(
    db,
    POLLS_COLLECTION,
    pollId,
    QUESTIONS_COLLECTION,
    questionId,
    ANSWERS_COLLECTION,
  );

  const q = query(answersCol, where("member_id", "==", memberId));

  return onSnapshot(
    q,
    (snapshot) => {
      try {
        if (snapshot.empty) {
          onData(null);
          return;
        }

        // Return the most recent answer if multiple exist
        const answers = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<Answer, "id">),
          }))
          .sort((a, b) => b.created_at - a.created_at);

        onData(answers[0]);
      } catch (error) {
        console.error("Error in member answer subscription:", error);
        if (onError) onError(error as Error);
      }
    },
    (error) => {
      console.error("Member answer subscription error:", error);
      if (onError) onError(error);
    },
  );
};

// Get all answers for a question
export const getAllAnswersForQuestion = async (
  pollId: string,
  questionId: string,
): Promise<Answer[]> => {
  const answersCol = collection(
    db,
    POLLS_COLLECTION,
    pollId,
    QUESTIONS_COLLECTION,
    questionId,
    ANSWERS_COLLECTION,
  );

  const answersSnapshot = await getDocs(answersCol);

  return answersSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Answer, "id">),
  }));
};

// Subscribe to all answers for a question
export const subscribeToAllAnswersForQuestion = (
  pollId: string,
  questionId: string,
  onData: (answers: Answer[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const answersCol = collection(
    db,
    POLLS_COLLECTION,
    pollId,
    QUESTIONS_COLLECTION,
    questionId,
    ANSWERS_COLLECTION,
  );

  return onSnapshot(
    answersCol,
    (snapshot) => {
      try {
        const answers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Answer, "id">),
        }));

        onData(answers);
      } catch (error) {
        console.error("Error in answers subscription:", error);
        if (onError) onError(error as Error);
      }
    },
    (error) => {
      console.error("Answers subscription error:", error);
      if (onError) onError(error);
    },
  );
};

// Calculate and save poll results for a question
export const calculateAndSavePollResults = async (
  pollId: string,
  questionId: string,
): Promise<QuestionResult> => {
  // Get all answers for the question
  const answersCol = collection(
    db,
    POLLS_COLLECTION,
    pollId,
    QUESTIONS_COLLECTION,
    questionId,
    ANSWERS_COLLECTION,
  );

  const answersSnapshot = await getDocs(answersCol);

  // Initialize results object with all choices set to 0
  const question = await getQuestionById(pollId, questionId);
  const results: QuestionResult = {};

  if (question) {
    // Initialize all choices with zero count
    question.choices.forEach((choice) => {
      results[choice] = 0;
    });

    // Count answers by choice
    answersSnapshot.docs.forEach((doc) => {
      const answer = doc.data() as Answer;
      if (results[answer.choice] !== undefined) {
        results[answer.choice]++;
      }
    });

    // Save results to the question document
    const questionRef = doc(
      db,
      POLLS_COLLECTION,
      pollId,
      QUESTIONS_COLLECTION,
      questionId,
    );

    await updateDoc(questionRef, {
      poll_result: results,
    });
  }

  return results;
};

// Clear poll results for a question
export const clearPollResults = async (
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

  await updateDoc(questionRef, {
    poll_result: null,
  });
};

// Get poll results for a question
export const getPollResults = async (
  pollId: string,
  questionId: string,
): Promise<QuestionResult | null> => {
  const question = await getQuestionById(pollId, questionId);
  return question?.poll_result || null;
};

// Subscribe to poll results
export const subscribeToPollResults = (
  pollId: string,
  questionId: string,
  onData: (results: QuestionResult | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const questionRef = doc(
    db,
    POLLS_COLLECTION,
    pollId,
    QUESTIONS_COLLECTION,
    questionId,
  );

  return onSnapshot(
    questionRef,
    (docSnapshot) => {
      try {
        if (!docSnapshot.exists()) {
          onData(null);
          return;
        }

        const data = docSnapshot.data();
        onData(data.poll_result || null);
      } catch (error) {
        console.error("Error in poll results subscription:", error);
        if (onError) onError(error as Error);
      }
    },
    (error) => {
      console.error("Poll results subscription error:", error);
      if (onError) onError(error);
    },
  );
};

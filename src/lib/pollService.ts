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
import {
  Poll,
  Question,
  Answer,
  QuestionResult,
  ParticipantStats,
  Member,
} from "./types";

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
  try {
    // First, delete all questions and their answers
    const questionsCol = collection(
      db,
      POLLS_COLLECTION,
      id,
      QUESTIONS_COLLECTION,
    );
    const questionSnapshot = await getDocs(questionsCol);

    // For each question, delete its answers before deleting the question itself
    const deleteQuestionPromises = questionSnapshot.docs.map(
      async (questionDoc) => {
        try {
          // Get all answers for this question
          const answersCol = collection(
            db,
            POLLS_COLLECTION,
            id,
            QUESTIONS_COLLECTION,
            questionDoc.id,
            ANSWERS_COLLECTION,
          );

          const answersSnapshot = await getDocs(answersCol);

          // Delete each answer document
          const deleteAnswerPromises = answersSnapshot.docs.map(
            async (answerDoc) => {
              try {
                await deleteDoc(answerDoc.ref);
              } catch (error) {
                console.error(`Error deleting answer ${answerDoc.id}:`, error);
              }
            },
          );

          // Wait for all answers to be deleted
          await Promise.all(deleteAnswerPromises);

          // Then delete the question document
          await deleteDoc(questionDoc.ref);
        } catch (error) {
          console.error(
            `Error deleting question ${questionDoc.id} and its answers:`,
            error,
          );
        }
      },
    );

    // Wait for all questions and their answers to be deleted
    await Promise.all(deleteQuestionPromises);

    // Finally delete the poll document itself
    const pollRef = doc(db, POLLS_COLLECTION, id);
    await deleteDoc(pollRef);

    console.log(
      `Successfully deleted poll ${id} with all questions and answers`,
    );
  } catch (error) {
    console.error(`Error in deletePoll for poll ${id}:`, error);
    throw error;
  }
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

// Calculate and save participant statistics for a poll
export const calculateAndSaveParticipantStats = async (
  pollId: string,
): Promise<ParticipantStats[]> => {
  // Get all questions for the poll
  const questionsCol = collection(
    db,
    POLLS_COLLECTION,
    pollId,
    QUESTIONS_COLLECTION,
  );
  const questionsSnapshot = await getDocs(questionsCol);

  const questions = questionsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Question, "id">),
  }));

  // Get the poll to access the group reference
  const pollRef = doc(db, POLLS_COLLECTION, pollId);
  const pollDoc = await getDoc(pollRef);

  if (!pollDoc.exists()) {
    return [];
  }

  const pollData = pollDoc.data();
  const groupRef = pollData.poll_group;

  // Get all members in the group
  const membersCol = collection(db, GROUPS_COLLECTION, groupRef.id, "members");
  const membersSnapshot = await getDocs(membersCol);

  const memberStats: Record<
    string,
    {
      member_id: string;
      member_name: string;
      participation_count: number;
      correct_predictions: number;
      score: number;
    }
  > = {};

  // Initialize stats for all members
  membersSnapshot.docs.forEach((doc) => {
    const member = doc.data() as Member;
    memberStats[doc.id] = {
      member_id: doc.id,
      member_name: member.member_name,
      participation_count: 0,
      correct_predictions: 0,
      score: 0,
    };
  });

  // For each question with results, analyze the answers
  for (const question of questions) {
    if (!question.id || !question.poll_result) continue;

    // Find the winning choices (can be multiple in case of a tie)
    let maxCount = 0;
    let winningChoices: string[] = [];

    // First find the maximum vote count
    Object.entries(question.poll_result).forEach(([choice, count]) => {
      if (count > maxCount) {
        maxCount = count;
      }
    });

    // Then find all choices that have that maximum count
    Object.entries(question.poll_result).forEach(([choice, count]) => {
      if (count === maxCount) {
        winningChoices.push(choice);
      }
    });

    // Get all answers for this question
    const answersCol = collection(
      db,
      POLLS_COLLECTION,
      pollId,
      QUESTIONS_COLLECTION,
      question.id,
      ANSWERS_COLLECTION,
    );

    const answersSnapshot = await getDocs(answersCol);

    // Process each answer
    answersSnapshot.docs.forEach((doc) => {
      const answer = doc.data() as Answer;

      // Only count if the member is in our tracking
      if (memberStats[answer.member_ref.id]) {
        // Increment participation count
        memberStats[answer.member_ref.id].participation_count++;

        // Check if the member selected one of the winning choices
        if (winningChoices.includes(answer.choice)) {
          memberStats[answer.member_ref.id].correct_predictions++;
        }
      }
    });
  }

  // Calculate scores and prepare the final stats array
  const statsList = Object.values(memberStats).map((stats) => {
    // Score = participation count + correct predictions
    const score = stats.participation_count + stats.correct_predictions;

    return {
      member_name: stats.member_name,
      participation_count: stats.participation_count,
      correct_predictions: stats.correct_predictions,
      score,
    };
  });

  // 점수 기준으로 정렬하고, 점수가 같으면 이름 기준으로 정렬
  const sortedStats = statsList.sort((a, b) => {
    // 점수가 다를 경우 점수 내림차순으로 정렬
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // 점수가 같을 경우 이름 오름차순으로 정렬
    return a.member_name.localeCompare(b.member_name);
  });

  // Add ranking information with proper tie handling
  const statsWithRank: ParticipantStats[] = [];

  // 동점자 처리를 위한 변수들
  let currentRank = 1;
  let previousScore = -1;
  let sameRankCount = 0;

  // 각 참가자에 대한 랭킹 계산
  sortedStats.forEach((stat, index) => {
    // 처음이거나 이전 참가자와 점수가 다른 경우
    if (index === 0 || stat.score !== previousScore) {
      currentRank = index + 1;
      sameRankCount = 0;
    } else {
      // 이전 참가자와 점수가 같은 경우 (동점)
      sameRankCount++;
    }

    // 랭킹 정보 추가
    statsWithRank.push({
      ...stat,
      rank: currentRank,
    });

    // 현재 점수 저장
    previousScore = stat.score;
  });

  // Save the statistics to the poll document
  await updateDoc(pollRef, {
    participant_stats: statsWithRank,
  });

  return statsWithRank;
};

// Get participant statistics for a poll
export const getParticipantStats = async (
  pollId: string,
): Promise<ParticipantStats[] | null> => {
  const pollRef = doc(db, POLLS_COLLECTION, pollId);
  const pollDoc = await getDoc(pollRef);

  if (!pollDoc.exists()) return null;

  const data = pollDoc.data();
  return data.participant_stats || null;
};

// Subscribe to participant statistics
export const subscribeToParticipantStats = (
  pollId: string,
  onData: (stats: ParticipantStats[] | null) => void,
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
        onData(data.participant_stats || null);
      } catch (error) {
        console.error("Error in participant stats subscription:", error);
        if (onError) onError(error as Error);
      }
    },
    (error) => {
      console.error("Participant stats subscription error:", error);
      if (onError) onError(error);
    },
  );
};

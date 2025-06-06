"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  DocumentReference,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import type { Poll, Question, ParticipantStats } from "../../../../lib/types";
import {
  usePoll,
  useActiveQuestion,
  useQuestion,
} from "../../../../hooks/usePolls";
import { strings, formatString } from "../../../../lib/strings";
import { subscribeToParticipantStats } from "../../../../lib/pollService";

// Constants for Firebase collections
const POLLS_COLLECTION = "polls";
const QUESTIONS_COLLECTION = "questions";
const ANSWERS_COLLECTION = "answers";
const GROUPS_COLLECTION = "groups";
const MEMBERS_COLLECTION = "members";

// MemberStats component to display member name and statistics
const MemberStats = ({
  memberName,
  pollId,
}: {
  memberName: string;
  pollId: string;
}) => {
  const [memberStats, setMemberStats] = useState<ParticipantStats | null>(null);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const prevStatsRef = useRef<ParticipantStats | null>(null);

  useEffect(() => {
    if (!pollId || !memberName) return;

    console.log("Setting up real-time listener for participant stats");
    setLoading(true);

    // Set up real-time listener for the poll document
    const unsubscribe = subscribeToParticipantStats(
      pollId,
      (participantStats) => {
        if (participantStats && participantStats.length > 0) {
          const stats = participantStats.find(
            (stat) => stat.member_name === memberName,
          );

          // 총 참가자 수 설정
          setTotalParticipants(participantStats.length);

          // 상태 변경이 있을 때만 업데이트 (불필요한 리렌더링 방지)
          if (stats) {
            if (
              !prevStatsRef.current ||
              prevStatsRef.current.score !== stats.score ||
              prevStatsRef.current.rank !== stats.rank
            ) {
              console.log(
                `Stats updated: Score=${stats.score}, Rank=${stats.rank}`,
              );
              setMemberStats(stats);
              prevStatsRef.current = stats;
            }
          } else {
            if (prevStatsRef.current !== null) {
              setMemberStats(null);
              prevStatsRef.current = null;
            }
          }
        } else {
          if (prevStatsRef.current !== null) {
            setMemberStats(null);
            setTotalParticipants(0);
            prevStatsRef.current = null;
          }
        }

        setLoading(false);
      },
      (error) => {
        console.error("Error getting participant stats:", error);
        setLoading(false);
      },
    );

    // 컴포넌트 언마운트 시 리스너 정리
    return () => {
      console.log("Cleaning up participant stats listener");
      unsubscribe();
    };
  }, [pollId, memberName]);

  if (!memberName) return null;

  // QuestionForm 컴포넌트와 정확히 동일한 스타일링 적용
  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-lg bg-white p-6 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-medium text-gray-800">
            {strings.stats.name}:{" "}
            <span className="font-bold">{memberName}</span>
          </h3>
        </div>

        {loading ? (
          <div className="mt-2 text-sm text-gray-500 md:mt-0">
            {strings.stats.loadingStats}
          </div>
        ) : memberStats ? (
          <div className="mt-2 flex flex-col md:mt-0">
            <div className="mb-1 text-sm text-gray-700">
              <span className="font-medium">{strings.stats.score}:</span>{" "}
              <span className="font-bold">
                {formatString(
                  strings.stats.scoreDisplay,
                  memberStats.score * 10,
                )}
              </span>
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-medium">{strings.stats.rank}:</span>{" "}
              <span className="font-bold">
                {formatString(
                  strings.stats.rankingDisplay,
                  memberStats.rank,
                  totalParticipants,
                )}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-sm text-gray-500 md:mt-0">
            {strings.stats.noStatsAvailable}
          </div>
        )}
      </div>
    </div>
  );
};

// Updated Answer interface
interface Answer {
  id?: string;
  member_ref: DocumentReference; // Reference to the member document
  choice: string;
  updated_at: number;
}

// Local storage key for member authentication
const MEMBER_AUTH_KEY = "poll_member_auth";

// Member authentication type
interface MemberAuth {
  member_id: string; // This will be the member document ID
  member_ref: string; // Path to the member document
  member_name: string;
  member_no: string;
  group_id: string; // Store the group ID for reference
  timestamp: number;
}

// Save member authentication to local storage
const saveMemberAuth = (member: {
  member_id: string;
  member_ref: string;
  member_name: string;
  member_no: string;
  group_id: string;
}): MemberAuth => {
  const auth: MemberAuth = {
    member_id: member.member_id,
    member_ref: member.member_ref,
    member_name: member.member_name,
    member_no: member.member_no,
    group_id: member.group_id,
    timestamp: Date.now(),
  };

  localStorage.setItem(MEMBER_AUTH_KEY, JSON.stringify(auth));
  return auth;
};

// Get member authentication from local storage
const getMemberAuth = (): MemberAuth | null => {
  if (typeof window === "undefined") return null;

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
const clearMemberAuth = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MEMBER_AUTH_KEY);
};

// Hook for member authentication
const useMemberAuth = () => {
  const [memberAuth, setMemberAuth] = useState<MemberAuth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize from localStorage
    const auth = getMemberAuth();
    setMemberAuth(auth);
    setLoading(false);
  }, []);

  const login = (member: {
    member_id: string;
    member_ref: string;
    member_name: string;
    member_no: string;
    group_id: string;
  }) => {
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

// Service functions

// Find a member in a group
const findMemberInGroup = async (
  groupId: string,
  memberName: string,
  memberNo: string,
): Promise<{
  exists: boolean;
  memberId?: string;
  memberRef?: DocumentReference;
}> => {
  const membersCol = collection(
    db,
    GROUPS_COLLECTION,
    groupId,
    MEMBERS_COLLECTION,
  );

  // FOR TESTING: Only check member_name, disable member_no check
  const q = query(
    membersCol,
    where("member_name", "==", memberName),
    where("member_no", "==", memberNo), // 테스트를 위해 member_no 체크를 주석 처리
  );

  const memberSnapshot = await getDocs(q);

  if (memberSnapshot.empty) {
    return { exists: false };
  }

  const memberDoc = memberSnapshot.docs[0];

  // 타입 안전성을 위한 추가 체크
  if (!memberDoc) {
    return { exists: false };
  }

  return {
    exists: true,
    memberId: memberDoc.id,
    memberRef: memberDoc.ref,
  };
};

// Get member's answer to a question or create/update it
const getOrSubmitAnswer = async (
  pollId: string,
  questionId: string,
  memberRef: DocumentReference,
  choice?: string,
): Promise<Answer | null> => {
  const answersCol = collection(
    db,
    POLLS_COLLECTION,
    pollId,
    QUESTIONS_COLLECTION,
    questionId,
    ANSWERS_COLLECTION,
  );

  // Try to find existing answer for this member
  const q = query(answersCol, where("member_ref", "==", memberRef));
  const answerSnapshot = await getDocs(q);

  const timestamp = Date.now();

  // If submitting a new answer (choice is provided)
  if (choice) {
    // If answer exists, update it
    if (!answerSnapshot.empty) {
      const answerDoc = answerSnapshot.docs[0];

      // 타입 안전성을 위한 체크 추가
      if (!answerDoc) {
        throw new Error("Answer document not found");
      }

      const answerData = {
        choice: choice,
        updated_at: timestamp,
      };

      await updateDoc(answerDoc.ref, answerData);

      return {
        id: answerDoc.id,
        member_ref: memberRef,
        choice: choice,
        updated_at: timestamp,
      };
    }
    // Otherwise create new answer
    else {
      const answerData = {
        member_ref: memberRef,
        choice: choice,
        updated_at: timestamp,
      };

      const docRef = await addDoc(answersCol, answerData);

      return {
        id: docRef.id,
        ...answerData,
      };
    }
  }

  // Just retrieving existing answer (no choice provided)
  if (!answerSnapshot.empty) {
    const answerDoc = answerSnapshot.docs[0];

    // 타입 안전성을 위한 체크 추가
    if (!answerDoc) {
      return null;
    }

    return {
      id: answerDoc.id,
      ...(answerDoc.data() as Omit<Answer, "id">),
    };
  }

  // No existing answer found
  return null;
};

// Subscribe to member's answer with real-time updates
const subscribeToMemberAnswer = (
  pollId: string,
  questionId: string,
  memberRef: DocumentReference,
  onData: (answer: Answer | null) => void,
): (() => void) => {
  const answersCol = collection(
    db,
    POLLS_COLLECTION,
    pollId,
    QUESTIONS_COLLECTION,
    questionId,
    ANSWERS_COLLECTION,
  );

  const q = query(answersCol, where("member_ref", "==", memberRef));

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
          .sort((a, b) => b.updated_at - a.updated_at);

        // 배열이 비어있는지 확인
        if (answers.length === 0) {
          onData(null);
        } else {
          // 타입 단언을 사용하여 TypeScript에게 이 값이 Answer 타입임을 명시적으로 알림
          const answer = answers[0] as Answer;
          onData(answer);
        }
      } catch (error) {
        console.error("Error in member answer subscription:", error);
        onData(null); // 에러 발생 시 null로 처리
      }
    },
    (error) => {
      console.error("Member answer subscription error:", error);
      onData(null);
    },
  );
};

// LoginForm Component
const LoginForm = ({
  onLogin,
  groupId,
}: {
  onLogin: (name: string, no: string) => Promise<boolean>;
  groupId: string;
}) => {
  const [name, setName] = useState("");
  const [no, setNo] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const success = await onLogin(name, no);
      if (!success) {
        setError(strings.auth.notAMember);
      }
    } catch (err) {
      setError(strings.auth.loginError);
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-md rounded-lg bg-white p-6 shadow-lg">
      <h2 className="mb-6 text-center text-2xl font-bold">
        {strings.auth.memberLogin}
      </h2>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded bg-red-100 p-2 text-red-700">
            {error}
          </div>
        )}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">
            {strings.auth.name}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium">
            {strings.auth.memberNumber}
          </label>
          <input
            type="text"
            value={no}
            onChange={(e) => setNo(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isLoading ? strings.common.loggingIn : strings.common.login}
        </button>
      </form>
    </div>
  );
};

// QuestionForm Component
const QuestionForm = ({
  question,
  pollId,
  memberRef,
  prevAnswer,
  onAnswerSubmit,
  isActiveQuestion,
  showWarning,
}: {
  question: Question;
  pollId: string;
  memberRef: DocumentReference;
  prevAnswer: Answer | null;
  onAnswerSubmit: (choice: string) => Promise<void>;
  isActiveQuestion: boolean;
  showWarning: boolean;
}) => {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(
    prevAnswer?.choice || null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(!!prevAnswer);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChoice || !question.id) return;

    // Check if this is still the active question
    if (!isActiveQuestion) {
      setError(strings.poll.questionNoLongerActive);
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onAnswerSubmit(selectedChoice);
      setIsSubmitted(true);
    } catch (err) {
      console.error("Error submitting answer:", err);
      setError(strings.poll.submitAnswerError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-lg bg-white p-6 shadow-lg">
      <h2 className="mb-6 text-lg font-bold">{question.question}</h2>

      {showWarning && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-100 p-3 text-amber-700">
          <p className="font-medium">{strings.poll.warning}</p>
          <p>{strings.poll.previousQuestionWarning}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-100 p-3 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-6 space-y-4">
          {question.choices.map((choice, index) => (
            <div key={index} className="flex items-center">
              <input
                type="radio"
                id={`choice-${index}`}
                name="choice"
                value={choice}
                checked={selectedChoice === choice}
                onChange={() => setSelectedChoice(choice)}
                className="mr-3"
                disabled={!isActiveQuestion}
              />
              <label
                htmlFor={`choice-${index}`}
                className={`text-lg ${!isActiveQuestion ? "text-gray-500" : ""}`}
              >
                {choice}
              </label>
            </div>
          ))}
        </div>
        <button
          type="submit"
          disabled={!selectedChoice || isSubmitting || !isActiveQuestion}
          className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isSubmitting
            ? strings.common.submitting
            : isSubmitted
              ? strings.common.submitAgain
              : strings.common.submit}
        </button>
      </form>
    </div>
  );
};

// Main component
export default function PollAnswerPage() {
  const params = useParams();
  const pollId = params.id as string;

  // Use real-time hooks instead of polling
  const {
    data: poll,
    loading: pollLoading,
    error: pollError,
  } = usePoll(pollId);
  const { data: activeQuestionId, loading: activeQuestionLoading } =
    useActiveQuestion(pollId);
  const { data: question, loading: questionLoading } = useQuestion(
    pollId,
    activeQuestionId || undefined,
  );

  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitionState, setTransitionState] = useState<
    "stable" | "loading" | "changing"
  >("loading");

  const { memberAuth, isLoggedIn, login, logout } = useMemberAuth();
  const memberRef = useRef<DocumentReference | null>(null);

  // Log current state for debugging
  useEffect(() => {
    console.log("Poll Answer Page State:", {
      pollId,
      activeQuestionId,
      question: question?.question || null,
      pollLoading,
      activeQuestionLoading,
      questionLoading,
      transitionState,
    });
  }, [
    pollId,
    activeQuestionId,
    question,
    pollLoading,
    activeQuestionLoading,
    questionLoading,
    transitionState,
  ]);

  // Set error from poll error if any
  useEffect(() => {
    if (pollError) {
      setError(formatString(strings.poll.loadError, pollError.message));
    }
  }, [pollError]);

  // Update transition state when loading states change
  useEffect(() => {
    // Only change to stable when all loading is complete
    if (!pollLoading && !activeQuestionLoading && !questionLoading) {
      // Wait a bit before setting to stable to ensure all data is processed
      setTimeout(() => {
        setTransitionState("stable");
      }, 300);
    }
  }, [pollLoading, activeQuestionLoading, questionLoading]);

  // Safety timeout to prevent infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (transitionState !== "stable") {
        console.log("Safety timeout triggered - forcing stable state");
        setTransitionState("stable");
      }
    }, 5000); // 5 seconds max loading time

    return () => clearTimeout(timeoutId);
  }, []);

  // Get member reference from member auth
  const getMemberRef = useCallback((): DocumentReference | null => {
    if (!memberAuth || !memberAuth.member_ref) return null;
    if (memberAuth.member_ref.trim() === "") return null;

    try {
      return doc(db, memberAuth.member_ref);
    } catch (error) {
      console.error("Error creating document reference:", error);
      return null;
    }
  }, [memberAuth]);

  // Update member reference when auth changes
  useEffect(() => {
    memberRef.current = getMemberRef();
  }, [memberAuth, getMemberRef]);

  // Subscribe to member's answer when question changes
  useEffect(() => {
    if (!pollId || !activeQuestionId || !memberRef.current) return;

    setTransitionState("changing");

    const unsubscribe = subscribeToMemberAnswer(
      pollId,
      activeQuestionId,
      memberRef.current,
      (answer) => {
        setAnswer(answer);
        setTransitionState("stable");
      },
    );

    return () => {
      unsubscribe();
    };
  }, [pollId, activeQuestionId, memberAuth]);

  // Adding the missing handleLogin function
  const handleLogin = async (name: string, no: string): Promise<boolean> => {
    if (!poll || !poll.poll_group?.id) {
      return false;
    }

    try {
      // Find member in the group
      const memberResult = await findMemberInGroup(
        poll.poll_group.id,
        name,
        no,
      );

      // If member exists, save authentication
      if (
        memberResult.exists &&
        memberResult.memberId &&
        memberResult.memberRef
      ) {
        const memberRefPath = memberResult.memberRef.path;

        login({
          member_id: memberResult.memberId,
          member_ref: memberRefPath,
          member_name: name,
          member_no: no,
          group_id: poll.poll_group.id,
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  // Handle manual refresh - just for user satisfaction, not needed with real-time
  const handleRefresh = async () => {
    setLoadingRefresh(true);
    // Wait for a brief moment for visual feedback
    setTimeout(() => {
      setLoadingRefresh(false);
    }, 500);
  };

  // Handle answer submission
  const handleAnswerSubmit = async (choice: string) => {
    if (!activeQuestionId || !memberRef.current || !pollId) {
      console.error("Missing required data for answer submission");
      return;
    }

    try {
      await getOrSubmitAnswer(
        pollId,
        activeQuestionId,
        memberRef.current,
        choice,
      );
      // Answer will update via the subscription
    } catch (error) {
      console.error("Error submitting answer:", error);
    }
  };

  // Determine if the question is active
  const isQuestionActive = !!activeQuestionId;

  const renderQuestionForm = () => {
    if (!question || !memberRef.current) return null;

    // Show warning if the question isn't active
    const showWarning = !isQuestionActive && transitionState === "stable";

    return (
      <QuestionForm
        question={question}
        pollId={pollId}
        memberRef={memberRef.current}
        prevAnswer={answer}
        onAnswerSubmit={handleAnswerSubmit}
        isActiveQuestion={isQuestionActive}
        showWarning={showWarning}
      />
    );
  };

  // Improved rendering logic - better transition effects and less flashing
  const renderContent = () => {
    // During state changes, keep current content but show loading indicator
    if (transitionState === "changing" || transitionState === "loading") {
      return (
        <div className="relative">
          {/* Show translucent overlay and loading indicator while keeping existing UI */}
          <div className="bg-opacity-60 absolute inset-0 z-10 flex items-center justify-center bg-white">
            <div className="text-center">
              <div className="mb-2 inline-block">
                <svg
                  className="h-8 w-8 animate-spin text-blue-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
            </div>
          </div>

          {/* Keep existing UI content (shown as translucent) */}
          {renderMainContent()}
        </div>
      );
    }

    // In stable state, show regular content
    return renderMainContent();
  };

  // Main content rendering - render based on current state regardless of transitionState
  const renderMainContent = () => {
    if (!isLoggedIn) {
      return (
        <LoginForm onLogin={handleLogin} groupId={poll?.poll_group?.id || ""} />
      );
    }

    if (!poll) {
      return (
        <div className="mx-auto mt-10 max-w-md rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-center text-2xl font-bold">
            {strings.poll.notFound}
          </h2>
          <p className="text-center">{strings.poll.notFoundDescription}</p>
        </div>
      );
    }

    if (!activeQuestionId) {
      return (
        <div className="mx-auto mt-10 max-w-md rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-center text-2xl font-bold">
            {strings.poll.noActiveQuestion}
          </h2>
          <p className="text-center">
            {strings.poll.noActiveQuestionDescription}
          </p>
        </div>
      );
    }

    if (!question) {
      return (
        <div className="mx-auto mt-10 max-w-md rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-center text-2xl font-bold">
            {strings.poll.questionNotFound}
          </h2>
          <p className="text-center">
            {strings.poll.questionNotFoundDescription}
          </p>
        </div>
      );
    }

    if (!memberRef.current) {
      return (
        <div className="mx-auto mt-10 max-w-md rounded-lg bg-red-100 p-6 text-red-700 shadow-lg">
          <h2 className="mb-4 text-2xl font-bold">{strings.auth.authError}</h2>
          <p>{strings.auth.loginAgain}</p>
          <button
            onClick={logout}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-white"
          >
            {strings.common.logout}
          </button>
        </div>
      );
    }

    return renderQuestionForm();
  };

  const isLoading = pollLoading || activeQuestionLoading || questionLoading;

  if (isLoading && transitionState === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-2xl">{strings.common.loading}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-lg bg-red-100 p-6 text-red-700 shadow-lg">
        <h2 className="mb-4 text-2xl font-bold">{strings.common.error}</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header with poll info, refresh and logout buttons */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-bold">
            {poll ? poll.poll_name : strings.poll.answer}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={loadingRefresh || transitionState !== "stable"}
            className="flex items-center justify-center rounded-md bg-gray-200 p-2 text-gray-700 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
            aria-label={strings.poll.refreshPoll}
          >
            {loadingRefresh || transitionState !== "stable" ? (
              <svg
                className="h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
          </button>
          {isLoggedIn && (
            <button
              onClick={logout}
              className="flex items-center justify-center rounded-md bg-gray-200 p-2 text-gray-700 hover:bg-gray-300"
              aria-label={strings.common.logout}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Member stats */}
      {memberAuth?.member_name && (
        <MemberStats memberName={memberAuth.member_name} pollId={pollId} />
      )}

      {/* Main content with improved transition handling */}
      {renderContent()}

      {/* Footer with logo */}
      <div className="fixed right-0 bottom-0 left-0 flex justify-center pb-4">
        <Image
          src="/gcs_logo.png"
          alt="GCS Logo"
          width={60}
          height={60}
          className="opacity-80"
        />
      </div>
    </div>
  );
}

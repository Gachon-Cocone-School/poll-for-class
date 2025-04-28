"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
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
} from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { Poll, Question } from "../../../../lib/types";

// Constants for Firebase collections
const POLLS_COLLECTION = "polls";
const QUESTIONS_COLLECTION = "questions";
const ANSWERS_COLLECTION = "answers";
const GROUPS_COLLECTION = "groups";
const MEMBERS_COLLECTION = "members";

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

  const q = query(
    membersCol,
    where("member_name", "==", memberName),
    where("member_no", "==", memberNo),
  );

  const memberSnapshot = await getDocs(q);

  if (memberSnapshot.empty) {
    return { exists: false };
  }

  const memberDoc = memberSnapshot.docs[0];
  return {
    exists: true,
    memberId: memberDoc.id,
    memberRef: memberDoc.ref,
  };
};

// Get a single poll by ID
const getPollById = async (id: string): Promise<Poll | null> => {
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

// Get a question by ID
const getQuestionById = async (
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
    return {
      id: answerDoc.id,
      ...(answerDoc.data() as Omit<Answer, "id">),
    };
  }

  // No existing answer found
  return null;
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
        setError("You are not a member of this group.");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-md rounded-lg bg-white p-6 shadow-lg">
      <h2 className="mb-6 text-center text-2xl font-bold">Member Login</h2>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded bg-red-100 p-2 text-red-700">
            {error}
          </div>
        )}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium">Name</label>
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
            Member Number
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
          {isLoading ? "Logging in..." : "Login"}
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
      setError(
        "This question is no longer active. Your answer cannot be submitted.",
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await onAnswerSubmit(selectedChoice);
      setIsSubmitted(true);
    } catch (err) {
      console.error("Error submitting answer:", err);
      setError("Failed to submit your answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-lg bg-white p-6 shadow-lg">
      <h2 className="mb-6 text-2xl font-bold">{question.question}</h2>

      {showWarning && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-100 p-3 text-amber-700">
          <p className="font-medium">
            Warning: This question is no longer active.
          </p>
          <p>
            You're viewing a previous question. Your answer cannot be submitted.
          </p>
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
            ? "Submitting..."
            : isSubmitted
              ? "Submit Again"
              : "Submit"}
        </button>
      </form>
    </div>
  );
};

// Main component
export default function PollAnswerPage() {
  const params = useParams();
  const pollId = params.id as string;

  const [poll, setPoll] = useState<Poll | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQuestionActive, setIsQuestionActive] = useState(false);
  const [noActivePoll, setNoActivePoll] = useState(false);
  const [transitionState, setTransitionState] = useState<
    "stable" | "loading" | "changing"
  >("loading");
  const [lastCheckTime, setLastCheckTime] = useState(0); // 마지막 체크 시간 추적

  const pollIdRef = useRef(pollId);
  const activeQuestionRef = useRef<string | null | undefined>(null);

  const { memberAuth, isLoggedIn, login, logout } = useMemberAuth();

  // Handle manual refresh
  const handleRefresh = async () => {
    setLoadingRefresh(true);
    await fetchPollData();
    // 강제로 체크하여 최신 상태 반영
    await checkActiveQuestion(true);
    setLoadingRefresh(false);
  };

  // 상태 변경 시 컨텐츠를 안정적으로 표시하는 메서드
  const setStableState = (fn: () => void) => {
    setTransitionState("changing");
    fn();
    setTimeout(() => {
      setTransitionState("stable");
    }, 300);
  };

  // 최적화된 active question 확인 로직
  const checkActiveQuestion = async (forceUpdate = false) => {
    if (!pollId) {
      setIsQuestionActive(false);
      return false;
    }

    // 너무 빈번한 체크 방지 (강제 업데이트가 아니면 최소 3초 간격 유지)
    const currentTime = Date.now();
    if (!forceUpdate && currentTime - lastCheckTime < 3000) {
      return isQuestionActive;
    }

    setLastCheckTime(currentTime);

    try {
      // Get the raw poll document first (faster)
      const pollRef = doc(db, POLLS_COLLECTION, pollId);
      const pollDoc = await getDoc(pollRef);

      if (!pollDoc.exists()) {
        setIsQuestionActive(false);
        return false;
      }

      const pollData = pollDoc.data();
      const activeQuestionId = pollData.active_question;

      // 이전에 확인한 active question과 동일하면 불필요한 상태 업데이트 방지
      if (activeQuestionId === activeQuestionRef.current && !forceUpdate) {
        return isQuestionActive;
      }

      // 현재 active question ID 업데이트
      activeQuestionRef.current = activeQuestionId;

      // Case 1: No active question (poll ended or not started)
      if (!activeQuestionId) {
        if (!noActivePoll || forceUpdate) {
          console.log("No active poll detected");

          setStableState(() => {
            setNoActivePoll(true);
            setIsQuestionActive(false);
            setPoll((prev) =>
              prev ? { ...prev, active_question: null } : null,
            );
            setQuestion(null);
          });
        }
        return false;
      }

      // Case 2: There is an active question now
      if (noActivePoll || !poll?.active_question || forceUpdate) {
        console.log("Poll started or changed to active state!");

        setTransitionState("changing");
        setNoActivePoll(false);

        // Force complete refresh of poll data and question
        const fullPollData = await getPollById(pollId);

        if (fullPollData && fullPollData.active_question) {
          const newQuestion = await getQuestionById(
            pollId,
            fullPollData.active_question,
          );

          setStableState(() => {
            setPoll(fullPollData);

            if (newQuestion) {
              setQuestion(newQuestion);
              setIsQuestionActive(true);

              // Answer 데이터 로드는 별도로 처리
              if (
                memberAuth &&
                newQuestion.id &&
                memberAuth.member_ref &&
                memberAuth.member_ref.trim() !== ""
              ) {
                const loadAnswer = async () => {
                  try {
                    const memberRef = doc(db, memberAuth.member_ref);
                    const prevAnswer = await getOrSubmitAnswer(
                      pollId,
                      newQuestion.id,
                      memberRef,
                    );
                    setAnswer(prevAnswer);
                  } catch (error) {
                    console.error(
                      "Error fetching answer for new question:",
                      error,
                    );
                  }
                };

                loadAnswer();
              }
            } else {
              console.log("Question not found");
              setIsQuestionActive(false);
            }
          });

          return !!newQuestion;
        }
      }

      // Case 3: Active question changed
      if (
        poll &&
        poll.active_question &&
        activeQuestionId !== poll.active_question
      ) {
        console.log("Active question changed");

        setTransitionState("changing");

        // Active question changed - update everything
        const fullPollData = await getPollById(pollId);

        if (fullPollData && fullPollData.active_question) {
          const newQuestion = await getQuestionById(
            pollId,
            fullPollData.active_question,
          );

          setStableState(() => {
            setPoll(fullPollData);

            if (newQuestion) {
              setQuestion(newQuestion);
              setIsQuestionActive(true);

              // Answer 데이터 로드는 별도로 처리
              if (
                memberAuth &&
                newQuestion.id &&
                memberAuth.member_ref &&
                memberAuth.member_ref.trim() !== ""
              ) {
                const loadAnswer = async () => {
                  try {
                    const memberRef = doc(db, memberAuth.member_ref);
                    const prevAnswer = await getOrSubmitAnswer(
                      pollId,
                      newQuestion.id,
                      memberRef,
                    );
                    setAnswer(prevAnswer);
                  } catch (error) {
                    console.error(
                      "Error fetching answer for new question:",
                      error,
                    );
                  }
                };

                loadAnswer();
              }
            } else {
              console.log("Question not found after active question change");
              setIsQuestionActive(false);
            }
          });

          return !!newQuestion;
        }
      }

      // Case 4: Check if current question is still the active one
      const isActive = question?.id === activeQuestionId;

      if (isActive !== isQuestionActive) {
        setIsQuestionActive(isActive);
      }

      return isActive;
    } catch (error) {
      console.error("Error checking active question status:", error);
      setTransitionState("stable");
      return false;
    }
  };

  // Optimized fetch poll data function
  const fetchPollData = async () => {
    try {
      setLoading(true);
      setTransitionState("loading");
      setError(null);

      const pollData = await getPollById(pollId);
      setPoll(pollData);

      if (!pollData) {
        setError("Poll not found");
        setLoading(false);
        setTransitionState("stable");
        return;
      }

      // Check if there's an active question
      if (!pollData.active_question) {
        setLoading(false);
        setTransitionState("stable");
        return;
      }

      // Fetch the active question
      const activeQuestion = await getQuestionById(
        pollId,
        pollData.active_question,
      );

      // 질문이 없는 경우 상태 변환을 안정화
      if (!activeQuestion) {
        setLoading(false);
        setTransitionState("stable");
        return;
      }

      setQuestion(activeQuestion);
      setIsQuestionActive(true);

      // If user is logged in, fetch their previous answer
      if (
        memberAuth &&
        activeQuestion.id &&
        memberAuth.member_ref &&
        memberAuth.member_ref.trim() !== ""
      ) {
        try {
          // Convert member_ref path string to a document reference
          const memberRef = doc(db, memberAuth.member_ref);

          const prevAnswer = await getOrSubmitAnswer(
            pollId,
            activeQuestion.id,
            memberRef,
          );
          setAnswer(prevAnswer);
        } catch (error) {
          console.error(
            "Error creating member reference or fetching answer:",
            error,
          );
        }
      }
    } catch (err) {
      console.error("Error fetching poll data:", err);
      setError("Failed to load poll data");
    } finally {
      setLoading(false);
      setTransitionState("stable");
    }
  };

  // 자동 업데이트를 위한 useEffect - 반응 속도와 화면 깜박임 균형 유지
  useEffect(() => {
    // 초기 체크
    if (pollId) {
      checkActiveQuestion(true);
    }

    // poll ID가 변경되면 참조 업데이트
    pollIdRef.current = pollId;

    // 3초마다 상태 확인 (이전 1.5초보다 증가)
    const intervalId = setInterval(() => {
      if (pollIdRef.current) {
        checkActiveQuestion();
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [pollId]);

  // Force refresh when URL parameter changes or login state changes
  useEffect(() => {
    if (pollId) {
      fetchPollData();
    }
  }, [pollId, isLoggedIn]);

  // Handle answer submission
  const handleAnswerSubmit = async (choice: string) => {
    // Verify this is still the active question before submitting
    const isActive = await checkActiveQuestion();

    if (!isActive) {
      return;
    }

    if (
      memberAuth &&
      question?.id &&
      memberAuth.member_ref &&
      memberAuth.member_ref.trim() !== ""
    ) {
      try {
        // Convert member_ref path string to a document reference
        const memberRef = doc(db, memberAuth.member_ref);

        const updatedAnswer = await getOrSubmitAnswer(
          pollId,
          question.id,
          memberRef,
          choice, // Passing the choice means we want to submit/update the answer
        );

        setAnswer(updatedAnswer);
      } catch (error) {
        console.error(
          "Error creating member reference or submitting answer:",
          error,
        );
      }
    }
  };

  // Get member reference from member auth
  const getMemberRef = (): DocumentReference | null => {
    if (!memberAuth || !memberAuth.member_ref) return null;

    // Check if member_ref is empty to avoid the empty path error
    if (memberAuth.member_ref.trim() === "") return null;

    try {
      return doc(db, memberAuth.member_ref);
    } catch (error) {
      console.error("Error creating document reference:", error);
      return null;
    }
  };

  const renderQuestionForm = () => {
    if (!question || !memberRef) return null;

    // 상태 전환 중에는 경고 메시지를 표시하지 않음
    const showWarning = !isQuestionActive && transitionState === "stable";

    return (
      <QuestionForm
        question={question}
        pollId={pollId}
        memberRef={memberRef}
        prevAnswer={answer}
        onAnswerSubmit={handleAnswerSubmit}
        isActiveQuestion={isQuestionActive}
        showWarning={showWarning}
      />
    );
  };

  // 개선된 렌더링 로직 - 더 나은 전환 효과와 더 적은 플래시
  const renderContent = () => {
    // 상태 변화 중에는 현재 내용을 유지하되 로딩 인디케이터 표시
    if (transitionState === "changing" || transitionState === "loading") {
      return (
        <div className="relative">
          {/* 내용이 유지되는 동안 반투명 오버레이와 로딩 인디케이터 표시 */}
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

          {/* 기존 UI 내용 유지 (반투명하게 표시됨) */}
          {renderMainContent()}
        </div>
      );
    }

    // 안정적인 상태에서는 일반 컨텐츠 표시
    return renderMainContent();
  };

  // 메인 내용 렌더링 - transitionState와 상관없이 현재 상태 기반 렌더링
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
            Poll Not Found
          </h2>
          <p className="text-center">The requested poll could not be found.</p>
        </div>
      );
    }

    if (!poll.active_question) {
      return (
        <div className="mx-auto mt-10 max-w-md rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-center text-2xl font-bold">
            No Poll Available
          </h2>
          <p className="text-center">
            There is currently no active poll question.
          </p>
        </div>
      );
    }

    if (!question) {
      return (
        <div className="mx-auto mt-10 max-w-md rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-center text-2xl font-bold">
            Question Not Found
          </h2>
          <p className="text-center">The active question could not be found.</p>
        </div>
      );
    }

    if (!memberRef) {
      return (
        <div className="mx-auto mt-10 max-w-md rounded-lg bg-red-100 p-6 text-red-700 shadow-lg">
          <h2 className="mb-4 text-2xl font-bold">Authentication Error</h2>
          <p>Please log out and log in again.</p>
          <button
            onClick={logout}
            className="mt-4 rounded-md bg-red-600 px-4 py-2 text-white"
          >
            Logout
          </button>
        </div>
      );
    }

    return renderQuestionForm();
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-lg bg-red-100 p-6 text-red-700 shadow-lg">
        <h2 className="mb-4 text-2xl font-bold">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  const memberRef = getMemberRef();

  return (
    <div className="container mx-auto p-4">
      {/* Header with poll info, refresh and logout buttons */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {poll ? poll.poll_name : "Poll Answer"}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={loadingRefresh || transitionState !== "stable"}
            className="flex items-center rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:bg-blue-300"
            aria-label="Refresh poll"
          >
            {loadingRefresh || transitionState !== "stable" ? (
              <>
                <svg
                  className="mr-2 -ml-1 h-4 w-4 animate-spin"
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
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <svg
                  className="mr-1 h-4 w-4"
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
                <span>Refresh</span>
              </>
            )}
          </button>
          {isLoggedIn && (
            <button
              onClick={logout}
              className="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
            >
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Main content with improved transition handling */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-2xl">Loading...</div>
        </div>
      ) : error ? (
        <div className="mx-auto mt-10 max-w-md rounded-lg bg-red-100 p-6 text-red-700 shadow-lg">
          <h2 className="mb-4 text-2xl font-bold">Error</h2>
          <p>{error}</p>
        </div>
      ) : (
        renderContent()
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import Layout from "~/components/Layout";
import { api } from "~/trpc/react";
import type {
  Question,
  Member,
  QuestionResult,
  Answer,
  ParticipantStats,
} from "~/lib/types";
import {
  usePoll,
  useActiveQuestion,
  usePollQuestions,
  useQuestionAnswers,
} from "~/hooks/usePolls";
import { useGroupMembers } from "~/hooks/useGroups";
import { QRCodeSVG } from "qrcode.react";
import { env } from "~/env";
import strings from "~/lib/strings";
import { deleteDoc, doc, collection, getDocs } from "firebase/firestore";
import { db } from "~/lib/firebase";
import { subscribeToParticipantStats } from "~/lib/pollService";
import StatsModal from "~/components/stats/StatsModal";

const POLLS_COLLECTION = "polls";
const QUESTIONS_COLLECTION = "questions";
const ANSWERS_COLLECTION = "answers";

export default function PollPlayPage() {
  const params = useParams();
  const router = useRouter();
  const pollId = params.id as string;

  // 기본 상태들
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sortedQuestions, setSortedQuestions] = useState<Question[]>([]);
  const [sortedMembers, setSortedMembers] = useState<Member[]>([]);
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [isStartingPoll, setIsStartingPoll] = useState(false);
  const [isEndingPoll, setIsEndingPoll] = useState(false);
  // Add stats modal states
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [pollStats, setPollStats] = useState<ParticipantStats[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  // Add ref to track stats subscription
  const statsUnsubscribeRef = useRef<(() => void) | null>(null);

  // Use real-time hooks for data fetching
  const { data: poll, loading: pollLoading } = usePoll(pollId);
  const { data: questions, loading: questionsLoading } =
    usePollQuestions(pollId);
  const { data: activeQuestionId, loading: activeQuestionLoading } =
    useActiveQuestion(pollId);

  // Is poll active state based directly on activeQuestionId
  const isPollActive = !!activeQuestionId;

  // Get the current group ID
  const groupId = poll?.poll_group?.id;

  // Get group members with real-time updates
  const { data: members = [], loading: membersLoading } =
    useGroupMembers(groupId);

  // Get the current question (based on index in sorted questions)
  const currentQuestion = sortedQuestions[currentQuestionIndex];

  // Get answers for current question with real-time updates
  const { data: questionAnswers = [], loading: answersLoading } =
    useQuestionAnswers(pollId, currentQuestion?.id);

  // Create QR code URL for the poll answer page
  const qrCodeUrl = `${env.NEXT_PUBLIC_MY_END_POINT}/polls/answer/${pollId}`;

  // For TRPC mutations
  const utils = api.useUtils();

  // Mutation 설정
  const updateActiveMutation = api.poll.updateActiveQuestion.useMutation();
  const calculateResultsMutation = api.poll.calculatePollResults.useMutation({
    onSuccess: (data, variables) => {
      // Poll 결과 계산이 완료되면 참가자 통계 계산
      calculateParticipantStatsMutation.mutate({
        pollId: variables.pollId,
      });
    },
  });
  const clearResultsMutation = api.poll.clearPollResults.useMutation();
  const calculateParticipantStatsMutation =
    api.poll.calculateParticipantStats.useMutation();

  // Sort questions when they change
  useEffect(() => {
    if (!questions || questions.length === 0) return;

    const sorted = [...questions].sort((a, b) =>
      a.question.localeCompare(b.question),
    );
    setSortedQuestions(sorted);

    // If there's an active question, find and select it
    if (activeQuestionId) {
      const index = sorted.findIndex((q) => q.id === activeQuestionId);
      if (index >= 0) {
        setCurrentQuestionIndex(index);
      }
    }
  }, [questions, activeQuestionId]);

  // Sort members when they change
  useEffect(() => {
    if (!members.length) return;

    const sorted = [...members].sort((a, b) =>
      a.member_name.localeCompare(b.member_name),
    );
    setSortedMembers(sorted);
  }, [members]);

  // Clean up stats subscription when component unmounts
  useEffect(() => {
    return () => {
      if (statsUnsubscribeRef.current) {
        statsUnsubscribeRef.current();
        statsUnsubscribeRef.current = null;
      }
    };
  }, []);

  // Clean up previous subscription when modal closes
  useEffect(() => {
    if (!statsModalOpen && statsUnsubscribeRef.current) {
      statsUnsubscribeRef.current();
      statsUnsubscribeRef.current = null;
    }
  }, [statsModalOpen]);

  // Poll 시작/종료 핸들러
  const handlePollStart = useCallback(() => {
    if (!sortedQuestions.length) return;

    const currentQuestion = sortedQuestions[currentQuestionIndex];
    if (!currentQuestion?.id) return;

    if (currentQuestion.poll_result) {
      clearResultsMutation.mutate({
        pollId,
        questionId: currentQuestion.id,
      });
    }

    setIsStartingPoll(true);
    updateActiveMutation.mutate(
      { pollId, questionId: currentQuestion.id },
      {
        onSettled: () => {
          setIsStartingPoll(false);
        },
      },
    );
  }, [
    pollId,
    sortedQuestions,
    currentQuestionIndex,
    updateActiveMutation,
    clearResultsMutation,
  ]);

  const handlePollEnd = useCallback(() => {
    if (!sortedQuestions.length) return;

    const currentQuestion = sortedQuestions[currentQuestionIndex];
    if (!currentQuestion?.id) return;

    // 결과 계산 - onSuccess 콜백에서 참가자 통계도 계산함
    setIsEndingPoll(true);
    calculateResultsMutation.mutate(
      {
        pollId,
        questionId: currentQuestion.id,
      },
      {
        onSettled: () => {
          setIsEndingPoll(false);
        },
      },
    );

    // 활성 질문 상태 업데이트
    updateActiveMutation.mutate({ pollId, questionId: null });
  }, [
    pollId,
    sortedQuestions,
    currentQuestionIndex,
    updateActiveMutation,
    calculateResultsMutation,
  ]);

  // 네비게이션 핸들러
  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < sortedQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }, [currentQuestionIndex, sortedQuestions.length]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex]);

  // Handle showing the leaderboard modal
  const handleShowStats = useCallback(() => {
    try {
      setIsLoadingStats(true);

      // Clean up any existing subscription first
      if (statsUnsubscribeRef.current) {
        statsUnsubscribeRef.current();
        statsUnsubscribeRef.current = null;
      }

      // Set up real-time listener for the stats
      const unsubscribe = subscribeToParticipantStats(
        pollId,
        (participantStats) => {
          setPollStats(participantStats || []);
          setIsLoadingStats(false);
          setStatsModalOpen(true);
        },
        (error) => {
          console.error("통계 조회 오류:", error);
          setPollStats([]);
          setIsLoadingStats(false);
          setStatsModalOpen(true);
        },
      );

      // Save the unsubscribe function for cleanup
      statsUnsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error("통계 조회 오류:", error);
      setPollStats([]);
      setStatsModalOpen(true);
      setIsLoadingStats(false);
    }
  }, [pollId]);

  const handleCloseStatsModal = () => {
    setStatsModalOpen(false);
  };

  // Helper function to check if a member has answered
  const checkIfMemberHasAnswered = useCallback(
    (member: Member) => {
      if (!questionAnswers.length || !currentQuestion?.id) return false;

      // Find if this member has answered the current question
      return questionAnswers.some((answer) => {
        if (!answer.member_ref) return false;

        try {
          // member_ref는 DocumentReference이지만 실제 데이터는 다른 형태일 수 있음
          // any 타입으로 일시적 캐스팅하여 내부 속성에 접근
          const memberRef = answer.member_ref as any;

          if (
            memberRef._key &&
            memberRef._key.path &&
            Array.isArray(memberRef._key.path.segments)
          ) {
            const segments = memberRef._key.path.segments;
            const answeredMemberId = segments[segments.length - 1];
            return answeredMemberId === member.id;
          }

          // 또는 일반적인 Firebase DocumentReference인 경우 경로에서 ID 추출
          if (typeof memberRef.path === "string") {
            const pathParts = memberRef.path.split("/");
            const answeredMemberId = pathParts[pathParts.length - 1];
            return answeredMemberId === member.id;
          }

          return false;
        } catch (error) {
          console.error("Error comparing member refs:", error);
          return false;
        }
      });
    },
    [questionAnswers, currentQuestion?.id],
  );

  // Helper function to get answer ID for a member
  const getAnswerIdForMember = useCallback(
    (member: Member) => {
      if (!questionAnswers.length || !currentQuestion?.id) return null;

      // Find this member's answer to the current question
      const memberAnswer = questionAnswers.find((answer) => {
        if (!answer.member_ref) return false;

        try {
          // member_ref는 DocumentReference이지만 실제 데이터는 다른 형태일 수 있음
          // any 타입으로 일시적 캐스팅하여 내부 속성에 접근
          const memberRef = answer.member_ref as any;

          if (
            memberRef._key &&
            memberRef._key.path &&
            Array.isArray(memberRef._key.path.segments)
          ) {
            const segments = memberRef._key.path.segments;
            const answeredMemberId = segments[segments.length - 1];
            return answeredMemberId === member.id;
          }

          // 또는 일반적인 Firebase DocumentReference인 경우 경로에서 ID 추출
          if (typeof memberRef.path === "string") {
            const pathParts = memberRef.path.split("/");
            const answeredMemberId = pathParts[pathParts.length - 1];
            return answeredMemberId === member.id;
          }

          return false;
        } catch (error) {
          console.error("Error comparing member refs:", error);
          return false;
        }
      });

      return memberAnswer?.id || null;
    },
    [questionAnswers, currentQuestion?.id],
  );

  // Function to delete a member's answer
  const deleteAnswer = useCallback(
    async (member: Member) => {
      if (!currentQuestion?.id || !member.id) return;

      const answerId = getAnswerIdForMember(member);
      if (!answerId) return;

      try {
        // Show confirmation
        if (window.confirm(strings.poll.deleteAnswerConfirm)) {
          setDeletingMemberId(member.id);

          // Delete the answer document
          const answerRef = doc(
            db,
            POLLS_COLLECTION,
            pollId,
            QUESTIONS_COLLECTION,
            currentQuestion.id,
            ANSWERS_COLLECTION,
            answerId,
          );

          await deleteDoc(answerRef);
          console.log(`Deleted answer for member ${member.member_name}`);

          // Firebase real-time updates will automatically update the UI
          setDeletingMemberId(null);
        }
      } catch (error) {
        console.error("Error deleting answer:", error);
        alert(strings.poll.deleteAnswerError);
        setDeletingMemberId(null);
      }
    },
    [pollId, currentQuestion?.id, getAnswerIdForMember],
  );

  // Function to delete all answers for the current question
  const deleteAllAnswers = useCallback(async () => {
    if (!currentQuestion?.id) return;

    try {
      // Show confirmation
      if (
        window.confirm(
          strings.poll.deleteAllAnswersConfirm ||
            "Delete all answers for this question?",
        )
      ) {
        // Delete all answers in the collection
        const answersRef = collection(
          db,
          POLLS_COLLECTION,
          pollId,
          QUESTIONS_COLLECTION,
          currentQuestion.id,
          ANSWERS_COLLECTION,
        );

        const answersSnapshot = await getDocs(answersRef);

        // Delete answers one by one
        const deletePromises = answersSnapshot.docs.map((doc) =>
          deleteDoc(doc.ref),
        );

        await Promise.all(deletePromises);
        console.log(`Deleted all answers for question ${currentQuestion.id}`);

        // Recalculate results (same as when ending poll)
        calculateResultsMutation.mutate(
          {
            pollId,
            questionId: currentQuestion.id,
          },
          {
            onSuccess: () => {
              // Poll 결과 계산이 완료되면 참가자 통계 계산
              calculateParticipantStatsMutation.mutate({
                pollId,
              });
            },
          },
        );
      }
    } catch (error) {
      console.error("Error deleting all answers:", error);
      alert(strings.poll.deleteAllAnswersError || "Failed to delete answers");
    }
  }, [
    pollId,
    currentQuestion?.id,
    calculateResultsMutation,
    calculateParticipantStatsMutation,
  ]);

  // 로딩 상태 확인
  const isLoading = pollLoading || questionsLoading;

  // 결과에서 총 투표수 계산
  const getTotalVotes = (results: QuestionResult): number => {
    return Object.values(results).reduce((sum, count) => sum + count, 0);
  };

  return (
    <Layout>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <Image
            src="/gcs_logo.png"
            alt="GCS Logo"
            width={40}
            height={40}
            className="mr-3"
          />
          <h1 className="text-2xl font-bold">
            {!poll
              ? strings.common.loading
              : `${strings.poll.playing}: ${poll.poll_name}`}
          </h1>
        </div>
        <button
          onClick={() => router.back()}
          className="rounded-md bg-gray-200 px-4 py-2 hover:bg-gray-300"
        >
          {strings.common.back}
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      ) : sortedQuestions.length > 0 ? (
        <div className="grid h-[calc(100vh-180px)] grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left Panel - Questions - Full height */}
          <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            {/* Question Navigation */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={goToPreviousQuestion}
                  disabled={isPollActive || currentQuestionIndex === 0}
                  className={`rounded p-1 ${
                    isPollActive || currentQuestionIndex === 0
                      ? "cursor-not-allowed text-gray-300"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                <span className="mx-2 text-lg font-medium">
                  {currentQuestionIndex + 1}/{sortedQuestions.length}
                </span>
                <button
                  onClick={goToNextQuestion}
                  disabled={
                    isPollActive ||
                    currentQuestionIndex === sortedQuestions.length - 1
                  }
                  className={`rounded p-1 ${
                    isPollActive ||
                    currentQuestionIndex === sortedQuestions.length - 1
                      ? "cursor-not-allowed text-gray-300"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handlePollStart}
                  disabled={isPollActive || isStartingPoll}
                  className={`flex items-center rounded-md px-3 py-1 text-sm ${
                    isPollActive || isStartingPoll
                      ? "cursor-not-allowed bg-gray-300 text-gray-500"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isStartingPoll ? (
                    <>
                      <svg
                        className="mr-2 h-4 w-4 animate-spin"
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
                      {strings.common.loading}
                    </>
                  ) : (
                    strings.poll.start
                  )}
                </button>
                <button
                  onClick={handlePollEnd}
                  disabled={!isPollActive || isEndingPoll}
                  className={`flex items-center rounded-md px-3 py-1 text-sm ${
                    !isPollActive || isEndingPoll
                      ? "cursor-not-allowed bg-gray-300 text-gray-500"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {isEndingPoll ? (
                    <>
                      <svg
                        className="mr-2 h-4 w-4 animate-spin"
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
                      {strings.common.loading}
                    </>
                  ) : (
                    strings.poll.end
                  )}
                </button>
              </div>
            </div>

            {/* Current Question - Flex grow to fill space */}
            <div className="mt-4 flex-grow overflow-y-auto">
              <h2 className="mb-4 text-xl font-semibold">
                {currentQuestion?.question}
              </h2>
              <div className="space-y-3">
                {currentQuestion?.choices.map((choice, index) => {
                  const hasResults = currentQuestion.poll_result != null;
                  const votes = hasResults
                    ? currentQuestion.poll_result?.[choice] || 0
                    : 0;
                  const totalVotes = hasResults
                    ? getTotalVotes(currentQuestion.poll_result!)
                    : 0;
                  const percentage =
                    totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

                  return (
                    <div key={index} className="space-y-1">
                      <div className="rounded-md border border-gray-300 p-3 hover:bg-gray-50">
                        {choice}
                      </div>

                      {/* Poll Results */}
                      {hasResults && (
                        <div className="mt-1">
                          <div className="flex items-center">
                            <div className="h-4 w-full rounded-full bg-gray-200">
                              <div
                                className="h-4 rounded-full bg-blue-600 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="ml-2 w-24 text-sm">
                              {votes} {strings.poll.votes} ({percentage}%)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* QR Code - Only show when poll is active */}
              {isPollActive && (
                <div className="mt-8 flex flex-col items-center">
                  <h3 className="mb-3 text-center text-sm font-medium text-gray-600">
                    {strings.poll.scanToAnswer}
                  </h3>
                  <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                    <QRCodeSVG value={qrCodeUrl} size={150} />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{qrCodeUrl}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Members - Full height */}
          <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {strings.group.members} ({questionAnswers.length}/
                {sortedMembers.length})
              </h2>
              {!isPollActive && (
                <div className="flex space-x-2">
                  {questionAnswers.length > 0 && (
                    <button
                      onClick={deleteAllAnswers}
                      title={strings.poll.deleteAllAnswers}
                      className="flex items-center rounded-md bg-red-100 px-3 py-1 text-sm text-red-600 hover:bg-red-200"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={handleShowStats}
                    title={strings.stats.title}
                    className="flex items-center rounded-md bg-indigo-100 px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-200"
                    disabled={isLoadingStats}
                  >
                    {isLoadingStats ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                    ) : (
                      <ChartBarIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-x-1 gap-y-0.5 overflow-y-auto sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {sortedMembers.length > 0 ? (
                sortedMembers.map((member, index) => {
                  // Use the helper function to check if member has answered
                  const hasAnswered = checkIfMemberHasAnswered(member);
                  const isHovered = hoveredMemberId === member.id;
                  const isDeleting = deletingMemberId === member.id;

                  return (
                    <div
                      key={index}
                      className={`relative flex h-12 items-center justify-center rounded-md border px-2 py-1 text-center text-base ${
                        hasAnswered
                          ? "border-green-500 bg-green-50"
                          : "border-gray-300 bg-gray-50"
                      }`}
                      onMouseEnter={() =>
                        hasAnswered &&
                        isPollActive &&
                        member.id &&
                        setHoveredMemberId(member.id)
                      }
                      onMouseLeave={() => setHoveredMemberId(null)}
                    >
                      {hasAnswered &&
                        isPollActive &&
                        isHovered &&
                        !isDeleting && (
                          <button
                            className="absolute top-1 right-1 rounded-full bg-red-100 p-1 text-red-600 hover:bg-red-200"
                            onClick={() => deleteAnswer(member)}
                            title={strings.poll.deleteAnswer}
                          >
                            <TrashIcon className="h-3 w-3" />
                          </button>
                        )}
                      {isDeleting ? (
                        <span className="text-xs text-gray-500">
                          {strings.common.deleting}...
                        </span>
                      ) : (
                        member.member_name || strings.common.unnamed
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center text-gray-500">
                  {strings.group.noMembers}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="text-sm text-yellow-700">
            {strings.poll.noQuestions}
          </div>
        </div>
      )}

      {/* Stats Modal */}
      <StatsModal
        isOpen={statsModalOpen}
        onClose={handleCloseStatsModal}
        stats={pollStats}
        pollName={poll?.poll_name || ""}
        isLoading={isLoadingStats}
      />
    </Layout>
  );
}

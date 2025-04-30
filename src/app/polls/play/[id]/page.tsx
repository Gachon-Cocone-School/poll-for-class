"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import Layout from "~/components/Layout";
import { api } from "~/trpc/react";
import {
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

export default function PollPlayPage() {
  const params = useParams();
  const router = useRouter();
  const pollId = params.id as string;

  // 기본 상태들
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sortedQuestions, setSortedQuestions] = useState<Question[]>([]);
  const [sortedMembers, setSortedMembers] = useState<Member[]>([]);

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

    updateActiveMutation.mutate({ pollId, questionId: currentQuestion.id });
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
    calculateResultsMutation.mutate({
      pollId,
      questionId: currentQuestion.id,
    });

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

  // Helper function to check if a member has answered
  const checkIfMemberHasAnswered = useCallback(
    (member: Member) => {
      if (!questionAnswers.length || !currentQuestion?.id) return false;

      // Find if this member has answered the current question
      return questionAnswers.some((answer) => {
        if (!answer.member_ref) return false;

        try {
          if (
            answer.member_ref._key &&
            answer.member_ref._key.path &&
            Array.isArray(answer.member_ref._key.path.segments)
          ) {
            const segments = answer.member_ref._key.path.segments;
            const answeredMemberId = segments[segments.length - 1];
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

  // 로딩 상태 확인
  const isLoading = pollLoading || questionsLoading;

  // 결과에서 총 투표수 계산
  const getTotalVotes = (results: QuestionResult): number => {
    return Object.values(results).reduce((sum, count) => sum + count, 0);
  };

  return (
    <Layout>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {!poll
            ? strings.common.loading
            : `${strings.poll.playing}: ${poll.poll_name}`}
        </h1>
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
                  disabled={isPollActive}
                  className={`rounded-md px-3 py-1 text-sm ${
                    isPollActive
                      ? "cursor-not-allowed bg-gray-300 text-gray-500"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {strings.poll.start}
                </button>
                <button
                  onClick={handlePollEnd}
                  disabled={!isPollActive}
                  className={`rounded-md px-3 py-1 text-sm ${
                    !isPollActive
                      ? "cursor-not-allowed bg-gray-300 text-gray-500"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {strings.poll.end}
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
            <h2 className="mb-4 text-lg font-semibold">
              {strings.group.members} ({sortedMembers.length})
            </h2>

            <div className="grid flex-grow grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {sortedMembers.length > 0 ? (
                sortedMembers.map((member, index) => {
                  // Use the helper function to check if member has answered
                  const hasAnswered = checkIfMemberHasAnswered(member);

                  return (
                    <div
                      key={index}
                      className={`flex h-16 items-center justify-center rounded-md border p-2 text-center text-sm ${
                        hasAnswered
                          ? "border-green-500 bg-green-50"
                          : "border-gray-300 bg-gray-50"
                      }`}
                    >
                      {member.member_name || strings.common.unnamed}
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
    </Layout>
  );
}

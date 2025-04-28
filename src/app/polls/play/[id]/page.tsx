"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import Layout from "~/components/Layout";
import { api } from "~/trpc/react";
import { Question, Member } from "~/lib/types";

export default function PollPlayPage() {
  const params = useParams();
  const router = useRouter();
  const pollId = params.id as string;

  // 기본 상태들
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sortedQuestions, setSortedQuestions] = useState<Question[]>([]);
  const [sortedMembers, setSortedMembers] = useState<Member[]>([]);
  const [isPollActive, setIsPollActive] = useState(false);
  const [lastNavigationTime, setLastNavigationTime] = useState<number>(
    Date.now(),
  );

  // Context API에서 데이터 가져오기, 강제 리패치 추가
  const utils = api.useUtils();

  useEffect(() => {
    // 컴포넌트가 마운트될 때마다 데이터 강제 리패치
    const refreshData = async () => {
      await Promise.all([
        utils.poll.getActiveQuestion.invalidate({ pollId }),
        utils.poll.getById.invalidate({ id: pollId }),
        utils.poll.getQuestions.invalidate({ pollId }),
      ]);

      // 그룹 ID가 있을 경우 멤버 데이터도 갱신
      if (poll?.poll_group?.id) {
        await utils.group.getMembers.invalidate({
          groupId: poll.poll_group.id,
        });
      }

      setLastNavigationTime(Date.now());
    };

    refreshData();
  }, [pollId, utils]);

  // 데이터 가져오기
  const { data: poll } = api.poll.getById.useQuery(
    { id: pollId },
    {
      enabled: !!pollId,
      refetchOnMount: "always", // 항상 마운트시 다시 가져옴
      refetchOnWindowFocus: true,
      staleTime: 0, // 항상 데이터를 신선하지 않은 것으로 간주
    },
  );

  const { data: questions } = api.poll.getQuestions.useQuery(
    { pollId },
    {
      enabled: !!pollId,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
  );

  const { data: activeQuestionId } = api.poll.getActiveQuestion.useQuery(
    { pollId },
    {
      enabled: !!pollId,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      staleTime: 0,
      refetchInterval: 2000, // 2초마다 active question 상태 확인
    },
  );

  // 그룹 ID 가져오기
  const groupId = poll?.poll_group?.id;

  // 그룹 멤버 가져오기
  const { data: members = [] } = api.group.getMembers.useQuery(
    { groupId: groupId as string },
    {
      enabled: !!groupId,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
  );

  // Mutation 설정
  const updateActiveMutation = api.poll.updateActiveQuestion.useMutation({
    onSuccess: () => {
      // 변경 후 즉시 데이터 다시 가져오기
      utils.poll.getActiveQuestion.invalidate({ pollId });
    },
  });

  // 질문 데이터 처리
  useEffect(() => {
    // 질문이 없을 경우 처리 중단
    if (!questions || questions.length === 0) {
      return;
    }

    // 질문 알파벳순 정렬
    const sorted = [...questions].sort((a, b) =>
      a.question.localeCompare(b.question),
    );
    setSortedQuestions(sorted);

    // poll 활성화 상태 설정
    const isActive = !!activeQuestionId;
    setIsPollActive(isActive);

    // 활성 질문이 있으면 해당 인덱스로 설정
    if (isActive && activeQuestionId) {
      const index = sorted.findIndex((q) => q.id === activeQuestionId);
      if (index >= 0) {
        setCurrentQuestionIndex(index);
      }
    }
  }, [questions, activeQuestionId, lastNavigationTime]);

  // 멤버 데이터 정렬
  useEffect(() => {
    if (members.length > 0) {
      const sorted = [...members].sort((a, b) =>
        a.member_name.localeCompare(b.member_name),
      );
      setSortedMembers(sorted);
    }
  }, [members]);

  // 윈도우 포커스 이벤트 처리
  useEffect(() => {
    const handleFocus = async () => {
      // 포커스 시 데이터 강제 리패치
      await utils.poll.getActiveQuestion.invalidate({ pollId });
      await utils.poll.getById.invalidate({ id: pollId });
      await utils.poll.getQuestions.invalidate({ pollId });

      if (poll?.poll_group?.id) {
        await utils.group.getMembers.invalidate({
          groupId: poll.poll_group.id,
        });
      }

      setLastNavigationTime(Date.now());
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [pollId, poll, utils]);

  // Poll 시작/종료 핸들러
  const handlePollStart = useCallback(() => {
    if (!sortedQuestions.length) return;

    const currentQuestion = sortedQuestions[currentQuestionIndex];
    if (!currentQuestion?.id) return;

    setIsPollActive(true);
    updateActiveMutation.mutate({ pollId, questionId: currentQuestion.id });
  }, [pollId, sortedQuestions, currentQuestionIndex, updateActiveMutation]);

  const handlePollEnd = useCallback(() => {
    setIsPollActive(false);
    updateActiveMutation.mutate({ pollId, questionId: null });
  }, [pollId, updateActiveMutation]);

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

  // 로딩 상태 확인
  const isLoading = !poll || !questions;

  // 현재 질문 가져오기
  const currentQuestion = sortedQuestions[currentQuestionIndex];

  return (
    <Layout>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {!poll ? "Loading..." : `Playing: ${poll.poll_name}`}
        </h1>
        <button
          onClick={() => router.back()}
          className="rounded-md bg-gray-200 px-4 py-2 hover:bg-gray-300"
        >
          Back
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
            {/* Question Navigation - Moved to left and added Poll Start/End buttons on right */}
            <div className="mb-4 flex items-center justify-between">
              {/* Left side - Question navigation */}
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

              {/* Right side - Poll Start/End buttons */}
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
                  Poll Start
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
                  Poll End
                </button>
              </div>
            </div>

            {/* Current Question - Flex grow to fill space */}
            <div className="mt-4 flex-grow overflow-y-auto">
              <h2 className="mb-4 text-xl font-semibold">
                {currentQuestion?.question}
              </h2>
              <div className="space-y-3">
                {currentQuestion?.choices.map((choice, index) => (
                  <div
                    key={index}
                    className="rounded-md border border-gray-300 p-3 hover:bg-gray-50"
                  >
                    {choice}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Members - Full height */}
          <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              Group Members ({sortedMembers.length})
            </h2>

            <div className="grid flex-grow grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {sortedMembers.length > 0 ? (
                sortedMembers.map((member, index) => (
                  <div
                    key={index}
                    className="flex h-16 items-center justify-center rounded-md border border-gray-300 bg-gray-50 p-2 text-center text-sm"
                  >
                    {member.member_name || "Unnamed"}
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-gray-500">
                  No members found in this group
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="text-sm text-yellow-700">
            No questions found for this poll.
          </div>
        </div>
      )}
    </Layout>
  );
}

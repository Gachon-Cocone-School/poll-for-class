import { useState, useEffect } from "react";
import {
  subscribeToPolls,
  subscribeToPoll,
  subscribeToPollQuestions,
  subscribeToQuestion,
  subscribeToActiveQuestion,
  subscribeToMemberAnswer,
  subscribeToAllAnswersForQuestion,
  subscribeToPollResults,
} from "../lib/pollService";
import { Poll, Question, Answer, QuestionResult } from "../lib/types";
import { useFirebaseQuery } from "./useFirebaseSubscription";

/**
 * Hook to get all polls with real-time updates
 */
export function usePolls() {
  return useFirebaseQuery<Poll[]>((setData, setError) => {
    return subscribeToPolls(
      (polls) => setData(polls),
      (error) => setError(error),
    );
  }, []);
}

/**
 * Hook to get a single poll with real-time updates
 *
 * @param pollId The ID of the poll to get
 */
export function usePoll(pollId: string | undefined) {
  return useFirebaseQuery<Poll | null>(
    (setData, setError) => {
      if (!pollId) {
        setData(null);
        return () => {};
      }

      return subscribeToPoll(
        pollId,
        (poll) => setData(poll),
        (error) => setError(error),
      );
    },
    null,
    [pollId],
  );
}

/**
 * Hook to get questions for a poll with real-time updates
 *
 * @param pollId The ID of the poll to get questions for
 */
export function usePollQuestions(pollId: string | undefined) {
  return useFirebaseQuery<Question[]>(
    (setData, setError) => {
      if (!pollId) {
        setData([]);
        return () => {};
      }

      return subscribeToPollQuestions(
        pollId,
        (questions) => setData(questions),
        (error) => setError(error),
      );
    },
    [],
    [pollId],
  );
}

/**
 * Hook to get a single question with real-time updates
 *
 * @param pollId The ID of the poll that contains the question
 * @param questionId The ID of the question to get
 */
export function useQuestion(
  pollId: string | undefined,
  questionId: string | undefined,
) {
  return useFirebaseQuery<Question | null>(
    (setData, setError) => {
      if (!pollId || !questionId) {
        setData(null);
        return () => {};
      }

      return subscribeToQuestion(
        pollId,
        questionId,
        (question) => setData(question),
        (error) => setError(error),
      );
    },
    null,
    [pollId, questionId],
  );
}

/**
 * Hook to get the active question ID for a poll with real-time updates
 *
 * @param pollId The ID of the poll to get the active question for
 */
export function useActiveQuestion(pollId: string | undefined) {
  return useFirebaseQuery<string | null>(
    (setData, setError) => {
      if (!pollId) {
        setData(null);
        return () => {};
      }

      return subscribeToActiveQuestion(
        pollId,
        (questionId) => setData(questionId),
        (error) => setError(error),
      );
    },
    null,
    [pollId],
  );
}

/**
 * Hook to get a member's answer to a question with real-time updates
 *
 * @param pollId The ID of the poll that contains the question
 * @param questionId The ID of the question
 * @param memberId The ID of the member
 */
export function useMemberAnswer(
  pollId: string | undefined,
  questionId: string | undefined,
  memberId: string | undefined,
) {
  return useFirebaseQuery<Answer | null>(
    (setData, setError) => {
      if (!pollId || !questionId || !memberId) {
        setData(null);
        return () => {};
      }

      return subscribeToMemberAnswer(
        pollId,
        questionId,
        memberId,
        (answer) => setData(answer),
        (error) => setError(error),
      );
    },
    null,
    [pollId, questionId, memberId],
  );
}

/**
 * Hook to get all answers for a question with real-time updates
 *
 * @param pollId The ID of the poll that contains the question
 * @param questionId The ID of the question
 */
export function useQuestionAnswers(
  pollId: string | undefined,
  questionId: string | undefined,
) {
  return useFirebaseQuery<Answer[]>(
    (setData, setError) => {
      if (!pollId || !questionId) {
        setData([]);
        return () => {};
      }

      return subscribeToAllAnswersForQuestion(
        pollId,
        questionId,
        (answers) => setData(answers),
        (error) => setError(error),
      );
    },
    [],
    [pollId, questionId],
  );
}

/**
 * Hook to get poll results for a question with real-time updates
 *
 * @param pollId The ID of the poll that contains the question
 * @param questionId The ID of the question
 */
export function usePollResults(
  pollId: string | undefined,
  questionId: string | undefined,
) {
  return useFirebaseQuery<QuestionResult | null>(
    (setData, setError) => {
      if (!pollId || !questionId) {
        setData(null);
        return () => {};
      }

      return subscribeToPollResults(
        pollId,
        questionId,
        (results) => setData(results),
        (error) => setError(error),
      );
    },
    null,
    [pollId, questionId],
  );
}

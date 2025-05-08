"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Layout from "~/components/Layout";
import { api } from "~/trpc/react";
import { usePoll, usePollQuestions } from "~/hooks/usePolls";
import { useGroups } from "~/hooks/useGroups";
import strings, { formatString } from "~/lib/strings";
import PollForm from "~/components/polls/PollForm";
import type { Question } from "~/lib/types";

export default function EditPollPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [formInitialized, setFormInitialized] = useState(false);
  const [formData, setFormData] = useState({
    poll_name: "",
    poll_description: "",
    poll_group_id: "",
  });

  // 디버그 로그 추가
  console.log("Edit Poll Page - Poll ID:", id);

  // Use real-time hooks for data fetching with error handling
  const { data: poll, loading: isPollLoading, error: pollError } = usePoll(id);

  const { data: pollQuestions, loading: isQuestionsLoading } =
    usePollQuestions(id);

  const { data: groups, loading: isGroupsLoading } = useGroups();

  // API mutations
  const updatePoll = api.poll.update.useMutation();
  const addQuestion = api.poll.addQuestion.useMutation();
  const updateQuestion = api.poll.updateQuestion.useMutation();

  // Determine overall loading state
  const isLoading = isPollLoading || isQuestionsLoading || isGroupsLoading;

  // Set form data when poll data is loaded
  useEffect(() => {
    if (poll && !formInitialized) {
      console.log("Setting form data from poll:", poll);
      try {
        setFormData({
          poll_name: poll.poll_name || "",
          poll_description: poll.poll_description || "",
          poll_group_id: poll.poll_group?.id || "",
        });
        setFormInitialized(true);
      } catch (error) {
        console.error("Error setting form data:", error);
      }
    }
  }, [poll, formInitialized]);

  // Handle error
  useEffect(() => {
    if (pollError) {
      console.error("Error loading poll:", pollError);
      alert(formatString(strings.errors.loadingError, pollError.message));
      router.push("/");
    }
  }, [pollError, router]);

  // Handle form submission
  const handleSubmit = async (formData: any, questions: Question[]) => {
    // Update poll first
    await updatePoll.mutateAsync({
      id,
      ...formData,
    });

    // Process all questions sequentially
    const validQuestions = questions.filter((question) => {
      const filteredChoices = question.choices.filter(
        (choice) => choice.trim() !== "",
      );
      return question.question.trim() !== "" && filteredChoices.length >= 2;
    });

    console.log(`Saving ${validQuestions.length} valid questions with indexes`);

    // Process questions one by one in sequence
    for (let i = 0; i < validQuestions.length; i++) {
      const question = validQuestions[i];
      if (!question) continue;

      const filteredChoices = question.choices.filter(
        (choice) => choice.trim() !== "",
      );

      // Set index based on array position (add 1 to start from 1)
      const index = i + 1;

      try {
        if (question.id) {
          // Update existing question
          console.log(`Updating question ${question.id} with index ${index}`);
          await updateQuestion.mutateAsync({
            pollId: id,
            questionId: question.id,
            question: {
              id: question.id,
              question: question.question,
              choices: filteredChoices,
              index, // Set the updated index
            },
          });
        } else {
          // Add new question
          console.log(`Adding new question with index ${index}`);
          await addQuestion.mutateAsync({
            pollId: id,
            question: {
              question: question.question,
              choices: filteredChoices,
              index, // Set the index for new questions
            },
          });
        }
      } catch (error) {
        console.error(`Error processing question at index ${i}:`, error);
        throw error; // Rethrow to be caught by the outer catch
      }
    }

    router.push("/");
  };

  // Show loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    );
  }

  // If no poll data loaded but not loading, redirect
  if (!poll && !isLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-md rounded-md bg-yellow-50 p-4">
          <p className="text-yellow-700">{strings.poll.notFound}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
          >
            {strings.common.back}
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PollForm
        isEdit={true}
        pollId={id}
        initialData={formData}
        initialQuestions={pollQuestions || []}
        groups={groups || []}
        isLoadingGroups={isGroupsLoading}
        onSubmit={handleSubmit}
        submitButtonText={strings.poll.update}
        submittingButtonText={strings.poll.updating}
        pageTitle={strings.poll.edit}
      />
    </Layout>
  );
}

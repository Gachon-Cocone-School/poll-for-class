"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "~/components/Layout";
import { api } from "~/trpc/react";
import { useGroups } from "~/hooks/useGroups";
import strings, { formatString } from "~/lib/strings";
import PollForm from "~/components/polls/PollForm";
import type { Question } from "~/lib/types";

export default function CreatePollPage() {
  const router = useRouter();
  // 실시간 Firebase 구독으로 교체
  const { data: groups, loading: isLoadingGroups } = useGroups();

  // API mutations
  const createPoll = api.poll.create.useMutation();
  const addQuestion = api.poll.addQuestion.useMutation();

  // Handle form submission
  const handleSubmit = async (formData: any, questions: Question[]) => {
    // Create poll first
    const { id } = await createPoll.mutateAsync(formData);

    // Process all questions sequentially
    const validQuestions = questions.filter((question) => {
      const filteredChoices = question.choices.filter(
        (choice) => choice.trim() !== "",
      );
      return question.question.trim() !== "" && filteredChoices.length >= 2;
    });

    // Process questions one by one with appropriate index
    for (let i = 0; i < validQuestions.length; i++) {
      const question = validQuestions[i];
      if (!question) continue;

      const filteredChoices = question.choices.filter(
        (choice) => choice.trim() !== "",
      );

      // Add index based on array position (add 1 to start from 1)
      const index = i + 1;

      await addQuestion.mutateAsync({
        pollId: id,
        question: {
          question: question.question,
          choices: filteredChoices,
          index, // 순서 정보 추가
        },
      });
    }

    router.push("/");
  };

  return (
    <Layout>
      <PollForm
        isEdit={false}
        initialData={{ poll_name: "", poll_description: "", poll_group_id: "" }}
        initialQuestions={[{ question: "", choices: ["", ""], index: 1 }]}
        groups={groups || []}
        isLoadingGroups={isLoadingGroups}
        onSubmit={handleSubmit}
        submitButtonText={strings.poll.create}
        submittingButtonText={strings.poll.creating}
        pageTitle={strings.poll.create}
      />
    </Layout>
  );
}

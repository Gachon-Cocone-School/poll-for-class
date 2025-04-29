"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Layout from "~/components/Layout";
import { api } from "~/trpc/react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { usePoll, usePollQuestions } from "~/hooks/usePolls";
import { useGroups } from "~/hooks/useGroups";

export default function EditPollPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [formData, setFormData] = useState({
    poll_name: "",
    poll_description: "",
    poll_group_id: "",
  });
  const [questions, setQuestions] = useState<
    Array<{ id?: string; question: string; choices: string[] }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  // 디버그 로그 추가
  console.log("Edit Poll Page - Poll ID:", id);

  // Use real-time hooks for data fetching with error handling
  const { data: poll, loading: isPollLoading, error: pollError } = usePoll(id);

  const { data: pollQuestions, loading: isQuestionsLoading } =
    usePollQuestions(id);

  const { data: groups, loading: isGroupsLoading } = useGroups();

  // 디버그 로그 추가
  useEffect(() => {
    console.log("Poll data:", poll);
    console.log("Questions data:", pollQuestions);
    console.log("Groups data:", groups);
    console.log("Loading states:", {
      isPollLoading,
      isQuestionsLoading,
      isGroupsLoading,
    });
  }, [
    poll,
    pollQuestions,
    groups,
    isPollLoading,
    isQuestionsLoading,
    isGroupsLoading,
  ]);

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

  // Set questions when question data is loaded
  useEffect(() => {
    if (pollQuestions) {
      console.log("Setting questions from pollQuestions:", pollQuestions);
      if (pollQuestions.length > 0) {
        setQuestions(pollQuestions);
      } else {
        setQuestions([{ question: "", choices: ["", ""] }]);
      }
    }
  }, [pollQuestions]);

  // Handle error
  useEffect(() => {
    if (pollError) {
      console.error("Error loading poll:", pollError);
      alert(`Failed to load poll: ${pollError.message}`);
      router.push("/");
    }
  }, [pollError, router]);

  const updatePoll = api.poll.update.useMutation();
  const addQuestion = api.poll.addQuestion.useMutation();
  const updateQuestion = api.poll.updateQuestion.useMutation();
  const deleteQuestion = api.poll.deleteQuestion.useMutation();

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuestionChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [name]: value };
    setQuestions(updatedQuestions);
  };

  const handleChoiceChange = (
    questionIndex: number,
    choiceIndex: number,
    value: string,
  ) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].choices[choiceIndex] = value;
    setQuestions(updatedQuestions);
  };

  const addQuestionField = () => {
    setQuestions([...questions, { question: "", choices: ["", ""] }]);
  };

  const removeQuestionField = (index: number) => {
    const question = questions[index];

    // If the question has an ID, it exists in the database and needs to be removed
    if (question.id) {
      deleteQuestion.mutate(
        {
          pollId: id,
          questionId: question.id,
        },
        {
          onSuccess: () => {
            const filteredQuestions = questions.filter((_, i) => i !== index);
            setQuestions(
              filteredQuestions.length
                ? filteredQuestions
                : [{ question: "", choices: ["", ""] }],
            );
          },
        },
      );
    } else {
      // If the question doesn't have an ID, it's just a local entry that needs removal
      const filteredQuestions = questions.filter((_, i) => i !== index);
      setQuestions(
        filteredQuestions.length
          ? filteredQuestions
          : [{ question: "", choices: ["", ""] }],
      );
    }
  };

  const addChoiceField = (questionIndex: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].choices.push("");
    setQuestions(updatedQuestions);
  };

  const removeChoiceField = (questionIndex: number, choiceIndex: number) => {
    const updatedQuestions = [...questions];
    if (updatedQuestions[questionIndex].choices.length > 2) {
      updatedQuestions[questionIndex].choices = updatedQuestions[
        questionIndex
      ].choices.filter((_, i) => i !== choiceIndex);
      setQuestions(updatedQuestions);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Update poll first
      await updatePoll.mutateAsync({
        id,
        ...formData,
      });

      // Handle questions
      for (const question of questions) {
        const filteredChoices = question.choices.filter(
          (choice) => choice.trim() !== "",
        );

        // Skip invalid questions
        if (question.question.trim() === "" || filteredChoices.length < 2) {
          continue;
        }

        // Update existing question
        if (question.id) {
          await updateQuestion.mutateAsync({
            pollId: id,
            questionId: question.id,
            question: {
              id: question.id,
              question: question.question,
              choices: filteredChoices,
            },
          });
        }
        // Add new question
        else {
          await addQuestion.mutateAsync({
            pollId: id,
            question: {
              question: question.question,
              choices: filteredChoices,
            },
          });
        }
      }

      router.push("/");
    } catch (error) {
      console.error("Error updating poll:", error);
      alert("Failed to update poll. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
          <p className="text-yellow-700">
            Poll not found or still loading. If this persists, please try again.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
          >
            Go back to Home
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Poll</h1>
        <button
          onClick={() => router.back()}
          className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
        >
          Back
        </button>
      </div>

      <div className="rounded-md bg-white p-6 shadow-md">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="poll_name"
              className="mb-2 block font-medium text-gray-700"
            >
              Poll Name
            </label>
            <input
              type="text"
              id="poll_name"
              name="poll_name"
              value={formData.poll_name}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="poll_description"
              className="mb-2 block font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="poll_description"
              name="poll_description"
              value={formData.poll_description}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
              rows={3}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="poll_group_id"
              className="mb-2 block font-medium text-gray-700"
            >
              Group
            </label>
            <select
              id="poll_group_id"
              name="poll_group_id"
              value={formData.poll_group_id}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
              required
            >
              <option value="">Select a group</option>
              {groups?.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.group_name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-gray-700">Questions</h3>
              <button
                type="button"
                onClick={addQuestionField}
                className="flex items-center rounded bg-green-100 px-3 py-1 text-sm text-green-700 hover:bg-green-200"
              >
                <PlusIcon className="mr-1 h-4 w-4" />
                Add Question
              </button>
            </div>

            {questions.map((q, qIndex) => (
              <div
                key={qIndex}
                className="mb-4 rounded-md border border-gray-200 p-4"
              >
                <div className="flex justify-between">
                  <h4 className="mb-2 text-sm font-medium text-gray-500">
                    Question #{qIndex + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeQuestionField(qIndex)}
                    className="flex items-center rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                  >
                    <TrashIcon className="mr-1 h-3 w-3" />
                    Remove
                  </button>
                </div>

                <div className="mb-3">
                  <label
                    htmlFor={`question_${qIndex}`}
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Question Text
                  </label>
                  <input
                    type="text"
                    id={`question_${qIndex}`}
                    name="question"
                    value={q.question}
                    onChange={(e) => handleQuestionChange(qIndex, e)}
                    className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="mb-2">
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Choices
                    </label>
                    <button
                      type="button"
                      onClick={() => addChoiceField(qIndex)}
                      className="flex items-center rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200"
                    >
                      <PlusIcon className="mr-1 h-3 w-3" />
                      Add Choice
                    </button>
                  </div>

                  {q.choices.map((choice, cIndex) => (
                    <div key={cIndex} className="mb-2 flex items-center">
                      <input
                        type="text"
                        value={choice}
                        onChange={(e) =>
                          handleChoiceChange(qIndex, cIndex, e.target.value)
                        }
                        className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                        placeholder={`Choice ${cIndex + 1}`}
                        required
                      />
                      {q.choices.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeChoiceField(qIndex, cIndex)}
                          className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Updating..." : "Update Poll"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

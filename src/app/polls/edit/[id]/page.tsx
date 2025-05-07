"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Layout from "~/components/Layout";
import { api } from "~/trpc/react";
import {
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import { usePoll, usePollQuestions } from "~/hooks/usePolls";
import { useGroups } from "~/hooks/useGroups";
import strings, { formatString } from "~/lib/strings";

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
    Array<{ id?: string; question: string; choices: string[]; index?: number }>
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

  // Define mutations for moving questions up and down
  const updateQuestion = api.poll.updateQuestion.useMutation();

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
      alert(formatString(strings.errors.loadingError, pollError.message));
      router.push("/");
    }
  }, [pollError, router]);

  const updatePoll = api.poll.update.useMutation();
  const addQuestion = api.poll.addQuestion.useMutation();
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

    // 안전한 방식으로 업데이트된 질문 배열 복사
    const updatedQuestions = questions.map((question, i) => {
      // 현재 인덱스와 일치하는 경우에만 업데이트
      if (i === index) {
        if (name === "question") {
          // question 필드 업데이트
          return {
            ...question,
            question: value,
          };
        } else {
          // 다른 필드 업데이트 (id 등이 있다면 유지)
          return {
            ...question,
            [name]: value,
          };
        }
      }
      // 다른 질문은 그대로 반환
      return question;
    });

    setQuestions(updatedQuestions);
  };

  const handleChoiceChange = (
    questionIndex: number,
    choiceIndex: number,
    value: string,
  ) => {
    // map을 사용하여 안전하게 질문 배열 업데이트
    const updatedQuestions = questions.map((question, qIndex) => {
      if (qIndex === questionIndex) {
        // 현재 질문의 선택지 배열을 안전하게 업데이트
        const updatedChoices = question.choices.map((choice, cIndex) => {
          if (cIndex === choiceIndex) {
            return value;
          }
          return choice;
        });

        return {
          ...question,
          choices: updatedChoices,
        };
      }
      return question;
    });

    setQuestions(updatedQuestions);
  };

  const addQuestionField = () => {
    setQuestions([...questions, { question: "", choices: ["", ""] }]);
  };

  const removeQuestionField = (index: number) => {
    // 인덱스 범위 체크
    if (index < 0 || index >= questions.length) {
      return;
    }

    // TypeScript에게 이 시점에서 question이 정의되었음을 확신시킴
    const question = { ...questions[index] };

    // 이제 question 객체가 확실히 존재하므로 안전하게 id 속성 확인 가능
    if ("id" in question && question.id) {
      // ID가 있는 질문은 데이터베이스에서 삭제
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
      // ID가 없는 질문은 로컬에서만 삭제
      const filteredQuestions = questions.filter((_, i) => i !== index);
      setQuestions(
        filteredQuestions.length
          ? filteredQuestions
          : [{ question: "", choices: ["", ""] }],
      );
    }
  };

  const addChoiceField = (questionIndex: number) => {
    // 안전한 방식으로 배열 업데이트
    const updatedQuestions = questions.map((question, qIndex) => {
      if (qIndex === questionIndex) {
        // 현재 질문의 선택지 배열에 새 항목 추가
        return {
          ...question,
          choices: [...question.choices, ""],
        };
      }
      return question;
    });

    setQuestions(updatedQuestions);
  };

  const removeChoiceField = (questionIndex: number, choiceIndex: number) => {
    // 안전한 방식으로 배열 업데이트
    const updatedQuestions = questions.map((question, qIndex) => {
      if (qIndex === questionIndex) {
        // 현재 질문의 선택지가 2개 초과인 경우에만 삭제
        if (question.choices.length > 2) {
          return {
            ...question,
            choices: question.choices.filter(
              (_, cIndex) => cIndex !== choiceIndex,
            ),
          };
        }
      }
      return question;
    });

    setQuestions(updatedQuestions);
  };

  // Move a question up (swap with the previous question)
  const moveQuestionUp = (index: number) => {
    if (index <= 0) return;

    const updatedQuestions = [...questions];
    // Add null checks and type assertions to ensure TypeScript understands these values exist
    const prevQuestion = updatedQuestions[index - 1];
    const currentQuestion = updatedQuestions[index];

    if (prevQuestion && currentQuestion) {
      updatedQuestions[index - 1] = currentQuestion;
      updatedQuestions[index] = prevQuestion;
      setQuestions(updatedQuestions);
    }
  };

  // Move a question down (swap with the next question)
  const moveQuestionDown = (index: number) => {
    if (index >= questions.length - 1) return;

    const updatedQuestions = [...questions];
    // Add null checks and type assertions to ensure TypeScript understands these values exist
    const nextQuestion = updatedQuestions[index + 1];
    const currentQuestion = updatedQuestions[index];

    if (nextQuestion && currentQuestion) {
      updatedQuestions[index + 1] = currentQuestion;
      updatedQuestions[index] = nextQuestion;
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

      // Process all questions sequentially in a more reliable way
      const validQuestions = questions.filter((question) => {
        const filteredChoices = question.choices.filter(
          (choice) => choice.trim() !== "",
        );
        return question.question.trim() !== "" && filteredChoices.length >= 2;
      });

      console.log(
        `Saving ${validQuestions.length} valid questions with indexes`,
      );

      // Process questions one by one in sequence
      for (let i = 0; i < validQuestions.length; i++) {
        const question = validQuestions[i];
        // Add null check to ensure question is defined
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
    } catch (error) {
      console.error("Error updating poll:", error);
      alert(formatString(strings.errors.submissionError, error));
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
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{strings.poll.edit}</h1>
        <button
          onClick={() => router.back()}
          className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
        >
          {strings.common.back}
        </button>
      </div>

      <div className="rounded-md bg-white p-6 shadow-md">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="poll_name"
              className="mb-2 block font-medium text-gray-700"
            >
              {strings.poll.pollName}
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
              {strings.poll.pollDescription}
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
              {strings.group.title}
            </label>
            <select
              id="poll_group_id"
              name="poll_group_id"
              value={formData.poll_group_id}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
              required
            >
              <option value="">{strings.group.select}</option>
              {groups?.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.group_name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-gray-700">
                {strings.question.questions}
              </h3>
              <button
                type="button"
                onClick={addQuestionField}
                className="flex items-center rounded bg-green-100 px-3 py-1 text-green-700 hover:bg-green-200"
                title={strings.question.addQuestion}
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>

            {questions.map((q, qIndex) => (
              <div
                key={qIndex}
                className="mb-4 rounded-md border border-gray-200 p-4"
              >
                <div className="flex justify-between">
                  <h4 className="mb-2 text-sm font-medium text-gray-500">
                    {strings.question.question} #{qIndex + 1}
                  </h4>
                  <div className="flex space-x-2">
                    {qIndex > 0 && (
                      <button
                        type="button"
                        onClick={() => moveQuestionUp(qIndex)}
                        className="flex items-center rounded bg-blue-100 px-2 py-1 text-blue-700 hover:bg-blue-200"
                        title={strings.question.moveUp}
                      >
                        <ArrowUpIcon className="h-4 w-4" />
                      </button>
                    )}
                    {qIndex < questions.length - 1 && (
                      <button
                        type="button"
                        onClick={() => moveQuestionDown(qIndex)}
                        className="flex items-center rounded bg-blue-100 px-2 py-1 text-blue-700 hover:bg-blue-200"
                        title={strings.question.moveDown}
                      >
                        <ArrowDownIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeQuestionField(qIndex)}
                      className="flex items-center rounded bg-red-100 px-2 py-1 text-red-700 hover:bg-red-200"
                      title={strings.question.removeQuestion}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <label
                    htmlFor={`question_${qIndex}`}
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    {strings.question.questionText}
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
                      {strings.question.choices}
                    </label>
                    <button
                      type="button"
                      onClick={() => addChoiceField(qIndex)}
                      className="flex items-center rounded bg-blue-100 px-2 py-1 text-blue-700 hover:bg-blue-200"
                      title={strings.question.addChoice}
                    >
                      <PlusIcon className="h-4 w-4" />
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
                        placeholder={`${strings.question.choice} ${cIndex + 1}`}
                        required
                      />
                      {q.choices.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeChoiceField(qIndex, cIndex)}
                          className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200"
                          title={strings.question.removeChoice}
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
              {isSubmitting ? strings.poll.updating : strings.poll.update}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

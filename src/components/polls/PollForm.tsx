"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import { api } from "~/trpc/react";
import strings, { formatString } from "~/lib/strings";
import type { Group, Question } from "~/lib/types";

interface PollFormData {
  poll_name: string;
  poll_description: string;
  poll_group_id: string;
}

interface PollFormProps {
  isEdit: boolean;
  pollId?: string;
  initialData?: PollFormData;
  initialQuestions?: Question[];
  groups?: Group[];
  isLoadingGroups?: boolean;
  onSubmit: (formData: PollFormData, questions: Question[]) => Promise<void>;
  submitButtonText: string;
  submittingButtonText: string;
  pageTitle: string;
}

export default function PollForm({
  isEdit,
  pollId,
  initialData,
  initialQuestions,
  groups = [],
  isLoadingGroups = false,
  onSubmit,
  submitButtonText,
  submittingButtonText,
  pageTitle,
}: PollFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<PollFormData>(
    initialData || {
      poll_name: "",
      poll_description: "",
      poll_group_id: "",
    },
  );
  const [questions, setQuestions] = useState<
    Array<{ id?: string; question: string; choices: string[]; index?: number }>
  >(initialQuestions || [{ question: "", choices: ["", ""] }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API mutations
  const deleteQuestion = api.poll.deleteQuestion.useMutation();

  useEffect(() => {
    // Update form data when initialData changes (for edit mode)
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    // Update questions when initialQuestions changes (for edit mode)
    if (initialQuestions && initialQuestions.length > 0) {
      setQuestions(initialQuestions);
    }
  }, [initialQuestions]);

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

    const updatedQuestions = questions.map((question, i) => {
      if (i === index) {
        if (name === "question") {
          return {
            ...question,
            question: value,
          };
        } else {
          return {
            ...question,
            [name]: value,
          };
        }
      }
      return question;
    });

    setQuestions(updatedQuestions);
  };

  const handleChoiceChange = (
    questionIndex: number,
    choiceIndex: number,
    value: string,
  ) => {
    const updatedQuestions = questions.map((question, qIndex) => {
      if (qIndex === questionIndex) {
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
    if (index < 0 || index >= questions.length) {
      return;
    }

    const question = { ...questions[index] };

    // For edit mode, if the question has an ID, remove it from the database
    if (isEdit && pollId && "id" in question && question.id) {
      deleteQuestion.mutate(
        {
          pollId,
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
      // For new questions or create mode, just remove it from state
      const filteredQuestions = questions.filter((_, i) => i !== index);
      setQuestions(
        filteredQuestions.length
          ? filteredQuestions
          : [{ question: "", choices: ["", ""] }],
      );
    }
  };

  const addChoiceField = (questionIndex: number) => {
    const updatedQuestions = questions.map((question, qIndex) => {
      if (qIndex === questionIndex) {
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
    const updatedQuestions = questions.map((question, qIndex) => {
      if (qIndex === questionIndex) {
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
      // Ensure all questions have an index before submitting
      const questionsWithIndex: Question[] = questions.map((q, idx) => ({
        ...q,
        index: q.index ?? idx + 1, // Use existing index or fallback to position + 1
      }));

      await onSubmit(formData, questionsWithIndex);
    } catch (error) {
      console.error(`Error ${isEdit ? "updating" : "creating"} poll:`, error);
      alert(formatString(strings.errors.submissionError, error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{pageTitle}</h1>
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
              {isSubmitting ? submittingButtonText : submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

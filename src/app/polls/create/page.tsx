"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Layout from "~/components/Layout";
import { api } from "~/trpc/react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

export default function CreatePollPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    poll_name: "",
    poll_description: "",
    poll_group_id: "",
  });
  const [questions, setQuestions] = useState([
    { question: "", choices: ["", ""] },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: groups, isLoading: isLoadingGroups } =
    api.group.getAll.useQuery();
  const createPoll = api.poll.create.useMutation();
  const addQuestion = api.poll.addQuestion.useMutation();

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
    const filteredQuestions = questions.filter((_, i) => i !== index);
    setQuestions(
      filteredQuestions.length
        ? filteredQuestions
        : [{ question: "", choices: ["", ""] }],
    );
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
      // Create poll first
      const { id } = await createPoll.mutateAsync(formData);

      // Then add questions to the poll
      const validQuestions = questions.filter(
        (q) =>
          q.question.trim() !== "" &&
          q.choices.filter((c) => c.trim() !== "").length >= 2,
      );

      for (const question of validQuestions) {
        const filteredChoices = question.choices.filter(
          (choice) => choice.trim() !== "",
        );
        await addQuestion.mutateAsync({
          pollId: id,
          question: {
            question: question.question,
            choices: filteredChoices,
          },
        });
      }

      // Redirect to main page and signal to refresh
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error creating poll:", error);
      alert("Failed to create poll. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create Poll</h1>
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
              {isSubmitting ? "Creating..." : "Create Poll"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

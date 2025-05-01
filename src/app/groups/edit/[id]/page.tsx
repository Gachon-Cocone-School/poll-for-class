"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Layout from "~/components/Layout";
import { api } from "~/trpc/react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useGroup } from "~/hooks/useGroups";
import { useGroupMembers } from "~/hooks/useGroups";
import strings, { formatString } from "~/lib/strings";

export default function EditGroupPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [formData, setFormData] = useState({
    group_name: "",
    group_description: "",
  });
  const [members, setMembers] = useState<
    Array<{ id?: string; member_name: string; member_no: string }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);
  const [batchText, setBatchText] = useState("");
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  // Firebase 실시간 구독 사용
  const {
    data: group,
    loading: isLoadingGroup,
    error: groupError,
  } = useGroup(id);
  const { data: groupMembers, loading: isLoadingMembers } = useGroupMembers(id);

  // 디버그 로그 추가
  console.log("Group Edit Page - Group ID:", id);
  console.log("Group data:", group);
  console.log("Members data:", groupMembers);

  // Set form data when group data is loaded
  useEffect(() => {
    if (group && !formInitialized) {
      console.log("Setting form data from group:", group);
      try {
        setFormData({
          group_name: group.group_name || "",
          group_description: group.group_description || "",
        });
        setFormInitialized(true);
      } catch (error) {
        console.error("Error setting form data:", error);
      }
    }
  }, [group, formInitialized]);

  // Set members when member data is loaded
  useEffect(() => {
    if (groupMembers) {
      console.log("Setting members from groupMembers:", groupMembers);
      if (groupMembers.length > 0) {
        setMembers(groupMembers);
      } else {
        setMembers([{ member_name: "", member_no: "" }]);
      }
    }
  }, [groupMembers]);

  // Handle error
  useEffect(() => {
    if (groupError) {
      console.error("Error loading group:", groupError);
      alert(formatString(strings.errors.loadingError, groupError.message));
      router.push("/groups");
    }
  }, [groupError, router]);

  // tRPC는 여전히 필요한 뮤테이션에만 사용
  const updateGroup = api.group.update.useMutation();
  const addMember = api.group.addMember.useMutation();
  const removeMember = api.group.removeMember.useMutation();
  const processBatchMembers = api.group.processBatchMembers.useMutation();

  const handleProcessBatch = async () => {
    if (!batchText.trim()) return;

    try {
      setIsProcessingBatch(true);
      const result = await processBatchMembers.mutateAsync({ batchText });

      if (result.members && result.members.length > 0) {
        // Keep any existing members with data
        const existingMembers = members.filter(
          (m) => m.member_name.trim() !== "" || m.member_no.trim() !== "",
        );

        // Combine with new members from batch processing
        setMembers([...existingMembers, ...result.members]);

        // Clear the batch text input
        setBatchText("");
      }
    } catch (error) {
      console.error("Error processing batch:", error);
      alert(strings.errors.submissionError);
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemberChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target;
    const updatedMembers = [...members];
    updatedMembers[index] = {
      id: updatedMembers[index]?.id,
      member_name: updatedMembers[index]?.member_name || "",
      member_no: updatedMembers[index]?.member_no || "",
      [name]: value,
    };
    setMembers(updatedMembers);
  };

  const addMemberField = () => {
    setMembers([...members, { member_name: "", member_no: "" }]);
  };

  const removeMemberField = (index: number) => {
    const member = members[index];
    if (!member) return; // Guard against undefined member

    if (member.id) {
      removeMember.mutate(
        {
          groupId: id,
          memberId: member.id,
        },
        {
          onSuccess: () => {
            const filteredMembers = members.filter((_, i) => i !== index);
            setMembers(
              filteredMembers.length
                ? filteredMembers
                : [{ member_name: "", member_no: "" }],
            );
          },
        },
      );
    } else {
      const filteredMembers = members.filter((_, i) => i !== index);
      setMembers(
        filteredMembers.length
          ? filteredMembers
          : [{ member_name: "", member_no: "" }],
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateGroup.mutateAsync({
        id,
        ...formData,
      });

      const validMembers = members.filter(
        (m) => m.member_name.trim() !== "" && m.member_no.trim() !== "",
      );

      for (const member of validMembers) {
        if (!member.id) {
          await addMember.mutateAsync({
            groupId: id,
            member: {
              member_name: member.member_name,
              member_no: member.member_no,
            },
          });
        }
      }

      router.push("/groups");
    } catch (error) {
      console.error("Error updating group:", error);
      alert(formatString(strings.errors.submissionError, error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  const isLoading = isLoadingGroup || isLoadingMembers;

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

  // If no group data loaded but not loading, redirect
  if (!group && !isLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-md rounded-md bg-yellow-50 p-4">
          <p className="text-yellow-700">{strings.errors.notFound}</p>
          <button
            onClick={() => router.push("/groups")}
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
        <h1 className="text-3xl font-bold">{strings.group.edit}</h1>
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
              htmlFor="group_name"
              className="mb-2 block font-medium text-gray-700"
            >
              {strings.group.groupName}
            </label>
            <input
              type="text"
              id="group_name"
              name="group_name"
              value={formData.group_name}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="group_description"
              className="mb-2 block font-medium text-gray-700"
            >
              {strings.group.groupDescription}
            </label>
            <textarea
              id="group_description"
              name="group_description"
              value={formData.group_description}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
              rows={3}
            />
          </div>

          {/* Batch Member Input Section */}
          <div className="mb-6">
            <div className="mb-2">
              <label
                htmlFor="batch_members"
                className="mb-2 block font-medium text-gray-700"
              >
                {strings.group.batchUpdate}
              </label>
              <p className="mb-2 text-sm text-gray-500">
                {strings.group.batchUpdateDescription}
              </p>
            </div>
            <textarea
              id="batch_members"
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              className="w-full rounded-md border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
              rows={6}
              placeholder="Example: John Doe 12345, Jane Smith ID: A67890..."
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={isProcessingBatch || !batchText.trim()}
                onClick={handleProcessBatch}
                className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isProcessingBatch
                  ? strings.group.processing
                  : strings.common.process}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-medium text-gray-700">
                {strings.group.members}
              </h3>
              <button
                type="button"
                onClick={addMemberField}
                className="flex items-center rounded bg-green-100 px-3 py-1 text-sm text-green-700 hover:bg-green-200"
              >
                <PlusIcon className="mr-1 h-4 w-4" />
                {strings.group.addMember}
              </button>
            </div>

            {members.map((member, index) => (
              <div
                key={index}
                className="mb-4 rounded-md border border-gray-200 p-4"
              >
                <div className="flex justify-between">
                  <h4 className="mb-2 text-sm font-medium text-gray-500">
                    {strings.group.member} #{index + 1}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeMemberField(index)}
                    className="flex items-center rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
                  >
                    <TrashIcon className="mr-1 h-3 w-3" />
                    {strings.common.remove}
                  </button>
                </div>

                <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor={`member_name_${index}`}
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {strings.group.memberName}
                    </label>
                    <input
                      type="text"
                      id={`member_name_${index}`}
                      name="member_name"
                      value={member.member_name}
                      onChange={(e) => handleMemberChange(index, e)}
                      className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`member_no_${index}`}
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      {strings.group.memberNo}
                    </label>
                    <input
                      type="text"
                      id={`member_no_${index}`}
                      name="member_no"
                      value={member.member_no}
                      onChange={(e) => handleMemberChange(index, e)}
                      className="w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
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
              {isSubmitting ? strings.group.updating : strings.group.edit}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Layout from "~/components/Layout";
import { api } from "~/trpc/react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";

export default function PollsPage() {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    data: polls,
    isLoading,
    refetch,
  } = api.poll.getAll.useQuery(undefined, {
    // Refetch data when component mounts
    refetchOnMount: true,
    // Poll every 5 seconds to keep data fresh
    refetchInterval: 5000,
  });

  const deleteMutation = api.poll.delete.useMutation({
    onSuccess: () => {
      // Immediately refetch data after deletion
      refetch();
    },
  });

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this poll?")) {
      setDeleteId(id);
      await deleteMutation.mutateAsync({ id });
      setDeleteId(null);
    }
  };

  return (
    <Layout>
      <div className="mb-8 flex justify-between">
        <h1 className="text-3xl font-bold">Polls</h1>
        <div className="flex space-x-2">
          <Link
            href="/groups"
            className="flex items-center rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          >
            Groups
          </Link>
          <Link
            href="/polls/create"
            className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <PlusIcon className="mr-2 h-5 w-5" />
            Add Poll
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
        </div>
      ) : polls && polls.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                >
                  Description
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                >
                  Group
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {polls.map((poll) => (
                <tr key={poll.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {poll.poll_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {poll.poll_description}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {poll.poll_group.group_name || poll.poll_group.id}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => router.push(`/polls/play/${poll.id}`)}
                        className="rounded bg-green-100 p-1 text-green-600 hover:bg-green-200"
                        disabled={deleteId === poll.id}
                        title="Play Poll"
                      >
                        <PlayIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => router.push(`/polls/edit/${poll.id}`)}
                        className="rounded bg-yellow-100 p-1 text-yellow-600 hover:bg-yellow-200"
                        disabled={deleteId === poll.id}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(poll.id!)}
                        className={`rounded p-1 ${
                          deleteId === poll.id
                            ? "bg-gray-100 text-gray-400"
                            : "bg-red-100 text-red-600 hover:bg-red-200"
                        }`}
                        disabled={deleteId === poll.id}
                      >
                        {deleteId === poll.id ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-red-600"></div>
                        ) : (
                          <TrashIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="text-sm text-yellow-700">
              No polls found. Click the &quot;Add Poll&quot; button to create
              one.
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

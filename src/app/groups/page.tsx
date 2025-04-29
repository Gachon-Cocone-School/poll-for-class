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
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useGroups } from "~/hooks/useGroups";
import { useAdminAuth } from "~/hooks/useAdminAuth";

export default function GroupsPage() {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { logout, isAuthenticated } = useAdminAuth();

  // 실시간 Firebase 구독 사용
  const { data: groups, loading: isLoading } = useGroups();

  const deleteMutation = api.group.delete.useMutation();

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this group?")) {
      setDeleteId(id);
      await deleteMutation.mutateAsync({ id });
      setDeleteId(null);
    }
  };

  return (
    <Layout>
      <div className="mb-8 flex justify-between">
        <h1 className="text-3xl font-bold">Groups</h1>
        <div className="flex space-x-2">
          <Link
            href="/"
            className="flex items-center rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          >
            Polls
          </Link>
          <Link
            href="/groups/create"
            className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <PlusIcon className="mr-2 h-5 w-5" />
            Add Group
          </Link>
          {isAuthenticated && (
            <button
              onClick={logout}
              className="flex items-center rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              <ArrowLeftOnRectangleIcon className="mr-2 h-5 w-5" />
              Logout
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
        </div>
      ) : groups && groups.length > 0 ? (
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
                  className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {groups.map((group) => (
                <tr key={group.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {group.group_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {group.group_description}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => router.push(`/groups/edit/${group.id}`)}
                        className="rounded bg-yellow-100 p-1 text-yellow-600 hover:bg-yellow-200"
                        disabled={deleteId === group.id}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(group.id!)}
                        className={`rounded p-1 ${
                          deleteId === group.id
                            ? "bg-gray-100 text-gray-400"
                            : "bg-red-100 text-red-600 hover:bg-red-200"
                        }`}
                        disabled={deleteId === group.id}
                      >
                        {deleteId === group.id ? (
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
              No groups found. Click the &quot;Add Group&quot; button to create
              one.
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Layout from "~/components/Layout";
import { api } from "~/trpc/react";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  ArrowLeftOnRectangleIcon,
  ChartBarIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { usePolls } from "~/hooks/usePolls"; // 실시간 구독 훅 사용
import { useAdminAuth } from "~/hooks/useAdminAuth"; // Admin auth hook 추가
import type { ParticipantStats } from "~/lib/types";
import strings, { formatString } from "~/lib/strings";
import { subscribeToParticipantStats } from "~/lib/pollService"; // 올바른 경로에서 import
import StatsModal from "~/components/stats/StatsModal";
import CsvExportModal from "~/components/stats/CsvExportModal";

export default function PollsPage() {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { logout, isAuthenticated } = useAdminAuth();
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [pollStats, setPollStats] = useState<ParticipantStats[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingCsv, setIsLoadingCsv] = useState(false);
  const [loadingPlayId, setLoadingPlayId] = useState<string | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);

  // Add state to track stats subscription
  const statsUnsubscribeRef = useRef<(() => void) | null>(null);

  // TRPC 대신 실시간 Firebase 구독 사용
  const { data: polls, loading: isLoading } = usePolls();

  // TRPC utils 가져오기
  const utils = api.useContext();

  // Clean up stats subscription when component unmounts
  useEffect(() => {
    return () => {
      if (statsUnsubscribeRef.current) {
        statsUnsubscribeRef.current();
        statsUnsubscribeRef.current = null;
      }
    };
  }, []);

  // Clean up previous subscription when modal closes
  useEffect(() => {
    if (!statsModalOpen && !csvModalOpen && statsUnsubscribeRef.current) {
      statsUnsubscribeRef.current();
      statsUnsubscribeRef.current = null;
    }
  }, [statsModalOpen, csvModalOpen]);

  const deleteMutation = api.poll.delete.useMutation({
    onError: (error) => {
      console.error("Error deleting poll:", error);
      alert(formatString(strings.poll.deleteError, error.message));
      setDeleteId(null);
    },
  });

  const handleShowStats = (pollId: string) => {
    try {
      setIsLoadingStats(true);
      setSelectedPollId(pollId);

      // Clean up any existing subscription first
      if (statsUnsubscribeRef.current) {
        statsUnsubscribeRef.current();
        statsUnsubscribeRef.current = null;
      }

      // Set up real-time listener for the stats
      const unsubscribe = subscribeToParticipantStats(
        pollId,
        (participantStats) => {
          setPollStats(participantStats || []);
          setIsLoadingStats(false);
          setStatsModalOpen(true);
        },
        (error) => {
          console.error("통계 조회 오류:", error);
          setPollStats([]);
          setIsLoadingStats(false);
          setStatsModalOpen(true);
        },
      );

      // Save the unsubscribe function for cleanup
      statsUnsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error("통계 조회 오류:", error);
      setPollStats([]);
      setStatsModalOpen(true);
      setIsLoadingStats(false);
    }
  };

  const handleCloseStatsModal = () => {
    setStatsModalOpen(false);
    setSelectedPollId(null);
  };

  const handleCloseCsvModal = () => {
    setCsvModalOpen(false);
    setSelectedPollId(null);
  };

  const handleShowCsv = (pollId: string) => {
    try {
      setIsLoadingCsv(true);
      setSelectedPollId(pollId);

      // Clean up any existing subscription first
      if (statsUnsubscribeRef.current) {
        statsUnsubscribeRef.current();
        statsUnsubscribeRef.current = null;
      }

      // Set up real-time listener for the stats
      const unsubscribe = subscribeToParticipantStats(
        pollId,
        (participantStats) => {
          setPollStats(participantStats || []);
          setIsLoadingCsv(false);
          setCsvModalOpen(true);
        },
        (error) => {
          console.error("CSV 통계 조회 오류:", error);
          setPollStats([]);
          setIsLoadingCsv(false);
          setCsvModalOpen(true);
        },
      );

      // Save the unsubscribe function for cleanup
      statsUnsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error("CSV 통계 조회 오류:", error);
      setPollStats([]);
      setCsvModalOpen(true);
      setIsLoadingCsv(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(strings.poll.deleteConfirm)) {
      try {
        setDeleteId(id);
        await deleteMutation.mutateAsync({ id });
        setDeleteId(null);
      } catch (error) {
        // Error will be handled by the onError callback in the mutation
      }
    }
  };

  const handlePlay = (pollId: string) => {
    setLoadingPlayId(pollId);
    router.push(`/polls/play/${pollId}`);
  };

  const handleEdit = (pollId: string) => {
    setLoadingEditId(pollId);
    router.push(`/polls/edit/${pollId}`);
  };

  // Find the selected poll name
  const selectedPoll = polls?.find((poll) => poll.id === selectedPollId);

  // Sort polls by group name first, then by poll_name in alphabetical order
  const sortedPolls = polls
    ? [...polls].sort((a, b) => {
        // Get group names (or fallback to ID or unnamed)
        const groupNameA =
          typeof a.poll_group === "object" &&
          a.poll_group !== null &&
          "group_name" in a.poll_group
            ? a.poll_group.group_name
            : a.poll_group?.id || strings.common.unnamed;

        const groupNameB =
          typeof b.poll_group === "object" &&
          b.poll_group !== null &&
          "group_name" in b.poll_group
            ? b.poll_group.group_name
            : b.poll_group?.id || strings.common.unnamed;

        // Compare group names first
        const groupComparison = String(groupNameA).localeCompare(
          String(groupNameB),
        );

        // If in the same group, compare by poll_name
        if (groupComparison === 0) {
          return a.poll_name.localeCompare(b.poll_name);
        }

        // Otherwise, sort by group name
        return groupComparison;
      })
    : [];

  return (
    <Layout>
      <div className="mb-8 flex justify-between">
        <h1 className="text-3xl font-bold">{strings.poll.polls}</h1>
        <div className="flex space-x-2">
          <Link
            href="/groups"
            className="flex items-center rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          >
            {strings.group.groups}
          </Link>
          <Link
            href="/polls/create"
            className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <PlusIcon className="mr-2 h-5 w-5" />
            {strings.poll.addPoll}
          </Link>
          {isAuthenticated && (
            <button
              onClick={logout}
              className="flex items-center rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              <ArrowLeftOnRectangleIcon className="mr-2 h-5 w-5" />
              {strings.common.logout}
            </button>
          )}
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
                  {strings.stats.name}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                >
                  {strings.poll.pollDescription}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                >
                  {strings.group.title}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase"
                >
                  {strings.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sortedPolls.map((poll) => (
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
                      {/* Display group name or ID with explicit string casting */}
                      {String(
                        typeof poll.poll_group === "object" &&
                          poll.poll_group !== null &&
                          "group_name" in poll.poll_group
                          ? poll.poll_group.group_name
                          : poll.poll_group?.id || strings.common.unnamed,
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handlePlay(poll.id!)}
                        className="rounded bg-green-100 p-1 text-green-600 hover:bg-green-200"
                        disabled={
                          deleteId === poll.id || loadingPlayId === poll.id
                        }
                        title={strings.poll.play}
                      >
                        {loadingPlayId === poll.id ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-green-600"></div>
                        ) : (
                          <PlayIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleShowStats(poll.id!)}
                        className="rounded bg-indigo-100 p-1 text-indigo-600 hover:bg-indigo-200"
                        disabled={deleteId === poll.id || isLoadingStats}
                        title={strings.stats.title}
                      >
                        {isLoadingStats && selectedPollId === poll.id ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                        ) : (
                          <ChartBarIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleShowCsv(poll.id!)}
                        className="rounded bg-teal-100 p-1 text-teal-600 hover:bg-teal-200"
                        disabled={deleteId === poll.id || isLoadingCsv}
                        title="CSV 내보내기"
                      >
                        {isLoadingCsv && selectedPollId === poll.id ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-teal-600"></div>
                        ) : (
                          <DocumentTextIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(poll.id!)}
                        className="rounded bg-yellow-100 p-1 text-yellow-600 hover:bg-yellow-200"
                        disabled={
                          deleteId === poll.id || loadingEditId === poll.id
                        }
                        title={strings.poll.edit}
                      >
                        {loadingEditId === poll.id ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-yellow-600"></div>
                        ) : (
                          <PencilIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(poll.id!)}
                        className={`rounded p-1 ${
                          deleteId === poll.id
                            ? "bg-gray-100 text-gray-400"
                            : "bg-red-100 text-red-600 hover:bg-red-200"
                        }`}
                        disabled={deleteId === poll.id}
                        title={strings.poll.delete}
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
              {strings.poll.noPollsFound}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Modal */}
      <StatsModal
        isOpen={statsModalOpen}
        onClose={handleCloseStatsModal}
        stats={pollStats}
        pollName={selectedPoll?.poll_name || ""}
      />

      {/* CSV Export Modal */}
      <CsvExportModal
        isOpen={csvModalOpen}
        onClose={handleCloseCsvModal}
        stats={pollStats}
        pollName={selectedPoll?.poll_name || ""}
      />
    </Layout>
  );
}

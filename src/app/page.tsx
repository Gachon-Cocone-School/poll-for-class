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
  ArrowLeftOnRectangleIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { usePolls } from "~/hooks/usePolls"; // 실시간 구독 훅 사용
import { useAdminAuth } from "~/hooks/useAdminAuth"; // Admin auth hook 추가
import { ParticipantStats } from "~/lib/types";

// Stats Modal Component
interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ParticipantStats[];
  pollName: string;
}

const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  pollName,
}) => {
  if (!isOpen) return null;

  // 전체 참가자 수 계산
  const totalParticipants = stats.length;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            Participant Statistics: {pollName}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {stats.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No participant statistics available for this poll.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Participation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Correct Predictions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {stats.map((stat, index) => {
                  // 이전 참가자와 순위가 같은지 확인 (동률 강조)
                  const isTied =
                    index > 0 && stat.rank === stats[index - 1].rank;

                  return (
                    <tr
                      key={index}
                      className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${isTied ? "bg-blue-50 font-medium" : ""}`}
                    >
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
                        {`${stat.rank}/${totalParticipants}`}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                        {stat.member_name}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                        {stat.participation_count}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                        {stat.correct_predictions}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
                        {stat.score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default function PollsPage() {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { logout, isAuthenticated } = useAdminAuth();
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [pollStats, setPollStats] = useState<ParticipantStats[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // TRPC 대신 실시간 Firebase 구독 사용
  const { data: polls, loading: isLoading } = usePolls();

  // TRPC utils 가져오기
  const utils = api.useContext();

  const deleteMutation = api.poll.delete.useMutation();

  const handleShowStats = async (pollId: string) => {
    try {
      setIsLoadingStats(true);
      setSelectedPollId(pollId);

      // TRPC context를 통해 쿼리 실행
      const data = await utils.poll.getParticipantStats.fetch({ pollId });
      setPollStats(data || []);
      setStatsModalOpen(true);
    } catch (error) {
      console.error("통계 조회 오류:", error);
      setPollStats([]);
      setStatsModalOpen(true);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleCloseStatsModal = () => {
    setStatsModalOpen(false);
    setSelectedPollId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this poll?")) {
      setDeleteId(id);
      await deleteMutation.mutateAsync({ id });
      setDeleteId(null);
    }
  };

  // Find the selected poll name
  const selectedPoll = polls?.find((poll) => poll.id === selectedPollId);

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
                        onClick={() => handleShowStats(poll.id!)}
                        className="rounded bg-indigo-100 p-1 text-indigo-600 hover:bg-indigo-200"
                        disabled={deleteId === poll.id || isLoadingStats}
                        title="View Statistics"
                      >
                        {isLoadingStats && selectedPollId === poll.id ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                        ) : (
                          <ChartBarIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => router.push(`/polls/edit/${poll.id}`)}
                        className="rounded bg-yellow-100 p-1 text-yellow-600 hover:bg-yellow-200"
                        disabled={deleteId === poll.id}
                        title="Edit Poll"
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
                        title="Delete Poll"
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

      {/* Statistics Modal */}
      <StatsModal
        isOpen={statsModalOpen}
        onClose={handleCloseStatsModal}
        stats={pollStats}
        pollName={selectedPoll?.poll_name || ""}
      />
    </Layout>
  );
}

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
import strings, { formatString } from "~/lib/strings";

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

  // Get top participants for the podium (up to 3)
  const top3 = stats.slice(0, 3);

  // Determine if there are any ties in the top 3
  const hasTies =
    top3.length > 1 &&
    ((top3.length >= 2 && top3[0].rank === top3[1].rank) ||
      (top3.length === 3 &&
        (top3[1].rank === top3[2].rank || top3[0].rank === top3[2].rank)));

  // Determine heights based on ranks
  // If participants have tied ranks, they should have podiums of same height
  const getPodiumHeight = (participant: ParticipantStats, index: number) => {
    // Default heights for 1st, 2nd, 3rd places
    const defaultHeights = {
      podium: ["h-28", "h-24", "h-20"],
      base: ["h-24", "h-16", "h-10"],
    };

    // Check if this participant is tied with anyone else in top 3
    const isTiedWithPrevious =
      index > 0 && participant.rank === top3[index - 1].rank;
    const isTiedWithFirst = index > 0 && participant.rank === top3[0].rank;

    // If tied with the previous position, use the same height
    if (isTiedWithPrevious) {
      const prevIndex = index - 1;
      return {
        podium: defaultHeights.podium[prevIndex],
        base: defaultHeights.base[prevIndex],
      };
    }

    // If tied with first position but not adjacent, use first place height
    if (isTiedWithFirst) {
      return {
        podium: defaultHeights.podium[0],
        base: defaultHeights.base[0],
      };
    }

    // Otherwise use default height for this position
    return {
      podium: defaultHeights.podium[index],
      base: defaultHeights.base[index],
    };
  };

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {formatString(strings.stats.participantStatistics, pollName)}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
            aria-label={strings.common.close}
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
            {strings.stats.noStatsAvailable}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Leaderboard header */}
            <h3 className="mb-4 text-lg font-semibold">
              {strings.stats.leaderboard}
            </h3>

            {/* Olympic Podium Style for Top 3 */}
            {stats.length >= 1 && (
              <div className="mb-8 flex flex-col items-center">
                <div className="mb-12 flex w-full items-end justify-center">
                  {/* Second Place - Left */}
                  {stats.length >= 2 && (
                    <div className="mx-4 flex flex-col items-center">
                      <div className="mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-gray-300 bg-gray-100">
                        <span className="text-3xl font-bold text-gray-600">
                          {top3[1].rank}
                        </span>
                      </div>
                      <div
                        className={`w-24 ${getPodiumHeight(top3[1], 1).podium} flex flex-col items-center justify-center rounded-t-lg bg-gray-300`}
                      >
                        <p className="max-w-[90px] truncate text-sm font-bold">
                          {top3[1]?.member_name || "N/A"}
                        </p>
                        <p className="mt-1 text-xs">
                          {(top3[1]?.score || 0) * 10} {strings.stats.points}
                        </p>
                      </div>
                      <div
                        className={`w-24 bg-gray-300 ${
                          getPodiumHeight(top3[1], 1).base
                        }`}
                      ></div>
                    </div>
                  )}

                  {/* First Place - Center */}
                  {stats.length >= 1 && (
                    <div className="mx-4 -mt-6 flex flex-col items-center">
                      <div className="mb-2 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-yellow-500 bg-yellow-100">
                        <span className="text-4xl font-bold text-yellow-600">
                          {top3[0].rank}
                        </span>
                      </div>
                      <div
                        className={`w-28 ${getPodiumHeight(top3[0], 0).podium} flex flex-col items-center justify-center rounded-t-lg bg-yellow-500`}
                      >
                        <p className="max-w-[100px] truncate text-sm font-bold text-white">
                          {top3[0]?.member_name || "N/A"}
                        </p>
                        <p className="mt-1 text-xs text-white">
                          {(top3[0]?.score || 0) * 10} {strings.stats.points}
                        </p>
                      </div>
                      <div
                        className={`w-28 bg-yellow-500 ${
                          getPodiumHeight(top3[0], 0).base
                        }`}
                      ></div>
                    </div>
                  )}

                  {/* Third Place - Right */}
                  {stats.length >= 3 && (
                    <div className="mx-4 flex flex-col items-center">
                      <div className="mb-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-4 border-amber-700 bg-amber-100">
                        <span className="text-2xl font-bold text-amber-800">
                          {top3[2].rank}
                        </span>
                      </div>
                      <div
                        className={`w-20 ${getPodiumHeight(top3[2], 2).podium} flex flex-col items-center justify-center rounded-t-lg bg-amber-700`}
                      >
                        <p className="max-w-[80px] truncate text-sm font-bold text-white">
                          {top3[2]?.member_name || "N/A"}
                        </p>
                        <p className="mt-1 text-xs text-white">
                          {(top3[2]?.score || 0) * 10} {strings.stats.points}
                        </p>
                      </div>
                      <div
                        className={`w-20 bg-amber-700 ${
                          getPodiumHeight(top3[2], 2).base
                        }`}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4등 이상 참가자들 - 하나의 테이블로 표시 */}
            {stats.length > 3 && (
              <div className="rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        {strings.stats.rank}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        {strings.stats.name}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                        {strings.stats.score}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {stats.slice(3).map((stat, index) => {
                      // 이전 참가자와 순위가 같은지 확인 (동률 강조)
                      const isTied =
                        index > 0 && stat.rank === stats[index + 3 - 1].rank;

                      return (
                        <tr
                          key={index + 3}
                          className={`${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          } ${isTied ? "bg-gray-100 font-medium" : ""}`}
                        >
                          <td className="px-6 py-4 text-sm whitespace-nowrap">
                            {stat.rank}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap">
                            {stat.member_name}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap">
                            {stat.score * 10}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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

  const deleteMutation = api.poll.delete.useMutation({
    onError: (error) => {
      console.error("Error deleting poll:", error);
      alert(formatString(strings.poll.deleteError, error.message));
      setDeleteId(null);
    },
  });

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

  // Find the selected poll name
  const selectedPoll = polls?.find((poll) => poll.id === selectedPollId);

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
                        title={strings.poll.play}
                      >
                        <PlayIcon className="h-5 w-5" />
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
                        onClick={() => router.push(`/polls/edit/${poll.id}`)}
                        className="rounded bg-yellow-100 p-1 text-yellow-600 hover:bg-yellow-200"
                        disabled={deleteId === poll.id}
                        title={strings.poll.edit}
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
    </Layout>
  );
}

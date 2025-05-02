"use client";

import React from "react";
import type { ParticipantStats } from "~/lib/types";
import strings, { formatString } from "~/lib/strings";

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ParticipantStats[];
  pollName?: string;
  isLoading?: boolean;
}

const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  pollName = "",
  isLoading = false,
}) => {
  if (!isOpen) return null;

  if (isLoading) {
    return (
      <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
        <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="text-gray-600">{strings.stats.loadingStats}</p>
          </div>
        </div>
      </div>
    );
  }

  // 전체 참가자 수 계산
  const totalParticipants = stats.length;

  // Get top participants for the podium (up to 3)
  const top3 = stats.slice(0, 3);

  // Determine if there are any ties in the top 3
  const hasTies =
    top3.length > 1 &&
    ((top3.length >= 2 && top3[0]?.rank === top3[1]?.rank) ||
      (top3.length === 3 &&
        (top3[1]?.rank === top3[2]?.rank || top3[0]?.rank === top3[2]?.rank)));

  // Determine heights based on ranks
  // If participants have tied ranks, they should have podiums of same height
  const getPodiumHeight = (
    participant: ParticipantStats | undefined,
    index: number,
  ) => {
    // Default heights for 1st, 2nd, 3rd places
    const defaultHeights = {
      podium: ["h-28", "h-24", "h-20"],
      base: ["h-24", "h-16", "h-10"],
    };

    // If participant is undefined, return default height
    if (!participant) {
      return {
        podium: defaultHeights.podium[index] || defaultHeights.podium[0],
        base: defaultHeights.base[index] || defaultHeights.base[0],
      };
    }

    // Find the highest-ranked participant with the same rank
    let highestIndex = index;
    for (let i = 0; i < top3.length; i++) {
      if (
        i !== index &&
        top3[i]?.rank === participant.rank &&
        i < highestIndex
      ) {
        highestIndex = i;
      }
    }

    // Use the height of the highest-ranked participant with the same rank
    return {
      podium: defaultHeights.podium[highestIndex],
      base: defaultHeights.base[highestIndex],
    };
  };

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          {/* Move poll name to the left side of the header bar */}
          {pollName && (
            <h2 className="text-xl font-bold">리더보드 - {pollName}</h2>
          )}
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
            {/* Olympic Podium Style for Top 3 */}
            {stats.length >= 1 && (
              <div className="mb-8 flex flex-col items-center">
                <div className="mt-8 mb-16 flex w-full items-end justify-center">
                  {/* Second Place - Left */}
                  {stats.length >= 2 && (
                    <div className="mx-4 flex flex-col items-center">
                      <div className="mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-gray-300 bg-gray-100">
                        <span className="text-3xl font-bold text-gray-600">
                          {top3[1]?.rank}
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
                          {top3[0]?.rank}
                        </span>
                      </div>
                      <div
                        className={`w-24 ${getPodiumHeight(top3[0], 0).podium} flex flex-col items-center justify-center rounded-t-lg bg-yellow-500`}
                      >
                        <p className="max-w-[90px] truncate text-sm font-bold text-white">
                          {top3[0]?.member_name || "N/A"}
                        </p>
                        <p className="mt-1 text-xs text-white">
                          {(top3[0]?.score || 0) * 10} {strings.stats.points}
                        </p>
                      </div>
                      <div
                        className={`w-24 bg-yellow-500 ${
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
                          {top3[2]?.rank}
                        </span>
                      </div>
                      <div
                        className={`w-24 ${getPodiumHeight(top3[2], 2).podium} flex flex-col items-center justify-center rounded-t-lg bg-amber-700`}
                      >
                        <p className="max-w-[90px] truncate text-sm font-bold text-white">
                          {top3[2]?.member_name || "N/A"}
                        </p>
                        <p className="mt-1 text-xs text-white">
                          {(top3[2]?.score || 0) * 10} {strings.stats.points}
                        </p>
                      </div>
                      <div
                        className={`w-24 bg-amber-700 ${
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
                        index > 0 && stat.rank === stats[index + 3 - 1]?.rank;

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

export default StatsModal;

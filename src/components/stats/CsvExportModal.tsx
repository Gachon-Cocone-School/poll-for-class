"use client";

import React, { useState } from "react";
import type { ParticipantStats } from "~/lib/types";
import strings from "~/lib/strings";

interface CsvExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ParticipantStats[];
  pollName?: string;
}

const CsvExportModal: React.FC<CsvExportModalProps> = ({
  isOpen,
  onClose,
  stats,
  pollName = "",
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  // Sort stats by member name alphabetically
  const sortedStats = [...stats].sort((a, b) =>
    a.member_name.localeCompare(b.member_name),
  );

  // Create CSV header
  const csvHeader = [
    "Name",
    "Rank",
    "Score",
    "Participation Count",
    "Correct Predictions",
  ].join(",");

  // Create CSV rows
  const csvRows = sortedStats.map((stat) => {
    return [
      stat.member_name,
      stat.rank,
      stat.score * 10, // Multiply by 10 as in StatsModal
      stat.participation_count,
      stat.correct_predictions,
    ].join(",");
  });

  // Combine header and rows
  const csvContent = [csvHeader, ...csvRows].join("\n");

  const handleCopyToClipboard = () => {
    navigator.clipboard
      .writeText(csvContent)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy to clipboard:", err);
      });
  };

  const handleDownloadCsv = () => {
    try {
      setIsDownloading(true);

      // Create a Blob with the CSV content
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

      // Create a URL for the Blob
      const url = URL.createObjectURL(blob);

      // Create a temporary link element to trigger the download
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${pollName || "statistics"}_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);

      // Trigger the download
      link.click();

      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsDownloading(false);
    } catch (err) {
      console.error("Failed to download CSV:", err);
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          {pollName && (
            <h2 className="text-xl font-bold">CSV 통계 - {pollName}</h2>
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
          <div className="flex flex-col space-y-4">
            <div className="rounded-md bg-gray-50 p-4">
              <pre className="max-h-96 overflow-auto font-mono text-sm break-all whitespace-pre-wrap">
                {csvContent}
              </pre>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleDownloadCsv}
                className="flex items-center rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <div className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
                    다운로드 중...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-2 h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    CSV 다운로드
                  </>
                )}
              </button>

              <button
                onClick={handleCopyToClipboard}
                className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                {isCopied ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-2 h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    복사 완료
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-2 h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                      />
                    </svg>
                    클립보드에 복사
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CsvExportModal;

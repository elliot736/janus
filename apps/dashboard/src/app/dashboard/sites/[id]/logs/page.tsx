"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoadingState } from "@/components/loading";
import { ErrorState } from "@/components/error-state";
import { apiGet } from "@/lib/api";

interface Verification {
  id: string;
  riskScore: number;
  action: string;
  fingerprintHash: string;
  ipAddress: string;
  powTimeMs: number;
  anomalies: string[];
  createdAt: string;
}

interface VerificationsResponse {
  data: Verification[];
  total: number;
  page: number;
  pageSize: number;
}

function actionColor(action: string): string {
  switch (action) {
    case "allow":
      return "bg-emerald-950 text-emerald-400";
    case "challenge":
      return "bg-yellow-950 text-yellow-400";
    case "block":
      return "bg-red-950 text-red-400";
    default:
      return "bg-zinc-800 text-zinc-400";
  }
}

function riskColor(score: number): string {
  if (score < 30) return "text-emerald-400";
  if (score < 70) return "text-yellow-400";
  return "text-red-400";
}

export default function SiteLogsPage() {
  const params = useParams();
  const siteId = params.id as string;

  const [data, setData] = useState<VerificationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    setError(null);
    apiGet<VerificationsResponse>(
      `/api/v1/sites/${siteId}/verifications?page=${page}&pageSize=50`
    )
      .then(setData)
      .catch((err) => setError(err.message || "Failed to load verification logs"))
      .finally(() => setLoading(false));
  }, [siteId, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/sites/${siteId}`}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-white">Verification Logs</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Recent verification requests and their outcomes.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-8">
          <LoadingState message="Loading verification logs..." />
        </div>
      ) : error ? (
        <div className="mt-8">
          <ErrorState message={error} onRetry={fetchLogs} />
        </div>
      ) : !data || data.data.length === 0 ? (
        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-12 text-center">
          <p className="text-lg font-medium text-zinc-300">No verification logs yet</p>
          <p className="mt-2 text-sm text-zinc-500">
            Verification logs will appear here once your site starts receiving traffic.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    PoW Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Fingerprint
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.data.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-zinc-400 whitespace-nowrap">
                      {new Date(v.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-300 font-mono">
                      {v.ipAddress}
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${riskColor(v.riskScore)}`}>
                      {v.riskScore}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${actionColor(v.action)}`}
                      >
                        {v.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {v.powTimeMs}ms
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 font-mono">
                      {v.fingerprintHash.substring(0, 12)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-zinc-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-zinc-800 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

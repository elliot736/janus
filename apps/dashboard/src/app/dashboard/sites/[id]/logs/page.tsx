"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { LoadingState } from "@/components/loading";
import { ErrorState } from "@/components/error-state";
import { AnomalyBadge } from "@/components/anomaly-badge";
import { apiGet } from "@/lib/api";

interface Verification {
  id: string;
  riskScore: number;
  action: string;
  fingerprintHash: string;
  ipAddress: string;
  countryCode?: string | null;
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
      return "bg-emerald-950 text-emerald-400 ring-1 ring-emerald-400/20";
    case "challenge":
      return "bg-yellow-950 text-yellow-400 ring-1 ring-yellow-400/20";
    case "block":
      return "bg-red-950 text-red-400 ring-1 ring-red-400/20";
    default:
      return "bg-zinc-800 text-zinc-400";
  }
}

function riskColor(score: number): string {
  if (score < 30) return "#22c55e";
  if (score < 70) return "#eab308";
  return "#ef4444";
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
      <div className="flex items-center justify-between">
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
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
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
          {/* Summary bar */}
          <div className="mt-6 flex items-center gap-6 text-sm">
            <span className="text-zinc-500">
              {data.total.toLocaleString()} total verifications
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-500">
              Page {page} of {totalPages}
            </span>
          </div>

          <div className="mt-4 rounded-lg border border-zinc-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    IP / Country
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Risk
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    PoW
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Anomalies
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Fingerprint
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {data.data.map((v) => (
                  <tr key={v.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-zinc-400 whitespace-nowrap">
                      {new Date(v.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-zinc-300">{v.ipAddress}</span>
                        {v.countryCode && (
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 uppercase">
                            {v.countryCode}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${v.riskScore}%`,
                              backgroundColor: riskColor(v.riskScore),
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-zinc-300 tabular-nums w-6 text-right">
                          {v.riskScore}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${actionColor(v.action)}`}
                      >
                        {v.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 tabular-nums">
                      {v.powTimeMs ? `${(v.powTimeMs / 1000).toFixed(1)}s` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {v.anomalies && v.anomalies.length > 0 ? (
                          v.anomalies.slice(0, 3).map((a) => (
                            <AnomalyBadge key={a} anomaly={a} />
                          ))
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                        {v.anomalies && v.anomalies.length > 3 && (
                          <span className="text-[10px] text-zinc-500">+{v.anomalies.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-600 font-mono">
                      {v.fingerprintHash ? `${v.fingerprintHash.substring(0, 10)}...` : "—"}
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
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      pageNum === page
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
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

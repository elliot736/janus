"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoadingState } from "@/components/loading";
import { ErrorState, EmptyState } from "@/components/error-state";
import { apiGet } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

interface RequestsPerDay {
  date: string;
  count: number;
}

interface RiskBucket {
  bucket: string;
  count: number;
}

interface AnalyticsSummary {
  period: { days: number; since: string };
  verifications: {
    totalVerifications: number;
    avgRiskScore: number;
    allowCount: number;
    challengeCount: number;
    blockCount: number;
  };
  challenges: {
    totalChallenges: number;
    pendingCount: number;
    solvedCount: number;
    expiredCount: number;
  };
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  timeline: RequestsPerDay[];
  riskDistribution: RiskBucket[];
}

const BUCKET_COLORS: Record<string, string> = {
  very_low: "#22c55e",
  low: "#84cc16",
  medium: "#eab308",
  high: "#f97316",
  very_high: "#ef4444",
};

function bucketLabel(bucket: string): string {
  return bucket.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SiteAnalyticsPage() {
  const params = useParams();
  const siteId = params.id as string;

  const periodToDays: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30 };
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("7d");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(() => {
    setLoading(true);
    setError(null);
    const days = periodToDays[period];
    Promise.all([
      apiGet<AnalyticsSummary>(`/api/v1/analytics/${siteId}/summary?days=${days}`),
      apiGet<RequestsPerDay[]>(`/api/v1/analytics/${siteId}/requests-per-day?days=${days}`),
      apiGet<RiskBucket[]>(`/api/v1/analytics/${siteId}/risk-distribution?days=${days}`),
    ])
      .then(([summary, timeline, riskDistribution]) =>
        setData({ summary, timeline: timeline ?? [], riskDistribution: riskDistribution ?? [] })
      )
      .catch((err) => setError(err.message || "Failed to load analytics"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

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
          <h1 className="text-2xl font-semibold text-white">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Request analytics and risk distribution.
          </p>
        </div>
      </div>

      {/* Period selector */}
      <div className="mt-6 flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1 w-fit">
        {(["24h", "7d", "30d"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              period === p
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {loading && <LoadingState message="Loading analytics..." />}
      {error && <ErrorState message={error} onRetry={fetchAnalytics} />}
      {!loading && !error && !data && <EmptyState message="No analytics data available." />}

      {!loading && !error && data && (
        <>
          {/* Summary stats */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Total Verifications</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {data.summary?.verifications?.totalVerifications?.toLocaleString() ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Allowed</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-400">
                {data.summary?.verifications?.allowCount?.toLocaleString() ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Challenged</p>
              <p className="mt-1 text-2xl font-semibold text-yellow-400">
                {data.summary?.verifications?.challengeCount?.toLocaleString() ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Blocked</p>
              <p className="mt-1 text-2xl font-semibold text-red-400">
                {data.summary?.verifications?.blockCount?.toLocaleString() ?? 0}
              </p>
            </div>
          </div>

          {/* Requests over time */}
          <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-sm font-medium text-zinc-400">Requests Over Time</h2>
            <div className="mt-4 h-80">
              {data.timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.timeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" stroke="#52525b" fontSize={12} tickLine={false} />
                    <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "#a1a1aa" }}
                    />
                    <Line type="monotone" dataKey="count" stroke="#ffffff" strokeWidth={2} dot={false} name="Requests" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                  No request data for this period.
                </div>
              )}
            </div>
          </div>

          {/* Risk distribution */}
          <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-sm font-medium text-zinc-400">Risk Score Distribution</h2>
            <div className="mt-4 h-64">
              {data.riskDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.riskDistribution.map((b) => ({ ...b, label: bucketLabel(b.bucket) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="label" stroke="#52525b" fontSize={12} tickLine={false} />
                    <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #27272a",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "#a1a1aa" }}
                    />
                    <Bar dataKey="count" name="Requests" radius={[4, 4, 0, 0]}>
                      {data.riskDistribution.map((entry, index) => (
                        <Cell key={index} fill={BUCKET_COLORS[entry.bucket] ?? "#71717a"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                  No risk distribution data for this period.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

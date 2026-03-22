"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import { LoadingState } from "@/components/loading";
import { ErrorState, EmptyState } from "@/components/error-state";
import { DonutChart } from "@/components/donut-chart";
import { RiskGauge } from "@/components/risk-gauge";
import { AnomalyBadge } from "@/components/anomaly-badge";
import { apiGet } from "@/lib/api";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Area,
  AreaChart,
} from "recharts";

interface RequestsPerDay {
  date: string;
  count: number;
}

interface RiskBucket {
  bucket: string;
  count: number;
}

interface TopIp {
  ipAddress: string;
  count: number;
  avgRiskScore: number;
  blockCount: number;
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

interface AdaptiveDifficulty {
  baseDifficulty: number;
  bonus: number;
  effectiveDifficulty: number;
  isElevated: boolean;
}

interface AnalyticsData {
  summary: AnalyticsSummary;
  timeline: RequestsPerDay[];
  riskDistribution: RiskBucket[];
  topIps: TopIp[];
  adaptive: AdaptiveDifficulty | null;
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

const tooltipStyle = {
  backgroundColor: "#18181b",
  border: "1px solid #27272a",
  borderRadius: "8px",
  fontSize: "12px",
};

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
      apiGet<TopIp[]>(`/api/v1/analytics/${siteId}/top-ips?days=${days}&limit=5`),
      apiGet<AdaptiveDifficulty>(`/api/v1/analytics/${siteId}/adaptive-difficulty`).catch(() => null),
    ])
      .then(([summary, timeline, riskDistribution, topIps, adaptive]) =>
        setData({
          summary,
          timeline: timeline ?? [],
          riskDistribution: riskDistribution ?? [],
          topIps: topIps ?? [],
          adaptive: adaptive ?? null,
        })
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
          {/* Adaptive difficulty banner */}
          {data.adaptive && (
            <div
              className={`mt-6 flex items-center gap-3 rounded-lg border px-4 py-3 ${
                data.adaptive.isElevated
                  ? "border-amber-800/50 bg-amber-950/30"
                  : "border-zinc-800 bg-zinc-900/50"
              }`}
            >
              <Zap
                className={`h-4 w-4 shrink-0 ${
                  data.adaptive.isElevated ? "text-amber-400" : "text-zinc-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200">
                    Adaptive Difficulty
                  </span>
                  {data.adaptive.isElevated && (
                    <span className="rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                      ELEVATED
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {data.adaptive.isElevated
                    ? `High block rate detected. Difficulty raised from ${data.adaptive.baseDifficulty} to ${data.adaptive.effectiveDifficulty} (+${data.adaptive.bonus}).`
                    : `Base difficulty ${data.adaptive.baseDifficulty}. No elevation needed — traffic is normal.`}
                </p>
              </div>
              <div className="flex items-baseline gap-1 shrink-0">
                <span className={`text-2xl font-bold ${data.adaptive.isElevated ? "text-amber-300" : "text-zinc-300"}`}>
                  {data.adaptive.effectiveDifficulty}
                </span>
                <span className="text-xs text-zinc-500">/ 8</span>
              </div>
            </div>
          )}

          {/* Summary stats row */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

          {/* Donut + Gauge row */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 flex items-center justify-center">
              <DonutChart
                segments={[
                  { label: "Allowed", value: data.summary.verifications.allowCount, color: "#22c55e" },
                  { label: "Challenged", value: data.summary.verifications.challengeCount, color: "#eab308" },
                  { label: "Blocked", value: data.summary.verifications.blockCount, color: "#ef4444" },
                ]}
                centerValue={
                  data.summary.verifications.totalVerifications > 0
                    ? `${Math.round(
                        ((data.summary.verifications.totalVerifications - data.summary.verifications.blockCount) /
                          data.summary.verifications.totalVerifications) *
                          100
                      )}%`
                    : "—"
                }
                centerLabel="human"
                size={160}
                strokeWidth={20}
              />
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 flex items-center justify-center">
              <RiskGauge
                score={data.summary.verifications.avgRiskScore}
                label="Average risk score"
              />
            </div>
            {/* Top IPs */}
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
              <h2 className="text-sm font-medium text-zinc-400 mb-3">Top IPs</h2>
              {data.topIps.length > 0 ? (
                <div className="space-y-2">
                  {data.topIps.map((ip, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm font-mono text-zinc-300 truncate">{ip.ipAddress}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">{ip.count} req</span>
                        {ip.blockCount > 0 && (
                          <span className="text-[10px] rounded bg-red-950 text-red-400 px-1.5 py-0.5">
                            {ip.blockCount} blocked
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                  No IP data for this period.
                </div>
              )}
            </div>
          </div>

          {/* Requests over time (area chart) */}
          <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-sm font-medium text-zinc-400">Requests Over Time</h2>
            <div className="mt-4 h-72">
              {data.timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timeline}>
                    <defs>
                      <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#a1a1aa" }} />
                    <Area type="monotone" dataKey="count" stroke="#ffffff" strokeWidth={2} fill="url(#colorArea)" name="Requests" />
                  </AreaChart>
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
            <div className="mt-4 h-56">
              {data.riskDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.riskDistribution.map((b) => ({ ...b, label: bucketLabel(b.bucket) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="label" stroke="#52525b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#a1a1aa" }} />
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

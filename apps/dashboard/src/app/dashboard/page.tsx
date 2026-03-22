"use client";

import { useEffect, useState, useCallback } from "react";
import { StatCard } from "@/components/stat-card";
import { DonutChart } from "@/components/donut-chart";
import { ActivityFeed } from "@/components/activity-feed";
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
  Area,
  AreaChart,
} from "recharts";

interface Site {
  id: string;
  name: string;
  domain: string[];
  isActive: boolean;
}

interface AnalyticsSummary {
  verifications: {
    totalVerifications: number;
    avgRiskScore: number;
    allowCount: number;
    challengeCount: number;
    blockCount: number;
  };
}

interface RequestsPerDay {
  date: string;
  count: number;
}

interface Verification {
  id: string;
  action: string;
  riskScore: number;
  ipAddress: string;
  createdAt: string;
  countryCode?: string | null;
}

interface OverviewData {
  sites: Site[];
  summaries: Map<string, AnalyticsSummary>;
  timeline: RequestsPerDay[];
  recentLogs: Verification[];
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sites = await apiGet<Site[]>("/api/v1/sites");

      // Fetch summary + timeline for each active site
      const activeSites = sites.filter((s) => s.isActive);
      const summaryPromises = activeSites.map((s) =>
        apiGet<AnalyticsSummary>(`/api/v1/analytics/${s.id}/summary?days=7`).catch(() => null)
      );
      const timelinePromise = activeSites.length > 0
        ? apiGet<RequestsPerDay[]>(`/api/v1/analytics/${activeSites[0].id}/requests-per-day?days=7`).catch(() => [])
        : Promise.resolve([]);
      const logsPromise = activeSites.length > 0
        ? apiGet<{ data: Verification[] }>(`/api/v1/sites/${activeSites[0].id}/verifications?page=1&pageSize=8`).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] });

      const [summaryResults, timeline, logsResult] = await Promise.all([
        Promise.all(summaryPromises),
        timelinePromise,
        logsPromise,
      ]);

      const summaries = new Map<string, AnalyticsSummary>();
      activeSites.forEach((s, i) => {
        const result = summaryResults[i];
        if (result) summaries.set(s.id, result);
      });

      setData({ sites, summaries, timeline: timeline ?? [], recentLogs: logsResult.data ?? [] });
    } catch (err) {
      setError((err as Error).message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (!data) return <EmptyState message="No dashboard data available." />;

  const activeSites = data.sites.filter((s) => s.isActive).length;

  // Aggregate stats across all sites
  let totalVerifications = 0;
  let totalAllowed = 0;
  let totalChallenged = 0;
  let totalBlocked = 0;
  let avgRiskSum = 0;
  let avgRiskCount = 0;

  for (const summary of data.summaries.values()) {
    const v = summary.verifications;
    totalVerifications += v.totalVerifications;
    totalAllowed += v.allowCount;
    totalChallenged += v.challengeCount;
    totalBlocked += v.blockCount;
    if (v.avgRiskScore > 0) {
      avgRiskSum += v.avgRiskScore * v.totalVerifications;
      avgRiskCount += v.totalVerifications;
    }
  }

  const avgRisk = avgRiskCount > 0 ? Math.round(avgRiskSum / avgRiskCount) : 0;
  const blockRate = totalVerifications > 0 ? Math.round((totalBlocked / totalVerifications) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Overview</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Bot detection activity across all sites — last 7 days.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs text-zinc-500">Live</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Sites" value={data.sites.length} />
        <StatCard title="Active Sites" value={activeSites} />
        <StatCard title="Verifications" value={totalVerifications.toLocaleString()} />
        <StatCard title="Block Rate" value={`${blockRate}%`} />
        <StatCard title="Avg Risk" value={avgRisk} />
      </div>

      {/* Charts row */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Requests over time — 2/3 width */}
        <div className="lg:col-span-2 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-sm font-medium text-zinc-400">Requests Over Time</h2>
          <div className="mt-4 h-64">
            {data.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.timeline}>
                  <defs>
                    <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#a1a1aa" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#ffffff"
                    strokeWidth={2}
                    fill="url(#colorReq)"
                    name="Requests"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                No request data yet. Analytics appear once sites receive traffic.
              </div>
            )}
          </div>
        </div>

        {/* Bot vs Human donut — 1/3 width */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-sm font-medium text-zinc-400">Traffic Breakdown</h2>
          <div className="mt-4 flex items-center justify-center">
            <DonutChart
              segments={[
                { label: "Allowed", value: totalAllowed, color: "#22c55e" },
                { label: "Challenged", value: totalChallenged, color: "#eab308" },
                { label: "Blocked", value: totalBlocked, color: "#ef4444" },
              ]}
              centerValue={totalVerifications > 0 ? `${100 - blockRate}%` : "—"}
              centerLabel="human"
              size={160}
              strokeWidth={20}
            />
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium text-zinc-400">Recent Activity</h2>
          {data.sites.length > 0 && (
            <a
              href={`/dashboard/sites/${data.sites[0].id}/logs`}
              className="text-xs text-zinc-500 hover:text-white transition-colors"
            >
              View all
            </a>
          )}
        </div>
        <ActivityFeed items={data.recentLogs} />
      </div>
    </div>
  );
}

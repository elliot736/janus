"use client";

import { useEffect, useState, useCallback } from "react";
import { StatCard } from "@/components/stat-card";
import { LoadingState } from "@/components/loading";
import { ErrorState, EmptyState } from "@/components/error-state";
import { apiGet } from "@/lib/api";

interface Site {
  id: string;
  name: string;
  domain: string[];
  siteKey: string;
  settings: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function OverviewPage() {
  const [sites, setSites] = useState<Site[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    apiGet<Site[]>("/api/v1/sites")
      .then(setSites)
      .catch((err) => setError(err.message || "Failed to load dashboard data"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (!sites) return <EmptyState message="No dashboard data available." />;

  const activeSites = sites.filter((s) => s.isActive).length;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Overview</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Monitor your bot detection activity across all sites.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sites"
          value={sites.length}
        />
        <StatCard
          title="Active Sites"
          value={activeSites}
        />
      </div>

      <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-950 p-6">
        <h2 className="text-sm font-medium text-zinc-400">Requests Over Time</h2>
        <div className="mt-4 flex items-center justify-center h-80 text-zinc-500 text-sm">
          Chart data will be available once analytics are configured for your sites.
        </div>
      </div>
    </div>
  );
}

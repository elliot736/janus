"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";
import { LoadingState } from "@/components/loading";
import { ErrorState, EmptyState } from "@/components/error-state";
import { apiGet } from "@/lib/api";

interface Site {
  id: string;
  name: string;
  domain: string[];
  isActive: boolean;
  siteKey: string;
  createdAt: string;
}

const PAGE_SIZE = 10;

export default function SitesPage() {
  const [sites, setSites] = useState<Site[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchSites = useCallback(() => {
    setLoading(true);
    setError(null);
    apiGet<Site[]>("/api/v1/sites")
      .then(setSites)
      .catch((err) => setError(err.message || "Failed to load sites"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  if (loading) return <LoadingState message="Loading sites..." />;
  if (error) return <ErrorState message={error} onRetry={fetchSites} />;
  if (!sites || sites.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Sites</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Manage your protected sites and domains.
            </p>
          </div>
          <Link
            href="/dashboard/sites/new"
            className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Site
          </Link>
        </div>
        <EmptyState message="No sites yet. Create your first site to get started." />
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(sites.length / PAGE_SIZE));
  const paginatedSites = sites.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Sites</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage your protected sites and domains.
          </p>
        </div>
        <Link
          href="/dashboard/sites/new"
          className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Site
        </Link>
      </div>

      <div className="mt-8 rounded-lg border border-zinc-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                Domain
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
                Created
              </th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {paginatedSites.map((site) => (
              <tr
                key={site.id}
                className="hover:bg-zinc-900/50 transition-colors"
              >
                <td className="px-6 py-4 text-sm font-medium text-white">
                  {site.name}
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400">
                  {Array.isArray(site.domain) ? site.domain.join(", ") : site.domain}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      site.isActive
                        ? "bg-emerald-950 text-emerald-400"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {site.isActive ? "active" : "inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400">
                  {new Date(site.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/dashboard/sites/${site.id}`}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sites.length > PAGE_SIZE && (
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
      )}
    </div>
  );
}

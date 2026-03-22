"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, RefreshCw, BarChart3, Settings, ScrollText, Plus, Trash2, Copy, Check } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { CodeSnippet } from "@/components/code-snippet";
import { StatCard } from "@/components/stat-card";
import { LoadingState } from "@/components/loading";
import { ErrorState, EmptyState } from "@/components/error-state";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

interface SiteDetail {
  id: string;
  name: string;
  domain: string[];
  siteKey: string;
  isActive: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
}

interface ApiKey {
  id: string;
  label: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function SiteDetailPage() {
  const params = useParams();
  const siteId = params.id as string;

  const [site, setSite] = useState<SiteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showSiteKey, setShowSiteKey] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [rotatedSecret, setRotatedSecret] = useState<string | null>(null);

  // API keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const fetchSite = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiGet<SiteDetail>(`/api/v1/sites/${siteId}`),
      apiGet<ApiKey[]>(`/api/v1/sites/${siteId}/api-keys`),
    ])
      .then(([siteData, keysData]) => {
        setSite(siteData);
        setApiKeys(keysData);
      })
      .catch((err) => setError(err.message || "Failed to load site"))
      .finally(() => setLoading(false));
  }, [siteId]);

  useEffect(() => {
    fetchSite();
  }, [fetchSite]);

  const maskKey = (key: string) => {
    return key.slice(0, 12) + "\u2022".repeat(20);
  };

  const handleRotateKeys = async () => {
    if (!confirm("Rotate keys? The old keys will stop working immediately.")) return;
    setRotating(true);
    setRotateError(null);
    setRotatedSecret(null);
    try {
      const result = await apiPost<{ siteKey: string; secretKey: string }>(
        `/api/v1/sites/${siteId}/rotate-keys`
      );
      setSite((prev) => prev ? { ...prev, siteKey: result.siteKey } : prev);
      setRotatedSecret(result.secretKey);
    } catch {
      setRotateError("Failed to rotate keys.");
    } finally {
      setRotating(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyLabel.trim()) return;
    setCreatingKey(true);
    setKeyError(null);
    try {
      const result = await apiPost<{ id: string; key: string; label: string }>(
        `/api/v1/sites/${siteId}/api-keys`,
        { label: newKeyLabel.trim() }
      );
      setNewKeyValue(result.key);
      setNewKeyLabel("");
      setShowCreateKey(false);
      // Refresh keys list
      const keys = await apiGet<ApiKey[]>(`/api/v1/sites/${siteId}/api-keys`);
      setApiKeys(keys);
    } catch (err: unknown) {
      setKeyError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteKey = async (id: string, label: string) => {
    if (!confirm(`Delete API key "${label}"?`)) return;
    setKeyError(null);
    try {
      await apiDelete(`/api/v1/api-keys/${id}`);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err: unknown) {
      setKeyError(err instanceof Error ? err.message : "Failed to delete key");
    }
  };

  const copyKey = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  if (loading) return <LoadingState message="Loading site..." />;
  if (error) return <ErrorState message={error} onRetry={fetchSite} />;
  if (!site) return <EmptyState message="Site not found." />;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const integrationCode = `<script src="${apiUrl}/sdk.js"></script>
<script>
  const janus = new Janus.Janus({
    siteKey: "${site.siteKey}",
    apiUrl: "${apiUrl}",
    mode: "invisible",
  });

  document.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = await janus.execute();
    if (result.success) {
      document.querySelector("[name=janus-token]").value = result.token;
      e.target.submit();
    }
  });
</script>`;

  const verificationCode = `const response = await fetch("${apiUrl}/api/v1/siteverify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    secret: process.env.JANUS_SECRET_KEY,
    token: req.body["janus-token"],
  }),
});

const { success, action, risk_score } = await response.json();
if (!success || action === "block") {
  return res.status(403).json({ error: "Blocked" });
}`;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{site.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">{(site.domain ?? []).join(", ")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/sites/${siteId}/analytics`}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Link>
          <Link
            href={`/dashboard/sites/${siteId}/settings`}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Status" value={site.isActive ? "Active" : "Inactive"} />
        <StatCard title="Domains" value={String(Array.isArray(site.domain) ? site.domain.length : 0)} />
        <StatCard title="Created" value={new Date(site.createdAt).toLocaleDateString()} />
      </div>

      {/* Site Key */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-white">Site Keys</h2>
          <button
            onClick={handleRotateKeys}
            disabled={rotating}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${rotating ? "animate-spin" : ""}`} />
            Rotate
          </button>
        </div>

        {rotateError && <p className="mb-3 text-sm text-red-400">{rotateError}</p>}

        {rotatedSecret && (
          <div className="mb-4 rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-4">
            <p className="text-sm font-medium text-emerald-400 mb-2">
              New secret key. Copy it now — it will not be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-zinc-900 px-3 py-2 text-sm text-emerald-300 font-mono break-all">
                {rotatedSecret}
              </code>
              <CopyButton text={rotatedSecret} />
            </div>
            <button onClick={() => setRotatedSecret(null)} className="mt-2 text-xs text-zinc-500 hover:text-zinc-300">
              Dismiss
            </button>
          </div>
        )}

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
              Site Key (public)
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-zinc-900 px-3 py-2 text-sm text-zinc-300 font-mono">
                {showSiteKey ? site.siteKey : maskKey(site.siteKey)}
              </code>
              <button
                onClick={() => setShowSiteKey(!showSiteKey)}
                className="rounded-md p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                {showSiteKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <CopyButton text={site.siteKey} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">
              Secret Key
            </label>
            <p className="text-sm text-zinc-500">
              Only shown at creation or after rotation. Use the Rotate button to generate a new one.
            </p>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium text-white">API Keys</h2>
          <button
            onClick={() => setShowCreateKey(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Key
          </button>
        </div>

        {newKeyValue && (
          <div className="mb-4 rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-4">
            <p className="text-sm font-medium text-emerald-400 mb-2">
              API key created. Copy it now — it will not be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-zinc-900 px-3 py-2 text-sm text-emerald-300 font-mono break-all">
                {newKeyValue}
              </code>
              <button
                onClick={() => copyKey(newKeyValue)}
                className="shrink-0 rounded-md p-2 text-emerald-400 hover:bg-emerald-900 transition-colors"
              >
                {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <button onClick={() => setNewKeyValue(null)} className="mt-2 text-xs text-zinc-500 hover:text-zinc-300">
              Dismiss
            </button>
          </div>
        )}

        {showCreateKey && (
          <form onSubmit={handleCreateKey} className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <label className="block text-sm text-zinc-400 mb-2">Label</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyLabel}
                onChange={(e) => setNewKeyLabel(e.target.value)}
                placeholder="e.g. Production, Staging, CI"
                className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={creatingKey || !newKeyLabel.trim()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creatingKey ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreateKey(false); setKeyError(null); }}
                className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900 transition-colors"
              >
                Cancel
              </button>
            </div>
            {keyError && <p className="mt-2 text-sm text-red-400">{keyError}</p>}
          </form>
        )}

        {!showCreateKey && keyError && (
          <p className="mb-3 text-sm text-red-400">{keyError}</p>
        )}

        {apiKeys.length === 0 ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center text-sm text-zinc-500">
            No API keys yet. Create one for server-side verification.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-800">
            <table className="w-full">
              <thead className="bg-zinc-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Label</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Last Used</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {apiKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-white">{key.label}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{new Date(key.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-zinc-400">{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteKey(key.id, key.label)}
                        className="rounded-md p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Integration */}
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-medium text-white">Integration</h2>
        <CodeSnippet code={integrationCode} language="html" title="Client-side" />
        <CodeSnippet code={verificationCode} language="javascript" title="Server-side Verification" />
      </div>
    </div>
  );
}

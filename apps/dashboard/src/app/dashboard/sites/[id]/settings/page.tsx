"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import { LoadingState } from "@/components/loading";
import { ErrorState, EmptyState } from "@/components/error-state";
import { apiGet, apiPut } from "@/lib/api";

interface SiteSettings {
  powDifficulty: number;
  mode: "managed" | "invisible";
  riskThresholds: {
    allow: number;
    challenge: number;
    block: number;
  };
  allowedDomains: string[];
}

interface SiteResponse {
  id: string;
  name: string;
  domain: string[];
  siteKey: string;
  isActive: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  powDifficulty: 4,
  mode: "invisible",
  riskThresholds: { allow: 30, challenge: 60, block: 80 },
  allowedDomains: [],
};

function parseSiteSettings(
  raw: Record<string, unknown> | null | undefined,
  siteDomains: string[]
): SiteSettings {
  const s = raw ?? {};
  const thresholds = (s.riskThresholds ?? {}) as Record<string, unknown>;
  return {
    powDifficulty: typeof s.powDifficulty === "number" ? s.powDifficulty : DEFAULT_SETTINGS.powDifficulty,
    mode: s.mode === "managed" || s.mode === "invisible" ? s.mode : DEFAULT_SETTINGS.mode,
    riskThresholds: {
      allow: typeof thresholds.allow === "number" ? thresholds.allow : DEFAULT_SETTINGS.riskThresholds.allow,
      challenge: typeof thresholds.challenge === "number" ? thresholds.challenge : DEFAULT_SETTINGS.riskThresholds.challenge,
      block: typeof thresholds.block === "number" ? thresholds.block : DEFAULT_SETTINGS.riskThresholds.block,
    },
    allowedDomains: Array.isArray(s.allowedDomains)
      ? (s.allowedDomains as string[])
      : siteDomains,
  };
}

export default function SiteSettingsPage() {
  const params = useParams();
  const siteId = params.id as string;

  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchSettings = useCallback(() => {
    setLoading(true);
    setError(null);
    apiGet<SiteResponse>(`/api/v1/sites/${siteId}`)
      .then((site) => {
        const parsed = parseSiteSettings(site.settings, site.domain ?? []);
        setSettings(parsed);
      })
      .catch((err) => setError(err.message || "Failed to load settings"))
      .finally(() => setLoading(false));
  }, [siteId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (loading) return <LoadingState message="Loading settings..." />;
  if (error) return <ErrorState message={error} onRetry={fetchSettings} />;
  if (!settings) return <EmptyState message="Settings not found." />;

  const addDomain = () => {
    const domain = domainInput.trim().toLowerCase();
    if (domain && !settings.allowedDomains.includes(domain)) {
      setSettings({
        ...settings,
        allowedDomains: [...settings.allowedDomains, domain],
      });
      setDomainInput("");
    }
  };

  const removeDomain = (domain: string) => {
    setSettings({
      ...settings,
      allowedDomains: settings.allowedDomains.filter((d) => d !== domain),
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await apiPut(`/api/v1/sites/${siteId}`, { settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/sites/${siteId}`}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-white">Site Settings</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Configure bot detection behavior for this site.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {/* Mode */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            Detection Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(["managed", "invisible"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setSettings({ ...settings, mode })}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  settings.mode === mode
                    ? "border-white bg-zinc-900"
                    : "border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <p className="text-sm font-medium text-white capitalize">{mode}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {mode === "managed"
                    ? "Shows a challenge widget when suspicious activity is detected."
                    : "Runs silently in the background without any visible UI."}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* PoW Difficulty */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Proof of Work Difficulty
          </label>
          <p className="text-xs text-zinc-500 mb-3">
            Higher values make challenges harder for bots but also slower for users.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={settings.powDifficulty}
              onChange={(e) =>
                setSettings({ ...settings, powDifficulty: Number(e.target.value) })
              }
              className="flex-1 accent-white"
            />
            <span className="w-8 text-center text-sm font-medium text-white">
              {settings.powDifficulty}
            </span>
          </div>
          <div className="mt-1 flex justify-between text-xs text-zinc-600">
            <span>Easy</span>
            <span>Hard</span>
          </div>
        </div>

        {/* Risk Thresholds */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            Risk Thresholds (0-100)
          </label>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-zinc-400">Allow threshold</span>
                <span className="text-xs font-mono text-zinc-300">
                  {settings.riskThresholds.allow}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={settings.riskThresholds.allow}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    riskThresholds: {
                      ...settings.riskThresholds,
                      allow: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-emerald-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-zinc-400">Challenge threshold</span>
                <span className="text-xs font-mono text-zinc-300">
                  {settings.riskThresholds.challenge}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={settings.riskThresholds.challenge}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    riskThresholds: {
                      ...settings.riskThresholds,
                      challenge: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-yellow-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-zinc-400">Block threshold</span>
                <span className="text-xs font-mono text-zinc-300">
                  {settings.riskThresholds.block}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={settings.riskThresholds.block}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    riskThresholds: {
                      ...settings.riskThresholds,
                      block: Number(e.target.value),
                    },
                  })
                }
                className="w-full accent-red-500"
              />
            </div>
          </div>
        </div>

        {/* Domain Allowlist */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Allowed Domains
          </label>
          <p className="text-xs text-zinc-500 mb-3">
            Only requests from these domains will be accepted.
          </p>
          <div className="space-y-2">
            {settings.allowedDomains.map((domain) => (
              <div
                key={domain}
                className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2"
              >
                <span className="text-sm text-zinc-300">{domain}</span>
                <button
                  onClick={() => removeDomain(domain)}
                  className="text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDomain();
                  }
                }}
                placeholder="Add domain..."
                className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
              />
              <button
                onClick={addDomain}
                className="rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </button>
          </div>
          {saveError && <div className="mt-2 text-sm text-red-400">{saveError}</div>}
        </div>
      </div>
    </div>
  );
}

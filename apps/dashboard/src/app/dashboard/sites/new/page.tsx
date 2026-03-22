"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { apiPost } from "@/lib/api";

function isValidHostname(value: string): boolean {
  // Must be a valid hostname (no protocol, no path, no port)
  if (/^https?:\/\//i.test(value)) return false;
  if (value.includes("/") || value.includes(":") || value.includes(" ")) return false;
  // Basic hostname pattern: labels separated by dots
  const hostnameRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
  return hostnameRegex.test(value);
}

export default function NewSitePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [domainInput, setDomainInput] = useState("");
  const [domains, setDomains] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [domainError, setDomainError] = useState("");
  const [loading, setLoading] = useState(false);

  const addDomain = () => {
    const domain = domainInput.trim().toLowerCase();
    if (!domain) return;

    if (!isValidHostname(domain)) {
      setDomainError("Invalid domain. Enter a valid hostname without protocol (e.g., example.com).");
      return;
    }

    if (domains.includes(domain)) {
      setDomainError("This domain has already been added.");
      return;
    }

    setDomains([...domains, domain]);
    setDomainInput("");
    setDomainError("");
  };

  const handleDomainKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addDomain();
    }
    if (e.key === "Backspace" && !domainInput && domains.length > 0) {
      setDomains(domains.slice(0, -1));
    }
  };

  const removeDomain = (domain: string) => {
    setDomains(domains.filter((d) => d !== domain));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (domains.length === 0) {
      setError("Add at least one domain");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const site = await apiPost<{ id: string }>("/api/v1/sites", {
        name,
        domains,
      });
      router.push(`/dashboard/sites/${site.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create site");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-white">Create Site</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Add a new site to protect with Janus bot detection.
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-red-900/50 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1.5">
            Site Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Website"
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">
            Domains
          </label>
          <div className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 focus-within:border-zinc-600 focus-within:ring-1 focus-within:ring-zinc-600">
            <div className="flex flex-wrap gap-2">
              {domains.map((domain) => (
                <span
                  key={domain}
                  className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300"
                >
                  {domain}
                  <button
                    type="button"
                    onClick={() => removeDomain(domain)}
                    className="text-zinc-500 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={domainInput}
                onChange={(e) => {
                  setDomainInput(e.target.value);
                  setDomainError("");
                }}
                onKeyDown={handleDomainKeyDown}
                onBlur={addDomain}
                placeholder={domains.length === 0 ? "example.com (press Enter)" : "Add another..."}
                className="min-w-[120px] flex-1 bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none"
              />
            </div>
          </div>
          {domainError && (
            <p className="mt-1.5 text-xs text-red-400">{domainError}</p>
          )}
          <p className="mt-1.5 text-xs text-zinc-500">
            Press Enter to add a domain. These are the domains allowed to use this site&apos;s keys.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating..." : "Create Site"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-900 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

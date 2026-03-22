"use client";

import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

interface ActivityItem {
  id: string;
  action: string;
  riskScore: number;
  ipAddress: string;
  createdAt: string;
  countryCode?: string | null;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  maxItems?: number;
}

function actionIcon(action: string) {
  switch (action) {
    case "allow":
      return <ShieldCheck className="h-4 w-4 text-emerald-400" />;
    case "challenge":
      return <ShieldQuestion className="h-4 w-4 text-yellow-400" />;
    case "block":
      return <ShieldAlert className="h-4 w-4 text-red-400" />;
    default:
      return <Shield className="h-4 w-4 text-zinc-400" />;
  }
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActivityFeed({ items, maxItems = 8 }: ActivityFeedProps) {
  const visible = items.slice(0, maxItems);

  if (visible.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-zinc-500">
        No recent activity
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {visible.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-zinc-900/50 transition-colors"
        >
          {actionIcon(item.action)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-zinc-300 truncate">
                {item.ipAddress}
              </span>
              {item.countryCode && (
                <span className="text-xs text-zinc-500 uppercase">
                  {item.countryCode}
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-500">
              Score {item.riskScore} &middot; {item.action}
            </span>
          </div>
          <span className="text-xs text-zinc-600 whitespace-nowrap">
            {timeAgo(item.createdAt)}
          </span>
        </div>
      ))}
    </div>
  );
}

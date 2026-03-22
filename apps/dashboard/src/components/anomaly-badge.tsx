import { cn } from "@/lib/utils";

const ANOMALY_LABELS: Record<string, { label: string; severity: "low" | "medium" | "high" }> = {
  pow_solve_too_fast: { label: "Fast PoW", severity: "high" },
  pow_solve_fast: { label: "Quick PoW", severity: "medium" },
  pow_solve_slow: { label: "Slow PoW", severity: "low" },
  fingerprint_inconsistent: { label: "Bad FP", severity: "high" },
  fingerprint_partially_inconsistent: { label: "Weak FP", severity: "medium" },
  no_mouse_movement: { label: "No Mouse", severity: "high" },
  minimal_mouse_movement: { label: "Low Mouse", severity: "medium" },
  no_interaction: { label: "No Input", severity: "high" },
  too_fast_page_interaction: { label: "Too Fast", severity: "medium" },
  managed_mode_no_behavior: { label: "No Behavior", severity: "high" },
  missing_ja3: { label: "No JA3", severity: "low" },
  datacenter_ip: { label: "Datacenter", severity: "high" },
  vpn_detected: { label: "VPN", severity: "medium" },
  proxy_detected: { label: "Proxy", severity: "medium" },
  blocked_country: { label: "Blocked Country", severity: "high" },
  fingerprint_high_ip_velocity: { label: "IP Velocity", severity: "high" },
  fingerprint_moderate_ip_velocity: { label: "IP Velocity", severity: "medium" },
  ip_high_fingerprint_velocity: { label: "FP Velocity", severity: "high" },
  ip_moderate_fingerprint_velocity: { label: "FP Velocity", severity: "medium" },
  fingerprint_site_flood: { label: "Site Flood", severity: "high" },
  fingerprint_site_high_rate: { label: "High Rate", severity: "medium" },
  redis_unavailable: { label: "Redis Down", severity: "low" },
};

const SEVERITY_STYLES = {
  low: "bg-zinc-800 text-zinc-400",
  medium: "bg-yellow-950 text-yellow-400",
  high: "bg-red-950 text-red-400",
};

interface AnomalyBadgeProps {
  anomaly: string;
  className?: string;
}

export function AnomalyBadge({ anomaly, className }: AnomalyBadgeProps) {
  const info = ANOMALY_LABELS[anomaly];
  const label = info?.label ?? anomaly.replace(/_/g, " ");
  const severity = info?.severity ?? "low";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight",
        SEVERITY_STYLES[severity],
        className
      )}
      title={anomaly}
    >
      {label}
    </span>
  );
}

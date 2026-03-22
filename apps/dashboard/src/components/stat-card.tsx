import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  className,
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-950 p-6",
        className
      )}
    >
      <p className="text-sm font-medium text-zinc-400">{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
        {value}
      </p>
      {change !== undefined && (
        <div className="mt-2 flex items-center gap-1">
          {isPositive ? (
            <ArrowUp className="h-3 w-3 text-emerald-500" />
          ) : (
            <ArrowDown className="h-3 w-3 text-red-500" />
          )}
          <span
            className={cn(
              "text-xs font-medium",
              isPositive ? "text-emerald-500" : "text-red-500"
            )}
          >
            {Math.abs(change)}%
          </span>
          {changeLabel && (
            <span className="text-xs text-zinc-500">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

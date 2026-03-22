"use client";

interface RiskGaugeProps {
  score: number;
  label?: string;
}

function scoreColor(score: number): string {
  if (score < 25) return "#22c55e";
  if (score < 50) return "#84cc16";
  if (score < 70) return "#eab308";
  if (score < 85) return "#f97316";
  return "#ef4444";
}

function scoreLabel(score: number): string {
  if (score < 25) return "Very Low";
  if (score < 50) return "Low";
  if (score < 70) return "Medium";
  if (score < 85) return "High";
  return "Critical";
}

export function RiskGauge({ score, label }: RiskGaugeProps) {
  const color = scoreColor(score);
  const pct = Math.min(100, Math.max(0, score));

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-24 w-48">
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke="#27272a"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 251.2} 251.2`}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-3xl font-bold text-white">{score}</span>
        </div>
      </div>
      <div className="text-center">
        <span className="text-sm font-medium" style={{ color }}>
          {scoreLabel(score)}
        </span>
        {label && (
          <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
        )}
      </div>
    </div>
  );
}

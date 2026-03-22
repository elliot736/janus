"use client";

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string | number;
}

export function DonutChart({
  segments,
  size = 180,
  strokeWidth = 24,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {total === 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#27272a"
              strokeWidth={strokeWidth}
            />
          ) : (
            segments.map((segment, i) => {
              const pct = segment.value / total;
              const dashLength = circumference * pct;
              const dashOffset = circumference * offset;
              offset += pct;

              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                  strokeDashoffset={-dashOffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              );
            })
          )}
        </svg>
        {(centerLabel || centerValue !== undefined) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue !== undefined && (
              <span className="text-2xl font-bold text-white">{centerValue}</span>
            )}
            {centerLabel && (
              <span className="text-xs text-zinc-500">{centerLabel}</span>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {segments.map((segment, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-xs text-zinc-400">
              {segment.label}
              {total > 0 && (
                <span className="ml-1 text-zinc-500">
                  {Math.round((segment.value / total) * 100)}%
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

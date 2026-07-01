/**
 * L8-P1-MS2 P0-U12: Shared Chart Components — ProgressRing
 * Circular progress indicator.
 */

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

export function ProgressRing({
  value,
  max = 100,
  size = 80,
  strokeWidth = 6,
  color = '#6366f1',
  label,
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);

  return (
    <div className="inline-flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${Math.round(pct * 100)}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-500"
        />
      </svg>
      <div className="text-center -mt-[calc(50%+0.5rem)]" style={{ marginTop: `-${size / 2 + 8}px` }}>
        <div className="text-sm font-bold text-gray-900">{Math.round(pct * 100)}%</div>
      </div>
      {label && <div className="text-xs text-gray-500 mt-6">{label}</div>}
    </div>
  );
}

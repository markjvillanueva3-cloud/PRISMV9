/**
 * Shared chart components — RadarChart, BarChart, ProgressRing, Sparkline.
 * Uses SVG for zero-dependency lightweight rendering.
 * PRISM color palette with accessible contrast.
 */

export const PRISM_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
];

// ---------------------------------------------------------------------------
// RadarChart
// ---------------------------------------------------------------------------
interface RadarChartProps {
  data: { label: string; value: number }[];
  max?: number;
  size?: number;
  color?: string;
}

export function RadarChart({ data, max = 100, size = 200, color = PRISM_COLORS[0] }: RadarChartProps) {
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const n = data.length;
  const step = (2 * Math.PI) / n;

  const points = data.map((d, i) => {
    const angle = i * step - Math.PI / 2;
    const val = d.value / max;
    return { x: cx + r * val * Math.cos(angle), y: cy + r * val * Math.sin(angle) };
  });

  const polygon = points.map((p) => `${p.x},${p.y}`).join(" ");
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full" style={{ maxWidth: size }}>
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={data.map((_, i) => {
            const a = i * step - Math.PI / 2;
            return `${cx + r * level * Math.cos(a)},${cy + r * level * Math.sin(a)}`;
          }).join(" ")}
          fill="none" stroke="#e2e8f0" strokeWidth="0.5"
        />
      ))}
      {data.map((_, i) => {
        const a = i * step - Math.PI / 2;
        return <line key={i} x1={cx} y1={cy} x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)} stroke="#e2e8f0" strokeWidth="0.5" />;
      })}
      <polygon points={polygon} fill={`${color}33`} stroke={color} strokeWidth="2" />
      {data.map((d, i) => {
        const a = i * step - Math.PI / 2;
        const lx = cx + (r + 16) * Math.cos(a);
        const ly = cy + (r + 16) * Math.sin(a);
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            className="text-[9px] fill-slate-600">
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// BarChart
// ---------------------------------------------------------------------------
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  max?: number;
  height?: number;
}

export function BarChart({ data, max: maxOverride, height = 120 }: BarChartProps) {
  const max = maxOverride ?? Math.max(...data.map((d) => d.value), 1);
  const barW = Math.min(40, 300 / data.length);
  const gap = 8;
  const w = data.length * (barW + gap) + gap;

  return (
    <svg viewBox={`0 0 ${w} ${height + 20}`} className="w-full" style={{ maxWidth: w }}>
      {data.map((d, i) => {
        const barH = (d.value / max) * height;
        const x = gap + i * (barW + gap);
        const y = height - barH;
        const fill = d.color ?? PRISM_COLORS[i % PRISM_COLORS.length];
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} fill={fill} />
            <text x={x + barW / 2} y={height + 14} textAnchor="middle"
              className="text-[8px] fill-slate-500">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ProgressRing
// ---------------------------------------------------------------------------
interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

export function ProgressRing({
  value, max = 100, size = 64, strokeWidth = 6, color = PRISM_COLORS[0], label,
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const offset = circ * (1 - pct);

  return (
    <div className="inline-flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-slate-800">
            {Math.round(pct * 100)}%
          </span>
        </div>
      </div>
      {label && <span className="text-xs text-slate-500 mt-1">{label}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sparkline
// ---------------------------------------------------------------------------
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}

export function Sparkline({
  data, width = 120, height = 32, color = PRISM_COLORS[0], fill = false,
}: SparklineProps) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`
  ).join(" ");

  const fillPoints = fill
    ? `0,${height} ${points} ${width},${height}`
    : undefined;

  return (
    <svg width={width} height={height} className="inline-block">
      {fill && fillPoints && (
        <polygon points={fillPoints} fill={`${color}22`} />
      )}
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

/**
 * WedmMaterialThicknessChart — P2P-FULLSTACK-MS0/U-P2PFS52
 *
 * Speed-vs-thickness curve for a selected material, rendered as an
 * inline SVG line chart (zero chart-library dependencies). Drawn from
 * WEDMSpeedCurveEngine output: a set of (thickness_mm, cut_speed_mm_min)
 * samples per material, optionally overlaid with a highlighted "job
 * point" — the actual thickness the current job is cutting at.
 *
 * The chart scales both axes linearly to padded min/max bounds and
 * exposes per-point circles with testable `data-point-*` attributes
 * for regression coverage.
 *
 * If a job point is supplied, the chart paints a vertical dashed
 * reference line + a labeled dot and, when surrounding samples bracket
 * the job thickness, linearly interpolates the predicted cut speed so
 * the operator can sanity-check the machine AI's chosen speed.
 *
 * Defensive rendering: a <2-sample curve or all-non-finite input
 * renders an empty placeholder instead of an NaN axis.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WedmThicknessCurvePoint {
  thickness_mm: number;
  cut_speed_mm_min: number;
}

export interface WedmThicknessJobPoint {
  thickness_mm: number;
  /** Optional explicit speed — falls back to linear interp of the curve. */
  cut_speed_mm_min?: number;
  label?: string;
}

export interface WedmMaterialThicknessChartProps {
  /** Curve samples — ≥2 points required to render. */
  curve: WedmThicknessCurvePoint[] | null | undefined;
  /** Material label (shown in header + aria-label). */
  material?: string;
  /** Optional actual job point to overlay. */
  jobPoint?: WedmThicknessJobPoint | null;
  /** SVG width in px (default 480). */
  width?: number;
  /** SVG height in px (default 180). */
  height?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

const PAD = { top: 14, right: 14, bottom: 24, left: 36 };

export function WedmMaterialThicknessChart({
  curve,
  material = 'Material',
  jobPoint,
  width = 480,
  height = 180,
}: WedmMaterialThicknessChartProps) {
  const clean = (curve ?? []).filter(
    (p) =>
      p &&
      Number.isFinite(p.thickness_mm) &&
      Number.isFinite(p.cut_speed_mm_min) &&
      p.thickness_mm >= 0 &&
      p.cut_speed_mm_min >= 0,
  );

  if (clean.length < 2) {
    return (
      <div
        className="rounded-2xl border border-slate-700/40 bg-slate-900/30 px-4 py-6 text-center text-[11px] text-slate-500"
        role="region"
        aria-label={`WEDM speed curve for ${material} — insufficient data`}
        data-testid="wedm-thickness-chart-empty"
      >
        Insufficient speed-curve data for {material}.
      </div>
    );
  }

  const sorted = [...clean].sort((a, b) => a.thickness_mm - b.thickness_mm);

  const xVals = sorted.map((p) => p.thickness_mm);
  const yVals = sorted.map((p) => p.cut_speed_mm_min);
  const xMin = Math.min(...xVals);
  const xMax = Math.max(...xVals);
  const yMin = 0; // Anchor y-axis at 0 so small speed deltas don't oversell themselves.
  const yMax = Math.max(...yVals) * 1.1 || 1;

  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = Math.max(1, height - PAD.top - PAD.bottom);

  const xScale = (x: number) =>
    PAD.left + ((x - xMin) / (xMax - xMin || 1)) * innerW;
  const yScale = (y: number) =>
    PAD.top + innerH - ((y - yMin) / (yMax - yMin || 1)) * innerH;

  const path = sorted
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.thickness_mm).toFixed(2)},${yScale(p.cut_speed_mm_min).toFixed(2)}`)
    .join(' ');

  // Optional job-point overlay.
  let jobX: number | null = null;
  let jobY: number | null = null;
  let jobSpeed: number | null = null;
  if (jobPoint && Number.isFinite(jobPoint.thickness_mm)) {
    const t = jobPoint.thickness_mm;
    if (t >= xMin && t <= xMax) {
      jobX = xScale(t);
      const explicit = jobPoint.cut_speed_mm_min;
      if (typeof explicit === 'number' && Number.isFinite(explicit)) {
        jobSpeed = explicit;
      } else {
        // Linear interpolation between flanking samples.
        jobSpeed = interpolateSpeed(sorted, t);
      }
      if (jobSpeed != null) jobY = yScale(jobSpeed);
    }
  }

  // 4 tick values on each axis for legibility.
  const xTicks = buildTicks(xMin, xMax, 4);
  const yTicks = buildTicks(yMin, yMax, 4);

  return (
    <div
      className="rounded-2xl border border-slate-700/40 bg-[#0c1522] px-4 py-3"
      role="region"
      aria-label={`WEDM speed curve for ${material}: ${sorted.length} samples, ${xMin}–${xMax} mm thickness range`}
      data-testid="wedm-thickness-chart"
      data-material={material}
      data-sample-count={sorted.length}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Speed vs thickness &middot;{' '}
          <span className="normal-case text-slate-300">{material}</span>
        </div>
        <div className="text-[10px] font-mono text-slate-500">
          <span data-testid="thickness-chart-range">
            {xMin}–{xMax} mm
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        className="select-none"
        data-testid="thickness-chart-svg"
      >
        {/* Axes */}
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={PAD.top + innerH}
          stroke="rgb(71 85 105)"
          strokeWidth="1"
        />
        <line
          x1={PAD.left}
          y1={PAD.top + innerH}
          x2={PAD.left + innerW}
          y2={PAD.top + innerH}
          stroke="rgb(71 85 105)"
          strokeWidth="1"
        />

        {/* Y-axis ticks + grid */}
        {yTicks.map((yv, i) => {
          const y = yScale(yv);
          return (
            <g key={`yt-${i}`} data-testid="thickness-chart-y-tick">
              <line
                x1={PAD.left}
                y1={y}
                x2={PAD.left + innerW}
                y2={y}
                stroke="rgb(51 65 85)"
                strokeDasharray="2 3"
                strokeWidth="0.5"
              />
              <text
                x={PAD.left - 4}
                y={y + 3}
                fontSize="9"
                textAnchor="end"
                fill="rgb(100 116 139)"
                fontFamily="ui-monospace, monospace"
              >
                {formatTick(yv)}
              </text>
            </g>
          );
        })}

        {/* X-axis ticks */}
        {xTicks.map((xv, i) => {
          const x = xScale(xv);
          return (
            <g key={`xt-${i}`} data-testid="thickness-chart-x-tick">
              <line
                x1={x}
                y1={PAD.top + innerH}
                x2={x}
                y2={PAD.top + innerH + 3}
                stroke="rgb(71 85 105)"
                strokeWidth="0.5"
              />
              <text
                x={x}
                y={PAD.top + innerH + 14}
                fontSize="9"
                textAnchor="middle"
                fill="rgb(100 116 139)"
                fontFamily="ui-monospace, monospace"
              >
                {formatTick(xv)}
              </text>
            </g>
          );
        })}

        {/* Axis labels */}
        <text
          x={PAD.left + innerW / 2}
          y={height - 4}
          fontSize="9"
          textAnchor="middle"
          fill="rgb(148 163 184)"
          fontFamily="ui-sans-serif, system-ui"
        >
          thickness (mm)
        </text>
        <text
          x={8}
          y={PAD.top + innerH / 2}
          fontSize="9"
          textAnchor="middle"
          fill="rgb(148 163 184)"
          fontFamily="ui-sans-serif, system-ui"
          transform={`rotate(-90, 8, ${PAD.top + innerH / 2})`}
        >
          speed (mm/min)
        </text>

        {/* Curve */}
        <path
          d={path}
          fill="none"
          stroke="rgb(34 211 238)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          data-testid="thickness-chart-path"
        />

        {/* Sample points */}
        {sorted.map((p, i) => (
          <circle
            key={`pt-${i}`}
            cx={xScale(p.thickness_mm)}
            cy={yScale(p.cut_speed_mm_min)}
            r="2.5"
            fill="rgb(34 211 238)"
            stroke="rgb(15 23 42)"
            strokeWidth="1"
            data-testid="thickness-chart-point"
            data-point-x={p.thickness_mm}
            data-point-y={p.cut_speed_mm_min}
          />
        ))}

        {/* Job point overlay */}
        {jobX != null && jobY != null && jobSpeed != null && (
          <g data-testid="thickness-chart-job-point">
            <line
              x1={jobX}
              y1={PAD.top}
              x2={jobX}
              y2={PAD.top + innerH}
              stroke="rgb(251 191 36)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle
              cx={jobX}
              cy={jobY}
              r="4"
              fill="rgb(251 191 36)"
              stroke="rgb(15 23 42)"
              strokeWidth="1.5"
              data-testid="thickness-chart-job-dot"
              data-job-thickness={jobPoint?.thickness_mm}
              data-job-speed={jobSpeed}
            />
            <text
              x={jobX + 6}
              y={jobY - 6}
              fontSize="10"
              fill="rgb(251 191 36)"
              fontFamily="ui-monospace, monospace"
              data-testid="thickness-chart-job-label"
            >
              {jobPoint?.label ?? `${jobSpeed.toFixed(1)} mm/min`}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function buildTicks(min: number, max: number, n: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || n < 2) return [];
  const step = (max - min) / (n - 1);
  return Array.from({ length: n }, (_, i) => min + step * i);
}

function formatTick(v: number): string {
  if (!Number.isFinite(v)) return '';
  if (Math.abs(v) >= 100) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

export function interpolateSpeed(
  samples: WedmThicknessCurvePoint[],
  thickness: number,
): number | null {
  if (!Number.isFinite(thickness) || samples.length < 2) return null;
  // samples pre-sorted by thickness
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    if (thickness >= a.thickness_mm && thickness <= b.thickness_mm) {
      const span = b.thickness_mm - a.thickness_mm;
      if (span === 0) return a.cut_speed_mm_min;
      const t = (thickness - a.thickness_mm) / span;
      return a.cut_speed_mm_min + t * (b.cut_speed_mm_min - a.cut_speed_mm_min);
    }
  }
  return null;
}

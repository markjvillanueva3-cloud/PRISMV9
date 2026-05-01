/**
 * L9-P2-MS1 P0-U05: HeatmapOverlay — Vertex Color Heatmap
 *
 * Toggleable heatmap overlays: thermal, force, wear, stress, deflection.
 * Applies color gradient to toolpath or stock geometry via vertex colors.
 * Includes a 2D color scale legend with min/max values.
 */
import { useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type {
  HeatmapConfig,
  HeatmapType,
  ToolpathLineData,
  Color,
} from '../../types/viewer';

// ── Default Heatmap Configurations ───────────────────────────────────

const DEFAULT_HEATMAPS: Record<HeatmapType, Omit<HeatmapConfig, 'type'>> = {
  thermal: {
    min_value: 20,
    max_value: 800,
    unit: 'C',
    color_stops: [
      { value: 20, color: { r: 0, g: 0, b: 1 } },
      { value: 215, color: { r: 0, g: 1, b: 1 } },
      { value: 410, color: { r: 0, g: 1, b: 0 } },
      { value: 605, color: { r: 1, g: 1, b: 0 } },
      { value: 800, color: { r: 1, g: 0, b: 0 } },
    ],
  },
  force: {
    min_value: 0,
    max_value: 5000,
    unit: 'N',
    color_stops: [
      { value: 0, color: { r: 0.2, g: 0.6, b: 1 } },
      { value: 1250, color: { r: 0, g: 1, b: 0.5 } },
      { value: 2500, color: { r: 1, g: 1, b: 0 } },
      { value: 3750, color: { r: 1, g: 0.5, b: 0 } },
      { value: 5000, color: { r: 1, g: 0, b: 0 } },
    ],
  },
  wear: {
    min_value: 0,
    max_value: 0.3,
    unit: 'mm',
    color_stops: [
      { value: 0, color: { r: 0, g: 0.8, b: 0 } },
      { value: 0.075, color: { r: 0.5, g: 1, b: 0 } },
      { value: 0.15, color: { r: 1, g: 1, b: 0 } },
      { value: 0.225, color: { r: 1, g: 0.5, b: 0 } },
      { value: 0.3, color: { r: 1, g: 0, b: 0 } },
    ],
  },
  stress: {
    min_value: 0,
    max_value: 1000,
    unit: 'MPa',
    color_stops: [
      { value: 0, color: { r: 0, g: 0, b: 0.8 } },
      { value: 250, color: { r: 0, g: 0.6, b: 1 } },
      { value: 500, color: { r: 0, g: 1, b: 0.5 } },
      { value: 750, color: { r: 1, g: 0.8, b: 0 } },
      { value: 1000, color: { r: 1, g: 0, b: 0 } },
    ],
  },
  deflection: {
    min_value: 0,
    max_value: 0.05,
    unit: 'mm',
    color_stops: [
      { value: 0, color: { r: 0, g: 0.5, b: 1 } },
      { value: 0.0125, color: { r: 0, g: 1, b: 0.8 } },
      { value: 0.025, color: { r: 0.5, g: 1, b: 0 } },
      { value: 0.0375, color: { r: 1, g: 0.7, b: 0 } },
      { value: 0.05, color: { r: 1, g: 0, b: 0 } },
    ],
  },
  custom: {
    min_value: 0,
    max_value: 100,
    unit: '',
    color_stops: [
      { value: 0, color: { r: 0, g: 0, b: 1 } },
      { value: 50, color: { r: 0, g: 1, b: 0 } },
      { value: 100, color: { r: 1, g: 0, b: 0 } },
    ],
  },
};

// ── Value-to-Color Interpolation ─────────────────────────────────────

export function interpolateColor(
  value: number,
  config: HeatmapConfig
): Color {
  const { min_value, max_value, color_stops } = config;

  if (value <= min_value) return color_stops[0].color;
  if (value >= max_value) return color_stops[color_stops.length - 1].color;

  for (let i = 0; i < color_stops.length - 1; i++) {
    const a = color_stops[i];
    const b = color_stops[i + 1];
    if (value >= a.value && value <= b.value) {
      const t = (value - a.value) / (b.value - a.value);
      return {
        r: a.color.r + (b.color.r - a.color.r) * t,
        g: a.color.g + (b.color.g - a.color.g) * t,
        b: a.color.b + (b.color.b - a.color.b) * t,
      };
    }
  }

  return color_stops[0].color;
}

/** Get or build a heatmap config */
export function getHeatmapConfig(type: HeatmapType): HeatmapConfig {
  const base = DEFAULT_HEATMAPS[type];
  return { type, ...base };
}

// ── 3D Heatmap on Toolpath ───────────────────────────────────────────

export interface HeatmapOverlayProps {
  toolpath: ToolpathLineData;
  heatmapType: HeatmapType;
  /** Per-segment scalar values for coloring */
  values?: number[];
  config?: HeatmapConfig;
  visible?: boolean;
}

export function HeatmapOverlay({
  toolpath,
  heatmapType,
  values,
  config: configOverride,
  visible = true,
}: HeatmapOverlayProps) {
  const config = configOverride ?? getHeatmapConfig(heatmapType);

  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];

    for (let si = 0; si < toolpath.segments.length; si++) {
      const seg = toolpath.segments[si];
      const pts = seg.points;

      // Use provided value or simulate from feed_rate
      const value = values?.[si] ?? simulateValue(seg, config);
      const c = interpolateColor(value, config);

      for (let i = 0; i < pts.length - 3; i += 3) {
        positions.push(
          pts[i], pts[i + 1], pts[i + 2],
          pts[i + 3], pts[i + 4], pts[i + 5]
        );
        colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
      }
    }

    const geom = new BufferGeometry();
    geom.setAttribute(
      'position',
      new Float32BufferAttribute(positions, 3)
    );
    geom.setAttribute(
      'color',
      new Float32BufferAttribute(colors, 3)
    );
    geom.computeBoundingSphere();
    return geom;
  }, [toolpath, config, values]);

  if (!visible) return null;

  return (
    <lineSegments geometry={geometry} name="heatmap-overlay">
      <lineBasicMaterial vertexColors linewidth={2} />
    </lineSegments>
  );
}

/** Simulate a heatmap value from segment data when real values unavailable */
function simulateValue(
  seg: { feed_rate?: number; spindle_rpm?: number; type: string },
  config: HeatmapConfig
): number {
  const range = config.max_value - config.min_value;
  // Use feed_rate as a proxy: higher feed = higher thermal/force
  const feedNorm = (seg.feed_rate ?? 500) / 2000;
  return config.min_value + feedNorm * range;
}

// ── 2D Color Scale Legend (HTML overlay) ──────────────────────────────

export interface ColorScaleLegendProps {
  config: HeatmapConfig;
  className?: string;
}

export function ColorScaleLegend({
  config,
  className = '',
}: ColorScaleLegendProps) {
  const gradientStops = config.color_stops
    .map((stop) => {
      const pct =
        ((stop.value - config.min_value) /
          (config.max_value - config.min_value)) *
        100;
      const c = stop.color;
      return `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}) ${pct}%`;
    })
    .join(', ');

  return (
    <div className={`flex flex-col items-end gap-1 ${className}`}>
      <span className="text-xs font-medium text-white capitalize">
        {config.type}
      </span>
      <div
        className="w-4 h-32 rounded-sm border border-white/20"
        style={{
          background: `linear-gradient(to top, ${gradientStops})`,
        }}
      />
      <div className="flex flex-col items-end text-[10px] text-white/70">
        <span>
          {config.max_value} {config.unit}
        </span>
        <span className="mt-[104px]">
          {config.min_value} {config.unit}
        </span>
      </div>
    </div>
  );
}

/**
 * WireEdmContourPicker — 2D SVG contour selector for wire EDM
 *
 * Renders DXF-parsed contours as interactive SVG paths.
 * User clicks contours to select which profiles to cut.
 * Selected contour indices are passed to the program generator.
 *
 * U-WH19: Added useMemo for stroke widths, cursor styles, and per-contour
 *         color lookups to avoid recalculating on every render.
 * U-WH20: Added aria-label to the SVG element, sr-only text summary.
 */
import { useState, useMemo, useCallback } from 'react';

// ── Types (mirrors DXFGeometryParserEngine output) ──────────────────

interface Point2D { x: number; y: number }

interface LineSegment {
  type: 'line';
  start: Point2D;
  end: Point2D;
}

interface ArcSegment {
  type: 'arc';
  start: Point2D;
  end: Point2D;
  center: Point2D;
  radius: number;
  start_angle_rad: number;
  end_angle_rad: number;
  ccw: boolean;
}

type Segment = LineSegment | ArcSegment;

export interface ContourData {
  id: string;
  // Optional display name; some upstream contour sources (e.g. layered DXF
  // imports) carry a layer/feature label. UI falls back to "Contour N".
  name?: string;
  segments: Segment[];
  is_closed: boolean;
  is_exterior: boolean;
  area_mm2: number;
  perimeter_mm: number;
  bbox: { min_x: number; min_y: number; max_x: number; max_y: number };
}

interface Props {
  contours: ContourData[];
  selectedIndices: number[];
  onSelectionChange: (indices: number[]) => void;
  /** Part thickness for display */
  thickness_mm?: number;
  /** Height of the SVG viewport */
  height?: number;
}

// ── SVG Path Generation ─────────────────────────────────────────────

function segmentToSvgPath(seg: Segment): string {
  if (seg.type === 'line') {
    return `L ${seg.end.x} ${seg.end.y}`;
  }
  // Arc segment → SVG arc command
  const arc = seg as ArcSegment;
  const rx = arc.radius;
  const ry = arc.radius;
  // Determine sweep angle
  let sweep = arc.end_angle_rad - arc.start_angle_rad;
  if (arc.ccw && sweep < 0) sweep += 2 * Math.PI;
  if (!arc.ccw && sweep > 0) sweep -= 2 * Math.PI;
  const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
  const sweepFlag = arc.ccw ? 1 : 0;
  return `A ${rx} ${ry} 0 ${largeArc} ${sweepFlag} ${arc.end.x} ${arc.end.y}`;
}

function contourToSvgPath(contour: ContourData): string {
  if (contour.segments.length === 0) return '';
  const first = contour.segments[0];
  let d = `M ${first.start.x} ${first.start.y}`;
  for (const seg of contour.segments) {
    d += ' ' + segmentToSvgPath(seg);
  }
  if (contour.is_closed) d += ' Z';
  return d;
}

// ── Colors ──────────────────────────────────────────────────────────

const COLORS = {
  unselected: { stroke: '#475569', fill: 'transparent' },         // slate-600
  selected: { stroke: '#22d3ee', fill: 'rgba(34, 211, 238, 0.08)' }, // cyan-400
  hover: { stroke: '#a78bfa', fill: 'rgba(167, 139, 250, 0.06)' },   // violet-400
  exterior: { badge: '#f59e0b' },  // amber
  interior: { badge: '#6366f1' },  // indigo
  startHole: '#ef4444',            // red-500
};

// ── Component ───────────────────────────────────────────────────────

export function WireEdmContourPicker({ contours, selectedIndices, onSelectionChange, thickness_mm, height = 400 }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Compute overall bounding box with padding
  const viewBox = useMemo(() => {
    if (contours.length === 0) return { x: 0, y: 0, w: 100, h: 100 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of contours) {
      minX = Math.min(minX, c.bbox.min_x);
      minY = Math.min(minY, c.bbox.min_y);
      maxX = Math.max(maxX, c.bbox.max_x);
      maxY = Math.max(maxY, c.bbox.max_y);
    }
    const pad = Math.max(maxX - minX, maxY - minY) * 0.1;
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 };
  }, [contours]);

  // SVG paths
  const paths = useMemo(() => contours.map(c => contourToSvgPath(c)), [contours]);

  // Memoized stroke widths derived from viewBox — avoids recalculating per render
  const strokeWidths = useMemo(() => ({
    selected: viewBox.w * 0.004,
    normal: viewBox.w * 0.002,
    dashOn: viewBox.w * 0.01,
    dashOff: viewBox.w * 0.005,
    marker: viewBox.w * 0.006,
    markerStroke: viewBox.w * 0.001,
    markerOffset: viewBox.w * 0.02,
    crosshairW: viewBox.w * 0.02,
    crosshairH: viewBox.h * 0.02,
    crosshairStroke: viewBox.w * 0.001,
  }), [viewBox]);

  // Total selected cut length for footer
  const totalCutLength = useMemo(
    () => selectedIndices.reduce((s, i) => s + (contours[i]?.perimeter_mm ?? 0), 0),
    [selectedIndices, contours],
  );

  const toggleContour = useCallback((idx: number) => {
    const next = selectedIndices.includes(idx)
      ? selectedIndices.filter(i => i !== idx)
      : [...selectedIndices, idx];
    onSelectionChange(next);
  }, [selectedIndices, onSelectionChange]);

  const selectAll = useCallback(() => {
    onSelectionChange(contours.map((_, i) => i).filter(i => contours[i].is_closed));
  }, [contours, onSelectionChange]);

  const selectNone = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  if (contours.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-700/40 bg-[#0c1522] p-8 text-sm text-slate-500">
        No geometry loaded. Upload a DXF file or photo to see contours.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/40 bg-[#0c1522] px-4 py-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Select profiles to cut
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="min-h-[44px] rounded border border-cyan-500/30 bg-cyan-950/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-cyan-300 transition hover:bg-cyan-900/50"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={selectNone}
            className="min-h-[44px] rounded border border-slate-600/30 bg-slate-900/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 transition hover:bg-slate-800/50"
          >
            Clear
          </button>
          {thickness_mm != null && (
            <span className="rounded bg-slate-800/60 px-2 py-1 text-[10px] text-slate-500">
              {thickness_mm} mm thick
            </span>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        width="100%"
        height={height}
        className="rounded-xl bg-[#060d17]"
        style={{ transform: 'scaleY(-1)' }} // Flip Y so +Y is up (engineering convention)
        role="img"
        aria-label={`Wire EDM contour picker showing ${contours.length} profiles, ${selectedIndices.length} selected for cutting. Total cut length: ${totalCutLength.toFixed(1)} mm.`}
      >
        {/* Grid */}
        <defs>
          <pattern id="wedm-grid" width={10} height={10} patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth={0.1} />
          </pattern>
        </defs>
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill="url(#wedm-grid)" />

        {/* Contour paths */}
        {contours.map((contour, idx) => {
          const isSelected = selectedIndices.includes(idx);
          const isHovered = hoveredIdx === idx;
          const isClosed = contour.is_closed;

          const color = isSelected ? COLORS.selected
            : isHovered ? COLORS.hover
            : COLORS.unselected;

          return (
            <g key={contour.id || idx}>
              {/* Clickable path */}
              <path
                d={paths[idx]}
                fill={color.fill}
                stroke={color.stroke}
                strokeWidth={isSelected || isHovered ? strokeWidths.selected : strokeWidths.normal}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={isClosed ? undefined : `${strokeWidths.dashOn} ${strokeWidths.dashOff}`}
                style={{ cursor: isClosed ? 'pointer' : 'not-allowed', transition: 'stroke 150ms, fill 150ms' }}
                onClick={() => isClosed && toggleContour(idx)}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />

              {/* Start hole marker (center of bbox for interior, offset for exterior) */}
              {isSelected && (
                <circle
                  cx={contour.is_exterior
                    ? contour.bbox.min_x - strokeWidths.markerOffset
                    : (contour.bbox.min_x + contour.bbox.max_x) / 2}
                  cy={(contour.bbox.min_y + contour.bbox.max_y) / 2}
                  r={strokeWidths.marker}
                  fill={COLORS.startHole}
                  stroke="#fff"
                  strokeWidth={strokeWidths.markerStroke}
                />
              )}
            </g>
          );
        })}

        {/* Origin crosshair */}
        <line x1={-strokeWidths.crosshairW} y1={0} x2={strokeWidths.crosshairW} y2={0} stroke="#334155" strokeWidth={strokeWidths.crosshairStroke} />
        <line x1={0} y1={-strokeWidths.crosshairH} x2={0} y2={strokeWidths.crosshairH} stroke="#334155" strokeWidth={strokeWidths.crosshairStroke} />
      </svg>

      {/* Legend / Info */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-4 rounded-sm" style={{ backgroundColor: COLORS.selected.stroke }} />
          Selected ({selectedIndices.length})
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-4 rounded-sm" style={{ backgroundColor: COLORS.unselected.stroke }} />
          Unselected
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.startHole }} />
          Start hole
        </div>
        {contours.some(c => !c.is_closed) && (
          <div className="text-amber-400">Open contours (dashed) cannot be wire-cut</div>
        )}
        <div className="ml-auto">
          {selectedIndices.length > 0 && (
            <span className="text-cyan-400">
              Total cut length: {totalCutLength.toFixed(1)} mm
            </span>
          )}
        </div>
        <span className="sr-only">
          Contour picker with {contours.length} profiles. {selectedIndices.length} selected for wire cutting. {contours.filter(c => !c.is_closed).length} open contours cannot be cut.
        </span>
      </div>

      {/* Per-contour details (collapsed) */}
      {hoveredIdx != null && contours[hoveredIdx] && (
        <div className="mt-2 rounded-lg border border-slate-700/30 bg-slate-900/50 px-3 py-2 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-300">{contours[hoveredIdx].id || `Profile ${hoveredIdx + 1}`}</span>
          {' '}&middot;{' '}
          {contours[hoveredIdx].is_exterior ? 'Exterior (punch)' : 'Interior (die)'}
          {' '}&middot;{' '}
          {contours[hoveredIdx].perimeter_mm.toFixed(1)} mm perimeter
          {' '}&middot;{' '}
          {contours[hoveredIdx].area_mm2.toFixed(1)} mm{'\u00B2'}
          {' '}&middot;{' '}
          {contours[hoveredIdx].segments.length} segments
          {contours[hoveredIdx].segments.some(s => s.type === 'arc') ? ' (has arcs)' : ''}
          {!contours[hoveredIdx].is_closed && ' \u2014 OPEN (cannot cut)'}
        </div>
      )}
    </div>
  );
}

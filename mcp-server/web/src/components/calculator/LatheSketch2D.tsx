/**
 * LatheSketch2D — Interactive 2D cross-section sketch for lathe features.
 *
 * Renders the XZ profile of a turned part as clickable SVG regions.
 * Click a feature segment → highlights → FeatureEditorPanel opens that feature.
 * Dimension lines shown for selected feature.
 *
 * Coordinate convention: Z = horizontal (spindle axis), X = vertical (diameter).
 * Origin at spindle face, centerline.
 */

import { useMemo, useCallback, useState } from 'react';
import type { PartFeature } from './FeatureEditorPanel';

interface Props {
  features: PartFeature[];
  selectedFeatureId: string | null;
  onFeatureSelect: (featureId: string | null) => void;
  stockOD_mm?: number;
  partLength_mm?: number;
  height?: number;
}

const COLORS = {
  stock: '#334155',       // slate-700
  selected: '#22d3ee',    // cyan-400
  unselected: '#64748b',  // slate-500
  hover: '#a78bfa',       // violet-400
  centerline: '#475569',  // slate-600
  dimension: '#fbbf24',   // amber-400
  thread: '#a855f7',      // purple-400
  groove: '#f97316',      // orange-400
  bore: '#3b82f6',        // blue-400
  face: '#10b981',        // emerald-400
};

function featureColor(type: string, selected: boolean): string {
  if (selected) return COLORS.selected;
  if (type.includes('THREAD')) return COLORS.thread;
  if (type.includes('GROOVE')) return COLORS.groove;
  if (type.includes('BORE')) return COLORS.bore;
  if (type.includes('FACE') || type.includes('CHAMFER')) return COLORS.face;
  return COLORS.unselected;
}

export function LatheSketch2D({
  features, selectedFeatureId, onFeatureSelect,
  stockOD_mm = 50, partLength_mm = 100, height = 280,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Compute view bounds from stock + features
  const viewBox = useMemo(() => {
    const maxR = stockOD_mm / 2;
    const padding = maxR * 0.3;
    return {
      minZ: -padding,
      maxZ: partLength_mm + padding,
      minX: -(maxR + padding),
      maxX: maxR + padding,
    };
  }, [stockOD_mm, partLength_mm]);

  const svgWidth = useMemo(() => {
    const aspect = (viewBox.maxZ - viewBox.minZ) / (viewBox.maxX - viewBox.minX);
    return Math.round(height * aspect);
  }, [viewBox, height]);

  // Transform world coords to SVG coords
  const toSvg = useCallback((z: number, x: number) => {
    const svgX = ((z - viewBox.minZ) / (viewBox.maxZ - viewBox.minZ)) * svgWidth;
    const svgY = ((viewBox.maxX - x) / (viewBox.maxX - viewBox.minX)) * height;
    return { x: svgX, y: svgY };
  }, [viewBox, svgWidth, height]);

  // Build feature rectangles from dimensions
  const featureRects = useMemo(() => {
    return features.map(f => {
      const od = f.dimensions.find(d => d.key === 'od_mm')?.value ?? stockOD_mm;
      const id = f.dimensions.find(d => d.key === 'id_mm')?.value ?? 0;
      const len = f.dimensions.find(d => d.key === 'length_mm')?.value ?? 20;
      const posZ = f.position_z_mm ?? 0;
      const depth = f.dimensions.find(d => d.key === 'depth_mm')?.value;
      const width = f.dimensions.find(d => d.key === 'width_mm' || d.key === 'groove_width_mm')?.value;

      let zStart = posZ;
      let zEnd = posZ + len;
      let rOuter = od / 2;
      let rInner = id / 2;

      // Groove: narrow + deep
      if (f.type.includes('GROOVE')) {
        const gw = width ?? 3;
        const gd = depth ?? 3;
        zStart = posZ;
        zEnd = posZ + gw;
        rOuter = stockOD_mm / 2;
        rInner = stockOD_mm / 2 - gd;
      }

      return { feature: f, zStart, zEnd, rOuter, rInner };
    });
  }, [features, stockOD_mm]);

  const selectedFeature = features.find(f => f.id === selectedFeatureId);

  return (
    <div className="bg-zinc-950 border border-zinc-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-700">
        <span className="text-[10px] text-zinc-400 uppercase tracking-wide">2D Cross-Section (click to select)</span>
        <span className="text-[10px] text-zinc-500">Z horizontal, X vertical</span>
      </div>
      <svg
        width={svgWidth}
        height={height}
        viewBox={`0 0 ${svgWidth} ${height}`}
        className="w-full"
        aria-label="Lathe part cross-section — click features to select"
      >
        {/* Background stock outline */}
        {(() => {
          const tl = toSvg(0, stockOD_mm / 2);
          const br = toSvg(partLength_mm, -stockOD_mm / 2);
          return (
            <rect
              x={tl.x} y={tl.y}
              width={br.x - tl.x} height={br.y - tl.y}
              fill={COLORS.stock} fillOpacity={0.3}
              stroke={COLORS.stock} strokeWidth={1} strokeDasharray="4 2"
            />
          );
        })()}

        {/* Centerline */}
        {(() => {
          const left = toSvg(viewBox.minZ, 0);
          const right = toSvg(viewBox.maxZ, 0);
          return (
            <line
              x1={left.x} y1={left.y} x2={right.x} y2={right.y}
              stroke={COLORS.centerline} strokeWidth={0.5} strokeDasharray="8 4"
            />
          );
        })()}

        {/* Feature regions (clickable) */}
        {featureRects.map(({ feature, zStart, zEnd, rOuter, rInner }) => {
          const isSelected = feature.id === selectedFeatureId;
          const isHovered = feature.id === hoveredId;
          const color = isHovered ? COLORS.hover : featureColor(feature.type, isSelected);

          // Upper half (above centerline)
          const tlU = toSvg(zStart, rOuter);
          const brU = toSvg(zEnd, Math.max(rInner, 0));
          // Lower half (mirror below centerline)
          const tlL = toSvg(zStart, -Math.max(rInner, 0));
          const brL = toSvg(zEnd, -rOuter);

          return (
            <g key={feature.id}>
              {/* Upper profile */}
              <rect
                x={tlU.x} y={tlU.y}
                width={Math.max(brU.x - tlU.x, 1)} height={Math.max(brU.y - tlU.y, 1)}
                fill={color} fillOpacity={isSelected ? 0.4 : 0.25}
                stroke={color} strokeWidth={isSelected ? 2 : 1}
                rx={1}
                style={{ cursor: 'pointer', transition: 'fill 0.15s, stroke 0.15s' }}
                onClick={(e) => { e.stopPropagation(); onFeatureSelect(isSelected ? null : feature.id); }}
                onMouseEnter={() => setHoveredId(feature.id)}
                onMouseLeave={() => setHoveredId(null)}
              />
              {/* Lower profile (mirror) */}
              <rect
                x={tlL.x} y={tlL.y}
                width={Math.max(brL.x - tlL.x, 1)} height={Math.max(brL.y - tlL.y, 1)}
                fill={color} fillOpacity={isSelected ? 0.4 : 0.25}
                stroke={color} strokeWidth={isSelected ? 2 : 1}
                rx={1}
                style={{ cursor: 'pointer', transition: 'fill 0.15s, stroke 0.15s' }}
                onClick={(e) => { e.stopPropagation(); onFeatureSelect(isSelected ? null : feature.id); }}
                onMouseEnter={() => setHoveredId(feature.id)}
                onMouseLeave={() => setHoveredId(null)}
              />
              {/* Feature label */}
              {(isSelected || isHovered) && (() => {
                const mid = toSvg((zStart + zEnd) / 2, rOuter + 3);
                return (
                  <text x={mid.x} y={mid.y - 4} textAnchor="middle"
                    className="text-[9px] fill-zinc-300 pointer-events-none select-none">
                    {feature.label}
                  </text>
                );
              })()}
            </g>
          );
        })}

        {/* Dimension lines for selected feature */}
        {selectedFeature && (() => {
          const rect = featureRects.find(r => r.feature.id === selectedFeature.id);
          if (!rect) return null;
          const { zStart, zEnd, rOuter } = rect;
          // Length dimension (horizontal)
          const dimY = toSvg(0, -(stockOD_mm / 2 + 8)).y;
          const leftDim = toSvg(zStart, 0);
          const rightDim = toSvg(zEnd, 0);
          const len = selectedFeature.dimensions.find(d => d.key === 'length_mm')?.value ?? (zEnd - zStart);
          // Diameter dimension (vertical)
          const dimX = toSvg(zEnd + 5, 0).x;
          const topDim = toSvg(0, rOuter);
          const botDim = toSvg(0, -rOuter);

          return (
            <g>
              {/* Length dim line */}
              <line x1={leftDim.x} y1={dimY} x2={rightDim.x} y2={dimY}
                stroke={COLORS.dimension} strokeWidth={1} markerEnd="url(#arrow)" markerStart="url(#arrow-rev)" />
              <text x={(leftDim.x + rightDim.x) / 2} y={dimY - 4} textAnchor="middle"
                className="text-[10px] font-mono pointer-events-none select-none" fill={COLORS.dimension}>
                {len.toFixed(1)}
              </text>
              {/* Diameter dim line */}
              <line x1={dimX} y1={topDim.y} x2={dimX} y2={botDim.y}
                stroke={COLORS.dimension} strokeWidth={1} />
              <text x={dimX + 6} y={(topDim.y + botDim.y) / 2 + 3} textAnchor="start"
                className="text-[10px] font-mono pointer-events-none select-none" fill={COLORS.dimension}>
                {(rOuter * 2).toFixed(1)}
              </text>
            </g>
          );
        })()}

        {/* Arrow markers */}
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
            <path d="M0,0 L6,2 L0,4" fill={COLORS.dimension} />
          </marker>
          <marker id="arrow-rev" markerWidth="6" markerHeight="4" refX="1" refY="2" orient="auto-start-reverse">
            <path d="M6,0 L0,2 L6,4" fill={COLORS.dimension} />
          </marker>
        </defs>
      </svg>
    </div>
  );
}

/**
 * ToolingSvg -- renders the design's SVG kinematics / tooling-layout view.
 * Consumes the pre-computed arrays from computeCribVals (slots, toolShapes,
 * ctxRects, ctxLines, ctxCircles, svgLabels). No logic here -- pure render.
 * SVG viewBox mirrors the design: 720x392.
 */

import type {
  SlotMarker,
  ToolShape,
  SvgRect,
  SvgLine,
  SvgCircle,
  SvgLabel,
} from '../../lib/toolCribGeometry';

interface Props {
  slots: SlotMarker[];
  toolShapes: ToolShape[];
  ctxRects: SvgRect[];
  ctxLines: SvgLine[];
  ctxCircles: SvgCircle[];
  svgLabels: SvgLabel[];
  onSelectStation: (stn: number) => void;
}

export function ToolingSvg({
  slots,
  toolShapes,
  ctxRects,
  ctxLines,
  ctxCircles,
  svgLabels,
  onSelectStation,
}: Props) {
  return (
    <svg
      viewBox="0 0 720 392"
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      style={{ display: 'block' }}
    >
      {/* shared context shapes */}
      {ctxRects.map((c, i) => (
        <rect
          key={i}
          x={c.x} y={c.y} width={c.w} height={c.h} rx={c.r}
          fill={c.fill} stroke={c.stroke} strokeWidth={1}
          strokeDasharray={c.dash || undefined}
        />
      ))}
      {ctxLines.map((l, i) => (
        <line
          key={i}
          x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={l.c} strokeWidth={l.w}
          strokeDasharray={l.dash || undefined}
        />
      ))}
      {ctxCircles.map((c, i) => (
        <circle
          key={i}
          cx={c.cx} cy={c.cy} r={c.r}
          fill={c.fill} stroke={c.stroke} strokeWidth={c.sw}
          strokeDasharray={c.dash || undefined}
        />
      ))}
      {/* to-scale tool shapes (tooling view) */}
      {toolShapes.map((t, i) => (
        <g key={i} transform={t.transform || undefined}>
          <rect
            x={t.hx} y={t.hy} width={t.hw} height={t.hh} rx={2}
            fill={t.holderFill} stroke={t.holderStroke} strokeWidth={1}
          />
          <line
            x1={t.tx1} y1={t.ty1} x2={t.tx2} y2={t.ty2}
            stroke={t.toolColor} strokeWidth={t.toolW}
            strokeLinecap="round"
          />
        </g>
      ))}
      {/* station/pocket markers */}
      {slots.map((s, i) => (
        <g key={i} style={{ cursor: 'pointer' }} onClick={() => onSelectStation(s.label)}>
          <circle
            cx={s.cx} cy={s.cy} r={s.r}
            fill={s.fill} stroke={s.stroke} strokeWidth={s.sw}
          />
          <text
            x={s.cx} y={s.ty}
            textAnchor="middle"
            fontFamily="JetBrains Mono, ui-monospace, monospace"
            fontSize={10}
            fontWeight={700}
            fill={s.tc}
            style={{ pointerEvents: 'none' }}
          >
            {s.label}
          </text>
        </g>
      ))}
      {svgLabels.map((t, i) => (
        <text
          key={i}
          x={t.x} y={t.y}
          textAnchor={t.anchor as 'start' | 'middle' | 'end'}
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          fontSize={t.size}
          fill={t.fill}
        >
          {t.t}
        </text>
      ))}
    </svg>
  );
}

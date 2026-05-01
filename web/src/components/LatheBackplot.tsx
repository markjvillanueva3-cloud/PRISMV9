import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ActionButton } from './workspace/WorkspacePrimitives';

// ── Types ───────────────────────────────────────────────────────────────────

export type MoveType = 'rapid' | 'roughing' | 'finishing' | 'groove' | 'thread';

export interface BackplotMove {
  x: number; // diameter (X axis in lathe convention)
  z: number; // length along spindle axis
  type: MoveType;
}

// ── Color map ───────────────────────────────────────────────────────────────

const MOVE_COLORS: Record<MoveType, string> = {
  rapid: '#ef4444',     // red
  roughing: '#3b82f6',  // blue
  finishing: '#22c55e',  // green
  groove: '#f97316',     // orange
  thread: '#a855f7',     // purple
};

const MOVE_LABELS: Record<MoveType, string> = {
  rapid: 'Rapid (no cutting)',
  roughing: 'Roughing',
  finishing: 'Finishing',
  groove: 'Grooving / Part-off',
  thread: 'Threading',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function computeBounds(moves: BackplotMove[]) {
  if (moves.length === 0) return { minX: 0, maxX: 60, minZ: -100, maxZ: 10 };

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const m of moves) {
    if (m.x < minX) minX = m.x;
    if (m.x > maxX) maxX = m.x;
    if (m.z < minZ) minZ = m.z;
    if (m.z > maxZ) maxZ = m.z;
  }

  // Add padding (10% of range)
  const padX = Math.max((maxX - minX) * 0.1, 5);
  const padZ = Math.max((maxZ - minZ) * 0.1, 5);
  return {
    minX: minX - padX,
    maxX: maxX + padX,
    minZ: minZ - padZ,
    maxZ: maxZ + padZ,
  };
}

// ── Speeds ──────────────────────────────────────────────────────────────────

const SPEED_OPTIONS = [
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '5x', value: 5 },
  { label: '10x', value: 10 },
];

// ── Component ───────────────────────────────────────────────────────────────

interface LatheBackplotProps {
  moves: BackplotMove[];
}

export function LatheBackplot({ moves }: LatheBackplotProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number>(0);
  const gridId = useId();

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [visibleCount, setVisibleCount] = useState(moves.length);
  const visibleCountRef = useRef(visibleCount);
  useEffect(() => { visibleCountRef.current = visibleCount; }, [visibleCount]);

  const bounds = useMemo(() => computeBounds(moves), [moves]);

  // SVG viewBox dimensions
  const svgWidth = 800;
  const svgHeight = 400;

  // Transform from machine coords (Z horizontal, X vertical) to SVG coords
  const toSvg = useCallback(
    (z: number, x: number): { sx: number; sy: number } => {
      const rangeZ = bounds.maxZ - bounds.minZ;
      const rangeX = bounds.maxX - bounds.minX;

      // Z maps to horizontal (left = positive Z, right = negative Z for conventional lathe display)
      // Actually: Z positive = right (toward tailstock), Z negative = left (toward chuck)
      // For display: left = chuck (Z negative), right = tailstock (Z positive)
      const sx = ((z - bounds.minZ) / rangeZ) * svgWidth;

      // X maps to vertical (larger X = further from centerline = top AND bottom in mirror)
      // Show top half only (centerline at bottom)
      const sy = svgHeight - ((x - bounds.minX) / rangeX) * svgHeight;

      return { sx, sy };
    },
    [bounds],
  );

  // Build path segments
  const segments = useMemo(() => {
    const result: { d: string; type: MoveType; index: number }[] = [];
    for (let i = 1; i < moves.length; i++) {
      const from = toSvg(moves[i - 1].z, moves[i - 1].x);
      const to = toSvg(moves[i].z, moves[i].x);
      result.push({
        d: `M ${from.sx} ${from.sy} L ${to.sx} ${to.sy}`,
        type: moves[i].type,
        index: i,
      });
    }
    return result;
  }, [moves, toSvg]);

  // Centerline Y position
  const centerlineY = useMemo(() => {
    const rangeX = bounds.maxX - bounds.minX;
    return svgHeight - ((0 - bounds.minX) / rangeX) * svgHeight;
  }, [bounds]);

  // Animation loop
  useEffect(() => {
    if (!playing) return;

    let current = visibleCountRef.current < moves.length ? visibleCountRef.current : 0;
    setVisibleCount(current);

    const msPerMove = 200 / speed;
    let lastTime = 0;

    function animate(timestamp: number) {
      if (!lastTime) lastTime = timestamp;
      const elapsed = timestamp - lastTime;

      if (elapsed >= msPerMove) {
        current = Math.min(current + 1, moves.length);
        setVisibleCount(current);
        lastTime = timestamp;

        if (current >= moves.length) {
          setPlaying(false);
          return;
        }
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      animRef.current = 0;
    };
  }, [playing, speed, moves.length]);

  const handlePlayPause = useCallback(() => {
    if (playing) {
      setPlaying(false);
    } else {
      if (visibleCount >= moves.length) setVisibleCount(0);
      setPlaying(true);
    }
  }, [playing, visibleCount, moves.length]);

  const handleReset = useCallback(() => {
    setPlaying(false);
    setVisibleCount(moves.length);
  }, [moves.length]);

  // Active move types for legend
  const activeMoveTypes = useMemo(() => {
    const types = new Set<MoveType>();
    for (const m of moves) types.add(m.type);
    return Array.from(types);
  }, [moves]);

  return (
    <div className="flex flex-col gap-4">
      {/* SVG viewport */}
      <div className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="h-auto w-full"
          style={{ minHeight: 300 }}
        >
          {/* Background grid */}
          <defs>
            <pattern id={gridId} width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={svgWidth} height={svgHeight} fill={`url(#${gridId})`} />

          {/* Centerline (spindle axis) */}
          <line
            x1={0}
            y1={centerlineY}
            x2={svgWidth}
            y2={centerlineY}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
            strokeDasharray="8 4"
          />
          <text x={4} y={centerlineY - 4} fill="rgba(255,255,255,0.25)" fontSize="10" fontFamily="monospace">
            <title>Spindle centerline — the axis the part rotates around</title>
            Spindle center
          </text>

          {/* Toolpath segments */}
          {segments.map((seg, i) => {
            if (seg.index > visibleCount) return null;
            const color = MOVE_COLORS[seg.type];
            const isRapid = seg.type === 'rapid';
            return (
              <path
                key={i}
                d={seg.d}
                fill="none"
                stroke={color}
                strokeWidth={isRapid ? 1 : 2}
                strokeDasharray={isRapid ? '6 3' : undefined}
                opacity={seg.index === visibleCount ? 1 : 0.8}
              />
            );
          })}

          {/* Current tool position indicator */}
          {visibleCount > 0 && visibleCount <= moves.length && (() => {
            const currentMove = moves[Math.min(visibleCount, moves.length) - 1];
            const pos = toSvg(currentMove.z, currentMove.x);
            return (
              <g>
                <circle cx={pos.sx} cy={pos.sy} r="5" fill="white" opacity="0.9" />
                <circle cx={pos.sx} cy={pos.sy} r="8" fill="none" stroke="white" strokeWidth="1" opacity="0.4" />
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <ActionButton onClick={handlePlayPause}>
          {playing ? 'Pause' : visibleCount >= moves.length ? 'Replay' : 'Play'}
        </ActionButton>
        <ActionButton onClick={handleReset}>
          Show All
        </ActionButton>

        {/* Speed selector */}
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
          {SPEED_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSpeed(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                speed === opt.value
                  ? 'bg-cyan-300/20 text-cyan-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Scrubber */}
        <div className="flex flex-1 items-center gap-2">
          <input
            type="range"
            min={0}
            max={moves.length}
            value={visibleCount}
            aria-label="Toolpath playback position"
            aria-valuetext={`Move ${visibleCount} of ${moves.length}`}
            onChange={e => {
              setPlaying(false);
              setVisibleCount(parseInt(e.target.value, 10));
            }}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 accent-cyan-400"
          />
          <span aria-live="polite" aria-atomic="true" className="min-w-[4rem] text-right text-xs text-slate-400">
            {visibleCount}/{moves.length}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {activeMoveTypes.map(type => (
          <div key={type} className="flex items-center gap-2">
            <svg width="24" height="4">
              <line
                x1="0" y1="2" x2="24" y2="2"
                stroke={MOVE_COLORS[type]}
                strokeWidth="2"
                strokeDasharray={type === 'rapid' ? '6 3' : undefined}
              />
            </svg>
            <span className="text-xs text-slate-400">{MOVE_LABELS[type]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

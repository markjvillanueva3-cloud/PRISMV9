/**
 * L9-P2-MS1 P0-U03: ToolpathLayer — Toolpath 3D Renderer
 *
 * Renders toolpath line segments from scene graph data with:
 *   - Color modes: by_type, by_feed, by_speed, by_tool, uniform
 *   - Rapid moves dashed, cutting moves solid
 *   - Playback animation: marker follows path at adjustable speed
 *   - Toggle individual operations visible/hidden
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Color, Float32BufferAttribute, type Mesh } from 'three';
import type {
  ToolpathLineData,
  ToolpathSegment,
  ColorMode,
} from '../../types/viewer';

// ── Color Computation ────────────────────────────────────────────────

function segmentColor(
  seg: ToolpathSegment,
  mode: ColorMode,
  feedRange: [number, number],
  speedRange: [number, number]
): [number, number, number] {
  switch (mode) {
    case 'by_type': {
      if (seg.type === 'rapid') return [1, 0.8, 0];
      if (seg.type === 'plunge') return [1, 0.2, 0.2];
      if (seg.type === 'arc_cw' || seg.type === 'arc_ccw') return [0.2, 1, 0.2];
      return [0, 0.7, 1]; // feed
    }
    case 'by_feed': {
      const [min, max] = feedRange;
      const t = max > min
        ? ((seg.feed_rate ?? 0) - min) / (max - min)
        : 0.5;
      return [t, 0.3, 1 - t];
    }
    case 'by_speed': {
      const [min, max] = speedRange;
      const t = max > min
        ? ((seg.spindle_rpm ?? 0) - min) / (max - min)
        : 0.5;
      return [t, 1 - t, 0.2];
    }
    case 'by_tool': {
      const toolHash = hashString(seg.tool_id ?? 'T01');
      return hueToRgb(toolHash % 360);
    }
    case 'uniform':
    default:
      return [0, 0.7, 1];
  }
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function hueToRgb(hue: number): [number, number, number] {
  const c = new Color();
  c.setHSL(hue / 360, 0.8, 0.55);
  return [c.r, c.g, c.b];
}

// ── Range Computation ────────────────────────────────────────────────

function computeRanges(
  segments: ToolpathSegment[]
): { feedRange: [number, number]; speedRange: [number, number] } {
  let minFeed = Infinity, maxFeed = -Infinity;
  let minSpeed = Infinity, maxSpeed = -Infinity;

  for (const seg of segments) {
    if (seg.feed_rate != null) {
      minFeed = Math.min(minFeed, seg.feed_rate);
      maxFeed = Math.max(maxFeed, seg.feed_rate);
    }
    if (seg.spindle_rpm != null) {
      minSpeed = Math.min(minSpeed, seg.spindle_rpm);
      maxSpeed = Math.max(maxSpeed, seg.spindle_rpm);
    }
  }

  return {
    feedRange: [
      isFinite(minFeed) ? minFeed : 0,
      isFinite(maxFeed) ? maxFeed : 1,
    ],
    speedRange: [
      isFinite(minSpeed) ? minSpeed : 0,
      isFinite(maxSpeed) ? maxSpeed : 1,
    ],
  };
}

// ── Playback Marker ──────────────────────────────────────────────────

interface PlaybackMarkerProps {
  positions: Float32Array;
  progress: number;
}

function PlaybackMarker({ positions, progress }: PlaybackMarkerProps) {
  const meshRef = useRef<Mesh>(null);
  const totalPoints = positions.length / 3;
  const pointIndex = Math.min(
    Math.floor(progress * totalPoints),
    totalPoints - 1
  );

  const x = positions[pointIndex * 3] ?? 0;
  const y = positions[pointIndex * 3 + 1] ?? 0;
  const z = positions[pointIndex * 3 + 2] ?? 0;

  return (
    <mesh ref={meshRef} position={[x, y, z]}>
      <sphereGeometry args={[2, 12, 12]} />
      <meshBasicMaterial color="#ff4444" />
    </mesh>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export interface ToolpathLayerProps {
  toolpath: ToolpathLineData;
  colorMode?: ColorMode;
  /** Set of segment types to hide */
  hiddenTypes?: Set<string>;
  /** Playback progress 0..1, undefined = no playback */
  playbackProgress?: number;
  /** Whether to animate the playback marker */
  animating?: boolean;
  /** Playback speed multiplier */
  playbackSpeed?: number;
  visible?: boolean;
}

export function ToolpathLayer({
  toolpath,
  colorMode = 'by_type',
  hiddenTypes,
  playbackProgress,
  visible = true,
}: ToolpathLayerProps) {
  const { feedRange, speedRange } = useMemo(
    () => computeRanges(toolpath.segments),
    [toolpath.segments]
  );

  // Build feed line geometry (solid cutting moves)
  const feedGeometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];

    for (const seg of toolpath.segments) {
      if (seg.type === 'rapid') continue;
      if (hiddenTypes?.has(seg.type)) continue;

      const pts = seg.points;
      const [r, g, b] = segmentColor(
        seg, colorMode, feedRange, speedRange
      );

      for (let i = 0; i < pts.length - 3; i += 3) {
        positions.push(
          pts[i], pts[i + 1], pts[i + 2],
          pts[i + 3], pts[i + 4], pts[i + 5]
        );
        colors.push(r, g, b, r, g, b);
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
  }, [toolpath, colorMode, feedRange, speedRange, hiddenTypes]);

  // Build rapid line geometry (dashed)
  const rapidGeometry = useMemo(() => {
    const positions: number[] = [];

    for (const seg of toolpath.segments) {
      if (seg.type !== 'rapid') continue;
      if (hiddenTypes?.has('rapid')) continue;

      const pts = seg.points;
      for (let i = 0; i < pts.length - 3; i += 3) {
        positions.push(
          pts[i], pts[i + 1], pts[i + 2],
          pts[i + 3], pts[i + 4], pts[i + 5]
        );
      }
    }

    const geom = new BufferGeometry();
    geom.setAttribute(
      'position',
      new Float32BufferAttribute(positions, 3)
    );
    geom.computeBoundingSphere();
    return geom;
  }, [toolpath, hiddenTypes]);

  // All positions for playback marker
  const allPositions = useMemo(() => {
    const pos: number[] = [];
    for (const seg of toolpath.segments) {
      const pts = seg.points;
      for (let i = 0; i < pts.length; i += 3) {
        pos.push(pts[i], pts[i + 1], pts[i + 2]);
      }
    }
    return new Float32Array(pos);
  }, [toolpath]);

  if (!visible) return null;

  return (
    <group name="toolpath-layer">
      {/* Feed/cutting moves — solid lines */}
      <lineSegments geometry={feedGeometry}>
        <lineBasicMaterial vertexColors linewidth={1} />
      </lineSegments>

      {/* Rapid moves — dashed lines */}
      <lineSegments geometry={rapidGeometry}>
        <lineDashedMaterial
          color="#ffcc00"
          dashSize={3}
          gapSize={2}
          linewidth={1}
        />
      </lineSegments>

      {/* Playback marker */}
      {playbackProgress != null && allPositions.length > 0 && (
        <PlaybackMarker
          positions={allPositions}
          progress={playbackProgress}
        />
      )}
    </group>
  );
}

// ── Animated Toolpath Wrapper ────────────────────────────────────────

export interface AnimatedToolpathProps extends ToolpathLayerProps {
  playing?: boolean;
  speed?: number;
  onProgressChange?: (progress: number) => void;
}

export function AnimatedToolpath({
  playing = false,
  speed = 1,
  onProgressChange,
  ...rest
}: AnimatedToolpathProps) {
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    if (!playing) return;
    progressRef.current += delta * speed * 0.1;
    if (progressRef.current > 1) progressRef.current = 0;
    onProgressChange?.(progressRef.current);
  });

  return (
    <ToolpathLayer
      {...rest}
      playbackProgress={playing ? progressRef.current : rest.playbackProgress}
    />
  );
}

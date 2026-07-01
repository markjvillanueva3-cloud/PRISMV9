/**
 * WireEdmContour3D — Three.js extrusion viewer for wire EDM contours
 *
 * Extrudes 2D contours to part thickness, letting the user visualize
 * the 3D part and pick faces/walls for taper or multi-axis cuts.
 *
 * Uses existing Three.js + @react-three/fiber stack from Viewer3D.
 */
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, Grid } from '@react-three/drei';
import * as THREE from 'three';

// ── Types ───────────────────────────────────────────────────────────

interface Point2D { x: number; y: number }

interface LineSegment { type: 'line'; start: Point2D; end: Point2D }
interface ArcSegment {
  type: 'arc'; start: Point2D; end: Point2D;
  center: Point2D; radius: number;
  start_angle_rad: number; end_angle_rad: number;
  ccw: boolean;
}
type Segment = LineSegment | ArcSegment;

interface ContourData {
  id: string;
  segments: Segment[];
  is_closed: boolean;
  is_exterior: boolean;
  perimeter_mm: number;
  area_mm2: number;
  bbox: { min_x: number; min_y: number; max_x: number; max_y: number };
}

interface Props {
  contours: ContourData[];
  selectedIndices: number[];
  thickness_mm: number;
  /** Callback when user clicks a wall face — returns contour index + face side */
  onWallSelect?: (contourIdx: number, side: 'top' | 'bottom' | 'wall') => void;
  height?: number;
}

// ── Contour → THREE.Shape ───────────────────────────────────────────

function contourToShape(contour: ContourData): THREE.Shape | null {
  if (!contour.is_closed || contour.segments.length === 0) return null;

  const shape = new THREE.Shape();
  const first = contour.segments[0];
  shape.moveTo(first.start.x, first.start.y);

  for (const seg of contour.segments) {
    if (seg.type === 'line') {
      shape.lineTo(seg.end.x, seg.end.y);
    } else {
      // Arc → approximate with small line segments for Three.js Shape
      const arc = seg as ArcSegment;
      const steps = Math.max(8, Math.ceil(Math.abs(arc.end_angle_rad - arc.start_angle_rad) / (Math.PI / 16)));
      let startAngle = arc.start_angle_rad;
      let endAngle = arc.end_angle_rad;

      // Normalize sweep
      if (arc.ccw) {
        while (endAngle <= startAngle) endAngle += 2 * Math.PI;
      } else {
        while (endAngle >= startAngle) endAngle -= 2 * Math.PI;
      }

      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const angle = startAngle + (endAngle - startAngle) * t;
        const px = arc.center.x + arc.radius * Math.cos(angle);
        const py = arc.center.y + arc.radius * Math.sin(angle);
        shape.lineTo(px, py);
      }
    }
  }

  shape.closePath();
  return shape;
}

// ── Extruded Contour Mesh ───────────────────────────────────────────

function ExtrudedContour({
  contour,
  thickness,
  isSelected,
  contourIdx,
  onWallSelect,
}: {
  contour: ContourData;
  thickness: number;
  isSelected: boolean;
  contourIdx: number;
  onWallSelect?: (contourIdx: number, side: 'top' | 'bottom' | 'wall') => void;
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const shape = contourToShape(contour);
    if (!shape) return null;

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: thickness,
      bevelEnabled: false,
      steps: 1,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [contour, thickness]);

  if (!geometry) return null;

  const color = isSelected
    ? (hovered ? '#67e8f9' : '#22d3ee')  // cyan-300 / cyan-400
    : (hovered ? '#94a3b8' : '#475569'); // slate-400 / slate-600

  const opacity = isSelected ? 0.7 : 0.3;

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onClick={(e) => {
        e.stopPropagation();
        if (!onWallSelect) return;
        // Determine which face was clicked based on normal
        const normal = e.face?.normal;
        if (!normal) return;
        if (Math.abs(normal.z) > 0.9) {
          onWallSelect(contourIdx, normal.z > 0 ? 'top' : 'bottom');
        } else {
          onWallSelect(contourIdx, 'wall');
        }
      }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Wireframe Outline ───────────────────────────────────────────────

function ContourWireframe({ contour, thickness }: { contour: ContourData; thickness: number }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (const seg of contour.segments) {
      pts.push(new THREE.Vector3(seg.start.x, seg.start.y, 0));
      if (seg.type === 'arc') {
        const arc = seg as ArcSegment;
        const steps = Math.max(8, Math.ceil(Math.abs(arc.end_angle_rad - arc.start_angle_rad) / (Math.PI / 16)));
        let startAngle = arc.start_angle_rad;
        let endAngle = arc.end_angle_rad;
        if (arc.ccw) { while (endAngle <= startAngle) endAngle += 2 * Math.PI; }
        else { while (endAngle >= startAngle) endAngle -= 2 * Math.PI; }
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const angle = startAngle + (endAngle - startAngle) * t;
          pts.push(new THREE.Vector3(
            arc.center.x + arc.radius * Math.cos(angle),
            arc.center.y + arc.radius * Math.sin(angle),
            0,
          ));
        }
      }
    }
    if (contour.is_closed && pts.length > 0) pts.push(pts[0].clone());
    return pts;
  }, [contour]);

  const topPoints = useMemo(() => points.map(p => new THREE.Vector3(p.x, p.y, thickness)), [points, thickness]);

  const bottomGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  const topGeo = useMemo(() => new THREE.BufferGeometry().setFromPoints(topPoints), [topPoints]);

  // R3F's <line> intrinsic collides with the SVG line type in stricter TS; build
  // the THREE.Line objects up front and mount via <primitive> to dodge the
  // JSX.IntrinsicElements ambiguity (drei's <Line> would be an alternative but
  // we already have BufferGeometry instances in hand).
  const bottomLine = useMemo(
    () => new THREE.Line(bottomGeo, new THREE.LineBasicMaterial({ color: '#22d3ee', linewidth: 1 })),
    [bottomGeo],
  );
  const topLine = useMemo(
    () => new THREE.Line(topGeo, new THREE.LineBasicMaterial({ color: '#22d3ee', linewidth: 1, opacity: 0.5, transparent: true })),
    [topGeo],
  );
  return (
    <group>
      <primitive object={bottomLine} />
      <primitive object={topLine} />
    </group>
  );
}

// ── Wire Path Visualization ─────────────────────────────────────────

function WirePath({ contour, thickness }: { contour: ContourData; thickness: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Animate wire position
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += delta * 0.5;
    }
  });

  // Show wire as a thin cylinder at the start hole position
  const cx = contour.is_exterior
    ? contour.bbox.min_x - 5
    : (contour.bbox.min_x + contour.bbox.max_x) / 2;
  const cy = (contour.bbox.min_y + contour.bbox.max_y) / 2;

  return (
    <mesh ref={meshRef} position={[cx, cy, thickness / 2]}>
      <cylinderGeometry args={[0.125, 0.125, thickness * 1.2, 8]} />
      <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.3} />
    </mesh>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export function WireEdmContour3D({ contours, selectedIndices, thickness_mm, onWallSelect, height = 400 }: Props) {
  const [viewMode, setViewMode] = useState<'solid' | 'wireframe' | 'xray'>('solid');
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // U-WH19: Pause Three.js rAF when canvas scrolls out of view
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Compute center for camera target
  const center = useMemo(() => {
    if (contours.length === 0) return [0, 0, 0] as [number, number, number];
    let cx = 0, cy = 0;
    for (const c of contours) {
      cx += (c.bbox.min_x + c.bbox.max_x) / 2;
      cy += (c.bbox.min_y + c.bbox.max_y) / 2;
    }
    cx /= contours.length;
    cy /= contours.length;
    return [cx, cy, thickness_mm / 2] as [number, number, number];
  }, [contours, thickness_mm]);

  // Camera distance based on part size
  const camDist = useMemo(() => {
    let maxSpan = 50;
    for (const c of contours) {
      maxSpan = Math.max(maxSpan, c.bbox.max_x - c.bbox.min_x, c.bbox.max_y - c.bbox.min_y);
    }
    return maxSpan * 2;
  }, [contours]);

  if (contours.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-slate-700/40 bg-[#0c1522] p-8 text-sm text-slate-500" style={{ height }}>
        No geometry to display in 3D.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-2xl border border-slate-700/40 bg-[#0c1522] overflow-hidden"
      style={{ height }}
      role="img"
      aria-label={`3D wire EDM part view: ${contours.length} contours, ${selectedIndices.length} selected, ${thickness_mm} mm thick. ${viewMode} mode.`}
    >
      {/* Toolbar */}
      <div className="absolute z-10 m-2 flex gap-1">
        {(['solid', 'wireframe', 'xray'] as const).map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest transition ${
              viewMode === mode
                ? 'bg-cyan-600/40 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800/60 text-slate-500 border border-slate-700/30 hover:text-slate-400'
            }`}
          >
            {mode}
          </button>
        ))}
        <span className="ml-2 rounded bg-slate-800/60 px-2 py-0.5 text-[10px] text-slate-500">
          Click a face to select wall for taper
        </span>
      </div>

      {/* U-WH19: Only mount Canvas when visible to save GPU/CPU */}
      {!isVisible ? (
        <div className="flex h-full items-center justify-center text-xs text-slate-600">
          Scroll into view to render 3D
        </div>
      ) : (
      <Canvas
        camera={{
          position: [center[0] + camDist * 0.5, center[1] - camDist * 0.5, center[2] + camDist * 0.7],
          fov: 45,
          near: 0.1,
          far: camDist * 10,
        }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#060d17']} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[camDist, camDist, camDist]} intensity={0.8} />
        <directionalLight position={[-camDist, -camDist, camDist * 0.5]} intensity={0.3} />

        <OrbitControls
          target={center}
          enableDamping
          dampingFactor={0.12}
          minDistance={camDist * 0.2}
          maxDistance={camDist * 5}
        />

        <Grid
          args={[camDist * 2, camDist * 2]}
          cellSize={10}
          cellColor="#1e293b"
          sectionSize={50}
          sectionColor="#334155"
          fadeDistance={camDist * 3}
          position={[center[0], center[1], -0.1]}
        />

        {/* Render contours */}
        {contours.map((contour, idx) => {
          const isSelected = selectedIndices.includes(idx);
          if (!contour.is_closed) return null;

          return (
            <group key={contour.id || idx}>
              <ExtrudedContour
                contour={contour}
                thickness={thickness_mm}
                isSelected={isSelected}
                contourIdx={idx}
                onWallSelect={onWallSelect}
              />
              {(viewMode === 'wireframe' || viewMode === 'xray') && (
                <ContourWireframe contour={contour} thickness={thickness_mm} />
              )}
              {isSelected && (
                <WirePath contour={contour} thickness={thickness_mm} />
              )}
            </group>
          );
        })}

        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport labelColor="white" axisHeadScale={0.8} />
        </GizmoHelper>
      </Canvas>
      )}
    </div>
  );
}

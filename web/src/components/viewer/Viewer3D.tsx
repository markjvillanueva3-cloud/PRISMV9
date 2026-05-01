/**
 * L9-P2-MS1 P0-U01: Viewer3D — Base 3D Scene Component
 *
 * Three.js canvas with orbit controls, grid helper, axes helper,
 * camera presets with smooth transitions, and configurable lighting.
 * Consumes VisualizationEngine scene graphs.
 */
import { useRef, useCallback, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, Grid } from '@react-three/drei';
import { Vector3 } from 'three';
import type { ViewPreset, SceneGraph } from '../../types/viewer';

// ── Camera Preset Positions ──────────────────────────────────────────

const CAMERA_POSITIONS: Record<ViewPreset, [number, number, number]> = {
  front:    [0, 0, 500],
  back:     [0, 0, -500],
  top:      [0, 500, 0],
  bottom:   [0, -500, 0],
  left:     [-500, 0, 0],
  right:    [500, 0, 0],
  iso:      [289, 289, 289],
  iso_rear: [-289, 289, -289],
};

// ── Scene Lighting ───────────────────────────────────────────────────

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#ffffff" />
      <directionalLight
        position={[200, 400, 300]}
        intensity={0.8}
        color="#fffff0"
        castShadow
      />
      <directionalLight
        position={[-100, 200, -100]}
        intensity={0.3}
        color="#99aacc"
      />
    </>
  );
}

// ── Axes Helper ──────────────────────────────────────────────────────

function AxesDisplay({ size = 100 }: { size?: number }) {
  return <axesHelper args={[size]} />;
}

// ── Camera Controller ────────────────────────────────────────────────

interface CameraControllerProps {
  preset: ViewPreset;
  onPresetApplied: () => void;
}

function CameraController({ preset, onPresetApplied }: CameraControllerProps) {
  const { camera } = useThree();
  const prevPreset = useRef<ViewPreset | null>(null);

  useEffect(() => {
    if (preset === prevPreset.current) return;
    prevPreset.current = preset;

    const target = CAMERA_POSITIONS[preset];
    const startPos = camera.position.clone();
    const endPos = new Vector3(...target);
    const duration = 600;
    const startTime = performance.now();

    function animate() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Smooth ease-in-out
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      camera.position.lerpVectors(startPos, endPos, ease);
      camera.lookAt(0, 0, 0);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        onPresetApplied();
      }
    }

    animate();
  }, [preset, camera, onPresetApplied]);

  return null;
}

// ── Main Viewer3D Component ──────────────────────────────────────────

export interface Viewer3DProps {
  /** Scene graph from VisualizationEngine (optional — renders empty scene if absent) */
  scene?: SceneGraph;
  /** Current camera view preset */
  viewPreset?: ViewPreset;
  /** Called when camera animation finishes */
  onPresetApplied?: () => void;
  /** Show grid helper */
  showGrid?: boolean;
  /** Show axes helper */
  showAxes?: boolean;
  /** Show orientation gizmo */
  showGizmo?: boolean;
  /** Background color (CSS) */
  backgroundColor?: string;
  /** Children for additional 3D layers (toolpath, stock, heatmap, etc.) */
  children?: React.ReactNode;
  /** Class for the container div */
  className?: string;
}

export function Viewer3D({
  viewPreset = 'iso',
  onPresetApplied,
  showGrid = true,
  showAxes = true,
  showGizmo = true,
  backgroundColor = '#262630',
  children,
  className = '',
}: Viewer3DProps) {
  const [activePreset, setActivePreset] = useState<ViewPreset>(viewPreset);
  const controlsRef = useRef(null);

  // Sync external preset changes
  useEffect(() => {
    setActivePreset(viewPreset);
  }, [viewPreset]);

  const handlePresetApplied = useCallback(() => {
    onPresetApplied?.();
  }, [onPresetApplied]);

  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        camera={{
          position: CAMERA_POSITIONS[activePreset],
          fov: 45,
          near: 0.1,
          far: 50000,
          up: [0, 1, 0],
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        style={{ background: backgroundColor }}
        dpr={[1, 2]}
      >
        {/* Lighting */}
        <SceneLighting />

        {/* Camera controls */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.12}
          minDistance={10}
          maxDistance={10000}
          target={[0, 0, 0]}
        />

        {/* Camera preset animator */}
        <CameraController
          preset={activePreset}
          onPresetApplied={handlePresetApplied}
        />

        {/* Grid */}
        {showGrid && (
          <Grid
            args={[500, 500]}
            cellSize={10}
            cellThickness={0.5}
            cellColor="#404050"
            sectionSize={50}
            sectionThickness={1}
            sectionColor="#505068"
            fadeDistance={800}
            fadeStrength={1}
            infiniteGrid
          />
        )}

        {/* Axes */}
        {showAxes && <AxesDisplay size={100} />}

        {/* Orientation gizmo */}
        {showGizmo && (
          <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
            <GizmoViewport
              axisColors={['#ff4444', '#44ff44', '#4444ff']}
              labelColor="white"
            />
          </GizmoHelper>
        )}

        {/* Additional 3D content (toolpath layers, stock meshes, etc.) */}
        {children}
      </Canvas>
    </div>
  );
}

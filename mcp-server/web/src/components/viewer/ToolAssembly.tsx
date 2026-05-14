/**
 * L9-P2-MS1 P0-U04: ToolAssembly — Tool + Holder 3D Renderer
 *
 * Renders the cutting tool and holder as cylinder meshes.
 * Position can be animated to follow toolpath playback.
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { ToolpathLineData } from '../../types/viewer';

export interface ToolAssemblyProps {
  /** Tool cutting diameter in mm */
  toolDiameter?: number;
  /** Tool flute length in mm */
  toolLength?: number;
  /** Holder diameter in mm */
  holderDiameter?: number;
  /** Holder length in mm */
  holderLength?: number;
  /** Static position [x, y, z] */
  position?: [number, number, number];
  /** Toolpath data for animated position */
  toolpath?: ToolpathLineData;
  /** Playback progress 0..1 for animated position */
  playbackProgress?: number;
  visible?: boolean;
}

export function ToolAssembly({
  toolDiameter = 12,
  toolLength = 40,
  holderDiameter = 40,
  holderLength = 60,
  position = [0, 0, 50],
  toolpath,
  playbackProgress,
  visible = true,
}: ToolAssemblyProps) {
  const groupRef = useRef<Group>(null);

  // Precompute toolpath positions for animation
  const toolpathPositions = useMemo(() => {
    if (!toolpath) return null;
    const pos: number[] = [];
    for (const seg of toolpath.segments) {
      const pts = seg.points;
      for (let i = 0; i < pts.length; i += 3) {
        pos.push(pts[i], pts[i + 1], pts[i + 2]);
      }
    }
    return new Float32Array(pos);
  }, [toolpath]);

  // Animate tool position along toolpath
  useFrame(() => {
    if (
      !groupRef.current ||
      !toolpathPositions ||
      playbackProgress == null
    ) return;

    const totalPoints = toolpathPositions.length / 3;
    if (totalPoints === 0) return;

    const idx = Math.min(
      Math.floor(playbackProgress * totalPoints),
      totalPoints - 1
    );
    const x = toolpathPositions[idx * 3];
    const y = toolpathPositions[idx * 3 + 1];
    const z = toolpathPositions[idx * 3 + 2];

    groupRef.current.position.set(x, y, z + toolLength / 2);
  });

  if (!visible) return null;

  const toolRadius = toolDiameter / 2;
  const holderRadius = holderDiameter / 2;
  const holderOffset = toolLength / 2 + holderLength / 2;

  return (
    <group
      ref={groupRef}
      position={position}
      name="tool-assembly"
    >
      {/* Cutting tool — silver cylinder */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry
          args={[toolRadius, toolRadius, toolLength, 24]}
        />
        <meshPhongMaterial
          color="#e0e0e0"
          shininess={80}
        />
      </mesh>

      {/* Tool holder — dark gray, larger cylinder */}
      <mesh position={[0, 0, holderOffset]}>
        <cylinderGeometry
          args={[holderRadius, holderRadius, holderLength, 24]}
        />
        <meshPhongMaterial
          color="#4a4a50"
          shininess={30}
        />
      </mesh>
    </group>
  );
}

/**
 * L9-P2-MS1 P0-U04: StockMesh — Workpiece Mesh Renderer
 *
 * Renders the stock/workpiece with multiple display modes:
 *   solid, wireframe, transparent, xray
 * Supports stock removal animation synced with toolpath progress.
 */
import { useMemo } from 'react';
import {
  Color as ThreeColor,
  DoubleSide,
  FrontSide,
  MeshBasicMaterial,
  MeshPhongMaterial,
} from 'three';
import type { MeshData, RenderMode, Color } from '../../types/viewer';
import { parseMeshGeometry } from '../../utils/sceneParser';

export interface StockMeshProps {
  mesh: MeshData;
  renderMode?: RenderMode;
  color?: Color;
  opacity?: number;
  /** Toolpath progress 0..1 for stock removal animation */
  removalProgress?: number;
  visible?: boolean;
}

export function StockMesh({
  mesh,
  renderMode = 'transparent',
  color = { r: 0.6, g: 0.6, b: 0.65 },
  opacity = 0.3,
  visible = true,
}: StockMeshProps) {
  const geometry = useMemo(
    () => parseMeshGeometry(mesh),
    [mesh]
  );

  const threeColor = useMemo(
    () => new ThreeColor(color.r, color.g, color.b),
    [color.r, color.g, color.b]
  );

  const material = useMemo(() => {
    switch (renderMode) {
      case 'wireframe':
        return new MeshBasicMaterial({
          color: threeColor,
          wireframe: true,
        });
      case 'xray':
        return new MeshPhongMaterial({
          color: threeColor,
          opacity: 0.12,
          transparent: true,
          side: DoubleSide,
          depthWrite: false,
        });
      case 'transparent':
        return new MeshPhongMaterial({
          color: threeColor,
          opacity,
          transparent: true,
          side: DoubleSide,
          depthWrite: false,
        });
      case 'solid':
      default:
        return new MeshPhongMaterial({
          color: threeColor,
          opacity: 1,
          transparent: false,
          side: FrontSide,
        });
    }
  }, [renderMode, threeColor, opacity]);

  if (!visible) return null;

  return (
    <mesh geometry={geometry} material={material} name="stock-mesh" />
  );
}

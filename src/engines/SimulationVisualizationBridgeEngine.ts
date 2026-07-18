/**
 * SimulationVisualizationBridgeEngine — Connects CNC simulation to 3D viewer
 *
 * Bridges the gap between CNCSimulationPipelineEngine output and the
 * existing VisualizationEngine/Three.js viewer components.
 *
 * Generates:
 * 1. Physics-colored toolpath data (force→color per segment)
 * 2. Collision zone overlay meshes (red transparent volumes)
 * 3. Machine envelope wireframe
 * 4. Animated tool position timeline
 * 5. Stock removal progress frames
 * 6. Heatmap data (thermal/force/deflection per position)
 *
 * This is the missing link between our simulation math and our 3D rendering.
 * VisualizationEngine generates generic scene graphs.
 * This engine generates SIMULATION-SPECIFIC visualization data.
 *
 * Original design — not derived from any proprietary viewer.
 */

import type { SimulationResult, BlockResult } from "./CNCSimulationPipelineEngine.js";

export interface ColoredSegment {
  start: [number, number, number];
  end: [number, number, number];
  color: [number, number, number]; // RGB 0-1
  opacity: number;
  lineWidth: number;
  blockNumber: number;
  moveType: string;
}

export interface CollisionOverlay {
  name: string;
  min: [number, number, number];
  max: [number, number, number];
  color: [number, number, number, number]; // RGBA
  hasCollision: boolean;
}

export interface ToolPositionFrame {
  time_s: number;
  blockNumber: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  isCutting: boolean;
  force_N: number;
  temperature_C: number;
}

export interface StockRemovalFrame {
  time_s: number;
  removed_pct: number;
  cutFaces: Array<{
    position: [number, number, number];
    normal: [number, number, number];
    depth_mm: number;
  }>;
}

export interface SimulationVisualizationData {
  toolpath_segments: ColoredSegment[];
  collision_zones: CollisionOverlay[];
  machine_envelope: { min: [number, number, number]; max: [number, number, number] };
  tool_timeline: ToolPositionFrame[];
  stock_frames: StockRemovalFrame[];
  heatmap_values: Array<{ position: [number, number, number]; value: number; type: string }>;
  statistics: {
    total_segments: number;
    cutting_segments: number;
    rapid_segments: number;
    collision_count: number;
    max_force_N: number;
    max_temp_C: number;
    cycle_time_s: number;
  };
}

// Color gradient: green (safe) → yellow (caution) → red (danger)
function forceToColor(force: number, maxForce: number): [number, number, number] {
  const t = Math.min(force / Math.max(maxForce, 1), 1);
  if (t < 0.5) {
    return [t * 2, 1, 0]; // green → yellow
  }
  return [1, 1 - (t - 0.5) * 2, 0]; // yellow → red
}

function tempToColor(temp: number): [number, number, number] {
  const t = Math.min((temp - 20) / 500, 1);
  if (t < 0.33) return [0, t * 3, 1]; // blue → cyan
  if (t < 0.66) return [0, 1, 1 - (t - 0.33) * 3]; // cyan → green
  return [(t - 0.66) * 3, 1 - (t - 0.66) * 3, 0]; // green → red
}

export class SimulationVisualizationBridgeEngine {
  /**
   * Convert simulation results to 3D visualization data
   */
  generateVisualization(
    simResult: SimulationResult,
    options: {
      colorMode?: "force" | "temperature" | "deflection" | "speed" | "type";
      stockDimensions?: { x: number; y: number; z: number };
      machineEnvelope?: { x: number; y: number; z: number };
      showCollisionZones?: boolean;
      animationFps?: number;
    } = {}
  ): SimulationVisualizationData {
    const colorMode = options.colorMode ?? "force";
    const stockDim = options.stockDimensions ?? { x: 200, y: 150, z: 50 };
    const envelope = options.machineEnvelope ?? { x: 500, y: 400, z: 400 };
    const fps = options.animationFps ?? 30;

    // Generate colored toolpath segments
    const segments: ColoredSegment[] = [];
    let prevPos: [number, number, number] = [0, 0, 50];
    const maxForce = Math.max(simResult.max_force_N, 1);

    for (const block of simResult.block_results) {
      const pos: [number, number, number] = [
        block.position.x,
        block.position.y,
        block.position.z,
      ];

      if (block.move_type === "rapid" || block.move_type === "linear" ||
          block.move_type === "cw_arc" || block.move_type === "ccw_arc") {

        let color: [number, number, number];
        switch (colorMode) {
          case "force":
            color = forceToColor(block.cutting_force_N ?? 0, maxForce);
            break;
          case "temperature":
            color = tempToColor(block.temperature_C ?? 20);
            break;
          case "deflection":
            color = forceToColor(block.deflection_um ?? 0, 50);
            break;
          case "speed":
            color = forceToColor(block.feed_actual_mm_min ?? 0, 5000);
            break;
          case "type":
          default:
            color = block.move_type === "rapid"
              ? [1, 1, 0]  // yellow for rapids
              : [0, 0.7, 1]; // blue for feed
        }

        segments.push({
          start: [...prevPos],
          end: [...pos],
          color,
          opacity: block.move_type === "rapid" ? 0.4 : 1.0,
          lineWidth: block.move_type === "rapid" ? 1 : 2,
          blockNumber: block.block_number,
          moveType: block.move_type,
        });
      }

      prevPos = [...pos];
    }

    // Collision zone overlays
    const collisionZones: CollisionOverlay[] = [];
    if (options.showCollisionZones !== false) {
      // Machine column zone
      collisionZones.push({
        name: "spindle_housing",
        min: [-75, -75, 50],
        max: [75, 75, 300],
        color: [1, 0, 0, 0.15],
        hasCollision: simResult.collisions.length > 0,
      });
      // Work envelope boundary
      collisionZones.push({
        name: "work_envelope",
        min: [0, 0, -stockDim.z],
        max: [stockDim.x, stockDim.y, 0],
        color: [0, 1, 0, 0.05],
        hasCollision: false,
      });
    }

    // Tool position timeline (for playback animation)
    const timeline: ToolPositionFrame[] = [];
    let cumulativeTime = 0;
    for (const block of simResult.block_results) {
      const dist = segments.find(s => s.blockNumber === block.block_number);
      const blockTime = block.feed_actual_mm_min && block.feed_actual_mm_min > 0
        ? 0.5 : 0.1; // simplified time per block

      timeline.push({
        time_s: cumulativeTime,
        blockNumber: block.block_number,
        position: [block.position.x, block.position.y, block.position.z],
        isCutting: block.cutting_force_N !== undefined && block.cutting_force_N > 0,
        force_N: block.cutting_force_N ?? 0,
        temperature_C: block.temperature_C ?? 20,
      });
      cumulativeTime += blockTime;
    }

    // Stock removal frames (progressive removal snapshots)
    const stockFrames: StockRemovalFrame[] = [];
    let totalRemoved = 0;
    const stockVol = stockDim.x * stockDim.y * stockDim.z;
    for (const block of simResult.block_results) {
      if (block.mrr_cm3_min && block.mrr_cm3_min > 0) {
        totalRemoved += block.mrr_cm3_min * 0.01; // simplified
        stockFrames.push({
          time_s: cumulativeTime,
          removed_pct: Math.min(totalRemoved / (stockVol / 1000) * 100, 100),
          cutFaces: [{
            position: [block.position.x, block.position.y, block.position.z],
            normal: [0, 0, 1],
            depth_mm: Math.abs(block.position.z),
          }],
        });
      }
    }

    // Heatmap values
    const heatmapValues = simResult.block_results
      .filter(b => b.cutting_force_N && b.cutting_force_N > 0)
      .map(b => ({
        position: [b.position.x, b.position.y, b.position.z] as [number, number, number],
        value: colorMode === "force" ? (b.cutting_force_N ?? 0) :
               colorMode === "temperature" ? (b.temperature_C ?? 20) :
               (b.deflection_um ?? 0),
        type: colorMode,
      }));

    return {
      toolpath_segments: segments,
      collision_zones: collisionZones,
      machine_envelope: {
        min: [-10, -10, -envelope.z],
        max: [envelope.x, envelope.y, 50],
      },
      tool_timeline: timeline,
      stock_frames: stockFrames,
      heatmap_values: heatmapValues,
      statistics: {
        total_segments: segments.length,
        cutting_segments: segments.filter(s => s.moveType !== "rapid").length,
        rapid_segments: segments.filter(s => s.moveType === "rapid").length,
        collision_count: simResult.collisions.length,
        max_force_N: simResult.max_force_N,
        max_temp_C: simResult.max_temperature_C,
        cycle_time_s: simResult.cycle_time_s,
      },
    };
  }
}

export const simulationVisualizationBridgeEngine = new SimulationVisualizationBridgeEngine();

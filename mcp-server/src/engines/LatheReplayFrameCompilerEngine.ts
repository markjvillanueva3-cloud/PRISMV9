/**
 * LatheReplayFrameCompilerEngine
 * ================================
 *
 * Compiles a sequence of viewer frames for block-by-block turning replay.
 *
 * Each frame represents one NC block end-state and contains:
 *   - frame_index
 *   - block_n
 *   - tool tip XZ
 *   - swept volume delta (Δr × Δz) — for highlight shading
 *   - cumulative elapsed seconds
 *   - breach_flag + component (if breach occurred in this block)
 *   - legend_text (human-readable caption)
 *
 * Output is a self-contained frame list a front-end replay UI (or headless
 * thumbnail generator) can iterate. No 3D rendering here — purely data
 * marshalling for a downstream visualizer.
 *
 * Distinct from existing:
 *   - VideoReplayOrchestratorEngine : video UI orchestration, not frame assembly
 *   - ToolpathSimulationEngine       : mill-general simulation, no lathe framing
 *   - This engine                    : lathe replay frame compilation
 *
 * References:
 *   - ISO 19440 (manufacturing enterprise modeling — event stream conventions)
 *   - Vericut / NCSIMUL frame-stream format (informal)
 *
 * @module engines/LatheReplayFrameCompilerEngine
 * @milestone LATHE-PRO-MS12
 */

export interface ReplaySourceBlock {
  n: number;
  x_mm: number;
  z_mm: number;
  elapsed_seconds_delta: number;
  swept_delta_r_mm?: number;
  swept_delta_z_mm?: number;
  breach_component?: "chuck" | "tailstock" | "steady_rest" | "x_limit" | "z_limit";
  caption?: string;
}

export interface LatheReplayFrameInput {
  program_id: string;
  blocks: ReplaySourceBlock[];
  /** Cap frame rate (frames per second) — time-compress slow moves; default 30 */
  fps?: number;
}

export interface LatheReplayFrame {
  frame_index: number;
  block_n: number;
  x_mm: number;
  z_mm: number;
  cumulative_seconds: number;
  swept_delta_r_mm: number;
  swept_delta_z_mm: number;
  breach_flag: boolean;
  breach_component?: string;
  legend: string;
}

export interface LatheReplayFrameCompileResult {
  program_id: string;
  frames: LatheReplayFrame[];
  total_frames: number;
  total_seconds: number;
  breach_frame_indices: number[];
  reasoning: string[];
}

class LatheReplayFrameCompilerEngineImpl {
  compile(i: LatheReplayFrameInput): LatheReplayFrameCompileResult {
    const fps = Math.max(1, i.fps ?? 30);
    const minStep = 1 / fps;
    const frames: LatheReplayFrame[] = [];
    const breachIdx: number[] = [];

    let elapsed = 0;
    let idx = 0;

    for (const b of i.blocks) {
      elapsed += Math.max(0, b.elapsed_seconds_delta);
      const effectiveSec = Math.max(minStep, b.elapsed_seconds_delta);
      const hasBreach = b.breach_component !== undefined;
      if (hasBreach) breachIdx.push(idx);

      const frame: LatheReplayFrame = {
        frame_index: idx,
        block_n: b.n,
        x_mm: round3(b.x_mm),
        z_mm: round3(b.z_mm),
        cumulative_seconds: round3(elapsed),
        swept_delta_r_mm: round3(b.swept_delta_r_mm ?? 0),
        swept_delta_z_mm: round3(b.swept_delta_z_mm ?? 0),
        breach_flag: hasBreach,
        breach_component: b.breach_component,
        legend: legendFor(b, effectiveSec),
      };
      frames.push(frame);
      idx++;
    }

    const reasoning: string[] = [];
    reasoning.push(`Compiled ${frames.length} frame(s) @ ${fps}fps`);
    reasoning.push(`Total elapsed ${round3(elapsed)}s`);
    if (breachIdx.length > 0) {
      reasoning.push(`${breachIdx.length} breach frame(s); first at index ${breachIdx[0]}`);
    }

    return {
      program_id: i.program_id,
      frames,
      total_frames: frames.length,
      total_seconds: round3(elapsed),
      breach_frame_indices: breachIdx,
      reasoning,
    };
  }

  getStats(): { reference: string } {
    return { reference: "ISO 19440 event streams; Vericut/NCSIMUL frame-stream conventions" };
  }
}

function legendFor(b: ReplaySourceBlock, sec: number): string {
  if (b.caption) return b.caption;
  const parts = [`N${b.n}`, `X${round3(b.x_mm)} Z${round3(b.z_mm)}`, `${round3(sec)}s`];
  if (b.breach_component) parts.push(`BREACH:${b.breach_component}`);
  return parts.join(" · ");
}

function round3(n: number): number { return Math.round(n * 1000) / 1000; }

export const latheReplayFrameCompilerEngine = new LatheReplayFrameCompilerEngineImpl();
export type { LatheReplayFrameCompilerEngineImpl };

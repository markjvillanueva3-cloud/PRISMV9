/**
 * MillReplayFrameCompilerEngine
 * ===============================
 *
 * Compiles a sequence of viewer frames for block-by-block milling replay.
 *
 * Mill parity for LatheReplayFrameCompilerEngine (LATHE-PRO-MS12). Lathe
 * uses (X, Z) tip + (Δr, Δz) swept volume + chuck/tailstock breach
 * components. Mill substitutes:
 *
 *   - XYZ tip position (Cartesian 3D)         [MILL-CANONICAL]
 *   - Optional A/B/C rotary frame angles      [MILL-CANONICAL — 4/5-axis]
 *   - 3D swept volume (Δx × Δy × Δz)          [MILL-CANONICAL]
 *   - Mill-specific breach components: vise / fixture / table_xy_limit /
 *     z_limit / rotary_limit / pallet_clamp_breach [MILL-CANONICAL]
 *
 * Each frame represents one NC block end-state and contains:
 *   - frame_index, block_n
 *   - tool tip (x, y, z) mm
 *   - optional rotary angles (a, b, c) deg
 *   - 3D swept volume delta (Δx, Δy, Δz)
 *   - cumulative elapsed seconds
 *   - breach_flag + component (if breach occurred in this block)
 *   - legend_text (human-readable caption)
 *
 * Output is a self-contained frame list a front-end replay UI (or headless
 * thumbnail generator) can iterate. No 3D rendering here — purely data
 * marshalling for a downstream visualizer.
 *
 * Distinct from existing:
 *   - LatheReplayFrameCompilerEngine : X/Z + lathe breach components
 *   - VideoReplayOrchestratorEngine  : video UI orchestration
 *   - ToolpathSimulationEngine        : general-purpose sim, no frame stream
 *   - This engine                     : mill XYZ + rotary frame compiler
 *
 * References:
 *   - ISO 19440 (manufacturing enterprise modeling — event stream conventions)
 *   - Vericut / NCSIMUL frame-stream format (informal)
 *   - Heidenhain TNC 640 simulation graphics manual
 *
 * @module engines/MillReplayFrameCompilerEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-REPLAY-FRAME-COMPILER (iter84)
 */

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

/** Default frame rate (frames per second) for time-compressed replay. */
export const DEFAULT_FPS = 30;

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MillBreachComponent =
  | "vise"
  | "fixture"
  | "table_xy_limit"
  | "z_limit"
  | "rotary_a_limit"
  | "rotary_b_limit"
  | "rotary_c_limit"
  | "pallet_clamp"
  | "spindle_envelope";

/** Mill-canonical breach components not present in lathe. */
export const MILL_CANONICAL_BREACH_COMPONENTS: MillBreachComponent[] = [
  "vise", "fixture", "table_xy_limit",
  "rotary_a_limit", "rotary_b_limit", "rotary_c_limit",
  "pallet_clamp", "spindle_envelope",
];

export interface MillReplaySourceBlock {
  n: number;
  x_mm: number;
  y_mm: number;       // MILL-CANONICAL (lathe has no Y)
  z_mm: number;
  /** Rotary A-axis angle (deg) — MILL-CANONICAL 4-axis */
  a_deg?: number;
  /** Rotary B-axis angle (deg) — MILL-CANONICAL 5-axis trunnion */
  b_deg?: number;
  /** Rotary C-axis angle (deg) — MILL-CANONICAL spindle/turret index */
  c_deg?: number;
  elapsed_seconds_delta: number;
  swept_delta_x_mm?: number;  // MILL-CANONICAL 3D swept
  swept_delta_y_mm?: number;  // MILL-CANONICAL 3D swept
  swept_delta_z_mm?: number;
  breach_component?: MillBreachComponent;
  caption?: string;
}

export interface MillReplayFrameInput {
  program_id: string;
  blocks: MillReplaySourceBlock[];
  /** Cap frame rate (frames per second) — time-compress slow moves; default DEFAULT_FPS */
  fps?: number;
}

export interface MillReplayFrame {
  frame_index: number;
  block_n: number;
  x_mm: number;
  y_mm: number;
  z_mm: number;
  a_deg: number | null;
  b_deg: number | null;
  c_deg: number | null;
  cumulative_seconds: number;
  swept_delta_x_mm: number;
  swept_delta_y_mm: number;
  swept_delta_z_mm: number;
  breach_flag: boolean;
  breach_component?: MillBreachComponent;
  legend: string;
}

export interface MillReplayFrameCompileResult {
  program_id: string;
  frames: MillReplayFrame[];
  total_frames: number;
  total_seconds: number;
  breach_frame_indices: number[];
  reasoning: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function round3(n: number): number { return Math.round(n * 1000) / 1000; }

function legendFor(b: MillReplaySourceBlock, sec: number): string {
  if (b.caption) return b.caption;
  const parts = [`N${b.n}`, `X${round3(b.x_mm)} Y${round3(b.y_mm)} Z${round3(b.z_mm)}`];
  if (typeof b.a_deg === "number") parts.push(`A${round3(b.a_deg)}`);
  if (typeof b.b_deg === "number") parts.push(`B${round3(b.b_deg)}`);
  if (typeof b.c_deg === "number") parts.push(`C${round3(b.c_deg)}`);
  parts.push(`${round3(sec)}s`);
  if (b.breach_component) parts.push(`BREACH:${b.breach_component}`);
  return parts.join(" · ");
}

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillReplayFrameCompilerEngineImpl {
  compile(i: MillReplayFrameInput): MillReplayFrameCompileResult {
    this.validate(i);
    const fps = Math.max(1, i.fps ?? DEFAULT_FPS);
    const minStep = 1 / fps;
    const frames: MillReplayFrame[] = [];
    const breachIdx: number[] = [];

    let elapsed = 0;
    let idx = 0;

    for (const b of i.blocks) {
      elapsed += Math.max(0, b.elapsed_seconds_delta);
      const effectiveSec = Math.max(minStep, b.elapsed_seconds_delta);
      const hasBreach = b.breach_component !== undefined;
      if (hasBreach) breachIdx.push(idx);

      const frame: MillReplayFrame = {
        frame_index: idx,
        block_n: b.n,
        x_mm: round3(b.x_mm),
        y_mm: round3(b.y_mm),
        z_mm: round3(b.z_mm),
        a_deg: typeof b.a_deg === "number" ? round3(b.a_deg) : null,
        b_deg: typeof b.b_deg === "number" ? round3(b.b_deg) : null,
        c_deg: typeof b.c_deg === "number" ? round3(b.c_deg) : null,
        cumulative_seconds: round3(elapsed),
        swept_delta_x_mm: round3(b.swept_delta_x_mm ?? 0),
        swept_delta_y_mm: round3(b.swept_delta_y_mm ?? 0),
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
    // Count rotary-enabled frames as a hint to the visualizer
    const rotaryCount = frames.filter(f => f.a_deg !== null || f.b_deg !== null || f.c_deg !== null).length;
    if (rotaryCount > 0) {
      reasoning.push(`${rotaryCount} frame(s) carry rotary axis data — visualizer should render 4/5-axis frame transform`);
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

  getStats(): {
    frame_fields: string[];
    mill_canonical_fields: string[];
    breach_components: MillBreachComponent[];
    mill_canonical_breach_components: MillBreachComponent[];
    default_fps: number;
    reference: string;
  } {
    return {
      frame_fields: [
        "frame_index", "block_n", "x_mm", "y_mm", "z_mm",
        "a_deg", "b_deg", "c_deg",
        "cumulative_seconds",
        "swept_delta_x_mm", "swept_delta_y_mm", "swept_delta_z_mm",
        "breach_flag", "breach_component", "legend",
      ],
      mill_canonical_fields: [
        "y_mm", "a_deg", "b_deg", "c_deg",
        "swept_delta_x_mm", "swept_delta_y_mm",
      ],
      breach_components: [
        "vise", "fixture", "table_xy_limit", "z_limit",
        "rotary_a_limit", "rotary_b_limit", "rotary_c_limit",
        "pallet_clamp", "spindle_envelope",
      ],
      mill_canonical_breach_components: MILL_CANONICAL_BREACH_COMPONENTS,
      default_fps: DEFAULT_FPS,
      reference: "ISO 19440 event streams; Vericut/NCSIMUL frame-stream conventions; Heidenhain TNC 640 simulation graphics",
    };
  }

  private validate(i: MillReplayFrameInput): void {
    if (!i || typeof i !== "object") throw new TypeError("MillReplayFrameCompilerEngine.compile: input required");
    if (typeof i.program_id !== "string" || i.program_id.length === 0) throw new TypeError("program_id required");
    if (!Array.isArray(i.blocks)) throw new TypeError("blocks[] required");
  }
}

export const millReplayFrameCompilerEngine = new MillReplayFrameCompilerEngineImpl();
export type { MillReplayFrameCompilerEngineImpl };

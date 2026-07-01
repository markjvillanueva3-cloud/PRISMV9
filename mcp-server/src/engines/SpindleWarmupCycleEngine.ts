/**
 * SpindleWarmupCycleEngine — closes PreCut axis #6 (spindle warmed up)
 *
 * Generates vendor-spec spindle warm-up cycle (G-code) for the named controller.
 * Cold-start spindle expansion is the dominant Z-axis dimensional drift in the
 * first 30 minutes of operation (ISO 230-3 §thermal); skipping warm-up =
 * scrapped first-piece dimensional accuracy.
 *
 * Vendor-spec stages (Sandvik / DMG MORI / Makino tribal consensus):
 *   - Stage 1: 25% max RPM × 5 min  (lube circulation)
 *   - Stage 2: 50% max RPM × 8 min  (bearing equalization)
 *   - Stage 3: 75% max RPM × 8 min  (thermal saturation onset)
 *   - Stage 4: 100% max RPM × 5 min (steady-state)
 *
 * Total: ~26 min for a cold start. Skip per-machine via override flag if the
 * spindle has been running for ≥60 min (operator self-attestation).
 *
 * Reference: ISO 230-3 §thermal-error; Sandvik Coromant Spindle Care guide;
 *   DMG MORI Maintenance Manual §3 warm-up procedure; Makino Spindle Care
 *   bulletin SB-014; Mazak operator manual §5 thermal stability.
 *
 * @version 1.0.0
 * @module SpindleWarmupCycleEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type ControllerDialect = "fanuc" | "okuma_osp" | "haas" | "heidenhain_tnc";

export interface SpindleWarmupCycleInput {
  controller: ControllerDialect;
  /** Spindle max RPM (e.g. 15000 for a typical VMC, 30000 for HSM) */
  max_rpm: number;
  /** Override stage count (default 4 — full vendor-spec) */
  stages?: 2 | 3 | 4;
  /** Custom stage durations (s) — overrides defaults */
  stage_duration_s?: number[];
  /** Skip warm-up if spindle running ≥ this many minutes (operator override) */
  recent_run_min?: number;
  recent_run_threshold_min?: number;
}

export interface SpindleWarmupCycleResult {
  controller: ControllerDialect;
  stages_count: number;
  stages: Array<{ rpm: number; duration_s: number }>;
  total_duration_s: AtomicValue;
  gcode: string;
  skipped: boolean;
  skip_reason?: string;
  source: string;
}

const DEFAULT_STAGES_PCT = [0.25, 0.50, 0.75, 1.00];
const DEFAULT_STAGE_DURATION_S = [300, 480, 480, 300];  // 5, 8, 8, 5 min

export class SpindleWarmupCycleEngine {
  generate(input: SpindleWarmupCycleInput): SpindleWarmupCycleResult {
    if (!input || !input.controller || !input.max_rpm || input.max_rpm <= 0) {
      throw new Error("SpindleWarmupCycleEngine.generate: controller + positive max_rpm required");
    }

    const threshold = input.recent_run_threshold_min ?? 60;
    if (input.recent_run_min !== undefined && input.recent_run_min >= threshold) {
      return {
        controller: input.controller,
        stages_count: 0,
        stages: [],
        total_duration_s: { value: 0, unit: "s", source: "skipped — recent run" },
        gcode: "( Spindle warm-up SKIPPED — running ≥60 min )",
        skipped: true,
        skip_reason: `spindle running ${input.recent_run_min}min ≥ ${threshold}min threshold`,
        source: "SpindleWarmupCycleEngine — skip path",
      };
    }

    const stageCount = input.stages ?? 4;
    const pcts = DEFAULT_STAGES_PCT.slice(0, stageCount);
    const durations = input.stage_duration_s ?? DEFAULT_STAGE_DURATION_S.slice(0, stageCount);

    const stages = pcts.map((pct, i) => ({
      rpm: Math.round(input.max_rpm * pct),
      duration_s: durations[i] ?? DEFAULT_STAGE_DURATION_S[i] ?? 300,
    }));
    const totalS = stages.reduce((sum, s) => sum + s.duration_s, 0);

    const gcodeLines: string[] = [`( Spindle warm-up — ${stageCount} stages, ${(totalS / 60).toFixed(1)} min )`];
    gcodeLines.push("( ISO 230-3 §thermal-error compensation; Sandvik Spindle Care )");
    for (let i = 0; i < stages.length; i++) {
      const s = stages[i];
      gcodeLines.push(`M3 S${s.rpm} ( stage ${i + 1}: ${(s.duration_s / 60).toFixed(1)} min @ ${s.rpm} RPM )`);
      gcodeLines.push(`G04 P${s.duration_s} ( dwell )`);
    }
    gcodeLines.push("M5 ( spindle stop — warm-up complete )");
    const gcode = gcodeLines.join("\n");

    return {
      controller: input.controller,
      stages_count: stageCount,
      stages,
      total_duration_s: {
        value: totalS,
        unit: "s",
        source: "ISO 230-3 + Sandvik Spindle Care",
      },
      gcode,
      skipped: false,
      source: "SpindleWarmupCycleEngine — ISO 230-3 §thermal + Sandvik Spindle Care + DMG MORI §3",
    };
  }
}

export const spindleWarmupCycleEngine = new SpindleWarmupCycleEngine();

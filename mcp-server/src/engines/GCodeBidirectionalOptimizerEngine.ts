/**
 * GCodeBidirectionalOptimizerEngine — closes the inverse loop. Uses
 * the runtime predictor + reverse-CAD outputs to identify and propose
 * concrete G-code optimizations the operator can apply to the source
 * program.
 *
 * The bidirectional value: now that we can predict cycle time AND
 * recover the part geometry, we can answer "if I changed X in the
 * program, the part would still be correct and cycle time would drop
 * by Y seconds". That's the operator-facing pitch.
 *
 * Categories of optimization the loop produces:
 *   1. Block consolidation — adjacent G1 blocks with same modal F that
 *      could fit a G1 line + arc rather than many short segments
 *   2. Feed-rate balancing — blocks below their machine-limited feed
 *      that the prior block's exit velocity could have carried higher
 *   3. Rapid-conversion candidates — G1 blocks above stock that should
 *      be G0 (reverse-CAD flags them as air cuts)
 *   4. Tool sequencing — flag operations where the tool changes more than
 *      necessary (T1 → T2 → T1 → T2 → T1 pattern = re-sequence)
 *   5. Throttle-bound regions — clusters of short blocks where the
 *      controller's block-rate ceiling is the bottleneck → propose
 *      arc-fitting (controller's NURBS/G05.3) to consolidate
 *
 * Outputs structured recommendations with predicted time savings —
 * never auto-rewrites the program. R12 fail-loud: recommendations
 * carry confidence + reason + estimated savings, operator decides.
 *
 * @milestone GCODE-BIDIRECTIONAL-OPTIMIZE-MS0
 */

import type { ParsedBlock, RuntimePrediction, MachineKinematics } from "./GCodeRuntimePredictorEngine.js";
import { gcodeRuntimePredictorEngine } from "./GCodeRuntimePredictorEngine.js";
import type { ReverseCADResult } from "./GCodeReverseCADEngine.js";

export interface OptimizationRecommendation {
  /** Stable ID for operator UI */
  id: string;
  category:
    | "block_consolidation"
    | "feed_balancing"
    | "rapid_conversion"
    | "tool_sequencing"
    | "throttle_relief"
    | "leadout_shaping"
    | "spindle_warm_reduce";
  /** Source block range affected */
  source_blocks: { start?: number; end?: number };
  /** Tool affected (if applicable) */
  tool_number?: number;
  /** Predicted time savings if applied, seconds */
  estimated_savings_sec: number;
  /** Risk to correctness 0..1 — 0 = no risk, 1 = high (operator review required) */
  risk: number;
  /** Confidence in the recommendation 0..1 */
  confidence: number;
  /** Operator-readable explanation */
  why: string;
  /** Suggested specific change (e.g., "merge N42..N48 into a single G3 arc") */
  how: string;
}

export interface BidirectionalOptimization {
  /** Original predicted runtime */
  baseline_runtime: RuntimePrediction;
  /** Recommendations sorted by estimated_savings descending */
  recommendations: OptimizationRecommendation[];
  /** Total estimated savings if all applied (seconds) */
  total_estimated_savings_sec: number;
  /** Total estimated savings (percent) */
  total_savings_pct: number;
  /** New predicted runtime after all recommendations applied */
  optimized_runtime_estimate_sec: number;
  /** Operator summary */
  summary: string[];
}

// ── Tunable thresholds (named constants per Karpathy discipline) ──────
const SHORT_BLOCK_LEN_MM = 0.5;
const CONSOLIDATION_CLUSTER_MIN = 5;
const FEED_BALANCE_DEFICIT_PCT = 0.4;
const RAPID_CONVERT_Z_CLEARANCE_MM = 5;
const TOOL_OSCILLATION_THRESHOLD = 3;
const THROTTLE_PENALTY_PCT = 0.1;
const ARC_FIT_TIME_SAVINGS_PCT = 0.6;
const CONSOLIDATION_TIME_SAVINGS_PCT = 0.3;
const FEED_BALANCE_TIME_SAVINGS_PCT = 0.5;
const RAPID_CONVERT_SAVINGS_PCT = 0.7;
const TOOL_RESEQ_TIME_SAVINGS_SEC = 8;

export class GCodeBidirectionalOptimizerEngine {
  /**
   * Run the bidirectional optimization pass. Takes the parsed program +
   * machine + (optional) reverse-CAD result + (optional) precomputed
   * baseline runtime. Returns concrete recommendations the operator can
   * action one at a time.
   */
  optimize(opts: {
    blocks: ParsedBlock[];
    machine: MachineKinematics;
    reverseCad?: ReverseCADResult;
    baselineRuntime?: RuntimePrediction;
  }): BidirectionalOptimization {
    const { blocks, machine, reverseCad } = opts;
    const baseline = opts.baselineRuntime ?? gcodeRuntimePredictorEngine.predict(blocks, machine);

    const recommendations: OptimizationRecommendation[] = [];

    // 1. Block consolidation -- clusters of short G1 blocks
    let cluster: number[] = [];
    let nextId = 1;
    // Emit a consolidation rec for the accumulated cluster (if it meets the min size),
    // then reset. Hoisted into a closure so the post-loop trailing flush reuses the SAME
    // logic -- a cluster that runs to the LAST block must still be reported (the original
    // code only flushed inside the `else` branch, silently dropping an end-of-program
    // cluster: a boundary miss in the same class as the arc-classifier off-by-one).
    const flushCluster = () => {
      if (cluster.length >= CONSOLIDATION_CLUSTER_MIN) {
        const clusterTime = cluster.reduce((a, idx) => a + baseline.blocks[idx].total_sec, 0);
        recommendations.push({
          id: `OPT-${nextId++}`,
          category: "block_consolidation",
          source_blocks: {
            start: baseline.blocks[cluster[0]].block_n,
            end: baseline.blocks[cluster[cluster.length - 1]].block_n,
          },
          estimated_savings_sec: clusterTime * CONSOLIDATION_TIME_SAVINGS_PCT,
          risk: 0.2,
          confidence: 0.85,
          why: `${cluster.length} consecutive short G1 blocks (<${SHORT_BLOCK_LEN_MM}mm each) hit controller block-rate ceiling`,
          how: "Re-CAM with arc-fitting tolerance loosened OR enable G05.3 smoothing (P20) to let UltiMotion consolidate",
        });
      }
      cluster = [];
    };
    for (let i = 0; i < baseline.blocks.length; i++) {
      const b = baseline.blocks[i];
      if (b.path_length_mm < SHORT_BLOCK_LEN_MM && b.motion === "G1") {
        cluster.push(i);
      } else {
        flushCluster();
      }
    }
    flushCluster(); // trailing flush -- report a cluster that extends to the program end

    // 2. Throttle-bound region detection (reads bottleneck breakdown)
    if (baseline.time_breakdown.throttle_penalty_sec > baseline.total_sec * THROTTLE_PENALTY_PCT) {
      recommendations.push({
        id: `OPT-${nextId++}`,
        category: "throttle_relief",
        source_blocks: {},
        estimated_savings_sec: baseline.time_breakdown.throttle_penalty_sec * ARC_FIT_TIME_SAVINGS_PCT,
        risk: 0.15,
        confidence: 0.9,
        why: `Controller throttle costs ${baseline.time_breakdown.throttle_penalty_sec.toFixed(1)}s (${((baseline.time_breakdown.throttle_penalty_sec / baseline.total_sec) * 100).toFixed(0)}%) of cycle time`,
        how: "Enable NURBS output in CAM or use G05.3 P10 (Hurco) / G05.1 Q1 (Fanuc) to let look-ahead absorb the block-rate ceiling",
      });
    }

    // 3. Feed balancing — blocks where effective_feed << prior block exit velocity
    for (let i = 1; i < baseline.blocks.length; i++) {
      const prev = baseline.blocks[i - 1];
      const curr = baseline.blocks[i];
      if (curr.effective_feed_mm_min < prev.effective_feed_mm_min * (1 - FEED_BALANCE_DEFICIT_PCT)
          && curr.motion === "G1" && prev.motion === "G1") {
        const savings = curr.accel_penalty_sec * FEED_BALANCE_TIME_SAVINGS_PCT;
        if (savings > 0.05) {
          recommendations.push({
            id: `OPT-${nextId++}`,
            category: "feed_balancing",
            source_blocks: { start: curr.block_n, end: curr.block_n },
            estimated_savings_sec: savings,
            risk: 0.1,
            confidence: 0.7,
            why: `Feed drops ${((1 - curr.effective_feed_mm_min / prev.effective_feed_mm_min) * 100).toFixed(0)}% from prior block — wasted accel headroom`,
            how: `Hold feed at ${prev.effective_feed_mm_min.toFixed(0)} mm/min if cutting condition allows`,
          });
        }
      }
    }

    // 4. Rapid-conversion candidates (uses reverse-CAD if available)
    if (reverseCad) {
      // If reverse-CAD says a region is above the highest feature Z + clearance,
      // those G1 blocks at that Z are air cuts and should be G0
      const highestFeatureZ = reverseCad.features.reduce(
        (max, f) => Math.max(max, f.position.z + f.depth_mm),
        -Infinity,
      );
      const safeRapidZ = highestFeatureZ + RAPID_CONVERT_Z_CLEARANCE_MM;
      // Count G1 blocks above safeRapidZ (use block index iteration — we don't have Z per block from RuntimePrediction)
      const candidateBlocks = blocks.filter((b, idx) =>
        baseline.blocks[idx]?.motion === "G1"
        && typeof b.z === "number"
        && b.z > safeRapidZ,
      );
      if (candidateBlocks.length > 0) {
        // Time savings = current G1 time - G0 time over those distances
        const totalFeedTime = candidateBlocks.reduce((acc, b, i) => {
          const bIdx = blocks.indexOf(b);
          return acc + (baseline.blocks[bIdx]?.motion_time_sec ?? 0);
        }, 0);
        recommendations.push({
          id: `OPT-${nextId++}`,
          category: "rapid_conversion",
          source_blocks: { start: candidateBlocks[0].n, end: candidateBlocks[candidateBlocks.length - 1].n },
          estimated_savings_sec: totalFeedTime * RAPID_CONVERT_SAVINGS_PCT,
          risk: 0.05,
          confidence: 0.92,
          why: `${candidateBlocks.length} G1 blocks above safe-Z (${safeRapidZ.toFixed(1)}mm) are air cuts`,
          how: "Convert to G0 rapid moves — reverse-CAD confirms no part material at this Z",
        });
      }
    }

    // 5. Tool sequencing — detect tool oscillation (T1, T2, T1, T2, T1)
    const toolChanges: number[] = [];
    for (const b of blocks) {
      if (b.m?.includes(6) && typeof b.t === "number") toolChanges.push(b.t);
    }
    // Count alternations: T1 T2 T1 = 2 alternations of T1
    const toolCounts = new Map<number, number>();
    let oscillations = 0;
    for (let i = 2; i < toolChanges.length; i++) {
      if (toolChanges[i] === toolChanges[i - 2] && toolChanges[i] !== toolChanges[i - 1]) {
        oscillations++;
      }
    }
    for (const t of toolChanges) toolCounts.set(t, (toolCounts.get(t) ?? 0) + 1);
    if (oscillations >= TOOL_OSCILLATION_THRESHOLD) {
      recommendations.push({
        id: `OPT-${nextId++}`,
        category: "tool_sequencing",
        source_blocks: {},
        estimated_savings_sec: oscillations * TOOL_RESEQ_TIME_SAVINGS_SEC,
        risk: 0.25,
        confidence: 0.8,
        why: `Tool oscillation detected — ${oscillations} alternations across ${toolChanges.length} tool changes`,
        how: "Re-sequence operations to complete all T# work before next tool — pair with PRISM's rapidRepositionOptEngine.sequenceFeatures()",
      });
    }

    // 6. Spindle ramp reduction — if multiple ramps to similar RPM
    if (baseline.time_breakdown.spindle_ramp_sec > 5) {
      recommendations.push({
        id: `OPT-${nextId++}`,
        category: "spindle_warm_reduce",
        source_blocks: {},
        estimated_savings_sec: baseline.time_breakdown.spindle_ramp_sec * 0.3,
        risk: 0.15,
        confidence: 0.7,
        why: `Spindle ramp overhead is ${baseline.time_breakdown.spindle_ramp_sec.toFixed(1)}s across the program`,
        how: "Maintain RPM across consecutive ops that share spindle range — re-sequence to minimize RPM transitions",
      });
    }

    // Sort by savings desc
    recommendations.sort((a, b) => b.estimated_savings_sec - a.estimated_savings_sec);

    const totalSavings = recommendations.reduce((a, r) => a + r.estimated_savings_sec, 0);
    const pct = baseline.total_sec > 0 ? (totalSavings / baseline.total_sec) * 100 : 0;
    const optimizedSec = Math.max(0, baseline.total_sec - totalSavings);

    const summary: string[] = [];
    summary.push(`Baseline runtime: ${(baseline.total_sec / 60).toFixed(2)} min (${baseline.total_sec.toFixed(1)}s)`);
    summary.push(`Recommendations: ${recommendations.length}`);
    summary.push(`Estimated total savings: ${totalSavings.toFixed(1)}s (${pct.toFixed(1)}%)`);
    summary.push(`Optimized runtime estimate: ${(optimizedSec / 60).toFixed(2)} min`);
    if (recommendations.length > 0) {
      summary.push(`Top recommendation: ${recommendations[0].category} — saves ${recommendations[0].estimated_savings_sec.toFixed(1)}s`);
    }

    return {
      baseline_runtime: baseline,
      recommendations,
      total_estimated_savings_sec: totalSavings,
      total_savings_pct: pct,
      optimized_runtime_estimate_sec: optimizedSec,
      summary,
    };
  }
}

export const gcodeBidirectionalOptimizerEngine = new GCodeBidirectionalOptimizerEngine();

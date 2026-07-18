/**
 * SpeedFeedOutcomeFeedbackBridgeEngine — closes the dangling outcome-feedback
 * wire identified by audit F9 from SF-PSN-VALUE-NODE-AUDIT-2026-05-22.
 *
 * Background: `sfcOutcomeWire.captureSFC()` is imported by 5 SF engines but
 * NOT by `SpeedFeedDeepLearningEngine` (SF-AI-L1), which holds the
 * `calibrationFactors` self-learning state. Outcomes are captured at the
 * calculator layer and discarded before they reach the AI-ladder calibration
 * sink. The 'self-learning feedback' the engine header advertises is a
 * dangling wire.
 *
 * This bridge fires on every NineAxis orchestrator emission and:
 *   1. Captures the recommendation to the canonical sfcOutcomeWire bus
 *   2. Records the propagation event for SF-AI ladder consumption
 *   3. Maintains a recent-emission ring buffer the AI ladder can query
 *      to fold actuals back into calibrationFactors
 *
 * The bridge is best-effort — capture failure cannot break SFC computation.
 * Ring-buffer size is bounded so memory cannot grow unbounded.
 *
 * @module engines/SpeedFeedOutcomeFeedbackBridgeEngine
 * @milestone OSCAR-SFC-9AXIS-MS0/U-OSC9-08
 * @author oscar (slot:oscar, 2026-05-26)
 */

import type { NineAxisInput, NineAxisResult } from "./SpeedFeedNineAxisOrchestratorEngine.js";
import { captureSFC } from "../middleware/sfcOutcomeWire.js";

// ============================================================================
// TYPES
// ============================================================================

export interface OutcomeFeedbackRecord {
  timestamp: string;
  machine_name: string;
  material_name: string;
  iso_group: string;
  tool_diameter_mm: number;
  tool_material: string;
  operation: string;
  cut_type: string;
  mode: string;
  /** Recommended cutting speed (m/min). */
  recommended_vc_mpm: number;
  /** Recommended feed per tooth (mm). */
  recommended_fz_mm: number;
  /** Recommended MRR (cm³/min). */
  recommended_mrr_cm3min: number;
  /** Recommended tool life (min). */
  recommended_tool_life_min: number;
  /** Captured-by tag — which engine layer captured the outcome. */
  captured_by: string;
  /** Was the capture to sfcOutcomeWire successful? */
  bus_capture_ok: boolean;
  /** Optional operator override after the fact (for actuals fold-back). */
  operator_override?: {
    actual_vc_mpm?: number;
    actual_fz_mm?: number;
    actual_tool_life_min?: number;
    override_timestamp?: string;
  };
}

export interface FeedbackBufferStats {
  records_count: number;
  capacity: number;
  oldest_timestamp: string | null;
  newest_timestamp: string | null;
  bus_capture_success_rate_pct: number;
  unique_keys: number;
}

// ============================================================================
// ENGINE
// ============================================================================

const DEFAULT_RING_CAPACITY = 1024;

export class SpeedFeedOutcomeFeedbackBridgeEngine {
  private buffer: OutcomeFeedbackRecord[] = [];

  constructor(private readonly capacity: number = DEFAULT_RING_CAPACITY) {}

  /**
   * Capture a NineAxis orchestrator emission to the outcome-feedback chain.
   * Best-effort: returns the record regardless of whether the bus capture
   * succeeded so the AI ladder can ALWAYS see the recommendation.
   */
  capture(input: NineAxisInput, result: NineAxisResult): OutcomeFeedbackRecord {
    const record: OutcomeFeedbackRecord = {
      timestamp: new Date().toISOString(),
      machine_name: input.machine?.name ?? "default_3axis_vmc",
      material_name: input.material.name,
      iso_group: result.sfc.resolved.iso_group,
      tool_diameter_mm: input.tooling.tool_diameter_mm,
      tool_material: result.sfc.resolved.tool_material,
      operation: result.sfc.resolved.operation,
      cut_type: result.sfc.resolved.cut_type,
      mode: result.mode,
      recommended_vc_mpm: result.recommendation.cutting_speed_mpm,
      recommended_fz_mm: result.recommendation.feed_per_tooth_mm,
      recommended_mrr_cm3min: result.recommendation.mrr_cm3min,
      recommended_tool_life_min: result.recommendation.tool_life_min,
      captured_by: "SpeedFeedNineAxisOrchestratorEngine",
      bus_capture_ok: this.tryBusCapture(input, result),
    };

    this.appendToRingBuffer(record);
    return record;
  }

  /**
   * Apply an actuals fold-back — operator-observed values for the most recent
   * matching record. The AI ladder reads this to calibrate.
   */
  recordActuals(
    key: { machine_name: string; material_name: string; tool_diameter_mm: number },
    actuals: {
      actual_vc_mpm?: number;
      actual_fz_mm?: number;
      actual_tool_life_min?: number;
    },
  ): boolean {
    // Find the most recent matching record (search from the back of the ring).
    for (let i = this.buffer.length - 1; i >= 0; i--) {
      const rec = this.buffer[i]!;
      if (
        rec.machine_name === key.machine_name &&
        rec.material_name === key.material_name &&
        Math.abs(rec.tool_diameter_mm - key.tool_diameter_mm) < 0.01
      ) {
        rec.operator_override = {
          ...actuals,
          override_timestamp: new Date().toISOString(),
        };
        return true;
      }
    }
    return false;
  }

  /** Query the AI ladder's input — recent records matching a key. */
  recentForKey(
    key: { machine_name: string; material_name: string; tool_diameter_mm: number },
    limit = 16,
  ): OutcomeFeedbackRecord[] {
    const matches: OutcomeFeedbackRecord[] = [];
    for (let i = this.buffer.length - 1; i >= 0 && matches.length < limit; i--) {
      const rec = this.buffer[i]!;
      if (
        rec.machine_name === key.machine_name &&
        rec.material_name === key.material_name &&
        Math.abs(rec.tool_diameter_mm - key.tool_diameter_mm) < 0.01
      ) {
        matches.push(rec);
      }
    }
    return matches;
  }

  /** Snapshot statistics for the ring buffer. */
  stats(): FeedbackBufferStats {
    const records_count = this.buffer.length;
    const oldest = records_count > 0 ? this.buffer[0]!.timestamp : null;
    const newest = records_count > 0 ? this.buffer[this.buffer.length - 1]!.timestamp : null;
    const successCount = this.buffer.filter(r => r.bus_capture_ok).length;
    const rate = records_count > 0 ? (successCount / records_count) * 100 : 0;
    const keys = new Set(this.buffer.map(r => `${r.machine_name}::${r.material_name}::${r.tool_diameter_mm.toFixed(2)}`));
    return {
      records_count,
      capacity: this.capacity,
      oldest_timestamp: oldest,
      newest_timestamp: newest,
      bus_capture_success_rate_pct: round(rate, 2),
      unique_keys: keys.size,
    };
  }

  /** Tear down state. Test isolation + shutdown. */
  clear(): void {
    this.buffer = [];
  }

  /** Records-with-actuals count — AI ladder's calibration training set size. */
  actualsCount(): number {
    return this.buffer.filter(r => r.operator_override !== undefined).length;
  }

  // ──── Internals ─────────────────────────────────────────────────────

  private tryBusCapture(input: NineAxisInput, result: NineAxisResult): boolean {
    // Capture the NineAxis recommendation to the canonical sfcOutcomeWire bus and
    // return the REAL success flag. Previously this was hardwired `return true`
    // (rationalized as "the bus capture happens upstream"), which made
    // stats().bus_capture_success_rate_pct a fabricated constant 100% -- an R12
    // fail-loud violation flagged by the bravo 2026-06-11 sweep. The orchestrator
    // does NOT emit captureSFC for the NineAxis layer itself, so this bridge IS
    // the canonical capture point for that layer (no double-capture).
    //
    // captureSFC is sync + fire-and-forget (it swallows its own errors and returns
    // { ok:false } on failure), so a static import is safe -- it is middleware, a
    // strictly lower layer than the engines, so there is no circular dependency.
    try {
      const emission = captureSFC({
        engine: "SpeedFeedNineAxisOrchestratorEngine",
        action: "sfc_nine_axis_run",
        context: {
          machine_id: input.machine?.name ?? "default_3axis_vmc",
          operation: result.sfc.resolved.operation,
        },
        recommended: result.recommendation,
      });
      return emission.ok === true;
    } catch {
      // captureSFC is contracted never to throw; defend anyway. A telemetry
      // failure must report failure (never a false success) and must never
      // break SFC computation.
      return false;
    }
  }

  private appendToRingBuffer(record: OutcomeFeedbackRecord): void {
    this.buffer.push(record);
    if (this.buffer.length > this.capacity) {
      this.buffer.shift(); // drop oldest
    }
  }
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const speedFeedOutcomeFeedbackBridgeEngine = new SpeedFeedOutcomeFeedbackBridgeEngine();

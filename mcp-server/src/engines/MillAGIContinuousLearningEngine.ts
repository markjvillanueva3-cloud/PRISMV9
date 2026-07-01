/**
 * MillAGIContinuousLearningEngine
 * =================================
 *
 * Long-running learner: consumes feedback from mill shop operations and
 * adjusts per-feature weights so next-time predictions on the same case
 * shift measurably. Uses a lightweight EWMA (exponentially-weighted
 * moving average) per (feature, key) slot.
 *
 * Mill parity for LatheAGIContinuousLearningEngine (LATHE-MASTER U-LTH59)
 * with 3 MILL-CANONICAL feedback kinds added:
 *
 *   Lathe-shared feedback kinds:
 *     - speed_feed_outcome        — actual vs predicted Vc/fz/force
 *     - machinist_acceptance      — operator approve/reject
 *     - profitability_variance    — quote vs actual %
 *
 *   MILL-CANONICAL feedback kinds (3 added):
 *     - chatter_event             — actual chatter occurrence (ties iter75
 *                                   chatter_threshold_scale)
 *     - fpa_outcome               — FAI pass/fail (ties iter77 lifecycle
 *                                   first_piece_approval → first_piece_rejected)
 *     - chip_evac_outcome         — pocket re-cut / packing severity (ties
 *                                   iter73 ChipEvacuationPredictor)
 *
 * Weight math:
 *   ewma_new = α · observation + (1 - α) · ewma_old
 *   α default = 0.2 — favors stability, responds over ~5-10 samples.
 *
 * Behavior-change proof:
 *   predictAdjustment(feature, key) returns a multiplier in [0.5, 2.0]
 *   derived from the accumulated EWMA. Callers multiply their raw
 *   prediction by this multiplier to get the learning-adjusted value.
 *
 * Persistence:
 *   state/shared/mill-agi-learning-state.json, schemaVersion=1.
 *
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-AGI-CONTINUOUS-LEARNING (iter79)
 */

import { z } from "zod";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { atomicWriteJson } from "../utils/atomicSessionWrite.js";

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

export const DEFAULT_ALPHA = 0.2;
export const MIN_MULTIPLIER = 0.5;
export const MAX_MULTIPLIER = 2.0;
export const MAX_SLOTS = 2000;

const DEFAULT_STATE_PATH = "H:/prism/state/shared/mill-agi-learning-state.json";

// ═══════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════

export const MillFeedbackKindSchema = z.enum([
  // Lathe-shared
  "speed_feed_outcome",
  "machinist_acceptance",
  "profitability_variance",
  // MILL-CANONICAL
  "chatter_event",        // iter75 tie-in
  "fpa_outcome",          // iter77 tie-in
  "chip_evac_outcome",    // iter73 tie-in
]);
export type MillFeedbackKind = z.infer<typeof MillFeedbackKindSchema>;

/** Mill-canonical feedback kinds not present in lathe AGI. */
export const MILL_CANONICAL_FEEDBACK_KINDS: MillFeedbackKind[] = [
  "chatter_event",
  "fpa_outcome",
  "chip_evac_outcome",
];

export const RecordMillFeedbackInputSchema = z.object({
  feature: z.string().min(1),
  key: z.string().min(1),
  kind: MillFeedbackKindSchema,
  observation: z.number().finite(),
  weight_alpha: z.number().min(0.01).max(1).optional(),
  note: z.string().optional(),
});
export type RecordMillFeedbackInput = z.infer<typeof RecordMillFeedbackInputSchema>;

// ═══════════════════════════════════════════════════════════════════════
// DOMAIN TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface MillSlot {
  feature: string;
  key: string;
  ewma: number;
  sample_count: number;
  last_observation: number;
  last_updated_at: string;
  kinds: Record<MillFeedbackKind, { count: number; ewma: number }>;
}

export interface MillLearningState {
  schemaVersion: 1;
  slots: MillSlot[];
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function round3(n: number): number { return Math.round(n * 1000) / 1000; }

function emptyKindsRecord(): Record<MillFeedbackKind, { count: number; ewma: number }> {
  return {
    speed_feed_outcome: { count: 0, ewma: 0 },
    machinist_acceptance: { count: 0, ewma: 0 },
    profitability_variance: { count: 0, ewma: 0 },
    chatter_event: { count: 0, ewma: 0 },
    fpa_outcome: { count: 0, ewma: 0 },
    chip_evac_outcome: { count: 0, ewma: 0 },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillAGIContinuousLearningEngine {
  private state: MillLearningState;
  private readonly statePath: string;

  constructor(statePath: string = DEFAULT_STATE_PATH) {
    this.statePath = statePath;
    this.state = this.loadState();
  }

  recordFeedback(input: RecordMillFeedbackInput): MillSlot {
    const parsed = RecordMillFeedbackInputSchema.parse(input);
    const alpha = parsed.weight_alpha ?? DEFAULT_ALPHA;
    let slot = this.state.slots.find((s) => s.feature === parsed.feature && s.key === parsed.key);
    if (!slot) {
      slot = {
        feature: parsed.feature,
        key: parsed.key,
        ewma: parsed.observation,
        sample_count: 0,
        last_observation: parsed.observation,
        last_updated_at: new Date().toISOString(),
        kinds: emptyKindsRecord(),
      };
      this.state.slots.push(slot);
      if (this.state.slots.length > MAX_SLOTS) {
        this.state.slots.splice(0, this.state.slots.length - MAX_SLOTS);
      }
    } else if (!slot.kinds) {
      // Defensive: rehydrated state from older schema may lack kinds
      slot.kinds = emptyKindsRecord();
    }

    slot.ewma = slot.sample_count === 0
      ? parsed.observation
      : alpha * parsed.observation + (1 - alpha) * slot.ewma;
    slot.sample_count++;
    slot.last_observation = parsed.observation;
    slot.last_updated_at = new Date().toISOString();

    // Mill-canonical: ensure all 6 kinds present after rehydration of older state
    if (!slot.kinds[parsed.kind]) {
      slot.kinds[parsed.kind] = { count: 0, ewma: 0 };
    }
    const kindBucket = slot.kinds[parsed.kind];
    kindBucket.ewma = kindBucket.count === 0
      ? parsed.observation
      : alpha * parsed.observation + (1 - alpha) * kindBucket.ewma;
    kindBucket.count++;

    this.persist();
    return slot;
  }

  predictAdjustment(feature: string, key: string): number {
    const slot = this.state.slots.find((s) => s.feature === feature && s.key === key);
    if (!slot || slot.sample_count === 0) return 1.0;
    const raw = slot.ewma;
    if (!Number.isFinite(raw)) return 1.0;
    return Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, raw));
  }

  /** Mill-canonical: predict adjustment based on a SPECIFIC feedback kind only. */
  predictAdjustmentByKind(feature: string, key: string, kind: MillFeedbackKind): number {
    const slot = this.state.slots.find((s) => s.feature === feature && s.key === key);
    if (!slot) return 1.0;
    const bucket = slot.kinds[kind];
    if (!bucket || bucket.count === 0) return 1.0;
    if (!Number.isFinite(bucket.ewma)) return 1.0;
    return Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, bucket.ewma));
  }

  getSlot(feature: string, key: string): MillSlot | null {
    return this.state.slots.find((s) => s.feature === feature && s.key === key) ?? null;
  }

  slotsForFeature(feature: string): MillSlot[] {
    return this.state.slots.filter((s) => s.feature === feature);
  }

  resetSlot(feature: string, key: string): void {
    const idx = this.state.slots.findIndex((s) => s.feature === feature && s.key === key);
    if (idx >= 0) {
      this.state.slots.splice(idx, 1);
      this.persist();
    }
  }

  statsByFeature(): Record<string, { slots: number; total_samples: number; mean_ewma: number }> {
    const acc: Record<string, { slots: number; total_samples: number; mean_ewma: number }> = {};
    for (const slot of this.state.slots) {
      const entry = acc[slot.feature] ?? { slots: 0, total_samples: 0, mean_ewma: 0 };
      entry.slots++;
      entry.total_samples += slot.sample_count;
      entry.mean_ewma += slot.ewma;
      acc[slot.feature] = entry;
    }
    for (const feature of Object.keys(acc)) {
      if (acc[feature].slots > 0) {
        acc[feature].mean_ewma = round3(acc[feature].mean_ewma / acc[feature].slots);
      }
    }
    return acc;
  }

  getStats(): {
    feedback_kinds: MillFeedbackKind[];
    mill_canonical_feedback_kinds: MillFeedbackKind[];
    default_alpha: number;
    multiplier_bounds: [number, number];
    max_slots: number;
    reference: string;
  } {
    return {
      feedback_kinds: [
        "speed_feed_outcome", "machinist_acceptance", "profitability_variance",
        "chatter_event", "fpa_outcome", "chip_evac_outcome",
      ],
      mill_canonical_feedback_kinds: MILL_CANONICAL_FEEDBACK_KINDS,
      default_alpha: DEFAULT_ALPHA,
      multiplier_bounds: [MIN_MULTIPLIER, MAX_MULTIPLIER],
      max_slots: MAX_SLOTS,
      reference: "EWMA exponentially-weighted moving average; Box-Jenkins 1976",
    };
  }

  // ───────────────────────── internals ─────────────────────────────────

  private loadState(): MillLearningState {
    if (!existsSync(this.statePath)) return this.freshState();
    try {
      const raw = readFileSync(this.statePath, "utf-8");
      const parsed = JSON.parse(raw) as MillLearningState;
      if (parsed.schemaVersion !== 1) {
        throw new Error(`unsupported schemaVersion ${parsed.schemaVersion}`);
      }
      return parsed;
    } catch {
      const backupPath = `${this.statePath}.corrupt.bak`;
      try {
        const raw = readFileSync(this.statePath, "utf-8");
        atomicWriteJson(backupPath, { backup_at: new Date().toISOString(), raw });
      } catch { /* ignore */ }
      return this.freshState();
    }
  }

  private freshState(): MillLearningState {
    return {
      schemaVersion: 1,
      slots: [],
      updated_at: new Date().toISOString(),
    };
  }

  private persist(): void {
    this.state.updated_at = new Date().toISOString();
    const dir = dirname(this.statePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    atomicWriteJson(this.statePath, this.state);
  }

  __resetForTests(): void {
    this.state = this.freshState();
    this.persist();
  }

  __getState(): Readonly<MillLearningState> {
    return this.state;
  }
}

export const millAGIContinuousLearningEngine = new MillAGIContinuousLearningEngine();
export { MillAGIContinuousLearningEngine };

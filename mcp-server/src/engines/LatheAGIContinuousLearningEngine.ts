/**
 * LatheAGIContinuousLearningEngine — U-LTH59 (LATHE-MASTER PX-S1)
 *
 * Long-running learner: consumes feedback from shop operations and adjusts
 * per-feature weights so next-time predictions on the same case shift
 * measurably. Uses a lightweight EWMA (exponentially-weighted moving
 * average) per (feature, key) slot — the key is an arbitrary string the
 * caller supplies (e.g. "speed_feed:1018|od_turn|2.0mm").
 *
 * Feedback kinds:
 *   - speed_feed_outcome        (actual Vc/fz/force vs predicted)
 *   - machinist_acceptance      (P4 approve/reject)
 *   - profitability_variance    (P5 quote vs actual %)
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
 *   state/shared/lathe-agi-learning-state.json, schemaVersion=1.
 *
 * @milestone LATHE-MASTER U-LTH59
 */

import { z } from "zod";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { atomicWriteJson } from "../utils/atomicSessionWrite.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_ALPHA = 0.2;
const MIN_MULTIPLIER = 0.5;
const MAX_MULTIPLIER = 2.0;
const MAX_SLOTS = 2000;

// ============================================================================
// SCHEMAS
// ============================================================================

export const FeedbackKindSchema = z.enum([
  "speed_feed_outcome",
  "machinist_acceptance",
  "profitability_variance",
]);
export type FeedbackKind = z.infer<typeof FeedbackKindSchema>;

export const RecordFeedbackInputSchema = z.object({
  feature: z.string().min(1),
  key: z.string().min(1),
  kind: FeedbackKindSchema,
  observation: z.number().finite(),
  weight_alpha: z.number().min(0.01).max(1).optional(),
  note: z.string().optional(),
});
export type RecordFeedbackInput = z.infer<typeof RecordFeedbackInputSchema>;

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export interface Slot {
  feature: string;
  key: string;
  ewma: number;
  sample_count: number;
  last_observation: number;
  last_updated_at: string;
  kinds: Record<FeedbackKind, { count: number; ewma: number }>;
}

export interface LearningState {
  schemaVersion: 1;
  slots: Slot[];
  updated_at: string;
}

// ============================================================================
// ENGINE
// ============================================================================

const DEFAULT_STATE_PATH = "H:/prism/state/shared/lathe-agi-learning-state.json";

class LatheAGIContinuousLearningEngine {
  private state: LearningState;
  private readonly statePath: string;

  constructor(statePath: string = DEFAULT_STATE_PATH) {
    this.statePath = statePath;
    this.state = this.loadState();
  }

  /**
   * Record one feedback observation. Updates EWMA for (feature, key).
   * Returns the updated slot.
   */
  recordFeedback(input: RecordFeedbackInput): Slot {
    const parsed = RecordFeedbackInputSchema.parse(input);
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
        kinds: {
          speed_feed_outcome: { count: 0, ewma: 0 },
          machinist_acceptance: { count: 0, ewma: 0 },
          profitability_variance: { count: 0, ewma: 0 },
        },
      };
      this.state.slots.push(slot);
      if (this.state.slots.length > MAX_SLOTS) {
        this.state.slots.splice(0, this.state.slots.length - MAX_SLOTS);
      }
    }

    slot.ewma = slot.sample_count === 0
      ? parsed.observation
      : alpha * parsed.observation + (1 - alpha) * slot.ewma;
    slot.sample_count++;
    slot.last_observation = parsed.observation;
    slot.last_updated_at = new Date().toISOString();

    const kindBucket = slot.kinds[parsed.kind];
    kindBucket.ewma = kindBucket.count === 0
      ? parsed.observation
      : alpha * parsed.observation + (1 - alpha) * kindBucket.ewma;
    kindBucket.count++;

    this.persist();
    return slot;
  }

  /**
   * Predict the adjustment multiplier for a (feature, key). Clamped to
   * [0.5, 2.0] so a single wild observation cannot explode the next quote.
   * Returns 1.0 when no slot exists (neutral / no learning yet).
   */
  predictAdjustment(feature: string, key: string): number {
    const slot = this.state.slots.find((s) => s.feature === feature && s.key === key);
    if (!slot || slot.sample_count === 0) return 1.0;
    const raw = slot.ewma;
    if (!Number.isFinite(raw)) return 1.0;
    return Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, raw));
  }

  /** Look up a slot by (feature, key); null if unseen. */
  getSlot(feature: string, key: string): Slot | null {
    return this.state.slots.find((s) => s.feature === feature && s.key === key) ?? null;
  }

  /** List all slots for a feature, most-recent last. */
  slotsForFeature(feature: string): Slot[] {
    return this.state.slots.filter((s) => s.feature === feature);
  }

  /** Reset a single slot (for adversarial recovery). */
  resetSlot(feature: string, key: string): void {
    const idx = this.state.slots.findIndex((s) => s.feature === feature && s.key === key);
    if (idx >= 0) {
      this.state.slots.splice(idx, 1);
      this.persist();
    }
  }

  /** Aggregate stats by feature. */
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

  // ==========================================================================
  // INTERNALS
  // ==========================================================================

  private loadState(): LearningState {
    if (!existsSync(this.statePath)) return this.freshState();
    try {
      const raw = readFileSync(this.statePath, "utf-8");
      const parsed = JSON.parse(raw) as LearningState;
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

  private freshState(): LearningState {
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

  __getState(): Readonly<LearningState> {
    return this.state;
  }
}

function round3(n: number): number { return Math.round(n * 1000) / 1000; }

export const latheAGIContinuousLearningEngine = new LatheAGIContinuousLearningEngine();
export { LatheAGIContinuousLearningEngine };

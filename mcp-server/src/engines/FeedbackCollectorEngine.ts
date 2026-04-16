/**
 * FeedbackCollectorEngine — Phase 0.19 U-LLM10
 *
 * Operator-facing front door into `OutcomeTrackingEngine`. Web and CLI
 * skills shouldn't need to know the raw Zod schema — they call one of
 * four shop-friendly verbs (`thumbsUp`, `thumbsDown`, `adjusted`,
 * `aborted`) and we normalize into the outcome log.
 *
 * This is intentionally thin:
 *   - Accept loose operator input (ok / bad / scrap) and canonicalize.
 *   - Always pipe through `OutcomeTrackingEngine` so there is exactly
 *     one storage path for shop outcomes.
 *   - Return a small, UI-ready summary after logging (kind, programId,
 *     a short human sentence, whether it triggered a follow-up alert).
 *
 * Follow-up alerts: we flag programs as "needs-attention" when they
 * hit 2+ scrap outcomes or 3+ adjusted outcomes — downstream UIs can
 * use that to push the operator toward a retrain or manual review.
 *
 * @module engines/FeedbackCollectorEngine
 * @milestone PP-0.19-U-LLM10
 */

import {
  OutcomeTrackingEngine,
  outcomeTrackingEngine,
  type OutcomeInput,
  type OutcomeKind,
  type OutcomeRecord,
} from "./OutcomeTrackingEngine.js";

export interface FeedbackMeta {
  machineId?: string;
  materialId?: string;
  toolIds?: string[];
  operatorId?: string;
  notes?: string;
  metrics?: OutcomeInput["metrics"];
}

export interface FeedbackResult {
  ok: boolean;
  record: OutcomeRecord | null;
  summary: string;
  needsAttention: boolean;
  attentionReason?: string;
  error: string | null;
}

export interface FeedbackCollectorDeps {
  tracker?: OutcomeTrackingEngine;
  /** Thresholds for the "needs attention" flag. */
  scrapAttentionThreshold?: number;
  adjustedAttentionThreshold?: number;
}

const LOOSE_OK = new Set(["ok", "good", "pass", "y", "yes", "1", "thumbsup"]);
const LOOSE_BAD = new Set([
  "bad",
  "scrap",
  "ng",
  "fail",
  "n",
  "no",
  "0",
  "thumbsdown",
]);
const LOOSE_ADJ = new Set(["adj", "adjusted", "tuned", "retuned", "fixed"]);
const LOOSE_ABORT = new Set(["abort", "aborted", "stop", "stopped", "cancelled"]);

export class FeedbackCollectorEngine {
  private tracker: OutcomeTrackingEngine;
  private scrapLimit: number;
  private adjustedLimit: number;

  constructor(deps: FeedbackCollectorDeps = {}) {
    this.tracker = deps.tracker ?? outcomeTrackingEngine;
    this.scrapLimit = deps.scrapAttentionThreshold ?? 2;
    this.adjustedLimit = deps.adjustedAttentionThreshold ?? 3;
  }

  async thumbsUp(programId: string, meta: FeedbackMeta = {}): Promise<FeedbackResult> {
    return this.record(programId, "good", meta);
  }

  async thumbsDown(
    programId: string,
    reason: string,
    meta: FeedbackMeta = {},
  ): Promise<FeedbackResult> {
    const merged: FeedbackMeta = {
      ...meta,
      metrics: { ...(meta.metrics ?? {}), scrapReason: reason },
    };
    return this.record(programId, "scrap", merged);
  }

  async adjusted(
    programId: string,
    adjustments: OutcomeInput["adjustments"],
    meta: FeedbackMeta = {},
  ): Promise<FeedbackResult> {
    return this.record(programId, "adjusted", meta, adjustments);
  }

  async aborted(
    programId: string,
    reason: string,
    meta: FeedbackMeta = {},
  ): Promise<FeedbackResult> {
    const merged: FeedbackMeta = {
      ...meta,
      notes: [meta.notes, `aborted: ${reason}`].filter(Boolean).join(" | "),
    };
    return this.record(programId, "aborted", merged);
  }

  /** Loose-string entry point for operator-typed shortcuts. */
  async recordLoose(
    programId: string,
    loose: string,
    meta: FeedbackMeta = {},
  ): Promise<FeedbackResult> {
    const kind = this.canonicalize(loose);
    if (!kind) {
      return {
        ok: false,
        record: null,
        summary: `unknown outcome "${loose}" — use thumbs-up / thumbs-down / adjusted / aborted`,
        needsAttention: false,
        error: "unknown outcome kind",
      };
    }
    return this.record(programId, kind, meta);
  }

  /** Programs flagged for manual review (crossed scrap/adjust thresholds). */
  async programsNeedingAttention(): Promise<
    Array<{ programId: string; scraps: number; adjusts: number; reason: string }>
  > {
    const rows = await this.tracker.query();
    const byProgram = new Map<
      string,
      { scraps: number; adjusts: number }
    >();
    for (const r of rows) {
      const agg = byProgram.get(r.programId) ?? { scraps: 0, adjusts: 0 };
      if (r.outcome === "scrap") agg.scraps++;
      if (r.outcome === "adjusted") agg.adjusts++;
      byProgram.set(r.programId, agg);
    }
    const flagged: Array<{
      programId: string;
      scraps: number;
      adjusts: number;
      reason: string;
    }> = [];
    for (const [programId, agg] of byProgram) {
      const reason = this.attentionReason(agg.scraps, agg.adjusts);
      if (reason) flagged.push({ programId, ...agg, reason });
    }
    return flagged.sort((a, b) => b.scraps - a.scraps || b.adjusts - a.adjusts);
  }

  // ── internals ────────────────────────────────────────────────────────

  private async record(
    programId: string,
    kind: OutcomeKind,
    meta: FeedbackMeta,
    adjustments?: OutcomeInput["adjustments"],
  ): Promise<FeedbackResult> {
    if (!programId || programId.trim() === "") {
      return this.error("programId required");
    }
    try {
      const record = await this.tracker.log({
        programId,
        outcome: kind,
        machineId: meta.machineId,
        materialId: meta.materialId,
        toolIds: meta.toolIds,
        operatorId: meta.operatorId,
        notes: meta.notes,
        metrics: meta.metrics,
        adjustments,
      });
      const history = await this.tracker.forProgram(programId);
      const scraps = history.filter((h) => h.outcome === "scrap").length;
      const adjusts = history.filter((h) => h.outcome === "adjusted").length;
      const reason = this.attentionReason(scraps, adjusts);
      return {
        ok: true,
        record,
        summary: this.summarize(kind, programId, meta),
        needsAttention: reason !== null,
        attentionReason: reason ?? undefined,
        error: null,
      };
    } catch (e) {
      return this.error((e as Error)?.message ?? String(e));
    }
  }

  private canonicalize(loose: string): OutcomeKind | null {
    const key = loose.trim().toLowerCase();
    if (LOOSE_OK.has(key)) return "good";
    if (LOOSE_BAD.has(key)) return "scrap";
    if (LOOSE_ADJ.has(key)) return "adjusted";
    if (LOOSE_ABORT.has(key)) return "aborted";
    return null;
  }

  private summarize(
    kind: OutcomeKind,
    programId: string,
    meta: FeedbackMeta,
  ): string {
    const who = meta.operatorId ? ` by ${meta.operatorId}` : "";
    const machine = meta.machineId ? ` on ${meta.machineId}` : "";
    switch (kind) {
      case "good":
        return `Good run logged for ${programId}${machine}${who}.`;
      case "scrap":
        return `Scrap logged for ${programId}${machine}${who} — review coming.`;
      case "adjusted":
        return `Adjustment recorded for ${programId}${machine}${who}.`;
      case "aborted":
        return `Aborted run logged for ${programId}${machine}${who}.`;
    }
  }

  private attentionReason(scraps: number, adjusts: number): string | null {
    if (scraps >= this.scrapLimit) return `${scraps} scrap outcomes`;
    if (adjusts >= this.adjustedLimit) return `${adjusts} adjusted outcomes`;
    return null;
  }

  private error(msg: string): FeedbackResult {
    return {
      ok: false,
      record: null,
      summary: `feedback failed: ${msg}`,
      needsAttention: false,
      error: msg,
    };
  }
}

export const feedbackCollectorEngine = new FeedbackCollectorEngine();

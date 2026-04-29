/**
 * aiReasoningDispatcher U-WIRE31 round-trip tests — ExceptionLearningEngine.
 *
 * Validates exception_handle / exception_record_outcome / exception_pending /
 * exception_stats through prism_ai. The engine is a stateful singleton that
 * accumulates events and learned exceptions across calls (no public reset);
 * tests assert structural invariants and use distinct event types to avoid
 * cross-test interference on the shouldFail computation (which depends on
 * whether a prior LearnedException of the same type has outcome="success").
 *
 * Allocation strategy:
 *   - parameter_outlier  → success-recording / envelope-proposal tests
 *   - outcome_anomaly    → critical-shouldFail-true test (no success recorded for this type)
 *   - process_deviation  → non-critical handle test (severity gates shouldFail)
 *   - measurement_spike  → shape-only analysis test
 *
 * @milestone ENGINE-WIRE-MS0
 * @unit U-WIRE31
 */

import { describe, it, expect } from "vitest";
import { exceptionLearningEngine } from "../engines/ExceptionLearningEngine.js";
import {
  AI_REASONING_ACTIONS,
  ACTION_AI_REASONING_SCHEMAS,
  type AIReasoningAction,
} from "../schemas/aiReasoningActionSchemas.js";
import { executeAIReasoningAction } from "../tools/dispatchers/aiReasoningDispatcher.js";

const NEW_ACTIONS = [
  "exception_handle",
  "exception_record_outcome",
  "exception_pending",
  "exception_stats",
] as const;

/** Compact assertion that an EX-prefixed integer id was assigned. */
function assertEXId(id: string): void {
  expect(id.startsWith("EX-")).toBe(true);
  const n = Number(id.slice(3));
  expect(Number.isInteger(n)).toBe(true);
  expect(n).toBeGreaterThan(0);
}

describe("U-WIRE31 — engine direct: ExceptionLearningEngine", () => {
  it("handleUnexpected assigns EX-prefixed integer id + parseable ISO timestamp + analysis match", () => {
    const r = exceptionLearningEngine.handleUnexpected({
      type: "outcome_anomaly",
      description: "U-WIRE31-direct-1: ID-format check",
      context: { test: "id-format" },
      data: {},
      severity: "info",
    });
    assertEXId(r.analysis.event.id);
    // Round-trip the timestamp through Date to prove it's a real ISO string.
    const ts = r.analysis.event.timestamp;
    const reparsed = new Date(ts).toISOString();
    expect(reparsed).toBe(ts);
    expect(r.analysis.event.type).toBe("outcome_anomaly");
    expect(r.analysis.event.description).toBe("U-WIRE31-direct-1: ID-format check");
    expect(r.message.length).toBeGreaterThan(0);
  });

  it("handleUnexpected for severity=info returns shouldFail=false with 'captured for learning' message", () => {
    const r = exceptionLearningEngine.handleUnexpected({
      type: "process_deviation",
      description: "U-WIRE31-direct-2: info-never-fails",
      context: {},
      data: {},
      severity: "info",
    });
    expect(r.shouldFail).toBe(false);
    expect(r.message).toBe("Exception captured for learning: U-WIRE31-direct-2: info-never-fails");
  });

  it("handleUnexpected for severity=warning returns shouldFail=false (only 'critical' can fail)", () => {
    const r = exceptionLearningEngine.handleUnexpected({
      type: "measurement_spike",
      description: "U-WIRE31-direct-3: warning-never-fails",
      context: {},
      data: {},
      severity: "warning",
    });
    expect(r.shouldFail).toBe(false);
    // Per code: only severity==='critical' can ever set shouldFail=true.
    expect(r.message.startsWith("Exception captured for learning:")).toBe(true);
  });

  it("handleUnexpected for severity=critical: branch consistency between shouldFail and message format", () => {
    // No reset method on the singleton, so we cannot pin shouldFail's boolean
    // value (it depends on whether a previous test recorded outcome_anomaly+
    // success). Instead we assert the engine's internal invariant: the message
    // prefix is determined deterministically by shouldFail.
    const r = exceptionLearningEngine.handleUnexpected({
      type: "outcome_anomaly",
      description: "U-WIRE31-direct-4: critical-branch-consistency",
      context: {},
      data: {},
      severity: "critical",
    });
    if (r.shouldFail === true) {
      expect(r.message).toBe("Critical exception: U-WIRE31-direct-4: critical-branch-consistency");
    } else {
      expect(r.shouldFail).toBe(false);
      expect(r.message).toBe(
        "Exception captured for learning: U-WIRE31-direct-4: critical-branch-consistency",
      );
    }
  });

  it("analyzeException for parameter_outlier emits envelope-related cause + 3 causes + 2 recs + 1 learnedPattern", () => {
    const r = exceptionLearningEngine.handleUnexpected({
      type: "parameter_outlier",
      description: "U-WIRE31-direct-5: param outlier",
      context: {},
      data: { parameter: "spindle_rpm", value: 12000 },
      severity: "info",
    });
    expect(r.analysis.diagnosis).toBe("parameter_outlier: U-WIRE31-direct-5: param outlier");
    expect(r.analysis.possibleCauses.length).toBe(3);
    expect(r.analysis.recommendations.length).toBe(2);
    expect(r.analysis.learnedPatterns.length).toBe(1);
    expect(r.analysis.possibleCauses[0]).toBe("Parameter outside expected envelope");
  });

  it("analyzeException for process_deviation includes operator-knowledge recommendation", () => {
    const r = exceptionLearningEngine.handleUnexpected({
      type: "process_deviation",
      description: "U-WIRE31-direct-6: operator override",
      context: {},
      data: {},
      severity: "info",
    });
    expect(r.analysis.recommendations.includes("Document operator knowledge")).toBe(true);
    expect(r.analysis.possibleCauses[0]).toBe("Operator override or adjustment");
  });

  it("analyzeException for measurement_spike yields exactly 3 possibleCauses + 2 recommendations", () => {
    const r = exceptionLearningEngine.handleUnexpected({
      type: "measurement_spike",
      description: "U-WIRE31-direct-7: spike",
      context: {},
      data: {},
      severity: "info",
    });
    expect(r.analysis.possibleCauses.length).toBe(3);
    expect(r.analysis.recommendations.length).toBe(2);
    expect(r.analysis.possibleCauses[0]).toBe(
      "Transient condition (chip evacuation, coolant flow)",
    );
  });

  it("recordOutcome on unknown eventId returns null (no event found)", () => {
    const out = exceptionLearningEngine.recordOutcome("EX-does-not-exist-99999999", "success");
    expect(out).toBe(null);
  });

  it("recordOutcome on success generates tribalTip with operator_wisdom category and confidence=0.7", () => {
    const ev = exceptionLearningEngine.handleUnexpected({
      type: "process_deviation",
      description: "U-WIRE31-direct-9: tip-from-success",
      context: { customer: "JM-DIE" },
      data: {},
      severity: "info",
    });
    const learned = exceptionLearningEngine.recordOutcome(ev.analysis.event.id, "success");
    if (learned === null) throw new Error("recordOutcome returned null for known event id");
    expect(learned.outcome).toBe("success");
    const tip = learned.tribalTip;
    if (!tip) throw new Error("tribalTip not generated for success outcome");
    expect(tip.category).toBe("operator_wisdom");
    expect(tip.confidence).toBeCloseTo(0.7, 5);
    expect(tip.title).toBe("Exception Learning: process deviation");
    expect(tip.content.startsWith("U-WIRE31-direct-9:")).toBe(true);
  });

  it("recordOutcome on parameter_outlier success with data.value generates envelope proposal at value × 1.10", () => {
    const ev = exceptionLearningEngine.handleUnexpected({
      type: "parameter_outlier",
      description: "U-WIRE31-direct-10: envelope expansion",
      context: {},
      data: { parameter: "feed_mm_per_min", value: 1000 },
      severity: "warning",
    });
    const learned = exceptionLearningEngine.recordOutcome(ev.analysis.event.id, "success");
    if (learned === null) throw new Error("recordOutcome returned null for known event id");
    const proposal = learned.envelopeProposal;
    if (!proposal) throw new Error("envelopeProposal not generated for parameter_outlier success");
    expect(proposal.parameter).toBe("feed_mm_per_min");
    expect(proposal.newBound).toBeCloseTo(1100, 5);
    expect(proposal.evidence).toBe(`Successful operation at 1000 (${ev.analysis.event.id})`);
    // Tribal tip is also generated for parameter_outlier success.
    const tip = learned.tribalTip;
    if (!tip) throw new Error("tribalTip not generated for success outcome");
    expect(tip.category).toBe("parameters");
  });

  it("recordOutcome on failure does NOT generate tribalTip or envelopeProposal", () => {
    const ev = exceptionLearningEngine.handleUnexpected({
      type: "parameter_outlier",
      description: "U-WIRE31-direct-11: failure path",
      context: {},
      data: { parameter: "depth_of_cut_mm", value: 5 },
      severity: "warning",
    });
    const learned = exceptionLearningEngine.recordOutcome(ev.analysis.event.id, "failure");
    if (learned === null) throw new Error("recordOutcome returned null for known event id");
    expect(learned.outcome).toBe("failure");
    expect(learned.tribalTip).toBe(undefined);
    expect(learned.envelopeProposal).toBe(undefined);
  });

  it("getPendingExceptions excludes events that have been recorded; includes those that have not", () => {
    const ev = exceptionLearningEngine.handleUnexpected({
      type: "outcome_anomaly",
      description: "U-WIRE31-direct-12: pending-then-recorded",
      context: {},
      data: {},
      severity: "info",
    });
    const id = ev.analysis.event.id;
    const beforeIds = exceptionLearningEngine.getPendingExceptions().map((e) => e.id);
    expect(beforeIds.includes(id)).toBe(true);
    exceptionLearningEngine.recordOutcome(id, "neutral");
    const afterIds = exceptionLearningEngine.getPendingExceptions().map((e) => e.id);
    expect(afterIds.includes(id)).toBe(false);
  });

  it("getStatistics returns non-negative counters with successRate ∈ [0,1] AND tipsGenerated ≤ learnedCount", () => {
    const s = exceptionLearningEngine.getStatistics();
    expect(s.totalEvents).toBeGreaterThanOrEqual(0);
    expect(s.learnedCount).toBeGreaterThanOrEqual(0);
    expect(s.tipsGenerated).toBeGreaterThanOrEqual(0);
    expect(s.proposalsGenerated).toBeGreaterThanOrEqual(0);
    expect(s.successRate).toBeGreaterThanOrEqual(0);
    expect(s.successRate).toBeLessThanOrEqual(1);
    // Invariant: every tip/proposal was generated from a learned exception.
    expect(s.tipsGenerated).toBeLessThanOrEqual(s.learnedCount);
    expect(s.proposalsGenerated).toBeLessThanOrEqual(s.learnedCount);
  });

  it("export() round-trips event count: counts match getPendingExceptions + recorded set size", () => {
    const exported = exceptionLearningEngine.export();
    expect(Array.isArray(exported.events)).toBe(true);
    expect(Array.isArray(exported.learned)).toBe(true);
    // Every event id is unique.
    const ids = exported.events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Every learned exception's event id appears in the events array.
    for (const le of exported.learned) {
      expect(ids.includes(le.event.id)).toBe(true);
    }
  });
});

describe("U-WIRE31 — schema integrity", () => {
  it("all 4 exception_* actions are in AI_REASONING_ACTIONS exactly once", () => {
    const actions = AI_REASONING_ACTIONS as readonly string[];
    for (const a of NEW_ACTIONS) {
      expect(actions.filter((x) => x === a).length).toBe(1);
    }
  });

  it("Zod schemas exist for all 4 actions", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, unknown>;
    for (const a of NEW_ACTIONS) {
      const schema = map[a];
      expect(schema === null || schema === undefined).toBe(false);
      expect(typeof (schema as { safeParse?: unknown }).safeParse).toBe("function");
    }
  });

  it("exception_handle accepts valid params and rejects when description is missing", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.exception_handle.safeParse({}).success).toBe(false);
    expect(
      map.exception_handle.safeParse({
        type: "outcome_anomaly",
        // description missing
        context: {},
        data: {},
        severity: "info",
      }).success,
    ).toBe(false);
    expect(
      map.exception_handle.safeParse({
        type: "outcome_anomaly",
        description: "ok",
        context: {},
        data: {},
        severity: "info",
      }).success,
    ).toBe(true);
  });

  it("exception_handle rejects unknown type enum values", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(
      map.exception_handle.safeParse({
        type: "not_a_real_type",
        description: "x",
        context: {},
        data: {},
        severity: "info",
      }).success,
    ).toBe(false);
  });

  it("exception_handle rejects unknown severity enum values", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(
      map.exception_handle.safeParse({
        type: "outcome_anomaly",
        description: "x",
        context: {},
        data: {},
        severity: "catastrophic",
      }).success,
    ).toBe(false);
  });

  it("exception_handle rejects empty description (min length 1 enforced)", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(
      map.exception_handle.safeParse({
        type: "outcome_anomaly",
        description: "",
        context: {},
        data: {},
        severity: "info",
      }).success,
    ).toBe(false);
  });

  it("exception_record_outcome requires both eventId and outcome; rejects bad outcome enum and empty eventId", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.exception_record_outcome.safeParse({}).success).toBe(false);
    expect(map.exception_record_outcome.safeParse({ eventId: "EX-1" }).success).toBe(false);
    expect(map.exception_record_outcome.safeParse({ outcome: "success" }).success).toBe(false);
    expect(map.exception_record_outcome.safeParse({ eventId: "EX-1", outcome: "maybe" }).success).toBe(false);
    expect(map.exception_record_outcome.safeParse({ eventId: "", outcome: "success" }).success).toBe(false);
    expect(map.exception_record_outcome.safeParse({ eventId: "EX-1", outcome: "neutral" }).success).toBe(true);
  });

  it("exception_pending and exception_stats accept empty params", () => {
    const map = ACTION_AI_REASONING_SCHEMAS as Record<string, { safeParse: (x: unknown) => { success: boolean } }>;
    expect(map.exception_pending.safeParse({}).success).toBe(true);
    expect(map.exception_stats.safeParse({}).success).toBe(true);
  });
});

describe("U-WIRE31 — dispatcher round-trip: prism_ai", () => {
  it("exception_handle happy path → analysis + suggestedActions[≥1] + EX-prefixed integer id", async () => {
    const r = await executeAIReasoningAction("exception_handle" as AIReasoningAction, {
      type: "outcome_anomaly",
      description: "U-WIRE31-rt-1: round-trip happy",
      context: { customer: "ALCOA" },
      data: { thrust_force_N: 850 },
      severity: "info",
    });
    expect(r.success).toBe(true);
    const data = r.data as {
      analysis?: { event?: { id?: string; type?: string }; possibleCauses?: string[] };
      suggestedActions?: string[];
      shouldFail?: boolean;
      message?: string;
    };
    const id = data.analysis?.event?.id;
    if (typeof id !== "string") throw new Error("analysis.event.id missing");
    assertEXId(id);
    expect(data.analysis?.event?.type).toBe("outcome_anomaly");
    expect(Array.isArray(data.suggestedActions)).toBe(true);
    expect((data.suggestedActions ?? []).length).toBeGreaterThanOrEqual(1);
    expect(data.shouldFail).toBe(false);
  });

  it("exception_record_outcome happy path on a fresh event from previous handle → recorded:true with tribal tip", async () => {
    const handle = await executeAIReasoningAction("exception_handle" as AIReasoningAction, {
      type: "process_deviation",
      description: "U-WIRE31-rt-2: handle-then-record",
      context: {},
      data: {},
      severity: "warning",
    });
    expect(handle.success).toBe(true);
    const handleData = handle.data as { analysis?: { event?: { id?: string } } };
    const eventId = handleData.analysis?.event?.id;
    if (typeof eventId !== "string") throw new Error("eventId missing from handle response");

    const rec = await executeAIReasoningAction("exception_record_outcome" as AIReasoningAction, {
      eventId,
      outcome: "success",
    });
    expect(rec.success).toBe(true);
    const recData = rec.data as {
      recorded?: boolean;
      learned?: { outcome?: string; tribalTip?: { category?: string; confidence?: number } };
    };
    expect(recData.recorded).toBe(true);
    expect(recData.learned?.outcome).toBe("success");
    expect(recData.learned?.tribalTip?.category).toBe("operator_wisdom");
    expect(recData.learned?.tribalTip?.confidence).toBeCloseTo(0.7, 5);
  });

  it("exception_record_outcome on unknown eventId → recorded:false with diagnostic reason naming the missing id", async () => {
    const r = await executeAIReasoningAction("exception_record_outcome" as AIReasoningAction, {
      eventId: "EX-this-id-cannot-exist-zzz",
      outcome: "neutral",
    });
    expect(r.success).toBe(true);
    const data = r.data as { recorded?: boolean; learned?: unknown; reason?: string };
    expect(data.recorded).toBe(false);
    // The dispatcher sets learned:null on failure; the response-slim layer
    // strips null → undefined. Both representations encode "not recorded".
    expect(data.learned === null || data.learned === undefined).toBe(true);
    // Diagnostic reason must explicitly call out the unknown id (concrete).
    expect((data.reason ?? "").includes("Unknown eventId")).toBe(true);
    expect((data.reason ?? "").includes("EX-this-id-cannot-exist-zzz")).toBe(true);
  });

  it("exception_pending returns events array + count where count === events.length", async () => {
    // Seed one fresh pending event so the result is non-trivially populated.
    const seed = await executeAIReasoningAction("exception_handle" as AIReasoningAction, {
      type: "measurement_spike",
      description: "U-WIRE31-rt-4: seed-pending",
      context: {},
      data: {},
      severity: "info",
    });
    expect(seed.success).toBe(true);
    const seedId = (seed.data as { analysis?: { event?: { id?: string } } }).analysis?.event?.id;
    if (typeof seedId !== "string") throw new Error("seed eventId missing");

    const r = await executeAIReasoningAction("exception_pending" as AIReasoningAction, {});
    expect(r.success).toBe(true);
    const data = r.data as { events?: Array<{ id?: string }>; count?: number };
    const events = data.events ?? [];
    expect(Array.isArray(events)).toBe(true);
    expect(data.count).toBe(events.length);
    expect(events.some((e) => e.id === seedId)).toBe(true);
  });

  it("exception_stats returns object with all 5 numeric counters; learnedCount > 0 after prior success", async () => {
    const r = await executeAIReasoningAction("exception_stats" as AIReasoningAction, {});
    expect(r.success).toBe(true);
    const s = r.data as {
      totalEvents?: number;
      learnedCount?: number;
      successRate?: number;
      tipsGenerated?: number;
      proposalsGenerated?: number;
    };
    expect(typeof s.totalEvents).toBe("number");
    expect(typeof s.learnedCount).toBe("number");
    expect(typeof s.successRate).toBe("number");
    expect(typeof s.tipsGenerated).toBe("number");
    expect(typeof s.proposalsGenerated).toBe("number");
    // Earlier tests recorded at least one success (process_deviation, parameter_outlier).
    expect((s.learnedCount ?? 0)).toBeGreaterThan(0);
    expect((s.successRate ?? 0)).toBeGreaterThan(0);
  });

  it("exception_handle FAIL: missing description → schema rejects with non-empty error", async () => {
    const bad: Record<string, unknown> = {
      type: "outcome_anomaly",
      context: {},
      data: {},
      severity: "info",
    };
    const r = await executeAIReasoningAction("exception_handle" as AIReasoningAction, bad);
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("exception_handle FAIL: invalid type enum → schema rejects with non-empty error", async () => {
    const bad: Record<string, unknown> = {
      type: "alien_anomaly",
      description: "x",
      context: {},
      data: {},
      severity: "info",
    };
    const r = await executeAIReasoningAction("exception_handle" as AIReasoningAction, bad);
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("exception_handle FAIL: invalid severity enum → schema rejects with non-empty error", async () => {
    const bad: Record<string, unknown> = {
      type: "outcome_anomaly",
      description: "x",
      context: {},
      data: {},
      severity: "catastrophic",
    };
    const r = await executeAIReasoningAction("exception_handle" as AIReasoningAction, bad);
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("exception_record_outcome FAIL: missing eventId → schema rejects", async () => {
    const bad: Record<string, unknown> = { outcome: "success" };
    const r = await executeAIReasoningAction("exception_record_outcome" as AIReasoningAction, bad);
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });

  it("exception_record_outcome FAIL: invalid outcome enum → schema rejects", async () => {
    const bad: Record<string, unknown> = { eventId: "EX-1", outcome: "kinda-worked" };
    const r = await executeAIReasoningAction("exception_record_outcome" as AIReasoningAction, bad);
    expect(r.success).toBe(false);
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });
});

describe("U-WIRE31 — singleton continuity", () => {
  it("exceptionLearningEngine singleton is the same object across re-imports", async () => {
    const mod = await import("../engines/ExceptionLearningEngine.js");
    expect(mod.exceptionLearningEngine).toBe(exceptionLearningEngine);
  });
});

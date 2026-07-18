/**
 * camDispatcher 2-phase decision-capture loop tests
 * (CAM-LEARNING-LOOP/U-KILO-DECISION-2PHASE, slot:kilo 2026-07-01).
 *
 * Companion suite for CAMDecisionLogEngine -- exercised THROUGH the dispatcher
 * per R15 (round-trip, not singleton-only), plus direct engine taps where a
 * store-failure must be injected.
 *
 * WHAT THE LOOP MUST GUARANTEE (intent, R9):
 *   Phase 1 -- a completed CAM decision action (here: cam_strategy_recommend,
 *     the local/deterministic emitter; cam_dl_decide / cam_reasoning_decide
 *     share the same captureCamDecision tail tap) returns a stable decisionId
 *     and logs a snapshot that carries NO correctness verdict. Nothing is fed
 *     to CAMFeedbackLoopEngine at decision time -- the rejected design
 *     (recordOutcome with forced wasCorrect=true at emission) would falsify
 *     the Mann-Kendall drift metric, and these tests FAIL if it is ever
 *     reintroduced.
 *   Phase 2 -- cam_decision_outcome correlates the operator verdict/override
 *     back into CAMFeedbackLoopEngine.recordOutcome/recordCorrection using the
 *     logged snapshot. Unknown id / double-resolve are structured errors that
 *     never touch the metric.
 *
 * Dispatcher envelope notes (mirrors camDispatcher.uwireCamSubprogSync.test.ts):
 * success payload is content[0].text = JSON.stringify(slimResponse(result));
 * a Zod/schema failure returns a raw { success:false } dispatcherError object.
 * slimResponse strips null/undefined/empty-arrays but KEEPS false/0.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";
import { CAMDecisionLogEngine } from "../engines/CAMDecisionLogEngine.js";
import { CAMFeedbackLoopEngine } from "../engines/CAMFeedbackLoopEngine.js";

// ---------------------------------------------------------------------------
// Dispatcher harness
// ---------------------------------------------------------------------------

interface CapturedTool {
  name: string; description: string; schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}
function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerCamDispatcher(s as unknown as { tool: MockMCPServer["tool"] });
  return s;
}
async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools.find((t) => t.name === "prism_cam") ?? server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const text = (raw as { content: { type: string; text: string }[] }).content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || ("error" in parsed && !("success" in parsed)))) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Local + deterministic decision emitter: HyperMillStrategyEngine.recommend
// (pocket_2d + roughing resolves from the static STRATEGIES catalog; no
// network, no safety-check params so runHyperMillSafetyChecks passes clean).
const STRAT_PARAMS = {
  geometry_type: "pocket_2d",
  operation_goal: "roughing",
  material_group: "P",
  tool_diameter_mm: 10,
};

const TMP_ROOT = mkdtempSync(join(tmpdir(), "cam-decision-loop-"));
let storeCounter = 0;

/** Phase-1 emit via the dispatcher; returns the attached decisionId. */
async function emitDecision(s: MockMCPServer): Promise<string> {
  const r = await call(s, "cam_strategy_recommend", { ...STRAT_PARAMS });
  expect(r.ok).toBe(true);
  expect(typeof r.data.decisionId).toBe("string");
  return r.data.decisionId as string;
}

beforeEach(() => {
  storeCounter += 1;
  CAMDecisionLogEngine.setStorePath(join(TMP_ROOT, `store-${storeCounter}.json`));
  CAMDecisionLogEngine.setLogCap(5000);
  CAMDecisionLogEngine.clearAll();
  CAMFeedbackLoopEngine.clearAll();
});

afterAll(() => {
  rmSync(TMP_ROOT, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("U-KILO-DECISION-2PHASE -- 2-phase CAM decision-capture loop via prism_cam", () => {
  it("registers the prism_cam tool", () => {
    const tool = newServer().tools.find((t) => t.name === "prism_cam");
    expect(tool?.name).toBe("prism_cam");
  });

  // -- Phase 1: capture -----------------------------------------------------

  it("Phase 1: cam_strategy_recommend returns a stable decisionId and feeds NOTHING to the feedback engine at decision time", async () => {
    const s = newServer();
    const r = await call(s, "cam_strategy_recommend", { ...STRAT_PARAMS });
    expect(r.ok).toBe(true);
    // Real strategy recommendation came back (not a stub envelope).
    expect(typeof r.data.strategyName).toBe("string");
    expect((r.data.strategyName as string).length).toBeGreaterThan(0);
    // Stable id attached top-level + capture receipt.
    expect(r.data.decisionId).toMatch(/^camdec-/);
    const receipt = r.data._camDecision as Record<string, unknown>;
    expect(receipt.decisionId).toBe(r.data.decisionId);
    expect(receipt.logged).toBe(true);
    expect(receipt.task).toBe("strategy_recommend");
    // ADVERSARIAL (rejected-design guard): decision time must record ZERO
    // outcomes/corrections -- wasCorrect is unknowable here. If someone wires
    // recordOutcome back into the emission path, these two asserts fail.
    const stats = CAMFeedbackLoopEngine.feedbackStats();
    expect(stats.totalOutcomes).toBe(0);
    expect(stats.totalCorrections).toBe(0);
  });

  it("Phase 1: the logged decision record carries NO wasCorrect key and is unresolved (adversarial: no fabricated verdict)", async () => {
    const s = newServer();
    const id = await emitDecision(s);
    const g = await call(s, "cam_decision_get", { decision_id: id });
    expect(g.ok).toBe(true);
    expect(g.data.success).toBe(true);
    const rec = g.data.record as Record<string, unknown>;
    expect(rec.decisionId).toBe(id);
    expect(rec.action).toBe("cam_strategy_recommend");
    expect(rec.task).toBe("strategy_recommend");
    expect(rec.resolved).toBe(false);
    expect(rec.resolution).toBeUndefined();
    const conf = rec.confidence as number | undefined;
    // slimResponse keeps 0; confidence must be a clamped number when present.
    if (conf !== undefined) {
      expect(conf).toBeGreaterThanOrEqual(0);
      expect(conf).toBeLessThanOrEqual(1);
    }
    // The verdict key must not exist ANYWHERE on an unresolved record.
    expect(JSON.stringify(rec)).not.toContain("wasCorrect");
    // Snapshot captured the recommended strategy for later correlation.
    const value = rec.decisionValue as Record<string, unknown>;
    expect(typeof value.strategyName).toBe("string");
  });

  it("Phase 1: the record is durably persisted with schemaVersion (atomic JSON store)", async () => {
    const s = newServer();
    const id = await emitDecision(s);
    const storePath = CAMDecisionLogEngine.stats().storePath;
    const onDisk = JSON.parse(readFileSync(storePath, "utf-8"));
    expect(onDisk.schemaVersion).toBe("1.0.0");
    expect(Array.isArray(onDisk.records)).toBe(true);
    expect(onDisk.records.length).toBe(1);
    expect(onDisk.records[0].decisionId).toBe(id);
    expect(onDisk.records[0].resolved).toBe(false);
    expect("wasCorrect" in onDisk.records[0]).toBe(false);
    expect(typeof onDisk.records[0].inputsHash).toBe("string");
    expect(onDisk.records[0].inputsHash.length).toBe(64); // sha256 hex
  });

  // -- Phase 2: resolve (happy paths) ----------------------------------------

  it("happy 2-phase round trip: emit -> resolve was_correct=true -> outcome visible in the feedback engine", async () => {
    const s = newServer();
    const id = await emitDecision(s);
    const before = CAMFeedbackLoopEngine.feedbackStats().totalOutcomes;
    const r = await call(s, "cam_decision_outcome", { decision_id: id, was_correct: true });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    expect(r.data.was_correct).toBe(true);
    expect(typeof r.data.outcome_record_id).toBe("string");
    expect(r.data.store_persisted).toBe(true);
    // METRIC DELTA: exactly one outcome landed in the drift-metric stream.
    const stats = CAMFeedbackLoopEngine.feedbackStats();
    expect(stats.totalOutcomes).toBe(before + 1);
    expect(stats.totalCorrections).toBe(0);
    // The record is now stamped resolved with the REAL verdict.
    const g = await call(s, "cam_decision_get", { decision_id: id });
    const rec = g.data.record as Record<string, unknown>;
    expect(rec.resolved).toBe(true);
    const resolution = rec.resolution as Record<string, unknown>;
    expect(resolution.wasCorrect).toBe(true);
    expect(resolution.hadCorrection).toBe(false);
    expect(resolution.outcomeRecordId).toBe(r.data.outcome_record_id);
  });

  it("happy override round trip: corrected_value creates a CORRELATED correction (snapshot originalValue) + a wasCorrect=false outcome", async () => {
    const s = newServer();
    const id = await emitDecision(s);
    const corrected = { strategyName: "Trochoidal Pocket", stepover: 0.12 };
    const r = await call(s, "cam_decision_outcome", {
      decision_id: id,
      corrected_value: corrected,
      reason: "thin wall chatter on the 2D pocket",
      operator_id: "op-jm-17",
      actuals: { measured_ra_um: 1.9 },
    });
    expect(r.ok).toBe(true);
    expect(r.data.success).toBe(true);
    expect(r.data.was_correct).toBe(false); // an override MEANS the pick was wrong
    expect(typeof r.data.correction_record_id).toBe("string");
    // Feedback engine got exactly one outcome + one correction (training pair).
    const stats = CAMFeedbackLoopEngine.feedbackStats();
    expect(stats.totalOutcomes).toBe(1);
    expect(stats.totalCorrections).toBe(1);
    // Correction is correlated to the SAME decisionId, with the Phase-1
    // snapshot as originalValue -- the correlation this loop exists for.
    const corrections = CAMFeedbackLoopEngine.getCorrections();
    expect(corrections.length).toBe(1);
    expect(corrections[0].decisionId).toBe(id);
    expect((corrections[0].originalValue as Record<string, unknown>).strategyName).toBeTruthy();
    expect(corrections[0].correctedValue).toEqual(corrected);
    expect(corrections[0].reason).toBe("thin wall chatter on the 2D pocket");
    expect(corrections[0].operatorId).toBe("op-jm-17");
    // Outcome for the drift metric is the FALSE sample, same id.
    const dispatcherStats = await call(s, "cam_feedback_stats", {});
    expect((dispatcherStats.data.stats as Record<string, unknown>).totalCorrections).toBe(1);
  });

  // -- Failure modes ----------------------------------------------------------

  it("failure: unknown decisionId is a structured error and touches no metric", async () => {
    const s = newServer();
    const r = await call(s, "cam_decision_outcome", { decision_id: "camdec-doesnotexist", was_correct: true });
    expect(r.data.success).toBe(false);
    expect(r.data.error).toBe("unknown_decision_id");
    expect(CAMFeedbackLoopEngine.feedbackStats().totalOutcomes).toBe(0);
  });

  it("failure: malformed input (missing decision_id) is rejected by the Zod schema", async () => {
    const s = newServer();
    const r = await call(s, "cam_decision_outcome", { was_correct: true });
    expect(r.ok).toBe(false);
    expect(String(r.data.error ?? r.data.rawText)).toMatch(/invalid params|decision_id/i);
  });

  it("failure: missing verdict / contradictory verdict are structured errors", async () => {
    const s = newServer();
    const id = await emitDecision(s);
    const missing = await call(s, "cam_decision_outcome", { decision_id: id });
    expect(missing.data.success).toBe(false);
    expect(missing.data.error).toBe("missing_verdict");
    const contradiction = await call(s, "cam_decision_outcome", {
      decision_id: id, was_correct: true, corrected_value: { strategyName: "other" },
    });
    expect(contradiction.data.success).toBe(false);
    expect(contradiction.data.error).toBe("contradictory_resolution");
    // Neither error path may have consumed the record or fed the metric.
    expect(CAMFeedbackLoopEngine.feedbackStats().totalOutcomes).toBe(0);
    const g = await call(s, "cam_decision_get", { decision_id: id });
    expect((g.data.record as Record<string, unknown>).resolved).toBe(false);
  });

  it("failure: corrupt store file is fail-soft -- capture still succeeds and the load error is surfaced", async () => {
    const corruptPath = join(TMP_ROOT, `corrupt-${storeCounter}.json`);
    writeFileSync(corruptPath, "{{{{ not json", "utf-8");
    CAMDecisionLogEngine.setStorePath(corruptPath);
    const s = newServer();
    const r = await call(s, "cam_strategy_recommend", { ...STRAT_PARAMS });
    expect(r.ok).toBe(true);
    expect(r.data.decisionId).toMatch(/^camdec-/);
    expect((r.data._camDecision as Record<string, unknown>).logged).toBe(true);
    // R12: the corrupt-load is surfaced, not swallowed silently.
    expect(CAMDecisionLogEngine.stats().lastLoadError).toBeTruthy();
  });

  it("failure: unwritable store path is fail-soft -- action succeeds, logged=false, and the id still resolves in-memory", async () => {
    // Parent of the store path is a FILE -> mkdir/rename must fail.
    const blocker = join(TMP_ROOT, `blocker-${storeCounter}`);
    writeFileSync(blocker, "i am a file", "utf-8");
    CAMDecisionLogEngine.setStorePath(join(blocker, "sub", "log.json"));
    const s = newServer();
    const r = await call(s, "cam_strategy_recommend", { ...STRAT_PARAMS });
    expect(r.ok).toBe(true); // the CAM action NEVER breaks on a store failure
    expect(typeof r.data.strategyName).toBe("string");
    const receipt = r.data._camDecision as Record<string, unknown>;
    expect(receipt.logged).toBe(false); // durability honestly reported
    const id = receipt.decisionId as string;
    expect(id).toMatch(/^camdec-/);
    expect(CAMDecisionLogEngine.stats().lastPersistError).toBeTruthy();
    // In-memory correlation still works this process; persistence flagged false.
    const resolve = await call(s, "cam_decision_outcome", { decision_id: id, was_correct: false });
    expect(resolve.data.success).toBe(true);
    expect(resolve.data.store_persisted).toBe(false);
    expect(CAMFeedbackLoopEngine.feedbackStats().totalOutcomes).toBe(1);
  });

  // -- Adversarial ------------------------------------------------------------

  it("adversarial: double-resolve is refused and NEVER double-counts the drift metric", async () => {
    const s = newServer();
    const id = await emitDecision(s);
    const first = await call(s, "cam_decision_outcome", { decision_id: id, was_correct: false });
    expect(first.data.success).toBe(true);
    const second = await call(s, "cam_decision_outcome", { decision_id: id, was_correct: true });
    expect(second.data.success).toBe(false);
    expect(second.data.error).toBe("already_resolved");
    expect(second.data.resolution).toBeTruthy(); // the prior resolution is quoted back
    // Metric integrity: exactly ONE outcome, still the original FALSE verdict.
    const stats = CAMFeedbackLoopEngine.feedbackStats();
    expect(stats.totalOutcomes).toBe(1);
    expect(stats.totalCorrections).toBe(0);
    const g = await call(s, "cam_decision_get", { decision_id: id });
    expect(((g.data.record as Record<string, unknown>).resolution as Record<string, unknown>).wasCorrect).toBe(false);
  });

  it("adversarial: bounded growth -- FIFO cap evicts the oldest decision, which then resolves as unknown", async () => {
    CAMDecisionLogEngine.setLogCap(3);
    const s = newServer();
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) ids.push(await emitDecision(s));
    expect(CAMDecisionLogEngine.stats().total).toBe(3); // capped, not unbounded
    const evicted = await call(s, "cam_decision_get", { decision_id: ids[0] });
    expect(evicted.data.success).toBe(false);
    expect(evicted.data.error).toBe("unknown_decision_id");
    // Newest survivor still fully resolvable.
    const r = await call(s, "cam_decision_outcome", { decision_id: ids[3], was_correct: true });
    expect(r.data.success).toBe(true);
  });
});

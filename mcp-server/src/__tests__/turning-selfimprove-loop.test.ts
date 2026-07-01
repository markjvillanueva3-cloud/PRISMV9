/**
 * turning-selfimprove-loop.test.ts -- slot:whiskey (Lathe Wizard, U-SELFIMPROVE-01)
 * ============================================================================
 * The self-improving loop on the AI head (LatheAIOrchestrationEngine):
 *   READ side  -- generateProgram() surfaces a per-op `learning_adjustments[]` (the learned EWMA
 *                 multiplier from LatheAGIContinuousLearningEngine). ADVISORY: it is NOT applied to the
 *                 emitted program_text (changing live-fleet feeds/speeds is the operator-gated switch).
 *   WRITE side -- recordGenerationFeedback(input, outcomes) records REAL caller-supplied measured
 *                 outcomes back into the learner, keyed by the SAME _learningKeyFor as the read side.
 *
 * Intent (R9): (1) the read side faithfully surfaces predictAdjustment per op; (2) a non-neutral learned
 * multiplier NEVER mutates the emitted G-code (honesty + real-machine safety); (3) read key === write key
 * for the same op (the loop addresses the same EWMA slot); (4) the write side records exactly what the
 * caller supplied (no fabricated actuals) and (5) skips non-finite observations fail-soft.
 *
 * Hermeticity: every test spies on the continuous-learning SINGLETON, so NO real learning-state file is
 * read or written (recordFeedback persists to disk in production -- the spy intercepts it).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { latheAIOrchestrationEngine } from "../engines/LatheAIOrchestrationEngine.js";
import { latheOrchestrationEngine } from "../engines/LatheOrchestrationEngine.js";
import {
  latheAGIContinuousLearningEngine,
  type Slot,
  type FeedbackKind,
} from "../engines/LatheAGIContinuousLearningEngine.js";

const okumaPart = () =>
  ({
    part_number: "SELFIMPROVE-UNIT",
    material: { material_name: "1018", iso_group: "P" as const },
    bar_stock_od_mm: 40,
    part_length_mm: 80,
    features: [
      { id: "f1", type: "od_turn" as const, od_mm: 30, length_mm: 60, position_z_mm: 0,
        x_start_mm: 40, x_end_mm: 30, z_start_mm: 0, z_end_mm: -60 },
    ],
    controller: "okuma",
    machine_model: "Okuma LB3000",
  }) as unknown as Parameters<typeof latheOrchestrationEngine.calculate>[1];

// full Slot the recordFeedback spy returns (so the head reads real ewma/sample_count off it)
const fakeSlot = (feature: string, key: string, ewma: number, n: number): Slot => ({
  feature,
  key,
  ewma,
  sample_count: n,
  last_observation: ewma,
  last_updated_at: "1970-01-01T00:00:00.000Z",
  kinds: {
    speed_feed_outcome: { count: 0, ewma: 0 },
    machinist_acceptance: { count: 0, ewma: 0 },
    profitability_variance: { count: 0, ewma: 0 },
  },
});

describe("U-SELFIMPROVE-01 -- the AI head's self-improving loop (read learned adj + record real outcomes)", () => {
  afterEach(() => vi.restoreAllMocks());

  // === READ side ===========================================================

  it("generateProgram() surfaces one learning_adjustment per op, neutral (1.0 / 0 samples) when unseen", () => {
    // Unseen learner: predictAdjustment -> 1.0 (neutral), getSlot -> null (no samples).
    vi.spyOn(latheAGIContinuousLearningEngine, "predictAdjustment").mockReturnValue(1.0);
    vi.spyOn(latheAGIContinuousLearningEngine, "getSlot").mockReturnValue(null);

    const r = latheAIOrchestrationEngine.generateProgram(okumaPart());
    expect(r.learning_adjustments.length).toBe(r.total_operations);
    expect(r.learning_adjustments.length).toBeGreaterThan(0);
    for (const la of r.learning_adjustments) {
      expect(la.feature).toBe("lathe_speed_feed");
      expect(la.key).toMatch(/^P\|.+\|.+/); // iso|operation|ap-tag, iso=P for this part
      expect(la.learned_multiplier).toBe(1.0);
      expect(la.sample_count).toBe(0);
    }
  });

  it("SAFETY/HONESTY: a non-neutral learned multiplier NEVER changes the emitted program_text", () => {
    const stripTs = (s: string) =>
      s.replace(/\(GENERATED:[^)]*\)/g, "(GENERATED)").replace(/\d{4}-\d\d-\d\dT[\d:.]+Z?/g, "<TS>").trim();
    // The spine's program with NO learning influence (baseline).
    const baseline = stripTs(latheOrchestrationEngine.calculate("x", okumaPart()).program_text);
    // Now force a strong learned multiplier -> the read side must NOT apply it to the emitted G-code.
    vi.spyOn(latheAGIContinuousLearningEngine, "predictAdjustment").mockReturnValue(1.5);
    vi.spyOn(latheAGIContinuousLearningEngine, "getSlot").mockReturnValue(fakeSlot("lathe_speed_feed", "P|od_turn|2mm", 1.5, 9));

    const r = latheAIOrchestrationEngine.generateProgram(okumaPart());
    expect(r.learning_adjustments.every((la) => la.learned_multiplier === 1.5)).toBe(true); // surfaced...
    expect(stripTs(r.program_text)).toBe(baseline); // ...but program_text is byte-identical (NOT applied)
  });

  // === read/write KEY PARITY ==============================================

  it("read key EQUALS write key for the same op (both sides address the same EWMA slot)", () => {
    vi.spyOn(latheAGIContinuousLearningEngine, "predictAdjustment").mockReturnValue(1.0);
    vi.spyOn(latheAGIContinuousLearningEngine, "getSlot").mockReturnValue(null);
    // Pull the real op0 (operation_type + ap) from the spine so we feed the write side the same case.
    const spine = latheOrchestrationEngine.calculate("x", okumaPart());
    const op0 = spine.operations[0];
    const readKey = latheAIOrchestrationEngine.generateProgram(okumaPart()).learning_adjustments[0].key;

    let writeKey = "";
    vi.spyOn(latheAGIContinuousLearningEngine, "recordFeedback").mockImplementation((inp) => {
      writeKey = inp.key;
      return fakeSlot(inp.feature, inp.key, inp.observation, 1);
    });
    latheAIOrchestrationEngine.recordGenerationFeedback(okumaPart(), [
      { operation_type: String(op0.operation_type), ap_mm: op0.cutting_params.depth_of_cut_mm,
        kind: "speed_feed_outcome", observation: 1.1 },
    ]);
    expect(writeKey).toBe(readKey);
  });

  // === WRITE side ==========================================================

  it("recordGenerationFeedback() records the caller's REAL observation via recordFeedback (no fabrication)", () => {
    const spy = vi
      .spyOn(latheAGIContinuousLearningEngine, "recordFeedback")
      .mockImplementation((inp) => fakeSlot(inp.feature, inp.key, inp.observation, 3));

    const res = latheAIOrchestrationEngine.recordGenerationFeedback(okumaPart(), [
      { operation_type: "od_rough", ap_mm: 2.0, kind: "speed_feed_outcome", observation: 1.12, op_number: 1 },
    ]);

    expect(spy).toHaveBeenCalledTimes(1);
    const arg = spy.mock.calls[0][0];
    expect(arg.feature).toBe("lathe_speed_feed");
    expect(arg.key).toBe("P|od_rough|2mm");
    expect(arg.kind).toBe("speed_feed_outcome");
    expect(arg.observation).toBe(1.12); // the caller's measured value, passed through unchanged
    expect(res.recorded).toHaveLength(1);
    expect(res.recorded[0]).toMatchObject({ op_number: 1, key: "P|od_rough|2mm", sample_count: 3 });
    expect(res.skipped).toHaveLength(0);
  });

  it("recordGenerationFeedback() SKIPS a non-finite observation fail-soft (never fabricates / never throws)", () => {
    const spy = vi
      .spyOn(latheAGIContinuousLearningEngine, "recordFeedback")
      .mockImplementation((inp) => fakeSlot(inp.feature, inp.key, inp.observation, 1));

    const res = latheAIOrchestrationEngine.recordGenerationFeedback(okumaPart(), [
      { operation_type: "od_rough", ap_mm: 2.0, kind: "speed_feed_outcome", observation: Number.NaN },
      { operation_type: "od_finish", ap_mm: 0.5, kind: "speed_feed_outcome", observation: 0.97 },
    ]);

    expect(spy).toHaveBeenCalledTimes(1); // only the finite one is recorded
    expect(res.recorded).toHaveLength(1);
    expect(res.recorded[0].key).toBe("P|od_finish|0.5mm");
    expect(res.skipped).toHaveLength(1);
    expect(res.skipped[0].index).toBe(0);
    expect(res.skipped[0].reason).toMatch(/non-finite/);
  });

  it("recordGenerationFeedback() SKIPS a row the learner REJECTS (invalid kind) fail-soft -- batch survives", () => {
    // The real learner's Zod schema throws on an out-of-enum kind. Mimic that and prove ONE bad row does
    // not abort the batch: the good row still records, the bad row is surfaced in skipped.
    const VALID: FeedbackKind[] = ["speed_feed_outcome", "machinist_acceptance", "profitability_variance"];
    const spy = vi.spyOn(latheAGIContinuousLearningEngine, "recordFeedback").mockImplementation((inp) => {
      if (!VALID.includes(inp.kind)) throw new Error(`invalid enum value: ${inp.kind}`); // mimic Zod rejection
      return fakeSlot(inp.feature, inp.key, inp.observation, 1);
    });

    const res = latheAIOrchestrationEngine.recordGenerationFeedback(okumaPart(), [
      { operation_type: "od_rough", ap_mm: 2.0, kind: "not_a_real_kind" as unknown as FeedbackKind, observation: 1.0 },
      { operation_type: "od_finish", ap_mm: 0.5, kind: "speed_feed_outcome", observation: 0.97 },
    ]);

    expect(spy).toHaveBeenCalledTimes(2); // both rows attempted (the throw is caught, not propagated)
    expect(res.recorded).toHaveLength(1); // the valid row survived -- batch was NOT aborted
    expect(res.recorded[0].key).toBe("P|od_finish|0.5mm");
    expect(res.skipped).toHaveLength(1);
    expect(res.skipped[0].index).toBe(0);
    expect(res.skipped[0].reason).toMatch(/rejected|invalid/);
  });
});

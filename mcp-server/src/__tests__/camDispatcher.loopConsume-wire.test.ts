/**
 * camDispatcher U-CAM-LOOP-CONSUME round-trip tests (slot:kilo 2026-06-30)
 * =======================================================================
 *
 * PROVES the CLOSE-THE-LOOP CAM CONSUMER: SelfLearningCAMEngine's persisted
 * learned strategy effectiveness (win-rates from real observations) now flows
 * into the PRIMARY `prism_cam` recommendation actions and MEASURABLY changes the
 * ranking vs the cold literature-prior baseline.
 *
 * The producer on-ramp (U-CAM-LOOP-ONRAMP) + india's seam feed the learner; U1
 * (SelfLearningCAMEngine persist) durably stores it; the recommender engine
 * already accepts `empirical_ranking` (proven by camStrategyEmpiricalRerank.test).
 * The GAP U2 closes: the primary `prism_cam` actions
 * (`cam_strategy_recommend_full`, `cam_phase5_recommend_strategy`) passed RAW
 * params -> cold priors only; `cam_phase5_recommend_strategy` additionally routed
 * to the CAMPhase5Stubs STUB (recommended_strategy:null). Both now route through
 * the shared learned-injector (`recommendStrategyWithLearning`).
 *
 * Every test FAILS if a learned posterior does NOT shift the ranking:
 *   - a seeded high-win-rate on the cold winner must RAISE its score, AND
 *   - a seeded high-win-rate on an alternative (with the winner dampened) must
 *     FLIP the recommended strategy (overtake).
 * No `toBeDefined`-only assertions; real numeric deltas.
 *
 * Coverage: happy (x3) + >=3 failure + >=2 adversarial. LIVE registerCamDispatcher
 * round-trip (mirrors camDispatcher.loopOnramp-wire.test.ts). The learner is the
 * process singleton -> each test seeds fresh, distinct strategies to stay isolated.
 *
 * @milestone CLOSE-THE-LOOP-CAM
 * @unit U-CAM-LOOP-CONSUME
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCamDispatcher } from "../tools/dispatchers/camDispatcher.js";
import { selfLearningCAMEngine } from "../engines/SelfLearningCAMEngine.js";

// The learner is a PROCESS singleton -- reset before every test so one test's
// seeded observations never leak into another's "cold" baseline (the isolation
// bug that made cross-test cold scores drift). reset() clears strategyRecords +
// re-inits literature priors.
beforeEach(() => {
  selfLearningCAMEngine.reset();
});

// ── LIVE dispatcher round-trip harness ───────────────────────────────────────
interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, handler });
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
): Promise<{ ok: boolean; data: Record<string, any> }> {
  const tool = server.tools.find((t) => t.name === "prism_cam")!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, any> };
  }
  const text = (raw as { content: { type: string; text: string }[] }).content[0]!.text;
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, data: { rawText: text } };
  }
}

/** cam_strategy_recommend_full wraps the recommendation on result.recommendation. */
const recOf = (d: Record<string, any>): Record<string, any> =>
  (d?.recommendation ?? d?.data ?? d) as Record<string, any>;

/**
 * Seed the singleton learner so `strategy` wins every contest for (materialGroup,
 * geometryClass): one observation per distinct timestamp with a strong lifeFactor.
 * Distinct timestamps => distinct win-contests => win-rate 1.0.
 */
function seedWinner(
  strategy: string,
  materialGroup: "P" | "M" | "K" | "N" | "S" | "H",
  geometryClass: string,
  n = 8,
  baseTs = 1_000_000,
): void {
  const observations = [];
  for (let i = 0; i < n; i++) {
    observations.push({
      jobId: `seed-${strategy}-${i}-${Math.random()}`,
      machineId: "VMC-01",
      materialGroup,
      strategy,
      geometryClass,
      cuttingParams: { speed_mpm: 400, feed_mmtooth: 0.1, axial_depth_mm: 3, radial_depth_mm: 6, tool_diameter_mm: 12 },
      // actual life FAR exceeds predicted -> lifeFactor >> 1 -> wins the round.
      actuals: { surface_finish_Ra_um: 0.6, tool_life_min: 180 },
      predicted: { surface_finish_Ra_um: 1.2, tool_life_min: 60 },
      timestamp: baseTs + i, // distinct buckets
    });
  }
  selfLearningCAMEngine.cutToLearn({ observations });
}

/** Seed a LOSING record for `strategy` in the SAME timestamp buckets as a winner,
 *  so its win-rate is driven below 0.5 (dampened by the re-rank). */
function seedLoser(
  strategy: string,
  materialGroup: "P" | "M" | "K" | "N" | "S" | "H",
  geometryClass: string,
  n = 8,
  baseTs = 1_000_000,
): void {
  const observations = [];
  for (let i = 0; i < n; i++) {
    observations.push({
      jobId: `loser-${strategy}-${i}-${Math.random()}`,
      machineId: "VMC-02",
      materialGroup,
      strategy,
      geometryClass,
      cuttingParams: { speed_mpm: 400, feed_mmtooth: 0.1, axial_depth_mm: 3, radial_depth_mm: 6, tool_diameter_mm: 12 },
      // actual life BELOW predicted -> weak lifeFactor -> loses the round.
      actuals: { surface_finish_Ra_um: 2.4, tool_life_min: 30 },
      predicted: { surface_finish_Ra_um: 1.0, tool_life_min: 100 },
      timestamp: baseTs + i, // SAME buckets as the winner it competes with
    });
  }
  selfLearningCAMEngine.cutToLearn({ observations });
}

// A query whose cold winner + top alternative are catalog strategies we can seed.
// "rough pocket" + aluminum -> Adaptive Clearing / Dynamic Mill / Vortex family.
const QUERY = {
  target_cam: "mastercam",
  part_hint: "rough pocket high-speed",
  material: "aluminum 6061",
  material_group: "N", // aluminum = ISO N
  geometry_class: "pocket",
};

describe("U-CAM-LOOP-CONSUME — a learned posterior MEASURABLY shifts the recommendation", () => {
  // ── HAPPY 1: seeding the cold winner RAISES its score (deterministic delta) ──
  it("cam_strategy_recommend_full: seeding the cold winner raises its score above the cold baseline", async () => {
    const s = newServer();
    // Cold baseline (opt out of learning): the pure literature-prior recommendation.
    const cold = recOf((await call(s, "cam_strategy_recommend_full", { ...QUERY, use_learned: false })).data);
    expect(cold.recommended_score as number).toBeGreaterThan(0);
    const W = cold.recommended_strategy as string;
    expect(typeof W).toBe("string");

    // Seed the learner so the cold winner W has a high learned win-rate.
    seedWinner(W, "N", "pocket");

    const learned = recOf((await call(s, "cam_strategy_recommend_full", { ...QUERY })).data);
    // The SAME winner, but its score is measurably HIGHER (learned boost applied).
    expect(learned.recommended_strategy).toBe(W);
    expect(learned.recommended_score as number).toBeGreaterThan(cold.recommended_score as number);
    // Proof the boost is the LEARNED path, not noise: the winner is flagged empirical.
    expect(learned.rationale).toContain("learned win-rate");
  });

  // ── HAPPY 2: a boosted ALTERNATIVE overtakes the dampened cold winner (FLIP) ──
  it("cam_strategy_recommend_full: a boosted alternative OVERTAKES the dampened winner (ranking flip)", async () => {
    const s = newServer();
    const cold = recOf((await call(s, "cam_strategy_recommend_full", { ...QUERY, use_learned: false })).data);
    const W = cold.recommended_strategy as string;         // cold: "Dynamic Mill" ~0.89
    const alts = (cold.alternatives ?? []) as Array<Record<string, any>>;
    expect(alts.length).toBeGreaterThan(0);
    const A = alts[0].strategy as string;                  // top cold alt: "Adaptive Clearing" ~0.753
    expect(A).not.toBe(W);
    const coldGap = (cold.recommended_score as number) - (alts[0].score as number);

    // Boost the alternative A to a high win-rate AND dampen the cold winner W,
    // in shared timestamp buckets so the contest is a real per-round comparison:
    // A wins every bucket (life far exceeds predicted) and W loses every bucket.
    // >50 obs each -> "high" confidence -> the full +/-0.15 delta on each -> 0.30 swing.
    const N_HIGH_CONF = 60;
    seedWinner(A, "N", "pocket", N_HIGH_CONF, 2_000_000);
    seedLoser(W, "N", "pocket", N_HIGH_CONF, 2_000_000);

    // Read the ACTUAL learned win-rates the dispatcher will inject (proves the seed
    // drove A high + W low, and grounds the flip assertion in real learned state).
    const ranking = selfLearningCAMEngine.strategyRanking({ materialGroup: "N", geometryClass: "pocket", minObservations: 1 });
    const wrA = ranking.rankings.find((r) => r.strategy === A)?.winRate.rate ?? 0;
    const wrW = ranking.rankings.find((r) => r.strategy === W)?.winRate.rate ?? 1;
    expect(wrA).toBeGreaterThan(0.5); // A empirically wins most rounds
    expect(wrW).toBeLessThan(0.5);    // W empirically loses most rounds

    const learned = recOf((await call(s, "cam_strategy_recommend_full", { ...QUERY })).data);
    // With A boosted (+delta) and W dampened (-delta), the ~0.30 swing exceeds the
    // 0.137 catalog gap -> A overtakes W. The recommended strategy FLIPS.
    expect(coldGap).toBeLessThan(0.30);              // the swing can cover the gap
    expect(learned.recommended_strategy).toBe(A);   // the FLIP — learned state changed the winner
    expect(learned.recommended_strategy).not.toBe(cold.recommended_strategy);
    expect(learned.rationale).toContain("learned win-rate");
  });

  // ── HAPPY 3: cam_phase5_recommend_strategy (was a STUB) now recommends a real
  //    strategy AND consumes learning. ───────────────────────────────────────
  it("cam_phase5_recommend_strategy: no longer a stub — returns a real strategy and honors learning", async () => {
    const s = newServer();
    const cold = recOf((await call(s, "cam_phase5_recommend_strategy", { ...QUERY, use_learned: false })).data);
    // The old stub returned recommended_strategy:null; the production engine returns a real one.
    expect(cold.recommended_strategy).not.toBeNull();
    expect(typeof cold.recommended_strategy).toBe("string");
    expect(cold.mode).toBe("production"); // proves it's the production engine, not the stub

    const W = cold.recommended_strategy as string;
    seedWinner(W, "N", "pocket", 8, 3_000_000);
    const learned = recOf((await call(s, "cam_phase5_recommend_strategy", { ...QUERY })).data);
    expect(learned.recommended_strategy).toBe(W);
    expect(learned.recommended_score as number).toBeGreaterThan(cold.recommended_score as number);
  });
});

describe("U-CAM-LOOP-CONSUME — failure modes (learning never breaks / never fabricates a shift)", () => {
  // FAILURE 1: use_learned:false is byte-identical to the cold baseline (no shift).
  it("FAILURE 1: use_learned:false yields the SAME recommendation even after the learner is seeded", async () => {
    const s = newServer();
    const cold = recOf((await call(s, "cam_strategy_recommend_full", { ...QUERY, use_learned: false })).data);
    const W = cold.recommended_strategy as string;
    seedWinner(W, "N", "pocket", 8, 4_000_000);
    // Opted OUT: the score must NOT move despite a seeded learner.
    const optedOut = recOf((await call(s, "cam_strategy_recommend_full", { ...QUERY, use_learned: false })).data);
    expect(optedOut.recommended_strategy).toBe(cold.recommended_strategy);
    expect(optedOut.recommended_score as number).toBeCloseTo(cold.recommended_score as number, 9);
    expect(optedOut.alternatives?.every?.((c: Record<string, any>) => !c.empirical_adjusted)).toBe(true);
  });

  // FAILURE 2: a learned signal for a DIFFERENT material group must not shift THIS query.
  it("FAILURE 2: learning seeded for a different material group does not shift the query", async () => {
    const s = newServer();
    const cold = recOf((await call(s, "cam_strategy_recommend_full", { ...QUERY, use_learned: false })).data);
    const W = cold.recommended_strategy as string;
    // Seed the winner under material group "S" (superalloy), but query is "N" (aluminum).
    seedWinner(W, "S", "pocket", 8, 5_000_000);
    const learned = recOf((await call(s, "cam_strategy_recommend_full", { ...QUERY })).data);
    // The material-group filter isolates the seed -> no boost applied to the N query.
    expect(learned.recommended_strategy).toBe(cold.recommended_strategy);
    expect(learned.recommended_score as number).toBeCloseTo(cold.recommended_score as number, 6);
  });

  // FAILURE 3: unknown CAM slug -> null recommendation, never throws, no learning crash.
  it("FAILURE 3: unknown CAM slug returns no recommendation (score 0, no throw) even with learning on", async () => {
    const s = newServer();
    seedWinner("Adaptive Clearing", "N", "pocket", 4, 6_000_000);
    const r = await call(s, "cam_strategy_recommend_full", { ...QUERY, target_cam: "__no_such_cam__" });
    expect(r.ok).toBe(true);
    const rec = recOf(r.data);
    // slimResponse strips the null `recommended_strategy` key on the way out ->
    // it is ABSENT (undefined), and the score is 0. Learning never salvages an
    // unknown CAM slug into a fabricated recommendation.
    expect(rec.recommended_strategy == null).toBe(true); // null OR undefined (stripped)
    expect(rec.recommended_score).toBe(0);
    expect(rec.rationale).toContain("unknown CAM slug");
  });
});

describe("U-CAM-LOOP-CONSUME — adversarial (learning can't corrupt / can't be tricked)", () => {
  // ADVERSARIAL 1: a learned signal for a strategy NOT in the catalog changes nothing.
  it("ADVERSARIAL 1: a learned win for a non-catalog strategy does not alter the ranking", async () => {
    const s = newServer();
    const cold = recOf((await call(s, "cam_strategy_recommend_full", { ...QUERY, use_learned: false })).data);
    // Seed a strategy name that is NOT in STRATEGY_CORPUS -> the re-rank has nothing to match.
    seedWinner("__phantom_strategy__", "N", "pocket", 8, 7_000_000);
    const learned = recOf((await call(s, "cam_strategy_recommend_full", { ...QUERY })).data);
    expect(learned.recommended_strategy).toBe(cold.recommended_strategy);
    expect(learned.recommended_score as number).toBeCloseTo(cold.recommended_score as number, 6);
  });

  // ADVERSARIAL 2: the empirical boost is BOUNDED — a win-rate of 1.0 shifts the
  //    score by at most the bounded delta (0.15), never an unbounded blow-up.
  it("ADVERSARIAL 2: the learned boost is bounded — score never jumps by more than the max delta", async () => {
    const s = newServer();
    const cold = recOf((await call(s, "cam_strategy_recommend_full", { ...QUERY, use_learned: false })).data);
    const W = cold.recommended_strategy as string;
    // Seed a strong, high-confidence win-rate (100+ obs would be "high"; here medium/high).
    seedWinner(W, "N", "pocket", 60, 8_000_000); // >50 obs -> high confidence -> max boost
    const learned = recOf((await call(s, "cam_strategy_recommend_full", { ...QUERY })).data);
    const delta = (learned.recommended_score as number) - (cold.recommended_score as number);
    expect(delta).toBeGreaterThan(0);            // a real, positive shift
    expect(delta).toBeLessThanOrEqual(0.15 + 1e-9); // bounded by EMPIRICAL_RERANK_ALPHA*high*0.5
  });
});

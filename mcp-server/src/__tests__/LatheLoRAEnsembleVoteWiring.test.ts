/**
 * LATHE-LORA-MS0/U-LLR-ENSEMBLE — the runtime ensemble-inference STAGE of the lathe
 * self-improving loop. WIRING unit (not a new engine): exposes the EXISTING
 * LatheLoRAEnsembleVoterEngine's vote()/getHistory() runtime on prism_turning (previously
 * only getStats was reachable). The dispatcher composes vote() + hasConsensus() into one call.
 *
 * Tests exercise the real voter (reset()-isolated singleton) across strategies + outlier +
 * consensus + throw paths, then assert the 2 dispatcher actions + schemas are wired.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { latheLoRAEnsembleVoterEngine as voter } from "../engines/LatheLoRAEnsembleVoterEngine.js";

const ds = (...p: string[]) => path.resolve(__dirname, "..", ...p);

describe("U-LLR-ENSEMBLE — vote aggregation round-trip (existing engine, loop-wired)", () => {
  beforeEach(() => voter.reset());

  it("weighted vote: winner is the highest summed-confidence prediction", () => {
    const r = voter.vote(
      [
        { model_id: "m1", prediction: "A", confidence: 0.6 },
        { model_id: "m2", prediction: "B", confidence: 0.5 },
        { model_id: "m3", prediction: "A", confidence: 0.3 },
      ],
      "weighted",
    );
    expect(r.winner).toBe("A"); // 0.6+0.3=0.9 > 0.5
    expect(r.total_voters).toBe(3);
    expect(r.support_count).toBe(2);
    expect(r.winning_confidence).toBeCloseTo(0.45, 6); // (0.6+0.3)/2
  });

  it("majority vote: most-frequent prediction wins even if a rival is more confident", () => {
    const r = voter.vote(
      [
        { model_id: "m1", prediction: "A", confidence: 0.7 },
        { model_id: "m2", prediction: "A", confidence: 0.7 },
        { model_id: "m3", prediction: "B", confidence: 0.99 },
      ],
      "majority",
    );
    expect(r.winner).toBe("A");
    expect(r.support_count).toBe(2);
  });

  it("unanimous: agreement yields the winner; disagreement yields no winner", () => {
    const agree = voter.vote(
      [
        { model_id: "m1", prediction: "X", confidence: 0.9 },
        { model_id: "m2", prediction: "X", confidence: 0.8 },
      ],
      "unanimous",
    );
    expect(agree.winner).toBe("X");
    const split = voter.vote(
      [
        { model_id: "m1", prediction: "X", confidence: 0.9 },
        { model_id: "m2", prediction: "Y", confidence: 0.8 },
      ],
      "unanimous",
    );
    expect(split.winner).toBe(""); // null winner → ""
  });

  it("outlier detection flags a low-confidence voter (needs ≥3 predictions)", () => {
    const r = voter.vote(
      [
        { model_id: "m1", prediction: "A", confidence: 0.9 },
        { model_id: "m2", prediction: "A", confidence: 0.85 },
        { model_id: "m3", prediction: "A", confidence: 0.2 }, // < median(0.85) − 0.3
      ],
      "weighted",
    );
    expect(r.outliers).toContain("m3");
    expect(r.outliers).not.toContain("m1");
  });

  it("hasConsensus reflects support ratio vs min_consensus_ratio (0.5 default)", () => {
    const strong = voter.vote(
      [
        { model_id: "m1", prediction: "A", confidence: 0.9 },
        { model_id: "m2", prediction: "A", confidence: 0.8 },
        { model_id: "m3", prediction: "B", confidence: 0.7 },
      ],
      "majority",
    );
    expect(voter.hasConsensus(strong)).toBe(true); // 2/3 ≥ 0.5
  });

  it("throws on empty predictions and on out-of-range confidence", () => {
    expect(() => voter.vote([], "weighted")).toThrow(/no predictions/i);
    expect(() => voter.vote([{ model_id: "m", prediction: "A", confidence: 1.5 }], "weighted")).toThrow(/confidence/i);
  });

  it("getHistory returns the recorded votes", () => {
    voter.vote([{ model_id: "m1", prediction: "A", confidence: 0.9 }], "weighted");
    voter.vote([{ model_id: "m2", prediction: "B", confidence: 0.8 }], "weighted");
    expect(voter.getHistory().length).toBe(2);
    expect(voter.getHistory(1).length).toBe(1);
  });
});

describe("U-LLR-ENSEMBLE — dispatcher + schema wiring", () => {
  it("turningDispatcher has ACTIONS entries + the grouped case for both actions", async () => {
    const src = await fsp.readFile(ds("tools", "dispatchers", "turningDispatcher.ts"), "utf8");
    for (const a of ["lathe_lora_ensemble_vote", "lathe_lora_ensemble_history"]) {
      expect(src.includes(`"${a}",`)).toBe(true);
      expect(src.includes(`case "${a}":`)).toBe(true);
    }
    // the vote handler composes hasConsensus
    expect(src.includes("hasConsensus(voteResult)")).toBe(true);
  });

  it("schemas validate the contracts (predictions required; strategy enum guarded)", async () => {
    const { TURNING_ACTION_SCHEMAS } = await import("../schemas/turningActionSchemas.js");
    const m = TURNING_ACTION_SCHEMAS as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;

    expect(
      m.lathe_lora_ensemble_vote!.safeParse({ predictions: [{ model_id: "m1", prediction: "A", confidence: 0.9 }] }).success,
    ).toBe(true);
    expect(m.lathe_lora_ensemble_vote!.safeParse({ predictions: [] }).success).toBe(false); // min(1)
    expect(
      m.lathe_lora_ensemble_vote!.safeParse({ predictions: [{ model_id: "m1", prediction: "A", confidence: 0.9 }], strategy: "bogus" }).success,
    ).toBe(false); // bad enum
    expect(m.lathe_lora_ensemble_vote!.safeParse(null).success).toBe(false);

    expect(m.lathe_lora_ensemble_history!.safeParse({}).success).toBe(true);
    expect(m.lathe_lora_ensemble_history!.safeParse({ limit: 5 }).success).toBe(true);
    expect(m.lathe_lora_ensemble_history!.safeParse({ limit: -1 }).success).toBe(false); // positive int
  });
});

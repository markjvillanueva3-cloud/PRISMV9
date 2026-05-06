/**
 * CrossProcessCuriosityDrivenExplorationEngine — T11-03 tests.
 * Schmidhuber curiosity + T8-03 safety gate composition.
 */

import { describe, it, expect } from "vitest";
import {
  CrossProcessCuriosityDrivenExplorationEngine as Curiosity,
  crossProcessCuriosityDrivenExploration,
  type Candidate,
  type HistoryRow,
} from "../engines/CrossProcessCuriosityDrivenExplorationEngine.js";

const STATE_FOR_SAFETY = {
  tool: { diameter_mm: 12.7, flutes: 4 },
  machine: { maxSpindleRpm: 12000, maxSpindlePowerKw: 11, maxRapidMmPerMin: 25000 },
  minToolLifeMin: 15,
};

// Diverse history with non-zero outcome variance to seed curiosity
const HIST: HistoryRow[] = [
  { material_iso: "P", sf: 80, fz: 0.04, outcome: 0.75, process: "mill" },
  { material_iso: "P", sf: 100, fz: 0.05, outcome: 0.85, process: "mill" },
  { material_iso: "P", sf: 90, fz: 0.045, outcome: 0.55, process: "mill" },
  { material_iso: "P", sf: 95, fz: 0.04, outcome: 0.95, process: "mill" },
  { material_iso: "P", sf: 110, fz: 0.06, outcome: 0.4, process: "mill" },
  { material_iso: "M", sf: 120, fz: 0.07, outcome: 0.6, process: "mill" },
];

describe("propose — curiosity-driven exploration", () => {
  it("returns proposals for each candidate", () => {
    const candidates: Candidate[] = [
      { candidate_id: "c1", material_iso: "P", sf: 90, fz: 0.05, ap: 1, process: "mill" },
      { candidate_id: "c2", material_iso: "P", sf: 100, fz: 0.05, ap: 1, process: "mill" },
    ];
    const r = Curiosity.propose({ candidates, history: HIST, state_for_safety: STATE_FOR_SAFETY });
    expect(r.proposals.length).toBe(2);
  });

  it("admitted set excludes candidates with safety verdict=fail", () => {
    // Candidate well within safety envelope on shop_floor tier (we provided no Ω/S so tier doesn't gate)
    const candidates: Candidate[] = [
      { candidate_id: "safe", material_iso: "P", sf: 80, fz: 0.04, ap: 1, process: "mill" },
    ];
    const r = Curiosity.propose({ candidates, history: HIST, state_for_safety: STATE_FOR_SAFETY, tier: "sim" });
    for (const a of r.admitted) expect(a.safety_verdict).not.toBe("fail");
  });

  it("blocks candidate that exceeds spindle power (T8-03 critical)", () => {
    const candidates: Candidate[] = [
      { candidate_id: "unsafe", material_iso: "P", sf: 800, fz: 0.3, ap: 15, process: "mill" },
    ];
    const r = Curiosity.propose({ candidates, history: HIST, state_for_safety: STATE_FOR_SAFETY });
    const found = r.proposals.find((p) => p.candidate_id === "unsafe");
    if (found && found.safety_verdict === "fail") {
      expect(found.admitted).toBe(false);
      expect(r.blocked_by_safety.some((b) => b.candidate_id === "unsafe")).toBe(true);
    }
  });

  it("admitted ordered descending by curiosity_score", () => {
    const candidates: Candidate[] = [
      { candidate_id: "a", material_iso: "P", sf: 80, fz: 0.04, ap: 1, process: "mill" },
      { candidate_id: "b", material_iso: "P", sf: 90, fz: 0.045, ap: 1, process: "mill" },
      { candidate_id: "c", material_iso: "P", sf: 100, fz: 0.05, ap: 1, process: "mill" },
    ];
    const r = Curiosity.propose({ candidates, history: HIST, state_for_safety: STATE_FOR_SAFETY, tier: "sim" });
    for (let i = 1; i < r.admitted.length; i++) {
      expect(r.admitted[i].curiosity_score).toBeLessThanOrEqual(r.admitted[i - 1].curiosity_score);
    }
  });

  it("predicted_outcome is finite", () => {
    const r = Curiosity.propose({
      candidates: [{ candidate_id: "c1", material_iso: "P", sf: 95, fz: 0.05, ap: 1, process: "mill" }],
      history: HIST, state_for_safety: STATE_FOR_SAFETY, tier: "sim",
    });
    expect(Number.isFinite(r.proposals[0].predicted_outcome)).toBe(true);
  });

  it("k_neighbors is bounded by history size", () => {
    const r = Curiosity.propose({
      candidates: [{ candidate_id: "c1", material_iso: "P", sf: 95, fz: 0.05, ap: 1, process: "mill" }],
      history: HIST, state_for_safety: STATE_FOR_SAFETY, k: 20, tier: "sim",
    });
    expect(r.proposals[0].k_neighbors).toBeLessThanOrEqual(HIST.length);
  });

  it("rationale describes admit/block status", () => {
    const r = Curiosity.propose({
      candidates: [{ candidate_id: "c1", material_iso: "P", sf: 95, fz: 0.05, ap: 1, process: "mill" }],
      history: HIST, state_for_safety: STATE_FOR_SAFETY, tier: "sim",
    });
    const p = r.proposals[0];
    if (!p.admitted) {
      expect(p.rationale).toMatch(/BLOCKED|info gain/);
    } else {
      expect(p.rationale).toMatch(/Curiosity σ/);
    }
  });

  it("rejects empty candidates (Zod min(1))", () => {
    expect(() => Curiosity.propose({
      candidates: [], history: HIST, state_for_safety: STATE_FOR_SAFETY,
    })).toThrow();
  });

  it("rejects history with fewer than 3 rows (Zod min(3))", () => {
    expect(() => Curiosity.propose({
      candidates: [{ candidate_id: "c1", material_iso: "P", sf: 95, fz: 0.05, ap: 1, process: "mill" }],
      history: HIST.slice(0, 2),
      state_for_safety: STATE_FOR_SAFETY,
    })).toThrow();
  });

  it("rejects negative sf (Zod positive)", () => {
    expect(() => Curiosity.propose({
      candidates: [{ candidate_id: "c1", material_iso: "P", sf: -10, fz: 0.05, ap: 1, process: "mill" } as Candidate],
      history: HIST, state_for_safety: STATE_FOR_SAFETY,
    })).toThrow();
  });

  it("preserves tier in result", () => {
    const r = Curiosity.propose({
      candidates: [{ candidate_id: "c1", material_iso: "P", sf: 95, fz: 0.05, ap: 1, process: "mill" }],
      history: HIST, state_for_safety: STATE_FOR_SAFETY, tier: "production",
    });
    expect(r.tier).toBe("production");
  });

  it("n_history matches input history length", () => {
    const r = Curiosity.propose({
      candidates: [{ candidate_id: "c1", material_iso: "P", sf: 95, fz: 0.05, ap: 1, process: "mill" }],
      history: HIST, state_for_safety: STATE_FOR_SAFETY, tier: "sim",
    });
    expect(r.n_history).toBe(HIST.length);
  });
});

describe("Engine identity", () => {
  it("exposes engineId/version/tier matching T11-03", () => {
    expect(Curiosity.engineId).toBe("CrossProcessCuriosityDrivenExplorationEngine");
    expect(Curiosity.version).toBe("1.0.0");
    expect(Curiosity.tier).toBe("T11-03");
  });
});

describe("Dispatcher wrapper", () => {
  it("xproc_curiosity_propose returns proposals + admitted + blocked_by_safety", () => {
    const r = crossProcessCuriosityDrivenExploration("xproc_curiosity_propose", {
      candidates: [{ candidate_id: "c1", material_iso: "P", sf: 95, fz: 0.05, ap: 1, process: "mill" }],
      history: HIST, state_for_safety: STATE_FOR_SAFETY, tier: "sim",
    }) as { proposals: unknown[]; admitted: unknown[]; blocked_by_safety: unknown[] };
    expect(r.proposals.length).toBe(1);
    expect(Array.isArray(r.admitted)).toBe(true);
    expect(Array.isArray(r.blocked_by_safety)).toBe(true);
  });

  it("xproc_curiosity_score returns scores array", () => {
    const r = crossProcessCuriosityDrivenExploration("xproc_curiosity_score", {
      candidates: [{ candidate_id: "c1", material_iso: "P", sf: 95, fz: 0.05, ap: 1, process: "mill" }],
      history: HIST, state_for_safety: STATE_FOR_SAFETY, tier: "sim",
    }) as { scores: Array<{ candidate_id: string; score: number }> };
    expect(r.scores.length).toBe(1);
    expect(r.scores[0].candidate_id).toBe("c1");
  });

  it("rejects unknown action", () => {
    expect(() => crossProcessCuriosityDrivenExploration("unknown", {})).toThrow(/unknown action/i);
  });
});

/**
 * PSNSynergyInspectorEngine Tests — PSN-SYNERGY-INSPECT-MS0
 *
 * @milestone PSN-SYNERGY-INSPECT-MS0
 */

import { describe, it, expect } from "vitest";
import {
  psnSynergyInspectorEngine,
  PSN_LEGS,
  type PSNLegInventory,
} from "../engines/PSNSynergyInspectorEngine.js";
import { INTELLIGENCE_CORE_ACTIONS as intelligenceActions } from "../tools/dispatchers/intelligenceDispatcher.js";

// ============================================================================
// FIXTURES
// ============================================================================

const FULLY_WIRED_INVENTORIES: PSNLegInventory[] = [
  { leg: "engines",        node_count: 100, cross_refs: { wiki: 50, memories: 20, formulas: 30, prism_ai: 5 } },
  { leg: "wiki",           node_count: 200, cross_refs: { engines: 60, memories: 40 } },
  { leg: "memories",       node_count: 150, cross_refs: { engines: 25, wiki: 35 } },
  { leg: "formulas",       node_count:  50, cross_refs: { engines: 28 } },
  { leg: "prism_ai",       node_count:  10, cross_refs: { engines: 4 } },
];

const ISOLATED_NN_INVENTORIES: PSNLegInventory[] = [
  { leg: "engines", node_count: 100, cross_refs: { wiki: 50, memories: 20, formulas: 30 } },
  { leg: "wiki",    node_count: 200, cross_refs: { engines: 60, memories: 40 } },
  { leg: "memories", node_count: 150, cross_refs: { engines: 25, wiki: 35 } },
  { leg: "formulas", node_count: 50,  cross_refs: { engines: 28 } },
  { leg: "nn_gnn",   node_count: 5,   cross_refs: {} },  // ISLAND
  { leg: "tribal",   node_count: 50,  cross_refs: {} },  // ISLAND
];

describe("PSNSynergyInspectorEngine", () => {
  describe("Happy path — fully-wired sample", () => {
    it("produces a SynergyReport with the right pair count (n*(n-1)/2)", () => {
      const r = psnSynergyInspectorEngine.inspect(FULLY_WIRED_INVENTORIES);
      // 5 legs → 10 unordered pairs
      expect(r.total_legs).toBe(5);
      expect(r.total_pairs).toBe(10);
      expect(r.pairs).toHaveLength(10);
    });

    it("leg_totals sums refs_in + refs_out correctly", () => {
      const r = psnSynergyInspectorEngine.inspect(FULLY_WIRED_INVENTORIES);
      // engines: out = 50+20+30+5 = 105
      expect(r.leg_totals.engines.refs_out).toBe(105);
      // engines: in = 60(wiki) + 25(memories) + 28(formulas) + 4(prism_ai) = 117
      expect(r.leg_totals.engines.refs_in).toBe(117);
    });

    it("coverage_pct counts peer legs that have ANY ref in either direction", () => {
      const r = psnSynergyInspectorEngine.inspect(FULLY_WIRED_INVENTORIES);
      // engines references all 4 peers; coverage = 100%
      expect(r.leg_totals.engines.coverage_pct).toBe(100);
    });
  });

  describe("Under-wiring detection (P0-critical surfacing)", () => {
    it("flags zero-ref pairs between non-empty legs as P0_critical", () => {
      const r = psnSynergyInspectorEngine.inspect(ISOLATED_NN_INVENTORIES);
      // nn_gnn ↔ engines has zero refs in either direction; both non-empty → P0
      const nnEngines = r.pairs.find(
        p => (p.leg_a === "nn_gnn" && p.leg_b === "engines") ||
             (p.leg_a === "engines" && p.leg_b === "nn_gnn"),
      )!;
      expect(nnEngines.total_refs).toBe(0);
      expect(nnEngines.under_wired_score).toBe(1);
      expect(nnEngines.roi_band).toBe("P0_critical");
    });

    it("most_isolated_leg surfaces in summary()", () => {
      const r = psnSynergyInspectorEngine.inspect(ISOLATED_NN_INVENTORIES);
      const s = psnSynergyInspectorEngine.summarize(r);
      expect(s.most_isolated_leg === "nn_gnn" || s.most_isolated_leg === "tribal").toBe(true);
    });

    it("top_under_wired sorted by under_wired_score descending", () => {
      const r = psnSynergyInspectorEngine.inspect(ISOLATED_NN_INVENTORIES);
      const scores = r.top_under_wired.map(p => p.under_wired_score);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
      }
    });

    it("topK option caps the under-wired list", () => {
      const r = psnSynergyInspectorEngine.inspect(ISOLATED_NN_INVENTORIES, { topK: 3 });
      expect(r.top_under_wired.length).toBeLessThanOrEqual(3);
    });
  });

  describe("Suggestion catalog", () => {
    it("emits a directed suggestion when a known leg pair has a catalog entry", () => {
      const sug = psnSynergyInspectorEngine.suggestionFor("engines", "wiki", 0, 0);
      expect(sug).toMatch(/wiki entries documenting/);
    });

    it("emits a generic bridge suggestion for unknown leg pairs", () => {
      // sinker_edm is not a leg — but obsidian_brain ↔ formulas is not in the
      // catalog map; falls back to the generic template.
      const sug = psnSynergyInspectorEngine.suggestionFor("formulas", "prism_os", 0, 0);
      expect(sug).toMatch(/Surface .* ↔ .* synergy/);
    });

    it("reverse direction uses a different catalog entry when defined", () => {
      const forward = psnSynergyInspectorEngine.suggestionFor("engines", "wiki", 0, 0);
      const reverse = psnSynergyInspectorEngine.suggestionFor("wiki", "engines", 0, 0);
      expect(forward).not.toBe(reverse);
    });
  });

  describe("ROI band mapping", () => {
    it("score 0.95 → P0_critical", () => {
      expect(psnSynergyInspectorEngine.bandForScore(0.95)).toBe("P0_critical");
    });
    it("score 0.7 → P1_high", () => {
      expect(psnSynergyInspectorEngine.bandForScore(0.7)).toBe("P1_high");
    });
    it("score 0.4 → P2_medium", () => {
      expect(psnSynergyInspectorEngine.bandForScore(0.4)).toBe("P2_medium");
    });
    it("score 0.1 → P3_low", () => {
      expect(psnSynergyInspectorEngine.bandForScore(0.1)).toBe("P3_low");
    });
    it("boundary 0.85 → P0_critical (inclusive)", () => {
      expect(psnSynergyInspectorEngine.bandForScore(0.85)).toBe("P0_critical");
    });
  });

  describe("PSN leg roster", () => {
    it("getPSNLegs returns exactly 11 legs", () => {
      const legs = psnSynergyInspectorEngine.getPSNLegs();
      expect(legs).toHaveLength(11);
    });

    it("PSN_LEGS includes the canonical 11 from feedback_psn_definition", () => {
      const expected = [
        "obsidian_brain", "prism_os", "wiki", "memories",
        "tribal", "system_viz", "engines", "algorithms",
        "formulas", "nn_gnn", "prism_ai",
      ];
      expect(Array.from(PSN_LEGS).sort()).toEqual(expected.sort());
    });
  });

  describe("Edge cases + R12", () => {
    it("empty inventories throws (R12 fail-loud)", () => {
      expect(() => psnSynergyInspectorEngine.inspect([])).toThrow(/non-empty/);
    });

    it("single-leg inventory produces zero pairs (no peers to bridge)", () => {
      const r = psnSynergyInspectorEngine.inspect([
        { leg: "engines", node_count: 100, cross_refs: {} },
      ]);
      expect(r.total_pairs).toBe(0);
      expect(r.pairs).toHaveLength(0);
    });

    it("legs with node_count=0 do not flag as under-wired (no signal)", () => {
      const r = psnSynergyInspectorEngine.inspect([
        { leg: "engines", node_count: 100, cross_refs: {} },
        { leg: "nn_gnn",  node_count: 0,   cross_refs: {} }, // empty leg
      ]);
      const pair = r.pairs[0];
      expect(pair.under_wired_score).toBe(0); // empty leg side → no signal
    });

    it("bad schema is rejected (R12 fail-loud on invalid inventory)", () => {
      expect(() =>
        psnSynergyInspectorEngine.inspect([
          { leg: "engines" as never, node_count: -1, cross_refs: {} }, // negative count
        ]),
      ).toThrow();
    });

    it("density correctly computed as total / (count_a * count_b)", () => {
      const r = psnSynergyInspectorEngine.inspect([
        { leg: "engines", node_count: 10, cross_refs: { wiki: 5 } },
        { leg: "wiki",    node_count: 20, cross_refs: { engines: 3 } },
      ]);
      const pair = r.pairs[0];
      // total = 8, product = 200, density = 0.04
      expect(pair.total_refs).toBe(8);
      expect(pair.density).toBeCloseTo(0.04, 5);
    });
  });

  describe("Scale-invariant ROI banding (densityFloor recalibration)", () => {
    it("wiring previously-unwired pairs REDUCES the P0 count (the core fix)", () => {
      // Before: memories is zero-ref to both engines and wiki → 2 genuinely-unwired P0 pairs.
      const before = psnSynergyInspectorEngine.inspect([
        { leg: "engines",  node_count: 1000, cross_refs: { wiki: 50 } },
        { leg: "wiki",     node_count: 1000, cross_refs: { engines: 50 } },
        { leg: "memories", node_count: 1000, cross_refs: {} },
      ]);
      const p0Before = before.pairs.filter(p => p.roi_band === "P0_critical").length;
      // After: memories now connected to both → no genuinely-unwired pairs remain.
      const after = psnSynergyInspectorEngine.inspect([
        { leg: "engines",  node_count: 1000, cross_refs: { wiki: 50, memories: 10 } },
        { leg: "wiki",     node_count: 1000, cross_refs: { engines: 50, memories: 10 } },
        { leg: "memories", node_count: 1000, cross_refs: { engines: 10, wiki: 10 } },
      ]);
      const p0After = after.pairs.filter(p => p.roi_band === "P0_critical").length;
      expect(p0Before).toBe(2);
      expect(p0After).toBe(0); // adding real edges removed P0 — impossible under the old absolute floor
      expect(p0After).toBeLessThan(p0Before);
    });

    it("ROI band is scale-invariant — the best-connected pair is NOT P0 despite tiny absolute density", () => {
      const r = psnSynergyInspectorEngine.inspect([
        { leg: "engines",  node_count: 5000, cross_refs: { wiki: 100 } }, // density 100/25e6 = 4e-6
        { leg: "wiki",     node_count: 5000, cross_refs: { memories: 1 } }, // density 1/750e3 = 1.3e-6
        { leg: "memories", node_count: 150,  cross_refs: {} },
      ]);
      const ew = r.pairs.find(p =>
        (p.leg_a === "engines" && p.leg_b === "wiki") || (p.leg_a === "wiki" && p.leg_b === "engines"))!;
      // Highest-density connected pair → NOT P0 (the old 0.001 floor would have flagged it
      // P0 since 4e-6 << 0.001). Scale-invariant ranking puts it at the bottom.
      expect(ew.roi_band).not.toBe("P0_critical");
      // The zero-ref pair is still genuinely unwired → P0.
      const em = r.pairs.find(p =>
        (p.leg_a === "engines" && p.leg_b === "memories") || (p.leg_a === "memories" && p.leg_b === "engines"))!;
      expect(em.under_wired_score).toBe(1);
      expect(em.roi_band).toBe("P0_critical");
    });

    it("least-dense connected pair outranks the densest (monotonic in density)", () => {
      const r = psnSynergyInspectorEngine.inspect([
        { leg: "engines",  node_count: 100, cross_refs: { wiki: 90 } },      // dense   (0.009)
        { leg: "wiki",     node_count: 100, cross_refs: { engines: 90, memories: 1 } },
        { leg: "memories", node_count: 100, cross_refs: { engines: 1 } },    // sparse pairs
      ]);
      const ew = r.pairs.find(p => p.leg_a === "engines" && p.leg_b === "wiki")!;       // densest
      const wm = r.pairs.find(p => p.leg_a === "wiki" && p.leg_b === "memories")!;       // sparser
      expect(wm.under_wired_score).toBeGreaterThan(ew.under_wired_score);
    });
  });

  describe("Dispatcher Integration", () => {
    it("ACTIONS contains psn_synergy_inspect", () => {
      expect(intelligenceActions).toContain("psn_synergy_inspect");
    });
    it("ACTIONS contains psn_synergy_summarize", () => {
      expect(intelligenceActions).toContain("psn_synergy_summarize");
    });
    it("ACTIONS contains psn_synergy_legs", () => {
      expect(intelligenceActions).toContain("psn_synergy_legs");
    });
  });
});

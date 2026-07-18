/**
 * CadCamHandoffEngine — CAD-AI → CAM-AI handoff bridge tests.
 *
 * U-BRIDGE-CAD-CAM-HANDOFF (FEATURE-GAP-AUDIT-MS0, slot delta).
 *
 * Real-value assertions against the production CAMStrategyRecommenderEngine
 * corpus (CAM-EXHAUST-MS0). No mocking — the bridge delegates to the real
 * recommender, so these tests exercise the genuine end-to-end contract.
 *
 * Invariants under test:
 *   - operator gate is UNCONDITIONAL (requires_operator_approval always true,
 *     auto_executed always false) — load-bearing PRISM safety property
 *   - phase ordering rough → finish → drill → other
 *   - refusal paths: empty features, sub-threshold CAD confidence
 *   - adversarial: NaN/Inf params, injection-y feature types, runaway feature
 *     count (DoS guard), unknown CAM slug
 */

import { describe, it, expect } from "vitest";
import {
  CadCamHandoffEngine,
  CadCamHandoffInputSchema,
  MAX_HANDOFF_FEATURES,
  cadCamHandoffEngine,
} from "../engines/CadCamHandoffEngine";

const eng = CadCamHandoffEngine;

describe("CadCamHandoffEngine — operator-gate invariant (unconditional)", () => {
  it("a normal handoff requires operator approval and is never auto-executed", () => {
    const r = eng.handoff({
      features: [{ type: "rect_pocket", params: { depth: 12 } }],
      target_cam: "fusion360",
      material: "aluminum 6061",
      cad_confidence: 0.9,
    });
    expect(r.requires_operator_approval).toBe(true);
    expect(r.auto_executed).toBe(false);
    expect(r.gate_reason.toLowerCase()).toContain("operator");
  });

  it("even a BLOCKED handoff keeps the gate true / auto false", () => {
    const r = eng.handoff({ features: [], target_cam: "mastercam" });
    expect(r.requires_operator_approval).toBe(true);
    expect(r.auto_executed).toBe(false);
    expect(r.blocked).toBe(true);
  });

  it("the singleton alias is the same class", () => {
    expect(cadCamHandoffEngine).toBe(CadCamHandoffEngine);
  });
});

describe("CadCamHandoffEngine — feature → strategy delegation (real corpus)", () => {
  it("a pocket routes to a roughing strategy from the real recommender", () => {
    const r = eng.handoff({
      features: [{ type: "pocket" }],
      target_cam: "fusion360",
      material: "aluminum",
      cad_confidence: 1,
    });
    expect(r.operations).toHaveLength(1);
    const op = r.operations[0];
    expect(op.phase).toBe("roughing");
    expect(op.recommended_strategy).not.toBeNull();
    // Fusion 360 + rough pocket → Adaptive Clearing is the corpus winner.
    expect(op.recommended_strategy).toBe("Adaptive Clearing");
    expect(op.recommended_score).toBeGreaterThan(0);
  });

  it("a hole feature is classified drilling and gets a drilling strategy", () => {
    const r = eng.handoff({
      features: [{ type: "thru_hole", params: { dia: 6.5 } }],
      target_cam: "mastercam",
      cad_confidence: 1,
    });
    const op = r.operations[0];
    expect(op.phase).toBe("drilling");
    expect(op.recommended_strategy).toBe("Drilling Cycle");
  });

  it("a fillet feature is classified finishing", () => {
    const r = eng.handoff({
      features: [{ type: "edge_fillet", params: { radius: 3 } }],
      target_cam: "powermill",
      cad_confidence: 1,
    });
    expect(r.operations[0].phase).toBe("finishing");
    expect(r.operations[0].recommended_strategy).not.toBeNull();
  });

  it("orders operations rough → finish → drill regardless of input order", () => {
    const r = eng.handoff({
      features: [
        { type: "thru_hole" }, // drilling
        { type: "surface_finish" }, // finishing
        { type: "rough_pocket" }, // roughing
      ],
      target_cam: "fusion360",
      material: "steel",
      cad_confidence: 1,
    });
    const phases = r.operations.map((o) => o.phase);
    expect(phases).toEqual(["roughing", "finishing", "drilling"]);
  });

  it("handoff_confidence = cad_confidence × mean(featureScores), clamped", () => {
    const r = eng.handoff({
      features: [{ type: "pocket" }],
      target_cam: "fusion360",
      material: "aluminum",
      cad_confidence: 0.8,
    });
    expect(r.handoff_confidence).toBeGreaterThan(0);
    expect(r.handoff_confidence).toBeLessThanOrEqual(0.8);
    expect(r.handoff_confidence).toBeLessThanOrEqual(1);
  });
});

describe("CadCamHandoffEngine — refusal paths (failure modes)", () => {
  it("FAILURE 1: empty feature list → blocked with reason, no operations", () => {
    const r = eng.handoff({ features: [], target_cam: "fusion360" });
    expect(r.blocked).toBe(true);
    expect(r.block_reason).toContain("no CAD features");
    expect(r.operations).toEqual([]);
    expect(r.handoff_confidence).toBe(0);
  });

  it("FAILURE 2: CAD confidence below min threshold → blocked, not programmed", () => {
    const r = eng.handoff({
      features: [{ type: "pocket" }],
      target_cam: "fusion360",
      cad_confidence: 0.3, // < default 0.5
    });
    expect(r.blocked).toBe(true);
    expect(r.block_reason).toContain("too uncertain");
    expect(r.operations).toEqual([]);
  });

  it("FAILURE 2b: custom min_cad_confidence is honored", () => {
    const ok = eng.handoff({
      features: [{ type: "pocket" }],
      target_cam: "fusion360",
      cad_confidence: 0.6,
      min_cad_confidence: 0.5,
    });
    expect(ok.blocked).toBe(false);
    const blocked = eng.handoff({
      features: [{ type: "pocket" }],
      target_cam: "fusion360",
      cad_confidence: 0.6,
      min_cad_confidence: 0.7,
    });
    expect(blocked.blocked).toBe(true);
  });

  it("FAILURE 2c: a hostile out-of-range min_cad_confidence CANNOT disable the refusal", () => {
    // safety regression oracle (scrutiny arm A). A negative/NaN/>1 threshold
    // must fall back to the DEFAULT floor — it can never LOWER the bar. This
    // test FAILS if the fix is reverted to clamp-to-0 or raw passthrough.
    for (const hostile of [-1, -0.0001, NaN, Infinity, 1.5, 99]) {
      const r = eng.handoff({
        features: [{ type: "pocket" }],
        target_cam: "fusion360",
        cad_confidence: 0.2, // below the 0.5 default floor
        min_cad_confidence: hostile,
      });
      expect(r.blocked).toBe(true);
      expect(r.operations).toEqual([]);
    }
  });

  it("FAILURE 3: unknown CAM slug → null strategies + advisory, not a throw", () => {
    const r = eng.handoff({
      features: [{ type: "pocket" }],
      target_cam: "no-such-cam",
      cad_confidence: 1,
    });
    expect(r.blocked).toBe(false); // geometry fine; CAM is the problem
    expect(r.operations[0].recommended_strategy).toBeNull();
    expect(
      r.advisories.some((a) => a.includes("no CAM strategy match")),
    ).toBe(true);
  });

  it("FAILURE 3b: missing cad_confidence defaults to 1 (trust generator)", () => {
    const r = eng.handoff({
      features: [{ type: "pocket" }],
      target_cam: "fusion360",
      material: "aluminum",
    });
    expect(r.blocked).toBe(false);
  });
});

describe("CadCamHandoffEngine — adversarial inputs", () => {
  it("ADVERSARIAL 1: NaN / Infinity params do not poison the part_hint", () => {
    const r = eng.handoff({
      features: [
        { type: "pocket", params: { depth: NaN, width: Infinity, x: -Infinity } },
      ],
      target_cam: "fusion360",
      material: "aluminum",
      cad_confidence: 1,
    });
    expect(r.operations[0].part_hint).not.toContain("NaN");
    expect(r.operations[0].part_hint).not.toContain("Infinity");
    expect(r.operations[0].recommended_strategy).toBe("Adaptive Clearing");
  });

  it("ADVERSARIAL 2: injection-y feature type is sanitized into tokens", () => {
    const r = eng.handoff({
      features: [{ type: "pocket'; DROP TABLE--<script>" }],
      target_cam: "fusion360",
      material: "aluminum",
      cad_confidence: 1,
    });
    // still recognized as a pocket (substring match), no crash
    expect(r.operations[0].phase).toBe("roughing");
    expect(r.operations[0].part_hint).not.toContain("<script>");
  });

  it("ADVERSARIAL 3: runaway feature count is capped (DoS guard)", () => {
    const many = Array.from({ length: MAX_HANDOFF_FEATURES + 50 }, () => ({
      type: "pocket",
    }));
    const r = eng.handoff({
      features: many,
      target_cam: "fusion360",
      material: "aluminum",
      cad_confidence: 1,
    });
    expect(r.operations).toHaveLength(MAX_HANDOFF_FEATURES);
    expect(r.truncated_features).toBe(50);
    expect(r.advisories.some((a) => a.includes("capped"))).toBe(true);
  });

  it("ADVERSARIAL 4: empty/whitespace feature type does not crash, lands 'other'", () => {
    const r = eng.handoff({
      features: [{ type: "" }, { type: "   " }],
      target_cam: "fusion360",
      material: "aluminum",
      cad_confidence: 1,
    });
    expect(r.operations).toHaveLength(2);
    expect(r.operations.every((o) => o.phase === "other")).toBe(true);
    expect(r.operations[0].feature_type).toBe("(unknown)");
  });

  it("ADVERSARIAL 5: control bytes in a string param are stripped from the hint", () => {
    // real C0 control bytes (bell + ESC) — source-escaped per
    // feedback_read_tool_strips_control_chars so the literal is unambiguous.
    const r = eng.handoff({
      features: [{ type: "slot", params: { note: "deepnarrow" } }],
      target_cam: "fusion360",
      material: "steel",
      cad_confidence: 1,
    });
    const hint = r.operations[0].part_hint;
    // load-bearing: NO control byte survives into the recommender input.
    // FAILS if the `[^ws-]+` strip is removed (R9 — broader + display-stable
    // than the prior per-byte not.toContain).
    expect(/[ -]/.test(hint)).toBe(false);
    expect(hint).toContain("deep");
    expect(hint).toContain("narrow");
  });

  it("ADVERSARIAL 6: preserves input order within a phase (stable sort)", () => {
    const r = eng.handoff({
      features: [
        { type: "rough_pocket_A" },
        { type: "rough_pocket_B" },
        { type: "rough_pocket_C" },
      ],
      target_cam: "fusion360",
      material: "aluminum",
      cad_confidence: 1,
    });
    expect(r.operations.map((o) => o.feature_type)).toEqual([
      "rough_pocket_A",
      "rough_pocket_B",
      "rough_pocket_C",
    ]);
  });

  it("ADVERSARIAL 7: surface_finish is NOT stolen by the /face/ rule", () => {
    // regression for FEATURE_PHASE_MAP ordering P1 — "face" is a substring
    // of "sur*face*"; surface entry must win → Scallop, not Parallel Finish.
    const r = eng.handoff({
      features: [{ type: "surface_finish" }],
      target_cam: "mastercam",
      cad_confidence: 1,
    });
    const op = r.operations[0];
    expect(op.phase).toBe("finishing");
    expect(op.part_hint).toContain("3d surface scallop");
    expect(op.recommended_strategy).toBe("Scallop");
  });
});

describe("CadCamHandoffEngine — Zod input schema", () => {
  it("accepts a well-formed input", () => {
    expect(() =>
      CadCamHandoffInputSchema.parse({
        features: [{ type: "pocket", params: { d: 5 } }],
        target_cam: "fusion360",
      }),
    ).not.toThrow();
  });

  it("rejects empty target_cam", () => {
    expect(() =>
      CadCamHandoffInputSchema.parse({ features: [], target_cam: "" }),
    ).toThrow();
  });

  it("rejects out-of-range max_alternatives_per_feature", () => {
    expect(() =>
      CadCamHandoffInputSchema.parse({
        target_cam: "fusion360",
        max_alternatives_per_feature: 99,
      }),
    ).toThrow();
  });

  it("defaults features to [] when omitted", () => {
    const parsed = CadCamHandoffInputSchema.parse({ target_cam: "fusion360" });
    expect(parsed.features).toEqual([]);
  });

  it("clamps min_cad_confidence to [0,1]", () => {
    expect(() =>
      CadCamHandoffInputSchema.parse({
        target_cam: "fusion360",
        min_cad_confidence: 1.5,
      }),
    ).toThrow();
  });
});

describe("CadCamHandoffEngine — provenance & advisories", () => {
  it("carries part_name through; defaults when absent", () => {
    expect(
      eng.handoff({
        features: [{ type: "pocket" }],
        target_cam: "fusion360",
        cad_confidence: 1,
        part_name: "bracket-rev-c",
      }).part_name,
    ).toBe("bracket-rev-c");
    expect(
      eng.handoff({
        features: [{ type: "pocket" }],
        target_cam: "fusion360",
        cad_confidence: 1,
      }).part_name,
    ).toBe("unnamed-part");
  });

  it("with a material, an unmapped feature type still ranks (material signal)", () => {
    // R9 fix (scrutiny arm A): the prior assertion was vacuous
    // (typeof join === "string" is always true). Assert the REAL behavior:
    // material "aluminum" matches "*"-material strategies, so even a feature
    // type with no FEATURE_PHASE_MAP hit still gets a non-null strategy.
    const r = eng.handoff({
      features: [{ type: "pocket" }, { type: "totally_unmappable_xyz" }],
      target_cam: "fusion360",
      material: "aluminum",
      cad_confidence: 1,
    });
    expect(r.operations).toHaveLength(2);
    expect(r.operations.every((o) => o.recommended_strategy !== null)).toBe(
      true,
    );
    expect(r.handoff_confidence).toBeGreaterThan(0);
    // the unmapped type lands in the "other" phase, not mis-classified
    const unmapped = r.operations.find(
      (o) => o.feature_type === "totally_unmappable_xyz",
    );
    expect(unmapped?.phase).toBe("other");
  });
});

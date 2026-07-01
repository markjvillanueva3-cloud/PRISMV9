// scripts/lib/orchestrator-toolpath-context.test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FEATURE_TYPES,
  ISO_GROUPS,
  OP_CLASSES,
  RIGIDITY_CLASSES,
  COOLANT_TYPES,
  TOLERANCE_CLASSES,
  VOLUME_TIERS,
  validateContext,
  buildContext,
  scoreCandidate,
  rankCandidates,
} from "./orchestrator-toolpath-context.mjs";

describe("schema constants frozen + non-empty", () => {
  for (const [name, arr] of [
    ["FEATURE_TYPES", FEATURE_TYPES], ["ISO_GROUPS", ISO_GROUPS], ["OP_CLASSES", OP_CLASSES],
    ["RIGIDITY_CLASSES", RIGIDITY_CLASSES], ["COOLANT_TYPES", COOLANT_TYPES],
    ["TOLERANCE_CLASSES", TOLERANCE_CLASSES], ["VOLUME_TIERS", VOLUME_TIERS],
  ]) {
    it(`${name} is frozen + non-empty`, () => {
      assert.ok(Object.isFrozen(arr), `${name} must be frozen`);
      assert.ok(arr.length > 0, `${name} must be non-empty`);
    });
  }
});

describe("buildContext defaults", () => {
  it("produces a valid context with no input", () => {
    const ctx = buildContext();
    assert.equal(ctx.feature.type, "pocket");
    assert.equal(ctx.material.iso_group, "P");
    assert.equal(ctx.machine.rigidity_class, "med");
    assert.equal(ctx.shop.volume_tier, "low_10");
  });

  it("merges partial overrides", () => {
    const ctx = buildContext({
      material: { iso_group: "S", hardness_hb: 380 },
      machine: { axes_n: 5 },
    });
    assert.equal(ctx.material.iso_group, "S");
    assert.equal(ctx.material.hardness_hb, 380);
    assert.equal(ctx.machine.axes_n, 5);
    assert.equal(ctx.machine.rigidity_class, "med");  // unchanged default
  });
});

describe("validateContext", () => {
  it("accepts a complete valid context", () => {
    const ctx = buildContext();
    assert.equal(validateContext(ctx), ctx);
  });

  it("rejects null context", () => {
    assert.throws(() => validateContext(null), /context object required/);
  });

  it("rejects context missing required field", () => {
    const ctx = buildContext();
    delete ctx.risk;
    assert.throws(() => validateContext(ctx), /missing or invalid field 'risk'/);
  });

  it("rejects invalid feature.type", () => {
    assert.throws(() => buildContext({ feature: { type: "BOGUS" } }), /feature\.type must be one of/);
  });

  it("rejects invalid iso_group", () => {
    assert.throws(() => buildContext({ material: { iso_group: "Z" } }), /iso_group/);
  });

  it("rejects invalid rigidity_class", () => {
    assert.throws(() => buildContext({ machine: { rigidity_class: "bouncy" } }), /rigidity_class/);
  });

  it("rejects invalid coolant", () => {
    assert.throws(() => buildContext({ machine: { coolant: "champagne" } }), /coolant/);
  });

  it("rejects invalid volume_tier", () => {
    assert.throws(() => buildContext({ shop: { volume_tier: "single" } }), /volume_tier/);
  });
});

describe("scoreCandidate — soft scoring", () => {
  const baseCtx = buildContext();
  const trochoidal = {
    id: "trochoidal_mill", domain: "mill",
    compatible_features: ["slot", "pocket"], compatible_iso_groups: ["P", "M", "K"],
    optimal_for: { iso_group: "P", rigidity_class: "high", volume_tier: "med_100" },
    base_score: 1.0,
  };

  it("returns score in [0,1] for compatible candidate", () => {
    const r = scoreCandidate(trochoidal, baseCtx);
    assert.equal(r.compatible, true);
    assert.ok(r.score >= 0 && r.score <= 1, `score must be in [0,1], got ${r.score}`);
  });

  it("ISO match boosts score", () => {
    const ctxP = buildContext({ material: { iso_group: "P" } });
    const ctxS = buildContext({ material: { iso_group: "S" } });
    // S material is not in compatible list — would filter, so use M instead
    const ctxM = buildContext({ material: { iso_group: "M" } });
    const rP = scoreCandidate(trochoidal, ctxP);
    const rM = scoreCandidate(trochoidal, ctxM);
    assert.ok(rP.score > rM.score, `P (optimal) should score higher than M (compatible-not-optimal)`);
  });

  it("rigidity-class match boosts score", () => {
    const ctxHi = buildContext({ machine: { rigidity_class: "high" } });
    const ctxMed = buildContext({ machine: { rigidity_class: "med" } });
    const rHi = scoreCandidate(trochoidal, ctxHi);
    const rMed = scoreCandidate(trochoidal, ctxMed);
    assert.ok(rHi.score > rMed.score);
  });
});

describe("scoreCandidate — hard compatibility filters", () => {
  const baseCtx = buildContext();
  it("returns score=0 + compatible=false when feature type out of scope", () => {
    const candidate = {
      id: "lathe_thread",
      compatible_features: ["thread"],
      compatible_iso_groups: ["ALL"],
    };
    const ctx = buildContext({ feature: { type: "pocket" } });
    const r = scoreCandidate(candidate, ctx);
    assert.equal(r.compatible, false);
    assert.equal(r.score, 0);
    assert.match(r.reasons[0], /feature pocket not in candidate scope/);
  });

  it("returns score=0 when ISO group not in scope", () => {
    const r = scoreCandidate({
      id: "soft_alu_finish",
      compatible_features: ["pocket"],
      compatible_iso_groups: ["N"],  // aluminum only
    }, buildContext({ material: { iso_group: "P" } }));
    assert.equal(r.compatible, false);
  });

  it("ALL ISO compatibility = wildcard match", () => {
    const r = scoreCandidate({
      id: "universal",
      compatible_features: ["pocket"],
      compatible_iso_groups: ["ALL"],
    }, baseCtx);
    assert.equal(r.compatible, true);
  });

  it("requires.min_axes filters 5-axis tasks from 3-axis machine", () => {
    const r = scoreCandidate({
      id: "5axis_swarf",
      compatible_features: ["5axis_surface"],
      compatible_iso_groups: ["ALL"],
      requires: { min_axes: 5 },
    }, buildContext({ feature: { type: "5axis_surface" }, machine: { axes_n: 3 } }));
    assert.equal(r.compatible, false);
    assert.match(r.reasons[0], /needs 5\+ axes/);
  });

  it("requires.min_kw filters HEM from underpowered spindle", () => {
    const r = scoreCandidate({
      id: "hem_aggressive",
      compatible_features: ["pocket"],
      compatible_iso_groups: ["ALL"],
      requires: { min_kw: 22 },
    }, buildContext({ machine: { spindle_kw: 11 } }));
    assert.equal(r.compatible, false);
    assert.match(r.reasons[0], /22kW spindle/);
  });

  it("requires.min_rigidity filters demanding paths from low-rigidity machines", () => {
    const r = scoreCandidate({
      id: "heavy_rough",
      compatible_features: ["pocket"],
      compatible_iso_groups: ["ALL"],
      requires: { min_rigidity: "high" },
    }, buildContext({ machine: { rigidity_class: "low" } }));
    assert.equal(r.compatible, false);
  });

  it("requires.coolant_required filters dry-machine", () => {
    const r = scoreCandidate({
      id: "carbide_insert",
      compatible_features: ["pocket"],
      compatible_iso_groups: ["ALL"],
      requires: { coolant_required: true },
    }, buildContext({ machine: { coolant: "dry" } }));
    assert.equal(r.compatible, false);
  });
});

describe("scoreCandidate — prior-part-match + rework-penalty (the 8 missing dimensions)", () => {
  it("prior_part_match_score boosts score when candidate likes it", () => {
    const cand = {
      id: "X", compatible_features: ["pocket"], compatible_iso_groups: ["ALL"],
      optimal_for: { high_prior_match: true },
    };
    const rLow = scoreCandidate(cand, buildContext({ risk: { prior_part_match_score: 0 } }));
    const rHigh = scoreCandidate(cand, buildContext({ risk: { prior_part_match_score: 0.85 } }));
    assert.ok(rHigh.score > rLow.score);
  });

  it("high rework_penalty prefers conservative-tagged candidates", () => {
    const cand = {
      id: "conservative_finish", compatible_features: ["pocket"], compatible_iso_groups: ["ALL"],
      optimal_for: { conservative: true },
    };
    const rLow = scoreCandidate(cand, buildContext({ risk: { rework_penalty: "low" } }));
    const rHigh = scoreCandidate(cand, buildContext({ risk: { rework_penalty: "high" } }));
    assert.ok(rHigh.score > rLow.score);
  });
});

describe("rankCandidates", () => {
  const ctx = buildContext({ material: { iso_group: "M" } });
  const candidates = [
    { id: "A", compatible_features: ["pocket"], compatible_iso_groups: ["P"] },                  // incompatible
    { id: "B", compatible_features: ["pocket"], compatible_iso_groups: ["M"], base_score: 1.0 },
    { id: "C", compatible_features: ["pocket"], compatible_iso_groups: ["M"], base_score: 1.0, optimal_for: { iso_group: "M" } },
    { id: "D", compatible_features: ["hole"],   compatible_iso_groups: ["M"] },                  // wrong feature
  ];

  it("filters incompatible candidates", () => {
    const r = rankCandidates(candidates, ctx);
    assert.equal(r.eliminated, 2);
    assert.equal(r.rankings.length, 2);
  });

  it("ranks compatible candidates by score (best first)", () => {
    const r = rankCandidates(candidates, ctx);
    assert.equal(r.best.candidate.id, "C");  // C has ISO-match boost, B doesn't
    assert.equal(r.rankings[0].candidate.id, "C");
    assert.equal(r.rankings[1].candidate.id, "B");
  });

  it("returns null best when no candidates compatible", () => {
    const r = rankCandidates([{ id: "Z", compatible_features: ["wedm_through"], compatible_iso_groups: ["S"] }], buildContext());
    assert.equal(r.best, null);
    assert.equal(r.eliminated, 1);
  });

  it("R12: rejects non-array candidates", () => {
    assert.throws(() => rankCandidates("not array", ctx), /must be an array/);
  });
});

describe("8 missing-dimension axes — variability coverage", () => {
  // The 8 missing dimensions Agent B called out, each exercised:
  it("rigidity_class affects ranking", () => {
    const cand = { id: "X", compatible_features: ["pocket"], compatible_iso_groups: ["ALL"], optimal_for: { rigidity_class: "high" } };
    assert.ok(scoreCandidate(cand, buildContext({ machine: { rigidity_class: "high" } })).score >
              scoreCandidate(cand, buildContext({ machine: { rigidity_class: "low" } })).score);
  });

  it("coolant affects ranking", () => {
    const cand = { id: "X", compatible_features: ["pocket"], compatible_iso_groups: ["ALL"], optimal_for: { coolant: "ht_coolant" } };
    assert.ok(scoreCandidate(cand, buildContext({ machine: { coolant: "ht_coolant" } })).score >
              scoreCandidate(cand, buildContext({ machine: { coolant: "flood" } })).score);
  });

  it("tolerance_class affects ranking", () => {
    const cand = { id: "X", compatible_features: ["pocket"], compatible_iso_groups: ["ALL"], optimal_for: { tolerance_it: "IT7" } };
    assert.ok(scoreCandidate(cand, buildContext({ feature: { tolerance_it: "IT7" } })).score >
              scoreCandidate(cand, buildContext({ feature: { tolerance_it: "IT10" } })).score);
  });

  it("volume_tier affects ranking", () => {
    const cand = { id: "X", compatible_features: ["pocket"], compatible_iso_groups: ["ALL"], optimal_for: { volume_tier: "production_10k" } };
    assert.ok(scoreCandidate(cand, buildContext({ shop: { volume_tier: "production_10k" } })).score >
              scoreCandidate(cand, buildContext({ shop: { volume_tier: "one_off" } })).score);
  });
});

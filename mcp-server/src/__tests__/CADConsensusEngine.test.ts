/**
 * Tests for CADConsensusEngine — CAD-COMPLETE-MS0 / U-AI-11
 *
 * Test legitimacy: every assertion either checks an exact value, an exact
 * member set, an algebraic invariant (sum-to-N), or a regex-matched error
 * message — never a bare `toBeDefined()` / `toBeTruthy()`.
 */

import { describe, it, expect } from "vitest";
import {
  CADConsensusEngine,
  cadConsensusEngine,
  type CADPrediction,
} from "../engines/CADConsensusEngine.js";
import type { CADWorldDiff, CADWorldState } from "../engines/CADWorldModelEngine.js";

// ── helpers ───────────────────────────────────────────────────────────────

function diff(partial: Partial<CADWorldDiff> = {}): CADWorldDiff {
  return {
    addedEntities: partial.addedEntities ?? [],
    removedEntities: partial.removedEntities ?? [],
    parametersChanged: partial.parametersChanged ?? [],
    selectionChanged: partial.selectionChanged ?? false,
    unitsChanged: partial.unitsChanged ?? false,
    identical:
      partial.identical ??
      ((partial.addedEntities?.length ?? 0) === 0 &&
        (partial.removedEntities?.length ?? 0) === 0 &&
        (partial.parametersChanged?.length ?? 0) === 0 &&
        !(partial.selectionChanged ?? false) &&
        !(partial.unitsChanged ?? false)),
  };
}

function pred(id: string, d: Partial<CADWorldDiff> = {}, state?: CADWorldState): CADPrediction {
  return state === undefined ? { id, diff: diff(d) } : { id, diff: diff(d), projectedState: state };
}

function stateWith(params: Record<string, number>): CADWorldState {
  return {
    docId: "doc-1",
    entities: [],
    parameters: params,
    selection: [],
    units: "mm",
    opCount: 0,
  };
}

// ── construction ───────────────────────────────────────────────────────────

describe("CADConsensusEngine — construction", () => {
  it("exports a singleton instance of the class", () => {
    expect(cadConsensusEngine).toBeInstanceOf(CADConsensusEngine);
  });

  it("a fresh instance is structurally indistinguishable from the singleton", () => {
    const fresh = new CADConsensusEngine();
    const a = fresh.score([pred("a", { addedEntities: ["x"] })]);
    const b = cadConsensusEngine.score([pred("a", { addedEntities: ["x"] })]);
    expect(a).toEqual(b);
  });
});

// ── score: per-field support ───────────────────────────────────────────────

describe("CADConsensusEngine.score — per-field support", () => {
  it("computes addedEntity support fractions across N predictions", () => {
    const r = cadConsensusEngine.score([
      pred("p1", { addedEntities: ["b1", "b2"] }),
      pred("p2", { addedEntities: ["b1"] }),
      pred("p3", { addedEntities: ["b1", "b2", "b3"] }),
    ]);
    expect(r.predictionCount).toBe(3);
    const b1 = r.addedEntityAgreement.find((f) => f.field === "b1");
    const b2 = r.addedEntityAgreement.find((f) => f.field === "b2");
    const b3 = r.addedEntityAgreement.find((f) => f.field === "b3");
    expect(b1).toEqual({ field: "b1", supportFraction: 1, supporters: ["p1", "p2", "p3"] });
    expect(b2).toEqual({ field: "b2", supportFraction: 2 / 3, supporters: ["p1", "p3"] });
    expect(b3).toEqual({ field: "b3", supportFraction: 1 / 3, supporters: ["p3"] });
  });

  it("computes removedEntity and parameterChange support fractions independently", () => {
    const r = cadConsensusEngine.score([
      pred("p1", { removedEntities: ["b1"], parametersChanged: ["h"] }),
      pred("p2", { removedEntities: ["b1", "b2"], parametersChanged: ["w"] }),
    ]);
    expect(r.removedEntityAgreement.map((f) => f.field)).toEqual(["b1", "b2"]);
    expect(r.removedEntityAgreement.find((f) => f.field === "b1")?.supportFraction).toBe(1);
    expect(r.removedEntityAgreement.find((f) => f.field === "b2")?.supportFraction).toBe(0.5);
    expect(r.parameterChangeAgreement.find((f) => f.field === "h")?.supportFraction).toBe(0.5);
    expect(r.parameterChangeAgreement.find((f) => f.field === "w")?.supportFraction).toBe(0.5);
  });

  it("dedupes within a single prediction (same id listed twice ≠ two supporters)", () => {
    const r = cadConsensusEngine.score([
      pred("p1", { addedEntities: ["b1", "b1"] }),
      pred("p2", { addedEntities: ["b1"] }),
    ]);
    expect(r.addedEntityAgreement[0]).toEqual({
      field: "b1",
      supportFraction: 1,
      supporters: ["p1", "p2"],
    });
  });

  it("sorts field support by field id for deterministic output", () => {
    const r = cadConsensusEngine.score([
      pred("p1", { addedEntities: ["zeta", "alpha", "mu"] }),
    ]);
    expect(r.addedEntityAgreement.map((f) => f.field)).toEqual(["alpha", "mu", "zeta"]);
  });

  it("selectionChangedAgreement and unitsChangedAgreement are fractions in [0,1]", () => {
    const r = cadConsensusEngine.score([
      pred("p1", { selectionChanged: true, unitsChanged: false }),
      pred("p2", { selectionChanged: true, unitsChanged: true }),
      pred("p3", { selectionChanged: false, unitsChanged: true }),
      pred("p4", { selectionChanged: false, unitsChanged: false }),
    ]);
    expect(r.selectionChangedAgreement).toBe(0.5);
    expect(r.unitsChangedAgreement).toBe(0.5);
  });
});

// ── score: pairwise + mean ─────────────────────────────────────────────────

describe("CADConsensusEngine.score — pairwise + mean agreement", () => {
  it("produces N*(N-1)/2 pairs", () => {
    const r = cadConsensusEngine.score([
      pred("a", { addedEntities: ["x"] }),
      pred("b", { addedEntities: ["x"] }),
      pred("c", { addedEntities: ["x"] }),
      pred("d", { addedEntities: ["x"] }),
    ]);
    expect(r.pairwiseSimilarity.length).toBe(6);
  });

  it("identical diffs have Jaccard 1.0 and meanAgreement 1.0", () => {
    const r = cadConsensusEngine.score([
      pred("a", { addedEntities: ["b1"], parametersChanged: ["h"] }),
      pred("b", { addedEntities: ["b1"], parametersChanged: ["h"] }),
      pred("c", { addedEntities: ["b1"], parametersChanged: ["h"] }),
    ]);
    expect(r.pairwiseSimilarity.every((p) => p.jaccard === 1.0)).toBe(true);
    expect(r.meanAgreement).toBe(1.0);
  });

  it("fully disjoint diffs have Jaccard 0.0 and meanAgreement 0.0", () => {
    const r = cadConsensusEngine.score([
      pred("a", { addedEntities: ["x"] }),
      pred("b", { addedEntities: ["y"] }),
    ]);
    expect(r.pairwiseSimilarity[0].jaccard).toBe(0);
    expect(r.meanAgreement).toBe(0);
  });

  it("computes Jaccard correctly for partial overlap (½ union match → 0.5)", () => {
    const r = cadConsensusEngine.score([
      pred("a", { addedEntities: ["x", "y"] }),
      pred("b", { addedEntities: ["x", "z"] }),
    ]);
    // intersection {added:x} = 1; union {added:x, added:y, added:z} = 3 → 1/3
    expect(r.pairwiseSimilarity[0].jaccard).toBeCloseTo(1 / 3, 12);
  });

  it("token-prefixes prevent cross-namespace false agreement (added vs param both named 'x')", () => {
    const r = cadConsensusEngine.score([
      pred("a", { addedEntities: ["x"] }),
      pred("b", { parametersChanged: ["x"] }),
    ]);
    // Should NOT agree — added:x ≠ param:x in the flat field set.
    expect(r.pairwiseSimilarity[0].jaccard).toBe(0);
  });

  it("selection-changed and units-changed booleans contribute to Jaccard", () => {
    const r = cadConsensusEngine.score([
      pred("a", { selectionChanged: true, unitsChanged: true }),
      pred("b", { selectionChanged: true, unitsChanged: true }),
    ]);
    expect(r.pairwiseSimilarity[0].jaccard).toBe(1.0);
  });

  it("N=1 returns meanAgreement 1.0 by convention (trivial self-agreement)", () => {
    const r = cadConsensusEngine.score([pred("a", { addedEntities: ["x"] })]);
    expect(r.meanAgreement).toBe(1.0);
    expect(r.pairwiseSimilarity.length).toBe(0);
  });
});

// ── score: unanimousIdentical ──────────────────────────────────────────────

describe("CADConsensusEngine.score — unanimousIdentical (no-op consensus)", () => {
  it("flags when every diff reports identical=true", () => {
    const r = cadConsensusEngine.score([pred("a"), pred("b"), pred("c")]);
    expect(r.unanimousIdentical).toBe(true);
    expect(r.meanAgreement).toBe(1.0);
  });

  it("false when any diff has actual changes", () => {
    const r = cadConsensusEngine.score([pred("a"), pred("b", { addedEntities: ["x"] })]);
    expect(r.unanimousIdentical).toBe(false);
  });

  it("two empty diffs Jaccard to 1.0 (special-case empty∩empty)", () => {
    const r = cadConsensusEngine.score([pred("a"), pred("b")]);
    expect(r.pairwiseSimilarity[0].jaccard).toBe(1.0);
  });
});

// ── pick: medoid selection ─────────────────────────────────────────────────

describe("CADConsensusEngine.pick — medoid selection", () => {
  it("picks the prediction with highest mean Jaccard to others", () => {
    // p1 and p2 agree exactly; p3 disagrees with both.
    const r = cadConsensusEngine.pick([
      pred("p1", { addedEntities: ["b1", "b2"] }),
      pred("p2", { addedEntities: ["b1", "b2"] }),
      pred("p3", { addedEntities: ["q1"] }),
    ]);
    expect(["p1", "p2"]).toContain(r.pickedId);
    expect(r.pickedScore).toBeGreaterThan(0.4); // (1.0 + 0) / 2 = 0.5
  });

  it("breaks ties by input order (first wins)", () => {
    // All three pairwise-equal: every prediction has the same mean score.
    const r = cadConsensusEngine.pick([
      pred("p1", { addedEntities: ["x"] }),
      pred("p2", { addedEntities: ["x"] }),
      pred("p3", { addedEntities: ["x"] }),
    ]);
    expect(r.pickedId).toBe("p1");
  });

  it("returns trivial consensus for N=1", () => {
    const r = cadConsensusEngine.pick([pred("only", { addedEntities: ["x"] })]);
    expect(r.pickedId).toBe("only");
    expect(r.pickedScore).toBe(1.0);
    expect(r.dissenters).toEqual([]);
    expect(r.unanimous).toBe(true);
  });

  it("reports unanimous=true when all predictions agree with the picked", () => {
    const r = cadConsensusEngine.pick([
      pred("a", { addedEntities: ["x"] }),
      pred("b", { addedEntities: ["x"] }),
      pred("c", { addedEntities: ["x"] }),
    ]);
    expect(r.unanimous).toBe(true);
    expect(r.pickedScore).toBe(1.0);
  });

  it("returns the picked diff verbatim from the input prediction", () => {
    const interestingDiff = diff({
      addedEntities: ["b1", "b2"],
      parametersChanged: ["h", "w"],
      selectionChanged: true,
    });
    const r = cadConsensusEngine.pick([
      { id: "a", diff: interestingDiff },
      { id: "b", diff: interestingDiff },
    ]);
    expect(r.pickedDiff).toBe(interestingDiff); // referential identity preserved
  });
});

// ── pick: dissent ──────────────────────────────────────────────────────────

describe("CADConsensusEngine.pick — dissent reporting", () => {
  it("reports predictions below dissentThreshold as dissenters with symmetric difference", () => {
    const r = cadConsensusEngine.pick(
      [
        pred("majority1", { addedEntities: ["b1", "b2"] }),
        pred("majority2", { addedEntities: ["b1", "b2"] }),
        pred("outlier", { addedEntities: ["q"], parametersChanged: ["bad"] }),
      ],
      { dissentThreshold: 0.5 },
    );
    expect(r.dissenters.length).toBe(1);
    expect(r.dissenters[0].id).toBe("outlier");
    expect(r.dissenters[0].agreement).toBe(0);
    // Symmetric difference includes both the picked-only and outlier-only fields.
    expect(r.dissenters[0].differingFields).toEqual(
      expect.arrayContaining(["added:b1", "added:b2", "added:q", "param:bad"]),
    );
    expect(r.dissenters[0].differingFields.length).toBe(4);
  });

  it("does NOT report dissenters when agreement >= threshold", () => {
    const r = cadConsensusEngine.pick(
      [
        pred("a", { addedEntities: ["x", "y"] }),
        pred("b", { addedEntities: ["x", "y"] }),
      ],
      { dissentThreshold: 0.5 },
    );
    expect(r.dissenters).toEqual([]);
  });

  it("default dissentThreshold is 0.5 — Jaccard 1/3 IS reported as a dissenter", () => {
    const r = cadConsensusEngine.pick([
      pred("p1", { addedEntities: ["x", "y"] }),
      pred("p2", { addedEntities: ["x", "z"] }),
    ]);
    // intersection={added:x}=1, union={added:x,added:y,added:z}=3 → 1/3 < 0.5
    expect(r.dissenters.length).toBe(1);
    expect(r.dissenters[0].agreement).toBeCloseTo(1 / 3, 12);
  });

  it("rejects NaN dissentThreshold with specific error message", () => {
    expect(() =>
      cadConsensusEngine.pick([pred("a"), pred("b")], { dissentThreshold: Number.NaN }),
    ).toThrow(/dissentThreshold must be a finite number in \[0,1\]/);
  });

  it("rejects dissentThreshold >1 with specific error message", () => {
    expect(() =>
      cadConsensusEngine.pick([pred("a"), pred("b")], { dissentThreshold: 1.5 }),
    ).toThrow(/dissentThreshold must be a finite number in \[0,1\]/);
  });

  it("rejects dissentThreshold <0 with specific error message", () => {
    expect(() =>
      cadConsensusEngine.pick([pred("a"), pred("b")], { dissentThreshold: -0.1 }),
    ).toThrow(/dissentThreshold must be a finite number in \[0,1\]/);
  });
});

// ── parameterValueClusters ─────────────────────────────────────────────────

describe("CADConsensusEngine.parameterValueClusters — numerical agreement", () => {
  it("merges predictions whose parameter values agree within PARAM_EPSILON", () => {
    const r = cadConsensusEngine.parameterValueClusters([
      pred("a", {}, stateWith({ height: 10 })),
      pred("b", {}, stateWith({ height: 10 + 1e-12 })),
      pred("c", {}, stateWith({ height: 10 })),
    ]);
    expect(r["height"].length).toBe(1);
    expect(r["height"][0].value).toBe(10);
    expect(r["height"][0].supporters).toEqual(["a", "b", "c"]);
  });

  it("splits clusters when values differ by more than PARAM_EPSILON", () => {
    const r = cadConsensusEngine.parameterValueClusters([
      pred("a", {}, stateWith({ height: 10 })),
      pred("b", {}, stateWith({ height: 20 })),
      pred("c", {}, stateWith({ height: 10 })),
    ]);
    expect(r["height"].length).toBe(2);
    const ten = r["height"].find((c) => c.value === 10);
    const twenty = r["height"].find((c) => c.value === 20);
    expect(ten?.supporters).toEqual(["a", "c"]);
    expect(twenty?.supporters).toEqual(["b"]);
  });

  it("skips predictions without projectedState", () => {
    const r = cadConsensusEngine.parameterValueClusters([
      pred("a", {}, stateWith({ height: 10 })),
      pred("b"),
      pred("c", {}, stateWith({ height: 10 })),
    ]);
    expect(r["height"].length).toBe(1);
    expect(r["height"][0].supporters).toEqual(["a", "c"]);
  });

  it("ignores NaN and Infinity parameter values (filters them out of clusters)", () => {
    const r = cadConsensusEngine.parameterValueClusters([
      pred("a", {}, stateWith({ height: 10, bad: Number.NaN })),
      pred("b", {}, stateWith({ height: 10, infin: Number.POSITIVE_INFINITY })),
    ]);
    expect(r["height"].length).toBe(1);
    expect(r["height"][0].supporters).toEqual(["a", "b"]);
    expect(Object.keys(r).includes("bad")).toBe(false);
    expect(Object.keys(r).includes("infin")).toBe(false);
  });

  it("returns an empty object when no prediction has projectedState", () => {
    const r = cadConsensusEngine.parameterValueClusters([pred("a"), pred("b")]);
    expect(r).toEqual({});
  });
});

// ── input validation ──────────────────────────────────────────────────────

describe("CADConsensusEngine — input validation", () => {
  it("rejects non-array predictions", () => {
    expect(() =>
      cadConsensusEngine.score("not-an-array" as unknown as CADPrediction[]),
    ).toThrow(/predictions must be an array/);
  });

  it("rejects empty predictions array", () => {
    expect(() => cadConsensusEngine.score([])).toThrow(
      /predictions must contain at least 1 entry/,
    );
  });

  it("rejects a prediction with empty id", () => {
    expect(() =>
      cadConsensusEngine.score([pred(""), pred("b")]),
    ).toThrow(/predictions\[0\]\.id must be a non-empty string/);
  });

  it("rejects whitespace-only id", () => {
    expect(() => cadConsensusEngine.score([pred("   ")])).toThrow(
      /id must be a non-empty string/,
    );
  });

  it("rejects a non-string id", () => {
    expect(() =>
      cadConsensusEngine.score([{ id: 123 as unknown as string, diff: diff() }]),
    ).toThrow(/id must be a non-empty string/);
  });

  it("rejects duplicate prediction ids", () => {
    expect(() =>
      cadConsensusEngine.score([pred("dup"), pred("dup")]),
    ).toThrow(/duplicate prediction id 'dup'/);
  });

  it("rejects a prediction whose diff is null", () => {
    expect(() =>
      cadConsensusEngine.score([{ id: "a", diff: null as unknown as CADWorldDiff }]),
    ).toThrow(/predictions\[0\]\.diff must be an object/);
  });

  it("rejects a diff whose addedEntities is not an array", () => {
    expect(() =>
      cadConsensusEngine.score([
        { id: "a", diff: { ...diff(), addedEntities: "not-array" as unknown as string[] } },
      ]),
    ).toThrow(/diff\.addedEntities must be an array/);
  });

  it("rejects a diff with non-string entity ids", () => {
    expect(() =>
      cadConsensusEngine.score([
        {
          id: "a",
          diff: { ...diff(), addedEntities: [1 as unknown as string] },
        },
      ]),
    ).toThrow(/diff\.addedEntities\[0\] must be a string/);
  });

  it("rejects a diff with non-boolean selectionChanged", () => {
    expect(() =>
      cadConsensusEngine.score([
        {
          id: "a",
          diff: { ...diff(), selectionChanged: "yes" as unknown as boolean },
        },
      ]),
    ).toThrow(/diff\.selectionChanged must be a boolean/);
  });

  it("rejects a diff with non-boolean identical", () => {
    expect(() =>
      cadConsensusEngine.score([
        {
          id: "a",
          diff: { ...diff(), identical: 1 as unknown as boolean },
        },
      ]),
    ).toThrow(/diff\.identical must be a boolean/);
  });

  it("pick() also validates input (same rules)", () => {
    expect(() => cadConsensusEngine.pick([])).toThrow(
      /predictions must contain at least 1 entry/,
    );
    expect(() => cadConsensusEngine.pick([pred("dup"), pred("dup")])).toThrow(
      /duplicate prediction id 'dup'/,
    );
  });

  it("parameterValueClusters() also validates input (same rules)", () => {
    expect(() => cadConsensusEngine.parameterValueClusters([])).toThrow(
      /predictions must contain at least 1 entry/,
    );
  });
});

// ── determinism + algebraic invariants ────────────────────────────────────

describe("CADConsensusEngine — determinism + algebraic invariants", () => {
  it("score is deterministic across repeated calls with the same input", () => {
    const input = [
      pred("a", { addedEntities: ["b1"] }),
      pred("b", { addedEntities: ["b1", "b2"] }),
      pred("c", { parametersChanged: ["h"] }),
    ];
    const r1 = cadConsensusEngine.score(input);
    const r2 = cadConsensusEngine.score(input);
    expect(r1).toEqual(r2);
  });

  it("pick is deterministic across repeated calls with the same input", () => {
    const input = [
      pred("a", { addedEntities: ["b1"] }),
      pred("b", { addedEntities: ["b1", "b2"] }),
      pred("c", { addedEntities: ["b1"] }),
    ];
    const r1 = cadConsensusEngine.pick(input);
    const r2 = cadConsensusEngine.pick(input);
    expect(r1.pickedId).toBe(r2.pickedId);
    expect(r1.pickedScore).toBe(r2.pickedScore);
  });

  it("supporters arrays preserve input order (not random / not sorted)", () => {
    const r = cadConsensusEngine.score([
      pred("zebra", { addedEntities: ["x"] }),
      pred("alpha", { addedEntities: ["x"] }),
      pred("mike", { addedEntities: ["x"] }),
    ]);
    expect(r.addedEntityAgreement[0].supporters).toEqual(["zebra", "alpha", "mike"]);
  });

  it("support fractions sum-consistency: count of supporters = supportFraction * N", () => {
    const n = 4;
    const r = cadConsensusEngine.score([
      pred("p1", { addedEntities: ["b1", "b2"] }),
      pred("p2", { addedEntities: ["b1"] }),
      pred("p3", { addedEntities: ["b2", "b3"] }),
      pred("p4", { addedEntities: ["b1", "b2", "b3"] }),
    ]);
    for (const f of r.addedEntityAgreement) {
      expect(f.supporters.length).toBe(Math.round(f.supportFraction * n));
    }
  });

  it("meanAgreement equals sum(pairwise)/count for N>=2", () => {
    const r = cadConsensusEngine.score([
      pred("a", { addedEntities: ["x"] }),
      pred("b", { addedEntities: ["x", "y"] }),
      pred("c", { addedEntities: ["y"] }),
    ]);
    const sum = r.pairwiseSimilarity.reduce((acc, p) => acc + p.jaccard, 0);
    expect(r.meanAgreement).toBeCloseTo(sum / r.pairwiseSimilarity.length, 12);
  });
});

// ── adversarial / edge cases ───────────────────────────────────────────────

describe("CADConsensusEngine — adversarial / edge cases", () => {
  it("handles a single all-empty diff (no changes predicted by any source)", () => {
    const r = cadConsensusEngine.score([pred("only")]);
    expect(r.predictionCount).toBe(1);
    expect(r.unanimousIdentical).toBe(true);
    expect(r.meanAgreement).toBe(1.0);
    expect(r.addedEntityAgreement).toEqual([]);
  });

  it("does NOT mutate the input prediction array", () => {
    const input = [
      pred("a", { addedEntities: ["x"] }),
      pred("b", { addedEntities: ["y"] }),
    ];
    const before = JSON.stringify(input);
    cadConsensusEngine.score(input);
    cadConsensusEngine.pick(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it("does NOT mutate the picked diff (referential identity preserved)", () => {
    const original = diff({ addedEntities: ["b1"] });
    const input = [
      { id: "a", diff: original },
      { id: "b", diff: original },
    ];
    const r = cadConsensusEngine.pick(input);
    expect(r.pickedDiff).toBe(original);
    expect(original.addedEntities).toEqual(["b1"]);
  });

  it("symmetric difference is sorted alphabetically for stable output", () => {
    const r = cadConsensusEngine.pick(
      [
        pred("a", { addedEntities: ["zeta", "alpha"] }),
        pred("b", { addedEntities: ["mike"] }),
      ],
      { dissentThreshold: 0.99 },
    );
    expect(r.dissenters[0].differingFields).toEqual([
      "added:alpha",
      "added:mike",
      "added:zeta",
    ]);
  });

  it("handles N=20 stress with deterministic pairwise count + computed mean", () => {
    const preds: CADPrediction[] = [];
    for (let i = 0; i < 20; i++) {
      preds.push(pred(`p${i}`, { addedEntities: [`b${i % 3}`] }));
    }
    const r = cadConsensusEngine.score(preds);
    expect(r.pairwiseSimilarity.length).toBe(190);
    expect(r.predictionCount).toBe(20);
    // 20 predictions cycling through 3 entities → group sizes 7,7,6.
    // Matching pairs (same entity) yield Jaccard 1.0, others 0.0.
    // Expected match count: C(7,2)+C(7,2)+C(6,2) = 21+21+15 = 57 of 190.
    expect(r.meanAgreement).toBeCloseTo(57 / 190, 6);
  });
});

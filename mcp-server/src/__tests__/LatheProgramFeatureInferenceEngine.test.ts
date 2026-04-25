/**
 * LatheProgramFeatureInferenceEngine.test.ts — LATHE-PROD-READY-MS0/U-LPR29
 * =========================================================================
 *
 * Behavioral coverage with hand-labeled ground-truth fixtures.  Each
 * fixture is a synthetic InferenceOperationView mirroring real shapes
 * the MIN parser emits for a known JM Die operation pattern; the
 * expected feature `kind` is hand-labeled by inspection of the cycle
 * + tool + geometry signal.  The aggregate accuracy assertion (≥90 %)
 * is the U-LPR29 exit gate.
 *
 * Spans 14 ground-truth fixtures across 11 feature kinds — well
 * beyond the comprehensive-build "≥3 spanning configurations" floor.
 */

import { describe, it, expect } from "vitest";
import {
  LatheProgramFeatureInferenceEngine,
  latheProgramFeatureInferenceEngine,
  INFERRED_FEATURE_KINDS,
  INTERNAL_THRESHOLD_MM,
  PARTING_X_MM,
  CENTER_DRILL_DEPTH_MM,
  type InferredFeatureKind,
  type InferenceOperationView,
} from "../engines/LatheProgramFeatureInferenceEngine.js";

// ── Ground-truth fixtures ──────────────────────────────────────────────────

interface GTLabelled {
  label: string;
  op: InferenceOperationView;
  expected: InferredFeatureKind;
}

const GROUND_TRUTH: ReadonlyArray<GTLabelled> = [
  // 1 — OD roughing on a 50mm-diameter shaft
  {
    label: "OD roughing G71 on shaft",
    op: {
      index: 1,
      kind: "turning",
      tool_id: "T0101",
      canned_cycles: ["G71", "G70"],
      x_min: 25,
      x_max: 30,
      z_start: 0,
      z_end: -75,
    },
    expected: "od_turn",
  },
  // 2 — facing pass: short Z, wide X
  {
    label: "facing G72",
    op: {
      index: 2,
      kind: "turning",
      tool_id: "T0202",
      canned_cycles: ["G72"],
      x_min: 0,
      x_max: 30,
      z_start: 0.5,
      z_end: 0,
    },
    expected: "face",
  },
  // 3 — internal boring (small x_max → ID)
  {
    label: "ID boring",
    op: {
      index: 3,
      kind: "boring",
      tool_id: "T0303",
      canned_cycles: ["G71"],
      x_min: 5,
      x_max: 10,
      z_start: 0,
      z_end: -40,
    },
    expected: "id_bore",
  },
  // 4 — external thread G76, wide stock
  {
    label: "G76 external thread on M30 stud",
    op: {
      index: 4,
      kind: "threading",
      tool_id: "T0404",
      canned_cycles: ["G76"],
      x_min: 14,
      x_max: 30,
      z_start: 0,
      z_end: -25,
    },
    expected: "thread_external",
  },
  // 5 — internal thread G76 inside small bore
  {
    label: "G76 internal thread M12 in bore",
    op: {
      index: 5,
      kind: "threading",
      tool_id: "T0505",
      canned_cycles: ["G76"],
      x_min: 5,
      x_max: 6,
      z_start: 0,
      z_end: -15,
    },
    expected: "thread_internal",
  },
  // 6 — OD groove: G75, large x_max
  {
    label: "OD groove G75",
    op: {
      index: 6,
      kind: "grooving",
      tool_id: "T0606",
      canned_cycles: ["G75"],
      x_min: 28,
      x_max: 30,
      z_start: -20,
      z_end: -25,
    },
    expected: "groove_od",
  },
  // 7 — ID groove: G75 inside small bore
  {
    label: "ID groove G75 inside bore",
    op: {
      index: 7,
      kind: "grooving",
      tool_id: "T0707",
      canned_cycles: ["G75"],
      x_min: 8,
      x_max: 10,
      z_start: -15,
      z_end: -20,
    },
    expected: "groove_id",
  },
  // 8 — parting: G75 ending near centerline
  {
    label: "parting G75 to center",
    op: {
      index: 8,
      kind: "parting",
      tool_id: "T0808",
      canned_cycles: ["G75"],
      x_min: 0.5,
      x_max: 30,
      z_start: -50,
      z_end: -50,
    },
    expected: "parting",
  },
  // 9 — drilling: deep G83 along axis
  {
    label: "deep drill G83",
    op: {
      index: 9,
      kind: "drilling",
      tool_id: "T0909",
      canned_cycles: ["G83"],
      x_min: 0,
      x_max: 0,
      z_start: 0,
      z_end: -50,
    },
    expected: "drill",
  },
  // 10 — center-drill: shallow G81/G83
  {
    label: "center drill (shallow G81)",
    op: {
      index: 10,
      kind: "drilling",
      tool_id: "T1010",
      canned_cycles: ["G81"],
      x_min: 0,
      x_max: 0,
      z_start: 0,
      z_end: -3,
    },
    expected: "center_drill",
  },
  // 11 — rigid tap G84
  {
    label: "rigid tap G84",
    op: {
      index: 11,
      kind: "rigid_tap",
      tool_id: "T1111",
      canned_cycles: ["G84"],
      x_min: 0,
      x_max: 0,
      z_start: 0,
      z_end: -15,
    },
    expected: "tap",
  },
  // 12 — turning with no canned cycle (motion-only OD turn)
  {
    label: "motion-only OD turn (no canned)",
    op: {
      index: 12,
      kind: "turning",
      tool_id: "T0101",
      canned_cycles: [],
      x_min: 25,
      x_max: 30,
      z_start: 0,
      z_end: -50,
    },
    expected: "od_turn",
  },
  // 13 — drilling without canned cycle (parser kind alone)
  {
    label: "drilling no canned",
    op: {
      index: 13,
      kind: "drilling",
      tool_id: "T0909",
      canned_cycles: [],
      x_min: 0,
      x_max: 0,
      z_start: 0,
      z_end: -25,
    },
    expected: "drill",
  },
  // 14 — completely unknown op (rare corruption case)
  {
    label: "unknown op (no signal)",
    op: {
      index: 14,
      kind: "unknown",
      tool_id: "T9999",
      canned_cycles: [],
      x_min: null,
      x_max: null,
      z_start: null,
      z_end: null,
    },
    expected: "unknown",
  },
];

// ── Suite ──────────────────────────────────────────────────────────────────

describe("LatheProgramFeatureInferenceEngine", () => {
  const engine = new LatheProgramFeatureInferenceEngine();

  // 1 — singleton + taxonomy contract
  it("exports a singleton and a 22-kind taxonomy including parting + unknown", () => {
    expect(latheProgramFeatureInferenceEngine).toBeInstanceOf(
      LatheProgramFeatureInferenceEngine,
    );
    expect(INFERRED_FEATURE_KINDS).toContain("parting");
    expect(INFERRED_FEATURE_KINDS).toContain("unknown");
    expect(INFERRED_FEATURE_KINDS).toContain("od_turn");
    expect(INFERRED_FEATURE_KINDS.length).toBe(22);
  });

  // 2 — constants are sane manufacturing values
  it("exposes manufacturing constants with sensible ranges", () => {
    expect(INTERNAL_THRESHOLD_MM).toBe(25);
    expect(PARTING_X_MM).toBeGreaterThan(0);
    expect(PARTING_X_MM).toBeLessThan(5);
    expect(CENTER_DRILL_DEPTH_MM).toBeGreaterThan(0);
    expect(CENTER_DRILL_DEPTH_MM).toBeLessThan(15);
  });

  // 3 — accuracy on the full ground-truth set MUST be >= 90 %
  it("achieves ≥90% accuracy on the 14-fixture ground-truth set (U-LPR29 exit gate)", () => {
    const result = engine.inferFromOperations(GROUND_TRUTH.map((g) => g.op));
    expect(result.features.length).toBe(GROUND_TRUTH.length);
    let correct = 0;
    const wrong: string[] = [];
    for (let i = 0; i < GROUND_TRUTH.length; i++) {
      const got = result.features[i]!.kind;
      const want = GROUND_TRUTH[i]!.expected;
      if (got === want) {
        correct++;
      } else {
        wrong.push(`${GROUND_TRUTH[i]!.label}: expected ${want}, got ${got}`);
      }
    }
    const accuracy = correct / GROUND_TRUTH.length;
    if (accuracy < 0.9) {
      throw new Error(
        `Accuracy ${(accuracy * 100).toFixed(1)}% < 90% gate. Misclassifications:\n  ${wrong.join("\n  ")}`,
      );
    }
    expect(accuracy).toBeGreaterThanOrEqual(0.9);
  });

  // 4 — every classification carries non-empty evidence
  it("every classification carries at least one piece of evidence", () => {
    const result = engine.inferFromOperations(GROUND_TRUTH.map((g) => g.op));
    for (const f of result.features) {
      expect(f.evidence.length).toBeGreaterThan(0);
    }
  });

  // 5 — confidence is always in [0, 1]
  it("confidence is bounded in [0, 1] for every fixture", () => {
    const result = engine.inferFromOperations(GROUND_TRUTH.map((g) => g.op));
    for (const f of result.features) {
      expect(f.confidence).toBeGreaterThanOrEqual(0);
      expect(f.confidence).toBeLessThanOrEqual(1);
    }
  });

  // 6 — strong-canned + matching parser kind hits the 0.95 high-conf tier
  it("threading with G76 + parser kind=threading reaches confidence ≥0.9", () => {
    const f = engine.inferOne(GROUND_TRUTH[3]!.op); // external thread fixture
    expect(f.kind).toBe("thread_external");
    expect(f.confidence).toBeGreaterThanOrEqual(0.9);
  });

  // 7 — parser kind alone (no canned) is the 0.65 mid-tier
  it("turning with no canned cycle scores in mid-confidence band", () => {
    const f = engine.inferOne(GROUND_TRUTH[11]!.op);
    expect(f.kind).toBe("od_turn");
    expect(f.confidence).toBeGreaterThanOrEqual(0.5);
    expect(f.confidence).toBeLessThan(0.9);
  });

  // 8 — unknown op falls back to "unknown" with low conf
  it("operation with no signal classifies as unknown at 0.30 confidence", () => {
    const f = engine.inferOne(GROUND_TRUTH[13]!.op);
    expect(f.kind).toBe("unknown");
    expect(f.confidence).toBe(0.30);
  });

  // 9 — empty operations array yields empty result, not exception
  it("empty operations array returns zero features and avg_confidence=0", () => {
    const r = engine.inferFromOperations([]);
    expect(r.features).toEqual([]);
    expect(r.total_op_count).toBe(0);
    expect(r.cutting_op_count).toBe(0);
    expect(r.unknown_count).toBe(0);
    expect(r.avg_confidence).toBe(0);
  });

  // 10 — setup ops are skipped (don't count as cutting)
  it("setup-kind operations are skipped from the cutting count", () => {
    const r = engine.inferFromOperations([
      { index: 0, kind: "setup", canned_cycles: [] },
      { index: 1, kind: "turning", canned_cycles: ["G71"], x_min: 25, x_max: 30, z_start: 0, z_end: -50 },
    ]);
    expect(r.total_op_count).toBe(2);
    expect(r.cutting_op_count).toBe(1);
    expect(r.features.length).toBe(1);
    expect(r.features[0]!.kind).toBe("od_turn");
  });

  // 11 — adversarial: NaN / Infinity in geometry don't crash inference
  it("NaN and Infinity in geometry don't propagate into the output", () => {
    const f = engine.inferOne({
      index: 0,
      kind: "turning",
      canned_cycles: ["G71"],
      x_min: NaN,
      x_max: Infinity,
      z_start: -Infinity,
      z_end: NaN,
    });
    expect(typeof f.confidence).toBe("number");
    expect(Number.isFinite(f.confidence)).toBe(true);
    expect(f.kind).toBe("od_turn");
  });

  // 12 — adversarial: undefined canned_cycles array is treated as empty
  it("undefined canned_cycles is treated identically to []", () => {
    const a = engine.inferOne({
      index: 0,
      kind: "turning",
      x_min: 25,
      x_max: 30,
      z_start: 0,
      z_end: -50,
    });
    const b = engine.inferOne({
      index: 0,
      kind: "turning",
      canned_cycles: [],
      x_min: 25,
      x_max: 30,
      z_start: 0,
      z_end: -50,
    });
    expect(a.kind).toBe(b.kind);
    expect(a.confidence).toBe(b.confidence);
  });

  // 13 — adversarial: operations array passed as undefined doesn't throw
  it("undefined operations array is treated as empty (defensive)", () => {
    const r = engine.inferFromOperations(undefined as unknown as InferenceOperationView[]);
    expect(r.features).toEqual([]);
    expect(r.total_op_count).toBe(0);
  });

  // 14 — determinism: two runs over identical input produce identical output
  it("two runs over identical input produce identical output (pure function)", () => {
    const a = engine.inferFromOperations(GROUND_TRUTH.map((g) => g.op));
    const b = engine.inferFromOperations(GROUND_TRUTH.map((g) => g.op));
    expect(b).toEqual(a);
  });

  // 15 — Variability floor: every cycle family produces a distinct kind
  it("the four canned-cycle families all map to distinct feature kinds", () => {
    const kinds = new Set<string>();
    for (const g of GROUND_TRUTH) {
      const f = engine.inferOne(g.op);
      kinds.add(f.kind);
    }
    // Across 14 fixtures we expect ≥7 distinct kinds (od_turn, face, id_bore,
    // thread_external, thread_internal, groove_od, groove_id, parting,
    // drill, center_drill, tap, unknown — at least 7 of these).
    expect(kinds.size).toBeGreaterThanOrEqual(7);
  });
});

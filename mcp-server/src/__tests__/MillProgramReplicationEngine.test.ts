/**
 * MillProgramReplicationEngine — print-to-program by retrieval + adaptation.
 *
 * Verifies the composer that wires the (previously orphaned) hyperMILL
 * replication chain: retrieve the most similar existing program from a corpus,
 * axis-gate it (3 → 4 → 5), and adapt it to a new print.
 *
 * Tests encode INTENT, not just behavior:
 *  - the axis gate is a SAFETY invariant (never run a 5-axis program on a
 *    3-axis machine) — a regression here would let a crashing program through;
 *  - cross-material retrieval MUST survive (the replicator exists to adapt
 *    steel→aluminum) — a regression to a materialGroup hard-filter kills it;
 *  - scaling/topology preservation — adapted ops must not silently vanish.
 */
import { describe, it, expect } from "vitest";
import {
  millProgramReplicationEngine,
  deriveAxisCount,
  type ReplicateFromPrintInput,
} from "../engines/MillProgramReplicationEngine.js";
import type {
  FeatureSequenceRecord,
  SequenceOperation,
} from "../engines/hypermill/HMCProjectParserEngine.js";
import type { RecognizedFeature, FeatureType } from "../engines/FeatureRecognitionEngine.js";
import { registerMultiAxisProgramDispatcher } from "../tools/dispatchers/multiAxisProgramDispatcher.js";

// ── fixtures ──────────────────────────────────────────────────────────────────

function mkFeature(
  type: FeatureType,
  opts: {
    id?: string;
    dims?: Record<string, number>;
    axis?: "x" | "y" | "z" | "custom";
    angle?: number;
  } = {}
): RecognizedFeature {
  return {
    id: opts.id ?? `f_${type}`,
    type,
    confidence: 0.9,
    dimensions: (opts.dims ?? { diameter_mm: 10, depth_mm: 20 }) as RecognizedFeature["dimensions"],
    position: { x: 0, y: 0, z: 0 },
    orientation: { axis: opts.axis ?? "z", angle_deg: opts.angle },
    notes: [],
  };
}

function mkOp(
  i: number,
  operationType: SequenceOperation["operationType"],
  cycleCode: string,
  targetFeatures: FeatureType[]
): SequenceOperation {
  return {
    index: i,
    name: `op${i}`,
    cycleCode,
    operationType,
    tool: { toolNumber: i + 1, name: `T${i + 1}`, type: "endmill_flat", diameterMm: 10 },
    parameters: { spindle_rpm: 3000, feed_mm_min: 500, depth_mm: 20, stepdown_mm: 4, stepover_mm: 4 },
    targetFeatures,
    dependsOn: [],
    estimatedCycleTimeSec: 60,
  };
}

function mkRecord(o: {
  id: string;
  isoGroup?: FeatureSequenceRecord["stock"]["isoGroup"];
  dims?: { x: number; y: number; z: number };
  features: RecognizedFeature[];
  operations: SequenceOperation[];
  partType?: FeatureSequenceRecord["partType"];
  complexityScore?: number;
}): FeatureSequenceRecord {
  return {
    id: o.id,
    source: "hmc_project",
    partType: o.partType ?? "prismatic",
    partName: o.id,
    stock: {
      type: "rectangular",
      dimensions: o.dims ?? { x: 100, y: 80, z: 30 },
      material: "1018 Steel",
      isoGroup: o.isoGroup ?? "P",
    },
    wcsList: [],
    features: o.features,
    operations: o.operations,
    totalCycleTimeSec: o.operations.reduce((s, op) => s + (op.estimatedCycleTimeSec ?? 0), 0),
    toolChangeCount: 1,
    uniqueToolCount: o.operations.length,
    createdAt: "2026-06-02T00:00:00.000Z",
    // complexityScore is on the 0-10 scale (HMCProjectParser convention) — the
    // similarity engine's complexityMatch is 1-|Δ|/10, so this must match the
    // engine's estimateComplexity scale or the term floors to 0.
    complexityScore: o.complexityScore ?? 3,
    warnings: [],
  };
}

// Canonical 3-axis steel program: a pocket + a hole.
const corpus3axisP = mkRecord({
  id: "JM-3AX-POCKET-HOLE",
  isoGroup: "P",
  features: [mkFeature("pocket_rectangular", { dims: { width_mm: 40, length_mm: 60, depth_mm: 12 } }), mkFeature("through_hole")],
  operations: [
    mkOp(0, "roughing", "MAXX_ROUGHING", ["pocket_rectangular"]),
    mkOp(1, "drilling", "DRILLING", ["through_hole"]),
  ],
});

// 5-axis program: has a simultaneous 5-axis operation.
const corpus5axis = mkRecord({
  id: "JM-5AX-IMPELLER",
  isoGroup: "S",
  partType: "freeform",
  features: [mkFeature("pocket_rectangular", { axis: "custom", angle: 35 }), mkFeature("through_hole")],
  operations: [
    mkOp(0, "roughing", "MAXX_ROUGHING", ["pocket_rectangular"]),
    mkOp(1, "5axis", "5X_SWARF", ["pocket_rectangular"]),
  ],
});

// A print that looks like the canonical 3-axis part (same feature types).
function printLikePocketHole(over: Partial<ReplicateFromPrintInput> = {}): ReplicateFromPrintInput {
  return {
    partName: "NEW-BRACKET",
    material: "1018 Steel",
    isoGroup: "P",
    dimensions: { x: 100, y: 80, z: 30 },
    features: [mkFeature("pocket_rectangular", { dims: { width_mm: 40, length_mm: 60, depth_mm: 12 } }), mkFeature("through_hole")],
    corpus: [corpus3axisP],
    targetAxisCount: 3,
    ...over,
  };
}

// ── deriveAxisCount ─────────────────────────────────────────────────────────

describe("deriveAxisCount", () => {
  it("returns 3 for axis-aligned features with no rotary evidence", () => {
    expect(deriveAxisCount(corpus3axisP)).toBe(3);
  });

  it("returns 4 when a feature needs rotary positioning (custom axis / angle) but no simultaneous op", () => {
    const rec = mkRecord({
      id: "indexed",
      features: [mkFeature("through_hole", { axis: "custom", angle: 22 })],
      operations: [mkOp(0, "drilling", "DRILLING", ["through_hole"])],
    });
    expect(deriveAxisCount(rec)).toBe(4);
  });

  it("returns 5 when any operation is simultaneous 5-axis", () => {
    expect(deriveAxisCount(corpus5axis)).toBe(5);
  });
});

// ── replicateFromPrint: happy path + provenance ─────────────────────────────

describe("replicateFromPrint — retrieval + adaptation", () => {
  it("retrieves the matching program and reports full provenance", () => {
    const res = millProgramReplicationEngine.replicateFromPrint(printLikePocketHole());
    expect(res.ok).toBe(true);
    expect(res.replicated).not.toBeNull();
    expect(res.provenance.sourceProgramId).toBe("JM-3AX-POCKET-HOLE");
    expect(res.provenance.similarityScore).toBeGreaterThan(25);
    expect(res.provenance.sourceAxisCount).toBe(3);
    expect(res.candidatesRejectedByAxis).toBe(0);
  });

  it("confidence is bounded in [0,1] and combines similarity × replication confidence", () => {
    const res = millProgramReplicationEngine.replicateFromPrint(printLikePocketHole());
    expect(res.confidence).toBeGreaterThan(0);
    expect(res.confidence).toBeLessThanOrEqual(1);
    // confidence == (score/100) × replicated.confidence
    const expected = (res.provenance.similarityScore / 100) * (res.replicated!.confidence);
    expect(res.confidence).toBeCloseTo(Math.max(0, Math.min(1, expected)), 5);
  });

  it("scales the adapted program to the new stock (1.2× larger part)", () => {
    const res = millProgramReplicationEngine.replicateFromPrint(
      printLikePocketHole({ dimensions: { x: 120, y: 96, z: 36 } })
    );
    expect(res.ok).toBe(true);
    expect(res.replicated!.scaleFactor.avg).toBeCloseTo(1.2, 1);
  });

  it("preserves operation topology — adapted ops are not silently dropped when feature sets match", () => {
    const res = millProgramReplicationEngine.replicateFromPrint(printLikePocketHole());
    expect(res.replicated!.adaptedRecord.operations.length).toBeGreaterThanOrEqual(
      corpus3axisP.operations.length
    );
  });
});

// ── cross-material adaptation (the replicator's reason to exist) ─────────────

describe("replicateFromPrint — cross-material adaptation", () => {
  it("retrieves a STEEL template for an ALUMINUM print and applies an S/F adjustment", () => {
    // Print is aluminum (N); only a steel (P) program exists. A materialGroup
    // hard-filter would return nothing — this asserts we do NOT filter it out.
    const res = millProgramReplicationEngine.replicateFromPrint(
      printLikePocketHole({ material: "6061 Aluminum", isoGroup: "N" })
    );
    expect(res.ok).toBe(true);
    expect(res.provenance.sourceProgramId).toBe("JM-3AX-POCKET-HOLE");
    // P (kc 1800) → N (kc 700): speed factor = sqrt(1800/700) ≈ 1.6 > 1.
    expect(res.replicated!.sfAdjustmentFactor).toBeGreaterThan(1);
  });

  it("spans material groups P, N, S — each retrieves and adapts the canonical template", () => {
    for (const isoGroup of ["P", "N", "S"] as const) {
      const res = millProgramReplicationEngine.replicateFromPrint(printLikePocketHole({ isoGroup }));
      expect(res.ok, `isoGroup=${isoGroup}`).toBe(true);
      expect(res.replicated!.adaptedRecord.stock.isoGroup).toBe(isoGroup);
    }
  });
});

// ── axis gate (SAFETY invariant) ────────────────────────────────────────────

describe("replicateFromPrint — axis-escalation gate", () => {
  it("REJECTS a 5-axis-only corpus for a 3-axis machine (never crash a 3-axis machine)", () => {
    const res = millProgramReplicationEngine.replicateFromPrint(
      printLikePocketHole({ corpus: [corpus5axis], targetAxisCount: 3 })
    );
    expect(res.ok).toBe(false);
    expect(res.candidatesRejectedByAxis).toBeGreaterThanOrEqual(1);
    expect(res.replicated).toBeNull();
    expect(res.reason).toMatch(/axis/i);
  });

  it("ACCEPTS a 5-axis program when the target machine is 5-axis", () => {
    const res = millProgramReplicationEngine.replicateFromPrint(
      printLikePocketHole({
        corpus: [corpus5axis],
        targetAxisCount: 5,
        features: [
          mkFeature("pocket_rectangular", { axis: "custom", angle: 35 }),
          mkFeature("through_hole"),
        ],
      })
    );
    expect(res.ok).toBe(true);
    expect(res.provenance.sourceAxisCount).toBe(5);
  });

  it("flags axis headroom when a 3-axis program runs on a 5-axis target", () => {
    const res = millProgramReplicationEngine.replicateFromPrint(
      printLikePocketHole({ corpus: [corpus3axisP], targetAxisCount: 5 })
    );
    expect(res.ok).toBe(true);
    expect(res.provenance.axisHeadroomUnused).toBe(true);
    expect(res.warnings.some((w) => /headroom/i.test(w))).toBe(true);
  });
});

// ── failure modes + adversarial input ───────────────────────────────────────

describe("replicateFromPrint — failure modes (structured, never throws)", () => {
  it("empty corpus → ok:false with a clear reason", () => {
    const res = millProgramReplicationEngine.replicateFromPrint(printLikePocketHole({ corpus: [] }));
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/corpus/i);
  });

  it("no features extracted → ok:false", () => {
    const res = millProgramReplicationEngine.replicateFromPrint(printLikePocketHole({ features: [] }));
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/feature/i);
  });

  it("NaN / Infinity stock dimension → ok:false (adversarial)", () => {
    for (const bad of [NaN, Infinity, -5, 0]) {
      const res = millProgramReplicationEngine.replicateFromPrint(
        printLikePocketHole({ dimensions: { x: bad, y: 80, z: 30 } })
      );
      expect(res.ok, `dim=${bad}`).toBe(false);
      expect(res.reason).toMatch(/dimension/i);
    }
  });

  it("no candidate clears the minScore floor → ok:false", () => {
    const res = millProgramReplicationEngine.replicateFromPrint(printLikePocketHole({ minScore: 99.9 }));
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/similarity/i);
  });
});

// ── granular actions ────────────────────────────────────────────────────────

describe("indexCorpus + similaritySearch", () => {
  it("indexCorpus reports indexed + bucket counts", () => {
    const r = millProgramReplicationEngine.indexCorpus([corpus3axisP, corpus5axis]);
    expect(r.ok).toBe(true);
    expect(r.indexed).toBe(2);
    expect(r.buckets).toBeGreaterThan(0);
  });

  it("similaritySearch annotates each match with axis count + usability", () => {
    const res = millProgramReplicationEngine.similaritySearch(
      printLikePocketHole({ corpus: [corpus3axisP, corpus5axis], targetAxisCount: 3 })
    );
    expect(res.ok).toBe(true);
    // Assert the 5-axis record was actually retrieved — fail loud on any
    // retrieval regression rather than silently skipping the axis checks.
    expect(res.matches.map((m) => m.id)).toContain("JM-5AX-IMPELLER");
    const fiveAx = res.matches.find((m) => m.id === "JM-5AX-IMPELLER")!;
    expect(fiveAx.axisCount).toBe(5);
    expect(fiveAx.usableOnTarget).toBe(false);
  });
});

// ── dispatcher round-trip (E2E through prism_multiaxis_program) ──────────────

describe("multiAxisProgramDispatcher wiring", () => {
  function captureHandler(): (args: any) => Promise<any> {
    let handler!: (args: any) => Promise<any>;
    const server = {
      tool: (_name: string, _desc: string, _schema: unknown, h: (args: any) => Promise<any>) => {
        handler = h;
      },
    };
    registerMultiAxisProgramDispatcher(server);
    return handler;
  }

  it("replicate_from_print routes through the dispatcher and returns ok:true", async () => {
    const handler = captureHandler();
    const res = await handler({
      action: "replicate_from_print",
      params: {
        part_name: "NEW-BRACKET",
        material: "1018 Steel",
        iso_group: "P",
        dimensions: { x: 100, y: 80, z: 30 },
        features: [
          { id: "f1", type: "pocket_rectangular", dimensions: { width_mm: 40, length_mm: 60, depth_mm: 12 } },
          { id: "f2", type: "through_hole", dimensions: { diameter_mm: 10, depth_mm: 20 } },
        ],
        corpus: [corpus3axisP],
        target_axis_count: 3,
      },
    });
    expect(res.success).toBe(true);
    expect(res.data.ok).toBe(true);
    expect(res.data.provenance.sourceProgramId).toBe("JM-3AX-POCKET-HOLE");
  });

  it("replicate_corpus_index routes through the dispatcher", async () => {
    const handler = captureHandler();
    const res = await handler({
      action: "replicate_corpus_index",
      params: { corpus: [corpus3axisP, corpus5axis] },
    });
    expect(res.success).toBe(true);
    expect(res.data.indexed).toBe(2);
  });

  it("axis gate holds through the dispatcher — 5-axis corpus rejected for a 3-axis target", async () => {
    const handler = captureHandler();
    const res = await handler({
      action: "replicate_from_print",
      params: {
        part_name: "NEW-BRACKET",
        material: "1018 Steel",
        iso_group: "P",
        dimensions: { x: 100, y: 80, z: 30 },
        features: [
          { id: "f1", type: "pocket_rectangular", dimensions: { width_mm: 40, length_mm: 60, depth_mm: 12 } },
          { id: "f2", type: "through_hole", dimensions: { diameter_mm: 10, depth_mm: 20 } },
        ],
        corpus: [corpus5axis],
        target_axis_count: 3,
      },
    });
    expect(res.success).toBe(true);
    expect(res.data.ok).toBe(false);
    expect(res.data.candidatesRejectedByAxis).toBeGreaterThanOrEqual(1);
    expect(res.data.reason).toMatch(/axis/i);
  });

  it("rejects invalid params (missing required dimensions) at the schema gate", async () => {
    const handler = captureHandler();
    const res = await handler({
      action: "replicate_from_print",
      params: { part_name: "x", material: "steel", features: [], corpus: [] },
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Invalid params/i);
  });
});

/**
 * jmDiePartSpecAdapter.test.ts -- U-QP-JM-PARTSPEC-ADAPTER (slot:charlie, W3).
 *
 * The adapter maps a JMDiePartRecord (file-join index, NO geometric fields) to a PartSpec
 * so the live 30,890-record JM corpus can feed PartSimilarityEngine.findNearest(). Tests
 * are reference-value (R9): each field's derivation is pinned, the provenance/confidence
 * is exact, and the adapted specs actually rank a new part against the right JM neighbor
 * end-to-end through the real similarity engine (R15 -- exercised through the consumer).
 */
import { describe, it, expect } from "vitest";
import {
  jmDiePartSpecAdapterEngine,
  type JMDiePartRecordLike,
} from "../engines/JMDiePartSpecAdapterEngine.js";
import { partSimilarityEngine, type PartSpec } from "../engines/PartSimilarityEngine.js";
import {
  quotingActionEnum,
  QUOTING_ACTION_SCHEMAS,
} from "../schemas/quotingActionSchemas.js";

// A real-shape record (mirrors the live jm-part-library.jsonl: customer + cncPrograms
// with machineCategory + prints, NO geometric fields).
function rec(over: Partial<JMDiePartRecordLike> = {}): JMDiePartRecordLike {
  return {
    partNumber: "WF-112392",
    customer: "ACME",
    cncPrograms: [
      { machineCategory: "lathe", ext: ".min", copiedAs: "T-P6-WF-112392.MIN", sourcePath: "H:/x/T-P6.MIN" },
    ],
    prints: [{ copiedAs: "WF-112392__p2.pdf", label: "print" }],
    ...over,
  };
}

describe("JMDiePartSpecAdapterEngine.adapt -- honest field derivation", () => {
  it("derives machine_type + operations prior from the linked program machineCategory (lathe)", () => {
    const a = jmDiePartSpecAdapterEngine.adapt(rec());
    expect(a).not.toBeNull();
    expect(a!.spec.machine_type).toBe("lathe");
    expect(a!.spec.operations).toEqual(["turn", "thread", "part_off"]);
    expect(a!.id).toBe("WF-112392");
  });

  it("extracts material from a filename token when present (real signal, high confidence)", () => {
    // A D2 token in the program filename -> material from filename, not convention.
    const a = jmDiePartSpecAdapterEngine.adapt(
      rec({ cncPrograms: [{ machineCategory: "mill", copiedAs: "D2-DIEPLATE-001.MIN" }] }),
    );
    expect(a!.spec.material).toBe("D2");
    expect(a!.material_source).toBe("filename");
    expect(a!.spec.iso_group).toBe("H"); // D2 is a hardened tool steel
    // machine_type + operations + material(filename) all real -> confidence 1.0
    expect(a!.confidence).toBe(1);
  });

  it("falls back to the JM customer->material convention when no filename token (flagged prior)", () => {
    // No grade in the filename -> ACME convention -> D2, flagged customer_convention.
    const a = jmDiePartSpecAdapterEngine.adapt(rec()); // copiedAs has no grade token
    expect(a!.spec.material).toBe("D2");
    expect(a!.material_source).toBe("customer_convention");
    // machine_type(real) + operations(prior) real, material is a prior -> confidence 2/3
    expect(a!.confidence).toBeCloseTo(0.67, 2);
  });

  it("maps each machine category to its operations prior (>=3 spanning configs)", () => {
    const lathe = jmDiePartSpecAdapterEngine.adapt(rec({ cncPrograms: [{ machineCategory: "lathe" }] }));
    const mill = jmDiePartSpecAdapterEngine.adapt(rec({ cncPrograms: [{ machineCategory: "vmc mill" }] }));
    const wedm = jmDiePartSpecAdapterEngine.adapt(rec({ cncPrograms: [{ machineCategory: "wire edm" }] }));
    expect(lathe!.spec.machine_type).toBe("lathe");
    expect(mill!.spec.machine_type).toBe("mill");
    expect(wedm!.spec.machine_type).toBe("wire_edm");
    expect(wedm!.spec.operations).toEqual(["rough_cut", "skim_cut"]);
  });

  it("leaves geometric fields undefined (not fabricated -- honest partial spec)", () => {
    const a = jmDiePartSpecAdapterEngine.adapt(rec());
    expect(a!.spec.dimensions).toBeUndefined();
    expect(a!.spec.features).toBeUndefined();
    expect(a!.spec.tolerances).toBeUndefined();
    expect(a!.spec.surface_finish_ra).toBeUndefined();
  });

  // ---- failure / degraded-data modes ----
  it("a record with no partNumber -> null (un-keyable)", () => {
    expect(jmDiePartSpecAdapterEngine.adapt({ partNumber: "" } as JMDiePartRecordLike)).toBeNull();
  });

  it("a record with no programs -> material 'unknown_steel', machine_type undefined", () => {
    const a = jmDiePartSpecAdapterEngine.adapt({ partNumber: "X-1", customer: "NOBODY" });
    expect(a).not.toBeNull();
    expect(a!.spec.machine_type).toBeUndefined();
    expect(a!.spec.material).toBe("unknown_steel");
    expect(a!.material_source).toBe("unknown");
    expect(a!.confidence).toBe(0); // nothing real derived
  });

  it("an unknown machineCategory -> machine_type undefined (no fabricated mapping)", () => {
    const a = jmDiePartSpecAdapterEngine.adapt(rec({ cncPrograms: [{ machineCategory: "plasma" }] }));
    expect(a!.spec.machine_type).toBeUndefined();
    expect(a!.spec.operations).toBeUndefined();
  });

  // ---- adversarial inputs ----
  it("null / non-object / array record -> null (no crash)", () => {
    expect(jmDiePartSpecAdapterEngine.adapt(null as unknown as JMDiePartRecordLike)).toBeNull();
    expect(jmDiePartSpecAdapterEngine.adapt(undefined as unknown as JMDiePartRecordLike)).toBeNull();
    expect(jmDiePartSpecAdapterEngine.adapt([] as unknown as JMDiePartRecordLike)).toBeNull();
  });
});

describe("JMDiePartSpecAdapterEngine.adaptBatch -- corpus -> findNearest candidates", () => {
  it("skips un-keyable records, keeps the rest", () => {
    const out = jmDiePartSpecAdapterEngine.adaptBatch([
      rec({ partNumber: "A-1" }),
      { partNumber: "" } as JMDiePartRecordLike, // dropped
      rec({ partNumber: "B-2", cncPrograms: [{ machineCategory: "mill" }] }),
    ]);
    expect(out.length).toBe(2);
    expect(out.map((o) => o.id)).toEqual(["A-1", "B-2"]);
  });

  it("non-array input -> [] (no crash)", () => {
    expect(jmDiePartSpecAdapterEngine.adaptBatch(null as unknown as JMDiePartRecordLike[])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// R15: the adapted corpus actually ranks a new part against the right JM neighbor
// ---------------------------------------------------------------------------

describe("adapted JM corpus -> PartSimilarity ranks a new part correctly", () => {
  it("a new D2 mill part's nearest adapted JM neighbor is a D2 mill record", () => {
    const corpus = jmDiePartSpecAdapterEngine.adaptBatch([
      rec({ partNumber: "JM-LATHE-A2", customer: "ATF", cncPrograms: [{ machineCategory: "lathe", copiedAs: "A2-SHAFT.MIN" }] }),
      rec({ partNumber: "JM-MILL-D2", customer: "ACME", cncPrograms: [{ machineCategory: "mill", copiedAs: "D2-PLATE.MIN" }] }),
      rec({ partNumber: "JM-WEDM-S7", customer: "ITW", cncPrograms: [{ machineCategory: "wire edm", copiedAs: "S7-PUNCH.MIN" }] }),
    ]);
    const target: PartSpec = {
      material: "D2", iso_group: "H", machine_type: "mill",
      operations: ["face", "pocket", "drill"], features: ["pocket", "hole"],
    };
    const nearest = partSimilarityEngine.findNearest(target, corpus, 3);
    expect(nearest.length).toBe(3);
    // The D2 mill record must rank first (material + machine + ops all align).
    expect(nearest[0].id).toBe("JM-MILL-D2");
    expect(nearest[0].score).toBeGreaterThan(nearest[1].score);
  });
});

// ---------------------------------------------------------------------------
// Dispatcher wiring (R15): the new action is in the enum + schema map and its
// schema validates + preserves the target/records payload through .passthrough().
// ---------------------------------------------------------------------------

describe("quoting_find_similar_jm_parts dispatcher wiring", () => {
  it("action is in the enum + schema map", () => {
    expect(quotingActionEnum.options).toContain("quoting_find_similar_jm_parts");
    expect(QUOTING_ACTION_SCHEMAS["quoting_find_similar_jm_parts"]).toBeTruthy();
  });

  it("schema validates a target + JM records payload (the dispatcher input contract)", () => {
    const parsed = QUOTING_ACTION_SCHEMAS["quoting_find_similar_jm_parts"].safeParse({
      target: { material: "D2", machine_type: "mill", operations: ["face", "pocket"] },
      records: [
        { partNumber: "JM-1", customer: "ACME", cncPrograms: [{ machineCategory: "mill", copiedAs: "D2-X.MIN" }] },
      ],
      topN: 3,
    });
    expect(parsed.success).toBe(true);
  });

  it("schema rejects an empty target material (required field)", () => {
    const parsed = QUOTING_ACTION_SCHEMAS["quoting_find_similar_jm_parts"].safeParse({
      target: { material: "" },
      records: [],
    });
    expect(parsed.success).toBe(false);
  });
});

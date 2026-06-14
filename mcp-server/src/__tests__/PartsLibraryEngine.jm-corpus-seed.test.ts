/**
 * PartsLibraryEngine.seedFromJMCorpus — JM-Die part-library metadata seed (U-JMDOC05)
 *
 * Seeds the STRUCTURAL `part_library/other` rows of the JM document ledger into the
 * parts catalog as revision-controlled metadata (disposition=metadata). Identity is
 * derived from the PATH + the inventory `customer` field — part.json files are gone
 * from disk, so NOTHING reads part.json content.
 *
 * Real-value assertions (no toBeDefined()/toBeUndefined() stubs):
 *   - Structural filter is byte-equivalent to scripts/build-jm-document-ledger.mjs classify()
 *     (basename==="part.json" OR a /R\d+/ rev folder) — the reconciliation invariant.
 *   - derivePartIdentity resolves customer/part/rev for both real path shapes.
 *   - One part per (customer, part); deeper R\d+ folders become extra revisions.
 *   - ACCOUNTABILITY INVARIANT (zero silent drops): for every batch,
 *     total_records === parts_created + revisions_added + skipped_existing
 *                       + skipped_out_of_scope + skipped_invalid.
 *   - Idempotent (re-seed -> nothing new); fail-soft (non-array -> zeroes; bad rows skipped).
 *   - Cross-customer part-folder name collision is prevented by <CUSTOMER>/<PART> namespacing.
 *
 * @milestone JM-DOC-POPULATION-MS0 / U-JMDOC05 (slot:hotel)
 */
import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import {
  partsLibraryEngine,
  isStructuralPartLibraryOther,
  derivePartIdentity,
  type JMPartSeedRecord,
} from "../engines/PartsLibraryEngine.js";
import { registerPartsLibraryDispatcher } from "../tools/dispatchers/partsLibraryDispatcher.js";

function reset(): void {
  (partsLibraryEngine as any).parts.clear();
  (partsLibraryEngine as any).revisions.clear();
  (partsLibraryEngine as any).partNumberIndex.clear();
}

const ROOT = "H:/PRISM/JM DIE/_PART LIBRARY";

// Real-shaped structural rows (part.json under <CUSTOMER>/<PART>/).
const SAMPLE: JMPartSeedRecord[] = [
  { path: `${ROOT}/AAAMECONINGPIN/R910/part.json`, source: "part_library", bucket: "other", customer: "AAAMECONINGPIN", material: null, machine_class: null },
  { path: `${ROOT}/ITW/1860/part.json`, source: "part_library", bucket: "other", customer: "ITW", material: "D2", machine_class: null },
  { path: `${ROOT}/ALCOA/26815/part.json`, source: "part_library", bucket: "other", customer: "ALCOA", material: null, machine_class: null },
];

// An out-of-scope part_library/other row (non-structural: not part.json, no /R\d+/ folder).
const NON_STRUCTURAL: JMPartSeedRecord = {
  path: `${ROOT}/ITW/readme.txt`, source: "part_library", bucket: "other", customer: "ITW", material: null, machine_class: null,
};

describe("isStructuralPartLibraryOther — ledger classifier mirror", () => {
  it("matches part.json basename (case-insensitive)", () => {
    expect(isStructuralPartLibraryOther({ path: `${ROOT}/ITW/1860/part.json`, source: "part_library", bucket: "other" })).toBe(true);
    expect(isStructuralPartLibraryOther({ path: `${ROOT}/ITW/1860/PART.JSON`, source: "part_library", bucket: "other" })).toBe(true);
  });

  it("matches a /R\\d+/ rev folder anywhere in the path (both separators)", () => {
    expect(isStructuralPartLibraryOther({ path: `${ROOT}/ITW/WIDGET/R2/notes.dat`, source: "part_library", bucket: "other" })).toBe(true);
    expect(isStructuralPartLibraryOther({ path: "H:\\PRISM\\JM DIE\\_PART LIBRARY\\ITW\\R7\\stub.bin", source: "part_library", bucket: "other" })).toBe(true);
  });

  it("rejects non-structural part_library/other (not part.json, no rev folder)", () => {
    expect(isStructuralPartLibraryOther(NON_STRUCTURAL)).toBe(false);
    expect(isStructuralPartLibraryOther({ path: `${ROOT}/ITW/notes/summary.txt`, source: "part_library", bucket: "other" })).toBe(false);
  });

  it("rejects every other (source,bucket) tuple regardless of path", () => {
    expect(isStructuralPartLibraryOther({ path: `${ROOT}/ITW/1860/part.json`, source: "part_library", bucket: "program" })).toBe(false);
    expect(isStructuralPartLibraryOther({ path: `${ROOT}/ITW/1860/part.json`, source: "jm_die_category", bucket: "other" })).toBe(false);
    expect(isStructuralPartLibraryOther({ path: "", source: "part_library", bucket: "other" })).toBe(false);
  });
});

describe("derivePartIdentity — path + customer field", () => {
  it("derives customer/part with null rev for <CUSTOMER>/<PART>/part.json", () => {
    expect(derivePartIdentity(`${ROOT}/AAAMECONINGPIN/R910/part.json`, "AAAMECONINGPIN")).toEqual({
      customer: "AAAMECONINGPIN", part: "R910", rev: null,
    });
  });

  it("derives the deeper R\\d+ folder as the revision", () => {
    expect(derivePartIdentity(`${ROOT}/ITW/WIDGET/R2/part.json`, "ITW")).toEqual({
      customer: "ITW", part: "WIDGET", rev: "R2",
    });
  });

  it("prefers the inventory customer field over the path segment", () => {
    const id = derivePartIdentity(`${ROOT}/PATHCUST/JOB1/part.json`, "FIELDCUST");
    expect(id?.customer).toBe("FIELDCUST");
    expect(id?.part).toBe("JOB1");
  });

  it("normalizes backslash paths and falls back to the path segment when no customer field", () => {
    const id = derivePartIdentity("H:\\PRISM\\JM DIE\\_PART LIBRARY\\HOLO-KROME\\R55\\part.json", null);
    expect(id).toEqual({ customer: "HOLO-KROME", part: "R55", rev: null });
  });

  it("returns null for empty/too-short paths", () => {
    expect(derivePartIdentity("", "ITW")).toBeNull();
    expect(derivePartIdentity("solo", "ITW")).toBeNull();
  });
});

describe("PartsLibraryEngine.seedFromJMCorpus", () => {
  beforeEach(reset);

  it("seeds one part per structural row with namespaced part_number, customer assoc, and tags", () => {
    const r = partsLibraryEngine.seedFromJMCorpus(SAMPLE);
    expect(r.total_records).toBe(3);
    expect(r.parts_created).toBe(3);
    expect(r.revisions_added).toBe(0);
    expect(r.skipped_existing).toBe(0);
    expect(r.skipped_out_of_scope).toBe(0);
    expect(r.skipped_invalid).toBe(0);
    expect(r.distinct_customers).toBe(3);
    expect(r.part_ids).toHaveLength(3);

    const got = partsLibraryEngine.getByPartNumber("ITW/1860");
    expect(got).not.toBeNull();
    expect(got!.part.name).toBe("1860");
    expect(got!.part.customer_id).toBe("jm:ITW");
    expect(got!.part.material_name).toBe("D2");
    expect(got!.part.current_revision).toBe("A");
    expect(got!.part.tags).toContain("jm-die");
    expect(got!.part.tags).toContain("part-library");
    expect(got!.part.tags).toContain("u-jmdoc05");
    expect(got!.part.tags).toContain("itw");
  });

  it("adds a NEW revision (not a 2nd part) when a deeper rev folder shares the part", () => {
    // base part.json (rev null -> A) + a deeper R3 row for the SAME part folder.
    const r = partsLibraryEngine.seedFromJMCorpus([
      { path: `${ROOT}/ITW/WIDGET/part.json`, source: "part_library", bucket: "other", customer: "ITW" },
      { path: `${ROOT}/ITW/WIDGET/R3/part.json`, source: "part_library", bucket: "other", customer: "ITW" },
    ]);
    expect(r.parts_created).toBe(1);
    expect(r.revisions_added).toBe(1);
    expect(r.skipped_existing).toBe(0);

    const got = partsLibraryEngine.getByPartNumber("ITW/WIDGET");
    const revs = got!.revisions.map((rev) => rev.revision).sort();
    expect(revs).toEqual(["A", "R3"]);
  });

  it("skips out-of-scope rows (non-structural other + wrong tuple) without seeding", () => {
    const r = partsLibraryEngine.seedFromJMCorpus([
      SAMPLE[0],                                                                          // structural -> created
      NON_STRUCTURAL,                                                                     // non-structural other -> out_of_scope
      { path: `${ROOT}/ITW/1860/prog.nc`, source: "part_library", bucket: "program" },    // consumed tuple -> out_of_scope
      { path: `${ROOT}/ITW/1860/model.step`, source: "jm_die_category", bucket: "cad" },  // cad tuple -> out_of_scope
    ]);
    expect(r.parts_created).toBe(1);
    expect(r.skipped_out_of_scope).toBe(3);
    expect(partsLibraryEngine.getStats().total_parts).toBe(1);
  });

  it("is idempotent — re-seeding the same rows creates nothing new", () => {
    partsLibraryEngine.seedFromJMCorpus(SAMPLE);
    expect(partsLibraryEngine.getStats().total_parts).toBe(3);
    const r2 = partsLibraryEngine.seedFromJMCorpus(SAMPLE);
    expect(r2.parts_created).toBe(0);
    expect(r2.skipped_existing).toBe(3);
    expect(partsLibraryEngine.getStats().total_parts).toBe(3);
  });

  it("dedups duplicate rows within a single batch", () => {
    const r = partsLibraryEngine.seedFromJMCorpus([SAMPLE[0], { ...SAMPLE[0] }]);
    expect(r.parts_created).toBe(1);
    expect(r.skipped_existing).toBe(1);
  });

  it("prevents cross-customer collision on a shared part-folder name", () => {
    const r = partsLibraryEngine.seedFromJMCorpus([
      { path: `${ROOT}/CUSTA/R910/part.json`, source: "part_library", bucket: "other", customer: "CUSTA" },
      { path: `${ROOT}/CUSTB/R910/part.json`, source: "part_library", bucket: "other", customer: "CUSTB" },
    ]);
    expect(r.parts_created).toBe(2);
    expect(r.distinct_customers).toBe(2);
    expect(partsLibraryEngine.getByPartNumber("CUSTA/R910")).not.toBeNull();
    expect(partsLibraryEngine.getByPartNumber("CUSTB/R910")).not.toBeNull();
  });

  it("is fail-soft: skips invalid rows; non-array -> all-zero result", () => {
    const r = partsLibraryEngine.seedFromJMCorpus([
      { path: "", source: "part_library", bucket: "other" } as JMPartSeedRecord,
      { source: "part_library", bucket: "other" } as unknown as JMPartSeedRecord,
      {} as JMPartSeedRecord,
      SAMPLE[0],
    ]);
    expect(r.skipped_invalid).toBe(3);
    expect(r.parts_created).toBe(1);

    expect(partsLibraryEngine.seedFromJMCorpus(null as any)).toEqual({
      total_records: 0, parts_created: 0, revisions_added: 0, skipped_existing: 0,
      skipped_out_of_scope: 0, skipped_invalid: 0, distinct_customers: 0, part_ids: [],
    });
  });

  it("ACCOUNTABILITY INVARIANT: counters partition every row of a mixed batch (zero silent drops)", () => {
    const batch: JMPartSeedRecord[] = [
      { path: `${ROOT}/ITW/WIDGET/part.json`, source: "part_library", bucket: "other", customer: "ITW" }, // created
      { path: `${ROOT}/ITW/WIDGET/R3/part.json`, source: "part_library", bucket: "other", customer: "ITW" }, // revision_added
      { path: `${ROOT}/ITW/WIDGET/part.json`, source: "part_library", bucket: "other", customer: "ITW" }, // skipped_existing (dup of #1)
      NON_STRUCTURAL,                                                                                       // out_of_scope
      { path: "", source: "part_library", bucket: "other" } as JMPartSeedRecord,                            // invalid
    ];
    const r = partsLibraryEngine.seedFromJMCorpus(batch);
    const partitionSum =
      r.parts_created + r.revisions_added + r.skipped_existing + r.skipped_out_of_scope + r.skipped_invalid;
    expect(partitionSum).toBe(r.total_records);
    expect(r.parts_created).toBe(1);
    expect(r.revisions_added).toBe(1);
    expect(r.skipped_existing).toBe(1);
    expect(r.skipped_out_of_scope).toBe(1);
    expect(r.skipped_invalid).toBe(1);
  });
});

describe("partsLibraryDispatcher → part_seed_jm_corpus (wiring round-trip)", () => {
  let handler: ((args: { action: string; params?: Record<string, any> }) => Promise<any>) | null = null;

  beforeAll(() => {
    const fakeServer = {
      tool: (_name: string, _desc: string, _schema: any, fn: (a: any) => Promise<any>) => {
        if (_name === "prism_parts") handler = fn;
      },
    };
    registerPartsLibraryDispatcher(fakeServer as any);
    if (!handler) throw new Error("partsLibraryDispatcher did not register prism_parts");
  });

  beforeEach(reset);

  async function call(action: string, params: Record<string, any> = {}): Promise<any> {
    const r = await handler!({ action, params });
    return JSON.parse(r.content[0].text);
  }

  it("seeds via params.records and the parts show up in part_stats", async () => {
    const seed = await call("part_seed_jm_corpus", { records: SAMPLE });
    expect(seed.success).toBe(true);
    expect(seed.data.parts_created).toBe(3);
    expect(seed.data.distinct_customers).toBe(3);

    const stats = await call("part_stats", {});
    expect(stats.success).toBe(true);
    expect(stats.data.total_parts).toBe(3);
    expect(stats.data.active_parts).toBe(3);
  });

  it("rejects out-of-scope records through the dispatcher too", async () => {
    const seed = await call("part_seed_jm_corpus", { records: [NON_STRUCTURAL] });
    expect(seed.success).toBe(true);
    expect(seed.data.parts_created).toBe(0);
    expect(seed.data.skipped_out_of_scope).toBe(1);
    const stats = await call("part_stats", {});
    expect(stats.data.total_parts).toBe(0);
  });
});

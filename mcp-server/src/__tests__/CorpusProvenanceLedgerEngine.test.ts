/**
 * CorpusProvenanceLedgerEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-A09
 *
 * Verifies the ledger's invariants against real-data discipline:
 *   - synthetic = true MUST be rejected
 *   - sha256 must be 64-hex
 *   - hash collision with different sourceUrl MUST be refused
 *   - reconcile() flags unledgered + orphaned entries
 *   - aggregate() backfills zero columns for stable dashboards
 *
 * Per feedback_engine_tests_in_tests_dir: this lives in src/__tests__/,
 * NOT src/engines/__tests__/ — only the former is scanned by the unwired-
 * assets Stop hook.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  CorpusProvenanceLedgerEngine,
  REPUTABLE_ARCHIVES,
  KNOWN_LICENSES,
  type ProvenanceRecord,
} from "../engines/CorpusProvenanceLedgerEngine.js";

const VALID_SHA = "a".repeat(64);
const VALID_SHA_2 = "b".repeat(64);
const VALID_SHA_3 = "c".repeat(64);

function makeRecord(overrides: Partial<ProvenanceRecord> = {}): ProvenanceRecord {
  return {
    sha256: VALID_SHA,
    sourceUrl: "https://deep-geometry.github.io/abc-dataset/abc_0000_step.7z/00000001.stp",
    archive: "ABC_DATASET",
    license: "CC_BY_4_0",
    ext: ".stp",
    bytes: 4096,
    acquiredAt: "2026-05-25T20:00:00Z",
    synthetic: false,
    ...overrides,
  };
}

describe("CorpusProvenanceLedgerEngine", () => {
  let engine: CorpusProvenanceLedgerEngine;

  beforeEach(() => {
    engine = new CorpusProvenanceLedgerEngine();
  });

  describe("constants", () => {
    it("REPUTABLE_ARCHIVES includes JM_DIE + ABC_DATASET + Fusion 360 + 5 others", () => {
      expect(REPUTABLE_ARCHIVES).toContain("JM_DIE");
      expect(REPUTABLE_ARCHIVES).toContain("ABC_DATASET");
      expect(REPUTABLE_ARCHIVES).toContain("FUSION_360_GALLERY");
      expect(REPUTABLE_ARCHIVES.length).toBeGreaterThanOrEqual(8);
    });

    it("KNOWN_LICENSES covers JM internal + CC-BY + Autodesk research + NIST", () => {
      expect(KNOWN_LICENSES).toContain("JM_DIE_INTERNAL_USE_ONLY");
      expect(KNOWN_LICENSES).toContain("CC_BY_4_0");
      expect(KNOWN_LICENSES).toContain("AUTODESK_RESEARCH");
      expect(KNOWN_LICENSES).toContain("NIST_PUBLIC");
    });
  });

  describe("checkRecord — schema validation", () => {
    it("accepts a valid real-data record", () => {
      expect(engine.checkRecord(makeRecord()).valid).toBe(true);
    });

    it("rejects sha256 that is not 64-hex (too short)", () => {
      const bad = engine.checkRecord(makeRecord({ sha256: "abc123" }));
      expect(bad.valid).toBe(false);
      expect(bad.issues.join(" ")).toMatch(/sha256/i);
    });

    it("rejects sha256 with non-hex characters", () => {
      const bad = engine.checkRecord(makeRecord({ sha256: "Z".repeat(64) }));
      expect(bad.valid).toBe(false);
    });

    it("rejects archive not on the reputable allowlist", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bad = engine.checkRecord(makeRecord({ archive: "RANDOM_PIRATE_SITE" as any }));
      expect(bad.valid).toBe(false);
    });

    it("rejects license outside the known set", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bad = engine.checkRecord(makeRecord({ license: "WTFPL" as any }));
      expect(bad.valid).toBe(false);
    });

    it("rejects missing sourceUrl", () => {
      const bad = engine.checkRecord(makeRecord({ sourceUrl: "" }));
      expect(bad.valid).toBe(false);
    });

    it("rejects negative bytes", () => {
      const bad = engine.checkRecord(makeRecord({ bytes: -1 }));
      expect(bad.valid).toBe(false);
    });

    it("HARD-REJECTS synthetic=true (operator constraint 2026-05-25)", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bad = engine.checkRecord(makeRecord({ synthetic: true as any }));
      expect(bad.valid).toBe(false);
      expect(bad.issues.join(" ")).toMatch(/synthetic/i);
    });

    it("rejects non-object input gracefully", () => {
      expect(engine.checkRecord(null).valid).toBe(false);
      expect(engine.checkRecord(42).valid).toBe(false);
      expect(engine.checkRecord("string").valid).toBe(false);
    });
  });

  describe("register — admission control", () => {
    it("admits a clean record", () => {
      const r = engine.register(makeRecord());
      expect(r.ok).toBe(true);
    });

    it("refuses synthetic records", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = engine.register(makeRecord({ synthetic: true as any }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/validation/);
    });

    it("idempotent on exact-same record (same hash + same sourceUrl)", () => {
      const rec = makeRecord();
      const r1 = engine.register(rec);
      const r2 = engine.register(rec);
      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);
      expect(engine.exportLedger()).toHaveLength(1);
    });

    it("REFUSES hash collision with different sourceUrl (corpus integrity)", () => {
      engine.register(makeRecord({ sha256: VALID_SHA, sourceUrl: "https://a.example/x.stp" }));
      const r = engine.register(makeRecord({ sha256: VALID_SHA, sourceUrl: "https://b.example/x.stp" }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/hash collision/);
    });

    it("stores distinct hashes independently", () => {
      engine.register(makeRecord({ sha256: VALID_SHA }));
      engine.register(makeRecord({ sha256: VALID_SHA_2 }));
      engine.register(makeRecord({ sha256: VALID_SHA_3 }));
      expect(engine.exportLedger()).toHaveLength(3);
    });
  });

  describe("lookup", () => {
    it("returns null for missing hash", () => {
      expect(engine.lookup(VALID_SHA)).toBeNull();
    });

    it("returns the registered record", () => {
      const rec = makeRecord();
      engine.register(rec);
      const looked = engine.lookup(VALID_SHA);
      expect(looked).not.toBeNull();
      expect(looked?.sourceUrl).toBe(rec.sourceUrl);
    });
  });

  describe("reconcile", () => {
    beforeEach(() => {
      engine.register(makeRecord({ sha256: VALID_SHA }));
      engine.register(makeRecord({ sha256: VALID_SHA_2 }));
    });

    it("flags fullyTraced=true when every catalog hash has a ledger record", () => {
      const result = engine.reconcile([VALID_SHA, VALID_SHA_2]);
      expect(result.fullyTraced).toBe(true);
      expect(result.unledgered).toHaveLength(0);
    });

    it("flags unledgered when a catalog hash has no ledger entry", () => {
      const result = engine.reconcile([VALID_SHA, VALID_SHA_3]);
      expect(result.fullyTraced).toBe(false);
      expect(result.unledgered).toContain(VALID_SHA_3);
    });

    it("flags orphanedLedgered when ledger has records not in the catalog", () => {
      const result = engine.reconcile([VALID_SHA]);
      expect(result.orphanedLedgered).toContain(VALID_SHA_2);
    });

    it("reports total ledgered count regardless of catalog", () => {
      const result = engine.reconcile([]);
      expect(result.ledgered).toBe(2);
      expect(result.fullyTraced).toBe(true); // empty catalog trivially fully-traced
    });
  });

  describe("aggregate", () => {
    it("returns zero-backfilled rows for known archives/licenses on empty ledger", () => {
      const agg = engine.aggregate();
      expect(agg.total).toBe(0);
      for (const a of REPUTABLE_ARCHIVES) expect(agg.byArchive[a]).toBe(0);
      for (const l of KNOWN_LICENSES) expect(agg.byLicense[l]).toBe(0);
    });

    it("counts by archive / license / extension", () => {
      engine.register(makeRecord({
        sha256: VALID_SHA, archive: "ABC_DATASET", license: "CC_BY_4_0", ext: ".stp", bytes: 1000,
      }));
      engine.register(makeRecord({
        sha256: VALID_SHA_2, archive: "JM_DIE", license: "JM_DIE_INTERNAL_USE_ONLY", ext: ".ipt", bytes: 2000,
      }));
      engine.register(makeRecord({
        sha256: VALID_SHA_3, archive: "ABC_DATASET", license: "CC_BY_4_0", ext: ".step", bytes: 3000,
      }));
      const agg = engine.aggregate();
      expect(agg.total).toBe(3);
      expect(agg.byArchive["ABC_DATASET"]).toBe(2);
      expect(agg.byArchive["JM_DIE"]).toBe(1);
      expect(agg.byLicense["CC_BY_4_0"]).toBe(2);
      expect(agg.byExtension[".stp"]).toBe(1);
      expect(agg.byExtension[".ipt"]).toBe(1);
      expect(agg.totalBytes).toBe(6000);
    });

    it("tracks restricted count separately", () => {
      engine.register(makeRecord({ sha256: VALID_SHA, restricted: true }));
      engine.register(makeRecord({ sha256: VALID_SHA_2, restricted: false }));
      engine.register(makeRecord({ sha256: VALID_SHA_3 })); // omitted = falsy
      expect(engine.aggregate().restrictedCount).toBe(1);
    });
  });

  describe("exportLedger", () => {
    it("returns sha256-sorted records (deterministic)", () => {
      engine.register(makeRecord({ sha256: VALID_SHA_3 }));
      engine.register(makeRecord({ sha256: VALID_SHA }));
      engine.register(makeRecord({ sha256: VALID_SHA_2 }));
      const out = engine.exportLedger();
      expect(out[0].sha256).toBe(VALID_SHA);
      expect(out[1].sha256).toBe(VALID_SHA_2);
      expect(out[2].sha256).toBe(VALID_SHA_3);
    });
  });

  describe("bulkLoad", () => {
    it("loads valid records and rejects invalid ones with indexes", () => {
      const result = engine.bulkLoad([
        makeRecord({ sha256: VALID_SHA }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        makeRecord({ sha256: VALID_SHA_2, synthetic: true as any }),
        makeRecord({ sha256: VALID_SHA_3 }),
      ]);
      expect(result.loaded).toBe(2);
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0].index).toBe(1);
    });
  });

  describe("reset", () => {
    it("clears all registered records", () => {
      engine.register(makeRecord({ sha256: VALID_SHA }));
      engine.register(makeRecord({ sha256: VALID_SHA_2 }));
      expect(engine.exportLedger()).toHaveLength(2);
      engine.reset();
      expect(engine.exportLedger()).toHaveLength(0);
    });
  });

  describe("engine metadata", () => {
    it("exposes capabilities covering register/lookup/reconcile/aggregate/export", () => {
      const caps = engine.getCapabilities();
      const names = caps.map((c) => c.name);
      expect(names).toContain("register");
      expect(names).toContain("lookup");
      expect(names).toContain("reconcile");
      expect(names).toContain("aggregate");
      expect(names).toContain("export");
    });

    it("validates input shape (rejects non-object)", () => {
      expect(engine.validate(null)).toMatch(/object/);
      expect(engine.validate(42)).toMatch(/object/);
      expect(engine.validate({})).toBeNull();
    });
  });

  describe("real-data discipline — operator constraint 2026-05-25", () => {
    it("a corpus that admits 1000 records, 0 synthetic, fullyTraced = production-ready", () => {
      const records: ProvenanceRecord[] = [];
      for (let i = 0; i < 1000; i++) {
        const sha = (i.toString(16).padStart(64, "0"));
        records.push(makeRecord({
          sha256: sha,
          sourceUrl: `https://deep-geometry.github.io/abc-dataset/seg_${i}.stp`,
          ext: ".stp",
        }));
      }
      const result = engine.bulkLoad(records);
      expect(result.loaded).toBe(1000);
      expect(result.rejected).toHaveLength(0);
      const catalog = records.map((r) => r.sha256);
      const recon = engine.reconcile(catalog);
      expect(recon.fullyTraced).toBe(true);
      expect(recon.ledgered).toBe(1000);
    });

    it("a single synthetic record poisoning the bulk-load is isolated", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = engine.bulkLoad([
        makeRecord({ sha256: VALID_SHA }),
        makeRecord({ sha256: VALID_SHA_2, synthetic: true as any }),
      ]);
      expect(result.loaded).toBe(1);
      expect(result.rejected).toHaveLength(1);
      // Ledger size confirms isolation — synthetic record did NOT land.
      expect(engine.exportLedger()).toHaveLength(1);
    });
  });
});

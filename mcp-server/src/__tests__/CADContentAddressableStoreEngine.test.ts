/**
 * CADContentAddressableStoreEngine.test.ts — U-FS-01 (PHASE-47)
 *
 * Verifies:
 *   - Full-file SHA-256 hashing (NOT first-4KB like the superseded U-CADC02)
 *   - BLAKE3 (SHA-256 stand-in) chunk manifest for files ≥ 4 MB
 *   - Deduplication of identical content across different paths
 *   - Integrity verification (re-hash → match/mismatch)
 *   - Tenant visibility + customer attribution
 *   - Persist/load round-trip via injected FS stub
 *   - Meta aggregate rebuild
 *   - GDPR right-to-delete
 *   - Schema validation rejects malformed inputs
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CADContentAddressableStoreEngine,
  CHUNK_SIZE_BYTES,
  computeSHA256,
  computeChunks,
  type CASFs,
} from "../engines/CADContentAddressableStoreEngine.js";

// ── Stub FS ──────────────────────────────────────────────────────────────────

function makeStubFS(): CASFs & { writes: Record<string, string>; dirs: Set<string> } {
  const writes: Record<string, string> = {};
  const dirs = new Set<string>();
  return {
    existsSync: (p: string) => p in writes || dirs.has(p),
    readFileSync: (p: string) => writes[p] ?? "",
    writeFileSync: (p: string, d: string) => {
      writes[p] = d;
    },
    mkdirSync: (p: string, _o) => {
      dirs.add(p);
    },
    statSync: (p: string) => ({ size: (writes[p] ?? "").length }),
    writes,
    dirs,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buf(text: string): Buffer {
  return Buffer.from(text, "utf8");
}

function makeBigBuffer(sizeBytes: number, fillByte: number = 0x41): Buffer {
  return Buffer.alloc(sizeBytes, fillByte);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("CADContentAddressableStoreEngine (U-FS-01)", () => {
  let engine: CADContentAddressableStoreEngine;
  let fs: ReturnType<typeof makeStubFS>;

  beforeEach(() => {
    engine = new CADContentAddressableStoreEngine("H:/stub/registry.json");
    fs = makeStubFS();
  });

  describe("SHA-256 full-file hashing (NOT 4KB prefix)", () => {
    it("computes full-file SHA-256 over content, not first 4KB", () => {
      // Craft two buffers that share the first 4KB but differ beyond —
      // superseded U-CADC02 would produce the same hash; U-FS-01 must not.
      const prefix = Buffer.alloc(4096, 0x41);
      const a = Buffer.concat([prefix, Buffer.from("alpha")]);
      const b = Buffer.concat([prefix, Buffer.from("beta-differs-longer")]);
      const ha = computeSHA256(a);
      const hb = computeSHA256(b);
      expect(ha).not.toBe(hb);
      expect(ha).toMatch(/^[0-9a-f]{64}$/);
      expect(hb).toMatch(/^[0-9a-f]{64}$/);
    });

    it("produces a deterministic SHA-256 for fixed content", () => {
      const content = buf("The quick brown fox jumps over the lazy dog");
      // Known SHA-256 for this exact input (canonical)
      const expected =
        "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592";
      expect(computeSHA256(content)).toBe(expected);
    });

    it("handles empty content without throwing", () => {
      const empty = Buffer.alloc(0);
      const hash = computeSHA256(empty);
      // Known SHA-256 for empty buffer
      expect(hash).toBe(
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      );
    });
  });

  describe("BLAKE3 chunk manifest (≥ 4 MB threshold)", () => {
    it("omits chunk manifest for files smaller than CHUNK_SIZE", () => {
      const entry = engine.ingest("/p/small.step", buf("tiny"), {
        source: "initial_scan",
      });
      expect(entry.chunks).toBeUndefined();
    });

    it("produces chunks at 4 MB boundaries for large files", () => {
      const big = makeBigBuffer(CHUNK_SIZE_BYTES * 2 + 1000);
      const chunks = computeChunks(big);
      expect(chunks.length).toBe(3);
      expect(chunks[0].offset).toBe(0);
      expect(chunks[0].size).toBe(CHUNK_SIZE_BYTES);
      expect(chunks[1].offset).toBe(CHUNK_SIZE_BYTES);
      expect(chunks[2].offset).toBe(CHUNK_SIZE_BYTES * 2);
      expect(chunks[2].size).toBe(1000);
      for (const c of chunks) {
        expect(c.blake3).toMatch(/^[0-9a-f]{64}$/);
      }
    });

    it("attaches chunk manifest to entry when ingesting large files", () => {
      const big = makeBigBuffer(CHUNK_SIZE_BYTES + 500);
      const entry = engine.ingest("/p/big.ipt", big, {
        source: "initial_scan",
      });
      expect(entry.chunks).toBeDefined();
      expect(entry.chunks!.length).toBe(2);
      expect(entry.sizeBytes).toBe(CHUNK_SIZE_BYTES + 500);
    });
  });

  describe("Deduplication — same content, multiple paths", () => {
    it("appends new path to existing entry instead of duplicating", () => {
      const content = buf("identical content");
      const e1 = engine.ingest("/customerA/part.step", content, {
        source: "initial_scan",
        customer: "CustA",
      });
      const e2 = engine.ingest("/customerB/copy.step", content, {
        source: "customer_upload",
        customer: "CustB", // Upsert keeps original customer — dedup tracks path list
      });
      expect(engine.size).toBe(1);
      expect(e1.contentHash).toBe(e2.contentHash);
      expect(e2.paths.length).toBe(2);
      expect(e2.paths).toContain("/customerA/part.step");
      expect(e2.paths).toContain("/customerB/copy.step");
    });

    it("does not duplicate paths on repeated ingest from same location", () => {
      const content = buf("same path twice");
      engine.ingest("/p/a.step", content, { source: "initial_scan" });
      engine.ingest("/p/a.step", content, { source: "initial_scan" });
      const entry = engine.getByPath("/p/a.step");
      expect(entry).toBeDefined();
      expect(entry!.paths.length).toBe(1);
    });

    it("merges tags during dedup upsert", () => {
      const content = buf("tag merge test");
      engine.ingest("/p1.step", content, {
        source: "initial_scan",
        tags: ["alpha", "beta"],
      });
      engine.ingest("/p2.step", content, {
        source: "initial_scan",
        tags: ["beta", "gamma"],
      });
      const entry = engine.getByPath("/p2.step")!;
      expect(entry.tags).toContain("alpha");
      expect(entry.tags).toContain("beta");
      expect(entry.tags).toContain("gamma");
      expect(entry.tags.length).toBe(3);
    });
  });

  describe("Integrity verification", () => {
    it("returns ok=true when content matches stored hash", () => {
      const content = buf("stable content");
      const entry = engine.ingest("/p.step", content, {
        source: "initial_scan",
      });
      const result = engine.verifyIntegrity(entry.contentHash, content);
      expect(result.ok).toBe(true);
      expect(result.actual).toBe(result.expected);
    });

    it("returns ok=false when content has drifted (corruption)", () => {
      const original = buf("pristine");
      const entry = engine.ingest("/p.step", original, {
        source: "initial_scan",
      });
      const corrupted = buf("corrupted");
      const result = engine.verifyIntegrity(entry.contentHash, corrupted);
      expect(result.ok).toBe(false);
      expect(result.actual).not.toBe(result.expected);
    });

    it("updates integrityLastVerifiedAt on successful verification", () => {
      const content = buf("verify timestamp");
      const entry = engine.ingest("/p.step", content, {
        source: "initial_scan",
      });
      expect(entry.integrityLastVerifiedAt).toBeUndefined();
      engine.verifyIntegrity(entry.contentHash, content);
      const after = engine.get(entry.contentHash);
      expect(after!.integrityLastVerifiedAt).toBeDefined();
    });

    it("returns ok=false for unknown hash", () => {
      const bogusHash = "0".repeat(64);
      const result = engine.verifyIntegrity(bogusHash, buf("anything"));
      expect(result.ok).toBe(false);
    });
  });

  describe("Persist / load round-trip", () => {
    it("persists and reloads registry via injected FS", () => {
      engine.ingest("/p1.step", buf("file-one"), {
        source: "initial_scan",
        customer: "ALCOA",
      });
      engine.ingest("/p2.ipt", buf("file-two"), {
        source: "customer_upload",
        customer: "ITW",
      });
      engine.persist(fs);

      const fresh = new CADContentAddressableStoreEngine("H:/stub/registry.json");
      fresh.load(fs);
      expect(fresh.size).toBe(2);
      expect(fresh.snapshot.meta.byCustomer.ALCOA).toBe(1);
      expect(fresh.snapshot.meta.byCustomer.ITW).toBe(1);
    });

    it("creates parent directory when missing", () => {
      engine.ingest("/p.step", buf("create dir"), { source: "initial_scan" });
      engine.persist(fs);
      // Parent dir of H:/stub/registry.json is H:/stub
      expect(fs.dirs.has("H:/stub")).toBe(true);
    });

    it("initializes empty registry on load when file missing", () => {
      engine.load(fs);
      expect(engine.size).toBe(0);
      expect(engine.snapshot.meta.schemaVersion).toBe(1);
    });
  });

  describe("Meta rebuild", () => {
    it("recomputes totalEntries + totalPaths + duplicateContentCount", () => {
      const c1 = buf("dup content");
      engine.ingest("/a.step", c1, { source: "initial_scan" });
      engine.ingest("/b.step", c1, { source: "initial_scan" }); // dup
      engine.ingest("/c.ipt", buf("unique"), { source: "initial_scan" });
      engine.rebuildMeta();
      const m = engine.snapshot.meta;
      expect(m.totalEntries).toBe(2);
      expect(m.totalPaths).toBe(3);
      expect(m.duplicateContentCount).toBe(1);
    });

    it("aggregates byFormat correctly", () => {
      engine.ingest("/a.step", buf("a"), { source: "initial_scan" });
      engine.ingest("/b.step", buf("b"), { source: "initial_scan" });
      engine.ingest("/c.ipt", buf("c"), { source: "initial_scan" });
      engine.rebuildMeta();
      expect(engine.snapshot.meta.byFormat[".step"]).toBe(2);
      expect(engine.snapshot.meta.byFormat[".ipt"]).toBe(1);
    });

    it("tallies visibility buckets", () => {
      engine.ingest("/a.step", buf("a"), {
        source: "initial_scan",
        visibility: "private",
      });
      engine.ingest("/b.step", buf("b"), {
        source: "initial_scan",
        visibility: "shared",
      });
      engine.ingest("/c.ipt", buf("c"), {
        source: "initial_scan",
        visibility: "public",
      });
      engine.rebuildMeta();
      expect(engine.snapshot.meta.byVisibility.private).toBe(1);
      expect(engine.snapshot.meta.byVisibility.shared).toBe(1);
      expect(engine.snapshot.meta.byVisibility.public).toBe(1);
    });
  });

  describe("GDPR delete + lookup", () => {
    it("deletes an entry by contentHash", () => {
      const entry = engine.ingest("/gdpr.step", buf("to delete"), {
        source: "customer_upload",
      });
      expect(engine.size).toBe(1);
      const ok = engine.delete(entry.contentHash);
      expect(ok).toBe(true);
      expect(engine.size).toBe(0);
    });

    it("returns false when deleting non-existent hash", () => {
      const ok = engine.delete("0".repeat(64));
      expect(ok).toBe(false);
    });

    it("get() returns undefined for unknown hash", () => {
      expect(engine.get("0".repeat(64))).toBeUndefined();
    });

    it("getByPath() returns undefined for unknown path", () => {
      expect(engine.getByPath("/does/not/exist.step")).toBeUndefined();
    });
  });

  describe("Schema enforcement", () => {
    it("rejects non-hex contentHash in upsert", () => {
      expect(() =>
        engine.upsert({
          contentHash: "not-valid-hex",
          absolutePath: "/p.step",
          format: ".step",
          sizeBytes: 10,
          source: "initial_scan",
          customer: "X",
          visibility: "private",
          tags: [],
        }),
      ).toThrow();
    });

    it("uppercases customer names on ingest", () => {
      const entry = engine.ingest("/p.step", buf("x"), {
        source: "initial_scan",
        customer: "alcoa",
      });
      expect(entry.customer).toBe("ALCOA");
    });

    it("lowercases format extension on ingest", () => {
      const entry = engine.ingest("/p.STEP", buf("x"), {
        source: "initial_scan",
      });
      expect(entry.format).toBe(".step");
    });
  });
});

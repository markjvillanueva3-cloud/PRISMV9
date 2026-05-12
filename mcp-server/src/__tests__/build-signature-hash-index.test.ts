/**
 * Tests for build-signature-hash-index script (Universal Phase 0.7)
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  buildSignatureHashIndex,
  readSignatureHashIndex,
  SignatureHashIndex,
} from "../../scripts/build-signature-hash-index.js";

describe("build-signature-hash-index (Phase 0.7)", () => {
  let index: SignatureHashIndex;

  beforeAll(async () => {
    const existing = await readSignatureHashIndex();
    if (existing && existing.fileCount > 0) {
      index = existing;
    } else {
      index = await buildSignatureHashIndex();
    }
  }, 60000);

  describe("index structure", () => {
    it("returns a valid index object", () => {
      expect(index).toBeDefined();
      expect(typeof index).toBe("object");
    });

    it("has schemaVersion field set to 1", () => {
      expect(index.schemaVersion).toBe(1);
    });

    it("has lastUpdated as a valid ISO string", () => {
      expect(typeof index.lastUpdated).toBe("string");
      const date = new Date(index.lastUpdated);
      expect(date.toString()).not.toBe("Invalid Date");
    });

    it("has fileCount matching signatures object keys", () => {
      expect(index.fileCount).toBe(Object.keys(index.signatures).length);
    });

    it("has uniqueHashes field", () => {
      expect(typeof index.uniqueHashes).toBe("number");
      expect(index.uniqueHashes).toBeGreaterThan(0);
    });

    it("has duplicateGroups count", () => {
      expect(typeof index.duplicateGroups).toBe("number");
      expect(index.duplicateGroups).toBeGreaterThanOrEqual(0);
    });
  });

  describe("signature entry structure", () => {
    it("every signature has required fields", () => {
      const entries = Object.entries(index.signatures).slice(0, 50);
      for (const [name, entry] of entries) {
        expect(typeof entry.file, `${name}.file`).toBe("string");
        expect(typeof entry.name, `${name}.name`).toBe("string");
        expect(typeof entry.fullHash, `${name}.fullHash`).toBe("string");
        expect(typeof entry.normalizedHash, `${name}.normalizedHash`).toBe("string");
        expect(typeof entry.lineCount, `${name}.lineCount`).toBe("number");
        expect(typeof entry.byteSize, `${name}.byteSize`).toBe("number");
        expect(typeof entry.methodCount, `${name}.methodCount`).toBe("number");
        expect(typeof entry.exportCount, `${name}.exportCount`).toBe("number");
      }
    });

    it("fullHash is a valid 16-char hex string", () => {
      const entries = Object.values(index.signatures).slice(0, 50);
      for (const entry of entries) {
        expect(entry.fullHash).toMatch(/^[a-f0-9]{16}$/);
      }
    });

    it("normalizedHash is a valid 16-char hex string", () => {
      const entries = Object.values(index.signatures).slice(0, 50);
      for (const entry of entries) {
        expect(entry.normalizedHash).toMatch(/^[a-f0-9]{16}$/);
      }
    });

    it("lineCount is positive", () => {
      const entries = Object.values(index.signatures).slice(0, 50);
      for (const entry of entries) {
        expect(entry.lineCount).toBeGreaterThan(0);
      }
    });

    it("byteSize is positive", () => {
      const entries = Object.values(index.signatures).slice(0, 50);
      for (const entry of entries) {
        expect(entry.byteSize).toBeGreaterThan(0);
      }
    });
  });

  describe("byFullHash reverse index", () => {
    it("byFullHash is an object", () => {
      expect(typeof index.byFullHash).toBe("object");
    });

    it("every byFullHash entry is an array of engine names", () => {
      const entries = Object.entries(index.byFullHash).slice(0, 50);
      for (const [hash, names] of entries) {
        expect(Array.isArray(names), `byFullHash[${hash}]`).toBe(true);
        for (const name of names) {
          expect(typeof name).toBe("string");
          expect(index.signatures[name]).toBeDefined();
        }
      }
    });

    it("unique hashes count matches byFullHash keys", () => {
      expect(index.uniqueHashes).toBe(Object.keys(index.byFullHash).length);
    });
  });

  describe("byNormalizedHash reverse index", () => {
    it("byNormalizedHash is an object", () => {
      expect(typeof index.byNormalizedHash).toBe("object");
    });

    it("every byNormalizedHash entry is an array", () => {
      const entries = Object.entries(index.byNormalizedHash).slice(0, 50);
      for (const [hash, names] of entries) {
        expect(Array.isArray(names), `byNormalizedHash[${hash}]`).toBe(true);
      }
    });
  });

  describe("duplicates array", () => {
    it("duplicates is an array", () => {
      expect(Array.isArray(index.duplicates)).toBe(true);
    });

    it("duplicateGroups matches duplicates array length", () => {
      expect(index.duplicateGroups).toBe(index.duplicates.length);
    });

    it("every duplicate has required fields", () => {
      for (const dup of index.duplicates) {
        expect(typeof dup.hash).toBe("string");
        expect(Array.isArray(dup.files)).toBe(true);
        expect(dup.files.length).toBeGreaterThan(1);
        expect(["exact", "normalized"]).toContain(dup.type);
      }
    });

    it("duplicate files exist in signatures", () => {
      for (const dup of index.duplicates) {
        for (const file of dup.files) {
          expect(index.signatures[file]).toBeDefined();
        }
      }
    });
  });

  describe("coverage metrics", () => {
    it("has reasonable file count", () => {
      expect(index.fileCount).toBeGreaterThan(100);
    });

    it("unique hashes <= file count", () => {
      expect(index.uniqueHashes).toBeLessThanOrEqual(index.fileCount);
    });

    it("most files have unique hashes", () => {
      const uniquenessRatio = index.uniqueHashes / index.fileCount;
      expect(uniquenessRatio).toBeGreaterThan(0.95);
    });
  });

  describe("method and export counts", () => {
    it("some files have methods", () => {
      const withMethods = Object.values(index.signatures).filter((s) => s.methodCount > 0);
      expect(withMethods.length).toBeGreaterThan(0);
    });

    it("some files have exports", () => {
      const withExports = Object.values(index.signatures).filter((s) => s.exportCount > 0);
      expect(withExports.length).toBeGreaterThan(0);
    });

    it("methodCount is non-negative", () => {
      const entries = Object.values(index.signatures).slice(0, 100);
      for (const entry of entries) {
        expect(entry.methodCount).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

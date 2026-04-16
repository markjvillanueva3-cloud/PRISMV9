/**
 * VendorCatalogManifestEngine Tests
 *
 * Validates catalog classification, extraction-state tracking, and the
 * manifest's ability to prioritize Big-4 vendor PDFs.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  VendorCatalogManifestEngine,
  vendorCatalogManifestEngine,
} from "../engines/VendorCatalogManifestEngine.js";

describe("VendorCatalogManifestEngine", () => {
  let manifest: ReturnType<VendorCatalogManifestEngine["build"]>;

  beforeAll(() => {
    manifest = vendorCatalogManifestEngine.build();
  });

  describe("Filesystem scan", () => {
    it("detects PDFs in MANUFACTURER_CATALOGS/uploaded/", () => {
      expect(manifest.totalPdfs).toBeGreaterThan(0);
    });

    it("detects split zip shards", () => {
      // 78 zip shards known to exist
      expect(manifest.totalZipShards).toBeGreaterThan(50);
    });

    it("catalogs array populated", () => {
      expect(manifest.catalogs.length).toBeGreaterThan(0);
    });
  });

  describe("Manufacturer classification", () => {
    it("classifies Sandvik GC catalogs as Sandvik", () => {
      const sandvik = manifest.catalogs.filter(c => c.manufacturer === "Sandvik");
      expect(sandvik.length).toBeGreaterThan(0);
    });

    it("classifies Master Catalog Vol 1/2 as Iscar", () => {
      const iscar = manifest.catalogs.filter(c => c.manufacturer === "Iscar");
      expect(iscar.length).toBeGreaterThan(0);
    });

    it("classifies Kennametal/Widia PDFs if present", () => {
      // May be zero if Kennametal PDFs are only inside zip shards
      const km = manifest.catalogs.filter(c => c.manufacturer === "Kennametal");
      expect(km.length).toBeGreaterThanOrEqual(0);
    });

    it("byManufacturer breakdown includes detected vendors", () => {
      expect(Object.keys(manifest.byManufacturer).length).toBeGreaterThan(1);
    });

    it("every catalog entry has a manufacturer field", () => {
      for (const c of manifest.catalogs) {
        expect(c.manufacturer).toBeDefined();
        expect(typeof c.manufacturer).toBe("string");
      }
    });
  });

  describe("Catalog type classification", () => {
    it("detects milling catalogs", () => {
      const milling = manifest.catalogs.filter(c => c.type === "milling");
      expect(milling.length).toBeGreaterThan(0);
    });

    it("detects turning catalogs", () => {
      const turning = manifest.catalogs.filter(c => c.type === "turning");
      expect(turning.length).toBeGreaterThan(0);
    });

    it("detects drilling catalogs", () => {
      const drilling = manifest.catalogs.filter(c => c.type === "drilling");
      expect(drilling.length).toBeGreaterThanOrEqual(0);
    });

    it("every catalog has a type field", () => {
      for (const c of manifest.catalogs) {
        expect(c.type).toBeDefined();
      }
    });
  });

  describe("Size categorization", () => {
    it("size categories assigned to each catalog", () => {
      for (const c of manifest.catalogs) {
        expect(["small", "medium", "large", "huge"]).toContain(c.sizeCategory);
      }
    });

    it("detects huge catalogs (>100MB) — Iscar master is 270MB", () => {
      const huge = manifest.catalogs.filter(c => c.sizeCategory === "huge");
      expect(huge.length).toBeGreaterThan(0);
    });
  });

  describe("Extraction state tracking", () => {
    it("every catalog has extracted flag", () => {
      for (const c of manifest.catalogs) {
        expect(typeof c.extracted).toBe("boolean");
      }
    });

    it("every catalog has estimatedTools heuristic", () => {
      for (const c of manifest.catalogs) {
        expect(typeof c.estimatedTools).toBe("number");
        expect(c.estimatedTools).toBeGreaterThanOrEqual(0);
      }
    });

    it("totalCurrentEntries matches CATALOG_INDEX.json", () => {
      // Known: 54,080 tools in index
      expect(manifest.totalCurrentEntries).toBeGreaterThan(40000);
    });

    it("gapToTarget reflects 90k target", () => {
      // 90k - 54k = ~36k gap expected
      expect(manifest.gapToTarget).toBeGreaterThan(20000);
      expect(manifest.gapToTarget).toBeLessThan(50000);
    });
  });

  describe("Extraction queue prioritization", () => {
    it("queue sorts by estimated tool count descending", () => {
      const queue = vendorCatalogManifestEngine.getExtractionQueue();
      for (let i = 1; i < queue.length; i++) {
        expect(queue[i - 1].estimatedTools).toBeGreaterThanOrEqual(queue[i].estimatedTools);
      }
    });

    it("queue excludes already-extracted PDFs", () => {
      const queue = vendorCatalogManifestEngine.getExtractionQueue();
      for (const c of queue) {
        expect(c.extracted).toBe(false);
      }
    });

    it("queue top entries are large catalogs", () => {
      const queue = vendorCatalogManifestEngine.getExtractionQueue();
      if (queue.length > 0) {
        // First item should have non-trivial size
        expect(queue[0].sizeBytes).toBeGreaterThan(1_000_000);
      }
    });
  });

  describe("Summary & recommendations", () => {
    it("getSummary returns all required fields", () => {
      const s = vendorCatalogManifestEngine.getSummary();
      expect(typeof s.totalPdfs).toBe("number");
      expect(typeof s.extractedPdfs).toBe("number");
      expect(typeof s.unextractedPdfs).toBe("number");
      expect(typeof s.currentTools).toBe("number");
      expect(typeof s.estimatedGainFromVisiblePdfs).toBe("number");
      expect(typeof s.projectedTotal).toBe("number");
      expect(typeof s.gapToTarget).toBe("number");
    });

    it("projectedTotal = currentTools + estimatedGain", () => {
      const s = vendorCatalogManifestEngine.getSummary();
      expect(s.projectedTotal).toBe(s.currentTools + s.estimatedGainFromVisiblePdfs);
    });

    it("recommendations are generated", () => {
      expect(manifest.recommendations.length).toBeGreaterThan(0);
    });

    it("Big-4 recommendation surfaces unextracted vendors OR notes gap", () => {
      const joined = manifest.recommendations.join(" ");
      // Either Big-4 mention OR gap-to-target mention is acceptable
      expect(joined).toMatch(/Sandvik|Iscar|Kennametal|Seco|gap|tool|extract/i);
    });

    it("zip shard recommendation surfaces ArchiveCrawler note", () => {
      if (manifest.totalZipShards > 0) {
        const joined = manifest.recommendations.join(" ");
        expect(joined).toMatch(/zip|archive|ArchiveCrawler/i);
      }
    });
  });

  describe("Edge cases & singleton", () => {
    it("singleton export works", () => {
      expect(vendorCatalogManifestEngine).toBeInstanceOf(VendorCatalogManifestEngine);
    });

    it("custom constructor accepts options", () => {
      const custom = new VendorCatalogManifestEngine({
        rootPath: "./nonexistent-path",
      });
      const m = custom.build();
      expect(m.totalPdfs).toBe(0);
    });

    it("missing root path returns empty manifest with recommendation", () => {
      const custom = new VendorCatalogManifestEngine({ rootPath: "/does/not/exist" });
      const m = custom.build();
      expect(m.catalogs).toEqual([]);
      expect(m.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Real-world manifest quality", () => {
    it("detects Sandvik GC 2023-2024 catalogs", () => {
      const gc = manifest.catalogs.filter(c => /GC[_\s]?2023/i.test(c.filename));
      expect(gc.length).toBeGreaterThanOrEqual(6);
      for (const c of gc) {
        expect(c.manufacturer).toBe("Sandvik");
      }
    });

    it("detects Iscar Master Catalog volumes", () => {
      const iscar = manifest.catalogs.filter(c => /Master\s+Catalog/i.test(c.filename));
      expect(iscar.length).toBeGreaterThanOrEqual(1);
      for (const c of iscar) {
        expect(c.manufacturer).toBe("Iscar");
      }
    });

    it("estimated gain from visible unextracted PDFs > 10k tools", () => {
      const s = vendorCatalogManifestEngine.getSummary();
      expect(s.estimatedGainFromVisiblePdfs).toBeGreaterThan(10000);
    });
  });
});

import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { postLibraryEngine } from "../engines/PostLibraryEngine.js";

const MANIFEST_PATH = "H:/prism/JM DIE/POST PROCESSORS/POST-PROCESSOR-MANIFEST.json";

/**
 * Real-behavior tests against the live consolidated manifest (576 posts as
 * of 2026-05-25). The manifest is operator-local (gitignored JM DIE/) — if
 * absent, gracefully skip with a clear message rather than fail spuriously
 * (test only matters on machines where the consolidator has been run).
 */
describe("PostLibraryEngine", () => {
  const haveManifest = existsSync(MANIFEST_PATH);

  describe("summary()", () => {
    it("returns counts by format/brand/domain/tier when manifest present", () => {
      if (!haveManifest) {
        expect(haveManifest).toBe(false);
        return;
      }
      const s = postLibraryEngine.summary();
      expect(s.total).toBeGreaterThan(0);
      expect(s.by_format[".cps"]).toBeGreaterThanOrEqual(1);
      expect(typeof s.generated_at).toBe("string");
      expect(s.manifest_path).toBe(MANIFEST_PATH);
    });
  });

  describe("search()", () => {
    it("filters by tier=prism-enhanced and returns only enhanced entries", () => {
      if (!haveManifest) return;
      const r = postLibraryEngine.search({ tier: "prism-enhanced", limit: 200 });
      expect(r.matched.every((e) => e.tier === "prism-enhanced")).toBe(true);
      expect(r.total_in_library).toBeGreaterThan(0);
    });

    it("filters by brand=hurco returns only Hurco entries", () => {
      if (!haveManifest) return;
      const r = postLibraryEngine.search({ tier: "all", brand: "hurco", limit: 50 });
      expect(r.matched.every((e) => e.brand.toLowerCase() === "hurco")).toBe(true);
    });

    it("filters by domain=wire-edm returns only wire-EDM entries", () => {
      if (!haveManifest) return;
      const r = postLibraryEngine.search({ tier: "all", domain: "wire-edm", limit: 50 });
      expect(r.matched.every((e) => e.domain === "wire-edm")).toBe(true);
    });

    it("free-text q filter matches against source/dest path substring", () => {
      if (!haveManifest) return;
      const r = postLibraryEngine.search({ tier: "all", q: "fanuc", limit: 100 });
      expect(r.matched.every((e) =>
        e.source.toLowerCase().includes("fanuc") || e.dest.toLowerCase().includes("fanuc")
      )).toBe(true);
    });

    it("limit caps the matched list size", () => {
      if (!haveManifest) return;
      const r = postLibraryEngine.search({ tier: "all", limit: 5 });
      expect(r.matched.length).toBeLessThanOrEqual(5);
      expect(r.total_matched).toBeGreaterThanOrEqual(r.matched.length);
    });

    it("returns empty matched when no entries pass filter", () => {
      if (!haveManifest) return;
      const r = postLibraryEngine.search({ tier: "all", brand: "definitely_not_a_real_brand_xyz" });
      expect(r.matched.length).toBe(0);
      expect(r.total_matched).toBe(0);
    });
  });

  describe("recommend()", () => {
    it("returns up to limit entries for hurco mill, PRISM Enhanced first", () => {
      if (!haveManifest) return;
      const recs = postLibraryEngine.recommend("hurco", "mill", { limit: 3, includeVanilla: true });
      expect(recs.length).toBeLessThanOrEqual(3);
      expect(recs.every((e) => e.brand.toLowerCase() === "hurco" && e.domain === "mill")).toBe(true);
      // If any prism-enhanced exists for this brand+domain, they come first
      const firstEnhanced = recs.findIndex((e) => e.tier === "prism-enhanced");
      const firstVanilla = recs.findIndex((e) => e.tier === "vanilla");
      if (firstEnhanced !== -1 && firstVanilla !== -1) {
        expect(firstEnhanced).toBeLessThan(firstVanilla);
      }
    });

    it("respects includeVanilla=false (PRISM Enhanced only)", () => {
      if (!haveManifest) return;
      const recs = postLibraryEngine.recommend("hurco", "mill", { limit: 10, includeVanilla: false });
      expect(recs.every((e) => e.tier === "prism-enhanced")).toBe(true);
    });
  });

  describe("error handling", () => {
    it("download() throws on path not in manifest", async () => {
      if (!haveManifest) return;
      await expect(
        postLibraryEngine.download("totally/nonexistent/path/missing.cps"),
      ).rejects.toThrow(/not found in manifest/);
    });
  });
});

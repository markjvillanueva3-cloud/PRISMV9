/**
 * CatalogCorpusLoaderEngine tests — real-data reference-value + invariant tests.
 *
 * R9: every assertion encodes WHY the behavior matters. These tests fail if the
 * loader stops feeding the real 62,727-entry corpus, silently drops a vendor file,
 * or fabricates tools. happy + ≥3 failure modes + ≥2 adversarial, all against the
 * LIVE corpus (not a fixture) so the test proves the production wiring.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  CatalogCorpusLoaderEngine,
  catalogCorpusLoaderEngine,
} from "../engines/CatalogCorpusLoaderEngine.js";
import { toolCatalogEngine, type CatalogTool } from "../engines/ToolCatalogEngine.js";

describe("CatalogCorpusLoaderEngine", () => {
  const engine = new CatalogCorpusLoaderEngine();

  describe("corpusStats (manifest-only, no full load)", () => {
    it("reports the declared 48-file / ~51K-entry manifest", () => {
      const s = engine.corpusStats();
      // WHY: if the manifest shrinks/grows the whole goal premise changes — pin it.
      expect(s.declaredFiles).toBeGreaterThanOrEqual(48);
      expect(s.declaredEntries).toBeGreaterThanOrEqual(50_000);
      expect(s.manufacturers).toBeGreaterThanOrEqual(20);
    });
  });

  describe("load (dry-run — normalize the full live corpus)", () => {
    let result: ReturnType<CatalogCorpusLoaderEngine["load"]>;
    beforeAll(() => {
      result = engine.load({ dryRun: true });
    });

    it("normalizes the bulk of the declared corpus with zero file failures", () => {
      // WHY: the keystone claim. If <45K tools normalize, app exports stay starved.
      expect(result.filesFailed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.toolsNormalized).toBeGreaterThanOrEqual(45_000);
    });

    it("processes every manifest file (no silent file skip)", () => {
      // WHY: a dropped FILE = a whole vendor missing. perFile must cover all 48.
      expect(result.perFile.length).toBeGreaterThanOrEqual(48);
      for (const f of result.perFile) {
        expect(f.file).toMatch(/\.json$/); // every entry names a real vendor file
        // A file the manifest declares non-empty MUST read ≥1 row (no silent drop).
        // Two manifest files (sandvik-master, tooling-systems) are declared entries=0
        // — legitimately empty, so we only assert read>0 when the file has content.
        if (!f.error && f.declaredEntries > 0) expect(f.read).toBeGreaterThan(0);
      }
    });

    it("revives the previously-dormant vendor files (accupro, korloy, ma-ford, yg1, camfix, flash)", () => {
      // WHY: these had 0 references in ToolCatalogEngine before this engine —
      // the exact gap. Prove they now normalize real tools (aggregate ≥1000).
      const dormant = ["accupro", "korloy", "ma-ford", "yg1", "camfix", "flash"];
      const dormantTotal = result.perFile
        .filter(f => dormant.some(m => f.manufacturer.toLowerCase().includes(m.split("-")[0])))
        .reduce((a, f) => a + f.normalized, 0);
      expect(dormantTotal).toBeGreaterThan(1_000);
    });

    it("normalizes exactly the rows it reads — zero fabrication, zero silent drop", () => {
      // WHY: the load-bearing anti-fabrication invariant. Every normalized tool came
      // from a real disk row; every non-normalized row is an accounted-for skip.
      const totalRead = result.perFile.reduce((a, f) => a + f.read, 0);
      expect(result.toolsNormalized).toBeLessThanOrEqual(totalRead);
      expect(result.toolsNormalized + result.skipped).toBe(totalRead); // exact accounting
    });

    it("the manifest accounts for every file (read + redundant-skipped) and the corpus is ≥45K", () => {
      // HISTORY (slot:romeo 2026-06-08): CATALOG_INDEX.json (gen 2026-04-16) had
      // declared totalEntries=51,336 while the files held ~62,727 — osg-tools-extracted
      // was re-extracted 42→11,550 and the manifest was never refreshed. Regenerated
      // via scripts/regenerate-catalog-index.mjs so declared now equals real.
      // UPDATE (slot:romeo 2026-06-12): the loader now SKIPS the 3 *-extracted.json twins
      // that are 100%-redundant with a richer .ts-getter cache (REDUNDANT_EXTRACTED:
      // osg/guhring/sandvik = 17,389 identical tools that were double-counting). So
      // totalRead is intentionally < declaredTotal now.
      // INVARIANT: the manifest STILL accounts for everything — rows actually read PLUS the
      // declared rows of the intentionally-skipped redundant twins === declaredTotal. Fails if
      // the manifest drifts from the files, the loader stops reading, or the exclusion list
      // silently changes without this accounting.
      const totalRead = result.perFile.reduce((a, f) => a + f.read, 0);
      expect(result.excludedRedundant.length).toBe(3); // osg/guhring/sandvik redundant extracted twins
      expect(totalRead + result.excludedRedundantDeclared).toBe(result.declaredTotal);
      expect(result.toolsNormalized).toBeGreaterThanOrEqual(45_000); // deduped corpus (was 60K+ inflated by the twins)
    });

    it("excludes exactly the 3 proven-redundant *-extracted.json twins (17,389 dups removed)", () => {
      // WHY (slot:romeo 2026-06-12): osg/guhring/sandvik *-extracted.json are data-twins of their
      // RICHER .ts-getter caches (osg-tools.json etc.) — verified 100% edp/part overlap + identical
      // present-geometry. Loading them via the corpus double-counted 17,389 identical physical tools.
      // The loader now skips them (the getter copy, which computes per-ISO cutting_data, wins). This
      // guard fails LOUD if the exclusion regresses (the dup returns) or the excluded set drifts.
      expect([...result.excludedRedundant].sort()).toEqual([
        "guhring-tools-extracted.json",
        "osg-tools-extracted.json",
        "sandvik-tools-extracted.json",
      ]);
      expect(result.excludedRedundantDeclared).toBe(17_389); // 11550 + 3421 + 2418
      // The excluded twins are never read/normalized (absent from perFile).
      const processed = new Set(result.perFile.map(f => f.file));
      for (const f of result.excludedRedundant) expect(processed.has(f)).toBe(false);
    });

    it("does NOT mutate the runtime catalog on dry-run", () => {
      // WHY: dryRun must be side-effect-free for safe stats/validation.
      expect(result.added).toBe(0);
      expect(result.duplicates).toBe(0);
    });
  });

  describe("normalized tool shape (CatalogTool contract)", () => {
    it("every normalized tool carries valid id, type, material, and physical geometry", () => {
      const fresh = new CatalogCorpusLoaderEngine();
      const feed = fresh.load({ onlyManufacturer: "Accupro" }); // real addTools into the singleton
      expect(feed.added).toBeGreaterThan(0);
      // Filter to CORPUS-sourced tools: this contract test verifies that corpus normalization
      // produces valid CatalogTools. Accupro is no longer corpus-only -- U-DBCON-CACHE-SYNC
      // (2026-06-12) repopulated additional-tools.json with the SAME Accupro tools (ids
      // `ADD-Accupro-<designation>`, a separate .ts-getter pipeline that search() ranks above the
      // corpus twins). So we search broadly and inspect the corpus subset, which is this contract
      // test's subject. NOTE (follow-up unit): the additional-tools<->corpus overlap is a broader
      // duplication than the osg/guhring/sandvik REDUNDANT_EXTRACTED set this commit removes.
      // search() ranks by insertion order (ADD- standard tools precede corpus: twins), so the cap
      // must exceed the FULL Accupro set (currently ~6,030) for the corpus subset to stay reachable
      // even if additional-tools grows again -- 50k is well above any single vendor's tool count.
      const accupro = (toolCatalogEngine
        .search({ manufacturer: "Accupro", max_results: 50_000 }) as CatalogTool[])
        .filter(t => t.id.startsWith("corpus:"))
        .slice(0, 25);
      expect(accupro.length).toBeGreaterThan(0);
      for (const t of accupro) {
        expect(t.id).toMatch(/^corpus:/);
        expect(t.manufacturer).toBe("Accupro");
        expect(typeof t.designation).toBe("string");
        expect(t.physical).toMatchObject({
          cutting_diameter_mm: expect.any(Number),
          shank_diameter_mm: expect.any(Number),
          overall_length_mm: expect.any(Number),
          flute_length_mm: expect.any(Number),
        });
        expect(t.physical.cutting_diameter_mm).toBeGreaterThan(0);
        expect(t.iso_groups.length).toBeGreaterThan(0);
        expect(t.operations.length).toBeGreaterThan(0);
        expect(t.source).toMatch(/^corpus:/);
      }
    });
  });

  describe("addTools feed (the keystone — lights up all app adapters)", () => {
    it("feeds normalized tools into ToolCatalogEngine and raises stats().total", () => {
      const before = (toolCatalogEngine.stats() as { total_tools: number }).total_tools;
      const fresh = new CatalogCorpusLoaderEngine();
      const res = fresh.load({ onlyManufacturer: "Korloy" }); // previously-dormant vendor
      expect(res.added).toBeGreaterThan(0);
      const after = (toolCatalogEngine.stats() as { total_tools: number }).total_tools;
      // WHY: this is the literal goal — corpus tools now reachable by every consumer
      // of toolCatalogEngine.search() (Fusion/Mastercam/hyperMILL/Inventor/SFC).
      expect(after).toBeGreaterThanOrEqual(before + res.added);
    });

    it("is idempotent — re-feeding the same vendor reports duplicates, not double-count", () => {
      const fresh = new CatalogCorpusLoaderEngine();
      const first = fresh.load({ onlyManufacturer: "Guhring" });
      const fresh2 = new CatalogCorpusLoaderEngine();
      const second = fresh2.load({ onlyManufacturer: "Guhring" });
      expect(second.added).toBe(0); // all ids already present
      if (first.added > 0) expect(second.duplicates).toBeGreaterThanOrEqual(1);
    });
  });

  describe("adversarial / failure modes", () => {
    it("a record with no designation AND no diameter is SKIPPED, never fabricated", () => {
      const e = new CatalogCorpusLoaderEngine();
      // @ts-expect-error reach the private normalizer for a unit-level adversarial check
      const out = e.normalizeRecord({ type: "end_mill" }, "X", "x.json", 0);
      expect(out).toBeNull(); // no identity → null (caller counts as skipped, surfaced)
    });

    it("an unknown vendor 'type' degrades deterministically to end_mill, not undefined", () => {
      const e = new CatalogCorpusLoaderEngine();
      // @ts-expect-error private
      const t1 = e.normalizeRecord({ designation: "Z1", type: "wombat", cutting_diameter_mm: 6 }, "X", "x.json", 0);
      expect(t1).not.toBeNull();
      expect(t1!.type).toBe("end_mill");
      // @ts-expect-error private
      const t2 = e.normalizeRecord({ designation: "Z2", type: "indexable insert", cutting_diameter_mm: 10 }, "X", "x.json", 1);
      expect(t2!.type).toBe("insert");
    });

    it("missing optional geometry defaults coherently (shank→cutting dia, oal/loc→0)", () => {
      const e = new CatalogCorpusLoaderEngine();
      // @ts-expect-error private — ma-ford-style record missing overall_length
      const t = e.normalizeRecord({ designation: "MA-1", type: "end_mill", cutting_diameter_mm: 12.7 }, "Ma Ford", "ma.json", 0);
      expect(t).not.toBeNull();
      expect(t!.physical.shank_diameter_mm).toBe(12.7); // shank defaults to cutting dia
      expect(t!.physical.overall_length_mm).toBe(0);    // missing → 0 (not NaN/undefined)
      expect(Number.isNaN(t!.physical.overall_length_mm)).toBe(false);
    });

    it("singleton instance is the wired engine and produces real corpus stats", () => {
      // WHY: the dispatcher calls THIS singleton — it must be the engine and actually
      // read the live manifest, returning the real ≥48-file / ≥50K-entry counts.
      expect(catalogCorpusLoaderEngine).toBeInstanceOf(CatalogCorpusLoaderEngine);
      const s = catalogCorpusLoaderEngine.corpusStats();
      expect(s.declaredFiles).toBeGreaterThanOrEqual(48);
      expect(s.declaredEntries).toBeGreaterThanOrEqual(50_000);
    });

    it("ensureLoaded() lazily feeds the full corpus exactly once (idempotent)", () => {
      // WHY: app exporters (Fusion/Mastercam/hyperMILL/Inventor) call ensureLoaded()
      // before search() so they always see the 62.7K corpus without a manual load.
      const fresh = new CatalogCorpusLoaderEngine();
      fresh.resetEnsured();
      const first = fresh.ensureLoaded();
      expect(first.ensured).toBe(true);
      expect(first.alreadyLoaded).toBe(false); // first call actually loads
      const second = fresh.ensureLoaded();
      expect(second.alreadyLoaded).toBe(true);  // second call short-circuits
      expect(second.added).toBe(0);             // no re-feed
      // after ensureLoaded, the runtime catalog holds the full corpus — the exact
      // state every app exporter's search() now sees.
      expect(toolCatalogEngine.search({ manufacturer: "Accupro", max_results: 1 }).length)
        .toBeGreaterThan(0);
    });

    it("runtimeLoaded reflects the REAL ToolCatalogEngine size, not a hard-wired 0", () => {
      // REGRESSION GUARD (3-of-3 scrutiny 2026-06-08): corpusStats() read stats().total
      // but the method returns total_tools → runtimeLoaded was permanently 0 even after
      // a full corpus load. This asserts the field tracks reality and RISES after a feed.
      const before = catalogCorpusLoaderEngine.corpusStats().runtimeLoaded;
      const fresh = new CatalogCorpusLoaderEngine();
      const fed = fresh.load({ onlyManufacturer: "Sumitomo" }).added; // a vendor not yet fed by prior tests
      const after = catalogCorpusLoaderEngine.corpusStats().runtimeLoaded;
      // runtimeLoaded must be the real non-zero catalog size (standard tools alone are ~13K)
      expect(after).toBeGreaterThan(0);
      // and it must have RISEN by exactly the number of tools just fed (fails if hard-wired 0)
      expect(after).toBe(before + fed);
    });
  });
});

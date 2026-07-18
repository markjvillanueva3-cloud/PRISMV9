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

    it("normalizes the bulk of the unique corpus with zero file failures", () => {
      // WHY: the keystone claim. After the 20-twin REDUNDANT_EXTRACTED skip the corpus contributes
      // the genuinely-UNIQUE vendors (~24,991); if <24K normalize, app exports stay starved.
      expect(result.filesFailed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.toolsNormalized).toBeGreaterThanOrEqual(24_000);
    });

    it("processes every NON-redundant manifest file (no silent file skip)", () => {
      // WHY: a dropped FILE = a whole vendor missing. perFile must cover all 31 files that remain
      // after the 20 verified-redundant twins are skipped (51 manifest − 20 REDUNDANT_EXTRACTED).
      expect(result.perFile.length).toBeGreaterThanOrEqual(31);
      for (const f of result.perFile) {
        expect(f.file).toMatch(/\.json$/); // every entry names a real vendor file
        // A file the manifest declares non-empty MUST read ≥1 row (no silent drop).
        // Two manifest files (sandvik-master, tooling-systems) are declared entries=0
        // — legitimately empty, so we only assert read>0 when the file has content.
        if (!f.error && f.declaredEntries > 0) expect(f.read).toBeGreaterThan(0);
      }
    });

    it("revives the genuinely-dormant corpus-only vendors (seco, widia, big-daishowa, sumitomo, tungaloy)", () => {
      // WHY: these vendor files are NOT present in any .ts-getter cache (0% cache overlap per
      // scripts/analyze-corpus-redundancy.mjs), so the corpus loader is their ONLY source — the
      // exact gap this engine exists to close. (accupro/korloy/ma-ford/yg1/camfix/flash were ALSO
      // dormant in 2026-06-08 but are now cache-backed via additional-tools.json, so they are
      // REDUNDANT_EXTRACTED and no longer in perFile.) Prove the truly-unique ones normalize ≥1000.
      const dormant = ["seco", "widia", "big-daishowa", "sumitomo", "tungaloy"];
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

    it("the manifest accounts for every file (read + redundant-skipped) and the corpus is ≥24K unique", () => {
      // HISTORY (slot:romeo 2026-06-08): CATALOG_INDEX.json (gen 2026-04-16) had
      // declared totalEntries=51,336 while the files held ~62,727 — osg-tools-extracted
      // was re-extracted 42→11,550 and the manifest was never refreshed. Regenerated
      // via scripts/regenerate-catalog-index.mjs so declared now equals real.
      // UPDATE (slot:romeo 2026-06-12): the loader now SKIPS 20 *-extracted.json twins that are
      // 100%-redundant with a .ts-getter cache (REDUNDANT_EXTRACTED = 42,187 identical tools that
      // were double-counting against their cache copies). So totalRead is intentionally <
      // declaredTotal, and toolsNormalized is now the genuinely-UNIQUE corpus contribution (~24,991).
      // INVARIANT: the manifest STILL accounts for everything — rows actually read PLUS the
      // declared rows of the intentionally-skipped redundant twins === declaredTotal. Fails if
      // the manifest drifts from the files, the loader stops reading, or the exclusion list
      // silently changes without this accounting.
      const totalRead = result.perFile.reduce((a, f) => a + f.read, 0);
      expect(result.excludedRedundant.length).toBe(20); // 20 verified-redundant extracted twins
      expect(totalRead + result.excludedRedundantDeclared).toBe(result.declaredTotal);
      expect(result.toolsNormalized).toBeGreaterThanOrEqual(24_000); // unique corpus (twins excluded)
    });

    it("excludes exactly the 20 verified-redundant *-extracted.json twins (42,187 dups removed)", () => {
      // WHY (slot:romeo 2026-06-12): these *-extracted.json are data-twins of a .ts-getter cache
      // already loaded as standard tools. Verified by scripts/analyze-corpus-redundancy.mjs: 100%
      // part-number-key overlap AND 100% cutting-diameter geometry match vs the loaded cache union
      // (the geometry check rejects part-number string collisions), and a field-richness sample
      // confirmed the cache copy is equal-or-richer. Loading them double-counted 42,187 identical
      // tools. This guard fails LOUD if the exclusion regresses or the verified set drifts.
      expect([...result.excludedRedundant].sort()).toEqual([
        "accupro-tools-extracted.json",
        "ampc-tools-extracted.json",
        "camfix-tools-extracted.json",
        "flash-tools-extracted.json",
        "guhring-tools-extracted.json",
        "iscar-tools-extracted.json",
        "iscar-turning-extracted.json",
        "kennametal-holemaking-extracted.json",
        "kennametal-milling-extracted.json",
        "kennametal-threading-extracted.json",
        "kennametal-turning-extracted.json",
        "korloy-rotating-extracted.json",
        "korloy-tools-extracted.json",
        "korloy-turning-extracted.json",
        "ma-ford-tools-extracted.json",
        "osg-tools-extracted.json",
        "rapidkut-tools-extracted.json",
        "sandvik-tools-extracted.json",
        "unknown_solid-tools-extracted.json",
        "yg1-tools-extracted.json",
      ]);
      expect(result.excludedRedundantDeclared).toBe(42_187); // 17,389 (group 1) + 24,798 (group 2)
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
      // Seco is PURELY corpus-sourced (no .ts-getter cache; 0% cache overlap per
      // scripts/analyze-corpus-redundancy.mjs), so it is NOT in REDUNDANT_EXTRACTED and search()
      // returns only `corpus:` tools for it -- the clean subject for a corpus-normalization contract
      // test. (Accupro was used before but is now cache-backed + REDUNDANT_EXTRACTED.) Constrain to
      // end_mill so the rotating-tool geometry assertions (cutting_diameter > 0) all hold.
      const feed = fresh.load({ onlyManufacturer: "Seco" }); // real addTools into the singleton
      expect(feed.added).toBeGreaterThan(0);
      const seco = (toolCatalogEngine
        .search({ manufacturer: "Seco", type: "end_mill", max_results: 5_000 }) as CatalogTool[])
        // corpus-sourced rotating tools: dia>0 scopes to the population the geometry assertions
        // below apply to (a few end-mill records are designation-only with no diameter -> dia 0).
        .filter(t => t.id.startsWith("corpus:") && t.physical.cutting_diameter_mm > 0)
        .slice(0, 25);
      expect(seco.length).toBeGreaterThan(0);
      for (const t of seco) {
        expect(t.id).toMatch(/^corpus:/);
        expect(typeof t.manufacturer).toBe("string");
        expect(t.manufacturer.length).toBeGreaterThan(0);
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
      const res = fresh.load({ onlyManufacturer: "Widia" }); // corpus-only vendor (Korloy is now cache-backed + REDUNDANT_EXTRACTED)
      expect(res.added).toBeGreaterThan(0);
      const after = (toolCatalogEngine.stats() as { total_tools: number }).total_tools;
      // WHY: this is the literal goal — corpus tools now reachable by every consumer
      // of toolCatalogEngine.search() (Fusion/Mastercam/hyperMILL/Inventor/SFC).
      expect(after).toBeGreaterThanOrEqual(before + res.added);
    });

    it("is idempotent — re-feeding the same vendor reports duplicates, not double-count", () => {
      const fresh = new CatalogCorpusLoaderEngine();
      // Big Daishowa is corpus-only + not fed by an earlier test (Guhring is now REDUNDANT_EXTRACTED,
      // so it would feed 0 and make this idempotency check vacuous).
      const first = fresh.load({ onlyManufacturer: "Big Daishowa" });
      const fresh2 = new CatalogCorpusLoaderEngine();
      const second = fresh2.load({ onlyManufacturer: "Big Daishowa" });
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

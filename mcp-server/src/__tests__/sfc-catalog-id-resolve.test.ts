/**
 * SFC catalog-id tool resolution (CATALOG-APP-WIRING-MS0/U7, slot:romeo).
 *
 * Proves the Speed/Feed Calculator resolves a REAL cataloged tool's geometry from
 * the 62.7K corpus when given tool_catalog_id — instead of falling back to the
 * 10mm default. This is the SFC half of the goal: SFC (a saleable product) now
 * sees the full corpus, not its small hand-wired set.
 *
 * R9: real reference value — corpus:Seco:JS512010F2C.0Z2-NXT has cutting_diameter_mm
 * 1.0 (verified from the live seco-tools-extracted.json). The test fails if SFC stops
 * resolving by id and reverts to the 10mm default. (Was Accupro ACCU-0.0625 = 1.587mm
 * before 2026-06-12; Accupro is now cache-backed + REDUNDANT_EXTRACTED, so its corpus id
 * no longer resolves. Seco is a genuinely corpus-only vendor.)
 */
import { describe, it, expect, beforeAll } from "vitest";

describe("SFC catalog-id tool resolution", () => {
  // The corpus must be loaded so the id resolves (ensureLoaded also runs inside
  // resolveTool, but pre-loading makes the assertion deterministic).
  beforeAll(async () => {
    const { catalogCorpusLoaderEngine } = await import("../engines/CatalogCorpusLoaderEngine.js");
    catalogCorpusLoaderEngine.ensureLoaded();
  });

  it("resolves the cataloged tool's REAL diameter from tool_catalog_id (no diameter given)", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    // Seco JS512010F2C.0Z2-NXT = 1.0 mm end mill in the (corpus-only) seco catalog.
    const r = eng.compute({
      material: "steel",
      operation: "milling",
      tool_catalog_id: "corpus:Seco:JS512010F2C.0Z2-NXT",
      // deliberately NO tool_diameter_mm — force resolution from the catalog id
    });
    const tool = r.value.resolved_tool;
    // WHY: without the U7 path the diameter would be the 10mm default; with it,
    // the real cataloged 1.0mm resolves.
    expect(tool.diameter_mm.value).toBeCloseTo(1.0, 2);
    // and it must NOT be the 10mm default
    expect(tool.diameter_mm.value).not.toBe(10);
  });

  it("a bogus catalog id falls through to the default (fail-soft, not a throw)", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const r = eng.compute({
      material: "steel",
      tool_catalog_id: "corpus:NoSuchVendor:NOPE-9999",
      // no diameter — should default to 10mm since the id resolves nothing
    });
    // WHY: a missing catalog id must NOT break the calc — it falls through to the
    // 10mm default exactly as if no id were given.
    expect(r.value.resolved_tool.diameter_mm.value).toBe(10);
    expect(r.value.cutting_speed_mpm).toBeGreaterThan(0); // calc still completes
  });

  it("explicit tool_diameter_mm still overrides the catalog id (user input wins)", async () => {
    const { speedFeedOrchestratorEngine: eng } = await import("../engines/SpeedFeedOrchestratorEngine.js");
    const r = eng.compute({
      material: "steel",
      tool_catalog_id: "corpus:Accupro:ACCU-0.0625", // 1.587mm
      tool_diameter_mm: 8,                            // explicit override
    });
    // WHY: user input has the highest confidence — an explicit diameter must win
    // over the cataloged one (the av() precedence is user > catalog > default).
    expect(r.value.resolved_tool.diameter_mm.value).toBe(8);
    expect(r.value.resolved_tool.diameter_mm.source).toBe("user_input");
  });
});

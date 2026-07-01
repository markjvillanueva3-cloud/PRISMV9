/**
 * jmdie-mill-proven-samples -- catalog -> ChipLoadSample[] mapping tests
 * U-SFC-PROVEN-MILL-CATALOG-SEED (slot:oscar)
 *
 * Verifies the curated JM-Die PROVEN mill catalog maps to real, correctly-typed
 * ChipLoadSamples with sane operation classification + metric diameter (units-first).
 */
import { describe, it, expect } from "vitest";
import {
  catalogToolOperation,
  jmdieMillProvenSamples,
} from "../engines/lib/jmdie-mill-proven-samples.js";
import { JM_DIE_PROVEN_MILL_PROGRAMS } from "../data/jmdie-proven-mill-programs.js";

describe("catalogToolOperation", () => {
  it("maps tool types to aggregateMillData operation keywords", () => {
    expect(catalogToolOperation("drill", [])).toBe("drilling");
    expect(catalogToolOperation("tap", [])).toBe("drilling");
    expect(catalogToolOperation("face_mill", ["facing", "squaring"])).toBe("facing");
    expect(catalogToolOperation("ball_endmill", ["rough_3d", "finish_3d"])).toBe("finishing");
    expect(catalogToolOperation("chamfer", [])).toBe("finishing");
  });

  it("classifies the flat-endmill workhorse by program ops (pocket > finish > rough)", () => {
    expect(catalogToolOperation("flat_endmill", ["pocket", "profile", "undercut"])).toBe("pocketing");
    expect(catalogToolOperation("flat_endmill", ["finishing", "profile"])).toBe("finishing");
    expect(catalogToolOperation("flat_endmill", ["squaring"])).toBe("roughing");
  });
});

describe("jmdieMillProvenSamples", () => {
  it("maps every catalog tool to a ChipLoadSample (count matches tools_used total)", () => {
    const expectedToolCount = JM_DIE_PROVEN_MILL_PROGRAMS.reduce((n, p) => n + p.tools_used.length, 0);
    const samples = jmdieMillProvenSamples();
    expect(samples.length).toBe(expectedToolCount);
    expect(expectedToolCount).toBe(7); // 2 + 1 + 1 + 2 + 1 across the 5 PROVEN programs
  });

  it("carries real rpm/feed + metric diameter; chip_load null (no flute count)", () => {
    for (const s of jmdieMillProvenSamples()) {
      expect(s.rpm).toBeGreaterThan(0);
      expect(s.feed_rate).toBeGreaterThan(0);
      expect(s.diameter_mm).toBeGreaterThan(0);
      expect(s.chip_load).toBeNull();
      expect(s.flute_count).toBeNull();
    }
  });

  it("maps the FONTANA 5/8 ball endmill to its proven HSM params (finishing, 15.875mm, 5000 rpm)", () => {
    const fontanaBall = jmdieMillProvenSamples().find(
      (s) => s.program.includes("O01289") && s.tool_number === 9,
    );
    expect(fontanaBall?.operation).toBe("finishing");
    expect(fontanaBall?.rpm).toBe(5000);
    expect(fontanaBall?.feed_rate).toBe(50);
    expect(fontanaBall!.diameter_mm).toBeCloseTo(15.875, 3);
  });

  it("maps the SFS 1/4 drill to drilling at its proven 2500 rpm", () => {
    const sfsDrill = jmdieMillProvenSamples().find(
      (s) => s.program.includes("O32472") && s.tool_number === 2,
    );
    expect(sfsDrill?.operation).toBe("drilling");
    expect(sfsDrill?.rpm).toBe(2500);
    expect(sfsDrill!.diameter_mm).toBeCloseTo(6.35, 3);
  });
});

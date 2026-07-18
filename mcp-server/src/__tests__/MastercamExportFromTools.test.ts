/**
 * MastercamExportFromTools -- CATALOG-APP-WIRING-MS0/U-MCAM-EXPORT-FROM-TOOLS (slot:romeo).
 *
 * Verifies the subset entrypoint MastercamToolExportEngine.exportFromTools(prismTools[]) that the
 * per-(material,type,brand) library generator needs. Its CONTRACT (and what each test guards):
 *   - exports EXACTLY the given tools as ONE library -- NEVER the manufacturer-partition split
 *     that exportLibrary() does (the whole reason this entrypoint exists);
 *   - NO catalog re-query / Generic synthesis -- the leaf's real tools survive verbatim;
 *   - filesystem-safe library/file name; fail-soft on empty/null input; materials param forwards.
 */
import { describe, it, expect } from "vitest";
import { mastercamToolExportEngine } from "../engines/MastercamToolExportEngine.js";

/** A full PRISM-shaped catalog tool (the shape the leaf generator passes verbatim). */
function tool(over: { type?: string; d?: number; flutes?: number; mfr?: string; pn?: string } = {}) {
  const d = over.d ?? 10;
  return {
    type: over.type ?? "endmill",
    cutting_diameter_mm: d,
    flute_count: over.flutes ?? 4,
    flute_length_mm: 30,
    overall_length_mm: 80,
    shank_diameter_mm: d,
    coating: "TiAlN",
    material: "carbide",
    manufacturer: over.mfr ?? "HAIMER",
    part_number: over.pn ?? "PN-1",
  };
}

describe("MastercamToolExportEngine.exportFromTools (per-leaf subset entrypoint)", () => {
  it("exports EXACTLY the given tools as ONE library (never the manufacturer-partition split)", () => {
    // three DISTINCT manufacturers -> exportLibrary() would emit 3 libraries; exportFromTools must NOT.
    const tools = [
      tool({ mfr: "HAIMER", pn: "H1" }),
      tool({ mfr: "GUHRING", pn: "G1" }),
      tool({ mfr: "KENNAMETAL", pn: "K1" }),
    ];
    const r = mastercamToolExportEngine.exportFromTools(tools, "P_endmill_MIXED");
    expect(r.tool_count).toBe(3);
    expect(r.libraries).toBeUndefined(); // single library, never partitioned by manufacturer
    const lib = JSON.parse(r.library_data);
    expect(lib.tools.length).toBe(3);
    expect(lib.library_name).toBe("P_endmill_MIXED");
    expect(r.file_name).toBe("P_endmill_MIXED.mcam-tools");
  });

  it("preserves the real manufacturers (no catalog re-query / Generic synthesis)", () => {
    const tools = [tool({ mfr: "HAIMER", pn: "H1" }), tool({ mfr: "GUHRING", pn: "G1" })];
    const lib = JSON.parse(mastercamToolExportEngine.exportFromTools(tools, "leaf").library_data);
    const mfrs = new Set(lib.tools.map((t: { manufacturer: string }) => t.manufacturer));
    expect(mfrs.has("HAIMER")).toBe(true);
    expect(mfrs.has("GUHRING")).toBe(true);
    expect(mfrs.has("Generic")).toBe(false); // would appear only if it synthesized/re-queried
  });

  it("sanitizes the library name to a filesystem-safe stem (no space/slash/at-sign)", () => {
    const r = mastercamToolExportEngine.exportFromTools([tool()], "P / Drill @ HAIMER");
    expect(r.file_name).toMatch(/^[A-Za-z0-9_]+\.mcam-tools$/);
    expect(r.file_name).not.toMatch(/[ /@]/);
  });

  it("defaults a blank / all-special library name to PRISM_TOOLS (never an empty filename)", () => {
    expect(mastercamToolExportEngine.exportFromTools([tool()], "///").file_name).toBe("PRISM_TOOLS.mcam-tools");
    expect(mastercamToolExportEngine.exportFromTools([tool()], "").file_name).toBe("PRISM_TOOLS.mcam-tools");
  });

  it("fail-soft on empty / null tool list -> a valid empty library, no crash", () => {
    const r = mastercamToolExportEngine.exportFromTools([], "EMPTY");
    expect(r.tool_count).toBe(0);
    expect(JSON.parse(r.library_data).tools).toEqual([]);
    const r2 = mastercamToolExportEngine.exportFromTools(null as any, "NULLED");
    expect(r2.tool_count).toBe(0);
  });

  it("honors the mcam-operations format (extension follows the format arg)", () => {
    const r = mastercamToolExportEngine.exportFromTools([tool()], "OPS", "mcam-operations");
    expect(r.file_name).toBe("OPS.mcam-operations");
    expect(JSON.parse(r.library_data).format).toBe("mcam-operations");
  });

  it("forwards the materials arg (single-ISO leaf computes fewer cutting-data rows than the all-ISO default)", () => {
    const all = JSON.parse(mastercamToolExportEngine.exportFromTools([tool()], "ALL").library_data);
    const oneIso = JSON.parse(mastercamToolExportEngine.exportFromTools([tool()], "K_LEAF", "mcam-tools", ["K"]).library_data);
    const allRows = all.tools[0].cutting_data?.length ?? 0;
    const oneRows = oneIso.tools[0].cutting_data?.length ?? 0;
    expect(allRows).toBeGreaterThan(1); // default spans all ISO groups
    expect(oneRows).toBeLessThan(allRows); // a single-material leaf computes fewer -> materials param flowed through
    expect(oneRows).toBeGreaterThan(0);
  });
});

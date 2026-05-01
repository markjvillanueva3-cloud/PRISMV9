/**
 * Tests for HM-KC-MS0 extraction pipeline
 *
 * U-HKC02: HyperMillOmCyclesExtractor — omCycles.txt parsing
 *
 * All assertions use specific values derived from the actual
 * H:/prism/HYPERMILL/hyperVIEW/33.0/core/omCycles.txt file (213 lines, 150 mappings).
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  HyperMillOmCyclesExtractor,
  hyperMillOmCyclesExtractor,
  type CycleMapping,
  type CycleCatalog,
} from "../engines/HyperMillOmCyclesExtractor.js";

// ── Shared catalog (extracted once for the suite) ─────────────────────────────

let catalog: CycleCatalog;

beforeAll(async () => {
  catalog = await hyperMillOmCyclesExtractor.extract();
});

// ── parseLine unit tests ───────────────────────────────────────────────────────

describe("HyperMillOmCyclesExtractor.parseLine", () => {
  const extractor = new HyperMillOmCyclesExtractor();

  it("parses a standard DR mapping correctly", () => {
    const result = extractor.parseLine(' "Drilling"                             := "DR:Drilling"');
    expect(result).not.toBeNull();
    expect(result!.displayName).toBe("Drilling");
    expect(result!.canonicalId).toBe("DR:Drilling");
    expect(result!.category).toBe("DR");
    expect(result!.shortName).toBe("Drilling");
  });

  it("parses a 3D mapping with multi-word shortName", () => {
    const result = extractor.parseLine(' "3D Curve Milling"                     := "3D:Curve Milling"');
    expect(result).not.toBeNull();
    expect(result!.displayName).toBe("3D Curve Milling");
    expect(result!.canonicalId).toBe("3D:Curve Milling");
    expect(result!.category).toBe("3D");
    expect(result!.shortName).toBe("Curve Milling");
  });

  it("parses a 5X mapping with complex display name", () => {
    const result = extractor.parseLine(' "3D 5-Axis Z-Level Finishing"           := "5X:5 Axis Z-level Finishing"');
    expect(result).not.toBeNull();
    expect(result!.displayName).toBe("3D 5-Axis Z-Level Finishing");
    expect(result!.canonicalId).toBe("5X:5 Axis Z-level Finishing");
    expect(result!.category).toBe("5X");
    expect(result!.shortName).toBe("5 Axis Z-level Finishing");
  });

  it("parses a MT (mill-turn) mapping", () => {
    const result = extractor.parseLine(' "Turning Roughing"                      := "MT:Millturn Roughing"');
    expect(result).not.toBeNull();
    expect(result!.displayName).toBe("Turning Roughing");
    expect(result!.canonicalId).toBe("MT:Millturn Roughing");
    expect(result!.category).toBe("MT");
    expect(result!.shortName).toBe("Millturn Roughing");
  });

  it("returns null for a comment line starting with ;", () => {
    expect(extractor.parseLine(";--- Drilling Cycles ---")).toBeNull();
  });

  it("returns null for a blank line", () => {
    expect(extractor.parseLine("")).toBeNull();
    expect(extractor.parseLine("   ")).toBeNull();
  });

  it("returns null for the file header comment", () => {
    expect(extractor.parseLine(";*************************************************************************")).toBeNull();
  });

  it("returns null for a line that has no := assignment", () => {
    expect(extractor.parseLine('"Drilling" = "DR:Drilling"')).toBeNull();
  });
});

// ── categorize unit tests ─────────────────────────────────────────────────────

describe("HyperMillOmCyclesExtractor.categorize", () => {
  const extractor = new HyperMillOmCyclesExtractor();

  it("groups mappings by category key", () => {
    const mappings: CycleMapping[] = [
      { displayName: "Drilling", canonicalId: "DR:Drilling", category: "DR", shortName: "Drilling" },
      { displayName: "Pecking", canonicalId: "DR:Drill with Pecking", category: "DR", shortName: "Drill with Pecking" },
      { displayName: "Contour", canonicalId: "2D:Contour Milling", category: "2D", shortName: "Contour Milling" },
    ];
    const result = extractor.categorize(mappings);
    expect(result["DR"]).toHaveLength(2);
    expect(result["2D"]).toHaveLength(1);
    expect(result["5X"]).toBeUndefined();
  });

  it("returns an empty object for an empty input", () => {
    expect(extractor.categorize([])).toEqual({});
  });
});

// ── Full extraction integration tests ────────────────────────────────────────

describe("HyperMillOmCyclesExtractor.extract — full file", () => {
  it("returns 150 total mappings (exact count from 213-line file)", () => {
    expect(catalog.totalMappings).toBe(150);
  });

  it("totalMappings matches mappings array length", () => {
    expect(catalog.mappings).toHaveLength(catalog.totalMappings);
  });

  it("extractedAt is a valid ISO 8601 date string", () => {
    expect(() => new Date(catalog.extractedAt)).not.toThrow();
    expect(new Date(catalog.extractedAt).toISOString()).toBe(catalog.extractedAt);
  });

  it("all required categories exist in the catalog", () => {
    const requiredCategories = ["DR", "2D", "3D", "5X", "MT", "TP"];
    for (const cat of requiredCategories) {
      expect(catalog.categories).toHaveProperty(cat);
      expect(catalog.categories[cat].length).toBeGreaterThan(0);
    }
  });
});

// ── Category-level counts ─────────────────────────────────────────────────────

describe("HyperMillOmCyclesExtractor — category counts", () => {
  it("DR has exactly 3 entries (Drilling, Pecking, Drilling Cycle with Chip Break)", () => {
    expect(catalog.categories["DR"]).toHaveLength(3);
  });

  it("TP has exactly 3 entries (Tap Milling, Tap Drilling, Enhanced Tap Milling)", () => {
    expect(catalog.categories["TP"]).toHaveLength(3);
  });

  it("2D has exactly 30 entries (including 5-axis drilling and probing routed via 2D prefix)", () => {
    expect(catalog.categories["2D"]).toHaveLength(30);
  });

  it("3D has exactly 33 entries", () => {
    expect(catalog.categories["3D"]).toHaveLength(33);
  });

  it("5X has exactly 58 entries", () => {
    expect(catalog.categories["5X"]).toHaveLength(58);
  });

  it("5X has at least 30 entries (brief requirement)", () => {
    expect(catalog.categories["5X"].length).toBeGreaterThanOrEqual(30);
  });

  it("MT has exactly 20 entries", () => {
    expect(catalog.categories["MT"]).toHaveLength(20);
  });

  it("NC has exactly 1 entry", () => {
    expect(catalog.categories["NC"]).toHaveLength(1);
  });

  it("3L has exactly 1 entry (3D Link)", () => {
    expect(catalog.categories["3L"]).toHaveLength(1);
  });

  it("5L has exactly 1 entry (3D 5-Axis Link)", () => {
    expect(catalog.categories["5L"]).toHaveLength(1);
  });
});

// ── Representative cycle lookups ──────────────────────────────────────────────

describe("HyperMillOmCyclesExtractor — representative cycle values", () => {
  it('maps "Drilling" display name to "DR:Drilling"', () => {
    const m = catalog.mappings.find((c) => c.displayName === "Drilling");
    expect(m).toBeDefined();
    expect(m!.canonicalId).toBe("DR:Drilling");
    expect(m!.category).toBe("DR");
    expect(m!.shortName).toBe("Drilling");
  });

  it('maps "Pecking" to "DR:Drill with Pecking"', () => {
    const m = catalog.mappings.find((c) => c.displayName === "Pecking");
    expect(m).toBeDefined();
    expect(m!.canonicalId).toBe("DR:Drill with Pecking");
  });

  it('maps "Drilling Cycle with Chip Break" to "DR:Drilling with Chip Break"', () => {
    const m = catalog.mappings.find((c) => c.displayName === "Drilling Cycle with Chip Break");
    expect(m).toBeDefined();
    expect(m!.canonicalId).toBe("DR:Drilling with Chip Break");
  });

  it('maps "3D Curve Milling" to "3D:Curve Milling"', () => {
    const m = catalog.mappings.find((c) => c.displayName === "3D Curve Milling");
    expect(m).toBeDefined();
    expect(m!.canonicalId).toBe("3D:Curve Milling");
    expect(m!.shortName).toBe("Curve Milling");
  });

  it('maps "3D 5-Axis Z-Level Finishing" to "5X:5 Axis Z-level Finishing"', () => {
    const m = catalog.mappings.find((c) => c.displayName === "3D 5-Axis Z-Level Finishing");
    expect(m).toBeDefined();
    expect(m!.canonicalId).toBe("5X:5 Axis Z-level Finishing");
    expect(m!.category).toBe("5X");
  });

  it('maps "Turning Roughing" to "MT:Millturn Roughing"', () => {
    const m = catalog.mappings.find((c) => c.displayName === "Turning Roughing");
    expect(m).toBeDefined();
    expect(m!.canonicalId).toBe("MT:Millturn Roughing");
  });

  it('maps "Tap Milling" to "TP:Thread Milling"', () => {
    const m = catalog.mappings.find((c) => c.displayName === "Tap Milling");
    expect(m).toBeDefined();
    expect(m!.canonicalId).toBe("TP:Thread Milling");
  });

  it('maps "NC File" to "NC:NC Text"', () => {
    const m = catalog.mappings.find((c) => c.displayName === "NC File");
    expect(m).toBeDefined();
    expect(m!.canonicalId).toBe("NC:NC Text");
    expect(m!.category).toBe("NC");
    expect(m!.shortName).toBe("NC Text");
  });

  it('maps "3D 5-Axis Impeller Machining" to correct 5X canonical', () => {
    const m = catalog.mappings.find((c) => c.displayName === "3D 5-Axis Impeller Machining");
    expect(m).toBeDefined();
    expect(m!.canonicalId).toBe("5X:5 AXIS Impeller Machining");
    expect(m!.category).toBe("5X");
  });

  it('maps "3D Probing" to "2D:Probing"', () => {
    const m = catalog.mappings.find((c) => c.displayName === "3D Probing");
    expect(m).toBeDefined();
    expect(m!.canonicalId).toBe("2D:Probing");
    expect(m!.category).toBe("2D");
  });

  it('maps "APT" to "3D:APT"', () => {
    const m = catalog.mappings.find((c) => c.displayName === "APT");
    expect(m).toBeDefined();
    expect(m!.canonicalId).toBe("3D:APT");
  });

  it('maps "APT Multax" to "5X:APT Multax"', () => {
    const m = catalog.mappings.find((c) => c.displayName === "APT Multax");
    expect(m).toBeDefined();
    expect(m!.canonicalId).toBe("5X:APT Multax");
  });
});

// ── Singleton export ──────────────────────────────────────────────────────────

describe("hyperMillOmCyclesExtractor singleton", () => {
  it("exports a singleton instance of HyperMillOmCyclesExtractor", () => {
    expect(hyperMillOmCyclesExtractor).toBeInstanceOf(HyperMillOmCyclesExtractor);
  });

  it("singleton produces the same catalog as a direct instance", async () => {
    const singletonCatalog = await hyperMillOmCyclesExtractor.extract();
    expect(singletonCatalog.totalMappings).toBe(150);
    expect(singletonCatalog.categories["DR"]).toHaveLength(3);
  });
});

// ── Error handling ────────────────────────────────────────────────────────────

describe("HyperMillOmCyclesExtractor — error handling", () => {
  it("throws a descriptive error for a non-existent file path", async () => {
    const extractor = new HyperMillOmCyclesExtractor(
      "H:/prism/HYPERMILL/nonexistent/omCycles.txt"
    );
    await expect(extractor.extract()).rejects.toThrow(
      "HyperMillOmCyclesExtractor: cannot read"
    );
  });
});

// =============================================================================
// U-HKC03: HyperMillDemoDbExtractor — tool geometry + cutting tech schema
// =============================================================================

import * as fs from "node:fs";
import {
  HyperMillDemoDbExtractor,
  hyperMillDemoDbExtractor,
  type DemoDbExtractionResult,
  type FieldDefinition,
  type ToolGeometrySchema,
  type CuttingTechSchema,
} from "../engines/HyperMillDemoDbExtractor.js";

const DEMO_DB_PATH =
  "H:/prism/HYPERMILL/Tool Database/33.0/databases/demo/english/demo.db";
const DB_AVAILABLE = fs.existsSync(DEMO_DB_PATH);

// Cache result to avoid repeated DB opens across tests
let _demoResult: DemoDbExtractionResult | null = null;
async function getDemoResult(): Promise<DemoDbExtractionResult> {
  if (!_demoResult) {
    _demoResult = await hyperMillDemoDbExtractor.extract();
  }
  return _demoResult;
}

// ── Singleton export ──────────────────────────────────────────────────────────

describe("HyperMillDemoDbExtractor — singleton export", () => {
  it("hyperMillDemoDbExtractor is an instance of HyperMillDemoDbExtractor", () => {
    expect(hyperMillDemoDbExtractor).toBeInstanceOf(HyperMillDemoDbExtractor);
  });

  it("extract() returns a Promise", () => {
    const p = hyperMillDemoDbExtractor.extract();
    expect(p).toBeInstanceOf(Promise);
    return p;
  });
});

// ── Graceful fallback when DB is absent ───────────────────────────────────────

describe("HyperMillDemoDbExtractor — graceful fallback", () => {
  it("returns status=missing when path does not exist", async () => {
    const ex = new HyperMillDemoDbExtractor("/nonexistent/path/demo.db");
    const r = await ex.extract();
    expect(r.status).toBe("missing");
    expect(r.error).toContain("not found");
    expect(r.totalTools).toBe(0);
    expect(r.totalGeometryClasses).toBe(0);
    expect(r.geometryClasses).toHaveLength(0);
  });

  it("returns empty cuttingTech when DB is absent", async () => {
    const ex = new HyperMillDemoDbExtractor("/nonexistent/path/demo.db");
    const r = await ex.extract();
    expect(r.cuttingTech.materialToolCombinations).toBe(0);
    expect(r.cuttingTech.fields).toHaveLength(0);
    expect(r.cuttingTech.sampleEntries).toHaveLength(0);
  });
});

// ── Live DB tests (skipped when demo.db is absent) ───────────────────────────

describe.runIf(DB_AVAILABLE)("HyperMillDemoDbExtractor — live demo.db", () => {

  it("extraction returns status=success", async () => {
    const r = await getDemoResult();
    expect(r.status).toBe("success");
    expect(r.error).toBeUndefined();
  });

  it("extractedAt is a valid ISO 8601 timestamp", async () => {
    const r = await getDemoResult();
    expect(r.extractedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  // ── Tool counts ─────────────────────────────────────────────────────────────

  it("totalTools is exactly 547 (known demo.db count)", async () => {
    const r = await getDemoResult();
    expect(r.totalTools).toBe(547);
  });

  it("totalTools is greater than 400 (exit criterion)", async () => {
    const r = await getDemoResult();
    expect(r.totalTools).toBeGreaterThan(400);
  });

  // ── Geometry class counts ───────────────────────────────────────────────────

  it("totalGeometryClasses is exactly 29 (from GeometryClasses table)", async () => {
    const r = await getDemoResult();
    expect(r.totalGeometryClasses).toBe(29);
  });

  it("totalGeometryClasses is at least 20 (exit criterion)", async () => {
    const r = await getDemoResult();
    expect(r.totalGeometryClasses).toBeGreaterThanOrEqual(20);
  });

  it("geometryClasses array has 29 entries", async () => {
    const r = await getDemoResult();
    expect(r.geometryClasses).toHaveLength(29);
  });

  // ── Class ordering and IDs ──────────────────────────────────────────────────

  it("geometry classes are ordered by classId ascending", async () => {
    const r = await getDemoResult();
    const ids = r.geometryClasses.map(gc => gc.classId);
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i]).toBeGreaterThan(ids[i - 1]);
    }
  });

  it("first geometry class is Ballmill with classId=1", async () => {
    const r = await getDemoResult();
    expect(r.geometryClasses[0].className).toBe("Ballmill");
    expect(r.geometryClasses[0].classId).toBe(1);
  });

  it("Drilltool class has classId=4 and rowCount=337 (largest class)", async () => {
    const r = await getDemoResult();
    const drill = r.geometryClasses.find(gc => gc.className === "Drilltool");
    expect(drill).toBeDefined();
    expect(drill!.classId).toBe(4);
    expect(drill!.rowCount).toBe(337);
  });

  it("Endmill class has classId=2 and rowCount=83", async () => {
    const r = await getDemoResult();
    const em = r.geometryClasses.find(gc => gc.className === "Endmill");
    expect(em).toBeDefined();
    expect(em!.classId).toBe(2);
    expect(em!.rowCount).toBe(83);
  });

  it("Ballmill rowCount is 31", async () => {
    const r = await getDemoResult();
    const ball = r.geometryClasses.find(gc => gc.className === "Ballmill");
    expect(ball!.rowCount).toBe(31);
  });

  it("Radiusmill rowCount is 46", async () => {
    const r = await getDemoResult();
    const rm = r.geometryClasses.find(gc => gc.className === "Radiusmill");
    expect(rm!.rowCount).toBe(46);
  });

  it("Tap class has classId=11 and rowCount=17", async () => {
    const r = await getDemoResult();
    const tap = r.geometryClasses.find(gc => gc.className === "Tap");
    expect(tap).toBeDefined();
    expect(tap!.classId).toBe(11);
    expect(tap!.rowCount).toBe(17);
  });

  it("all 29 class names include expected milling, turning, and special types", async () => {
    const r = await getDemoResult();
    const names = r.geometryClasses.map(gc => gc.className);
    ["Ballmill", "Endmill", "Radiusmill", "Drilltool", "Tap", "TSlotCutter",
      "BoringBar", "Reamer", "GeneralTurningTool", "RadialRecessingTool",
      "TouchProbe", "GrindingBit", "AdditiveDevice"].forEach(n =>
      expect(names).toContain(n),
    );
  });

  it("sum of rowCounts equals totalTools (547)", async () => {
    const r = await getDemoResult();
    const sum = r.geometryClasses.reduce((acc, gc) => acc + gc.rowCount, 0);
    expect(sum).toBe(547);
    expect(sum).toBe(r.totalTools);
  });

  // ── Field definitions ───────────────────────────────────────────────────────

  it("Tools table has exactly 50 columns (all classes share the same schema)", async () => {
    const r = await getDemoResult();
    const em = r.geometryClasses.find(gc => gc.className === "Endmill");
    expect(em!.fields).toHaveLength(50);
  });

  it("Endmill fields include id, name, total_length, dbl_param4, int_param1, bool_param1", async () => {
    const r = await getDemoResult();
    const em = r.geometryClasses.find(gc => gc.className === "Endmill");
    const names = em!.fields.map(f => f.name);
    expect(names).toContain("id");
    expect(names).toContain("name");
    expect(names).toContain("total_length");
    expect(names).toContain("dbl_param4");
    expect(names).toContain("int_param1");
    expect(names).toContain("bool_param1");
  });

  it("dbl_param4 field has type REAL (diameter — stored as DOUBLE PRECISION)", async () => {
    const r = await getDemoResult();
    const em = r.geometryClasses.find(gc => gc.className === "Endmill");
    const f = em!.fields.find(fd => fd.name === "dbl_param4");
    expect(f!.type).toBe("REAL");
  });

  it("int_param1 field has type INTEGER (flutes)", async () => {
    const r = await getDemoResult();
    const em = r.geometryClasses.find(gc => gc.className === "Endmill");
    const f = em!.fields.find(fd => fd.name === "int_param1");
    expect(f!.type).toBe("INTEGER");
  });

  it("all FieldDefinition type values are one of INTEGER|REAL|TEXT|BLOB", async () => {
    const r = await getDemoResult();
    const valid = new Set(["INTEGER", "REAL", "TEXT", "BLOB"]);
    r.geometryClasses.forEach(gc =>
      gc.fields.forEach(f => expect(valid.has(f.type)).toBe(true)),
    );
  });

  it("all FieldDefinition.nullable values are booleans", async () => {
    const r = await getDemoResult();
    r.geometryClasses.forEach(gc =>
      gc.fields.forEach(f => expect(typeof f.nullable).toBe("boolean")),
    );
  });

  it("dbl_param4 field description mentions 'diameter'", async () => {
    const r = await getDemoResult();
    const em = r.geometryClasses.find(gc => gc.className === "Endmill");
    const f = em!.fields.find(fd => fd.name === "dbl_param4");
    expect(f!.description.toLowerCase()).toContain("diameter");
  });

  it("int_param1 description mentions 'flutes' or 'cutting edges'", async () => {
    const r = await getDemoResult();
    const em = r.geometryClasses.find(gc => gc.className === "Endmill");
    const f = em!.fields.find(fd => fd.name === "int_param1");
    expect(f!.description.toLowerCase()).toMatch(/flutes|cutting edges/);
  });

  // ── Sample rows ─────────────────────────────────────────────────────────────

  it("geometry classes with 0 tools have null sample", async () => {
    const r = await getDemoResult();
    r.geometryClasses.filter(gc => gc.rowCount === 0).forEach(gc =>
      expect(gc.sample).toBeNull(),
    );
  });

  it("Drilltool sample is non-null and has positive dbl_param4 (diameter)", async () => {
    const r = await getDemoResult();
    const drill = r.geometryClasses.find(gc => gc.className === "Drilltool");
    expect(drill!.sample).not.toBeNull();
    const diam = (drill!.sample as Record<string, unknown>)["dbl_param4"] as number;
    expect(typeof diam).toBe("number");
    expect(diam).toBeGreaterThan(0);
  });

  // ── Cutting tech schema ──────────────────────────────────────────────────────

  it("cuttingTech.materialToolCombinations is exactly 2162", async () => {
    const r = await getDemoResult();
    expect(r.cuttingTech.materialToolCombinations).toBe(2162);
  });

  it("totalCuttingTechs matches cuttingTech.materialToolCombinations", async () => {
    const r = await getDemoResult();
    expect(r.totalCuttingTechs).toBe(r.cuttingTech.materialToolCombinations);
  });

  it("cuttingTech.totalEntries is exactly 2706", async () => {
    const r = await getDemoResult();
    expect(r.cuttingTech.totalEntries).toBe(2706);
  });

  it("cuttingTech.fields has 32 entries (Technologies table columns)", async () => {
    const r = await getDemoResult();
    expect(r.cuttingTech.fields).toHaveLength(32);
  });

  it("cuttingTech.fields includes cutting_speed, feedrate, spindle_speed, dbl_param1, material_id", async () => {
    const r = await getDemoResult();
    const names = r.cuttingTech.fields.map(f => f.name);
    ["cutting_speed", "feedrate", "spindle_speed", "dbl_param1", "material_id", "formula_id1"]
      .forEach(n => expect(names).toContain(n));
  });

  it("cutting_speed field has type REAL", async () => {
    const r = await getDemoResult();
    const f = r.cuttingTech.fields.find(fd => fd.name === "cutting_speed");
    expect(f!.type).toBe("REAL");
  });

  it("material_id field is nullable (some techs have no material link)", async () => {
    const r = await getDemoResult();
    const f = r.cuttingTech.fields.find(fd => fd.name === "material_id");
    expect(f!.nullable).toBe(true);
  });

  it("cuttingTech.sampleEntries has 5 entries (all linked to a material)", async () => {
    const r = await getDemoResult();
    expect(r.cuttingTech.sampleEntries).toHaveLength(5);
  });

  it("sample entries include cutting_speed with positive values", async () => {
    const r = await getDemoResult();
    r.cuttingTech.sampleEntries.forEach(e => {
      const vc = e["cutting_speed"] as number;
      expect(typeof vc).toBe("number");
      expect(vc).toBeGreaterThan(0);
    });
  });

  it("cutting_speed field description mentions Vc or m/min", async () => {
    const r = await getDemoResult();
    const f = r.cuttingTech.fields.find(fd => fd.name === "cutting_speed");
    expect(f!.description).toMatch(/Vc|m\/min|cutting speed/i);
  });

  it("dbl_param1 tech field description mentions ap or axial", async () => {
    const r = await getDemoResult();
    const f = r.cuttingTech.fields.find(fd => fd.name === "dbl_param1");
    expect(f!.description.toLowerCase()).toMatch(/ap|axial/);
  });

  // ── Interface shape compliance ───────────────────────────────────────────────

  it("each ToolGeometrySchema has all required interface fields", async () => {
    const r = await getDemoResult();
    r.geometryClasses.forEach(gc => {
      expect(typeof gc.className).toBe("string");
      expect(typeof gc.classId).toBe("number");
      expect(Array.isArray(gc.fields)).toBe(true);
      expect(typeof gc.rowCount).toBe("number");
      expect(gc.sample === null || typeof gc.sample === "object").toBe(true);
    });
  });

  it("CuttingTechSchema has all required interface fields", async () => {
    const r = await getDemoResult();
    expect(typeof r.cuttingTech.materialToolCombinations).toBe("number");
    expect(typeof r.cuttingTech.totalEntries).toBe("number");
    expect(Array.isArray(r.cuttingTech.fields)).toBe(true);
    expect(Array.isArray(r.cuttingTech.sampleEntries)).toBe(true);
  });

  it("all FieldDefinitions have non-empty description strings", async () => {
    const r = await getDemoResult();
    r.geometryClasses[0].fields.forEach(f => {
      expect(typeof f.description).toBe("string");
      expect(f.description.length).toBeGreaterThan(0);
    });
    r.cuttingTech.fields.forEach(f => {
      expect(typeof f.description).toBe("string");
      expect(f.description.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// U-HKC05: HyperMillXmlExtractor — Feature2Job catalogs + PostProcessor config
// =============================================================================

import {
  Feature2JobExtractor,
  PostConfigExtractor,
  HyperMillXmlExtractor,
  hyperMillXmlExtractor,
  feature2JobExtractor,
  postConfigExtractor,
  type Feature2JobCatalog,
  type XmlExtractionResult,
  type PostConfigEntry,
} from "../engines/HyperMillXmlExtractor.js";

// ── Shared extraction result (loaded once for the full suite) ─────────────────

let xmlResult: XmlExtractionResult;

beforeAll(async () => {
  xmlResult = await hyperMillXmlExtractor.extract();
}, 30_000); // generous timeout for 11 large files

// ── Catalog discovery ─────────────────────────────────────────────────────────

describe("HyperMillXmlExtractor — catalog discovery", () => {
  it("discovers and parses all 11 Feature2Job XML files", () => {
    expect(xmlResult.totalCatalogs).toBe(11);
  });

  it("returns no extraction errors for the standard hyperMILL 33.0 paths", () => {
    // Errors array should be empty for a clean install
    expect(xmlResult.errors).toHaveLength(0);
  });

  it("result has correct aggregate totalMappings across all catalogs", () => {
    // Opening-tag counts per file: 552+5+116+9+1+1+1+126+12+133+4 = 960
    expect(xmlResult.totalMappings).toBe(960);
  });

  it("result has correct aggregate totalItems across all catalogs", () => {
    // Items parsed across all 11 catalogs by the engine
    expect(xmlResult.totalItems).toBe(6430);
  });

  it("extractedAt is a valid ISO 8601 timestamp", () => {
    expect(() => new Date(xmlResult.extractedAt)).not.toThrow();
    expect(new Date(xmlResult.extractedAt).toISOString()).toBe(xmlResult.extractedAt);
  });
});

// ── Main catalog structure ────────────────────────────────────────────────────

describe("HyperMillXmlExtractor — main catalog (omFeature2JobCatalog.xml)", () => {
  let mainCatalog: Feature2JobCatalog;

  beforeAll(() => {
    const found = xmlResult.catalogs.find(
      (c) => c.sourceFile === "omFeature2JobCatalog.xml"
    );
    if (!found) throw new Error("Main catalog not found in results");
    mainCatalog = found;
  });

  it("main catalog has catalogName 'openmind'", () => {
    expect(mainCatalog.catalogName).toBe("openmind");
  });

  it("main catalog has exactly 15 groups", () => {
    expect(mainCatalog.groups).toHaveLength(15);
  });

  it("main catalog groups include expected IDs: 2D, 3D, 3DADV, 5XCAV, 5XSRF, BLADE, 5XIMP, TUBE, TURN, PROBING, GRINDING, MACRO, LINKING, LINKINGTURN, NCEVENT", () => {
    const ids = mainCatalog.groups.map((g) => g.id);
    const expected = [
      "PROBING", "GRINDING", "2D", "3D", "3DADV", "5XCAV", "5XSRF",
      "BLADE", "5XIMP", "TUBE", "MACRO", "TURN", "LINKING", "LINKINGTURN", "NCEVENT",
    ];
    for (const id of expected) {
      expect(ids).toContain(id);
    }
  });

  it("main catalog groups have non-empty Name attributes", () => {
    for (const g of mainCatalog.groups) {
      expect(g.name.length).toBeGreaterThan(0);
    }
  });

  it("main catalog has exactly 552 mappings", () => {
    expect(mainCatalog.mappings).toHaveLength(552);
  });

  it("main catalog has exactly 2110 items across all mappings", () => {
    const totalItems = mainCatalog.mappings.reduce((s, m) => s + m.items.length, 0);
    expect(totalItems).toBe(2110);
  });
});

// ── Feature_Type → Job_Type mappings ─────────────────────────────────────────

describe("HyperMillXmlExtractor — Feature_Type to Job_Type mappings", () => {
  let mainCatalog: Feature2JobCatalog;

  beforeAll(() => {
    mainCatalog = xmlResult.catalogs.find(
      (c) => c.sourceFile === "omFeature2JobCatalog.xml"
    )!;
  });

  it("Simple_Hole maps to DRIL (2D Drilling)", () => {
    const drilMapping = mainCatalog.mappings.find(
      (m) => m.featureType === "Simple_Hole" && m.jobType === "DRIL"
    );
    expect(drilMapping).toBeDefined();
    expect(drilMapping!.jobGroup).toBe("2D");
    expect(drilMapping!.jobName).toBe("Dril|2D Drilling");
  });

  it("Simple_Hole also maps to DRX5 (5X Drilling) in group 5XSRF", () => {
    const drx5Mapping = mainCatalog.mappings.find(
      (m) => m.featureType === "Simple_Hole" && m.jobType === "DRX5"
    );
    expect(drx5Mapping).toBeDefined();
    expect(drx5Mapping!.jobGroup).toBe("5XSRF");
  });

  it("Simple_Hole has exactly 10 definitions in main catalog", () => {
    const simpleholeMappings = mainCatalog.mappings.filter(
      (m) => m.featureType === "Simple_Hole"
    );
    expect(simpleholeMappings).toHaveLength(10);
  });

  it("main catalog contains all expected feature types", () => {
    const types = new Set(mainCatalog.mappings.map((m) => m.featureType));
    const expected = [
      "Simple_Hole", "Compound_Feature", "Contour", "Face",
      "Free_Defined_Hole", "Generic_Hole", "Pocket", "Simple_Pocket",
      "Sink_Hole", "Strategy_Curve", "Surface", "Surface_Group", "T_Slot",
    ];
    for (const t of expected) {
      expect(types.has(t)).toBe(true);
    }
  });

  it("every mapping has non-empty featureType and jobType", () => {
    for (const m of mainCatalog.mappings) {
      expect(m.featureType.length).toBeGreaterThan(0);
      expect(m.jobType.length).toBeGreaterThan(0);
    }
  });
});

// ── Feature2Job_Item parsing ──────────────────────────────────────────────────

describe("HyperMillXmlExtractor — Feature2Job_Item parsing", () => {
  it("Feature2Job_Item has correct fields for Simple_Hole → DRIL first item", () => {
    const mainCatalog = xmlResult.catalogs.find(
      (c) => c.sourceFile === "omFeature2JobCatalog.xml"
    )!;
    const drilMapping = mainCatalog.mappings.find(
      (m) => m.featureType === "Simple_Hole" && m.jobType === "DRIL"
    )!;
    const firstItem = drilMapping.items[0];
    expect(firstItem).toBeDefined();
    expect(firstItem.id).toBe("1");
    expect(firstItem.type).toBe("ContourAsPointWithDepth");
    expect(firstItem.jobParameter).toBe("Contour");
    expect(firstItem.expression).toContain("Point=Position");
    expect(firstItem.active).toBe(true);
  });

  it("parses inactive items (Active='0') as active=false", () => {
    const mainCatalog = xmlResult.catalogs.find(
      (c) => c.sourceFile === "omFeature2JobCatalog.xml"
    )!;
    const drilMapping = mainCatalog.mappings.find(
      (m) => m.featureType === "Simple_Hole" && m.jobType === "DRIL"
    )!;
    // Items 3-8 are Active="0" in the DRIL definition
    const inactiveItems = drilMapping.items.filter((i) => !i.active);
    expect(inactiveItems.length).toBeGreaterThan(0);
  });
});

// ── Feature2Job_Variable parsing ──────────────────────────────────────────────

describe("HyperMillXmlExtractor — Feature2Job_Variable parsing", () => {
  it("parses Feature2Job_Variable_rem into variables with isRem=true", () => {
    const mainCatalog = xmlResult.catalogs.find(
      (c) => c.sourceFile === "omFeature2JobCatalog.xml"
    )!;
    const drilMapping = mainCatalog.mappings.find(
      (m) => m.featureType === "Simple_Hole" && m.jobType === "DRIL"
    )!;
    const remVars = drilMapping.variables.filter((v) => v.isRem);
    expect(remVars.length).toBeGreaterThan(0);
    expect(remVars[0].name).toBe("FeatDiameter");
    expect(remVars[0].type).toBe("Real");
  });

  it("parses Feature2Job_Variable (active) with isRem=false", () => {
    const mainCatalog = xmlResult.catalogs.find(
      (c) => c.sourceFile === "omFeature2JobCatalog.xml"
    )!;
    // Find a mapping that has active variables
    const withActiveVars = mainCatalog.mappings.find(
      (m) => m.variables.some((v) => !v.isRem)
    );
    expect(withActiveVars).toBeDefined();
    const activeVars = withActiveVars!.variables.filter((v) => !v.isRem);
    expect(activeVars.length).toBeGreaterThan(0);
    expect(activeVars[0].expression.length).toBeGreaterThan(0);
  });
});

// ── Sub-catalog specifics ─────────────────────────────────────────────────────

describe("HyperMillXmlExtractor — sub-catalog contents", () => {
  it("Drill catalog has exactly 116 definitions", () => {
    const drill = xmlResult.catalogs.find(
      (c) => c.sourceFile === "omFeature2JobCatalog_Drill.xml"
    );
    expect(drill).toBeDefined();
    expect(drill!.mappings).toHaveLength(116);
  });

  it("Drill catalog group ID is 'DRILL'", () => {
    const drill = xmlResult.catalogs.find(
      (c) => c.sourceFile === "omFeature2JobCatalog_Drill.xml"
    )!;
    expect(drill.groups.some((g) => g.id === "DRILL")).toBe(true);
  });

  it("Turn catalog has exactly 12 definitions", () => {
    const turn = xmlResult.catalogs.find(
      (c) => c.sourceFile === "omFeature2JobCatalog_Turn.xml"
    );
    expect(turn).toBeDefined();
    expect(turn!.mappings).toHaveLength(12);
  });

  it("Turn catalog contains TRNR (Rough Turning) job type", () => {
    const turn = xmlResult.catalogs.find(
      (c) => c.sourceFile === "omFeature2JobCatalog_Turn.xml"
    )!;
    expect(turn.mappings.some((m) => m.jobType === "TRNR")).toBe(true);
  });

  it("UDF catalog has exactly 133 definitions", () => {
    const udf = xmlResult.catalogs.find(
      (c) => c.sourceFile === "omFeature2JobCatalog_UDF.xml"
    );
    expect(udf).toBeDefined();
    expect(udf!.mappings).toHaveLength(133);
  });

  it("Tire catalog has exactly 126 definitions", () => {
    const tire = xmlResult.catalogs.find(
      (c) => c.sourceFile === "omFeature2JobCatalog_Tire.xml"
    );
    expect(tire).toBeDefined();
    expect(tire!.mappings).toHaveLength(126);
  });

  it("hFact catalog has exactly 4 definitions", () => {
    const hfact = xmlResult.catalogs.find(
      (c) => c.sourceFile === "omFeature2JobCatalog_hFact.xml"
    );
    expect(hfact).toBeDefined();
    expect(hfact!.mappings).toHaveLength(4);
  });

  it("Blade catalog has exactly 5 definitions", () => {
    const blade = xmlResult.catalogs.find(
      (c) => c.sourceFile === "omFeature2JobCatalog_Blade.xml"
    );
    expect(blade).toBeDefined();
    expect(blade!.mappings).toHaveLength(5);
  });
});

// ── PostConfigExtractor ───────────────────────────────────────────────────────

describe("PostConfigExtractor — omPPFC.cfg parsing", () => {
  it("extracts exactly 4 PostConfig entries from omPPFC.cfg", () => {
    expect(xmlResult.postConfig).toHaveLength(4);
  });

  it("first entry is *cwArcZ with ncCode 702", () => {
    const entry = xmlResult.postConfig.find((e) => e.code === "*cwArcZ");
    expect(entry).toBeDefined();
    expect(entry!.ncCode).toBe("702");
    expect(entry!.description).toBe("helix or arc with z");
  });

  it("second entry is *ccwArcZ with ncCode 702", () => {
    const entry = xmlResult.postConfig.find((e) => e.code === "*ccwArcZ");
    expect(entry).toBeDefined();
    expect(entry!.ncCode).toBe("702");
  });

  it("coolantOff entry has ncCode 703", () => {
    const entry = xmlResult.postConfig.find((e) => e.code === "*coolantOff");
    expect(entry).toBeDefined();
    expect(entry!.ncCode).toBe("703");
    expect(entry!.description).toBe("coolant");
  });

  it("setSpindleSpeed entry has ncCode 704", () => {
    const entry = xmlResult.postConfig.find((e) => e.code === "*setSpindleSpeed");
    expect(entry).toBeDefined();
    expect(entry!.ncCode).toBe("704");
    expect(entry!.description).toBe("spindle speed inside toolpath");
  });

  it("all PostConfig entries have non-empty code, ncCode, and description", () => {
    for (const e of xmlResult.postConfig) {
      expect(e.code.length).toBeGreaterThan(0);
      expect(e.ncCode.length).toBeGreaterThan(0);
      expect(e.description.length).toBeGreaterThan(0);
    }
  });
});

// ── PostConfigExtractor.parse unit tests ─────────────────────────────────────

describe("PostConfigExtractor.parse — unit tests", () => {
  const extractor = new PostConfigExtractor();

  it("parses a standard *code ncCode,description line", () => {
    const entries = extractor.parse("  *cwArcZ            702,helix or arc with z\n");
    expect(entries).toHaveLength(1);
    expect(entries[0].code).toBe("*cwArcZ");
    expect(entries[0].ncCode).toBe("702");
    expect(entries[0].description).toBe("helix or arc with z");
  });

  it("skips lines starting with #", () => {
    const entries = extractor.parse("# this is a comment\n  *cwArcZ  702,test");
    expect(entries).toHaveLength(1);
  });

  it("skips blank lines", () => {
    const entries = extractor.parse("\n\n  *cwArcZ  702,test\n\n");
    expect(entries).toHaveLength(1);
  });

  it("returns empty array for content with only comments", () => {
    const entries = extractor.parse("#---\n# comment\n#---");
    expect(entries).toHaveLength(0);
  });
});

// ── Feature2JobExtractor.parseItem unit tests ─────────────────────────────────

describe("Feature2JobExtractor.parseItem — unit tests", () => {
  const extractor = new Feature2JobExtractor();

  it("parses a simple Item line with all attributes", () => {
    const line = '         <Feature2Job_Item ID="1" Name="GeoHole|Geometry of hole" Type="ContourAsPointWithDepth" Job_Parameter="Contour" Expression="Point=Position;Depth=Depth" Active="1">&lt;Hole&gt;</Feature2Job_Item>';
    const item = extractor.parseItem(line);
    expect(item).not.toBeNull();
    expect(item!.id).toBe("1");
    expect(item!.name).toBe("GeoHole|Geometry of hole");
    expect(item!.type).toBe("ContourAsPointWithDepth");
    expect(item!.jobParameter).toBe("Contour");
    expect(item!.expression).toBe("Point=Position;Depth=Depth");
    expect(item!.active).toBe(true);
  });

  it("parses an Item with Active='0' as active=false", () => {
    const line = '         <Feature2Job_Item ID="3" Name="GeoThread|Geometry" Type="ContourAsPointWithDepth" Job_Parameter="Contour" Expression="Point=Position" Active="0">';
    const item = extractor.parseItem(line);
    expect(item).not.toBeNull();
    expect(item!.active).toBe(false);
  });

  it("parses an Item with string ID like 'TS_1'", () => {
    const line = '         <Feature2Job_Item ID="TS_1" Name="GeoTSpotDepth|Spot depth" Type="ContourAsCircleWithDepth" Job_Parameter="Contour" Expression="Point=Position" Active="1">';
    const item = extractor.parseItem(line);
    expect(item).not.toBeNull();
    expect(item!.id).toBe("TS_1");
  });

  it("returns null for a line with no ID or Type", () => {
    const item = extractor.parseItem("  <SomeOtherElement Foo=\"bar\" />");
    expect(item).toBeNull();
  });
});

// ── Graceful error handling ───────────────────────────────────────────────────

describe("HyperMillXmlExtractor — graceful error handling", () => {
  it("Feature2JobExtractor.extractAll records error for missing directory, does not throw", async () => {
    const extractor = new Feature2JobExtractor("H:/nonexistent/path/xyz");
    await expect(extractor.extractAll()).rejects.toThrow(
      "Feature2JobExtractor: cannot read directory"
    );
  });

  it("PostConfigExtractor.extract returns empty entries + error for missing file", async () => {
    const extractor = new PostConfigExtractor("H:/nonexistent/omPPFC.cfg");
    const result = await extractor.extract();
    expect(result.entries).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("PostConfigExtractor: cannot read");
  });
});

// ── Singleton exports ─────────────────────────────────────────────────────────

describe("HyperMillXmlExtractor — singleton exports", () => {
  it("feature2JobExtractor is an instance of Feature2JobExtractor", () => {
    expect(feature2JobExtractor).toBeInstanceOf(Feature2JobExtractor);
  });

  it("postConfigExtractor is an instance of PostConfigExtractor", () => {
    expect(postConfigExtractor).toBeInstanceOf(PostConfigExtractor);
  });

  it("hyperMillXmlExtractor is an instance of HyperMillXmlExtractor", () => {
    expect(hyperMillXmlExtractor).toBeInstanceOf(HyperMillXmlExtractor);
  });
});

// =============================================================================
// U-HKC04: HyperMillIMDbExtractor — IMToolDbExtractor + IMMacroDbExtractor
// =============================================================================

import {
  IMToolDbExtractor,
  IMMacroDbExtractor,
  imToolDbExtractor,
  imMacroDbExtractor,
  type IMToolDbResult,
  type IMMacroDbResult,
} from "../engines/HyperMillIMDbExtractor.js";

const IM_TOOL_DB_PATH =
  "H:/prism/HYPERMILL/hyperMILL/33.0/AddIns/hmAutoColor/Wizards/AutomationCenter/DATABASE/INTELLIGENT_MACRO/IM_Tool_DB_V2023.1.db";
const IM_MACRO_DB_PATH =
  "H:/prism/HYPERMILL/hyperMILL/33.0/AddIns/hmAutoColor/Wizards/AutomationCenter/DATABASE/INTELLIGENT_MACRO/IM_Macro_DB.db";

const IM_TOOL_DB_AVAILABLE = fs.existsSync(IM_TOOL_DB_PATH);
const IM_MACRO_DB_AVAILABLE = fs.existsSync(IM_MACRO_DB_PATH);

// Cache results to avoid repeated DB opens
let _imToolResult: IMToolDbResult | null = null;
let _imMacroResult: IMMacroDbResult | null = null;

async function getIMToolResult(): Promise<IMToolDbResult> {
  if (!_imToolResult) {
    _imToolResult = await imToolDbExtractor.extract();
  }
  return _imToolResult;
}

async function getIMMacroResult(): Promise<IMMacroDbResult> {
  if (!_imMacroResult) {
    _imMacroResult = await imMacroDbExtractor.extract();
  }
  return _imMacroResult;
}

// ── Singleton exports ──────────────────────────────────────────────────────────

describe("IMToolDbExtractor — singleton export", () => {
  it("imToolDbExtractor is an instance of IMToolDbExtractor", () => {
    expect(imToolDbExtractor).toBeInstanceOf(IMToolDbExtractor);
  });

  it("extract() returns a Promise", () => {
    const p = imToolDbExtractor.extract();
    expect(p).toBeInstanceOf(Promise);
    return p;
  });
});

describe("IMMacroDbExtractor — singleton export", () => {
  it("imMacroDbExtractor is an instance of IMMacroDbExtractor", () => {
    expect(imMacroDbExtractor).toBeInstanceOf(IMMacroDbExtractor);
  });

  it("extract() returns a Promise", () => {
    const p = imMacroDbExtractor.extract();
    expect(p).toBeInstanceOf(Promise);
    return p;
  });
});

// ── Graceful fallback — missing DB files ─────────────────────────────────────

describe("IMToolDbExtractor — graceful fallback", () => {
  it("returns status=missing when path does not exist", async () => {
    const ex = new IMToolDbExtractor("/nonexistent/path/IM_Tool_DB.db");
    const r = await ex.extract();
    expect(r.status).toBe("missing");
    expect(r.error).toContain("not found");
    expect(r.materials).toHaveLength(0);
    expect(r.cuttingMaterials).toHaveLength(0);
    expect(r.formulas).toHaveLength(0);
    expect(r.matTechCount).toBe(0);
    expect(r.matTechItemCount).toBe(0);
    expect(r.tables).toHaveLength(0);
  });

  it("returns valid ISO timestamp even on missing DB", async () => {
    const ex = new IMToolDbExtractor("/nonexistent/path/IM_Tool_DB.db");
    const r = await ex.extract();
    expect(r.extractedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe("IMMacroDbExtractor — graceful fallback", () => {
  it("returns status=missing when path does not exist", async () => {
    const ex = new IMMacroDbExtractor("/nonexistent/path/IM_Macro_DB.db");
    const r = await ex.extract();
    expect(r.status).toBe("missing");
    expect(r.error).toContain("not found");
    expect(r.tables).toHaveLength(0);
    expect(r.macroTypes).toHaveLength(0);
    expect(r.macros).toHaveLength(0);
    expect(r.jobs).toHaveLength(0);
    expect(r.macroCount).toBe(0);
  });

  it("returns unknown version and valid timestamp on missing DB", async () => {
    const ex = new IMMacroDbExtractor("/nonexistent/path/IM_Macro_DB.db");
    const r = await ex.extract();
    expect(r.version).toBe("unknown");
    expect(r.extractedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

// ── Live IM_Tool_DB tests ─────────────────────────────────────────────────────

describe.runIf(IM_TOOL_DB_AVAILABLE)("IMToolDbExtractor — live IM_Tool_DB_V2023.1.db", () => {

  it("extraction returns status=success", async () => {
    const r = await getIMToolResult();
    expect(r.status).toBe("success");
    expect(r.error).toBeUndefined();
  });

  it("extractedAt is a valid ISO 8601 timestamp", async () => {
    const r = await getIMToolResult();
    expect(r.extractedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  // ── Materials ────────────────────────────────────────────────────────────────

  it("has exactly 3 workpiece materials", async () => {
    const r = await getIMToolResult();
    expect(r.materials).toHaveLength(3);
  });

  it("material id=1 is 16MnCr5 (steel alloy)", async () => {
    const r = await getIMToolResult();
    const mat = r.materials.find((m) => m.id === 1);
    expect(mat).toBeDefined();
    expect(mat!.name).toBe("16MnCr5");
  });

  it("material id=2 is AlZnMg (aluminum alloy)", async () => {
    const r = await getIMToolResult();
    const mat = r.materials.find((m) => m.id === 2);
    expect(mat).toBeDefined();
    expect(mat!.name).toBe("AlZnMg");
  });

  it("material id=3 is VA (stainless steel)", async () => {
    const r = await getIMToolResult();
    const mat = r.materials.find((m) => m.id === 3);
    expect(mat).toBeDefined();
    expect(mat!.name).toBe("VA");
  });

  it("materials are ordered by id ascending", async () => {
    const r = await getIMToolResult();
    for (let i = 1; i < r.materials.length; i++) {
      expect(r.materials[i].id).toBeGreaterThan(r.materials[i - 1].id);
    }
  });

  // ── CuttingMaterials ─────────────────────────────────────────────────────────

  it("has exactly 10 cutting materials", async () => {
    const r = await getIMToolResult();
    expect(r.cuttingMaterials).toHaveLength(10);
  });

  it("cutting material id=1 is VHM_Fräsen (solid carbide milling)", async () => {
    const r = await getIMToolResult();
    const cm = r.cuttingMaterials.find((c) => c.id === 1);
    expect(cm).toBeDefined();
    expect(cm!.name).toBe("VHM_Fräsen");
  });

  it("cutting material id=3 is HSS_Gewindebohrer (HSS taps)", async () => {
    const r = await getIMToolResult();
    const cm = r.cuttingMaterials.find((c) => c.id === 3);
    expect(cm).toBeDefined();
    expect(cm!.name).toBe("HSS_Gewindebohrer");
  });

  it("cutting material id=5 is HSS_Bohrer (HSS drills)", async () => {
    const r = await getIMToolResult();
    const cm = r.cuttingMaterials.find((c) => c.id === 5);
    expect(cm).toBeDefined();
    expect(cm!.name).toBe("HSS_Bohrer");
  });

  it("cutting material id=10 is Solid carbide (English name)", async () => {
    const r = await getIMToolResult();
    const cm = r.cuttingMaterials.find((c) => c.id === 10);
    expect(cm).toBeDefined();
    expect(cm!.name).toBe("Solid carbide");
  });

  it("cutting materials include VHM_Kugelfräser and Tonnenfräser types", async () => {
    const r = await getIMToolResult();
    const names = r.cuttingMaterials.map((c) => c.name);
    expect(names).toContain("VHM_Kugelfräser");
    expect(names).toContain("Tonnenfräser");
  });

  // ── Formulas ─────────────────────────────────────────────────────────────────

  it("has exactly 14 formulas", async () => {
    const r = await getIMToolResult();
    expect(r.formulas).toHaveLength(14);
  });

  it("formula id=1 is fS with spindle speed formula (Vc*1000)/(d*pi)", async () => {
    const r = await getIMToolResult();
    const f = r.formulas.find((fm) => fm.id === 1);
    expect(f).toBeDefined();
    expect(f!.name).toBe("fS");
    expect(f!.formula).toBe("(Vc*1000)/(d*pi)");
  });

  it("formula id=3 is fF (table feedrate fz*z*n)", async () => {
    const r = await getIMToolResult();
    const f = r.formulas.find((fm) => fm.id === 3);
    expect(f).toBeDefined();
    expect(f!.name).toBe("fF");
    expect(f!.formula).toBe("fz*z*n");
  });

  it("formula id=6 is fFBohren (drilling feed f*n)", async () => {
    const r = await getIMToolResult();
    const f = r.formulas.find((fm) => fm.id === 6);
    expect(f).toBeDefined();
    expect(f!.name).toBe("fFBohren");
    expect(f!.formula).toBe("f*n");
  });

  it("formula id=13 is VcHDC (HDC cutting speed formula with pow exponent)", async () => {
    const r = await getIMToolResult();
    const f = r.formulas.find((fm) => fm.id === 13);
    expect(f).toBeDefined();
    expect(f!.name).toBe("VcHDC");
    expect(f!.formula).toContain("VcRef");
    expect(f!.formula).toContain("pow");
  });

  it("all formula entries have non-empty name and formula strings", async () => {
    const r = await getIMToolResult();
    for (const f of r.formulas) {
      expect(typeof f.name).toBe("string");
      expect(f.name.length).toBeGreaterThan(0);
      expect(typeof f.formula).toBe("string");
      expect(f.formula.length).toBeGreaterThan(0);
    }
  });

  // ── MatTech counts ───────────────────────────────────────────────────────────

  it("matTechCount is exactly 18", async () => {
    const r = await getIMToolResult();
    expect(r.matTechCount).toBe(18);
  });

  it("matTechItemCount is exactly 102", async () => {
    const r = await getIMToolResult();
    expect(r.matTechItemCount).toBe(102);
  });

  it("total column count across all tables is >= 500 (exit criterion: 500 unique parameters)", async () => {
    const r = await getIMToolResult();
    const totalParams = r.tables.reduce((acc, t) => acc + t.columns.length, 0);
    expect(totalParams).toBeGreaterThanOrEqual(500);
  });

  // ── Table inventory ──────────────────────────────────────────────────────────

  it("tables array has exactly 56 entries", async () => {
    const r = await getIMToolResult();
    expect(r.tables).toHaveLength(56);
  });

  it("tables include Materials, CuttingMaterials, Formulas, MatTechs, MatTechItems", async () => {
    const r = await getIMToolResult();
    const names = r.tables.map((t) => t.name);
    expect(names).toContain("Materials");
    expect(names).toContain("CuttingMaterials");
    expect(names).toContain("Formulas");
    expect(names).toContain("MatTechs");
    expect(names).toContain("MatTechItems");
  });

  it("tables include Technologies, Tools, NCTools, Holders from the tool assembly schema", async () => {
    const r = await getIMToolResult();
    const names = r.tables.map((t) => t.name);
    expect(names).toContain("Technologies");
    expect(names).toContain("Tools");
    expect(names).toContain("NCTools");
    expect(names).toContain("Holders");
  });

  it("Materials table row count is 3", async () => {
    const r = await getIMToolResult();
    const mat = r.tables.find((t) => t.name === "Materials");
    expect(mat).toBeDefined();
    expect(mat!.rowCount).toBe(3);
  });

  it("MatTechs table row count is 18", async () => {
    const r = await getIMToolResult();
    const mt = r.tables.find((t) => t.name === "MatTechs");
    expect(mt).toBeDefined();
    expect(mt!.rowCount).toBe(18);
  });

  it("MatTechItems table row count is 102", async () => {
    const r = await getIMToolResult();
    const mti = r.tables.find((t) => t.name === "MatTechItems");
    expect(mti).toBeDefined();
    expect(mti!.rowCount).toBe(102);
  });

  it("NCTools table has 1371 rows", async () => {
    const r = await getIMToolResult();
    const nc = r.tables.find((t) => t.name === "NCTools");
    expect(nc).toBeDefined();
    expect(nc!.rowCount).toBe(1371);
  });

  it("Formulas table row count is 14", async () => {
    const r = await getIMToolResult();
    const ft = r.tables.find((t) => t.name === "Formulas");
    expect(ft).toBeDefined();
    expect(ft!.rowCount).toBe(14);
  });

  it("all tables have non-empty columns arrays", async () => {
    const r = await getIMToolResult();
    for (const t of r.tables) {
      expect(Array.isArray(t.columns)).toBe(true);
      expect(t.columns.length).toBeGreaterThan(0);
    }
  });

  it("MatTechItems columns include limiting_diameter, cutting_speed, feedrate_per_edge, drilling_feedrate", async () => {
    const r = await getIMToolResult();
    const mti = r.tables.find((t) => t.name === "MatTechItems");
    expect(mti!.columns).toContain("limiting_diameter");
    expect(mti!.columns).toContain("cutting_speed");
    expect(mti!.columns).toContain("feedrate_per_edge");
    expect(mti!.columns).toContain("drilling_feedrate");
  });

  it("all tables have non-negative rowCount", async () => {
    const r = await getIMToolResult();
    for (const t of r.tables) {
      expect(t.rowCount).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── Live IM_Macro_DB tests ────────────────────────────────────────────────────

describe.runIf(IM_MACRO_DB_AVAILABLE)("IMMacroDbExtractor — live IM_Macro_DB.db", () => {

  it("extraction returns status=success", async () => {
    const r = await getIMMacroResult();
    expect(r.status).toBe("success");
    expect(r.error).toBeUndefined();
  });

  it("extractedAt is a valid ISO 8601 timestamp", async () => {
    const r = await getIMMacroResult();
    expect(r.extractedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  // ── Version ──────────────────────────────────────────────────────────────────

  it("database version is 21.0", async () => {
    const r = await getIMMacroResult();
    expect(r.version).toBe("21.0");
  });

  // ── MacroTypes ───────────────────────────────────────────────────────────────

  it("has exactly 7 macro types", async () => {
    const r = await getIMMacroResult();
    expect(r.macroTypes).toHaveLength(7);
  });

  it("macro type id=16 is HOLE", async () => {
    const r = await getIMMacroResult();
    const mt = r.macroTypes.find((t) => t.id === 16);
    expect(mt).toBeDefined();
    expect(mt!.name).toBe("HOLE");
  });

  it("macro type id=17 is SINK1", async () => {
    const r = await getIMMacroResult();
    const mt = r.macroTypes.find((t) => t.id === 17);
    expect(mt).toBeDefined();
    expect(mt!.name).toBe("SINK1");
  });

  it("macro type id=22 is BACKSINK3 (last type)", async () => {
    const r = await getIMMacroResult();
    const mt = r.macroTypes.find((t) => t.id === 22);
    expect(mt).toBeDefined();
    expect(mt!.name).toBe("BACKSINK3");
  });

  it("all 7 macro type names are present: HOLE, SINK1-3, BACKSINK1-3", async () => {
    const r = await getIMMacroResult();
    const names = r.macroTypes.map((t) => t.name);
    expect(names).toContain("HOLE");
    expect(names).toContain("SINK1");
    expect(names).toContain("SINK2");
    expect(names).toContain("SINK3");
    expect(names).toContain("BACKSINK1");
    expect(names).toContain("BACKSINK2");
    expect(names).toContain("BACKSINK3");
  });

  it("macro types are ordered by id ascending", async () => {
    const r = await getIMMacroResult();
    for (let i = 1; i < r.macroTypes.length; i++) {
      expect(r.macroTypes[i].id).toBeGreaterThan(r.macroTypes[i - 1].id);
    }
  });

  // ── Macros ───────────────────────────────────────────────────────────────────

  it("macroCount is exactly 7", async () => {
    const r = await getIMMacroResult();
    expect(r.macroCount).toBe(7);
  });

  it("macros array length matches macroCount", async () => {
    const r = await getIMMacroResult();
    expect(r.macros).toHaveLength(r.macroCount);
  });

  it("all macros have Usage=Feature", async () => {
    const r = await getIMMacroResult();
    for (const m of r.macros) {
      expect(m.usage).toBe("Feature");
    }
  });

  it("macro types present include HOLE and SINK1 variants", async () => {
    const r = await getIMMacroResult();
    const types = r.macros.map((m) => m.type);
    expect(types).toContain("HOLE");
    expect(types).toContain("SINK1");
  });

  it("all macro entries have non-empty id strings (GUID format)", async () => {
    const r = await getIMMacroResult();
    for (const m of r.macros) {
      expect(typeof m.id).toBe("string");
      expect(m.id.length).toBeGreaterThan(0);
      // GUIDs are 36 chars: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      expect(m.id).toMatch(/^[0-9A-F-]+$/i);
    }
  });

  // ── Jobs ─────────────────────────────────────────────────────────────────────

  it("has exactly 8 jobs", async () => {
    const r = await getIMMacroResult();
    expect(r.jobs).toHaveLength(8);
  });

  it("first job (JobKey=586) is DdrX5 Simple Drilling with ToolType=5 and ToolDiameter=10", async () => {
    const r = await getIMMacroResult();
    const job = r.jobs.find((j) => j.jobKey === 586);
    expect(job).toBeDefined();
    expect(job!.systemJobType).toBe("DdrX5");
    expect(job!.toolType).toBe(5);
    expect(job!.toolDiameter).toBe(10);
  });

  it("DmdX5 Helical Drilling jobs have ToolType=2 (endmill)", async () => {
    const r = await getIMMacroResult();
    const helicalJobs = r.jobs.filter((j) => j.systemJobType === "DmdX5");
    expect(helicalJobs.length).toBeGreaterThanOrEqual(6);
    for (const j of helicalJobs) {
      expect(j.toolType).toBe(2);
    }
  });

  it("last job (JobKey=602) is DrmX5 Reaming with ToolType=-1 (any tool)", async () => {
    const r = await getIMMacroResult();
    const job = r.jobs.find((j) => j.jobKey === 602);
    expect(job).toBeDefined();
    expect(job!.systemJobType).toBe("DrmX5");
    expect(job!.toolType).toBe(-1);
    expect(job!.toolDiameter).toBe(0);
  });

  it("all job entries have numeric jobKey, toolType, and toolDiameter", async () => {
    const r = await getIMMacroResult();
    for (const j of r.jobs) {
      expect(typeof j.jobKey).toBe("number");
      expect(typeof j.toolType).toBe("number");
      expect(typeof j.toolDiameter).toBe("number");
    }
  });

  // ── Table inventory ──────────────────────────────────────────────────────────

  it("tables array has exactly 12 entries", async () => {
    const r = await getIMMacroResult();
    expect(r.tables).toHaveLength(12);
  });

  it("tables include Feature, Job, Macro, MacroType, Material, Properties", async () => {
    const r = await getIMMacroResult();
    const names = r.tables.map((t) => t.name);
    expect(names).toContain("Feature");
    expect(names).toContain("Job");
    expect(names).toContain("Macro");
    expect(names).toContain("MacroType");
    expect(names).toContain("Material");
    expect(names).toContain("Properties");
  });

  it("Macro table has rowCount=7", async () => {
    const r = await getIMMacroResult();
    const t = r.tables.find((tb) => tb.name === "Macro");
    expect(t).toBeDefined();
    expect(t!.rowCount).toBe(7);
  });

  it("MacroType table has rowCount=7", async () => {
    const r = await getIMMacroResult();
    const t = r.tables.find((tb) => tb.name === "MacroType");
    expect(t).toBeDefined();
    expect(t!.rowCount).toBe(7);
  });

  it("Job table has rowCount=8", async () => {
    const r = await getIMMacroResult();
    const t = r.tables.find((tb) => tb.name === "Job");
    expect(t).toBeDefined();
    expect(t!.rowCount).toBe(8);
  });

  it("Macro table columns include ID, Name, Type, Usage", async () => {
    const r = await getIMMacroResult();
    const t = r.tables.find((tb) => tb.name === "Macro");
    expect(t!.columns).toContain("ID");
    expect(t!.columns).toContain("Name");
    expect(t!.columns).toContain("Type");
    expect(t!.columns).toContain("Usage");
  });

  it("Job table columns include JobKey, SystemJobType, JobType, ToolType, ToolDiameter", async () => {
    const r = await getIMMacroResult();
    const t = r.tables.find((tb) => tb.name === "Job");
    expect(t!.columns).toContain("JobKey");
    expect(t!.columns).toContain("SystemJobType");
    expect(t!.columns).toContain("JobType");
    expect(t!.columns).toContain("ToolType");
    expect(t!.columns).toContain("ToolDiameter");
  });

  it("all tables have non-negative rowCount", async () => {
    const r = await getIMMacroResult();
    for (const t of r.tables) {
      expect(t.rowCount).toBeGreaterThanOrEqual(0);
    }
  });
});


// =============================================================================
// U-HKC06: HyperMillSchemaUnifier -- master parameter catalog
// =============================================================================

import {
  HyperMillSchemaUnifier,
  hyperMillSchemaUnifier,
  type UnifiedParameter,
  type ParameterCatalog,
} from "../engines/HyperMillSchemaUnifier.js";
import * as fsUnifier from "node:fs/promises";

// Shared catalog (run once for the whole suite)

let masterCatalog: ParameterCatalog;

beforeAll(async () => {
  masterCatalog = await hyperMillSchemaUnifier.unify();
}, 120_000);

// Core counts

describe("HyperMillSchemaUnifier -- parameter counts", () => {
  it("produces at least 7,500 unique parameters", () => {
    expect(masterCatalog.totalParameters).toBeGreaterThan(7500);
  });

  it("totalParameters matches parameters array length", () => {
    expect(masterCatalog.parameters).toHaveLength(masterCatalog.totalParameters);
  });

  it("totalParameters matches sum of domain counts", () => {
    const domainSum = Object.values(masterCatalog.domains).reduce((a, b) => a + b, 0);
    expect(domainSum).toBe(masterCatalog.totalParameters);
  });
});

// Domain completeness

describe("HyperMillSchemaUnifier -- all 7 domains present", () => {
  const REQUIRED_DOMAINS = [
    "CAM-Cycle",
    "Cycle-Mapping",
    "Tool-Geometry",
    "Cutting-Tech",
    "Macro",
    "Feature-Job",
    "Post-Config",
  ] as const;

  for (const domain of REQUIRED_DOMAINS) {
    it(`domain "${domain}" is present with at least 1 parameter`, () => {
      expect(masterCatalog.domains[domain]).toBeGreaterThanOrEqual(1);
    });
  }

  it("CAM-Cycle domain has more than 7,000 parameters", () => {
    expect(masterCatalog.domains["CAM-Cycle"]).toBeGreaterThan(7000);
  });

  it("Cycle-Mapping domain has at least 100 parameters", () => {
    expect(masterCatalog.domains["Cycle-Mapping"]).toBeGreaterThanOrEqual(100);
  });

  it("Feature-Job domain has at least 100 parameters", () => {
    expect(masterCatalog.domains["Feature-Job"]).toBeGreaterThanOrEqual(100);
  });
});

// ID uniqueness and format

describe("HyperMillSchemaUnifier -- canonical ID integrity", () => {
  it("all IDs match HM-P-XXXXX format (5-digit padded, up to 99,999)", () => {
    const re = /^HM-P-\d{5}$/;
    for (const p of masterCatalog.parameters) {
      expect(p.id).toMatch(re);
    }
  });

  it("no duplicate IDs exist", () => {
    const ids = masterCatalog.parameters.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("first parameter ID is HM-P-00001", () => {
    expect(masterCatalog.parameters[0].id).toBe("HM-P-00001");
  });

  it("last parameter ID matches totalParameters count", () => {
    const last = masterCatalog.parameters[masterCatalog.parameters.length - 1];
    const expected = `HM-P-${String(masterCatalog.totalParameters).padStart(5, "0")}`;
    expect(last.id).toBe(expected);
  });
});

// Parameter field completeness

describe("HyperMillSchemaUnifier -- required fields on every parameter", () => {
  it("every parameter has a non-empty id", () => {
    for (const p of masterCatalog.parameters) {
      expect(p.id.length).toBeGreaterThan(0);
    }
  });

  it("every parameter has a non-empty name", () => {
    for (const p of masterCatalog.parameters) {
      expect(p.name.length).toBeGreaterThan(0);
    }
  });

  it("every parameter has a valid domain value", () => {
    const valid = new Set([
      "CAM-Cycle", "Cycle-Mapping", "Tool-Geometry", "Cutting-Tech",
      "Macro", "Feature-Job", "Post-Config",
    ]);
    for (const p of masterCatalog.parameters) {
      expect(valid.has(p.domain)).toBe(true);
    }
  });

  it("every parameter has a non-empty type", () => {
    for (const p of masterCatalog.parameters) {
      expect(p.type.length).toBeGreaterThan(0);
    }
  });

  it("every parameter has a non-empty description", () => {
    for (const p of masterCatalog.parameters) {
      expect(p.description.length).toBeGreaterThan(0);
    }
  });

  it("every parameter has a valid source value", () => {
    const valid = new Set([
      "metric-cfg", "omcycles", "demo-db", "im-tool-db",
      "im-macro-db", "feature2job", "post-config",
    ]);
    for (const p of masterCatalog.parameters) {
      expect(valid.has(p.source)).toBe(true);
    }
  });
});

// Sources summary

describe("HyperMillSchemaUnifier -- sources summary correctness", () => {
  it("metricCfg.files is at least 100 cfg files", () => {
    expect(masterCatalog.sources.metricCfg.files).toBeGreaterThan(100);
  });

  it("metricCfg.params is at least 7,000", () => {
    expect(masterCatalog.sources.metricCfg.params).toBeGreaterThan(7000);
  });

  it("omCycles.mappings is 150", () => {
    expect(masterCatalog.sources.omCycles.mappings).toBe(150);
  });

  it("feature2Job.catalogs is at least 1", () => {
    expect(masterCatalog.sources.feature2Job.catalogs).toBeGreaterThanOrEqual(1);
  });

  it("feature2Job.mappings is at least 100", () => {
    expect(masterCatalog.sources.feature2Job.mappings).toBeGreaterThanOrEqual(100);
  });
});

// Sort order

describe("HyperMillSchemaUnifier -- sort order", () => {
  it("all CAM-Cycle parameters come before Cycle-Mapping parameters", () => {
    const domains = masterCatalog.parameters.map((p) => p.domain);
    const lastCamCycle = domains.lastIndexOf("CAM-Cycle");
    const firstCycleMapping = domains.indexOf("Cycle-Mapping");
    if (firstCycleMapping !== -1 && lastCamCycle !== -1) {
      expect(lastCamCycle).toBeLessThan(firstCycleMapping);
    }
  });

  it("all Feature-Job parameters come before Post-Config parameters", () => {
    const domains = masterCatalog.parameters.map((p) => p.domain);
    const lastFeatureJob = domains.lastIndexOf("Feature-Job");
    const firstPostConfig = domains.indexOf("Post-Config");
    if (firstPostConfig !== -1 && lastFeatureJob !== -1) {
      expect(lastFeatureJob).toBeLessThan(firstPostConfig);
    }
  });
});

// CAM-Cycle spot checks

describe("HyperMillSchemaUnifier -- CAM-Cycle spot checks", () => {
  let camCycleParams: UnifiedParameter[];

  beforeAll(() => {
    camCycleParams = masterCatalog.parameters.filter((p) => p.domain === "CAM-Cycle");
  });

  it("all CAM-Cycle params have source metric-cfg", () => {
    for (const p of camCycleParams) {
      expect(p.source).toBe("metric-cfg");
    }
  });

  it("CAM-Cycle params have a sourceFile ending in .CFG or .cfg", () => {
    const sample = camCycleParams.slice(0, 50);
    for (const p of sample) {
      expect(p.sourceFile?.toUpperCase()).toMatch(/\.CFG$/);
    }
  });

  it("CAM-Cycle params have a cycleType defined", () => {
    const sample = camCycleParams.slice(0, 50);
    for (const p of sample) {
      expect(p.cycleType).toBeDefined();
      expect((p.cycleType ?? "").length).toBeGreaterThan(0);
    }
  });
});

// Cycle-Mapping spot checks

describe("HyperMillSchemaUnifier -- Cycle-Mapping spot checks", () => {
  let cycleMappingParams: UnifiedParameter[];

  beforeAll(() => {
    cycleMappingParams = masterCatalog.parameters.filter((p) => p.domain === "Cycle-Mapping");
  });

  it("all Cycle-Mapping params have source omcycles", () => {
    for (const p of cycleMappingParams) {
      expect(p.source).toBe("omcycles");
    }
  });

  it("Cycle-Mapping params include the Drilling entry", () => {
    const drilling = cycleMappingParams.find((p) => p.name === "Drilling");
    expect(drilling).toBeDefined();
    expect(drilling!.defaultValue).toBe("DR:Drilling");
  });
});

// Catalog metadata

describe("HyperMillSchemaUnifier -- catalog metadata", () => {
  it("version is 1.0.0", () => {
    expect(masterCatalog.version).toBe("1.0.0");
  });

  it("generatedAt is a valid ISO 8601 timestamp", () => {
    const d = new Date(masterCatalog.generatedAt);
    expect(d.toISOString()).toBe(masterCatalog.generatedAt);
  });
});

// Deduplication correctness

describe("HyperMillSchemaUnifier -- deduplication", () => {
  it("deduplicateParameters removes duplicate (domain, name) pairs", () => {
    const unifier = new HyperMillSchemaUnifier();
    const input: UnifiedParameter[] = [
      { id: "", name: "FOO", domain: "CAM-Cycle", type: "numeric", description: "first", source: "metric-cfg" },
      { id: "", name: "FOO", domain: "CAM-Cycle", type: "numeric", description: "duplicate", source: "metric-cfg" },
      { id: "", name: "FOO", domain: "Cycle-Mapping", type: "text", description: "different domain", source: "omcycles" },
    ];
    const result = unifier.deduplicateParameters(input);
    expect(result).toHaveLength(2);
    expect(result[0].description).toBe("first");
    expect(result[1].domain).toBe("Cycle-Mapping");
  });

  it("no dedup key is duplicated in the master catalog", () => {
    // CAM-Cycle dedup key includes cycleType (same param name is valid across cycles).
    // All other domains use (domain, name).
    const seen = new Set<string>();
    for (const p of masterCatalog.parameters) {
      const key = p.domain === "CAM-Cycle"
        ? p.domain + "\0" + (p.cycleType ?? "") + "\0" + p.name
        : p.domain + "\0" + p.name;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});

// assignIds correctness

describe("HyperMillSchemaUnifier -- assignIds", () => {
  it("assigns sequential IDs starting from HM-P-00001", () => {
    const unifier = new HyperMillSchemaUnifier();
    const params: UnifiedParameter[] = [
      { id: "", name: "A", domain: "CAM-Cycle", type: "text", description: "a", source: "metric-cfg" },
      { id: "", name: "B", domain: "CAM-Cycle", type: "text", description: "b", source: "metric-cfg" },
      { id: "", name: "C", domain: "Macro", type: "text", description: "c", source: "im-macro-db" },
    ];
    unifier.assignIds(params);
    expect(params[0].id).toBe("HM-P-00001");
    expect(params[1].id).toBe("HM-P-00002");
    expect(params[2].id).toBe("HM-P-00003");
  });

  it("pads IDs to 5 digits for indexes 1-10", () => {
    const unifier = new HyperMillSchemaUnifier();
    const params: UnifiedParameter[] = Array.from({ length: 10 }, (_, i) => ({
      id: "",
      name: `P${i}`,
      domain: "CAM-Cycle" as const,
      type: "text",
      description: `param ${i}`,
      source: "metric-cfg" as const,
    }));
    unifier.assignIds(params);
    expect(params[0].id).toBe("HM-P-00001");
    expect(params[9].id).toBe("HM-P-00010");
  });
});

// writeCatalog (disk I/O)

describe("HyperMillSchemaUnifier -- writeCatalog", () => {
  const testOutputPath = "H:/prism/mcp-server/data/hypermill/HyperMillParameterCatalog.json";

  it("writes the catalog JSON file to disk", async () => {
    const writtenPath = await hyperMillSchemaUnifier.writeCatalog(masterCatalog);
    expect(writtenPath).toBe(testOutputPath);
    const stat = await fsUnifier.stat(testOutputPath);
    expect(stat.isFile()).toBe(true);
    expect(stat.size).toBeGreaterThan(1000);
  });

  it("written JSON can be parsed and matches catalog structure", async () => {
    const raw = await fsUnifier.readFile(testOutputPath, "utf8");
    const parsed = JSON.parse(raw) as ParameterCatalog;
    expect(parsed.version).toBe("1.0.0");
    expect(parsed.totalParameters).toBe(masterCatalog.totalParameters);
    expect(parsed.parameters).toHaveLength(masterCatalog.totalParameters);
  });

  it("written catalog contains all 7 domain keys", async () => {
    const raw = await fsUnifier.readFile(testOutputPath, "utf8");
    const parsed = JSON.parse(raw) as ParameterCatalog;
    const domains = Object.keys(parsed.domains);
    expect(domains).toContain("CAM-Cycle");
    expect(domains).toContain("Cycle-Mapping");
    expect(domains).toContain("Tool-Geometry");
    expect(domains).toContain("Cutting-Tech");
    expect(domains).toContain("Macro");
    expect(domains).toContain("Feature-Job");
    expect(domains).toContain("Post-Config");
  });
});

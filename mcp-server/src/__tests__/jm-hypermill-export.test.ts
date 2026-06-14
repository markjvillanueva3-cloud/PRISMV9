import { describe, it, expect } from "vitest";
import { parseJmCribTools } from "../../scripts/lib/jm-tool-model.js";
import { buildHyperMillSql } from "../../scripts/generate-jm-hypermill-tool-library.js";

/**
 * Verifies the hyperMILL .hmt SQL generator: schema completeness, geometry-class
 * mapping (E1127), the per-tool × per-COMPATIBLE-material CuttingData gating (the
 * operator's "only populate compatible material domains" constraint as emitted
 * SQL rows), real-holder collision scalars, and no-geometry tool suppression.
 * Hermetic: synthetic Fusion-CSV → shared model → SQL.
 */

const HDR = [
  "Preset Name (preset_name)", "Type (tool_type)", "Description (tool_description)",
  "Diameter (tool_diameter)", "Unit (tool_unit)", "Holder Description (holder_description)",
  "Holder Vendor (holder_vendor)", "Corner Radius (tool_cornerRadius)",
  "Flute Length (tool_fluteLength)", "Overall Length (tool_overallLength)",
  "Shaft Diameter (tool_shaftDiameter)", "Number of Flutes (tool_numberOfFlutes)",
  "Material (tool_material)", "Vendor (tool_vendor)", "Product ID (tool_productId)",
  "Tip Angle (tool_tipAngle)", "Tool Holder Gauge Length (tool_holderGaugeLength)",
  "Tool Assembly Gauge Length (tool_assemblyGaugeLength)", "Holder Segments (holder_segments)",
];
function row(v: Record<string, string>): string {
  return HDR.map((h) => {
    const s = v[h] ?? "";
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(",");
}
const CSV = [
  HDR.join(","),
  row({ "Type (tool_type)": "end mill", "Description (tool_description)": "alloy steel end mill",
    "Diameter (tool_diameter)": "0.5", "Unit (tool_unit)": "inches", "Flute Length (tool_fluteLength)": "1.5",
    "Overall Length (tool_overallLength)": "3.0", "Shaft Diameter (tool_shaftDiameter)": "0.5",
    "Number of Flutes (tool_numberOfFlutes)": "4", "Material (tool_material)": "Carbide",
    "Vendor (tool_vendor)": "ISCAR", "Product ID (tool_productId)": "EC-0.5",
    "Tool Holder Gauge Length (tool_holderGaugeLength)": "2.0", "Tool Assembly Gauge Length (tool_assemblyGaugeLength)": "4.0",
    "Holder Segments (holder_segments)": '[{"h":1,"d":1}]' }),
  row({ "Type (tool_type)": "twist drill", "Description (tool_description)": "jobber drill",
    "Diameter (tool_diameter)": "0.25", "Unit (tool_unit)": "inches", "Material (tool_material)": "HSS",
    "Product ID (tool_productId)": "TD-0.25", "Tip Angle (tool_tipAngle)": "118" }),
  row({ "Type (tool_type)": "turning general", "Description (tool_description)": "OD turning insert",
    "Unit (tool_unit)": "inches", "Material (tool_material)": "Carbide", "Product ID (tool_productId)": "TT-1" }),
  row({ "Type (tool_type)": "end mill", "Description (tool_description)": "no-geometry junk row",
    "Diameter (tool_diameter)": "", "Unit (tool_unit)": "inches", "Material (tool_material)": "Carbide" }),
  // Single-point turning-thread insert → ThreadingTool(1003). This is the exact
  // class the original seed omitted (3-of-3 scrutiny P1) — it MUST be seeded.
  row({ "Type (tool_type)": "turning threading", "Description (tool_description)": "OD single-point thread insert",
    "Unit (tool_unit)": "inches", "Material (tool_material)": "Carbide", "Product ID (tool_productId)": "TT-THD-1" }),
].join("\n");

const tools = parseJmCribTools({ csvTexts: [{ name: "synth.csv", text: CSV }] });
const built = buildHyperMillSql(tools);
const sql = built.sql;
const stats = built.stats;

const CD_RE =
  /INSERT INTO CuttingData \(id, tool_id, material_id, iso_group, vc_mpm, fz_mm, ap_mm, ae_mm, rpm, feed_mmpm, coolant, use_css\) VALUES \((\d+), (\d+), (\d+), '([A-Z])', ([0-9.]+), [0-9.]+, [0-9.]+, [0-9.]+, (NULL|[0-9.]+), (NULL|[0-9.]+), '[a-z ]+', (\d)\);/g;
interface CdRow { toolId: number; iso: string; vc: number; rpm: string; useCss: string; }
function cuttingRows(): CdRow[] {
  const out: CdRow[] = [];
  for (const m of sql.matchAll(CD_RE)) {
    out.push({ toolId: +m[2], iso: m[4], vc: +m[5], rpm: m[6], useCss: m[8] });
  }
  return out;
}
const groupsFor = (toolId: number) => cuttingRows().filter((r) => r.toolId === toolId).map((r) => r.iso).sort();

describe("buildHyperMillSql — schema + counts", () => {
  it("emits the full hyperMILL schema incl. the PRISM CuttingData table", () => {
    for (const t of ["GeometryClasses", "CuttingMaterials", "Materials", "Tools", "NCTools", "DepotItems", "CuttingData"]) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${t}`);
    }
  });
  it("emits 6 ISO Materials rows", () => {
    expect((sql.match(/INSERT OR IGNORE INTO Materials /g) || []).length).toBe(6);
  });
  it("emits one Tools row per geometry-valid tool and skips the no-geometry junk row", () => {
    expect(stats.tools).toBe(4);            // end mill + drill + turning general + turning threading
    expect(stats.skippedNoGeometry).toBe(1); // empty-diameter milling row (turning tools are diameter-exempt)
    expect((sql.match(/INSERT INTO Tools /g) || []).length).toBe(4);
  });
  it("every single-line data INSERT is terminated", () => {
    // Per-tool data rows (Tools/NCTools/DepotItems/CuttingData) are single-line;
    // the two seed INSERTs (GeometryClasses/CuttingMaterials) are deliberately
    // multi-line valid SQL and are not checked here.
    const inserts = sql.match(/^INSERT INTO [^\n]+$/gm) || [];
    expect(inserts.length).toBeGreaterThan(0);
    for (const ins of inserts) expect(ins.trimEnd().endsWith(");")).toBe(true);
  });
});

describe("buildHyperMillSql — geometry mapping (E1127)", () => {
  it("maps end mill→Endmill(2), drill→Drilltool(4), turning→GeneralTurningTool(1000)", () => {
    expect(sql).toMatch(/INSERT INTO Tools \(.*\) VALUES \(1, '[^']*', 2, /);    // tool 1 type_id 2
    expect(sql).toMatch(/INSERT INTO Tools \(.*\) VALUES \(2, '[^']*', 4, /);    // tool 2 type_id 4
    expect(sql).toMatch(/INSERT INTO Tools \(.*\) VALUES \(3, '[^']*', 1000, /); // tool 3 type_id 1000
  });
  it("emits diameter in mm as dbl_param1 (0.5in → 12.7mm)", () => {
    const m = sql.match(/INSERT INTO Tools \(.*\) VALUES \(1, '[^']*', 2, \d+, 1, [0-9.]+, ([0-9.]+),/);
    expect(m).not.toBeNull();
    expect(parseFloat(m![1])).toBeCloseTo(12.7, 1);
  });
  it("NCTools carries the REAL JM holder gauge length (2in → 50.8mm), not an inferred guess", () => {
    const m = sql.match(/INSERT INTO NCTools \(.*\) VALUES \(1, 1, 1, '1', '[^']*', ([0-9.]+),/);
    expect(m).not.toBeNull();
    expect(parseFloat(m![1])).toBeCloseTo(50.8, 1);
  });
});

describe("buildHyperMillSql — material-compatibility gating (the operator constraint)", () => {
  it("carbide steel end mill gets CuttingData for P/M/K only — never N/S/H", () => {
    expect(groupsFor(1)).toEqual(["K", "M", "P"]);
  });
  it("HSS drill gets N and K, never S/H (no hot-hardness)", () => {
    const g = groupsFor(2);
    expect(g).toContain("N");
    expect(g).toContain("K");
    expect(g).not.toContain("S");
    expect(g).not.toContain("H");
  });
  it("gatedOutGroups counts every (tool, incompatible-ISO) pair that was suppressed", () => {
    expect(stats.gatedOutGroups).toBeGreaterThan(0);
  });
});

describe("buildHyperMillSql — cutting physics", () => {
  it("non-ferrous Vc exceeds steel Vc for the HSS drill", () => {
    const rows = cuttingRows().filter((r) => r.toolId === 2);
    const p = rows.find((r) => r.iso === "P")!;
    const n = rows.find((r) => r.iso === "N")!;
    expect(n.vc).toBeGreaterThan(p.vc);
  });
  it("turning rows use CSS (use_css=1) with NULL rpm", () => {
    const rows = cuttingRows().filter((r) => r.toolId === 3);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) { expect(r.useCss).toBe("1"); expect(r.rpm).toBe("NULL"); }
  });
});

describe("buildHyperMillSql — FK integrity (every emitted geometry class is seeded)", () => {
  // Regression guard for the 3-of-3 scrutiny P1 (2026-06-01): a hand-maintained
  // GeometryClasses seed omitted (1003,'ThreadingTool') while JM's turning-thread
  // tools map to it, so `sqlite3 JM-CRIB-hypermill.hmt < ...sql` failed the FK
  // (PRAGMA foreign_keys=ON; Tools.tool_type_id REFERENCES GeometryClasses(id)).
  // The seed is now derived from HM_TYPE, so this can never silently recur.
  const seededIds = new Set<number>();
  for (const m of sql.matchAll(/INSERT OR IGNORE INTO GeometryClasses \(id, name\) VALUES (.+?);/g)) {
    for (const pair of m[1].matchAll(/\((\d+),'[^']+'\)/g)) seededIds.add(+pair[1]);
  }
  const usedTypeIds = [...sql.matchAll(/INSERT INTO Tools \([^)]*\) VALUES \(\d+, '[^']*', (\d+),/g)].map((m) => +m[1]);

  it("seeds at least the 13 JM geometry classes", () => {
    expect(seededIds.size).toBeGreaterThanOrEqual(13);
  });
  it("every tool_type_id emitted in Tools is present in the GeometryClasses seed (no FK-orphan rows)", () => {
    expect(usedTypeIds.length).toBeGreaterThan(0);
    const orphans = [...new Set(usedTypeIds)].filter((id) => !seededIds.has(id));
    expect(orphans).toEqual([]); // any non-empty set = a row that fails to materialize under FK enforcement
  });
  it("the turning-thread tool maps to ThreadingTool(1003) and 1003 is seeded", () => {
    expect(usedTypeIds).toContain(1003); // the exact class that shipped unseeded
    expect(seededIds.has(1003)).toBe(true);
  });
});

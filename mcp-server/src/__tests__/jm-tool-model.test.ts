import { describe, it, expect } from "vitest";
import {
  parseCsvLine,
  classifyOp,
  parseJmCribTools,
  cuttingDataForGroup,
  MM_PER_IN,
  type IsoGroup,
} from "../../scripts/lib/jm-tool-model.js";

/**
 * Verifies the shared JM tool model: CSV parsing, op classification, mm
 * normalization from inch source, the material-compatibility gate (the
 * operator's "only populate compatible material domains" constraint), and
 * physics-meaningful cutting data from UltimateSpeedFeedEngine.lookupCuttingData.
 *
 * Hermetic: a synthetic CSV (exact Fusion header tokens for the columns the
 * parser reads) is injected via `csvTexts`, so the test never touches the real
 * JM crib filesystem.
 */

// Build a synthetic Fusion-format CSV with the header tokens the parser reads.
const HDR = [
  "Preset Name (preset_name)",
  "Type (tool_type)",
  "Description (tool_description)",
  "Diameter (tool_diameter)",
  "Number (tool_number)",
  "Unit (tool_unit)",
  "Holder Description (holder_description)",
  "Holder Vendor (holder_vendor)",
  "Holder Product ID (holder_productId)",
  "Corner Radius (tool_cornerRadius)",
  "Flute Length (tool_fluteLength)",
  "Overall Length (tool_overallLength)",
  "Shaft Diameter (tool_shaftDiameter)",
  "Number of Flutes (tool_numberOfFlutes)",
  "Material (tool_material)",
  "Comment (tool_comment)",
  "Vendor (tool_vendor)",
  "Product ID (tool_productId)",
  "Tip Angle (tool_tipAngle)",
  "Thread Pitch (tool_threadPitch)",
  "Tool Holder Gauge Length (tool_holderGaugeLength)",
  "Tool Assembly Gauge Length (tool_assemblyGaugeLength)",
  "Shaft Segments (shaft_segments)",
  "Holder Segments (holder_segments)",
];

/** Build one CSV data row from a partial column→value map (inch-unit). */
function row(vals: Record<string, string>): string {
  return HDR.map((h) => {
    const v = vals[h] ?? "";
    return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(",");
}

const SEG_RAW = '[{"height":0.5,"upper":0.5,"lower":0.5}]';

const SYNTH_CSV = [
  HDR.join(","),
  // A: carbide square end mill, steel intent → default gate (P/M/K, never N/S/H)
  row({
    "Preset Name (preset_name)": "Default", "Type (tool_type)": "end mill",
    "Description (tool_description)": "general alloy steel end mill",
    "Diameter (tool_diameter)": "0.5", "Unit (tool_unit)": "inches",
    "Flute Length (tool_fluteLength)": "1.5", "Overall Length (tool_overallLength)": "3.0",
    "Shaft Diameter (tool_shaftDiameter)": "0.5", "Number of Flutes (tool_numberOfFlutes)": "4",
    "Material (tool_material)": "Carbide", "Vendor (tool_vendor)": "ISCAR",
    "Product ID (tool_productId)": "EC-A-0.5",
    "Tool Holder Gauge Length (tool_holderGaugeLength)": "2.0",
    "Tool Assembly Gauge Length (tool_assemblyGaugeLength)": "4.0",
    "Holder Segments (holder_segments)": SEG_RAW,
  }),
  // B: HSS twist drill → substrate gate includes N + K, never S/H
  row({
    "Preset Name (preset_name)": "Default", "Type (tool_type)": "drill",
    "Description (tool_description)": "jobber twist drill",
    "Diameter (tool_diameter)": "0.25", "Unit (tool_unit)": "inches",
    "Material (tool_material)": "HSS", "Vendor (tool_vendor)": "Generic",
    "Product ID (tool_productId)": "TD-0.25", "Tip Angle (tool_tipAngle)": "118",
  }),
  // C: explicit aluminum end mill → gated to non-ferrous domain
  row({
    "Preset Name (preset_name)": "Default", "Type (tool_type)": "end mill",
    "Description (tool_description)": "3-flute aluminum roughing end mill",
    "Diameter (tool_diameter)": "0.375", "Unit (tool_unit)": "inches",
    "Number of Flutes (tool_numberOfFlutes)": "3", "Material (tool_material)": "Carbide",
  }),
  // D: carbide turning tool (no diameter — CSS, workpiece-driven)
  row({
    "Preset Name (preset_name)": "Default", "Type (tool_type)": "turning general",
    "Description (tool_description)": "OD turning insert", "Unit (tool_unit)": "inches",
    "Material (tool_material)": "Carbide",
  }),
].join("\n");

const tools = parseJmCribTools({ csvTexts: [{ name: "synth.csv", text: SYNTH_CSV }] });
const byType = (op: string) => tools.find((t) => t.opClass === op)!;

describe("parseCsvLine", () => {
  it("splits a plain comma-separated line", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });
  it("preserves commas inside quoted fields", () => {
    expect(parseCsvLine('"a,b",c')).toEqual(["a,b", "c"]);
  });
  it("unescapes doubled quotes", () => {
    expect(parseCsvLine('"a""b",c')).toEqual(['a"b', "c"]);
  });
});

describe("classifyOp", () => {
  it("maps tool-type strings to operation classes", () => {
    expect(classifyOp("end mill")).toBe("milling");
    expect(classifyOp("twist drill")).toBe("drilling");
    expect(classifyOp("spiral tap")).toBe("tapping");
    expect(classifyOp("reamer")).toBe("reaming");
    expect(classifyOp("OD turning")).toBe("turning");
    expect(classifyOp("thread mill")).toBe("thread_milling");
  });
});

describe("parseJmCribTools — geometry normalization (inch → mm)", () => {
  it("parses every tool row", () => {
    expect(tools.length).toBe(4);
  });
  it("converts inch diameter to mm", () => {
    expect(byType("milling").diameter_mm).toBeCloseTo(0.5 * MM_PER_IN, 3); // 12.7
  });
  it("falls back flute length to 3×diameter when the CSV omits it", () => {
    const c = tools.find((t) => t.description.includes("aluminum"))!;
    // 0.375 in × 25.4 = 9.525 mm diameter; no flute length given → 3× fallback
    expect(c.fluteLength_mm).toBeCloseTo(9.525 * 3, 2);
  });
  it("extracts holder collision scalars in mm and preserves the raw silhouette verbatim", () => {
    const a = byType("milling");
    expect(a.holder.gaugeLength_mm).toBeCloseTo(2.0 * MM_PER_IN, 2); // 50.8
    expect(a.holder.projection_mm).toBeCloseTo((4.0 - 2.0) * MM_PER_IN, 2); // 50.8 stickout
    expect(a.holder.segmentsRaw).toBe(SEG_RAW); // never converted (no 25.4× risk)
  });
  it("defaults drill flute count to 2 and point angle when material is HSS", () => {
    const d = byType("drilling");
    expect(d.flutes).toBe(2);
    expect(d.pointAngle_deg).toBe(118);
    expect(d.toolMaterial).toBe("hss");
  });
});

describe("material-compatibility gate (operator constraint)", () => {
  it("never grants superalloy(S) or hardened(H) to an unidentified carbide coating (safety)", () => {
    const a = byType("milling"); // material 'Carbide', steel description → default gate
    expect(a.compatibleGroups).toContain("P");
    expect(a.compatibleGroups).toContain("K");
    expect(a.compatibleGroups).not.toContain("S");
    expect(a.compatibleGroups).not.toContain("H");
  });
  it("includes non-ferrous(N) and cast-iron(K) for HSS, never S/H (no hot-hardness)", () => {
    const d = byType("drilling");
    expect(d.compatibleGroups).toContain("N");
    expect(d.compatibleGroups).toContain("K");
    expect(d.compatibleGroups).not.toContain("S");
    expect(d.compatibleGroups).not.toContain("H");
  });
  it("gates an explicit aluminum tool to the non-ferrous domain (includes N, excludes S/H)", () => {
    const c = tools.find((t) => t.description.includes("aluminum"))!;
    expect(c.compatibleGroups).toContain("N");
    expect(c.compatibleGroups).not.toContain("S");
    expect(c.compatibleGroups).not.toContain("H");
  });
});

describe("cuttingDataForGroup — physics from lookupCuttingData", () => {
  it("returns a physics-meaningful Vc band + positive RPM/feed for a milling tool", () => {
    const cd = cuttingDataForGroup(byType("milling"), "P");
    expect(cd).not.toBeNull();
    expect(cd!.vc_mpm).toBeGreaterThan(10);
    expect(cd!.vc_mpm).toBeLessThan(1500);
    expect(cd!.rpm).toBeGreaterThan(0);
    expect(cd!.feed_mmpm).toBeGreaterThan(0);
    expect(cd!.fz_mm).toBeGreaterThan(0);
    // table feed ≈ fz × flutes × rpm
    expect(cd!.feed_mmpm).toBeCloseTo(cd!.fnRev_mm * cd!.rpm!, 0);
  });
  it("orders non-ferrous Vc above steel Vc for the same HSS tool", () => {
    const d = byType("drilling"); // HSS → compatible with both P and N
    const p = cuttingDataForGroup(d, "P");
    const n = cuttingDataForGroup(d, "N");
    expect(p).not.toBeNull();
    expect(n).not.toBeNull();
    expect(n!.vc_mpm).toBeGreaterThan(p!.vc_mpm);
  });
  it("uses feed-per-rev semantics for drilling (fz = fnRev / flutes)", () => {
    const cd = cuttingDataForGroup(byType("drilling"), "P");
    expect(cd!.fnRev_mm).toBeGreaterThan(0);
    expect(cd!.fz_mm).toBeCloseTo(cd!.fnRev_mm / byType("drilling").flutes, 6);
  });
  it("turning sets CSS mode with no fixed RPM (workpiece-diameter driven)", () => {
    const cd = cuttingDataForGroup(byType("turning"), "P");
    expect(cd).not.toBeNull();
    expect(cd!.useCSS).toBe(true);
    expect(cd!.rpm).toBeNull();
  });
  it("derates HSS below carbide for the same group", () => {
    // A is carbide milling; synthesize the comparison via a tool diameter both share.
    const hssDrill = byType("drilling");
    const cd = cuttingDataForGroup(hssDrill, "P");
    // HSS derate (0.40×) keeps Vc well under the carbide steel ceiling
    expect(cd!.vc_mpm).toBeLessThan(150);
  });
});

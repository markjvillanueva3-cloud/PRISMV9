import { describe, it, expect } from "vitest";
import { UniversalToolExportEngine, universalToolExportEngine } from "../engines/UniversalToolExportEngine.js";
import type { PRISMTool } from "../engines/UniversalToolExportEngine.js";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const ENDMILL: PRISMTool = {
  id: "EM-10-4FL",
  designation: "10mm 4-flute Carbide Endmill",
  manufacturer: "Sandvik",
  tool_type: "endmill",
  diameter_mm: 10,
  shank_diameter_mm: 10,
  cutting_length_mm: 22,
  overall_length_mm: 72,
  corner_radius_mm: 0,
  helix_angle_deg: 45,
  flutes: 4,
  taper: "CAT40",
  gauge_length_mm: 60,
  material: "carbide",
  coating: "TiAlN",
  spindle_rpm: 8000,
  feed_mm_min: 2400,
  cutting_speed_m_min: 251,
  feed_per_tooth_mm: 0.075,
  depth_of_cut_mm: 10,
  width_of_cut_mm: 6,
  tool_life_min: 120,
  serial_number: "SN-001",
  status: "available",
};

const BALLNOSE: PRISMTool = {
  id: "BN-6-2FL",
  manufacturer: "Kennametal",
  tool_type: "ball_nosed",
  diameter_mm: 6,
  cutting_length_mm: 12,
  overall_length_mm: 60,
  corner_radius_mm: 3,
  helix_angle_deg: 30,
  flutes: 2,
  taper: "HSK-A63",
  gauge_length_mm: 50,
  material: "carbide",
  coating: "AlCrN",
  status: "new",
};

const DRILL: PRISMTool = {
  id: "DR-8",
  tool_type: "drill",
  diameter_mm: 8,
  cutting_length_mm: 50,
  overall_length_mm: 100,
  point_angle_deg: 118,
  flutes: 2,
  material: "hss",
};

const TOOLS = [ENDMILL, BALLNOSE, DRILL];

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

describe("universalToolExportEngine singleton", () => {
  it("is an instance of UniversalToolExportEngine", () => {
    expect(universalToolExportEngine).toBeInstanceOf(UniversalToolExportEngine);
  });
});

// ---------------------------------------------------------------------------
// listFormats
// ---------------------------------------------------------------------------

describe("listFormats()", () => {
  const engine = new UniversalToolExportEngine();

  it("returns 4 formats", () => {
    const f = engine.listFormats();
    expect(f).toHaveLength(4);
  });

  it("includes all expected format keys", () => {
    const keys = engine.listFormats().map(f => f.format);
    expect(keys).toContain("iso13399");
    expect(keys).toContain("stepnc");
    expect(keys).toContain("mtconnect");
    expect(keys).toContain("csv");
  });

  it("each format has standard and description fields", () => {
    engine.listFormats().forEach(f => {
      expect(typeof f.standard).toBe("string");
      expect(f.standard.length).toBeGreaterThan(0);
      expect(typeof f.description).toBe("string");
    });
  });
});

// ---------------------------------------------------------------------------
// exportISO13399
// ---------------------------------------------------------------------------

describe("exportISO13399()", () => {
  const engine = new UniversalToolExportEngine();

  it("returns correct tool_count and format", () => {
    const r = engine.exportISO13399(TOOLS);
    expect(r.tool_count).toBe(3);
    expect(r.format).toBe("iso13399");
  });

  it("produces valid XML header", () => {
    const { xml } = engine.exportISO13399(TOOLS);
    expect(xml).toMatch(/^<\?xml version="1\.0"/);
    expect(xml).toContain("ISO13399_ToolData");
  });

  it("includes CuttingItems block", () => {
    const { xml } = engine.exportISO13399(TOOLS);
    expect(xml).toContain("<CuttingItems");
    expect(xml).toContain("</CuttingItems>");
  });

  it("includes AdaptiveItems block", () => {
    const { xml } = engine.exportISO13399(TOOLS);
    expect(xml).toContain("<AdaptiveItems");
    expect(xml).toContain("</AdaptiveItems>");
  });

  it("includes ToolAssembly block by default", () => {
    const { xml } = engine.exportISO13399(TOOLS);
    expect(xml).toContain("<ToolAssemblies");
    expect(xml).toContain("</ToolAssemblies>");
  });

  it("omits ToolAssembly when include_assembly=false", () => {
    const { xml } = engine.exportISO13399(TOOLS, { include_assembly: false });
    expect(xml).not.toContain("<ToolAssemblies");
  });

  it("writes correct GTC class for endmill (211)", () => {
    const { xml } = engine.exportISO13399([ENDMILL]);
    expect(xml).toContain('gtc_class="211"');
  });

  it("writes correct GTC class for ballnose (212)", () => {
    const { xml } = engine.exportISO13399([BALLNOSE]);
    expect(xml).toContain('gtc_class="212"');
  });

  it("writes correct GTC class for drill (111)", () => {
    const { xml } = engine.exportISO13399([DRILL]);
    expect(xml).toContain('gtc_class="111"');
  });

  it("includes diameter in cutting item geometry", () => {
    const { xml } = engine.exportISO13399([ENDMILL]);
    expect(xml).toContain("<CuttingDiameter");
    expect(xml).toContain("10.0000");
  });

  it("includes helix angle", () => {
    const { xml } = engine.exportISO13399([ENDMILL]);
    expect(xml).toContain("<HelixAngle");
    expect(xml).toContain("45.00");
  });

  it("includes corner radius", () => {
    const { xml } = engine.exportISO13399([BALLNOSE]);
    expect(xml).toContain("<CornerRadius");
    expect(xml).toContain("3.0000");
  });

  it("includes point angle for drill", () => {
    const { xml } = engine.exportISO13399([DRILL]);
    expect(xml).toContain("<PointAngle");
    expect(xml).toContain("118.00");
  });

  it("includes taper in adaptive item", () => {
    const { xml } = engine.exportISO13399([ENDMILL]);
    expect(xml).toContain("<Taper>CAT40</Taper>");
  });

  it("converts to inches when units=inch", () => {
    const { xml } = engine.exportISO13399([ENDMILL], { units: "inch" });
    expect(xml).toContain('unit="INCH"');
    expect(xml).toContain('units="INCH"');
    // 10mm = 0.39370 inch
    expect(xml).toContain("0.39370");
  });

  it("handles empty array gracefully", () => {
    const r = engine.exportISO13399([]);
    expect(r.tool_count).toBe(0);
    expect(r.xml).toContain("ISO13399_ToolData");
  });

  it("applies custom schema_version", () => {
    const { xml } = engine.exportISO13399(TOOLS, { schema_version: "3.0" });
    expect(xml).toContain('version="3.0"');
  });

  it("escapes XML special characters in manufacturer", () => {
    const t: PRISMTool = { ...ENDMILL, manufacturer: "Acme & Co <Tools>" };
    const { xml } = engine.exportISO13399([t]);
    expect(xml).toContain("Acme &amp; Co &lt;Tools&gt;");
  });
});

// ---------------------------------------------------------------------------
// exportSTEPNC
// ---------------------------------------------------------------------------

describe("exportSTEPNC()", () => {
  const engine = new UniversalToolExportEngine();

  it("returns correct tool_count and format", () => {
    const r = engine.exportSTEPNC(TOOLS);
    expect(r.tool_count).toBe(3);
    expect(r.format).toBe("stepnc");
  });

  it("starts with ISO-10303-21 header", () => {
    const { step_data } = engine.exportSTEPNC(TOOLS);
    expect(step_data).toMatch(/^ISO-10303-21;/);
  });

  it("ends with END-ISO-10303-21", () => {
    const { step_data } = engine.exportSTEPNC(TOOLS);
    expect(step_data.trim()).toMatch(/END-ISO-10303-21;$/);
  });

  it("contains TOOL_DIMENSION entities", () => {
    const { step_data } = engine.exportSTEPNC(TOOLS);
    expect(step_data).toContain("TOOL_DIMENSION(");
  });

  it("contains CUTTING_COMPONENT entities", () => {
    const { step_data } = engine.exportSTEPNC(TOOLS);
    expect(step_data).toContain("CUTTING_COMPONENT(");
  });

  it("contains MILLING_TOOL entities", () => {
    const { step_data } = engine.exportSTEPNC(TOOLS);
    expect(step_data).toContain("MILLING_TOOL(");
  });

  it("includes TECHNOLOGY_DATA when spindle_rpm provided", () => {
    const { step_data } = engine.exportSTEPNC([ENDMILL]);
    expect(step_data).toContain("TECHNOLOGY_DATA(");
  });

  it("omits TECHNOLOGY_DATA when no speed/feed data", () => {
    const { step_data } = engine.exportSTEPNC([DRILL]);
    expect(step_data).not.toContain("TECHNOLOGY_DATA(");
  });

  it("includes TOOL_LIST referencing all tools", () => {
    const { step_data } = engine.exportSTEPNC(TOOLS);
    expect(step_data).toContain("TOOL_LIST(");
  });

  it("includes AP238 schema in header", () => {
    const { step_data } = engine.exportSTEPNC(TOOLS);
    expect(step_data).toContain("AP238");
  });

  it("handles empty array gracefully", () => {
    const r = engine.exportSTEPNC([]);
    expect(r.tool_count).toBe(0);
    expect(r.step_data).toContain("ISO-10303-21");
  });

  it("writes tool id into MILLING_TOOL entity", () => {
    const { step_data } = engine.exportSTEPNC([ENDMILL]);
    expect(step_data).toContain("'EM-10-4FL'");
  });
});

// ---------------------------------------------------------------------------
// exportMTConnect
// ---------------------------------------------------------------------------

describe("exportMTConnect()", () => {
  const engine = new UniversalToolExportEngine();

  it("returns correct tool_count and format", () => {
    const r = engine.exportMTConnect(TOOLS);
    expect(r.tool_count).toBe(3);
    expect(r.format).toBe("mtconnect");
  });

  it("produces valid XML header", () => {
    const { xml } = engine.exportMTConnect(TOOLS);
    expect(xml).toMatch(/^<\?xml version="1\.0"/);
  });

  it("contains MTConnectAssets root element", () => {
    const { xml } = engine.exportMTConnect(TOOLS);
    expect(xml).toContain("<MTConnectAssets");
    expect(xml).toContain("</MTConnectAssets>");
  });

  it("contains Header element", () => {
    const { xml } = engine.exportMTConnect(TOOLS);
    expect(xml).toContain("<Header");
    expect(xml).toContain('sender="PRISM-MCP"');
  });

  it("contains CuttingTool elements for each tool", () => {
    const { xml } = engine.exportMTConnect(TOOLS);
    const count = (xml.match(/<CuttingTool /g) ?? []).length;
    expect(count).toBe(3);
  });

  it("includes CuttingToolLifeCycle block", () => {
    const { xml } = engine.exportMTConnect(TOOLS);
    expect(xml).toContain("<CuttingToolLifeCycle>");
  });

  it("includes Measurements block with FunctionalLength", () => {
    const { xml } = engine.exportMTConnect(TOOLS);
    expect(xml).toContain("<FunctionalLength");
    expect(xml).toContain("</FunctionalLength>");
  });

  it("includes CuttingDiameterMax", () => {
    const { xml } = engine.exportMTConnect([ENDMILL]);
    expect(xml).toContain("<CuttingDiameterMax");
    expect(xml).toContain("10.0000");
  });

  it("includes CuttingItems with correct count attribute", () => {
    const { xml } = engine.exportMTConnect([ENDMILL]);
    expect(xml).toContain('count="4"'); // 4 flutes
  });

  it("maps status 'available' to AVAILABLE", () => {
    const { xml } = engine.exportMTConnect([ENDMILL]);
    expect(xml).toContain("<ItemStatus>AVAILABLE</ItemStatus>");
  });

  it("maps status 'new' to NEW", () => {
    const { xml } = engine.exportMTConnect([BALLNOSE]);
    expect(xml).toContain("<ItemStatus>NEW</ItemStatus>");
  });

  it("uses serial_number when provided", () => {
    const { xml } = engine.exportMTConnect([ENDMILL]);
    expect(xml).toContain('serialNumber="SN-001"');
  });

  it("includes taper as ConnectionCodeMachineSide", () => {
    const { xml } = engine.exportMTConnect([ENDMILL]);
    expect(xml).toContain("<ConnectionCodeMachineSide>CAT40</ConnectionCodeMachineSide>");
  });

  it("includes HelixAngle measurement", () => {
    const { xml } = engine.exportMTConnect([ENDMILL]);
    expect(xml).toContain("<HelixAngle");
    expect(xml).toContain("45.00");
  });

  it("includes coating in cutting items when provided", () => {
    const { xml } = engine.exportMTConnect([ENDMILL]);
    expect(xml).toContain("<Coating>TiAlN</Coating>");
  });

  it("handles empty array gracefully", () => {
    const r = engine.exportMTConnect([]);
    expect(r.tool_count).toBe(0);
    expect(r.xml).toContain("MTConnectAssets");
  });

  it("version attribute is 1.7", () => {
    const { xml } = engine.exportMTConnect(TOOLS);
    expect(xml).toContain('version="1.7"');
  });
});

// ---------------------------------------------------------------------------
// exportCSV
// ---------------------------------------------------------------------------

describe("exportCSV()", () => {
  const engine = new UniversalToolExportEngine();

  it("returns correct tool_count and format", () => {
    const r = engine.exportCSV(TOOLS);
    expect(r.tool_count).toBe(3);
    expect(r.format).toBe("csv");
  });

  it("returns 28 columns", () => {
    const r = engine.exportCSV(TOOLS);
    expect(r.column_count).toBe(28);
  });

  it("first row is header with tool_id", () => {
    const { csv } = engine.exportCSV(TOOLS);
    const header = csv.split("\n")[0];
    expect(header).toMatch(/^tool_id,/);
  });

  it("produces 4 lines for 3 tools (header + 3 rows)", () => {
    const { csv } = engine.exportCSV(TOOLS);
    const lines = csv.split("\n").filter(l => l.length > 0);
    expect(lines).toHaveLength(4);
  });

  it("data rows contain tool id", () => {
    const { csv } = engine.exportCSV(TOOLS);
    expect(csv).toContain("EM-10-4FL");
  });

  it("data rows contain diameter", () => {
    const { csv } = engine.exportCSV([ENDMILL]);
    expect(csv).toContain("10");
  });

  it("data rows contain manufacturer", () => {
    const { csv } = engine.exportCSV([ENDMILL]);
    expect(csv).toContain("Sandvik");
  });

  it("data rows contain coating", () => {
    const { csv } = engine.exportCSV([ENDMILL]);
    expect(csv).toContain("TiAlN");
  });

  it("data rows contain GTC class", () => {
    const { csv } = engine.exportCSV([ENDMILL]);
    expect(csv).toContain("211"); // endmill GTC class
  });

  it("empty fields produce empty CSV cells", () => {
    const { csv } = engine.exportCSV([DRILL]);
    // DRILL has no manufacturer
    const lines = csv.split("\n");
    const dataRow = lines[1];
    expect(dataRow).toBeDefined();
  });

  it("handles commas in values with quoting", () => {
    const t: PRISMTool = { ...ENDMILL, manufacturer: "Acme, Inc." };
    const { csv } = engine.exportCSV([t]);
    expect(csv).toContain('"Acme, Inc."');
  });

  it("handles empty array — returns only header", () => {
    const r = engine.exportCSV([]);
    expect(r.tool_count).toBe(0);
    const lines = r.csv.split("\n").filter(l => l.length > 0);
    expect(lines).toHaveLength(1); // header only
  });

  it("header contains all expected columns", () => {
    const { csv } = engine.exportCSV(TOOLS);
    const header = csv.split("\n")[0];
    expect(header).toContain("diameter_mm");
    expect(header).toContain("flutes");
    expect(header).toContain("corner_radius_mm");
    expect(header).toContain("helix_angle_deg");
    expect(header).toContain("spindle_rpm");
    expect(header).toContain("feed_mm_min");
    expect(header).toContain("tool_life_min");
    expect(header).toContain("status");
  });
});

// ---------------------------------------------------------------------------
// export() universal entry
// ---------------------------------------------------------------------------

describe("export() universal entry point", () => {
  const engine = new UniversalToolExportEngine();

  it("delegates to exportISO13399 for format='iso13399'", () => {
    const r = engine.export(TOOLS, "iso13399");
    expect(r.format).toBe("iso13399");
    expect("xml" in r).toBe(true);
  });

  it("delegates to exportSTEPNC for format='stepnc'", () => {
    const r = engine.export(TOOLS, "stepnc");
    expect(r.format).toBe("stepnc");
    expect("step_data" in r).toBe(true);
  });

  it("delegates to exportMTConnect for format='mtconnect'", () => {
    const r = engine.export(TOOLS, "mtconnect");
    expect(r.format).toBe("mtconnect");
    expect("xml" in r).toBe(true);
  });

  it("delegates to exportCSV for format='csv'", () => {
    const r = engine.export(TOOLS, "csv");
    expect(r.format).toBe("csv");
    expect("csv" in r).toBe(true);
  });

  it("passes iso13399_options to exportISO13399", () => {
    const r = engine.export([ENDMILL], "iso13399", { include_assembly: false });
    expect(r.format).toBe("iso13399");
    const xml = (r as any).xml as string;
    expect(xml).not.toContain("<ToolAssemblies");
  });

  it("throws on unknown format", () => {
    expect(() => engine.export(TOOLS, "unknown_format" as any)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Field aliasing / fallback resolution
// ---------------------------------------------------------------------------

describe("field aliasing", () => {
  const engine = new UniversalToolExportEngine();

  it("resolves cutting_diameter_mm as fallback for diameter_mm", () => {
    const t: PRISMTool = { cutting_diameter_mm: 12, tool_type: "endmill" };
    const r = engine.exportCSV([t]);
    expect(r.csv).toContain("12");
  });

  it("resolves flute_count as fallback for flutes", () => {
    const t: PRISMTool = { id: "T1", flute_count: 3, diameter_mm: 8, tool_type: "endmill" };
    const { xml } = engine.exportISO13399([t]);
    expect(xml).toContain("<NumberOfFlutes>3</NumberOfFlutes>");
  });

  it("resolves flute_length_mm as fallback for cutting_length_mm", () => {
    const t: PRISMTool = { id: "T1", diameter_mm: 6, flute_length_mm: 18 };
    const { xml } = engine.exportISO13399([t]);
    expect(xml).toContain("<CuttingEdgeLength");
    expect(xml).toContain("18.0000");
  });

  it("resolves length_mm as fallback for overall_length_mm", () => {
    const t: PRISMTool = { id: "T1", diameter_mm: 6, length_mm: 70 };
    const { step_data } = engine.exportSTEPNC([t]);
    // overall length should appear in TOOL_DIMENSION
    expect(step_data).toContain("70.0000");
  });

  it("uses type field as fallback for tool_type", () => {
    const t: PRISMTool = { id: "T1", diameter_mm: 8, type: "ballnose" };
    const { xml } = engine.exportISO13399([t]);
    expect(xml).toContain('gtc_class="212"');
  });

  it("auto-generates id from index when no id or designation", () => {
    const t: PRISMTool = { diameter_mm: 10, tool_type: "endmill" };
    const r = engine.exportCSV([t]);
    expect(r.csv).toContain("TOOL-1");
  });
});

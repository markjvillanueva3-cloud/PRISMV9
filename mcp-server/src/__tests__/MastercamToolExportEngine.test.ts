/**
 * MastercamToolExportEngine tests — MILL-MASTER Phase 2
 *
 * Validates Mastercam tool-library export to .mcam-tools / .mcam-operations
 * format: exportLibrary (catalog-wide), exportForJob (per-job subset),
 * exportWithCuttingData (per-material tables), getFormat (schema).
 *
 * Coverage floor: happy path + ≥3 failure modes + ≥2 adversarial inputs,
 * ≥3 ISO groups spanned, dispatcher wiring verified.
 */
import { describe, it, expect } from "vitest";
import {
  mastercamToolExportEngine,
  type ISOGroup,
  type McamExportFilter,
  type McamLibrary,
} from "../engines/MastercamToolExportEngine.js";
import { ACTIONS as CAM_ACTIONS } from "../tools/dispatchers/camDispatcher.js";

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamToolExportEngine.exportLibrary — happy paths", () => {
  it("unfiltered export returns non-empty tool_count and valid JSON library_data", () => {
    const result = mastercamToolExportEngine.exportLibrary();
    expect(result.tool_count).toBeGreaterThan(0);
    expect(result.file_name.length).toBeGreaterThan(0);
    const parsed = JSON.parse(result.library_data) as McamLibrary;
    expect(parsed.format).toBe("mcam-tools");
    expect(Array.isArray(parsed.tools)).toBe(true);
    expect(parsed.tools.length).toBeGreaterThan(0);
  });

  it("each tool has the required Mastercam fields (tool_number, id, type, manufacturer)", () => {
    const result = mastercamToolExportEngine.exportLibrary();
    const lib = JSON.parse(result.library_data) as McamLibrary;
    for (const tool of lib.tools.slice(0, 5)) {
      expect(typeof tool.tool_number).toBe("number");
      expect(tool.tool_number).toBeGreaterThanOrEqual(1);
      expect(typeof tool.id).toBe("string");
      expect(tool.id.length).toBeGreaterThan(0);
      expect(typeof tool.type).toBe("string");
      expect(typeof tool.manufacturer).toBe("string");
      expect(tool.diameter_mm).toBeGreaterThan(0);
    }
  });

  it("tool numbers are unique within a library", () => {
    const result = mastercamToolExportEngine.exportLibrary();
    const lib = JSON.parse(result.library_data) as McamLibrary;
    const numbers = lib.tools.map((t) => t.tool_number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("summary reports manufacturers + tool_types observed", () => {
    const result = mastercamToolExportEngine.exportLibrary();
    expect(result.summary).not.toBe(undefined);
    expect(result.summary!.total_tools).toBe(result.tool_count);
    expect(Array.isArray(result.summary!.manufacturers)).toBe(true);
    expect(result.summary!.manufacturers.length).toBeGreaterThan(0);
    expect(result.summary!.tool_types.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamToolExportEngine.exportLibrary — format + filter variants", () => {
  it("format='mcam-operations' sets library format to mcam-operations", () => {
    const result = mastercamToolExportEngine.exportLibrary(undefined, "mcam-operations");
    const lib = JSON.parse(result.library_data) as McamLibrary;
    expect(lib.format).toBe("mcam-operations");
    expect(result.file_name.endsWith(".mcam-operations")).toBe(true);
  });

  it("max_tools filter caps the number of tools exported", () => {
    const filter: McamExportFilter = { max_tools: 3 };
    const result = mastercamToolExportEngine.exportLibrary(filter);
    expect(result.tool_count).toBeLessThanOrEqual(3);
    expect(result.tool_count).toBeGreaterThan(0);
  });

  it("max_per_library caps each partition library's tools.length", () => {
    const filter: McamExportFilter = { max_per_library: 2 };
    const result = mastercamToolExportEngine.exportLibrary(filter);
    // If partitions exist, every partition honours the cap
    if (result.libraries) {
      for (const lib of result.libraries) {
        expect(lib.tools.length).toBeLessThanOrEqual(2);
      }
    }
    expect(result.summary!.partitions).toBeGreaterThanOrEqual(1);
  });

  it("iso_group='N' filter produces tools whose cutting_data includes N", () => {
    const filter: McamExportFilter = { iso_group: "N" };
    const result = mastercamToolExportEngine.exportLibrary(filter);
    const lib = JSON.parse(result.library_data) as McamLibrary;
    expect(lib.tools.length).toBeGreaterThan(0);
    for (const tool of lib.tools.slice(0, 5)) {
      const groups = tool.cutting_data.map((cd) => cd.iso_group);
      expect(groups).toContain("N");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamToolExportEngine.exportForJob", () => {
  it("tool_count equals job_tools length (3 in → 3 out)", () => {
    const job = [
      { type: "endmill", diameter_mm: 10, flutes: 4 },
      { type: "drill", diameter_mm: 6, flutes: 2 },
      { type: "ballnose", diameter_mm: 8, flutes: 4, iso_group: "S" as ISOGroup },
    ];
    const result = mastercamToolExportEngine.exportForJob(job);
    expect(result.tool_count).toBe(3);
    const lib = JSON.parse(result.library_data) as McamLibrary;
    expect(lib.tools.length).toBe(3);
    expect(lib.library_name).toBe("PRISM_JOB_TOOLS");
  });

  it("synthesizes tool when catalog misses (preserves job-specified diameter)", () => {
    const job = [{ type: "endmill", diameter_mm: 12 }];
    const result = mastercamToolExportEngine.exportForJob(job);
    const lib = JSON.parse(result.library_data) as McamLibrary;
    expect(lib.tools.length).toBe(1);
    const tool = lib.tools[0];
    expect(typeof tool.manufacturer).toBe("string");
    expect(tool.manufacturer.length).toBeGreaterThan(0);
    expect(tool.diameter_mm).toBe(12);
  });

  it("empty job_tools returns zero-length library without crashing", () => {
    const result = mastercamToolExportEngine.exportForJob([]);
    expect(result.tool_count).toBe(0);
    const lib = JSON.parse(result.library_data) as McamLibrary;
    expect(lib.tools.length).toBe(0);
  });

  it("format='mcam-operations' propagates to file_name and library format", () => {
    const result = mastercamToolExportEngine.exportForJob(
      [{ type: "endmill", diameter_mm: 10 }],
      "mcam-operations",
    );
    expect(result.file_name.endsWith(".mcam-operations")).toBe(true);
    const lib = JSON.parse(result.library_data) as McamLibrary;
    expect(lib.format).toBe("mcam-operations");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamToolExportEngine.exportWithCuttingData", () => {
  it("includes all 6 ISO groups by default for every tool", () => {
    const result = mastercamToolExportEngine.exportWithCuttingData([
      { type: "endmill", diameter_mm: 10, flutes: 4 },
      { type: "ballnose", diameter_mm: 6, flutes: 4 },
    ]);
    expect(result.tool_count).toBe(2);
    expect(result.cutting_data_summary.length).toBe(2);
    for (const entry of result.cutting_data_summary) {
      const groups = entry.data_by_iso.map((d) => d.iso_group).sort();
      expect(groups).toEqual(["H", "K", "M", "N", "P", "S"]);
    }
  });

  it("custom materials list limits cutting data to requested groups only", () => {
    const materials: ISOGroup[] = ["P", "N", "S"];
    const result = mastercamToolExportEngine.exportWithCuttingData(
      [{ type: "endmill", diameter_mm: 10 }],
      materials,
    );
    const groups = result.cutting_data_summary[0].data_by_iso.map((d) => d.iso_group).sort();
    expect(groups).toEqual(["N", "P", "S"]);
  });

  it("cutting data entries carry positive vc_mpm, fz_mm, rpm, feed_mmpm (physics fields)", () => {
    const result = mastercamToolExportEngine.exportWithCuttingData(
      [{ type: "endmill", diameter_mm: 10, flutes: 4 }],
      ["P"],
    );
    const data = result.cutting_data_summary[0].data_by_iso[0];
    expect(data.iso_group).toBe("P");
    expect(data.vc_mpm).toBeGreaterThan(0);
    expect(data.fz_mm).toBeGreaterThan(0);
    expect(data.rpm).toBeGreaterThan(0);
    expect(data.feed_mmpm).toBeGreaterThan(0);
  });

  it("feed_mmpm ≈ fz × flutes × rpm (within 1% algebraic tolerance)", () => {
    const result = mastercamToolExportEngine.exportWithCuttingData(
      [{ type: "endmill", diameter_mm: 10, flutes: 4 }],
      ["P"],
    );
    const data = result.cutting_data_summary[0].data_by_iso[0];
    const expectedFeed = data.fz_mm * 4 * data.rpm;
    const ratio = data.feed_mmpm / expectedFeed;
    expect(ratio).toBeGreaterThan(0.99);
    expect(ratio).toBeLessThan(1.01);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamToolExportEngine.getFormat", () => {
  it("returns schema identifying the .mcam-tools extension + JSON encoding", () => {
    const format = mastercamToolExportEngine.getFormat();
    expect(format.format_name).toBe("Mastercam Tool Library");
    expect(format.extension).toBe(".mcam-tools");
    expect(format.encoding).toMatch(/JSON/);
  });

  it("documents all 6 ISO groups (P/M/K/N/S/H) with human labels", () => {
    const format = mastercamToolExportEngine.getFormat();
    for (const group of ["P", "M", "K", "N", "S", "H"] as ISOGroup[]) {
      expect(typeof format.iso_groups[group]).toBe("string");
      expect(format.iso_groups[group].length).toBeGreaterThan(0);
    }
  });

  it("lists the major holder interfaces (BT40, HSK-A63, Capto-C5)", () => {
    const format = mastercamToolExportEngine.getFormat();
    expect(format.holder_types).toContain("BT40");
    expect(format.holder_types).toContain("HSK-A63");
    expect(format.holder_types).toContain("Capto-C5");
  });

  it("documents the core cutting_data fields (vc_mpm, fz_mm, rpm, feed_mmpm)", () => {
    const format = mastercamToolExportEngine.getFormat();
    expect(format.cutting_data_fields.vc_mpm.length).toBeGreaterThan(0);
    expect(format.cutting_data_fields.fz_mm.length).toBeGreaterThan(0);
    expect(format.cutting_data_fields.rpm.length).toBeGreaterThan(0);
    expect(format.cutting_data_fields.feed_mmpm.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamToolExportEngine — adversarial inputs", () => {
  it("zero-diameter job tool is accepted (engine must not divide by zero)", () => {
    const result = mastercamToolExportEngine.exportForJob([{ type: "endmill", diameter_mm: 0 }]);
    expect(result.tool_count).toBe(1);
    const lib = JSON.parse(result.library_data) as McamLibrary;
    expect(lib.tools.length).toBe(1);
  });

  it("missing fields in job_tools produces a structurally valid tool (diameter positive)", () => {
    // When job fields are absent, the engine tries catalog first (may hit any diameter)
    // and only falls back to its 10mm default on catalog miss. Either path must yield
    // a valid positive diameter and a non-empty manufacturer.
    const result = mastercamToolExportEngine.exportForJob([{}]);
    expect(result.tool_count).toBe(1);
    const lib = JSON.parse(result.library_data) as McamLibrary;
    expect(lib.tools[0].diameter_mm).toBeGreaterThan(0);
    expect(typeof lib.tools[0].manufacturer).toBe("string");
    expect(lib.tools[0].manufacturer.length).toBeGreaterThan(0);
  });

  it("very large catalog request (max_tools=9999) does not crash", () => {
    const result = mastercamToolExportEngine.exportLibrary({ max_tools: 9999 });
    expect(result.tool_count).toBeGreaterThan(0);
    expect(result.tool_count).toBeLessThanOrEqual(9999);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
describe("MastercamToolExportEngine — dispatcher wiring parity", () => {
  it("camDispatcher ACTIONS includes both mastercam_tool_export actions", () => {
    expect(CAM_ACTIONS).toContain("mastercam_tool_export");
    expect(CAM_ACTIONS).toContain("mastercam_tool_export_job");
  });

  it("lazy-import round-trip: dispatcher pattern returns a working engine instance", async () => {
    const mod = await import("../engines/MastercamToolExportEngine.js");
    const viaLazy = mod.mastercamToolExportEngine;
    const format = viaLazy.getFormat();
    expect(format.format_name).toBe("Mastercam Tool Library");
    const jobResult = viaLazy.exportForJob([{ type: "endmill", diameter_mm: 10 }]);
    expect(jobResult.tool_count).toBe(1);
  });

  it("dispatcher-style params shape survives round-trip for exportForJob", async () => {
    const params = {
      job_tools: [
        { type: "endmill", diameter_mm: 12, flutes: 4 },
        { type: "drill", diameter_mm: 6 },
      ],
      format: "mcam-tools" as const,
    };
    const mod = await import("../engines/MastercamToolExportEngine.js");
    const eng = mod.mastercamToolExportEngine;
    const out = eng.exportForJob(params.job_tools, params.format);
    expect(out.tool_count).toBe(2);
    expect(out.file_name).toMatch(/mcam-tools$/);
  });
});

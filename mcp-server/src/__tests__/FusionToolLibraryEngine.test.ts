/**
 * FusionToolLibraryEngine — Tests
 * RES-MS8 U-F360-02: Validates Fusion 360 CSV tool library parsing
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  FusionToolLibraryEngine,
  type FusionToolLibraryResult,
  type FusionTool,
} from "../engines/FusionToolLibraryEngine.js";

let result: FusionToolLibraryResult;

beforeAll(async () => {
  result = await FusionToolLibraryEngine.harvest();
}, 30_000);

describe("FusionToolLibraryEngine", () => {
  describe("getSources()", () => {
    it("returns correct root path", () => {
      const src = FusionToolLibraryEngine.getSources();
      expect(src.rootPath).toContain("FUSION TOOL LIBRARY");
    });

    it("expects 7 CSV files", () => {
      expect(FusionToolLibraryEngine.getSources().expectedFiles).toBe(7);
    });

    it("expects ~218 tools", () => {
      expect(FusionToolLibraryEngine.getSources().expectedTools).toBe(218);
    });
  });

  describe("harvest() — completeness", () => {
    it("finds at least 100 tools", () => {
      expect(result.totalTools).toBeGreaterThanOrEqual(100);
    });

    it("finds close to 218 tools", () => {
      expect(result.totalTools).toBeGreaterThanOrEqual(180);
      expect(result.totalTools).toBeLessThanOrEqual(300);
    });

    it("parses all 7 CSV files", () => {
      expect(Object.keys(result.byFile).length).toBe(7);
    });

    it("all files have at least 1 tool", () => {
      for (const [file, count] of Object.entries(result.byFile)) {
        expect(count).toBeGreaterThan(0);
      }
    });

    it("has valid ISO timestamp", () => {
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("harvest() — categories", () => {
    it("has turning tools", () => {
      expect(result.byCategory["turning"]).toBeGreaterThan(0);
    });

    it("has boring bars (roughing)", () => {
      expect(result.byCategory["boring_rough"]).toBeGreaterThan(0);
    });

    it("has boring bars (finishing)", () => {
      expect(result.byCategory["boring_finish"]).toBeGreaterThan(0);
    });

    it("has insert drills", () => {
      expect(result.byCategory["insert_drill"]).toBeGreaterThan(0);
    });

    it("has twist drills", () => {
      expect(result.byCategory["twist_drill"]).toBeGreaterThan(0);
    });

    it("has end mills", () => {
      expect(result.byCategory["end_mill"]).toBeGreaterThan(0);
    });
  });

  describe("harvest() — specific tools", () => {
    it("CNMT turning tool has ISCAR vendor", () => {
      const cnmt = result.tools.find((t) => t.description.includes("CNMT"));
      expect(cnmt).toBeDefined();
      expect(cnmt!.vendor).toBe("ISCAR");
      expect(cnmt!.toolMaterial).toBe("carbide");
    });

    it("boring bars have diameter > 0", () => {
      const boring = result.tools.filter((t) => t.category === "boring_rough" || t.category === "boring_finish");
      expect(boring.length).toBeGreaterThan(0);
      for (const t of boring) {
        expect(t.diameterInch).toBeGreaterThan(0);
      }
    });

    it("twist drills have tip angle", () => {
      const drills = result.tools.filter((t) => t.category === "twist_drill");
      const withTip = drills.filter((t) => t.tipAngle !== null && t.tipAngle > 0);
      expect(withTip.length).toBeGreaterThan(10);
    });

    it("end mills have flute count", () => {
      const mills = result.tools.filter((t) => t.category === "end_mill");
      expect(mills.length).toBeGreaterThan(0);
      const withFlutes = mills.filter((t) => t.fluteCount !== null && t.fluteCount > 0);
      expect(withFlutes.length).toBeGreaterThan(0);
    });

    it("tools are in inches unit", () => {
      const inchTools = result.tools.filter((t) => t.unit === "inches");
      expect(inchTools.length).toBe(result.totalTools);
    });

    it("most tools have a spindle speed or surface speed", () => {
      const withSpeed = result.tools.filter(
        (t) =>
          (t.spindleSpeed !== null && t.spindleSpeed > 0) ||
          (t.surfaceSpeed !== null && t.surfaceSpeed > 0)
      );
      expect(withSpeed.length).toBeGreaterThan(result.totalTools * 0.5);
    });
  });

  describe("harvest() — tool types", () => {
    it("has turning general type", () => {
      expect(result.byToolType["turning general"]).toBeGreaterThan(0);
    });

    it("has drill type", () => {
      expect(result.byToolType["drill"]).toBeGreaterThan(0);
    });

    it("has multiple distinct tool types", () => {
      expect(Object.keys(result.byToolType).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("harvest() — materials and vendors", () => {
    it("has carbide tools", () => {
      expect(result.byMaterial["carbide"]).toBeGreaterThan(0);
    });

    it("has HSS tools", () => {
      expect(result.byMaterial["hss"]).toBeGreaterThan(0);
    });

    it("has ISCAR vendor", () => {
      expect(result.byVendor["ISCAR"]).toBeGreaterThan(0);
    });
  });

  describe("findByDescription()", () => {
    it("finds tools by partial name", () => {
      const boring = FusionToolLibraryEngine.findByDescription(result.tools, "boring");
      expect(boring.length).toBeGreaterThan(0);
      for (const t of boring) {
        expect(t.description.toLowerCase()).toContain("boring");
      }
    });

    it("case-insensitive search", () => {
      const drills = FusionToolLibraryEngine.findByDescription(result.tools, "DRILL");
      expect(drills.length).toBeGreaterThan(0);
    });
  });

  describe("filterByCategory()", () => {
    it("filters turning tools", () => {
      const turning = FusionToolLibraryEngine.filterByCategory(result.tools, "turning");
      expect(turning.length).toBeGreaterThan(0);
      for (const t of turning) {
        expect(t.category).toBe("turning");
      }
    });
  });

  describe("audit()", () => {
    it("returns valid summary", async () => {
      const audit = await FusionToolLibraryEngine.audit();
      expect(audit.totalTools).toBeGreaterThan(100);
      expect(audit.fileCount).toBe(7);
      expect(audit.vendorCount).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("FusionToolLibraryEngine — dispatcher wiring (camDispatcher.ts)", () => {
  const TOOLLIB_ACTIONS = [
    "cam_fusion_tool_library_get_sources",
    "cam_fusion_tool_library_harvest",
    "cam_fusion_tool_library_parse_csv",
    "cam_fusion_tool_library_find_by_description",
    "cam_fusion_tool_library_filter_by_category",
    "cam_fusion_tool_library_audit",
  ] as const;

  const ACTION_COUNT_EXPECTED = 6;

  const dispatcherPath = `${process.cwd()}/src/tools/dispatchers/camDispatcher.ts`.replace(/\\/g, "/");

  const readDispatcher = async (): Promise<string> => {
    const fs = await import("node:fs/promises");
    return fs.readFile(dispatcherPath, "utf-8");
  };

  it("registers all 6 cam_fusion_tool_library_* enum entries", async () => {
    const src = await readDispatcher();
    expect(TOOLLIB_ACTIONS.length).toBe(ACTION_COUNT_EXPECTED);
    for (const action of TOOLLIB_ACTIONS) {
      expect(src).toContain(`"${action}"`);
    }
  });

  it("declares matching case statements for every action", async () => {
    const src = await readDispatcher();
    for (const action of TOOLLIB_ACTIONS) {
      const re = new RegExp(`case\\s+"${action}"\\s*:`);
      expect(re.test(src)).toBe(true);
    }
  });

  it("every case body lazy-imports FusionToolLibraryEngine", async () => {
    const src = await readDispatcher();
    for (const action of TOOLLIB_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?\\{\\s*FusionToolLibraryEngine\\s*\\}\\s*=\\s*await\\s+import\\(\\s*"\\.\\.\\/\\.\\.\\/engines\\/FusionToolLibraryEngine\\.js"\\s*\\)[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("get_sources case is PURE (no I/O), spreads sources record", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion_tool_library_get_sources"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("getSources()");
    expect(body).toMatch(/\.\.\.sources/);
    // Pure: must not await any engine method
    expect(body).not.toMatch(/await\s+FusionToolLibraryEngine\.(harvest|audit)/);
  });

  it("harvest case awaits the async harvest() and spreads aggregated result", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion_tool_library_harvest"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("await FusionToolLibraryEngine.harvest()");
    expect(body).toMatch(/\.\.\.harvest/);
  });

  it("parse_csv case is PURE (no await on engine method) and accepts content|csv + source_file|sourceFile fallbacks", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion_tool_library_parse_csv"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("parseCsv");
    expect(body).toMatch(/params\.content\s*\?\?\s*params\.csv/);
    expect(body).toMatch(/params\.source_file\s*\?\?\s*params\.sourceFile/);
    expect(body).toContain("count");
  });

  it("find_by_description case Array.isArray-guards tools and accepts query|description fallback", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion_tool_library_find_by_description"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("findByDescription");
    expect(body).toContain("Array.isArray(params.tools)");
    expect(body).toMatch(/params\.query\s*\?\?\s*params\.description/);
  });

  it("filter_by_category case Array.isArray-guards tools and defaults category to \"unknown\"", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion_tool_library_filter_by_category"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("filterByCategory");
    expect(body).toContain("Array.isArray(params.tools)");
    expect(body).toContain('"unknown"');
  });

  it("audit case awaits the async audit() and spreads roll-up", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_fusion_tool_library_audit"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("await FusionToolLibraryEngine.audit()");
    expect(body).toMatch(/\.\.\.audit/);
  });

  it("each case sets result.success to true (consistent dispatcher contract)", async () => {
    const src = await readDispatcher();
    for (const action of TOOLLIB_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?success:\\s*true[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("PURE methods (get_sources, parse_csv, find_by_description, filter_by_category) do NOT await engine methods", async () => {
    const src = await readDispatcher();
    const PURE_ACTIONS = [
      "cam_fusion_tool_library_get_sources",
      "cam_fusion_tool_library_parse_csv",
      "cam_fusion_tool_library_find_by_description",
      "cam_fusion_tool_library_filter_by_category",
    ];
    for (const action of PURE_ACTIONS) {
      const re = new RegExp(`case\\s+"${action}"\\s*:[\\s\\S]*?break;`);
      const body = src.match(re)?.[0] ?? "";
      // Negative assertion: pure methods must NOT use `await FusionToolLibraryEngine.<method>`
      expect(body).not.toMatch(/await\s+FusionToolLibraryEngine\.(harvest|audit)\b/);
    }
  });
});

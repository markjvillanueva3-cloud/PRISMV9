/**
 * CAMExportEngine — strict-legitimacy tests
 * Coverage: class shape, schemas, default-format mapping per CAM system,
 * APT/CL-Data/JSON/XML generation, compatibility warnings, getExport, listSupportedSystems.
 */
import { describe, it, expect } from "vitest";
import {
  CAMExportEngine,
  camExportEngine,
  CAMSystemSchema,
  ExportFormatSchema,
  ToolpathDataSchema,
  type ToolpathData,
} from "../engines/CAMExportEngine.js";

const TOTAL_SUPPORTED_SYSTEMS = 12;
const TOTAL_FORMAT_VALUES = 8;
const SAMPLE_TOOL_NUMBER = 7;
const SAMPLE_TOOL_DIAMETER_MM = 12.7;
const SAMPLE_RPM = 8000;
const SAMPLE_FEED_MMPM = 1500;
const LARGE_POINT_THRESHOLD_PLUS_ONE = 100001;

const sampleTp = (overrides: Partial<ToolpathData> = {}): ToolpathData => ({
  id: "tp1",
  name: "OP1-Rough",
  operationType: "milling",
  toolNumber: SAMPLE_TOOL_NUMBER,
  toolDiameter: SAMPLE_TOOL_DIAMETER_MM,
  spindleSpeed: SAMPLE_RPM,
  feedRate: SAMPLE_FEED_MMPM,
  coolant: "flood",
  points: [
    { x: 0, y: 0, z: 5, type: "rapid" },
    { x: 10, y: 0, z: -1, type: "linear", feed: SAMPLE_FEED_MMPM },
    { x: 10, y: 10, z: -1, type: "arc_cw" },
  ],
  ...overrides,
});

describe("CAMExportEngine — class shape + schemas", () => {
  it("static methods are callable and return non-empty results", () => {
    // Behavioral existence: call each static method and assert structure.
    const exp = CAMExportEngine.export([sampleTp()], "mastercam");
    expect(exp.id.length).toBeGreaterThan(0);
    expect(CAMExportEngine.getExport(exp.id)?.id).toBe(exp.id);
    expect(CAMExportEngine.listSupportedSystems().length).toBeGreaterThan(0);
    expect(CAMExportEngine.getSelfAwareness().name).toBe("CAMExportEngine");
  });

  it("singleton is an instance of the class", () => {
    expect(camExportEngine instanceof CAMExportEngine).toBe(true);
  });

  it("CAMSystem enum lists exactly 12 systems", () => {
    expect(CAMSystemSchema.options.length).toBe(TOTAL_SUPPORTED_SYSTEMS);
    expect(CAMSystemSchema.options).toContain("mastercam");
    expect(CAMSystemSchema.options).toContain("hypermill");
    expect(CAMSystemSchema.options).toContain("nx_cam");
  });

  it("ExportFormat enum lists exactly 8 formats", () => {
    expect(ExportFormatSchema.options.length).toBe(TOTAL_FORMAT_VALUES);
    expect(ExportFormatSchema.options).toContain("apt");
    expect(ExportFormatSchema.options).toContain("step_nc");
  });

  it("ToolpathData schema validates a well-formed sample", () => {
    const parsed = ToolpathDataSchema.parse(sampleTp());
    expect(parsed.id).toBe("tp1");
    expect(parsed.points.length).toBe(3);
  });

  it("getSelfAwareness reports name + 12 supported systems", () => {
    const sa = CAMExportEngine.getSelfAwareness();
    expect(sa.name).toBe("CAMExportEngine");
    expect(sa.supportedSystems.length).toBe(TOTAL_SUPPORTED_SYSTEMS);
  });
});

describe("CAMExportEngine — default format mapping", () => {
  it("mastercam → apt by default", () => {
    const r = CAMExportEngine.export([sampleTp()], "mastercam");
    expect(r.format).toBe("apt");
    expect(r.content.includes("PARTNO/PRISM_EXPORT")).toBe(true);
    expect(r.content.includes("LOADTL/")).toBe(true);
    expect(r.content.includes("FINI")).toBe(true);
  });

  it("fusion360 → json by default", () => {
    const r = CAMExportEngine.export([sampleTp()], "fusion360");
    expect(r.format).toBe("json");
    const parsed = JSON.parse(r.content);
    expect(parsed.generator).toBe("PRISM CAMExportEngine");
    expect(parsed.targetSystem).toBe("fusion360");
    expect(parsed.toolpaths.length).toBe(1);
  });

  it("solidcam → cl_data by default", () => {
    const r = CAMExportEngine.export([sampleTp()], "solidcam");
    expect(r.format).toBe("cl_data");
    expect(r.content.includes("$$CLFILE")).toBe(true);
    expect(r.content.includes("PARTNO/PRISM_EXPORT")).toBe(true);
  });

  it("explicit XML format produces valid prolog and Toolpath element", () => {
    const r = CAMExportEngine.export([sampleTp()], "hypermill", "xml");
    expect(r.format).toBe("xml");
    expect(r.content.startsWith('<?xml version="1.0"')).toBe(true);
    expect(r.content.includes('<Toolpath name="OP1-Rough"')).toBe(true);
    expect(r.content.includes(`tool="${SAMPLE_TOOL_NUMBER}"`)).toBe(true);
  });
});

describe("CAMExportEngine — APT motion encoding", () => {
  it("encodes rapid + linear + arc moves correctly", () => {
    const r = CAMExportEngine.export([sampleTp()], "mastercam", "apt");
    expect(r.content).toMatch(/RAPID\nGOTO\/0\.0000,0\.0000,5\.0000/);
    expect(r.content).toMatch(/GOTO\/10\.0000,0\.0000,-1\.0000/);
    expect(r.content).toMatch(/CIRCLE\/10\.0000,10\.0000,-1\.0000,CLW/);
  });

  it("CCW arc uses CCLW direction token", () => {
    const tp = sampleTp({
      points: [
        { x: 0, y: 0, z: 0, type: "rapid" },
        { x: 1, y: 1, z: 0, type: "arc_ccw" },
      ],
    });
    const r = CAMExportEngine.export([tp], "mastercam", "apt");
    expect(r.content.includes(",CCLW")).toBe(true);
  });
});

describe("CAMExportEngine — compatibility warnings", () => {
  it("flags 5-axis on bobcad", () => {
    const tp = sampleTp({
      points: [
        { x: 0, y: 0, z: 0, a: 30, type: "linear" },
      ],
    });
    const r = CAMExportEngine.export([tp], "bobcad");
    expect(r.warnings.some((w) => /5-axis/.test(w))).toBe(true);
  });

  it("flags arcs on fusion360 (linearized)", () => {
    const tp = sampleTp({
      points: [
        { x: 0, y: 0, z: 0, type: "arc_ccw" },
      ],
    });
    const r = CAMExportEngine.export([tp], "fusion360");
    expect(r.warnings.some((w) => /linearized/.test(w))).toBe(true);
  });

  it("flags large point counts >100000", () => {
    const points = Array.from({ length: LARGE_POINT_THRESHOLD_PLUS_ONE }, (_, i) => ({
      x: i, y: 0, z: 0, type: "linear" as const,
    }));
    const tp = sampleTp({ points });
    const r = CAMExportEngine.export([tp], "mastercam");
    expect(r.warnings.some((w) => /Large point count/.test(w))).toBe(true);
  });
});

describe("CAMExportEngine — result registry + listSupportedSystems", () => {
  it("getExport returns previously stored result", () => {
    const r = CAMExportEngine.export([sampleTp()], "mastercam");
    const fetched = CAMExportEngine.getExport(r.id);
    expect(fetched).not.toBe(undefined);
    expect(fetched!.id).toBe(r.id);
    expect(fetched!.targetSystem).toBe("mastercam");
  });

  it("getExport returns undefined for unknown id", () => {
    expect(CAMExportEngine.getExport("EXP-DOES-NOT-EXIST")).toBe(undefined);
  });

  it("listSupportedSystems returns 12 entries with formats arrays", () => {
    const list = CAMExportEngine.listSupportedSystems();
    expect(list.length).toBe(TOTAL_SUPPORTED_SYSTEMS);
    for (const entry of list) {
      expect(entry.formats.length).toBeGreaterThan(0);
      expect(entry.notes.length).toBeGreaterThan(0);
    }
  });

  it("byteSize equals UTF-8 length of content", () => {
    const r = CAMExportEngine.export([sampleTp()], "mastercam");
    expect(r.byteSize).toBe(new TextEncoder().encode(r.content).length);
  });
});

describe("CAMExportEngine — adversarial inputs", () => {
  it("handles empty toolpath list", () => {
    const r = CAMExportEngine.export([], "mastercam");
    expect(r.toolpathCount).toBe(0);
    expect(r.content.includes("PARTNO/PRISM_EXPORT")).toBe(true);
    expect(r.warnings.length).toBe(0);
  });

  it("handles toolpath with zero points", () => {
    const r = CAMExportEngine.export([sampleTp({ points: [] })], "mastercam");
    expect(r.toolpathCount).toBe(1);
    expect(r.content.includes("FINI")).toBe(true);
  });

  it("JSON export rounds coordinates to 4 decimal places", () => {
    const tp = sampleTp({
      points: [{ x: 1.123456789, y: 2.999999, z: -0.000049, type: "linear" }],
    });
    const r = CAMExportEngine.export([tp], "fusion360", "json");
    const parsed = JSON.parse(r.content);
    const pt = parsed.toolpaths[0].points[0];
    expect(pt.x).toBe(1.1235);
    expect(pt.y).toBe(3);
    expect(pt.z).toBe(0); // -0.000049 rounds to 0 (≈-4.9e-5 → 0 after *1e4 round)
  });

  it("step_nc format falls back to JSON with warning", () => {
    const r = CAMExportEngine.export([sampleTp()], "mastercam", "step_nc");
    expect(r.format).toBe("step_nc");
    expect(r.warnings.some((w) => /not fully implemented/.test(w))).toBe(true);
    // content is JSON because of the fallback branch
    const parsed = JSON.parse(r.content);
    expect(parsed.targetSystem).toBe("mastercam");
  });

  it("multiple distinct CAM systems exercised in one suite", () => {
    const systems = ["hypermill", "powermill", "nx_cam", "catia"] as const;
    for (const s of systems) {
      const r = CAMExportEngine.export([sampleTp()], s);
      expect(r.targetSystem).toBe(s);
      expect(r.toolpathCount).toBe(1);
    }
  });
});

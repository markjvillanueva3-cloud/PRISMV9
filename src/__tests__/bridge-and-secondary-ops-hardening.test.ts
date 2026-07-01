import { describe, expect, it } from "vitest";

import {
  hyperMillToolBridgeEngine,
  mastercamToolBridgeEngine,
  type ToolRecord,
} from "../engines/BatchCAMToolBridgeEngines.js";
import { secondaryOpsPipelineEngine } from "../engines/SecondaryOpsPipelineEngine.js";

const SAMPLE_TOOL: ToolRecord = {
  prism_id: "T1",
  tool_number: 1,
  tool_type: "endmill",
  description: "Test EM 10",
  manufacturer: "TestCo",
  manufacturer_part_no: "EM10",
  diameter_mm: 10,
  corner_radius_mm: 0,
  flute_length_mm: 20,
  oal_mm: 60,
  flutes: 4,
  material: "carbide",
  coating: "TiAlN",
  iso_group: "P",
  vc_recommended_m_min: 180,
  fz_recommended_mm: 0.08,
  holder_id: "H1",
  coolant_through: true,
  cam_native_id: "1",
  cam_system: "prism",
  extra: {},
};

describe("SecondaryOpsPipelineEngine", () => {
  it("fails closed when an unsupported secondary op is requested", () => {
    const result = secondaryOpsPipelineEngine.runPipeline({
      controller: "haas",
      machine_type: "mill",
      operations: [{ id: "bad1", type: "mystery_op" as any }],
    });

    expect(result.success).toBe(false);
    expect(result.program_text).toBe("");
    expect(result.program_line_count).toBe(0);
    expect(result.confidence_score).toBe(0);
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "critical",
          message: expect.stringContaining('unsupported type "mystery_op"'),
        }),
      ]),
    );
  });

  it("still emits a program for supported secondary ops", () => {
    const result = secondaryOpsPipelineEngine.runPipeline({
      controller: "haas",
      machine_type: "mill",
      max_spindle_rpm: 8000,
      operations: [{ id: "deb1", type: "chamfer_deburr", chamfer_size_mm: 0.5 }],
    });

    expect(result.success).toBe(true);
    expect(result.program_text).toContain("Chamfer deburr");
    expect(result.program_line_count).toBeGreaterThan(0);
    expect(result.warnings.filter((w) => w.severity === "critical")).toHaveLength(0);
  });
});

describe("BatchCAMToolBridgeEngines", () => {
  it("delegates Mastercam exports to the real export engine", () => {
    const result = mastercamToolBridgeEngine.exportTools([SAMPLE_TOOL]) as Record<string, unknown>;

    expect(result.success).not.toBe(false);
    expect(result.degraded).not.toBe(true);
    expect(result.tool_count).toBe(1);
    expect(typeof result.library_data).toBe("string");
    expect(String(result.file_name)).toContain(".mcam-tools");
  });

  it("delegates hyperMILL exports to the real export engine", () => {
    const result = hyperMillToolBridgeEngine.exportTools([SAMPLE_TOOL]) as Record<string, unknown>;

    expect(result.success).not.toBe(false);
    expect(result.degraded).not.toBe(true);
    expect(result.tool_count).toBe(1);
    expect(Array.isArray(result.insert_statements)).toBe(true);
    expect(typeof result.sqlite_schema).toBe("string");
  });
});

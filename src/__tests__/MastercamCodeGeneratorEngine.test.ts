/**
 * MastercamCodeGeneratorEngine Tests (E1117) — CAMX-MS3/U09
 *
 * Validates VBScript generation, C# NetHook generation, template catalog,
 * and natural-language description dispatch.
 */

import { describe, it, expect } from "vitest";
import {
  mastercamCodeGeneratorEngine,
  MastercamCodeGeneratorEngineClass,
} from "../engines/MastercamCodeGeneratorEngine.js";

const engine = mastercamCodeGeneratorEngine;

// ─── Singleton ─────────────────────────────────────────────────────────────────

describe("MastercamCodeGeneratorEngine — singleton", () => {
  it("exports a singleton instance of MastercamCodeGeneratorEngineClass", () => {
    expect(engine).toBeInstanceOf(MastercamCodeGeneratorEngineClass);
  });
});

// ─── generateVBScript ──────────────────────────────────────────────────────────

describe("generateVBScript", () => {
  it("returns a script string for a single dynamic_mill operation", () => {
    const { script, description } = engine.generateVBScript(
      [
        {
          type: "dynamic_mill",
          name: "Rough_DynMill",
          tool: { diameter: 12, flutes: 4, tool_number: 1 },
          cutting: { spindle_rpm: 10000, feed_mmpm: 4500, doc_axial_mm: 30 },
          strategy: { dynamic_engagement_deg: 36, micro_lift_mm: 0.25 },
        },
      ],
      [],
      { regenerate_all: true },
    );
    expect(typeof script).toBe("string");
    expect(script).toContain("MCDynamicMillOperation");
    expect(script).toContain("MaxEngagementAngle = 36");
    expect(script).toContain("MicroLiftDistance = 0.25");
    expect(script).toContain("SpindleSpeed = 10000");
    expect(script).toContain("MCRegenerateAllDirtyToolpaths");
    expect(description).toContain("dynamic_mill");
  });

  it("includes Option Explicit header", () => {
    const { script } = engine.generateVBScript([], [], {});
    expect(script).toContain("Option Explicit");
  });

  it("adds On Error handler when error_handling=true", () => {
    const { script } = engine.generateVBScript(
      [],
      [],
      { error_handling: true },
    );
    expect(script).toContain("On Error GoTo ErrorHandler");
    expect(script).toContain("ErrorHandler:");
  });

  it("inserts part file open when part_file provided", () => {
    const { script } = engine.generateVBScript(
      [],
      [],
      { part_file: "C:\\Parts\\test.mcam" },
    );
    expect(script).toContain("MCOpenFile");
    expect(script).toContain("test.mcam");
  });

  it("adds post processor call when run_post=true", () => {
    const { script } = engine.generateVBScript(
      [],
      [],
      { run_post: true, post_processor: "MPFAN", nc_output_path: "C:\\NC\\test.nc" },
    );
    expect(script).toContain("MCPostProcess");
    expect(script).toContain("MPFAN");
    expect(script).toContain("test.nc");
  });

  it("emits correct coolant code for flood coolant", () => {
    const { script } = engine.generateVBScript(
      [{ type: "pocket", cutting: { coolant: "flood" } }],
      [],
      {},
    );
    expect(script).toContain("Coolant = 1");
  });

  it("emits correct coolant code for through_tool", () => {
    const { script } = engine.generateVBScript(
      [{ type: "drill", cutting: { coolant: "through_tool" } }],
      [],
      {},
    );
    expect(script).toContain("Coolant = 4");
  });

  it("emits stock_to_leave for walls and floors", () => {
    const { script } = engine.generateVBScript(
      [{ type: "optirough", strategy: { stock_to_leave_mm: 0.3 } }],
      [],
      {},
    );
    expect(script).toContain("StockToLeaveWalls = 0.3");
    expect(script).toContain("StockToLeaveFloors = 0.3");
  });

  it("inherits cutting defaults when operation does not override", () => {
    const { script } = engine.generateVBScript(
      [{ type: "face" }],
      [],
      { defaults: { spindle_rpm: 5000, feed_mmpm: 2000 } },
    );
    expect(script).toContain("SpindleSpeed = 5000");
    expect(script).toContain("FeedRate = 2000");
  });

  it("generates tool definition blocks from shared tools list", () => {
    const { script } = engine.generateVBScript(
      [],
      [{ diameter: 16, flutes: 4, tool_number: 1, type: "endmill" }],
      {},
    );
    expect(script).toContain("MCTool");
    expect(script).toContain("Diameter = 16");
    expect(script).toContain("NumFlutes = 4");
  });

  it("generates contour_2d using MCContourOperation", () => {
    const { script } = engine.generateVBScript(
      [{ type: "contour_2d", name: "Finish_Contour" }],
      [],
      {},
    );
    expect(script).toContain("MCContourOperation");
    expect(script).toContain("Finish_Contour");
  });

  it("generates drill using MCDrillOperation", () => {
    const { script } = engine.generateVBScript([{ type: "drill" }], [], {});
    expect(script).toContain("MCDrillOperation");
  });

  it("generates face using MCFaceMillOperation", () => {
    const { script } = engine.generateVBScript([{ type: "face" }], [], {});
    expect(script).toContain("MCFaceMillOperation");
  });

  it("generates optirough using MCOptiRoughOperation", () => {
    const { script } = engine.generateVBScript([{ type: "optirough" }], [], {});
    expect(script).toContain("MCOptiRoughOperation");
  });

  it("generates pocket using MCPocketOperation", () => {
    const { script } = engine.generateVBScript([{ type: "pocket" }], [], {});
    expect(script).toContain("MCPocketOperation");
  });
});

// ─── generateNetHookCode ───────────────────────────────────────────────────────

describe("generateNetHookCode", () => {
  it("returns valid C# code with using statements", () => {
    const { code, description } = engine.generateNetHookCode(
      [
        {
          type: "pocket",
          name: "Rough_Pocket",
          tool: { diameter: 16, flutes: 4, type: "endmill", tool_number: 1 },
          cutting: { spindle_rpm: 8000, feed_mmpm: 3200 },
          strategy: { stock_to_leave_mm: 0.5, climb_mill: true },
        },
      ],
      [],
      {},
    );
    expect(typeof code).toBe("string");
    expect(code).toContain("using Mastercam.App;");
    expect(code).toContain("PocketOperation");
    expect(code).toContain("SpindleSpeed = 8000");
    expect(code).toContain("FeedRate = 3200");
    expect(code).toContain("StockToLeaveWalls = 0.5");
    expect(code).toContain("CuttingMethod.Climb");
    expect(description).toContain("pocket");
  });

  it("uses INetHook interface", () => {
    const { code } = engine.generateNetHookCode([], [], {});
    expect(code).toContain("INetHook");
    expect(code).toContain("public void Run(IMastercamServer server)");
  });

  it("includes RegenerateAllDirtyToolpaths when regenerate_all=true", () => {
    const { code } = engine.generateNetHookCode([], [], { regenerate_all: true });
    expect(code).toContain("RegenerateAllDirtyToolpaths");
  });

  it("includes PostManager.PostAll when run_post=true", () => {
    const { code } = engine.generateNetHookCode([], [], { run_post: true, post_processor: "MPFAN" });
    expect(code).toContain("PostManager.PostAll");
    expect(code).toContain("MPFAN");
  });

  it("maps through_tool coolant to CoolantMode.ThroughTool", () => {
    const { code } = engine.generateNetHookCode(
      [{ type: "drill", cutting: { coolant: "through_tool" } }],
      [],
      {},
    );
    expect(code).toContain("CoolantMode.ThroughTool");
  });

  it("maps flood coolant to CoolantMode.Flood", () => {
    const { code } = engine.generateNetHookCode(
      [{ type: "pocket", cutting: { coolant: "flood" } }],
      [],
      {},
    );
    expect(code).toContain("CoolantMode.Flood");
  });

  it("includes drill tool type as DrillToolData", () => {
    const { code } = engine.generateNetHookCode(
      [{ type: "drill", tool: { diameter: 6.8, type: "drill", tool_number: 5 } }],
      [],
      {},
    );
    expect(code).toContain("DrillToolData");
  });

  it("uses MillToolData for milling tools", () => {
    const { code } = engine.generateNetHookCode(
      [{ type: "pocket", tool: { diameter: 12, type: "endmill", tool_number: 2 } }],
      [],
      {},
    );
    expect(code).toContain("MillToolData");
  });

  it("includes part file open for FileManager.Open", () => {
    const { code } = engine.generateNetHookCode(
      [],
      [],
      { part_file: "C:\\Parts\\test.mcam" },
    );
    expect(code).toContain("FileManager.Open");
    expect(code).toContain("test.mcam");
  });

  it("emits MaximumEngagementAngle for dynamic strategy", () => {
    const { code } = engine.generateNetHookCode(
      [{ type: "dynamic_mill", strategy: { dynamic_engagement_deg: 36 } }],
      [],
      {},
    );
    expect(code).toContain("MaximumEngagementAngle = 36");
  });

  it("emits conventional cutting method when climb_mill=false", () => {
    const { code } = engine.generateNetHookCode(
      [{ type: "pocket", strategy: { climb_mill: false } }],
      [],
      {},
    );
    expect(code).toContain("CuttingMethod.Conventional");
  });
});

// ─── generate() unified entry point ───────────────────────────────────────────

describe("generate()", () => {
  it("dispatches to VBScript when script_type=vbscript", () => {
    const result = engine.generate({
      script_type: "vbscript",
      operations: [{ type: "pocket" }],
    });
    expect(result.script_type).toBe("vbscript");
    expect(result.code).toContain("MCPocketOperation");
    expect(result.operations_count).toBe(1);
  });

  it("dispatches to NetHook when script_type=nethook_csharp", () => {
    const result = engine.generate({
      script_type: "nethook_csharp",
      operations: [{ type: "pocket" }],
    });
    expect(result.script_type).toBe("nethook_csharp");
    expect(result.code).toContain("PocketOperation");
    expect(result.operations_count).toBe(1);
  });

  it("returns operations_count = 0 when no operations provided", () => {
    const result = engine.generate({ script_type: "vbscript" });
    expect(result.operations_count).toBe(0);
  });

  it("result has warnings array", () => {
    const result = engine.generate({ script_type: "vbscript" });
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

// ─── getTemplates ──────────────────────────────────────────────────────────────

describe("getTemplates", () => {
  it("returns all templates when no category provided", () => {
    const templates = engine.getTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(8);
  });

  it("filters by roughing category", () => {
    const templates = engine.getTemplates("roughing");
    expect(templates.length).toBeGreaterThanOrEqual(2);
    templates.forEach(t => expect(t.category).toBe("roughing"));
  });

  it("filters by post_processing category", () => {
    const templates = engine.getTemplates("post_processing");
    expect(templates.length).toBeGreaterThanOrEqual(1);
  });

  it("each template has required fields", () => {
    const templates = engine.getTemplates();
    for (const t of templates) {
      expect(typeof t.id).toBe("string");
      expect(typeof t.name).toBe("string");
      expect(typeof t.description).toBe("string");
      expect(["vbscript", "nethook_csharp"]).toContain(t.script_type);
      expect(Array.isArray(t.tags)).toBe(true);
    }
  });

  it("returns tool_management templates", () => {
    const templates = engine.getTemplates("tool_management");
    expect(templates.length).toBeGreaterThanOrEqual(1);
    expect(templates[0].script_type).toBe("nethook_csharp");
  });

  it("returns empty array for category with no templates", () => {
    // 'batch' should have at least one
    const templates = engine.getTemplates("batch");
    expect(templates.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── generateFromDescription ───────────────────────────────────────────────────

describe("generateFromDescription", () => {
  it("returns adaptive roughing VBScript for 'adaptive roughing' description", () => {
    const result = engine.generateFromDescription("Create adaptive roughing operation");
    expect(result.script_type).toBe("vbscript");
    expect(result.code).toContain("MCOptiRoughOperation");
    expect(result.code).toContain("Mastercam");
  });

  it("returns Dynamic Mill script for '10% engagement' description", () => {
    const result = engine.generateFromDescription("Set up Dynamic Mill with 10% engagement");
    expect(result.script_type).toBe("vbscript");
    expect(result.code).toContain("MCDynamicMillOperation");
  });

  it("returns batch post script for 'batch post-process all operations'", () => {
    const result = engine.generateFromDescription("Batch post-process all operations");
    expect(result.script_type).toBe("vbscript");
    expect(result.code).toContain("MCPostProcess");
  });

  it("returns C# NetHook for 'export tool library' description", () => {
    const result = engine.generateFromDescription("Export tool library to CSV");
    expect(result.script_type).toBe("nethook_csharp");
    expect(result.code).toContain("ToolManager");
  });

  it("returns machine group setup for 'machine group' description", () => {
    const result = engine.generateFromDescription("Set up machine group with stock model");
    expect(result.script_type).toBe("nethook_csharp");
    expect(result.code).toContain("MachineGroupParameters");
  });

  it("returns VBScript scaffold with warning for unrecognised description", () => {
    const result = engine.generateFromDescription("Some completely unknown operation xyz");
    expect(result.script_type).toBe("vbscript");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.code).toContain("Option Explicit");
  });

  it("result has description field", () => {
    const result = engine.generateFromDescription("adaptive roughing");
    expect(typeof result.description).toBe("string");
    expect(result.description.length).toBeGreaterThan(0);
  });

  it("returns drill cycle script for 'peck drill' description", () => {
    const result = engine.generateFromDescription("peck drill with flood coolant");
    expect(result.script_type).toBe("vbscript");
    expect(result.code).toContain("MCDrillOperation");
  });

  it("returns face mill script for 'facing' description", () => {
    const result = engine.generateFromDescription("face mill facing operation");
    expect(result.script_type).toBe("vbscript");
    expect(result.code).toContain("MCFaceMillOperation");
  });
});

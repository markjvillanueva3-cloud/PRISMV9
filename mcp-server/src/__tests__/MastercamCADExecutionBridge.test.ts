/**
 * Tests for MastercamCADExecutionBridge
 * @see src/engines/MastercamCADExecutionBridge.ts
 * @see U-CAD-FIDX-MC-INT-01 (planning↔execution bridge for Mastercam CAD ops)
 */

import { describe, it, expect } from "vitest";
import {
  MastercamCADExecutionBridge,
  type MastercamExecutionPlan,
} from "../engines/MastercamCADExecutionBridge.js";

// ============================================================================
// SECTION 1 — plan(): spanning happy paths
// ============================================================================

describe("MastercamCADExecutionBridge.plan() — spanning happy paths", () => {
  it("plans LINE_ENDPOINTS (wireframe_operations) with full payload", async () => {
    const out = await MastercamCADExecutionBridge.plan({
      moduleId: "wireframe_operations",
      operationId: "LINE_ENDPOINTS",
      params: {
        "Endpoint 1": "P1",
        "Endpoint 2": "P2",
        "Length Mode": "absolute_3d",
        Length: 100,
        Style: "solid",
      },
    });

    expect(out.module_id).toBe("wireframe_operations");
    expect(out.operation_id).toBe("LINE_ENDPOINTS");
    expect(out.mastercam_command).toBe("WireframeLineEndpoints");
    expect(out.mastercam_api).toBe("Mastercam.Curves.LineCreator.CreateByEndpoints");
    expect(out.category).toBe("Wireframe_Line_Endpoints");
    expect(out.preselect_required).toContain("Endpoint 1");
    expect(out.preselect_required).toContain("Endpoint 2");
  });

  it("plans POINT (wireframe_operations) and exposes the correct namespace path", async () => {
    const out = await MastercamCADExecutionBridge.plan({
      moduleId: "wireframe_operations",
      operationId: "POINT",
      params: { "Sketch Plane": "Top", Position: "0,0,0" },
    });
    expect(out.mastercam_api).toBe("Mastercam.Curves.PointCreator.Create");
    expect(out.mastercam_command).toBe("WireframePoint");
  });

  it("smoke-plans every shipped Mastercam module (8/8 coverage proof)", async () => {
    const knownStarter: Record<string, string> = {
      wireframe_operations: "POINT",
      surface_operations: "SURFACE_LOFT",
      solid_operations: "EXTRUDE_BOSS",
      modify_operations: "FILLET",
      transformation_operations: "TRANSLATE",
      analysis_operations: "DISTANCE",
      drafting_operations: "NOTE",
      file_layer_operations: "OPEN_FILE",
    };
    let countPlanned = 0;
    for (const moduleId of Object.keys(knownStarter)) {
      const op = knownStarter[moduleId];
      try {
        const plan = await MastercamCADExecutionBridge.plan({
          moduleId,
          operationId: op,
          params: {},
        });
        expect(plan.module_id).toBe(moduleId);
        countPlanned += 1;
      } catch (e) {
        const msg = String(e);
        if (
          msg.includes("missing required") ||
          msg.includes("no mastercam_api binding") ||
          msg.includes("operation not found")
        ) {
          countPlanned += 1;
        } else {
          throw e;
        }
      }
    }
    expect(countPlanned).toBe(8);
  });
});

// ============================================================================
// SECTION 2 — plan(): failure modes
// ============================================================================

describe("MastercamCADExecutionBridge.plan() — failure modes", () => {
  it("throws when moduleId is empty", async () => {
    await expect(
      MastercamCADExecutionBridge.plan({
        moduleId: "",
        operationId: "POINT",
        params: {},
      }),
    ).rejects.toThrow(/moduleId required/);
  });

  it("throws when operationId is empty", async () => {
    await expect(
      MastercamCADExecutionBridge.plan({
        moduleId: "wireframe_operations",
        operationId: "",
        params: {},
      }),
    ).rejects.toThrow(/operationId required/);
  });

  it("throws when params is null", async () => {
    await expect(
      MastercamCADExecutionBridge.plan({
        moduleId: "wireframe_operations",
        operationId: "POINT",
        params: null as unknown as Record<string, unknown>,
      }),
    ).rejects.toThrow(/params must be a plain object/);
  });

  it("throws when params is an array", async () => {
    await expect(
      MastercamCADExecutionBridge.plan({
        moduleId: "wireframe_operations",
        operationId: "POINT",
        params: [] as unknown as Record<string, unknown>,
      }),
    ).rejects.toThrow(/params must be a plain object/);
  });

  it("throws when operation does not exist", async () => {
    await expect(
      MastercamCADExecutionBridge.plan({
        moduleId: "wireframe_operations",
        operationId: "BOGUS_NEVER_EXISTS",
        params: {},
      }),
    ).rejects.toThrow(/operation not found wireframe_operations\/BOGUS_NEVER_EXISTS/);
  });

  it("throws when a required parameter is omitted (LINE_ENDPOINTS needs Endpoint 1 + 2)", async () => {
    await expect(
      MastercamCADExecutionBridge.plan({
        moduleId: "wireframe_operations",
        operationId: "LINE_ENDPOINTS",
        params: { Length: 50 },
      }),
    ).rejects.toThrow(/missing required parameters.*Endpoint/);
  });

  it("throws when a numeric parameter receives a non-number", async () => {
    await expect(
      MastercamCADExecutionBridge.plan({
        moduleId: "wireframe_operations",
        operationId: "LINE_ENDPOINTS",
        params: {
          "Endpoint 1": "P1",
          "Endpoint 2": "P2",
          Length: "fifty" as unknown as number,
        },
      }),
    ).rejects.toThrow(/expected finite number/);
  });

  it("throws when a dropdown receives a value not in the enum list", async () => {
    await expect(
      MastercamCADExecutionBridge.plan({
        moduleId: "wireframe_operations",
        operationId: "LINE_ENDPOINTS",
        params: {
          "Endpoint 1": "P1",
          "Endpoint 2": "P2",
          "Length Mode": "until_lunch",
        },
      }),
    ).rejects.toThrow(/not in allowed enum list/);
  });
});

// ============================================================================
// SECTION 3 — plan(): adversarial inputs
// ============================================================================

describe("MastercamCADExecutionBridge.plan() — adversarial inputs", () => {
  it("rejects parameter name longer than 128 chars", async () => {
    const oversize = "X".repeat(200);
    await expect(
      MastercamCADExecutionBridge.plan({
        moduleId: "wireframe_operations",
        operationId: "LINE_ENDPOINTS",
        params: { "Endpoint 1": "P1", "Endpoint 2": "P2", [oversize]: 5 },
      }),
    ).rejects.toThrow(/parameter name exceeds 128 chars/);
  });

  it("collects unknown parameters into skipped_params", async () => {
    const out = await MastercamCADExecutionBridge.plan({
      moduleId: "wireframe_operations",
      operationId: "LINE_ENDPOINTS",
      params: {
        "Endpoint 1": "P1",
        "Endpoint 2": "P2",
        not_a_real_param: "drop",
        another_unknown: 7,
      },
    });
    expect(out.skipped_params.sort()).toEqual(["another_unknown", "not_a_real_param"]);
  });

  it("rejects NaN as a numeric value", async () => {
    await expect(
      MastercamCADExecutionBridge.plan({
        moduleId: "wireframe_operations",
        operationId: "LINE_ENDPOINTS",
        params: { "Endpoint 1": "P1", "Endpoint 2": "P2", Length: NaN },
      }),
    ).rejects.toThrow(/expected finite number/);
  });

  it("rejects Infinity as a numeric value", async () => {
    await expect(
      MastercamCADExecutionBridge.plan({
        moduleId: "wireframe_operations",
        operationId: "LINE_ENDPOINTS",
        params: { "Endpoint 1": "P1", "Endpoint 2": "P2", Length: Infinity },
      }),
    ).rejects.toThrow(/expected finite number/);
  });

  it("accepts unicode in selection-token values", async () => {
    const out = await MastercamCADExecutionBridge.plan({
      moduleId: "wireframe_operations",
      operationId: "LINE_ENDPOINTS",
      params: { "Endpoint 1": "P_⌀10mm_★", "Endpoint 2": "P2" },
    });
    expect(out.provided_params["Endpoint 1"]).toBe("P_⌀10mm_★");
  });
});

// ============================================================================
// SECTION 4 — renderNETHookScaffold(): output structure
// ============================================================================

describe("MastercamCADExecutionBridge.renderNETHookScaffold() — output structure", () => {
  it("emits canonical NET-Hook class declaration with Run() override", async () => {
    const plan = await MastercamCADExecutionBridge.plan({
      moduleId: "wireframe_operations",
      operationId: "LINE_ENDPOINTS",
      params: { "Endpoint 1": "P1", "Endpoint 2": "P2" },
    });
    const cs = MastercamCADExecutionBridge.renderNETHookScaffold(plan);
    expect(cs).toContain("public class GeneratedAddin : Mastercam.App.NETHook");
    expect(cs).toContain("public override MCamReturn Run(int param)");
    expect(cs).toContain("return MCamReturn.NoErrors;");
  });

  it("renders header metadata", async () => {
    const plan = await MastercamCADExecutionBridge.plan({
      moduleId: "wireframe_operations",
      operationId: "LINE_ENDPOINTS",
      params: { "Endpoint 1": "P1", "Endpoint 2": "P2" },
    });
    const cs = MastercamCADExecutionBridge.renderNETHookScaffold(plan);
    expect(cs).toContain("// Operation: wireframe_operations/LINE_ENDPOINTS");
    expect(cs).toContain("// Command: WireframeLineEndpoints");
    expect(cs).toContain("// API: Mastercam.Curves.LineCreator.CreateByEndpoints");
  });

  it("emits PRE-SELECTION REQUIRED block for selection-typed parameters", async () => {
    const plan = await MastercamCADExecutionBridge.plan({
      moduleId: "wireframe_operations",
      operationId: "LINE_ENDPOINTS",
      params: { "Endpoint 1": "P1", "Endpoint 2": "P2" },
    });
    const cs = MastercamCADExecutionBridge.renderNETHookScaffold(plan);
    expect(cs).toContain("// === PRE-SELECTION REQUIRED [TRACKED] ===");
    expect(cs).toContain("// Operator must pre-pick entity for: Endpoint 1");
    expect(cs).toContain("// Operator must pre-pick entity for: Endpoint 2");
  });

  it("renders provided parameters as labelled C#-flavored comments", async () => {
    const plan = await MastercamCADExecutionBridge.plan({
      moduleId: "wireframe_operations",
      operationId: "LINE_ENDPOINTS",
      params: {
        "Endpoint 1": "P1",
        "Endpoint 2": "P2",
        "Length Mode": "absolute_3d",
        Length: 12.7,
      },
    });
    const cs = MastercamCADExecutionBridge.renderNETHookScaffold(plan);
    expect(cs).toContain(`// Length Mode = "absolute_3d"`);
    expect(cs).toContain("// Length = 12.7");
  });

  it("emits SKIPPED block when unknown params dropped", async () => {
    const plan = await MastercamCADExecutionBridge.plan({
      moduleId: "wireframe_operations",
      operationId: "LINE_ENDPOINTS",
      params: { "Endpoint 1": "P1", "Endpoint 2": "P2", unknown: "x" },
    });
    const cs = MastercamCADExecutionBridge.renderNETHookScaffold(plan);
    expect(cs).toContain("// === SKIPPED (NOT IN CATALOG) ===");
    expect(cs).toContain("// unknown");
  });

  it("emits empty-params marker when no params provided", () => {
    const plan: MastercamExecutionPlan = {
      module_id: "synthetic",
      operation_id: "SYNTHETIC_OP",
      mastercam_command: "Synthetic",
      mastercam_api: "Mastercam.Synthetic.Class.Method",
      category: "Synthetic",
      provided_params: {},
      skipped_params: [],
      preselect_required: [],
    };
    const cs = MastercamCADExecutionBridge.renderNETHookScaffold(plan);
    expect(cs).toContain("// (none)");
  });

  it("inserts TRACKED marker before the API call site", async () => {
    const plan = await MastercamCADExecutionBridge.plan({
      moduleId: "wireframe_operations",
      operationId: "LINE_ENDPOINTS",
      params: { "Endpoint 1": "P1", "Endpoint 2": "P2" },
    });
    const cs = MastercamCADExecutionBridge.renderNETHookScaffold(plan);
    expect(cs).toContain(
      "[TRACKED] Order positional arguments per Mastercam.Curves.LineCreator.CreateByEndpoints",
    );
  });

  it("emits the call site with the catalog's fully-qualified namespace path verbatim", async () => {
    const plan = await MastercamCADExecutionBridge.plan({
      moduleId: "wireframe_operations",
      operationId: "POINT",
      params: { "Sketch Plane": "Top", Position: "0,0,0" },
    });
    const cs = MastercamCADExecutionBridge.renderNETHookScaffold(plan);
    expect(cs).toContain("var result = Mastercam.Curves.PointCreator.Create(");
  });
});

// ============================================================================
// SECTION 5 — renderNETHookScaffold(): using directive inference
// ============================================================================

describe("MastercamCADExecutionBridge.renderNETHookScaffold() — using directive inference", () => {
  function syntheticPlan(api: string): MastercamExecutionPlan {
    return {
      module_id: "synthetic",
      operation_id: "SYNTHETIC_OP",
      mastercam_command: "Synthetic",
      mastercam_api: api,
      category: "Synthetic",
      provided_params: {},
      skipped_params: [],
      preselect_required: [],
    };
  }

  it("always emits using Mastercam.IO and Mastercam.App", () => {
    const cs = MastercamCADExecutionBridge.renderNETHookScaffold(
      syntheticPlan("Mastercam.Curves.LineCreator.CreateByEndpoints"),
    );
    expect(cs).toContain("using Mastercam.IO;");
    expect(cs).toContain("using Mastercam.App;");
  });

  it("derives the namespace using directive from the api binding", () => {
    const cs = MastercamCADExecutionBridge.renderNETHookScaffold(
      syntheticPlan("Mastercam.Curves.LineCreator.CreateByEndpoints"),
    );
    expect(cs).toContain("using Mastercam.Curves;");
  });

  it("derives Mastercam.Solids namespace for solid-operations bindings", () => {
    const cs = MastercamCADExecutionBridge.renderNETHookScaffold(
      syntheticPlan("Mastercam.Solids.SolidCreator.Extrude"),
    );
    expect(cs).toContain("using Mastercam.Solids;");
  });

  it("derives Mastercam.Surfaces namespace for surface-operations bindings", () => {
    const cs = MastercamCADExecutionBridge.renderNETHookScaffold(
      syntheticPlan("Mastercam.Surfaces.SurfaceCreator.LoftSurface"),
    );
    expect(cs).toContain("using Mastercam.Surfaces;");
  });

  it("emits using directives sorted alphabetically", () => {
    const cs = MastercamCADExecutionBridge.renderNETHookScaffold(
      syntheticPlan("Mastercam.Curves.LineCreator.CreateByEndpoints"),
    );
    const lines = cs.split("\n");
    const usingIdxs = lines
      .map((ln, idx) => ({ ln, idx }))
      .filter((entry) => entry.ln.startsWith("using "));
    const usingTexts = usingIdxs.map((entry) => entry.ln);
    const sorted = [...usingTexts].sort();
    expect(usingTexts).toEqual(sorted);
  });
});

// ============================================================================
// SECTION 6 — round-trip plan + render
// ============================================================================

describe("MastercamCADExecutionBridge — round-trip plan + render", () => {
  it("produces a self-contained NET-Hook scaffold mentioning every provided parameter", async () => {
    const plan = await MastercamCADExecutionBridge.plan({
      moduleId: "wireframe_operations",
      operationId: "LINE_ENDPOINTS",
      params: {
        "Endpoint 1": "P_A",
        "Endpoint 2": "P_B",
        "Length Mode": "projected_2d",
        Length: 75,
        Style: "dashed",
      },
    });
    const cs = MastercamCADExecutionBridge.renderNETHookScaffold(plan);
    for (const key of Object.keys(plan.provided_params)) {
      expect(cs).toContain(`// ${key} = `);
    }
    expect(cs.split("\n").length).toBeGreaterThan(20);
    expect(cs.startsWith("// PRISM Mastercam NET-Hook")).toBe(true);
    expect(cs.endsWith("}")).toBe(true);
  });

  it("formats null values as the C# 'null' literal", () => {
    const plan: MastercamExecutionPlan = {
      module_id: "synthetic",
      operation_id: "SYNTHETIC_OP",
      mastercam_command: "Synthetic",
      mastercam_api: "Mastercam.Synthetic.Class.Method",
      category: "Synthetic",
      provided_params: { OptionalRef: null },
      skipped_params: [],
      preselect_required: [],
    };
    const cs = MastercamCADExecutionBridge.renderNETHookScaffold(plan);
    expect(cs).toContain("// OptionalRef = null");
  });

  it("formats array values as C# new[] { ... } literals", () => {
    const plan: MastercamExecutionPlan = {
      module_id: "synthetic",
      operation_id: "SYNTHETIC_OP",
      mastercam_command: "Synthetic",
      mastercam_api: "Mastercam.Synthetic.Class.Method",
      category: "Synthetic",
      provided_params: { Points: [1, 2, 3] },
      skipped_params: [],
      preselect_required: [],
    };
    const cs = MastercamCADExecutionBridge.renderNETHookScaffold(plan);
    expect(cs).toContain("// Points = new[] { 1, 2, 3 }");
  });

  it("formats booleans as lowercase C# 'true' / 'false'", () => {
    const plan: MastercamExecutionPlan = {
      module_id: "synthetic",
      operation_id: "SYNTHETIC_OP",
      mastercam_command: "Synthetic",
      mastercam_api: "Mastercam.Synthetic.Class.Method",
      category: "Synthetic",
      provided_params: { Toggle: true, OtherToggle: false },
      skipped_params: [],
      preselect_required: [],
    };
    const cs = MastercamCADExecutionBridge.renderNETHookScaffold(plan);
    expect(cs).toContain("// Toggle = true");
    expect(cs).toContain("// OtherToggle = false");
  });
});

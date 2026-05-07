/**
 * Tests for EspritCADExecutionBridge
 * @see src/engines/EspritCADExecutionBridge.ts
 * @see U-CAD-FIDX-ESP-INT-01 (planning↔execution bridge for ESPRIT CAM ops)
 *
 * Real-data tests against the four shipped ESPRIT catalog files
 * (milling / turning / mill_turn / swiss). The catalog defines:
 *   milling:   profitmilling_rough, pocket_rough, contour_finish,
 *              z_level_finish, face_mill
 *   turning:   profitturning, rough_turn, finish_turn, thread, groove
 *   mill_turn: live_tool_drill_cyl, live_tool_mill_face,
 *              sub_spindle_handoff, balanced_cut
 *   swiss:     swiss_turn, back_work, thread_whirling, polygon_turning
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  EspritCADExecutionBridge,
  type EspritExecutionPlan,
} from "../engines/EspritCADExecutionBridge.js";
import { EspritFunctionIndexEngine } from "../engines/EspritFunctionIndexEngine.js";

beforeEach(() => {
  // Each test gets a fresh load so cache state can't leak from neighbors.
  EspritFunctionIndexEngine.resetCache();
});

// ============================================================================
// SECTION 1 — plan(): spanning happy paths across all 4 sections
// ============================================================================

describe("EspritCADExecutionBridge.plan() — spanning happy paths across sections", () => {
  it("plans profitmilling_rough (milling) with full numeric+enum+boolean payload", async () => {
    const out = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: {
        topZ: 0,
        bottomZ: -25,
        tea: 35,
        stockToLeave: 0.3,
        stepdown: 12,
        stepoverPercent: 12,
        entryMethod: "helix",
        helixAngle: 2,
        direction: "climb",
        feedRateBoost: true,
        boostFactor: 2.5,
      },
    });

    expect(out.operation_id).toBe("profitmilling_rough");
    expect(out.section).toBe("milling");
    expect(out.display_name).toBe("ProfitMilling Rough");
    expect(out.category).toBe("high_efficiency");
    expect(out.dialog_tabs).toEqual(
      expect.arrayContaining(["Tool", "Boundary", "Levels", "Engagement"]),
    );
    expect(out.skipped_params).toEqual([]);
    expect(out.preselect_required).toEqual([]);
    expect(out.provided_params).toHaveLength(11);
    const topZ = out.provided_params.find((p) => p.name === "topZ");
    expect(topZ?.group).toBe("levels");
    expect(topZ?.value).toBe(0);
    const direction = out.provided_params.find((p) => p.name === "direction");
    expect(direction?.group).toBe("linking");
    expect(direction?.value).toBe("climb");
  });

  it("plans pocket_rough (milling) and surfaces selection-typed islandSelection as preselect_required", async () => {
    const out = await EspritCADExecutionBridge.plan({
      operationId: "pocket_rough",
      params: {
        topZ: 0,
        bottomZ: -10,
        stepdown: 1.5,
        stepoverPercent: 60,
        patternType: "offset",
      },
    });

    expect(out.operation_id).toBe("pocket_rough");
    expect(out.section).toBe("milling");
    expect(out.preselect_required).toContain("islandSelection");
  });

  it("plans an operation in the turning section and returns section='turning'", async () => {
    const ops = EspritFunctionIndexEngine.listOperations().filter((o) => o.section === "turning");
    expect(ops.length).toBeGreaterThan(0);
    const turningOp = ops[0];
    const lookup = EspritFunctionIndexEngine.getOperation(turningOp.operation_id);
    if ("error" in lookup) throw new Error(`unexpected: ${lookup.error}`);
    const params = buildMinimalParams(lookup.operation);
    const out = await EspritCADExecutionBridge.plan({
      operationId: turningOp.operation_id,
      params,
    });
    expect(out.section).toBe("turning");
    expect(out.operation_id).toBe(turningOp.operation_id);
    expect(out.display_name).toBe(lookup.operation.display_name);
  });

  it("plans an operation in the mill_turn section and returns section='mill_turn'", async () => {
    const ops = EspritFunctionIndexEngine.listOperations().filter((o) => o.section === "mill_turn");
    expect(ops.length).toBeGreaterThan(0);
    const millTurnOp = ops[0];
    const lookup = EspritFunctionIndexEngine.getOperation(millTurnOp.operation_id);
    if ("error" in lookup) throw new Error(`unexpected: ${lookup.error}`);
    const params = buildMinimalParams(lookup.operation);
    const out = await EspritCADExecutionBridge.plan({
      operationId: millTurnOp.operation_id,
      params,
    });
    expect(out.section).toBe("mill_turn");
    expect(out.category).toBe(lookup.operation.category);
  });

  it("plans an operation in the swiss section and returns section='swiss'", async () => {
    const ops = EspritFunctionIndexEngine.listOperations().filter((o) => o.section === "swiss");
    expect(ops.length).toBeGreaterThan(0);
    const swissOp = ops[0];
    const lookup = EspritFunctionIndexEngine.getOperation(swissOp.operation_id);
    if ("error" in lookup) throw new Error(`unexpected: ${lookup.error}`);
    const params = buildMinimalParams(lookup.operation);
    const out = await EspritCADExecutionBridge.plan({
      operationId: swissOp.operation_id,
      params,
    });
    expect(out.section).toBe("swiss");
    expect(out.dialog_tabs).toEqual(lookup.operation.dialog_tabs ?? []);
  });
});

// ============================================================================
// SECTION 2 — plan(): argument validation failure modes
// ============================================================================

describe("EspritCADExecutionBridge.plan() — argument validation", () => {
  it("rejects empty operationId", async () => {
    await expect(
      EspritCADExecutionBridge.plan({ operationId: "", params: {} }),
    ).rejects.toThrow(/operationId required/);
  });

  it("rejects non-string operationId (number)", async () => {
    await expect(
      // @ts-expect-error — deliberate runtime check
      EspritCADExecutionBridge.plan({ operationId: 42, params: {} }),
    ).rejects.toThrow(/operationId required/);
  });

  it("rejects non-string operationId (null)", async () => {
    await expect(
      // @ts-expect-error — deliberate runtime check
      EspritCADExecutionBridge.plan({ operationId: null, params: {} }),
    ).rejects.toThrow(/operationId required/);
  });

  it("rejects missing params (undefined)", async () => {
    await expect(
      // @ts-expect-error — deliberate runtime check
      EspritCADExecutionBridge.plan({ operationId: "profitmilling_rough" }),
    ).rejects.toThrow(/params must be a plain object/);
  });

  it("rejects non-object params (array)", async () => {
    await expect(
      EspritCADExecutionBridge.plan({
        operationId: "profitmilling_rough",
        // @ts-expect-error — deliberate runtime check
        params: [1, 2, 3],
      }),
    ).rejects.toThrow(/params must be a plain object/);
  });

  it("rejects non-object params (string)", async () => {
    await expect(
      EspritCADExecutionBridge.plan({
        operationId: "profitmilling_rough",
        // @ts-expect-error — deliberate runtime check
        params: "not an object",
      }),
    ).rejects.toThrow(/params must be a plain object/);
  });

  it("rejects unknown operation_id", async () => {
    await expect(
      EspritCADExecutionBridge.plan({
        operationId: "definitely_not_a_real_op",
        params: { topZ: 0, bottomZ: -1, tea: 30 },
      }),
    ).rejects.toThrow(/operation not found/);
  });
});

// ============================================================================
// SECTION 3 — plan(): sectionHint behavior
// ============================================================================

describe("EspritCADExecutionBridge.plan() — sectionHint", () => {
  it("rejects sectionHint pointing at an unknown section", async () => {
    await expect(
      EspritCADExecutionBridge.plan({
        operationId: "profitmilling_rough",
        params: { topZ: 0, bottomZ: -1, tea: 30 },
        sectionHint: "nonexistent_section",
      }),
    ).rejects.toThrow(/sectionHint .* not found/);
  });

  it("rejects sectionHint pointing at a real section that does NOT contain the op", async () => {
    await expect(
      EspritCADExecutionBridge.plan({
        operationId: "profitmilling_rough",
        params: { topZ: 0, bottomZ: -1, tea: 30 },
        sectionHint: "swiss",
      }),
    ).rejects.toThrow(/does not contain operation/);
  });

  it("honors sectionHint when it agrees with the auto-detected section", async () => {
    const out = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -1, tea: 30 },
      sectionHint: "milling",
    });
    expect(out.section).toBe("milling");
  });
});

// ============================================================================
// SECTION 4 — plan(): required-parameter enforcement
// ============================================================================

describe("EspritCADExecutionBridge.plan() — required parameter enforcement", () => {
  it("throws when a required parameter is missing", async () => {
    // profitmilling_rough requires topZ, bottomZ, tea
    await expect(
      EspritCADExecutionBridge.plan({
        operationId: "profitmilling_rough",
        params: { tea: 30 }, // missing topZ + bottomZ
      }),
    ).rejects.toThrow(/missing required parameters/);
  });

  it("lists all missing required parameters in a single error message", async () => {
    let caught: unknown = null;
    try {
      await EspritCADExecutionBridge.plan({
        operationId: "profitmilling_rough",
        params: {}, // missing all three required
      });
    } catch (err) {
      caught = err;
    }
    expect(caught instanceof Error).toBe(true);
    const msg = (caught as Error).message;
    expect(msg).toContain("topZ");
    expect(msg).toContain("bottomZ");
    expect(msg).toContain("tea");
  });

  it("accepts a payload containing exactly the required parameters", async () => {
    const out = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -5, tea: 35 },
    });
    expect(out.provided_params).toHaveLength(3);
    expect(out.provided_params.map((p) => p.name).sort()).toEqual(["bottomZ", "tea", "topZ"]);
  });
});

// ============================================================================
// SECTION 5 — plan(): type validation per parameter type
// ============================================================================

describe("EspritCADExecutionBridge.plan() — type validation", () => {
  it("rejects boolean param given a string", async () => {
    await expect(
      EspritCADExecutionBridge.plan({
        operationId: "profitmilling_rough",
        params: { topZ: 0, bottomZ: -1, tea: 30, feedRateBoost: "yes" },
      }),
    ).rejects.toThrow(/expected boolean/);
  });

  it("rejects number param given a string", async () => {
    await expect(
      EspritCADExecutionBridge.plan({
        operationId: "profitmilling_rough",
        params: { topZ: "zero", bottomZ: -1, tea: 30 },
      }),
    ).rejects.toThrow(/expected finite number/);
  });

  it("rejects number param given NaN", async () => {
    await expect(
      EspritCADExecutionBridge.plan({
        operationId: "profitmilling_rough",
        params: { topZ: NaN, bottomZ: -1, tea: 30 },
      }),
    ).rejects.toThrow(/expected finite number/);
  });

  it("rejects number param given Infinity", async () => {
    await expect(
      EspritCADExecutionBridge.plan({
        operationId: "profitmilling_rough",
        params: { topZ: Infinity, bottomZ: -1, tea: 30 },
      }),
    ).rejects.toThrow(/expected finite number/);
  });

  it("rejects number param given -Infinity", async () => {
    await expect(
      EspritCADExecutionBridge.plan({
        operationId: "profitmilling_rough",
        params: { topZ: 0, bottomZ: -Infinity, tea: 30 },
      }),
    ).rejects.toThrow(/expected finite number/);
  });

  it("rejects enum given a non-string value", async () => {
    await expect(
      EspritCADExecutionBridge.plan({
        operationId: "profitmilling_rough",
        params: { topZ: 0, bottomZ: -1, tea: 30, direction: 123 },
      }),
    ).rejects.toThrow(/expected string enum/);
  });

  it("rejects enum value not in the allowed list", async () => {
    await expect(
      EspritCADExecutionBridge.plan({
        operationId: "profitmilling_rough",
        params: { topZ: 0, bottomZ: -1, tea: 30, direction: "diagonal" },
      }),
    ).rejects.toThrow(/not in allowed enum list/);
  });

  it("accepts enum value 'conventional' in the allowed list", async () => {
    const out = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -1, tea: 30, direction: "conventional" },
    });
    const dir = out.provided_params.find((p) => p.name === "direction");
    expect(dir?.value).toBe("conventional");
  });

  it("accepts enum value 'climb' in the allowed list", async () => {
    const out = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -1, tea: 30, direction: "climb" },
    });
    const dir = out.provided_params.find((p) => p.name === "direction");
    expect(dir?.value).toBe("climb");
  });
});

// ============================================================================
// SECTION 6 — plan(): range validation
// ============================================================================

describe("EspritCADExecutionBridge.plan() — range validation", () => {
  it("rejects numeric below range min (tea < 5)", async () => {
    await expect(
      EspritCADExecutionBridge.plan({
        operationId: "profitmilling_rough",
        params: { topZ: 0, bottomZ: -1, tea: 1 },
      }),
    ).rejects.toThrow(/below range min=5/);
  });

  it("rejects numeric above range max (tea > 90)", async () => {
    await expect(
      EspritCADExecutionBridge.plan({
        operationId: "profitmilling_rough",
        params: { topZ: 0, bottomZ: -1, tea: 95 },
      }),
    ).rejects.toThrow(/above range max=90/);
  });

  it("accepts numeric exactly at range min (tea=5)", async () => {
    const out = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -1, tea: 5 },
    });
    const tea = out.provided_params.find((p) => p.name === "tea");
    expect(tea?.value).toBe(5);
  });

  it("accepts numeric exactly at range max (tea=90)", async () => {
    const out = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -1, tea: 90 },
    });
    const tea = out.provided_params.find((p) => p.name === "tea");
    expect(tea?.value).toBe(90);
  });

  it("accepts a value with no range constraint (no range key in spec)", async () => {
    // topZ has no `range` in the catalog — any finite number is allowed.
    const out = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 1_000_000, bottomZ: -999_999, tea: 30 },
    });
    expect(out.provided_params.find((p) => p.name === "topZ")?.value).toBe(1_000_000);
  });
});

// ============================================================================
// SECTION 7 — plan(): unknown params + parameter-name boundary
// ============================================================================

describe("EspritCADExecutionBridge.plan() — unknown params + name limits", () => {
  it("collects unknown parameter names into skipped_params", async () => {
    const out = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: {
        topZ: 0,
        bottomZ: -1,
        tea: 30,
        thisIsNotInTheCatalog: "ignore-me",
        anotherUnknown: 42,
      },
    });
    expect(out.skipped_params).toEqual(
      expect.arrayContaining(["thisIsNotInTheCatalog", "anotherUnknown"]),
    );
    // The unknown params must NOT appear in provided_params: assert via name-list.
    const providedNames = out.provided_params.map((p) => p.name);
    expect(providedNames).not.toContain("thisIsNotInTheCatalog");
    expect(providedNames).not.toContain("anotherUnknown");
    expect(providedNames.sort()).toEqual(["bottomZ", "tea", "topZ"]);
  });

  it("rejects an oversized parameter name (200 chars)", async () => {
    const longName = "x".repeat(200);
    await expect(
      EspritCADExecutionBridge.plan({
        operationId: "profitmilling_rough",
        params: { topZ: 0, bottomZ: -1, tea: 30, [longName]: 1 },
      }),
    ).rejects.toThrow(/parameter name exceeds 128 chars/);
  });

  it("accepts a parameter name at exactly 128 chars (skipped because not in catalog)", async () => {
    const exactName = "x".repeat(128);
    const out = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -1, tea: 30, [exactName]: 1 },
    });
    expect(out.skipped_params).toContain(exactName);
  });
});

// ============================================================================
// SECTION 8 — renderKBMScaffold(): structural assertions
// ============================================================================

describe("EspritCADExecutionBridge.renderKBMScaffold() — structure", () => {
  it("emits a header comment block with op id, section, display, category", async () => {
    const plan = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -1, tea: 30 },
    });
    const out = EspritCADExecutionBridge.renderKBMScaffold(plan);
    expect(out).toContain("' Operation: profitmilling_rough");
    expect(out).toContain("' Section: milling");
    expect(out).toContain("' Display: ProfitMilling Rough");
    expect(out).toContain("' Category: high_efficiency");
  });

  it("emits the dialog_tabs comment block with each tab name", async () => {
    const plan = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -1, tea: 30 },
    });
    const out = EspritCADExecutionBridge.renderKBMScaffold(plan);
    expect(out).toContain("=== DIALOG TABS");
    expect(out).toContain("'   Tool");
    expect(out).toContain("'   Levels");
    expect(out).toContain("'   Engagement");
    expect(out).toContain("'   Boundary");
  });

  it("emits the AddOperation call with the correct operation id", async () => {
    const plan = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -1, tea: 30 },
    });
    const out = EspritCADExecutionBridge.renderKBMScaffold(plan);
    expect(out).toContain('Set op = ops.AddOperation("profitmilling_rough")');
  });

  it("emits PRE-SELECTION REQUIRED block when selection-typed params exist", async () => {
    const plan = await EspritCADExecutionBridge.plan({
      operationId: "pocket_rough",
      params: { topZ: 0, bottomZ: -1, stepdown: 1 },
    });
    const out = EspritCADExecutionBridge.renderKBMScaffold(plan);
    expect(out).toContain("PRE-SELECTION REQUIRED");
    expect(out).toContain("Operator must pre-pick geometry for: islandSelection");
  });

  it("omits PRE-SELECTION block when no selection-typed params exist", async () => {
    const plan = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -1, tea: 30 },
    });
    const out = EspritCADExecutionBridge.renderKBMScaffold(plan);
    expect(out).not.toContain("PRE-SELECTION REQUIRED");
  });

  it("groups provided parameters by their dialog group (3 groups for mixed payload)", async () => {
    const plan = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: {
        topZ: 0,
        bottomZ: -10,
        tea: 30,
        stockToLeave: 0.5,
      },
    });
    const out = EspritCADExecutionBridge.renderKBMScaffold(plan);
    // levels group has topZ + bottomZ, boundary group has stockToLeave,
    // engagement group has tea — expect three "GROUP: ..." headers.
    expect(out).toContain("=== GROUP: levels");
    expect(out).toContain("=== GROUP: boundary");
    expect(out).toContain("=== GROUP: engagement");
  });

  it('emits SetParameter calls with KBM-quoted strings, integers, and booleans', async () => {
    const plan = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: {
        topZ: 0,
        bottomZ: -10,
        tea: 35,
        direction: "climb",
        feedRateBoost: true,
      },
    });
    const out = EspritCADExecutionBridge.renderKBMScaffold(plan);
    expect(out).toContain('op.SetParameter("levels", "topZ", 0)');
    expect(out).toContain('op.SetParameter("levels", "bottomZ", -10)');
    expect(out).toContain('op.SetParameter("engagement", "tea", 35)');
    expect(out).toContain('op.SetParameter("linking", "direction", "climb")');
    expect(out).toContain('op.SetParameter("smoothing", "feedRateBoost", True)');
  });

  it("emits SKIPPED block listing each unknown parameter", async () => {
    const plan = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -1, tea: 30, mysteryX: 1, mysteryY: 2 },
    });
    const out = EspritCADExecutionBridge.renderKBMScaffold(plan);
    expect(out).toContain("=== SKIPPED");
    expect(out).toContain("'   mysteryX");
    expect(out).toContain("'   mysteryY");
  });

  it("omits SKIPPED block when every supplied param matched a catalog spec", async () => {
    const plan = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -1, tea: 30 },
    });
    const out = EspritCADExecutionBridge.renderKBMScaffold(plan);
    expect(out).not.toContain("=== SKIPPED");
  });

  it("emits a 'no parameters supplied' marker when provided_params is empty (mock plan)", () => {
    const mockPlan: EspritExecutionPlan = {
      operation_id: "test_op",
      section: "milling",
      display_name: "Test Op",
      category: "test",
      dialog_tabs: ["Tool"],
      provided_params: [],
      skipped_params: [],
      preselect_required: [],
    };
    const out = EspritCADExecutionBridge.renderKBMScaffold(mockPlan);
    expect(out).toContain("(none supplied — operation will use ESPRIT defaults)");
  });

  it("emits Sub Main / End Sub wrapper and finalize calls", async () => {
    const plan = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -1, tea: 30 },
    });
    const out = EspritCADExecutionBridge.renderKBMScaffold(plan);
    expect(out).toContain("Sub Main()");
    expect(out).toContain("End Sub");
    expect(out).toContain("op.Update");
    expect(out).toContain("doc.Save");
  });

  it("escapes embedded double-quotes in string values (KBM double-quote convention)", () => {
    // Direct mock-plan render — we can't easily inject a string param without
    // a string-typed catalog entry, so test the formatter via a synthetic plan.
    const mockPlan: EspritExecutionPlan = {
      operation_id: "profitmilling_rough",
      section: "milling",
      display_name: "ProfitMilling Rough",
      category: "high_efficiency",
      dialog_tabs: ["Levels"],
      provided_params: [
        { group: "comments", name: "note", value: 'has "embedded" quotes' },
      ],
      skipped_params: [],
      preselect_required: [],
    };
    const out = EspritCADExecutionBridge.renderKBMScaffold(mockPlan);
    expect(out).toContain('"has ""embedded"" quotes"');
  });

  it("formats false boolean as KBM 'False'", async () => {
    const plan = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -1, tea: 30, feedRateBoost: false },
    });
    const out = EspritCADExecutionBridge.renderKBMScaffold(plan);
    expect(out).toContain('op.SetParameter("smoothing", "feedRateBoost", False)');
  });

  it("formats null and undefined values via the KBM null/empty convention (mock plan)", () => {
    const mockPlan: EspritExecutionPlan = {
      operation_id: "test_op",
      section: "milling",
      display_name: "Test",
      category: "test",
      dialog_tabs: [],
      provided_params: [
        { group: "g", name: "nv", value: null },
        { group: "g", name: "uv", value: undefined },
      ],
      skipped_params: [],
      preselect_required: [],
    };
    const out = EspritCADExecutionBridge.renderKBMScaffold(mockPlan);
    expect(out).toContain('op.SetParameter("g", "nv", Null)');
    expect(out).toContain('op.SetParameter("g", "uv", Empty)');
  });

  it("formats array values as KBM Array() literal (mock plan)", () => {
    const mockPlan: EspritExecutionPlan = {
      operation_id: "test_op",
      section: "milling",
      display_name: "Test",
      category: "test",
      dialog_tabs: [],
      provided_params: [
        { group: "g", name: "arr", value: [1, 2, "three"] },
      ],
      skipped_params: [],
      preselect_required: [],
    };
    const out = EspritCADExecutionBridge.renderKBMScaffold(mockPlan);
    expect(out).toContain('op.SetParameter("g", "arr", Array(1, 2, "three"))');
  });
});

// ============================================================================
// SECTION 9 — adversarial inputs
// ============================================================================

describe("EspritCADExecutionBridge — adversarial inputs", () => {
  it("handles a very large finite numeric value (within unconstrained spec)", async () => {
    const out = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 1e15, bottomZ: -1e15, tea: 30 },
    });
    expect(out.provided_params.find((p) => p.name === "topZ")?.value).toBe(1e15);
    expect(out.provided_params.find((p) => p.name === "bottomZ")?.value).toBe(-1e15);
  });

  it("handles a numeric value with high decimal precision", async () => {
    const out = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params: { topZ: 0, bottomZ: -1, tea: 30, stepoverPercent: 12.345678 },
    });
    expect(out.provided_params.find((p) => p.name === "stepoverPercent")?.value).toBe(12.345678);
  });

  it("rejects unknown enum value with truncation marker (no full long string leaked)", async () => {
    const longBad = "x".repeat(100);
    let caught: unknown = null;
    try {
      await EspritCADExecutionBridge.plan({
        operationId: "profitmilling_rough",
        params: { topZ: 0, bottomZ: -1, tea: 30, direction: longBad },
      });
    } catch (err) {
      caught = err;
    }
    expect(caught instanceof Error).toBe(true);
    const msg = (caught as Error).message;
    expect(msg).toContain("not in allowed enum list");
    expect(msg).toContain("...");
    // Truncated to 32 chars + "..." — the full 100-char value must NOT appear verbatim.
    expect(msg.includes(longBad)).toBe(false);
  });

  it("preserves Object.create(null) params input (no prototype shenanigans)", async () => {
    const params = Object.create(null) as Record<string, unknown>;
    params.topZ = 0;
    params.bottomZ = -1;
    params.tea = 30;
    const out = await EspritCADExecutionBridge.plan({
      operationId: "profitmilling_rough",
      params,
    });
    expect(out.provided_params).toHaveLength(3);
  });
});

// ============================================================================
// SECTION 10 — round-trip determinism
// ============================================================================

describe("EspritCADExecutionBridge — plan→render round-trip determinism", () => {
  it("produces identical KBM output for two identical plan calls", async () => {
    const args = {
      operationId: "profitmilling_rough" as const,
      params: { topZ: 0, bottomZ: -10, tea: 35, direction: "climb" },
    };
    const planA = await EspritCADExecutionBridge.plan(args);
    const planB = await EspritCADExecutionBridge.plan(args);
    const outA = EspritCADExecutionBridge.renderKBMScaffold(planA);
    const outB = EspritCADExecutionBridge.renderKBMScaffold(planB);
    expect(outA).toBe(outB);
    // Stable across ESPRIT-distinctive markers.
    expect(outA).toContain('AddOperation("profitmilling_rough")');
    expect(outA).toContain('op.SetParameter("engagement", "tea", 35)');
  });
});

// ============================================================================
// HELPERS — module-private to this test file
// ============================================================================

/**
 * Build the smallest payload that satisfies an Esprit operation's required
 * fields by reading the catalog and synthesizing minimal valid values per
 * declared type. Used by the spanning-section tests so they aren't brittle
 * across catalog updates.
 *
 * Rules:
 *   - boolean   → true
 *   - number/integer → range[0] when present, else 0
 *   - enum      → values[0] when present, else "" (will fail validation,
 *                 but we never call this for ops where the required field is
 *                 an enum without values)
 *   - string    → ""
 *   - selection → "auto-select-token" (opaque string accepted by the bridge)
 */
function buildMinimalParams(
  op: { parameters?: Record<string, Record<string, { type: string; range?: [number, number]; values?: string[]; required?: boolean }>> },
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!op.parameters) return out;
  for (const group of Object.values(op.parameters)) {
    for (const [name, def] of Object.entries(group)) {
      if (def.required !== true) continue;
      const t = (def.type ?? "").toLowerCase();
      if (t === "boolean" || t === "checkbox" || t === "bool") {
        out[name] = true;
      } else if (t === "number" || t === "integer" || t === "int" || t === "numeric" || t === "spinner") {
        out[name] = Array.isArray(def.range) ? def.range[0] : 0;
      } else if (t === "enum" || t === "dropdown" || t === "combo" || t === "select") {
        out[name] = Array.isArray(def.values) && def.values.length > 0 ? def.values[0] : "";
      } else if (t === "string" || t === "text") {
        out[name] = "";
      } else {
        out[name] = "auto-select-token";
      }
    }
  }
  return out;
}

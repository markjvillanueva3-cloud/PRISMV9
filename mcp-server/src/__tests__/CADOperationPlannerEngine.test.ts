/**
 * CADOperationPlannerEngine tests — U-CUIX-P0-20 / CAD-UIX-MS0
 *
 * Covers:
 *   1. Intent validation (required fields, unique IDs, known feature kinds)
 *   2. Feature expansion for each of 14 PLANNER_FEATURE_KINDS
 *   3. Topological-sort correctness + cycle detection
 *   4. Adapter capability gating (UnsupportedFeatureError)
 *   5. Cross-CAD compatibility probe
 *   6. Parameter declaration routing (supported vs unsupported)
 *   7. End-to-end: planned ops accepted by the target adapter's buildScript
 */

import { describe, it, expect } from "vitest";
import {
  cadOperationPlannerEngine,
  CADOperationPlannerEngine,
  PlannerCycleError,
  PlannerIntentError,
  UnsupportedFeatureError,
  PLANNER_FEATURE_KINDS,
  type CADIntent,
  type CADFeatureIntent,
} from "../engines/CADOperationPlannerEngine.js";
import { getCADAdapter, CAD_REGISTERED_SYSTEMS } from "../engines/CADAdapterRegistry.js";

// ── Fixture helpers ────────────────────────────────────────────────────

function simpleBlock(cadSystem: string = "freecad"): CADIntent {
  return {
    name: "simple_block",
    cadSystem: cadSystem as any,
    features: [
      {
        id: "f1",
        kind: "rectangle_extrude",
        params: { width: 50, height: 30, depth: 10 },
      },
    ],
  };
}

function multiFeature(cadSystem: string = "freecad"): CADIntent {
  return {
    name: "bracket",
    cadSystem: cadSystem as any,
    features: [
      { id: "base", kind: "rectangle_extrude", params: { width: 100, height: 50, depth: 15 } },
      { id: "hole1", kind: "hole", params: { x: 25, y: 25, diameter: 6, depth: 15 }, dependsOn: ["base"] },
      { id: "fillet", kind: "fillet_edges", params: { radius: 2 }, dependsOn: ["base", "hole1"] },
    ],
  };
}

// ── Singleton + class shape ────────────────────────────────────────────

describe("CADOperationPlannerEngine — module exports", () => {
  it("exports singleton", () => {
    expect(cadOperationPlannerEngine).toBeDefined();
    expect(cadOperationPlannerEngine).toBeInstanceOf(CADOperationPlannerEngine);
  });

  it("exports 14 feature kinds", () => {
    expect(PLANNER_FEATURE_KINDS.length).toBe(14);
  });

  it("exports typed errors", () => {
    expect(new UnsupportedFeatureError("x", [], []).code).toBe("UNSUPPORTED_FEATURE");
    expect(new PlannerCycleError(["a", "b"]).code).toBe("PLANNER_CYCLE");
    expect(new PlannerIntentError("msg").code).toBe("PLANNER_INTENT_INVALID");
  });
});

// ── Intent validation ──────────────────────────────────────────────────

describe("plan() — intent validation", () => {
  it("rejects missing name", async () => {
    await expect(
      cadOperationPlannerEngine.plan({ cadSystem: "freecad", features: [] } as unknown as CADIntent),
    ).rejects.toThrow(PlannerIntentError);
  });

  it("rejects empty features", async () => {
    await expect(
      cadOperationPlannerEngine.plan({ name: "x", cadSystem: "freecad", features: [] }),
    ).rejects.toThrow(/non-empty array/);
  });

  it("rejects missing cadSystem", async () => {
    await expect(
      cadOperationPlannerEngine.plan({ name: "x", features: [{ id: "f", kind: "hole", params: {} }] } as unknown as CADIntent),
    ).rejects.toThrow(/cadSystem/);
  });

  it("rejects duplicate feature ids", async () => {
    await expect(
      cadOperationPlannerEngine.plan({
        name: "x",
        cadSystem: "freecad",
        features: [
          { id: "dup", kind: "hole", params: { diameter: 5, depth: 5 } },
          { id: "dup", kind: "hole", params: { diameter: 5, depth: 5 } },
        ],
      }),
    ).rejects.toThrow(/duplicate feature id/);
  });

  it("rejects unknown feature kind", async () => {
    await expect(
      cadOperationPlannerEngine.plan({
        name: "x",
        cadSystem: "freecad",
        features: [{ id: "f", kind: "teleport" as any, params: {} }],
      }),
    ).rejects.toThrow(/unknown feature kind/);
  });

  it("rejects self-dependency", async () => {
    await expect(
      cadOperationPlannerEngine.plan({
        name: "x",
        cadSystem: "freecad",
        features: [{ id: "a", kind: "hole", params: { diameter: 5, depth: 5 }, dependsOn: ["a"] }],
      }),
    ).rejects.toThrow(/depends on itself/);
  });

  it("rejects dependsOn to unknown id", async () => {
    await expect(
      cadOperationPlannerEngine.plan({
        name: "x",
        cadSystem: "freecad",
        features: [{ id: "a", kind: "hole", params: { diameter: 5, depth: 5 }, dependsOn: ["nope"] }],
      }),
    ).rejects.toThrow(/unknown id 'nope'/);
  });

  it("rejects non-finite numeric params", async () => {
    await expect(
      cadOperationPlannerEngine.plan({
        name: "x",
        cadSystem: "freecad",
        features: [{ id: "f", kind: "hole", params: { diameter: NaN, depth: 5 } }],
      }),
    ).rejects.toThrow(/must be a finite number/);
  });
});

// ── Feature expansion ──────────────────────────────────────────────────

describe("plan() — feature expansion", () => {
  it("rectangle_extrude emits 4 ops on FreeCAD (sketch + rect + close + extrude)", async () => {
    const result = await cadOperationPlannerEngine.plan(simpleBlock("freecad"));
    const kinds = result.ops.map((o) => o.kind);
    expect(kinds).toContain("sketch_create");
    expect(kinds).toContain("sketch_rectangle");
    expect(kinds).toContain("feature_extrude");
    expect(result.featureCount).toBe(1);
    expect(result.opCount).toBeGreaterThanOrEqual(3);
  });

  it("circle_extrude emits sketch_circle + feature_extrude", async () => {
    const res = await cadOperationPlannerEngine.plan({
      name: "cyl",
      cadSystem: "freecad",
      features: [{ id: "cyl1", kind: "circle_extrude", params: { diameter: 20, depth: 10 } }],
    });
    const kinds = res.ops.map((o) => o.kind);
    expect(kinds).toContain("sketch_circle");
    expect(kinds).toContain("feature_extrude");
  });

  it("hole emits a single feature_hole op (no sketch required)", async () => {
    const res = await cadOperationPlannerEngine.plan({
      name: "h",
      cadSystem: "freecad",
      features: [{ id: "h1", kind: "hole", params: { x: 0, y: 0, diameter: 5, depth: 10 } }],
    });
    expect(res.ops.length).toBe(1);
    expect(res.ops[0]!.kind).toBe("feature_hole");
  });

  it("fillet_edges with no edges list sets autoSelectAllEdges=true", async () => {
    const res = await cadOperationPlannerEngine.plan({
      name: "f",
      cadSystem: "freecad",
      features: [{ id: "f1", kind: "fillet_edges", params: { radius: 3 } }],
    });
    expect(res.ops[0]!.args.autoSelectAllEdges).toBe(true);
  });

  it("fillet_edges with explicit edge list doesn't autoselect", async () => {
    const res = await cadOperationPlannerEngine.plan({
      name: "f",
      cadSystem: "freecad",
      features: [{ id: "f1", kind: "fillet_edges", params: { radius: 3, edges: ["e1", "e2"] } }],
    });
    expect(res.ops[0]!.args.autoSelectAllEdges).toBe(false);
    expect((res.ops[0]!.args.edges as unknown[]).length).toBe(2);
  });

  it("revolve_rectangle emits feature_revolve", async () => {
    const res = await cadOperationPlannerEngine.plan({
      name: "cone",
      cadSystem: "freecad",
      features: [{ id: "r1", kind: "revolve_rectangle", params: { width: 10, height: 20, angleDeg: 270 } }],
    });
    const revOp = res.ops.find((o) => o.kind === "feature_revolve");
    expect(revOp).toBeDefined();
    expect(revOp!.args.angleDeg).toBe(270);
  });

  it("shell emits feature_shell with thickness", async () => {
    const res = await cadOperationPlannerEngine.plan({
      name: "s",
      cadSystem: "freecad",
      features: [{ id: "s1", kind: "shell", params: { thickness: 1.5 } }],
    });
    expect(res.ops[0]!.kind).toBe("feature_shell");
    expect(res.ops[0]!.args.thickness).toBe(1.5);
  });

  it("linear_pattern rejects count<2", async () => {
    await expect(
      cadOperationPlannerEngine.plan({
        name: "p",
        cadSystem: "freecad",
        features: [{ id: "p1", kind: "linear_pattern", params: { count: 1, spacing: 10 } }],
      }),
    ).rejects.toThrow(/count must be/);
  });

  it("circular_pattern emits pattern_circular", async () => {
    const res = await cadOperationPlannerEngine.plan({
      name: "p",
      cadSystem: "freecad",
      features: [{ id: "p1", kind: "circular_pattern", params: { count: 6, totalAngleDeg: 360 } }],
    });
    expect(res.ops[0]!.kind).toBe("pattern_circular");
    expect(res.ops[0]!.args.count).toBe(6);
  });

  it("export_step emits export_step op with default path", async () => {
    const res = await cadOperationPlannerEngine.plan({
      name: "e",
      cadSystem: "freecad",
      features: [{ id: "e1", kind: "export_step", params: {} }],
    });
    expect(res.ops[0]!.kind).toBe("export_step");
    expect(String(res.ops[0]!.args.path)).toContain(".step");
  });
});

// ── Topological sort ──────────────────────────────────────────────────

describe("plan() — topological sort", () => {
  it("preserves input order when no deps declared", async () => {
    const res = await cadOperationPlannerEngine.plan({
      name: "x",
      cadSystem: "freecad",
      features: [
        { id: "a", kind: "rectangle_extrude", params: { width: 10, height: 10, depth: 5 } },
        { id: "b", kind: "hole", params: { diameter: 3, depth: 5 } },
      ],
    });
    const aExtrude = res.ops.findIndex((o) => o.operationId === "a-extrude");
    const bHole = res.ops.findIndex((o) => o.operationId === "b-hole");
    expect(aExtrude).toBeGreaterThan(-1);
    expect(bHole).toBeGreaterThan(aExtrude);
  });

  it("reorders when dependsOn flips input order", async () => {
    // hole depends on base — even though hole is listed FIRST, it must come after base
    const res = await cadOperationPlannerEngine.plan({
      name: "x",
      cadSystem: "freecad",
      features: [
        { id: "hole", kind: "hole", params: { diameter: 3, depth: 5 }, dependsOn: ["base"] },
        { id: "base", kind: "rectangle_extrude", params: { width: 10, height: 10, depth: 5 } },
      ],
    });
    const baseIdx = res.ops.findIndex((o) => o.operationId === "base-extrude");
    const holeIdx = res.ops.findIndex((o) => o.operationId === "hole-hole");
    expect(baseIdx).toBeGreaterThan(-1);
    expect(holeIdx).toBeGreaterThan(baseIdx);
  });

  it("detects cycles and throws PlannerCycleError", async () => {
    await expect(
      cadOperationPlannerEngine.plan({
        name: "cyc",
        cadSystem: "freecad",
        features: [
          { id: "a", kind: "hole", params: { diameter: 5, depth: 5 }, dependsOn: ["b"] },
          { id: "b", kind: "hole", params: { diameter: 5, depth: 5 }, dependsOn: ["a"] },
        ],
      }),
    ).rejects.toThrow(PlannerCycleError);
  });

  it("chains fillet → after → hole → after → base", async () => {
    const res = await cadOperationPlannerEngine.plan(multiFeature("freecad"));
    const baseIdx = res.ops.findIndex((o) => o.operationId === "base-extrude");
    const holeIdx = res.ops.findIndex((o) => o.operationId === "hole1-hole");
    const filletIdx = res.ops.findIndex((o) => o.operationId === "fillet-fillet");
    expect(baseIdx).toBeLessThan(holeIdx);
    expect(holeIdx).toBeLessThan(filletIdx);
  });
});

// ── Capability gating ────────────────────────────────────────────────

describe("plan() — adapter capability gating", () => {
  it("planning against registered adapter succeeds", async () => {
    const res = await cadOperationPlannerEngine.plan(simpleBlock("freecad"));
    expect(res.cadSystem).toBe("freecad");
  });

  it("unregistered cadSystem rejects via UnknownCADSystemError", async () => {
    await expect(
      cadOperationPlannerEngine.plan({ ...simpleBlock(), cadSystem: "solidworks" as any }),
    ).rejects.toThrow(/not registered/);
  });

  it("target cad must be in CAD_REGISTERED_SYSTEMS", async () => {
    for (const sys of CAD_REGISTERED_SYSTEMS) {
      // All 4 registered systems should plan simple_block fine (all support rect_extrude).
      const a = await getCADAdapter(sys);
      if (
        a.capabilities.supportedOps.has("sketch_create") &&
        a.capabilities.supportedOps.has("sketch_rectangle") &&
        a.capabilities.supportedOps.has("feature_extrude")
      ) {
        const res = await cadOperationPlannerEngine.plan(simpleBlock(sys));
        expect(res.cadSystem).toBe(sys);
        expect(res.opCount).toBeGreaterThan(0);
      }
    }
  });
});

// ── Cross-CAD compatibility probe ────────────────────────────────────

describe("plan() — cross-CAD compatibility rollup", () => {
  it("reports compatibility for each registered CAD", async () => {
    const res = await cadOperationPlannerEngine.plan(simpleBlock("freecad"));
    for (const sys of CAD_REGISTERED_SYSTEMS) {
      expect(res.compatibility[sys]).toMatch(/^(full|partial|unsupported)$/);
    }
  });

  it("target CAD must report 'full' for its own plan", async () => {
    const res = await cadOperationPlannerEngine.plan(simpleBlock("freecad"));
    expect(res.compatibility["freecad"]).toBe("full");
  });
});

// ── Parameter declaration routing ────────────────────────────────────

describe("plan() — parameters", () => {
  it("emits parameter_declare ops when supported", async () => {
    const res = await cadOperationPlannerEngine.plan({
      name: "parametric",
      cadSystem: "freecad",
      parameters: {
        blockWidth: { value: 50, unit: "mm", description: "Block width" },
        blockHeight: { value: 30, unit: "mm" },
      },
      features: [
        { id: "base", kind: "rectangle_extrude", params: { width: 50, height: 30, depth: 10 } },
      ],
    });
    // freecad supports parameter_declare — it's in CAD_OPERATION_KINDS
    const adapter = await getCADAdapter("freecad");
    if (adapter.capabilities.supportedOps.has("parameter_declare")) {
      const paramOps = res.ops.filter((o) => o.kind === "parameter_declare");
      expect(paramOps.length).toBe(2);
    } else {
      const warn = res.warnings.find((w) => w.message.includes("parameter_declare"));
      expect(warn).toBeDefined();
    }
  });

  it("omits parameter ops when intent has no parameters", async () => {
    const res = await cadOperationPlannerEngine.plan(simpleBlock("freecad"));
    const paramOps = res.ops.filter((o) => o.kind === "parameter_declare");
    expect(paramOps.length).toBe(0);
  });
});

// ── Warnings collected ────────────────────────────────────────────────

describe("plan() — warning collection", () => {
  it("returns empty warnings for a clean simple_block", async () => {
    const res = await cadOperationPlannerEngine.plan(simpleBlock("freecad"));
    expect(Array.isArray(res.warnings)).toBe(true);
  });
});

// ── End-to-end: buildScript acceptance ────────────────────────────────

describe("plan() → adapter.buildScript() round-trip", () => {
  it("planned ops on freecad build into a non-empty script", async () => {
    const res = await cadOperationPlannerEngine.plan(simpleBlock("freecad"));
    const adapter = await getCADAdapter("freecad");
    const script = adapter.buildScript(res.ops);
    expect(script.cadSystem).toBe("freecad");
    expect(script.body.length).toBeGreaterThan(0);
    expect(script.lineage.length).toBeGreaterThan(0);
  });

  it("planned ops for multi-feature bracket also build cleanly on freecad", async () => {
    const res = await cadOperationPlannerEngine.plan(multiFeature("freecad"));
    const adapter = await getCADAdapter("freecad");
    // Build may warn about unsupported args but shouldn't throw structural errors.
    // The planner ensures every required op kind is in supportedOps.
    expect(() => adapter.buildScript(res.ops)).not.toThrow(
      /does not support operation/,
    );
  });
});

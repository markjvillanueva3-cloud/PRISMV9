/**
 * CADPartArchetypeRegistryEngine — CAD-COMPLETE-MS0/U-CADC32 tests.
 *
 * Real intent checks (R9): every test encodes WHY the behavior matters for
 * the hyperCAD-S draw-any-part pipeline. No toBeDefined() stubs.
 */

import { describe, it, expect } from "vitest";
import {
  ARCHETYPE_REGISTRY,
  CADPartArchetypeRegistryEngine,
  cadPartArchetypeRegistryEngine,
  getArchetype,
  listKinds,
  materializeArchetype,
} from "../engines/CADPartArchetypeRegistryEngine.js";

describe("ARCHETYPE_REGISTRY frozen contract", () => {
  it("contains exactly 8 starter archetypes (boss/rib/slot/keyway/pocket/2 holes/thread)", () => {
    expect(ARCHETYPE_REGISTRY.length).toBe(8);
  });

  it("every kind is unique (no duplicate registry entries)", () => {
    const kinds = ARCHETYPE_REGISTRY.map(a => a.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it("registry is frozen (defensive against mutation by consumers)", () => {
    expect(Object.isFrozen(ARCHETYPE_REGISTRY)).toBe(true);
  });

  it("every archetype declares at least one required param (placeholders are not allowed)", () => {
    for (const a of ARCHETYPE_REGISTRY) {
      expect(a.required_params.length).toBeGreaterThan(0);
    }
  });

  it("every archetype's op_template references at least one sketch_* or feature_* op", () => {
    for (const a of ARCHETYPE_REGISTRY) {
      const hasRealOp = a.op_template.some(op => op.op.startsWith("sketch_") || op.op.startsWith("feature_"));
      expect(hasRealOp).toBe(true);
    }
  });
});

describe("listKinds", () => {
  it("returns all 8 kinds in registry order", () => {
    expect(listKinds()).toEqual([
      "boss", "rib", "slot_through", "keyway",
      "pocket_rect", "hole_simple", "hole_counterbore", "thread_boss",
    ]);
  });
});

describe("getArchetype", () => {
  it("returns the boss archetype with diameter+height required", () => {
    const boss = getArchetype("boss");
    expect(boss).not.toBeNull();
    expect(boss!.required_params).toEqual(["diameter", "height"]);
  });

  it("returns null on unknown kind via runtime cast (defensive)", () => {
    expect(getArchetype("nonexistent" as never)).toBeNull();
  });
});

describe("materializeArchetype — boss", () => {
  it("emits sketch_circle(diameter=12.7) + feature_extrude(depth=8) for a Ø12.7×8mm boss", () => {
    const ops = materializeArchetype("boss", { diameter: 12.7, height: 8 });
    expect(ops).toEqual([
      { op: "sketch_circle", args: { diameter: 12.7 } },
      { op: "feature_extrude", args: { depth: 8 } },
    ]);
  });

  it("throws (R12 fail-loud) when diameter missing — never silently substitutes 0", () => {
    expect(() => materializeArchetype("boss", { height: 8 } as never)).toThrow(/diameter/);
  });

  it("throws on non-positive diameter (a 0mm boss is a bug, not a feature)", () => {
    expect(() => materializeArchetype("boss", { diameter: 0, height: 8 })).toThrow(/diameter/);
  });

  it("throws on NaN/Infinity (adversarial-input floor per build-enforce R3)", () => {
    expect(() => materializeArchetype("boss", { diameter: NaN, height: 8 })).toThrow();
    expect(() => materializeArchetype("boss", { diameter: Infinity, height: 8 })).toThrow();
  });

  it("throws on negative height (mirrored geometry not supported in extrude semantics here)", () => {
    expect(() => materializeArchetype("boss", { diameter: 10, height: -5 })).toThrow(/height/);
  });
});

describe("materializeArchetype — slot_through (JM Die bracket-flange common case)", () => {
  it("emits sketch_slot(8×24) + feature_extrude(12) for a #10 fastener clearance slot", () => {
    const ops = materializeArchetype("slot_through", { width: 8, length: 24, depth: 12 });
    expect(ops).toEqual([
      { op: "sketch_slot", args: { width: 8, length: 24 } },
      { op: "feature_extrude", args: { depth: 12 } },
    ]);
  });
});

describe("materializeArchetype — hole_counterbore (SHCS recess pattern)", () => {
  it("emits TWO feature_hole ops with distinct diameters/depths (M6 SHCS pattern)", () => {
    const ops = materializeArchetype("hole_counterbore", {
      clearance_diameter: 6.4,
      counterbore_diameter: 11,
      counterbore_depth: 6.5,
      through_depth: 25,
    });
    expect(ops.length).toBe(2);
    expect(ops[0]).toEqual({ op: "feature_hole", args: { diameter: 6.4, depth: 25 } });
    expect(ops[1]).toEqual({ op: "feature_hole", args: { diameter: 11, depth: 6.5 } });
  });
});

describe("materializeArchetype — thread_boss (M8x1.25 fastener anchor)", () => {
  it("emits boss circle + extrude + thread (3 ops, ordered)", () => {
    const ops = materializeArchetype("thread_boss", {
      boss_diameter: 16,
      boss_height: 10,
      thread_diameter: 8,
      thread_pitch: 1.25,
      thread_depth: 8,
    });
    expect(ops.length).toBe(3);
    expect(ops[0].op).toBe("sketch_circle");
    expect(ops[1].op).toBe("feature_extrude");
    expect(ops[2]).toEqual({ op: "feature_thread", args: { diameter: 8, pitch: 1.25 } });
  });
});

describe("CADPartArchetypeRegistryEngine class wrapper", () => {
  it("class instance and singleton agree on registry contents", () => {
    const eng = new CADPartArchetypeRegistryEngine();
    expect(eng.list().length).toBe(cadPartArchetypeRegistryEngine.list().length);
  });

  it("summary reports schemaVersion=1 + count=8 (locked baseline for downstream consumers)", () => {
    const s = cadPartArchetypeRegistryEngine.summary();
    expect(s.schemaVersion).toBe(1);
    expect(s.count).toBe(8);
    expect(s.kinds.length).toBe(8);
  });

  it("materialize round-trips through the class wrapper (no behavior drift vs pure helper)", () => {
    const direct = materializeArchetype("rib", { width: 4, length: 60, height: 15 });
    const wrapped = cadPartArchetypeRegistryEngine.materialize("rib", { width: 4, length: 60, height: 15 });
    expect(wrapped).toEqual(direct);
  });
});

describe("variability floor — 3 archetypes × 3 param configs (R3 build-enforce)", () => {
  const cases: ReadonlyArray<{ kind: "boss" | "slot_through" | "hole_simple"; params: Record<string, number>; expectedOps: number }> = [
    { kind: "boss", params: { diameter: 5, height: 3 }, expectedOps: 2 },
    { kind: "boss", params: { diameter: 50, height: 100 }, expectedOps: 2 },
    { kind: "slot_through", params: { width: 6, length: 18, depth: 6 }, expectedOps: 2 },
    { kind: "slot_through", params: { width: 12, length: 60, depth: 25 }, expectedOps: 2 },
    { kind: "hole_simple", params: { diameter: 3.2, depth: 10 }, expectedOps: 1 },
    { kind: "hole_simple", params: { diameter: 25.4, depth: 50 }, expectedOps: 1 },
  ];
  for (const c of cases) {
    it(`${c.kind} @ ${JSON.stringify(c.params)} → ${c.expectedOps} ops`, () => {
      const ops = materializeArchetype(c.kind, c.params);
      expect(ops.length).toBe(c.expectedOps);
    });
  }
});

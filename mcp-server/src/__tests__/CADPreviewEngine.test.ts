/**
 * CADPreviewEngine tests — CAD-COMPLETE-MS0 / U-AI-07
 * ====================================================
 *
 * Test discipline (per `feedback_engine_tests_in_tests_dir.md`,
 * `feedback_parallel_scrutiny_per_file.md`, CLAUDE.md test-legitimacy gate):
 *
 *  - REAL reference values OR algebraic invariants for every assertion;
 *    no `toBeDefined()` / `toBeTruthy()` placeholder stubs.
 *  - Variability floor: cover ≥3 spanning configurations per surface
 *    (single-op happy / single-op reject / multi-op happy / multi-op
 *    auto-rollback / unknown-doc fabrication / known-doc snapshot).
 *  - Failure modes: bad docId, bad op, non-finite parameter, duplicate
 *    create, unknown delete, NaN, oversize op list, empty op list.
 *  - Adversarial: real-world side-effect probe (never-touch invariant),
 *    sandbox-uniqueness probe, baseline-isolation probe.
 *  - Injection: fake real-world + fake sandbox factory for deterministic
 *    assertions that the engine never invokes a mutating method on the
 *    real production singleton.
 */

import { describe, it, expect } from "vitest";
import {
  CADPreviewEngine,
  cadPreviewEngine,
  type CADRealWorldLike,
} from "../engines/CADPreviewEngine.js";
import {
  CADWorldModelEngine,
  type CADWorldOp,
  type CADWorldState,
  type CADUnits,
} from "../engines/CADWorldModelEngine.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Build a fresh pair of (preview, real-world) wired to each other. */
function freshPair(): {
  preview: CADPreviewEngine;
  real: CADWorldModelEngine;
} {
  const real = new CADWorldModelEngine();
  const preview = new CADPreviewEngine({ realWorld: real as unknown as CADRealWorldLike });
  return { preview, real };
}

const createBody = (id: string, parentId?: string): CADWorldOp => ({
  kind: "create_body",
  entityId: id,
  entityKind: "body",
  name: `body-${id}`,
  ...(parentId !== undefined ? { parentId } : {}),
});

const extrude = (targetId: string): CADWorldOp => ({
  kind: "extrude",
  entityId: targetId,
  name: `extrude-${targetId}`,
});

const setParam = (parameter: string, value: number): CADWorldOp => ({
  kind: "set_parameter",
  parameter,
  value,
});

const deleteEntity = (entityId: string): CADWorldOp => ({
  kind: "delete",
  entityId,
});

const selectEntity = (entityId: string): CADWorldOp => ({
  kind: "select",
  entityId,
});

const switchUnits = (units: CADUnits): CADWorldOp => ({
  kind: "set_units",
  units,
});

// Deep-clone the real world's snapshot for "did it change?" assertions.
function snapshotAll(real: CADWorldModelEngine): Record<string, CADWorldState> {
  const out: Record<string, CADWorldState> = {};
  for (const id of real.list()) {
    out[id] = real.getOrCreate(id);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe("CADPreviewEngine — construction", () => {
  it("instantiates with the production singleton by default", () => {
    const e = new CADPreviewEngine();
    // No throw — and the exported singleton is the same class.
    expect(e).toBeInstanceOf(CADPreviewEngine);
    expect(cadPreviewEngine).toBeInstanceOf(CADPreviewEngine);
  });

  it("accepts an injected real-world for deterministic tests", () => {
    const real = new CADWorldModelEngine();
    const e = new CADPreviewEngine({ realWorld: real });
    // Sanity: preview against a known-empty injected real world succeeds.
    const r = e.preview("doc-1", setParam("h", 10));
    expect(r.applied).toBe(true);
    expect(r.opsApplied).toBe(1);
    // And the injected real world remains untouched (0 docs).
    expect(real.list()).toEqual([]);
  });

  it("accepts a custom sandbox factory and calls it per preview", () => {
    const real = new CADWorldModelEngine();
    let factoryCalls = 0;
    const e = new CADPreviewEngine({
      realWorld: real,
      sandboxFactory: () => {
        factoryCalls += 1;
        return new CADWorldModelEngine();
      },
    });
    e.preview("doc-a", setParam("h", 1));
    e.preview("doc-a", setParam("h", 2));
    e.previewAll("doc-a", [setParam("h", 3), setParam("w", 4)]);
    // 3 calls → 3 fresh sandboxes (no reuse, no caching).
    expect(factoryCalls).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// preview() — single op happy path
// ---------------------------------------------------------------------------

describe("CADPreviewEngine.preview — happy path", () => {
  it("projects a create_body op without mutating the real world", () => {
    const { preview, real } = freshPair();
    const r = preview.preview("doc-1", createBody("b1"));
    expect(r.applied).toBe(true);
    expect(r.opsApplied).toBe(1);
    expect(r.projectedState).not.toBeNull();
    expect(r.projectedState!.entities.map((e) => e.id)).toEqual(["b1"]);
    expect(r.diff.addedEntities).toEqual(["b1"]);
    expect(r.diff.removedEntities).toEqual([]);
    expect(r.diff.identical).toBe(false);
    // Load-bearing: the real world still has no docs.
    expect(real.list()).toEqual([]);
  });

  it("projects a set_parameter op from a populated baseline", () => {
    const { preview, real } = freshPair();
    real.applyOp("doc-1", createBody("b1"));
    real.applyOp("doc-1", setParam("h", 10));
    const before = snapshotAll(real);

    const r = preview.preview("doc-1", setParam("h", 25));
    expect(r.applied).toBe(true);
    expect(r.baseline.parameters).toEqual({ h: 10 });
    expect(r.projectedState!.parameters).toEqual({ h: 25 });
    expect(r.diff.parametersChanged).toEqual(["h"]);
    // Real world unchanged.
    expect(snapshotAll(real)).toEqual(before);
  });

  it("returns a delete op's projected subtree removal", () => {
    const { preview, real } = freshPair();
    real.applyOp("doc-1", createBody("parent"));
    real.applyOp("doc-1", extrude("parent")); // creates feat-1 with parentId=parent
    const before = snapshotAll(real);

    const r = preview.preview("doc-1", deleteEntity("parent"));
    expect(r.applied).toBe(true);
    expect(r.projectedState!.entities).toEqual([]);
    expect(r.diff.removedEntities.sort()).toEqual(["feat-1", "parent"]);
    expect(snapshotAll(real)).toEqual(before);
  });

  it("returns a select op's projected selection change", () => {
    const { preview, real } = freshPair();
    real.applyOp("doc-1", createBody("b1"));
    real.applyOp("doc-1", createBody("b2"));

    const r = preview.preview("doc-1", selectEntity("b2"));
    expect(r.applied).toBe(true);
    expect(r.projectedState!.selection).toEqual(["b2"]);
    expect(r.diff.selectionChanged).toBe(true);
    // Real world selection still empty.
    expect(real.getOrCreate("doc-1").selection).toEqual([]);
  });

  it("returns a units change without converting parameter values", () => {
    const { preview, real } = freshPair();
    real.applyOp("doc-1", setParam("h", 25.4));

    const r = preview.preview("doc-1", switchUnits("in"));
    expect(r.applied).toBe(true);
    expect(r.projectedState!.units).toBe("in");
    expect(r.projectedState!.parameters).toEqual({ h: 25.4 });
    expect(r.diff.unitsChanged).toBe(true);
    expect(real.getOrCreate("doc-1").units).toBe("mm");
  });

  it("returns identical-diff for a no-op (selection of currently-selected entity)", () => {
    const { preview, real } = freshPair();
    real.applyOp("doc-1", createBody("b1"));
    real.applyOp("doc-1", selectEntity("b1"));

    const r = preview.preview("doc-1", selectEntity("b1"));
    expect(r.applied).toBe(true);
    // Identity is structural — same single selection means selectionChanged=false.
    expect(r.diff.selectionChanged).toBe(false);
    expect(r.diff.identical).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// preview() — runtime rejection (op throws in real world, captured here)
// ---------------------------------------------------------------------------

describe("CADPreviewEngine.preview — runtime rejection", () => {
  it("captures an unknown-entity delete as applied=false (does not re-throw)", () => {
    const { preview, real } = freshPair();
    const r = preview.preview("doc-1", deleteEntity("nope"));
    expect(r.applied).toBe(false);
    expect(r.projectedState).toBeNull();
    expect(r.errors.length).toBe(1);
    expect(r.errors[0]).toMatch(/unknown entity/i);
    // Diff degenerates to identical-diff so callers can render it.
    expect(r.diff.identical).toBe(true);
    // Real world untouched.
    expect(real.list()).toEqual([]);
  });

  it("captures a duplicate-id create as applied=false", () => {
    const { preview, real } = freshPair();
    real.applyOp("doc-1", createBody("b1"));

    const r = preview.preview("doc-1", createBody("b1"));
    expect(r.applied).toBe(false);
    expect(r.errors[0]).toMatch(/duplicate entity id/i);
    // The baseline still shows b1 (one entity), projectedState is null.
    expect(r.baseline.entities.map((e) => e.id)).toEqual(["b1"]);
    expect(r.projectedState).toBeNull();
  });

  it("captures a non-finite parameter value as applied=false (NaN)", () => {
    const { preview } = freshPair();
    const r = preview.preview("doc-1", setParam("h", Number.NaN));
    expect(r.applied).toBe(false);
    expect(r.errors[0]).toMatch(/finite numeric value/i);
  });

  it("captures a non-finite parameter value as applied=false (Infinity)", () => {
    const { preview } = freshPair();
    const r = preview.preview("doc-1", setParam("h", Number.POSITIVE_INFINITY));
    expect(r.applied).toBe(false);
    expect(r.errors[0]).toMatch(/finite numeric value/i);
  });

  it("captures a select-of-unknown-entity as applied=false", () => {
    const { preview, real } = freshPair();
    real.applyOp("doc-1", createBody("b1"));
    const r = preview.preview("doc-1", selectEntity("ghost"));
    expect(r.applied).toBe(false);
    expect(r.errors[0]).toMatch(/cannot select unknown entity/i);
    // Real world selection unchanged.
    expect(real.getOrCreate("doc-1").selection).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// preview() — input validation (static throws)
// ---------------------------------------------------------------------------

describe("CADPreviewEngine.preview — input validation", () => {
  it("throws for non-string docId", () => {
    const { preview } = freshPair();
    expect(() => preview.preview(123 as unknown as string, setParam("h", 1))).toThrow(
      /docId must be a string/i,
    );
  });

  it("throws for empty docId (whitespace-only)", () => {
    const { preview } = freshPair();
    expect(() => preview.preview("   ", setParam("h", 1))).toThrow(
      /docId must be a non-empty string/i,
    );
  });

  it("throws for null op", () => {
    const { preview } = freshPair();
    expect(() => preview.preview("doc-1", null as unknown as CADWorldOp)).toThrow(
      /op must be an object/i,
    );
  });

  it("throws for non-object op", () => {
    const { preview } = freshPair();
    expect(() => preview.preview("doc-1", "extrude" as unknown as CADWorldOp)).toThrow(
      /op must be an object/i,
    );
  });

  it("normalises docId whitespace (trim, not re-creation)", () => {
    const { preview, real } = freshPair();
    real.applyOp("doc-1", setParam("h", 10));
    const r = preview.preview("  doc-1  ", setParam("h", 20));
    expect(r.docId).toBe("doc-1");
    expect(r.baseline.parameters.h).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// preview() — real-world side-effect probe (the load-bearing invariant)
// ---------------------------------------------------------------------------

describe("CADPreviewEngine.preview — strict purity (real world never mutated)", () => {
  it("does not materialise a not-yet-known docId in the real world", () => {
    const { preview, real } = freshPair();
    expect(real.list()).toEqual([]);

    const r = preview.preview("ghost-doc", setParam("h", 1));
    expect(r.applied).toBe(true);

    // CRITICAL — preview must NOT have created ghost-doc in production.
    expect(real.list()).toEqual([]);
  });

  it("does not advance opCount on a known docId", () => {
    const { preview, real } = freshPair();
    real.applyOp("doc-1", createBody("b1"));
    real.applyOp("doc-1", setParam("h", 10));
    const opCountBefore = real.getOrCreate("doc-1").opCount;

    preview.preview("doc-1", setParam("h", 20));
    preview.preview("doc-1", createBody("b2"));
    preview.preview("doc-1", deleteEntity("b1"));

    expect(real.getOrCreate("doc-1").opCount).toBe(opCountBefore);
  });

  it("does not bypass real-world rejections (failed previews still leave real world clean)", () => {
    const { preview, real } = freshPair();
    real.applyOp("doc-1", createBody("b1"));
    const before = snapshotAll(real);

    preview.preview("doc-1", createBody("b1")); // would throw in real (duplicate)
    preview.preview("doc-1", deleteEntity("ghost")); // would throw in real (unknown)
    preview.preview("doc-1", setParam("h", Number.NaN)); // would throw in real

    expect(snapshotAll(real)).toEqual(before);
  });

  it("never invokes a mutating method on the injected real world (probe via fake)", () => {
    const calls: string[] = [];
    const fakeReal: CADRealWorldLike = {
      list: () => {
        calls.push("list");
        return ["doc-1"];
      },
      getOrCreate: (id, units = "mm") => {
        calls.push(`getOrCreate:${id}`);
        // Behave like a real world that already has doc-1 with one body.
        return {
          docId: id,
          entities: [{ id: "b1", kind: "body", name: "body-b1", parentId: null, createdAtOp: 1 }],
          parameters: { h: 10 },
          selection: [],
          units,
          opCount: 1,
        };
      },
    };
    const e = new CADPreviewEngine({ realWorld: fakeReal });

    e.preview("doc-1", setParam("h", 20));
    e.preview("doc-1", createBody("b2"));
    e.previewAll("doc-1", [setParam("h", 30), createBody("b3")]);

    // ONLY list + getOrCreate ever appear — never applyOp, restore, reset, checkpoint.
    for (const c of calls) {
      expect(c === "list" || c.startsWith("getOrCreate:")).toBe(true);
    }
    // And both kinds appeared (we exercised the known-doc snapshot path).
    expect(calls.some((c) => c === "list")).toBe(true);
    expect(calls.some((c) => c.startsWith("getOrCreate:"))).toBe(true);
  });

  it("for unknown docId, does NOT call getOrCreate (fabricates baseline locally)", () => {
    const calls: string[] = [];
    const fakeReal: CADRealWorldLike = {
      list: () => {
        calls.push("list");
        return []; // empty — docId is unknown
      },
      getOrCreate: (id) => {
        calls.push(`getOrCreate:${id}`);
        throw new Error("preview must not call getOrCreate on unknown doc");
      },
    };
    const e = new CADPreviewEngine({ realWorld: fakeReal });

    const r = e.preview("ghost", setParam("h", 1));
    expect(r.applied).toBe(true);
    expect(calls).toEqual(["list"]);
  });
});

// ---------------------------------------------------------------------------
// preview() — baseline isolation
// ---------------------------------------------------------------------------

describe("CADPreviewEngine.preview — baseline isolation", () => {
  it("mutating the returned baseline does not affect the engine's view", () => {
    const { preview, real } = freshPair();
    real.applyOp("doc-1", createBody("b1"));
    real.applyOp("doc-1", setParam("h", 10));

    const r1 = preview.preview("doc-1", setParam("h", 20));
    // Mutate the returned baseline structures.
    r1.baseline.entities.push({
      id: "x",
      kind: "body",
      name: "x",
      parentId: null,
      createdAtOp: 99,
    });
    r1.baseline.parameters.h = 99999;
    r1.baseline.selection.push("nope");

    // Next preview should see the ORIGINAL real-world state, not the mutated copy.
    const r2 = preview.preview("doc-1", setParam("h", 30));
    expect(r2.baseline.entities.map((e) => e.id)).toEqual(["b1"]);
    expect(r2.baseline.parameters.h).toBe(10);
    expect(r2.baseline.selection).toEqual([]);
  });

  it("mutating the returned projectedState does not affect the engine's view", () => {
    const { preview, real } = freshPair();
    real.applyOp("doc-1", createBody("b1"));

    const r1 = preview.preview("doc-1", createBody("b2"));
    // Mutate projectedState — should NOT propagate anywhere.
    r1.projectedState!.entities.push({
      id: "z",
      kind: "body",
      name: "z",
      parentId: null,
      createdAtOp: 99,
    });

    // Real world still has only b1.
    const realIds = real.getOrCreate("doc-1").entities.map((e) => e.id);
    expect(realIds).toEqual(["b1"]);
    // And the next preview's baseline still has just b1.
    const r2 = preview.preview("doc-1", setParam("h", 1));
    expect(r2.baseline.entities.map((e) => e.id)).toEqual(["b1"]);
  });
});

// ---------------------------------------------------------------------------
// previewAll() — happy path
// ---------------------------------------------------------------------------

describe("CADPreviewEngine.previewAll — happy path", () => {
  it("projects a multi-op batch and reports applied=true on full success", () => {
    const { preview, real } = freshPair();
    const ops: CADWorldOp[] = [
      createBody("b1"),
      extrude("b1"),
      setParam("h", 25),
      setParam("w", 50),
    ];
    const r = preview.previewAll("doc-1", ops);
    expect(r.applied).toBe(true);
    expect(r.opsApplied).toBe(4);
    expect(r.opsAttempted).toBe(4);
    expect(r.errors).toEqual([]);
    expect(r.projectedState).not.toBeNull();
    expect(r.projectedState!.entities.map((e) => e.id).sort()).toEqual(
      ["b1", "feat-1"].sort(),
    );
    expect(r.projectedState!.parameters).toEqual({ h: 25, w: 50 });
    expect(r.diff.addedEntities.sort()).toEqual(["b1", "feat-1"].sort());
    expect(r.diff.parametersChanged.sort()).toEqual(["h", "w"]);
    // Real world untouched.
    expect(real.list()).toEqual([]);
  });

  it("returns identical-diff for an empty op list", () => {
    const { preview } = freshPair();
    const r = preview.previewAll("doc-1", []);
    expect(r.applied).toBe(true);
    expect(r.opsApplied).toBe(0);
    expect(r.opsAttempted).toBe(0);
    expect(r.diff.identical).toBe(true);
  });

  it("threads a known-doc baseline correctly (50-op chain)", () => {
    const { preview, real } = freshPair();
    real.applyOp("doc-1", createBody("root"));

    const ops: CADWorldOp[] = [];
    for (let i = 0; i < 50; i++) ops.push(setParam(`p${i}`, i * 0.5));
    const r = preview.previewAll("doc-1", ops);
    expect(r.applied).toBe(true);
    expect(r.opsApplied).toBe(50);
    expect(r.projectedState!.parameters.p0).toBe(0);
    expect(r.projectedState!.parameters.p49).toBeCloseTo(24.5, 9);
    // Real world still has 0 parameters.
    expect(real.getOrCreate("doc-1").parameters).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// previewAll() — all-or-nothing on failure
// ---------------------------------------------------------------------------

describe("CADPreviewEngine.previewAll — atomicity", () => {
  it("reports applied=false when any op would throw", () => {
    const { preview, real } = freshPair();
    const ops: CADWorldOp[] = [
      createBody("b1"),
      setParam("h", 10),
      createBody("b1"), // duplicate id — will throw
      setParam("w", 50), // never reached
    ];
    const r = preview.previewAll("doc-1", ops);
    expect(r.applied).toBe(false);
    expect(r.projectedState).toBeNull();
    expect(r.opsApplied).toBe(2); // 2 succeeded before the throwing op
    expect(r.opsAttempted).toBe(4);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0]).toMatch(/duplicate entity id/i);
    expect(r.diff.identical).toBe(true);
    // Real world untouched.
    expect(real.list()).toEqual([]);
  });

  it("reports applied=false when first op throws", () => {
    const { preview, real } = freshPair();
    const ops: CADWorldOp[] = [
      deleteEntity("ghost"), // throws immediately
      createBody("b1"),
    ];
    const r = preview.previewAll("doc-1", ops);
    expect(r.applied).toBe(false);
    expect(r.opsApplied).toBe(0);
    expect(r.errors[0]).toMatch(/cannot delete unknown entity/i);
    expect(real.list()).toEqual([]);
  });

  it("reports applied=false when last op throws", () => {
    const { preview, real } = freshPair();
    const ops: CADWorldOp[] = [
      createBody("b1"),
      createBody("b2"),
      setParam("h", Number.NaN), // last op throws
    ];
    const r = preview.previewAll("doc-1", ops);
    expect(r.applied).toBe(false);
    expect(r.opsApplied).toBe(2);
    expect(r.errors[0]).toMatch(/finite numeric value/i);
    expect(real.list()).toEqual([]);
  });

  it("never advances real-world opCount on auto-rollback", () => {
    const { preview, real } = freshPair();
    real.applyOp("doc-1", createBody("root"));
    const opCountBefore = real.getOrCreate("doc-1").opCount;

    // 100-op batch where op 50 throws → entire batch rolled back in sandbox.
    const ops: CADWorldOp[] = [];
    for (let i = 0; i < 100; i++) {
      if (i === 50) ops.push(setParam("bad", Number.NaN));
      else ops.push(setParam(`p${i}`, i));
    }
    const r = preview.previewAll("doc-1", ops);
    expect(r.applied).toBe(false);
    expect(r.opsApplied).toBe(50); // 0..49 succeeded in sandbox before throw
    expect(real.getOrCreate("doc-1").opCount).toBe(opCountBefore);
  });
});

// ---------------------------------------------------------------------------
// previewAll() — input validation
// ---------------------------------------------------------------------------

describe("CADPreviewEngine.previewAll — input validation", () => {
  it("throws for non-array ops", () => {
    const { preview } = freshPair();
    expect(() =>
      preview.previewAll("doc-1", "not-an-array" as unknown as CADWorldOp[]),
    ).toThrow(/ops array/i);
  });

  it("throws for non-string docId", () => {
    const { preview } = freshPair();
    expect(() =>
      preview.previewAll(123 as unknown as string, []),
    ).toThrow(/docId must be a string/i);
  });

  it("throws for empty docId", () => {
    const { preview } = freshPair();
    expect(() => preview.previewAll("", [])).toThrow(/docId must be a non-empty string/i);
  });
});

// ---------------------------------------------------------------------------
// Determinism / referential transparency
// ---------------------------------------------------------------------------

describe("CADPreviewEngine — determinism", () => {
  it("same (baseline, op) yields the same diff every time", () => {
    const { preview, real } = freshPair();
    real.applyOp("doc-1", createBody("b1"));
    real.applyOp("doc-1", setParam("h", 10));

    const op = setParam("h", 25);
    const r1 = preview.preview("doc-1", op);
    const r2 = preview.preview("doc-1", op);
    const r3 = preview.preview("doc-1", op);
    expect(r1.diff).toEqual(r2.diff);
    expect(r2.diff).toEqual(r3.diff);
    expect(r1.projectedState).toEqual(r2.projectedState);
  });

  it("same (baseline, ops batch) yields the same final state every time", () => {
    const { preview } = freshPair();
    const ops: CADWorldOp[] = [createBody("b1"), extrude("b1"), setParam("h", 10)];
    const a = preview.previewAll("doc-1", ops);
    const b = preview.previewAll("doc-1", ops);
    expect(a.projectedState).toEqual(b.projectedState);
    expect(a.diff).toEqual(b.diff);
  });

  it("delegates parameter equality to world-model float-epsilon", () => {
    // The world-model's diff uses PARAM_EPSILON, not strict ===. A tiny
    // float jitter that rounds to the same parameter must NOT show up as
    // a change.
    const { preview, real } = freshPair();
    real.applyOp("doc-1", setParam("h", 0.1));
    const noisy = 0.1 + 0.2 - 0.2;
    expect(noisy).not.toBe(0.1); // JS float drift exists
    const r = preview.preview("doc-1", setParam("h", noisy));
    expect(r.applied).toBe(true);
    expect(r.diff.parametersChanged).toEqual([]); // epsilon swallowed the drift
  });
});

// ---------------------------------------------------------------------------
// Sandbox isolation between previews (cross-call independence)
// ---------------------------------------------------------------------------

describe("CADPreviewEngine — cross-call independence", () => {
  it("two consecutive previews do not share sandbox state", () => {
    const { preview } = freshPair();
    // First preview adds b1.
    const r1 = preview.preview("doc-1", createBody("b1"));
    expect(r1.applied).toBe(true);
    expect(r1.projectedState!.entities.map((e) => e.id)).toEqual(["b1"]);

    // Second preview against the SAME (empty real) world should also start empty,
    // not see the b1 from the first preview's sandbox.
    const r2 = preview.preview("doc-1", createBody("b1"));
    expect(r2.applied).toBe(true);
    expect(r2.projectedState!.entities.map((e) => e.id)).toEqual(["b1"]);
    expect(r2.baseline.entities).toEqual([]);
  });

  it("preview then previewAll do not share sandbox state", () => {
    const { preview } = freshPair();
    preview.preview("doc-1", createBody("b1"));
    // previewAll should NOT see "b1" — sandbox dies with the previous call.
    const r = preview.previewAll("doc-1", [createBody("b1")]);
    expect(r.applied).toBe(true);
    expect(r.opsApplied).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Adversarial / regression
// ---------------------------------------------------------------------------

describe("CADPreviewEngine — adversarial", () => {
  it("rejects an op with empty kind string (captures world-model rejection)", () => {
    const { preview } = freshPair();
    const op = { kind: "" } as unknown as CADWorldOp;
    const r = preview.preview("doc-1", op);
    // World model rejects empty kind — preview captures it without re-throwing.
    expect(r.applied).toBe(false);
    expect(r.errors[0]).toMatch(/non-empty string/i);
  });

  it("normalises a numeric op.kind to a string and routes via noop fallback", () => {
    const { preview } = freshPair();
    // World model stringifies kind: 123 → "123" → no token match → noop category.
    // Noop is structurally identical (opCount advances but diff is identical).
    const op = { kind: 123 } as unknown as CADWorldOp;
    const r = preview.preview("doc-1", op);
    expect(r.applied).toBe(true);
    expect(r.diff.identical).toBe(true);
    expect(r.projectedState!.entities).toEqual([]);
  });

  it("handles op with very long parameter name", () => {
    const { preview } = freshPair();
    const longName = "p".repeat(2048);
    const r = preview.preview("doc-1", setParam(longName, 1.5));
    expect(r.applied).toBe(true);
    expect(r.projectedState!.parameters[longName]).toBe(1.5);
  });

  it("handles a deep entity tree (50 nested bodies)", () => {
    const { preview } = freshPair();
    const ops: CADWorldOp[] = [createBody("root")];
    let parent = "root";
    for (let i = 0; i < 49; i++) {
      const id = `n${i}`;
      ops.push(createBody(id, parent));
      parent = id;
    }
    const r = preview.previewAll("doc-1", ops);
    expect(r.applied).toBe(true);
    expect(r.projectedState!.entities.length).toBe(50);
  });

  it("delete cascade in preview removes entire subtree", () => {
    const { preview, real } = freshPair();
    real.applyOp("doc-1", createBody("root"));
    real.applyOp("doc-1", createBody("c1", "root"));
    real.applyOp("doc-1", createBody("c2", "root"));
    real.applyOp("doc-1", createBody("gc1", "c1"));

    const r = preview.preview("doc-1", deleteEntity("root"));
    expect(r.applied).toBe(true);
    expect(r.projectedState!.entities).toEqual([]);
    expect(r.diff.removedEntities.sort()).toEqual(["c1", "c2", "gc1", "root"]);
    // Real world unchanged — root, c1, c2, gc1 still present.
    expect(real.getOrCreate("doc-1").entities.map((e) => e.id).sort()).toEqual(
      ["c1", "c2", "gc1", "root"],
    );
  });

  it("returns deterministic 'no projectable state' for the same throwing op", () => {
    const { preview } = freshPair();
    const r1 = preview.preview("doc-1", deleteEntity("missing"));
    const r2 = preview.preview("doc-1", deleteEntity("missing"));
    expect(r1.applied).toBe(false);
    expect(r2.applied).toBe(false);
    expect(r1.errors).toEqual(r2.errors);
    expect(r1.diff).toEqual(r2.diff);
  });
});

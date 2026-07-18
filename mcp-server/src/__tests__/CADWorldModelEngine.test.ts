/**
 * Tests — CADWorldModelEngine (CAD-COMPLETE-MS0 / U-AI-02)
 *
 * Each test uses a fresh engine instance so document state never bleeds
 * between cases.
 */
import { describe, it, expect } from "vitest";
import {
  CADWorldModelEngine,
  cadWorldModelEngine,
} from "../engines/CADWorldModelEngine.js";

const fresh = () => new CADWorldModelEngine();

describe("CADWorldModelEngine — document lifecycle", () => {
  it("a fresh document is empty, mm, op-count zero", () => {
    const e = fresh();
    const s = e.getOrCreate("doc1");
    expect(s.entities).toHaveLength(0);
    expect(s.units).toBe("mm");
    expect(s.opCount).toBe(0);
    expect(s.selection).toHaveLength(0);
  });

  it("honours an initial units argument on first creation only", () => {
    const e = fresh();
    e.getOrCreate("doc1", "in");
    // A second call without units must not silently flip the document back.
    expect(e.getOrCreate("doc1").units).toBe("in");
  });

  it("list() reports every tracked document", () => {
    const e = fresh();
    e.getOrCreate("a");
    e.getOrCreate("b");
    expect(e.list().sort()).toEqual(["a", "b"]);
  });

  it("reset(docId) clears one document; reset() clears all", () => {
    const e = fresh();
    e.applyOp("a", { kind: "create_body" });
    e.applyOp("b", { kind: "create_body" });
    e.reset("a");
    expect(e.getState("a").entities).toHaveLength(0);
    expect(e.getState("b").entities).toHaveLength(1);
    e.reset();
    expect(e.list()).toHaveLength(0);
  });

  it("exports a shared singleton", () => {
    expect(cadWorldModelEngine).toBeInstanceOf(CADWorldModelEngine);
  });
});

describe("CADWorldModelEngine — create operations", () => {
  it("create_body adds one body entity with an auto id", () => {
    const e = fresh();
    const s = e.applyOp("d", { kind: "create_body" });
    expect(s.entities).toHaveLength(1);
    expect(s.entities[0].kind).toBe("body");
    expect(s.entities[0].id).toBe("ent-1");
    expect(s.opCount).toBe(1);
  });

  it("infers entity kind from the op-kind tokens (create_sketch → sketch)", () => {
    const e = fresh();
    const s = e.applyOp("d", { kind: "create_sketch" });
    expect(s.entities[0].kind).toBe("sketch");
  });

  it("honours an explicit entityId and parent linkage", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    const s = e.applyOp("d", { kind: "create_sketch", entityId: "S1", parentId: "B1" });
    const sketch = s.entities.find((x) => x.id === "S1");
    expect(sketch?.parentId).toBe("B1");
  });

  it("rejects a duplicate entity id", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    expect(() => e.applyOp("d", { kind: "create_body", entityId: "B1" })).toThrow(/duplicate/i);
  });

  it("rejects a create op whose parent does not exist", () => {
    const e = fresh();
    expect(() => e.applyOp("d", { kind: "create_body", parentId: "ghost" })).toThrow(/parent/i);
  });
});

describe("CADWorldModelEngine — delete operations", () => {
  it("delete removes the entity", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    const s = e.applyOp("d", { kind: "delete", entityId: "B1" });
    expect(s.entities).toHaveLength(0);
  });

  it("delete cascades to the whole subtree", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    e.applyOp("d", { kind: "create_sketch", entityId: "S1", parentId: "B1" });
    e.applyOp("d", { kind: "create_body", entityId: "G1", parentId: "S1" });
    const s = e.applyOp("d", { kind: "delete", entityId: "B1" });
    expect(s.entities).toHaveLength(0);
  });

  it("delete rejects an unknown entity (a belief error must surface)", () => {
    const e = fresh();
    expect(() => e.applyOp("d", { kind: "delete", entityId: "nope" })).toThrow(/unknown/i);
  });

  it("delete drops the entity from the active selection", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    e.applyOp("d", { kind: "select", selection: ["B1"] });
    const s = e.applyOp("d", { kind: "delete", entityId: "B1" });
    expect(s.selection).toHaveLength(0);
  });
});

describe("CADWorldModelEngine — feature operations", () => {
  it("a feature op adds exactly one feature entity parented to its target", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    const s = e.applyOp("d", { kind: "extrude", entityId: "B1" });
    const features = s.entities.filter((x) => x.kind === "feature");
    expect(features).toHaveLength(1);
    expect(features[0].parentId).toBe("B1");
    expect(s.entities).toHaveLength(2);
  });

  it("a feature op on an unknown target throws", () => {
    const e = fresh();
    expect(() => e.applyOp("d", { kind: "fillet", entityId: "ghost" })).toThrow(/target/i);
  });

  it("a feature op without entityId throws", () => {
    const e = fresh();
    expect(() => e.applyOp("d", { kind: "chamfer" })).toThrow(/entityId/i);
  });
});

describe("CADWorldModelEngine — parameter operations", () => {
  it("set_parameter records and overwrites a parameter", () => {
    const e = fresh();
    e.applyOp("d", { kind: "set_parameter", parameter: "width", value: 50 });
    let s = e.getState("d");
    expect(s.parameters.width).toBe(50);
    s = e.applyOp("d", { kind: "set_parameter", parameter: "width", value: 75 });
    expect(s.parameters.width).toBe(75);
  });

  it("rejects a NaN parameter value", () => {
    const e = fresh();
    expect(() => e.applyOp("d", { kind: "set_parameter", parameter: "x", value: NaN })).toThrow(/finite/i);
  });

  it("rejects an Infinity parameter value", () => {
    const e = fresh();
    expect(() => e.applyOp("d", { kind: "set_parameter", parameter: "x", value: Infinity })).toThrow(/finite/i);
  });

  it("rejects a parameter op with no name", () => {
    const e = fresh();
    expect(() => e.applyOp("d", { kind: "set_parameter", value: 5 })).toThrow(/name/i);
  });
});

describe("CADWorldModelEngine — units and selection", () => {
  it("set_units changes the active units", () => {
    const e = fresh();
    const s = e.applyOp("d", { kind: "set_units", units: "in" });
    expect(s.units).toBe("in");
  });

  it("rejects an invalid units value", () => {
    const e = fresh();
    expect(() => e.applyOp("d", { kind: "set_units", units: "furlong" as never })).toThrow(/mm.*in/i);
  });

  it("select sets the selection and de-duplicates", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    const s = e.applyOp("d", { kind: "select", selection: ["B1", "B1"] });
    expect(s.selection).toEqual(["B1"]);
  });

  it("select rejects an unknown entity", () => {
    const e = fresh();
    expect(() => e.applyOp("d", { kind: "select", selection: ["ghost"] })).toThrow(/unknown/i);
  });
});

describe("CADWorldModelEngine — diff and checkpoint", () => {
  it("diff of identical states is identical", () => {
    const e = fresh();
    const s = e.getOrCreate("d");
    expect(CADWorldModelEngine.diff(s, s).identical).toBe(true);
  });

  it("diff reports an added entity", () => {
    const e = fresh();
    const before = e.getOrCreate("d");
    const after = e.applyOp("d", { kind: "create_body", entityId: "B1" });
    const d = CADWorldModelEngine.diff(before, after);
    expect(d.addedEntities).toEqual(["B1"]);
    expect(d.identical).toBe(false);
  });

  it("diffFromCheckpoint baselines against the last checkpoint", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    e.checkpoint("d");
    e.applyOp("d", { kind: "create_body", entityId: "B2" });
    const d = e.diffFromCheckpoint("d");
    expect(d.addedEntities).toEqual(["B2"]);
    expect(d.removedEntities).toHaveLength(0);
  });

  it("diff detects a parameter change", () => {
    const e = fresh();
    const before = e.applyOp("d", { kind: "set_parameter", parameter: "w", value: 10 });
    const after = e.applyOp("d", { kind: "set_parameter", parameter: "w", value: 20 });
    expect(CADWorldModelEngine.diff(before, after).parametersChanged).toEqual(["w"]);
  });
});

describe("CADWorldModelEngine — drift detection", () => {
  it("reports inSync when the model matches the observation", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    const drift = e.detectDrift("d", { entityIds: ["B1"] });
    expect(drift.inSync).toBe(true);
    expect(drift.severity).toBe("none");
  });

  it("flags a believed entity missing from the real document as MAJOR", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    const drift = e.detectDrift("d", { entityIds: [] });
    expect(drift.missingFromActual).toEqual(["B1"]);
    expect(drift.severity).toBe("major");
    expect(drift.inSync).toBe(false);
  });

  it("flags an unknown real entity as MAJOR", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    const drift = e.detectDrift("d", { entityIds: ["B1", "ghost"] });
    expect(drift.extraInActual).toEqual(["ghost"]);
    expect(drift.severity).toBe("major");
  });

  it("flags a units mismatch as MAJOR", () => {
    const e = fresh();
    e.getOrCreate("d", "mm");
    const drift = e.detectDrift("d", { entityIds: [], units: "in" });
    expect(drift.unitsMismatch).toBe(true);
    expect(drift.severity).toBe("major");
  });

  it("a parameter-value-only disagreement is MINOR (recoverable)", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    e.applyOp("d", { kind: "set_parameter", parameter: "width", value: 50 });
    const drift = e.detectDrift("d", { entityIds: ["B1"], parameters: { width: 60 } });
    expect(drift.parameterMismatches).toHaveLength(1);
    expect(drift.parameterMismatches[0]).toEqual({ name: "width", believed: 50, actual: 60 });
    expect(drift.severity).toBe("minor");
  });

  it("rejects a malformed observation", () => {
    const e = fresh();
    e.getOrCreate("d");
    expect(() => e.detectDrift("d", {} as never)).toThrow(/entityIds/i);
  });
});

describe("CADWorldModelEngine — restore, batch, adversarial inputs", () => {
  it("restore replaces a document's believed state", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    e.applyOp("d", { kind: "create_body", entityId: "B2" });
    const snap = e.getState("d");
    e.reset("d");
    expect(e.getState("d").entities).toHaveLength(0);
    const restored = e.restore("d", snap);
    expect(restored.entities.map((x) => x.id).sort()).toEqual(["B1", "B2"]);
  });

  it("restore recomputes the auto-id sequence so new ids never collide", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body" }); // ent-1
    e.applyOp("d", { kind: "create_body" }); // ent-2
    const snap = e.getState("d");
    e.reset("d");
    e.restore("d", snap);
    const s = e.applyOp("d", { kind: "create_body" }); // must be ent-3, not ent-1
    expect(s.entities.map((x) => x.id).sort()).toEqual(["ent-1", "ent-2", "ent-3"]);
  });

  it("restore rejects an invalid state object", () => {
    const e = fresh();
    expect(() => e.restore("d", null as never)).toThrow(/valid/i);
  });

  it("applyOps applies a batch in order", () => {
    const e = fresh();
    const s = e.applyOps("d", [
      { kind: "create_body", entityId: "B1" },
      { kind: "extrude", entityId: "B1" },
      { kind: "set_parameter", parameter: "h", value: 12 },
    ]);
    expect(s.entities).toHaveLength(2);
    expect(s.parameters.h).toBe(12);
    expect(s.opCount).toBe(3);
  });

  it("rejects an empty docId", () => {
    const e = fresh();
    expect(() => e.getState("")).toThrow(/docId/i);
  });

  it("rejects an op with an empty kind", () => {
    const e = fresh();
    expect(() => e.applyOp("d", { kind: "   " })).toThrow(/kind/i);
  });

  it("an unmodelled op (rebuild) counts toward opCount but changes nothing", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    const s = e.applyOp("d", { kind: "rebuild" });
    expect(s.opCount).toBe(2);
    expect(s.entities).toHaveLength(1);
  });

  it("rejects a null op", () => {
    const e = fresh();
    expect(() => e.applyOp("d", null as never)).toThrow(/op/i);
  });
});

describe("CADWorldModelEngine — state-integrity regressions", () => {
  it("a rejected op does not advance opCount", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    expect(e.getState("d").opCount).toBe(1);
    // A duplicate-id create throws — and must leave opCount untouched, so the
    // next valid op and its createdAtOp index resume from the correct value.
    expect(() => e.applyOp("d", { kind: "create_body", entityId: "B1" })).toThrow();
    expect(e.getState("d").opCount).toBe(1);
    const s = e.applyOp("d", { kind: "create_body", entityId: "B2" });
    expect(s.opCount).toBe(2);
    expect(s.entities.find((x) => x.id === "B2")?.createdAtOp).toBe(2);
  });

  it("restore establishes the restored state as a fresh checkpoint baseline", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    const snap = e.getState("d");
    e.applyOp("d", { kind: "create_body", entityId: "B2" });
    e.restore("d", snap);
    // After restore, diffFromCheckpoint must report no change — not a
    // whole-document-added diff against a stale empty baseline.
    expect(e.diffFromCheckpoint("d").identical).toBe(true);
  });

  it("detectDrift flags a real parameter the model does not know about", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    const drift = e.detectDrift("d", { entityIds: ["B1"], parameters: { depth: 8 } });
    expect(drift.unknownParameters).toEqual(["depth"]);
    expect(drift.severity).toBe("minor");
    expect(drift.inSync).toBe(false);
  });

  it("detectDrift never reports a non-finite observed parameter as in-sync", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    e.applyOp("d", { kind: "set_parameter", parameter: "width", value: 50 });
    const drift = e.detectDrift("d", { entityIds: ["B1"], parameters: { width: NaN } });
    expect(drift.parameterMismatches).toHaveLength(1);
    expect(drift.inSync).toBe(false);
  });

  it("a returned state snapshot is an isolated deep copy", () => {
    const e = fresh();
    e.applyOp("d", { kind: "create_body", entityId: "B1" });
    e.applyOp("d", { kind: "set_parameter", parameter: "w", value: 10 });
    e.applyOp("d", { kind: "select", selection: ["B1"] });
    const snap = e.getState("d");
    // Mutating the returned snapshot must not corrupt internal state —
    // the U-AI-07/08 preview & transaction contracts depend on this.
    snap.entities.push({ id: "HACK", kind: "body", name: "x", parentId: null, createdAtOp: 99 });
    snap.parameters.w = 9999;
    snap.selection.push("HACK");
    const after = e.getState("d");
    expect(after.entities.map((x) => x.id)).toEqual(["B1"]);
    expect(after.parameters.w).toBe(10);
    expect(after.selection).toEqual(["B1"]);
  });
});

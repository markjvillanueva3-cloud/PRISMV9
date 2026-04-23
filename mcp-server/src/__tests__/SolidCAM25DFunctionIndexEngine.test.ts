/**
 * SolidCAM25DFunctionIndexEngine engine-named test — CAM-EXHAUST-MS0/U-CAM33
 *
 * Companion to SolidCAM25DOperations.test.ts; this file matches the engine
 * filename for the wiring-enforcement hook (engine.ts ↔ engine.test.ts).
 * Asserts engine public methods, dispatcher wiring, and schema integrity.
 */

import { describe, it, expect } from "vitest";

describe("SolidCAM25DFunctionIndexEngine — engine + dispatcher", () => {
  it("engine module exports the SolidCAM25DFunctionIndexEngine class", async () => {
    const mod: any = await import("../engines/SolidCAM25DFunctionIndexEngine.js");
    expect(mod.SolidCAM25DFunctionIndexEngine).toBeTruthy();
    expect(typeof mod.SolidCAM25DFunctionIndexEngine.getSummary).toBe("function");
  });

  it("getSummary returns 12 ops / 209 params / system_id 'solidcam'", async () => {
    const { SolidCAM25DFunctionIndexEngine } = await import(
      "../engines/SolidCAM25DFunctionIndexEngine.js"
    );
    const summary = SolidCAM25DFunctionIndexEngine.getSummary();
    expect("error" in summary).toBe(false);
    if (!("error" in summary)) {
      expect(summary.system_id).toBe("solidcam");
      expect(summary.total_operations).toBe(12);
      expect(summary.total_parameters).toBe(209);
    }
  });

  it("listOperations returns exactly 12 operation summaries", async () => {
    const { SolidCAM25DFunctionIndexEngine } = await import(
      "../engines/SolidCAM25DFunctionIndexEngine.js"
    );
    const ops = SolidCAM25DFunctionIndexEngine.listOperations();
    expect(Array.isArray(ops)).toBe(true);
    if (Array.isArray(ops)) {
      expect(ops.length).toBe(12);
      ops.forEach((o) => {
        expect(o.operation_id.length).toBeGreaterThan(0);
        expect(o.parameter_count).toBeGreaterThan(0);
      });
    }
  });

  it("getOperation returns a known op with parameters", async () => {
    const { SolidCAM25DFunctionIndexEngine } = await import(
      "../engines/SolidCAM25DFunctionIndexEngine.js"
    );
    const ops = SolidCAM25DFunctionIndexEngine.listOperations();
    if (Array.isArray(ops) && ops.length > 0) {
      const first = SolidCAM25DFunctionIndexEngine.getOperation(ops[0].operation_id);
      expect("error" in first).toBe(false);
      if (!("error" in first)) {
        expect(first.parameter_count).toBe(ops[0].parameter_count);
        expect(typeof first.parameters).toBe("object");
      }
    }
  });

  it("getOperation returns error for unknown id (failure mode)", async () => {
    const { SolidCAM25DFunctionIndexEngine } = await import(
      "../engines/SolidCAM25DFunctionIndexEngine.js"
    );
    const op = SolidCAM25DFunctionIndexEngine.getOperation("nonexistent_op_xyz");
    expect("error" in op).toBe(true);
    if ("error" in op) expect(op.error).toContain("nonexistent_op_xyz");
  });

  it("getOperationsByCategory returns array (empty for unknown category)", async () => {
    const { SolidCAM25DFunctionIndexEngine } = await import(
      "../engines/SolidCAM25DFunctionIndexEngine.js"
    );
    const ops = SolidCAM25DFunctionIndexEngine.getOperationsByCategory("does_not_exist");
    expect(Array.isArray(ops)).toBe(true);
    if (Array.isArray(ops)) expect(ops.length).toBe(0);
  });

  it("getOperationsByCategory filters by real category", async () => {
    const { SolidCAM25DFunctionIndexEngine } = await import(
      "../engines/SolidCAM25DFunctionIndexEngine.js"
    );
    const summary: any = SolidCAM25DFunctionIndexEngine.getSummary();
    if (!("error" in summary) && summary.categories.length > 0) {
      const cat = summary.categories[0];
      const ops = SolidCAM25DFunctionIndexEngine.getOperationsByCategory(cat);
      if (Array.isArray(ops)) {
        expect(ops.length).toBeGreaterThan(0);
        ops.forEach((o) => expect(o.category).toBe(cat));
      }
    }
  });

  it("camDispatcher ACTIONS includes the 6 solidcam_25d_* actions", async () => {
    const mod: any = await import("../tools/dispatchers/camDispatcher.js");
    const expected = [
      "solidcam_25d_index",
      "solidcam_25d_summary",
      "solidcam_25d_list_ops",
      "solidcam_25d_get_op",
      "solidcam_25d_by_category",
      "solidcam_25d_imachining",
    ];
    for (const a of expected) expect(mod.ACTIONS).toContain(a);
  });

  it("ACTION_SOLIDCAM_25D_FUNCTION_INDEX_SCHEMAS has matching schema keys", async () => {
    const { ACTION_SOLIDCAM_25D_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/solidcam25DFunctionIndexActionSchemas.js"
    );
    const keys = Object.keys(ACTION_SOLIDCAM_25D_FUNCTION_INDEX_SCHEMAS);
    expect(keys).toContain("solidcam_25d_get_op");
    expect(keys).toContain("solidcam_25d_index");
    expect(keys.length).toBeGreaterThanOrEqual(6);
  });

  it("solidcam_25d_get_op schema validates and rejects bad input", async () => {
    const { ACTION_SOLIDCAM_25D_FUNCTION_INDEX_SCHEMAS } = await import(
      "../schemas/solidcam25DFunctionIndexActionSchemas.js"
    );
    const schema = ACTION_SOLIDCAM_25D_FUNCTION_INDEX_SCHEMAS.solidcam_25d_get_op;
    expect(schema.safeParse({ operation_id: "pocket_2d" }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ operation_id: 42 }).success).toBe(false);
  });

  it("getIndex returns a section with 12 operations object keys", async () => {
    const { SolidCAM25DFunctionIndexEngine } = await import(
      "../engines/SolidCAM25DFunctionIndexEngine.js"
    );
    const idx: any = SolidCAM25DFunctionIndexEngine.getIndex();
    expect("error" in idx).toBe(false);
    if (!("error" in idx)) {
      expect(Object.keys(idx.operations).length).toBe(12);
    }
  });

  it("sum of per-op parameter_count equals summary.total_parameters (209)", async () => {
    const { SolidCAM25DFunctionIndexEngine } = await import(
      "../engines/SolidCAM25DFunctionIndexEngine.js"
    );
    const idx: any = SolidCAM25DFunctionIndexEngine.getIndex();
    if (!("error" in idx)) {
      const sum = Object.values(idx.operations).reduce(
        (acc: number, op: any) => acc + op.parameter_count,
        0
      );
      expect(sum).toBe(209);
    }
  });
});

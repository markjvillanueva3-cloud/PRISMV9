/**
 * U-COST-EST-REQ-BRIDGE (charlie 2026-06-26) -- request-side FE<->BE contract bridge for
 * /api/v1/cost/estimate.
 *
 * THE BUG (verified live on :3100 before the fix): CostEstimatorPage posts a FLAT
 *   { material, operation: "milling", quantity, setup_time_min?, cycle_time_min?, tool_cost?, machine_rate_per_hour? }
 * but `prism_intelligence:process_cost` REQUIRES { material, operations: Array<{feature,...}>, batch_size? }.
 * The route forwarded req.body unchanged -> EVERY real submission Zod-failed with
 *   "operations: expected array, received undefined".
 *
 * `adaptCostEstimateRequest` maps the page shape to the engine schema at the route boundary. These
 * tests lock the mapping + the non-destructive pass-through guards (fail-on-revert: a revert to the
 * raw req.body forward makes the "page shape -> operations[]" assertions fail).
 */
import { describe, it, expect } from "vitest";
import { adaptCostEstimateRequest } from "../routes/cost.js";

describe("adaptCostEstimateRequest -- CostEstimatorPage flat shape -> process_cost schema", () => {
  it("maps a milling page request to an operations[] body with the mapped feature + batch_size", () => {
    const out = adaptCostEstimateRequest({
      material: "steel_4140",
      operation: "milling",
      quantity: 100,
      setup_time_min: 30,
      cycle_time_min: 5,
      tool_cost: 45,
      machine_rate_per_hour: 85,
    }) as Record<string, unknown>;
    // operations[] is now present (the field process_cost requires) -- the core of the fix.
    expect(Array.isArray(out.operations)).toBe(true);
    const ops = out.operations as Array<Record<string, unknown>>;
    expect(ops).toHaveLength(1);
    expect(ops[0].feature).toBe("pocket"); // milling -> pocket
    expect(ops[0].process).toBe("milling"); // original process retained for traceability
    // quantity -> batch_size (process_cost amortizes setup over the batch).
    expect(out.batch_size).toBe(100);
    // pass-through fields keep their names (same as the schema's optional keys).
    expect(out.material).toBe("steel_4140");
    expect(out.setup_time_min).toBe(30);
    expect(out.tool_cost).toBe(45);
    expect(out.machine_rate_per_hour).toBe(85);
  });

  it("maps each process type to its representative job_plan feature", () => {
    const cases: Array<[string, string]> = [
      ["milling", "pocket"],
      ["turning", "contour"],
      ["drilling", "hole"],
      ["grinding", "face"],
      ["edm", "slot"],
      ["multi_operation", "pocket"],
    ];
    for (const [operation, feature] of cases) {
      const out = adaptCostEstimateRequest({ material: "x", operation }) as Record<string, unknown>;
      const ops = out.operations as Array<Record<string, unknown>>;
      expect(ops[0].feature).toBe(feature);
    }
  });

  it("unknown process falls back to the 'pocket' default feature (never throws / never drops the op)", () => {
    const out = adaptCostEstimateRequest({ material: "x", operation: "laser_weird" }) as Record<string, unknown>;
    const ops = out.operations as Array<Record<string, unknown>>;
    expect(ops[0].feature).toBe("pocket");
    expect(ops[0].process).toBe("laser_weird");
  });

  it("NON-DESTRUCTIVE: a native body already carrying operations[] passes through untouched", () => {
    const native = { material: "x", operations: [{ feature: "slot", depth: 5 }], batch_size: 10 };
    const out = adaptCostEstimateRequest(native);
    expect(out).toBe(native); // same reference -> not rewritten
  });

  it("does NOT invent operations[] for a body with no string `operation` (unrelated caller passes through)", () => {
    const body = { material: "x", foo: 1 };
    const out = adaptCostEstimateRequest(body);
    expect(out).toBe(body);
    expect((out as Record<string, unknown>).operations).toBeUndefined();
  });

  it("does not override an explicit batch_size with quantity", () => {
    const out = adaptCostEstimateRequest({ material: "x", operation: "milling", quantity: 100, batch_size: 5 }) as Record<string, unknown>;
    expect(out.batch_size).toBe(5);
  });

  it("ignores a non-positive / non-finite quantity (no batch_size fabricated)", () => {
    const zero = adaptCostEstimateRequest({ material: "x", operation: "milling", quantity: 0 }) as Record<string, unknown>;
    expect(zero.batch_size).toBeUndefined();
    const neg = adaptCostEstimateRequest({ material: "x", operation: "milling", quantity: -3 }) as Record<string, unknown>;
    expect(neg.batch_size).toBeUndefined();
  });

  it("floors a fractional quantity to an integer batch_size", () => {
    const out = adaptCostEstimateRequest({ material: "x", operation: "milling", quantity: 12.7 }) as Record<string, unknown>;
    expect(out.batch_size).toBe(12);
  });

  it("defensive: null / array / primitive bodies pass through untouched (never throws)", () => {
    expect(adaptCostEstimateRequest(null)).toBe(null);
    const arr = [1, 2];
    expect(adaptCostEstimateRequest(arr)).toBe(arr);
    expect(adaptCostEstimateRequest("str")).toBe("str");
  });
});

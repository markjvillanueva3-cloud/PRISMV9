// @vitest-environment jsdom
/**
 * T-COSTPAGE-SHAPE (FE half) -- the /api/v1/cost/{estimate,quote} routes return the engine result WRAPPED
 * as `{ result: <body> }`, but web/src/api/cost.ts's `post`/`get` typed the response as the bare body
 * (`CostEstimate`) and CostEstimatorPage derefs `res.per_part_cost` directly -> `undefined.toFixed()` crash.
 * `unwrapResult` peels `body.result` when present (falling back to the bare body) so `costApi.estimate`
 * returns the real CostEstimate. This is the FE half of the dead-panel fix; the route half (adaptCostEstimate)
 * is covered in src/__tests__/cost-route-redaction.test.ts.
 *
 * This test pins:
 *   1. unwrapResult peels { result: X } -> X (reference values).
 *   2. unwrapResult is identity on a bare body (no `result` key), arrays, primitives, null (graceful).
 *   3. costApi.estimate round-trips a WRAPPED wire body -> the page-facing bare CostEstimate (the crash fix).
 *   4. NEGATIVE CONTROL (R9): if the route body were NOT unwrapped, res.per_part_cost would be undefined.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { costApi, unwrapResult, type CostEstimate } from "../api/cost";

// The EXACT shape adaptCostEstimate emits on the route (cost.ts) -- a 3-key breakdown {machine,tooling,setup}
// (the engine computes only those three components; it does NOT split out material/labor/overhead). The
// FE CostEstimate interface declares 5 keys but the page renders Object.entries(breakdown) (shape-agnostic),
// so 3 keys render as 3 bars. Mirror the REAL route output here (not the 5-key interface) so this FE test
// and src/__tests__/cost-route-redaction.test.ts tell ONE consistent story (R9 -- mock the real wire).
function feShape(): CostEstimate {
  return {
    total_cost: 1062.5,
    per_part_cost: 42.5,
    breakdown: { machine: 18.3, tooling: 6.4, setup: 9.1 },
  };
}

describe("T-COSTPAGE-SHAPE FE: unwrapResult peels the { result } envelope", () => {
  it("peels { result: X } -> X with reference values", () => {
    const out = unwrapResult<CostEstimate>({ result: feShape() });
    expect(out.per_part_cost).toBe(42.5);
    expect(out.total_cost).toBe(1062.5);
    expect(out.breakdown.machine).toBe(18.3);
  });

  it("is identity on a bare body that has no `result` key", () => {
    const bare = feShape();
    expect(unwrapResult<CostEstimate>(bare)).toBe(bare); // same ref -- no rewrap
  });

  it("is identity on arrays, primitives, and null (never throws, never over-peels)", () => {
    const arr = [{ result: 1 }];
    expect(unwrapResult(arr)).toBe(arr);              // array carrying a `result` element is NOT peeled
    expect(unwrapResult(42)).toBe(42);
    expect(unwrapResult("x")).toBe("x");
    expect(unwrapResult(null)).toBe(null);
  });

  it("peels only the OUTER result, leaving a nested result key intact", () => {
    const out = unwrapResult<{ result: number }>({ result: { result: 7 } });
    expect(out).toEqual({ result: 7 }); // inner object untouched
  });
});

describe("T-COSTPAGE-SHAPE FE: costApi.estimate returns the page-facing CostEstimate (the crash fix)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function okJson(body: unknown) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);
  }

  it("estimate unwraps the WRAPPED route body -> bare CostEstimate the page can deref", async () => {
    // The route returns res.json({ result: <FE-shaped> }). Before the unwrap, the page read
    // res.per_part_cost === undefined and crashed; after, it reads 42.5.
    fetchMock.mockReturnValueOnce(okJson({ result: feShape() }));
    const res = await costApi.estimate({ material: "steel", operation: "milling", quantity: 100 });
    expect(res.per_part_cost).toBe(42.5);            // was undefined -> .toFixed() crash
    expect(res.total_cost).toBe(1062.5);
    expect(res.breakdown.machine).toBe(18.3);
  });

  it("estimate still works if a route ever returns the result UN-wrapped (graceful fallback)", async () => {
    fetchMock.mockReturnValueOnce(okJson(feShape())); // bare body, no { result }
    const res = await costApi.estimate({ material: "steel", operation: "milling", quantity: 1 });
    expect(res.per_part_cost).toBe(42.5);
  });

  it("NEGATIVE CONTROL: without the unwrap, the wrapped body's per_part_cost would be undefined", () => {
    // Prove the bug the unwrap fixes: reading the wrapped body directly (no unwrap) gives undefined.
    const wrapped = { result: feShape() } as unknown as CostEstimate;
    expect(wrapped.per_part_cost).toBeUndefined();   // the exact pre-fix crash source
    expect(unwrapResult<CostEstimate>(wrapped).per_part_cost).toBe(42.5); // the fix
  });

  it("estimate throws on a non-ok response (error path preserved)", async () => {
    fetchMock.mockReturnValueOnce(
      Promise.resolve({ ok: false, statusText: "Bad Request", json: () => Promise.resolve({ message: "boom" }) } as Response),
    );
    await expect(costApi.estimate({ material: "x", operation: "milling", quantity: 1 })).rejects.toThrow("boom");
  });
});

/**
 * sfc router -- Kienzle force + coefficients + MRR routes (QUEBEC/U-SFC-KIENZLE-ROUTE).
 *
 * These 3 routes complete the calc REST surface that the orphan web client `calcApi`
 * (web/src/api/calc.ts) had targeted at DEAD paths (/kienzle, /taylor, /mrr never existed). They are the
 * focused Kienzle force endpoints the "Kienzle Tool Crib" page consumes:
 *   POST /kienzle              -> prism_calc:kienzle_force        (KienzleForceModelEngine.calculateSpecificCuttingForce)
 *   GET  /kienzle-coefficients -> prism_calc:kienzle_coefficients (the kc1.1/mc table)
 *   POST /mrr                  -> prism_calc:mrr
 * Tests invoke the REAL registered handlers with a recording callTool mock (no HTTP server), so a
 * wrong action name / missing wrap / dropped body would fail (R9 -- intent, not just registration).
 */
import { describe, it, expect } from "vitest";
import type { CallToolFn } from "../routes/index.js";
import { createSfcRouter } from "../routes/sfc.js";

function mockCallTool(payload: unknown): { fn: CallToolFn; calls: Array<[string, string, unknown]> } {
  const calls: Array<[string, string, unknown]> = [];
  const fn = (async (tool: string, action: string, params: unknown) => {
    calls.push([tool, action, params]);
    return payload;
  }) as unknown as CallToolFn;
  return { fn, calls };
}

type Handler = (req: { body?: unknown }, res: unknown, next: (e?: unknown) => void) => unknown | Promise<unknown>;

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Handler }> };
}

function findHandler(router: ReturnType<typeof createSfcRouter>, method: string, path: string): Handler | undefined {
  const stack = router.stack as RouteLayer[];
  const layer = stack.find((l) => l.route?.path === path && l.route?.methods?.[method]);
  if (!layer?.route) return undefined;
  const inner = layer.route.stack;
  return inner[inner.length - 1].handle;
}

function captureRes(): { res: { json: (b: unknown) => unknown }; body: () => unknown } {
  let captured: unknown;
  const res = {
    json: (b: unknown) => {
      captured = b;
      return res;
    },
  };
  return { res, body: () => captured };
}

describe("sfc Kienzle + MRR routes", () => {
  it("POST /kienzle forwards to prism_calc:kienzle_force and wraps { result }", async () => {
    const { fn, calls } = mockCallTool({ specific_force: 1700 });
    const handle = findHandler(createSfcRouter(fn), "post", "/kienzle");
    expect(typeof handle).toBe("function");
    const { res, body } = captureRes();
    await handle!({ body: { material: "P", chip_thickness_mm: 0.1 } }, res, () => {});
    expect(calls[0]).toEqual(["prism_calc", "kienzle_force", { material: "P", chip_thickness_mm: 0.1 }]);
    expect(body()).toEqual({ result: { specific_force: 1700 } });
  });

  it("GET /kienzle-coefficients forwards to prism_calc:kienzle_coefficients with empty params", async () => {
    const { fn, calls } = mockCallTool({ P: { kc1_1: 1800, mc: 0.25 } });
    const handle = findHandler(createSfcRouter(fn), "get", "/kienzle-coefficients");
    expect(typeof handle).toBe("function");
    const { res, body } = captureRes();
    await handle!({}, res, () => {});
    expect(calls[0]).toEqual(["prism_calc", "kienzle_coefficients", {}]);
    expect(body()).toEqual({ result: { P: { kc1_1: 1800, mc: 0.25 } } });
  });

  it("POST /mrr forwards to prism_calc:mrr", async () => {
    const { fn, calls } = mockCallTool({ mrr_cm3_min: 42 });
    const handle = findHandler(createSfcRouter(fn), "post", "/mrr");
    expect(typeof handle).toBe("function");
    const { res, body } = captureRes();
    await handle!({ body: { ap: 2, ae: 5, feed: 300 } }, res, () => {});
    expect(calls[0]).toEqual(["prism_calc", "mrr", { ap: 2, ae: 5, feed: 300 }]);
    expect(body()).toEqual({ result: { mrr_cm3_min: 42 } });
  });

  it("propagates a transport throw to next (express error handler), not res.json", async () => {
    const fn = (async () => {
      throw new Error("bridge down");
    }) as unknown as CallToolFn;
    const handle = findHandler(createSfcRouter(fn), "post", "/kienzle");
    const { res, body } = captureRes();
    let nextErr: unknown;
    await handle!({ body: {} }, res, (e) => {
      nextErr = e;
    });
    expect(nextErr).toBeInstanceOf(Error);
    expect((nextErr as Error).message).toBe("bridge down");
    expect(body()).toBeUndefined();
  });

  it("registers all 3 new routes with the right verbs", () => {
    const router = createSfcRouter(mockCallTool({}).fn);
    const stack = router.stack as RouteLayer[];
    const has = (path: string, method: string) =>
      stack.some((l) => l.route?.path === path && l.route?.methods?.[method]);
    expect(has("/kienzle", "post")).toBe(true);
    expect(has("/kienzle-coefficients", "get")).toBe(true);
    expect(has("/mrr", "post")).toBe(true);
  });
});

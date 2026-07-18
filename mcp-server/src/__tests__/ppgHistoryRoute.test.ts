/**
 * ppg router GET /history (QUEBEC/U-PPG-HISTORY-ROUTE) -- the read-only wire that closes the
 * client.ts `ppgHistory()` dead path. Verifies the REAL handler forwards prism_product:ppg_history with
 * empty params, wraps the file's { ok, data } envelope, and fails loud (500 { ok:false }) on a throw.
 */
import { describe, it, expect } from "vitest";
import type { CallToolFn } from "../routes/index.js";
import { createPpgRouter } from "../routes/ppg.js";

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

function findHandler(router: ReturnType<typeof createPpgRouter>, method: string, path: string): Handler | undefined {
  const stack = router.stack as RouteLayer[];
  const layer = stack.find((l) => l.route?.path === path && l.route?.methods?.[method]);
  if (!layer?.route) return undefined;
  const inner = layer.route.stack;
  return inner[inner.length - 1].handle;
}

function captureRes(): { res: unknown; body: () => unknown; status: () => number } {
  let body: unknown;
  let code = 200;
  const res = {
    json: (b: unknown) => {
      body = b;
      return res;
    },
    status: (c: number) => {
      code = c;
      return res;
    },
  };
  return { res, body: () => body, status: () => code };
}

describe("ppg GET /history route", () => {
  it("forwards to prism_product:ppg_history with empty params and wraps { ok, data }", async () => {
    const { fn, calls } = mockCallTool({ history: [{ id: "p1" }, { id: "p2" }] });
    const handle = findHandler(createPpgRouter(fn), "get", "/history");
    expect(typeof handle).toBe("function");
    const { res, body } = captureRes();
    await handle!({}, res, () => {});
    expect(calls[0]).toEqual(["prism_product", "ppg_history", {}]);
    expect(body()).toEqual({ ok: true, data: { history: [{ id: "p1" }, { id: "p2" }] } });
  });

  it("fails loud: a transport throw -> 500 { ok:false, error }", async () => {
    const fn = (async () => {
      throw new Error("bridge down");
    }) as unknown as CallToolFn;
    const handle = findHandler(createPpgRouter(fn), "get", "/history");
    const { res, body, status } = captureRes();
    await handle!({}, res, () => {});
    expect(status()).toBe(500);
    expect(body()).toEqual({ ok: false, error: "bridge down" });
  });

  it("registers /history as a GET route", () => {
    const router = createPpgRouter(mockCallTool({}).fn);
    const stack = router.stack as RouteLayer[];
    expect(stack.some((l) => l.route?.path === "/history" && l.route?.methods?.get)).toBe(true);
  });
});

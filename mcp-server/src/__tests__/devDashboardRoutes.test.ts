/**
 * dev router GET dashboard reads (QUEBEC/U-DEV-DASHBOARD-ROUTES) -- close the web/src/api/dev.ts dead
 * wires qualityDashboard / pillarSummary / capabilityCensus. Each forwards a real prism_dev action and
 * wraps the file's { ok, data } envelope; failure is loud (500 { ok:false }). devApi.inventory() is NOT
 * wired (no prism_dev:inventory action) -- intentionally absent.
 */
import { describe, it, expect } from "vitest";
import type { CallToolFn } from "../routes/index.js";
import { createDevRouter } from "../routes/dev.js";

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

function findHandler(router: ReturnType<typeof createDevRouter>, method: string, path: string): Handler | undefined {
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

const CASES: Array<[string, string]> = [
  ["/quality-dashboard", "quality_dashboard"],
  ["/pillar-summary", "pillar_summary"],
  ["/capability-census", "capability_census"],
];

describe("dev dashboard GET routes", () => {
  for (const [path, action] of CASES) {
    it(`GET ${path} forwards prism_dev:${action} and wraps { ok, data }`, async () => {
      const { fn, calls } = mockCallTool({ value: action });
      const handle = findHandler(createDevRouter(fn), "get", path);
      expect(typeof handle).toBe("function");
      const { res, body } = captureRes();
      await handle!({}, res, () => {});
      expect(calls[0][0]).toBe("prism_dev");
      expect(calls[0][1]).toBe(action);
      expect(body()).toEqual({ ok: true, data: { value: action } });
    });
  }

  it("fails loud: a throw -> 500 { ok:false, error }", async () => {
    const fn = (async () => {
      throw new Error("dev bridge down");
    }) as unknown as CallToolFn;
    const handle = findHandler(createDevRouter(fn), "get", "/quality-dashboard");
    const { res, body, status } = captureRes();
    await handle!({}, res, () => {});
    expect(status()).toBe(500);
    expect(body()).toEqual({ ok: false, error: "dev bridge down" });
  });

  it("registers the 3 dashboard GET routes and NOT /inventory", () => {
    const router = createDevRouter(mockCallTool({}).fn);
    const stack = router.stack as RouteLayer[];
    const has = (path: string) => stack.some((l) => l.route?.path === path && l.route?.methods?.get);
    expect(has("/quality-dashboard")).toBe(true);
    expect(has("/pillar-summary")).toBe(true);
    expect(has("/capability-census")).toBe(true);
    expect(has("/inventory")).toBe(false);
  });
});

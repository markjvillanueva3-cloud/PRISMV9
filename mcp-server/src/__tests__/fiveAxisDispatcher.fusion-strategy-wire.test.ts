/**
 * fiveAxisDispatcher — fusion_5axis_strategy wiring (U-5AX-FUSION-STRATEGY-WIRE).
 *
 * 3rd dark-action fix: `fusion_5axis_strategy` probed recommend/select/run, but the
 * real instance method is `recommendStrategy(geometry, operation, tool)` (positional
 * args) -> always "method not callable". Now routes to the singleton's
 * recommendStrategy; strict schema guards tool.type (the only crashing deref).
 */
import { describe, it, expect } from "vitest";
import { registerFiveAxisDispatcher } from "../tools/dispatchers/fiveAxisDispatcher.js";

function makeInvoke() {
  let handler: ((arg: { action: string; params?: Record<string, unknown> }) => Promise<unknown>) | undefined;
  const server = {
    tool: (_n: string, _d: string, _s: unknown, h: typeof handler) => { handler = h; },
  };
  registerFiveAxisDispatcher(server);
  if (!handler) throw new Error("registerFiveAxisDispatcher did not register a handler");
  return async (action: string, params: Record<string, unknown>): Promise<unknown> => {
    const res = (await handler!({ action, params })) as { content?: Array<{ text?: string }> };
    const text = res?.content?.[0]?.text ?? "null";
    try { return JSON.parse(text); } catch { return { _raw: text }; }
  };
}

const tool = {
  type: "flat_end",
  diameter_mm: 12,
  flute_count: 4,
  flute_length_mm: 30,
  overall_length_mm: 80,
  helix_angle_deg: 30,
};
const validRequest = { geometry: "ruled_surface", operation: "roughing", tool };

describe("fiveAxisDispatcher fusion_5axis_strategy — dark-action fix (real recommendStrategy)", () => {
  it("returns a scored strategy array (ruled_surface+flat_end matches swarf), NOT 'method not callable'", async () => {
    const invoke = makeInvoke();
    const r = await invoke("fusion_5axis_strategy", validRequest);
    expect(JSON.stringify(r)).not.toMatch(/method not callable/i);
    expect(Array.isArray(r)).toBe(true);
    const arr = r as Array<{ strategy: { id?: string }; score: number; reason: string }>;
    expect(arr.length).toBeGreaterThan(0);
    expect(arr[0].score).toBeGreaterThan(0);
    expect(arr[0].score).toBeLessThanOrEqual(1);
    expect((arr[0].reason as string).length).toBeGreaterThan(0);
    expect((arr[0].strategy.id as string).length).toBeGreaterThan(0);
  });

  it("results are sorted by descending score (best strategy first)", async () => {
    const invoke = makeInvoke();
    const arr = (await invoke("fusion_5axis_strategy", validRequest)) as Array<{ score: number }>;
    expect(arr.length).toBeGreaterThan(0);
    for (let i = 1; i < arr.length; i++) {
      expect(arr[i].score).toBeLessThanOrEqual(arr[i - 1].score);
    }
  });

  it("graceful: an unknown geometry returns an (empty) array, never a crash or invalid-params", async () => {
    const invoke = makeInvoke();
    const r = await invoke("fusion_5axis_strategy", { ...validRequest, geometry: "no_such_geometry_xyz" });
    expect(Array.isArray(r)).toBe(true);
    expect((r as unknown[]).length).toBe(0);
    expect(JSON.stringify(r)).not.toMatch(/invalid params/i);
  });

  it("crash-guard: missing tool is rejected (recommendStrategy reads tool.type)", async () => {
    const invoke = makeInvoke();
    const r = await invoke("fusion_5axis_strategy", { ...validRequest, tool: undefined });
    expect(JSON.stringify(r)).toMatch(/invalid params/i);
  });

  it("rejects an out-of-enum operation", async () => {
    const invoke = makeInvoke();
    const r = await invoke("fusion_5axis_strategy", { ...validRequest, operation: "polishing" });
    expect(JSON.stringify(r)).toMatch(/invalid params/i);
  });

  it("rejects an out-of-enum tool.type", async () => {
    const invoke = makeInvoke();
    const r = await invoke("fusion_5axis_strategy", { ...validRequest, tool: { ...tool, type: "plasma" } });
    expect(JSON.stringify(r)).toMatch(/invalid params/i);
  });
});

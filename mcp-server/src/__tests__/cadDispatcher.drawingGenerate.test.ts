import { describe, it, expect } from "vitest";
import { registerCadDispatcher } from "../tools/dispatchers/cadDispatcher.js";
import { INCH_TO_MM } from "../physics/unit-conversions.js";

/**
 * Dispatcher-level ROUND-TRIP tests for cad_drawing_generate (U-CAD-2D-DRAWING-HARDEN, R15).
 *
 * CAD2DDrawingEngine is unit-tested in CAD2DDrawingEngine.test.ts; this exercises the FULL
 * dispatcher path (paramNormalizer -> cad2DDrawingSchema Zod validation -> lazy engine import ->
 * MCP response shaping). The handler serializes the raw DrawingResult into content[0].text on the
 * engine path, and a dispatcherError body ({success:false,error}) when the Zod schema rejects --
 * both parse from content[0].text (same harness as cadDispatcher.holdout-check.test.ts).
 */
function captureHandler(): (args: { action: string; params?: Record<string, unknown> }) => Promise<any> {
  let handler: ((a: { action: string; params?: Record<string, unknown> }) => Promise<any>) | undefined;
  const fakeServer = {
    tool: (_name: string, _desc: string, _schema: unknown, h: typeof handler) => { handler = h; },
  };
  registerCadDispatcher(fakeServer as unknown as Parameters<typeof registerCadDispatcher>[0]);
  if (!handler) throw new Error("registerCadDispatcher did not register a prism_cad handler");
  return handler;
}

async function call(handler: ReturnType<typeof captureHandler>, params: Record<string, unknown>): Promise<any> {
  const res = await handler({ action: "cad_drawing_generate", params });
  const text = res?.content?.[0]?.text;
  if (typeof text === "string") {
    try { return JSON.parse(text); } catch { /* fall through to raw */ }
  }
  return res;
}

const view = (r: { views: any[] }, name: string) => r.views.find((v: any) => v.name === name);

describe("prism_cad cad_drawing_generate (dispatcher round-trip, R15)", () => {
  it("happy path: first_angle layout round-trips with exact standard placement (top BELOW, right LEFT)", async () => {
    const handler = captureHandler();
    const r = await call(handler, { projection: "first_angle", view_spacing_mm: 60 });
    expect(r.success).toBe(true);
    expect(view(r, "top")).toMatchObject({ x_mm: 0, y_mm: -60 });
    expect(view(r, "right")).toMatchObject({ x_mm: -60, y_mm: 0 });
    expect(r.cadquery_op).toContain("ortho drawing (first_angle)");
  });

  it("overlap clearance round-trips: 1000:1 plate raises the horizontal offset, flags spacing_adjusted", async () => {
    const handler = captureHandler();
    const r = await call(handler, { part_size_mm: { x: 1000, y: 1, z: 1 } });
    expect(r.success).toBe(true);
    expect(view(r, "right")!.x_mm).toBe(525.5); // 500 + 0.5 + 25 house gap
    expect(r.spacing_adjusted).toBe(true);
  });

  it("declared inch units round-trip: unsuffixed spacing converts via canonical INCH_TO_MM", async () => {
    const handler = captureHandler();
    const r = await call(handler, { units: "inch", view_spacing: 4 });
    expect(r.success).toBe(true);
    expect(view(r, "top")!.y_mm).toBeCloseTo(4 * INCH_TO_MM, 10);
    expect(r.notes.join(" ")).toMatch(/NIST SP 811/);
  });

  it("adversarial: unknown projection string is rejected at the schema boundary (fail loud)", async () => {
    const handler = captureHandler();
    const r = await call(handler, { projection: "isometric" });
    expect(r.success).toBe(false);
    expect(String(r.error ?? r.notes?.[0])).toMatch(/Invalid params|projection/);
  });

  it("adversarial: NaN spacing never yields a successful layout through the dispatcher", async () => {
    const handler = captureHandler();
    // whichever layer rejects (Zod NaN gate or the engine finiteness guard), success MUST be false
    const r = await call(handler, { view_spacing_mm: NaN });
    expect(r.success).toBe(false);
  });

  it("adversarial: zero-extent (degenerate) part round-trips to a structured engine failure naming the axis", async () => {
    const handler = captureHandler();
    const r = await call(handler, { part_size_mm: { x: 100, y: 0, z: 50 } });
    expect(r.success).toBe(false);
    expect(String(r.notes?.[0] ?? r.error)).toMatch(/degenerate/);
  });

  it("adversarial: zero-spacing (degenerate 0-layout request) -> structured failure", async () => {
    const handler = captureHandler();
    const r = await call(handler, { view_spacing_mm: 0 });
    expect(r.success).toBe(false);
  });

  it("mixed units through the dispatcher fail loud (inch units + *_mm param)", async () => {
    const handler = captureHandler();
    const r = await call(handler, { units: "in", view_spacing_mm: 100 });
    expect(r.success).toBe(false);
    expect(String(r.notes?.[0] ?? r.error)).toMatch(/mixed units/);
  });

  it("PMI passthrough params survive the round-trip surfaced, never silently dropped", async () => {
    const handler = captureHandler();
    const r = await call(handler, { gdt: [{ fcf: "|flatness|0.05|" }] });
    expect(r.success).toBe(true);
    expect(r.unplaced_pmi_keys).toEqual(["gdt"]);
    expect(r.notes.join(" ")).toMatch(/NOT placed/);
  });
});

/**
 * calcDispatcher × QuickCalcEngine wire — orphan-rescue wiring (OBSIDIAN-PRISM-OS-MS0).
 *
 * Before this wire: QuickCalcEngine was an orphan — built (161 LoC, 10 pure methods,
 * 14 vitest cases in quick-calc-engine.test.ts) but with no dispatcher reference.
 *
 * After this wire: 10 new prism_calc actions surface every engine method:
 *   quick_rpm · quick_feed_rate · quick_mrr · quick_surface_speed · quick_chip_load ·
 *   quick_tap_drill · quick_cutting_time · quick_scallop_height ·
 *   quick_thread_pitch · quick_cutting_power.
 *
 * Each test ties to the canonical engine formula:
 *   rpm (imperial)         = (SFM × 3.8197) / D_in     (rounded to integer)
 *   rpm (metric)           = (Vc × 1000) / (π × D_mm)  (rounded to integer)
 *   feed_rate              = RPM × fz × z
 *   mrr                    = woc × doc × feed
 *   surface_speed          = π × D × RPM / 12          (imperial, SFM)
 *   surface_speed          = π × D × RPM / 1000        (metric, m/min)
 *   chip_load              = F / (RPM × z)
 *   tap_drill              = D_major − pitch           (metric thread, mm)
 *   cutting_time           = L / F                     (minutes; ×60 for seconds)
 *   scallop_height         = R − √(R² − (step/2)²)     (full scallop = R when step/2 > R)
 *   thread_pitch           = 1 / tpi                   (in inches; × 25.4 for mm)
 *   cutting_power          = MRR × unit-power-factor   (factors: Al=0.25, St=1.0, SS=1.5, Ti=1.2, CI=0.7)
 *
 * @milestone OBSIDIAN-PRISM-OS-MS0
 * @unit U-ORPHAN-RESCUE-QUICK-CALC
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerCalcDispatcher } from "../tools/dispatchers/calcDispatcher.js";

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as
    | { content: { type: string; text: string }[] }
    | { success: false; error: string; action: string; dispatcher: string };
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const text = envelope.content[0]!.text;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(text); } catch { return { ok: false, data: { rawText: text } }; }
  if (parsed && typeof parsed === "object" && ("engine_error" in parsed || "error" in parsed)) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerCalcDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

describe("calcDispatcher × QuickCalcEngine wire (U-ORPHAN-RESCUE-QUICK-CALC)", () => {
  // ── quick_rpm ────────────────────────────────────────────────────────────
  it("quick_rpm — imperial: 300 SFM @ 0.5\" → ~2292 RPM (round of 300·3.8197/0.5)", async () => {
    const r = await call(server, "quick_rpm", { surface_speed: 300, diameter: 0.5 });
    expect(r.ok).toBe(true);
    expect(r.data.rpm).toBe(Math.round((300 * 3.8197) / 0.5)); // = 2292
    expect(typeof r.data.formula).toBe("string");
  });

  it("quick_rpm — metric: 100 m/min @ 12 mm → ~2653 RPM (round of 100000/(π·12))", async () => {
    const r = await call(server, "quick_rpm", { surface_speed: 100, diameter: 12, metric: true });
    expect(r.ok).toBe(true);
    expect(r.data.rpm).toBe(Math.round((100 * 1000) / (Math.PI * 12))); // = 2653
  });

  // ── quick_feed_rate ──────────────────────────────────────────────────────
  it("quick_feed_rate — 5000 RPM × 0.003 fz × 4 flutes = 60 IPM exactly", async () => {
    const r = await call(server, "quick_feed_rate", { rpm: 5000, chip_load: 0.003, flutes: 4 });
    expect(r.ok).toBe(true);
    expect(r.data.feed_ipm).toBe(60);
    expect(r.data.feed_mmmin as number).toBeCloseTo(60 * 25.4, 4);
  });

  // ── quick_mrr ────────────────────────────────────────────────────────────
  it("quick_mrr — 0.5\" WOC × 0.25\" DOC × 60 IPM = 7.5 in³/min", async () => {
    const r = await call(server, "quick_mrr", { woc: 0.5, doc: 0.25, feed_rate: 60 });
    expect(r.ok).toBe(true);
    expect(r.data.mrr_in3min).toBe(7.5);
    // 7.5 in³/min × 16.387 cm³/in³ = 122.9 cm³/min
    expect(r.data.mrr_cm3min as number).toBeCloseTo(7.5 * 16.387064, 3);
  });

  // ── quick_surface_speed ──────────────────────────────────────────────────
  it("quick_surface_speed — imperial: 5000 RPM @ 0.5\" → SFM = π·0.5·5000/12 ≈ 654.5", async () => {
    const r = await call(server, "quick_surface_speed", { rpm: 5000, diameter: 0.5 });
    expect(r.ok).toBe(true);
    expect(r.data.sfm as number).toBeCloseTo((Math.PI * 0.5 * 5000) / 12, 2);
  });

  // ── quick_chip_load ──────────────────────────────────────────────────────
  it("quick_chip_load — round-trip of feed_rate test: 60 IPM / (5000·4) = 0.003\"", async () => {
    const r = await call(server, "quick_chip_load", { feed_rate: 60, rpm: 5000, flutes: 4 });
    expect(r.ok).toBe(true);
    expect(r.data.chipload_in).toBe(0.003);
    expect(r.data.chipload_mm as number).toBeCloseTo(0.003 * 25.4, 5);
  });

  // ── quick_tap_drill ──────────────────────────────────────────────────────
  it("quick_tap_drill — M10×1.5 → 8.5 mm drill (10−1.5)", async () => {
    const r = await call(server, "quick_tap_drill", { major_dia: 10, pitch: 1.5 });
    expect(r.ok).toBe(true);
    expect(r.data.drill_mm).toBe(8.5);
    // inch conversion: 8.5 / 25.4 ≈ 0.3346
    expect(r.data.drill_in as number).toBeCloseTo(8.5 / 25.4, 4);
  });

  // ── quick_cutting_time ───────────────────────────────────────────────────
  it("quick_cutting_time — 12 units @ 60/min = 0.2 min = 12 s", async () => {
    const r = await call(server, "quick_cutting_time", { distance: 12, feed_rate: 60 });
    expect(r.ok).toBe(true);
    expect(r.data.time_min).toBe(0.2);
    expect(r.data.time_sec).toBe(12);
  });

  // ── quick_scallop_height ─────────────────────────────────────────────────
  it("quick_scallop_height — R=3 mm, step=1 mm → h ≈ 3 − √(9 − 0.25) ≈ 0.0417", async () => {
    const r = await call(server, "quick_scallop_height", { tool_radius: 3, stepover: 1 });
    expect(r.ok).toBe(true);
    // Engine rounds to 4 decimals: round((3 − √(9 − 0.25))·10000)/10000
    const expected = Math.round((3 - Math.sqrt(9 - 0.25)) * 10000) / 10000;
    expect(r.data.height).toBe(expected);
  });

  it("quick_scallop_height — stepover/2 > radius returns FULL scallop (height = radius)", async () => {
    const r = await call(server, "quick_scallop_height", { tool_radius: 3, stepover: 10 });
    expect(r.ok).toBe(true);
    expect(r.data.height).toBe(3);
    expect(r.data.formula).toBe("stepover > diameter, full scallop");
  });

  // ── quick_thread_pitch ───────────────────────────────────────────────────
  it("quick_thread_pitch — 20 TPI → pitch_in=0.05, pitch_mm≈1.27", async () => {
    const r = await call(server, "quick_thread_pitch", { tpi: 20 });
    expect(r.ok).toBe(true);
    expect(r.data.pitch_in).toBe(0.05);
    expect(r.data.pitch_mm as number).toBeCloseTo(1.27, 4);
  });

  // ── quick_cutting_power ──────────────────────────────────────────────────
  it("quick_cutting_power — 5 in³/min steel (factor 1.0) → 5 HP, ~3.73 kW", async () => {
    const r = await call(server, "quick_cutting_power", { mrr_in3min: 5, material: "steel" });
    expect(r.ok).toBe(true);
    expect(r.data.hp).toBe(5);
    expect(r.data.kw as number).toBeCloseTo(5 * 0.7457, 2);
  });

  it("quick_cutting_power — 20 in³/min aluminum (factor 0.25) → 5 HP", async () => {
    const r = await call(server, "quick_cutting_power", { mrr_in3min: 20, material: "aluminum" });
    expect(r.ok).toBe(true);
    expect(r.data.hp).toBe(5);
  });

  it("quick_cutting_power — custom factor 2.0 × 10 in³/min = 20 HP", async () => {
    const r = await call(server, "quick_cutting_power", { mrr_in3min: 10, material: "custom", custom_factor: 2.0 });
    expect(r.ok).toBe(true);
    expect(r.data.hp).toBe(20);
  });

  // ── Schema validation (Zod) — invalid inputs rejected ────────────────────
  it("schema rejects negative surface_speed in quick_rpm (Zod posNum)", async () => {
    const r = await call(server, "quick_rpm", { surface_speed: -100, diameter: 0.5 });
    expect(r.ok).toBe(false); // dispatcherError envelope with validation message
  });

  it("schema rejects missing required field (quick_feed_rate w/o flutes)", async () => {
    const r = await call(server, "quick_feed_rate", { rpm: 5000, chip_load: 0.003 });
    expect(r.ok).toBe(false);
  });

  it("schema rejects unknown material in quick_cutting_power", async () => {
    const r = await call(server, "quick_cutting_power", { mrr_in3min: 5, material: "unobtanium" });
    expect(r.ok).toBe(false);
  });

  // ── Statelessness — two consecutive calls produce independent results ───
  it("two consecutive calls do not share state (no singleton leak)", async () => {
    const a = await call(server, "quick_rpm", { surface_speed: 300, diameter: 0.5 });
    const b = await call(server, "quick_rpm", { surface_speed: 100, diameter: 12, metric: true });
    expect(a.ok && b.ok).toBe(true);
    expect(a.data.rpm).toBe(Math.round((300 * 3.8197) / 0.5));
    expect(b.data.rpm).toBe(Math.round((100 * 1000) / (Math.PI * 12)));
    expect(a.data.rpm).not.toBe(b.data.rpm);
  });

  // ── Action presence — all 10 wired actions must be in the registered enum ─
  it("all 10 quick_* actions are accepted by the registered dispatcher (no unknown_action)", async () => {
    const actions = [
      ["quick_rpm",            { surface_speed: 300, diameter: 0.5 }],
      ["quick_feed_rate",      { rpm: 5000, chip_load: 0.003, flutes: 4 }],
      ["quick_mrr",            { woc: 0.5, doc: 0.25, feed_rate: 60 }],
      ["quick_surface_speed",  { rpm: 5000, diameter: 0.5 }],
      ["quick_chip_load",      { feed_rate: 60, rpm: 5000, flutes: 4 }],
      ["quick_tap_drill",      { major_dia: 10, pitch: 1.5 }],
      ["quick_cutting_time",   { distance: 12, feed_rate: 60 }],
      ["quick_scallop_height", { tool_radius: 3, stepover: 1 }],
      ["quick_thread_pitch",   { tpi: 20 }],
      ["quick_cutting_power",  { mrr_in3min: 5, material: "steel" }],
    ] as const;
    for (const [act, p] of actions) {
      const r = await call(server, act, p as Record<string, unknown>);
      expect(r.ok, `${act} should succeed`).toBe(true);
      // No fall-through: the result must contain at least one engine-defined field
      expect(Object.keys(r.data).length).toBeGreaterThan(0);
    }
  });
});

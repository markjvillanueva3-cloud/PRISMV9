/**
 * LatheLiveToolingCrossTap.test.ts -- U-LW-CROSS-TAP (slot:whiskey, 2026-07-01)
 * ============================================================================
 * Coverage-audit gap #1: LatheLiveToolingPlannerEngine had cross_DRILLING but no cross_TAPPING.
 * A rigid live-tool radial tap must SYNC feed to pitch (F = pitch*rpm mm/min), tap IN, reverse the
 * live tool, then feed back OUT to extract. These tests encode that physics (R9) + the fail-loud
 * pitch requirement, and round-trip cross_tapping through the prism_turning dispatcher.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { latheLiveToolingPlannerEngine } from "../engines/LatheLiveToolingPlannerEngine.js";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";

const eng = latheLiveToolingPlannerEngine;

// M8x1.25 radial tap at C=90 on a 50mm bar, live tool at 800 rpm.
const m8x125 = () => ({
  operation: "cross_tapping" as const,
  tool: { diameter: 8, rpm: 800 },
  stock: { diameter: 50 },
  hole: { pitch: 1.25, depth: 6, cPosition: 90 },
});

describe("LatheLiveToolingPlannerEngine.cross_tapping -- rigid live-tool radial tap", () => {
  it("plans a CROSS_TAPPING op with pitch-synced feed (F = pitch*rpm) at the C-angle", () => {
    const r = eng.plan(m8x125());
    expect(r.type).toBe("CROSS_TAPPING");
    const g = r.gcode.join("\n");
    expect(g).toContain("C90.000"); // C-axis positioned to the hole
    expect(g).toContain("F1000"); // synced feed = 1.25 mm/rev * 800 rpm = 1000 mm/min
    expect(g).toMatch(/TAP IN - PITCH-SYNC/); // tap-in block present
    expect(g).toMatch(/TAP EXTRACT - PITCH-SYNC/); // reverse-out extract block present
    expect(g).toContain("RIGID TAP: FEED SYNCED TO PITCH 1.25mm/rev");
    expect(r.cycleTime).toBeGreaterThan(0); // TAP_FEED moves count toward cycle time
  });

  it("reverses the live tool for extraction (CCW M-code between tap-in and tap-out)", () => {
    const r = eng.plan(m8x125());
    const g = r.gcode.join("\n");
    expect(g).toMatch(/M34 \(REVERSE LIVE TOOL CCW/); // default reverse code
    // order: START CW ... TAP IN ... REVERSE ... TAP EXTRACT ... STOP
    expect(g.indexOf("TAP IN")).toBeLessThan(g.indexOf("REVERSE LIVE TOOL CCW"));
    expect(g.indexOf("REVERSE LIVE TOOL CCW")).toBeLessThan(g.indexOf("TAP EXTRACT"));
  });

  it("feed is pitch*rpm, NOT a fixed value (distinct config -> distinct feed)", () => {
    const r = eng.plan({
      operation: "cross_tapping",
      tool: { diameter: 6, rpm: 600 },
      stock: { diameter: 50 },
      hole: { pitch: 0.5, depth: 5, cPosition: 0 },
    } as Parameters<typeof eng.plan>[0]);
    expect(r.gcode.join("\n")).toContain("F300"); // 0.5 * 600 = 300 mm/min
  });

  it("honors a custom reverse M-code (liveToolReverse)", () => {
    const r = eng.plan({
      ...m8x125(),
      tool: { diameter: 8, rpm: 800, liveToolReverse: 24 },
    } as Parameters<typeof eng.plan>[0]);
    expect(r.gcode.join("\n")).toMatch(/M24 \(REVERSE LIVE TOOL CCW/);
  });

  // ---- Fail-loud / adversarial ----------------------------------------------
  it("FAIL-LOUD: missing pitch throws (a rigid tap must know its pitch -- never guess)", () => {
    const bad = { ...m8x125(), hole: { depth: 6, cPosition: 90 } };
    expect(() => eng.plan(bad as Parameters<typeof eng.plan>[0])).toThrow(/pitch/i);
  });

  it("FAIL-LOUD: non-positive pitch is rejected at the schema boundary", () => {
    expect(() => eng.plan({ ...m8x125(), hole: { pitch: 0, depth: 6, cPosition: 90 } } as Parameters<typeof eng.plan>[0])).toThrow();
    expect(() => eng.plan({ ...m8x125(), hole: { pitch: -1.25, depth: 6, cPosition: 90 } } as Parameters<typeof eng.plan>[0])).toThrow();
  });

  it("ADVERSARIAL: NaN/Infinity pitch rejected; centerline-breaching depth throws", () => {
    expect(() => eng.plan({ ...m8x125(), hole: { pitch: NaN, depth: 6, cPosition: 90 } } as Parameters<typeof eng.plan>[0])).toThrow();
    expect(() => eng.plan({ ...m8x125(), hole: { pitch: Infinity, depth: 6, cPosition: 90 } } as Parameters<typeof eng.plan>[0])).toThrow();
    // depth 30 >= stock radius 25 -> would breach centerline
    expect(() => eng.plan({ ...m8x125(), hole: { pitch: 1.25, depth: 30, cPosition: 90 } } as Parameters<typeof eng.plan>[0])).toThrow(/centerline/i);
  });

  it("ADDITIVE: existing cross_drilling is unchanged (still CROSS_DRILLING, no tap blocks)", () => {
    const r = eng.plan({
      operation: "cross_drilling",
      tool: { diameter: 6, rpm: 2000 },
      stock: { diameter: 50 },
      hole: { diameter: 6, depth: 10, cPosition: 45 },
    } as Parameters<typeof eng.plan>[0]);
    expect(r.type).toBe("CROSS_DRILLING");
    expect(r.gcode.join("\n")).not.toMatch(/PITCH-SYNC/);
  });
});

// ---- Dispatcher round-trip ---------------------------------------------------
interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: string; text: string }> }>;
}
function makeStubServer() {
  const captured: CapturedTool[] = [];
  return {
    tools: captured,
    tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
      captured.push({ name, description, schema, handler });
    },
  };
}

describe("cross_tapping via prism_turning dispatcher (live_tool_plan)", () => {
  let handler: CapturedTool["handler"];
  beforeAll(() => {
    const server = makeStubServer();
    registerTurningDispatcher(server as unknown as Parameters<typeof registerTurningDispatcher>[0]);
    const tool = server.tools.find((t) => t.name === "prism_turning");
    if (!tool) throw new Error("prism_turning tool was not registered");
    handler = tool.handler;
  });

  async function invoke(action: string, params: Record<string, unknown>) {
    const res = await handler({ action, params });
    const text = res.content[0]?.text ?? "";
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { __raw: text };
    }
  }

  it("live_tool_plan operation=cross_tapping round-trips to a CROSS_TAPPING plan", async () => {
    const res = await invoke("live_tool_plan", {
      operation: "cross_tapping",
      tool: { diameter: 8, rpm: 800 },
      stock: { diameter: 50 },
      hole: { pitch: 1.25, depth: 6, cPosition: 90 },
    });
    const r = (res.result ?? res.data ?? res) as Record<string, unknown>;
    expect(r.type).toBe("CROSS_TAPPING"); // schema enum accepted it + engine wired
    expect((r.gcode as string[]).join("\n")).toContain("F1000"); // synced feed survived the round-trip
  });

  it("dispatcher rejects an invalid operation enum (schema gate intact)", async () => {
    const res = await invoke("live_tool_plan", { operation: "cross_reaming", tool: { diameter: 8 } });
    expect(JSON.stringify(res).toLowerCase()).toMatch(/invalid|enum|operation/);
  });
});

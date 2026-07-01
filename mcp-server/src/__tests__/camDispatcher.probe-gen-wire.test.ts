/**
 * camDispatcher -- CK-MS11 probe_*_gen wiring fix (U-CK-MS11-PROBE-WIRE-FIX)
 * =========================================================================
 *
 * REGRESSION (slot:bravo 2026-06-22). The five CK-MS11 probe-generation
 * actions on prism_cam --
 *   probe_wcs_setup_gen, probe_first_article_gen, probe_in_process_gen,
 *   probe_tool_measure_gen, probe_auto_comp_gen
 * -- were wired to ProbingProgramEngine ("probingProg"), which only implements
 * generate(points, config). They called generateWCSSetup / generateFirstArticle
 * / generateInProcessCheck / generateToolMeasure / generateAutoComp -- methods
 * that NEVER existed on that engine -- so every invocation threw
 * "<fn> is not a function" at runtime. tsc could not catch it because
 * getEngine() returns `any`. The fix re-points the 5 actions to
 * probeRoutineGeneratorEngine ("probeGen"), the engine that actually implements
 * the feature-based probe API (and already backs the sibling probe_* actions).
 *
 * Because the bug is purely in dispatcher ROUTING (the engines work fine in
 * isolation), the load-bearing assertions round-trip THROUGH the registered
 * prism_cam handler -- a direct-engine test would pass even with the bug.
 */

import { describe, it, expect } from "vitest";
import { registerCamDispatcher, ACTIONS } from "../tools/dispatchers/camDispatcher.js";
import { probingProgramEngine } from "../engines/ProbingProgramEngine.js";
import { probeRoutineGeneratorEngine } from "../engines/ProbeRoutineGeneratorEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, _description: string, _schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, handler });
  }
}

/**
 * Invoke prism_cam through its registered handler and normalize the result.
 * Returns { ok, data }: ok=false on a thrown error OR an error/{success:false}
 * envelope (i.e. exactly the pre-fix "is not a function" failure mode).
 */
async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: any }> {
  const tool = server.tools.find(t => t.name === "prism_cam");
  if (!tool) throw new Error("prism_cam not registered");
  let raw: any;
  try {
    raw = await tool.handler({ action, params });
  } catch (e) {
    return { ok: false, data: { thrown: String(e) } };
  }
  if (raw && typeof raw === "object" && "success" in raw && raw.success === false) {
    return { ok: false, data: raw };
  }
  const envelope = raw as { content?: { type: string; text: string }[] };
  const text = envelope?.content?.[0]?.text;
  if (typeof text !== "string") return { ok: false, data: raw };
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, data: { rawText: text } };
  }
  if (parsed && typeof parsed === "object" && "error" in parsed) {
    return { ok: false, data: parsed };
  }
  return { ok: true, data: parsed };
}

function server(): MockMCPServer {
  const s = new MockMCPServer();
  registerCamDispatcher(s as any);
  return s;
}

const BORE_FEATURE = {
  type: "bore",
  position: { x: 10, y: 20, z: -5 },
  diameter: 25,
  nominal: 25,
  tolerance_plus: 0.02,
  tolerance_minus: 0.02,
};

describe("camDispatcher CK-MS11 probe_*_gen -- root-cause documentation", () => {
  it("the OLD target engine (ProbingProgramEngine) lacks the 5 called methods", () => {
    // This is exactly why the dispatcher threw at runtime.
    for (const m of [
      "generateWCSSetup", "generateFirstArticle", "generateInProcessCheck",
      "generateToolMeasure", "generateAutoComp",
    ]) {
      expect(typeof (probingProgramEngine as any)[m]).toBe("undefined");
    }
    // ProbingProgramEngine only exposes generate().
    expect(typeof (probingProgramEngine as any).generate).toBe("function");
  });

  it("the NEW target engine (probeRoutineGeneratorEngine) implements the real API", () => {
    expect(typeof probeRoutineGeneratorEngine.generateWCSSetup).toBe("function");
    expect(typeof probeRoutineGeneratorEngine.generateFirstArticle).toBe("function");
    expect(typeof probeRoutineGeneratorEngine.generatePartInspection).toBe("function");
    expect(typeof probeRoutineGeneratorEngine.generateToolMeasurement).toBe("function");
  });
});

describe("camDispatcher CK-MS11 probe_*_gen -- enum reachability (anti-regression)", () => {
  it("all 5 actions remain in the prism_cam z.enum", () => {
    for (const a of [
      "probe_wcs_setup_gen", "probe_first_article_gen", "probe_in_process_gen",
      "probe_tool_measure_gen", "probe_auto_comp_gen",
    ]) {
      expect((ACTIONS as readonly string[]).includes(a)).toBe(true);
    }
  });
});

describe("camDispatcher CK-MS11 probe_*_gen -- dispatcher round-trip (happy path)", () => {
  it("probe_wcs_setup_gen -> real probe G-code (was: TypeError)", async () => {
    const s = server();
    const r = await call(s, "probe_wcs_setup_gen", { controller: "fanuc", features: [BORE_FEATURE] });
    expect(r.ok).toBe(true);
    expect(typeof r.data.gcode).toBe("string");
    expect(r.data.gcode.length).toBeGreaterThan(0);
    expect(r.data.line_count).toBeGreaterThan(0);
  });

  it("probe_first_article_gen -> real probe G-code", async () => {
    const s = server();
    const r = await call(s, "probe_first_article_gen", {
      controller: "fanuc", features: [BORE_FEATURE], report_format: "AS9102",
    });
    expect(r.ok).toBe(true);
    expect(r.data.gcode.length).toBeGreaterThan(0);
    expect(r.data.line_count).toBeGreaterThan(0);
  });

  it("probe_in_process_gen -> routes to part inspection", async () => {
    const s = server();
    const r = await call(s, "probe_in_process_gen", { controller: "fanuc", features: [BORE_FEATURE] });
    expect(r.ok).toBe(true);
    expect(r.data.gcode.length).toBeGreaterThan(0);
  });

  it("probe_tool_measure_gen -> routes to tool measurement", async () => {
    const s = server();
    const r = await call(s, "probe_tool_measure_gen", { controller: "fanuc", tool_numbers: [1, 2] });
    expect(r.ok).toBe(true);
    expect(r.data.gcode.length).toBeGreaterThan(0);
  });

  it("probe_auto_comp_gen -> compensating inspection emits G10 L2 offset comp", async () => {
    const s = server();
    const r = await call(s, "probe_auto_comp_gen", { controller: "fanuc", features: [BORE_FEATURE] });
    expect(r.ok).toBe(true);
    // The defining invariant of auto-comp: a work-offset write (G10 L2) tagged
    // AUTO COMPENSATE. Proves the action reached generatePartInspection with
    // action_on_fail:"compensate", not merely "returned something".
    expect(r.data.gcode).toContain("G10 L2");
    expect(r.data.gcode.toUpperCase()).toContain("AUTO COMPENSATE");
  });
});

describe("camDispatcher CK-MS11 probe_*_gen -- legacy param aliases + edge cases", () => {
  it("adversarial: tool_measure with a single scalar `tool` is normalized to an array", async () => {
    const s = server();
    const r = await call(s, "probe_tool_measure_gen", { controller: "fanuc", tool: 7 });
    expect(r.ok).toBe(true);
    expect(r.data.gcode.length).toBeGreaterThan(0);
  });

  it("adversarial: wcs_setup with legacy `datums` alias (no `features`) still routes", async () => {
    const s = server();
    const r = await call(s, "probe_wcs_setup_gen", { controller: "fanuc", datums: [BORE_FEATURE] });
    expect(r.ok).toBe(true);
    expect(r.data.gcode.length).toBeGreaterThan(0);
  });

  it("adversarial: in_process with singular `feature` alias is wrapped into features[]", async () => {
    const s = server();
    const r = await call(s, "probe_in_process_gen", { controller: "fanuc", feature: BORE_FEATURE });
    expect(r.ok).toBe(true);
    expect(r.data.gcode.length).toBeGreaterThan(0);
  });

  it("failure mode: empty features -> graceful (no throw), still a valid envelope", async () => {
    const s = server();
    const r = await call(s, "probe_wcs_setup_gen", { controller: "fanuc", features: [] });
    // Must NOT throw a TypeError; the handler returns a structured result.
    expect(r.ok).toBe(true);
    expect(typeof r.data.gcode).toBe("string");
  });

  it("failure mode: tool_measure with no tool numbers -> graceful empty set", async () => {
    const s = server();
    const r = await call(s, "probe_tool_measure_gen", { controller: "fanuc" });
    expect(r.ok).toBe(true);
    expect(typeof r.data.gcode).toBe("string");
  });
});

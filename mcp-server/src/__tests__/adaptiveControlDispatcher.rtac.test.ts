/**
 * FEATURE-GAP-AUDIT-MS0/U-WIRE-BACKLOG-POST — prism_adaptive_control:rtac_*
 * dispatcher wiring tests for RealTimeAdaptiveControllerEngine.
 *
 * Round-trips the engine through the `prism_adaptive_control` MCP tool handler
 * via a fake MCP server that captures the registered handler closure, so the
 * full chain runs (normalizeParams -> validateActionParams -> pre-calc hooks ->
 * switch case -> engine -> slimResponse).
 *
 * NOTE: the dispatcher wires the *singleton* realTimeAdaptiveControllerEngine —
 * sensor/output history persists across calls within this file. Stateful tests
 * call rtac_reset first so assertions are deterministic regardless of order.
 *
 * The invalid-params path returns a RAW dispatcherError object
 * ({success:false,error,...}), NOT a {content:[]} envelope — parseResponse
 * handles both shapes.
 *
 * @milestone FEATURE-GAP-AUDIT-MS0 / U-WIRE-BACKLOG-POST (slot:india)
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

type RegisteredTool = {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
};

function makeFakeServer(): { server: { tool: (...args: unknown[]) => void }; tools: RegisteredTool[] } {
  const tools: RegisteredTool[] = [];
  const server = {
    tool: (...args: unknown[]) => {
      tools.push({ name: args[0] as string, handler: args[3] as RegisteredTool["handler"] });
    },
  };
  return { server, tools };
}

async function buildHandler(): Promise<RegisteredTool["handler"]> {
  const { server, tools } = makeFakeServer();
  const { registerAdaptiveControlDispatcher } = await import("../tools/dispatchers/adaptiveControlDispatcher.js");
  registerAdaptiveControlDispatcher(server as never);
  const tool = tools.find((t) => t.name === "prism_adaptive_control");
  if (!tool) throw new Error("registerAdaptiveControlDispatcher did not register 'prism_adaptive_control'");
  return tool.handler;
}

/** Handles BOTH the success envelope ({content:[{text}]}) and the raw dispatcherError object. */
function parseResponse(response: unknown): Record<string, unknown> {
  if (response && typeof response === "object" && Array.isArray((response as { content?: unknown }).content)) {
    const content = (response as { content: Array<{ text?: string }> }).content;
    return JSON.parse(content[0]?.text ?? "{}");
  }
  return (response ?? {}) as Record<string, unknown>;
}

/** True when the dispatcher rejected the params (raw dispatcherError shape). */
function isRejected(parsed: Record<string, unknown>): boolean {
  return parsed.success === false || typeof parsed.error === "string";
}

/** A complete SensorInputs payload — every field the engine could read. */
function fullSensorInputs(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    timestamp: 1000,
    spindleLoad: 55,
    feedOverride: 100,
    spindleSpeed: 8000,
    feedRate: 1200,
    xPosition: 10,
    yPosition: 20,
    zPosition: -5,
    vibration: 0.4,
    temperature: { spindle: 42, coolant: 22, ambient: 20 },
    power: { spindle: 4.5, total: 6.0 },
    coolantFlow: 30,
    coolantPressure: 6,
    ...overrides,
  };
}

describe("prism_adaptive_control — rtac_* wiring (RealTimeAdaptiveControllerEngine)", () => {
  // ── HAPPY PATH ────────────────────────────────────────────────────────────
  it("rtac_reset returns to learning mode", async () => {
    const handler = await buildHandler();
    const res = parseResponse(await handler({ action: "rtac_reset", params: {} }));
    expect(res.reset).toBe(true);
    expect(res.mode).toBe("learning");
  });

  it("rtac_update returns a ControlOutput with numeric overrides", async () => {
    const handler = await buildHandler();
    await handler({ action: "rtac_reset", params: {} });
    const res = parseResponse(await handler({ action: "rtac_update", params: fullSensorInputs() }));
    expect(typeof res.feedOverride).toBe("number");
    expect(typeof res.speedOverride).toBe("number");
    expect(typeof res.reason).toBe("string");
    // Nominal sensor inputs => no safety hold.
    expect(res.safetyHold).not.toBe(true);
  });

  it("rtac_state reflects the learning mode after reset", async () => {
    const handler = await buildHandler();
    await handler({ action: "rtac_reset", params: {} });
    const res = parseResponse(await handler({ action: "rtac_state", params: {} }));
    expect(res.mode).toBe("learning");
    expect(typeof res.targetChipLoad).toBe("number");
  });

  it("rtac_tune merges a partial ControlTuning and echoes the effective tuning", async () => {
    const handler = await buildHandler();
    const res = parseResponse(await handler({
      action: "rtac_tune",
      params: { tuning: { feedKp: 0.9, adaptationAggression: 0.55 } },
    }));
    const tuning = res.tuning as Record<string, unknown>;
    expect(tuning.feedKp).toBe(0.9);
    expect(tuning.adaptationAggression).toBe(0.55);
    // Untouched gains keep their defaults — proves a *merge*, not a replace.
    expect(typeof tuning.feedKi).toBe("number");
  });

  it("rtac_targets sets and echoes the target triple", async () => {
    const handler = await buildHandler();
    const res = parseResponse(await handler({
      action: "rtac_targets",
      params: { chipLoad: 0.25, mrr: 80, power: 7 },
    }));
    expect(res.targetChipLoad).toBe(0.25);
    expect(res.targetMRR).toBe(80);
    expect(res.targetPower).toBe(7);
  });

  it("rtac_metrics returns default metrics with a short output history", async () => {
    const handler = await buildHandler();
    await handler({ action: "rtac_reset", params: {} });
    const res = parseResponse(await handler({ action: "rtac_metrics", params: {} }));
    // <10 outputs => engine returns the documented defaults.
    expect(res.avgFeedOverride).toBe(100);
    expect(res.effectiveUtilization).toBe(100);
  });

  it("rtac_gcode wraps a base program with adaptive-control annotations", async () => {
    const handler = await buildHandler();
    const res = parseResponse(await handler({
      action: "rtac_gcode",
      params: { baseProgram: ["G0 X0 Y0", "G1 X10 F1200", "G1 X20"] },
    }));
    const gcode = res.gcode as string[];
    expect(Array.isArray(gcode)).toBe(true);
    // Header + 3 base lines + AFC annotation + footer => strictly more than input.
    expect(res.lineCount as number).toBeGreaterThan(3);
    expect(gcode.some((l) => l.includes("PRISM ADAPTIVE CONTROL ENABLED"))).toBe(true);
  });

  // ── STATE INTEGRITY ───────────────────────────────────────────────────────
  it("rtac_update accumulates: a second update advances without error", async () => {
    const handler = await buildHandler();
    await handler({ action: "rtac_reset", params: {} });
    await handler({ action: "rtac_update", params: fullSensorInputs({ timestamp: 1000 }) });
    const res = parseResponse(await handler({ action: "rtac_update", params: fullSensorInputs({ timestamp: 1100 }) }));
    expect(typeof res.feedOverride).toBe("number");
  });

  // ── FAILURE MODES ─────────────────────────────────────────────────────────
  it("rtac_update rejects a payload missing the required timestamp", async () => {
    const handler = await buildHandler();
    const bad = fullSensorInputs();
    delete bad.timestamp;
    const res = parseResponse(await handler({ action: "rtac_update", params: bad }));
    expect(isRejected(res)).toBe(true);
  });

  it("rtac_update rejects a payload missing the required temperature object", async () => {
    const handler = await buildHandler();
    const bad = fullSensorInputs();
    delete bad.temperature;
    const res = parseResponse(await handler({ action: "rtac_update", params: bad }));
    expect(isRejected(res)).toBe(true);
  });

  it("rtac_gcode rejects a non-array baseProgram", async () => {
    const handler = await buildHandler();
    const res = parseResponse(await handler({
      action: "rtac_gcode",
      params: { baseProgram: "G0 X0" },
    }));
    expect(isRejected(res)).toBe(true);
  });

  it("rtac_targets rejects a negative chipLoad", async () => {
    const handler = await buildHandler();
    const res = parseResponse(await handler({
      action: "rtac_targets",
      params: { chipLoad: -0.5 },
    }));
    expect(isRejected(res)).toBe(true);
  });

  // ── ADVERSARIAL INPUTS ────────────────────────────────────────────────────
  it("rtac_update rejects a NaN timestamp (would poison the PID dt)", async () => {
    const handler = await buildHandler();
    const res = parseResponse(await handler({
      action: "rtac_update",
      params: fullSensorInputs({ timestamp: Number.NaN }),
    }));
    expect(isRejected(res)).toBe(true);
  });

  it("rtac_update rejects an Infinity spindleLoad", async () => {
    const handler = await buildHandler();
    const res = parseResponse(await handler({
      action: "rtac_update",
      params: fullSensorInputs({ spindleLoad: Number.POSITIVE_INFINITY }),
    }));
    expect(isRejected(res)).toBe(true);
  });

  it("rtac_update rejects a non-finite temperature.spindle", async () => {
    const handler = await buildHandler();
    const res = parseResponse(await handler({
      action: "rtac_update",
      params: fullSensorInputs({ temperature: { spindle: Number.NaN, coolant: 22 } }),
    }));
    expect(isRejected(res)).toBe(true);
  });

  // ── BOUNDARY ──────────────────────────────────────────────────────────────
  it("rtac_update accepts a finite zero timestamp (boundary)", async () => {
    const handler = await buildHandler();
    await handler({ action: "rtac_reset", params: {} });
    const res = parseResponse(await handler({
      action: "rtac_update",
      params: fullSensorInputs({ timestamp: 0 }),
    }));
    expect(typeof res.feedOverride).toBe("number");
  });

  it("rtac_gcode accepts an empty base program", async () => {
    const handler = await buildHandler();
    const res = parseResponse(await handler({ action: "rtac_gcode", params: { baseProgram: [] } }));
    // Header + footer only — still a non-empty wrapped program.
    expect(res.lineCount as number).toBeGreaterThan(0);
  });

  // ── ANTI-REGRESSION ───────────────────────────────────────────────────────
  it("dispatcher exposes >=38 actions including all 7 rtac_* actions", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../tools/dispatchers/adaptiveControlDispatcher.ts"), "utf8");
    const actionsBlock = src.slice(src.indexOf("const ACTIONS"), src.indexOf("] as const"));
    const count = (actionsBlock.match(/"[a-z0-9_]+"/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(38);
    for (const a of ["rtac_update", "rtac_state", "rtac_tune", "rtac_targets", "rtac_metrics", "rtac_gcode", "rtac_reset"]) {
      expect(actionsBlock).toContain(`"${a}"`);
    }
  });
});

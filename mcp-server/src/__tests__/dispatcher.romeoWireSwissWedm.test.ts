/**
 * dispatcher.romeoWireSwissWedm.test.ts — round-trip integration coverage for
 * WIRING/U-ROMEO-WIRE-SWISS-EMIT (prism_turning) and
 * WIRING/U-ROMEO-WIRE-WEDM-STATE-FUSION (prism_edm).
 *
 * Drives 3 previously dispatcher-unwired engines through their REAL dispatchers
 * (each had 0 dispatcher refs before this wire; engines themselves were already
 * unit-tested — the gap was purely the dispatcher surface):
 *   - mill_turn_channel_emit    → SwissChannelFileEmitterEngine.emit   (turningDispatcher)
 *   - wedm_machine_state_ingest → WEDMMachineStateEngine.ingest        (edmDispatcher)
 *   - wedm_machine_state_get    → WEDMMachineStateEngine.getState      (edmDispatcher)
 *   - wedm_fuse_sensors         → WEDMKalmanFusionEngine.fuse          (edmDispatcher)
 *   - wedm_fuse_reset           → WEDMKalmanFusionEngine.reset         (edmDispatcher)
 *
 * Each block asserts (a) the dispatcher emits a result envelope, (b) a ROUTING
 * PROOF that the wired output equals a fresh engine-direct call on deterministic
 * input, and (c) defensive behavior on degenerate / NaN input (engines never throw).
 *
 * NOTE: enum↔case consistency (the "is the action registered" half of the wire) is
 * enforced by `tsc --noEmit` — a switch case on an action absent from the ACTIONS
 * z.enum union is a TS no-overlap error — so this runtime test focuses on routing.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { registerEdmDispatcher } from "../tools/dispatchers/edmDispatcher.js";
import { swissChannelFileEmitterEngine } from "../engines/SwissChannelFileEmitterEngine.js";
import {
  WEDMMachineStateEngine,
  wedmMachineStateEngine,
  type WEDMSensorReading,
} from "../engines/WEDMMachineStateEngine.js";
import {
  WEDMKalmanFusionEngine,
  wedmKalmanFusionEngine,
} from "../engines/WEDMKalmanFusionEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

function makeStubServer(): {
  tools: CapturedTool[];
  tool: (name: string, desc: string, schema: unknown, h: CapturedTool["handler"]) => void;
} {
  const tools: CapturedTool[] = [];
  return {
    tools,
    tool(name, _desc, _schema, handler) { tools.push({ name, handler }); },
  };
}

async function invokeHandler(
  handler: CapturedTool["handler"],
  action: string,
  params: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const res = (await handler({ action, params })) as Record<string, unknown>;
  if (Array.isArray((res as { content?: unknown[] }).content)) {
    const text = ((res as { content: Array<{ text?: string }> }).content[0]?.text) ?? "";
    return JSON.parse(text) as Record<string, unknown>;
  }
  return res;
}

function getHandler(register: (s: any) => void, toolName: string): CapturedTool["handler"] {
  const server = makeStubServer();
  register(server);
  const tool = server.tools.find((t) => t.name === toolName);
  if (!tool) throw new Error(`dispatcher did not register tool "${toolName}"`);
  return tool.handler;
}

// ── prism_turning :: mill_turn_channel_emit (SwissChannelFileEmitterEngine) ───

const SWISS_INPUT = {
  dialect: "citizen" as const,
  program_number: 1234,
  program_comment: "ROMEO WIRE TEST",
  channels: [
    { channel_id: 1, label: "main", body: ["G0 X10.0", "G1 Z-5.0 F0.1", "(OP rough_od)"], tools: [{ number: 1, label: "OD turn" }] },
    { channel_id: 2, label: "sub", body: ["G0 X8.0", "G1 Z-3.0 F0.08", "(OP face_sub)"] },
  ],
  sync_points: [{ after_op: "rough_od", wait_channels: [1, 2], type: "generic" as const }],
  cycle_time_est_min: 2.5,
};

describe("WIRING/U-ROMEO-WIRE-SWISS-EMIT — mill_turn_channel_emit via prism_turning", () => {
  let handler: CapturedTool["handler"];
  beforeEach(() => { handler = getHandler(registerTurningDispatcher, "prism_turning"); });

  it("emits citizen per-channel files through the dispatcher", async () => {
    const out = await invokeHandler(handler, "mill_turn_channel_emit", SWISS_INPUT);
    // citizen is a SEPARATE-files dialect → one ChannelFile per channel.
    expect(Array.isArray(out.channel_files)).toBe(true);
    expect((out.channel_files as unknown[]).length).toBe(2);
    expect(out.channel_files_separate).toBe(true);
    expect(out.dialect).toBe("citizen");
  });

  it("ROUTING PROOF — dispatcher output equals a direct engine.emit() call", async () => {
    const out = await invokeHandler(handler, "mill_turn_channel_emit", SWISS_INPUT);
    const direct = swissChannelFileEmitterEngine.emit(SWISS_INPUT);
    const dispFiles = out.channel_files as Array<{ channel_id: number; text: string; filename: string }>;
    // The emitter is a deterministic pure assembler — text must match byte-for-byte.
    expect(dispFiles[0].text).toBe(direct.channel_files[0].text);
    expect(dispFiles[0].filename).toBe(direct.channel_files[0].filename);
    expect(out.sync_points_emitted).toBe(direct.sync_points_emitted);
  });

  it("is defensive on empty channels (no throw, returns a result object)", async () => {
    const out = await invokeHandler(handler, "mill_turn_channel_emit", {
      dialect: "star", program_number: 1, channels: [], sync_points: [],
    });
    expect(out).toBeTypeOf("object");
    expect(out.dialect).toBe("star");
  });
});

// ── prism_edm :: WEDM machine-state + Kalman fusion ───────────────────────────

const CUTTING_FRAME: WEDMSensorReading = { t_ms: 1000, discharge_current_A: 12, spark_frequency_Hz: 4500 };

describe("WIRING/U-ROMEO-WIRE-WEDM-STATE-FUSION — wedm machine-state + fusion via prism_edm", () => {
  let handler: CapturedTool["handler"];
  beforeEach(() => {
    handler = getHandler(registerEdmDispatcher, "prism_edm");
    // Clear the in-process singletons so dispatcher state is deterministic per test.
    wedmMachineStateEngine.reset();
    wedmKalmanFusionEngine.reset();
  });

  it("wedm_machine_state_ingest classifies an active-discharge frame as cutting", async () => {
    const out = await invokeHandler(handler, "wedm_machine_state_ingest", CUTTING_FRAME as unknown as Record<string, unknown>);
    expect(out.success).toBe(true);
    const data = out.data as { mode: string; modeConfidence: number };
    expect(data.mode).toBe("cutting");
    expect(data.modeConfidence).toBeGreaterThan(0.5);
  });

  it("ROUTING PROOF (state) — dispatcher mode/health equals a fresh engine instance", async () => {
    const out = await invokeHandler(handler, "wedm_machine_state_ingest", CUTTING_FRAME as unknown as Record<string, unknown>);
    const fresh = new WEDMMachineStateEngine();
    const direct = fresh.ingest(CUTTING_FRAME);
    const data = out.data as { mode: string; healthScore: number };
    expect(data.mode).toBe(direct.mode);
    expect(data.healthScore).toBeCloseTo(direct.healthScore, 6);
  });

  it("wedm_machine_state_get returns the last ingested state (singleton persists in-process)", async () => {
    await invokeHandler(handler, "wedm_machine_state_ingest", CUTTING_FRAME as unknown as Record<string, unknown>);
    const out = await invokeHandler(handler, "wedm_machine_state_get", {});
    const data = out.data as { mode: string } | null;
    expect(data).not.toBeNull();
    expect(data!.mode).toBe("cutting");
  });

  it("wedm_fuse_sensors initialises a channel on first measurement (gain=1, value=z)", async () => {
    await invokeHandler(handler, "wedm_fuse_reset", {});
    const out = await invokeHandler(handler, "wedm_fuse_sensors", { t_ms: 0, gap_voltage_V: 80 });
    expect(out.success).toBe(true);
    const data = out.data as { gap_voltage_V: { value: number; gain: number; innovation: number } | null };
    expect(data.gap_voltage_V).not.toBeNull();
    expect(data.gap_voltage_V!.value).toBe(80);
    expect(data.gap_voltage_V!.gain).toBe(1);
  });

  it("ROUTING PROOF (fusion) — dispatcher fuse equals a fresh engine instance", async () => {
    await invokeHandler(handler, "wedm_fuse_reset", {});
    const out = await invokeHandler(handler, "wedm_fuse_sensors", { t_ms: 0, gap_voltage_V: 80 });
    const fresh = new WEDMKalmanFusionEngine();
    const direct = fresh.fuse({ t_ms: 0, gap_voltage_V: 80 });
    const data = out.data as { gap_voltage_V: { value: number; variance: number } };
    expect(data.gap_voltage_V.value).toBe(direct.gap_voltage_V!.value);
    expect(data.gap_voltage_V.variance).toBeCloseTo(direct.gap_voltage_V!.variance, 9);
  });

  it("wedm_fuse_reset returns a reset acknowledgement", async () => {
    await invokeHandler(handler, "wedm_fuse_sensors", { t_ms: 0, gap_voltage_V: 80 });
    const out = await invokeHandler(handler, "wedm_fuse_reset", {});
    expect(out.success).toBe(true);
    expect((out.data as { reset: boolean }).reset).toBe(true);
  });

  it("is defensive on non-finite sensor input (NaN/Infinity ignored, no throw)", async () => {
    const out = await invokeHandler(handler, "wedm_fuse_sensors", { t_ms: 0, gap_voltage_V: NaN, wire_tension_N: Infinity });
    expect(out.success).toBe(true);
    const data = out.data as { gap_voltage_V: unknown; wire_tension_N: unknown };
    expect(data.gap_voltage_V).toBeNull();
    expect(data.wire_tension_N).toBeNull();
  });
});

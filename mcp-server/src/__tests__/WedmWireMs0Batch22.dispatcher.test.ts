/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch22:
 *   U-WWB61: wedm_scheduling_list_reservations → WEDMSchedulingEngine.listReservations
 *   U-WWB62: wedm_self_awareness_state          → WEDMSelfAwarenessEngine.getSubstrateState + others
 *   U-WWB63: wedm_handoff_pending               → WEDMHumanHandoffEngine.listPending
 *
 * Three previously-unwired WEDM coordination engines:
 *   - Scheduling: lists machine reservations (filterable by machineId)
 *   - Self-awareness: combined substrate/autonomy/learning/tribal state snapshot
 *   - Human handoff: returns HandoffPacket[] pending operator acknowledgement
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch22 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_scheduling_list_reservations"');
    expect(src).toContain('"wedm_self_awareness_state"');
    expect(src).toContain('"wedm_handoff_pending"');
  });

  it("the WEDM-WIRE-MS0/Batch22 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch22: scheduling + self-awareness + human handoff");
  });
});

describe("U-WWB61 — wedm_scheduling_list_reservations wiring", () => {
  it("dispatcher case lazy-imports WEDMSchedulingEngine and calls listReservations", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_scheduling_list_reservations"');
    expect(src).toContain("WEDMSchedulingEngine.js");
    expect(src).toContain("wedmSchedulingEngine.listReservations");
  });

  it("case extracts optional input.machineId AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_scheduling_list_reservations"[\s\S]{0,1000}input\.machineId/);
    expect(src).toMatch(/case "wedm_scheduling_list_reservations"[\s\S]{0,1000}reservations:\s*wedmSchedulingEngine\.listReservations/);
    expect(src).toMatch(/case "wedm_scheduling_list_reservations"[\s\S]{0,1000}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_scheduling_list_reservations with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_scheduling_list_reservations:");
    expect(src).toMatch(/wedm_scheduling_list_reservations:\s*z\.object\(\{[\s\S]{0,500}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMSchedulingEngine exports the singleton + listReservations method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMSchedulingEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmSchedulingEngine\s*=\s*new WEDMSchedulingEngine\(\)/);
    expect(src).toMatch(/listReservations\(\s*machineId\?:\s*string\s*\):\s*WEDMReservation\[\]/);
  });
});

describe("U-WWB62 — wedm_self_awareness_state wiring", () => {
  it("dispatcher case lazy-imports WEDMSelfAwarenessEngine and returns combined state", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_self_awareness_state"');
    expect(src).toContain("WEDMSelfAwarenessEngine.js");
    expect(src).toContain("wedmSelfAwarenessEngine.getSubstrateState");
    expect(src).toMatch(/case "wedm_self_awareness_state"[\s\S]{0,1500}wedmSelfAwarenessEngine\.getAutonomyState/);
    expect(src).toMatch(/case "wedm_self_awareness_state"[\s\S]{0,1500}wedmSelfAwarenessEngine\.getLearningState/);
    expect(src).toMatch(/case "wedm_self_awareness_state"[\s\S]{0,1500}wedmSelfAwarenessEngine\.getTribalState/);
  });

  it("case wraps engine calls in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_self_awareness_state"[\s\S]{0,1500}try\s*\{[\s\S]{0,1000}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_self_awareness_state"[\s\S]{0,1500}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_self_awareness_state as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_self_awareness_state:");
    expect(src).toMatch(/wedm_self_awareness_state:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: WEDMSelfAwarenessEngine exports the singleton + getSubstrateState method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMSelfAwarenessEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmSelfAwarenessEngine\s*=\s*new WEDMSelfAwarenessEngine\(\)/);
    expect(src).toMatch(/getSubstrateState\(\):\s*SubstrateState/);
  });
});

describe("U-WWB63 — wedm_handoff_pending wiring", () => {
  it("dispatcher case lazy-imports WEDMHumanHandoffEngine and calls listPending", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_handoff_pending"');
    expect(src).toContain("WEDMHumanHandoffEngine.js");
    expect(src).toContain("wedmHumanHandoffEngine.listPending");
  });

  it("case wraps engine call in try/catch with pending wrapper", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_handoff_pending"[\s\S]{0,800}pending:\s*wedmHumanHandoffEngine\.listPending/);
    expect(src).toMatch(/case "wedm_handoff_pending"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_handoff_pending as no-input passthrough", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_handoff_pending:");
    expect(src).toMatch(/wedm_handoff_pending:\s*z\.object\(\{\s*\}\)\.passthrough\(\)/);
  });

  it("engine source: WEDMHumanHandoffEngine exports the singleton + listPending method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMHumanHandoffEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmHumanHandoffEngine\s*=\s*new WEDMHumanHandoffEngine\(\)/);
    expect(src).toMatch(/listPending\(\):\s*HandoffPacket\[\]/);
  });
});

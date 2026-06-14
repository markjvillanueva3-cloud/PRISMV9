/**
 * devDispatcher × SimulationStallDetectorEngine wire
 * ([WIRING]/U-WIRE-SIM-STALL, slot:romeo).
 *
 * SimulationStallDetectorEngine (lathe-sim pipeline stall watchdog) was BUILT but UNWIRED —
 * verified GENUINE_ORPHAN (type-(a) singleton) via scripts/classify-engine-reachability.mjs.
 * This wires 5 actions into prism_dev: sim_stall_start_tracking / _mark_progress / _scan / _stats /
 * _complete. now_ms is injected so the watchdog is deterministic.
 *
 * Round-trip THROUGH the registered dispatcher (not a direct engine import). The singleton holds
 * job state in-process, so the start→scan→mark→complete lifecycle is exercised across calls.
 * ANTI-STUB: stall detection is computed from (now_ms − last_progress) vs the stage budget. A no-op
 * returning {count:0} fails the over-budget scan; a stub ignoring mark_progress fails the reset scan.
 * Reference value: collision_check budget = 30_000 ms.
 *
 * @milestone BLACKWELL-DB-GEN-MS0
 * @unit U-WIRE-SIM-STALL
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerDevDispatcher } from "../tools/dispatchers/devDispatcher.js";
import { simulationStallDetectorEngine } from "../engines/SimulationStallDetectorEngine.js";

interface CapturedTool {
  name: string;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}
class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, _d: unknown, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, handler });
  }
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const tool = server.tools[0]!;
  const raw = (await tool.handler({ action, params })) as { content?: { type: string; text: string }[] };
  if (!raw.content) return { ok: false, data: raw as unknown as Record<string, unknown> };
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(raw.content[0]!.text); } catch { return { ok: false, data: { rawText: raw.content[0]!.text } }; }
  return { ok: !("error" in parsed), data: parsed };
}

const T0 = 1_000;
const COLLISION_BUDGET = 30_000;

let server: MockMCPServer;
beforeEach(() => {
  // isolate the in-process singleton: stop tracking everything from prior tests
  for (const id of simulationStallDetectorEngine.trackedIds()) simulationStallDetectorEngine.completeJob(id);
  server = new MockMCPServer();
  registerDevDispatcher(server as unknown as { tool: MockMCPServer["tool"] });
});

describe("devDispatcher × SimulationStallDetector wire (U-WIRE-SIM-STALL)", () => {
  it("start_tracking → stats reflects one tracked job in the right stage", async () => {
    const s = await call(server, "sim_stall_start_tracking", { job_id: "sim1", stage: "collision_check", now_ms: T0 });
    expect(s.ok).toBe(true);
    expect(s.data.tracked).toBe(true);
    const stats = await call(server, "sim_stall_stats", { now_ms: T0 });
    expect(stats.ok).toBe(true);
    expect(stats.data.total_tracked).toBe(1);
    expect((stats.data.by_stage as Record<string, number>).collision_check).toBe(1);
    expect(stats.data.currently_stalled ?? 0).toBe(0); // within budget at T0
  });

  it("scan returns NO stall within budget, then a typed stall event past budget (anti-stub reference value)", async () => {
    await call(server, "sim_stall_start_tracking", { job_id: "sim1", stage: "collision_check", now_ms: T0 });
    // 5 s elapsed — well under the 30 s collision_check budget
    const under = await call(server, "sim_stall_scan", { now_ms: T0 + 5_000 });
    expect(under.data.count).toBe(0);
    expect((under.data.events ?? []) as unknown[]).toHaveLength(0);
    // 40 s elapsed — over budget → exactly one stall event
    const over = await call(server, "sim_stall_scan", { now_ms: T0 + 40_000 });
    expect(over.data.count).toBe(1);
    const ev = (over.data.events as Array<Record<string, unknown>>)[0]!;
    expect(ev.job_id).toBe("sim1");
    expect(ev.stage).toBe("collision_check");
    expect(ev.budget_ms).toBe(COLLISION_BUDGET);
    expect(ev.stalled_for_ms).toBe(40_000);
    expect(typeof ev.priority).toBe("string");
    expect(typeof ev.recommended_action).toBe("string");
  });

  it("mark_progress resets the stall timer (a stub ignoring it would still report stalled)", async () => {
    await call(server, "sim_stall_start_tracking", { job_id: "sim1", stage: "collision_check", now_ms: T0 });
    // would be stalled at T0+40s, but a progress heartbeat at T0+40s resets last_progress
    await call(server, "sim_stall_mark_progress", { job_id: "sim1", now_ms: T0 + 40_000 });
    const after = await call(server, "sim_stall_scan", { now_ms: T0 + 40_000 });
    expect(after.data.count).toBe(0);
    // scanOne path: 10 s after the heartbeat is still under the 30 s budget
    const one = await call(server, "sim_stall_scan", { now_ms: T0 + 50_000, job_id: "sim1" });
    expect(one.data.stalled).toBe(false);
    expect(one.data.event == null).toBe(true); // slimmer strips the null scalar
  });

  it("complete stops tracking the job", async () => {
    await call(server, "sim_stall_start_tracking", { job_id: "sim1", stage: "kinematics", now_ms: T0 });
    const done = await call(server, "sim_stall_complete", { job_id: "sim1" });
    expect(done.data.completed).toBe(true);
    const stats = await call(server, "sim_stall_stats", { now_ms: T0 });
    expect(stats.data.total_tracked).toBe(0);
  });

  it("tracking the same job twice fails as a structured error, not a crash (adversarial)", async () => {
    await call(server, "sim_stall_start_tracking", { job_id: "dup", stage: "finalize", now_ms: T0 });
    const again = await call(server, "sim_stall_start_tracking", { job_id: "dup", stage: "finalize", now_ms: T0 });
    expect(again.ok).toBe(false);
    expect(JSON.stringify(again.data).toLowerCase()).toMatch(/already tracked|sim_stall_start_failed/);
  });

  it("an unknown stage is rejected by the schema (adversarial)", async () => {
    const r = await call(server, "sim_stall_start_tracking", { job_id: "bad", stage: "not_a_stage", now_ms: T0 });
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.data).toLowerCase()).toMatch(/stage|invalid|expected|enum/);
  });

  it("sim_stall actions are accepted by the registered dispatcher (z.enum + cases)", async () => {
    const r = await call(server, "sim_stall_stats", { now_ms: T0 });
    expect(JSON.stringify(r.data).toLowerCase()).not.toMatch(/unknown action|no such action/);
    expect(r.data.total_tracked).toBe(0);
  });
});

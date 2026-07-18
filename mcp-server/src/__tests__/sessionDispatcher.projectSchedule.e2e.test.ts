import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Dispatcher round-trip E2E for the C1 full governed schedule projection
 * (U-WAVE-PROJECT-SCHEDULE, slot:bravo). The R15-VALIDATE proof that
 * prism_session:project_governed_schedule actually runs the engine's
 * projectGovernedSchedule THROUGH the dispatcher (caller-provides-souls + default-ON
 * delegation, same contract as governed_wave_execute) and returns the drains/stalled
 * feasibility verdict -- the upfront "will this DAG drain as governed?" check a runtime
 * executor calls before spawning agents. The detailed wave/stall logic is unit-tested in
 * ZuluWaveSchedulerEngine.projectSchedule.test.ts; THESE prove the WIRING (the C3 seam
 * lesson: "built but not wired together" is only refuted by driving the dispatcher case).
 *
 * Hermetic: PRISM_ZULU_DELEGATION_PATH points the default-ON delegation gate at an EMPTY
 * temp store (no contract -> no-op gate), set BEFORE the dispatcher's lazy import builds the
 * delegation singleton -- identical to the delegationGate / waveLoopStep e2e pattern.
 */
const TMP_STORE = path.join(os.tmpdir(), `zulu-project-schedule-e2e-${process.pid}.json`);
process.env.PRISM_ZULU_DELEGATION_PATH = TMP_STORE;

import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

type McpHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}>;

function captureHandler(): McpHandler {
  let handler: McpHandler | null = null;
  const server = {
    tool(_name: string, _description: string, _schema: Record<string, unknown>, cb: McpHandler) { handler = cb; },
  };
  registerSessionDispatcher(server as unknown as Parameters<typeof registerSessionDispatcher>[0]);
  if (!handler) throw new Error("registerSessionDispatcher did not register a handler");
  return handler;
}

async function invoke(handler: McpHandler, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await handler({ action, params });
  const raw = (result as { content: Array<{ text: string }> }).content[0]?.text ?? "";
  return JSON.parse(raw);
}

// fixtures -- identical shapes to ZuluWaveSchedulerEngine.test.ts
const st = (subtask_id: string, depends_on: string[] = []) => ({
  subtask_id, description: `work for ${subtask_id}`, domain: "mill", depends_on, size_hint: "short" as const,
});
const cand = (slot: string, primary_domain: string | null, score = 5) => ({ slot, hermes_role: "specialist", primary_domain, score });
const diamond = () => [st("a"), st("b", ["a"]), st("c", ["a"]), st("d", ["b", "c"])];
const request = (): Record<string, unknown> => ({
  parent_task_id: "exec", subtasks: diamond(),
  candidates: [cand("alpha", "mill"), cand("bravo", "mill"), cand("charlie", "mill")], max_parallel: 5,
});
const allSouls = (): Record<string, unknown> => ({
  alpha: { hermes_role: "specialist", domain_filter: "work", refuse_list: [] },
  bravo: { hermes_role: "specialist", domain_filter: "work", refuse_list: [] },
  charlie: { hermes_role: "specialist", domain_filter: "work", refuse_list: [] },
});
// ok() runs slimResponse(), which DROPS empty arrays (stalled/waves come back absent when empty)
// but KEEPS booleans (false) and numbers (0).
type Sched = { drains?: boolean; dispatched_count?: number; total_subtasks?: number; wave_count?: number; stalled?: string[]; waves?: Array<{ index: number; wave_assignments?: Array<{ subtask_id: string }> }> };

describe("prism_session:project_governed_schedule -- C1 full-projection round-trip", () => {
  let handler: McpHandler;
  beforeEach(() => { try { fs.rmSync(TMP_STORE, { force: true }); } catch { /* ignore */ } handler = captureHandler(); });
  afterEach(() => { try { fs.rmSync(TMP_STORE, { force: true }); } catch { /* ignore */ } });

  it("a fully-authorized diamond DRAINS through the dispatcher: 4 dispatched over 3 waves, none stalled", async () => {
    const r = await invoke(handler, "project_governed_schedule", { request: request(), souls: allSouls() });
    expect(r.success).toBe(true);
    const s = r.schedule as Sched;
    expect(s.drains).toBe(true);
    expect(s.dispatched_count).toBe(4);
    expect(s.total_subtasks).toBe(4);
    expect(s.wave_count).toBe(3);
    expect((s.stalled ?? []).length).toBe(0); // empty array slimmed -> absent
  });

  it("FAIL-CLOSED through the dispatcher: an empty souls map stalls the whole DAG (drains:false, 0 dispatched, 4 stalled)", async () => {
    const r = await invoke(handler, "project_governed_schedule", { request: request(), souls: {} });
    expect(r.success).toBe(true);
    const s = r.schedule as Sched;
    expect(s.drains).toBe(false);
    expect(s.dispatched_count).toBe(0);
    expect((s.stalled ?? []).slice().sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("project_schedule_render round-trips a projected schedule to a one-line DRAINS render", async () => {
    const r = await invoke(handler, "project_governed_schedule", { request: request(), souls: allSouls() });
    const rendered = await invoke(handler, "project_schedule_render", { schedule: r.schedule });
    expect(rendered.success).toBe(true);
    expect(String(rendered.markdown)).toMatch(/SCHEDULE DRAINS/);
    expect(String(rendered.markdown)).toMatch(/dispatched=4\/4/);
  });
});

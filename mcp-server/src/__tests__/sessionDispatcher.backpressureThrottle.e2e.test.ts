import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Dispatcher round-trip E2E for the C5 back-pressure throttle
 * (HERMES-CAPABILITY-C5/U-C5-BACKPRESSURE-LIVE-THROTTLE, slot:bravo).
 *
 * R15-VALIDATE proof that governed_wave_execute actually CONSULTS the durable back-pressure
 * store and load-shapes the live wave. The pure throttleWave is unit-tested in
 * ZuluWaveSchedulerEngine.test.ts; THESE tests prove the WIRING -- samples RECORDED through
 * the real backpressure_record_sample action, confirmed "blocked" via backpressure_assess,
 * then a governed_wave_execute with enforce_backpressure HOLDS that slot's assignment; an
 * advisory (surface_backpressure) call SURFACES the signal but dispatches anyway; the default
 * (no flag) is a zero-consult pass-through. NEVER vetoes (held != vetoed).
 *
 * Hermetic: PRISM_ZULU_BACKPRESSURE_PATH -> a unique tmp store at module top before the
 * dispatcher's lazy import binds the singleton. The throttle's zb.assess() uses REAL Date.now()
 * (no injected clock at the dispatcher boundary), so samples are recorded WITHOUT a `now`
 * override (real-now timestamps) to land inside the 5-min assessment window; we assert the
 * "blocked" precondition first so a threshold drift fails LOUD rather than silently testing
 * nothing.
 */
const TMP_STORE = path.join(os.tmpdir(), `zulu-bp-throttle-e2e-${process.pid}.json`);
process.env.PRISM_ZULU_BACKPRESSURE_PATH = TMP_STORE;

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

// fixtures (identical shapes to ZuluWaveSchedulerEngine.test.ts)
const st = (subtask_id: string, depends_on: string[] = []) => ({
  subtask_id, description: `work for ${subtask_id}`, domain: "mill", depends_on, size_hint: "short" as const,
});
const diamond = () => [st("a"), st("b", ["a"]), st("c", ["a"]), st("d", ["b", "c"])];
const cand = (slot: string, primary_domain: string | null, score = 5) => ({ slot, hermes_role: "specialist", primary_domain, score });
const request = (): Record<string, unknown> => ({
  parent_task_id: "exec", subtasks: diamond(),
  candidates: [cand("alpha", "mill"), cand("bravo", "mill"), cand("charlie", "mill")], max_parallel: 5,
});
const allSouls = (): Record<string, unknown> => ({
  alpha: { hermes_role: "specialist", domain_filter: "work", refuse_list: [] },
  bravo: { hermes_role: "specialist", domain_filter: "work", refuse_list: [] },
  charlie: { hermes_role: "specialist", domain_filter: "work", refuse_list: [] },
});

type Exec = {
  wave_assignments?: Array<{ subtask_id: string; slot: string }>;
  throttled?: Array<{ subtask_id: string; slot: string; pressure_level: string }>;
  back_pressure?: Array<{ slot: string; pressure_level: string }>;
  vetoed?: Array<{ subtask_id: string }>;
};
const ids = (e: Exec) => (e.wave_assignments ?? []).map((a) => a.subtask_id);
const throttled = (e: Exec) => e.throttled ?? [];
const backPressure = (e: Exec) => e.back_pressure ?? [];

// Drive slot "alpha" to a "blocked" signal at REAL now: 4 sustained error_rate=1.0 samples
// (>= blockedErrorRate 0.5, exceeds minConsecutiveHigh 3). queue_depth 20 (>= queueHigh*2=16)
// independently qualifies, so the precondition is robust to either threshold path.
async function driveAlphaBlocked(handler: McpHandler): Promise<void> {
  for (let i = 0; i < 4; i++) {
    const r = await invoke(handler, "backpressure_record_sample", { slot: "alpha", queue_depth: 20, error_rate: 1.0 });
    expect((r.result as { ok: boolean }).ok).toBe(true);
  }
}

describe("prism_session:governed_wave_execute -- C5 back-pressure throttle round-trip", () => {
  let handler: McpHandler;
  beforeEach(() => {
    try { fs.rmSync(TMP_STORE, { force: true }); } catch { /* ignore */ }
    handler = captureHandler();
  });
  afterEach(() => { try { fs.rmSync(TMP_STORE, { force: true }); } catch { /* ignore */ } });

  it("EMPTY store + no flags: zero-consult pass-through -> wave-1 [a] dispatched, no throttle/annotation", async () => {
    const r = await invoke(handler, "governed_wave_execute", { request: request(), souls: allSouls() });
    expect(r.success).toBe(true);
    expect(ids(r.execution as Exec)).toEqual(["a"]);
    expect(throttled(r.execution as Exec)).toEqual([]);
    expect(backPressure(r.execution as Exec)).toEqual([]); // default does NOT read the store
  });

  it("ENFORCE: a blocked alpha (recorded through the real action) HOLDS alpha's assignment", async () => {
    await driveAlphaBlocked(handler);
    // precondition (fail loud if a threshold drifts): assess sees alpha blocked at real now.
    const a = await invoke(handler, "backpressure_assess", { slot: "alpha" });
    expect((a.signal as { pressure_level: string }).pressure_level).toBe("blocked");

    const r = await invoke(handler, "governed_wave_execute", { request: request(), souls: allSouls(), enforce_backpressure: true });
    expect(ids(r.execution as Exec)).toEqual([]); // a held -> wave_assignments empty (slimmed)
    const held = throttled(r.execution as Exec);
    expect(held.map((x) => x.subtask_id)).toEqual(["a"]);
    expect(held[0].pressure_level).toBe("blocked");
    // NEVER vetoes: the held assignment is not in vetoed.
    expect((r.execution as Exec).vetoed ?? []).toEqual([]);
  });

  it("ADVISORY (surface_backpressure, no enforce): SURFACES the blocked signal but still dispatches [a]", async () => {
    await driveAlphaBlocked(handler);
    const r = await invoke(handler, "governed_wave_execute", { request: request(), souls: allSouls(), surface_backpressure: true });
    expect(ids(r.execution as Exec)).toEqual(["a"]); // advisory holds nothing
    expect(throttled(r.execution as Exec)).toEqual([]);
    const bp = backPressure(r.execution as Exec);
    expect(bp.map((s) => s.slot)).toEqual(["alpha"]);
    expect(bp[0].pressure_level).toBe("blocked");
  });

  it("DEFAULT (blocked store, but no flag): does NOT consult -> [a] dispatched, no annotation (back-compat)", async () => {
    await driveAlphaBlocked(handler);
    const r = await invoke(handler, "governed_wave_execute", { request: request(), souls: allSouls() });
    expect(ids(r.execution as Exec)).toEqual(["a"]); // zero-consult: a real blocked store is ignored without a flag
    expect(throttled(r.execution as Exec)).toEqual([]);
    expect(backPressure(r.execution as Exec)).toEqual([]);
  });

  it("ENFORCE with an UNPRESSURED store: nothing held -> [a] dispatched (only saturated slots hold)", async () => {
    // record nominal samples (low error, low queue) -> assess "low" -> enforce holds nothing.
    for (let i = 0; i < 4; i++) await invoke(handler, "backpressure_record_sample", { slot: "alpha", queue_depth: 1, error_rate: 0.0 });
    const r = await invoke(handler, "governed_wave_execute", { request: request(), souls: allSouls(), enforce_backpressure: true });
    expect(ids(r.execution as Exec)).toEqual(["a"]);
    expect(throttled(r.execution as Exec)).toEqual([]);
  });
});

describe("prism_session:wave_loop_step -- C5 throttle holds + re-offers across the loop", () => {
  let handler: McpHandler;
  const UNIT = "HERMES-C5::U-THROTTLE-E2E";
  const CONT_STORE = path.join(os.tmpdir(), `zulu-bp-throttle-cont-${process.pid}.json`);
  beforeEach(() => {
    process.env.PRISM_ZULU_CONTINUITY_PATH = CONT_STORE;
    try { fs.rmSync(TMP_STORE, { force: true }); } catch { /* ignore */ }
    try { fs.rmSync(CONT_STORE, { force: true }); } catch { /* ignore */ }
    handler = captureHandler();
  });
  afterEach(() => {
    try { fs.rmSync(TMP_STORE, { force: true }); } catch { /* ignore */ }
    try { fs.rmSync(CONT_STORE, { force: true }); } catch { /* ignore */ }
  });

  it("ENFORCE: a blocked slot's wave-1 [a] is HELD, checkpointed as NOT-dispatched, and re-offered next step", async () => {
    for (let i = 0; i < 4; i++) await invoke(handler, "backpressure_record_sample", { slot: "alpha", queue_depth: 20, error_rate: 1.0 });
    const a = await invoke(handler, "backpressure_assess", { slot: "alpha" });
    expect((a.signal as { pressure_level: string }).pressure_level).toBe("blocked");

    const r1 = await invoke(handler, "wave_loop_step", { unit_id: UNIT, request: request(), newly_completed: [], souls: allSouls(), enforce_backpressure: true });
    expect(r1.success).toBe(true);
    expect(ids(r1.execution as Exec)).toEqual([]); // a held this wave
    expect(throttled(r1.execution as Exec).map((x) => x.subtask_id)).toEqual(["a"]);
    // durable checkpoint: last_dispatch is empty (a was NOT dispatched), throttled records the held id.
    const store = JSON.parse(fs.readFileSync(CONT_STORE, "utf8")) as { records: Record<string, { state: Record<string, unknown> }> };
    expect(store.records[UNIT].state.last_dispatch).toEqual([]);
    expect(store.records[UNIT].state.throttled).toEqual(["a"]);
    expect(store.records[UNIT].state.completed_ids).toEqual([]); // a is NOT completed -> re-offered

    // next step, still no completion: a is recomputed as ready and (still blocked) held again.
    const r2 = await invoke(handler, "wave_loop_step", { unit_id: UNIT, request: request(), newly_completed: [], souls: allSouls(), enforce_backpressure: true });
    expect(throttled(r2.execution as Exec).map((x) => x.subtask_id)).toEqual(["a"]); // re-offered, held again
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Dispatcher round-trip E2E for prism_session:wave_loop_step
 * (HERMES-CAPABILITY-C2/U-C2-PRODUCER-WAVE-LOOP, slot:bravo).
 *
 * This is the R15-VALIDATE proof that the C1+C2 wave loop closes the
 * ZuluTaskContinuityEngine ORPHAN: until this action shipped, C2's durable
 * recovery store had NO production producer -- checkpoint() was dispatcher-wired
 * but never called by a real loop, so resume() always returned empty. wave_loop_step
 * is that first producer. These tests invoke through the REAL switch/case + schema
 * (not the engine singleton) and then READ THE TEMP STORE FILE to prove a checkpoint
 * actually landed -- "existence != working" is only refuted by a real round-trip.
 *
 * Hermetic: PRISM_ZULU_CONTINUITY_PATH is set at module top BEFORE the dispatcher's
 * lazy `await import` constructs the zuluTaskContinuityEngine singleton (its ctor reads
 * this env var). The static import below does NOT eagerly construct the continuity
 * engine, so module-top assignment wins. resume() re-reads the file every call, so even
 * within one process the round-trip genuinely goes through durable storage (a faithful
 * /compact-survival simulation).
 */
const TMP_STORE = path.join(os.tmpdir(), `zulu-wls-e2e-${process.pid}.json`);
process.env.PRISM_ZULU_CONTINUITY_PATH = TMP_STORE;

import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

type McpHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}>;

function captureHandler(): { handler: McpHandler; schemaActions: readonly string[] } {
  let handler: McpHandler | null = null;
  let enumValues: readonly string[] = [];
  const server = {
    tool(_name: string, _description: string, schema: Record<string, unknown>, cb: McpHandler) {
      handler = cb;
      const action = (schema as { action?: { _def?: { values?: readonly string[]; entries?: Record<string, string> } } }).action;
      if (action?._def?.values) enumValues = action._def.values;
      else if (action?._def?.entries) enumValues = Object.keys(action._def.entries);
    },
  };
  registerSessionDispatcher(server as unknown as Parameters<typeof registerSessionDispatcher>[0]);
  if (!handler) throw new Error("registerSessionDispatcher did not register a handler");
  return { handler, schemaActions: enumValues };
}

async function invoke(handler: McpHandler, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await handler({ action, params });
  if (!result || !Array.isArray((result as { content?: unknown[] }).content)) {
    return result as unknown as Record<string, unknown>;
  }
  const raw = (result as { content: Array<{ text: string }> }).content[0]?.text ?? "";
  return JSON.parse(raw);
}

// ---- fixtures: identical shapes to ZuluWaveSchedulerEngine.test.ts ----
const st = (subtask_id: string, depends_on: string[] = []) => ({
  subtask_id, description: `work for ${subtask_id}`, domain: "mill", depends_on, size_hint: "short" as const,
});
const cand = (slot: string, primary_domain: string | null, score = 5) => ({ slot, hermes_role: "specialist", primary_domain, score });
const diamond = () => [st("a"), st("b", ["a"]), st("c", ["a"]), st("d", ["b", "c"])];
const request = (): Record<string, unknown> => ({ parent_task_id: "exec", subtasks: diamond(), candidates: [cand("alpha", "mill"), cand("bravo", "mill"), cand("charlie", "mill")], max_parallel: 5 });
// domain_filter "work" matches every "work for <id>" description -> authorized.
const allSouls = (): Record<string, unknown> => ({
  alpha: { hermes_role: "specialist", domain_filter: "work", refuse_list: [] },
  bravo: { hermes_role: "specialist", domain_filter: "work", refuse_list: [] },
  charlie: { hermes_role: "specialist", domain_filter: "work", refuse_list: [] },
});
const UNIT = "HERMES-C2::U-WAVE-LOOP-E2E";

// NOTE: ok() runs slimResponse(), which DROPS empty arrays fleet-wide (responseSlimmer.ts) --
// so an empty wave_assignments / completed_ids / vetoed comes back ABSENT through the dispatcher,
// not []. The fields are therefore optional here and consumers default absent -> []. The durable
// continuity store (read via readStore, NOT slimmed) carries the authoritative empty sets.
type Exec = { wave_assignments?: Array<{ subtask_id: string }>; done?: boolean; vetoed?: unknown[] };
const ids = (e: Exec) => (e.wave_assignments ?? []).map((a) => a.subtask_id);
const readStore = () => JSON.parse(fs.readFileSync(TMP_STORE, "utf8")) as { records: Record<string, { state: Record<string, unknown>; revision: number }> };

describe("prism_session:wave_loop_step -- dispatcher round-trip (C2 producer)", () => {
  let handler: McpHandler;
  let schemaActions: readonly string[];

  beforeEach(() => {
    try { fs.rmSync(TMP_STORE, { force: true }); } catch { /* ignore */ }
    const c = captureHandler();
    handler = c.handler;
    schemaActions = c.schemaActions;
  });
  afterEach(() => { try { fs.rmSync(TMP_STORE, { force: true }); } catch { /* ignore */ } });

  it("wiring: wave_loop_step appears in the ACTIONS enum", () => {
    expect(schemaActions).toContain("wave_loop_step");
  });

  it("step 1 (no prior): computes wave-1 [a] AND checkpoints completed=[] to C2's durable store -- PRODUCER proof", async () => {
    const r = await invoke(handler, "wave_loop_step", { unit_id: UNIT, request: request(), newly_completed: [], souls: allSouls() });
    expect(r.success).toBe(true);
    expect(r.resumed).toBe(false);
    expect(r.checkpointed).toBe(true);
    // empty completed_ids is slimmed out of the MCP response; a consumer defaults absent -> [].
    // The authoritative [] is in the durable store (asserted below) -- the resumability oracle.
    expect(r.completed_ids ?? []).toEqual([]);
    const exec = r.execution as Exec;
    expect(ids(exec)).toEqual(["a"]);
    expect(exec.done).toBe(false);
    // The orphan-closing proof: a record actually landed in C2's store.
    expect(fs.existsSync(TMP_STORE)).toBe(true);
    const store = readStore();
    expect(Object.keys(store.records)).toContain(UNIT);
    const rec = store.records[UNIT];
    expect(rec.state.completed_ids).toEqual([]);
    expect(rec.state.phase).toBe("wave-loop");
    expect(rec.state.last_dispatch).toEqual(["a"]);
    expect(rec.revision).toBe(1);
  });

  it("step 2 RESUMES the checkpoint + advances: newly=[a] -> resumed, completed=[a], wave-2 [b,c], revision bumps", async () => {
    await invoke(handler, "wave_loop_step", { unit_id: UNIT, request: request(), newly_completed: [], souls: allSouls() });
    const r = await invoke(handler, "wave_loop_step", { unit_id: UNIT, request: request(), newly_completed: ["a"], souls: allSouls() });
    expect(r.resumed).toBe(true);
    expect(r.completed_ids).toEqual(["a"]);
    expect(ids(r.execution as Exec).sort()).toEqual(["b", "c"]);
    expect(r.checkpointed).toBe(true);
    const rec = readStore().records[UNIT];
    expect(rec.state.completed_ids).toEqual(["a"]);
    expect(rec.revision).toBe(2);
  });

  it("FULL loop to terminal across SIMULATED /compact (fresh handler per step, state ONLY from the store) -> done + phase wave-loop-done", async () => {
    // Each step re-registers a fresh dispatcher and resumes ONLY from the persisted
    // file -- the resumability guarantee a self-startup re-entry depends on.
    const step = async (newly: string[]) => {
      const c = captureHandler();
      return invoke(c.handler, "wave_loop_step", { unit_id: UNIT, request: request(), newly_completed: newly, souls: allSouls() });
    };
    await step([]);                     // wave-1 [a]
    await step(["a"]);                  // wave-2 [b,c]
    const r3 = await step(["b", "c"]);  // wave-3 [d]
    expect(ids(r3.execution as Exec)).toEqual(["d"]);
    expect((r3.execution as Exec).done).toBe(false);
    const r4 = await step(["d"]);       // terminal
    expect((r4.execution as Exec).done).toBe(true);
    expect(r4.completed_ids).toEqual(["a", "b", "c", "d"]);
    const rec = readStore().records[UNIT];
    expect(rec.state.phase).toBe("wave-loop-done");
    expect(rec.state.done).toBe(true);
  });

  it("adversarial: a bad unit_id fails LOUD (checkpointed:false) + writes NOTHING -- never a silent producer miss (R12)", async () => {
    const r = await invoke(handler, "wave_loop_step", { unit_id: "not-a-milestone", request: request(), newly_completed: [], souls: allSouls() });
    expect(r.success).toBe(true);        // the dispatcher case itself does not throw
    expect(r.resumed).toBe(false);
    expect(r.checkpointed).toBe(false);  // the producer REFUSED the malformed id
    expect(ids(r.execution as Exec)).toEqual(["a"]); // the wave is still computed (returned)
    expect(fs.existsSync(TMP_STORE)).toBe(false);    // ...but nothing was persisted
  });

  it("governance still gates the dispatched wave: empty souls -> all assignments vetoed, completed-set still checkpointed", async () => {
    const r = await invoke(handler, "wave_loop_step", { unit_id: UNIT, request: request(), newly_completed: [], souls: {} });
    const exec = r.execution as Exec;
    // wave_assignments=[] is slimmed from the response (empty-array drop); a consumer reads
    // absent as "nothing dispatched". vetoed is non-empty so it survives the slim.
    expect(ids(exec)).toEqual([]);                        // fail-closed: no soul -> all vetoed
    expect((exec.vetoed ?? []).length).toBeGreaterThanOrEqual(1);
    expect(r.checkpointed).toBe(true);                    // the loop still records progress
    expect(readStore().records[UNIT].state.last_dispatch).toEqual([]); // durable store is NOT slimmed
  });
});

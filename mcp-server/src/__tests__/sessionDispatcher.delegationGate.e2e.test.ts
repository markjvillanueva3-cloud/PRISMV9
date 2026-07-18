import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Dispatcher round-trip E2E for the C4 delegation pre-gate
 * (HERMES-CAPABILITY-C4/U-C4-DELEGATION-LIVE-GATE, slot:bravo).
 *
 * This is the R15-VALIDATE proof that prism_session:governed_wave_execute actually
 * READS the durable delegation store and composes its verdict INTO the live
 * wave-dispatch authority loop. The pure composition (evaluateDelegation +
 * composeGatedAuthority) is unit-tested in ZuluDelegationContractEngine.test.ts; THESE
 * tests prove the WIRING -- a contract GRANTED through the real delegation_grant action
 * narrows a real governed_wave_execute wave (an expired/revoked one denies fail-closed),
 * an active one defers to the governor, an empty store is a no-op, and apply_delegation
 * :false opts out. "Built but not wired together" (the C3 seam lesson) is only refuted by
 * driving the dispatcher case + reading the consequence on the SAME singleton store.
 *
 * Hermetic: PRISM_ZULU_DELEGATION_PATH is set at module top BEFORE the dispatcher's lazy
 * `await import` constructs the zuluDelegationContractEngine singleton (its ctor reads
 * this env var) -- identical to the C2 waveLoopStep e2e pattern. grant() refuses a PAST
 * deadline, so an "expired" contract is created by granting with a deep-past `now` plus a
 * deadline just after it; the gate's real Date.now() then sees that contract expired (a
 * faithful clock-advance simulation -- the only way to round-trip an expired contract
 * through the real grant path without mocking the clock).
 */
const TMP_STORE = path.join(os.tmpdir(), `zulu-delegation-gate-e2e-${process.pid}.json`);
process.env.PRISM_ZULU_DELEGATION_PATH = TMP_STORE;

import { registerSessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

type McpHandler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}>;

function captureHandler(): McpHandler {
  let handler: McpHandler | null = null;
  const server = {
    tool(_name: string, _description: string, _schema: Record<string, unknown>, cb: McpHandler) {
      handler = cb;
    },
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

// ---- fixtures: identical shapes to ZuluWaveSchedulerEngine.test.ts ----
const st = (subtask_id: string, depends_on: string[] = []) => ({
  subtask_id, description: `work for ${subtask_id}`, domain: "mill", depends_on, size_hint: "short" as const,
});
const cand = (slot: string, primary_domain: string | null, score = 5) => ({ slot, hermes_role: "specialist", primary_domain, score });
const diamond = () => [st("a"), st("b", ["a"]), st("c", ["a"]), st("d", ["b", "c"])];
const request = (): Record<string, unknown> => ({
  parent_task_id: "exec",
  subtasks: diamond(),
  candidates: [cand("alpha", "mill"), cand("bravo", "mill"), cand("charlie", "mill")],
  max_parallel: 5,
});
// domain_filter "work" matches every "work for <id>" description -> governor authorizes.
const allSouls = (): Record<string, unknown> => ({
  alpha: { hermes_role: "specialist", domain_filter: "work", refuse_list: [] },
  bravo: { hermes_role: "specialist", domain_filter: "work", refuse_list: [] },
  charlie: { hermes_role: "specialist", domain_filter: "work", refuse_list: [] },
});

// grant inputs (ORCHESTRATOR role required; grant refuses a past deadline).
const grantActive = (over: Record<string, unknown> = {}) => ({
  input: {
    grantee_slot: "alpha", operations: ["assign"], galaxy_scope: "mill",
    deadline_utc: "2099-01-01T00:00:00.000Z",
    granted_by_slot: "zulu", granted_by_role: "fleet-orchestrator", ...over,
  },
});
// expired-relative-to-now: grant in the deep past with a deadline just after it. grant()
// accepts it (2001 > 2000), but the gate's real Date.now() sees it expired.
const grantExpired = (over: Record<string, unknown> = {}) => ({
  input: {
    grantee_slot: "alpha", operations: ["assign"], galaxy_scope: "mill",
    deadline_utc: "2001-01-01T00:00:00.000Z",
    granted_by_slot: "zulu", granted_by_role: "fleet-orchestrator", ...over,
  },
  now: "2000-06-01T00:00:00.000Z",
});

// ok() runs slimResponse(), which DROPS empty arrays -- an empty wave_assignments / vetoed
// comes back ABSENT, so default absent -> [].
type Exec = {
  wave_assignments?: Array<{ subtask_id: string; slot: string }>;
  vetoed?: Array<{ subtask_id: string; slot: string; reason: string }>;
  done?: boolean;
};
const ids = (e: Exec) => (e.wave_assignments ?? []).map((a) => a.subtask_id);
const vetoed = (e: Exec) => e.vetoed ?? [];

describe("prism_session:governed_wave_execute -- C4 delegation pre-gate round-trip", () => {
  let handler: McpHandler;
  beforeEach(() => {
    try { fs.rmSync(TMP_STORE, { force: true }); } catch { /* ignore */ }
    handler = captureHandler();
  });
  afterEach(() => { try { fs.rmSync(TMP_STORE, { force: true }); } catch { /* ignore */ } });

  it("EMPTY store: the default-ON gate is a no-op -> wave-1 [a] authorized (back-compat)", async () => {
    const r = await invoke(handler, "governed_wave_execute", { request: request(), souls: allSouls() });
    expect(r.success).toBe(true);
    expect(ids(r.execution as Exec)).toEqual(["a"]);
    expect(vetoed(r.execution as Exec)).toEqual([]);
  });

  it("GRANTED active contract (within-contract): wave-1 [a] still authorized -- an active delegation does NOT veto", async () => {
    const g = await invoke(handler, "delegation_grant", grantActive());
    expect((g.result as { ok: boolean }).ok).toBe(true);
    const r = await invoke(handler, "governed_wave_execute", { request: request(), souls: allSouls() });
    expect(ids(r.execution as Exec)).toEqual(["a"]);
    expect(vetoed(r.execution as Exec)).toEqual([]);
  });

  it("GRANTED EXPIRED contract NARROWS a real wave: alpha's assignment is VETOED (delegation-denied)", async () => {
    const g = await invoke(handler, "delegation_grant", grantExpired());
    expect((g.result as { ok: boolean }).ok).toBe(true);
    const r = await invoke(handler, "governed_wave_execute", { request: request(), souls: allSouls() });
    expect(ids(r.execution as Exec)).toEqual([]); // wave_assignments [] is slimmed; assert via vetoed
    const v = vetoed(r.execution as Exec);
    expect(v.map((x) => x.subtask_id)).toEqual(["a"]);
    expect(v[0].reason).toMatch(/^delegation-denied:/);
  });

  it("apply_delegation:false OPTS OUT -> the same expired contract is ignored, wave-1 [a] authorized", async () => {
    const g = await invoke(handler, "delegation_grant", grantExpired());
    expect((g.result as { ok: boolean }).ok).toBe(true);
    const r = await invoke(handler, "governed_wave_execute", { request: request(), souls: allSouls(), apply_delegation: false });
    expect(ids(r.execution as Exec)).toEqual(["a"]);
    expect(vetoed(r.execution as Exec)).toEqual([]);
  });

  it("GRANTED then REVOKED contract denies fail-closed: alpha vetoed even though the deadline is future", async () => {
    const g = await invoke(handler, "delegation_grant", grantActive());
    const id = (g.result as { contract: { id: string } }).contract.id;
    const rv = await invoke(handler, "delegation_revoke", { id, byRole: "fleet-orchestrator", bySlot: "zulu" });
    expect((rv.result as { ok: boolean }).ok).toBe(true);
    const r = await invoke(handler, "governed_wave_execute", { request: request(), souls: allSouls() });
    const v = vetoed(r.execution as Exec);
    expect(v.map((x) => x.subtask_id)).toEqual(["a"]);
    expect(v[0].reason).toMatch(/^delegation-denied:/);
  });

  it("a contract for a DIFFERENT galaxy never narrows a mill wave (no-contract no-op through the real store)", async () => {
    const g = await invoke(handler, "delegation_grant", grantExpired({ galaxy_scope: "lathe" }));
    expect((g.result as { ok: boolean }).ok).toBe(true);
    const r = await invoke(handler, "governed_wave_execute", { request: request(), souls: allSouls() });
    expect(ids(r.execution as Exec)).toEqual(["a"]); // lathe contract does not match the mill subtask
    expect(vetoed(r.execution as Exec)).toEqual([]);
  });
});

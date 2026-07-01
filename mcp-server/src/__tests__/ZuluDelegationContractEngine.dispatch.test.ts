/**
 * ZuluDelegationContractEngine (C4) -- dispatcher round-trip (R15 E2E).
 *
 * Exercises the 5 prism_session actions THROUGH registerSessionDispatcher (not the
 * engine singleton directly): delegation_grant / delegation_revoke /
 * delegation_status / delegation_check / zulu_authority_check_gated.
 *
 * HERMETIC: PRISM_ZULU_DELEGATION_PATH is set to a unique tmp store at top-level,
 * BEFORE any dispatch. The dispatcher LAZY-imports the engine (await import inside
 * the case), so the singleton constructs against this tmp path on first call -- no
 * live-store accretion (the lesson from C2's non-hermetic round-trip scrutiny P1).
 * We do NOT statically import the engine here (that would load + bind the singleton
 * at the default path before the env takes effect).
 */
import { describe, it, expect, afterAll } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const TMP_STORE = path.join(os.tmpdir(), `zulu-deleg-dispatch-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
process.env.PRISM_ZULU_DELEGATION_PATH = TMP_STORE;

afterAll(() => {
  try { fs.rmSync(TMP_STORE, { force: true }); } catch { /* best-effort */ }
  try {
    const dir = path.dirname(TMP_STORE);
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith(path.basename(TMP_STORE))) fs.rmSync(path.join(dir, f), { force: true });
    }
  } catch { /* best-effort */ }
});

type Handler = (args: { action: string; params?: Record<string, unknown> }) => Promise<{ content: Array<{ type: "text"; text: string }> }>;

async function captureInvoke() {
  const { registerSessionDispatcher } = await import("../tools/dispatchers/sessionDispatcher.js");
  let captured: Handler | undefined;
  registerSessionDispatcher({ tool: (_n: string, _d: string, _s: unknown, h: Handler) => { captured = h; } } as never);
  if (typeof captured !== "function") throw new Error("dispatcher did not register a handler");
  return async (action: string, params: Record<string, unknown>) =>
    JSON.parse((await captured!({ action, params })).content[0].text) as Record<string, never>;
}

const FUTURE = "2026-06-15T13:00:00.000Z";
const orchestratorSoul = { hermes_role: "zulu-orchestrator", domain_filter: "", refuse_list: [] };
const millOnlySoul = { hermes_role: "mill-specialist", domain_filter: "mill", refuse_list: [] };

describe("prism_session delegation_* round-trip (R15 E2E, hermetic tmp store)", () => {
  it("grant -> check(within) -> revoke -> check(denied:revoked) -> status", async () => {
    const invoke = await captureInvoke();
    const grantee = "alpha";

    const g = await invoke("delegation_grant", {
      input: { grantee_slot: grantee, operations: ["assign", "veto"], galaxy_scope: "mill", deadline_utc: FUTURE, token_cap: 50000, granted_by_slot: "zulu", granted_by_role: "zulu-orchestrator" },
      now: "2026-06-15T11:30:00.000Z",
    });
    expect(g.success).toBe(true);
    expect((g.result as { ok: boolean }).ok).toBe(true);
    const id = (g.result as { contract: { id: string } }).contract.id;
    expect(typeof id).toBe("string");

    const c1 = await invoke("delegation_check", { request: { grantee_slot: grantee, operation: "veto", galaxy: "mill" }, now: "2026-06-15T12:00:00.000Z" });
    expect((c1.verdict as { decision: string }).decision).toBe("within-contract");

    const rv = await invoke("delegation_revoke", { id, byRole: "zulu-orchestrator", now: "2026-06-15T12:05:00.000Z" });
    expect((rv.result as { ok: boolean }).ok).toBe(true);
    expect((rv.result as { contract: { revoked: boolean } }).contract.revoked).toBe(true);

    const c2 = await invoke("delegation_check", { request: { grantee_slot: grantee, operation: "veto", galaxy: "mill" }, now: "2026-06-15T12:10:00.000Z" });
    expect((c2.verdict as { decision: string }).decision).toBe("denied");
    expect((c2.verdict as { reason: string }).reason).toContain("revoked");

    const st = await invoke("delegation_status", { grantee_slot: grantee, now: "2026-06-15T12:10:00.000Z" });
    expect((st.count as unknown as number) >= 1).toBe(true);
  });

  it("delegation_grant REJECTS a non-orchestrator granter through the dispatcher (no write)", async () => {
    const invoke = await captureInvoke();
    const g = await invoke("delegation_grant", {
      input: { grantee_slot: "bravo", operations: ["assign"], galaxy_scope: "mill", deadline_utc: FUTURE, granted_by_slot: "bravo", granted_by_role: "mill-specialist" },
      now: "2026-06-15T11:30:00.000Z",
    });
    expect((g.result as { ok: boolean }).ok).toBe(false);
    expect((g.result as { error: string }).error).toContain("granter-not-orchestrator");
  });

  it("zulu_authority_check_gated: no-contract + orchestrator soul -> governor authorizes", async () => {
    const invoke = await captureInvoke();
    const out = await invoke("zulu_authority_check_gated", {
      request: { slot: "zzz-nocontract", task_text: "assign a mill task", operation: "assign" },
      soul: orchestratorSoul,
      galaxy: "mill",
      now: "2026-06-15T12:00:00.000Z",
    });
    const composed = out.composed as { authorized: boolean; gate: string; delegation: { decision: string } };
    expect(composed.delegation.decision).toBe("no-contract");
    expect(composed.gate).toBe("governor");
    expect(composed.authorized).toBe(true);
  });

  it("zulu_authority_check_gated: NARROWS -- a denying (revoked) delegation blocks even when governor would allow", async () => {
    const invoke = await captureInvoke();
    // grant then revoke a contract for charlie+assign+quoting
    const g = await invoke("delegation_grant", {
      input: { grantee_slot: "charlie", operations: ["assign"], galaxy_scope: "quoting", deadline_utc: FUTURE, granted_by_slot: "zulu", granted_by_role: "zulu-orchestrator" },
      now: "2026-06-15T11:30:00.000Z",
    });
    const id = (g.result as { contract: { id: string } }).contract.id;
    await invoke("delegation_revoke", { id, byRole: "zulu-orchestrator", now: "2026-06-15T11:45:00.000Z" });

    const out = await invoke("zulu_authority_check_gated", {
      request: { slot: "charlie", task_text: "assign a quoting task", operation: "assign" },
      soul: orchestratorSoul, // governor WOULD allow (orchestrator role)
      galaxy: "quoting",
      now: "2026-06-15T12:00:00.000Z",
    });
    const composed = out.composed as { authorized: boolean; gate: string; governor: unknown; delegation: { decision: string } };
    expect(composed.delegation.decision).toBe("denied");
    expect(composed.authorized).toBe(false);
    expect(composed.gate).toBe("delegation");
    // governor NOT consulted -> the engine sets it null; the dispatcher's
    // slimResponse drops null fields, so it arrives absent (undefined). Either way
    // it must be nullish (the governor verdict was never produced).
    expect(composed.governor == null).toBe(true);
  });

  it("zulu_authority_check_gated: NARROWS -- within-contract but governor DENIES -> still denied (never widens)", async () => {
    const invoke = await captureInvoke();
    // active contract for delta+assign+cad...
    await invoke("delegation_grant", {
      input: { grantee_slot: "delta", operations: ["assign"], galaxy_scope: "cad", deadline_utc: FUTURE, granted_by_slot: "zulu", granted_by_role: "zulu-orchestrator" },
      now: "2026-06-15T11:30:00.000Z",
    });
    // ...but the governor soul is mill-only + non-orchestrator -> governor DENIES a cad task.
    const out = await invoke("zulu_authority_check_gated", {
      request: { slot: "delta", task_text: "assign a cad task", operation: "assign" },
      soul: millOnlySoul,
      galaxy: "cad",
      now: "2026-06-15T12:00:00.000Z",
    });
    const composed = out.composed as { authorized: boolean; gate: string; delegation: { decision: string } };
    expect(composed.delegation.decision).toBe("within-contract");
    expect(composed.authorized).toBe(false); // delegation did NOT widen the governor's deny
    expect(composed.gate).toBe("governor");
  });
});

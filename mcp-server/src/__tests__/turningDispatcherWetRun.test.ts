/**
 * turningDispatcher — WetRunStateMachineEngine wiring tests (U-LW-C2, slot:whiskey)
 * ================================================================================
 *
 * Confirms the 14 wet_run_* actions route through prism_turning to the JM Die
 * pilot-run finite state machine (WET_PASS/WET_SOFT_FAIL/WET_HARD_FAIL/QUARANTINE/
 * RESOLVED). The engine was built + unit-tested but had ZERO dispatcher actions —
 * these tests exercise the ROUND-TRIP (dispatcher validation + engine call), not the
 * engine in isolation.
 *
 * SECURITY (scrutiny arm B P1, 2026-07-05): the engine's `now` override is deliberately
 * NOT forwarded from the dispatcher, so the 5-day quarantine hold uses the real server
 * clock. These tests therefore assert the hold is ENFORCED (an immediate clear — even
 * with a forged future `now` in params — is refused). The successful clear-AFTER the
 * real 5-day hold is covered by the engine's own unit test (which drives `now` directly);
 * it cannot be exercised through the dispatcher without waiting 5 real days — by design.
 *
 * Isolation via clearAll() before each test.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerTurningDispatcher } from "../tools/dispatchers/turningDispatcher.js";
import { registerSafetyDispatcher } from "../tools/dispatchers/safetyDispatcher.js";
import { wetRunStateMachineEngine } from "../engines/WetRunStateMachineEngine.js";

class MockMCPServer {
  tools: Array<{ name: string; description: string; schema: any; handler: (args: any) => Promise<any> }> = [];
  tool(name: string, description: string, schema: any, handler: any) {
    this.tools.push({ name, description, schema, handler });
  }
}

async function callTool(server: MockMCPServer, toolName: string, action: string, params: Record<string, any> = {}): Promise<any> {
  const tool = server.tools.find((t) => t.name === toolName)!;
  const raw = await tool.handler({ action, params });
  const text = raw?.content?.[0]?.text;
  return typeof text === "string" ? JSON.parse(text) : raw;
}

async function call(server: MockMCPServer, action: string, params: Record<string, any> = {}): Promise<any> {
  return callTool(server, "prism_turning", action, params);
}

function newServer(): MockMCPServer {
  const s = new MockMCPServer();
  registerTurningDispatcher(s);
  return s;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const startParams = (session_id: string, extra: Record<string, any> = {}) => ({
  session_id,
  tenant_id: "ITW",
  part_id: "UPSET-2528",
  machine_id: "LB-3000",
  operator: "kowalski",
  ...extra,
});

describe("turningDispatcher — WetRunStateMachineEngine (U-LW-C2)", () => {
  beforeEach(() => wetRunStateMachineEngine.clearAll());

  it("registers all 14 wet_run_* actions in the prism_turning enum", () => {
    const s = newServer();
    const tool = s.tools.find((t) => t.name === "prism_turning")!;
    const actions: string[] = tool.schema.action._def?.values ?? tool.schema.action.options ?? [];
    const wet = actions.filter((a) => a.startsWith("wet_run_"));
    expect(wet.length).toBe(14);
  });

  it("start_session creates a session in WET_PASS", async () => {
    const r = await call(newServer(), "wet_run_start_session", startParams("s1"));
    expect(r.state).toBe("WET_PASS");
    expect(r.session_id).toBe("s1");
    expect(r.scrap_count).toBe(0);
  });

  it("one scrap -> WET_SOFT_FAIL (soft, recoverable)", async () => {
    const s = newServer();
    await call(s, "wet_run_start_session", startParams("s2"));
    const r = await call(s, "wet_run_record_part_outcome", {
      session_id: "s2",
      passed: false,
      root_cause: "chatter on finish pass, Ra out of band",
    });
    expect(r.transitioned).toBe(true);
    expect(r.session.state).toBe("WET_SOFT_FAIL");
    expect(r.session.scrap_count).toBe(1);
  });

  it("two scraps -> WET_HARD_FAIL -> auto-QUARANTINE", async () => {
    const s = newServer();
    await call(s, "wet_run_start_session", startParams("s2b"));
    await call(s, "wet_run_record_part_outcome", {
      session_id: "s2b", passed: false, root_cause: "first scrap: bore oversize by 0.03mm",
    });
    const r = await call(s, "wet_run_record_part_outcome", {
      session_id: "s2b", passed: false, root_cause: "second scrap: taper out of tolerance",
    });
    expect(r.transitioned).toBe(true);
    expect(r.session.state).toBe("QUARANTINE");
    expect(r.session.scrap_count).toBe(2);
  });

  it("a safety event forces WET_HARD_FAIL -> QUARANTINE", async () => {
    const s = newServer();
    await call(s, "wet_run_start_session", startParams("s3"));
    const r = await call(s, "wet_run_record_safety_event", {
      session_id: "s3",
      kind: "collision",
      severity: "critical",
      detail: "turret collided with tailstock at index",
    });
    expect(r.transitioned).toBe(true);
    expect(r.session.state).toBe("QUARANTINE");
    const got = await call(s, "wet_run_get_session", { session_id: "s3" });
    expect(got.state).toBe("QUARANTINE");
  });

  it("post-mortem requires QUARANTINE + >=2 distinct approvers, then round-trips", async () => {
    const s = newServer();
    await call(s, "wet_run_start_session", startParams("s4"));
    await call(s, "wet_run_record_safety_event", {
      session_id: "s4", kind: "workholding_slip", severity: "high",
      detail: "part slipped in soft jaws during heavy roughing",
    });
    const pm = await call(s, "wet_run_submit_post_mortem", {
      session_id: "s4",
      authored_by: "engineer-a",
      root_cause: "soft jaw grip pressure below the transmitted-torque requirement",
      remediation: "increase actuator force and re-bore jaws to full part contact length",
      approvers: ["lead", "safety-officer"],
    });
    expect(pm.approved_by).toHaveLength(2);
    expect(pm.session_id).toBe("s4");
  });

  it("SECURITY: the 5-day hold is enforced — a forged future `now` cannot clear QUARANTINE early", async () => {
    const s = newServer();
    await call(s, "wet_run_start_session", startParams("s4b"));
    await call(s, "wet_run_record_safety_event", {
      session_id: "s4b", kind: "spindle_overrun", severity: "critical",
      detail: "spindle exceeded G50 clamp on small-diameter cut",
    });
    await call(s, "wet_run_submit_post_mortem", {
      session_id: "s4b", authored_by: "eng", root_cause: "missing G50 max-RPM clamp in the CSS program header",
      remediation: "add G50 S3000 clamp and re-validate via the GCodeSafetyAnalyzer HIGH-20 rule",
      approvers: ["lead", "qa"],
    });
    // Attempt to bypass the cooling-off period by forging `now` 6 days in the future.
    // The dispatcher must NOT honor `now`; the hold is measured against the real clock,
    // so an immediate clear is still refused.
    const forged = await call(s, "wet_run_clear_quarantine", {
      session_id: "s4b",
      authorized_by: "attacker",
      evidence: "attempting early clear with a forged timestamp",
      runbook_completed: true,
      now: Date.now() + 6 * DAY_MS, // forged — must be ignored
    });
    expect(JSON.stringify(forged)).toMatch(/5 days|quarantine minimum/i);
    const still = await call(s, "wet_run_get_session", { session_id: "s4b" });
    expect(still.state).toBe("QUARANTINE"); // not cleared
  });

  it("SECURITY cross-surface: back-dating `now` via prism_safety does NOT back-date quarantine_started_at", async () => {
    // The same singleton is wired into prism_safety too. A caller forging a 6-days-ago `now`
    // on the safety-side record must NOT back-date the quarantine start (which would let the
    // hold be cleared early via prism_turning). Both surfaces strip `now`.
    const s = new MockMCPServer();
    registerTurningDispatcher(s);
    registerSafetyDispatcher(s);
    await callTool(s, "prism_safety", "wetrun_start_session", startParams("xsurf"));
    await callTool(s, "prism_safety", "wetrun_record_safety_event", {
      session_id: "xsurf", kind: "collision", severity: "critical",
      detail: "back-dated collision attempt to fabricate the hold",
      now: Date.now() - 6 * DAY_MS, // forged — must be ignored
    });
    const got = await call(s, "wet_run_get_session", { session_id: "xsurf" });
    expect(got.state).toBe("QUARANTINE");
    // quarantine_started_at must be the real clock (~now), NOT 6 days ago.
    expect(got.quarantine_started_at).toBeGreaterThan(Date.now() - 5 * 60_000);
  });

  it("resolve_session advances a non-quarantine (soft-fail) session to RESOLVED", async () => {
    const s = newServer();
    await call(s, "wet_run_start_session", startParams("s5"));
    await call(s, "wet_run_record_part_outcome", {
      session_id: "s5", passed: false, root_cause: "single scrap, operator corrected offset",
    });
    const r = await call(s, "wet_run_resolve_session", {
      session_id: "s5", resolution: "advance", notes: "offset corrected, subsequent parts in tolerance",
    });
    expect(r.state).toBe("RESOLVED");
    expect(r.resolution).toBe("advance");
  });

  it("resolve_session refuses a QUARANTINE session (must use clear_quarantine)", async () => {
    const s = newServer();
    await call(s, "wet_run_start_session", startParams("s5b"));
    await call(s, "wet_run_record_safety_event", {
      session_id: "s5b", kind: "kill_switch_l2", severity: "critical", detail: "operator hit the L2 kill switch",
    });
    const r = await call(s, "wet_run_resolve_session", {
      session_id: "s5b", resolution: "advance", notes: "trying to skip quarantine",
    });
    expect(JSON.stringify(r)).toMatch(/clearQuarantine|QUARANTINE/i);
  });

  it("audit queries + stats round-trip (list_sessions/transitions/scrap/safety/stats/clearances)", async () => {
    const s = newServer();
    await call(s, "wet_run_start_session", startParams("s6"));
    await call(s, "wet_run_record_part_outcome", {
      session_id: "s6", passed: false, root_cause: "burr on parted face, exceeds spec",
    });
    const sessions = await call(s, "wet_run_list_sessions", { tenant_id: "ITW" });
    expect(Array.isArray(sessions)).toBe(true);
    expect(sessions.length).toBe(1);
    const transitions = await call(s, "wet_run_list_transitions", { session_id: "s6" });
    expect(Array.isArray(transitions)).toBe(true);
    expect(transitions.length).toBeGreaterThan(0);
    const scrap = await call(s, "wet_run_list_scrap_events", { session_id: "s6" });
    expect(scrap.length).toBe(1);
    const safety = await call(s, "wet_run_list_safety_events", {});
    expect(Array.isArray(safety)).toBe(true);
    const stats = await call(s, "wet_run_get_stats", {});
    expect(stats).toBeTruthy();
    const clearances = await call(s, "wet_run_list_clearances", {});
    expect(Array.isArray(clearances)).toBe(true);
    const pm = await call(s, "wet_run_get_post_mortem", { session_id: "s6" });
    expect(pm).toBeFalsy(); // no post-mortem for a non-quarantine session
  });

  // ── Failure + adversarial paths ─────────────────────────────────────────
  it("rejects start_session missing a required field (schema validation)", async () => {
    const r = await call(newServer(), "wet_run_start_session", {
      session_id: "bad", part_id: "p", machine_id: "m", operator: "o",
      // tenant_id omitted
    });
    expect(r.state).toBeUndefined();
    expect(JSON.stringify(r)).toMatch(/invalid/i);
  });

  it("surfaces an engine throw for an unknown session id", async () => {
    const r = await call(newServer(), "wet_run_get_session", { session_id: "does-not-exist" });
    expect(r.state).toBeUndefined();
    expect(JSON.stringify(r)).toMatch(/not found|error/i);
  });

  it("adversarial: post-mortem with <2 approvers is rejected by schema", async () => {
    const s = newServer();
    await call(s, "wet_run_start_session", startParams("s7"));
    await call(s, "wet_run_record_safety_event", {
      session_id: "s7", kind: "tool_breakage", severity: "high", detail: "insert shattered mid-cut",
    });
    const r = await call(s, "wet_run_submit_post_mortem", {
      session_id: "s7", authored_by: "e", root_cause: "x".repeat(25), remediation: "y".repeat(25),
      approvers: ["only-one"],
    });
    expect(JSON.stringify(r)).toMatch(/invalid/i);
  });

  it("adversarial: safety event with too-short detail is rejected by schema", async () => {
    const s = newServer();
    await call(s, "wet_run_start_session", startParams("s8"));
    const r = await call(s, "wet_run_record_safety_event", {
      session_id: "s8", kind: "other", severity: "medium", detail: "short",
    });
    expect(JSON.stringify(r)).toMatch(/invalid/i);
  });
});

/**
 * WetRunStateMachineEngine tests (U-LPR-WETRUN-FSM)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { WetRunStateMachineEngine } from "../../engines/WetRunStateMachineEngine.js";

let eng: WetRunStateMachineEngine;
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

function seed(
  e: WetRunStateMachineEngine,
  id = "S1",
  tenant = "jm-die",
  now = 1_000_000,
) {
  return e.startSession({
    session_id: id,
    tenant_id: tenant,
    part_id: "PART-42",
    machine_id: "OKUMA-LB4000",
    operator: "operator-a",
    now,
  });
}

beforeEach(() => {
  eng = new WetRunStateMachineEngine();
});

// ──────────────────────────────────────────────────────────────────────
// Session lifecycle
// ──────────────────────────────────────────────────────────────────────

describe("session lifecycle", () => {
  it("starts in WET_PASS", () => {
    const s = seed(eng);
    expect(s.state).toBe("WET_PASS");
    expect(s.scrap_count).toBe(0);
    expect(s.safety_event_count).toBe(0);
  });

  it("rejects duplicate session_id", () => {
    seed(eng);
    expect(() => seed(eng)).toThrow(/already exists/);
  });

  it("rejects empty session_id / tenant_id", () => {
    expect(() =>
      eng.startSession({ session_id: "", tenant_id: "t", part_id: "p", machine_id: "m", operator: "o" }),
    ).toThrow(/session_id required/);
    expect(() =>
      eng.startSession({ session_id: "s", tenant_id: "", part_id: "p", machine_id: "m", operator: "o" }),
    ).toThrow(/tenant_id required/);
  });

  it("filters listSessions by state + tenant", () => {
    seed(eng, "S1", "jm-die");
    seed(eng, "S2", "other");
    expect(eng.listSessions({ tenant_id: "jm-die" })).toHaveLength(1);
    expect(eng.listSessions({ state: "WET_PASS" })).toHaveLength(2);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Scrap progression
// ──────────────────────────────────────────────────────────────────────

describe("scrap state transitions", () => {
  it("passed parts keep state at WET_PASS", () => {
    seed(eng);
    eng.recordPartOutcome({ session_id: "S1", passed: true });
    eng.recordPartOutcome({ session_id: "S1", passed: true });
    expect(eng.getSession("S1").state).toBe("WET_PASS");
  });

  it("1 scrap → WET_SOFT_FAIL", () => {
    seed(eng);
    const r = eng.recordPartOutcome({
      session_id: "S1",
      passed: false,
      root_cause: "chatter on finish pass due to overhang",
    });
    expect(r.session.state).toBe("WET_SOFT_FAIL");
    expect(r.transitioned).toBe(true);
  });

  it("2 scraps → WET_HARD_FAIL → auto-QUARANTINE", () => {
    seed(eng);
    eng.recordPartOutcome({ session_id: "S1", passed: false, root_cause: "chatter on finish" });
    const r = eng.recordPartOutcome({ session_id: "S1", passed: false, root_cause: "dimensional out of tol" });
    expect(r.session.state).toBe("QUARANTINE");
    expect(r.session.quarantine_started_at).toBeDefined();
    const transitions = eng.listTransitions({ session_id: "S1" });
    expect(transitions.some((t) => t.to_state === "WET_HARD_FAIL")).toBe(true);
    expect(transitions.some((t) => t.to_state === "QUARANTINE")).toBe(true);
  });

  it("scrap event requires ≥10 char root_cause", () => {
    seed(eng);
    expect(() =>
      eng.recordPartOutcome({ session_id: "S1", passed: false, root_cause: "bad" }),
    ).toThrow(/root_cause/);
  });

  it("cannot record outcome on terminal session", () => {
    seed(eng);
    eng.recordSafetyEvent({
      session_id: "S1",
      kind: "collision",
      severity: "critical",
      detail: "tool crashed into chuck",
    });
    // Now QUARANTINE — outcome recording blocked.
    expect(() =>
      eng.recordPartOutcome({ session_id: "S1", passed: true }),
    ).toThrow(/terminal state/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Safety events
// ──────────────────────────────────────────────────────────────────────

describe("safety events force QUARANTINE", () => {
  it("any safety event → immediate QUARANTINE regardless of scrap count", () => {
    seed(eng);
    const r = eng.recordSafetyEvent({
      session_id: "S1",
      kind: "kill_switch_l1",
      severity: "critical",
      detail: "operator pressed red button during toolchange",
    });
    expect(r.session.state).toBe("QUARANTINE");
    expect(r.session.safety_event_count).toBe(1);
  });

  it("rejects short detail", () => {
    seed(eng);
    expect(() =>
      eng.recordSafetyEvent({
        session_id: "S1",
        kind: "workholding_slip",
        severity: "high",
        detail: "slip",
      }),
    ).toThrow(/detail/);
  });

  it("rejects new safety event after RESOLVED", () => {
    seed(eng);
    eng.resolveSession({
      session_id: "S1",
      resolution: "advance",
      notes: "no issues observed over 10 passed parts",
    });
    expect(() =>
      eng.recordSafetyEvent({
        session_id: "S1",
        kind: "collision",
        severity: "critical",
        detail: "phantom alarm after shutdown",
      }),
    ).toThrow(/RESOLVED/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Post-mortem + quarantine clearance
// ──────────────────────────────────────────────────────────────────────

describe("post-mortem + quarantine clearance", () => {
  function toQuarantine(t = 1_000_000): void {
    seed(eng, "S1", "jm-die", t);
    eng.recordSafetyEvent({
      session_id: "S1",
      kind: "collision",
      severity: "critical",
      detail: "tool collision with tailstock",
      now: t + 1,
    });
  }

  it("post-mortem requires QUARANTINE state", () => {
    seed(eng);
    expect(() =>
      eng.submitPostMortem({
        session_id: "S1",
        authored_by: "a",
        root_cause: "x".repeat(25),
        remediation: "y".repeat(25),
        approvers: ["a", "b"],
      }),
    ).toThrow(/QUARANTINE/);
  });

  it("post-mortem requires ≥2 distinct approvers", () => {
    toQuarantine();
    expect(() =>
      eng.submitPostMortem({
        session_id: "S1",
        authored_by: "incident-commander",
        root_cause: "collision caused by incorrect tool offset",
        remediation: "re-qualify offset in setup sheet and add probe verify",
        approvers: ["same", "same", "same"],
      }),
    ).toThrow(/distinct approvers/);
  });

  it("clearance blocked before 5-day hold", () => {
    toQuarantine(1_000_000);
    eng.submitPostMortem({
      session_id: "S1",
      authored_by: "ic",
      root_cause: "collision caused by incorrect tool offset",
      remediation: "re-qualify offset and add probe verify prior to cycle",
      approvers: ["alice", "bob"],
    });
    expect(() =>
      eng.clearQuarantine({
        session_id: "S1",
        authorized_by: "ic",
        evidence: "ran retest overnight",
        runbook_completed: true,
        now: 1_000_000 + 1 * 24 * 60 * 60 * 1000, // 1 day
      }),
    ).toThrow(/5 days/);
  });

  it("clearance blocked without post-mortem", () => {
    toQuarantine(1_000_000);
    expect(() =>
      eng.clearQuarantine({
        session_id: "S1",
        authorized_by: "ic",
        evidence: "ran retest",
        runbook_completed: true,
        now: 1_000_000 + FIVE_DAYS_MS + 1000,
      }),
    ).toThrow(/post-mortem/);
  });

  it("successful clearance → RESOLVED with clearance record", () => {
    toQuarantine(1_000_000);
    eng.submitPostMortem({
      session_id: "S1",
      authored_by: "ic",
      root_cause: "collision caused by incorrect tool offset",
      remediation: "re-qualify offset and add probe verify prior to cycle",
      approvers: ["alice", "bob"],
    });
    const r = eng.clearQuarantine({
      session_id: "S1",
      authorized_by: "incident-commander",
      evidence: "30-part retest with probe + post-mortem signed off",
      runbook_completed: true,
      now: 1_000_000 + FIVE_DAYS_MS + 1000,
    });
    expect(r.session.state).toBe("RESOLVED");
    expect(r.session.quarantine_cleared_at).toBeDefined();
    expect(eng.listClearances()).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Resolve (non-quarantine)
// ──────────────────────────────────────────────────────────────────────

describe("resolveSession", () => {
  it("resolves WET_PASS → RESOLVED with advance", () => {
    seed(eng);
    const s = eng.resolveSession({
      session_id: "S1",
      resolution: "advance",
      notes: "5 consecutive passed parts, ready to advance",
    });
    expect(s.state).toBe("RESOLVED");
    expect(s.resolution).toBe("advance");
  });

  it("blocks resolveSession on QUARANTINE", () => {
    seed(eng);
    eng.recordSafetyEvent({
      session_id: "S1",
      kind: "tool_breakage",
      severity: "high",
      detail: "drill snapped during pecking",
    });
    expect(() =>
      eng.resolveSession({ session_id: "S1", resolution: "advance", notes: "ignore anyway" }),
    ).toThrow(/clearQuarantine/);
  });

  it("rejects short notes", () => {
    seed(eng);
    expect(() =>
      eng.resolveSession({ session_id: "S1", resolution: "abort", notes: "done" }),
    ).toThrow(/notes/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Stats + audit
// ──────────────────────────────────────────────────────────────────────

describe("stats + audit queries", () => {
  it("by_state aggregates current states", () => {
    seed(eng, "S1");
    seed(eng, "S2");
    eng.recordPartOutcome({ session_id: "S2", passed: false, root_cause: "dimensional out of tol - bore" });
    const stats = eng.getStats();
    expect(stats.total_sessions).toBe(2);
    expect(stats.by_state.WET_PASS).toBe(1);
    expect(stats.by_state.WET_SOFT_FAIL).toBe(1);
  });

  it("listTransitions + listScrapEvents + listSafetyEvents", () => {
    seed(eng);
    eng.recordPartOutcome({ session_id: "S1", passed: false, root_cause: "first scrap cause long enough" });
    eng.recordSafetyEvent({
      session_id: "S1",
      kind: "kill_switch_l2",
      severity: "critical",
      detail: "feedhold on watchdog timeout",
    });
    expect(eng.listScrapEvents("S1")).toHaveLength(1);
    expect(eng.listSafetyEvents("S1")).toHaveLength(1);
    const trans = eng.listTransitions({ session_id: "S1" });
    expect(trans.length).toBeGreaterThanOrEqual(2);
  });

  it("clearAll resets state", () => {
    seed(eng);
    eng.recordPartOutcome({ session_id: "S1", passed: false, root_cause: "scrap cause explanation" });
    eng.clearAll();
    expect(eng.getStats().total_sessions).toBe(0);
    expect(eng.listTransitions()).toHaveLength(0);
  });
});

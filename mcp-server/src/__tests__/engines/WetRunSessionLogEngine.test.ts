/**
 * WetRunSessionLogEngine tests (U-LPR-WETRUN-LOG)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WetRunSessionLogEngine,
  type SessionOpen,
} from "../../engines/WetRunSessionLogEngine.js";

let eng: WetRunSessionLogEngine;

const T0 = 1_000_000_000_000;
const MIN = 60 * 1000;

function openInput(overrides: Partial<SessionOpen> = {}): SessionOpen {
  return {
    session_id: "SES-2026-04-19-01",
    auth_decision_id: "AUTH-DEC-001",
    operator: "shop-lead",
    opened_at: T0,
    machine_id: "OKUMA-LB3000",
    program_id: "PGM-1234-R5",
    ...overrides,
  };
}

beforeEach(() => {
  eng = new WetRunSessionLogEngine();
});

// ─────────────────────────────────────────────────────────
// openSession
// ─────────────────────────────────────────────────────────

describe("openSession", () => {
  it("records SESSION_OPEN as the first event at seq=0", () => {
    const s = eng.openSession(openInput());
    expect(s.events).toHaveLength(1);
    expect(s.events[0].kind).toBe("SESSION_OPEN");
    expect(s.events[0].seq).toBe(0);
    expect(s.closed_outcome).toBe("IN_PROGRESS");
  });

  it("rejects empty session_id", () => {
    expect(() => eng.openSession(openInput({ session_id: " " }))).toThrow(
      /session_id/,
    );
  });

  it("rejects empty auth_decision_id", () => {
    expect(() =>
      eng.openSession(openInput({ auth_decision_id: "" })),
    ).toThrow(/auth_decision_id/);
  });

  it("rejects empty operator", () => {
    expect(() => eng.openSession(openInput({ operator: "" }))).toThrow(
      /operator/,
    );
  });

  it("rejects empty machine_id", () => {
    expect(() => eng.openSession(openInput({ machine_id: "" }))).toThrow(
      /machine_id/,
    );
  });

  it("rejects empty program_id", () => {
    expect(() => eng.openSession(openInput({ program_id: "" }))).toThrow(
      /program_id/,
    );
  });

  it("rejects non-positive opened_at", () => {
    expect(() => eng.openSession(openInput({ opened_at: 0 }))).toThrow(
      /opened_at/,
    );
  });

  it("rejects duplicate session_id", () => {
    eng.openSession(openInput());
    expect(() => eng.openSession(openInput())).toThrow(/already open/);
  });
});

// ─────────────────────────────────────────────────────────
// append — validation
// ─────────────────────────────────────────────────────────

describe("append validation", () => {
  beforeEach(() => {
    eng.openSession(openInput());
  });

  it("appends a BLOCK_EXEC event", () => {
    const e = eng.append("SES-2026-04-19-01", {
      kind: "BLOCK_EXEC",
      ts: T0 + 1 * MIN,
      n_number: 100,
    });
    expect(e.seq).toBe(1);
    expect(e.n_number).toBe(100);
  });

  it("rejects SESSION_OPEN via append", () => {
    expect(() =>
      eng.append("SES-2026-04-19-01", {
        kind: "SESSION_OPEN",
        ts: T0 + 1,
      }),
    ).toThrow(/SESSION_OPEN/);
  });

  it("rejects SESSION_CLOSE via append", () => {
    expect(() =>
      eng.append("SES-2026-04-19-01", {
        kind: "SESSION_CLOSE",
        ts: T0 + 1,
      }),
    ).toThrow(/SESSION_CLOSE/);
  });

  it("rejects backwards-in-time ts", () => {
    eng.append("SES-2026-04-19-01", {
      kind: "BLOCK_EXEC",
      ts: T0 + 10,
      n_number: 100,
    });
    expect(() =>
      eng.append("SES-2026-04-19-01", {
        kind: "BLOCK_EXEC",
        ts: T0 + 5,
        n_number: 101,
      }),
    ).toThrow(/precedes/);
  });

  it("rejects non-positive ts", () => {
    expect(() =>
      eng.append("SES-2026-04-19-01", {
        kind: "BLOCK_EXEC",
        ts: 0,
        n_number: 100,
      }),
    ).toThrow(/ts/);
  });

  it("rejects unknown session", () => {
    expect(() =>
      eng.append("missing", { kind: "BLOCK_EXEC", ts: 1, n_number: 1 }),
    ).toThrow(/not found/);
  });

  it("rejects BLOCK_EXEC without n_number", () => {
    expect(() =>
      eng.append("SES-2026-04-19-01", {
        kind: "BLOCK_EXEC",
        ts: T0 + 1,
      }),
    ).toThrow(/n_number/);
  });

  it("rejects TOOL_CHANGE without tool_id", () => {
    expect(() =>
      eng.append("SES-2026-04-19-01", {
        kind: "TOOL_CHANGE",
        ts: T0 + 1,
      }),
    ).toThrow(/tool_id/);
  });

  it("rejects ALARM without alarm_code", () => {
    expect(() =>
      eng.append("SES-2026-04-19-01", { kind: "ALARM", ts: T0 + 1 }),
    ).toThrow(/alarm_code/);
  });

  it("rejects COOLANT_TOGGLE without coolant_on", () => {
    expect(() =>
      eng.append("SES-2026-04-19-01", {
        kind: "COOLANT_TOGGLE",
        ts: T0 + 1,
      }),
    ).toThrow(/coolant_on/);
  });
});

// ─────────────────────────────────────────────────────────
// override bounds
// ─────────────────────────────────────────────────────────

describe("override bounds", () => {
  beforeEach(() => {
    eng.openSession(openInput());
  });

  it("accepts spindle override in range", () => {
    const e = eng.append("SES-2026-04-19-01", {
      kind: "SPINDLE_OVERRIDE",
      ts: T0 + 1,
      override_percent: 120,
    });
    expect(e.override_percent).toBe(120);
  });

  it("accepts feed override at 0 (rapid halt)", () => {
    const e = eng.append("SES-2026-04-19-01", {
      kind: "FEED_OVERRIDE",
      ts: T0 + 1,
      override_percent: 0,
    });
    expect(e.override_percent).toBe(0);
  });

  it("rejects override percent missing", () => {
    expect(() =>
      eng.append("SES-2026-04-19-01", {
        kind: "SPINDLE_OVERRIDE",
        ts: T0 + 1,
      }),
    ).toThrow(/override_percent/);
  });

  it("rejects override percent below 0", () => {
    expect(() =>
      eng.append("SES-2026-04-19-01", {
        kind: "FEED_OVERRIDE",
        ts: T0 + 1,
        override_percent: -5,
      }),
    ).toThrow(/\[0, 200\]/);
  });

  it("rejects override percent above 200", () => {
    expect(() =>
      eng.append("SES-2026-04-19-01", {
        kind: "SPINDLE_OVERRIDE",
        ts: T0 + 1,
        override_percent: 300,
      }),
    ).toThrow(/\[0, 200\]/);
  });
});

// ─────────────────────────────────────────────────────────
// closeSession
// ─────────────────────────────────────────────────────────

describe("closeSession", () => {
  beforeEach(() => {
    eng.openSession(openInput());
  });

  it("closes cleanly and appends SESSION_CLOSE", () => {
    const s = eng.closeSession({
      session_id: "SES-2026-04-19-01",
      closed_at: T0 + 30 * MIN,
      closed_by: "shop-lead",
      outcome: "COMPLETED",
    });
    expect(s.closed_outcome).toBe("COMPLETED");
    expect(s.events[s.events.length - 1].kind).toBe("SESSION_CLOSE");
  });

  it("rejects append after close", () => {
    eng.closeSession({
      session_id: "SES-2026-04-19-01",
      closed_at: T0 + 30 * MIN,
      closed_by: "shop-lead",
      outcome: "COMPLETED",
    });
    expect(() =>
      eng.append("SES-2026-04-19-01", {
        kind: "BLOCK_EXEC",
        ts: T0 + 31 * MIN,
        n_number: 100,
      }),
    ).toThrow(/closed/);
  });

  it("rejects double close", () => {
    eng.closeSession({
      session_id: "SES-2026-04-19-01",
      closed_at: T0 + 30 * MIN,
      closed_by: "shop-lead",
      outcome: "COMPLETED",
    });
    expect(() =>
      eng.closeSession({
        session_id: "SES-2026-04-19-01",
        closed_at: T0 + 31 * MIN,
        closed_by: "shop-lead",
        outcome: "COMPLETED",
      }),
    ).toThrow(/already closed/);
  });

  it("rejects close with ts before last event", () => {
    eng.append("SES-2026-04-19-01", {
      kind: "BLOCK_EXEC",
      ts: T0 + 10 * MIN,
      n_number: 200,
    });
    expect(() =>
      eng.closeSession({
        session_id: "SES-2026-04-19-01",
        closed_at: T0 + 5 * MIN,
        closed_by: "shop-lead",
        outcome: "COMPLETED",
      }),
    ).toThrow(/closed_at/);
  });

  it("rejects empty closed_by", () => {
    expect(() =>
      eng.closeSession({
        session_id: "SES-2026-04-19-01",
        closed_at: T0 + 30 * MIN,
        closed_by: " ",
        outcome: "COMPLETED",
      }),
    ).toThrow(/closed_by/);
  });
});

// ─────────────────────────────────────────────────────────
// OPERATOR_ABORT auto-close
// ─────────────────────────────────────────────────────────

describe("OPERATOR_ABORT auto-close", () => {
  it("auto-closes with outcome=ABORTED and appends SESSION_CLOSE", () => {
    eng.openSession(openInput());
    eng.append("SES-2026-04-19-01", {
      kind: "OPERATOR_ABORT",
      ts: T0 + 5 * MIN,
      operator: "shop-lead",
      note: "collision detected",
    });
    const s = eng.getSession("SES-2026-04-19-01")!;
    expect(s.closed_outcome).toBe("ABORTED");
    expect(s.closed_at).toBe(T0 + 5 * MIN);
    expect(s.events[s.events.length - 1].kind).toBe("SESSION_CLOSE");
  });

  it("further appends after abort throw", () => {
    eng.openSession(openInput());
    eng.append("SES-2026-04-19-01", {
      kind: "OPERATOR_ABORT",
      ts: T0 + 5 * MIN,
      operator: "shop-lead",
    });
    expect(() =>
      eng.append("SES-2026-04-19-01", {
        kind: "BLOCK_EXEC",
        ts: T0 + 6 * MIN,
        n_number: 100,
      }),
    ).toThrow(/closed/);
  });
});

// ─────────────────────────────────────────────────────────
// summarise
// ─────────────────────────────────────────────────────────

describe("summarise", () => {
  beforeEach(() => {
    eng.openSession(openInput());
  });

  it("counts block execs, overrides, tool changes, alarms", () => {
    eng.append("SES-2026-04-19-01", {
      kind: "BLOCK_EXEC",
      ts: T0 + 1 * MIN,
      n_number: 100,
    });
    eng.append("SES-2026-04-19-01", {
      kind: "BLOCK_EXEC",
      ts: T0 + 2 * MIN,
      n_number: 110,
    });
    eng.append("SES-2026-04-19-01", {
      kind: "SPINDLE_OVERRIDE",
      ts: T0 + 3 * MIN,
      override_percent: 90,
    });
    eng.append("SES-2026-04-19-01", {
      kind: "FEED_OVERRIDE",
      ts: T0 + 4 * MIN,
      override_percent: 85,
    });
    eng.append("SES-2026-04-19-01", {
      kind: "TOOL_CHANGE",
      ts: T0 + 5 * MIN,
      tool_id: "T05",
    });
    eng.append("SES-2026-04-19-01", {
      kind: "ALARM",
      ts: T0 + 6 * MIN,
      alarm_code: "E2001",
    });
    eng.append("SES-2026-04-19-01", {
      kind: "ALARM",
      ts: T0 + 7 * MIN,
      alarm_code: "E2001",
    });
    eng.append("SES-2026-04-19-01", {
      kind: "COOLANT_TOGGLE",
      ts: T0 + 8 * MIN,
      coolant_on: true,
    });
    const s = eng.summarise("SES-2026-04-19-01");
    expect(s.block_count).toBe(2);
    expect(s.spindle_override_events).toBe(1);
    expect(s.feed_override_events).toBe(1);
    expect(s.tool_change_count).toBe(1);
    expect(s.alarm_count).toBe(2);
    expect(s.alarm_codes).toEqual(["E2001"]); // deduped
    expect(s.coolant_toggle_events).toBe(1);
  });

  it("measures longest pause between PAUSE and RESUME", () => {
    eng.append("SES-2026-04-19-01", {
      kind: "OPERATOR_PAUSE",
      ts: T0 + 1 * MIN,
    });
    eng.append("SES-2026-04-19-01", {
      kind: "OPERATOR_RESUME",
      ts: T0 + 3 * MIN,
    });
    eng.append("SES-2026-04-19-01", {
      kind: "OPERATOR_PAUSE",
      ts: T0 + 4 * MIN,
    });
    eng.append("SES-2026-04-19-01", {
      kind: "OPERATOR_RESUME",
      ts: T0 + 8 * MIN,
    });
    const s = eng.summarise("SES-2026-04-19-01");
    expect(s.pause_count).toBe(2);
    expect(s.longest_pause_ms).toBe(4 * MIN);
  });

  it("unresolved pause counts duration up to close", () => {
    eng.append("SES-2026-04-19-01", {
      kind: "OPERATOR_PAUSE",
      ts: T0 + 1 * MIN,
    });
    eng.closeSession({
      session_id: "SES-2026-04-19-01",
      closed_at: T0 + 10 * MIN,
      closed_by: "shop-lead",
      outcome: "COMPLETED",
    });
    const s = eng.summarise("SES-2026-04-19-01");
    expect(s.longest_pause_ms).toBe(9 * MIN);
  });

  it("exposes abort event on summary", () => {
    eng.append("SES-2026-04-19-01", {
      kind: "OPERATOR_ABORT",
      ts: T0 + 1 * MIN,
    });
    const s = eng.summarise("SES-2026-04-19-01");
    expect(s.abort_event).toBeDefined();
    expect(s.outcome).toBe("ABORTED");
  });

  it("reports in-progress duration when no close", () => {
    eng.append("SES-2026-04-19-01", {
      kind: "BLOCK_EXEC",
      ts: T0 + 5 * MIN,
      n_number: 100,
    });
    const s = eng.summarise("SES-2026-04-19-01");
    expect(s.outcome).toBe("IN_PROGRESS");
    expect(s.duration_ms).toBe(5 * MIN);
  });
});

// ─────────────────────────────────────────────────────────
// listSessions / snapshot
// ─────────────────────────────────────────────────────────

describe("listSessions + snapshot", () => {
  it("filters by outcome + operator", () => {
    eng.openSession(openInput());
    eng.openSession(
      openInput({ session_id: "SES-02", operator: "apprentice" }),
    );
    eng.closeSession({
      session_id: "SES-2026-04-19-01",
      closed_at: T0 + 10 * MIN,
      closed_by: "shop-lead",
      outcome: "COMPLETED",
    });
    expect(eng.listSessions({ outcome: "COMPLETED" })).toHaveLength(1);
    expect(eng.listSessions({ operator: "apprentice" })).toHaveLength(1);
    expect(eng.listSessions()).toHaveLength(2);
  });

  it("round-trips with schemaVersion 1", () => {
    eng.openSession(openInput());
    eng.append("SES-2026-04-19-01", {
      kind: "BLOCK_EXEC",
      ts: T0 + 1,
      n_number: 100,
    });
    const snap = eng.toSnapshot();
    expect(snap.schemaVersion).toBe(1);
    const eng2 = new WetRunSessionLogEngine();
    eng2.loadSnapshot(snap);
    const s = eng2.getSession("SES-2026-04-19-01");
    expect(s?.events).toHaveLength(2);
  });

  it("rejects unknown schemaVersion", () => {
    expect(() =>
      eng.loadSnapshot({ schemaVersion: 99, sessions: [] }),
    ).toThrow(/schemaVersion/);
  });

  it("getSession returns null when missing", () => {
    expect(eng.getSession("nope")).toBeNull();
  });

  it("clearAll empties state", () => {
    eng.openSession(openInput());
    eng.clearAll();
    expect(eng.listSessions()).toHaveLength(0);
  });
});

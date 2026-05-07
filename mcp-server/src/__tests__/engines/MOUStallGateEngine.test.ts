/**
 * MOUStallGateEngine tests (U-LPR-STALL-MOU)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  MOUStallGateEngine,
  type BlockerRegistration,
} from "../../engines/MOUStallGateEngine.js";

let eng: MOUStallGateEngine;

const T0 = 1_000_000_000_000; // fixed kickoff
const DAY = 24 * 3600 * 1000;

function reg(overrides: Partial<BlockerRegistration> = {}): BlockerRegistration {
  return {
    blocker_id: "MOU-JMDIE-V2",
    title: "JM Die MOU v2",
    kickoff_ts: T0,
    deadline_ms: 10 * DAY,
    owner: "ops-lead",
    dependent_units: ["U-LPR-WETRUN-01", "U-LPR-WETRUN-02"],
    criticality: "critical",
    ...overrides,
  };
}

beforeEach(() => {
  eng = new MOUStallGateEngine();
});

// ─────────────────────────────────────────────────────────────────────
// register validation
// ─────────────────────────────────────────────────────────────────────

describe("register", () => {
  it("accepts a valid blocker and computes deadline_ts", () => {
    const r = eng.register(reg());
    expect(r.status).toBe("open");
    expect(r.deadline_ts).toBe(T0 + 10 * DAY);
    expect(r.deferred_units).toEqual([]);
  });

  it("rejects empty blocker_id", () => {
    expect(() => eng.register(reg({ blocker_id: "  " }))).toThrow(/blocker_id/);
  });

  it("rejects empty title", () => {
    expect(() => eng.register(reg({ title: "" }))).toThrow(/title/);
  });

  it("rejects empty owner", () => {
    expect(() => eng.register(reg({ owner: "" }))).toThrow(/owner/);
  });

  it("rejects non-positive kickoff_ts", () => {
    expect(() => eng.register(reg({ kickoff_ts: 0 }))).toThrow(/kickoff_ts/);
    expect(() => eng.register(reg({ kickoff_ts: -1 }))).toThrow(/kickoff_ts/);
  });

  it("rejects non-positive deadline_ms", () => {
    expect(() => eng.register(reg({ deadline_ms: 0 }))).toThrow(/deadline_ms/);
    expect(() => eng.register(reg({ deadline_ms: -5 }))).toThrow(/deadline_ms/);
  });

  it("rejects duplicate blocker_id", () => {
    eng.register(reg());
    expect(() => eng.register(reg())).toThrow(/already registered/);
  });

  it("rejects empty dependent_units", () => {
    expect(() => eng.register(reg({ dependent_units: [] }))).toThrow(
      /dependent_unit/,
    );
  });

  it("snapshot is defensively cloned", () => {
    const deps = ["A", "B"];
    const r = eng.register(reg({ dependent_units: deps }));
    deps.push("C");
    expect(r.dependent_units).toEqual(["A", "B"]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// sign
// ─────────────────────────────────────────────────────────────────────

describe("sign", () => {
  beforeEach(() => {
    eng.register(reg());
  });

  it("signs an open blocker", () => {
    const r = eng.sign({
      blocker_id: "MOU-JMDIE-V2",
      signed_at: T0 + 5 * DAY,
      signed_by: "legal-counsel",
    });
    expect(r.status).toBe("signed");
    expect(r.signed_at).toBe(T0 + 5 * DAY);
    expect(r.signed_by).toBe("legal-counsel");
    expect(r.cleared_at).toBeUndefined();
  });

  it("rejects sign on unknown blocker", () => {
    expect(() =>
      eng.sign({
        blocker_id: "missing",
        signed_at: T0 + 1,
        signed_by: "x",
      }),
    ).toThrow(/not found/);
  });

  it("rejects double-sign", () => {
    eng.sign({ blocker_id: "MOU-JMDIE-V2", signed_at: T0 + 1, signed_by: "x" });
    expect(() =>
      eng.sign({ blocker_id: "MOU-JMDIE-V2", signed_at: T0 + 2, signed_by: "y" }),
    ).toThrow(/already signed/);
  });

  it("rejects sign on cancelled blocker", () => {
    eng.cancel({
      blocker_id: "MOU-JMDIE-V2",
      cancelled_at: T0 + 1,
      reason: "procurement pulled contract scope entirely",
    });
    expect(() =>
      eng.sign({ blocker_id: "MOU-JMDIE-V2", signed_at: T0 + 2, signed_by: "x" }),
    ).toThrow(/cancelled/);
  });

  it("rejects empty signed_by", () => {
    expect(() =>
      eng.sign({ blocker_id: "MOU-JMDIE-V2", signed_at: T0 + 1, signed_by: "  " }),
    ).toThrow(/signed_by/);
  });

  it("rejects signed_at before kickoff_ts", () => {
    expect(() =>
      eng.sign({
        blocker_id: "MOU-JMDIE-V2",
        signed_at: T0 - 1,
        signed_by: "x",
      }),
    ).toThrow(/signed_at/);
  });

  it("clears stall when signing a stalled blocker", () => {
    eng.sweepDeadlines(T0 + 11 * DAY);
    const r = eng.sign({
      blocker_id: "MOU-JMDIE-V2",
      signed_at: T0 + 12 * DAY,
      signed_by: "legal",
    });
    expect(r.status).toBe("signed");
    expect(r.cleared_at).toBe(T0 + 12 * DAY);
    // Deferred units stay flagged until explicit resume
    expect(r.deferred_units.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// waive
// ─────────────────────────────────────────────────────────────────────

describe("waive", () => {
  beforeEach(() => {
    eng.register(reg());
  });

  const longReason =
    "Legal approved proceeding without signature due to emergency customer pilot schedule — formal MOU to follow within 30 days per attached LOI.";

  it("waives an open blocker with valid justification", () => {
    const r = eng.waive({
      blocker_id: "MOU-JMDIE-V2",
      waived_at: T0 + 2 * DAY,
      waived_by: "legal-counsel",
      reason: longReason,
    });
    expect(r.status).toBe("waived");
    expect(r.waived_by).toBe("legal-counsel");
    expect(r.waiver_reason).toBe(longReason);
  });

  it("rejects waive with short reason", () => {
    expect(() =>
      eng.waive({
        blocker_id: "MOU-JMDIE-V2",
        waived_at: T0 + 1,
        waived_by: "legal",
        reason: "too short",
      }),
    ).toThrow(/reason/);
  });

  it("rejects waive with empty approver", () => {
    expect(() =>
      eng.waive({
        blocker_id: "MOU-JMDIE-V2",
        waived_at: T0 + 1,
        waived_by: "",
        reason: longReason,
      }),
    ).toThrow(/waived_by/);
  });

  it("rejects waive of signed blocker", () => {
    eng.sign({ blocker_id: "MOU-JMDIE-V2", signed_at: T0 + 1, signed_by: "x" });
    expect(() =>
      eng.waive({
        blocker_id: "MOU-JMDIE-V2",
        waived_at: T0 + 2,
        waived_by: "y",
        reason: longReason,
      }),
    ).toThrow(/signed/);
  });

  it("waive after stall records cleared_at", () => {
    eng.sweepDeadlines(T0 + 11 * DAY);
    const r = eng.waive({
      blocker_id: "MOU-JMDIE-V2",
      waived_at: T0 + 12 * DAY,
      waived_by: "legal",
      reason: longReason,
    });
    expect(r.cleared_at).toBe(T0 + 12 * DAY);
  });
});

// ─────────────────────────────────────────────────────────────────────
// cancel
// ─────────────────────────────────────────────────────────────────────

describe("cancel", () => {
  beforeEach(() => {
    eng.register(reg());
  });

  it("cancels open blocker and defers all dependent units", () => {
    const r = eng.cancel({
      blocker_id: "MOU-JMDIE-V2",
      cancelled_at: T0 + 1,
      reason: "procurement pulled the contract scope",
    });
    expect(r.status).toBe("cancelled");
    expect(r.deferred_units).toEqual(["U-LPR-WETRUN-01", "U-LPR-WETRUN-02"]);
  });

  it("rejects cancel with short reason", () => {
    expect(() =>
      eng.cancel({
        blocker_id: "MOU-JMDIE-V2",
        cancelled_at: T0 + 1,
        reason: "nope",
      }),
    ).toThrow(/reason/);
  });

  it("rejects cancel on signed blocker", () => {
    eng.sign({ blocker_id: "MOU-JMDIE-V2", signed_at: T0 + 1, signed_by: "x" });
    expect(() =>
      eng.cancel({
        blocker_id: "MOU-JMDIE-V2",
        cancelled_at: T0 + 2,
        reason: "trying to pull back the contract after the fact",
      }),
    ).toThrow(/signed/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// sweepDeadlines
// ─────────────────────────────────────────────────────────────────────

describe("sweepDeadlines", () => {
  it("transitions open past-deadline blockers to stalled", () => {
    eng.register(reg());
    const moved = eng.sweepDeadlines(T0 + 11 * DAY);
    expect(moved).toHaveLength(1);
    expect(moved[0].status).toBe("stalled");
    expect(moved[0].stalled_at).toBe(T0 + 11 * DAY);
    expect(moved[0].deferred_units).toEqual([
      "U-LPR-WETRUN-01",
      "U-LPR-WETRUN-02",
    ]);
  });

  it("does not re-transition already-stalled blockers", () => {
    eng.register(reg());
    eng.sweepDeadlines(T0 + 11 * DAY);
    const second = eng.sweepDeadlines(T0 + 12 * DAY);
    expect(second).toHaveLength(0);
  });

  it("leaves open blockers still within deadline alone", () => {
    eng.register(reg());
    const moved = eng.sweepDeadlines(T0 + 5 * DAY);
    expect(moved).toHaveLength(0);
    expect(eng.getBlocker("MOU-JMDIE-V2")!.status).toBe("open");
  });

  it("ignores signed / waived blockers", () => {
    eng.register(reg());
    eng.sign({ blocker_id: "MOU-JMDIE-V2", signed_at: T0 + 1, signed_by: "x" });
    const moved = eng.sweepDeadlines(T0 + 30 * DAY);
    expect(moved).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// computeGate
// ─────────────────────────────────────────────────────────────────────

describe("computeGate", () => {
  it("returns full mode when all blockers signed", () => {
    eng.register(reg());
    eng.sign({ blocker_id: "MOU-JMDIE-V2", signed_at: T0 + 1, signed_by: "x" });
    const g = eng.computeGate(T0 + 2 * DAY);
    expect(g.mode).toBe("full");
    expect(g.deferred_units).toEqual([]);
  });

  it("returns full mode when empty", () => {
    expect(eng.computeGate(T0).mode).toBe("full");
  });

  it("returns dry_run_only when any blocker stalled", () => {
    eng.register(reg());
    eng.sweepDeadlines(T0 + 11 * DAY);
    const g = eng.computeGate(T0 + 12 * DAY);
    expect(g.mode).toBe("dry_run_only");
    expect(g.stalled_blockers).toContain("MOU-JMDIE-V2");
    expect(g.deferred_units).toContain("U-LPR-WETRUN-01");
  });

  it("defensively treats open-past-deadline as stalled even without sweep", () => {
    eng.register(reg());
    const g = eng.computeGate(T0 + 11 * DAY);
    expect(g.mode).toBe("dry_run_only");
    expect(g.stalled_blockers).toContain("MOU-JMDIE-V2");
    expect(g.deferred_units).toContain("U-LPR-WETRUN-01");
    expect(g.deferred_units).toContain("U-LPR-WETRUN-02");
  });

  it("returns blocked when any blocker cancelled", () => {
    eng.register(reg());
    eng.cancel({
      blocker_id: "MOU-JMDIE-V2",
      cancelled_at: T0 + 1,
      reason: "procurement withdrew the deal",
    });
    const g = eng.computeGate(T0 + 2);
    expect(g.mode).toBe("blocked");
    expect(g.blocked_blockers).toContain("MOU-JMDIE-V2");
  });

  it("cancelled trumps signed on a different blocker (still blocked)", () => {
    eng.register(reg());
    eng.register(
      reg({
        blocker_id: "NDA-CUST-A",
        title: "Customer A NDA",
        dependent_units: ["U-LPR-WETRUN-03"],
      }),
    );
    eng.sign({ blocker_id: "MOU-JMDIE-V2", signed_at: T0 + 1, signed_by: "x" });
    eng.cancel({
      blocker_id: "NDA-CUST-A",
      cancelled_at: T0 + 2,
      reason: "customer withdrew participation last week",
    });
    expect(eng.computeGate(T0 + 3).mode).toBe("blocked");
  });

  it("waived blockers are listed but do not gate work", () => {
    eng.register(reg());
    eng.waive({
      blocker_id: "MOU-JMDIE-V2",
      waived_at: T0 + 1,
      waived_by: "legal",
      reason:
        "Legal authorised proceeding under LOI while formal MOU is finalised over the next month.",
    });
    const g = eng.computeGate(T0 + 2 * DAY);
    expect(g.mode).toBe("full");
    expect(g.waived_blockers).toContain("MOU-JMDIE-V2");
  });
});

// ─────────────────────────────────────────────────────────────────────
// resumeDeferredUnits
// ─────────────────────────────────────────────────────────────────────

describe("resumeDeferredUnits", () => {
  beforeEach(() => {
    eng.register(reg());
    eng.sweepDeadlines(T0 + 11 * DAY);
  });

  it("requires signed or waived status", () => {
    expect(() => eng.resumeDeferredUnits("MOU-JMDIE-V2")).toThrow(
      /signed\|waived/,
    );
  });

  it("returns moved count after sign", () => {
    eng.sign({
      blocker_id: "MOU-JMDIE-V2",
      signed_at: T0 + 12 * DAY,
      signed_by: "legal",
    });
    expect(eng.resumeDeferredUnits("MOU-JMDIE-V2")).toBe(2);
    expect(eng.getBlocker("MOU-JMDIE-V2")!.deferred_units).toEqual([]);
  });

  it("rejects unknown blocker", () => {
    expect(() => eng.resumeDeferredUnits("missing")).toThrow(/not found/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// listBlockers / getBlocker
// ─────────────────────────────────────────────────────────────────────

describe("listBlockers", () => {
  it("filters by status", () => {
    eng.register(reg());
    eng.register(
      reg({
        blocker_id: "NDA-CUST-A",
        dependent_units: ["U-LPR-WETRUN-03"],
      }),
    );
    eng.sign({ blocker_id: "MOU-JMDIE-V2", signed_at: T0 + 1, signed_by: "x" });
    expect(eng.listBlockers({ status: "signed" })).toHaveLength(1);
    expect(eng.listBlockers({ status: "open" })).toHaveLength(1);
    expect(eng.listBlockers()).toHaveLength(2);
  });

  it("getBlocker returns null when missing", () => {
    expect(eng.getBlocker("nope")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────
// snapshot persistence
// ─────────────────────────────────────────────────────────────────────

describe("toSnapshot + loadSnapshot", () => {
  it("round-trips state with schemaVersion 1", () => {
    eng.register(reg());
    eng.sweepDeadlines(T0 + 11 * DAY);
    const snap = eng.toSnapshot();
    expect(snap.schemaVersion).toBe(1);
    expect(snap.blockers).toHaveLength(1);
    const eng2 = new MOUStallGateEngine();
    eng2.loadSnapshot(snap);
    const g = eng2.computeGate(T0 + 12 * DAY);
    expect(g.mode).toBe("dry_run_only");
  });

  it("rejects unknown schemaVersion", () => {
    expect(() =>
      eng.loadSnapshot({ schemaVersion: 99, blockers: [] }),
    ).toThrow(/schemaVersion/);
  });

  it("clearAll empties state", () => {
    eng.register(reg());
    eng.clearAll();
    expect(eng.listBlockers()).toHaveLength(0);
  });
});

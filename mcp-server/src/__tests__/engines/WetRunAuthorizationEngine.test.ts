/**
 * WetRunAuthorizationEngine tests (U-LPR-WETRUN-AUTH)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WetRunAuthorizationEngine,
  type AuthRequest,
  type OverrideToken,
} from "../../engines/WetRunAuthorizationEngine.js";
import type { KickoffVerdict } from "../../engines/PreMOUKickoffChecklistEngine.js";
import type { GateDecision } from "../../engines/MOUStallGateEngine.js";
import type { DiffGateReport } from "../../engines/RegressionBaselineEngine.js";

let eng: WetRunAuthorizationEngine;

const T0 = 1_000_000_000_000;
const DAY = 24 * 3600 * 1000;

function kickoffOk(): KickoffVerdict {
  return { ok: true, total: 10, verified: 9, waived: 1, pending: 0, gaps: [] };
}

function kickoffBad(): KickoffVerdict {
  return {
    ok: false,
    total: 10,
    verified: 5,
    waived: 1,
    pending: 4,
    gaps: [
      { item_id: "NDA_SIGNED", reason: "NDA — CRITICAL, not yet verified" },
      { item_id: "POC_CONFIRMED", reason: "POC — pending" },
      { item_id: "MATERIAL_AVAILABILITY", reason: "Material — pending" },
      { item_id: "TOOLING_AVAILABILITY", reason: "Tooling — pending" },
    ],
  };
}

function mouFull(): GateDecision {
  return {
    mode: "full",
    reasons: [],
    stalled_blockers: [],
    blocked_blockers: [],
    waived_blockers: [],
    deferred_units: [],
  };
}

function mouDryOnly(): GateDecision {
  return {
    mode: "dry_run_only",
    reasons: ["MOU-JMDIE-V2 stalled past deadline"],
    stalled_blockers: ["MOU-JMDIE-V2"],
    blocked_blockers: [],
    waived_blockers: [],
    deferred_units: ["U-LPR-WETRUN-01"],
  };
}

function mouBlocked(): GateDecision {
  return {
    mode: "blocked",
    reasons: ["NDA-CUST-A cancelled"],
    stalled_blockers: [],
    blocked_blockers: ["NDA-CUST-A"],
    waived_blockers: [],
    deferred_units: ["U-LPR-WETRUN-03"],
  };
}

function regOk(): DiffGateReport {
  return {
    runs_evaluated: 200,
    hard_breaches: [],
    soft_breaches: [],
    missing_tests: [],
    new_tests: [],
    passed: true,
  };
}

function regFail(): DiffGateReport {
  return {
    runs_evaluated: 200,
    hard_breaches: [
      {
        test_id: "lathe.roughing.01",
        kind: "RESULT_DIFF",
        severity: "hard",
        detail: "hash mismatch",
        observed: "deadbeef",
        expected: "cafef00d",
      },
    ],
    soft_breaches: [],
    missing_tests: [],
    new_tests: [],
    passed: false,
  };
}

function req(overrides: Partial<AuthRequest> = {}): AuthRequest {
  return {
    session_id: "SES-2026-04-19-01",
    kickoff_id: "KICK-JMDIE-2026Q2",
    requested_mode: "wet_run",
    requested_at: T0,
    requested_by: "ops-lead",
    ...overrides,
  };
}

const LONG_REASON =
  "Emergency wet-run authorised by legal and engineering VP to meet contract-specified pilot window; formal MOU signature arriving tomorrow per the attached LOI.";

function override(overrides: Partial<OverrideToken> = {}): OverrideToken {
  return {
    override_id: "OVR-2026-01",
    approved_by: "legal-vp",
    reason: LONG_REASON,
    approved_at: T0 - 1 * DAY,
    expires_at: T0 + 1 * DAY,
    scope: ["G2_MOU"],
    ...overrides,
  };
}

beforeEach(() => {
  eng = new WetRunAuthorizationEngine();
});

// ─────────────────────────────────────────────────────────
// happy paths
// ─────────────────────────────────────────────────────────

describe("happy paths", () => {
  it("authorises wet-run when all three gates pass", () => {
    const d = eng.authorize(req(), {
      kickoff: kickoffOk(),
      mou: mouFull(),
      regression: regOk(),
    });
    expect(d.verdict).toBe("AUTHORIZED");
    expect(d.effective_mode).toBe("wet_run");
    expect(d.blocking_gate).toBeUndefined();
    for (const g of d.gates) expect(g.status).toBe("passed");
  });

  it("authorises dry-run even when MOU is dry_run_only", () => {
    const d = eng.authorize(req({ requested_mode: "dry_run" }), {
      kickoff: kickoffOk(),
      mou: mouDryOnly(),
      regression: regOk(),
    });
    expect(d.verdict).toBe("AUTHORIZED");
    expect(d.effective_mode).toBe("dry_run");
  });

  it("authorises dry-run when regression fails (dry can't touch machines)", () => {
    const d = eng.authorize(req({ requested_mode: "dry_run" }), {
      kickoff: kickoffOk(),
      mou: mouFull(),
      regression: regFail(),
    });
    expect(d.verdict).toBe("AUTHORIZED");
    const g3 = d.gates.find((g) => g.gate === "G3_REGRESSION")!;
    expect(g3.status).toBe("passed");
    expect(g3.summary).toMatch(/dry-run/);
  });
});

// ─────────────────────────────────────────────────────────
// G1 kickoff blocks everything
// ─────────────────────────────────────────────────────────

describe("G1 kickoff", () => {
  it("blocks wet-run when kickoff incomplete", () => {
    const d = eng.authorize(req(), {
      kickoff: kickoffBad(),
      mou: mouFull(),
      regression: regOk(),
    });
    expect(d.verdict).toBe("DENIED");
    expect(d.blocking_gate).toBe("G1_KICKOFF");
    const g1 = d.gates.find((g) => g.gate === "G1_KICKOFF")!;
    expect(g1.status).toBe("failed");
    expect(g1.details?.length).toBeGreaterThan(0);
  });

  it("blocks dry-run when kickoff incomplete — G1 is foundational", () => {
    const d = eng.authorize(req({ requested_mode: "dry_run" }), {
      kickoff: kickoffBad(),
      mou: mouFull(),
      regression: regOk(),
    });
    expect(d.verdict).toBe("DENIED");
    expect(d.blocking_gate).toBe("G1_KICKOFF");
  });

  it("G1 failure cannot be overridden", () => {
    expect(() =>
      eng.authorize(
        req({ override: override({ scope: ["G1_KICKOFF"] }) }),
        { kickoff: kickoffBad(), mou: mouFull(), regression: regOk() },
      ),
    ).toThrow(/G1_KICKOFF.*overridable/);
  });
});

// ─────────────────────────────────────────────────────────
// G2 MOU stall gate
// ─────────────────────────────────────────────────────────

describe("G2 MOU", () => {
  it("dry_run_only blocks wet-run", () => {
    const d = eng.authorize(req(), {
      kickoff: kickoffOk(),
      mou: mouDryOnly(),
      regression: regOk(),
    });
    expect(d.verdict).toBe("DENIED");
    expect(d.blocking_gate).toBe("G2_MOU");
  });

  it("blocked mode blocks wet-run", () => {
    const d = eng.authorize(req(), {
      kickoff: kickoffOk(),
      mou: mouBlocked(),
      regression: regOk(),
    });
    expect(d.verdict).toBe("DENIED");
    expect(d.blocking_gate).toBe("G2_MOU");
  });

  it("blocked mode also blocks dry-run", () => {
    const d = eng.authorize(req({ requested_mode: "dry_run" }), {
      kickoff: kickoffOk(),
      mou: mouBlocked(),
      regression: regOk(),
    });
    expect(d.verdict).toBe("DENIED");
    expect(d.blocking_gate).toBe("G2_MOU");
  });

  it("override token unlocks dry_run_only for wet-run", () => {
    const d = eng.authorize(req({ override: override() }), {
      kickoff: kickoffOk(),
      mou: mouDryOnly(),
      regression: regOk(),
    });
    expect(d.verdict).toBe("AUTHORIZED");
    expect(d.override_applied).toBe(true);
    const g2 = d.gates.find((g) => g.gate === "G2_MOU")!;
    expect(g2.status).toBe("overridden");
  });

  it("override token also works on blocked mode", () => {
    const d = eng.authorize(req({ override: override() }), {
      kickoff: kickoffOk(),
      mou: mouBlocked(),
      regression: regOk(),
    });
    expect(d.verdict).toBe("AUTHORIZED");
  });

  it("override with wrong scope does NOT unlock G2", () => {
    const d = eng.authorize(
      req({ override: override({ scope: ["G3_REGRESSION"] }) }),
      { kickoff: kickoffOk(), mou: mouDryOnly(), regression: regOk() },
    );
    expect(d.verdict).toBe("DENIED");
    expect(d.blocking_gate).toBe("G2_MOU");
  });
});

// ─────────────────────────────────────────────────────────
// G3 regression
// ─────────────────────────────────────────────────────────

describe("G3 regression", () => {
  it("regression failure blocks wet-run", () => {
    const d = eng.authorize(req(), {
      kickoff: kickoffOk(),
      mou: mouFull(),
      regression: regFail(),
    });
    expect(d.verdict).toBe("DENIED");
    expect(d.blocking_gate).toBe("G3_REGRESSION");
  });

  it("override unlocks regression failure", () => {
    const d = eng.authorize(
      req({ override: override({ scope: ["G3_REGRESSION"] }) }),
      { kickoff: kickoffOk(), mou: mouFull(), regression: regFail() },
    );
    expect(d.verdict).toBe("AUTHORIZED");
    const g3 = d.gates.find((g) => g.gate === "G3_REGRESSION")!;
    expect(g3.status).toBe("overridden");
  });
});

// ─────────────────────────────────────────────────────────
// override validation
// ─────────────────────────────────────────────────────────

describe("override validation", () => {
  it("rejects empty override_id", () => {
    expect(() =>
      eng.authorize(req({ override: override({ override_id: " " }) }), {
        kickoff: kickoffOk(),
        mou: mouDryOnly(),
        regression: regOk(),
      }),
    ).toThrow(/override_id/);
  });

  it("rejects short reason", () => {
    expect(() =>
      eng.authorize(
        req({
          override: override({ reason: "too short for serious audit trail" }),
        }),
        { kickoff: kickoffOk(), mou: mouDryOnly(), regression: regOk() },
      ),
    ).toThrow(/60 chars/);
  });

  it("rejects expired override", () => {
    expect(() =>
      eng.authorize(
        req({
          override: override({
            approved_at: T0 - 10 * DAY,
            expires_at: T0 - 1 * DAY,
          }),
        }),
        { kickoff: kickoffOk(), mou: mouDryOnly(), regression: regOk() },
      ),
    ).toThrow(/expired/);
  });

  it("rejects expires_at ≤ approved_at", () => {
    expect(() =>
      eng.authorize(
        req({
          override: override({ approved_at: T0, expires_at: T0 - 1 }),
        }),
        { kickoff: kickoffOk(), mou: mouDryOnly(), regression: regOk() },
      ),
    ).toThrow(/expires_at/);
  });

  it("rejects empty scope", () => {
    expect(() =>
      eng.authorize(req({ override: override({ scope: [] }) }), {
        kickoff: kickoffOk(),
        mou: mouDryOnly(),
        regression: regOk(),
      }),
    ).toThrow(/scope/);
  });

  it("rejects empty approver", () => {
    expect(() =>
      eng.authorize(
        req({ override: override({ approved_by: " " }) }),
        { kickoff: kickoffOk(), mou: mouDryOnly(), regression: regOk() },
      ),
    ).toThrow(/approved_by/);
  });
});

// ─────────────────────────────────────────────────────────
// request validation
// ─────────────────────────────────────────────────────────

describe("request validation", () => {
  it("rejects empty session_id", () => {
    expect(() =>
      eng.authorize(req({ session_id: " " }), {
        kickoff: kickoffOk(),
        mou: mouFull(),
        regression: regOk(),
      }),
    ).toThrow(/session_id/);
  });

  it("rejects empty kickoff_id", () => {
    expect(() =>
      eng.authorize(req({ kickoff_id: " " }), {
        kickoff: kickoffOk(),
        mou: mouFull(),
        regression: regOk(),
      }),
    ).toThrow(/kickoff_id/);
  });

  it("rejects empty requested_by", () => {
    expect(() =>
      eng.authorize(req({ requested_by: "" }), {
        kickoff: kickoffOk(),
        mou: mouFull(),
        regression: regOk(),
      }),
    ).toThrow(/requested_by/);
  });

  it("rejects non-positive requested_at", () => {
    expect(() =>
      eng.authorize(req({ requested_at: 0 }), {
        kickoff: kickoffOk(),
        mou: mouFull(),
        regression: regOk(),
      }),
    ).toThrow(/requested_at/);
  });
});

// ─────────────────────────────────────────────────────────
// log + snapshot
// ─────────────────────────────────────────────────────────

describe("audit log + snapshot", () => {
  it("logs each decision", () => {
    eng.authorize(req(), {
      kickoff: kickoffOk(),
      mou: mouFull(),
      regression: regOk(),
    });
    eng.authorize(req({ session_id: "SES-02" }), {
      kickoff: kickoffBad(),
      mou: mouFull(),
      regression: regOk(),
    });
    expect(eng.listLog()).toHaveLength(2);
    expect(eng.listLog({ verdict: "AUTHORIZED" })).toHaveLength(1);
    expect(eng.listLog({ verdict: "DENIED" })).toHaveLength(1);
    expect(eng.listLog({ session_id: "SES-02" })).toHaveLength(1);
  });

  it("round-trips log with schemaVersion 1", () => {
    eng.authorize(req(), {
      kickoff: kickoffOk(),
      mou: mouFull(),
      regression: regOk(),
    });
    const snap = eng.toSnapshot();
    expect(snap.schemaVersion).toBe(1);
    const eng2 = new WetRunAuthorizationEngine();
    eng2.loadSnapshot(snap);
    expect(eng2.listLog()).toHaveLength(1);
  });

  it("rejects unknown schemaVersion", () => {
    expect(() =>
      eng.loadSnapshot({ schemaVersion: 99, log: [] }),
    ).toThrow(/schemaVersion/);
  });

  it("clearAll wipes log", () => {
    eng.authorize(req(), {
      kickoff: kickoffOk(),
      mou: mouFull(),
      regression: regOk(),
    });
    eng.clearAll();
    expect(eng.listLog()).toHaveLength(0);
  });
});

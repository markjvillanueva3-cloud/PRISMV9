/**
 * PilotPhaseExitGateEngine tests (U-LPR-PILOT-EXITGATE)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  PilotPhaseExitGateEngine,
  type PromotionRequest,
  type PromotionCriteria,
  type SignOff,
} from "../../engines/PilotPhaseExitGateEngine.js";

let eng: PilotPhaseExitGateEngine;

const T0 = 1_000_000_000_000;
const DAY = 24 * 3600 * 1000;

const DEMOTE_REASON =
  "SEV1 incident on customer line — rolling back pilot pending root cause; decision endorsed by engineering VP + quality lead.";

function devCriteria(overrides: Partial<PromotionCriteria> = {}): PromotionCriteria {
  return {
    successful_runs: 5,
    abort_count_in_window: 0,
    window_days: 14,
    open_sev1_incidents: 0,
    regression_green_streak: 5,
    open_waiver_count: 0,
    mou_signed: false,
    runbook_promoted: false,
    ...overrides,
  };
}

function prodCriteria(overrides: Partial<PromotionCriteria> = {}): PromotionCriteria {
  return {
    successful_runs: 25,
    abort_count_in_window: 1,
    window_days: 14,
    open_sev1_incidents: 0,
    regression_green_streak: 10,
    open_waiver_count: 0,
    mou_signed: true,
    runbook_promoted: true,
    ...overrides,
  };
}

function signOff(role: string, approved_at = T0): SignOff {
  return { role, approver: `${role}-lead`, approved_at };
}

function devReq(overrides: Partial<PromotionRequest> = {}): PromotionRequest {
  return {
    request_id: "PROM-DEV-01",
    from_phase: "dev",
    to_phase: "pilot",
    requested_at: T0,
    requested_by: "ops-lead",
    criteria: devCriteria(),
    sign_offs: [signOff("engineering"), signOff("quality")],
    ...overrides,
  };
}

function prodReq(overrides: Partial<PromotionRequest> = {}): PromotionRequest {
  return {
    request_id: "PROM-PROD-01",
    from_phase: "pilot",
    to_phase: "production",
    requested_at: T0 + 30 * DAY,
    requested_by: "ops-lead",
    criteria: prodCriteria(),
    sign_offs: [
      signOff("engineering"),
      signOff("quality"),
      signOff("customer"),
      signOff("legal"),
    ],
    ...overrides,
  };
}

beforeEach(() => {
  eng = new PilotPhaseExitGateEngine();
  eng.clearAll();
});

// ─────────────────────────────────────────────────────────
// configure
// ─────────────────────────────────────────────────────────

describe("configure", () => {
  it("updates config and returns new values", () => {
    const c = eng.configure({ min_dev_runs: 3 });
    expect(c.min_dev_runs).toBe(3);
  });

  it("rejects min_dev_runs < 1", () => {
    expect(() => eng.configure({ min_dev_runs: 0 })).toThrow(/min_dev_runs/);
  });

  it("rejects min_pilot_runs < 1", () => {
    expect(() => eng.configure({ min_pilot_runs: 0 })).toThrow(/min_pilot_runs/);
  });

  it("rejects negative abort_ceiling", () => {
    expect(() =>
      eng.configure({ abort_ceiling_pilot_to_prod: -1 }),
    ).toThrow(/abort_ceiling/);
  });

  it("rejects window_days < 1", () => {
    expect(() => eng.configure({ window_days_default: 0 })).toThrow(/window_days/);
  });

  it("rejects regression_streak_required < 1", () => {
    expect(() =>
      eng.configure({ regression_streak_required: 0 }),
    ).toThrow(/regression_streak/);
  });
});

// ─────────────────────────────────────────────────────────
// dev → pilot
// ─────────────────────────────────────────────────────────

describe("dev → pilot", () => {
  it("approves when all criteria met + sign-offs present", () => {
    const v = eng.evaluate(devReq());
    expect(v.approved).toBe(true);
    expect(eng.currentPhaseName()).toBe("pilot");
    expect(v.blocking_reason).toBeUndefined();
  });

  it("rejects when successful_runs below threshold", () => {
    const v = eng.evaluate(
      devReq({ criteria: devCriteria({ successful_runs: 2 }) }),
    );
    expect(v.approved).toBe(false);
    expect(eng.currentPhaseName()).toBe("dev");
    const failing = v.criterion_results.find((c) => !c.ok);
    expect(failing?.id).toBe("DEV.RUNS");
  });

  it("rejects when SEV1 incidents open", () => {
    const v = eng.evaluate(
      devReq({ criteria: devCriteria({ open_sev1_incidents: 1 }) }),
    );
    expect(v.approved).toBe(false);
    expect(v.criterion_results.find((c) => c.id === "DEV.NO_SEV1")?.ok).toBe(false);
  });

  it("rejects when regression streak too short", () => {
    const v = eng.evaluate(
      devReq({ criteria: devCriteria({ regression_green_streak: 2 }) }),
    );
    expect(v.approved).toBe(false);
    expect(
      v.criterion_results.find((c) => c.id === "DEV.REGRESSION")?.ok,
    ).toBe(false);
  });

  it("rejects when decay-flagged waivers open", () => {
    const v = eng.evaluate(
      devReq({ criteria: devCriteria({ open_waiver_count: 2 }) }),
    );
    expect(v.approved).toBe(false);
  });

  it("rejects when sign-off missing quality", () => {
    const v = eng.evaluate(devReq({ sign_offs: [signOff("engineering")] }));
    expect(v.approved).toBe(false);
    expect(v.missing_sign_offs).toContain("quality");
    expect(v.blocking_reason).toMatch(/missing sign-off/);
  });

  it("rejects when sign-off missing engineering", () => {
    const v = eng.evaluate(devReq({ sign_offs: [signOff("quality")] }));
    expect(v.approved).toBe(false);
    expect(v.missing_sign_offs).toContain("engineering");
  });
});

// ─────────────────────────────────────────────────────────
// pilot → production
// ─────────────────────────────────────────────────────────

describe("pilot → production", () => {
  beforeEach(() => {
    // Promote dev → pilot first
    const v = eng.evaluate(devReq());
    expect(v.approved).toBe(true);
  });

  it("approves when all criteria met + 4-role sign-off", () => {
    const v = eng.evaluate(prodReq());
    expect(v.approved).toBe(true);
    expect(eng.currentPhaseName()).toBe("production");
  });

  it("rejects when successful_runs below threshold", () => {
    const v = eng.evaluate(
      prodReq({ criteria: prodCriteria({ successful_runs: 5 }) }),
    );
    expect(v.approved).toBe(false);
  });

  it("rejects when abort count exceeds ceiling", () => {
    const v = eng.evaluate(
      prodReq({ criteria: prodCriteria({ abort_count_in_window: 3 }) }),
    );
    expect(v.approved).toBe(false);
    expect(
      v.criterion_results.find((c) => c.id === "PILOT.ABORT_CEILING")?.ok,
    ).toBe(false);
  });

  it("rejects when MOU not signed", () => {
    const v = eng.evaluate(
      prodReq({ criteria: prodCriteria({ mou_signed: false }) }),
    );
    expect(v.approved).toBe(false);
  });

  it("rejects when runbook not promoted", () => {
    const v = eng.evaluate(
      prodReq({ criteria: prodCriteria({ runbook_promoted: false }) }),
    );
    expect(v.approved).toBe(false);
  });

  it("rejects when customer sign-off missing", () => {
    const v = eng.evaluate(
      prodReq({
        sign_offs: [
          signOff("engineering"),
          signOff("quality"),
          signOff("legal"),
        ],
      }),
    );
    expect(v.approved).toBe(false);
    expect(v.missing_sign_offs).toContain("customer");
  });

  it("rejects when legal sign-off missing", () => {
    const v = eng.evaluate(
      prodReq({
        sign_offs: [
          signOff("engineering"),
          signOff("quality"),
          signOff("customer"),
        ],
      }),
    );
    expect(v.approved).toBe(false);
    expect(v.missing_sign_offs).toContain("legal");
  });

  it("rejects when window_days under default", () => {
    const v = eng.evaluate(
      prodReq({ criteria: prodCriteria({ window_days: 7 }) }),
    );
    expect(v.approved).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────
// transition validation
// ─────────────────────────────────────────────────────────

describe("transition validation", () => {
  it("rejects from_phase that does not match current", () => {
    expect(() =>
      eng.evaluate({ ...devReq(), from_phase: "pilot", to_phase: "production" }),
    ).toThrow(/from_phase/);
  });

  it("rejects invalid transition dev → production (skipping pilot)", () => {
    expect(() =>
      eng.evaluate({ ...devReq(), to_phase: "production" }),
    ).toThrow(/invalid transition/);
  });

  it("rejects promotion from production (no higher phase)", () => {
    eng.evaluate(devReq());
    eng.evaluate(prodReq());
    expect(() =>
      eng.evaluate({
        ...prodReq(),
        request_id: "PROM-OVER",
        from_phase: "production",
        to_phase: "production",
      }),
    ).toThrow(/invalid transition/);
  });

  it("rejects empty request_id", () => {
    expect(() => eng.evaluate(devReq({ request_id: " " }))).toThrow(/request_id/);
  });

  it("rejects non-positive requested_at", () => {
    expect(() => eng.evaluate(devReq({ requested_at: 0 }))).toThrow(
      /requested_at/,
    );
  });

  it("rejects sign-off with empty role", () => {
    expect(() =>
      eng.evaluate(
        devReq({ sign_offs: [signOff(""), signOff("quality")] }),
      ),
    ).toThrow(/role/);
  });
});

// ─────────────────────────────────────────────────────────
// demote
// ─────────────────────────────────────────────────────────

describe("demote", () => {
  beforeEach(() => {
    eng.evaluate(devReq());
  });

  it("demotes pilot → dev with valid reason", () => {
    const d = eng.demote({
      to_phase: "dev",
      reason: DEMOTE_REASON,
      demoted_at: T0 + 10 * DAY,
      demoted_by: "eng-vp",
    });
    expect(d.from_phase).toBe("pilot");
    expect(eng.currentPhaseName()).toBe("dev");
    expect(eng.listDemotions()).toHaveLength(1);
  });

  it("rejects short reason", () => {
    expect(() =>
      eng.demote({
        to_phase: "dev",
        reason: "too short",
        demoted_at: T0 + 10 * DAY,
        demoted_by: "eng-vp",
      }),
    ).toThrow(/60 chars/);
  });

  it("rejects demote when already at dev", () => {
    eng.demote({
      to_phase: "dev",
      reason: DEMOTE_REASON,
      demoted_at: T0 + 10 * DAY,
      demoted_by: "eng-vp",
    });
    expect(() =>
      eng.demote({
        to_phase: "dev",
        reason: DEMOTE_REASON,
        demoted_at: T0 + 11 * DAY,
        demoted_by: "eng-vp",
      }),
    ).toThrow(/already at dev/);
  });

  it("rejects lateral/upward demote", () => {
    expect(() =>
      eng.demote({
        to_phase: "production",
        reason: DEMOTE_REASON,
        demoted_at: T0 + 10 * DAY,
        demoted_by: "eng-vp",
      }),
    ).toThrow(/cannot demote/);
  });

  it("rejects empty demoted_by", () => {
    expect(() =>
      eng.demote({
        to_phase: "dev",
        reason: DEMOTE_REASON,
        demoted_at: T0 + 10 * DAY,
        demoted_by: " ",
      }),
    ).toThrow(/demoted_by/);
  });

  it("production → dev two-step demote", () => {
    eng.evaluate(prodReq());
    const d = eng.demote({
      to_phase: "dev",
      reason: DEMOTE_REASON,
      demoted_at: T0 + 40 * DAY,
      demoted_by: "eng-vp",
    });
    expect(d.from_phase).toBe("production");
    expect(eng.currentPhaseName()).toBe("dev");
  });
});

// ─────────────────────────────────────────────────────────
// history + verdicts + snapshot
// ─────────────────────────────────────────────────────────

describe("history + snapshot", () => {
  it("listHistory captures phase transitions", () => {
    eng.evaluate(devReq());
    eng.evaluate(prodReq());
    const h = eng.listHistory();
    expect(h.map((r) => r.phase)).toEqual(["dev", "pilot", "production"]);
  });

  it("listVerdicts filters by approved", () => {
    eng.evaluate(devReq({ criteria: devCriteria({ successful_runs: 1 }) }));
    eng.evaluate(devReq({ request_id: "PROM-DEV-02" }));
    expect(eng.listVerdicts({ approved: true })).toHaveLength(1);
    expect(eng.listVerdicts({ approved: false })).toHaveLength(1);
    expect(eng.listVerdicts()).toHaveLength(2);
  });

  it("round-trips with schemaVersion 1", () => {
    eng.evaluate(devReq());
    const snap = eng.toSnapshot();
    expect(snap.schemaVersion).toBe(1);
    const eng2 = new PilotPhaseExitGateEngine();
    eng2.loadSnapshot(snap);
    expect(eng2.currentPhaseName()).toBe("pilot");
    expect(eng2.listHistory()).toHaveLength(2);
  });

  it("rejects unknown schemaVersion", () => {
    expect(() =>
      eng.loadSnapshot({
        schemaVersion: 99,
        config: {
          min_dev_runs: 5,
          min_pilot_runs: 20,
          abort_ceiling_pilot_to_prod: 1,
          window_days_default: 14,
          regression_streak_required: 5,
        },
        currentPhase: "dev",
        history: [],
        demotions: [],
        verdicts: [],
      }),
    ).toThrow(/schemaVersion/);
  });

  it("clearAll resets to genesis dev", () => {
    eng.evaluate(devReq());
    eng.clearAll();
    expect(eng.currentPhaseName()).toBe("dev");
    expect(eng.listHistory()).toHaveLength(1);
  });
});

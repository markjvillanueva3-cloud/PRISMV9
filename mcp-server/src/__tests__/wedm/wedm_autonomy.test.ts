/**
 * WEDMAutonomyEngine tests — WEDM AGI Phase 4 / P4-MS1 / U-P4-01.
 *
 * Covers:
 *  - Level queries & capability gating
 *  - One-step promote/demote guardrails
 *  - Counter-sign requirement for L3→L4 and L4→L5
 *  - Defensive `degrade()` path (force-downgrade w/o counter-sign)
 *  - Snapshot / load roundtrip
 *  - Boundary & input validation
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WEDMAutonomyEngine,
  AUTONOMY_LEVEL_NAMES,
  AUTONOMY_LEVEL_HUMAN_ROLE,
  CAPABILITY_MIN_LEVEL,
  DEFAULT_STARTING_LEVEL,
  MAX_LEVEL,
  MIN_LEVEL,
  type AutonomyLevel,
} from "../../engines/WEDMAutonomyEngine.js";

// ----------------------------------------------------------------------------
// Constants & defaults
// ----------------------------------------------------------------------------

describe("WEDMAutonomyEngine — constants", () => {
  it("defines 6 level names L0..L5", () => {
    for (let i = 0; i <= 5; i++) {
      expect(typeof AUTONOMY_LEVEL_NAMES[i as AutonomyLevel]).toBe("string");
    }
    expect(AUTONOMY_LEVEL_NAMES[0]).toBe("Manual");
    expect(AUTONOMY_LEVEL_NAMES[5]).toBe("Self-improving");
  });

  it("defines a human-role description for every level", () => {
    for (let i = 0; i <= 5; i++) {
      const role = AUTONOMY_LEVEL_HUMAN_ROLE[i as AutonomyLevel];
      expect(typeof role).toBe("string");
      expect(role.length).toBeGreaterThan(5);
    }
  });

  it("capability map is monotone (higher capability → higher required level)", () => {
    expect(CAPABILITY_MIN_LEVEL.suggest_parameters).toBe(1);
    expect(CAPABILITY_MIN_LEVEL.auto_adjust_parameters).toBe(2);
    expect(CAPABILITY_MIN_LEVEL.execute_job_supervised).toBe(3);
    expect(CAPABILITY_MIN_LEVEL.execute_job_unattended).toBe(4);
    expect(CAPABILITY_MIN_LEVEL.self_modify_policy).toBe(5);
  });

  it("DEFAULT_STARTING_LEVEL is L0 (safest)", () => {
    expect(DEFAULT_STARTING_LEVEL).toBe(0);
  });

  it("MAX_LEVEL is 5, MIN_LEVEL is 0", () => {
    expect(MAX_LEVEL).toBe(5);
    expect(MIN_LEVEL).toBe(0);
  });
});

// ----------------------------------------------------------------------------
// Construction & queries
// ----------------------------------------------------------------------------

describe("WEDMAutonomyEngine — construction", () => {
  it("starts at L0 by default", () => {
    const e = new WEDMAutonomyEngine();
    expect(e.getLevel()).toBe(0);
    expect(e.getName()).toBe("Manual");
  });

  it("accepts an explicit starting level", () => {
    const e = new WEDMAutonomyEngine(3);
    expect(e.getLevel()).toBe(3);
    expect(e.getName()).toBe("Supervised");
  });

  it("rejects fractional or out-of-range starting levels", () => {
    expect(() => new WEDMAutonomyEngine(-1 as AutonomyLevel)).toThrow();
    expect(() => new WEDMAutonomyEngine(6 as AutonomyLevel)).toThrow();
    expect(() => new WEDMAutonomyEngine(2.5 as unknown as AutonomyLevel)).toThrow();
  });
});

// ----------------------------------------------------------------------------
// Capability gating
// ----------------------------------------------------------------------------

describe("WEDMAutonomyEngine — capability gating", () => {
  it("L0 grants no capabilities", () => {
    const e = new WEDMAutonomyEngine(0);
    expect(e.can("suggest_parameters")).toBe(false);
    expect(e.can("auto_adjust_parameters")).toBe(false);
    expect(e.can("execute_job_supervised")).toBe(false);
    expect(e.can("execute_job_unattended")).toBe(false);
    expect(e.can("self_modify_policy")).toBe(false);
  });

  it("L1 grants only suggest_parameters", () => {
    const e = new WEDMAutonomyEngine(1);
    expect(e.can("suggest_parameters")).toBe(true);
    expect(e.can("auto_adjust_parameters")).toBe(false);
  });

  it("L2 grants auto_adjust, not execution", () => {
    const e = new WEDMAutonomyEngine(2);
    expect(e.can("auto_adjust_parameters")).toBe(true);
    expect(e.can("execute_job_supervised")).toBe(false);
  });

  it("L4 grants lights-out but NOT self-modify", () => {
    const e = new WEDMAutonomyEngine(4);
    expect(e.can("execute_job_unattended")).toBe(true);
    expect(e.can("self_modify_policy")).toBe(false);
  });

  it("L5 grants every capability", () => {
    const e = new WEDMAutonomyEngine(5);
    expect(e.can("suggest_parameters")).toBe(true);
    expect(e.can("auto_adjust_parameters")).toBe(true);
    expect(e.can("execute_job_supervised")).toBe(true);
    expect(e.can("execute_job_unattended")).toBe(true);
    expect(e.can("self_modify_policy")).toBe(true);
  });

  it("rejects unknown capabilities with a descriptive error", () => {
    const e = new WEDMAutonomyEngine(3);
    expect(() => e.can("nonexistent" as never)).toThrow(/nonexistent/);
  });
});

// ----------------------------------------------------------------------------
// promote() — step-up guardrails
// ----------------------------------------------------------------------------

describe("WEDMAutonomyEngine — promote()", () => {
  let e: WEDMAutonomyEngine;

  beforeEach(() => {
    e = new WEDMAutonomyEngine(0);
  });

  it("steps exactly one level up", () => {
    const t = e.promote();
    expect(t.from).toBe(0);
    expect(t.to).toBe(1);
    expect(e.getLevel()).toBe(1);
  });

  it("requires no counter-sign for L0→L1, L1→L2, L2→L3", () => {
    for (let i = 0; i < 3; i++) e.promote({ reason: "gate_review" });
    expect(e.getLevel()).toBe(3);
  });

  it("rejects L3→L4 without a counter-sign", () => {
    for (let i = 0; i < 3; i++) e.promote();
    expect(e.getLevel()).toBe(3);
    expect(() => e.promote()).toThrow(/counterSign/);
    expect(e.getLevel()).toBe(3);
  });

  it("permits L3→L4 with a counter-sign", () => {
    for (let i = 0; i < 3; i++) e.promote();
    const t = e.promote({ counterSign: "alice@jmdie" });
    expect(t.to).toBe(4);
    expect(e.getLevel()).toBe(4);
  });

  it("rejects L4→L5 without a counter-sign", () => {
    for (let i = 0; i < 3; i++) e.promote();
    e.promote({ counterSign: "alice" });
    expect(e.getLevel()).toBe(4);
    expect(() => e.promote()).toThrow(/counterSign/);
  });

  it("rejects promotion past L5", () => {
    const up = new WEDMAutonomyEngine(5);
    expect(() => up.promote({ counterSign: "x" })).toThrow(/max/i);
  });

  it("records the transition in history with the supplied actor and reason", () => {
    const t = e.promote({ actor: "mark@jmdie", reason: "ready_for_suggestions" });
    expect(t.actor).toBe("mark@jmdie");
    expect(t.reason).toBe("ready_for_suggestions");
    expect(t.forced).toBe(false);
    expect(e.snapshot().history).toHaveLength(1);
  });
});

// ----------------------------------------------------------------------------
// demote() — step-down
// ----------------------------------------------------------------------------

describe("WEDMAutonomyEngine — demote()", () => {
  it("steps exactly one level down", () => {
    const e = new WEDMAutonomyEngine(3);
    const t = e.demote();
    expect(t.from).toBe(3);
    expect(t.to).toBe(2);
    expect(e.getLevel()).toBe(2);
  });

  it("rejects demotion below L0", () => {
    const e = new WEDMAutonomyEngine(0);
    expect(() => e.demote()).toThrow(/min/i);
  });

  it("never requires a counter-sign (conservative direction)", () => {
    const e = new WEDMAutonomyEngine(4);
    // No counterSign supplied — should still succeed.
    expect(() => e.demote()).not.toThrow();
    expect(e.getLevel()).toBe(3);
  });

  it("is auditable — history reflects the demotion", () => {
    const e = new WEDMAutonomyEngine(2);
    e.demote({ actor: "shift_lead", reason: "end_of_run_handoff" });
    const last = e.snapshot().last!;
    expect(last.actor).toBe("shift_lead");
    expect(last.forced).toBe(false);
  });
});

// ----------------------------------------------------------------------------
// degrade() — forced defensive downgrade
// ----------------------------------------------------------------------------

describe("WEDMAutonomyEngine — degrade()", () => {
  it("force-clamps the level to the supplied floor", () => {
    const e = new WEDMAutonomyEngine(4);
    const t = e.degrade({ floorToLevel: 1, reason: "wire_break_limit" });
    expect(t).not.toBeNull();
    expect(e.getLevel()).toBe(1);
    expect(t!.forced).toBe(true);
  });

  it("is a no-op if current level already ≤ floor", () => {
    const e = new WEDMAutonomyEngine(1);
    const t = e.degrade({ floorToLevel: 2, reason: "spurious_trip" });
    expect(t).toBeNull();
    expect(e.getLevel()).toBe(1);
    expect(e.snapshot().history).toHaveLength(0);
  });

  it("does NOT require a counter-sign even when crossing counter-sign boundaries", () => {
    const e = new WEDMAutonomyEngine(5);
    e.degrade({ floorToLevel: 2, reason: "envelope_violation" });
    expect(e.getLevel()).toBe(2);
  });

  it("rejects invalid floor values", () => {
    const e = new WEDMAutonomyEngine(3);
    expect(() => e.degrade({ floorToLevel: 7 as AutonomyLevel, reason: "bogus" })).toThrow();
    expect(() => e.degrade({ floorToLevel: -1 as AutonomyLevel, reason: "bogus" })).toThrow();
  });
});

// ----------------------------------------------------------------------------
// Snapshots & persistence interface
// ----------------------------------------------------------------------------

describe("WEDMAutonomyEngine — snapshot / load", () => {
  it("snapshot() captures level, name, humanRole, version, history", () => {
    const e = new WEDMAutonomyEngine(0);
    e.promote({ actor: "a", reason: "r1" });
    e.promote({ actor: "b", reason: "r2" });
    const s = e.snapshot();
    expect(s.level).toBe(2);
    expect(s.name).toBe(AUTONOMY_LEVEL_NAMES[2]);
    expect(s.humanRole).toBe(AUTONOMY_LEVEL_HUMAN_ROLE[2]);
    expect(s.version).toBe(2);
    expect(s.history).toHaveLength(2);
    expect(s.last!.to).toBe(2);
  });

  it("snapshot().history is a defensive copy", () => {
    const e = new WEDMAutonomyEngine();
    e.promote();
    const s1 = e.snapshot();
    s1.history.push({
      from: 9 as AutonomyLevel,
      to: 9 as AutonomyLevel,
      at: "x",
      actor: "x",
      reason: "x",
      forced: true,
    });
    expect(e.snapshot().history).toHaveLength(1);
  });

  it("load() restores state from a snapshot shape", () => {
    const a = new WEDMAutonomyEngine(0);
    a.promote({ actor: "op", reason: "r" });
    a.promote({ actor: "op", reason: "r" });
    const s = a.snapshot();

    const b = new WEDMAutonomyEngine(0);
    b.load({ level: s.level, history: s.history });
    expect(b.getLevel()).toBe(s.level);
    expect(b.snapshot().history).toHaveLength(s.history.length);
  });

  it("load() rejects malformed level", () => {
    const e = new WEDMAutonomyEngine();
    expect(() =>
      e.load({ level: 42 as AutonomyLevel, history: [] }),
    ).toThrow();
  });
});

// ----------------------------------------------------------------------------
// reset()
// ----------------------------------------------------------------------------

describe("WEDMAutonomyEngine — reset()", () => {
  it("wipes history and level", () => {
    const e = new WEDMAutonomyEngine();
    e.promote();
    e.promote();
    e.reset();
    expect(e.getLevel()).toBe(0);
    expect(e.snapshot().history).toHaveLength(0);
  });

  it("accepts a specific target level", () => {
    const e = new WEDMAutonomyEngine();
    e.promote();
    e.reset(3);
    expect(e.getLevel()).toBe(3);
    expect(e.snapshot().history).toHaveLength(0);
  });
});

// ----------------------------------------------------------------------------
// Realistic scenario
// ----------------------------------------------------------------------------

describe("WEDMAutonomyEngine — scenario: ramp then trip", () => {
  it("walks L0→L4 with counter-sign then force-degrades on wire-break", () => {
    const e = new WEDMAutonomyEngine();

    // Gradual promotion over a shift.
    e.promote({ actor: "mark", reason: "shift_start" });
    e.promote({ actor: "mark", reason: "params_stable" });
    e.promote({ actor: "mark", reason: "supervised_green" });
    e.promote({ actor: "mark", counterSign: "alice", reason: "ready_lights_out" });
    expect(e.getLevel()).toBe(4);
    expect(e.can("execute_job_unattended")).toBe(true);

    // Wire-break storm — envelope hook demands L≤1.
    const forced = e.degrade({
      floorToLevel: 1,
      actor: "SafetyEnvelopeEngine",
      reason: "wire_break_count_exceeded",
    });
    expect(forced!.forced).toBe(true);
    expect(e.getLevel()).toBe(1);
    expect(e.can("auto_adjust_parameters")).toBe(false);

    const hist = e.snapshot().history;
    expect(hist).toHaveLength(5);
    expect(hist.filter((h) => h.forced)).toHaveLength(1);
  });
});

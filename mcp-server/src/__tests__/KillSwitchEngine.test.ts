/**
 * KillSwitchEngine tests — U-HAGI11 operator safety primitive.
 */
import { describe, it, expect } from "vitest";
import { KillSwitchEngine, KILL_LEVELS, type KillState } from "../engines/KillSwitchEngine.js";

const ISO = "2026-05-24T07:00:00.000Z";
const initial = (): KillState => KillSwitchEngine.initial(ISO);

describe("KillSwitchEngine.initial", () => {
  it("constructs a normal-level state with empty history", () => {
    const s = initial();
    expect(s.level).toBe("normal");
    expect(s.history).toEqual([]);
  });
});

describe("KillSwitchEngine.promote", () => {
  it("promotes normal → soft and records history", () => {
    const s = KillSwitchEngine.promote(initial(), "soft", "elevated risk", "operator", ISO);
    expect(s.level).toBe("soft");
    expect(s.reason).toBe("elevated risk");
    expect(s.history).toHaveLength(1);
    expect(s.history[0]).toMatchObject({ from: "normal", to: "soft" });
  });

  it("chains normal → soft → hard → nuclear preserving history (4 entries minus initial = 3)", () => {
    let s = initial();
    s = KillSwitchEngine.promote(s, "soft", "r1", "op", ISO);
    s = KillSwitchEngine.promote(s, "hard", "r2", "op", ISO);
    s = KillSwitchEngine.promote(s, "nuclear", "r3", "op", ISO);
    expect(s.level).toBe("nuclear");
    expect(s.history).toHaveLength(3);
    expect(s.history.map((h) => h.to)).toEqual(["soft", "hard", "nuclear"]);
  });

  it("rejects demotion (forward-only)", () => {
    let s = KillSwitchEngine.promote(initial(), "hard", "r", "op", ISO);
    expect(() => KillSwitchEngine.promote(s, "soft", "demote", "op", ISO)).toThrow();
  });

  it("rejects staying at same level", () => {
    let s = KillSwitchEngine.promote(initial(), "soft", "r", "op", ISO);
    expect(() => KillSwitchEngine.promote(s, "soft", "same", "op", ISO)).toThrow();
  });

  it("rejects empty reason (failure mode)", () => {
    expect(() => KillSwitchEngine.promote(initial(), "soft", "", "op", ISO)).toThrow();
  });

  it("rejects empty actor (failure mode)", () => {
    expect(() => KillSwitchEngine.promote(initial(), "soft", "r", "", ISO)).toThrow();
  });
});

describe("KillSwitchEngine.reset", () => {
  it("force-resets back to normal with history record", () => {
    const escalated = KillSwitchEngine.promote(initial(), "hard", "r", "op", ISO);
    const reset = KillSwitchEngine.reset(escalated, "operator-2", "incident resolved", true, ISO);
    expect(reset.level).toBe("normal");
    expect(reset.reason).toContain("RESET");
    expect(reset.history).toHaveLength(2);
    expect(reset.history[1]).toMatchObject({ from: "hard", to: "normal" });
  });

  it("refuses reset without force=true (boundary)", () => {
    const escalated = KillSwitchEngine.promote(initial(), "hard", "r", "op", ISO);
    expect(() => KillSwitchEngine.reset(escalated, "op", "r", false, ISO)).toThrow();
  });

  it("refuses reset without actor/reason", () => {
    const escalated = KillSwitchEngine.promote(initial(), "soft", "r", "op", ISO);
    expect(() => KillSwitchEngine.reset(escalated, "", "r", true, ISO)).toThrow();
    expect(() => KillSwitchEngine.reset(escalated, "op", "", true, ISO)).toThrow();
  });
});

describe("KillSwitchEngine.decide", () => {
  it("allows everything at normal", () => {
    const s = initial();
    expect(KillSwitchEngine.decide(s, "new_request").allow).toBe(true);
    expect(KillSwitchEngine.decide(s, "in_flight").allow).toBe(true);
    expect(KillSwitchEngine.decide(s, "credential_use").allow).toBe(true);
  });

  it("blocks new_request at soft, allows in_flight", () => {
    const s = KillSwitchEngine.promote(initial(), "soft", "r", "op", ISO);
    expect(KillSwitchEngine.decide(s, "new_request").allow).toBe(false);
    expect(KillSwitchEngine.decide(s, "in_flight").allow).toBe(true);
    expect(KillSwitchEngine.decide(s, "credential_use").allow).toBe(true);
  });

  it("blocks in_flight at hard, and credential_use by default", () => {
    let s = KillSwitchEngine.promote(initial(), "soft", "r1", "op", ISO);
    s = KillSwitchEngine.promote(s, "hard", "r2", "op", ISO);
    expect(KillSwitchEngine.decide(s, "new_request").allow).toBe(false);
    expect(KillSwitchEngine.decide(s, "in_flight").allow).toBe(false);
    expect(KillSwitchEngine.decide(s, "credential_use").allow).toBe(false);
    expect(KillSwitchEngine.decide(s, "credential_use", { blockCredsAtHard: false }).allow).toBe(true);
  });

  it("blocks credentials at nuclear regardless of opts", () => {
    let s = initial();
    for (const lvl of ["soft", "hard", "nuclear"] as const) {
      s = KillSwitchEngine.promote(s, lvl, "r", "op", ISO);
    }
    expect(KillSwitchEngine.decide(s, "credential_use", { blockCredsAtHard: false }).allow).toBe(false);
  });
});

describe("KillSwitchEngine.rank", () => {
  it("orders levels: normal < soft < hard < nuclear", () => {
    expect(KILL_LEVELS).toEqual(["normal", "soft", "hard", "nuclear"]);
    expect(KillSwitchEngine.rank("normal")).toBe(0);
    expect(KillSwitchEngine.rank("nuclear")).toBe(3);
  });
});

/**
 * PreMOUKickoffChecklistEngine tests (U-LPR-PRE-MOU)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  PreMOUKickoffChecklistEngine,
  CANONICAL_ITEMS,
  type KickoffRegistration,
} from "../../engines/PreMOUKickoffChecklistEngine.js";

let eng: PreMOUKickoffChecklistEngine;

const T0 = 1_000_000_000_000;
const DAY = 24 * 3600 * 1000;

function reg(overrides: Partial<KickoffRegistration> = {}): KickoffRegistration {
  return {
    kickoff_id: "KICK-JMDIE-2026Q2",
    blocker_id: "MOU-JMDIE-V2",
    customer: "JM Die",
    opened_at: T0,
    ...overrides,
  };
}

const LONG_REASON =
  "Customer will provide PO via email within 48h — bridging gap until formal procurement paperwork lands.";

function verifyItem(
  id: string,
  overrides: { signed_off_by?: string; evidence_uri?: string; filled_at?: number } = {},
) {
  return {
    kickoff_id: "KICK-JMDIE-2026Q2",
    item_id: id,
    filled_at: overrides.filled_at ?? T0 + 1,
    evidence_uri: overrides.evidence_uri ?? `https://docs.example.com/${id}`,
    signed_off_by: overrides.signed_off_by ?? "pm-ops",
  };
}

beforeEach(() => {
  eng = new PreMOUKickoffChecklistEngine();
});

// ─────────────────────────────────────────────────────────────
// register
// ─────────────────────────────────────────────────────────────

describe("register", () => {
  it("seeds all 10 canonical items as pending", () => {
    const k = eng.register(reg());
    expect(k.items).toHaveLength(CANONICAL_ITEMS.length);
    for (const it of k.items) {
      expect(it.status).toBe("pending");
    }
  });

  it("rejects empty kickoff_id", () => {
    expect(() => eng.register(reg({ kickoff_id: " " }))).toThrow(/kickoff_id/);
  });

  it("rejects empty blocker_id", () => {
    expect(() => eng.register(reg({ blocker_id: "" }))).toThrow(/blocker_id/);
  });

  it("rejects empty customer", () => {
    expect(() => eng.register(reg({ customer: "" }))).toThrow(/customer/);
  });

  it("rejects non-positive opened_at", () => {
    expect(() => eng.register(reg({ opened_at: 0 }))).toThrow(/opened_at/);
  });

  it("rejects duplicate kickoff_id", () => {
    eng.register(reg());
    expect(() => eng.register(reg())).toThrow(/already registered/);
  });
});

// ─────────────────────────────────────────────────────────────
// verify
// ─────────────────────────────────────────────────────────────

describe("verify", () => {
  beforeEach(() => {
    eng.register(reg());
  });

  it("marks item verified with evidence", () => {
    const r = eng.verify(verifyItem("NDA_SIGNED"));
    expect(r.status).toBe("verified");
    expect(r.signed_off_by).toBe("pm-ops");
    expect(r.evidence_uri).toContain("NDA_SIGNED");
  });

  it("requires evidence_uri for non-optional items", () => {
    expect(() =>
      eng.verify({
        kickoff_id: "KICK-JMDIE-2026Q2",
        item_id: "NDA_SIGNED",
        filled_at: T0 + 1,
        signed_off_by: "pm",
      }),
    ).toThrow(/evidence_uri/);
  });

  it("accepts sign-off alone for evidence_optional items", () => {
    const r = eng.verify({
      kickoff_id: "KICK-JMDIE-2026Q2",
      item_id: "SAFETY_BRIEFING_COMPLETE",
      filled_at: T0 + 1,
      signed_off_by: "shop-lead",
    });
    expect(r.status).toBe("verified");
  });

  it("rejects empty signed_off_by", () => {
    expect(() =>
      eng.verify(verifyItem("NDA_SIGNED", { signed_off_by: " " })),
    ).toThrow(/signed_off_by/);
  });

  it("rejects filled_at before opened_at", () => {
    expect(() =>
      eng.verify(verifyItem("NDA_SIGNED", { filled_at: T0 - 1 })),
    ).toThrow(/filled_at/);
  });

  it("rejects unknown item_id", () => {
    expect(() =>
      eng.verify({ ...verifyItem("NDA_SIGNED"), item_id: "NOPE" }),
    ).toThrow(/not on kickoff/);
  });

  it("rejects verify on closed kickoff", () => {
    for (const def of CANONICAL_ITEMS) {
      if (def.evidence_optional) {
        eng.verify({
          kickoff_id: "KICK-JMDIE-2026Q2",
          item_id: def.item_id,
          filled_at: T0 + 1,
          signed_off_by: "x",
        });
      } else {
        eng.verify(verifyItem(def.item_id));
      }
    }
    eng.close({
      kickoff_id: "KICK-JMDIE-2026Q2",
      closed_at: T0 + 2,
      closed_by: "pm",
    });
    expect(() => eng.verify(verifyItem("NDA_SIGNED"))).toThrow(/closed/);
  });

  it("re-verifying clears prior waiver fields", () => {
    eng.waive({
      kickoff_id: "KICK-JMDIE-2026Q2",
      item_id: "POC_CONFIRMED",
      waived_at: T0 + 1,
      waived_by: "pm",
      reason: LONG_REASON,
    });
    const r = eng.verify(verifyItem("POC_CONFIRMED"));
    expect(r.status).toBe("verified");
    expect(r.waived_at).toBeUndefined();
    expect(r.waiver_reason).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// waive
// ─────────────────────────────────────────────────────────────

describe("waive", () => {
  beforeEach(() => {
    eng.register(reg());
  });

  it("waives non-critical item with justification", () => {
    const r = eng.waive({
      kickoff_id: "KICK-JMDIE-2026Q2",
      item_id: "POC_CONFIRMED",
      waived_at: T0 + 1,
      waived_by: "pm-ops",
      reason: LONG_REASON,
    });
    expect(r.status).toBe("waived");
    expect(r.waiver_expires_at).toBeGreaterThan(T0 + 1);
  });

  it("rejects waive of critical item", () => {
    expect(() =>
      eng.waive({
        kickoff_id: "KICK-JMDIE-2026Q2",
        item_id: "NDA_SIGNED",
        waived_at: T0 + 1,
        waived_by: "pm",
        reason: LONG_REASON,
      }),
    ).toThrow(/critical/);
  });

  it("rejects short reason", () => {
    expect(() =>
      eng.waive({
        kickoff_id: "KICK-JMDIE-2026Q2",
        item_id: "POC_CONFIRMED",
        waived_at: T0 + 1,
        waived_by: "pm",
        reason: "short",
      }),
    ).toThrow(/reason/);
  });

  it("rejects expires_at ≤ waived_at", () => {
    expect(() =>
      eng.waive({
        kickoff_id: "KICK-JMDIE-2026Q2",
        item_id: "POC_CONFIRMED",
        waived_at: 2_000,
        waived_by: "pm",
        reason: LONG_REASON,
        expires_at: 1_000,
      }),
    ).toThrow(/expires_at/);
  });

  it("rejects empty waived_by", () => {
    expect(() =>
      eng.waive({
        kickoff_id: "KICK-JMDIE-2026Q2",
        item_id: "POC_CONFIRMED",
        waived_at: T0 + 1,
        waived_by: " ",
        reason: LONG_REASON,
      }),
    ).toThrow(/waived_by/);
  });
});

// ─────────────────────────────────────────────────────────────
// sweepExpiredWaivers
// ─────────────────────────────────────────────────────────────

describe("sweepExpiredWaivers", () => {
  beforeEach(() => {
    eng.register(reg());
  });

  it("decays expired waivers back to pending", () => {
    eng.waive({
      kickoff_id: "KICK-JMDIE-2026Q2",
      item_id: "POC_CONFIRMED",
      waived_at: T0 + 1,
      waived_by: "pm",
      reason: LONG_REASON,
      expires_at: T0 + 2 * DAY,
    });
    const decayed = eng.sweepExpiredWaivers(T0 + 3 * DAY);
    expect(decayed).toHaveLength(1);
    expect(decayed[0].status).toBe("pending");
    expect(decayed[0].waiver_reason).toBeUndefined();
  });

  it("does not decay active waivers", () => {
    eng.waive({
      kickoff_id: "KICK-JMDIE-2026Q2",
      item_id: "POC_CONFIRMED",
      waived_at: T0 + 1,
      waived_by: "pm",
      reason: LONG_REASON,
      expires_at: T0 + 30 * DAY,
    });
    expect(eng.sweepExpiredWaivers(T0 + 5 * DAY)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// canKickoff
// ─────────────────────────────────────────────────────────────

describe("canKickoff", () => {
  beforeEach(() => {
    eng.register(reg());
  });

  it("returns ok=false with 10 gaps on fresh kickoff", () => {
    const v = eng.canKickoff("KICK-JMDIE-2026Q2", T0 + 1);
    expect(v.ok).toBe(false);
    expect(v.pending).toBe(10);
    expect(v.gaps).toHaveLength(10);
  });

  it("returns ok=true once every item is verified or waived", () => {
    for (const def of CANONICAL_ITEMS) {
      if (def.critical) {
        eng.verify(verifyItem(def.item_id));
      } else if (def.evidence_optional) {
        eng.verify({
          kickoff_id: "KICK-JMDIE-2026Q2",
          item_id: def.item_id,
          filled_at: T0 + 1,
          signed_off_by: "x",
        });
      } else {
        // waive the non-critical ones to cover waived path
        eng.waive({
          kickoff_id: "KICK-JMDIE-2026Q2",
          item_id: def.item_id,
          waived_at: T0 + 1,
          waived_by: "pm",
          reason: LONG_REASON,
        });
      }
    }
    const v = eng.canKickoff("KICK-JMDIE-2026Q2", T0 + 2);
    expect(v.ok).toBe(true);
    expect(v.verified + v.waived).toBe(CANONICAL_ITEMS.length);
  });

  it("flags expired waivers as pending in real time", () => {
    eng.waive({
      kickoff_id: "KICK-JMDIE-2026Q2",
      item_id: "POC_CONFIRMED",
      waived_at: T0 + 1,
      waived_by: "pm",
      reason: LONG_REASON,
      expires_at: T0 + 2 * DAY,
    });
    const v1 = eng.canKickoff("KICK-JMDIE-2026Q2", T0 + 1 * DAY);
    expect(v1.waived).toBe(1);
    const v2 = eng.canKickoff("KICK-JMDIE-2026Q2", T0 + 3 * DAY);
    expect(v2.waived).toBe(0);
    expect(v2.pending).toBeGreaterThan(0);
  });

  it("marks critical items in gap reasons", () => {
    const v = eng.canKickoff("KICK-JMDIE-2026Q2", T0 + 1);
    const nda = v.gaps.find((g) => g.item_id === "NDA_SIGNED");
    expect(nda?.reason).toMatch(/CRITICAL/);
  });
});

// ─────────────────────────────────────────────────────────────
// addCustomItem
// ─────────────────────────────────────────────────────────────

describe("addCustomItem", () => {
  beforeEach(() => {
    eng.register(reg());
  });

  it("adds a custom non-canonical item", () => {
    const k = eng.addCustomItem("KICK-JMDIE-2026Q2", {
      item_id: "ITAR_APPROVED",
      title: "ITAR export review cleared",
      description: "Compliance signed off export classification.",
      evidence_optional: false,
      critical: true,
    });
    expect(k.items).toHaveLength(CANONICAL_ITEMS.length + 1);
  });

  it("rejects shadowing a canonical item_id", () => {
    expect(() =>
      eng.addCustomItem("KICK-JMDIE-2026Q2", {
        item_id: "NDA_SIGNED",
        title: "dup",
        description: "dup",
        evidence_optional: false,
        critical: false,
      }),
    ).toThrow(/canonical/);
  });

  it("rejects duplicate custom id", () => {
    eng.addCustomItem("KICK-JMDIE-2026Q2", {
      item_id: "ITAR",
      title: "ITAR",
      description: "x",
      evidence_optional: false,
      critical: false,
    });
    expect(() =>
      eng.addCustomItem("KICK-JMDIE-2026Q2", {
        item_id: "ITAR",
        title: "dup",
        description: "x",
        evidence_optional: false,
        critical: false,
      }),
    ).toThrow(/already exists/);
  });
});

// ─────────────────────────────────────────────────────────────
// close
// ─────────────────────────────────────────────────────────────

describe("close", () => {
  beforeEach(() => {
    eng.register(reg());
  });

  it("rejects close when items pending", () => {
    expect(() =>
      eng.close({
        kickoff_id: "KICK-JMDIE-2026Q2",
        closed_at: T0 + 1,
        closed_by: "pm",
      }),
    ).toThrow(/pending/);
  });

  it("rejects empty closed_by", () => {
    // Complete everything first
    for (const def of CANONICAL_ITEMS) {
      if (def.evidence_optional) {
        eng.verify({
          kickoff_id: "KICK-JMDIE-2026Q2",
          item_id: def.item_id,
          filled_at: T0 + 1,
          signed_off_by: "x",
        });
      } else {
        eng.verify(verifyItem(def.item_id));
      }
    }
    expect(() =>
      eng.close({
        kickoff_id: "KICK-JMDIE-2026Q2",
        closed_at: T0 + 2,
        closed_by: " ",
      }),
    ).toThrow(/closed_by/);
  });

  it("closes when all items verified + rejects double close", () => {
    for (const def of CANONICAL_ITEMS) {
      if (def.evidence_optional) {
        eng.verify({
          kickoff_id: "KICK-JMDIE-2026Q2",
          item_id: def.item_id,
          filled_at: T0 + 1,
          signed_off_by: "x",
        });
      } else {
        eng.verify(verifyItem(def.item_id));
      }
    }
    const closed = eng.close({
      kickoff_id: "KICK-JMDIE-2026Q2",
      closed_at: T0 + 2,
      closed_by: "pm",
    });
    expect(closed.closed_at).toBe(T0 + 2);
    expect(() =>
      eng.close({
        kickoff_id: "KICK-JMDIE-2026Q2",
        closed_at: T0 + 3,
        closed_by: "pm",
      }),
    ).toThrow(/already closed/);
  });
});

// ─────────────────────────────────────────────────────────────
// listKickoffs / snapshot
// ─────────────────────────────────────────────────────────────

describe("listKickoffs", () => {
  it("filters by open_only", () => {
    eng.register(reg());
    eng.register(reg({ kickoff_id: "KICK-OTHER", blocker_id: "MOU-B" }));
    for (const def of CANONICAL_ITEMS) {
      if (def.evidence_optional) {
        eng.verify({
          kickoff_id: "KICK-JMDIE-2026Q2",
          item_id: def.item_id,
          filled_at: T0 + 1,
          signed_off_by: "x",
        });
      } else {
        eng.verify(verifyItem(def.item_id));
      }
    }
    eng.close({
      kickoff_id: "KICK-JMDIE-2026Q2",
      closed_at: T0 + 2,
      closed_by: "pm",
    });
    expect(eng.listKickoffs()).toHaveLength(2);
    expect(eng.listKickoffs({ open_only: true })).toHaveLength(1);
  });
});

describe("snapshot", () => {
  it("round-trips state with schemaVersion 1", () => {
    eng.register(reg());
    eng.verify(verifyItem("NDA_SIGNED"));
    const snap = eng.toSnapshot();
    expect(snap.schemaVersion).toBe(1);
    const eng2 = new PreMOUKickoffChecklistEngine();
    eng2.loadSnapshot(snap);
    const k = eng2.getKickoff("KICK-JMDIE-2026Q2");
    expect(k?.items.find((i) => i.item_id === "NDA_SIGNED")?.status).toBe(
      "verified",
    );
  });

  it("rejects unknown schemaVersion", () => {
    expect(() =>
      eng.loadSnapshot({ schemaVersion: 99, kickoffs: [] }),
    ).toThrow(/schemaVersion/);
  });

  it("clearAll empties state", () => {
    eng.register(reg());
    eng.clearAll();
    expect(eng.listKickoffs()).toHaveLength(0);
  });

  it("getKickoff returns null when missing", () => {
    expect(eng.getKickoff("nope")).toBeNull();
  });
});

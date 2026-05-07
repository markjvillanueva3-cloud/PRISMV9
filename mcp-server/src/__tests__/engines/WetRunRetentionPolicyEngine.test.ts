/**
 * WetRunRetentionPolicyEngine — companion tests
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-RETENTION
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WetRunRetentionPolicyEngine,
  type RegisterInput,
} from "../../engines/WetRunRetentionPolicyEngine.js";

const T0 = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function baseRegister(overrides: Partial<RegisterInput> = {}): RegisterInput {
  return {
    artifact_id: "art-001",
    pilot_id: "PILOT-A",
    kind: "program_revision",
    regimes: ["AS9100"],
    created_at: T0,
    ...overrides,
  };
}

describe("WetRunRetentionPolicyEngine", () => {
  let engine: WetRunRetentionPolicyEngine;
  beforeEach(() => {
    engine = new WetRunRetentionPolicyEngine();
  });

  describe("register", () => {
    it("computes purge_eligible_at = created_at + max regime window", () => {
      const art = engine.register(baseRegister({ regimes: ["AS9100"] }));
      expect(art.purge_eligible_at).toBe(T0 + 2 * 365 * DAY);
    });

    it("picks the LONGEST regime window when multiple apply", () => {
      const art = engine.register(
        baseRegister({ regimes: ["AS9100", "ITAR", "ISO_9001"] }),
      );
      // ITAR = 5*365 is longest
      expect(art.purge_eligible_at).toBe(T0 + 5 * 365 * DAY);
      // regimes persisted sorted
      expect(art.regimes).toEqual(["AS9100", "ISO_9001", "ITAR"]);
    });

    it("rejects duplicate artifact_id", () => {
      engine.register(baseRegister());
      expect(() => engine.register(baseRegister())).toThrow(
        /already registered/,
      );
    });

    it("rejects empty regime list", () => {
      expect(() =>
        engine.register(baseRegister({ regimes: [] })),
      ).toThrow(/at least one regime/);
    });

    it("rejects duplicate regime", () => {
      expect(() =>
        engine.register(
          baseRegister({ regimes: ["AS9100", "AS9100"] }),
        ),
      ).toThrow(/duplicate regime/);
    });

    it("rejects invalid regime", () => {
      expect(() =>
        engine.register(
          baseRegister({
            regimes: ["MADE_UP" as unknown as RegisterInput["regimes"][0]],
          }),
        ),
      ).toThrow(/invalid regime/);
    });

    it("rejects invalid kind", () => {
      expect(() =>
        engine.register(
          baseRegister({
            kind: "unknown_kind" as unknown as RegisterInput["kind"],
          }),
        ),
      ).toThrow(/invalid artifact kind/);
    });
  });

  describe("canPurge", () => {
    it("refuses purge before retention window expires", () => {
      engine.register(baseRegister({ regimes: ["AS9100"] }));
      const check = engine.canPurge("art-001", T0 + 30 * DAY);
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/retention window/);
    });

    it("allows purge after retention window expires (pre-schedule)", () => {
      engine.register(baseRegister({ regimes: ["AS9100"] }));
      const check = engine.canPurge("art-001", T0 + 2 * 365 * DAY + DAY);
      expect(check.allowed).toBe(true);
    });

    it("refuses purge while on legal hold", () => {
      engine.register(baseRegister());
      engine.setLegalHold({
        artifact_id: "art-001",
        set_by: "legal-counsel",
        approver: "gc",
        reason:
          "litigation hold for export-control case — preserve until counsel releases",
        set_at: T0 + 10,
      });
      const check = engine.canPurge(
        "art-001",
        T0 + 100 * 365 * DAY,
      );
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/legal hold/);
    });

    it("refuses second purge after already purged", () => {
      engine.register(baseRegister({ regimes: ["INTERNAL_RND"] }));
      engine.schedulePurge({
        artifact_id: "art-001",
        target_purge_at: T0 + 365 * DAY + 1,
        scheduled_by: "records-officer",
        approver: "compliance-manager",
        reason:
          "routine INTERNAL_RND retention window expiry; no legal hold attached",
      });
      engine.executePurge({
        artifact_id: "art-001",
        purged_at: T0 + 365 * DAY + 2,
      });
      const check = engine.canPurge("art-001", T0 + 365 * DAY + 3);
      expect(check.allowed).toBe(false);
      expect(check.reason).toMatch(/already purged/);
    });
  });

  describe("schedulePurge", () => {
    it("schedules a purge with four-eyes and reason", () => {
      engine.register(baseRegister());
      const art = engine.schedulePurge({
        artifact_id: "art-001",
        target_purge_at: T0 + 2 * 365 * DAY + 1,
        scheduled_by: "records-officer",
        approver: "compliance-manager",
        reason:
          "routine AS9100 retention window expiry; no legal hold or audit activity attached",
      });
      expect(art.state).toBe("purge_scheduled");
      expect(art.purge_target_at).toBe(T0 + 2 * 365 * DAY + 1);
    });

    it("rejects target_purge_at before retention window end", () => {
      engine.register(baseRegister());
      expect(() =>
        engine.schedulePurge({
          artifact_id: "art-001",
          target_purge_at: T0 + 30 * DAY,
          scheduled_by: "records-officer",
          approver: "compliance-manager",
          reason:
            "records officer attempts to purge before AS9100 window expires — must reject",
        }),
      ).toThrow(/precedes retention window end/);
    });

    it("rejects four-eyes violation", () => {
      engine.register(baseRegister());
      expect(() =>
        engine.schedulePurge({
          artifact_id: "art-001",
          target_purge_at: T0 + 2 * 365 * DAY + 1,
          scheduled_by: "records-officer",
          approver: "records-officer",
          reason:
            "self-approved scheduling violates the four-eyes requirement on purge operations",
        }),
      ).toThrow(/four-eyes/);
    });

    it("rejects short reason", () => {
      engine.register(baseRegister());
      expect(() =>
        engine.schedulePurge({
          artifact_id: "art-001",
          target_purge_at: T0 + 2 * 365 * DAY + 1,
          scheduled_by: "records-officer",
          approver: "compliance-manager",
          reason: "short",
        }),
      ).toThrow(/at least 40/);
    });
  });

  describe("cancelScheduledPurge", () => {
    it("cancels and returns to retained state", () => {
      engine.register(baseRegister());
      engine.schedulePurge({
        artifact_id: "art-001",
        target_purge_at: T0 + 2 * 365 * DAY + 1,
        scheduled_by: "records-officer",
        approver: "compliance-manager",
        reason:
          "routine AS9100 retention window expiry; no legal hold or audit activity attached",
      });
      const art = engine.cancelScheduledPurge({
        artifact_id: "art-001",
        cancelled_by: "compliance-manager",
        reason:
          "customer audit initiated on this pilot batch — defer purge until audit concludes",
      });
      expect(art.state).toBe("retained");
      expect(art.purge_target_at).toBeUndefined();
    });

    it("rejects cancel on non-scheduled artifact", () => {
      engine.register(baseRegister());
      expect(() =>
        engine.cancelScheduledPurge({
          artifact_id: "art-001",
          cancelled_by: "compliance-manager",
          reason:
            "attempting to cancel a purge that was never scheduled should fail",
        }),
      ).toThrow(/cannot cancel purge/);
    });
  });

  describe("executePurge", () => {
    it("marks artifact purged once scheduled target reached", () => {
      engine.register(baseRegister({ regimes: ["INTERNAL_RND"] }));
      engine.schedulePurge({
        artifact_id: "art-001",
        target_purge_at: T0 + 365 * DAY + 1,
        scheduled_by: "records-officer",
        approver: "compliance-manager",
        reason:
          "routine INTERNAL_RND retention window expiry; no legal hold attached",
      });
      const art = engine.executePurge({
        artifact_id: "art-001",
        purged_at: T0 + 365 * DAY + 10,
      });
      expect(art.state).toBe("purged");
      expect(art.purged_at).toBe(T0 + 365 * DAY + 10);
    });

    it("rejects execute before scheduled target", () => {
      engine.register(baseRegister({ regimes: ["INTERNAL_RND"] }));
      engine.schedulePurge({
        artifact_id: "art-001",
        target_purge_at: T0 + 365 * DAY + 100,
        scheduled_by: "records-officer",
        approver: "compliance-manager",
        reason:
          "routine INTERNAL_RND retention window expiry; no legal hold attached",
      });
      expect(() =>
        engine.executePurge({
          artifact_id: "art-001",
          purged_at: T0 + 365 * DAY + 50,
        }),
      ).toThrow(/scheduled purge not yet reached/);
    });

    it("rejects execute without prior schedule", () => {
      engine.register(baseRegister({ regimes: ["INTERNAL_RND"] }));
      expect(() =>
        engine.executePurge({
          artifact_id: "art-001",
          purged_at: T0 + 365 * DAY + 1,
        }),
      ).toThrow(/must be scheduled/);
    });
  });

  describe("legal hold", () => {
    it("drops a scheduled purge when hold is set", () => {
      engine.register(baseRegister());
      engine.schedulePurge({
        artifact_id: "art-001",
        target_purge_at: T0 + 2 * 365 * DAY + 1,
        scheduled_by: "records-officer",
        approver: "compliance-manager",
        reason:
          "routine AS9100 retention window expiry; no legal hold or audit activity attached",
      });
      const art = engine.setLegalHold({
        artifact_id: "art-001",
        set_by: "legal-counsel",
        approver: "gc",
        reason:
          "litigation hold for export-control case — preserve until counsel releases",
        set_at: T0 + 365 * DAY,
      });
      expect(art.state).toBe("legal_hold");
      expect(art.purge_target_at).toBeUndefined();
    });

    it("refuses hold on already-purged artifact", () => {
      engine.register(baseRegister({ regimes: ["INTERNAL_RND"] }));
      engine.schedulePurge({
        artifact_id: "art-001",
        target_purge_at: T0 + 365 * DAY + 1,
        scheduled_by: "records-officer",
        approver: "compliance-manager",
        reason:
          "routine INTERNAL_RND retention window expiry; no legal hold attached",
      });
      engine.executePurge({
        artifact_id: "art-001",
        purged_at: T0 + 365 * DAY + 2,
      });
      expect(() =>
        engine.setLegalHold({
          artifact_id: "art-001",
          set_by: "legal-counsel",
          approver: "gc",
          reason:
            "attempted hold on already-purged artifact must fail cleanly for audit trail",
          set_at: T0 + 365 * DAY + 5,
        }),
      ).toThrow(/already-purged/);
    });

    it("refuses double hold", () => {
      engine.register(baseRegister());
      engine.setLegalHold({
        artifact_id: "art-001",
        set_by: "legal-counsel",
        approver: "gc",
        reason:
          "litigation hold for export-control case — preserve until counsel releases",
        set_at: T0 + 10,
      });
      expect(() =>
        engine.setLegalHold({
          artifact_id: "art-001",
          set_by: "legal-counsel",
          approver: "gc",
          reason:
            "re-applying hold on an already-held artifact is a no-op but must surface cleanly",
          set_at: T0 + 20,
        }),
      ).toThrow(/already on legal hold/);
    });

    it("releases a legal hold via four-eyes with reason", () => {
      engine.register(baseRegister());
      engine.setLegalHold({
        artifact_id: "art-001",
        set_by: "legal-counsel",
        approver: "gc",
        reason:
          "litigation hold for export-control case — preserve until counsel releases",
        set_at: T0 + 10,
      });
      const art = engine.releaseLegalHold({
        artifact_id: "art-001",
        released_by: "legal-counsel",
        approver: "gc",
        reason:
          "case closed via settlement — routine retention policy resumes from this date",
        released_at: T0 + 50,
      });
      expect(art.state).toBe("retained");
      expect(art.legal_hold_released_at).toBe(T0 + 50);
    });

    it("rejects release four-eyes violation", () => {
      engine.register(baseRegister());
      engine.setLegalHold({
        artifact_id: "art-001",
        set_by: "legal-counsel",
        approver: "gc",
        reason:
          "litigation hold for export-control case — preserve until counsel releases",
        set_at: T0 + 10,
      });
      expect(() =>
        engine.releaseLegalHold({
          artifact_id: "art-001",
          released_by: "legal-counsel",
          approver: "legal-counsel",
          reason:
            "self-approved release violates the four-eyes principle for legal-hold teardown",
          released_at: T0 + 50,
        }),
      ).toThrow(/four-eyes/);
    });

    it("rejects released_at before set_at", () => {
      engine.register(baseRegister());
      engine.setLegalHold({
        artifact_id: "art-001",
        set_by: "legal-counsel",
        approver: "gc",
        reason:
          "litigation hold for export-control case — preserve until counsel releases",
        set_at: T0 + 100,
      });
      expect(() =>
        engine.releaseLegalHold({
          artifact_id: "art-001",
          released_by: "legal-counsel",
          approver: "gc",
          reason:
            "released at timestamp before the hold was set — logically impossible so reject",
          released_at: T0 + 50,
        }),
      ).toThrow(/cannot precede legal_hold_set_at/);
    });
  });

  describe("dueForPurge", () => {
    it("lists artifacts past eligibility not on hold or already purged", () => {
      engine.register(
        baseRegister({ artifact_id: "a1", regimes: ["INTERNAL_RND"] }),
      );
      engine.register(
        baseRegister({ artifact_id: "a2", regimes: ["AS9100"] }),
      );
      const due = engine.dueForPurge(T0 + 2 * 365 * DAY + 1);
      const ids = due.map((d) => d.artifact_id).sort();
      expect(ids).toEqual(["a1", "a2"]);
    });

    it("excludes legal-hold and purged artifacts", () => {
      engine.register(
        baseRegister({ artifact_id: "a1", regimes: ["INTERNAL_RND"] }),
      );
      engine.register(
        baseRegister({ artifact_id: "a2", regimes: ["INTERNAL_RND"] }),
      );
      engine.setLegalHold({
        artifact_id: "a1",
        set_by: "legal-counsel",
        approver: "gc",
        reason:
          "litigation hold preserves this artifact beyond its normal retention window",
        set_at: T0 + 10,
      });
      const due = engine.dueForPurge(T0 + 365 * DAY + 1);
      expect(due.map((d) => d.artifact_id)).toEqual(["a2"]);
    });
  });

  describe("snapshot + static helpers", () => {
    it("snapshot captures schemaVersion + artifacts", () => {
      engine.register(baseRegister());
      const snap = engine.snapshot();
      expect(snap.schemaVersion).toBe(1);
      expect(snap.artifacts).toHaveLength(1);
    });

    it("is defensively copied", () => {
      engine.register(baseRegister());
      const snap = engine.snapshot();
      snap.artifacts[0]!.regimes.push("ITAR");
      expect(engine.get("art-001")?.regimes).toEqual(["AS9100"]);
    });

    it("regimeWindowDays exposes the canonical windows", () => {
      expect(WetRunRetentionPolicyEngine.regimeWindowDays("ITAR")).toBe(
        5 * 365,
      );
      expect(
        WetRunRetentionPolicyEngine.regimeWindowDays("INTERNAL_RND"),
      ).toBe(365);
    });

    it("listArtifacts filters by pilot_id", () => {
      engine.register(baseRegister({ artifact_id: "a1", pilot_id: "P1" }));
      engine.register(baseRegister({ artifact_id: "a2", pilot_id: "P2" }));
      expect(engine.listArtifacts("P1").map((a) => a.artifact_id)).toEqual([
        "a1",
      ]);
    });
  });
});

/**
 * WetRunNonConformanceEngine — companion tests
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-NCR
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  WetRunNonConformanceEngine,
  type OpenInput,
  type Disposition,
  type NCRSeverity,
} from "../../engines/WetRunNonConformanceEngine.js";

const T0 = 1_700_000_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;

function baseOpen(overrides: Partial<OpenInput> = {}): OpenInput {
  return {
    pilot_id: "PILOT-A",
    opened_at: T0,
    kind: "dimensional_out_of_spec",
    severity: "cosmetic",
    inspector: "inspector-1",
    observation:
      "Bore diameter measured 0.02mm over upper spec limit on first-article sample",
    affected_quantity: 3,
    ...overrides,
  };
}

describe("WetRunNonConformanceEngine", () => {
  let engine: WetRunNonConformanceEngine;
  beforeEach(() => {
    engine = new WetRunNonConformanceEngine();
  });

  describe("open", () => {
    it("opens a cosmetic NCR in 'open' state with no halt", () => {
      const n = engine.open(baseOpen());
      expect(n.state).toBe("open");
      expect(n.pilot_halt_required).toBe(false);
      expect(n.seq).toBe(1);
    });

    it("opens functional NCR in awaiting_mrb state", () => {
      const n = engine.open(baseOpen({ severity: "functional" }));
      expect(n.state).toBe("awaiting_mrb");
      expect(n.pilot_halt_required).toBe(false);
    });

    it("opens safety NCR in awaiting_mrb state with pilot_halt_required=true", () => {
      const n = engine.open(baseOpen({ severity: "safety" }));
      expect(n.state).toBe("awaiting_mrb");
      expect(n.pilot_halt_required).toBe(true);
    });

    it("rejects observation shorter than 40 chars", () => {
      expect(() =>
        engine.open(baseOpen({ observation: "too short" })),
      ).toThrow(/at least 40/);
    });

    it("rejects non-positive affected_quantity", () => {
      expect(() =>
        engine.open(baseOpen({ affected_quantity: 0 })),
      ).toThrow(/positive integer/);
    });

    it("rejects invalid kind", () => {
      expect(() =>
        engine.open(
          baseOpen({ kind: "cosmic_rays" as unknown as OpenInput["kind"] }),
        ),
      ).toThrow(/invalid NCR kind/);
    });

    it("rejects invalid severity", () => {
      expect(() =>
        engine.open(
          baseOpen({ severity: "mild" as unknown as NCRSeverity }),
        ),
      ).toThrow(/invalid NCR severity/);
    });

    it("assigns per-pilot monotonic seq", () => {
      engine.open(baseOpen({ pilot_id: "P1" }));
      const second = engine.open(
        baseOpen({ pilot_id: "P1", opened_at: T0 + 1 }),
      );
      const other = engine.open(baseOpen({ pilot_id: "P2" }));
      expect(second.seq).toBe(2);
      expect(other.seq).toBe(1);
    });
  });

  describe("addMRBApproval", () => {
    it("accumulates distinct approvers", () => {
      const n = engine.open(baseOpen({ severity: "functional" }));
      const a = engine.addMRBApproval({
        ncr_id: n.id,
        approver: "quality-lead",
        approved_at: T0 + MIN,
      });
      expect(a.mrb_approvals).toHaveLength(1);
      const b = engine.addMRBApproval({
        ncr_id: n.id,
        approver: "engineering-manager",
        approved_at: T0 + 2 * MIN,
      });
      expect(b.mrb_approvals).toHaveLength(2);
    });

    it("rejects inspector as MRB approver (four-eyes)", () => {
      const n = engine.open(baseOpen({ severity: "functional" }));
      expect(() =>
        engine.addMRBApproval({
          ncr_id: n.id,
          approver: "inspector-1",
          approved_at: T0 + MIN,
        }),
      ).toThrow(/four-eyes/);
    });

    it("rejects duplicate approver on same NCR", () => {
      const n = engine.open(baseOpen({ severity: "functional" }));
      engine.addMRBApproval({
        ncr_id: n.id,
        approver: "quality-lead",
        approved_at: T0 + MIN,
      });
      expect(() =>
        engine.addMRBApproval({
          ncr_id: n.id,
          approver: "quality-lead",
          approved_at: T0 + 2 * MIN,
        }),
      ).toThrow(/already approved/);
    });

    it("rejects MRB approval on cosmetic NCRs", () => {
      const n = engine.open(baseOpen());
      expect(() =>
        engine.addMRBApproval({
          ncr_id: n.id,
          approver: "quality-lead",
          approved_at: T0 + MIN,
        }),
      ).toThrow(/cosmetic NCRs do not require MRB/);
    });

    it("rejects approved_at preceding opened_at", () => {
      const n = engine.open(
        baseOpen({ severity: "functional", opened_at: T0 + HOUR }),
      );
      expect(() =>
        engine.addMRBApproval({
          ncr_id: n.id,
          approver: "quality-lead",
          approved_at: T0,
        }),
      ).toThrow(/cannot precede opened_at/);
    });
  });

  describe("disposition", () => {
    it("dispositions a cosmetic NCR with a single signature, no MRB needed", () => {
      const n = engine.open(baseOpen());
      const d = engine.disposition({
        ncr_id: n.id,
        disposition: "use_as_is",
        reason:
          "Bore diameter 0.02mm over limit is cosmetic for this flange application",
        disposition_at: T0 + HOUR,
      });
      expect(d.state).toBe("dispositioned");
      expect(d.disposition).toBe("use_as_is");
    });

    it("rejects functional disposition without 2 MRB approvers", () => {
      const n = engine.open(baseOpen({ severity: "functional" }));
      engine.addMRBApproval({
        ncr_id: n.id,
        approver: "quality-lead",
        approved_at: T0 + MIN,
      });
      expect(() =>
        engine.disposition({
          ncr_id: n.id,
          disposition: "rework",
          reason:
            "rework path via regrind operation brings dimension back within spec envelope",
          disposition_at: T0 + HOUR,
        }),
      ).toThrow(/insufficient MRB quorum for functional/);
    });

    it("accepts functional disposition with 2 MRB approvers", () => {
      const n = engine.open(baseOpen({ severity: "functional" }));
      engine.addMRBApproval({
        ncr_id: n.id,
        approver: "quality-lead",
        approved_at: T0 + MIN,
      });
      engine.addMRBApproval({
        ncr_id: n.id,
        approver: "engineering-manager",
        approved_at: T0 + 2 * MIN,
      });
      const d = engine.disposition({
        ncr_id: n.id,
        disposition: "rework",
        reason:
          "rework path via regrind operation brings dimension back within spec envelope",
        disposition_at: T0 + HOUR,
      });
      expect(d.state).toBe("dispositioned");
    });

    it("rejects safety disposition without 3 MRB approvers", () => {
      const n = engine.open(baseOpen({ severity: "safety" }));
      engine.addMRBApproval({
        ncr_id: n.id,
        approver: "quality-lead",
        approved_at: T0 + MIN,
      });
      engine.addMRBApproval({
        ncr_id: n.id,
        approver: "engineering-manager",
        approved_at: T0 + 2 * MIN,
      });
      expect(() =>
        engine.disposition({
          ncr_id: n.id,
          disposition: "scrap",
          reason:
            "scrap due to safety-affecting material defect detected on early cut sample",
          disposition_at: T0 + HOUR,
        }),
      ).toThrow(/insufficient MRB quorum for safety/);
    });

    it("requires unanimous_consent for safety use_as_is", () => {
      const n = engine.open(baseOpen({ severity: "safety" }));
      for (const a of ["quality-lead", "engineering-manager", "director"]) {
        engine.addMRBApproval({
          ncr_id: n.id,
          approver: a,
          approved_at: T0 + MIN,
        });
      }
      expect(() =>
        engine.disposition({
          ncr_id: n.id,
          disposition: "use_as_is",
          reason:
            "use-as-is on a safety-class NCR without unanimous consent must be rejected",
          disposition_at: T0 + HOUR,
        }),
      ).toThrow(/unanimous_consent=true/);
    });

    it("accepts safety use_as_is when unanimous_consent=true", () => {
      const n = engine.open(baseOpen({ severity: "safety" }));
      for (const a of ["quality-lead", "engineering-manager", "director"]) {
        engine.addMRBApproval({
          ncr_id: n.id,
          approver: a,
          approved_at: T0 + MIN,
        });
      }
      const d = engine.disposition({
        ncr_id: n.id,
        disposition: "use_as_is",
        reason:
          "engineering review confirmed this is below the safety-factor threshold with full MRB unanimous consent",
        disposition_at: T0 + HOUR,
        unanimous_consent: true,
      });
      expect(d.disposition).toBe("use_as_is");
      expect(d.unanimous_consent).toBe(true);
    });

    it("rejects unanimous_consent flag on non-safety or non-use_as_is", () => {
      const n = engine.open(baseOpen({ severity: "functional" }));
      engine.addMRBApproval({
        ncr_id: n.id,
        approver: "quality-lead",
        approved_at: T0 + MIN,
      });
      engine.addMRBApproval({
        ncr_id: n.id,
        approver: "engineering-manager",
        approved_at: T0 + 2 * MIN,
      });
      expect(() =>
        engine.disposition({
          ncr_id: n.id,
          disposition: "rework",
          reason:
            "rework path via regrind operation brings dimension back within spec envelope",
          disposition_at: T0 + HOUR,
          unanimous_consent: true,
        }),
      ).toThrow(/only meaningful for safety/);
    });

    it("rejects MRB_review_required as a terminal disposition", () => {
      const n = engine.open(baseOpen());
      expect(() =>
        engine.disposition({
          ncr_id: n.id,
          disposition: "MRB_review_required" as Disposition,
          reason:
            "placeholder disposition cannot be used as terminal state because it means 'not yet decided'",
          disposition_at: T0 + HOUR,
        }),
      ).toThrow(/holding state/);
    });

    it("rejects disposition reason shorter than 50 chars", () => {
      const n = engine.open(baseOpen());
      expect(() =>
        engine.disposition({
          ncr_id: n.id,
          disposition: "scrap",
          reason: "too brief rationale",
          disposition_at: T0 + HOUR,
        }),
      ).toThrow(/at least 50/);
    });
  });

  describe("close", () => {
    it("closes a cosmetic NCR after disposition", () => {
      const n = engine.open(baseOpen());
      engine.disposition({
        ncr_id: n.id,
        disposition: "rework",
        reason:
          "rework path via deburr operation is sufficient given cosmetic classification",
        disposition_at: T0 + HOUR,
      });
      const c = engine.close({
        ncr_id: n.id,
        closed_at: T0 + 2 * HOUR,
        closed_by: "quality-lead",
      });
      expect(c.state).toBe("closed");
    });

    it("requires car_id for functional NCR close", () => {
      const n = engine.open(baseOpen({ severity: "functional" }));
      engine.addMRBApproval({
        ncr_id: n.id,
        approver: "quality-lead",
        approved_at: T0 + MIN,
      });
      engine.addMRBApproval({
        ncr_id: n.id,
        approver: "engineering-manager",
        approved_at: T0 + 2 * MIN,
      });
      engine.disposition({
        ncr_id: n.id,
        disposition: "rework",
        reason:
          "rework path via regrind operation brings dimension back within spec envelope",
        disposition_at: T0 + HOUR,
      });
      expect(() =>
        engine.close({
          ncr_id: n.id,
          closed_at: T0 + 2 * HOUR,
          closed_by: "quality-lead",
        }),
      ).toThrow(/requires a linked CAR/);
    });

    it("closes a functional NCR with a CAR", () => {
      const n = engine.open(baseOpen({ severity: "functional" }));
      engine.addMRBApproval({
        ncr_id: n.id,
        approver: "quality-lead",
        approved_at: T0 + MIN,
      });
      engine.addMRBApproval({
        ncr_id: n.id,
        approver: "engineering-manager",
        approved_at: T0 + 2 * MIN,
      });
      engine.disposition({
        ncr_id: n.id,
        disposition: "rework",
        reason:
          "rework path via regrind operation brings dimension back within spec envelope",
        disposition_at: T0 + HOUR,
      });
      const c = engine.close({
        ncr_id: n.id,
        closed_at: T0 + 2 * HOUR,
        closed_by: "quality-lead",
        car_id: "CAR-2026-001",
      });
      expect(c.state).toBe("closed");
      expect(c.car_id).toBe("CAR-2026-001");
    });

    it("rejects close when not yet dispositioned", () => {
      const n = engine.open(baseOpen());
      expect(() =>
        engine.close({
          ncr_id: n.id,
          closed_at: T0 + HOUR,
          closed_by: "quality-lead",
        }),
      ).toThrow(/must be dispositioned/);
    });

    it("rejects close_at preceding disposition_at", () => {
      const n = engine.open(baseOpen());
      engine.disposition({
        ncr_id: n.id,
        disposition: "scrap",
        reason:
          "scrap path is the cleanest disposition for this out-of-spec cosmetic issue",
        disposition_at: T0 + HOUR,
      });
      expect(() =>
        engine.close({
          ncr_id: n.id,
          closed_at: T0 + MIN,
          closed_by: "quality-lead",
        }),
      ).toThrow(/cannot precede disposition_at/);
    });
  });

  describe("pilotHaltRequired", () => {
    it("returns true while an open safety NCR exists", () => {
      engine.open(baseOpen({ severity: "safety" }));
      expect(engine.pilotHaltRequired("PILOT-A")).toBe(true);
    });

    it("returns false after the safety NCR closes", () => {
      const n = engine.open(baseOpen({ severity: "safety" }));
      for (const a of ["quality-lead", "engineering-manager", "director"]) {
        engine.addMRBApproval({
          ncr_id: n.id,
          approver: a,
          approved_at: T0 + MIN,
        });
      }
      engine.disposition({
        ncr_id: n.id,
        disposition: "scrap",
        reason:
          "scrap disposition is the only safe path for this safety-class nonconformance",
        disposition_at: T0 + HOUR,
      });
      engine.close({
        ncr_id: n.id,
        closed_at: T0 + 2 * HOUR,
        closed_by: "quality-lead",
        car_id: "CAR-2026-002",
      });
      expect(engine.pilotHaltRequired("PILOT-A")).toBe(false);
    });

    it("returns false when only cosmetic or functional NCRs are open", () => {
      engine.open(baseOpen({ severity: "functional" }));
      engine.open(baseOpen({ severity: "cosmetic", opened_at: T0 + 1 }));
      expect(engine.pilotHaltRequired("PILOT-A")).toBe(false);
    });
  });

  describe("openCounts", () => {
    it("counts open NCRs by severity", () => {
      engine.open(baseOpen());
      engine.open(baseOpen({ severity: "functional", opened_at: T0 + 1 }));
      engine.open(baseOpen({ severity: "safety", opened_at: T0 + 2 }));
      const c = engine.openCounts("PILOT-A");
      expect(c.total_open).toBe(3);
      expect(c.by_severity.cosmetic).toBe(1);
      expect(c.by_severity.functional).toBe(1);
      expect(c.by_severity.safety).toBe(1);
    });

    it("excludes closed NCRs from counts", () => {
      const n = engine.open(baseOpen());
      engine.disposition({
        ncr_id: n.id,
        disposition: "scrap",
        reason:
          "scrap disposition for cosmetic variant to simplify paperwork and close out batch",
        disposition_at: T0 + HOUR,
      });
      engine.close({
        ncr_id: n.id,
        closed_at: T0 + 2 * HOUR,
        closed_by: "quality-lead",
      });
      expect(engine.openCounts("PILOT-A").total_open).toBe(0);
    });
  });

  describe("snapshot + quorum table", () => {
    it("snapshot captures schemaVersion + records + last_seq_by_pilot", () => {
      engine.open(baseOpen({ pilot_id: "P1" }));
      engine.open(baseOpen({ pilot_id: "P1", opened_at: T0 + 1 }));
      engine.open(baseOpen({ pilot_id: "P2" }));
      const snap = engine.snapshot();
      expect(snap.schemaVersion).toBe(1);
      expect(snap.records).toHaveLength(3);
      expect(snap.last_seq_by_pilot["P1"]).toBe(2);
      expect(snap.last_seq_by_pilot["P2"]).toBe(1);
    });

    it("snapshot is defensively copied", () => {
      const n = engine.open(baseOpen({ severity: "functional" }));
      engine.addMRBApproval({
        ncr_id: n.id,
        approver: "quality-lead",
        approved_at: T0 + MIN,
      });
      const snap = engine.snapshot();
      snap.records[0]!.mrb_approvals.push({
        approver: "HACK",
        approved_at: T0 + 99,
      });
      expect(engine.getRecord(n.id)?.mrb_approvals).toHaveLength(1);
    });

    it("mrbQuorum returns canonical thresholds", () => {
      expect(WetRunNonConformanceEngine.mrbQuorum("cosmetic")).toBe(0);
      expect(WetRunNonConformanceEngine.mrbQuorum("functional")).toBe(2);
      expect(WetRunNonConformanceEngine.mrbQuorum("safety")).toBe(3);
    });
  });
});

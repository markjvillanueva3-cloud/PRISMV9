/**
 * WetRunPilotOrchestratorEngine — companion tests
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-ORCH
 *
 * These tests exercise the cross-engine composition by driving
 * each singleton through its real API. We use unique pilot_ids
 * per test to keep singletons from colliding across cases.
 */
import { describe, it, expect } from "vitest";
import { wetRunPilotOrchestratorEngine } from "../../engines/WetRunPilotOrchestratorEngine.js";
import { wetRunCustomerAcceptanceEngine } from "../../engines/WetRunCustomerAcceptanceEngine.js";
import { wetRunNonConformanceEngine } from "../../engines/WetRunNonConformanceEngine.js";
import { wetRunScrapLedgerEngine } from "../../engines/WetRunScrapLedgerEngine.js";
import { wetRunSupplierPassThroughEngine } from "../../engines/WetRunSupplierPassThroughEngine.js";
import { wetRunProgramVersionLockEngine } from "../../engines/WetRunProgramVersionLockEngine.js";

const T0 = 1_800_000_000_000; // offset from other suites to avoid seq/ts collision
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function uniquePilot(name: string): string {
  return `ORCH-${name}-${Math.random().toString(36).slice(2, 8)}`;
}

describe("WetRunPilotOrchestratorEngine", () => {
  describe("pilotPromotionReadiness", () => {
    it("returns ready=false for pilot with no state (missing lock)", () => {
      const pilot = uniquePilot("EMPTY");
      const r = wetRunPilotOrchestratorEngine.pilotPromotionReadiness(
        pilot,
        T0,
      );
      expect(r.ready).toBe(false);
      expect(r.blockers.some((b) => b.source === "version_lock")).toBe(true);
      expect(r.breakdown.version_lock.has_active_lock).toBe(false);
    });

    it("collects blockers from multiple sources", () => {
      const pilot = uniquePilot("MULTI");
      // seed an NCR to trigger ncr blocker
      wetRunNonConformanceEngine.open({
        pilot_id: pilot,
        opened_at: T0,
        kind: "dimensional_out_of_spec",
        severity: "functional",
        inspector: "alice@prism",
        observation:
          "bore oversize on first setup, flagged by in-process measurement",
        affected_quantity: 1,
      });
      const r = wetRunPilotOrchestratorEngine.pilotPromotionReadiness(
        pilot,
        T0 + HOUR,
      );
      expect(r.ready).toBe(false);
      const sources = new Set(r.blockers.map((b) => b.source));
      expect(sources.has("version_lock")).toBe(true);
      expect(sources.has("ncr")).toBe(true);
    });

    it("clears once every sub-system returns ready", () => {
      const pilot = uniquePilot("READY");
      // customer acceptance clean
      const sub = wetRunCustomerAcceptanceEngine.submit({
        pilot_id: pilot,
        batch_id: "B1",
        ts: T0,
        submitted_by: "alice@prism",
        customer_name: "ACME",
        customer_acceptor: "bob@acme",
      });
      wetRunCustomerAcceptanceEngine.decide({
        submission_id: sub.id,
        ts: T0 + HOUR,
        decision: "accepted",
        notes: "parts conform to drawing and traveler; CoC reviewed and filed",
      });
      // version lock active
      wetRunProgramVersionLockEngine.lock({
        pilot_id: pilot,
        locked_at: T0,
        locked_by: "carol@prism",
        approver: "dave@prism",
        artifacts: [
          {
            kind: "program_revision",
            artifact_id: "PRG-1",
            revision: "v1",
            hash_sha256: "a".repeat(64),
          },
        ],
        reason: "wet-run pilot entry — lock program to reviewed baseline for audit",
      });
      const r = wetRunPilotOrchestratorEngine.pilotPromotionReadiness(
        pilot,
        T0 + 2 * HOUR,
      );
      expect(r.blockers).toEqual([]);
      expect(r.ready).toBe(true);
      expect(r.breakdown.acceptance.ready_to_promote).toBe(true);
      expect(r.breakdown.version_lock.has_active_lock).toBe(true);
    });

    it("reports NCR halt_required distinctly from open_ncrs", () => {
      const pilot = uniquePilot("HALT");
      wetRunNonConformanceEngine.open({
        pilot_id: pilot,
        opened_at: T0,
        kind: "material_defect",
        severity: "safety",
        inspector: "alice@prism",
        observation:
          "safety-critical crack detected on hardened shank, batch must halt immediately",
        affected_quantity: 1,
      });
      const r = wetRunPilotOrchestratorEngine.pilotPromotionReadiness(
        pilot,
        T0 + HOUR,
      );
      const haltBlocker = r.blockers.find(
        (b) => b.source === "ncr" && b.code === "pilot_halt",
      );
      expect(haltBlocker).toBeDefined();
      expect(r.breakdown.ncr.halt_required).toBe(true);
    });

    it("rejects invalid pilot_id", () => {
      expect(() =>
        wetRunPilotOrchestratorEngine.pilotPromotionReadiness("", T0),
      ).toThrow(/pilot_id/);
    });

    it("rejects non-finite nowTs", () => {
      expect(() =>
        wetRunPilotOrchestratorEngine.pilotPromotionReadiness(
          uniquePilot("BADTS"),
          NaN,
        ),
      ).toThrow(/finite/);
    });
  });

  describe("businessCostSummary", () => {
    it("rolls scrap + pass-through cost metrics for a pilot", () => {
      const pilot = uniquePilot("COST");
      wetRunScrapLedgerEngine.record({
        pilot_id: pilot,
        ts: T0,
        part_number: "P-1",
        quantity: 1,
        material_cost_cents: 2000,
        labor_minutes: 60,
        overhead_rate_per_hour_cents: 6000,
        category: "in_process",
        salvageable: false,
        notes: "scrap from test-cut setup, cutter chipped during spindle warm-up",
      });
      wetRunSupplierPassThroughEngine.ship({
        pilot_id: pilot,
        batch_id: "B1",
        ts: T0,
        shipped_by: "alice@prism",
        process: "heat_treat",
        supplier_name: "Bodycote",
        supplier_po: "PO-1",
        traveler_doc_id: "TRAV-1",
        expected_return_ts: T0 + 2 * DAY,
        quantity: 10,
      });
      const s = wetRunPilotOrchestratorEngine.businessCostSummary(
        pilot,
        T0 + HOUR,
      );
      // 2000 + (60/60)*6000 = 8000
      expect(s.scrap_total_cents).toBe(8000);
      expect(s.scrap_net_loss_cents).toBe(8000);
      expect(s.open_pass_throughs).toBe(1);
      expect(s.overdue_pass_throughs).toBe(0);
    });

    it("flags overdue pass-throughs in summary", () => {
      const pilot = uniquePilot("OVERDUE");
      wetRunSupplierPassThroughEngine.ship({
        pilot_id: pilot,
        batch_id: "B1",
        ts: T0,
        shipped_by: "alice@prism",
        process: "heat_treat",
        supplier_name: "Bodycote",
        supplier_po: "PO-1",
        traveler_doc_id: "TRAV-1",
        expected_return_ts: T0 + 2 * DAY,
        quantity: 10,
        grace_hours: 12,
      });
      const s = wetRunPilotOrchestratorEngine.businessCostSummary(
        pilot,
        T0 + 3 * DAY,
      );
      expect(s.overdue_pass_throughs).toBe(1);
    });

    it("returns zeros for empty pilot", () => {
      const pilot = uniquePilot("ZERO");
      const s = wetRunPilotOrchestratorEngine.businessCostSummary(
        pilot,
        T0,
      );
      expect(s.scrap_total_cents).toBe(0);
      expect(s.scrap_salvaged_share).toBe(0);
      expect(s.open_pass_throughs).toBe(0);
    });
  });

  describe("complianceAuditSnapshot", () => {
    it("reports version_locked=false when no lock", () => {
      const pilot = uniquePilot("NOLOCK");
      const snap = wetRunPilotOrchestratorEngine.complianceAuditSnapshot(
        pilot,
        T0,
      );
      expect(snap.version_locked).toBe(false);
      expect(snap.active_lock_id).toBeUndefined();
    });

    it("returns active_lock_id once locked", () => {
      const pilot = uniquePilot("LOCKED");
      const lock = wetRunProgramVersionLockEngine.lock({
        pilot_id: pilot,
        locked_at: T0,
        locked_by: "carol@prism",
        approver: "dave@prism",
        artifacts: [
          { kind: "program_revision", artifact_id: "PRG-1", revision: "v1" },
        ],
        reason: "wet-run pilot entry — lock program to reviewed baseline for audit",
      });
      const snap = wetRunPilotOrchestratorEngine.complianceAuditSnapshot(
        pilot,
        T0 + HOUR,
      );
      expect(snap.version_locked).toBe(true);
      expect(snap.active_lock_id).toBe(lock.lock_id);
    });

    it("surfaces halt_required and open_ncrs separately", () => {
      const pilot = uniquePilot("HALT2");
      wetRunNonConformanceEngine.open({
        pilot_id: pilot,
        opened_at: T0,
        kind: "material_defect",
        severity: "safety",
        inspector: "alice@prism",
        observation:
          "safety-critical crack detected on hardened shank, batch must halt immediately",
        affected_quantity: 1,
      });
      wetRunNonConformanceEngine.open({
        pilot_id: pilot,
        opened_at: T0 + 1,
        kind: "surface_finish_fail",
        severity: "cosmetic",
        inspector: "alice@prism",
        observation:
          "minor cosmetic blem on non-critical flat face, deviation requested",
        affected_quantity: 1,
      });
      const snap = wetRunPilotOrchestratorEngine.complianceAuditSnapshot(
        pilot,
        T0 + HOUR,
      );
      expect(snap.halt_required).toBe(true);
      expect(snap.open_ncrs).toBe(2);
    });

    it("rejects non-finite nowTs", () => {
      expect(() =>
        wetRunPilotOrchestratorEngine.complianceAuditSnapshot(
          uniquePilot("BADTS"),
          Infinity,
        ),
      ).toThrow(/finite/);
    });
  });

  describe("multi-endpoint consistency", () => {
    it("readiness, cost, and audit share the same source of truth", () => {
      const pilot = uniquePilot("CONSISTENCY");
      wetRunScrapLedgerEngine.record({
        pilot_id: pilot,
        ts: T0,
        part_number: "P-1",
        quantity: 1,
        material_cost_cents: 1000,
        labor_minutes: 30,
        overhead_rate_per_hour_cents: 4000,
        category: "in_process",
        salvageable: false,
        notes: "scrap from test-cut setup, cutter chipped during spindle warm-up",
      });
      const readiness =
        wetRunPilotOrchestratorEngine.pilotPromotionReadiness(
          pilot,
          T0 + HOUR,
        );
      const cost = wetRunPilotOrchestratorEngine.businessCostSummary(
        pilot,
        T0 + HOUR,
      );
      expect(readiness.breakdown.scrap.total_cost_cents).toBe(
        cost.scrap_total_cents,
      );
    });
  });
});

/**
 * WetRunPilotOrchestratorEngine
 * ------------------------------------------------------------
 * Composes every wet-run-pilot engine into one authoritative
 * pilot view. Downstream dispatchers — prism_quality,
 * prism_business, prism_compliance — each delegate to this
 * orchestrator rather than re-querying every child engine.
 * This is the "engine used in multiple endpoints" node that
 * keeps the pilot-exit gate logic in exactly one place.
 *
 * Composed engines (all accessed via singleton imports so state
 * is shared with direct-dispatcher callers):
 *   WetRunCustomerAcceptanceEngine     — customer sign-off
 *   WetRunNonConformanceEngine         — NCR disposition
 *   WetRunDeviationRegistryEngine      — deviation justification
 *   WetRunSampleInspectionPlanEngine   — AQL lot inspection
 *   WetRunScrapLedgerEngine            — cost of scrap
 *   WetRunSupplierPassThroughEngine    — outsourced ops
 *   WetRunCustomerCommunicationLogEngine — comms SLA
 *   WetRunProgramVersionLockEngine     — artifact integrity
 *   WetRunRetentionPolicyEngine        — regulatory retention
 *   WetRunChangeFreezeEngine           — change governance
 *
 * Promotion-gate decision
 *   A pilot is ready to promote only when EVERY sub-system
 *   returns a non-blocking verdict. Any blocker is surfaced
 *   with its engine origin so callers can drill back.
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-ORCH
 */

import { wetRunCustomerAcceptanceEngine } from "./WetRunCustomerAcceptanceEngine.js";
import { wetRunNonConformanceEngine } from "./WetRunNonConformanceEngine.js";
import { wetRunDeviationRegistryEngine } from "./WetRunDeviationRegistryEngine.js";
import { wetRunSampleInspectionPlanEngine } from "./WetRunSampleInspectionPlanEngine.js";
import { wetRunScrapLedgerEngine } from "./WetRunScrapLedgerEngine.js";
import { wetRunSupplierPassThroughEngine } from "./WetRunSupplierPassThroughEngine.js";
import { wetRunCustomerCommunicationLogEngine } from "./WetRunCustomerCommunicationLogEngine.js";
import { wetRunProgramVersionLockEngine } from "./WetRunProgramVersionLockEngine.js";

// ============================================================================
// Types
// ============================================================================

export interface PromotionBlocker {
  source: string;
  code: string;
  message: string;
}

export interface PilotPromotionReadiness {
  pilot_id: string;
  as_of_ts: number;
  ready: boolean;
  blockers: PromotionBlocker[];
  breakdown: {
    acceptance: {
      submission_count: number;
      accepted: number;
      conditional_open: number;
      rejected: number;
      withdrawn: number;
      submitted_pending: number;
      outstanding_punch_items: number;
      ready_to_promote: boolean;
    };
    ncr: {
      halt_required: boolean;
      open_total: number;
      open_by_severity: Record<string, number>;
    };
    deviation: {
      verdict: string;
      blocker_count: number;
    };
    aql: {
      has_plan: boolean;
      state?: string;
      switching_rule?: string;
    };
    scrap: {
      entry_count: number;
      total_cost_cents: number;
      salvaged_cost_cents: number;
      net_loss_cost_cents: number;
    };
    pass_through: {
      open_count: number;
      overdue_count: number;
    };
    customer_comms: {
      open_count: number;
      breached_count: number;
    };
    version_lock: {
      has_active_lock: boolean;
      lock_id?: string;
    };
  };
}

export interface BusinessCostSummary {
  pilot_id: string;
  as_of_ts: number;
  scrap_total_cents: number;
  scrap_net_loss_cents: number;
  scrap_salvaged_share: number;
  open_pass_throughs: number;
  overdue_pass_throughs: number;
}

export interface ComplianceAuditSnapshot {
  pilot_id: string;
  as_of_ts: number;
  version_locked: boolean;
  active_lock_id?: string;
  open_ncrs: number;
  halt_required: boolean;
  open_deviations: number;
  breached_comms: number;
}

// ============================================================================
// Engine
// ============================================================================

export class WetRunPilotOrchestratorEngine {
  // --------------------------------------------------------------------
  // pilotPromotionReadiness — the authoritative exit gate
  // --------------------------------------------------------------------
  pilotPromotionReadiness(
    pilotId: string,
    nowTs: number,
  ): PilotPromotionReadiness {
    this.validateString(pilotId, "pilot_id");
    this.validateTs(nowTs);

    const blockers: PromotionBlocker[] = [];

    // ---- Customer acceptance ----
    const acc = wetRunCustomerAcceptanceEngine.promotionGate(pilotId);
    if (!acc.ready_to_promote) {
      for (const b of acc.blockers) {
        blockers.push({ source: "acceptance", code: "not_ready", message: b });
      }
    }

    // ---- NCR ----
    const haltRequired = wetRunNonConformanceEngine.pilotHaltRequired(pilotId);
    const ncrCounts = wetRunNonConformanceEngine.openCounts(pilotId);
    if (haltRequired) {
      blockers.push({
        source: "ncr",
        code: "pilot_halt",
        message: `unresolved safety NCR(s) require pilot halt`,
      });
    }
    if (ncrCounts.total_open > 0 && !haltRequired) {
      blockers.push({
        source: "ncr",
        code: "open_ncrs",
        message: `${ncrCounts.total_open} NCR(s) still open`,
      });
    }

    // ---- Deviations ----
    const devVerdict = wetRunDeviationRegistryEngine.promotionReadiness(
      pilotId,
      nowTs,
    );
    if (!devVerdict.ready) {
      for (const b of devVerdict.reasons) {
        blockers.push({
          source: "deviation",
          code: "not_ready",
          message: b,
        });
      }
    }

    // ---- AQL ----
    const aql = wetRunSampleInspectionPlanEngine.getState(pilotId);
    if (aql && aql.regime === "inspection_halted") {
      blockers.push({
        source: "aql",
        code: "plan_halted",
        message: `AQL plan halted — requires four-eyes restart`,
      });
    }

    // ---- Pass-through overdue ----
    const ptOpen = wetRunSupplierPassThroughEngine.openCountForPilot(pilotId);
    const ptOverdueAll = wetRunSupplierPassThroughEngine.overdueAt(nowTs);
    const ptOverdueMine = ptOverdueAll.filter((o) => o.pilot_id === pilotId);
    if (ptOverdueMine.length > 0) {
      blockers.push({
        source: "pass_through",
        code: "overdue",
        message: `${ptOverdueMine.length} outsourced op(s) overdue from supplier`,
      });
    }
    if (ptOpen > 0 && ptOverdueMine.length === 0) {
      blockers.push({
        source: "pass_through",
        code: "in_flight",
        message: `${ptOpen} outsourced op(s) still in flight`,
      });
    }

    // ---- Customer comms SLA ----
    const commsOpen = wetRunCustomerCommunicationLogEngine.openCount(pilotId);
    const breached = wetRunCustomerCommunicationLogEngine.listBreached(
      nowTs,
      pilotId,
    );
    if (breached.length > 0) {
      blockers.push({
        source: "customer_comms",
        code: "sla_breach",
        message: `${breached.length} SLA-breached comms threads`,
      });
    }

    // ---- Version lock ----
    const lock = wetRunProgramVersionLockEngine.activeLockFor(pilotId);
    if (!lock) {
      blockers.push({
        source: "version_lock",
        code: "missing",
        message: `no active program version lock for pilot`,
      });
    }

    // ---- Scrap (informational — not a blocker unless explicit policy) ----
    const scrap = wetRunScrapLedgerEngine.summariseForPilot(pilotId);

    const readiness: PilotPromotionReadiness = {
      pilot_id: pilotId,
      as_of_ts: nowTs,
      ready: blockers.length === 0,
      blockers,
      breakdown: {
        acceptance: {
          submission_count: acc.submission_count,
          accepted: acc.accepted,
          conditional_open: acc.conditional_open,
          rejected: acc.rejected,
          withdrawn: acc.withdrawn,
          submitted_pending: acc.submitted_pending,
          outstanding_punch_items: acc.outstanding_punch_items,
          ready_to_promote: acc.ready_to_promote,
        },
        ncr: {
          halt_required: haltRequired,
          open_total: ncrCounts.total_open,
          open_by_severity: { ...ncrCounts.by_severity },
        },
        deviation: {
          verdict: devVerdict.ready ? "ready" : "blocked",
          blocker_count: devVerdict.reasons.length,
        },
        aql: {
          has_plan: !!aql,
          state: aql?.regime,
          switching_rule: aql?.regime,
        },
        scrap: {
          entry_count: scrap.entry_count,
          total_cost_cents: scrap.total_cost_cents,
          salvaged_cost_cents: scrap.salvaged_cost_cents,
          net_loss_cost_cents: scrap.net_loss_cost_cents,
        },
        pass_through: {
          open_count: ptOpen,
          overdue_count: ptOverdueMine.length,
        },
        customer_comms: {
          open_count: commsOpen,
          breached_count: breached.length,
        },
        version_lock: {
          has_active_lock: !!lock,
          lock_id: lock?.lock_id,
        },
      },
    };
    return readiness;
  }

  // --------------------------------------------------------------------
  // businessCostSummary — lane for prism_business
  // --------------------------------------------------------------------
  businessCostSummary(pilotId: string, nowTs: number): BusinessCostSummary {
    this.validateString(pilotId, "pilot_id");
    this.validateTs(nowTs);
    const scrap = wetRunScrapLedgerEngine.summariseForPilot(pilotId);
    const salvagedShare = wetRunScrapLedgerEngine.salvagedShare(pilotId);
    const ptOpen = wetRunSupplierPassThroughEngine.openCountForPilot(pilotId);
    const overdue = wetRunSupplierPassThroughEngine
      .overdueAt(nowTs)
      .filter((o) => o.pilot_id === pilotId).length;
    return {
      pilot_id: pilotId,
      as_of_ts: nowTs,
      scrap_total_cents: scrap.total_cost_cents,
      scrap_net_loss_cents: scrap.net_loss_cost_cents,
      scrap_salvaged_share: salvagedShare,
      open_pass_throughs: ptOpen,
      overdue_pass_throughs: overdue,
    };
  }

  // --------------------------------------------------------------------
  // complianceAuditSnapshot — lane for prism_compliance
  // --------------------------------------------------------------------
  complianceAuditSnapshot(
    pilotId: string,
    nowTs: number,
  ): ComplianceAuditSnapshot {
    this.validateString(pilotId, "pilot_id");
    this.validateTs(nowTs);
    const lock = wetRunProgramVersionLockEngine.activeLockFor(pilotId);
    const ncrCounts = wetRunNonConformanceEngine.openCounts(pilotId);
    const haltRequired = wetRunNonConformanceEngine.pilotHaltRequired(pilotId);
    const devVerdict = wetRunDeviationRegistryEngine.promotionReadiness(
      pilotId,
      nowTs,
    );
    const breached = wetRunCustomerCommunicationLogEngine.listBreached(
      nowTs,
      pilotId,
    );
    return {
      pilot_id: pilotId,
      as_of_ts: nowTs,
      version_locked: !!lock,
      active_lock_id: lock?.lock_id,
      open_ncrs: ncrCounts.total_open,
      halt_required: haltRequired,
      open_deviations: devVerdict.reasons.length,
      breached_comms: breached.length,
    };
  }

  // --------------------------------------------------------------------
  // Internals
  // --------------------------------------------------------------------
  private validateString(v: string, label: string): void {
    if (typeof v !== "string" || v.trim().length === 0) {
      throw new Error(`${label} must be a non-empty string`);
    }
  }

  private validateTs(ts: number): void {
    if (!Number.isFinite(ts)) throw new Error(`ts must be finite`);
  }
}

// ============================================================================
// Singleton
// ============================================================================

export const wetRunPilotOrchestratorEngine =
  new WetRunPilotOrchestratorEngine();

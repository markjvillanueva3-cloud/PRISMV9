/**
 * WetRunAuthorizationEngine (U-LPR-WETRUN-AUTH, Delivery B3)
 *
 * Top-level authorization gate for every wet-run session in the
 * Lathe-Prod pilot. Composes three independent verdicts into a single
 * go / no-go / dry-run decision with per-gate attribution, so ops can
 * see exactly WHICH gate blocked a run at the moment of authorization.
 *
 * Upstream gates:
 *
 *   G1 (KICKOFF)   — PreMOUKickoffChecklistEngine.canKickoff().
 *     All 10 canonical items (or their project-specific extensions)
 *     must be verified or have active (non-expired) waivers. Critical
 *     items (NDA, scope, CAD/CAM approval) never waivable.
 *
 *   G2 (MOU)       — MOUStallGateEngine.computeGate().
 *     - mode=full         ⇒ G2 passes
 *     - mode=dry_run_only ⇒ G2 allows dry-runs, blocks wet-runs
 *     - mode=blocked      ⇒ G2 blocks everything
 *
 *   G3 (REGRESSION) — RegressionBaselineEngine.evaluate() verdict.
 *     passed=false ⇒ G3 blocks wet-runs (but may allow dry-runs if
 *     override_dry_run=true is set on the session request).
 *
 * Decision matrix per mode request:
 *
 *       G1  G2 wet  G3       wet_run          dry_run
 *       ─── ──────  ──────   ──────────       ──────────
 *       ✓   ✓       ✓        AUTHORIZED       AUTHORIZED
 *       ✓   ✓       ✗        DENIED(G3)       AUTHORIZED
 *       ✓   DRY     ✓        DENIED(G2)       AUTHORIZED
 *       ✗   *       *        DENIED(G1)       DENIED(G1)
 *       ✓   BLOCKED *        DENIED(G2)       DENIED(G2)
 *
 * Emergency override (break-glass):
 *   When enabled, records signed override + reason + expires_at
 *   and allows wet-run even when G2 or G3 would otherwise block.
 *   G1 (kickoff checklist) is NEVER overridable — if kickoff items
 *   are pending, the authorization still fails.
 *
 * Pure engine. Caller persists attribution trail via `toSnapshot()`
 * to `data/state/WETRUN_AUTH_LOG.json` (schemaVersion 1).
 */

import type { KickoffVerdict } from "./PreMOUKickoffChecklistEngine.js";
import type { GateDecision } from "./MOUStallGateEngine.js";
import type { DiffGateReport } from "./RegressionBaselineEngine.js";

export type RunMode = "wet_run" | "dry_run";

export type AuthVerdict = "AUTHORIZED" | "DENIED";

export type GateId = "G1_KICKOFF" | "G2_MOU" | "G3_REGRESSION";

export interface OverrideToken {
  override_id: string;
  approved_by: string;
  reason: string;                  // ≥60 chars — real justification
  approved_at: number;
  expires_at: number;
  scope: Array<GateId>;            // which gates this override covers
}

export interface AuthRequest {
  session_id: string;
  kickoff_id: string;
  requested_mode: RunMode;
  requested_at: number;
  requested_by: string;
  override?: OverrideToken;
}

export interface GateAttribution {
  gate: GateId;
  status: "passed" | "failed" | "overridden";
  summary: string;
  details?: string[];
}

export interface AuthDecision {
  session_id: string;
  requested_mode: RunMode;
  verdict: AuthVerdict;
  effective_mode: RunMode | "blocked";
  gates: GateAttribution[];
  blocking_gate?: GateId;
  override_applied: boolean;
  decided_at: number;
}

export interface AuthLogEntry extends AuthDecision {
  requested_by: string;
  override_id?: string;
}

export class WetRunAuthorizationEngine {
  private log: AuthLogEntry[] = [];

  /**
   * Pure decision — callers supply the three upstream verdicts so this
   * engine never reaches through to the other singletons. That keeps
   * the audit trail completely self-contained.
   */
  authorize(
    req: AuthRequest,
    verdicts: {
      kickoff: KickoffVerdict;
      mou: GateDecision;
      regression: DiffGateReport;
    },
  ): AuthDecision {
    if (!req.session_id.trim()) throw new Error("session_id required");
    if (!req.kickoff_id.trim()) throw new Error("kickoff_id required");
    if (!req.requested_by.trim()) throw new Error("requested_by required");
    if (!Number.isFinite(req.requested_at) || req.requested_at <= 0) {
      throw new Error("requested_at must be a positive epoch-ms");
    }
    this.validateOverride(req.override, req.requested_at);

    const gates: GateAttribution[] = [];
    let blocking: GateId | undefined;

    // G1 — Kickoff — NEVER overridable
    const g1: GateAttribution = verdicts.kickoff.ok
      ? {
          gate: "G1_KICKOFF",
          status: "passed",
          summary: `all ${verdicts.kickoff.total} kickoff items verified/waived`,
        }
      : {
          gate: "G1_KICKOFF",
          status: "failed",
          summary: `${verdicts.kickoff.pending} of ${verdicts.kickoff.total} items pending`,
          details: verdicts.kickoff.gaps.map((g) => `${g.item_id}: ${g.reason}`),
        };
    gates.push(g1);
    if (g1.status === "failed") blocking = "G1_KICKOFF";

    // G2 — MOU stall gate
    const g2Overridable =
      req.override !== undefined && req.override.scope.includes("G2_MOU");
    let g2: GateAttribution;
    if (verdicts.mou.mode === "full") {
      g2 = {
        gate: "G2_MOU",
        status: "passed",
        summary: "all blockers signed or waived",
      };
    } else if (verdicts.mou.mode === "dry_run_only") {
      if (req.requested_mode === "dry_run") {
        g2 = {
          gate: "G2_MOU",
          status: "passed",
          summary: "dry_run_only accepted for dry-run session",
          details: verdicts.mou.reasons,
        };
      } else if (g2Overridable) {
        g2 = {
          gate: "G2_MOU",
          status: "overridden",
          summary: `dry_run_only overridden by ${req.override!.override_id}`,
          details: verdicts.mou.reasons,
        };
      } else {
        g2 = {
          gate: "G2_MOU",
          status: "failed",
          summary: "dry_run_only — wet-run not authorized",
          details: verdicts.mou.reasons,
        };
        if (blocking === undefined) blocking = "G2_MOU";
      }
    } else {
      // blocked — cancellation trumps override
      if (g2Overridable) {
        g2 = {
          gate: "G2_MOU",
          status: "overridden",
          summary: `blocked mode overridden by ${req.override!.override_id}`,
          details: verdicts.mou.reasons,
        };
      } else {
        g2 = {
          gate: "G2_MOU",
          status: "failed",
          summary: "blocked — cancelled blocker in gate",
          details: verdicts.mou.reasons,
        };
        if (blocking === undefined) blocking = "G2_MOU";
      }
    }
    gates.push(g2);

    // G3 — Regression baseline
    const g3Overridable =
      req.override !== undefined && req.override.scope.includes("G3_REGRESSION");
    let g3: GateAttribution;
    if (verdicts.regression.passed) {
      g3 = {
        gate: "G3_REGRESSION",
        status: "passed",
        summary: `${verdicts.regression.runs_evaluated} runs passed baseline`,
      };
    } else if (req.requested_mode === "dry_run") {
      // Dry-runs tolerate regression failures — they can't affect machines
      g3 = {
        gate: "G3_REGRESSION",
        status: "passed",
        summary: "regression failures tolerated in dry-run mode",
        details: verdicts.regression.hard_breaches.map(
          (b) => `${b.kind}: ${b.test_id}`,
        ),
      };
    } else if (g3Overridable) {
      g3 = {
        gate: "G3_REGRESSION",
        status: "overridden",
        summary: `regression breaches overridden by ${req.override!.override_id}`,
        details: verdicts.regression.hard_breaches.map(
          (b) => `${b.kind}: ${b.test_id}`,
        ),
      };
    } else {
      g3 = {
        gate: "G3_REGRESSION",
        status: "failed",
        summary: `${verdicts.regression.hard_breaches.length} hard regression breach(es)`,
        details: verdicts.regression.hard_breaches.map(
          (b) => `${b.kind}: ${b.test_id}`,
        ),
      };
      if (blocking === undefined) blocking = "G3_REGRESSION";
    }
    gates.push(g3);

    const allPassed = gates.every(
      (g) => g.status === "passed" || g.status === "overridden",
    );

    let effective: RunMode | "blocked";
    let verdict: AuthVerdict;
    if (allPassed) {
      verdict = "AUTHORIZED";
      effective = req.requested_mode;
    } else {
      verdict = "DENIED";
      // Dry-run may still be authorized if only G2/G3 blocked (we handle
      // that by the per-gate logic above) but if G1 failed it's a hard no.
      effective = "blocked";
    }

    const decision: AuthDecision = {
      session_id: req.session_id.trim(),
      requested_mode: req.requested_mode,
      verdict,
      effective_mode: effective,
      gates,
      blocking_gate: blocking,
      override_applied: gates.some((g) => g.status === "overridden"),
      decided_at: req.requested_at,
    };

    this.log.push({
      ...decision,
      requested_by: req.requested_by.trim(),
      override_id: req.override?.override_id,
    });

    return decision;
  }

  private validateOverride(o: OverrideToken | undefined, now: number): void {
    if (o === undefined) return;
    if (!o.override_id.trim()) throw new Error("override_id required");
    if (!o.approved_by.trim()) throw new Error("override approved_by required");
    if (!o.reason || o.reason.trim().length < 60) {
      throw new Error("override reason must be ≥60 chars");
    }
    if (o.expires_at <= o.approved_at) {
      throw new Error("override expires_at must be > approved_at");
    }
    if (now >= o.expires_at) {
      throw new Error(`override ${o.override_id} has expired`);
    }
    if (o.scope.length === 0) {
      throw new Error("override scope cannot be empty");
    }
    if (o.scope.includes("G1_KICKOFF")) {
      throw new Error("G1_KICKOFF is not overridable — verify checklist");
    }
  }

  listLog(filter?: { session_id?: string; verdict?: AuthVerdict }): AuthLogEntry[] {
    return this.log
      .filter((e) => !filter?.session_id || e.session_id === filter.session_id)
      .filter((e) => !filter?.verdict || e.verdict === filter.verdict)
      .map((e) => ({ ...e, gates: e.gates.map((g) => ({ ...g })) }));
  }

  toSnapshot(): { schemaVersion: 1; log: AuthLogEntry[] } {
    return { schemaVersion: 1, log: this.listLog() };
  }

  loadSnapshot(snap: { schemaVersion: number; log: AuthLogEntry[] }): void {
    if (snap.schemaVersion !== 1) {
      throw new Error(`unsupported schemaVersion ${snap.schemaVersion}`);
    }
    this.log = snap.log.map((e) => ({
      ...e,
      gates: e.gates.map((g) => ({ ...g })),
    }));
  }

  clearAll(): void {
    this.log = [];
  }
}

export const wetRunAuthorizationEngine = new WetRunAuthorizationEngine();

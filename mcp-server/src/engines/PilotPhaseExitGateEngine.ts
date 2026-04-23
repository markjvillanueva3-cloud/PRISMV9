/**
 * PilotPhaseExitGateEngine (U-LPR-PILOT-EXITGATE, Delivery B5)
 *
 * Enforces structured graduation criteria for the Lathe-Prod pilot's
 * three-phase progression:
 *
 *      dev  ──►  pilot  ──►  production
 *
 * Every promotion is an explicit decision backed by measurable evidence:
 *
 *   dev → pilot:
 *     - ≥ min_dev_runs successful wet-run sessions
 *     - zero open SEV1 incidents
 *     - regression baseline green on the latest N=5 evaluations
 *     - every kickoff checklist closed (no decay-flagged waivers)
 *     - sign-off chain: {engineering, quality}
 *
 *   pilot → production:
 *     - ≥ min_pilot_runs successful wet-run sessions
 *     - ≤ abort_ceiling aborts in the last window_days
 *     - MOU signed (no active waivers)
 *     - production runbook promoted + reviewed
 *     - sign-off chain: {engineering, quality, customer, legal}
 *
 * A promotion request is evaluated against the phase-specific criteria.
 * The engine produces a PromotionVerdict listing every criterion's
 * pass/fail state with attribution, and — only when EVERY criterion
 * passes AND all required sign-offs are recorded — marks the phase
 * transition as 'approved'. Callers then persist the approved
 * transition to drive downstream roll-out automation.
 *
 * Anti-rollback: once a phase is promoted, it can only be demoted via
 * explicit demote() with reason ≥60 chars and named approver. Demotion
 * carries its own audit record.
 *
 * Pure engine. Caller persists via `toSnapshot()` to
 * `data/state/PILOT_EXIT_GATE.json` (schemaVersion 1).
 */

export type PilotPhase = "dev" | "pilot" | "production";

export interface CriterionResult {
  id: string;
  name: string;
  ok: boolean;
  detail: string;
}

export interface SignOff {
  role: string;                     // "engineering" | "quality" | "customer" | "legal"
  approver: string;
  approved_at: number;
  comment?: string;
}

export interface PromotionCriteria {
  successful_runs: number;
  abort_count_in_window: number;
  window_days: number;
  open_sev1_incidents: number;
  regression_green_streak: number;  // consecutive green baseline runs
  open_waiver_count: number;
  mou_signed: boolean;
  runbook_promoted: boolean;
}

export interface PromotionRequest {
  request_id: string;
  from_phase: PilotPhase;
  to_phase: PilotPhase;
  requested_at: number;
  requested_by: string;
  criteria: PromotionCriteria;
  sign_offs: SignOff[];
}

export interface PromotionVerdict {
  request_id: string;
  from_phase: PilotPhase;
  to_phase: PilotPhase;
  approved: boolean;
  decided_at: number;
  criterion_results: CriterionResult[];
  missing_sign_offs: string[];
  blocking_reason?: string;
}

export interface PhaseRecord {
  phase: PilotPhase;
  entered_at: number;
  approved_by: string;
  request_id: string;
}

export interface DemotionRecord {
  from_phase: PilotPhase;
  to_phase: PilotPhase;
  reason: string;
  demoted_at: number;
  demoted_by: string;
}

// Defaults — override via configure()
export interface ExitGateConfig {
  min_dev_runs: number;
  min_pilot_runs: number;
  abort_ceiling_pilot_to_prod: number;
  window_days_default: number;
  regression_streak_required: number;
}

const DEFAULT_CONFIG: ExitGateConfig = {
  min_dev_runs: 5,
  min_pilot_runs: 20,
  abort_ceiling_pilot_to_prod: 1,
  window_days_default: 14,
  regression_streak_required: 5,
};

const DEV_TO_PILOT_ROLES: readonly string[] = ["engineering", "quality"];
const PILOT_TO_PROD_ROLES: readonly string[] = [
  "engineering",
  "quality",
  "customer",
  "legal",
];

export class PilotPhaseExitGateEngine {
  private cfg: ExitGateConfig = { ...DEFAULT_CONFIG };
  private currentPhase: PilotPhase = "dev";
  private history: PhaseRecord[] = [
    {
      phase: "dev",
      entered_at: 0,
      approved_by: "<genesis>",
      request_id: "<genesis>",
    },
  ];
  private demotions: DemotionRecord[] = [];
  private verdicts: PromotionVerdict[] = [];

  configure(partial: Partial<ExitGateConfig>): ExitGateConfig {
    const next = { ...this.cfg, ...partial };
    if (next.min_dev_runs < 1) throw new Error("min_dev_runs must be ≥1");
    if (next.min_pilot_runs < 1) throw new Error("min_pilot_runs must be ≥1");
    if (next.abort_ceiling_pilot_to_prod < 0) {
      throw new Error("abort_ceiling_pilot_to_prod must be ≥0");
    }
    if (next.window_days_default < 1) {
      throw new Error("window_days_default must be ≥1");
    }
    if (next.regression_streak_required < 1) {
      throw new Error("regression_streak_required must be ≥1");
    }
    this.cfg = next;
    return { ...next };
  }

  currentPhaseName(): PilotPhase {
    return this.currentPhase;
  }

  evaluate(req: PromotionRequest): PromotionVerdict {
    this.validateRequestShape(req);
    if (req.from_phase !== this.currentPhase) {
      throw new Error(
        `from_phase ${req.from_phase} does not match current phase ${this.currentPhase}`,
      );
    }
    const validTransitions: Record<PilotPhase, PilotPhase | null> = {
      dev: "pilot",
      pilot: "production",
      production: null,
    };
    if (req.to_phase !== validTransitions[req.from_phase]) {
      throw new Error(
        `invalid transition ${req.from_phase} → ${req.to_phase}`,
      );
    }

    const criteria =
      req.from_phase === "dev"
        ? this.evaluateDevToPilot(req.criteria)
        : this.evaluatePilotToProd(req.criteria);

    const requiredRoles =
      req.from_phase === "dev" ? DEV_TO_PILOT_ROLES : PILOT_TO_PROD_ROLES;
    const seenRoles = new Set(req.sign_offs.map((s) => s.role));
    const missing = requiredRoles.filter((r) => !seenRoles.has(r));

    const allCriteriaOk = criteria.every((c) => c.ok);
    const approved = allCriteriaOk && missing.length === 0;
    const failing = criteria.find((c) => !c.ok);
    const blocking = !approved
      ? missing.length > 0
        ? `missing sign-off(s): ${missing.join(", ")}`
        : failing
          ? `criterion failed: ${failing.id}`
          : undefined
      : undefined;

    const verdict: PromotionVerdict = {
      request_id: req.request_id.trim(),
      from_phase: req.from_phase,
      to_phase: req.to_phase,
      approved,
      decided_at: req.requested_at,
      criterion_results: criteria,
      missing_sign_offs: missing,
      blocking_reason: blocking,
    };
    this.verdicts.push(verdict);

    if (approved) {
      this.currentPhase = req.to_phase;
      this.history.push({
        phase: req.to_phase,
        entered_at: req.requested_at,
        approved_by: req.requested_by.trim(),
        request_id: req.request_id.trim(),
      });
    }
    return verdict;
  }

  private evaluateDevToPilot(c: PromotionCriteria): CriterionResult[] {
    return [
      {
        id: "DEV.RUNS",
        name: `≥ ${this.cfg.min_dev_runs} successful wet-runs`,
        ok: c.successful_runs >= this.cfg.min_dev_runs,
        detail: `${c.successful_runs} / ${this.cfg.min_dev_runs} runs`,
      },
      {
        id: "DEV.NO_SEV1",
        name: "no open SEV1 incidents",
        ok: c.open_sev1_incidents === 0,
        detail: `${c.open_sev1_incidents} open SEV1`,
      },
      {
        id: "DEV.REGRESSION",
        name: `regression green for ${this.cfg.regression_streak_required} consecutive runs`,
        ok: c.regression_green_streak >= this.cfg.regression_streak_required,
        detail: `streak=${c.regression_green_streak}`,
      },
      {
        id: "DEV.NO_DECAYED_WAIVERS",
        name: "no decay-flagged kickoff waivers",
        ok: c.open_waiver_count === 0,
        detail: `${c.open_waiver_count} open waivers`,
      },
    ];
  }

  private evaluatePilotToProd(c: PromotionCriteria): CriterionResult[] {
    return [
      {
        id: "PILOT.RUNS",
        name: `≥ ${this.cfg.min_pilot_runs} successful wet-runs`,
        ok: c.successful_runs >= this.cfg.min_pilot_runs,
        detail: `${c.successful_runs} / ${this.cfg.min_pilot_runs} runs`,
      },
      {
        id: "PILOT.ABORT_CEILING",
        name: `≤ ${this.cfg.abort_ceiling_pilot_to_prod} aborts in last ${c.window_days}d`,
        ok:
          c.abort_count_in_window <= this.cfg.abort_ceiling_pilot_to_prod &&
          c.window_days >= this.cfg.window_days_default,
        detail: `${c.abort_count_in_window} aborts over ${c.window_days}d window`,
      },
      {
        id: "PILOT.MOU_SIGNED",
        name: "MOU signed (no active waivers)",
        ok: c.mou_signed,
        detail: c.mou_signed ? "MOU signed" : "MOU unsigned or waived",
      },
      {
        id: "PILOT.RUNBOOK",
        name: "production runbook promoted",
        ok: c.runbook_promoted,
        detail: c.runbook_promoted
          ? "runbook promoted"
          : "runbook not promoted",
      },
    ];
  }

  demote(input: {
    to_phase: PilotPhase;
    reason: string;
    demoted_at: number;
    demoted_by: string;
  }): DemotionRecord {
    if (this.currentPhase === "dev") {
      throw new Error("already at dev phase — cannot demote");
    }
    const lowerThan: Record<PilotPhase, PilotPhase[]> = {
      dev: [],
      pilot: ["dev"],
      production: ["pilot", "dev"],
    };
    if (!lowerThan[this.currentPhase].includes(input.to_phase)) {
      throw new Error(
        `cannot demote from ${this.currentPhase} to ${input.to_phase}`,
      );
    }
    if (!input.reason || input.reason.trim().length < 60) {
      throw new Error("demotion reason must be ≥60 chars");
    }
    if (!input.demoted_by.trim()) throw new Error("demoted_by required");
    if (!Number.isFinite(input.demoted_at) || input.demoted_at <= 0) {
      throw new Error("demoted_at must be a positive epoch-ms");
    }
    const rec: DemotionRecord = {
      from_phase: this.currentPhase,
      to_phase: input.to_phase,
      reason: input.reason.trim(),
      demoted_at: input.demoted_at,
      demoted_by: input.demoted_by.trim(),
    };
    this.demotions.push(rec);
    this.currentPhase = input.to_phase;
    this.history.push({
      phase: input.to_phase,
      entered_at: input.demoted_at,
      approved_by: input.demoted_by.trim(),
      request_id: `demote-${rec.from_phase}-${rec.to_phase}-${input.demoted_at}`,
    });
    return { ...rec };
  }

  listHistory(): PhaseRecord[] {
    return this.history.map((h) => ({ ...h }));
  }

  listDemotions(): DemotionRecord[] {
    return this.demotions.map((d) => ({ ...d }));
  }

  listVerdicts(filter?: { approved?: boolean }): PromotionVerdict[] {
    return this.verdicts
      .filter((v) => filter?.approved === undefined || v.approved === filter.approved)
      .map((v) => ({
        ...v,
        criterion_results: v.criterion_results.map((c) => ({ ...c })),
        missing_sign_offs: [...v.missing_sign_offs],
      }));
  }

  toSnapshot(): {
    schemaVersion: 1;
    config: ExitGateConfig;
    currentPhase: PilotPhase;
    history: PhaseRecord[];
    demotions: DemotionRecord[];
    verdicts: PromotionVerdict[];
  } {
    return {
      schemaVersion: 1,
      config: { ...this.cfg },
      currentPhase: this.currentPhase,
      history: this.listHistory(),
      demotions: this.listDemotions(),
      verdicts: this.listVerdicts(),
    };
  }

  loadSnapshot(snap: {
    schemaVersion: number;
    config: ExitGateConfig;
    currentPhase: PilotPhase;
    history: PhaseRecord[];
    demotions: DemotionRecord[];
    verdicts: PromotionVerdict[];
  }): void {
    if (snap.schemaVersion !== 1) {
      throw new Error(`unsupported schemaVersion ${snap.schemaVersion}`);
    }
    this.cfg = { ...snap.config };
    this.currentPhase = snap.currentPhase;
    this.history = snap.history.map((h) => ({ ...h }));
    this.demotions = snap.demotions.map((d) => ({ ...d }));
    this.verdicts = snap.verdicts.map((v) => ({
      ...v,
      criterion_results: v.criterion_results.map((c) => ({ ...c })),
      missing_sign_offs: [...v.missing_sign_offs],
    }));
  }

  clearAll(): void {
    this.cfg = { ...DEFAULT_CONFIG };
    this.currentPhase = "dev";
    this.history = [
      {
        phase: "dev",
        entered_at: 0,
        approved_by: "<genesis>",
        request_id: "<genesis>",
      },
    ];
    this.demotions = [];
    this.verdicts = [];
  }

  private validateRequestShape(req: PromotionRequest): void {
    if (!req.request_id.trim()) throw new Error("request_id required");
    if (!req.requested_by.trim()) throw new Error("requested_by required");
    if (!Number.isFinite(req.requested_at) || req.requested_at <= 0) {
      throw new Error("requested_at must be a positive epoch-ms");
    }
    for (const s of req.sign_offs) {
      if (!s.role.trim()) throw new Error("sign-off role required");
      if (!s.approver.trim()) throw new Error("sign-off approver required");
      if (!Number.isFinite(s.approved_at) || s.approved_at <= 0) {
        throw new Error("sign-off approved_at must be a positive epoch-ms");
      }
    }
  }
}

export const pilotPhaseExitGateEngine = new PilotPhaseExitGateEngine();

/**
 * MillLoRADeploymentEngine — LoRA Model Deployment (Mill parity)
 * ================================================================
 *
 * Manages MillLoRA model deployment: versioning, rollout strategies,
 * blue/green, canary, and rollback, with per-axis_mode active models
 * and mill-canonical shop-floor cell types.
 *
 * Mill parity for LatheLoRADeploymentEngine (LATHE-LORA-MS0 U-LLR48)
 * with MILL-CANONICAL extensions:
 *
 *   - Per-axis_mode active deployment — separate active models for
 *     3-axis, 4-axis-index, 5-axis-simul, and shared, so promoting a
 *     5-axis model does NOT supersede the active 3-axis model on a
 *     mixed-cell target
 *   - Mill-canonical cell types (shop-floor classification beyond
 *     dev/staging/prod): 3axis_cell, 4axis_cell, 5axis_cell, mill_turn_cell,
 *     hsm_cell (high-speed-machining), hmc_cell (horizontal MC),
 *     production_line, prototype_bench
 *   - Mill-canonical rollback triggers (in addition to health-score):
 *       chatter_breach    — Tlusty regenerative chatter rate above threshold
 *       fpa_rejection     — first-piece approval ship-rate below floor
 *       tcpm_solver_fault — Heidenhain/Fanuc 5-axis solver fail-rate spike
 *
 * Features:
 *   - Deployment targets with mill-canonical cell types
 *   - Per-axis_mode active-deployment tracking
 *   - Rollout strategies (blue-green, canary, rolling, immediate)
 *   - Rollback support (health + mill-canonical breach triggers)
 *   - Health checks
 *
 * @module engines/MillLoRADeploymentEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-DEPLOYMENT (iter90)
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MillDeploymentStrategy = "blue_green" | "canary" | "rolling" | "immediate";
export type MillDeploymentStatus = "pending" | "deploying" | "active" | "failed" | "rolled_back" | "superseded";

/** Per-axis training mode — must match MillLoRACadenceEngine taxonomy. */
export type MillAxisMode = "3_axis" | "4_axis_index" | "5_axis_simul" | "shared";

/** MILL-CANONICAL: shop-floor cell types beyond dev/staging/prod. */
export type MillCellType =
  | "3axis_cell"
  | "4axis_cell"
  | "5axis_cell"
  | "mill_turn_cell"
  | "hsm_cell"
  | "hmc_cell"
  | "production_line"
  | "prototype_bench";

/** MILL-CANONICAL rollback triggers (3) on top of health-score rollback (lathe-shared). */
export type MillRollbackTrigger =
  | "health_below_threshold"  // lathe-shared
  | "chatter_breach"           // MILL-CANONICAL
  | "fpa_rejection"            // MILL-CANONICAL
  | "tcpm_solver_fault"        // MILL-CANONICAL
  | "manual";                  // lathe-shared

export const MILL_CANONICAL_ROLLBACK_TRIGGERS: MillRollbackTrigger[] = [
  "chatter_breach",
  "fpa_rejection",
  "tcpm_solver_fault",
];

export interface MillDeploymentTarget {
  id: string;
  name: string;
  environment: "dev" | "staging" | "production";
  region?: string;
  capacity: number;
  /** MILL-CANONICAL: shop-floor cell type (drives axis_mode compatibility). */
  cell_type?: MillCellType;
}

export interface MillDeployment {
  id: string;
  model_id: string;
  model_version: string;
  target_id: string;
  strategy: MillDeploymentStrategy;
  status: MillDeploymentStatus;
  canary_percent: number;
  health_score: number;
  created_at: number;
  activated_at?: number;
  rolled_back_at?: number;
  previous_deployment_id?: string;
  /** MILL-CANONICAL: axis_mode this deployment targets. */
  axis_mode: MillAxisMode;
  /** MILL-CANONICAL: reason for last rollback (if any). */
  rollback_reason?: MillRollbackTrigger;
  /** MILL-CANONICAL: per-signal breach rates at last health update. */
  chatter_violation_rate?: number;
  fpa_pass_rate?: number;
  tcpm_solver_failure_rate?: number;
}

export interface MillDeploymentConfig {
  default_strategy: MillDeploymentStrategy;
  canary_initial_percent: number;
  canary_step_percent: number;
  health_threshold: number;
  rollback_on_failure: boolean;
  max_deployments_per_target: number;
  /** MILL-CANONICAL: chatter rate above which canary aborts. */
  chatter_rollback_threshold: number;
  /** MILL-CANONICAL: FPA pass rate below which canary aborts. */
  fpa_rollback_threshold: number;
  /** MILL-CANONICAL: TCPM fault rate above which canary aborts. */
  tcpm_rollback_threshold: number;
}

const DEFAULT_CONFIG: MillDeploymentConfig = {
  default_strategy: "canary",
  canary_initial_percent: 10,
  canary_step_percent: 20,
  health_threshold: 0.95,
  rollback_on_failure: true,
  max_deployments_per_target: 10,
  chatter_rollback_threshold: 0.05,
  fpa_rollback_threshold: 0.85,
  tcpm_rollback_threshold: 0.02,
};

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillLoRADeploymentEngine {
  private config: MillDeploymentConfig = { ...DEFAULT_CONFIG };
  private targets: Map<string, MillDeploymentTarget> = new Map();
  private deployments: Map<string, MillDeployment> = new Map();

  setConfig(config: Partial<MillDeploymentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MillDeploymentConfig {
    return { ...this.config };
  }

  registerTarget(target: MillDeploymentTarget): MillDeploymentTarget {
    this.targets.set(target.id, target);
    return target;
  }

  getTargets(): MillDeploymentTarget[] {
    return Array.from(this.targets.values());
  }

  getTarget(id: string): MillDeploymentTarget | undefined {
    return this.targets.get(id);
  }

  /**
   * Create a deployment. axis_mode defaults to "shared" if not specified.
   * MILL-CANONICAL: only supersedes the active deployment of the SAME
   * axis_mode — a 5-axis deployment leaves the 3-axis active model alone.
   */
  deploy(
    modelId: string,
    modelVersion: string,
    targetId: string,
    opts?: { strategy?: MillDeploymentStrategy; axis_mode?: MillAxisMode },
  ): MillDeployment | null {
    const target = this.targets.get(targetId);
    if (!target) return null;

    const axis_mode = opts?.axis_mode ?? "shared";
    const strat = opts?.strategy ?? this.config.default_strategy;
    const initialCanary = strat === "canary" ? this.config.canary_initial_percent : strat === "immediate" ? 100 : 0;

    // MILL-CANONICAL: only the same-axis active deployment is the predecessor
    const previous = this.getActiveDeployment(targetId, axis_mode);

    const deployment: MillDeployment = {
      id: `deploy-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      model_id: modelId,
      model_version: modelVersion,
      target_id: targetId,
      strategy: strat,
      status: "pending",
      canary_percent: initialCanary,
      health_score: 1.0,
      created_at: Date.now(),
      previous_deployment_id: previous?.id,
      axis_mode,
    };
    this.deployments.set(deployment.id, deployment);
    return deployment;
  }

  beginDeployment(id: string): boolean {
    const d = this.deployments.get(id);
    if (!d || d.status !== "pending") return false;
    d.status = "deploying";
    return true;
  }

  activate(id: string): boolean {
    const d = this.deployments.get(id);
    if (!d || (d.status !== "deploying" && d.status !== "pending")) return false;

    // MILL-CANONICAL: supersede only the same-axis predecessor
    if (d.previous_deployment_id) {
      const prev = this.deployments.get(d.previous_deployment_id);
      if (prev && prev.status === "active") {
        prev.status = "superseded";
      }
    }
    d.status = "active";
    d.activated_at = Date.now();
    d.canary_percent = 100;
    return true;
  }

  advanceCanary(id: string): boolean {
    const d = this.deployments.get(id);
    if (!d || d.strategy !== "canary") return false;
    if (d.health_score < this.config.health_threshold) {
      if (this.config.rollback_on_failure) this.rollback(id, "health_below_threshold");
      return false;
    }
    d.canary_percent = Math.min(100, d.canary_percent + this.config.canary_step_percent);
    if (d.canary_percent >= 100) {
      this.activate(id);
    }
    return true;
  }

  updateHealth(id: string, score: number): boolean {
    const d = this.deployments.get(id);
    if (!d) return false;
    d.health_score = Math.max(0, Math.min(1, score));
    if (d.health_score < this.config.health_threshold && this.config.rollback_on_failure) {
      if (d.status === "deploying" || d.status === "active") {
        this.rollback(id, "health_below_threshold");
      }
    }
    return true;
  }

  /**
   * MILL-CANONICAL: update mill-specific signals. If any signal breaches
   * its configured threshold AND rollback_on_failure=true, rollback fires
   * with the corresponding mill-canonical trigger reason. Returns the
   * trigger if breach detected, null otherwise.
   */
  updateMillSignals(
    id: string,
    signals: { chatter_violation_rate?: number; fpa_pass_rate?: number; tcpm_solver_failure_rate?: number },
  ): MillRollbackTrigger | null {
    const d = this.deployments.get(id);
    if (!d) return null;
    if (typeof signals.chatter_violation_rate === "number") d.chatter_violation_rate = signals.chatter_violation_rate;
    if (typeof signals.fpa_pass_rate === "number") d.fpa_pass_rate = signals.fpa_pass_rate;
    if (typeof signals.tcpm_solver_failure_rate === "number") d.tcpm_solver_failure_rate = signals.tcpm_solver_failure_rate;

    if (d.status !== "deploying" && d.status !== "active") return null;

    let trigger: MillRollbackTrigger | null = null;
    if (
      typeof signals.chatter_violation_rate === "number" &&
      signals.chatter_violation_rate > this.config.chatter_rollback_threshold
    ) {
      trigger = "chatter_breach";
    } else if (
      typeof signals.fpa_pass_rate === "number" &&
      signals.fpa_pass_rate < this.config.fpa_rollback_threshold
    ) {
      trigger = "fpa_rejection";
    } else if (
      typeof signals.tcpm_solver_failure_rate === "number" &&
      signals.tcpm_solver_failure_rate > this.config.tcpm_rollback_threshold
    ) {
      trigger = "tcpm_solver_fault";
    }

    if (trigger && this.config.rollback_on_failure) {
      this.rollback(id, trigger);
    }
    return trigger;
  }

  rollback(id: string, reason: MillRollbackTrigger = "manual"): boolean {
    const d = this.deployments.get(id);
    if (!d) return false;
    if (d.status === "rolled_back") return false;
    d.status = "rolled_back";
    d.rolled_back_at = Date.now();
    d.rollback_reason = reason;
    if (d.previous_deployment_id) {
      const prev = this.deployments.get(d.previous_deployment_id);
      if (prev && prev.status === "superseded") {
        prev.status = "active";
      }
    }
    return true;
  }

  markFailed(id: string): boolean {
    const d = this.deployments.get(id);
    if (!d) return false;
    d.status = "failed";
    if (this.config.rollback_on_failure && d.previous_deployment_id) {
      this.rollback(id, "manual");
    }
    return true;
  }

  /**
   * MILL-CANONICAL: get active deployment for a target, optionally
   * filtered by axis_mode. Without axis_mode, returns the first active
   * deployment found.
   */
  getActiveDeployment(targetId: string, axis_mode?: MillAxisMode): MillDeployment | undefined {
    return Array.from(this.deployments.values()).find(
      (d) =>
        d.target_id === targetId &&
        d.status === "active" &&
        (axis_mode === undefined || d.axis_mode === axis_mode),
    );
  }

  /** MILL-CANONICAL: enumerate active deployments across all axis_modes on a target. */
  getActiveDeploymentsByAxis(targetId: string): Partial<Record<MillAxisMode, MillDeployment>> {
    const out: Partial<Record<MillAxisMode, MillDeployment>> = {};
    for (const d of this.deployments.values()) {
      if (d.target_id === targetId && d.status === "active") {
        out[d.axis_mode] = d;
      }
    }
    return out;
  }

  getDeployment(id: string): MillDeployment | undefined {
    return this.deployments.get(id);
  }

  getDeploymentsForTarget(targetId: string): MillDeployment[] {
    return Array.from(this.deployments.values()).filter((d) => d.target_id === targetId);
  }

  getHistory(limit?: number): MillDeployment[] {
    const list = Array.from(this.deployments.values()).sort((a, b) => b.created_at - a.created_at);
    return typeof limit === "number" ? list.slice(0, limit) : list;
  }

  getStats(): {
    total_deployments: number;
    active: number;
    rolled_back: number;
    failed: number;
    avg_health_score: number;
    strategy_distribution: Record<string, number>;
    axis_distribution: Record<string, number>;
    rollback_reasons: Record<string, number>;
  } {
    const all = Array.from(this.deployments.values());
    const total = all.length;

    if (total === 0) {
      return {
        total_deployments: 0,
        active: 0,
        rolled_back: 0,
        failed: 0,
        avg_health_score: 0,
        strategy_distribution: {},
        axis_distribution: {},
        rollback_reasons: {},
      };
    }

    const avgHealth = all.reduce((s, d) => s + d.health_score, 0) / total;
    const stratDist: Record<string, number> = {};
    const axisDist: Record<string, number> = {};
    const rollbackDist: Record<string, number> = {};
    for (const d of all) {
      stratDist[d.strategy] = (stratDist[d.strategy] ?? 0) + 1;
      axisDist[d.axis_mode] = (axisDist[d.axis_mode] ?? 0) + 1;
      if (d.rollback_reason) {
        rollbackDist[d.rollback_reason] = (rollbackDist[d.rollback_reason] ?? 0) + 1;
      }
    }
    return {
      total_deployments: total,
      active: all.filter((d) => d.status === "active").length,
      rolled_back: all.filter((d) => d.status === "rolled_back").length,
      failed: all.filter((d) => d.status === "failed").length,
      avg_health_score: avgHealth,
      strategy_distribution: stratDist,
      axis_distribution: axisDist,
      rollback_reasons: rollbackDist,
    };
  }

  getSummary(): string {
    const stats = this.getStats();
    return [
      "Mill LoRA Deployment Engine Summary",
      "===================================",
      `Total: ${stats.total_deployments}`,
      `Active: ${stats.active}`,
      `Rolled Back: ${stats.rolled_back}`,
      `Failed: ${stats.failed}`,
      `Avg Health: ${stats.avg_health_score.toFixed(3)}`,
    ].join("\n");
  }

  reset(): void {
    this.targets.clear();
    this.deployments.clear();
    this.config = { ...DEFAULT_CONFIG };
  }
}

export const millLoRADeploymentEngine = new MillLoRADeploymentEngine();
export { MillLoRADeploymentEngine };

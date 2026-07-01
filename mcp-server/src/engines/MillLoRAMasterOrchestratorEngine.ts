/**
 * MillLoRAMasterOrchestratorEngine — Lifecycle Master (Mill parity)
 * ==================================================================
 *
 * Master orchestrator that ties together all MillLoRA subsystems —
 * data → training → evaluation → first-piece-validation → deployment →
 * production → maintenance → decommissioning.
 *
 * Mill parity for LatheLoRAMasterOrchestratorEngine (LATHE-LORA-MS0 U-LLR50)
 * with MILL-CANONICAL extensions:
 *
 *   - Mill-canonical phase 'first_piece_validation' inserted between
 *     evaluation and deployment — mill jobs MUST clear an AS9102 FAI
 *     gate before any model is allowed to drive a production cell
 *   - Per-axis_mode subsystem scope — registerSubsystem accepts
 *     axis_mode so the orchestrator can keep 3-axis, 4-axis-index,
 *     and 5-axis-simul stacks in independent lifecycle phases
 *   - 3 mill-canonical subsystem-name conventions auto-registered
 *     by initializeMillStack(): chatter_monitor, fpa_gate, tcpm_solver_watch
 *   - getStatsByAxis() returns per-axis subsystem health rollups
 *
 * @module engines/MillLoRAMasterOrchestratorEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-MASTER-ORCHESTRATOR (iter94)
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MillSystemPhase =
  | "data_collection"
  | "training"
  | "evaluation"
  /** MILL-CANONICAL: AS9102 first-piece-approval gate before production. */
  | "first_piece_validation"
  | "deployment"
  | "production"
  | "maintenance"
  | "decommissioning";

export type MillSystemHealth = "healthy" | "degraded" | "unhealthy" | "initializing";

/** Per-axis training mode — matches MillLoRACadenceEngine taxonomy. */
export type MillAxisMode = "3_axis" | "4_axis_index" | "5_axis_simul" | "shared";

export const MILL_CANONICAL_SUBSYSTEMS = ["chatter_monitor", "fpa_gate", "tcpm_solver_watch"] as const;
export type MillCanonicalSubsystem = (typeof MILL_CANONICAL_SUBSYSTEMS)[number];

export interface MillSubsystemStatus {
  name: string;
  phase: MillSystemPhase;
  health: MillSystemHealth;
  last_activity: number;
  metrics: Record<string, number>;
  /** MILL-CANONICAL: axis_mode this subsystem governs. */
  axis_mode: MillAxisMode;
}

export interface MillMasterState {
  id: string;
  current_phase: MillSystemPhase;
  overall_health: MillSystemHealth;
  subsystems: Map<string, MillSubsystemStatus>;
  active_operations: number;
  total_operations: number;
  initialized_at: number;
  last_updated: number;
}

export interface MillMasterConfig {
  auto_transition: boolean;
  health_check_interval_ms: number;
  degraded_subsystem_threshold: number;
  enable_failover: boolean;
  /** MILL-CANONICAL: require AS9102 FAI clearance before deployment phase. */
  require_first_piece_validation: boolean;
}

const DEFAULT_CONFIG: MillMasterConfig = {
  auto_transition: true,
  health_check_interval_ms: 30000,
  degraded_subsystem_threshold: 0.3,
  enable_failover: true,
  require_first_piece_validation: true,
};

const PHASE_ORDER: MillSystemPhase[] = [
  "data_collection",
  "training",
  "evaluation",
  "first_piece_validation",
  "deployment",
  "production",
  "maintenance",
  "decommissioning",
];

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillLoRAMasterOrchestratorEngine {
  private config: MillMasterConfig = { ...DEFAULT_CONFIG };
  private state: MillMasterState | null = null;
  private events: Array<{ timestamp: number; type: string; details: string }> = [];

  setConfig(config: Partial<MillMasterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MillMasterConfig {
    return { ...this.config };
  }

  initialize(): MillMasterState {
    this.state = {
      id: `master-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      current_phase: "data_collection",
      overall_health: "initializing",
      subsystems: new Map(),
      active_operations: 0,
      total_operations: 0,
      initialized_at: Date.now(),
      last_updated: Date.now(),
    };
    this.recordEvent("initialize", "System initialized");
    return this.state;
  }

  /**
   * MILL-CANONICAL: initialize + auto-register the 3 mill-canonical
   * subsystems (chatter_monitor, fpa_gate, tcpm_solver_watch) for a
   * specific axis_mode. Convenience for setting up a fresh axis stack.
   */
  initializeMillStack(axis_mode: MillAxisMode = "shared"): MillMasterState {
    if (!this.state) this.initialize();
    for (const sub of MILL_CANONICAL_SUBSYSTEMS) {
      const key = `${sub}.${axis_mode}`;
      this.registerSubsystem(key, "data_collection", axis_mode);
    }
    this.recordEvent("mill_stack_init", `Mill stack initialized for ${axis_mode}`);
    return this.state as MillMasterState;
  }

  getState(): MillMasterState | null {
    return this.state;
  }

  registerSubsystem(name: string, initialPhase: MillSystemPhase, axis_mode: MillAxisMode = "shared"): boolean {
    if (!this.state) return false;
    this.state.subsystems.set(name, {
      name,
      phase: initialPhase,
      health: "initializing",
      last_activity: Date.now(),
      metrics: {},
      axis_mode,
    });
    this.recordEvent("subsystem_registered", `Subsystem ${name} (${axis_mode}) registered`);
    return true;
  }

  updateSubsystem(name: string, updates: Partial<Omit<MillSubsystemStatus, "name">>): boolean {
    if (!this.state) return false;
    const sub = this.state.subsystems.get(name);
    if (!sub) return false;
    Object.assign(sub, updates);
    sub.last_activity = Date.now();
    this.state.last_updated = Date.now();
    this.recomputeHealth();
    return true;
  }

  updateMetrics(name: string, metrics: Record<string, number>): boolean {
    if (!this.state) return false;
    const sub = this.state.subsystems.get(name);
    if (!sub) return false;
    sub.metrics = { ...sub.metrics, ...metrics };
    sub.last_activity = Date.now();
    return true;
  }

  /**
   * Transition to next phase. MILL-CANONICAL: deployment requires a
   * prior first_piece_validation pass IF require_first_piece_validation
   * is enabled — refuses the transition otherwise.
   */
  transition(newPhase: MillSystemPhase): boolean {
    if (!this.state) return false;
    const currentIdx = PHASE_ORDER.indexOf(this.state.current_phase);
    const newIdx = PHASE_ORDER.indexOf(newPhase);
    if (newIdx === -1) return false;
    if (newIdx < currentIdx && newPhase !== "maintenance" && newPhase !== "decommissioning") {
      return false;
    }
    // MILL-CANONICAL gate: deployment requires having gone through first_piece_validation
    if (
      newPhase === "deployment" &&
      this.config.require_first_piece_validation &&
      this.state.current_phase !== "first_piece_validation"
    ) {
      this.recordEvent("transition_blocked", `deployment requires first_piece_validation; current=${this.state.current_phase}`);
      return false;
    }
    const oldPhase = this.state.current_phase;
    this.state.current_phase = newPhase;
    this.state.last_updated = Date.now();
    this.recordEvent("phase_transition", `${oldPhase} -> ${newPhase}`);
    return true;
  }

  beginOperation(): void {
    if (!this.state) return;
    this.state.active_operations++;
    this.state.total_operations++;
  }

  endOperation(): void {
    if (!this.state) return;
    this.state.active_operations = Math.max(0, this.state.active_operations - 1);
  }

  private recomputeHealth(): void {
    if (!this.state) return;
    const subs = Array.from(this.state.subsystems.values());
    if (subs.length === 0) {
      this.state.overall_health = "initializing";
      return;
    }
    const unhealthy = subs.filter((s) => s.health === "unhealthy").length;
    const degraded = subs.filter((s) => s.health === "degraded").length;
    const total = subs.length;
    if (unhealthy / total > this.config.degraded_subsystem_threshold) {
      this.state.overall_health = "unhealthy";
    } else if ((unhealthy + degraded) / total > this.config.degraded_subsystem_threshold) {
      this.state.overall_health = "degraded";
    } else if (subs.every((s) => s.health === "initializing")) {
      this.state.overall_health = "initializing";
    } else {
      this.state.overall_health = "healthy";
    }
  }

  private recordEvent(type: string, details: string): void {
    this.events.push({ timestamp: Date.now(), type, details });
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }
  }

  getEvents(limit?: number): Array<{ timestamp: number; type: string; details: string }> {
    const list = [...this.events].reverse();
    return typeof limit === "number" ? list.slice(0, limit) : list;
  }

  healthCheck(): MillSystemHealth {
    this.recomputeHealth();
    return this.state?.overall_health ?? "initializing";
  }

  getStats(): {
    initialized: boolean;
    current_phase: MillSystemPhase | null;
    overall_health: MillSystemHealth | null;
    total_subsystems: number;
    healthy_subsystems: number;
    degraded_subsystems: number;
    unhealthy_subsystems: number;
    active_operations: number;
    total_operations: number;
    uptime_ms: number;
  } {
    if (!this.state) {
      return {
        initialized: false,
        current_phase: null,
        overall_health: null,
        total_subsystems: 0,
        healthy_subsystems: 0,
        degraded_subsystems: 0,
        unhealthy_subsystems: 0,
        active_operations: 0,
        total_operations: 0,
        uptime_ms: 0,
      };
    }
    const subs = Array.from(this.state.subsystems.values());
    return {
      initialized: true,
      current_phase: this.state.current_phase,
      overall_health: this.state.overall_health,
      total_subsystems: subs.length,
      healthy_subsystems: subs.filter((s) => s.health === "healthy").length,
      degraded_subsystems: subs.filter((s) => s.health === "degraded").length,
      unhealthy_subsystems: subs.filter((s) => s.health === "unhealthy").length,
      active_operations: this.state.active_operations,
      total_operations: this.state.total_operations,
      uptime_ms: Date.now() - this.state.initialized_at,
    };
  }

  /**
   * MILL-CANONICAL: per-axis subsystem rollup.
   * { axis_mode -> { total, healthy, degraded, unhealthy } }
   */
  getStatsByAxis(): Record<string, { total: number; healthy: number; degraded: number; unhealthy: number }> {
    const out: Record<string, { total: number; healthy: number; degraded: number; unhealthy: number }> = {};
    if (!this.state) return out;
    for (const sub of this.state.subsystems.values()) {
      if (!out[sub.axis_mode]) out[sub.axis_mode] = { total: 0, healthy: 0, degraded: 0, unhealthy: 0 };
      out[sub.axis_mode].total++;
      if (sub.health === "healthy") out[sub.axis_mode].healthy++;
      else if (sub.health === "degraded") out[sub.axis_mode].degraded++;
      else if (sub.health === "unhealthy") out[sub.axis_mode].unhealthy++;
    }
    return out;
  }

  /** MILL-CANONICAL: enumerate subsystems filtered by axis_mode. */
  getSubsystemsByAxis(axis_mode: MillAxisMode): MillSubsystemStatus[] {
    if (!this.state) return [];
    return Array.from(this.state.subsystems.values()).filter((s) => s.axis_mode === axis_mode);
  }

  getSummary(): string {
    const stats = this.getStats();
    if (!stats.initialized) return "Mill Master Orchestrator: Not initialized";
    return [
      "Mill LoRA Master Orchestrator",
      "=============================",
      `Phase: ${stats.current_phase}`,
      `Health: ${stats.overall_health}`,
      `Subsystems: ${stats.total_subsystems} (${stats.healthy_subsystems} healthy, ${stats.degraded_subsystems} degraded, ${stats.unhealthy_subsystems} unhealthy)`,
      `Active Ops: ${stats.active_operations}`,
      `Total Ops: ${stats.total_operations}`,
      `Uptime: ${(stats.uptime_ms / 1000).toFixed(0)}s`,
    ].join("\n");
  }

  shutdown(): boolean {
    if (!this.state) return false;
    // Shutdown allowed to bypass FPA gate (rare but operator-driven).
    const oldPhase = this.state.current_phase;
    this.state.current_phase = "decommissioning";
    this.state.last_updated = Date.now();
    this.recordEvent("phase_transition", `${oldPhase} -> decommissioning`);
    this.recordEvent("shutdown", "System shutdown initiated");
    return true;
  }

  reset(): void {
    this.state = null;
    this.events = [];
    this.config = { ...DEFAULT_CONFIG };
  }
}

export const millLoRAMasterOrchestratorEngine = new MillLoRAMasterOrchestratorEngine();
export { MillLoRAMasterOrchestratorEngine };

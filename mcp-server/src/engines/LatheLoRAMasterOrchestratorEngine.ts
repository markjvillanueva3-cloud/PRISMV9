/**
 * LatheLoRAMasterOrchestratorEngine — LATHE-LORA-MS0 U-LLR50
 * ============================================================
 *
 * The master orchestrator that ties together all LatheLoRA subsystems.
 * Provides the single entry point for end-to-end lifecycle management:
 * data → training → deployment → inference → monitoring.
 *
 * Features:
 *   - Unified lifecycle management
 *   - Cross-subsystem coordination
 *   - Top-level health reporting
 *   - System-wide metrics aggregation
 *
 * @module engines/LatheLoRAMasterOrchestratorEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type SystemPhase =
  | "data_collection"
  | "training"
  | "evaluation"
  | "deployment"
  | "production"
  | "maintenance"
  | "decommissioning";

export type SystemHealth = "healthy" | "degraded" | "unhealthy" | "initializing";

export interface SubsystemStatus {
  name: string;
  phase: SystemPhase;
  health: SystemHealth;
  last_activity: number;
  metrics: Record<string, number>;
}

export interface MasterState {
  id: string;
  current_phase: SystemPhase;
  overall_health: SystemHealth;
  subsystems: Map<string, SubsystemStatus>;
  active_operations: number;
  total_operations: number;
  initialized_at: number;
  last_updated: number;
}

export interface MasterConfig {
  auto_transition: boolean;
  health_check_interval_ms: number;
  degraded_subsystem_threshold: number;
  enable_failover: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: MasterConfig = {
  auto_transition: true,
  health_check_interval_ms: 30000,
  degraded_subsystem_threshold: 0.3, // if >30% of subsystems degraded, system is degraded
  enable_failover: true,
};

const PHASE_ORDER: SystemPhase[] = [
  "data_collection",
  "training",
  "evaluation",
  "deployment",
  "production",
  "maintenance",
  "decommissioning",
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAMasterOrchestratorEngine {
  private config: MasterConfig = DEFAULT_CONFIG;
  private state: MasterState | null = null;
  private events: Array<{ timestamp: number; type: string; details: string }> = [];

  setConfig(config: Partial<MasterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MasterConfig {
    return { ...this.config };
  }

  /**
   * Initialize the system
   */
  initialize(): MasterState {
    this.state = {
      id: `master-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
   * Get current state
   */
  getState(): MasterState | null {
    return this.state;
  }

  /**
   * Register a subsystem
   */
  registerSubsystem(name: string, initialPhase: SystemPhase): boolean {
    if (!this.state) return false;

    this.state.subsystems.set(name, {
      name,
      phase: initialPhase,
      health: "initializing",
      last_activity: Date.now(),
      metrics: {},
    });
    this.recordEvent("subsystem_registered", `Subsystem ${name} registered`);
    return true;
  }

  /**
   * Update subsystem status
   */
  updateSubsystem(
    name: string,
    updates: Partial<Omit<SubsystemStatus, "name">>,
  ): boolean {
    if (!this.state) return false;
    const sub = this.state.subsystems.get(name);
    if (!sub) return false;

    Object.assign(sub, updates);
    sub.last_activity = Date.now();
    this.state.last_updated = Date.now();

    // Recompute overall health
    this.recomputeHealth();
    return true;
  }

  /**
   * Update subsystem metrics
   */
  updateMetrics(name: string, metrics: Record<string, number>): boolean {
    if (!this.state) return false;
    const sub = this.state.subsystems.get(name);
    if (!sub) return false;

    sub.metrics = { ...sub.metrics, ...metrics };
    sub.last_activity = Date.now();
    return true;
  }

  /**
   * Transition to next phase
   */
  transition(newPhase: SystemPhase): boolean {
    if (!this.state) return false;
    const currentIdx = PHASE_ORDER.indexOf(this.state.current_phase);
    const newIdx = PHASE_ORDER.indexOf(newPhase);
    if (newIdx === -1) return false;

    // Allow forward transitions or maintenance/decommissioning from any state
    if (newIdx < currentIdx && newPhase !== "maintenance" && newPhase !== "decommissioning") {
      return false;
    }

    const oldPhase = this.state.current_phase;
    this.state.current_phase = newPhase;
    this.state.last_updated = Date.now();
    this.recordEvent("phase_transition", `${oldPhase} -> ${newPhase}`);
    return true;
  }

  /**
   * Begin an operation
   */
  beginOperation(): void {
    if (!this.state) return;
    this.state.active_operations++;
    this.state.total_operations++;
  }

  /**
   * End an operation
   */
  endOperation(): void {
    if (!this.state) return;
    this.state.active_operations = Math.max(0, this.state.active_operations - 1);
  }

  /**
   * Recompute overall health
   */
  private recomputeHealth(): void {
    if (!this.state) return;
    const subs = Array.from(this.state.subsystems.values());
    if (subs.length === 0) {
      this.state.overall_health = "initializing";
      return;
    }

    const unhealthy = subs.filter(s => s.health === "unhealthy").length;
    const degraded = subs.filter(s => s.health === "degraded").length;
    const total = subs.length;

    if (unhealthy / total > this.config.degraded_subsystem_threshold) {
      this.state.overall_health = "unhealthy";
    } else if ((unhealthy + degraded) / total > this.config.degraded_subsystem_threshold) {
      this.state.overall_health = "degraded";
    } else if (subs.every(s => s.health === "initializing")) {
      this.state.overall_health = "initializing";
    } else {
      this.state.overall_health = "healthy";
    }
  }

  /**
   * Record an event
   */
  private recordEvent(type: string, details: string): void {
    this.events.push({ timestamp: Date.now(), type, details });
    if (this.events.length > 1000) {
      this.events = this.events.slice(-500);
    }
  }

  /**
   * Get recent events
   */
  getEvents(limit?: number): Array<{ timestamp: number; type: string; details: string }> {
    const list = [...this.events].reverse();
    return limit ? list.slice(0, limit) : list;
  }

  /**
   * Run health check across all subsystems
   */
  healthCheck(): SystemHealth {
    this.recomputeHealth();
    return this.state?.overall_health || "initializing";
  }

  /**
   * Get system stats
   */
  getStats(): {
    initialized: boolean;
    current_phase: SystemPhase | null;
    overall_health: SystemHealth | null;
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
      healthy_subsystems: subs.filter(s => s.health === "healthy").length,
      degraded_subsystems: subs.filter(s => s.health === "degraded").length,
      unhealthy_subsystems: subs.filter(s => s.health === "unhealthy").length,
      active_operations: this.state.active_operations,
      total_operations: this.state.total_operations,
      uptime_ms: Date.now() - this.state.initialized_at,
    };
  }

  /**
   * Get summary
   */
  getSummary(): string {
    const stats = this.getStats();
    if (!stats.initialized) {
      return "Master Orchestrator: Not initialized";
    }

    return [
      "LatheLoRA Master Orchestrator",
      "=============================",
      `Phase: ${stats.current_phase}`,
      `Health: ${stats.overall_health}`,
      `Subsystems: ${stats.total_subsystems} (${stats.healthy_subsystems} healthy, ${stats.degraded_subsystems} degraded, ${stats.unhealthy_subsystems} unhealthy)`,
      `Active Ops: ${stats.active_operations}`,
      `Total Ops: ${stats.total_operations}`,
      `Uptime: ${(stats.uptime_ms / 1000).toFixed(0)}s`,
    ].join("\n");
  }

  /**
   * Shutdown the system
   */
  shutdown(): boolean {
    if (!this.state) return false;
    this.transition("decommissioning");
    this.recordEvent("shutdown", "System shutdown initiated");
    return true;
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.state = null;
    this.events = [];
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAMasterOrchestratorEngine = new LatheLoRAMasterOrchestratorEngine();

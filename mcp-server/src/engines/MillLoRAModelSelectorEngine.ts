/**
 * MillLoRAModelSelectorEngine — Context-aware Model Selection (Mill parity)
 * ==========================================================================
 *
 * Selects the best MillLoRA adapter(s) for a given inference context.
 * Uses mill-canonical specialization metadata, historical performance,
 * load, and mill-canonical history signals (chatter / FPA / TCPM).
 *
 * Mill parity for LatheLoRAModelSelectorEngine (LATHE-LORA-MS0 U-LLR43)
 * with MILL-CANONICAL extensions:
 *
 *   - Mill-canonical specialization tag vocabulary (replaces the lathe
 *     threading/turning/facing/okuma/fanuc set) covering mill ops,
 *     mill controllers, materials, and feature families
 *   - axis_mode tag on every model AND in selection context — the
 *     context's axis_mode is a HARD filter (5-axis context only
 *     selects 5_axis_simul or shared models)
 *   - Mill-canonical history signals influence scoring:
 *       chatter_history (downweighted), fpa_pass_history (upweighted),
 *       tcpm_solver_fault_history (filtered out for 5-axis contexts)
 *   - tcpm_safe_only context flag — for 5-axis runs, drop any candidate
 *     whose tcpm_solver_fault_history exceeds tcpm_fault_max
 *
 * @module engines/MillLoRAModelSelectorEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-LORA-MODEL-SELECTOR (iter95)
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

/** Mill-canonical specialization tag vocabulary. */
export type MillSpecializationTag =
  // Mill ops (matches iter88 MillOpType)
  | "face"
  | "pocket_2_5d"
  | "pocket_3d"
  | "contour"
  | "drill"
  | "tap"
  | "thread_mill"
  | "boring"
  | "5_axis_simul"
  | "4_axis_index"
  | "engraving"
  // Mill controllers
  | "heidenhain"
  | "fanuc_mill"
  | "mazak"
  | "okuma_mc"
  | "mori_seiki"
  | "makino"
  | "dmg"
  | "haas_mill"
  // Materials
  | "steel"
  | "stainless"
  | "titanium"
  | "inconel"
  | "aluminum"
  | "plastic"
  | "graphite"
  // Feature families (matches iter88 MillFeatureSignature)
  | "prismatic"
  | "mold_3d"
  | "thin_wall"
  // Catch-all
  | "general";

/** Per-axis training mode — matches MillLoRACadenceEngine taxonomy. */
export type MillAxisMode = "3_axis" | "4_axis_index" | "5_axis_simul" | "shared";

export interface MillModelDescriptor {
  id: string;
  name: string;
  specializations: MillSpecializationTag[];
  avg_accuracy: number;
  avg_latency_ms: number;
  current_load: number;
  max_concurrent: number;
  enabled: boolean;
  registered_at: number;
  success_count: number;
  failure_count: number;
  /** MILL-CANONICAL: which axis mode this model targets. */
  axis_mode: MillAxisMode;
  /** MILL-CANONICAL: prior chatter breach rate (0..1). */
  chatter_history?: number;
  /** MILL-CANONICAL: prior FPA pass rate (0..1). Higher is better. */
  fpa_pass_history?: number;
  /** MILL-CANONICAL: prior TCPM solver fault rate (0..1). */
  tcpm_solver_fault_history?: number;
}

export interface MillSelectionContext {
  operation?: string;
  material?: string;
  controller?: string;
  feature_signature?: string;
  priority?: "speed" | "accuracy" | "balanced";
  required_tags?: MillSpecializationTag[];
  /** MILL-CANONICAL: hard-filter by axis (matched + 'shared' kept). */
  axis_mode?: MillAxisMode;
  /** MILL-CANONICAL: drop candidates with tcpm history above threshold. */
  tcpm_safe_only?: boolean;
}

export interface MillSelectionResult {
  id: string;
  selected_model: MillModelDescriptor;
  backup_models: MillModelDescriptor[];
  selection_score: number;
  rationale: string;
  context: MillSelectionContext;
  selected_at: number;
  /** MILL-CANONICAL: count of candidates dropped by axis mismatch. */
  axis_filtered_out: number;
  /** MILL-CANONICAL: count of candidates dropped by tcpm_safe_only. */
  tcpm_filtered_out: number;
}

export interface MillSelectorConfig {
  prefer_least_loaded: boolean;
  accuracy_weight: number;
  latency_weight: number;
  load_weight: number;
  min_accuracy: number;
  max_backups: number;
  /** MILL-CANONICAL: chatter_history above this → severe score penalty. */
  chatter_penalty_threshold: number;
  /** MILL-CANONICAL: weight applied to (1 - chatter_history) bonus. */
  chatter_weight: number;
  /** MILL-CANONICAL: weight applied to fpa_pass_history bonus. */
  fpa_weight: number;
  /** MILL-CANONICAL: tcpm_solver_fault_history above this drops candidate when tcpm_safe_only=true. */
  tcpm_fault_max: number;
}

const DEFAULT_CONFIG: MillSelectorConfig = {
  prefer_least_loaded: true,
  accuracy_weight: 0.4,
  latency_weight: 0.15,
  load_weight: 0.2,
  min_accuracy: 0.6,
  max_backups: 2,
  chatter_penalty_threshold: 0.05,
  chatter_weight: 0.15,
  fpa_weight: 0.1,
  tcpm_fault_max: 0.02,
};

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillLoRAModelSelectorEngine {
  private config: MillSelectorConfig = { ...DEFAULT_CONFIG };
  private models: Map<string, MillModelDescriptor> = new Map();
  private selectionHistory: MillSelectionResult[] = [];

  setConfig(config: Partial<MillSelectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MillSelectorConfig {
    return { ...this.config };
  }

  registerModel(
    model: Omit<MillModelDescriptor, "registered_at" | "success_count" | "failure_count" | "current_load">,
  ): MillModelDescriptor {
    const descriptor: MillModelDescriptor = {
      ...model,
      current_load: 0,
      success_count: 0,
      failure_count: 0,
      registered_at: Date.now(),
    };
    this.models.set(descriptor.id, descriptor);
    return descriptor;
  }

  unregisterModel(modelId: string): boolean {
    return this.models.delete(modelId);
  }

  recordOutcome(modelId: string, success: boolean, latencyMs?: number): boolean {
    const m = this.models.get(modelId);
    if (!m) return false;
    if (success) m.success_count++;
    else m.failure_count++;
    const total = m.success_count + m.failure_count;
    if (total > 0) m.avg_accuracy = m.success_count / total;
    if (typeof latencyMs === "number") {
      m.avg_latency_ms = m.avg_latency_ms * 0.9 + latencyMs * 0.1;
    }
    return true;
  }

  /**
   * MILL-CANONICAL: record a chatter/fpa/tcpm outcome to evolve the
   * model's history bias. Exponentially-smoothed update (alpha=0.1).
   */
  recordMillOutcome(
    modelId: string,
    outcome: { chatter?: boolean; fpa_pass?: boolean; tcpm_fault?: boolean },
  ): boolean {
    const m = this.models.get(modelId);
    if (!m) return false;
    const alpha = 0.1;
    if (typeof outcome.chatter === "boolean") {
      const prev = typeof m.chatter_history === "number" ? m.chatter_history : 0;
      m.chatter_history = prev * (1 - alpha) + (outcome.chatter ? 1 : 0) * alpha;
    }
    if (typeof outcome.fpa_pass === "boolean") {
      const prev = typeof m.fpa_pass_history === "number" ? m.fpa_pass_history : 1;
      m.fpa_pass_history = prev * (1 - alpha) + (outcome.fpa_pass ? 1 : 0) * alpha;
    }
    if (typeof outcome.tcpm_fault === "boolean") {
      const prev = typeof m.tcpm_solver_fault_history === "number" ? m.tcpm_solver_fault_history : 0;
      m.tcpm_solver_fault_history = prev * (1 - alpha) + (outcome.tcpm_fault ? 1 : 0) * alpha;
    }
    return true;
  }

  scoreModel(model: MillModelDescriptor, context: MillSelectionContext): number {
    if (!model.enabled) return 0;
    if (model.avg_accuracy < this.config.min_accuracy) return 0;
    if (model.current_load >= model.max_concurrent) return 0;

    // MILL-CANONICAL axis_mode hard filter: must match or be 'shared'
    if (context.axis_mode && model.axis_mode !== context.axis_mode && model.axis_mode !== "shared") {
      return 0;
    }

    // MILL-CANONICAL tcpm_safe_only hard filter
    if (
      context.tcpm_safe_only &&
      typeof model.tcpm_solver_fault_history === "number" &&
      model.tcpm_solver_fault_history > this.config.tcpm_fault_max
    ) {
      return 0;
    }

    // Required-tags hard requirement
    if (context.required_tags) {
      for (const tag of context.required_tags) {
        if (!model.specializations.includes(tag)) return 0;
      }
    }

    // Specialization scoring
    let specializationScore = 0;
    if (context.operation && model.specializations.includes(context.operation as MillSpecializationTag)) {
      specializationScore += 0.25;
    }
    if (context.material && model.specializations.includes(context.material as MillSpecializationTag)) {
      specializationScore += 0.25;
    }
    if (context.controller && model.specializations.includes(context.controller as MillSpecializationTag)) {
      specializationScore += 0.15;
    }
    if (context.feature_signature && model.specializations.includes(context.feature_signature as MillSpecializationTag)) {
      specializationScore += 0.15;
    }

    const accuracyScore = model.avg_accuracy * this.config.accuracy_weight;
    const loadRatio = model.current_load / model.max_concurrent;
    const loadScore = (1 - loadRatio) * this.config.load_weight;
    const latencyScore = Math.max(0, 1 - model.avg_latency_ms / 1000) * this.config.latency_weight;

    // MILL-CANONICAL: chatter penalty + fpa bonus
    const chatterHist = typeof model.chatter_history === "number" ? model.chatter_history : 0;
    const chatterScore = (1 - Math.min(1, chatterHist / Math.max(0.001, this.config.chatter_penalty_threshold))) * this.config.chatter_weight;
    const fpaHist = typeof model.fpa_pass_history === "number" ? model.fpa_pass_history : 0.5;
    const fpaScore = fpaHist * this.config.fpa_weight;

    let priorityMultiplier = 1.0;
    if (context.priority === "speed" && model.avg_latency_ms < 500) priorityMultiplier = 1.2;
    if (context.priority === "accuracy" && model.avg_accuracy > 0.8) priorityMultiplier = 1.2;

    return (specializationScore + accuracyScore + loadScore + latencyScore + chatterScore + fpaScore) * priorityMultiplier;
  }

  select(context: MillSelectionContext): MillSelectionResult | null {
    if (this.models.size === 0) return null;

    // Track filter drops for diagnostic visibility
    let axisFiltered = 0;
    let tcpmFiltered = 0;
    const all = Array.from(this.models.values());
    for (const m of all) {
      if (!m.enabled || m.avg_accuracy < this.config.min_accuracy || m.current_load >= m.max_concurrent) continue;
      if (context.axis_mode && m.axis_mode !== context.axis_mode && m.axis_mode !== "shared") {
        axisFiltered++;
        continue;
      }
      if (
        context.tcpm_safe_only &&
        typeof m.tcpm_solver_fault_history === "number" &&
        m.tcpm_solver_fault_history > this.config.tcpm_fault_max
      ) {
        tcpmFiltered++;
      }
    }

    const scored = all
      .map((m) => ({ model: m, score: this.scoreModel(m, context) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return null;

    const selected = scored[0].model;
    const backups = scored.slice(1, 1 + this.config.max_backups).map((s) => s.model);
    const rationale = this.generateRationale(selected, context, scored[0].score);

    const result: MillSelectionResult = {
      id: `sel-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      selected_model: selected,
      backup_models: backups,
      selection_score: scored[0].score,
      rationale,
      context,
      selected_at: Date.now(),
      axis_filtered_out: axisFiltered,
      tcpm_filtered_out: tcpmFiltered,
    };

    this.selectionHistory.push(result);
    if (this.selectionHistory.length > 1000) {
      this.selectionHistory = this.selectionHistory.slice(-500);
    }
    selected.current_load++;
    return result;
  }

  release(modelId: string): boolean {
    const m = this.models.get(modelId);
    if (!m) return false;
    if (m.current_load > 0) m.current_load--;
    return true;
  }

  private generateRationale(model: MillModelDescriptor, context: MillSelectionContext, score: number): string {
    const parts: string[] = [];
    parts.push(`Selected ${model.name} (score: ${score.toFixed(3)})`);
    parts.push(`axis: ${model.axis_mode}`);
    if (context.operation && model.specializations.includes(context.operation as MillSpecializationTag)) {
      parts.push(`op:${context.operation}`);
    }
    if (context.material && model.specializations.includes(context.material as MillSpecializationTag)) {
      parts.push(`mat:${context.material}`);
    }
    if (context.controller && model.specializations.includes(context.controller as MillSpecializationTag)) {
      parts.push(`ctrl:${context.controller}`);
    }
    parts.push(`acc:${(model.avg_accuracy * 100).toFixed(1)}%`);
    parts.push(`lat:${model.avg_latency_ms.toFixed(0)}ms`);
    parts.push(`load:${model.current_load}/${model.max_concurrent}`);
    if (typeof model.chatter_history === "number") parts.push(`chatter:${(model.chatter_history * 100).toFixed(1)}%`);
    return parts.join(", ");
  }

  getModels(): MillModelDescriptor[] {
    return Array.from(this.models.values());
  }

  getModel(modelId: string): MillModelDescriptor | undefined {
    return this.models.get(modelId);
  }

  findBySpecialization(tag: MillSpecializationTag): MillModelDescriptor[] {
    return Array.from(this.models.values()).filter((m) => m.specializations.includes(tag));
  }

  /** MILL-CANONICAL: enumerate models by axis_mode. */
  findByAxisMode(axis: MillAxisMode): MillModelDescriptor[] {
    return Array.from(this.models.values()).filter((m) => m.axis_mode === axis);
  }

  getStats(): {
    total_models: number;
    enabled_models: number;
    avg_accuracy: number;
    avg_latency_ms: number;
    total_load: number;
    total_capacity: number;
    total_selections: number;
    models_by_axis: Record<string, number>;
    total_axis_filtered: number;
    total_tcpm_filtered: number;
  } {
    const all = Array.from(this.models.values());
    const enabled = all.filter((m) => m.enabled);
    const byAxis: Record<string, number> = {};
    for (const m of all) byAxis[m.axis_mode] = (byAxis[m.axis_mode] ?? 0) + 1;
    const axisDropped = this.selectionHistory.reduce((s, r) => s + r.axis_filtered_out, 0);
    const tcpmDropped = this.selectionHistory.reduce((s, r) => s + r.tcpm_filtered_out, 0);
    return {
      total_models: all.length,
      enabled_models: enabled.length,
      avg_accuracy: enabled.length > 0 ? enabled.reduce((s, m) => s + m.avg_accuracy, 0) / enabled.length : 0,
      avg_latency_ms: enabled.length > 0 ? enabled.reduce((s, m) => s + m.avg_latency_ms, 0) / enabled.length : 0,
      total_load: all.reduce((s, m) => s + m.current_load, 0),
      total_capacity: all.reduce((s, m) => s + m.max_concurrent, 0),
      total_selections: this.selectionHistory.length,
      models_by_axis: byAxis,
      total_axis_filtered: axisDropped,
      total_tcpm_filtered: tcpmDropped,
    };
  }

  getSummary(): string {
    const s = this.getStats();
    return [
      "Mill LoRA Model Selector Summary",
      "================================",
      `Models: ${s.total_models} (${s.enabled_models} enabled)`,
      `Avg Accuracy: ${(s.avg_accuracy * 100).toFixed(1)}%`,
      `Avg Latency: ${s.avg_latency_ms.toFixed(0)}ms`,
      `Load: ${s.total_load}/${s.total_capacity}`,
      `Total Selections: ${s.total_selections}`,
      `Axis Filtered: ${s.total_axis_filtered}`,
      `TCPM Filtered: ${s.total_tcpm_filtered}`,
    ].join("\n");
  }

  clearHistory(): void {
    this.selectionHistory = [];
  }

  reset(): void {
    this.models.clear();
    this.selectionHistory = [];
    this.config = { ...DEFAULT_CONFIG };
  }
}

export const millLoRAModelSelectorEngine = new MillLoRAModelSelectorEngine();
export { MillLoRAModelSelectorEngine };

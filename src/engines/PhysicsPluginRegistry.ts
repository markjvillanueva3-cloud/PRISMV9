/**
 * PhysicsPluginRegistry — Plugin registration, topological sort, tier filtering
 *
 * Manages the 24 physics plugins that implement the PhysicsPlugin interface.
 * Provides:
 *   - Registration/unregistration of plugins
 *   - Topological sort of feed-forward dependencies (via GraphAlgorithmsEngine)
 *   - Tier-aware filtering (min_tier gate)
 *   - Feedback edge tracking (separate from topo sort — for convergence engine)
 *   - Graceful degradation with confidence penalties for skipped plugins
 *
 * The registry does NOT own convergence or runtime canRun() checks — those
 * belong to PhysicsFusionConvergenceEngine (FUSION-2). The registry determines
 * WHAT runs and in WHAT ORDER; the convergence engine determines HOW MANY TIMES,
 * with WHAT RELAXATION, and calls canRun() before each plugin invocation.
 *
 * @see PhysicsFusionOrchestrator.types — all type definitions
 * @see PhysicsFusionConvergenceEngine — nested FTW/FES/FDT iteration (FUSION-2)
 * @module engines/PhysicsPluginRegistry
 */

import { graphAlgorithmsEngine } from "./GraphAlgorithmsEngine.js";
import type {
  PhysicsPlugin,
  PhysicsPluginDescriptor,
  FusionTier,
  SkippedPlugin,
} from "./PhysicsFusionOrchestrator.types.js";

// ============================================================================
// TYPES
// ============================================================================

/** Result of getExecutionOrder — ordered plugins + skipped list */
export interface ExecutionPlan {
  /** Plugins to execute, in topological order */
  ordered: PhysicsPlugin[];
  /** Plugins excluded from this execution */
  skipped: SkippedPlugin[];
  /** Total confidence penalty from skipped plugins */
  total_penalty: number;
}

/** Feedback edge: source plugin's output feeds back to target plugin */
export interface FeedbackEdge {
  /** Plugin that produces the feedback value */
  from: string;
  /** Plugin that consumes the feedback value */
  to: string;
}

/** Validation result from validateDependencies */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// REGISTRY
// ============================================================================

export class PhysicsPluginRegistry {
  private _plugins: Map<string, PhysicsPlugin> = new Map();
  private _topoCache: Map<string, string[]> = new Map();

  // ── Registration ──────────────────────────────────────────────────

  /**
   * Register a physics plugin. The plugin's descriptor.id must be unique.
   * Throws if a plugin with the same ID is already registered.
   */
  register(plugin: PhysicsPlugin): void {
    const id = plugin.descriptor.id;
    if (this._plugins.has(id)) {
      throw new Error(
        `PhysicsPluginRegistry: plugin "${id}" is already registered. ` +
        `Call unregister("${id}") first.`,
      );
    }
    this._validateDescriptor(plugin.descriptor);
    this._plugins.set(id, plugin);
    this._invalidateCache();
  }

  /**
   * Remove a plugin from the registry.
   * Returns true if the plugin was found and removed, false otherwise.
   */
  unregister(id: string): boolean {
    const removed = this._plugins.delete(id);
    if (removed) this._invalidateCache();
    return removed;
  }

  /** Retrieve a plugin by ID, or undefined if not found. */
  get(id: string): PhysicsPlugin | undefined {
    return this._plugins.get(id);
  }

  /** Get all registered plugins (unordered). */
  getAll(): PhysicsPlugin[] {
    return Array.from(this._plugins.values());
  }

  /** Number of registered plugins. */
  get size(): number {
    return this._plugins.size;
  }

  /** Remove all plugins (useful for testing). */
  clear(): void {
    this._plugins.clear();
    this._invalidateCache();
  }

  // ── Execution Planning ────────────────────────────────────────────

  /**
   * Compute the execution order for a given tier.
   *
   * Steps:
   *   1. Filter plugins by min_tier <= tier
   *   2. Check depends_on can be satisfied (transitive cascade)
   *   3. Topologically sort remaining plugins by depends_on edges
   *   4. Record skipped plugins with reasons and penalties
   *
   * NOTE: Runtime canRun() checks are the convergence engine's responsibility.
   * This method performs static planning only — it determines which plugins
   * CAN participate based on tier and dependency availability, not whether
   * their runtime inputs are present in the FusionState.
   *
   * @param available_inputs Reserved for future use (output-key-based skip).
   *        Currently only affects cache key differentiation.
   * @param tier Current fusion tier
   * @returns ExecutionPlan with ordered plugins and skipped list
   */
  getExecutionOrder(available_inputs: string[], tier: FusionTier): ExecutionPlan {
    const cacheKey = this._makeCacheKey(available_inputs, tier);
    const cachedOrder = this._topoCache.get(cacheKey);

    // If cached, rebuild the plan from cached order
    if (cachedOrder) {
      return this._buildPlanFromOrder(cachedOrder, tier);
    }

    const skipped: SkippedPlugin[] = [];

    // Step 1: Filter by tier
    const tierFiltered: PhysicsPlugin[] = [];
    for (const plugin of this._plugins.values()) {
      if (plugin.descriptor.min_tier > tier) {
        skipped.push({
          plugin_id: plugin.descriptor.id,
          reason: "below_tier",
          penalty: plugin.descriptor.skip_penalty,
        });
      } else {
        tierFiltered.push(plugin);
      }
    }

    // Step 2: Check depends_on satisfaction with transitive cascade.
    // If A is skipped and B depends on A, B must also be skipped.
    // Iterate until stable (handles multi-level cascades).
    const includedIds = new Set(tierFiltered.map(p => p.descriptor.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const plugin of tierFiltered) {
        const id = plugin.descriptor.id;
        if (!includedIds.has(id)) continue; // already removed
        const missingDeps = plugin.descriptor.depends_on.filter(
          dep => !includedIds.has(dep),
        );
        if (missingDeps.length > 0) {
          includedIds.delete(id);
          skipped.push({
            plugin_id: id,
            reason: "missing_inputs",
            penalty: plugin.descriptor.skip_penalty,
            missing_inputs: missingDeps,
          });
          changed = true; // re-check — cascading removal
        }
      }
    }

    const included = tierFiltered.filter(p => includedIds.has(p.descriptor.id));

    // Step 3: Topological sort via GraphAlgorithmsEngine (Kahn's algorithm)
    const nodes = included.map(p => p.descriptor.id);
    const edges: Array<{ from: string; to: string }> = [];
    for (const plugin of included) {
      for (const dep of plugin.descriptor.depends_on) {
        if (includedIds.has(dep)) {
          edges.push({ from: dep, to: plugin.descriptor.id });
        }
      }
    }

    const topoResult = graphAlgorithmsEngine.topologicalSort(nodes, edges);

    if (!topoResult.success) {
      // Cycle detected in depends_on — configuration error.
      for (const plugin of included) {
        skipped.push({
          plugin_id: plugin.descriptor.id,
          reason: "error",
          penalty: plugin.descriptor.skip_penalty,
          missing_inputs: [`cycle: ${topoResult.reason}`],
        });
      }
      return {
        ordered: [],
        skipped,
        total_penalty: this.getTotalSkipPenalty(skipped),
      };
    }

    const order = topoResult.order!;
    this._topoCache.set(cacheKey, order);

    const ordered = order
      .map(id => this._plugins.get(id))
      .filter((p): p is PhysicsPlugin => p !== undefined);

    return {
      ordered,
      skipped,
      total_penalty: this.getTotalSkipPenalty(skipped),
    };
  }

  /**
   * Get plugins that would be skipped for a given tier and inputs,
   * with their confidence penalties.
   */
  getSkippedPlugins(available_inputs: string[], tier: FusionTier): SkippedPlugin[] {
    return this.getExecutionOrder(available_inputs, tier).skipped;
  }

  // ── Feedback Edges ────────────────────────────────────────────────

  /**
   * Get all feedback edges across registered plugins.
   * These are NOT part of the topological sort — they represent
   * cyclical dependencies resolved by the convergence engine's
   * iterative relaxation.
   */
  getFeedbackEdges(): FeedbackEdge[] {
    const edges: FeedbackEdge[] = [];
    const registeredIds = new Set(this._plugins.keys());

    for (const plugin of this._plugins.values()) {
      for (const fromId of plugin.descriptor.feedback_from) {
        if (registeredIds.has(fromId)) {
          edges.push({ from: fromId, to: plugin.descriptor.id });
        }
      }
    }

    return edges;
  }

  // ── Confidence Scoring ────────────────────────────────────────────

  /** Sum of skip penalties for a list of skipped plugins (capped at 1.0). */
  getTotalSkipPenalty(skipped: SkippedPlugin[]): number {
    const total = skipped.reduce((sum, s) => sum + s.penalty, 0);
    return Math.min(total, 1.0);
  }

  // ── Validation ────────────────────────────────────────────────────

  /**
   * Validate all registered plugins' dependency declarations.
   * Checks:
   *   - All depends_on references point to registered plugins
   *   - All feedback_from references point to registered plugins
   *   - depends_on and feedback_from are disjoint per plugin
   *   - depends_on graph is acyclic (no cycles in feed-forward deps)
   *   - No plugin depends on itself
   *   - Output keys are unique across plugins (no collisions)
   */
  validateDependencies(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const registeredIds = new Set(this._plugins.keys());
    const outputOwners = new Map<string, string>();

    for (const plugin of this._plugins.values()) {
      const id = plugin.descriptor.id;

      // Self-dependency check
      if (plugin.descriptor.depends_on.includes(id)) {
        errors.push(`Plugin "${id}" depends on itself`);
      }
      if (plugin.descriptor.feedback_from.includes(id)) {
        warnings.push(`Plugin "${id}" has feedback_from itself (unusual but not invalid)`);
      }

      // depends_on / feedback_from disjointness check
      const overlap = plugin.descriptor.depends_on.filter(
        dep => plugin.descriptor.feedback_from.includes(dep),
      );
      if (overlap.length > 0) {
        errors.push(
          `Plugin "${id}" has "${overlap.join(", ")}" in both depends_on and feedback_from ` +
          `— an edge cannot be both acyclic (feed-forward) and cyclic (feedback)`,
        );
      }

      // depends_on references exist
      for (const dep of plugin.descriptor.depends_on) {
        if (!registeredIds.has(dep)) {
          errors.push(
            `Plugin "${id}" depends_on "${dep}" which is not registered`,
          );
        }
      }

      // feedback_from references exist
      for (const fb of plugin.descriptor.feedback_from) {
        if (!registeredIds.has(fb)) {
          warnings.push(
            `Plugin "${id}" has feedback_from "${fb}" which is not registered`,
          );
        }
      }

      // Output key uniqueness
      for (const out of plugin.descriptor.outputs) {
        const existing = outputOwners.get(out);
        if (existing && existing !== id) {
          warnings.push(
            `Output key "${out}" produced by both "${existing}" and "${id}"`,
          );
        }
        outputOwners.set(out, id);
      }
    }

    // Cycle check on depends_on graph
    const nodes = Array.from(registeredIds);
    const edges: Array<{ from: string; to: string }> = [];
    for (const plugin of this._plugins.values()) {
      for (const dep of plugin.descriptor.depends_on) {
        if (registeredIds.has(dep)) {
          edges.push({ from: dep, to: plugin.descriptor.id });
        }
      }
    }
    const topoResult = graphAlgorithmsEngine.topologicalSort(nodes, edges);
    if (!topoResult.success) {
      errors.push(`Cycle detected in depends_on graph: ${topoResult.reason}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ── Internal Helpers ──────────────────────────────────────────────

  /** Validate a plugin descriptor at registration time. */
  private _validateDescriptor(desc: PhysicsPluginDescriptor): void {
    if (!desc.id || desc.id.trim().length === 0) {
      throw new Error("PhysicsPluginRegistry: descriptor.id must be non-empty");
    }
    if (desc.level < 1 || desc.level > 8) {
      throw new Error(
        `PhysicsPluginRegistry: descriptor.level must be 1-8, got ${desc.level}`,
      );
    }
    if (desc.min_tier < 1 || desc.min_tier > 4) {
      throw new Error(
        `PhysicsPluginRegistry: descriptor.min_tier must be 1-4, got ${desc.min_tier}`,
      );
    }
    if (desc.skip_penalty < 0 || desc.skip_penalty > 1) {
      throw new Error(
        `PhysicsPluginRegistry: descriptor.skip_penalty must be 0-1, got ${desc.skip_penalty}`,
      );
    }
    if (!Array.isArray(desc.outputs) || desc.outputs.length === 0) {
      throw new Error(
        `PhysicsPluginRegistry: descriptor.outputs must be a non-empty array`,
      );
    }
    // depends_on / feedback_from disjointness
    const overlap = desc.depends_on.filter(d => desc.feedback_from.includes(d));
    if (overlap.length > 0) {
      throw new Error(
        `PhysicsPluginRegistry: plugin "${desc.id}" has "${overlap.join(", ")}" ` +
        `in both depends_on and feedback_from — must be disjoint`,
      );
    }
  }

  /** Invalidate cached execution orders (called on register/unregister). */
  private _invalidateCache(): void {
    this._topoCache.clear();
  }

  /** Build a deterministic cache key from available inputs + tier. */
  private _makeCacheKey(available_inputs: string[], tier: FusionTier): string {
    const sorted = [...available_inputs].sort();
    return `t${tier}:${sorted.join(",")}`;
  }

  /**
   * Rebuild an ExecutionPlan from a cached topological order.
   * Uses the same tier-filter + dependency logic as the primary path
   * for consistent skip reasons.
   */
  private _buildPlanFromOrder(
    order: string[],
    tier: FusionTier,
  ): ExecutionPlan {
    const skipped: SkippedPlugin[] = [];
    const orderedInPlan = new Set(order);

    for (const plugin of this._plugins.values()) {
      if (!orderedInPlan.has(plugin.descriptor.id)) {
        if (plugin.descriptor.min_tier > tier) {
          skipped.push({
            plugin_id: plugin.descriptor.id,
            reason: "below_tier",
            penalty: plugin.descriptor.skip_penalty,
          });
        } else {
          // Find which deps are missing from the ordered set
          const missingDeps = plugin.descriptor.depends_on.filter(
            dep => !orderedInPlan.has(dep),
          );
          skipped.push({
            plugin_id: plugin.descriptor.id,
            reason: "missing_inputs",
            penalty: plugin.descriptor.skip_penalty,
            missing_inputs: missingDeps.length > 0 ? missingDeps : ["transitive_cascade"],
          });
        }
      }
    }

    const ordered = order
      .map(id => this._plugins.get(id))
      .filter((p): p is PhysicsPlugin => p !== undefined);

    return {
      ordered,
      skipped,
      total_penalty: this.getTotalSkipPenalty(skipped),
    };
  }
}

/** Singleton instance */
export const physicsPluginRegistry = new PhysicsPluginRegistry();

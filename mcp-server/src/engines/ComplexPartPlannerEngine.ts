/**
 * ComplexPartPlannerEngine — U-CUIX-P0-21 / CAD-UIX-MS0
 *
 * Plans complex parts: multi-body, multi-configuration, parameter-driven
 * families that a single-sketch CADIntent (U-CUIX-P0-20) can't express.
 *
 * What a "complex part" is here (derived from JM Die's actual catalog):
 *   - Multi-body: ≥2 independent solid bodies in one file (fastener die
 *     punch + matrix, core + cavity mold blocks, multi-cavity inserts)
 *   - Multi-configuration: a single part definition parameterised into
 *     N variants (hex-head M6/M8/M10, 12-point M12/M14/M16, etc.)
 *   - Inter-body boolean combinations: punch body subtracted from matrix
 *     body to produce the die cavity
 *
 * Responsibilities:
 *   1. Group features into named bodies; emit `operation: "new_body"`
 *      on each body's first feature and `operation: "add"` on the rest.
 *   2. Apply inter-body boolean operations (union / subtract / intersect)
 *      in dependency-respecting order.
 *   3. For multi-config families, re-plan the entire part per
 *      configuration with parameter overrides and collect per-config
 *      op streams.
 *   4. Compatibility probe: gate on adapter support for boolean_*,
 *      parameter_declare, feature_extrude operation-mode, etc.
 *
 * Design choice: reuses CADOperationPlannerEngine (P0-20) for each body's
 * feature-to-op expansion rather than reinventing. The multi-body +
 * multi-config logic sits as a thin orchestration layer above it.
 *
 * Non-goals (next units):
 *   - Assemblies (multiple parts with mates) → U-CUIX-P0-22
 *   - NN-driven intent refinement → PHASE-31 per-CAD heads
 *   - Drawing/BOM generation → PHASE-13 AssemblyConstraints+DrawingGen
 *
 * @module engines/ComplexPartPlannerEngine
 */

import type {
  CADOperation,
  CADOperationKind,
  CADSystemId,
} from "../interfaces/ICADCodeGenerator.js";
import {
  CADOperationPlannerEngine,
  cadOperationPlannerEngine,
  PlannerIntentError,
  type CADFeatureIntent,
  type CADIntent,
  type AdapterCompatibility,
} from "./CADOperationPlannerEngine.js";
import { getCADAdapter } from "./CADAdapterRegistry.js";

// ── Intent schema ─────────────────────────────────────────────────────────

/**
 * One body in a complex part. A body is a contiguous group of features
 * that share a solid (first feature creates the body, subsequent features
 * add to it or cut from it).
 */
export interface ComplexPartBody {
  /** Stable id for cross-body references + boolean targets. */
  id: string;
  /** Human-readable name (e.g. "punch", "matrix", "stripper"). */
  displayName?: string;
  /** The feature stream that builds this body. Uses P0-20 primitives. */
  features: ReadonlyArray<CADFeatureIntent>;
  /** Other body ids this body depends on (emitted after its dependencies). */
  dependsOn?: ReadonlyArray<string>;
  /**
   * If set, this body is the result of a boolean combination of earlier bodies.
   * Body's own features still run first, then the boolean op combines with `booleanTargets`.
   */
  booleanOp?: "union" | "subtract" | "intersect";
  /** Target body ids for booleanOp (must exist in the parent part). */
  booleanTargets?: ReadonlyArray<string>;
}

/** Override for a configuration — substitutes values on the parameter table. */
export interface ComplexPartConfiguration {
  /** Unique config name (used as a suffix on operation ids). */
  name: string;
  /**
   * Parameter overrides applied for this configuration. Keys must match
   * parameter names declared on the parent `ComplexPartIntent.parameters`.
   */
  parameterOverrides: Record<string, number | string | boolean>;
  /** Optional: hide/suppress specific body ids in this configuration. */
  hiddenBodies?: ReadonlyArray<string>;
  /** Optional human-readable description. */
  description?: string;
}

export interface ComplexPartIntent {
  name: string;
  cadSystem: CADSystemId;
  description?: string;
  /** Input unit convention. */
  units?: "mm" | "cm" | "in";
  /** Base parameter table for the part family. */
  parameters?: CADIntent["parameters"];
  /** One or more bodies. Single-body intents should usually prefer P0-20. */
  bodies: ReadonlyArray<ComplexPartBody>;
  /**
   * Optional configuration list. When present the planner produces a
   * per-configuration op stream in addition to the default (first-config
   * or parameters-as-is) stream.
   */
  configurations?: ReadonlyArray<ComplexPartConfiguration>;
}

// ── Result types ─────────────────────────────────────────────────────────

export interface ComplexConfigurationPlan {
  configName: string;
  hiddenBodies: ReadonlyArray<string>;
  parameterOverrides: Record<string, number | string | boolean>;
  ops: ReadonlyArray<CADOperation>;
  opCount: number;
  warnings: ReadonlyArray<{ message: string; featureId?: string }>;
}

export interface ComplexPartPlanResult {
  cadSystem: CADSystemId;
  partName: string;
  bodyCount: number;
  configurationCount: number;
  /** The "default" plan — first configuration or parameters-as-is if no configs. */
  defaultOps: ReadonlyArray<CADOperation>;
  defaultOpCount: number;
  /** Per-configuration plans (empty array when no configurations declared). */
  perConfiguration: ReadonlyArray<ComplexConfigurationPlan>;
  warnings: ReadonlyArray<{ message: string; featureId?: string }>;
  compatibility: Readonly<Partial<Record<CADSystemId, AdapterCompatibility>>>;
  /** Boolean operations emitted between bodies, by body id. */
  booleanOpsEmitted: ReadonlyArray<{
    bodyId: string;
    op: "union" | "subtract" | "intersect";
    targets: ReadonlyArray<string>;
  }>;
}

// ── Errors ───────────────────────────────────────────────────────────────

export class ComplexPartIntentError extends Error {
  readonly code = "COMPLEX_PART_INTENT_INVALID";
  constructor(message: string) {
    super(message);
    this.name = "ComplexPartIntentError";
  }
}

export class ComplexPartBodyCycleError extends Error {
  readonly code = "COMPLEX_PART_BODY_CYCLE";
  readonly cycle: ReadonlyArray<string>;
  constructor(cycle: ReadonlyArray<string>) {
    super(`Body dependency cycle: ${cycle.join(" → ")} → ${cycle[0]}`);
    this.name = "ComplexPartBodyCycleError";
    this.cycle = cycle;
  }
}

// ── Engine ───────────────────────────────────────────────────────────────

export class ComplexPartPlannerEngine {
  constructor(private readonly featurePlanner: CADOperationPlannerEngine = cadOperationPlannerEngine) {}

  async plan(intent: ComplexPartIntent): Promise<ComplexPartPlanResult> {
    this.validateIntent(intent);

    const adapter = await getCADAdapter(intent.cadSystem);
    const caps = adapter.capabilities;

    // Check boolean op support if any body requests one
    this.checkBooleanSupport(intent, caps.supportedOps);

    // Sort bodies by dependsOn
    const orderedBodies = this.toposortBodies(intent.bodies);

    // Plan default (parameters-as-is or first config)
    const defaultOverrides =
      intent.configurations && intent.configurations.length > 0
        ? intent.configurations[0]!.parameterOverrides
        : {};
    const defaultHidden =
      intent.configurations && intent.configurations.length > 0
        ? intent.configurations[0]!.hiddenBodies ?? []
        : [];

    const defaultPlan = await this.planOneConfiguration(
      intent,
      orderedBodies,
      {
        configName: intent.configurations?.[0]?.name ?? "default",
        hiddenBodies: defaultHidden,
        parameterOverrides: defaultOverrides,
      },
    );

    // Plan each named configuration
    const perConfiguration: ComplexConfigurationPlan[] = [];
    if (intent.configurations && intent.configurations.length > 0) {
      for (const cfg of intent.configurations) {
        const plan = await this.planOneConfiguration(intent, orderedBodies, {
          configName: cfg.name,
          hiddenBodies: cfg.hiddenBodies ?? [],
          parameterOverrides: cfg.parameterOverrides,
        });
        perConfiguration.push(plan);
      }
    }

    // Cross-CAD compatibility probe
    const compatibility = await this.computeCompatibility(intent);

    // Extract boolean emits from the default plan for reporting
    const booleanOpsEmitted: Array<{
      bodyId: string;
      op: "union" | "subtract" | "intersect";
      targets: ReadonlyArray<string>;
    }> = [];
    for (const body of intent.bodies) {
      if (body.booleanOp && body.booleanTargets && body.booleanTargets.length > 0) {
        booleanOpsEmitted.push({
          bodyId: body.id,
          op: body.booleanOp,
          targets: body.booleanTargets,
        });
      }
    }

    return {
      cadSystem: intent.cadSystem,
      partName: intent.name,
      bodyCount: intent.bodies.length,
      configurationCount: intent.configurations?.length ?? 0,
      defaultOps: defaultPlan.ops,
      defaultOpCount: defaultPlan.opCount,
      perConfiguration,
      warnings: defaultPlan.warnings,
      compatibility,
      booleanOpsEmitted,
    };
  }

  // ── Single-configuration planner ───────────────────────────────────────

  private async planOneConfiguration(
    intent: ComplexPartIntent,
    orderedBodies: ReadonlyArray<ComplexPartBody>,
    cfg: {
      configName: string;
      hiddenBodies: ReadonlyArray<string>;
      parameterOverrides: Record<string, number | string | boolean>;
    },
  ): Promise<ComplexConfigurationPlan> {
    const ops: CADOperation[] = [];
    const warnings: Array<{ message: string; featureId?: string }> = [];

    // Merge base parameters with overrides for this configuration
    const mergedParameters = this.applyOverrides(
      intent.parameters,
      cfg.parameterOverrides,
    );

    let isFirstBody = true;
    for (const body of orderedBodies) {
      if (cfg.hiddenBodies.includes(body.id)) {
        warnings.push({
          message: `config '${cfg.configName}': body '${body.id}' hidden per configuration`,
        });
        continue;
      }

      // Tag each body's features so the first extrude creates a new body,
      // rest add to it. We mutate a shallow-copy so the caller's intent is untouched.
      const taggedFeatures = this.tagBodyFeatures(body.features, isFirstBody);
      isFirstBody = false;

      // Build a sub-CADIntent for this body reusing P0-20
      const bodyIntent: CADIntent = {
        name: `${intent.name}_${body.id}_${cfg.configName}`,
        cadSystem: intent.cadSystem,
        units: intent.units,
        parameters: isFirstBody ? mergedParameters : undefined, // params declared once per part
        features: taggedFeatures,
      };

      // parameters declared on the first body only to avoid duplicate declare ops
      // (subsequent bodies inherit them via the shared adapter script context)
      bodyIntent.parameters = orderedBodies[0]!.id === body.id ? mergedParameters : undefined;

      const subPlan = await this.featurePlanner.plan(bodyIntent);
      // Re-prefix operation ids to namespace-safely distinguish bodies + configs
      for (const op of subPlan.ops) {
        ops.push({
          ...op,
          operationId: `${cfg.configName}-${body.id}-${op.operationId ?? ""}`,
        });
      }
      for (const w of subPlan.warnings) {
        warnings.push({ ...w, featureId: `${body.id}:${w.featureId ?? "?"}` });
      }

      // Emit boolean op after body body is built
      if (body.booleanOp && body.booleanTargets && body.booleanTargets.length > 0) {
        const booleanKind = this.booleanOpToKind(body.booleanOp);
        ops.push({
          kind: booleanKind,
          args: {
            sourceBody: body.id,
            targets: body.booleanTargets as ReadonlyArray<string>,
          },
          operationId: `${cfg.configName}-${body.id}-boolean-${body.booleanOp}`,
          description: `${body.booleanOp} body '${body.id}' with [${body.booleanTargets.join(", ")}]`,
        });
      }
    }

    return {
      configName: cfg.configName,
      hiddenBodies: cfg.hiddenBodies,
      parameterOverrides: cfg.parameterOverrides,
      ops,
      opCount: ops.length,
      warnings,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  /**
   * Tag body features: first one gets `operation: "new_body"`, subsequent
   * ones get `operation: "add"`. Only extrude/revolve-like ops need this;
   * pocket/hole already have natural cut semantics.
   */
  private tagBodyFeatures(
    features: ReadonlyArray<CADFeatureIntent>,
    isFirstBody: boolean,
  ): CADFeatureIntent[] {
    const out: CADFeatureIntent[] = [];
    let hasFirstExtrudeLike = false;
    for (const f of features) {
      const isExtrudeLike =
        f.kind === "rectangle_extrude" ||
        f.kind === "circle_extrude" ||
        f.kind === "revolve_rectangle";
      if (isExtrudeLike && !hasFirstExtrudeLike && !isFirstBody) {
        // Not the first body — force operation: "new_body" so this extrude
        // starts a new body instead of adding to the first.
        out.push({
          ...f,
          params: { ...f.params, operation: "new_body" },
        });
        hasFirstExtrudeLike = true;
      } else {
        out.push(f);
      }
    }
    return out;
  }

  private applyOverrides(
    base: CADIntent["parameters"] | undefined,
    overrides: Record<string, number | string | boolean>,
  ): CADIntent["parameters"] | undefined {
    if (!base) return Object.keys(overrides).length > 0 ? Object.fromEntries(
      Object.entries(overrides).map(([k, v]) => [k, { value: v }]),
    ) : undefined;
    const out = { ...base };
    for (const [k, v] of Object.entries(overrides)) {
      if (k in out) {
        out[k] = { ...out[k]!, value: v };
      } else {
        // Unknown override — treat as a new declared parameter.
        out[k] = { value: v };
      }
    }
    return out;
  }

  private booleanOpToKind(
    op: "union" | "subtract" | "intersect",
  ): CADOperationKind {
    switch (op) {
      case "union":
        return "boolean_union";
      case "subtract":
        return "boolean_subtract";
      case "intersect":
        return "boolean_intersect";
    }
  }

  private checkBooleanSupport(
    intent: ComplexPartIntent,
    supported: ReadonlySet<CADOperationKind>,
  ): void {
    const required = new Set<CADOperationKind>();
    for (const b of intent.bodies) {
      if (b.booleanOp) required.add(this.booleanOpToKind(b.booleanOp));
    }
    const missing = Array.from(required).filter((k) => !supported.has(k));
    if (missing.length > 0) {
      throw new ComplexPartIntentError(
        `Target CAD '${intent.cadSystem}' does not support required boolean ops: ${missing.join(", ")}`,
      );
    }
  }

  private validateIntent(intent: ComplexPartIntent): void {
    if (!intent?.name || typeof intent.name !== "string") {
      throw new ComplexPartIntentError("intent.name required");
    }
    if (!intent.cadSystem) throw new ComplexPartIntentError("intent.cadSystem required");
    if (!Array.isArray(intent.bodies) || intent.bodies.length === 0) {
      throw new ComplexPartIntentError("intent.bodies must be a non-empty array");
    }
    const bodyIds = new Set<string>();
    for (const b of intent.bodies) {
      if (!b.id || typeof b.id !== "string") {
        throw new ComplexPartIntentError("every body must have a string id");
      }
      if (bodyIds.has(b.id)) {
        throw new ComplexPartIntentError(`duplicate body id '${b.id}'`);
      }
      bodyIds.add(b.id);
      if (!Array.isArray(b.features) || b.features.length === 0) {
        throw new ComplexPartIntentError(`body '${b.id}' must have non-empty features array`);
      }
      if (b.booleanOp && !["union", "subtract", "intersect"].includes(b.booleanOp)) {
        throw new ComplexPartIntentError(`body '${b.id}' unknown booleanOp '${b.booleanOp}'`);
      }
      if (b.booleanOp && (!b.booleanTargets || b.booleanTargets.length === 0)) {
        throw new ComplexPartIntentError(
          `body '${b.id}' has booleanOp '${b.booleanOp}' but no booleanTargets`,
        );
      }
    }
    // Validate boolean targets + dependsOn refs
    for (const b of intent.bodies) {
      for (const t of b.booleanTargets ?? []) {
        if (!bodyIds.has(t)) {
          throw new ComplexPartIntentError(`body '${b.id}' booleanTargets contains unknown id '${t}'`);
        }
        if (t === b.id) {
          throw new ComplexPartIntentError(`body '${b.id}' cannot boolean-op itself`);
        }
      }
      for (const d of b.dependsOn ?? []) {
        if (!bodyIds.has(d)) {
          throw new ComplexPartIntentError(`body '${b.id}' dependsOn unknown body '${d}'`);
        }
        if (d === b.id) {
          throw new ComplexPartIntentError(`body '${b.id}' depends on itself`);
        }
      }
    }
    // Validate configurations
    if (intent.configurations) {
      const names = new Set<string>();
      for (const c of intent.configurations) {
        if (!c.name) throw new ComplexPartIntentError("configuration.name required");
        if (names.has(c.name)) throw new ComplexPartIntentError(`duplicate configuration '${c.name}'`);
        names.add(c.name);
        for (const hid of c.hiddenBodies ?? []) {
          if (!bodyIds.has(hid)) {
            throw new ComplexPartIntentError(
              `configuration '${c.name}' hides unknown body '${hid}'`,
            );
          }
        }
      }
    }
  }

  /** Kahn toposort over body dependsOn + implicit booleanTargets edges. */
  private toposortBodies(bodies: ReadonlyArray<ComplexPartBody>): ComplexPartBody[] {
    const idx = new Map<string, ComplexPartBody>();
    const inDeg = new Map<string, number>();
    const succ = new Map<string, string[]>();
    for (const b of bodies) {
      idx.set(b.id, b);
      inDeg.set(b.id, 0);
      succ.set(b.id, []);
    }
    for (const b of bodies) {
      // Explicit dependsOn
      for (const d of b.dependsOn ?? []) {
        inDeg.set(b.id, (inDeg.get(b.id) ?? 0) + 1);
        succ.get(d)!.push(b.id);
      }
      // Implicit: booleanTargets implies dependency
      for (const t of b.booleanTargets ?? []) {
        if (!(b.dependsOn ?? []).includes(t)) {
          inDeg.set(b.id, (inDeg.get(b.id) ?? 0) + 1);
          succ.get(t)!.push(b.id);
        }
      }
    }
    const queue: string[] = [];
    for (const b of bodies) {
      if ((inDeg.get(b.id) ?? 0) === 0) queue.push(b.id);
    }
    const sorted: ComplexPartBody[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      sorted.push(idx.get(id)!);
      for (const s of succ.get(id) ?? []) {
        inDeg.set(s, (inDeg.get(s) ?? 0) - 1);
        if (inDeg.get(s) === 0) queue.push(s);
      }
    }
    if (sorted.length !== bodies.length) {
      const remaining = bodies.filter((b) => !sorted.some((s) => s.id === b.id));
      throw new ComplexPartBodyCycleError(remaining.map((b) => b.id));
    }
    return sorted;
  }

  private async computeCompatibility(
    intent: ComplexPartIntent,
  ): Promise<Partial<Record<CADSystemId, AdapterCompatibility>>> {
    const { CAD_REGISTERED_SYSTEMS } = await import("./CADAdapterRegistry.js");
    const required = new Set<CADOperationKind>();
    for (const b of intent.bodies) {
      if (b.booleanOp) required.add(this.booleanOpToKind(b.booleanOp));
    }
    // Also add feature-level ops derived from first body's features to approximate
    const knownFeatureOps = new Set<CADOperationKind>([
      "feature_extrude",
      "feature_pocket",
      "feature_hole",
      "feature_fillet",
      "feature_chamfer",
      "feature_revolve",
      "feature_shell",
      "pattern_linear",
      "pattern_circular",
      "sketch_create",
      "sketch_rectangle",
      "sketch_circle",
    ]);
    for (const k of knownFeatureOps) required.add(k);

    const out: Partial<Record<CADSystemId, AdapterCompatibility>> = {};
    for (const sys of CAD_REGISTERED_SYSTEMS) {
      try {
        const adapter = await getCADAdapter(sys);
        const missing = Array.from(required).filter(
          (k) => !adapter.capabilities.supportedOps.has(k),
        );
        if (missing.length === 0) out[sys] = "full";
        else if (missing.length < required.size) out[sys] = "partial";
        else out[sys] = "unsupported";
      } catch {
        out[sys] = "unsupported";
      }
    }
    return out;
  }
}

export const complexPartPlannerEngine = new ComplexPartPlannerEngine();

// Re-export error classes from the feature planner so callers have one
// import surface.
export { PlannerIntentError };

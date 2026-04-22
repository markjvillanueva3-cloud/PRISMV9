/**
 * CADOperationPlannerEngine — U-CUIX-P0-20 / CAD-UIX-MS0
 *
 * Translates a high-level feature-tree intent into an ordered
 * `CADOperation[]` stream that any registered ICADCodeGenerator adapter
 * can consume via `buildScript(ops, ctx)`.
 *
 * Responsibilities:
 *   1. Feature expansion — each `CADFeatureIntent` fans out into the
 *      sketch + feature CAD_OPERATION_KINDS it needs (e.g. an
 *      extrude-a-rectangle intent becomes sketch_create → sketch_rectangle
 *      → sketch_close → feature_extrude).
 *   2. Dependency graph + topological sort — features may declare
 *      `dependsOn` links referencing earlier features' ids; the planner
 *      emits ops in a valid execution order and rejects cycles.
 *   3. Per-adapter capability gating — consults
 *      `adapter.capabilities.supportedOps` and either substitutes an
 *      equivalent op, emits a warning, or throws `UnsupportedFeatureError`
 *      when no viable path exists.
 *   4. Cross-CAD retargeting — the same `CADIntent` can be planned against
 *      any registered CAD and should yield adapter-respecting op streams.
 *
 * This engine is pure-algorithm: it reads from CADAdapterRegistry for
 * capability probes but does not execute anything. Output plugs directly
 * into `prism_cad_automation.build_script` (U-CUIX-P0-19).
 *
 * Non-goals (future units):
 *   - Complex multi-body/multi-config parts (U-CUIX-P0-21 ComplexPartPlanner)
 *   - Assemblies with mates/joints (U-CUIX-P0-22 AssemblyPlanner)
 *   - NN-backed intent refinement (CAD-COMPLETE-MS0 PHASE-30/31 NN heads)
 *
 * @module engines/CADOperationPlannerEngine
 */

import type {
  CADOperation,
  CADOperationKind,
  CADSystemId,
  CADCapabilityMatrix,
} from "../interfaces/ICADCodeGenerator.js";
import { getCADAdapter } from "./CADAdapterRegistry.js";

// ── Intent schema ──────────────────────────────────────────────────────────

/**
 * Supported high-level feature kinds. Each one maps to a fixed expansion
 * strategy that emits the right CAD_OPERATION_KINDS.
 */
export const PLANNER_FEATURE_KINDS = [
  "rectangle_extrude",
  "circle_extrude",
  "rectangle_pocket",
  "circle_pocket",
  "hole",
  "fillet_edges",
  "chamfer_edges",
  "revolve_rectangle",
  "shell",
  "linear_pattern",
  "circular_pattern",
  "boolean_union",
  "boolean_subtract",
  "export_step",
] as const;
export type PlannerFeatureKind = (typeof PLANNER_FEATURE_KINDS)[number];

/**
 * One entry in the feature tree. Earlier features can be referenced by
 * `dependsOn: [id]` so later features (e.g. fillet an edge of an earlier
 * extrude) emit their ops in the correct order.
 */
export interface CADFeatureIntent {
  /** Stable id used by later features' `dependsOn`. */
  id: string;
  kind: PlannerFeatureKind;
  /** Feature-specific parameters. Shape documented per kind below. */
  params: Record<string, unknown>;
  /** IDs of features this depends on. Planner toposorts these. */
  dependsOn?: ReadonlyArray<string>;
  /** Human-readable description carried through to CADOperation.description. */
  description?: string;
}

/** The complete intent payload accepted by `plan()`. */
export interface CADIntent {
  /** Display name used for the resulting part/script filename. */
  name: string;
  /** Which CAD adapter to target. */
  cadSystem: CADSystemId;
  /** Input unit convention (planner passes through to operations). */
  units?: "mm" | "cm" | "in";
  /** Ordered or unordered feature list (planner will toposort). */
  features: ReadonlyArray<CADFeatureIntent>;
  /** Declared parameters (become parameter_declare ops if adapter supports). */
  parameters?: Record<
    string,
    { value: number | string | boolean; unit?: string; description?: string }
  >;
}

/** Every adapter has a degree-of-support for a plan. */
export type AdapterCompatibility = "full" | "partial" | "unsupported";

/** The planner's output. */
export interface PlannerResult {
  /** The ordered operation stream to feed into adapter.buildScript. */
  ops: ReadonlyArray<CADOperation>;
  /** Non-fatal issues discovered during planning. */
  warnings: ReadonlyArray<{ featureId?: string; message: string }>;
  /** Per-CAD compatibility rollup: how well the same intent runs elsewhere. */
  compatibility: Readonly<Partial<Record<CADSystemId, AdapterCompatibility>>>;
  /** Target CAD this plan was emitted for. */
  cadSystem: CADSystemId;
  /** Number of features expanded. */
  featureCount: number;
  /** Number of ops emitted. */
  opCount: number;
}

// ── Errors ────────────────────────────────────────────────────────────────

export class UnsupportedFeatureError extends Error {
  readonly code = "UNSUPPORTED_FEATURE";
  readonly featureId: string;
  readonly requiredOps: ReadonlyArray<CADOperationKind>;
  readonly adapterOps: ReadonlyArray<CADOperationKind>;
  constructor(featureId: string, required: ReadonlyArray<CADOperationKind>, adapter: ReadonlyArray<CADOperationKind>) {
    super(
      `Feature '${featureId}' requires ops [${required.join(", ")}] but adapter only supports [${adapter.slice(0, 10).join(", ")}...]`,
    );
    this.name = "UnsupportedFeatureError";
    this.featureId = featureId;
    this.requiredOps = required;
    this.adapterOps = adapter;
  }
}

export class PlannerCycleError extends Error {
  readonly code = "PLANNER_CYCLE";
  readonly cycle: ReadonlyArray<string>;
  constructor(cycle: ReadonlyArray<string>) {
    super(`Dependency cycle detected: ${cycle.join(" → ")} → ${cycle[0]}`);
    this.name = "PlannerCycleError";
    this.cycle = cycle;
  }
}

export class PlannerIntentError extends Error {
  readonly code = "PLANNER_INTENT_INVALID";
  constructor(message: string) {
    super(message);
    this.name = "PlannerIntentError";
  }
}

// ── Feature → operation-kind requirements ─────────────────────────────────

const FEATURE_REQUIRED_OPS: Record<PlannerFeatureKind, ReadonlyArray<CADOperationKind>> = {
  rectangle_extrude: ["sketch_create", "sketch_rectangle", "feature_extrude"],
  circle_extrude: ["sketch_create", "sketch_circle", "feature_extrude"],
  rectangle_pocket: ["sketch_create", "sketch_rectangle", "feature_pocket"],
  circle_pocket: ["sketch_create", "sketch_circle", "feature_pocket"],
  hole: ["feature_hole"],
  fillet_edges: ["feature_fillet"],
  chamfer_edges: ["feature_chamfer"],
  revolve_rectangle: ["sketch_create", "sketch_rectangle", "feature_revolve"],
  shell: ["feature_shell"],
  linear_pattern: ["pattern_linear"],
  circular_pattern: ["pattern_circular"],
  boolean_union: ["boolean_union"],
  boolean_subtract: ["boolean_subtract"],
  export_step: ["export_step"],
};

// ── Engine ────────────────────────────────────────────────────────────────

export class CADOperationPlannerEngine {
  /**
   * Plan a CADIntent into an ordered CADOperation stream targeting
   * `intent.cadSystem`. Also returns cross-CAD compatibility rollup.
   */
  async plan(intent: CADIntent): Promise<PlannerResult> {
    this.validateIntent(intent);

    const adapter = await getCADAdapter(intent.cadSystem);
    const caps = adapter.capabilities;

    // Toposort features by `dependsOn`.
    const ordered = this.toposortFeatures(intent.features);

    const ops: CADOperation[] = [];
    const warnings: Array<{ featureId?: string; message: string }> = [];
    let sketchCounter = 0;

    // Emit parameter_declare ops up front when supported.
    if (intent.parameters && caps.supportedOps.has("parameter_declare")) {
      for (const [name, p] of Object.entries(intent.parameters)) {
        ops.push({
          kind: "parameter_declare",
          args: {
            name,
            value: p.value as number | string | boolean,
            unit: p.unit ?? "",
            description: p.description ?? "",
          },
          operationId: `param-${name}`,
          description: `Declare parameter ${name}`,
        });
      }
    } else if (intent.parameters && Object.keys(intent.parameters).length > 0) {
      warnings.push({
        message: `cadSystem=${intent.cadSystem} does not support parameter_declare; ${Object.keys(intent.parameters).length} parameter(s) inlined as literal values.`,
      });
    }

    // Expand each feature in topological order.
    for (const feature of ordered) {
      const required = FEATURE_REQUIRED_OPS[feature.kind];
      const missing = required.filter((k) => !caps.supportedOps.has(k));
      if (missing.length > 0) {
        throw new UnsupportedFeatureError(
          feature.id,
          required,
          Array.from(caps.supportedOps),
        );
      }
      const expansion = this.expandFeature(feature, caps, ++sketchCounter);
      if (expansion.warnings.length) warnings.push(...expansion.warnings);
      ops.push(...expansion.ops);
    }

    // Compute cross-CAD compatibility without invoking other adapters' buildScript.
    const compatibility = await this.computeCompatibility(intent);

    return {
      ops,
      warnings,
      compatibility,
      cadSystem: intent.cadSystem,
      featureCount: intent.features.length,
      opCount: ops.length,
    };
  }

  // ── Feature expansion dispatcher ────────────────────────────────────────

  private expandFeature(
    f: CADFeatureIntent,
    caps: CADCapabilityMatrix,
    sketchCounter: number,
  ): { ops: CADOperation[]; warnings: Array<{ featureId?: string; message: string }> } {
    const ops: CADOperation[] = [];
    const warnings: Array<{ featureId?: string; message: string }> = [];
    const sketchName = `sketch_${sketchCounter}`;

    switch (f.kind) {
      case "rectangle_extrude": {
        const { x = 0, y = 0, width, height, depth, plane = "XY" } = f.params as {
          x?: number; y?: number; width: number; height: number; depth: number; plane?: string;
        };
        this.requireNumbers(f.id, { width, height, depth });
        ops.push({
          kind: "sketch_create",
          args: { sketch: sketchName, plane, name: sketchName },
          operationId: `${f.id}-sketch`,
          description: `Create ${plane} sketch for ${f.id}`,
        });
        ops.push({
          kind: "sketch_rectangle",
          args: { sketch: sketchName, x, y, width, height },
          operationId: `${f.id}-rect`,
          description: `Rectangle ${width}×${height} @ (${x},${y})`,
        });
        if (caps.supportedOps.has("sketch_close")) {
          ops.push({
            kind: "sketch_close",
            args: { sketch: sketchName },
            operationId: `${f.id}-close`,
          });
        }
        ops.push({
          kind: "feature_extrude",
          args: { sketch: sketchName, depth, length: depth, distance: depth, direction: "positive", operation: "new_body" },
          operationId: `${f.id}-extrude`,
          description: f.description ?? `Extrude ${depth}`,
        });
        break;
      }

      case "circle_extrude": {
        const { cx = 0, cy = 0, diameter, depth, plane = "XY" } = f.params as {
          cx?: number; cy?: number; diameter: number; depth: number; plane?: string;
        };
        this.requireNumbers(f.id, { diameter, depth });
        ops.push({
          kind: "sketch_create",
          args: { sketch: sketchName, plane, name: sketchName },
          operationId: `${f.id}-sketch`,
        });
        ops.push({
          kind: "sketch_circle",
          args: { sketch: sketchName, cx, cy, diameter },
          operationId: `${f.id}-circle`,
          description: `Circle Ø${diameter} @ (${cx},${cy})`,
        });
        if (caps.supportedOps.has("sketch_close")) {
          ops.push({
            kind: "sketch_close",
            args: { sketch: sketchName },
            operationId: `${f.id}-close`,
          });
        }
        ops.push({
          kind: "feature_extrude",
          args: { sketch: sketchName, depth, length: depth, distance: depth, direction: "positive", operation: "new_body" },
          operationId: `${f.id}-extrude`,
          description: f.description ?? `Extrude Ø${diameter} × ${depth}`,
        });
        break;
      }

      case "rectangle_pocket":
      case "circle_pocket": {
        const kind = f.kind === "rectangle_pocket" ? "sketch_rectangle" : "sketch_circle";
        const p = f.params as Record<string, number> & { depth: number };
        this.requireNumbers(f.id, { depth: p.depth });
        ops.push({
          kind: "sketch_create",
          args: { sketch: sketchName, plane: (p.plane as unknown as string) ?? "XY", name: sketchName },
          operationId: `${f.id}-sketch`,
        });
        ops.push({
          kind,
          args: { sketch: sketchName, ...p, depth: undefined } as any,
          operationId: `${f.id}-profile`,
          description: `Pocket profile`,
        });
        if (caps.supportedOps.has("sketch_close")) {
          ops.push({ kind: "sketch_close", args: { sketch: sketchName }, operationId: `${f.id}-close` });
        }
        ops.push({
          kind: "feature_pocket",
          args: { sketch: sketchName, depth: p.depth, operation: "cut" },
          operationId: `${f.id}-pocket`,
          description: f.description ?? `Pocket depth=${p.depth}`,
        });
        break;
      }

      case "hole": {
        const { x = 0, y = 0, diameter, depth, type = "simple", plane = "XY" } = f.params as {
          x?: number; y?: number; diameter: number; depth: number;
          type?: "simple" | "counterbore" | "countersink" | "tapped"; plane?: string;
        };
        this.requireNumbers(f.id, { diameter, depth });
        ops.push({
          kind: "feature_hole",
          args: { x, y, diameter, depth, holeType: type, plane },
          operationId: `${f.id}-hole`,
          description: f.description ?? `Hole Ø${diameter} × ${depth} (${type})`,
        });
        break;
      }

      case "fillet_edges": {
        const { radius, edges } = f.params as { radius: number; edges?: ReadonlyArray<string> };
        this.requireNumbers(f.id, { radius });
        ops.push({
          kind: "feature_fillet",
          args: {
            radius,
            edges: (edges ?? []) as ReadonlyArray<string>,
            // If no edge selection given, downstream adapters typically filter all edges.
            autoSelectAllEdges: !edges || edges.length === 0,
          },
          operationId: `${f.id}-fillet`,
          description: f.description ?? `Fillet r=${radius} on ${(edges?.length ?? "all")} edge(s)`,
        });
        break;
      }

      case "chamfer_edges": {
        const { distance, edges } = f.params as { distance: number; edges?: ReadonlyArray<string> };
        this.requireNumbers(f.id, { distance });
        ops.push({
          kind: "feature_chamfer",
          args: {
            distance,
            edges: (edges ?? []) as ReadonlyArray<string>,
            autoSelectAllEdges: !edges || edges.length === 0,
          },
          operationId: `${f.id}-chamfer`,
          description: f.description ?? `Chamfer ${distance} on ${(edges?.length ?? "all")} edge(s)`,
        });
        break;
      }

      case "revolve_rectangle": {
        const { x = 0, y = 0, width, height, angleDeg = 360, axis = "Y", plane = "XY" } =
          f.params as { x?: number; y?: number; width: number; height: number; angleDeg?: number; axis?: string; plane?: string };
        this.requireNumbers(f.id, { width, height });
        ops.push({
          kind: "sketch_create",
          args: { sketch: sketchName, plane, name: sketchName },
          operationId: `${f.id}-sketch`,
        });
        ops.push({
          kind: "sketch_rectangle",
          args: { sketch: sketchName, x, y, width, height },
          operationId: `${f.id}-rect`,
        });
        if (caps.supportedOps.has("sketch_close")) {
          ops.push({ kind: "sketch_close", args: { sketch: sketchName }, operationId: `${f.id}-close` });
        }
        ops.push({
          kind: "feature_revolve",
          args: { sketch: sketchName, angleDeg, axis, operation: "new_body" },
          operationId: `${f.id}-revolve`,
          description: f.description ?? `Revolve ${angleDeg}° about ${axis}`,
        });
        break;
      }

      case "shell": {
        const { thickness, removedFaces } = f.params as {
          thickness: number; removedFaces?: ReadonlyArray<string>;
        };
        this.requireNumbers(f.id, { thickness });
        ops.push({
          kind: "feature_shell",
          args: { thickness, removedFaces: (removedFaces ?? []) as ReadonlyArray<string> },
          operationId: `${f.id}-shell`,
          description: f.description ?? `Shell thickness=${thickness}`,
        });
        break;
      }

      case "linear_pattern": {
        const { direction = "X", count, spacing } = f.params as {
          direction?: string; count: number; spacing: number;
        };
        this.requireNumbers(f.id, { count, spacing });
        if (count < 2) throw new PlannerIntentError(`linear_pattern '${f.id}' count must be ≥2 (got ${count})`);
        ops.push({
          kind: "pattern_linear",
          args: { direction, count, spacing },
          operationId: `${f.id}-pattern-linear`,
          description: f.description ?? `Linear pattern ${count}× @ ${spacing}`,
        });
        break;
      }

      case "circular_pattern": {
        const { axis = "Z", count, totalAngleDeg = 360 } = f.params as {
          axis?: string; count: number; totalAngleDeg?: number;
        };
        this.requireNumbers(f.id, { count });
        if (count < 2) throw new PlannerIntentError(`circular_pattern '${f.id}' count must be ≥2`);
        ops.push({
          kind: "pattern_circular",
          args: { axis, count, totalAngleDeg },
          operationId: `${f.id}-pattern-circular`,
          description: f.description ?? `Circular pattern ${count}× over ${totalAngleDeg}°`,
        });
        break;
      }

      case "boolean_union":
      case "boolean_subtract": {
        const { targets } = f.params as { targets?: ReadonlyArray<string> };
        const targetList = (targets ?? []) as ReadonlyArray<string>;
        ops.push({
          kind: f.kind,
          args: { targets: targetList },
          operationId: `${f.id}-${f.kind}`,
          description: f.description ?? `${f.kind} on ${targetList.length} target(s)`,
        });
        break;
      }

      case "export_step": {
        const { path = `${f.id}.step` } = f.params as { path?: string };
        ops.push({
          kind: "export_step",
          args: { path },
          operationId: `${f.id}-export-step`,
          description: `Export STEP → ${path}`,
        });
        break;
      }
    }
    return { ops, warnings };
  }

  // ── Compatibility probe ─────────────────────────────────────────────────

  /**
   * For every registered CAD, report whether the intent's required op
   * coverage is full / partial / unsupported. Cheap — doesn't invoke
   * buildScript, just checks capability matrices.
   */
  private async computeCompatibility(
    intent: CADIntent,
  ): Promise<Partial<Record<CADSystemId, AdapterCompatibility>>> {
    // Collect all required op kinds across features.
    const required = new Set<CADOperationKind>();
    for (const f of intent.features) {
      for (const k of FEATURE_REQUIRED_OPS[f.kind]) required.add(k);
    }
    // We probe the CADAdapterRegistry's known systems, not the full 14.
    const { CAD_REGISTERED_SYSTEMS } = await import("./CADAdapterRegistry.js");
    const out: Partial<Record<CADSystemId, AdapterCompatibility>> = {};
    for (const sys of CAD_REGISTERED_SYSTEMS) {
      try {
        const a = await getCADAdapter(sys);
        const missing = Array.from(required).filter((k) => !a.capabilities.supportedOps.has(k));
        if (missing.length === 0) out[sys] = "full";
        else if (missing.length < required.size) out[sys] = "partial";
        else out[sys] = "unsupported";
      } catch {
        out[sys] = "unsupported";
      }
    }
    return out;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private validateIntent(intent: CADIntent): void {
    if (!intent || typeof intent !== "object") {
      throw new PlannerIntentError("intent must be an object");
    }
    if (!intent.name || typeof intent.name !== "string") {
      throw new PlannerIntentError("intent.name is required");
    }
    if (!intent.cadSystem || typeof intent.cadSystem !== "string") {
      throw new PlannerIntentError("intent.cadSystem is required");
    }
    if (!Array.isArray(intent.features) || intent.features.length === 0) {
      throw new PlannerIntentError("intent.features must be a non-empty array");
    }
    const ids = new Set<string>();
    for (const f of intent.features) {
      if (!f.id || typeof f.id !== "string") {
        throw new PlannerIntentError("every feature must have a string id");
      }
      if (ids.has(f.id)) {
        throw new PlannerIntentError(`duplicate feature id '${f.id}'`);
      }
      ids.add(f.id);
      if (!PLANNER_FEATURE_KINDS.includes(f.kind)) {
        throw new PlannerIntentError(`unknown feature kind '${f.kind}' on '${f.id}'`);
      }
      if (!f.params || typeof f.params !== "object") {
        throw new PlannerIntentError(`feature '${f.id}' missing params object`);
      }
    }
    // Validate dependsOn references.
    for (const f of intent.features) {
      for (const dep of f.dependsOn ?? []) {
        if (!ids.has(dep)) {
          throw new PlannerIntentError(`feature '${f.id}' dependsOn unknown id '${dep}'`);
        }
        if (dep === f.id) {
          throw new PlannerIntentError(`feature '${f.id}' depends on itself`);
        }
      }
    }
  }

  private requireNumbers(featureId: string, nums: Record<string, unknown>): void {
    for (const [k, v] of Object.entries(nums)) {
      if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new PlannerIntentError(`feature '${featureId}' param '${k}' must be a finite number (got ${String(v)})`);
      }
    }
  }

  /**
   * Kahn's algorithm topological sort. Preserves input order for
   * features with no dependencies (stable sort).
   */
  private toposortFeatures(features: ReadonlyArray<CADFeatureIntent>): CADFeatureIntent[] {
    const idToFeature = new Map<string, CADFeatureIntent>();
    const inDegree = new Map<string, number>();
    const successors = new Map<string, string[]>();
    for (const f of features) {
      idToFeature.set(f.id, f);
      inDegree.set(f.id, 0);
      successors.set(f.id, []);
    }
    for (const f of features) {
      for (const dep of f.dependsOn ?? []) {
        inDegree.set(f.id, (inDegree.get(f.id) ?? 0) + 1);
        successors.get(dep)!.push(f.id);
      }
    }
    // Seed queue with zero-indegree in input order (stability).
    const queue: string[] = [];
    for (const f of features) {
      if ((inDegree.get(f.id) ?? 0) === 0) queue.push(f.id);
    }
    const sorted: CADFeatureIntent[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      sorted.push(idToFeature.get(id)!);
      for (const succ of successors.get(id) ?? []) {
        inDegree.set(succ, (inDegree.get(succ) ?? 0) - 1);
        if ((inDegree.get(succ) ?? 0) === 0) queue.push(succ);
      }
    }
    if (sorted.length !== features.length) {
      // Cycle — find one.
      const remaining = features.filter((f) => !sorted.some((s) => s.id === f.id));
      const cycle: string[] = [];
      const visited = new Set<string>();
      let cur: string | undefined = remaining[0]?.id;
      while (cur && !visited.has(cur)) {
        visited.add(cur);
        cycle.push(cur);
        const f = idToFeature.get(cur);
        cur = (f?.dependsOn ?? []).find((d) => idToFeature.get(d) && !sorted.some((s) => s.id === d));
      }
      throw new PlannerCycleError(cycle);
    }
    return sorted;
  }
}

/** Singleton used by dispatcher + direct callers. */
export const cadOperationPlannerEngine = new CADOperationPlannerEngine();

/**
 * AssemblyPlannerEngine — U-CUIX-P0-22 / CAD-UIX-MS0
 *
 * Plans a full assembly: multiple components (complex parts or imports) +
 * mates/joints + BOM + drawing-view set. Composes ComplexPartPlannerEngine
 * (P0-21) outputs rather than re-implementing part-level planning.
 *
 * Responsibilities:
 *   1. Component placement — emit assembly_insert with position + rotation
 *      per component; handle both generated (complex_part) and imported
 *      (STEP/IGES/STL) sources.
 *   2. Mate/joint emission — 5 mate kinds map to the 5
 *      assembly_mate_* CAD_OPERATION_KINDS (concentric / coincident /
 *      distance / angle / parallel).
 *   3. BOM rollup — aggregate components by id + quantity; emit as
 *      parameter_declare entries or as metadata depending on adapter
 *      support.
 *   4. Drawing-view set — base / section / detail / isometric / exploded
 *      views via drawing_view_* ops.
 *   5. Dependency toposort — component placement may depend on other
 *      components' positions being resolved first.
 *   6. Cross-CAD compatibility probe.
 *
 * Feeds the P7 full-assembly capability gates (U-CUIX-P7-19..24):
 * Mastercam MachineGroup, HyperCAD-S Job Tree, Fusion 15-joint assembly,
 * Inventor Frame+Tube+Cable, SolidWorks all-mate LDR, FreeCAD 1.0+
 * native assembly.
 *
 * @module engines/AssemblyPlannerEngine
 */

import type {
  CADOperation,
  CADOperationKind,
  CADSystemId,
} from "../interfaces/ICADCodeGenerator.js";
import {
  complexPartPlannerEngine,
  ComplexPartPlannerEngine,
  type ComplexPartIntent,
} from "./ComplexPartPlannerEngine.js";
import type { AdapterCompatibility } from "./CADOperationPlannerEngine.js";
import { getCADAdapter } from "./CADAdapterRegistry.js";

// ── Intent schema ────────────────────────────────────────────────────────

/** One component in an assembly — generated or imported. */
export interface AssemblyComponent {
  /** Stable id for mate references + BOM rollup. */
  id: string;
  displayName?: string;
  /** Source: either a nested complex-part intent, or an imported file. */
  source:
    | { kind: "complex_part"; intent: ComplexPartIntent }
    | { kind: "import"; path: string; format: "step" | "iges" | "stl" };
  /** Assembly-coordinate placement. Defaults to origin, no rotation. */
  placement?: {
    position?: [number, number, number];
    rotationDeg?: [number, number, number];
  };
  /** Instance count for BOM. Defaults to 1. */
  quantity?: number;
  /** Other component ids this depends on (for ordering). */
  dependsOn?: ReadonlyArray<string>;
}

/** Mate kind — one-to-one with CAD_OPERATION_KINDS assembly_mate_*. */
export const ASSEMBLY_MATE_KINDS = [
  "concentric",
  "coincident",
  "distance",
  "angle",
  "parallel",
] as const;
export type AssemblyMateKind = (typeof ASSEMBLY_MATE_KINDS)[number];

/** Free-form reference selector. Adapter interprets (e.g. "face:bottom"). */
export type MateReferenceSelector = string;

/** A mate/joint between two components' reference geometry. */
export interface AssemblyMate {
  id: string;
  kind: AssemblyMateKind;
  componentA: string;
  referenceA: MateReferenceSelector;
  componentB: string;
  referenceB: MateReferenceSelector;
  /** Numeric value for 'distance' (mm) and 'angle' (degrees) mates. */
  value?: number;
  description?: string;
}

/** BOM rollup options. */
export interface AssemblyBOMOptions {
  mode?: "structured" | "parts_only" | "indented";
  includeDescriptions?: boolean;
  /** Extra column names to include (adapter-specific). */
  customColumns?: ReadonlyArray<string>;
}

/** A drawing view. */
export interface AssemblyDrawingView {
  /** Kind of view — maps to drawing_view_base/section/detail (+ isometric/exploded flags). */
  kind: "base" | "section" | "detail" | "isometric" | "exploded";
  name: string;
  scale?: number;
  /** Parent view name (required for section/detail views). */
  parentView?: string;
  /** Free-form annotation list (dim/note; passed through to drawing_dimension/note). */
  annotations?: ReadonlyArray<{
    kind: "dimension" | "note";
    target: string;
    value?: string;
  }>;
}

export interface AssemblyIntent {
  name: string;
  cadSystem: CADSystemId;
  description?: string;
  units?: "mm" | "cm" | "in";
  components: ReadonlyArray<AssemblyComponent>;
  mates?: ReadonlyArray<AssemblyMate>;
  bom?: AssemblyBOMOptions;
  drawings?: ReadonlyArray<AssemblyDrawingView>;
}

// ── Result ───────────────────────────────────────────────────────────────

export interface AssemblyBOMRow {
  componentId: string;
  displayName: string;
  quantity: number;
  source: "generated" | "imported";
  importPath?: string;
}

export interface AssemblyPlanResult {
  cadSystem: CADSystemId;
  assemblyName: string;
  componentCount: number;
  mateCount: number;
  drawingViewCount: number;
  /** Ordered operation stream for adapter.buildScript(). */
  ops: ReadonlyArray<CADOperation>;
  opCount: number;
  /** BOM rollup (aggregates by componentId × quantity). */
  bom: ReadonlyArray<AssemblyBOMRow>;
  warnings: ReadonlyArray<{ message: string; source?: string }>;
  compatibility: Readonly<Partial<Record<CADSystemId, AdapterCompatibility>>>;
}

// ── Errors ───────────────────────────────────────────────────────────────

export class AssemblyIntentError extends Error {
  readonly code = "ASSEMBLY_INTENT_INVALID";
  constructor(message: string) {
    super(message);
    this.name = "AssemblyIntentError";
  }
}

export class AssemblyComponentCycleError extends Error {
  readonly code = "ASSEMBLY_COMPONENT_CYCLE";
  readonly cycle: ReadonlyArray<string>;
  constructor(cycle: ReadonlyArray<string>) {
    super(`Component dependency cycle: ${cycle.join(" → ")} → ${cycle[0]}`);
    this.name = "AssemblyComponentCycleError";
    this.cycle = cycle;
  }
}

// ── Mate kind → op kind mapping ──────────────────────────────────────────

const MATE_KIND_TO_OP: Record<AssemblyMateKind, CADOperationKind> = {
  concentric: "assembly_mate_concentric",
  coincident: "assembly_mate_coincident",
  distance: "assembly_mate_distance",
  angle: "assembly_mate_angle",
  parallel: "assembly_mate_parallel",
};

const VIEW_KIND_TO_OP: Record<
  AssemblyDrawingView["kind"],
  CADOperationKind
> = {
  base: "drawing_view_base",
  section: "drawing_view_section",
  detail: "drawing_view_detail",
  isometric: "drawing_view_base", // isometric is a specialization of base
  exploded: "drawing_view_base", // exploded is a specialization of base
};

// ── Engine ───────────────────────────────────────────────────────────────

export class AssemblyPlannerEngine {
  constructor(
    private readonly complexPartPlanner: ComplexPartPlannerEngine = complexPartPlannerEngine,
  ) {}

  async plan(intent: AssemblyIntent): Promise<AssemblyPlanResult> {
    this.validateIntent(intent);

    const adapter = await getCADAdapter(intent.cadSystem);
    const caps = adapter.capabilities;

    // Gate required ops
    this.checkMateSupport(intent, caps.supportedOps);
    this.checkImportSupport(intent, caps.supportedOps);
    // Drawing support is soft-gated — unsupported views are warned + skipped,
    // not thrown. Drawings are optional output vs mates which are structural.
    const unsupportedDrawingKinds = this.findUnsupportedDrawingKinds(intent, caps.supportedOps);

    // Toposort components
    const orderedComponents = this.toposortComponents(intent.components);

    const ops: CADOperation[] = [];
    const warnings: Array<{ message: string; source?: string }> = [];
    const bom: AssemblyBOMRow[] = [];

    // 1. For each component, emit sub-part ops + assembly_insert.
    for (const comp of orderedComponents) {
      await this.emitComponent(intent, comp, ops, warnings, bom);
    }

    // 2. Emit mates (after all components are placed).
    if (intent.mates) {
      for (const mate of intent.mates) {
        ops.push({
          kind: MATE_KIND_TO_OP[mate.kind],
          args: {
            componentA: mate.componentA,
            referenceA: mate.referenceA,
            componentB: mate.componentB,
            referenceB: mate.referenceB,
            ...(mate.value !== undefined ? { value: mate.value } : {}),
          },
          operationId: `mate-${mate.id}`,
          description:
            mate.description ??
            `${mate.kind} ${mate.componentA}.${mate.referenceA} ↔ ${mate.componentB}.${mate.referenceB}`,
        });
      }
    }

    // 3. BOM: emit as parameter_declare when supported, otherwise warn.
    if (intent.bom) {
      if (caps.supportedOps.has("parameter_declare")) {
        ops.push({
          kind: "parameter_declare",
          args: {
            name: `${intent.name}_bom_mode`,
            value: intent.bom.mode ?? "structured",
            unit: "",
            description: "BOM rollup mode",
          },
          operationId: "bom-mode",
        });
        for (const row of bom) {
          ops.push({
            kind: "parameter_declare",
            args: {
              name: `bom_${row.componentId}_qty`,
              value: row.quantity,
              unit: "",
              description: intent.bom.includeDescriptions ? row.displayName : "",
            },
            operationId: `bom-${row.componentId}`,
          });
        }
      } else {
        warnings.push({
          message: `adapter '${intent.cadSystem}' does not support parameter_declare; BOM provided as metadata only (${bom.length} rows).`,
        });
      }
    }

    // 4. Drawing-view set (soft-gated — unsupported kinds warned + skipped).
    if (intent.drawings) {
      for (const view of intent.drawings) {
        const viewKind = VIEW_KIND_TO_OP[view.kind];
        if (!caps.supportedOps.has(viewKind)) {
          warnings.push({
            message: `adapter '${intent.cadSystem}' does not support ${viewKind}; skipping view '${view.name}'`,
            source: view.name,
          });
          continue;
        }
        ops.push({
          kind: viewKind,
          args: {
            name: view.name,
            scale: view.scale ?? 1,
            ...(view.parentView ? { parentView: view.parentView } : {}),
            ...(view.kind === "isometric" ? { projection: "isometric" } : {}),
            ...(view.kind === "exploded" ? { exploded: true } : {}),
          },
          operationId: `view-${view.name}`,
          description: `${view.kind} view '${view.name}' @ scale ${view.scale ?? 1}`,
        });
        // Emit annotations as drawing_dimension / drawing_note
        for (const ann of view.annotations ?? []) {
          const annKind: CADOperationKind =
            ann.kind === "dimension" ? "drawing_dimension" : "drawing_note";
          if (caps.supportedOps.has(annKind)) {
            ops.push({
              kind: annKind,
              args: {
                view: view.name,
                target: ann.target,
                ...(ann.value !== undefined ? { value: ann.value } : {}),
              },
              operationId: `view-${view.name}-ann-${ann.target}`,
            });
          } else {
            warnings.push({
              message: `adapter '${intent.cadSystem}' skips unsupported ${annKind} (view=${view.name}, target=${ann.target})`,
              source: view.name,
            });
          }
        }
      }
    }

    const compatibility = await this.computeCompatibility(intent);

    return {
      cadSystem: intent.cadSystem,
      assemblyName: intent.name,
      componentCount: intent.components.length,
      mateCount: intent.mates?.length ?? 0,
      drawingViewCount: intent.drawings?.length ?? 0,
      ops,
      opCount: ops.length,
      bom,
      warnings,
      compatibility,
    };
  }

  // ── Component emission ─────────────────────────────────────────────────

  private async emitComponent(
    intent: AssemblyIntent,
    comp: AssemblyComponent,
    ops: CADOperation[],
    warnings: Array<{ message: string; source?: string }>,
    bom: AssemblyBOMRow[],
  ): Promise<void> {
    const qty = comp.quantity ?? 1;
    const displayName = comp.displayName ?? comp.id;

    if (comp.source.kind === "complex_part") {
      // Delegate part-level planning to ComplexPartPlanner.
      const partPlan = await this.complexPartPlanner.plan(comp.source.intent);
      // Re-prefix every op's operationId to namespace-separate assembly scopes.
      for (const op of partPlan.defaultOps) {
        ops.push({
          ...op,
          operationId: `${comp.id}:${op.operationId ?? ""}`,
        });
      }
      for (const w of partPlan.warnings) {
        warnings.push({
          message: `${comp.id}: ${w.message}`,
          source: comp.id,
        });
      }
      bom.push({
        componentId: comp.id,
        displayName,
        quantity: qty,
        source: "generated",
      });
    } else {
      // Imported component — emit import_* + assembly_insert.
      const importKind = this.importFormatToKind(comp.source.format);
      ops.push({
        kind: importKind,
        args: { path: comp.source.path, componentId: comp.id },
        operationId: `${comp.id}-import`,
        description: `Import ${comp.source.format.toUpperCase()}: ${comp.source.path}`,
      });
      bom.push({
        componentId: comp.id,
        displayName,
        quantity: qty,
        source: "imported",
        importPath: comp.source.path,
      });
    }

    // Placement — emit assembly_insert with position/rotation for BOTH generated
    // and imported components (generated components often still need placement
    // relative to the assembly origin).
    const placement = comp.placement ?? {};
    const position = placement.position ?? [0, 0, 0];
    const rotationDeg = placement.rotationDeg ?? [0, 0, 0];
    ops.push({
      kind: "assembly_insert",
      args: {
        componentId: comp.id,
        displayName,
        quantity: qty,
        positionX: position[0],
        positionY: position[1],
        positionZ: position[2],
        rotationDegX: rotationDeg[0],
        rotationDegY: rotationDeg[1],
        rotationDegZ: rotationDeg[2],
      },
      operationId: `${comp.id}-insert`,
      description: `Insert ${displayName} × ${qty} @ (${position.join(", ")}) rot (${rotationDeg.join(", ")})°`,
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private importFormatToKind(f: "step" | "iges" | "stl"): CADOperationKind {
    switch (f) {
      case "step": return "import_step";
      case "iges": return "import_iges";
      case "stl": return "import_stl";
    }
  }

  private checkMateSupport(
    intent: AssemblyIntent,
    supported: ReadonlySet<CADOperationKind>,
  ): void {
    const kinds = new Set<CADOperationKind>();
    for (const m of intent.mates ?? []) kinds.add(MATE_KIND_TO_OP[m.kind]);
    const missing = Array.from(kinds).filter((k) => !supported.has(k));
    if (missing.length > 0) {
      throw new AssemblyIntentError(
        `Target CAD '${intent.cadSystem}' does not support mate ops: ${missing.join(", ")}`,
      );
    }
    if (intent.mates && intent.mates.length > 0 && !supported.has("assembly_insert")) {
      throw new AssemblyIntentError(
        `Target CAD '${intent.cadSystem}' does not support assembly_insert; mates require it.`,
      );
    }
  }

  private checkImportSupport(
    intent: AssemblyIntent,
    supported: ReadonlySet<CADOperationKind>,
  ): void {
    const formatsUsed = new Set<CADOperationKind>();
    for (const c of intent.components) {
      if (c.source.kind === "import") {
        formatsUsed.add(this.importFormatToKind(c.source.format));
      }
    }
    const missing = Array.from(formatsUsed).filter((k) => !supported.has(k));
    if (missing.length > 0) {
      throw new AssemblyIntentError(
        `Target CAD '${intent.cadSystem}' does not support import ops: ${missing.join(", ")}`,
      );
    }
  }

  private findUnsupportedDrawingKinds(
    intent: AssemblyIntent,
    supported: ReadonlySet<CADOperationKind>,
  ): ReadonlyArray<CADOperationKind> {
    if (!intent.drawings || intent.drawings.length === 0) return [];
    const viewKindsUsed = new Set<CADOperationKind>();
    for (const v of intent.drawings) viewKindsUsed.add(VIEW_KIND_TO_OP[v.kind]);
    return Array.from(viewKindsUsed).filter((k) => !supported.has(k));
  }

  private validateIntent(intent: AssemblyIntent): void {
    if (!intent?.name || typeof intent.name !== "string") {
      throw new AssemblyIntentError("intent.name required");
    }
    if (!intent.cadSystem) {
      throw new AssemblyIntentError("intent.cadSystem required");
    }
    if (!Array.isArray(intent.components) || intent.components.length === 0) {
      throw new AssemblyIntentError("intent.components must be non-empty");
    }
    const compIds = new Set<string>();
    for (const c of intent.components) {
      if (!c.id) throw new AssemblyIntentError("component missing id");
      if (compIds.has(c.id)) {
        throw new AssemblyIntentError(`duplicate component id '${c.id}'`);
      }
      compIds.add(c.id);
      if (!c.source) {
        throw new AssemblyIntentError(`component '${c.id}' missing source`);
      }
      if (c.source.kind === "complex_part") {
        if (!c.source.intent) {
          throw new AssemblyIntentError(`component '${c.id}' complex_part source missing intent`);
        }
      } else if (c.source.kind === "import") {
        if (!c.source.path) {
          throw new AssemblyIntentError(`component '${c.id}' import source missing path`);
        }
        if (!["step", "iges", "stl"].includes(c.source.format)) {
          throw new AssemblyIntentError(
            `component '${c.id}' import source unknown format '${c.source.format}'`,
          );
        }
      } else {
        throw new AssemblyIntentError(
          `component '${c.id}' unknown source kind '${(c.source as { kind: string }).kind}'`,
        );
      }
      if (c.quantity !== undefined && (!Number.isInteger(c.quantity) || c.quantity < 1)) {
        throw new AssemblyIntentError(
          `component '${c.id}' quantity must be positive integer (got ${c.quantity})`,
        );
      }
      for (const d of c.dependsOn ?? []) {
        if (d === c.id) {
          throw new AssemblyIntentError(`component '${c.id}' depends on itself`);
        }
      }
    }
    // Validate dependsOn references exist
    for (const c of intent.components) {
      for (const d of c.dependsOn ?? []) {
        if (!compIds.has(d)) {
          throw new AssemblyIntentError(
            `component '${c.id}' dependsOn unknown component '${d}'`,
          );
        }
      }
    }
    // Validate mates
    if (intent.mates) {
      const mateIds = new Set<string>();
      for (const m of intent.mates) {
        if (!m.id) throw new AssemblyIntentError("mate missing id");
        if (mateIds.has(m.id)) {
          throw new AssemblyIntentError(`duplicate mate id '${m.id}'`);
        }
        mateIds.add(m.id);
        if (!ASSEMBLY_MATE_KINDS.includes(m.kind)) {
          throw new AssemblyIntentError(`mate '${m.id}' unknown kind '${m.kind}'`);
        }
        if (!compIds.has(m.componentA)) {
          throw new AssemblyIntentError(
            `mate '${m.id}' componentA '${m.componentA}' not in assembly`,
          );
        }
        if (!compIds.has(m.componentB)) {
          throw new AssemblyIntentError(
            `mate '${m.id}' componentB '${m.componentB}' not in assembly`,
          );
        }
        if (m.componentA === m.componentB) {
          throw new AssemblyIntentError(
            `mate '${m.id}' connects a component to itself`,
          );
        }
        if ((m.kind === "distance" || m.kind === "angle") && m.value === undefined) {
          throw new AssemblyIntentError(
            `mate '${m.id}' kind=${m.kind} requires numeric 'value'`,
          );
        }
      }
    }
    // Validate drawings
    if (intent.drawings) {
      const viewNames = new Set<string>();
      for (const v of intent.drawings) {
        if (!v.name) throw new AssemblyIntentError("drawing view missing name");
        if (viewNames.has(v.name)) {
          throw new AssemblyIntentError(`duplicate view name '${v.name}'`);
        }
        viewNames.add(v.name);
        if ((v.kind === "section" || v.kind === "detail") && !v.parentView) {
          throw new AssemblyIntentError(
            `view '${v.name}' kind=${v.kind} requires parentView`,
          );
        }
      }
      // parentView cross-ref
      for (const v of intent.drawings) {
        if (v.parentView && !viewNames.has(v.parentView)) {
          throw new AssemblyIntentError(
            `view '${v.name}' parentView '${v.parentView}' not declared`,
          );
        }
      }
    }
  }

  private toposortComponents(
    components: ReadonlyArray<AssemblyComponent>,
  ): AssemblyComponent[] {
    const idx = new Map<string, AssemblyComponent>();
    const inDeg = new Map<string, number>();
    const succ = new Map<string, string[]>();
    for (const c of components) {
      idx.set(c.id, c);
      inDeg.set(c.id, 0);
      succ.set(c.id, []);
    }
    for (const c of components) {
      for (const d of c.dependsOn ?? []) {
        inDeg.set(c.id, (inDeg.get(c.id) ?? 0) + 1);
        succ.get(d)!.push(c.id);
      }
    }
    const queue: string[] = [];
    for (const c of components) {
      if ((inDeg.get(c.id) ?? 0) === 0) queue.push(c.id);
    }
    const sorted: AssemblyComponent[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      sorted.push(idx.get(id)!);
      for (const s of succ.get(id) ?? []) {
        inDeg.set(s, (inDeg.get(s) ?? 0) - 1);
        if (inDeg.get(s) === 0) queue.push(s);
      }
    }
    if (sorted.length !== components.length) {
      const remaining = components
        .filter((c) => !sorted.some((s) => s.id === c.id))
        .map((c) => c.id);
      throw new AssemblyComponentCycleError(remaining);
    }
    return sorted;
  }

  private async computeCompatibility(
    intent: AssemblyIntent,
  ): Promise<Partial<Record<CADSystemId, AdapterCompatibility>>> {
    const { CAD_REGISTERED_SYSTEMS } = await import("./CADAdapterRegistry.js");
    const required = new Set<CADOperationKind>(["assembly_insert"]);
    for (const m of intent.mates ?? []) required.add(MATE_KIND_TO_OP[m.kind]);
    for (const c of intent.components) {
      if (c.source.kind === "import") {
        required.add(this.importFormatToKind(c.source.format));
      }
    }
    for (const v of intent.drawings ?? []) required.add(VIEW_KIND_TO_OP[v.kind]);

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

export const assemblyPlannerEngine = new AssemblyPlannerEngine();

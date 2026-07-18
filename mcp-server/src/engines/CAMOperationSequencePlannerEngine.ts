/**
 * CAMOperationSequencePlannerEngine — CAM-AI-TRAINING-MS0/U-CAMT-OP-SEQUENCE
 *
 * Orders a list of (CamOperation, FeatureClass) tasks for a single
 * setup using standard shop-floor sequencing rules:
 *
 *   1. Probing first (touch off WCS before cutting anything).
 *   2. Face mill / face-of-blank ops next (reference surface).
 *   3. Roughing before semi-finishing before finishing (for same feature).
 *   4. Larger tools before smaller (minimize tool changes).
 *   5. Spot drill → drill → bore → tap → ream → chamfer (drilling chain).
 *   6. Pocket / contour / slot ops before chamfer / fillet.
 *   7. EDM / wire / laser come AFTER milling on the same setup.
 *
 * Pure logic — caller passes the unordered task-list; engine returns
 * the same items reordered + a violation log.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import { camOperationTaxonomyEngine, type CamOperation } from "./CAMOperationTaxonomyEngine.js";
import type { FeatureClass } from "./CAMFeatureClassClassifierEngine.js";

export interface CamTask {
  id: string;
  op: CamOperation;
  featureClass?: FeatureClass;
  /** Optional — tool diameter in mm, used for "large-tool first" tie-break. */
  toolDiameterMm?: number;
  /** Optional — explicit dependencies (id refs) that MUST precede this task. */
  dependsOn?: ReadonlyArray<string>;
}

export interface SequencePlan {
  ordered: ReadonlyArray<CamTask>;
  violations: ReadonlyArray<string>;
}

/**
 * Stage ordinal — lower runs earlier in the setup. Multiple ops share a stage;
 * tie-break inside a stage is by tool-diameter descending (large first).
 */
const STAGE: Record<string, number> = {
  probing:               0,
  face_first:            1,
  rough_milling:         2,
  drilling_spot:         3,   // spot drill before twist drill
  drilling_twist:        4,
  drilling_bore:         5,   // boring after drilling
  drilling_tap_ream:     6,   // tap / ream / form-tap after bore
  pre_finish:            7,
  finishing:             8,
  chamfer:               9,
  turning_rough:         10,
  turning_finish:        11,
  edm:                   12,
  laser:                 13,
  waterjet:              14,
  additive:              15,
};

/** Map an op/feature to a stage. */
function stageOf(op: CamOperation, feature?: FeatureClass): number {
  const spec = camOperationTaxonomyEngine.getSpec(op);
  if (!spec) return STAGE.finishing;
  const family = spec.family;
  const strategy = spec.strategy;

  if (family === "probing") return STAGE.probing;
  if (family === "edm")     return STAGE.edm;
  if (family === "laser")   return STAGE.laser;
  if (family === "waterjet") return STAGE.waterjet;
  if (family === "additive") return STAGE.additive;

  if (family === "turning" || family === "mill_turn") {
    return strategy === "finishing" ? STAGE.turning_finish : STAGE.turning_rough;
  }

  if (family === "drilling") {
    if (op === "drill_spot" || op === "drill_center") return STAGE.drilling_spot;
    if (op === "drill" || op === "drill_peck" || op === "drill_deep") return STAGE.drilling_twist;
    if (op === "bore" || op === "bore_back" || op === "bore_helical") return STAGE.drilling_bore;
    if (op === "tap" || op === "tap_form" || op === "ream" || op === "thread_mill") return STAGE.drilling_tap_ream;
    return STAGE.drilling_twist;
  }

  // Milling family — strategy-driven.
  if (feature === "face" && (strategy === "roughing" || strategy === "facing")) return STAGE.face_first;
  if (op === "face") return STAGE.face_first;
  if (strategy === "roughing")    return STAGE.rough_milling;
  if (strategy === "semi_finish" || strategy === "pre_finish") return STAGE.pre_finish;
  if (strategy === "finishing")   return STAGE.finishing;
  if (feature === "chamfer")      return STAGE.chamfer;
  return STAGE.finishing;
}

export class CAMOperationSequencePlannerEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMOperationSequencePlannerEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Orders a list of CamTasks per standard shop-floor sequencing rules.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "plan",      description: "Order CamTask list",                  actions: ["cam_seq_plan"] },
      { name: "validate_order", description: "Validate caller-supplied order", actions: ["cam_seq_validate_order"] },
      { name: "stages",    description: "List stage names + ordinals",         actions: ["cam_seq_stages"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMOperationSequencePlannerEngine", note: "use typed methods" };
  }

  /** Order a task list. Stable sort: stage, then tool-diameter descending, then original order. */
  plan(tasks: ReadonlyArray<CamTask>): SequencePlan {
    const indexed = tasks.map((t, i) => ({ task: t, originalIndex: i, stage: stageOf(t.op, t.featureClass) }));

    // Respect dependsOn — topological-ish: if A depends on B and they share stage, B comes first.
    const idIndex = new Map<string, number>();
    indexed.forEach((e, i) => idIndex.set(e.task.id, i));

    const violations: string[] = [];
    for (const e of indexed) {
      for (const depId of e.task.dependsOn ?? []) {
        const depIdx = idIndex.get(depId);
        if (depIdx == null) {
          violations.push(`task ${e.task.id} depends on unknown id ${depId}`);
        } else if (indexed[depIdx].stage > e.stage) {
          violations.push(`task ${e.task.id} (stage ${e.stage}) depends on later-stage ${depId} (stage ${indexed[depIdx].stage})`);
        }
      }
    }

    const sorted = [...indexed].sort((a, b) => {
      if (a.stage !== b.stage) return a.stage - b.stage;
      const aDia = a.task.toolDiameterMm ?? 0;
      const bDia = b.task.toolDiameterMm ?? 0;
      if (aDia !== bDia) return bDia - aDia; // larger first
      return a.originalIndex - b.originalIndex; // stable
    });

    // Re-order to honor explicit dependsOn within the sorted list (one extra pass).
    const reordered = this.honorDeps(sorted.map((e) => e.task), violations);
    return { ordered: reordered, violations };
  }

  /** Check if a caller-supplied order honors the stage-monotonicity rule. */
  validate_order(tasks: ReadonlyArray<CamTask>): { valid: boolean; violations: ReadonlyArray<string> } {
    const violations: string[] = [];
    let prevStage = -1;
    let prevId = "<start>";
    for (const t of tasks) {
      const s = stageOf(t.op, t.featureClass);
      if (s < prevStage) {
        violations.push(`task ${t.id} (op=${t.op}, stage=${s}) appears after ${prevId} (stage=${prevStage}) — stage rollback`);
      }
      prevStage = s;
      prevId = t.id;
    }
    return { valid: violations.length === 0, violations };
  }

  /** Return all stages and their ordinals. */
  stages(): Record<string, number> {
    return { ...STAGE };
  }

  /** Reorder a sorted list so explicit dependsOn relationships are honored. */
  private honorDeps(tasks: ReadonlyArray<CamTask>, violations: string[]): ReadonlyArray<CamTask> {
    const byId = new Map<string, CamTask>();
    tasks.forEach((t) => byId.set(t.id, t));
    const placed = new Set<string>();
    const result: CamTask[] = [];

    const visit = (t: CamTask, stack: Set<string>) => {
      if (placed.has(t.id)) return;
      if (stack.has(t.id)) {
        violations.push(`cyclic dependency at task ${t.id}`);
        return;
      }
      stack.add(t.id);
      for (const depId of t.dependsOn ?? []) {
        const dep = byId.get(depId);
        if (dep) visit(dep, stack);
      }
      stack.delete(t.id);
      placed.add(t.id);
      result.push(t);
    };

    for (const t of tasks) visit(t, new Set());
    return result;
  }
}

export const camOperationSequencePlannerEngine = new CAMOperationSequencePlannerEngine();

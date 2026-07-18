/**
 * CAMMultiSetupPlannerEngine — CAM-AI-TRAINING-MS0/U-CAMT-SETUPS
 *
 * Plans multi-setup machining for parts with features on multiple
 * faces / access vectors. Inputs: a feature list with access-vector
 * (top / bottom / +X / -X / +Y / -Y / arbitrary 5-axis), machine axis
 * count, and stock geometry.
 *
 * Output: ordered Setup[] with assigned features + re-fixture
 * instructions (flip, rotate, transfer to vise, etc.) between
 * consecutive setups.
 *
 * Pure logic. No CAD geometric reasoning — caller supplies the access
 * vector for each feature (this is normally the output of a CAD
 * feature-recognition pass).
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import type { FeatureClass } from "./CAMFeatureClassClassifierEngine.js";
import type { MachineClass } from "./CAMMachineSelectionEngine.js";

export type AccessVector =
  | "+Z" | "-Z"
  | "+X" | "-X"
  | "+Y" | "-Y"
  | "5axis";

export interface FeatureForSetup {
  id: string;
  featureClass: FeatureClass;
  accessVector: AccessVector;
}

export interface Setup {
  index: number;
  /** Stock orientation: which face faces up (+Z) in this setup. */
  upAxis: AccessVector;
  features: ReadonlyArray<string>;
  /** Re-fixture instruction to set up THIS setup from the previous one. */
  refixtureFrom?: string;
}

export interface MultiSetupPlan {
  setups: ReadonlyArray<Setup>;
  /** Features that could not be reached on any setup. */
  unreachable: ReadonlyArray<string>;
  /** Total re-fixture count = setups.length - 1. */
  refixtureCount: number;
}

export interface PlannerInputs {
  features: ReadonlyArray<FeatureForSetup>;
  machineClass: MachineClass;
}

/**
 * Which AccessVector reaches which face. 3-axis VMC: only +Z. 4-axis
 * rotary: +Z + (+X or -X) by rotation. 5-axis: any.
 */
const REACHABLE_BY_CLASS: Record<MachineClass, ReadonlyArray<AccessVector>> = {
  vmc_3axis:   ["+Z"],
  vmc_4axis:   ["+Z", "+X", "-X"],
  vmc_5axis:   ["+Z", "-Z", "+X", "-X", "+Y", "-Y", "5axis"],
  hmc:         ["+Z", "+X", "-X", "+Y", "-Y"], // tombstone gives 4-side
  lathe:       ["+Z"],
  mill_turn:   ["+Z", "+X", "-X"],
  wire_edm:    ["+Z"],
  sinker_edm:  ["+Z"],
  router:      ["+Z"],
  laser:       ["+Z"],
  waterjet:    ["+Z"],
  additive:    ["+Z"],
};

/** Re-fixture instruction by transition between upAxis values. */
const REFIXTURE_INSTRUCTIONS: Record<string, string> = {
  "+Z->-Z": "flip part 180° about X (top↔bottom)",
  "+Z->+X": "tip part 90° (top↔right side)",
  "+Z->-X": "tip part 90° (top↔left side)",
  "+Z->+Y": "tip part 90° (top↔back)",
  "+Z->-Y": "tip part 90° (top↔front)",
  "-Z->+Z": "flip part 180° about X (bottom↔top)",
  "+X->-X": "rotate 180° about Z",
  "+Y->-Y": "rotate 180° about Z",
};

export class CAMMultiSetupPlannerEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMMultiSetupPlannerEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Plans multi-setup machining: groups features by access vector + emits re-fixture instructions.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "plan",       description: "Plan multi-setup from feature list",  actions: ["cam_setups_plan"] },
      { name: "reachable",  description: "Reachable AccessVectors by machine",  actions: ["cam_setups_reachable"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMMultiSetupPlannerEngine", note: "use typed methods" };
  }

  /** Plan multi-setup. */
  plan(inputs: PlannerInputs): MultiSetupPlan {
    const reachable = new Set(REACHABLE_BY_CLASS[inputs.machineClass] ?? []);

    // 5-axis machines can hit "5axis" vector in one setup (trunnion).
    const consolidates5axis = inputs.machineClass === "vmc_5axis";

    // Group features by access vector.
    const buckets = new Map<AccessVector, string[]>();
    const unreachable: string[] = [];
    for (const f of inputs.features) {
      if (consolidates5axis) {
        // On 5-axis, every reachable feature folds into the +Z setup unless explicitly multi-setup.
        if (reachable.has(f.accessVector) || reachable.has("5axis")) {
          if (!buckets.has("+Z")) buckets.set("+Z", []);
          buckets.get("+Z")!.push(f.id);
        } else {
          unreachable.push(f.id);
        }
        continue;
      }
      if (!reachable.has(f.accessVector)) {
        unreachable.push(f.id);
        continue;
      }
      if (!buckets.has(f.accessVector)) buckets.set(f.accessVector, []);
      buckets.get(f.accessVector)!.push(f.id);
    }

    // Order setups: +Z first (always start top-up), then -Z, then +X/-X/+Y/-Y (lateral),
    // then 5axis last (if any leftover).
    const ORDER: ReadonlyArray<AccessVector> = ["+Z", "-Z", "+X", "-X", "+Y", "-Y", "5axis"];
    const orderedAxes = ORDER.filter((v) => buckets.has(v));

    const setups: Setup[] = [];
    let prevUp: AccessVector | undefined;
    let index = 1;
    for (const ax of orderedAxes) {
      const refixtureFrom = prevUp ? REFIXTURE_INSTRUCTIONS[`${prevUp}->${ax}`] ?? `re-fixture from ${prevUp} to ${ax}` : undefined;
      setups.push({
        index,
        upAxis: ax,
        features: buckets.get(ax)!,
        refixtureFrom,
      });
      prevUp = ax;
      index++;
    }

    return {
      setups,
      unreachable,
      refixtureCount: Math.max(0, setups.length - 1),
    };
  }

  /** Reachable AccessVectors for a machine class. */
  reachable(machineClass: MachineClass): ReadonlyArray<AccessVector> {
    return REACHABLE_BY_CLASS[machineClass] ?? [];
  }
}

export const camMultiSetupPlannerEngine = new CAMMultiSetupPlannerEngine();

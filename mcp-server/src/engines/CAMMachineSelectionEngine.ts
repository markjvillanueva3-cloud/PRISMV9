/**
 * CAMMachineSelectionEngine — CAM-AI-TRAINING-MS0/U-CAMT-MACHINE
 *
 * Ranks shop machines for a given (CamOperation, CamSystem) pair based
 * on axis count + machine class + family compatibility. Used by the
 * print-to-program orchestrator to choose which physical machine on
 * the shop floor will execute the click recipe.
 *
 * Pure logic — caller passes the machine inventory inline.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import { camOperationTaxonomyEngine, type CamOperation } from "./CAMOperationTaxonomyEngine.js";

export type MachineClass =
  | "vmc_3axis"      // 3-axis VMC
  | "vmc_4axis"      // 4-axis VMC (rotary)
  | "vmc_5axis"      // 5-axis VMC (trunnion / head)
  | "hmc"            // 4-axis horizontal
  | "lathe"          // 2-axis turning
  | "mill_turn"      // sub-spindle live-tool lathe
  | "wire_edm"       // 2- or 4-axis wire EDM
  | "sinker_edm"     // sinker EDM
  | "router"         // wood / composite router
  | "laser"          // laser cutter
  | "waterjet"       // waterjet
  | "additive";      // DED / DMLS

export interface MachineInventoryEntry {
  id: string;
  machineClass: MachineClass;
  /** Hourly cost in shop-base currency. */
  hourlyRate: number;
  /** True when machine is currently producing (not free for new work). */
  busy?: boolean;
}

export interface MachineSelection {
  bestMachineId: string | null;
  candidates: Array<{
    machineId: string;
    machineClass: MachineClass;
    score: number;
    reason: string;
    available: boolean;
  }>;
}

const FAMILY_TO_CLASS: Record<string, ReadonlyArray<MachineClass>> = {
  milling_2d:   ["vmc_3axis", "vmc_4axis", "vmc_5axis", "hmc"],
  milling_3d:   ["vmc_3axis", "vmc_4axis", "vmc_5axis", "hmc"],
  milling_5axis:["vmc_5axis"],
  drilling:     ["vmc_3axis", "vmc_4axis", "vmc_5axis", "hmc", "lathe"],
  turning:      ["lathe", "mill_turn"],
  mill_turn:    ["mill_turn"],
  probing:      ["vmc_3axis", "vmc_4axis", "vmc_5axis", "hmc", "lathe", "mill_turn"],
  finishing:    ["vmc_3axis", "vmc_4axis", "vmc_5axis"],
  edm:          ["wire_edm", "sinker_edm"],
  laser:        ["laser"],
  waterjet:     ["waterjet"],
  additive:     ["additive"],
};

const AXIS_TO_CLASS_PRIORITY: Record<string, ReadonlyArray<MachineClass>> = {
  "2":     ["lathe", "wire_edm", "laser", "waterjet"],
  "2.5":   ["vmc_3axis"],
  "3":     ["vmc_3axis"],
  "3+2":   ["vmc_5axis"],
  "4":     ["vmc_4axis", "hmc", "mill_turn"],
  "5":     ["vmc_5axis"],
};

export class CAMMachineSelectionEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMMachineSelectionEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Ranks shop machines for a (CamOperation, CamSystem) pair.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "rank",     description: "Rank a machine inventory for an op", actions: ["cam_machine_rank"] },
      { name: "classes",  description: "List MachineClass enum",             actions: ["cam_machine_classes"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMMachineSelectionEngine", note: "use typed methods" };
  }

  /**
   * Rank an inventory of machines for a given CamOperation. Scoring:
   *   +10 family-match
   *   +5 axis-match
   *   +3 available (not busy)
   *   −1 / $/hr above the lowest hourly rate (cheaper preferred)
   */
  rank(op: CamOperation, inventory: ReadonlyArray<MachineInventoryEntry>): MachineSelection {
    const spec = camOperationTaxonomyEngine.getSpec(op);
    if (!spec) return { bestMachineId: null, candidates: [] };
    const familyClasses = new Set(FAMILY_TO_CLASS[spec.family] ?? []);
    const axisClasses = new Set(AXIS_TO_CLASS_PRIORITY[spec.axisCount] ?? []);

    const minRate = Math.min(...inventory.map((m) => m.hourlyRate), Infinity);
    const candidates = inventory.map((m) => {
      let score = 0;
      const reasons: string[] = [];
      if (familyClasses.has(m.machineClass)) {
        score += 10;
        reasons.push("family-match");
      }
      if (axisClasses.has(m.machineClass)) {
        score += 5;
        reasons.push("axis-match");
      }
      if (!m.busy) {
        score += 3;
        reasons.push("available");
      }
      if (Number.isFinite(minRate)) {
        const rateDelta = m.hourlyRate - minRate;
        if (rateDelta > 0) score -= rateDelta / 10;
      }
      return {
        machineId: m.id,
        machineClass: m.machineClass,
        score,
        reason: reasons.length > 0 ? reasons.join(",") : "no-match",
        available: !m.busy,
      };
    }).sort((a, b) => b.score - a.score);

    const best = candidates.find((c) => c.reason.includes("family-match")) ?? null;
    return { bestMachineId: best?.machineId ?? null, candidates };
  }

  /** All 12 documented MachineClass values. */
  classes(): ReadonlyArray<MachineClass> {
    return ["vmc_3axis", "vmc_4axis", "vmc_5axis", "hmc", "lathe", "mill_turn",
            "wire_edm", "sinker_edm", "router", "laser", "waterjet", "additive"];
  }
}

export const camMachineSelectionEngine = new CAMMachineSelectionEngine();

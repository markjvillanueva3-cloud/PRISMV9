/**
 * CAMCoolantStrategyEngine — CAM-AI-TRAINING-MS0/U-CAMT-COOLANT
 *
 * Picks the coolant strategy (flood / MQL / air-blast / through-spindle /
 * mist / submerged / dry) for a (CamOperation, Material, ToolFamily,
 * depth-of-cut) tuple. Pure rule table — no fabricated coolant flow
 * tables.
 *
 * Rule priorities (highest first):
 *   1. Wire-EDM → submerged (deionized water).
 *   2. Sinker-EDM → submerged (dielectric oil).
 *   3. Laser → air assist (oxygen / N2 / compressed air).
 *   4. Waterjet → no machining coolant (water IS the cutter).
 *   5. Hardened steel / titanium / inconel → through-spindle high-pressure.
 *   6. Aluminum + thread mill / tap → MQL or flood (chip evacuation).
 *   7. Deep drilling (>5×D) → through-spindle.
 *   8. Plastic / composite → dry + dust extraction.
 *   9. Cast iron → dry (chips compact, water creates slurry).
 *  10. Default mill / turn → flood.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import { camOperationTaxonomyEngine, type CamOperation } from "./CAMOperationTaxonomyEngine.js";
import type { Material, ToolFamily } from "./CAMToolLibrarySelectionEngine.js";

export type CoolantStrategy =
  | "flood"
  | "mql"                 // minimum-quantity lubrication
  | "air_blast"
  | "through_spindle"     // high-pressure through-coolant
  | "mist"
  | "submerged"           // edm / wire-edm
  | "dry"
  | "dust_extraction";    // composite / plastic

export interface CoolantSelectionInputs {
  op: CamOperation;
  material?: Material;
  toolFamily?: ToolFamily;
  /** mm of axial depth — used to spot deep drilling (>5× tool dia). */
  depthOfCutMm?: number;
  /** Tool diameter mm — paired with depth for L/D check. */
  toolDiameterMm?: number;
  /** Tool through-coolant capable? Default false. */
  throughCoolantCapable?: boolean;
}

export interface CoolantSelection {
  strategy: CoolantStrategy;
  /** Liters/min for flood; bar pressure for through-spindle; null otherwise. */
  flowRateLpm?: number;
  pressureBar?: number;
  rationale: string;
}

const CAST_IRON_HINTS: ReadonlyArray<Material> = []; // cast_iron not in enum; placeholder for ext.

export class CAMCoolantStrategyEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMCoolantStrategyEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Picks the coolant strategy for a (CamOperation, Material, ToolFamily) triple.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "select",     description: "Pick coolant strategy",      actions: ["cam_coolant_select"] },
      { name: "strategies", description: "List CoolantStrategy enum",  actions: ["cam_coolant_strategies"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMCoolantStrategyEngine", note: "use typed methods" };
  }

  /** Pick coolant strategy. */
  select(inputs: CoolantSelectionInputs): CoolantSelection {
    const spec = camOperationTaxonomyEngine.getSpec(inputs.op);
    const family = spec?.family;

    // Rule 1-4: machine-physics-driven overrides (machine class wins).
    if (family === "edm") {
      const isWire = inputs.op === "wedm_2axis" || inputs.op === "wedm_4axis_taper";
      return {
        strategy: "submerged",
        rationale: isWire
          ? "wire-edm — submerged in deionized water dielectric"
          : "sinker-edm — submerged in hydrocarbon dielectric oil",
      };
    }
    if (family === "laser") {
      return { strategy: "air_blast", pressureBar: 12, rationale: "laser — air/N2 assist gas, no liquid coolant" };
    }
    if (family === "waterjet") {
      return { strategy: "submerged", rationale: "waterjet — water IS the cutter; no separate coolant" };
    }
    if (family === "additive") {
      return { strategy: "air_blast", rationale: "additive — inert-gas (argon/N2) shielding, no liquid coolant" };
    }
    if (family === "probing") {
      return { strategy: "dry", rationale: "probing — no cutting load, coolant off to avoid skew" };
    }

    // Rule 5: hardened / superalloy → through-spindle (when capable) or flood high-pressure.
    if (inputs.material === "hardened_steel" || inputs.material === "titanium" || inputs.material === "inconel") {
      if (inputs.throughCoolantCapable) {
        return {
          strategy: "through_spindle",
          pressureBar: 70,
          rationale: `${inputs.material} — through-spindle 70 bar evacuates heat at the cutting zone`,
        };
      }
      return {
        strategy: "flood",
        flowRateLpm: 25,
        rationale: `${inputs.material} — flood 25 L/min (through-spindle not available)`,
      };
    }

    // Rule 6: aluminum + thread mill / tap → MQL preferred (avoid built-up edge).
    if (inputs.material === "aluminum" && (inputs.toolFamily === "thread_mill" || inputs.toolFamily === "tap_cut" || inputs.toolFamily === "tap_form")) {
      return { strategy: "mql", rationale: "aluminum thread/tap — MQL avoids built-up edge, cools without flooding the part" };
    }

    // Rule 7: deep drilling — through-spindle for chip evacuation.
    if (family === "drilling" && inputs.depthOfCutMm != null && inputs.toolDiameterMm != null) {
      const lOverD = inputs.depthOfCutMm / Math.max(0.1, inputs.toolDiameterMm);
      if (lOverD > 5) {
        if (inputs.throughCoolantCapable) {
          return { strategy: "through_spindle", pressureBar: 50, rationale: `deep drilling L/D=${lOverD.toFixed(1)} — through-spindle 50 bar for chip evacuation` };
        }
        return { strategy: "flood", flowRateLpm: 30, rationale: `deep drilling L/D=${lOverD.toFixed(1)} — high-volume flood (through-coolant preferred)` };
      }
    }

    // Rule 8: plastic / composite → dust extraction (no liquid).
    if (inputs.material === "plastic" || inputs.material === "composite") {
      return { strategy: "dust_extraction", rationale: `${inputs.material} — dust extraction; liquid swells fibers / softens polymer` };
    }

    if (CAST_IRON_HINTS.length > 0) { /* placeholder for cast-iron rule when enum extended */ }

    // Rule 10: default mill / turn → flood.
    if (family === "milling_2d" || family === "milling_3d" || family === "milling_5axis"
     || family === "drilling"   || family === "turning"   || family === "mill_turn"
     || family === "finishing") {
      return { strategy: "flood", flowRateLpm: 15, rationale: "default milling/turning — flood 15 L/min" };
    }

    return { strategy: "flood", flowRateLpm: 15, rationale: "fallback default — flood 15 L/min" };
  }

  /** All 8 documented CoolantStrategy values. */
  strategies(): ReadonlyArray<CoolantStrategy> {
    return ["flood", "mql", "air_blast", "through_spindle", "mist", "submerged", "dry", "dust_extraction"];
  }
}

export const camCoolantStrategyEngine = new CAMCoolantStrategyEngine();

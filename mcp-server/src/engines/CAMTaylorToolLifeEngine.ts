/**
 * CAMTaylorToolLifeEngine — CAM-AI-TRAINING-MS0/U-CAMT-TAYLOR
 *
 * Predicts tool life (minutes-to-wear) via the Taylor equation:
 *     V × T^n = C
 *   so T = (C / V) ^ (1/n)
 *
 * V = cutting speed (m/min). n + C are tool/material-pair constants.
 *
 * Canonical n values (carbide insert, ISO V_b=0.3mm wear criterion):
 *   - aluminum (N):       n=0.40, C=900
 *   - steel (P, AISI 1045): n=0.28, C=350
 *   - stainless (M):      n=0.20, C=200
 *   - tool steel (P):     n=0.25, C=250
 *   - titanium (S):       n=0.18, C=120
 *   - inconel (S):        n=0.15, C=80
 *   - hardened steel (H): n=0.12, C=100
 *   - copper (N):         n=0.30, C=400
 *   - brass (N):          n=0.35, C=600
 *   - plastic (N):        n=0.50, C=1500
 *   - composite (N):      n=0.20, C=200 (abrasive)
 *
 * Values consistent with widely-cited Sandvik / Kennametal carbide
 * baselines (Vc-T curves at the standard wear threshold).
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import type { Material, ToolFamily } from "./CAMToolLibrarySelectionEngine.js";

export interface TaylorConstants {
  n: number;
  C: number;
}

export interface ToolLifeInputs {
  material: Material;
  /** Cutting speed in m/min. */
  cuttingSpeedMmin: number;
  /** Optional override — if you want to project life for a non-carbide cutter. */
  overrideConstants?: TaylorConstants;
}

export interface ToolLifeResult {
  /** Predicted minutes-to-failure under these conditions. */
  toolLifeMin: number;
  /** Constants used. */
  constants: TaylorConstants;
  /** Diagnostic — cutting speed used. */
  vMmin: number;
}

const TAYLOR_TABLE: Record<Material, TaylorConstants> = {
  aluminum:        { n: 0.40, C: 900  },
  steel:           { n: 0.28, C: 350  },
  stainless:       { n: 0.20, C: 200  },
  tool_steel:      { n: 0.25, C: 250  },
  titanium:        { n: 0.18, C: 120  },
  inconel:         { n: 0.15, C: 80   },
  hardened_steel:  { n: 0.12, C: 100  },
  copper:          { n: 0.30, C: 400  },
  brass:           { n: 0.35, C: 600  },
  plastic:         { n: 0.50, C: 1500 },
  composite:       { n: 0.20, C: 200  },
};

/**
 * Tool-family multiplier on tool life (relative to a generic insert
 * baseline of 1.0). Drills and taps wear faster; thread mills slower.
 */
const FAMILY_MULTIPLIER: Partial<Record<ToolFamily, number>> = {
  end_mill_flat:        1.0,
  end_mill_ball:        0.9,
  end_mill_bull_nose:   0.95,
  face_mill:            1.1,
  chamfer_mill:         1.2,
  thread_mill:          1.3,
  drill_twist:          0.7,
  drill_spot:           1.0,
  tap_cut:              0.5,
  tap_form:             0.8,
  reamer:               1.2,
  boring_bar:           1.1,
  turning_insert_rough: 0.9,
  turning_insert_finish:1.2,
  threading_insert:     1.1,
  grooving_insert:      0.9,
  parting_insert:       0.8,
};

const V_MIN = 0.1; // m/min — physical floor (avoids inf life from V→0)

export class CAMTaylorToolLifeEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMTaylorToolLifeEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Predicts tool-life via the Taylor equation V × T^n = C.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "predict",     description: "Predict tool-life in minutes",     actions: ["cam_taylor_predict"] },
      { name: "constants",   description: "Get Taylor constants for material",actions: ["cam_taylor_constants"] },
      { name: "speed_for_life", description: "Solve for V given target life", actions: ["cam_taylor_speed_for_life"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMTaylorToolLifeEngine", note: "use typed methods" };
  }

  /** Solve T = (C/V)^(1/n). */
  predict(inputs: ToolLifeInputs, toolFamily?: ToolFamily): ToolLifeResult | null {
    const k = inputs.overrideConstants ?? TAYLOR_TABLE[inputs.material];
    if (!k) return null;
    const v = Math.max(V_MIN, inputs.cuttingSpeedMmin);
    const baseLife = Math.pow(k.C / v, 1 / k.n);
    const multiplier = toolFamily ? (FAMILY_MULTIPLIER[toolFamily] ?? 1.0) : 1.0;
    return {
      toolLifeMin: baseLife * multiplier,
      constants: k,
      vMmin: v,
    };
  }

  /** Constants for a material. */
  constants(material: Material): TaylorConstants | null {
    return TAYLOR_TABLE[material] ?? null;
  }

  /**
   * Solve for V given target life: V = C / T^n.
   * Used by speed-feed optimizer to back-derive sustainable cutting speed
   * from a tool-change-schedule target.
   */
  speed_for_life(material: Material, targetLifeMin: number): number | null {
    const k = TAYLOR_TABLE[material];
    if (!k) return null;
    const t = Math.max(0.01, targetLifeMin);
    return k.C / Math.pow(t, k.n);
  }
}

export const camTaylorToolLifeEngine = new CAMTaylorToolLifeEngine();

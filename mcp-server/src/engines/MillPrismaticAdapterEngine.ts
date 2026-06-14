/**
 * MillPrismaticAdapterEngine — L2 of the 4-layer pipeline stack (pilot)
 *
 * Adapter for the mill:prismatic part class. Produces a parameterized strategy
 * preset (tribal-tip filter + speed/feed seeds + fixture preference +
 * tolerance budget + safety tier) that the L3 master pipeline
 * (PrintToProgramPipelineEngine) consumes.
 *
 * NOT a parallel pipeline — this is a CONFIG + PRESET engine. The actual
 * program generation is delegated to L3.
 *
 * Tribal sources (foxtrot tribal corpus):
 *  - Sandvik Coromant Application Guide §A-2 (prismatic-pocket roughing/finishing)
 *  - Mastercam Mill Prismatic strategy doc
 *  - Boothroyd & Dewhurst (2010) §3 (DFM prismatic taxonomy)
 *  - JM Die ITW + Alcoa prismatic-part program corpus (foxtrot tribal)
 *
 * @version 1.0.0
 * @module MillPrismaticAdapterEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export interface MillPrismaticAdapterInput {
  /** Material designation (steel, aluminum, ...) */
  material: string;
  /** Bounding box dimensions (mm) */
  bbox_mm: { x: number; y: number; z: number };
  /** Tolerance class (IT6/IT7/etc.) */
  tolerance_class?: string;
  /** Available machine capabilities (rpm, kW, taper, axes) */
  machine_caps?: {
    rpm_max?: number;
    spindle_kw?: number;
    axes?: 3 | 4 | 5;
    taper?: "BT40" | "BT50" | "HSK63A" | "HSK100A";
  };
  /** Operator override: safety tier */
  safety_tier_override?: "shop_floor" | "production" | "prototype";
}

export interface AdapterPreset {
  part_class: string;
  strategy_preset: string;
  speed_feed_seed: {
    sfm_min: number;
    sfm_max: number;
    chip_load_mm_tooth_min: number;
    chip_load_mm_tooth_max: number;
    doc_ratio_max: number;  // axial doc / tool diameter
    woc_ratio_max: number;  // radial woc / tool diameter
  };
  fixture_preference: string[];
  tolerance_budget_um: AtomicValue;
  safety_tier: "shop_floor" | "production" | "prototype";
  required_engines: string[];
  required_dispatchers: string[];
  tribal_tags: string[];
  source: string;
}

const SAFE_FLOOR = {
  shop_floor: { sx: 0.98, omega: 0.95 },
  production: { sx: 0.95, omega: 0.90 },
  prototype:  { sx: 0.85, omega: 0.80 },
};

export class MillPrismaticAdapterEngine {
  adapt(input: MillPrismaticAdapterInput): AdapterPreset {
    if (!input || !input.material || !input.bbox_mm) {
      throw new Error("MillPrismaticAdapterEngine.adapt: material + bbox_mm required");
    }

    const mat = input.material.toLowerCase();
    const isAluminum = /aluminum|al-?\d|6061|7075|2024/i.test(mat);
    const isStainless = /stainless|ss\d|304|316|17-?4/i.test(mat);
    const isTool = /tool steel|h13|d2|a2|m2/i.test(mat);

    // Speed/feed seed envelope per material family (Sandvik §A-2)
    let sfmMin = 250, sfmMax = 400, chipMin = 0.05, chipMax = 0.15;
    let preset = "high-speed-pocketing-trochoidal";
    if (isAluminum) {
      sfmMin = 1500; sfmMax = 3000;
      chipMin = 0.10; chipMax = 0.30;
      preset = "aluminum-hsm-trochoidal";
    } else if (isStainless) {
      sfmMin = 150; sfmMax = 280;
      chipMin = 0.04; chipMax = 0.12;
      preset = "stainless-stable-engagement";
    } else if (isTool) {
      sfmMin = 80; sfmMax = 180;
      chipMin = 0.03; chipMax = 0.08;
      preset = "tool-steel-rigid-roughing";
    }

    // DOC/WOC envelope — HSM if rigid 5-axis, conservative otherwise
    const axes = input.machine_caps?.axes ?? 3;
    const isHSM = axes >= 4 && (input.machine_caps?.rpm_max ?? 0) >= 15000;
    const docRatio = isHSM ? 1.0 : 0.5;
    const wocRatio = isHSM ? 0.1 : 0.4;  // trochoidal narrow WOC for HSM

    // Tolerance budget — derived from IT class
    const tolClass = input.tolerance_class ?? "IT8";
    const tolBudgetByClass: Record<string, number> = {
      IT5: 12, IT6: 19, IT7: 30, IT8: 46, IT9: 74, IT10: 120, IT11: 190,
    };
    const tolBudget = tolBudgetByClass[tolClass] ?? 46;

    const tier = input.safety_tier_override ?? "production";

    return {
      part_class: "mill:prismatic",
      strategy_preset: preset,
      speed_feed_seed: {
        sfm_min: sfmMin,
        sfm_max: sfmMax,
        chip_load_mm_tooth_min: chipMin,
        chip_load_mm_tooth_max: chipMax,
        doc_ratio_max: docRatio,
        woc_ratio_max: wocRatio,
      },
      fixture_preference: [
        "vise-with-soft-jaws",
        "magnetic-chuck-if-ferrous",
        "vacuum-fixture-if-aluminum-thin",
      ],
      tolerance_budget_um: {
        value: tolBudget,
        unit: "μm",
        source: `ISO 286-1 ${tolClass}`,
      },
      safety_tier: tier,
      required_engines: [
        "CuttingForceEngine",
        "SpeedFeedOrchestrator",
        "ChatterStabilityLobeEngine",
        "ToolDeflectionEngine",
        "FixtureDynamicsEngine",
        "SurfaceFinishPredictor",
        "GDTValidatorEngine",
        "MetrologyBudgetEngine",
      ],
      required_dispatchers: [
        "prism_calc",
        "prism_cam",
        "prism_safety",
      ],
      tribal_tags: [
        "mill:prismatic",
        `material:${mat}`,
        `tolerance:${tolClass}`,
        `axes:${axes}`,
        isHSM ? "hsm" : "conventional",
        "sandvik-§A-2",
        "boothroyd-§3",
      ],
      source: `MillPrismaticAdapterEngine.adapt — Sandvik §A-2 + Boothroyd §3 + tribal SAFE_FLOOR=${tier}`,
    };
  }
}

export const millPrismaticAdapterEngine = new MillPrismaticAdapterEngine();

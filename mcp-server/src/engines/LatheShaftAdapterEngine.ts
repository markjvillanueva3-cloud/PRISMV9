/**
 * LatheShaftAdapterEngine — L2 (pilot) lathe:shaft part-class adapter
 *
 * Tribal sources:
 *  - Sandvik Coromant Turning Application Guide §B (shaft turning)
 *  - Okuma OSP Operator Manual (lathe-specific tribal)
 *  - JM Die Okuma 63-tip tribal corpus (foxtrot tribal)
 *  - Boothroyd & Dewhurst §3 (rotational-part DFM)
 *
 * @version 1.0.0
 * @module LatheShaftAdapterEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export interface LatheShaftAdapterInput {
  material: string;
  /** Shaft major dimensions */
  length_mm: number;
  diameter_mm: number;
  tolerance_class?: string;
  machine_caps?: {
    rpm_max?: number;
    spindle_kw?: number;
    tailstock?: boolean;
    bar_feeder?: boolean;
    sub_spindle?: boolean;
  };
  safety_tier_override?: "shop_floor" | "production" | "prototype";
}

export interface LatheAdapterPreset {
  part_class: string;
  strategy_preset: string;
  speed_feed_seed: {
    sfm_min: number;
    sfm_max: number;
    feed_mm_rev_min: number;
    feed_mm_rev_max: number;
    doc_finishing_mm: number;
    doc_roughing_mm: number;
  };
  workholding: string;
  tailstock_required: boolean;
  steady_rest_required: boolean;
  tolerance_budget_um: AtomicValue;
  safety_tier: "shop_floor" | "production" | "prototype";
  required_engines: string[];
  required_dispatchers: string[];
  tribal_tags: string[];
  source: string;
}

export class LatheShaftAdapterEngine {
  adapt(input: LatheShaftAdapterInput): LatheAdapterPreset {
    if (!input || !input.material || !input.length_mm || !input.diameter_mm) {
      throw new Error("LatheShaftAdapterEngine.adapt: material + length_mm + diameter_mm required");
    }

    const mat = input.material.toLowerCase();
    const isAluminum = /aluminum|al-?\d|6061|7075|2024/i.test(mat);
    const isStainless = /stainless|ss\d|304|316|17-?4/i.test(mat);
    const isInco = /inco|inconel|625|718|nimonic|hast/i.test(mat);

    let sfmMin = 250, sfmMax = 400, feedMin = 0.10, feedMax = 0.30;
    let preset = "conventional-roughing-then-finishing";
    if (isAluminum) {
      sfmMin = 800; sfmMax = 1800;
      feedMin = 0.15; feedMax = 0.40;
      preset = "aluminum-high-speed-turn";
    } else if (isStainless) {
      sfmMin = 100; sfmMax = 220;
      feedMin = 0.10; feedMax = 0.25;
      preset = "stainless-controlled-chip-break";
    } else if (isInco) {
      sfmMin = 30; sfmMax = 60;
      feedMin = 0.08; feedMax = 0.18;
      preset = "superalloy-rigid-controlled";
    }

    const lToD = input.length_mm / Math.max(input.diameter_mm, 1e-3);
    const tailstockRequired = lToD > 3;
    const steadyRestRequired = lToD > 10;
    const workholding = lToD > 5 ? "3-jaw-chuck-with-tailstock-and-steady-rest"
                       : lToD > 3 ? "3-jaw-chuck-with-tailstock"
                       : "3-jaw-chuck";

    const docFinish = isInco ? 0.15 : 0.4;
    const docRough = isInco ? 1.5 : isStainless ? 2.5 : 4.0;

    const tolClass = input.tolerance_class ?? "IT8";
    const tolBudgetByClass: Record<string, number> = {
      IT5: 11, IT6: 16, IT7: 25, IT8: 39, IT9: 62, IT10: 100, IT11: 160,
    };
    const tolBudget = tolBudgetByClass[tolClass] ?? 39;

    const tier = input.safety_tier_override ?? "production";

    return {
      part_class: "lathe:shaft",
      strategy_preset: preset,
      speed_feed_seed: {
        sfm_min: sfmMin,
        sfm_max: sfmMax,
        feed_mm_rev_min: feedMin,
        feed_mm_rev_max: feedMax,
        doc_finishing_mm: docFinish,
        doc_roughing_mm: docRough,
      },
      workholding,
      tailstock_required: tailstockRequired,
      steady_rest_required: steadyRestRequired,
      tolerance_budget_um: {
        value: tolBudget,
        unit: "μm",
        source: `ISO 286-1 ${tolClass}`,
      },
      safety_tier: tier,
      required_engines: [
        "CuttingForceEngine",
        "TurningPrintToProgramEngine",
        "LathePostProcessorEngine",
        "ToolDeflectionEngine",
        "BoringBarDeflectionEngine",
        "SurfaceFinishPredictor",
        "GDTValidatorEngine",
      ],
      required_dispatchers: [
        "prism_cam",
        "prism_turning",
        "prism_safety",
      ],
      tribal_tags: [
        "lathe:shaft",
        `material:${mat}`,
        `tolerance:${tolClass}`,
        `L/D:${lToD.toFixed(2)}`,
        "sandvik-§B",
        "okuma-osp",
        "jm-die-okuma-corpus",
      ],
      source: `LatheShaftAdapterEngine.adapt — Sandvik §B + Okuma OSP tribal + JM Die corpus, tier=${tier}`,
    };
  }
}

export const latheShaftAdapterEngine = new LatheShaftAdapterEngine();

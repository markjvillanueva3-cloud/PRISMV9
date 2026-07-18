/**
 * WireEDMPunchDieAdapterEngine — L2 (pilot) wire-edm:punch-die part-class adapter
 *
 * Tribal sources:
 *  - Sodick Sinker/Wire EDM Operator Manual + punch-die application guide
 *  - Mitsubishi MV Series WEDM tribal corpus
 *  - WEDM_DIGEST.json (SVI Ψ=0.875 per CLAUDE.md §WEDM AGI Status)
 *  - Wire-EDM Handbook (E. Bud Guitrau, 2nd ed. §6 punch-die)
 *  - JM Die wire-EDM tribal corpus (foxtrot tribal)
 *
 * Punch-die geometry implies IT5/IT6 tolerance + mating-pair toolset (punch +
 * matrix); strategy preset emphasizes ≥3-pass cut (main + trim 1 + trim 2 +
 * optional trim 3) for IT5 closure.
 *
 * @version 1.0.0
 * @module WireEDMPunchDieAdapterEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export interface WireEDMPunchDieAdapterInput {
  material: string;
  /** Punch thickness (mm) */
  thickness_mm: number;
  /** Smallest internal radius (mm) — wire-radius constraint */
  min_radius_mm: number;
  tolerance_class?: string;
  surface_finish_ra_um?: number;
  /** Wire diameter on hand (default 0.25mm brass) */
  wire_diameter_mm?: number;
  /** Controller dialect */
  controller?: "sodick" | "mitsubishi" | "fanuc" | "agie" | "makino";
  safety_tier_override?: "shop_floor" | "production" | "prototype";
}

export interface WireEDMAdapterPreset {
  part_class: string;
  strategy_preset: string;
  cut_passes: {
    main: { ie: number; on_time_us: number; off_time_us: number; servo_v: number };
    trim1: { ie: number; on_time_us: number; off_time_us: number; servo_v: number };
    trim2: { ie: number; on_time_us: number; off_time_us: number; servo_v: number };
    trim3_optional: { ie: number; on_time_us: number; off_time_us: number; servo_v: number } | null;
  };
  wire_recommendation: string;
  dielectric_pressure_bar: AtomicValue;
  tolerance_budget_um: AtomicValue;
  safety_tier: "shop_floor" | "production" | "prototype";
  required_engines: string[];
  required_dispatchers: string[];
  tribal_tags: string[];
  source: string;
}

export class WireEDMPunchDieAdapterEngine {
  adapt(input: WireEDMPunchDieAdapterInput): WireEDMAdapterPreset {
    if (!input || !input.material || !input.thickness_mm || input.min_radius_mm === undefined) {
      throw new Error("WireEDMPunchDieAdapterEngine.adapt: material + thickness_mm + min_radius_mm required");
    }

    // Wire selection: min radius constrains wire diameter
    const defaultWire = input.wire_diameter_mm ?? 0.25;
    const wireFits = defaultWire <= input.min_radius_mm * 2.5;
    const wireRec = wireFits
      ? `Ø${defaultWire}mm brass (default)`
      : `Reduce to Ø${(input.min_radius_mm / 2.5).toFixed(3)}mm — current Ø${defaultWire}mm violates 2.5× radius rule`;

    // Tolerance budget: punch-die typically IT5 or IT6
    const tolClass = input.tolerance_class ?? "IT5";
    const tolBudgetByClass: Record<string, number> = {
      IT5: 8, IT6: 13, IT7: 21, IT8: 33,
    };
    const tolBudget = tolBudgetByClass[tolClass] ?? 8;

    // Cut-pass schedule per Bud Guitrau §6 — IE/on/off/servo per pass
    // Main: aggressive material removal (IE3-IE5 sweet spot)
    // Trim1: 50% energy, half-overcut
    // Trim2: 30% energy, fine surface
    // Trim3 (optional): mirror finish if Ra ≤ 0.4μm requested
    const mainIE = input.thickness_mm > 25 ? 4 : 3;
    const main = { ie: mainIE, on_time_us: 8, off_time_us: 18, servo_v: 50 };
    const trim1 = { ie: mainIE - 1, on_time_us: 5, off_time_us: 12, servo_v: 40 };
    const trim2 = { ie: mainIE - 2, on_time_us: 3, off_time_us: 9, servo_v: 35 };
    const needTrim3 = (input.surface_finish_ra_um ?? 1.0) <= 0.4;
    const trim3 = needTrim3
      ? { ie: 1, on_time_us: 2, off_time_us: 6, servo_v: 30 }
      : null;

    // Preset selection per material + thickness
    const isCarbide = /carbide|wc|wccobalt/i.test(input.material);
    const isToolSteel = /tool|d2|h13|m2|a2|s7/i.test(input.material);
    const isStainless = /stainless|ss\d|304|316|17-?4/i.test(input.material);
    let preset = "general-die-3-pass";
    if (isCarbide) preset = "carbide-aggressive-4-pass-finer-fluid";
    else if (isToolSteel) preset = "tool-steel-3-pass-standard";
    else if (isStainless) preset = "stainless-controlled-burn-3-pass";

    // Dielectric pressure depends on thickness (Sodick app guide)
    const dielectricBar = Math.min(20, Math.max(8, input.thickness_mm * 0.6));

    const tier = input.safety_tier_override ?? "production";

    const tribalTags = [
      "wire-edm:punch-die",
      `material:${input.material.toLowerCase()}`,
      `tolerance:${tolClass}`,
      `thickness:${input.thickness_mm}mm`,
      `wire:${defaultWire}mm`,
      input.controller ? `controller:${input.controller}` : "controller:auto",
      "guitrau-§6",
      "sodick-app-guide",
      "wedm-svi-0.875",
    ];

    return {
      part_class: "wire-edm:punch-die",
      strategy_preset: preset,
      cut_passes: { main, trim1, trim2, trim3_optional: trim3 },
      wire_recommendation: wireRec,
      dielectric_pressure_bar: {
        value: Number(dielectricBar.toFixed(1)),
        unit: "bar",
        source: "Sodick app guide §3.2 thickness-pressure curve",
      },
      tolerance_budget_um: {
        value: tolBudget,
        unit: "μm",
        source: `ISO 286-1 ${tolClass}`,
      },
      safety_tier: tier,
      required_engines: [
        "WireEDMAIPrintToProgramEngine",
        "ChatterPredictionEngine",
        "AdaptiveFeedControlEngine",
        "GDTValidatorEngine",
        "MetrologyBudgetEngine",
      ],
      required_dispatchers: [
        "prism_edm",
        "prism_safety",
        "prism_cam",
      ],
      tribal_tags: tribalTags,
      source: `WireEDMPunchDieAdapterEngine.adapt — Guitrau §6 + Sodick app guide + WEDM_DIGEST tribal, tier=${tier}`,
    };
  }
}

export const wireEDMPunchDieAdapterEngine = new WireEDMPunchDieAdapterEngine();

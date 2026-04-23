/**
 * HyperMillDentalBlankRouter — Dental Blank Type → hyperMILL Strategy Router
 *
 * Routes dental blank configuration (blank type, material, restoration type)
 * to the appropriate hyperMILL machining strategy:
 *
 *   Disc blanks (Ø98mm, Ø71mm):
 *     - A-axis rotary positioning (3+2 milling)
 *     - Crowns, bridges, abutments, copings
 *     - hyperMILL: 5X Plane Machining (3+2) + Z-Level Finishing
 *
 *   Block blanks (14mm, 12mm, C14):
 *     - 5-axis simultaneous for complex anatomy
 *     - Single units (crowns, inlays, onlays)
 *     - hyperMILL: 5X Equidistant Finishing + 5X Profile Finishing
 *
 * Material routing:
 *   - Zirconia (green): high speed, dry, compensate shrinkage 20-25%
 *   - Zirconia (sintered): wet milling, diamond tools, low DOC
 *   - PEEK: air blast, sharp tools, thermal limit 250°C
 *   - CoCr: climb milling, through-spindle coolant, low speed 20-40 m/min
 *   - Ti Grade 5: climb milling, through-spindle coolant, 40-70 m/min
 *   - PMMA: very high speed (>500 m/min), conventional acceptable
 *
 * Wired to:
 *   - HyperMillMedicalMaterialProfiles (cutting parameters)
 *   - HyperMillMultiAxisEngine (dental strategies)
 *   - HyperMillCycleCatalogEngine (5-axis cycle codes)
 *
 * References:
 *   - Dentsply Sirona inLab CAD/CAM workflow guide (2023)
 *   - Roland DGA DWX milling guide (2023)
 *   - Zirkonzahn system guide (2022)
 *   - hyperMILL dental CAM application notes
 *
 * HM-REV-MS7 U-HMR42
 */

import { hyperMillMedicalMaterialProfiles, type MedicalMaterialKey } from "./HyperMillMedicalMaterialProfiles.js";

// ============================================================================
// TYPES
// ============================================================================

export type DentalBlankType = "disc" | "block" | "puck";

export type DentalMaterial = "zirconia" | "peek" | "cocr" | "titanium_gr5" | "pmma" | "composite";

export type DentalRestorationCategory =
  | "single_unit"       // Crown, inlay, onlay, veneer
  | "multi_unit"        // Bridge (3+ units), framework
  | "implant_prosthetic"; // Abutment, implant bar, screw-retained crown

export type DentalStrategyType =
  | "3plus2_aaxis"          // 3+2 with A-axis disc positioning
  | "5axis_simultaneous"    // True 5-axis simultaneous
  | "3axis_block"           // Simple 3-axis for block blanks (PMMA, composite)
  | "4axis_disc";           // 4-axis with indexed rotation

export interface DentalBlankRouterInput {
  blankType: DentalBlankType;
  material: DentalMaterial;
  restorationCategory: DentalRestorationCategory;
  zirconiaState?: "green" | "sintered" | "pre_sintered";
  millingUnit?: "open_dry" | "open_wet" | "enclosed_wet" | "5axis_dental";
  requiredRa_um?: number;
}

export interface DentalCycleRecommendation {
  hyperMillCycle: string;
  cyclePurpose: string;
  stepoverMm: number;
  spindleRpm: number;
  feedRate_mm_min: number;
  coolant: "dry" | "mql" | "air_blast" | "wet_through_spindle" | "wet_flood";
}

export interface DentalBlankRouteResult {
  /** Selected machining strategy */
  strategyType: DentalStrategyType;
  strategyDescription: string;

  /** Axis configuration */
  axisConfig: string;

  /** Recommended hyperMILL cycles in order */
  cycles: DentalCycleRecommendation[];

  /** Sintering shrinkage compensation (zirconia only) */
  shrinkageCompensation_pct: number | null;

  /** Tooling recommendations */
  toolingNotes: string[];

  /** Material-specific hyperMILL settings */
  hyperMillSettings: {
    machiningTolerance_mm: number;
    climbMilling: boolean;
    coolantType: string;
    maxSpindleRpm: number;
  };

  /** Compliance and quality notes */
  complianceNotes: string[];

  warnings: string[];
}

// ============================================================================
// MATERIAL → MEDICAL KEY MAPPING
// ============================================================================

const DENTAL_TO_MEDICAL_KEY: Partial<Record<DentalMaterial, MedicalMaterialKey>> = {
  zirconia: "zirconia_green",          // default; overridden by zirconiaState
  peek: "peek",
  cocr: "cocr",
  titanium_gr5: "titanium_gr5",
  // pmma and composite have no medical profile (non-implant polymer)
};

// ============================================================================
// STRATEGY ROUTING LOGIC
// ============================================================================

function routeStrategy(blankType: DentalBlankType, material: DentalMaterial, category: DentalRestorationCategory): DentalStrategyType {
  // PMMA / composite: simple 3-axis or 4-axis is sufficient
  if (material === "pmma" || material === "composite") {
    return blankType === "disc" ? "4axis_disc" : "3axis_block";
  }

  if (blankType === "disc") {
    // Disc blanks: always use 3+2 with A-axis rotation
    // Multi-unit bridges need disc format to span the larger blank
    return "3plus2_aaxis";
  }

  // Block / puck blanks: 5-axis simultaneous for complex anatomy
  // Single units with block blanks can use 5-axis for best accuracy
  return "5axis_simultaneous";
}

function getCycles(
  strategyType: DentalStrategyType,
  material: DentalMaterial,
  zirconiaState: "green" | "sintered" | "pre_sintered" = "green",
): DentalCycleRecommendation[] {
  const isGreenZirconia = material === "zirconia" && zirconiaState === "green";
  const isSinteredZirconia = material === "zirconia" && zirconiaState === "sintered";
  const isCoCr = material === "cocr";
  const isTi = material === "titanium_gr5";
  const isPEEK = material === "peek";
  const isPMMA = material === "pmma" || material === "composite";

  // Base speeds by material
  const roughRpm = isGreenZirconia ? 30000 : isSinteredZirconia ? 10000 : isCoCr ? 20000 : isTi ? 25000 : isPEEK ? 30000 : 40000;
  const finishRpm = isGreenZirconia ? 50000 : isSinteredZirconia ? 15000 : isCoCr ? 25000 : isTi ? 30000 : isPEEK ? 40000 : 60000;
  const roughFeed = isGreenZirconia ? 2000 : isSinteredZirconia ? 200 : isCoCr ? 400 : isTi ? 600 : isPEEK ? 1500 : 3000;
  const finishFeed = isGreenZirconia ? 800 : isSinteredZirconia ? 100 : isCoCr ? 200 : isTi ? 300 : isPEEK ? 600 : 1500;

  const coolant: DentalCycleRecommendation["coolant"] =
    isSinteredZirconia ? "wet_through_spindle" :
    isCoCr || isTi ? "wet_through_spindle" :
    isGreenZirconia ? "dry" :
    isPEEK ? "air_blast" : "dry";

  if (strategyType === "3plus2_aaxis") {
    return [
      {
        hyperMillCycle: "5X:5 AXIS Z-level Roughing (3+2 disc)",
        cyclePurpose: "Disc blank roughing — A-axis indexed for each milling side",
        stepoverMm: isSinteredZirconia ? 0.05 : isGreenZirconia ? 0.3 : isCoCr ? 0.15 : 0.2,
        spindleRpm: roughRpm,
        feedRate_mm_min: roughFeed,
        coolant,
      },
      {
        hyperMillCycle: "5X:5 AXIS Equidistant Finishing (3+2 disc)",
        cyclePurpose: "Equidistant finishing on occlusal anatomy — A-axis 3+2 positioning",
        stepoverMm: isSinteredZirconia ? 0.02 : isGreenZirconia ? 0.08 : isCoCr ? 0.05 : 0.06,
        spindleRpm: finishRpm,
        feedRate_mm_min: finishFeed,
        coolant,
      },
      {
        hyperMillCycle: "5X:5 AXIS Z-level Finishing (3+2 margins)",
        cyclePurpose: "Margin line finishing — steep wall Z-level, A-axis tilted for clearance",
        stepoverMm: isSinteredZirconia ? 0.01 : isGreenZirconia ? 0.04 : isCoCr ? 0.02 : 0.03,
        spindleRpm: finishRpm,
        feedRate_mm_min: Math.round(finishFeed * 0.6),
        coolant,
      },
    ];
  }

  if (strategyType === "5axis_simultaneous") {
    return [
      {
        hyperMillCycle: "5X:5 AXIS Z-level Roughing",
        cyclePurpose: "5-axis block blank roughing — Z-level with tilt for undercut clearance",
        stepoverMm: isSinteredZirconia ? 0.05 : isGreenZirconia ? 0.4 : isCoCr ? 0.15 : 0.25,
        spindleRpm: roughRpm,
        feedRate_mm_min: roughFeed,
        coolant,
      },
      {
        hyperMillCycle: "5X:5 AXIS Equidistant Finishing",
        cyclePurpose: "5-axis equidistant finishing — constant scallop on crown anatomy",
        stepoverMm: isSinteredZirconia ? 0.02 : isGreenZirconia ? 0.06 : isCoCr ? 0.04 : 0.05,
        spindleRpm: finishRpm,
        feedRate_mm_min: finishFeed,
        coolant,
      },
      {
        hyperMillCycle: "5X:5 AXIS Profile Finishing",
        cyclePurpose: "5-axis profile finishing — interproximal contact areas and emergence profile",
        stepoverMm: isSinteredZirconia ? 0.015 : isGreenZirconia ? 0.04 : isCoCr ? 0.03 : 0.04,
        spindleRpm: finishRpm,
        feedRate_mm_min: Math.round(finishFeed * 0.5),
        coolant,
      },
    ];
  }

  if (strategyType === "3axis_block") {
    return [
      {
        hyperMillCycle: "3D:Z-Level Roughing",
        cyclePurpose: "3-axis block blank roughing (PMMA/composite — simple geometry)",
        stepoverMm: 0.5,
        spindleRpm: roughRpm,
        feedRate_mm_min: roughFeed,
        coolant: "dry",
      },
      {
        hyperMillCycle: "3D:Equidistant Machining",
        cyclePurpose: "Equidistant finishing — constant scallop on anatomy",
        stepoverMm: 0.1,
        spindleRpm: finishRpm,
        feedRate_mm_min: finishFeed,
        coolant: "dry",
      },
    ];
  }

  // 4axis_disc
  return [
    {
      hyperMillCycle: "3D:Z-Level Roughing (4-axis disc, indexed)",
      cyclePurpose: "4-axis indexed disc blank roughing (PMMA/composite disc format)",
      stepoverMm: 0.4,
      spindleRpm: roughRpm,
      feedRate_mm_min: roughFeed,
      coolant: "dry",
    },
    {
      hyperMillCycle: "3D:Equidistant Machining (4-axis indexed)",
      cyclePurpose: "4-axis indexed disc blank finishing",
      stepoverMm: 0.08,
      spindleRpm: finishRpm,
      feedRate_mm_min: finishFeed,
      coolant: "dry",
    },
  ];
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class HyperMillDentalBlankRouter {
  private calcCount = 0;

  /**
   * Route a dental blank configuration to the optimal hyperMILL strategy.
   *
   * @param input - dental blank configuration
   * @returns DentalBlankRouteResult with strategy, cycles, and compliance notes
   */
  route(input: DentalBlankRouterInput): DentalBlankRouteResult {
    this.calcCount++;
    const { blankType, material, restorationCategory, zirconiaState = "green", millingUnit = "5axis_dental", requiredRa_um = 0.8 } = input;

    const strategyType = routeStrategy(blankType, material, restorationCategory);
    const cycles = getCycles(strategyType, material, zirconiaState);

    // Resolve medical cutting profile
    const medicalKey: MedicalMaterialKey | null = material === "zirconia"
      ? (zirconiaState === "sintered" ? "zirconia_sintered" : "zirconia_green")
      : (DENTAL_TO_MEDICAL_KEY[material] ?? null);

    const medicalProfile = medicalKey
      ? hyperMillMedicalMaterialProfiles.getProfile(medicalKey, "finishing")
      : null;

    // Shrinkage compensation for green zirconia
    const shrinkageCompensation_pct = (material === "zirconia" && zirconiaState === "green")
      ? 22.0  // Typical 20-25%, use 22% midpoint (manufacturer-specific)
      : null;

    const warnings: string[] = [];
    const toolingNotes: string[] = [];
    const complianceNotes: string[] = [];

    // Strategy description
    const strategyDescriptions: Record<DentalStrategyType, string> = {
      "3plus2_aaxis": "3+2 milling with A-axis disc rotation — disc blank positioned to 4+ orientations for full anatomy access",
      "5axis_simultaneous": "5-axis simultaneous milling — full anatomy machined with continuous 5-axis motion for best fit",
      "3axis_block": "3-axis milling — simple block blank, suitable for provisional restorations (PMMA/composite)",
      "4axis_disc": "4-axis indexed disc — simple disc format with indexing rotation (PMMA/composite)",
    };

    // Axis config
    const axisConfigs: Record<DentalStrategyType, string> = {
      "3plus2_aaxis": "A + C axes (or B-axis tilt on 5-axis dental unit) — indexed 3+2 orientation changes",
      "5axis_simultaneous": "X + Y + Z + A + C (or X + Y + Z + B + C) — continuous 5-axis",
      "3axis_block": "X + Y + Z — 3-axis",
      "4axis_disc": "X + Y + Z + A (indexed) — 4-axis",
    };

    // Material-specific tooling
    switch (material) {
      case "zirconia":
        toolingNotes.push("Diamond-coated carbide tools required (ZrO2 destroys conventional carbide rapidly)");
        toolingNotes.push(zirconiaState === "green" ? "Green zirconia: carbide life OK for short runs; diamond preferred" : "Sintered: diamond tools mandatory");
        if (shrinkageCompensation_pct) toolingNotes.push(`Compensate ${shrinkageCompensation_pct}% sintering shrinkage in CAD model before toolpath generation`);
        complianceNotes.push("ISO 6872: Dental ceramic — verify Vickers hardness and flexural strength post-sintering");
        complianceNotes.push("EU MDR Class IIa: Dental ceramic device — biocompatibility data per ISO 10993");
        break;
      case "peek":
        toolingNotes.push("Uncoated carbide or PCD — sharp edge, rake ≥ +10°");
        toolingNotes.push("Air blast coolant preferred — avoid flood (coolant absorption)");
        if (medicalProfile) warnings.push(...medicalProfile.warnings.slice(0, 2));
        complianceNotes.push("ISO 10993-18: PEEK biocompatibility — confirm no thermal degradation during machining");
        break;
      case "cocr":
        toolingNotes.push("PVD TiAlN coated carbide — climb milling ONLY (work hardening risk)");
        toolingNotes.push("Through-spindle coolant at 50+ bar — CoCr is ISO S group: kc1.1=2800 N/mm²");
        if (medicalProfile) warnings.push(...medicalProfile.warnings.slice(0, 2));
        complianceNotes.push("ASTM F75/F1537: CoCr medical device — document full material cert + heat number");
        complianceNotes.push("FDA 21 CFR 820.70: Controlled production conditions — coolant type must be documented");
        break;
      case "titanium_gr5":
        toolingNotes.push("PVD AlCrN coated carbide — climb milling mandatory, through-spindle coolant required");
        if (medicalProfile) warnings.push(...medicalProfile.warnings.slice(0, 2));
        complianceNotes.push("ASTM F136 Ti-6Al-4V ELI: Implant titanium — Ra < 0.8µm for abutment interfaces");
        break;
      case "pmma":
        toolingNotes.push("Sharp uncoated carbide — high RPM (>30000), dry or air blast, excellent chip evacuation");
        toolingNotes.push("PMMA is provisional material — not for permanent restorations");
        break;
    }

    // Surface finish check
    if (requiredRa_um < 0.8 && (material === "cocr" || material === "titanium_gr5")) {
      warnings.push(`Ra ${requiredRa_um} µm requirement — add electrolytic polishing step after milling for implant-grade metal`);
    }

    // hyperMILL settings
    const machiningTolerance_mm = material === "zirconia" && zirconiaState === "sintered" ? 0.005
      : material === "cocr" || material === "titanium_gr5" ? 0.008
      : 0.01;

    const hyperMillSettings = {
      machiningTolerance_mm,
      climbMilling: material === "cocr" || material === "titanium_gr5",
      coolantType: ["cocr", "titanium_gr5"].includes(material) ? "through_spindle"
        : material === "peek" ? "air_blast"
        : material === "zirconia" && zirconiaState === "sintered" ? "through_spindle_wet"
        : "dry",
      maxSpindleRpm: material === "zirconia" && zirconiaState === "sintered" ? 20000
        : material === "cocr" ? 30000
        : 60000,
    };

    return {
      strategyType,
      strategyDescription: strategyDescriptions[strategyType],
      axisConfig: axisConfigs[strategyType],
      cycles,
      shrinkageCompensation_pct,
      toolingNotes,
      hyperMillSettings,
      complianceNotes,
      warnings,
    };
  }

  stats(): { calculations: number } {
    return { calculations: this.calcCount };
  }
}

export const hyperMillDentalBlankRouter = new HyperMillDentalBlankRouter();

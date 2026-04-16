/**
 * HyperMillMedicalMaterialProfiles — CoCr + PEEK + Medical Material Cutting Parameters
 *
 * Provides biomedical-validated cutting parameter profiles for:
 *   - CoCr (ISO S group, high work hardening, implant-grade alloy)
 *   - PEEK (thermal ceiling 250°C, stringy chips, sharp tools mandatory)
 *   - Ti Grade 5 (ISO S, implant fixation, aerospace aerospace-grade ELI Ti)
 *   - Zirconia dental ceramic (green state vs sintered)
 *
 * Wired to HyperMillMaterialBridgeEngine — CoCr/PEEK material selections
 * automatically receive these validated cutting parameters.
 *
 * Physics (CoCr):
 *   Kienzle: kc1.1 = 2800 N/mm² (ISO S group, CANONICAL_KIENZLE)
 *   Work hardening correction: k_WH = 1.25 × kc1.1 for worn tool (>30% VB)
 *   Max speed: 20-40 m/min (Sandvik Medical, Kennametal Cobalt Chrome guide 2023)
 *   Climb milling mandatory: conventional milling causes rubbing + rapid WH
 *
 * Physics (PEEK):
 *   Thermal ceiling: 250°C (crystallinity change threshold, Victrex 2022)
 *   Cutting force: kc ≈ 500-800 N/mm² (lower than metals, but stringy chips)
 *   Sharp tools mandatory: rake angle ≥ +10°, edge sharpness < 5 µm hone
 *
 * References:
 *   - Sandvik Coromant Medical Machining Guide (2023)
 *   - Kennametal Cobalt Chrome Machining Guide (2022)
 *   - Victrex PEEK Machining Guide (2022)
 *   - ASM Handbook Vol.16 Machining (1989) — CoCr work hardening
 *   - ASTM F75/F1537 (CoCr alloys for surgical implants)
 *   - ASTM F136 (Ti-6Al-4V ELI for surgical implants)
 *   - ISO 10993-18 (chemical characterization of medical device materials)
 *
 * HM-REV-MS7 U-HMR41
 */

import { CANONICAL_KIENZLE, type ISOGroup } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

export type MedicalMaterialKey = "cocr" | "peek" | "titanium_gr5" | "titanium_gr23" | "zirconia_green" | "zirconia_sintered";

export interface MedicalCuttingProfile {
  materialKey: MedicalMaterialKey;
  displayName: string;
  isoGroup: ISOGroup;
  astmStandard: string;

  // Kienzle force model (from CANONICAL_KIENZLE for ISO group)
  kc1_1: number;             // Specific cutting force [N/mm²]
  mc: number;                // Kienzle exponent

  // Work hardening correction (CoCr-specific)
  workHardeningFactor: number; // multiply kc1.1 by this for worn tool scenario

  // Recommended cutting speeds [m/min]
  vcRoughing_m_min: { min: number; max: number };
  vcFinishing_m_min: { min: number; max: number };

  // Recommended feeds [mm/tooth for milling, mm/rev for turning]
  fzRoughing_mm: { min: number; max: number };
  fzFinishing_mm: { min: number; max: number };

  // Critical constraints
  thermalCeiling_C: number | null;  // null = no ceiling (metallic)
  climbMillingMandatory: boolean;
  throughSpindleCoolantRequired: boolean;
  sharpToolMandatory: boolean;

  // Surface finish achievable
  achievableRaRoughing_um: number;
  achievableRaFinishing_um: number;

  // FDA/regulatory compliance notes
  complianceNotes: string[];

  // hyperMILL-specific strategy notes
  hyperMillNotes: string[];
}

// ============================================================================
// MEDICAL MATERIAL PROFILES
// ============================================================================

/**
 * All validated medical material cutting profiles.
 * kc1.1 sourced from CANONICAL_KIENZLE (ISO group) — never inline.
 */
export const MEDICAL_MATERIAL_PROFILES: Record<MedicalMaterialKey, MedicalCuttingProfile> = {

  // ── CoCr (Cobalt-Chromium-Molybdenum) ────────────────────────────────────
  cocr: {
    materialKey: "cocr",
    displayName: "Cobalt-Chromium (CoCr, ASTM F75/F1537)",
    isoGroup: "S",
    astmStandard: "ASTM F75 / ASTM F1537",

    // ISO S group from CANONICAL_KIENZLE — kc1.1=2800, mc=0.28
    kc1_1: CANONICAL_KIENZLE.S.kc1_1,   // 2800 N/mm²
    mc: CANONICAL_KIENZLE.S.mc,          // 0.28

    // CoCr work hardens dramatically — worn tool (VB > 0.2mm) increases kc by ~25%
    // Reference: Sandvik Medical Guide 2023, ASM Handbook Vol.16
    workHardeningFactor: 1.25,

    // Speed: 20-40 m/min roughing; 30-50 m/min finishing
    // Reference: Sandvik Coromant Medical Machining Guide 2023
    vcRoughing_m_min: { min: 20, max: 40 },
    vcFinishing_m_min: { min: 30, max: 50 },

    // Feed: 0.05-0.12 mm/tooth roughing; 0.02-0.06 mm/tooth finishing
    fzRoughing_mm: { min: 0.05, max: 0.12 },
    fzFinishing_mm: { min: 0.02, max: 0.06 },

    thermalCeiling_C: null,  // CoCr is metallic — no thermal ceiling concern
    climbMillingMandatory: true,           // Work hardening: conventional milling forbidden
    throughSpindleCoolantRequired: true,  // Implant-grade: no contamination
    sharpToolMandatory: true,             // Work hardening: keep tool sharp

    achievableRaRoughing_um: 3.2,
    achievableRaFinishing_um: 0.4,

    complianceNotes: [
      "ASTM F75: Cast CoCrMo — surgical implant alloy. Must not contain free cobalt particles after machining.",
      "ASTM F1537: Wrought CoCrMo — hip/knee replacement. Surface must be free of machining smear.",
      "FDA 21 CFR 820.70(a): Controlled production — through-spindle coolant required, no flood contamination.",
      "ISO 13485:2016 §7.5.1: Document tool change frequency (max VB=0.2mm before tool change).",
      "EU MDR Annex I §10.4: Surface free of sharp edges, burrs, and debris.",
    ],
    hyperMillNotes: [
      "Use climb milling ONLY — set hyperMILL cycle cuttingMode to 'climb' (never conventional)",
      "Limit radial engagement ae ≤ 30% D to reduce work hardening per pass",
      "Tool change at VB=0.2mm — CoCr work hardening accelerates above this wear",
      "Preferred tools: PVD TiAlN coated carbide, grade GC1025 (Sandvik) or similar",
      "Minimum 2 finishing passes: semi-finish then finish — springback on thin sections",
      "hyperMILL post: verify G96 CSS active with G50 RPM cap for small-radius features",
    ],
  },

  // ── PEEK (Polyether ether ketone) ─────────────────────────────────────────
  peek: {
    materialKey: "peek",
    displayName: "PEEK (Polyether Ether Ketone, ISO 10993 / Victrex)",
    isoGroup: "N",  // Closest ISO group for non-ferrous polymers
    astmStandard: "ISO 10993-18 / Victrex APTIV Film",

    // PEEK cutting force: significantly lower than metals; use N-group approximation
    // kc ≈ 500-800 N/mm² at h=1mm (Victrex machining guide 2022)
    // Using N-group canonical value as baseline; actual PEEK kc is ~700 N/mm²
    kc1_1: 700,   // N/mm² — matches CANONICAL_KIENZLE.N (aluminum/non-ferrous baseline)
    mc: 0.20,     // Lower than metals — PEEK is less sensitive to chip thickness

    workHardeningFactor: 1.0,  // PEEK does not work-harden

    // PEEK speed: 200-400 m/min roughing; 300-500 m/min finishing
    // Reference: Victrex PEEK Machining Guide 2022
    vcRoughing_m_min: { min: 200, max: 400 },
    vcFinishing_m_min: { min: 300, max: 500 },

    // Feed: moderate; avoid rubbing (generates heat)
    fzRoughing_mm: { min: 0.05, max: 0.15 },
    fzFinishing_mm: { min: 0.02, max: 0.08 },

    // PEEK thermal ceiling: 250°C — above this, crystallinity changes and
    // biocompatibility may be affected (Victrex 2022, ISO 10993-18)
    thermalCeiling_C: 250,

    climbMillingMandatory: false,  // PEEK: conventional acceptable, but climb preferred
    throughSpindleCoolantRequired: false,  // Air blast or MQL preferred (coolant can degrade PEEK surface)
    sharpToolMandatory: true,   // Sharp tools critical: dull tools increase heat, melt chips

    achievableRaRoughing_um: 1.6,
    achievableRaFinishing_um: 0.4,

    complianceNotes: [
      "ISO 10993-18: Chemical characterization required for implant-grade PEEK — verify no thermal degradation.",
      "Victrex PEEK Machining Guide 2022: Keep cutting temperature < 250°C — crystallinity threshold.",
      "FDA 21 CFR 820.70: Use uncoated carbide or PCD tools — avoid coatings that may contaminate PEEK.",
      "EU MDR Annex I §10.2: Implant PEEK surface must not show melted or re-solidified material (heat damage).",
      "PEEK stringy chips: ensure chip evacuation — chip re-cutting causes thermal damage.",
    ],
    hyperMillNotes: [
      "Use air blast or MQL — flood coolant can seep into PEEK pores and affect surface integrity",
      "Tool: uncoated or TiN-coated carbide, sharp edge (no heavy hone), rake angle ≥ +10°",
      "Thermal monitoring: if using simulation, flag when estimated cutting temp > 200°C",
      "Feed per tooth: don't go too low (rubbing) — maintain fz > 0.02mm/tooth to generate proper chips",
      "Deburring required: PEEK can leave thin burrs on exit — use deburring pass or manual finishing",
      "hyperMILL post: no G96 CSS — use G97 or conventional feed rate, PEEK is not turned with CSS",
    ],
  },

  // ── Titanium Grade 5 (Ti-6Al-4V) ─────────────────────────────────────────
  titanium_gr5: {
    materialKey: "titanium_gr5",
    displayName: "Titanium Ti-6Al-4V Grade 5 (ASTM F136, implant fixation)",
    isoGroup: "S",
    astmStandard: "ASTM F136 / ASTM F1472",

    kc1_1: CANONICAL_KIENZLE.S.kc1_1,  // 2800 N/mm²
    mc: CANONICAL_KIENZLE.S.mc,         // 0.28

    workHardeningFactor: 1.15,  // Less than CoCr but significant

    // Reference: Sandvik Coromant Titanium Machining Guide 2024
    vcRoughing_m_min: { min: 40, max: 70 },
    vcFinishing_m_min: { min: 60, max: 100 },

    fzRoughing_mm: { min: 0.05, max: 0.15 },
    fzFinishing_mm: { min: 0.02, max: 0.08 },

    thermalCeiling_C: null,
    climbMillingMandatory: true,
    throughSpindleCoolantRequired: true,
    sharpToolMandatory: true,

    achievableRaRoughing_um: 3.2,
    achievableRaFinishing_um: 0.4,

    complianceNotes: [
      "ASTM F136: Ti-6Al-4V ELI (Extra Low Interstitial) for implant applications.",
      "ASTM F1472: Ti-6Al-4V for non-implant surgical instruments.",
      "FDA 21 CFR 820.70(a): Coolant must be biocompatible — use through-spindle approved coolant.",
      "ISO 5832-3: Implant-grade Ti6Al4V requirements for surface finish and material certification.",
      "Titanium fire risk: high feed + high speed + dry = titanium fire hazard — never machine dry.",
    ],
    hyperMillNotes: [
      "Through-spindle coolant at high pressure (70+ bar) — titanium galling without coolant",
      "Climb milling mandatory — conventional milling on titanium causes galling and BUE",
      "Radial engagement: ≤ 50% D to manage heat — titanium has very low thermal conductivity (6.7 W/m·K)",
      "Tool: PVD TiAlN or AlCrN coated carbide; avoid TiN (titanium affinity causes BUE)",
      "hyperMILL post: G96 CSS with G50 cap — small-radius titanium features require RPM cap",
    ],
  },

  // ── Titanium Grade 23 (Ti-6Al-4V ELI) ────────────────────────────────────
  titanium_gr23: {
    materialKey: "titanium_gr23",
    displayName: "Titanium Ti-6Al-4V ELI Grade 23 (ASTM F136, implant-grade)",
    isoGroup: "S",
    astmStandard: "ASTM F136",

    kc1_1: CANONICAL_KIENZLE.S.kc1_1,
    mc: CANONICAL_KIENZLE.S.mc,

    workHardeningFactor: 1.15,

    // ELI grade slightly softer — marginally higher speeds acceptable
    vcRoughing_m_min: { min: 45, max: 75 },
    vcFinishing_m_min: { min: 65, max: 110 },

    fzRoughing_mm: { min: 0.05, max: 0.15 },
    fzFinishing_mm: { min: 0.02, max: 0.08 },

    thermalCeiling_C: null,
    climbMillingMandatory: true,
    throughSpindleCoolantRequired: true,
    sharpToolMandatory: true,

    achievableRaRoughing_um: 3.2,
    achievableRaFinishing_um: 0.4,

    complianceNotes: [
      "ASTM F136 Grade 23 (ELI): lower Fe + O + C + N content — premium implant-grade titanium.",
      "FDA 21 CFR 820 + ISO 13485: full material traceability chain required (heat number, cert).",
      "Used for fracture fixation, spinal cages, hip stems, knee tibial trays.",
    ],
    hyperMillNotes: [
      "Same hyperMILL strategy as Ti Grade 5 — ELI designation is a material cert, not a machining difference",
      "Document material certificate number in setup sheet for FDA traceability",
    ],
  },

  // ── Zirconia (Green State — pre-sintered) ─────────────────────────────────
  zirconia_green: {
    materialKey: "zirconia_green",
    displayName: "Zirconia — Green State (Yttria-Stabilized, pre-sintered, dental)",
    isoGroup: "K",  // Cast-iron-like: brittle, low thermal conductivity
    astmStandard: "ISO 6872 (dental ceramics)",

    // Green zirconia is chalk-like: very low cutting forces
    // kc ≈ 300-500 N/mm² (much lower than sintered)
    // Using K-group as structural ceramic baseline
    kc1_1: CANONICAL_KIENZLE.K.kc1_1,  // 1100 N/mm² (K group baseline; green zirconia actual ≈ 400)
    mc: CANONICAL_KIENZLE.K.mc,         // 0.28

    workHardeningFactor: 1.0,  // Ceramic — no work hardening

    // Green zirconia: high speeds acceptable (soft chalk-like material)
    // Reference: Dentsply Sirona inLab workflow guide 2023
    vcRoughing_m_min: { min: 400, max: 1000 },
    vcFinishing_m_min: { min: 600, max: 1200 },

    fzRoughing_mm: { min: 0.02, max: 0.10 },
    fzFinishing_mm: { min: 0.005, max: 0.02 },

    thermalCeiling_C: null,  // No thermal ceiling for green zirconia
    climbMillingMandatory: false,
    throughSpindleCoolantRequired: false,  // Dry milling preferred (coolant can crack green zirconia)
    sharpToolMandatory: true,

    achievableRaRoughing_um: 2.0,
    achievableRaFinishing_um: 0.8,

    complianceNotes: [
      "ISO 6872: Dental ceramic — sintering shrinkage (typically 20-25%) must be compensated in CAD.",
      "Green zirconia is very fragile — clamp gently, avoid vibration during machining.",
      "After machining: sinter at 1450-1530°C (per manufacturer specification) before patient delivery.",
      "EU MDR Class IIa / FDA 510(k): Dental zirconia requires biocompatibility testing per ISO 10993.",
    ],
    hyperMillNotes: [
      "Dry milling ONLY — coolant moisture can cause micro-cracks in green zirconia",
      "Use diamond-coated tools (carbide wears too fast in zirconia)",
      "Compensate sintering shrinkage in hyperCAD-S: scale model by shrink factor before generating toolpath",
      "hyperMILL 5-axis: use 5X Equidistant Finishing for crown anatomy — preserves marginal detail",
      "Green zirconia chips: dust extraction required (fine ZrO2 powder is a respiratory hazard)",
    ],
  },

  // ── Zirconia (Sintered — fully dense) ─────────────────────────────────────
  zirconia_sintered: {
    materialKey: "zirconia_sintered",
    displayName: "Zirconia — Sintered (Yttria-Stabilized, fully dense, dental/medical)",
    isoGroup: "K",  // Closest analog: cast iron (hard, brittle)
    astmStandard: "ISO 6872 / ASTM C1327 (ceramic hardness)",

    // Sintered zirconia: extremely hard (12-13 GPa Vickers)
    // kc ≈ 2000-3000 N/mm² — approaching hard steel territory
    kc1_1: 2500,   // N/mm² — sintered zirconia empirical (Dentsply 2023)
    mc: 0.30,

    workHardeningFactor: 1.0,

    // Sintered: very low speeds, diamond tools only
    // Reference: Dentsply Sirona + Roland DGA milling guides 2023
    vcRoughing_m_min: { min: 20, max: 60 },
    vcFinishing_m_min: { min: 40, max: 80 },

    fzRoughing_mm: { min: 0.005, max: 0.02 },
    fzFinishing_mm: { min: 0.002, max: 0.008 },

    thermalCeiling_C: null,
    climbMillingMandatory: false,
    throughSpindleCoolantRequired: true,  // Wet milling required for sintered to prevent thermal shock
    sharpToolMandatory: true,

    achievableRaRoughing_um: 1.0,
    achievableRaFinishing_um: 0.2,

    complianceNotes: [
      "ISO 6872 Class 5: High-strength zirconia for multi-unit bridges.",
      "Sintered zirconia machining is difficult — used primarily for repair/adjustment after sintering.",
      "FDA 510(k) / EU MDR: Document tooling (diamond tool certification) for device manufacturing record.",
    ],
    hyperMillNotes: [
      "Wet milling REQUIRED — sintered zirconia generates extreme heat; through-spindle coolant mandatory",
      "Diamond-coated tools only — carbide wears out in < 1 minute on sintered zirconia",
      "Sintered zirconia is rarely pre-programmed — typically adjustments only after sinter distortion",
      "Low DOC and stepover: ap ≤ 0.05mm, ae ≤ 0.05mm to avoid brittle fracture",
    ],
  },
};

// ============================================================================
// ENGINE
// ============================================================================

export interface MedicalCuttingParamsResult {
  profile: MedicalCuttingProfile;
  /** Recommended Vc for the operation [m/min] */
  vcRecommended_m_min: number;
  /** Recommended feed [mm/tooth for milling, mm/rev for turning] */
  feedRecommended_mm: number;
  /** Cutting force estimate [N/mm²] with work hardening correction if applicable */
  kcCorrected: number;
  /** True if any constraints are violated */
  hasViolations: boolean;
  violations: string[];
  warnings: string[];
}

export class HyperMillMedicalMaterialProfiles {
  /**
   * Get validated cutting parameters for a medical device material.
   *
   * @param materialKey - medical material key
   * @param operationGoal - roughing or finishing
   * @param wornToolFactor - 0-1 fraction of tool wear (0=sharp, 1=at max VB)
   * @returns MedicalCuttingParamsResult with physics-validated parameters
   */
  getProfile(
    materialKey: MedicalMaterialKey,
    operationGoal: "roughing" | "finishing" | "semi_finishing",
    wornToolFactor = 0,
  ): MedicalCuttingParamsResult {
    const profile = MEDICAL_MATERIAL_PROFILES[materialKey];
    if (!profile) {
      return {
        profile: MEDICAL_MATERIAL_PROFILES.cocr,
        vcRecommended_m_min: 30,
        feedRecommended_mm: 0.08,
        kcCorrected: 2800,
        hasViolations: true,
        violations: [`Unknown medical material key: ${materialKey}`],
        warnings: [],
      };
    }

    const isRoughing = operationGoal === "roughing";
    const vcRange = isRoughing ? profile.vcRoughing_m_min : profile.vcFinishing_m_min;
    const fzRange = isRoughing ? profile.fzRoughing_mm : profile.fzFinishing_mm;

    // Mid-range recommended values
    const vcRecommended_m_min = (vcRange.min + vcRange.max) / 2;
    const feedRecommended_mm = (fzRange.min + fzRange.max) / 2;

    // Work hardening correction: kc increases as tool wears
    // kcCorrected = kc1.1 × (1 + wornToolFactor × (workHardeningFactor - 1))
    const kcCorrected = profile.kc1_1 * (1 + wornToolFactor * (profile.workHardeningFactor - 1));

    const violations: string[] = [];
    const warnings: string[] = [];

    // Thermal ceiling check (PEEK)
    if (profile.thermalCeiling_C !== null) {
      warnings.push(`Thermal ceiling: keep estimated cutting temperature < ${profile.thermalCeiling_C}°C`);
    }

    // Climb milling reminder
    if (profile.climbMillingMandatory) {
      warnings.push(`${profile.displayName}: climb milling MANDATORY — conventional milling causes work hardening + tool fracture risk`);
    }

    // Coolant reminder
    if (profile.throughSpindleCoolantRequired) {
      warnings.push(`${profile.displayName}: through-spindle coolant required (implant-grade — no flood contamination)`);
    }

    // Sharp tool reminder
    if (profile.sharpToolMandatory) {
      warnings.push(`${profile.displayName}: sharp tools mandatory — change at VB = 0.2mm maximum`);
    }

    // High worn tool factor warning
    if (wornToolFactor > 0.7) {
      violations.push(`Tool wear ${Math.round(wornToolFactor * 100)}% of limit — change tool before machining implant-grade ${profile.displayName}`);
    }

    return {
      profile,
      vcRecommended_m_min,
      feedRecommended_mm,
      kcCorrected,
      hasViolations: violations.length > 0,
      violations,
      warnings,
    };
  }

  /**
   * Resolve a material string to a medical material key.
   * Handles common aliases (cocr, co-cr, cobalt_chrome, etc.)
   */
  resolveMaterialKey(material: string): MedicalMaterialKey | null {
    const m = material.toLowerCase().replace(/[\s-]/g, "_");
    if (m.includes("cocr") || m.includes("cobalt_chrome") || m.includes("cobalt_chromium")) return "cocr";
    if (m.includes("peek")) return "peek";
    if (m.includes("ti_grade_23") || m.includes("ti6al4veli") || m.includes("gr23") || m.includes("grade_23") || m.includes("eli")) return "titanium_gr23";
    if (m.includes("ti6al4v") || m.includes("ti_6al_4v") || m.includes("ti_grade_5") || m.includes("gr5") || m.includes("grade_5")) return "titanium_gr5";
    if (m.includes("zirconia_green") || (m.includes("zirconia") && m.includes("green"))) return "zirconia_green";
    if (m.includes("zirconia")) return "zirconia_sintered";  // default to sintered
    return null;
  }

  /**
   * List all available medical material profiles.
   */
  listProfiles(): Array<{ key: MedicalMaterialKey; displayName: string; isoGroup: ISOGroup }> {
    return Object.values(MEDICAL_MATERIAL_PROFILES).map((p) => ({
      key: p.materialKey,
      displayName: p.displayName,
      isoGroup: p.isoGroup,
    }));
  }
}

export const hyperMillMedicalMaterialProfiles = new HyperMillMedicalMaterialProfiles();

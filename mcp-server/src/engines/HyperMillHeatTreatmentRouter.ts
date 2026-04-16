/**
 * HyperMillHeatTreatmentRouter — Heat treatment routing for hyperMILL operations
 *
 * Examines part material and hardness requirements to determine required heat
 * treatment steps and insert them at the correct point in the machining sequence:
 *
 *   1. Pre-machine anneal — if material arrives work-hardened or as-cast
 *   2. Stress relief       — after heavy roughing (prevents distortion)
 *   3. Through harden      — before finish grinding (achieve final hardness)
 *   4. Case harden         — carburize/nitride before final finish
 *
 * Temperature/time/quench parameters from HeatTreatmentEngine (which pulls
 * from material physics DB), not hardcoded.
 *
 * Material certification traceability (U-HMR37):
 *   Each heat treatment step produces a CertLink that chains:
 *     MaterialCert → HeatTreatCert → InspectionCert
 *   in a format compatible with MS10 quality chain and AS9102 FAI requirements.
 *
 * Sources:
 *   - ASM Handbook Vol. 4 "Heat Treating" (1991)
 *   - ASTM A255 — Determining Hardenability of Steel
 *   - AS9102B — First Article Inspection Requirements (cert chain format)
 *   - HeatTreatmentEngine (PRISM) — temperature/time/quench parameters
 *
 * HM-REV-MS6 / U-HMR35 + U-HMR37
 */

import {
  heatTreatmentEngine,
  type HeatTreatmentInput,
  type HeatTreatmentResult,
} from "./HeatTreatmentEngine.js";

// ============================================================================
// Types
// ============================================================================

export type HeatTreatType =
  | "anneal"
  | "stress_relief"
  | "through_harden"
  | "case_harden_carburize"
  | "case_harden_nitride"
  | "age_harden"
  | "normalize";

export type HeatTreatTiming =
  | "before_rough"     // anneal before any material removal
  | "after_rough"      // stress relief after roughing
  | "before_finish"    // harden before semi-finish / finish
  | "after_finish"     // age harden / nitride after finish
  | "before_grind"     // harden before precision grinding
  | "after_grind";     // final stress relief after grinding

export interface MaterialHeatTreatProfile {
  /** Material identifier */
  material: string;
  /** Carbon content [%] — drives austenitizing temp */
  carbonPct?: number;
  /** Alloy class */
  alloyClass?: "plain_carbon" | "low_alloy" | "tool_steel" | "stainless" | "nickel_alloy" | "aluminum" | "titanium";
  /** Part section thickness [mm] — affects quench selection */
  sectionThickness_mm?: number;
  /** Required final hardness [HRC] */
  requiredHardness_hrc?: number;
  /** Required case depth [mm] — for case hardening */
  requiredCaseDepth_mm?: number;
  /** Is material currently work-hardened / as-cast? */
  isWorkHardened?: boolean;
  /** Heavy roughing planned (> 5mm stock removal)? */
  heavyRoughingPlanned?: boolean;
  /** Finish grinding required (implies: harden before grind)? */
  finishGrindingRequired?: boolean;
}

export interface HeatTreatStep {
  /** Step index in sequence (0-based) */
  stepIndex: number;
  /** Heat treatment type */
  type: HeatTreatType;
  /** When in the machining sequence this step occurs */
  timing: HeatTreatTiming;
  /** Description for the machinist / heat treat shop */
  description: string;
  /** Austenitizing / soak temperature [°C] */
  temperature_C: number;
  /** Soak/hold time [min] */
  holdTime_min: number;
  /** Quench medium */
  quenchMedium: string;
  /** Temper temperature [°C] (if applicable) */
  temperTemp_C?: number;
  /** Temper time [min] (if applicable) */
  temperTime_min?: number;
  /** Predicted hardness after this step [HRC] */
  predictedHardness_hrc: number;
  /** Case depth achieved [mm] (for case hardening) */
  caseDepth_mm?: number;
  /** Material certification link */
  certLink: HeatTreatCertLink;
  /** Warnings */
  warnings: string[];
}

export interface HeatTreatCertLink {
  /** Certification document type */
  certType: "material_cert" | "heat_treat_cert" | "inspection_cert";
  /** Chain position: material_cert → heat_treat_cert → inspection_cert */
  chainPosition: 1 | 2 | 3;
  /** Required data fields for traceability */
  requiredFields: string[];
  /** AS9102 form reference */
  as9102Reference: string;
  /** Whether this cert is required for flight/safety-critical parts */
  requiredForAerospace: boolean;
}

export interface HeatTreatmentRouteResult {
  /** Material analyzed */
  material: string;
  /** Heat treatment steps in sequence order */
  steps: HeatTreatStep[];
  /** Whether any heat treatment is required */
  treatmentRequired: boolean;
  /** Summary of the treatment sequence */
  sequenceSummary: string;
  /** Complete certification chain */
  certificationChain: CertificationChain;
  /** Estimated total heat treatment time [hours] */
  totalHeatTreatTime_h: number;
  /** Warnings */
  warnings: string[];
  /** Confidence 0–1 */
  confidence: number;
  /** Source */
  source: string;
}

export interface CertificationChain {
  /** Material certificate — documents incoming material */
  materialCert: CertDocument;
  /** Heat treat certificate — documents each process step */
  heatTreatCerts: CertDocument[];
  /** Final inspection certificate */
  inspectionCert: CertDocument;
  /** AS9102 FAI compatible */
  as9102Compatible: true;
}

export interface CertDocument {
  /** Document type */
  type: "material_cert" | "heat_treat_cert" | "inspection_cert";
  /** Required data fields */
  requiredFields: string[];
  /** Optional fields */
  optionalFields: string[];
  /** Standard reference */
  standardReference: string;
  /** Description */
  description: string;
}

// ============================================================================
// Heat treatment trigger thresholds
// ============================================================================

/** Hardness [HRC] above which through hardening is typically required before grinding */
const HARDEN_BEFORE_GRIND_HRC = 55;

/** Hardness [HRC] above which case hardening is appropriate */
const CASE_HARDEN_MIN_HRC = 40;

/** Stock removal [mm] above which stress relief is recommended after roughing */
const STRESS_RELIEF_STOCK_MM = 5.0;

/** Materials that require pre-machine annealing if work-hardened */
const ANNEAL_REQUIRED_MATERIALS = new Set([
  "d2_tool_steel", "d2", "h13", "m2", "tool_steel", "hardened_steel",
  "718", "inconel_718", "nickel_alloy", "stainless",
]);

// ============================================================================
// Certification chain definitions (AS9102B format)
// ============================================================================

const MATERIAL_CERT_DOC: CertDocument = {
  type: "material_cert",
  requiredFields: [
    "material_lot_number",
    "alloy_designation",
    "heat_number",
    "mechanical_properties",
    "chemical_composition",
    "mill_test_report_number",
    "supplier_name",
    "receipt_date",
  ],
  optionalFields: [
    "ultrasonic_test_report",
    "hardness_at_receipt",
    "grain_size_ASTM",
  ],
  standardReference: "AMS 2750 / EN 10204 Type 3.1",
  description: "Incoming material certification — must accompany raw material from mill/supplier",
};

const INSPECTION_CERT_DOC: CertDocument = {
  type: "inspection_cert",
  requiredFields: [
    "part_number",
    "serial_number",
    "final_hardness_hrc",
    "dimensional_report",
    "surface_finish_report",
    "inspector_id",
    "inspection_date",
    "equipment_calibration_ids",
  ],
  optionalFields: [
    "magnetic_particle_test",
    "penetrant_test",
    "x_ray_report",
    "fatigue_coupon_results",
  ],
  standardReference: "AS9102B §6",
  description: "Final inspection certificate — dimensional + hardness + surface finish verification",
};

// ============================================================================
// Engine
// ============================================================================

export class HyperMillHeatTreatmentRouter {

  /**
   * Determine required heat treatment steps for a hyperMILL operation.
   *
   * @param profile - Material profile + hardness requirements + process context
   * @returns Heat treatment steps in sequence order, cert chain, time estimate
   */
  calculate(profile: MaterialHeatTreatProfile): HeatTreatmentRouteResult {
    const warnings: string[] = [];
    const steps: HeatTreatStep[] = [];

    const {
      material,
      carbonPct = this._estimateCarbonPct(material),
      alloyClass = this._inferAlloyClass(material),
      sectionThickness_mm = 25,
      requiredHardness_hrc,
      requiredCaseDepth_mm,
      isWorkHardened = false,
      heavyRoughingPlanned = false,
      finishGrindingRequired = false,
    } = profile;

    // ── Step 1: Pre-machine anneal ────────────────────────────────────────────
    if (isWorkHardened || ANNEAL_REQUIRED_MATERIALS.has(material.toLowerCase())) {
      const htResult = this._callHeatTreatEngine({
        steel_grade: material,
        carbon_pct: carbonPct,
        alloy_class: alloyClass as any,
        process: "anneal",
        section_thickness_mm: sectionThickness_mm,
      });
      steps.push(this._makeStep(0, "anneal", "before_rough", material, htResult,
        "Anneal material before rough machining to relieve prior work hardening and improve machinability"));
    }

    // ── Step 2: Stress relief after heavy roughing ────────────────────────────
    if (heavyRoughingPlanned) {
      const htResult = this._callHeatTreatEngine({
        steel_grade: material,
        carbon_pct: carbonPct,
        alloy_class: alloyClass as any,
        process: "stress_relief",
        section_thickness_mm: sectionThickness_mm,
      });
      steps.push(this._makeStep(steps.length, "stress_relief", "after_rough", material, htResult,
        `Stress relief after heavy roughing (> ${STRESS_RELIEF_STOCK_MM}mm stock removal) to prevent distortion during finishing`));
    }

    // ── Step 3: Through harden before grind ───────────────────────────────────
    const needsHardening = (requiredHardness_hrc && requiredHardness_hrc >= CASE_HARDEN_MIN_HRC)
      || finishGrindingRequired;

    if (needsHardening && !requiredCaseDepth_mm) {
      // Through hardening (not case hardening)
      const htResult = this._callHeatTreatEngine({
        steel_grade: material,
        carbon_pct: carbonPct,
        alloy_class: alloyClass as any,
        process: "harden_quench",
        section_thickness_mm: sectionThickness_mm,
        target_hardness_hrc: requiredHardness_hrc,
      });

      const timing: HeatTreatTiming = finishGrindingRequired ? "before_grind" : "before_finish";
      steps.push(this._makeStep(steps.length, "through_harden", timing, material, htResult,
        `Through harden to ${requiredHardness_hrc ?? ">55"} HRC before ${finishGrindingRequired ? "finish grinding" : "finishing"}`));

      // Temper step follows quench
      if (htResult.temper_temp.value > 150) {
        const temperStep = this._makeStep(steps.length, "through_harden", timing, material, htResult,
          `Temper at ${Math.round(htResult.temper_temp.value)}°C × ${Math.round(htResult.temper_time_min.value)}min to relieve quench stress`);
        temperStep.type = "through_harden";
        temperStep.description = `Tempering: ${Math.round(htResult.temper_temp.value)}°C × ${Math.round(htResult.temper_time_min.value)}min`;
        temperStep.temperature_C = htResult.temper_temp.value;
        temperStep.holdTime_min = htResult.temper_time_min.value;
        temperStep.quenchMedium = "air_cool";
        temperStep.predictedHardness_hrc = htResult.predicted_hardness.value;
        steps.push(temperStep);
      }
    }

    // ── Step 4: Case hardening (carburize or nitride) ─────────────────────────
    if (requiredCaseDepth_mm && requiredCaseDepth_mm > 0) {
      const isNitride = alloyClass === "stainless" || alloyClass === "nickel_alloy";
      const htResult = this._callHeatTreatEngine({
        steel_grade: material,
        carbon_pct: carbonPct,
        alloy_class: alloyClass as any,
        process: "carburize",
        section_thickness_mm: sectionThickness_mm,
        target_case_depth_mm: requiredCaseDepth_mm,
        target_hardness_hrc: requiredHardness_hrc ?? 60,
      });

      const type: HeatTreatType = isNitride ? "case_harden_nitride" : "case_harden_carburize";
      const timing: HeatTreatTiming = finishGrindingRequired ? "before_grind" : "after_finish";
      steps.push(this._makeStep(steps.length, type, timing, material, htResult,
        `${isNitride ? "Gas nitriding" : "Carburize"} to case depth ${requiredCaseDepth_mm}mm, target surface hardness ${requiredHardness_hrc ?? 60} HRC`));
    }

    // ── Warnings ──────────────────────────────────────────────────────────────
    if (steps.length === 0) {
      warnings.push("No heat treatment required for this material/process combination");
    }
    if (alloyClass === "aluminum" || alloyClass === "titanium") {
      warnings.push(`${alloyClass} alloy: age hardening may be required — verify with material spec`);
    }

    // ── Certification chain ───────────────────────────────────────────────────
    const certificationChain = this._buildCertChain(steps, material);

    // ── Time estimate ─────────────────────────────────────────────────────────
    const totalHeatTreatTime_h = steps.reduce((sum, s) => {
      // Furnace load/unload: 1h, soak, temper, cool: min 2h total per step
      const stepTime = (s.holdTime_min + (s.temperTime_min ?? 0)) / 60 + 2;
      return sum + stepTime;
    }, 0);

    const sequenceSummary = steps.length === 0
      ? "No heat treatment required"
      : steps.map((s, i) => `${i + 1}. [${s.timing}] ${s.description.split(" — ")[0]}`).join(" → ");

    return {
      material,
      steps,
      treatmentRequired: steps.length > 0,
      sequenceSummary,
      certificationChain,
      totalHeatTreatTime_h: Math.round(totalHeatTreatTime_h * 10) / 10,
      warnings,
      confidence: 0.85,
      source: "HeatTreatmentEngine + ASM-Handbook-Vol4 + AS9102B-cert-chain",
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _callHeatTreatEngine(input: HeatTreatmentInput): HeatTreatmentResult {
    return heatTreatmentEngine.calculate(input);
  }

  private _makeStep(
    index: number,
    type: HeatTreatType,
    timing: HeatTreatTiming,
    material: string,
    htResult: HeatTreatmentResult,
    description: string,
  ): HeatTreatStep {
    const certLink: HeatTreatCertLink = {
      certType: "heat_treat_cert",
      chainPosition: 2,
      requiredFields: [
        "furnace_id",
        "operator_id",
        "lot_number",
        "date_time",
        "soak_temp_actual_C",
        "soak_time_actual_min",
        "quench_medium",
        "hardness_after_hrc",
        "process_type",
      ],
      as9102Reference: "AS9102B §6.3.3 (special processes)",
      requiredForAerospace: true,
    };

    return {
      stepIndex: index,
      type,
      timing,
      description,
      temperature_C: Math.round(htResult.austenitize_temp.value),
      holdTime_min: Math.round(htResult.soak_time_min.value),
      quenchMedium: htResult.quench_medium.unit,
      temperTemp_C: htResult.temper_temp.value > 0 ? Math.round(htResult.temper_temp.value) : undefined,
      temperTime_min: htResult.temper_time_min.value > 0 ? Math.round(htResult.temper_time_min.value) : undefined,
      predictedHardness_hrc: Math.round(htResult.predicted_hardness.value),
      caseDepth_mm: htResult.case_depth.value > 0 ? Math.round(htResult.case_depth.value * 100) / 100 : undefined,
      certLink,
      warnings: htResult.warnings ?? [],
    };
  }

  private _buildCertChain(steps: HeatTreatStep[], material: string): CertificationChain {
    const heatTreatCerts: CertDocument[] = steps.map(s => ({
      type: "heat_treat_cert" as const,
      requiredFields: s.certLink.requiredFields,
      optionalFields: ["thermocouple_calibration_cert", "fixture_id", "atmosphere_log"],
      standardReference: s.certLink.as9102Reference,
      description: `Heat treat cert — ${s.type} for ${material}: ${s.description}`,
    }));

    return {
      materialCert: MATERIAL_CERT_DOC,
      heatTreatCerts,
      inspectionCert: INSPECTION_CERT_DOC,
      as9102Compatible: true,
    };
  }

  private _estimateCarbonPct(material: string): number {
    const m = material.toLowerCase();
    if (m.includes("d2") || m.includes("tool_steel")) return 1.5;
    if (m.includes("4140") || m.includes("low_alloy")) return 0.40;
    if (m.includes("52100") || m.includes("bearing")) return 1.0;
    if (m.includes("stainless") || m.includes("316") || m.includes("304")) return 0.06;
    if (m.includes("h13")) return 0.38;
    if (m.includes("m2")) return 0.85;
    return 0.30; // medium carbon default
  }

  private _inferAlloyClass(material: string): HeatTreatmentInput["alloy_class"] {
    const m = material.toLowerCase();
    if (m.includes("stainless") || m.includes("316") || m.includes("304")) return "stainless";
    if (m.includes("d2") || m.includes("h13") || m.includes("m2") || m.includes("tool")) return "tool_steel";
    if (m.includes("4140") || m.includes("4340") || m.includes("8620")) return "low_alloy";
    return "plain_carbon";
  }
}

export const hyperMillHeatTreatmentRouter = new HyperMillHeatTreatmentRouter();

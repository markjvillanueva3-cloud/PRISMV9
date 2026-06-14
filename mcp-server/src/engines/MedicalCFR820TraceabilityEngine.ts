/**
 * MedicalCFR820TraceabilityEngine — FDA 21 CFR §820 + ISO 13485 traceability gate
 *
 * Closes the iter20 P1 "21 CFR Part 820 medical" gap. Medical device manufacturing
 * requires FDA-mandated traceability + process validation + DHR (Device History
 * Record) controls that go beyond aerospace AS9100. Given a part for medical-device
 * customer, classifies:
 *   - Device class (I / II / III per FDA + ISO 13485 §7.5.6)
 *   - Process validation required (OQ/PQ/PV per 21 CFR §820.75)
 *   - Lot/serial traceability (per §820.65 — required for Class II/III + sterile)
 *   - Sterilization compatibility (ISO 11137 gamma / ISO 11135 EO / ISO 17665 steam)
 *   - DHR (Device History Record) maintenance required (§820.184)
 *   - Biocompatibility cert (ISO 10993) for tissue/blood contact
 *   - 510(k) predicate / De Novo / PMA pathway flag
 *   - UDI (Unique Device Identification) marking required
 *
 * Reference: 21 CFR Part 820 (Quality System Regulation); ISO 13485:2016 (Medical
 *   device QMS); 21 CFR §801 + §830 (UDI); 21 CFR §807 (510(k) premarket); ISO
 *   14971 (medical device risk management); ISO 10993-1 (biocompatibility); ISO
 *   11135 / 11137 / 17665 (sterilization); FDA Guidance "Process Validation: General
 *   Principles and Practices" (Jan 2011).
 *
 * @version 1.0.0
 * @module MedicalCFR820TraceabilityEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type DeviceClass = "I" | "II" | "III";
export type ContactType = "no_contact" | "surface_skin" | "mucosal_membrane" | "breached_skin" | "blood_contact" | "implant_short" | "implant_long";
export type SterilizationMethod = "none" | "gamma_radiation" | "ethylene_oxide" | "steam_autoclave" | "e_beam" | "vaporized_h2o2";
export type PremarketPathway = "exempt" | "510k_predicate" | "510k_no_predicate" | "de_novo" | "pma_required";

export interface MedicalTraceabilityInput {
  /** FDA device class — drives nearly all downstream requirements */
  device_class: DeviceClass;
  /** Patient/tissue contact type (drives biocompatibility) */
  contact_type: ContactType;
  /** Sterilization method (if any) */
  sterilization: SterilizationMethod;
  /** Material is bioabsorbable / dissolvable */
  is_bioabsorbable?: boolean;
  /** Part is permanently implanted */
  is_implant?: boolean;
  /** Customer has 510(k) clearance for this device */
  has_510k_clearance?: boolean;
  /** Lot size for the manufacturing run */
  lot_size: number;
  /** Patient population estimate (drives risk-control rigor per ISO 14971) */
  patient_population_per_year?: number;
}

export interface MedicalTraceabilityResult {
  process_validation_required: AtomicValue<boolean>;
  validation_protocol: AtomicValue<string>;  // "IQ_only" / "IQ_OQ" / "IQ_OQ_PQ"
  lot_traceability_required: boolean;
  serial_traceability_required: boolean;
  dhr_required: boolean;
  biocompatibility_cert_required: boolean;
  biocompatibility_iso_tests: string[];   // ISO 10993-N test list
  udi_marking_required: boolean;
  premarket_pathway: AtomicValue<PremarketPathway>;
  /** Estimated FDA submission lead time (months) */
  premarket_lead_months: AtomicValue<number>;
  risk_class_iso14971: AtomicValue<string>;  // "low" / "moderate" / "high"
  warnings: string[];
  source: string;
}

export class MedicalCFR820TraceabilityEngine {
  classify(input: MedicalTraceabilityInput): MedicalTraceabilityResult {
    if (!input || !input.device_class || !input.contact_type || !input.sterilization) {
      throw new Error("MedicalCFR820TraceabilityEngine.classify: device_class + contact_type + sterilization required");
    }
    if (input.lot_size == null || input.lot_size <= 0) {
      throw new Error("MedicalCFR820TraceabilityEngine.classify: positive lot_size required");
    }

    const warnings: string[] = [];
    const cls = input.device_class;

    // ── Process validation (21 CFR §820.75 — "where results not fully verifiable by inspection") ──
    // Class II/III + sterile + implant + bioabsorbable → full IQ_OQ_PQ
    const requiresFullPV =
      cls === "III" ||
      input.is_implant === true ||
      input.is_bioabsorbable === true ||
      (cls === "II" && input.sterilization !== "none");

    const requiresOQ = cls === "II" || cls === "III";
    let validationProtocol: string;
    if (requiresFullPV) {
      validationProtocol = "IQ_OQ_PQ_full";
    } else if (requiresOQ) {
      validationProtocol = "IQ_OQ_only";
    } else {
      validationProtocol = "IQ_only";
    }

    // ── Lot/serial traceability (§820.65) ─────────────────────────────
    const lotTraceability = true;  // ALWAYS required for medical (§820.65 universal)
    const serialTraceability = cls === "III" || input.is_implant === true;

    // ── DHR (§820.184) ────────────────────────────────────────────────
    const dhrRequired = true;  // ALWAYS required for medical (§820.184 universal)

    // ── Biocompatibility (ISO 10993-1 test selection table) ───────────
    const requiresBiocompat = input.contact_type !== "no_contact";
    const bioTests: string[] = [];
    if (requiresBiocompat) {
      bioTests.push("ISO 10993-5 (cytotoxicity)");
      if (input.contact_type === "surface_skin" || input.contact_type === "mucosal_membrane") {
        bioTests.push("ISO 10993-10 (irritation + sensitization)");
      }
      if (input.contact_type === "breached_skin" || input.contact_type === "blood_contact") {
        bioTests.push("ISO 10993-10", "ISO 10993-4 (hemocompatibility)", "ISO 10993-11 (systemic toxicity)");
      }
      if (input.contact_type === "implant_short" || input.contact_type === "implant_long") {
        bioTests.push("ISO 10993-6 (local implant)", "ISO 10993-11 (systemic toxicity)", "ISO 10993-3 (genotoxicity)");
      }
      if (input.contact_type === "implant_long" || input.is_bioabsorbable === true) {
        bioTests.push("ISO 10993-13 (degradation products)", "ISO 10993-17 (toxicokinetics)");
      }
    }

    // ── UDI marking (21 CFR §801 + §830) ──────────────────────────────
    // Class II + III require UDI on label + direct mark (§801.20 + §801.45)
    const udiRequired = cls !== "I" || input.is_implant === true;

    // ── Premarket pathway ─────────────────────────────────────────────
    let pathway: PremarketPathway;
    let leadMonths: number;
    if (cls === "I") {
      pathway = "exempt";
      leadMonths = 0;
    } else if (cls === "II") {
      pathway = input.has_510k_clearance === true ? "510k_predicate" : "510k_no_predicate";
      leadMonths = input.has_510k_clearance === true ? 0 : 6;
    } else {
      // Class III
      pathway = "pma_required";
      leadMonths = 18;  // typical PMA review
    }

    // ── Risk class (ISO 14971 simplification) ─────────────────────────
    let riskClass: string;
    if (cls === "III" || input.is_implant === true) {
      riskClass = "high";
    } else if (cls === "II" || input.sterilization !== "none") {
      riskClass = "moderate";
    } else {
      riskClass = "low";
    }

    // ── Sterilization warnings ────────────────────────────────────────
    if (input.sterilization === "ethylene_oxide" && input.is_bioabsorbable === true) {
      warnings.push("EtO sterilization with bioabsorbable material — residue interaction risk (ISO 10993-7 residuals testing required)");
    }
    if (input.sterilization === "gamma_radiation" && input.is_bioabsorbable === true) {
      warnings.push("Gamma sterilization can degrade bioabsorbable polymers — validate dose vs polymer integrity per ISO 11137");
    }
    if (input.sterilization === "steam_autoclave" && (input.contact_type === "implant_short" || input.contact_type === "implant_long")) {
      warnings.push("Steam autoclave on implant — verify polymer/coating tolerates 121-134°C wet heat (ISO 17665)");
    }

    // ── Class warnings ────────────────────────────────────────────────
    if (cls === "III" && !input.has_510k_clearance) {
      warnings.push("Class III device requires PMA (18+ month FDA review) — verify customer has cleared pathway before production");
    }
    if (input.is_implant === true && !input.has_510k_clearance && cls === "II") {
      warnings.push("Class II implant — confirm 510(k) predicate covers implant indication, not just material");
    }
    if (input.patient_population_per_year !== undefined && input.patient_population_per_year > 100000 && cls === "III") {
      warnings.push(`High patient population ${input.patient_population_per_year}/yr × Class III — PMSF (post-market surveillance) likely required per 21 CFR §822`);
    }

    return {
      process_validation_required: {
        value: requiresFullPV || requiresOQ,
        unit: "boolean",
        source: "21 CFR §820.75 + FDA Process Validation Guidance 2011",
      },
      validation_protocol: {
        value: validationProtocol,
        unit: "protocol",
        source: "ISO 13485 §7.5.6 + 21 CFR §820.75",
      },
      lot_traceability_required: lotTraceability,
      serial_traceability_required: serialTraceability,
      dhr_required: dhrRequired,
      biocompatibility_cert_required: requiresBiocompat,
      biocompatibility_iso_tests: bioTests,
      udi_marking_required: udiRequired,
      premarket_pathway: {
        value: pathway,
        unit: "FDA pathway",
        source: "21 CFR §807 (510(k)) / §814 (PMA)",
      },
      premarket_lead_months: {
        value: leadMonths,
        unit: "months",
        source: "FDA review-time typical (510(k) 3-6mo / PMA 12-18mo)",
      },
      risk_class_iso14971: {
        value: riskClass,
        unit: "risk class",
        source: "ISO 14971 simplification",
      },
      warnings,
      source: "MedicalCFR820TraceabilityEngine — 21 CFR §820 + ISO 13485:2016 + 21 CFR §801/830 (UDI) + §807/814 + ISO 14971 + ISO 10993 + ISO 11135/11137/17665",
    };
  }
}

export const medicalCFR820TraceabilityEngine = new MedicalCFR820TraceabilityEngine();

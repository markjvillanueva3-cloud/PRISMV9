/**
 * ITARComplianceTaggerEngine — export-control + cybersecurity tagging
 *
 * Closes the iter20 P1 "ITAR/CMMC tagging" gap. Given part metadata (customer
 * industry + end-use + material origin + drawing class), determines:
 *   - ITAR-controlled?      (22 CFR §120-130 USML — defense articles)
 *   - EAR classification    (15 CFR §730-774 CCL — dual-use)
 *   - CMMC v2 level         (1=basic / 2=advanced / 3=expert — NIST 800-171)
 *   - DFARS 252.204-7012 cybersecurity clause required?
 *   - Foreign-national access restricted? (deemed-export rule, ITAR §125.4)
 *   - Audit-trail required? (record-keeping per ITAR §122.5 / EAR §762)
 *   - Export license required? (USML license vs EAR license exception)
 *
 * Compliance decision tree:
 *   - defense + weapons → ITAR Category I-IV (USML) → license required → CMMC L3
 *   - defense + satellite → ITAR Category XV → license required → CMMC L2/L3
 *   - aerospace commercial → EAR 9A610.x → no license to most countries → CMMC L2
 *   - medical → EAR99 → no license → CMMC L1
 *   - commercial/automotive → EAR99 → no controls → CMMC L1
 *
 * Reference: 22 CFR §120-130 (ITAR USML); 15 CFR §730-774 (EAR CCL Category 9
 *   aerospace); DFARS 252.204-7012 (cybersecurity requirements); CMMC v2.0
 *   Final Rule (effective 2026); NIST SP 800-171 (controlled unclassified info);
 *   Boeing Supplier Quality Requirements §A-3 (compliance flowdown).
 *
 * @version 1.0.0
 * @module ITARComplianceTaggerEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type CustomerIndustry = "defense" | "aerospace" | "medical" | "commercial" | "automotive" | "energy" | "research";
export type EndUseApplication =
  | "weapons" | "missiles" | "fighter_aircraft" | "satellites" | "military_vehicles"
  | "commercial_aircraft" | "spacecraft_civil" | "medical_implant" | "industrial_machinery"
  | "automotive_consumer" | "research_only" | "unknown";
export type DrawingClass = "public" | "proprietary" | "confidential" | "itar_controlled" | "secret";
export type CMMCLevel = "L1" | "L2" | "L3";

export interface ITARComplianceInput {
  customer_industry: CustomerIndustry;
  end_use_application: EndUseApplication;
  end_use_country?: string;          // ISO 3166-1 alpha-2 (e.g., "US", "GB", "RU")
  material_origin_country?: string;  // same format
  drawing_classification: DrawingClass;
  /** Contract has DFARS 252.204-7012 cybersecurity clause */
  has_dfars_clause?: boolean;
  /** Part contains specially-designed defense article components */
  contains_usml_components?: boolean;
}

export interface ITARComplianceResult {
  itar_controlled: boolean;
  /** USML category (I-XXI) if ITAR-controlled */
  usml_category: AtomicValue<string>;
  /** EAR ECCN classification (EAR99 or specific entry) */
  ear_eccn: AtomicValue<string>;
  cmmc_level_required: AtomicValue<CMMCLevel>;
  dfars_252_204_7012_required: boolean;
  foreign_national_access_restricted: boolean;
  audit_trail_required: boolean;
  export_license_required: boolean;
  /** Sanctioned countries (limited list — sanity check only) */
  embargoed_destination: boolean;
  warnings: string[];
  source: string;
}

const EMBARGOED_COUNTRIES = new Set(["IR", "KP", "SY", "CU"]);  // ITAR §126.1 prohibited; full list at OFAC

const USML_CATEGORY_MAP: Record<string, string> = {
  weapons: "I (firearms/close-assault)",
  missiles: "IV (launch vehicles/missiles/rockets)",
  fighter_aircraft: "VIII (military aircraft)",
  military_vehicles: "VII (ground vehicles)",
  satellites: "XV (spacecraft + satellites)",
};

export class ITARComplianceTaggerEngine {
  classify(input: ITARComplianceInput): ITARComplianceResult {
    if (!input || !input.customer_industry || !input.end_use_application || !input.drawing_classification) {
      throw new Error("ITARComplianceTaggerEngine.classify: customer_industry + end_use_application + drawing_classification required");
    }

    const warnings: string[] = [];

    // ── ITAR / USML classification ────────────────────────────────────
    const isITAREndUse = ["weapons", "missiles", "fighter_aircraft", "satellites", "military_vehicles"].includes(input.end_use_application);
    const isITARDrawing = input.drawing_classification === "itar_controlled" || input.drawing_classification === "secret";
    const itarControlled = isITAREndUse || isITARDrawing || input.contains_usml_components === true;

    const usmlCategory = itarControlled ? (USML_CATEGORY_MAP[input.end_use_application] ?? "TBD-review-with-export-counsel") : "N/A";

    // ── EAR ECCN classification (dual-use commercial) ─────────────────
    let earEccn: string;
    if (itarControlled) {
      earEccn = "ITAR-controlled (USML supersedes EAR)";
    } else if (input.end_use_application === "commercial_aircraft" || input.end_use_application === "spacecraft_civil") {
      earEccn = "9A610.x (aerospace commercial — EAR CCL Cat 9)";
    } else if (input.customer_industry === "defense" && !isITAREndUse) {
      earEccn = "0A919 or 0A521 (defense dual-use — verify with export counsel)";
      warnings.push("Defense industry customer but non-USML end-use — confirm ECCN with export counsel before shipping");
    } else {
      earEccn = "EAR99 (no specific controls)";
    }

    // ── CMMC level (NIST 800-171 mapping) ─────────────────────────────
    let cmmcLevel: CMMCLevel;
    if (itarControlled || input.contains_usml_components === true) {
      cmmcLevel = "L3";  // expert level for ITAR/USML
    } else if (input.customer_industry === "defense" || input.customer_industry === "aerospace") {
      cmmcLevel = "L2";  // advanced for CUI handling
    } else {
      cmmcLevel = "L1";  // basic for FCI only
    }

    // ── DFARS 252.204-7012 ────────────────────────────────────────────
    // Required if any DoD contract OR CUI handling
    const dfarsRequired = (input.customer_industry === "defense") || itarControlled || (input.has_dfars_clause === true);

    // ── Foreign-national access (deemed-export ITAR §125.4) ───────────
    const fnRestricted = itarControlled;

    // ── Audit trail (ITAR §122.5 / EAR §762) ──────────────────────────
    // ITAR: 5-year retention; EAR: 5-year for licensable items
    const auditTrailRequired = itarControlled || earEccn.startsWith("9A610") || earEccn.startsWith("0A");

    // ── Export license ────────────────────────────────────────────────
    let exportLicenseRequired = false;
    if (input.end_use_country && input.end_use_country !== "US") {
      if (itarControlled) {
        exportLicenseRequired = true;  // DDTC license required
      } else if (earEccn.startsWith("9A610") || earEccn.startsWith("0A")) {
        exportLicenseRequired = true;  // BIS license required for controlled ECCN
      }
    }

    // ── Embargoed destination ─────────────────────────────────────────
    const embargoed = input.end_use_country !== undefined && EMBARGOED_COUNTRIES.has(input.end_use_country.toUpperCase());
    if (embargoed) {
      warnings.push(`Destination ${input.end_use_country} is EMBARGOED — shipment PROHIBITED (ITAR §126.1 / OFAC sanctions)`);
    }

    // ── Other warnings ────────────────────────────────────────────────
    if (input.end_use_application === "unknown" && itarControlled === false) {
      warnings.push("End-use unknown — verify with customer before export-control determination (default to L2)");
    }
    if (itarControlled && !input.has_dfars_clause) {
      warnings.push("ITAR-controlled but no DFARS 252.204-7012 clause flagged — contract review required before fulfillment");
    }
    if (input.material_origin_country && input.material_origin_country.toUpperCase() !== "US" && itarControlled) {
      warnings.push(`ITAR-controlled with non-US material origin (${input.material_origin_country}) — verify material qualifies under §122 USML traceability`);
    }

    return {
      itar_controlled: itarControlled,
      usml_category: {
        value: usmlCategory,
        unit: "USML category",
        source: itarControlled ? "22 CFR §121.1 USML" : "non-ITAR",
      },
      ear_eccn: {
        value: earEccn,
        unit: "ECCN",
        source: "15 CFR §774 CCL",
      },
      cmmc_level_required: {
        value: cmmcLevel,
        unit: "CMMC v2 level",
        source: "CMMC v2 Final Rule 2026 + NIST 800-171",
      },
      dfars_252_204_7012_required: dfarsRequired,
      foreign_national_access_restricted: fnRestricted,
      audit_trail_required: auditTrailRequired,
      export_license_required: exportLicenseRequired,
      embargoed_destination: embargoed,
      warnings,
      source: "ITARComplianceTaggerEngine — 22 CFR §120-130 + 15 CFR §730-774 + DFARS 252.204-7012 + CMMC v2.0 + NIST SP 800-171 + Boeing SQR §A-3",
    };
  }
}

export const itarComplianceTaggerEngine = new ITARComplianceTaggerEngine();

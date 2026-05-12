/**
 * CounterfeitPartPreventionEngine
 * =================================
 *
 * Counterfeit / fraudulent part risk engine per AS5553 (electronics) and
 * AS6174 (material). Scores supplier provenance, chain-of-custody,
 * authentication tests, and produces a suspect-counterfeit (SCP) verdict.
 *
 * Risk score (0..100, higher = more suspect):
 *   - Supplier provenance    30 pts   (authorized / franchised distributor?)
 *   - Chain of custody       25 pts   (unbroken paper trail from OCM?)
 *   - Authentication tests   25 pts   (markings, XRF, DPA, electrical?)
 *   - Packaging integrity    10 pts   (OEM seal, ESD bag, reel label?)
 *   - Documentation          10 pts   (CoC, OCM certs, lot trace?)
 *
 * Verdict thresholds:
 *   score ≥ 70 → SUSPECT_COUNTERFEIT (quarantine + GIDEP alert)
 *   40..69    → ELEVATED (extra testing required)
 *   < 40      → ACCEPTABLE (normal incoming inspection)
 *
 * Distinction from existing:
 *   - MaterialTraceability: tracks heat-lot → cert chain only
 *   - This engine: scores fraud risk using provenance + tests + paperwork
 *
 * References:
 *   - SAE AS5553D (Fraudulent/Counterfeit Electronic Parts; Avoidance,
 *     Detection, Mitigation, and Disposition)
 *   - SAE AS6174A (Counterfeit Material; Avoidance, etc.)
 *   - DFARS 252.246-7007 (Contractor Counterfeit Electronic Part
 *     Detection and Avoidance System)
 *   - GIDEP (Government-Industry Data Exchange Program) reporting
 *
 * @module engines/CounterfeitPartPreventionEngine
 * @milestone LATHE-PRO-MS9
 */

export type SupplierTier =
  | "OCM_direct"              // Original Component Manufacturer
  | "authorized_distributor"
  | "franchised_distributor"
  | "broker_certified"        // AS6081 certified
  | "broker_uncertified"
  | "independent"
  | "unknown";

export type AuthTestType =
  | "visual_external"
  | "visual_internal_DPA"
  | "xray"
  | "xrf_elemental"
  | "decapsulation"
  | "electrical_parametric"
  | "remark_solvent"
  | "dimensional_metrology"
  | "acoustic_microscopy";

export type TestResult = "pass" | "fail" | "inconclusive" | "not_performed";

export interface AuthTest {
  type: AuthTestType;
  result: TestResult;
  /** Test date ISO-8601 */
  date?: string;
  /** Testing lab */
  lab?: string;
  notes?: string;
}

export interface ProvenanceRecord {
  /** OCM (original component manufacturer) name */
  ocm?: string;
  /** Part number as marked */
  ocm_part_number?: string;
  /** Date code / lot code from markings */
  date_code?: string;
  /** Supplier tier */
  supplier_tier: SupplierTier;
  /** Is supplier on approved vendor list (AVL)? */
  on_avl: boolean;
  /** Chain-of-custody hops from OCM */
  chain_hops: string[];
  /** Is chain unbroken / fully documented? */
  chain_documented: boolean;
}

export interface CounterfeitRiskInput {
  part_number: string;
  quantity: number;
  /** Is this a mission- or flight-critical part? */
  critical_application: boolean;
  provenance: ProvenanceRecord;
  auth_tests: AuthTest[];
  /** Packaging checks */
  packaging_intact_oem_seal: boolean;
  esd_packaging_correct: boolean;
  reel_label_matches: boolean;
  /** Documentation checks */
  ocm_coc_present: boolean;
  lot_traceability_complete: boolean;
  /** GIDEP history: has this OCM+date-code been flagged before? */
  gidep_prior_hit?: boolean;
}

export interface CounterfeitRiskResult {
  part_number: string;
  score: number;           // 0..100 (higher = more suspect)
  verdict: "suspect_counterfeit" | "elevated" | "acceptable";
  quarantine_required: boolean;
  gidep_report_required: boolean;
  subscore_provenance: number;   // 0..30
  subscore_chain: number;        // 0..25
  subscore_tests: number;        // 0..25
  subscore_packaging: number;    // 0..10
  subscore_documentation: number;// 0..10
  failed_tests: AuthTestType[];
  findings: string[];
  recommended_actions: string[];
  reasoning: string[];
}

const TIER_SCORE: Record<SupplierTier, number> = {
  OCM_direct: 0,
  authorized_distributor: 3,
  franchised_distributor: 6,
  broker_certified: 15,
  broker_uncertified: 25,
  independent: 28,
  unknown: 30,
};

class CounterfeitPartPreventionEngineImpl {
  assess(i: CounterfeitRiskInput): CounterfeitRiskResult {
    const reasoning: string[] = [];
    const findings: string[] = [];
    const actions: string[] = [];

    // --- Provenance subscore (0..30) ---
    let provenance = TIER_SCORE[i.provenance.supplier_tier];
    if (!i.provenance.on_avl && i.provenance.supplier_tier !== "OCM_direct") {
      provenance = Math.min(30, provenance + 5);
      findings.push("Supplier not on approved vendor list");
    }
    if (i.gidep_prior_hit) {
      provenance = 30;
      findings.push("GIDEP prior hit — OCM+date-code previously reported");
    }
    reasoning.push(`Provenance score ${provenance}/30 (tier=${i.provenance.supplier_tier})`);

    // --- Chain of custody subscore (0..25) ---
    let chain = 0;
    if (!i.provenance.chain_documented) {
      chain += 15;
      findings.push("Chain of custody not fully documented");
    }
    if (i.provenance.chain_hops.length > 3) {
      chain += 10;
      findings.push(`Chain has ${i.provenance.chain_hops.length} hops — deep chain increases risk`);
    } else if (i.provenance.chain_hops.length > 1) {
      chain += 5;
    }
    chain = Math.min(25, chain);
    reasoning.push(`Chain score ${chain}/25 (${i.provenance.chain_hops.length} hops)`);

    // --- Auth test subscore (0..25) ---
    const failed = i.auth_tests.filter((t) => t.result === "fail").map((t) => t.type);
    const inconclusive = i.auth_tests.filter((t) => t.result === "inconclusive").length;
    const performed = i.auth_tests.filter((t) => t.result !== "not_performed").length;
    let tests = 0;
    if (failed.length > 0) {
      tests = 25;
      findings.push(`${failed.length} authentication tests FAILED: ${failed.join(", ")}`);
    } else if (i.critical_application && performed < 3) {
      tests = 15;
      findings.push(`Critical application with only ${performed} tests performed — minimum 3 recommended`);
    } else if (performed === 0) {
      tests = i.critical_application ? 20 : 10;
      findings.push("No authentication tests performed");
    } else {
      tests = Math.min(10, inconclusive * 3);
    }
    reasoning.push(`Test score ${tests}/25 (${performed} tests, ${failed.length} failed)`);

    // --- Packaging subscore (0..10) ---
    let packaging = 0;
    if (!i.packaging_intact_oem_seal) { packaging += 4; findings.push("OEM packaging seal broken or absent"); }
    if (!i.esd_packaging_correct) { packaging += 3; findings.push("ESD packaging non-conforming"); }
    if (!i.reel_label_matches) { packaging += 3; findings.push("Reel label does not match marking"); }
    packaging = Math.min(10, packaging);
    reasoning.push(`Packaging score ${packaging}/10`);

    // --- Documentation subscore (0..10) ---
    let documentation = 0;
    if (!i.ocm_coc_present) { documentation += 6; findings.push("OCM Certificate of Conformance missing"); }
    if (!i.lot_traceability_complete) { documentation += 4; findings.push("Lot traceability incomplete"); }
    documentation = Math.min(10, documentation);
    reasoning.push(`Documentation score ${documentation}/10`);

    const total = provenance + chain + tests + packaging + documentation;
    let verdict: CounterfeitRiskResult["verdict"];
    if (total >= 70 || failed.length > 0) verdict = "suspect_counterfeit";
    else if (total >= 40) verdict = "elevated";
    else verdict = "acceptable";

    // Recommended actions
    if (verdict === "suspect_counterfeit") {
      actions.push("Quarantine lot immediately (separate from production stock)");
      actions.push("File GIDEP report per DFARS 252.246-7007");
      actions.push("Notify contracting officer; do not consume");
    } else if (verdict === "elevated") {
      actions.push("Escalate testing: XRF elemental, optional DPA");
      actions.push("Require additional OCM authentication from supplier");
    }

    reasoning.push(`Total ${total}/100 → verdict=${verdict}`);

    return {
      part_number: i.part_number,
      score: total,
      verdict,
      quarantine_required: verdict === "suspect_counterfeit",
      gidep_report_required: verdict === "suspect_counterfeit",
      subscore_provenance: provenance,
      subscore_chain: chain,
      subscore_tests: tests,
      subscore_packaging: packaging,
      subscore_documentation: documentation,
      failed_tests: failed,
      findings,
      recommended_actions: actions,
      reasoning,
    };
  }

  getStats(): { supplier_tiers: SupplierTier[]; test_types: AuthTestType[]; reference: string } {
    return {
      supplier_tiers: ["OCM_direct", "authorized_distributor", "franchised_distributor", "broker_certified", "broker_uncertified", "independent", "unknown"],
      test_types: ["visual_external", "visual_internal_DPA", "xray", "xrf_elemental", "decapsulation", "electrical_parametric", "remark_solvent", "dimensional_metrology", "acoustic_microscopy"],
      reference: "SAE AS5553D; SAE AS6174A; DFARS 252.246-7007; GIDEP",
    };
  }
}

export const counterfeitPartPreventionEngine = new CounterfeitPartPreventionEngineImpl();
export type { CounterfeitPartPreventionEngineImpl };

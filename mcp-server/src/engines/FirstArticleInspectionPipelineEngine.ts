/**
 * PRISM: FirstArticleInspectionPipelineEngine
 * =============================================
 * Orchestrates First Article Inspection per AS9102 standard.
 *
 * Pipeline:
 *   1. Extract critical dimensions from part data (features with tolerances)
 *   2. Generate CMM measurement plan (lazy-load CMMPathPlanningEngine if available)
 *   3. Generate in-process probing routines (lazy-load ProbeRoutineGeneratorEngine)
 *   4. Accept measurement results (manual entry or imported)
 *   5. Compare measured vs nominal with tolerance evaluation
 *   6. Generate AS9102 Form 1/2/3 (Part Accountability, Product Accountability,
 *      Characteristic Accountability)
 *   7. Disposition: ACCEPT / REJECT / MRB
 *
 * AS9102 Form 3 fields per characteristic:
 *   Char #, Reference Location, Characteristic Designator (critical/major/minor),
 *   Nominal, +Tolerance, -Tolerance, Measured Value, Pass/Fail,
 *   Inspection Method (CMM/Gauge/Visual), Equipment ID
 *
 * References:
 *   - SAE AS9102 Rev C (2014): First Article Inspection Requirements
 *   - ISO 9001:2015 §8.5.1: Control of production, clause (f) validation
 *   - AIAG PPAP 4th Ed. (2006): Production Part Approval Process
 *   - ISO 14253-1: Decision rules for proving conformance/non-conformance
 *
 * Shortcode: E1092
 * @module FirstArticleInspectionPipelineEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ─── Type Definitions ────────────────────────────────────────────────

export type CharacteristicDesignator = "critical" | "major" | "minor";
export type InspectionMethod = "CMM" | "gauge" | "visual" | "optical" | "surface_tester" | "manual";
export type DispositionVerdict = "ACCEPT" | "REJECT" | "MRB";
export type FAIStatus = "pending" | "in_progress" | "complete";

export interface FeatureInput {
  feature_id: string;
  feature_name: string;
  reference_location: string;
  designator: CharacteristicDesignator;
  nominal: number;
  tolerance_plus: number;
  tolerance_minus: number;
  unit?: string;
  inspection_method?: InspectionMethod;
  equipment_id?: string;
}

export interface MeasurementInput {
  feature_id: string;
  measured_value: number;
  inspection_method?: InspectionMethod;
  equipment_id?: string;
  operator?: string;
  timestamp?: string;
}

export interface FAIInput {
  part_number: string;
  revision: string;
  features: FeatureInput[];
  material_cert_id?: string;
  measurements?: MeasurementInput[];
  serial_number?: string;
  purchase_order?: string;
  supplier?: string;
  drawing_number?: string;
  organization?: string;
  inspector?: string;
}

export interface CharacteristicResult {
  char_number: number;
  feature_id: string;
  feature_name: string;
  reference_location: string;
  designator: CharacteristicDesignator;
  nominal: number;
  tolerance_plus: number;
  tolerance_minus: number;
  measured_value: number | null;
  deviation: number | null;
  margin_pct: number | null;
  pass: boolean | null;
  inspection_method: InspectionMethod;
  equipment_id: string;
  unit: string;
}

export interface DispositionDetail {
  verdict: DispositionVerdict;
  reasoning: string[];
  critical_failures: number;
  major_failures: number;
  minor_failures: number;
  mrb_candidates: number;
  total_characteristics: number;
  pass_count: number;
  fail_count: number;
  unmeasured_count: number;
}

export interface FAIResult {
  fai_id: string;
  status: FAIStatus;
  part_number: string;
  revision: string;
  serial_number: string;
  created: string;
  characteristics: CharacteristicResult[];
  disposition: DispositionDetail;
  cmm_plan?: any;
  probe_routines?: any;
}

export interface Form1 {
  title: string;
  fai_id: string;
  part_number: string;
  part_name: string;
  revision: string;
  serial_number: string;
  drawing_number: string;
  organization: string;
  purchase_order: string;
  full_or_partial: string;
  reason_for_fai: string;
  date: string;
  inspector: string;
}

export interface Form2Material {
  item: string;
  specification: string;
  code: string;
  status: string;
}

export interface Form2 {
  title: string;
  fai_id: string;
  part_number: string;
  revision: string;
  raw_materials: Form2Material[];
  special_processes: string[];
  functional_tests: string[];
  material_cert_id: string;
  supplier: string;
}

export interface Form3Row {
  char_number: number;
  reference_location: string;
  characteristic_designator: CharacteristicDesignator;
  nominal: number;
  tolerance_plus: number;
  tolerance_minus: number;
  measured_value: number | null;
  pass_fail: "PASS" | "FAIL" | "N/A";
  inspection_method: InspectionMethod;
  equipment_id: string;
}

export interface Form3 {
  title: string;
  fai_id: string;
  part_number: string;
  revision: string;
  rows: Form3Row[];
  summary: {
    total: number;
    pass: number;
    fail: number;
    not_measured: number;
  };
}

export interface FAIForms {
  form1: Form1;
  form2: Form2;
  form3: Form3;
  markdown: string;
}

// ─── In-Memory Storage ───────────────────────────────────────────────

const faiStore: Map<string, FAIResult> = new Map();
const faiInputStore: Map<string, FAIInput> = new Map();
let faiCounter = 0;

// ─── Lazy Engine Loaders ─────────────────────────────────────────────

let _cmmEngine: any = null;
let _probeEngine: any = null;

async function tryCMMEngine(): Promise<any | null> {
  if (_cmmEngine !== null) return _cmmEngine;
  try {
    const mod = await import("./CMMPathPlanningEngine.js");
    _cmmEngine = mod.cmmPathPlanningEngine ?? (mod as any).default ?? null;
    return _cmmEngine;
  } catch {
    _cmmEngine = false;
    return null;
  }
}

async function tryProbeEngine(): Promise<any | null> {
  if (_probeEngine !== null) return _probeEngine;
  try {
    const mod = await import("./ProbeRoutineGeneratorEngine.js");
    _probeEngine = mod.probeRoutineGeneratorEngine ?? (mod as any).default ?? null;
    return _probeEngine;
  } catch {
    _probeEngine = false;
    return null;
  }
}

// ─── Core Evaluation ─────────────────────────────────────────────────

/**
 * Evaluate a single characteristic: compare measured vs nominal with tolerance.
 * Returns pass/fail with margin percentage.
 *
 * Margin formula: how much of the tolerance band is consumed.
 *   margin_pct = (1 - |deviation| / half_band) * 100
 *   where half_band = max(|tol_plus|, |tol_minus|) on the relevant side
 */
export function evaluateCharacteristic(
  nominal: number,
  tolerance_plus: number,
  tolerance_minus: number,
  measured: number,
): { pass: boolean; deviation: number; margin_pct: number } {
  const deviation = Math.round((measured - nominal) * 1e8) / 1e8;
  const upper = nominal + tolerance_plus;
  const lower = nominal + tolerance_minus; // tolerance_minus is negative
  const pass = measured >= lower && measured <= upper;

  // Margin: distance to nearest limit as % of that side's tolerance
  const distToUpper = upper - measured;
  const distToLower = measured - lower;
  const nearestDist = Math.min(distToUpper, distToLower);
  const halfBand = (tolerance_plus - tolerance_minus) / 2;
  const margin_pct = halfBand > 0
    ? Math.round((nearestDist / halfBand) * 100 * 100) / 100
    : (pass ? 100 : -100);

  return { pass, deviation, margin_pct };
}

// ─── Disposition Logic ───────────────────────────────────────────────

/**
 * Determine disposition based on characteristic results.
 *
 * Rules per AS9102 practice:
 *   - All pass --> ACCEPT
 *   - Any critical fail --> REJECT
 *   - Only major/minor fail within 10% of tolerance --> MRB candidate
 *   - Multiple failures --> REJECT
 */
export function dispositionRecommendation(
  results: CharacteristicResult[],
): DispositionDetail {
  const measured = results.filter(r => r.pass !== null);
  const unmeasured = results.filter(r => r.pass === null);
  const passed = measured.filter(r => r.pass === true);
  const failed = measured.filter(r => r.pass === false);

  const critFails = failed.filter(r => r.designator === "critical");
  const majorFails = failed.filter(r => r.designator === "major");
  const minorFails = failed.filter(r => r.designator === "minor");

  const reasoning: string[] = [];
  let verdict: DispositionVerdict;

  if (failed.length === 0 && unmeasured.length === 0) {
    verdict = "ACCEPT";
    reasoning.push("All characteristics measured and within tolerance.");
  } else if (unmeasured.length > 0 && failed.length === 0) {
    verdict = "MRB";
    reasoning.push(`${unmeasured.length} characteristic(s) not yet measured — incomplete FAI.`);
  } else if (critFails.length > 0) {
    verdict = "REJECT";
    reasoning.push(`${critFails.length} CRITICAL characteristic(s) out of tolerance.`);
    for (const f of critFails) {
      reasoning.push(
        `  - Char #${f.char_number} "${f.feature_name}": measured ${f.measured_value}, ` +
        `nominal ${f.nominal} [${f.tolerance_minus}/+${f.tolerance_plus}], margin ${f.margin_pct}%`,
      );
    }
  } else if (failed.length > 1) {
    verdict = "REJECT";
    reasoning.push(
      `${failed.length} characteristics failed (multiple failures trigger REJECT).`,
    );
  } else {
    // Single major or minor failure — check if within 10% of tolerance band
    const f = failed[0];
    const band = f.tolerance_plus - f.tolerance_minus;
    const threshold_10pct = band * 0.1;
    const absDeviation = Math.abs(f.deviation ?? 0);
    const upperLim = f.nominal + f.tolerance_plus;
    const lowerLim = f.nominal + f.tolerance_minus;
    const exceedance = Math.max(
      (f.measured_value ?? 0) - upperLim,
      lowerLim - (f.measured_value ?? 0),
      0,
    );

    if (exceedance <= threshold_10pct) {
      verdict = "MRB";
      reasoning.push(
        `1 ${f.designator} characteristic failed within 10% of tolerance band — MRB candidate.`,
      );
      reasoning.push(
        `  - Char #${f.char_number} "${f.feature_name}": exceedance ${exceedance.toFixed(4)} ` +
        `vs 10% threshold ${threshold_10pct.toFixed(4)}`,
      );
    } else {
      verdict = "REJECT";
      reasoning.push(
        `1 ${f.designator} characteristic failed beyond 10% of tolerance band.`,
      );
    }
  }

  return {
    verdict,
    reasoning,
    critical_failures: critFails.length,
    major_failures: majorFails.length,
    minor_failures: minorFails.length,
    mrb_candidates: verdict === "MRB" ? failed.length + unmeasured.length : 0,
    total_characteristics: results.length,
    pass_count: passed.length,
    fail_count: failed.length,
    unmeasured_count: unmeasured.length,
  };
}

// ─── Pipeline Engine Class ───────────────────────────────────────────

export class FirstArticleInspectionPipelineEngine {
  /**
   * Run the full FAI pipeline.
   *
   * Steps:
   *   1. Extract critical dimensions from features[]
   *   2. Generate CMM plan (if CMMPathPlanningEngine available)
   *   3. Generate probe routines (if ProbeRoutineGeneratorEngine available)
   *   4. Accept measurement results
   *   5. Evaluate each characteristic
   *   6. Determine disposition
   */
  async runFAI(input: FAIInput): Promise<FAIResult> {
    faiCounter++;
    const faiId = `FAI-${String(faiCounter).padStart(5, "0")}`;
    log.info(`[FirstArticleInspectionPipeline] Starting FAI ${faiId} for ${input.part_number} rev ${input.revision}`);

    // Store input for form generation
    faiInputStore.set(faiId, input);

    // Step 1: Build characteristic list from features
    const characteristics: CharacteristicResult[] = input.features.map((f, idx) => {
      const charNum = idx + 1;

      // Step 4: Match measurement if provided
      const meas = input.measurements?.find(m => m.feature_id === f.feature_id) ?? null;

      // Step 5: Evaluate if measurement exists
      let pass: boolean | null = null;
      let deviation: number | null = null;
      let margin_pct: number | null = null;

      if (meas) {
        const eval_ = evaluateCharacteristic(
          f.nominal,
          f.tolerance_plus,
          f.tolerance_minus,
          meas.measured_value,
        );
        pass = eval_.pass;
        deviation = eval_.deviation;
        margin_pct = eval_.margin_pct;
      }

      return {
        char_number: charNum,
        feature_id: f.feature_id,
        feature_name: f.feature_name,
        reference_location: f.reference_location,
        designator: f.designator,
        nominal: f.nominal,
        tolerance_plus: f.tolerance_plus,
        tolerance_minus: f.tolerance_minus,
        measured_value: meas?.measured_value ?? null,
        deviation,
        margin_pct,
        pass,
        inspection_method: meas?.inspection_method ?? f.inspection_method ?? "CMM",
        equipment_id: meas?.equipment_id ?? f.equipment_id ?? "N/A",
        unit: f.unit ?? "mm",
      };
    });

    // Step 2: CMM plan (lazy-load)
    let cmmPlan: any = null;
    const cmmEngine = await tryCMMEngine();
    if (cmmEngine && typeof cmmEngine.generatePlan === "function") {
      try {
        cmmPlan = cmmEngine.generatePlan({
          features: input.features.map(f => ({
            feature_id: f.feature_id,
            name: f.feature_name,
            nominal: f.nominal,
            tolerance_plus: f.tolerance_plus,
            tolerance_minus: f.tolerance_minus,
            designator: f.designator,
          })),
          part_number: input.part_number,
        });
        log.info(`[FirstArticleInspectionPipeline] CMM plan generated with ${cmmPlan?.total_points ?? "?"} points`);
      } catch (err: any) {
        log.warn(`[FirstArticleInspectionPipeline] CMMPathPlanningEngine error: ${err.message}`);
      }
    }

    // Step 3: Probe routines (lazy-load)
    let probeRoutines: any = null;
    const probeEngine = await tryProbeEngine();
    if (probeEngine && typeof probeEngine.generate === "function") {
      try {
        probeRoutines = probeEngine.generate({
          features: input.features.filter(
            f => f.designator === "critical" || f.designator === "major",
          ),
          part_number: input.part_number,
        });
        log.info(`[FirstArticleInspectionPipeline] Probe routines generated`);
      } catch (err: any) {
        log.warn(`[FirstArticleInspectionPipeline] ProbeRoutineGeneratorEngine error: ${err.message}`);
      }
    }

    // Step 6: Disposition
    const disposition = dispositionRecommendation(characteristics);

    const status: FAIStatus = disposition.unmeasured_count > 0 ? "in_progress" : "complete";

    const faiResult: FAIResult = {
      fai_id: faiId,
      status,
      part_number: input.part_number,
      revision: input.revision,
      serial_number: input.serial_number ?? `SN-${faiId}`,
      created: new Date().toISOString(),
      characteristics,
      disposition,
      ...(cmmPlan ? { cmm_plan: cmmPlan } : {}),
      ...(probeRoutines ? { probe_routines: probeRoutines } : {}),
    };

    faiStore.set(faiId, faiResult);
    log.info(
      `[FirstArticleInspectionPipeline] FAI ${faiId} complete — ` +
      `${disposition.pass_count}/${disposition.total_characteristics} pass, verdict: ${disposition.verdict}`,
    );
    return faiResult;
  }

  /**
   * Generate AS9102 Forms 1, 2, and 3 in JSON and Markdown.
   */
  generateForms(fai_id: string): FAIForms {
    const fai = faiStore.get(fai_id);
    if (!fai) throw new Error(`FAI ${fai_id} not found`);
    const input = faiInputStore.get(fai_id);

    // --- Form 1: Part Number Accountability ---
    const form1: Form1 = {
      title: "AS9102 Form 1 — Part Number Accountability",
      fai_id,
      part_number: fai.part_number,
      part_name: fai.part_number, // Defaults to part_number if no separate name
      revision: fai.revision,
      serial_number: fai.serial_number,
      drawing_number: input?.drawing_number ?? fai.part_number,
      organization: input?.organization ?? "N/A",
      purchase_order: input?.purchase_order ?? "N/A",
      full_or_partial: "Full",
      reason_for_fai: "New part / first production run",
      date: fai.created,
      inspector: input?.inspector ?? "N/A",
    };

    // --- Form 2: Product Accountability ---
    const form2: Form2 = {
      title: "AS9102 Form 2 — Product Accountability",
      fai_id,
      part_number: fai.part_number,
      revision: fai.revision,
      raw_materials: [
        {
          item: "Primary material",
          specification: input?.material_cert_id ? `Cert: ${input.material_cert_id}` : "N/A",
          code: "M",
          status: input?.material_cert_id ? "Verified" : "Pending",
        },
      ],
      special_processes: [],
      functional_tests: [],
      material_cert_id: input?.material_cert_id ?? "N/A",
      supplier: input?.supplier ?? "N/A",
    };

    // --- Form 3: Characteristic Accountability ---
    const form3Rows: Form3Row[] = fai.characteristics.map(c => ({
      char_number: c.char_number,
      reference_location: c.reference_location,
      characteristic_designator: c.designator,
      nominal: c.nominal,
      tolerance_plus: c.tolerance_plus,
      tolerance_minus: c.tolerance_minus,
      measured_value: c.measured_value,
      pass_fail: c.pass === null ? "N/A" : c.pass ? "PASS" : "FAIL",
      inspection_method: c.inspection_method,
      equipment_id: c.equipment_id,
    }));

    const form3: Form3 = {
      title: "AS9102 Form 3 — Characteristic Accountability",
      fai_id,
      part_number: fai.part_number,
      revision: fai.revision,
      rows: form3Rows,
      summary: {
        total: fai.characteristics.length,
        pass: fai.disposition.pass_count,
        fail: fai.disposition.fail_count,
        not_measured: fai.disposition.unmeasured_count,
      },
    };

    // --- Markdown Report ---
    const md = this._renderMarkdown(form1, form2, form3, fai.disposition);

    return { form1, form2, form3, markdown: md };
  }

  /**
   * Render all three forms as a single Markdown document.
   */
  private _renderMarkdown(
    form1: Form1,
    form2: Form2,
    form3: Form3,
    disposition: DispositionDetail,
  ): string {
    const lines: string[] = [];

    // Form 1
    lines.push(`# ${form1.title}`);
    lines.push("");
    lines.push(`| Field | Value |`);
    lines.push(`|-------|-------|`);
    lines.push(`| FAI ID | ${form1.fai_id} |`);
    lines.push(`| Part Number | ${form1.part_number} |`);
    lines.push(`| Revision | ${form1.revision} |`);
    lines.push(`| Serial Number | ${form1.serial_number} |`);
    lines.push(`| Drawing Number | ${form1.drawing_number} |`);
    lines.push(`| Organization | ${form1.organization} |`);
    lines.push(`| Purchase Order | ${form1.purchase_order} |`);
    lines.push(`| Full/Partial | ${form1.full_or_partial} |`);
    lines.push(`| Reason | ${form1.reason_for_fai} |`);
    lines.push(`| Date | ${form1.date} |`);
    lines.push(`| Inspector | ${form1.inspector} |`);
    lines.push("");

    // Form 2
    lines.push(`# ${form2.title}`);
    lines.push("");
    lines.push(`**Material Cert ID:** ${form2.material_cert_id}`);
    lines.push(`**Supplier:** ${form2.supplier}`);
    lines.push("");
    lines.push(`## Raw Materials`);
    lines.push(`| Item | Specification | Code | Status |`);
    lines.push(`|------|--------------|------|--------|`);
    for (const m of form2.raw_materials) {
      lines.push(`| ${m.item} | ${m.specification} | ${m.code} | ${m.status} |`);
    }
    lines.push("");

    if (form2.special_processes.length > 0) {
      lines.push(`## Special Processes`);
      for (const sp of form2.special_processes) lines.push(`- ${sp}`);
      lines.push("");
    }

    if (form2.functional_tests.length > 0) {
      lines.push(`## Functional Tests`);
      for (const ft of form2.functional_tests) lines.push(`- ${ft}`);
      lines.push("");
    }

    // Form 3
    lines.push(`# ${form3.title}`);
    lines.push("");
    lines.push(
      `| Char # | Ref Location | Designator | Nominal | +Tol | -Tol | Measured | Pass/Fail | Method | Equipment |`,
    );
    lines.push(
      `|--------|-------------|------------|---------|------|------|----------|-----------|--------|-----------|`,
    );
    for (const r of form3.rows) {
      lines.push(
        `| ${r.char_number} | ${r.reference_location} | ${r.characteristic_designator} ` +
        `| ${r.nominal} | ${r.tolerance_plus} | ${r.tolerance_minus} ` +
        `| ${r.measured_value ?? "—"} | ${r.pass_fail} | ${r.inspection_method} | ${r.equipment_id} |`,
      );
    }
    lines.push("");
    lines.push(
      `**Summary:** ${form3.summary.pass}/${form3.summary.total} pass, ` +
      `${form3.summary.fail} fail, ${form3.summary.not_measured} not measured`,
    );
    lines.push("");

    // Disposition
    lines.push(`## Disposition: **${disposition.verdict}**`);
    lines.push("");
    for (const r of disposition.reasoning) {
      lines.push(`- ${r}`);
    }
    lines.push("");

    return lines.join("\n");
  }
}

// ─── Singleton ───────────────────────────────────────────────────────

/** Singleton instance — shortcode E1092 */
export const firstArticleInspectionPipelineEngine = new FirstArticleInspectionPipelineEngine();

/**
 * ControlPlanGeneratorEngine — Quality Control Plan Generator (U-MIO34)
 * =====================================================================
 *
 * Generates AIAG APQP/PPAP-compliant Control Plans. A Control Plan is the
 * formal, auditable bridge between design FMEA, process FMEA, and shop-floor
 * execution. It specifies:
 *
 *   - Part/process step and machine
 *   - Characteristic (feature + designator)
 *   - Product and process specifications
 *   - Evaluation/measurement method & gage
 *   - Sample size & frequency
 *   - Control method (SPC, poka-yoke, 100% check)
 *   - Reaction plan when out-of-spec
 *
 * Output conforms to AIAG Control Plan form structure (revisions A/B/C).
 *
 * Sample frequency rules (default policy, overridable):
 *   - critical: 100% check
 *   - major:    5 pieces / first and last of each lot
 *   - minor:    AQL sampling
 *
 * Reaction plan defaults by severity × occurrence (per AIAG PPAP 4th Ed):
 *   - critical fail:           STOP LINE, quarantine, containment, root-cause
 *   - major fail:              100% inspection, segregate, MRB
 *   - minor fail (isolated):   adjust process, continue with increased check
 *   - minor fail (trend):      escalate to major, containment
 *
 * References:
 *   - AIAG APQP 2nd Ed (2008): Advanced Product Quality Planning
 *   - AIAG Control Plan Reference Manual 3rd Ed (2018)
 *   - AIAG PPAP 4th Ed (2006): §2.2.10 Control Plan
 *   - IATF 16949:2016 §8.5.1.1: Control plan requirements
 *   - ASQ ANSI/ASQ Z1.4: AQL sampling tables
 *
 * @module engines/ControlPlanGeneratorEngine
 * @milestone MIO-MS0 U-MIO34
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type ControlPlanPhase = "prototype" | "pre-launch" | "production";
export type CharSeverity = "critical" | "major" | "minor";
export type ControlMethod =
  | "SPC_Xbar_R"
  | "SPC_individuals"
  | "100%_check"
  | "poka_yoke"
  | "AQL_sampling"
  | "visual"
  | "first_last";

export interface ControlPlanCharacteristicInput {
  /** Unique feature id for cross-linking to FAI and part drawing */
  feature_id: string;
  feature_name: string;
  /** Reference (balloon #, zone, view) */
  reference: string;
  severity: CharSeverity;
  /** Product spec — nominal + tolerances */
  nominal: number;
  tolerance_plus: number;
  tolerance_minus: number;
  unit: string;
  /** Measurement/gage */
  gage_id?: string;
  measurement_method?: string;
  /** Op step in routing where this characteristic is controlled */
  op_num: number;
  machine_id?: string;
  /** Optional FMEA linkage */
  fmea_rpn?: number;
  /** Optional override of the default sample policy */
  sample_size_override?: number;
  sample_frequency_override?: string;
  control_method_override?: ControlMethod;
  reaction_plan_override?: string;
}

export interface ControlPlanInput {
  part_number: string;
  revision: string;
  phase: ControlPlanPhase;
  organization?: string;
  supplier?: string;
  team_members?: string[];
  /** Optional upstream routing id (for cross-link to U-MIO33 sheet) */
  routing_id?: string;
  characteristics: ControlPlanCharacteristicInput[];
}

export interface ControlPlanRow {
  line_num: number;
  feature_id: string;
  feature_name: string;
  reference: string;
  severity: CharSeverity;
  op_num: number;
  machine_id: string;
  product_spec: string;
  process_spec: string;
  measurement_method: string;
  gage_id: string;
  sample_size: number;
  sample_frequency: string;
  control_method: ControlMethod;
  reaction_plan: string;
  fmea_rpn: number;
}

export interface ControlPlanSummary {
  total_characteristics: number;
  critical_count: number;
  major_count: number;
  minor_count: number;
  spc_controlled_count: number;
  hundred_pct_count: number;
  poka_yoke_count: number;
  warnings: string[];
}

export interface ControlPlan {
  control_plan_id: string;
  part_number: string;
  revision: string;
  phase: ControlPlanPhase;
  organization: string;
  supplier: string;
  team_members: string[];
  routing_id: string;
  created: string;
  rows: ControlPlanRow[];
  summary: ControlPlanSummary;
}

export interface ControlPlanForms {
  json: ControlPlan;
  markdown: string;
  csv: string;
}

// ── Default policy ─────────────────────────────────────────────────────────

const DEFAULT_SAMPLE_POLICY: Record<
  CharSeverity,
  { size: number; frequency: string; method: ControlMethod; reaction: string }
> = {
  critical: {
    size: 0, // 0 = 100% (every piece)
    frequency: "every piece",
    method: "100%_check",
    reaction:
      "STOP line. Quarantine all affected parts. Containment/sort. Root-cause analysis required before restart. Notify quality manager within 1 hr.",
  },
  major: {
    size: 5,
    frequency: "5 pieces per hour + first and last of each lot",
    method: "SPC_Xbar_R",
    reaction:
      "Hold suspect lot. 100% inspection of hold lot. Segregate non-conforming. Adjust process. Notify process engineer.",
  },
  minor: {
    size: 1,
    frequency: "AQL 1.5 per ANSI/ASQ Z1.4 Level II",
    method: "AQL_sampling",
    reaction:
      "Adjust process. Increase check frequency 2× for next 25 pieces. If trend continues, escalate to major.",
  },
};

// ── Engine ─────────────────────────────────────────────────────────────────

export class ControlPlanGeneratorEngine {
  private store: Map<string, ControlPlan> = new Map();
  private counter = 0;

  /**
   * Generate a Control Plan from part + characteristics.
   */
  generate(input: ControlPlanInput): ControlPlan {
    if (!input.characteristics || input.characteristics.length === 0) {
      throw new Error("ControlPlanGenerator: at least one characteristic required");
    }

    const warnings: string[] = [];

    const rows: ControlPlanRow[] = input.characteristics.map((c, idx) => {
      const policy = DEFAULT_SAMPLE_POLICY[c.severity];
      if (!policy) {
        warnings.push(`Characteristic ${c.feature_id}: unknown severity '${c.severity}'`);
      }

      const band = c.tolerance_plus - c.tolerance_minus;
      if (band <= 0) {
        warnings.push(`Characteristic ${c.feature_id}: zero/negative tolerance band`);
      }

      const productSpec =
        `${c.nominal} +${c.tolerance_plus}/${c.tolerance_minus} ${c.unit}`;

      // Process spec typically mirrors product spec for machined features,
      // but may diverge for gage-repeatability-driven tolerances.
      const processSpec = productSpec;

      return {
        line_num: idx + 1,
        feature_id: c.feature_id,
        feature_name: c.feature_name,
        reference: c.reference,
        severity: c.severity,
        op_num: c.op_num,
        machine_id: c.machine_id ?? "N/A",
        product_spec: productSpec,
        process_spec: processSpec,
        measurement_method: c.measurement_method ?? "CMM",
        gage_id: c.gage_id ?? "N/A",
        sample_size: c.sample_size_override ?? policy?.size ?? 1,
        sample_frequency: c.sample_frequency_override ?? policy?.frequency ?? "N/A",
        control_method: c.control_method_override ?? policy?.method ?? "visual",
        reaction_plan: c.reaction_plan_override ?? policy?.reaction ?? "Contact quality.",
        fmea_rpn: c.fmea_rpn ?? 0,
      };
    });

    const critical = rows.filter(r => r.severity === "critical").length;
    const major = rows.filter(r => r.severity === "major").length;
    const minor = rows.filter(r => r.severity === "minor").length;
    const spc = rows.filter(r => r.control_method === "SPC_Xbar_R" || r.control_method === "SPC_individuals").length;
    const hundred = rows.filter(r => r.control_method === "100%_check").length;
    const poka = rows.filter(r => r.control_method === "poka_yoke").length;

    // Coverage warnings — at least one critical should have reaction plan,
    // and every op represented should have gage assignment.
    for (const r of rows) {
      if (r.severity === "critical" && r.gage_id === "N/A") {
        warnings.push(
          `Line ${r.line_num} (${r.feature_id}): CRITICAL characteristic has no gage assigned`,
        );
      }
    }

    this.counter++;
    const cpId = `CP-${String(this.counter).padStart(5, "0")}`;

    const cp: ControlPlan = {
      control_plan_id: cpId,
      part_number: input.part_number,
      revision: input.revision,
      phase: input.phase,
      organization: input.organization ?? "N/A",
      supplier: input.supplier ?? "N/A",
      team_members: input.team_members ?? [],
      routing_id: input.routing_id ?? "N/A",
      created: new Date().toISOString(),
      rows,
      summary: {
        total_characteristics: rows.length,
        critical_count: critical,
        major_count: major,
        minor_count: minor,
        spc_controlled_count: spc,
        hundred_pct_count: hundred,
        poka_yoke_count: poka,
        warnings,
      },
    };

    this.store.set(cpId, cp);
    return cp;
  }

  /** Retrieve a control plan by id */
  get(control_plan_id: string): ControlPlan | null {
    return this.store.get(control_plan_id) ?? null;
  }

  /** Generate JSON + Markdown + CSV in one shot */
  generateAll(input: ControlPlanInput): ControlPlanForms {
    const cp = this.generate(input);
    return {
      json: cp,
      markdown: this.renderMarkdown(cp),
      csv: this.renderCSV(cp),
    };
  }

  renderMarkdown(cp: ControlPlan): string {
    const lines: string[] = [];
    lines.push(`# Control Plan ${cp.control_plan_id}`);
    lines.push("");
    lines.push(`| Field | Value |`);
    lines.push(`|-------|-------|`);
    lines.push(`| Part Number | ${cp.part_number} Rev ${cp.revision} |`);
    lines.push(`| Phase | ${cp.phase} |`);
    lines.push(`| Organization | ${cp.organization} |`);
    lines.push(`| Supplier | ${cp.supplier} |`);
    lines.push(`| Routing ID | ${cp.routing_id} |`);
    lines.push(`| Team | ${cp.team_members.join(", ") || "—"} |`);
    lines.push(`| Created | ${cp.created} |`);
    lines.push("");
    lines.push(`## Characteristics`);
    lines.push("");
    lines.push(
      `| # | Feature | Ref | Severity | Op# | Machine | Product Spec | Gage | Sample | Freq | Control | Reaction |`,
    );
    lines.push(
      `|---|---------|-----|----------|-----|---------|--------------|------|--------|------|---------|----------|`,
    );
    for (const r of cp.rows) {
      lines.push(
        `| ${r.line_num} | ${r.feature_name} (${r.feature_id}) | ${r.reference} | ${r.severity} | ${r.op_num} | ${r.machine_id} | ${r.product_spec} | ${r.gage_id} | ${r.sample_size === 0 ? "100%" : r.sample_size} | ${r.sample_frequency} | ${r.control_method} | ${r.reaction_plan.substring(0, 80)}${r.reaction_plan.length > 80 ? "…" : ""} |`,
      );
    }
    lines.push("");
    lines.push(`## Summary`);
    lines.push("");
    lines.push(`- **Total characteristics:** ${cp.summary.total_characteristics}`);
    lines.push(`- **Critical:** ${cp.summary.critical_count}`);
    lines.push(`- **Major:** ${cp.summary.major_count}`);
    lines.push(`- **Minor:** ${cp.summary.minor_count}`);
    lines.push(`- **SPC-controlled:** ${cp.summary.spc_controlled_count}`);
    lines.push(`- **100% check:** ${cp.summary.hundred_pct_count}`);
    lines.push(`- **Poka-yoke:** ${cp.summary.poka_yoke_count}`);
    lines.push("");
    if (cp.summary.warnings.length > 0) {
      lines.push(`## Warnings`);
      for (const w of cp.summary.warnings) lines.push(`- ⚠ ${w}`);
      lines.push("");
    }
    return lines.join("\n");
  }

  renderCSV(cp: ControlPlan): string {
    const header = [
      "control_plan_id", "line_num", "feature_id", "feature_name", "reference",
      "severity", "op_num", "machine_id", "product_spec", "process_spec",
      "measurement_method", "gage_id", "sample_size", "sample_frequency",
      "control_method", "reaction_plan", "fmea_rpn",
    ];
    const lines: string[] = [header.join(",")];
    for (const r of cp.rows) {
      lines.push([
        cp.control_plan_id,
        r.line_num,
        r.feature_id,
        csv(r.feature_name),
        csv(r.reference),
        r.severity,
        r.op_num,
        r.machine_id,
        csv(r.product_spec),
        csv(r.process_spec),
        csv(r.measurement_method),
        r.gage_id,
        r.sample_size,
        csv(r.sample_frequency),
        r.control_method,
        csv(r.reaction_plan),
        r.fmea_rpn,
      ].join(","));
    }
    return lines.join("\n");
  }

  /** Clear in-memory store */
  reset(): void {
    this.store.clear();
    this.counter = 0;
  }
}

function csv(v: string): string {
  if (!v) return "";
  if (v.includes(",") || v.includes("\"") || v.includes("\n")) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

export const controlPlanGeneratorEngine = new ControlPlanGeneratorEngine();

/**
 * TurningBiocompatibleMaterialGuardEngine
 * =======================================
 *
 * Enforces biocompatibility handling rules for turning work on implant-grade
 * and regulated materials (U-LPR03, MS9). Blocks setups that would cross-
 * contaminate titanium, stainless implant grades, or cobalt-chrome with iron-
 * bearing tools, chlorinated coolants, or previously-used workholding.
 *
 * ── Rules enforced ────────────────────────────────────────────
 *   1. **Titanium no-iron contact (ASTM F86)**
 *        - Ti parts must not touch iron-bearing tooling, jaws, or fixtures
 *          that have contacted iron within the validated cleaning interval.
 *        - Coolant must be NON-chlorinated (chlorinated cutting oils cause
 *          stress-corrosion cracking of Ti per ASTM F86).
 *   2. **Implant-grade stainless (316L / 22-13-5 / 17-4 PH) segregation**
 *        - Dedicated or properly decontaminated turret + coolant loop.
 *        - Free of carbide contamination from previous P/M/K work.
 *   3. **Cobalt-chrome (CoCrMo, CoCrW)**
 *        - Free of aluminum contamination — galvanic / crevice corrosion risk.
 *        - Required: dedicated CBN / ceramic inserts, not shared with steel.
 *   4. **Traceability linkage**
 *        - Material certificate (CMTR) must be on file BEFORE machining.
 *        - Coolant batch number must be recorded for each run.
 *        - Tool edge number must be traceable to the validated insert lot.
 *
 * Output: a verdict of ALLOW / BLOCK / WARN plus a structured issue list that
 * the `material-traceability-gate` hook consumes to block program emission.
 *
 * References:
 *   - ASTM F86-13 "Surface Preparation and Marking of Metallic Surgical Implants"
 *   - ASTM F136 / F1472 (Ti implant material standards)
 *   - ISO 13485 §7.5.1 Control of Production (contamination control)
 *   - 21 CFR 820.70 Production and process controls
 *
 * @module engines/TurningBiocompatibleMaterialGuardEngine
 * @milestone LATHE-PRO-MS9 / U-LPR03
 */

export type BiocompatibleMaterial =
  | "titanium_cp"
  | "titanium_6al4v"
  | "titanium_6al4v_eli"
  | "stainless_316l"
  | "stainless_17_4ph"
  | "stainless_22_13_5"
  | "cocr_mo"
  | "cocr_w"
  | "pekk"       // medical polymer
  | "peek"
  | "non_implant"; // non-biocompatibility fallthrough

export interface CoolantBatch {
  /** Coolant trade name. */
  name: string;
  /** True when the coolant contains chlorinated extreme-pressure additives. */
  is_chlorinated: boolean;
  /** True when the coolant is synthetic (no mineral oil). */
  is_synthetic?: boolean;
  /** Batch number for traceability. */
  batch_number: string;
}

export interface ToolingContext {
  /** Tool number on the turret. */
  tool_number: number;
  /** Insert grade / substrate (e.g. "CBN", "ceramic", "carbide_p25", "hss"). */
  substrate: string;
  /** True when the tool has had recent contact with iron-bearing workpieces
   *  and has not been through the validated decontamination cycle. */
  iron_contaminated: boolean;
  /** True when the tool has had recent contact with aluminum. */
  aluminum_contaminated?: boolean;
}

export interface WorkholdingContext {
  kind: "chuck" | "collet" | "guide_bush" | "fixture" | "mandrel";
  /** Material of the workholding body. */
  material: string;
  /** True when it has contacted iron-bearing workpieces since last decon. */
  iron_contaminated: boolean;
}

export interface BiocompatInput {
  material: BiocompatibleMaterial;
  coolant: CoolantBatch;
  tooling: ToolingContext[];
  workholding: WorkholdingContext;
  /** Whether a valid CMTR is on file for the material lot. */
  cmtr_on_file: boolean;
  /** Whether the machine is dedicated to biocompatible work. */
  dedicated_machine?: boolean;
}

export type BiocompatVerdict = "ALLOW" | "BLOCK" | "WARN";

export interface BiocompatIssue {
  severity: "critical" | "warning" | "info";
  rule: string;
  detail: string;
}

export interface BiocompatResult {
  verdict: BiocompatVerdict;
  material: BiocompatibleMaterial;
  issues: BiocompatIssue[];
  reasons: string[];
}

/** Materials that require strict no-iron contact. */
const TITANIUM_MATERIALS = new Set<BiocompatibleMaterial>([
  "titanium_cp",
  "titanium_6al4v",
  "titanium_6al4v_eli",
]);

/** Implant-grade materials that require dedicated handling. */
const IMPLANT_STAINLESS = new Set<BiocompatibleMaterial>([
  "stainless_316l",
  "stainless_22_13_5",
]);

const COCR_MATERIALS = new Set<BiocompatibleMaterial>(["cocr_mo", "cocr_w"]);

export class TurningBiocompatibleMaterialGuardEngine {
  /**
   * Evaluate a turning setup against the biocompatibility rule set.
   */
  check(input: BiocompatInput): BiocompatResult {
    const issues: BiocompatIssue[] = [];
    const reasons: string[] = [];

    // Rule 4 (first): CMTR must be on file.
    if (input.material !== "non_implant" && !input.cmtr_on_file) {
      issues.push({
        severity: "critical",
        rule: "CMTR_REQUIRED",
        detail: `Material certificate (CMTR) not on file for ${input.material}.`,
      });
    }

    const isTi = TITANIUM_MATERIALS.has(input.material);
    const isSS = IMPLANT_STAINLESS.has(input.material);
    const isCoCr = COCR_MATERIALS.has(input.material);

    // Rule 1: Titanium + chlorinated coolant is stress-corrosion death.
    if (isTi && input.coolant.is_chlorinated) {
      issues.push({
        severity: "critical",
        rule: "TI_NO_CHLORINATED_COOLANT",
        detail:
          `Titanium ${input.material} run with chlorinated coolant (${input.coolant.name}) — ` +
          `ASTM F86 forbids chlorinated additives on Ti due to stress-corrosion cracking.`,
      });
    }

    // Rule 1: Titanium + iron-contaminated tooling / workholding.
    if (isTi) {
      for (const t of input.tooling) {
        if (t.iron_contaminated) {
          issues.push({
            severity: "critical",
            rule: "TI_NO_IRON_CONTACT",
            detail:
              `Tool ${t.tool_number} (${t.substrate}) is iron-contaminated — ` +
              `cannot touch titanium without validated decontamination cycle.`,
          });
        }
      }
      if (input.workholding.iron_contaminated) {
        issues.push({
          severity: "critical",
          rule: "TI_NO_IRON_CONTACT",
          detail:
            `Workholding (${input.workholding.kind}, ${input.workholding.material}) is iron-contaminated — ` +
            `decontaminate or swap to Ti-dedicated fixture.`,
        });
      }
    }

    // Rule 2: implant-grade stainless.
    if (isSS && !input.dedicated_machine) {
      issues.push({
        severity: "warning",
        rule: "IMPLANT_SS_DEDICATED",
        detail:
          `${input.material} is implant-grade stainless — strongly recommend dedicated machine ` +
          `or document decontamination under ISO 13485 §7.5.1.`,
      });
    }

    // Rule 3: Cobalt-chrome + aluminum contamination.
    if (isCoCr) {
      for (const t of input.tooling) {
        if (t.aluminum_contaminated) {
          issues.push({
            severity: "critical",
            rule: "COCR_NO_ALUMINUM_CONTACT",
            detail:
              `Tool ${t.tool_number} has aluminum contamination — prohibited on CoCr due to galvanic/crevice corrosion risk.`,
          });
        }
      }
      const hasCBNOrCeramic = input.tooling.some(
        t => /cbn/i.test(t.substrate) || /ceramic/i.test(t.substrate),
      );
      if (!hasCBNOrCeramic) {
        issues.push({
          severity: "warning",
          rule: "COCR_PREFERRED_TOOLING",
          detail:
            `CoCr work typically runs on CBN or ceramic inserts; no such insert declared in tooling list.`,
        });
      }
    }

    // Aggregate verdict.
    const critical = issues.filter(i => i.severity === "critical");
    const warnings = issues.filter(i => i.severity === "warning");
    let verdict: BiocompatVerdict;
    if (critical.length > 0) {
      verdict = "BLOCK";
      reasons.push(`BLOCK — ${critical.length} critical biocompatibility violation(s).`);
    } else if (warnings.length > 0) {
      verdict = "WARN";
      reasons.push(`WARN — ${warnings.length} biocompatibility warning(s). Review before run.`);
    } else if (input.material === "non_implant") {
      verdict = "ALLOW";
      reasons.push("Non-implant material — biocompatibility rules not enforced.");
    } else {
      verdict = "ALLOW";
      reasons.push("All biocompatibility checks passed.");
    }

    return { verdict, material: input.material, issues, reasons };
  }
}

/** Singleton instance. */
export const turningBiocompatibleMaterialGuardEngine = new TurningBiocompatibleMaterialGuardEngine();

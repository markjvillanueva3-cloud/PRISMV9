/**
 * PreCutChecklistEngine — first-metal-contact gate (10-axis first-part-perfect)
 *
 * Single supergate that asserts every first-part-perfect prerequisite is
 * satisfied BEFORE the machine touches metal. Returns one of three verdicts:
 *
 *   cleared  — all axes pass; release to floor
 *   gated    — some non-safety axes partial; operator approval required
 *   blocked  — any safety-critical axis fails; cannot run
 *
 * Acceptance axes (all must be verified for `cleared`):
 *  1.  stock_verified            (material certificate or XRF/hardness check)
 *  2.  datum_probed              (touch-probe verified G54 + part-zero + datums)
 *  3.  tool_offsets_verified     (in-machine tool-length + diameter measured)
 *  4.  magazine_integrity        (tool IDs match position table)
 *  5.  coolant_verified          (refractometer concentration + flow OK)
 *  6.  spindle_warmed_up         (warm-up cycle complete OR machine ≥1h on)
 *  7.  workholding_torqued       (torque-spec verified on every clamp)
 *  8.  collision_sim_passed      (full backplot + machine-envelope dry-run)
 *  9.  wcs_envelope_ok           (G54 + tool stickout within machine envelope)
 * 10. tool_life_budget_ok        (remaining life ≥ predicted job consumption)
 * 11. post_dialect_audited       (G-code matches controller dialect — no foreign macros)
 * 12. operator_skill_ok          (operator skill level ≥ part complexity)
 *
 * Reference: AS9102 FAI; ISO 22514 capability; ISO 1101 GD&T; NIST/SEMATECH
 *  e-Handbook §8.2; Sandvik / Renishaw / Sodick first-piece SOPs;
 *  21 CFR Part 820 (FDA QSR for medical); AS9100 §8.4.3.
 *
 * Safety axes (FATAL on fail): #2 datum, #4 magazine, #7 workholding,
 *  #8 collision_sim, #9 wcs_envelope, #11 post_dialect. Any one of these
 *  failing → blocked. Others → gated (operator override).
 *
 * @version 1.0.0
 * @module PreCutChecklistEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type Domain = "mill" | "lathe" | "wire-edm";

export type PreCutAxisKey =
  | "stock_verified" | "datum_probed" | "tool_offsets_verified"
  | "magazine_integrity" | "coolant_verified" | "spindle_warmed_up"
  | "workholding_torqued" | "collision_sim_passed" | "wcs_envelope_ok"
  | "tool_life_budget_ok" | "post_dialect_audited" | "operator_skill_ok";

const SAFETY_CRITICAL_AXES: ReadonlySet<PreCutAxisKey> = new Set([
  "datum_probed",
  "magazine_integrity",
  "workholding_torqued",
  "collision_sim_passed",
  "wcs_envelope_ok",
  "post_dialect_audited",
]);

export interface PreCutChecklistInput {
  domain: Domain;
  part_id: string;
  program_id: string;
  axes: Partial<Record<PreCutAxisKey, boolean>>;
  /** Operator skill level (0=trainee, 1=apprentice, 2=journeyman, 3=master) */
  operator_skill?: 0 | 1 | 2 | 3;
  /** Part complexity (0=simple, 1=moderate, 2=complex, 3=hero) */
  part_complexity?: 0 | 1 | 2 | 3;
  /** Optional override — list of axis keys the operator has manually waived */
  waived_axes?: PreCutAxisKey[];
}

export interface PreCutAxisVerdict {
  axis: PreCutAxisKey;
  passed: boolean;
  safety_critical: boolean;
  waived: boolean;
  source: string;
  remediation?: string;
}

export type PreCutVerdict = "cleared" | "gated" | "blocked";

export interface PreCutChecklistResult {
  verdict: PreCutVerdict;
  domain: Domain;
  part_id: string;
  program_id: string;
  total_axes: number;
  passed: number;
  failed: number;
  waived: number;
  safety_critical_failed: number;
  axes: PreCutAxisVerdict[];
  confidence: AtomicValue;
  warnings: string[];
}

const AXIS_SOURCES: Record<PreCutAxisKey, { source: string; remediation: string }> = {
  stock_verified:        { source: "Receiving: material cert + XRF + hardness; ASM Vol 1 §receiving",          remediation: "Run XRF / Rockwell test before issuing stock to machine" },
  datum_probed:          { source: "Renishaw / Blum touch-probe G54 + datum verification; ISO 1101",            remediation: "Run probe-macro to set G54 + verify each datum within tol" },
  tool_offsets_verified: { source: "In-machine tool presetter probe; ISO 230-3",                                  remediation: "Re-measure each tool length + diameter in machine" },
  magazine_integrity:    { source: "Tool magazine ID-vs-position audit; ISO 16090-1 §safety",                    remediation: "Verify each tool ID matches the offset-table position before run" },
  coolant_verified:      { source: "Refractometer (concentration) + flow sensor; Master Chemical app data",      remediation: "Top up coolant; verify pump pressure; check refractometer Brix" },
  spindle_warmed_up:     { source: "Spindle warm-up cycle complete (vendor-spec); ISO 230-3 §thermal",            remediation: "Run vendor warm-up cycle (typically 15-30 min staged RPM)" },
  workholding_torqued:   { source: "Torque-spec verified on every clamp; ASME B5.59 fixturing",                  remediation: "Re-torque clamps to spec; verify anti-tip; recheck clamp-contact-stress" },
  collision_sim_passed:  { source: "CNCSimulationPipelineEngine backplot + envelope; ISO 230-1",                  remediation: "Re-run full sim with current tool offsets + WCS" },
  wcs_envelope_ok:       { source: "G54 origin + tool-stickout within machine envelope; MachineLimitGuard",       remediation: "Adjust G54 or tool-stickout to stay within machine envelope" },
  tool_life_budget_ok:   { source: "StochasticToolLifeWeibull + per-tool budget; Sandvik tool-life app",          remediation: "Pre-stage spare tools or shorten job; check tool-life ledger" },
  post_dialect_audited:  { source: "Post-processor dialect validator; controller-vendor G-code spec",             remediation: "Re-run post with the correct controller dialect; no foreign macros" },
  operator_skill_ok:     { source: "Operator skill level vs part complexity matrix; AS9100 §7.2",                 remediation: "Re-assign to higher-skill operator OR pair with supervisor" },
};

export class PreCutChecklistEngine {
  /**
   * Run the 12-axis first-part-perfect gate.
   * @param input domain + part_id + per-axis pass/fail + operator/complexity
   * @returns verdict + per-axis evidence + remediation
   */
  check(input: PreCutChecklistInput): PreCutChecklistResult {
    if (!input || !input.domain || !input.part_id || !input.program_id || !input.axes) {
      throw new Error("PreCutChecklistEngine.check: domain + part_id + program_id + axes required");
    }
    const waivedSet = new Set(input.waived_axes ?? []);
    const allKeys: PreCutAxisKey[] = [
      "stock_verified", "datum_probed", "tool_offsets_verified",
      "magazine_integrity", "coolant_verified", "spindle_warmed_up",
      "workholding_torqued", "collision_sim_passed", "wcs_envelope_ok",
      "tool_life_budget_ok", "post_dialect_audited", "operator_skill_ok",
    ];

    const axes: PreCutAxisVerdict[] = [];
    let passed = 0, failed = 0, waived = 0, safetyFailed = 0;

    for (const key of allKeys) {
      const raw = input.axes[key];
      let didPass = raw === true;
      let isWaived = false;
      if (!didPass && waivedSet.has(key)) {
        // Waiver only applies to NON-safety-critical axes
        if (SAFETY_CRITICAL_AXES.has(key)) {
          // safety axis cannot be waived — operator override blocked
        } else {
          didPass = true;
          isWaived = true;
        }
      }

      // operator_skill_ok derived from skill vs complexity if no explicit pass
      if (key === "operator_skill_ok" && raw === undefined
          && input.operator_skill !== undefined && input.part_complexity !== undefined) {
        didPass = input.operator_skill >= input.part_complexity;
      }

      const meta = AXIS_SOURCES[key];
      axes.push({
        axis: key,
        passed: didPass,
        safety_critical: SAFETY_CRITICAL_AXES.has(key),
        waived: isWaived,
        source: meta.source,
        remediation: didPass ? undefined : meta.remediation,
      });

      if (didPass) passed++; else failed++;
      if (isWaived) waived++;
      if (!didPass && SAFETY_CRITICAL_AXES.has(key)) safetyFailed++;
    }

    let verdict: PreCutVerdict;
    if (safetyFailed > 0) verdict = "blocked";
    else if (failed > 0) verdict = "gated";
    else verdict = "cleared";

    const warnings: string[] = [];
    if (verdict === "blocked") {
      warnings.push(`${safetyFailed} safety-critical axis(es) failed — DO NOT start cut`);
    } else if (verdict === "gated") {
      warnings.push(`${failed} non-safety axis(es) require operator review`);
    } else {
      warnings.push("All 12 first-part-perfect axes cleared — release to floor");
    }
    if (waived > 0) {
      warnings.push(`${waived} non-safety axis(es) waived by operator — audit trail recorded`);
    }

    const confidence = passed / allKeys.length;

    return {
      verdict,
      domain: input.domain,
      part_id: input.part_id,
      program_id: input.program_id,
      total_axes: allKeys.length,
      passed,
      failed,
      waived,
      safety_critical_failed: safetyFailed,
      axes,
      confidence: {
        value: Number(confidence.toFixed(3)),
        unit: "ratio",
        source: "passed_axes / 12",
      },
      warnings,
    };
  }
}

export const preCutChecklistEngine = new PreCutChecklistEngine();

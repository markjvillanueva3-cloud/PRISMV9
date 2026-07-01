/**
 * MillProgramSignoffDossierEngine
 * =================================
 *
 * Assembles a program sign-off dossier bundling the outputs of the mill
 * simulation/verification engines into a single reviewable package.
 *
 * Mill parity for LatheProgramSignoffDossierEngine (LATHE-PRO-MS12) but
 * with the mill-canonical summary substitutions:
 *
 *   Lathe-shared summaries:
 *     - engagement (peak ae/ap/MRR, cutting block count)
 *     - stock (final bbox, sample count)
 *     - breach (first breach block, components-hit list)
 *     - time (total seconds, dominant category, bottleneck block)
 *     - deviation (max Δ, RMS, out-of-tol count, signed bias)
 *
 *   MILL-CANONICAL summaries (2 added):
 *     - chatter (peak score, high-risk block count) — ties iter75 chatter_threshold
 *       + iter79 chatter_event feedback + iter81 chatter check
 *     - fpa (FAI verdict if applicable: pass / cond_pass / rejected) — ties iter53
 *       FirstPieceApproval + iter77 lifecycle first_piece_approval state
 *
 * Verdicts: pass / warn / fail (same enum as lathe). Mill-canonical reason
 * codes added: CHATTER_RISK, FPA_REJECTED.
 *
 * Emits a pass/warn/fail verdict with reason codes, suitable for
 * attachment to the iter77 lifecycle first_piece_approval state record.
 *
 * Distinct from existing:
 *   - LatheProgramSignoffDossierEngine : lathe r/z summaries
 *   - SimulationReportEngine            : generic sim report
 *   - This engine                       : mill dossier with chatter + FPA
 *
 * References:
 *   - AS9100D §8.5.1.2 (control of production process changes)
 *   - AIAG PPAP §2.2.18 (checking aids bundling)
 *   - AS9102 First Article Inspection (FPA verdict format)
 *
 * @module engines/MillProgramSignoffDossierEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-PROGRAM-SIGNOFF-DOSSIER (iter85)
 */

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type MillSignoffVerdict = "pass" | "warn" | "fail";
export type FPAVerdict = "pass" | "cond_pass" | "rejected" | "not_applicable";

/** Mill-canonical reason codes not present in lathe taxonomy. */
export const MILL_CANONICAL_REASON_CODES = ["CHATTER_RISK", "FPA_REJECTED", "FPA_CONDITIONAL"] as const;

export interface MillSignoffEngagementSummary {
  peak_ap_mm: number;       // axial DOC
  peak_ae_mm: number;       // MILL-CANONICAL: radial engagement (no lathe analog)
  peak_mrr_mm3_s: number;
  cutting_blocks: number;
  warnings: string[];
}

export interface MillSignoffStockSummary {
  // MILL-CANONICAL: XYZ bbox (lathe has cylindrical r/z)
  final_x_mm: number;
  final_y_mm: number;
  final_z_mm: number;
  sample_count: number;
}

export interface MillSignoffBreachSummary {
  first_breach_block?: number;
  hits_count: number;
  components_hit: string[];
}

export interface MillSignoffTimeSummary {
  total_seconds: number;
  dominant_category: string;
  dominant_share_pct: number;
  bottleneck_n?: number;
}

export interface MillSignoffDeviationSummary {
  max_abs_delta_mm: number;
  rms_delta_mm: number;
  out_of_tol_count: number;
  signed_bias_mm: number;
}

/** MILL-CANONICAL: chatter summary. */
export interface MillSignoffChatterSummary {
  /** Peak chatter risk score (0..1) — from iter73/75 */
  peak_risk_score: number;
  /** Count of blocks flagged at "high" or "severe" chatter risk */
  high_risk_block_count: number;
}

/** MILL-CANONICAL: FPA summary (AS9102). */
export interface MillSignoffFPASummary {
  verdict: FPAVerdict;
  passed_feature_count: number;
  failed_feature_count: number;
  warning_feature_count: number;
}

export interface MillProgramSignoffDossierInput {
  program_id: string;
  engagement: MillSignoffEngagementSummary;
  stock: MillSignoffStockSummary;
  breach: MillSignoffBreachSummary;
  time: MillSignoffTimeSummary;
  deviation?: MillSignoffDeviationSummary;
  /** Tolerance band used in deviation map (mm) */
  deviation_tol_mm?: number;
  /** MILL-CANONICAL: chatter risk summary (optional) */
  chatter?: MillSignoffChatterSummary;
  /** MILL-CANONICAL: FPA summary (optional) */
  fpa?: MillSignoffFPASummary;
}

export interface MillProgramSignoffDossierResult {
  program_id: string;
  verdict: MillSignoffVerdict;
  reason_codes: string[];
  highlights: string[];
  warnings: string[];
  reasoning: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS — chatter thresholds
// ═══════════════════════════════════════════════════════════════════════

/** Chatter risk score above which the dossier flags CHATTER_RISK reason. */
export const CHATTER_RISK_THRESHOLD = 0.5;
/** High-risk block count above which CHATTER_RISK is escalated to warn. */
export const CHATTER_HIGH_RISK_BLOCK_THRESHOLD = 3;

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillProgramSignoffDossierEngineImpl {
  assemble(i: MillProgramSignoffDossierInput): MillProgramSignoffDossierResult {
    this.validate(i);
    const reasons: string[] = [];
    const highlights: string[] = [];
    const warnings: string[] = [...(i.engagement.warnings ?? [])];
    const reasoning: string[] = [];
    let verdict: MillSignoffVerdict = "pass";

    // ── Hard-fail conditions ─────────────────────────────────────────
    if (i.breach.first_breach_block !== undefined || i.breach.hits_count > 0) {
      verdict = "fail";
      reasons.push("ENVELOPE_BREACH");
      warnings.push(`Breach detected at block ${i.breach.first_breach_block ?? "?"}`);
    }

    if (i.deviation && i.deviation.out_of_tol_count > 0) {
      verdict = "fail";
      reasons.push("DEVIATION_OUT_OF_TOL");
      warnings.push(`${i.deviation.out_of_tol_count} deviation samples out of tolerance`);
    }

    // MILL-CANONICAL: FPA rejected = hard fail
    if (i.fpa && i.fpa.verdict === "rejected") {
      verdict = "fail";
      reasons.push("FPA_REJECTED");
      warnings.push(`FPA rejected — ${i.fpa.failed_feature_count} feature(s) failed`);
    }

    // ── Warn-level conditions (only fire when not already failed) ────
    // MILL-CANONICAL: high chatter risk
    if (i.chatter && i.chatter.peak_risk_score >= CHATTER_RISK_THRESHOLD) {
      if (verdict === "pass") verdict = "warn";
      reasons.push("CHATTER_RISK");
      warnings.push(
        `Peak chatter risk ${i.chatter.peak_risk_score.toFixed(2)} >= ${CHATTER_RISK_THRESHOLD} ` +
        `(${i.chatter.high_risk_block_count} high-risk block(s))`,
      );
    }
    // MILL-CANONICAL: FPA conditional → warn
    if (i.fpa && i.fpa.verdict === "cond_pass") {
      if (verdict === "pass") verdict = "warn";
      reasons.push("FPA_CONDITIONAL");
      warnings.push(`FPA conditional pass — ${i.fpa.warning_feature_count} feature(s) flagged`);
    }

    // Engagement warnings escalate to warn (not fail) — only if no fail yet
    if (verdict === "pass" && (i.engagement.warnings?.length ?? 0) > 0) {
      verdict = "warn";
      reasons.push("ENGAGEMENT_WARNING");
    }

    // Deviation bias warning
    if (i.deviation && i.deviation_tol_mm) {
      if (Math.abs(i.deviation.signed_bias_mm) > i.deviation_tol_mm / 2) {
        if (verdict === "pass") verdict = "warn";
        reasons.push("SYSTEMATIC_BIAS");
        warnings.push(`Signed bias |${i.deviation.signed_bias_mm}| > tol/2`);
      }
    }

    // ── Highlights ───────────────────────────────────────────────────
    highlights.push(`Cycle: ${i.time.total_seconds.toFixed(1)}s (${i.time.dominant_category} ${i.time.dominant_share_pct}%)`);
    highlights.push(`Peak ap ${i.engagement.peak_ap_mm.toFixed(3)}mm · peak ae ${i.engagement.peak_ae_mm.toFixed(3)}mm · MRR ${i.engagement.peak_mrr_mm3_s.toFixed(1)} mm³/s`);
    highlights.push(`Stock XYZ bbox=[${i.stock.final_x_mm}, ${i.stock.final_y_mm}, ${i.stock.final_z_mm}]mm`);
    if (i.breach.hits_count === 0) highlights.push("Envelope clear (0 breaches)");
    if (i.deviation) highlights.push(`Deviation max Δ=${i.deviation.max_abs_delta_mm}mm, RMS=${i.deviation.rms_delta_mm}mm`);
    if (i.chatter) {
      const tier = i.chatter.peak_risk_score >= CHATTER_RISK_THRESHOLD ? "elevated" : "low";
      highlights.push(`Chatter: ${tier} (peak=${i.chatter.peak_risk_score.toFixed(2)}, ${i.chatter.high_risk_block_count} hi-risk blocks)`);
    }
    if (i.fpa) {
      highlights.push(`FPA: ${i.fpa.verdict} (${i.fpa.passed_feature_count} pass / ${i.fpa.warning_feature_count} warn / ${i.fpa.failed_feature_count} fail)`);
    }

    reasoning.push(`Program ${i.program_id}: verdict ${verdict}`);
    reasoning.push(`${reasons.length} reason code(s); ${highlights.length} highlight(s)`);

    return {
      program_id: i.program_id,
      verdict,
      reason_codes: reasons,
      highlights,
      warnings,
      reasoning,
    };
  }

  getStats(): {
    verdicts: MillSignoffVerdict[];
    reason_codes_lathe_shared: string[];
    mill_canonical_reason_codes: readonly string[];
    chatter_risk_threshold: number;
    chatter_high_risk_block_threshold: number;
    reference: string;
  } {
    return {
      verdicts: ["pass", "warn", "fail"],
      reason_codes_lathe_shared: [
        "ENVELOPE_BREACH", "DEVIATION_OUT_OF_TOL", "ENGAGEMENT_WARNING", "SYSTEMATIC_BIAS",
      ],
      mill_canonical_reason_codes: MILL_CANONICAL_REASON_CODES,
      chatter_risk_threshold: CHATTER_RISK_THRESHOLD,
      chatter_high_risk_block_threshold: CHATTER_HIGH_RISK_BLOCK_THRESHOLD,
      reference: "AS9100D §8.5.1.2; AIAG PPAP §2.2.18; AS9102 FAI",
    };
  }

  private validate(i: MillProgramSignoffDossierInput): void {
    if (!i || typeof i !== "object") throw new TypeError("MillProgramSignoffDossierEngine.assemble: input required");
    if (typeof i.program_id !== "string" || i.program_id.length === 0) throw new TypeError("program_id required");
    if (!i.engagement) throw new TypeError("engagement summary required");
    if (!i.stock) throw new TypeError("stock summary required");
    if (!i.breach) throw new TypeError("breach summary required");
    if (!i.time) throw new TypeError("time summary required");
  }
}

export const millProgramSignoffDossierEngine = new MillProgramSignoffDossierEngineImpl();
export type { MillProgramSignoffDossierEngineImpl };

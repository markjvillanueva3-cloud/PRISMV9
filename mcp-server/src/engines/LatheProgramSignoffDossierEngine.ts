/**
 * LatheProgramSignoffDossierEngine
 * ==================================
 *
 * Assembles a program sign-off dossier bundling the outputs of the other
 * MS12 simulation/verification engines into a single reviewable package:
 *   - block engagement summary (peak DoC, peak MRR)
 *   - stock-evolution final profile summary
 *   - envelope breach replay result (first breach, hit count)
 *   - block-time profile (total seconds, dominant category)
 *   - deviation map (max Δr, out-of-tol count)
 *
 * Emits a pass/warn/fail verdict with reason codes, suitable for
 * attachment to a first-piece approval record or travel sheet.
 *
 * Distinct from existing:
 *   - SimulationReportEngine       : generic sim report, no lathe bundling
 *   - *VerificationEngine (several) : single-aspect verification
 *   - LatheFirstPieceApprovalEngine : PPAP first-off approval record
 *   - This engine                  : program-signoff dossier aggregator
 *
 * References:
 *   - AS9100D §8.5.1.2 (control of production process changes)
 *   - AIAG PPAP §2.2.18 (checking aids bundling)
 *
 * @module engines/LatheProgramSignoffDossierEngine
 * @milestone LATHE-PRO-MS12
 */

export type SignoffVerdict = "pass" | "warn" | "fail";

export interface SignoffEngagementSummary {
  peak_doc_mm: number;
  peak_mrr_mm3_s: number;
  cutting_blocks: number;
  warnings: string[];
}

export interface SignoffStockSummary {
  final_length_mm: number;
  min_r_mm: number;
  max_r_mm: number;
  sample_count: number;
}

export interface SignoffBreachSummary {
  first_breach_block?: number;
  hits_count: number;
  components_hit: string[];
}

export interface SignoffTimeSummary {
  total_seconds: number;
  dominant_category: string;
  dominant_share_pct: number;
  bottleneck_n?: number;
}

export interface SignoffDeviationSummary {
  max_abs_delta_mm: number;
  rms_delta_mm: number;
  out_of_tol_count: number;
  signed_bias_mm: number;
}

export interface LatheProgramSignoffDossierInput {
  program_id: string;
  engagement: SignoffEngagementSummary;
  stock: SignoffStockSummary;
  breach: SignoffBreachSummary;
  time: SignoffTimeSummary;
  deviation?: SignoffDeviationSummary;
  /** Tolerance band used in deviation map (mm) */
  deviation_tol_mm?: number;
}

export interface LatheProgramSignoffDossierResult {
  program_id: string;
  verdict: SignoffVerdict;
  reason_codes: string[];
  highlights: string[];
  warnings: string[];
  reasoning: string[];
}

class LatheProgramSignoffDossierEngineImpl {
  assemble(i: LatheProgramSignoffDossierInput): LatheProgramSignoffDossierResult {
    const reasons: string[] = [];
    const highlights: string[] = [];
    const warnings: string[] = [...(i.engagement.warnings ?? [])];
    const reasoning: string[] = [];
    let verdict: SignoffVerdict = "pass";

    // Breach = hard fail
    if (i.breach.first_breach_block !== undefined || i.breach.hits_count > 0) {
      verdict = "fail";
      reasons.push("ENVELOPE_BREACH");
      warnings.push(`Breach detected at block ${i.breach.first_breach_block ?? "?"}`);
    }

    // Deviation out-of-tol = fail
    if (i.deviation && i.deviation.out_of_tol_count > 0) {
      verdict = verdict === "fail" ? "fail" : "fail";
      reasons.push("DEVIATION_OUT_OF_TOL");
      warnings.push(`${i.deviation.out_of_tol_count} deviation samples out of tolerance`);
    }

    // Engagement warnings escalate to warn (not fail)
    if (verdict !== "fail" && warnings.length > 0) {
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

    // Highlights
    highlights.push(`Cycle: ${i.time.total_seconds.toFixed(1)}s (${i.time.dominant_category} ${i.time.dominant_share_pct}%)`);
    highlights.push(`Peak DoC ${i.engagement.peak_doc_mm.toFixed(3)}mm / peak MRR ${i.engagement.peak_mrr_mm3_s.toFixed(1)} mm³/s`);
    highlights.push(`Stock final r∈[${i.stock.min_r_mm}, ${i.stock.max_r_mm}]mm, L=${i.stock.final_length_mm}mm`);
    if (i.breach.hits_count === 0) highlights.push("Envelope clear (0 breaches)");
    if (i.deviation) highlights.push(`Deviation max Δr=${i.deviation.max_abs_delta_mm}mm, RMS=${i.deviation.rms_delta_mm}mm`);

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

  getStats(): { verdicts: string[]; reference: string } {
    return {
      verdicts: ["pass", "warn", "fail"],
      reference: "AS9100D §8.5.1.2; AIAG PPAP §2.2.18",
    };
  }
}

export const latheProgramSignoffDossierEngine = new LatheProgramSignoffDossierEngineImpl();
export type { LatheProgramSignoffDossierEngineImpl };

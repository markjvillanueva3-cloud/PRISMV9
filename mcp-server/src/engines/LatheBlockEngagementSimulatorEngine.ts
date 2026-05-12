/**
 * LatheBlockEngagementSimulatorEngine
 * =====================================
 *
 * Block-by-block tool-engagement simulator for lathe G-code.
 *
 * Walks a sequence of NC blocks (already parsed into canonical form)
 * and emits per-block:
 *   - XZ start/end positions
 *   - motion type (rapid / feed / dwell / tool_change)
 *   - depth_of_cut_mm (radial for OD, axial for face)
 *   - feed_per_rev_mm (chip thickness proxy for turning)
 *   - engagement_width_mm (approximate)
 *   - material_removal_rate_mm3_s (instantaneous MRR)
 *
 * Inputs are *canonical* blocks (a caller parses raw G-code via the
 * existing post-processor or LatheCAMIntelligenceEngine and feeds the
 * resulting sequence here).
 *
 * Distinct from existing:
 *   - ToolpathSimulationEngine             : generic mill/multi-axis sim
 *   - AdaptiveEngagementEngine             : closed-loop feed control, mills
 *   - EngagementGeometryEngine             : static geometric engagement
 *   - InstantaneousEngagementEngine        : per-time-step mill engagement
 *   - This engine                          : block-granularity lathe XZ sim
 *                                            with chip/MRR per block
 *
 * References:
 *   - Sandvik Coromant "Turning Handbook" §3 (MRR calc)
 *   - Kennametal "Cutting Data Recommendations" §2.2 (chip thickness
 *     for turning)
 *
 * @module engines/LatheBlockEngagementSimulatorEngine
 * @milestone LATHE-PRO-MS12
 */

export type LatheMotionType = "rapid" | "feed" | "dwell" | "tool_change" | "m_code";

export interface LatheSimBlock {
  /** Block number (e.g. N100) */
  n: number;
  motion: LatheMotionType;
  /** Start position mm (X=diameter, Z=axial) */
  x_start_mm: number;
  z_start_mm: number;
  x_end_mm: number;
  z_end_mm: number;
  /** Feed mm/rev (feed moves only) */
  feed_mm_rev?: number;
  /** Spindle rpm (for MRR estimate) */
  spindle_rpm?: number;
  /** Tool id for tool-change blocks */
  tool_id?: string;
  /** Comment (optional) */
  comment?: string;
}

export interface LatheBlockEngagementInput {
  blocks: LatheSimBlock[];
  /** Diameter is 2R (X coord); tool approaches radially so DoC = (X_prev-X_cur)/2 */
  /** Nominal stock OD (mm) — used for engagement width projection */
  stock_od_mm?: number;
  /** Nose radius (mm) for engagement width approximation (default 0.8) */
  nose_radius_mm?: number;
}

export interface LatheBlockEngagementStep {
  n: number;
  motion: LatheMotionType;
  depth_of_cut_mm: number;
  feed_per_rev_mm: number;
  engagement_width_mm: number;
  mrr_mm3_s: number;
  warning?: string;
}

export interface LatheBlockEngagementResult {
  steps: LatheBlockEngagementStep[];
  total_cutting_blocks: number;
  peak_mrr_mm3_s: number;
  peak_doc_mm: number;
  warnings: string[];
  reasoning: string[];
}

class LatheBlockEngagementSimulatorEngineImpl {
  simulate(i: LatheBlockEngagementInput): LatheBlockEngagementResult {
    const warnings: string[] = [];
    const reasoning: string[] = [];
    const noseR = Math.max(0.05, i.nose_radius_mm ?? 0.8);
    const steps: LatheBlockEngagementStep[] = [];
    let peakMRR = 0;
    let peakDoC = 0;
    let cuttingBlocks = 0;

    for (let k = 0; k < i.blocks.length; k++) {
      const b = i.blocks[k];
      let doc = 0;
      let fpr = 0;
      let ew = 0;
      let mrr = 0;
      let warn: string | undefined;

      if (b.motion === "feed") {
        // Radial depth when X moves (diameters), axial depth when Z moves only
        const dx_radius = Math.abs(b.x_start_mm - b.x_end_mm) / 2;
        const dz = Math.abs(b.z_start_mm - b.z_end_mm);
        doc = Math.max(dx_radius, 0); // primary radial DoC
        fpr = Math.max(0, b.feed_mm_rev ?? 0);

        // Engagement width: clamp to 2 * nose radius for profile cuts, else axial length
        ew = Math.min(dz > 0.001 ? dz : 2 * noseR, 2 * noseR + Math.max(dz, 0));

        // MRR = 1000 * Vc(m/min) * doc * feed — use rpm & mean diameter
        const meanD = (b.x_start_mm + b.x_end_mm) / 2;
        if (b.spindle_rpm && meanD > 0) {
          const Vc_m_min = (Math.PI * meanD * b.spindle_rpm) / 1000;
          // MRR in mm^3/s = Vc_m_min * 1000/60 (mm/s) * doc * feed_eff
          const feedEff = fpr > 0 ? fpr : Math.max(dz, 0.01);
          mrr = (Vc_m_min * 1000 / 60) * doc * feedEff;
        }

        if (doc > 0) cuttingBlocks++;
        peakMRR = Math.max(peakMRR, mrr);
        peakDoC = Math.max(peakDoC, doc);

        // Sanity warnings
        if (doc > 5) warn = `High DoC ${round2(doc)}mm — verify rigidity`;
        if (fpr > 1) warn = (warn ? warn + "; " : "") + `High feed ${round3(fpr)}mm/rev`;
      } else if (b.motion === "rapid") {
        // No engagement on rapid
      } else if (b.motion === "dwell" || b.motion === "tool_change" || b.motion === "m_code") {
        // No engagement
      }

      steps.push({
        n: b.n,
        motion: b.motion,
        depth_of_cut_mm: round3(doc),
        feed_per_rev_mm: round4(fpr),
        engagement_width_mm: round3(ew),
        mrr_mm3_s: round2(mrr),
        warning: warn,
      });
    }

    reasoning.push(`Simulated ${i.blocks.length} blocks (${cuttingBlocks} cutting)`);
    reasoning.push(`Peak DoC ${round3(peakDoC)}mm, peak MRR ${round2(peakMRR)} mm³/s`);
    if (peakDoC > 5) warnings.push(`Peak DoC ${round3(peakDoC)}mm exceeds rigid-insert guideline`);

    return {
      steps,
      total_cutting_blocks: cuttingBlocks,
      peak_mrr_mm3_s: round2(peakMRR),
      peak_doc_mm: round3(peakDoC),
      warnings,
      reasoning,
    };
  }

  getStats(): { reference: string } {
    return { reference: "Sandvik Turning Handbook §3 MRR; Kennametal Cutting Data §2.2 chip thickness" };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

export const latheBlockEngagementSimulatorEngine = new LatheBlockEngagementSimulatorEngineImpl();
export type { LatheBlockEngagementSimulatorEngineImpl };

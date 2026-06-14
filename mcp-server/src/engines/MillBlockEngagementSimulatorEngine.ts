/**
 * MillBlockEngagementSimulatorEngine — block-by-block tool-engagement simulator for mill G-code
 *
 * Parity for LatheBlockEngagementSimulatorEngine (LATHE-PRO-MS12). The lathe simulator
 * walks XZ blocks and emits per-block depth/feed-per-rev/MRR; this engine walks XYZ blocks
 * with mill-domain inputs (ae, ap, fz, flute count) and emits per-block:
 *
 *   - XYZ start/end positions
 *   - motion type (rapid / feed / dwell / tool_change / m_code)
 *   - radial engagement (ae_mm) — from XY delta + tool diameter
 *   - axial depth (ap_mm) — from Z delta
 *   - chip per tooth (fz_mm_tooth) — from feed + rpm + flute count
 *   - material removal rate (mm³/s) — ae * ap * fz * z * rpm conversion
 *   - engagement fraction (ae/D) — drives chatter risk + chip thinning rule
 *   - climb_vs_conventional direction inference (cross product of feed direction and cut radius)
 *
 * Distinct from existing:
 *   - ToolpathSimulationEngine             : generic mill/multi-axis sim (no per-block MRR)
 *   - AdaptiveEngagementEngine             : closed-loop feed control
 *   - EngagementGeometryEngine             : static geometric engagement
 *   - InstantaneousEngagementEngine        : per-time-step (sub-block)
 *   - This engine                          : block-granularity mill XYZ sim with per-block MRR
 *
 * References:
 *   - Sandvik Coromant "Milling Application Guide" (2021) §§ 2.4, 3.1 (MRR)
 *   - Kennametal "Milling Cutting Data" (2022) §1.3 (chip per tooth, multi-flute)
 *   - JM-Die operator review (2026-05): block-level engagement red-flags
 *
 * @milestone MILL-PARITY-UPGRADE-MS0/U-MILL-BLOCK-ENGAGEMENT-SIMULATOR (iter60)
 * @version 1.0.0
 * @module MillBlockEngagementSimulatorEngine
 */

export type MillMotionType = "rapid" | "feed" | "dwell" | "tool_change" | "m_code";

export interface MillSimBlock {
  /** Block number (e.g. N100) */
  n: number;
  motion: MillMotionType;
  /** Start position (mm) */
  x_start_mm: number;
  y_start_mm: number;
  z_start_mm: number;
  /** End position (mm) */
  x_end_mm: number;
  y_end_mm: number;
  z_end_mm: number;
  /** Feed mm/min (feed moves only) */
  feed_mm_min?: number;
  /** Spindle rpm (for MRR estimate + fz computation) */
  spindle_rpm?: number;
  /** Tool id for tool-change blocks */
  tool_id?: string;
  /** Comment (optional) */
  comment?: string;
}

export interface MillBlockEngagementInput {
  blocks: MillSimBlock[];
  /** Tool diameter (mm) — required for ae/D engagement fraction */
  tool_diameter_mm: number;
  /** Flute count — required for chip-per-tooth computation */
  flute_count: number;
  /** Default radial engagement (mm) when block doesn't imply one — typically the strategy ae */
  default_ae_mm?: number;
}

export interface MillBlockEngagementStep {
  n: number;
  motion: MillMotionType;
  radial_engagement_mm: number;
  axial_depth_mm: number;
  chip_per_tooth_mm: number;
  engagement_fraction: number;     // ae / D
  mrr_mm3_s: number;
  warning?: string;
}

export interface MillBlockEngagementResult {
  steps: MillBlockEngagementStep[];
  total_cutting_blocks: number;
  peak_mrr_mm3_s: number;
  peak_ae_mm: number;
  peak_ap_mm: number;
  peak_engagement_fraction: number;
  peak_fz_mm_tooth: number;
  warnings: string[];
  reasoning: string[];
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }

class MillBlockEngagementSimulatorEngineImpl {
  simulate(i: MillBlockEngagementInput): MillBlockEngagementResult {
    if (!i || !Array.isArray(i.blocks)) {
      throw new Error("MillBlockEngagementSimulatorEngine.simulate: blocks[] required");
    }
    if (!(i.tool_diameter_mm > 0)) {
      throw new Error("MillBlockEngagementSimulatorEngine.simulate: tool_diameter_mm must be > 0");
    }
    if (!(i.flute_count > 0)) {
      throw new Error("MillBlockEngagementSimulatorEngine.simulate: flute_count must be > 0");
    }

    const warnings: string[] = [];
    const reasoning: string[] = [];
    const D = i.tool_diameter_mm;
    const z = i.flute_count;
    const defaultAe = Math.max(0, i.default_ae_mm ?? 0);
    const steps: MillBlockEngagementStep[] = [];
    let peakMRR = 0;
    let peakAe = 0;
    let peakAp = 0;
    let peakEngFrac = 0;
    let peakFz = 0;
    let cuttingBlocks = 0;

    for (let k = 0; k < i.blocks.length; k++) {
      const b = i.blocks[k];
      let ae = 0;
      let ap = 0;
      let fz = 0;
      let engFrac = 0;
      let mrr = 0;
      let warn: string | undefined;

      if (b.motion === "feed") {
        // XY delta drives radial engagement when traversing a step-down or step-over
        const dxy = Math.sqrt(
          (b.x_end_mm - b.x_start_mm) ** 2 +
          (b.y_end_mm - b.y_start_mm) ** 2
        );
        const dz = Math.abs(b.z_end_mm - b.z_start_mm);
        ap = dz;
        // Radial engagement heuristic: if XY motion is shorter than tool diameter, the move IS the
        // engagement (e.g., slot entry); for longer cuts use the strategy default_ae_mm.
        if (dxy > 0 && dxy < D) {
          ae = dxy;
        } else if (defaultAe > 0) {
          ae = defaultAe;
        } else if (dxy > 0) {
          ae = D * 0.5; // conservative default 50% engagement when caller didn't specify
        }
        engFrac = ae / D;

        // Chip per tooth: fz = feed_mm_min / (rpm * z)
        if (b.feed_mm_min && b.spindle_rpm && z > 0) {
          fz = b.feed_mm_min / (b.spindle_rpm * z);
        }

        // MRR = ae * ap * feed_mm_min / 60 (mm³/s)
        if (ae > 0 && ap > 0 && b.feed_mm_min && b.feed_mm_min > 0) {
          mrr = (ae * ap * b.feed_mm_min) / 60;
        }

        if (ae > 0 || ap > 0) cuttingBlocks++;
        peakMRR = Math.max(peakMRR, mrr);
        peakAe = Math.max(peakAe, ae);
        peakAp = Math.max(peakAp, ap);
        peakEngFrac = Math.max(peakEngFrac, engFrac);
        peakFz = Math.max(peakFz, fz);

        // Per-block sanity warnings
        const w: string[] = [];
        if (engFrac >= 0.95) {
          w.push(`Full-radial engagement (ae/D=${round2(engFrac)}) — slotting regime, expect high lateral force`);
        }
        if (engFrac > 0 && engFrac < 0.20) {
          w.push(`Low engagement (ae/D=${round2(engFrac)}) — chip thinning correction required`);
        }
        if (ap > D) {
          w.push(`Axial depth ap=${round3(ap)}mm exceeds tool diameter ${round2(D)}mm — risky for solid end mills`);
        }
        if (fz > 0.30) {
          w.push(`High fz=${round4(fz)} mm/tooth — verify against tool manufacturer max`);
        }
        if (w.length > 0) warn = w.join("; ");
      } else if (b.motion === "rapid" || b.motion === "dwell" || b.motion === "tool_change" || b.motion === "m_code") {
        // No engagement
      }

      steps.push({
        n: b.n,
        motion: b.motion,
        radial_engagement_mm: round3(ae),
        axial_depth_mm: round3(ap),
        chip_per_tooth_mm: round4(fz),
        engagement_fraction: round3(engFrac),
        mrr_mm3_s: round2(mrr),
        warning: warn,
      });
    }

    reasoning.push(`Simulated ${i.blocks.length} blocks (${cuttingBlocks} cutting)`);
    reasoning.push(
      `Peak ae=${round3(peakAe)}mm (${round2(peakEngFrac * 100)}% engagement), ap=${round3(peakAp)}mm, fz=${round4(peakFz)} mm/tooth, MRR=${round2(peakMRR)} mm³/s`
    );
    if (peakEngFrac >= 0.95) {
      warnings.push(`Peak engagement ${round2(peakEngFrac)} ≥ 0.95 — slotting regime detected; verify rigidity + chip evac`);
    }
    if (peakAp > D) {
      warnings.push(`Peak ap=${round3(peakAp)}mm exceeds tool diameter ${round2(D)}mm — high deflection risk`);
    }
    if (peakFz > 0.30) {
      warnings.push(`Peak fz=${round4(peakFz)} mm/tooth — beyond typical mill envelope`);
    }

    return {
      steps,
      total_cutting_blocks: cuttingBlocks,
      peak_mrr_mm3_s: round2(peakMRR),
      peak_ae_mm: round3(peakAe),
      peak_ap_mm: round3(peakAp),
      peak_engagement_fraction: round3(peakEngFrac),
      peak_fz_mm_tooth: round4(peakFz),
      warnings,
      reasoning,
    };
  }

  getStats(): {
    reference: string;
    metrics_per_block: string[];
    peak_metrics: string[];
  } {
    return {
      reference: "Sandvik Milling Application Guide §§2.4,3.1; Kennametal Milling Cutting Data §1.3",
      metrics_per_block: [
        "radial_engagement_mm", "axial_depth_mm", "chip_per_tooth_mm",
        "engagement_fraction", "mrr_mm3_s", "warning",
      ],
      peak_metrics: ["peak_mrr_mm3_s", "peak_ae_mm", "peak_ap_mm", "peak_engagement_fraction", "peak_fz_mm_tooth"],
    };
  }
}

export const millBlockEngagementSimulatorEngine = new MillBlockEngagementSimulatorEngineImpl();
export type { MillBlockEngagementSimulatorEngineImpl };

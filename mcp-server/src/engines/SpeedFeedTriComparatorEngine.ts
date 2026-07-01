/**
 * SpeedFeedTriComparatorEngine — unified PRISM vs HSMAdvisor vs G-Wizard comparison.
 *
 * The headline of OSCAR-SFC-3WAY-MS0. Stacks the three speed/feed "opinions" for ONE canonical
 * cut onto a single axis basis (PRISM-canonical metric: vc m/min, fz mm/tooth, rpm, feed mm/min,
 * mrr cm³/min) so an operator — or the self-tuning loop — can see at a glance where PRISM agrees
 * with the field and where it diverges.
 *
 * --- HONESTY: HSMAdvisor and G-Wizard are state FILES, not headless engines (R12) ---
 *
 * Neither HSMAdvisor nor G-Wizard exposes an API we can drive for an arbitrary (material, tool,
 * operation). HSMAdvisor publishes only its *currently-open* <Cut>; G-Wizard publishes its tool
 * *crib* (per-tool proven sfm/ipt, no workpiece material). So this engine does NOT pretend to
 * "run all three systems on demand". It:
 *   1. computes PRISM for the canonical input (always),
 *   2. reads the curated literature baseline (Sandvik / Kennametal / CNCCookbook / Titans /
 *      HSMAdvisor-public-table) via SpeedFeedBaselineComparatorEngine — the ALWAYS-ON grounded
 *      external reference,
 *   3. best-effort folds in HSMAdvisor's live <Cut> (if the operator has one open AND it aligns
 *      with the canonical tool), and
 *   4. best-effort folds in a matching G-Wizard crib tool (if present).
 * Systems that aren't installed / don't align are marked `available:false` with a reason — never
 * fabricated. The baseline is what makes "compared against all 3 systems" honest for the long
 * tail of combinations that have no live HSMAdvisor/G-Wizard data point.
 *
 * --- Consensus + verdict ---
 *
 * `consensus` = the per-axis MEDIAN across the *available external* systems (baseline + any live
 * HSMAdvisor/G-Wizard) — NOT including PRISM (PRISM is the thing being judged). `prism_vs_consensus`
 * then reports, per axis, whether PRISM is aligned (|Δ| ≤ 10%), more aggressive ("prism_higher"),
 * or more conservative ("prism_lower"), plus a geometric-mean agreement. This is the signal the
 * SpeedFeedSelfTuningEngine consumes to pull PRISM toward (or deliberately past) the field.
 *
 * Pure composition (R8/R11): delegates to speedFeedBaselineComparatorEngine (which itself runs the
 * NineAxisOrchestrator ONCE — we reuse that run for PRISM, so the whole tri-compare is a single
 * physics run), gWizardComparatorBridgeEngine.prepare (no extra physics run), and
 * hsmAdvisorAdapterEngine.read. No physics is re-implemented here.
 *
 * @module engines/SpeedFeedTriComparatorEngine
 * @milestone OSCAR-SFC-3WAY-MS0/U-TRI-COMPARE (slot:oscar, 2026-06-02)
 * @author oscar (slot:oscar)
 */

import { z } from "zod";
import {
  speedFeedBaselineComparatorEngine,
} from "./SpeedFeedBaselineComparatorEngine.js";
import { gWizardComparatorBridgeEngine } from "./GWizardComparatorBridgeEngine.js";
import { hsmAdvisorAdapterEngine, type HSMAdvisorState } from "./HSMAdvisorAdapterEngine.js";
import type { NineAxisInput, NineAxisResult, OptimizationMode } from "./SpeedFeedNineAxisOrchestratorEngine.js";
import type { ISOGroup, Operation, CutType, ToolMaterial } from "./UltimateSpeedFeedEngine.js";

// Exact unit conversions (NOT physics constants).
const FT_PER_MIN_TO_M_PER_MIN = 0.3048;
const INCH_TO_MM = 25.4;
const IN3_TO_CM3 = 16.387064;
const ALIGN_TOLERANCE = 0.05; // ±5% diameter match for HSMAdvisor live-cut alignment
const VERDICT_BAND = 0.1; // |Δ| ≤ 10% from consensus ⇒ "aligned"

// ============================================================================
// INPUT SCHEMA
// ============================================================================

const MaterialSchema = z
  .object({
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
    name: z.string().optional(),
    hardness_hb: z.number().positive().optional(),
    hardness_hrc: z.number().positive().optional(),
  })
  .refine((m) => m.iso_group !== undefined || (m.name !== undefined && m.name.length > 0), {
    message: "material requires at least one of { iso_group, name }",
  });

export const TriCompareInputSchema = z.object({
  material: MaterialSchema,
  tooling: z.object({
    tool_diameter_mm: z.number().positive(),
    flutes: z.number().int().positive().optional(),
    tool_material: z.enum(["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"]).optional(),
    coating: z.string().optional(),
    helix_angle_deg: z.number().optional(),
    corner_radius_mm: z.number().nonnegative().optional(),
    stickout_mm: z.number().positive().optional(),
  }),
  toolpath: z
    .object({
      operation: z.enum(["milling", "turning", "drilling", "tapping", "reaming", "boring", "thread_milling"]).optional(),
      cut_type: z.enum(["roughing", "semi_finishing", "finishing"]).optional(),
      axial_depth_mm: z.number().positive().optional(),
      radial_depth_mm: z.number().positive().optional(),
    })
    .optional(),
  optimization_mode: z.enum(["cost_batch", "aggressive_rush", "prism_optimized"]).optional(),

  // External-system controls (all best-effort; unavailable systems are marked, never fabricated).
  include_baseline: z.boolean().optional(), // default true
  include_hsmadvisor: z.boolean().optional(), // default true
  include_gwizard: z.boolean().optional(), // default true
  /** Inject an HSMAdvisor state instead of reading disk (tests / explicit replay). */
  hsmadvisor_state_override: z.unknown().optional(),
  hsmadvisor_settings_path: z.string().optional(),
  /** Inject a G-Wizard crib state instead of reading disk. */
  gwizard_state_override: z.unknown().optional(),
  gwizard_toolcrib_path: z.string().optional(),
  /** Select which G-Wizard crib tool to compare (else first tool). */
  gwizard_tool_selector: z
    .object({
      guid: z.string().optional(),
      key: z.number().optional(),
      slot: z.number().optional(),
      description_contains: z.string().optional(),
    })
    .optional(),
});

export type TriCompareInput = z.infer<typeof TriCompareInputSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

export type SystemName = "prism" | "baseline" | "hsmadvisor" | "gwizard";

/** A system's recommendation in PRISM-canonical metric (NaN/undefined where the system is silent). */
export interface SystemAxes {
  vc_mpm: number;
  fz_mm: number;
  rpm: number;
  feed_mmmin: number;
  mrr_cm3min: number | null;
}

export interface SystemOpinion {
  system: SystemName;
  available: boolean;
  unavailable_reason?: string;
  axes: SystemAxes | null;
  source_note: string;
  /** HSMAdvisor only: does its live cut's tool actually match the canonical input? */
  aligned?: boolean;
  /** PRISM only (U-OSC-VC-UNCAPPED-PARITY): the recommended surface speed BEFORE the machine/holder
   *  max-RPM cap. Vendor cribs publish UNCAPPED surface speeds, so compare THIS for apples-to-apples
   *  parity; `axes.vc_mpm` is the post-cap ACHIEVABLE value. Always set on the PRISM opinion. */
  vc_uncapped_mpm?: number;
  /** PRISM only: true when axes.vc_mpm was reduced by the machine/holder RPM cap (vc_mpm < vc_uncapped_mpm). */
  rpm_capped?: boolean;
}

export type AxisVerdict = "aligned" | "prism_higher" | "prism_lower" | "no_consensus";

export interface PrismVsConsensusAxis {
  axis: "vc" | "fz" | "rpm" | "feed";
  prism: number;
  consensus: number;
  delta_abs: number;
  delta_pct: number;
  verdict: AxisVerdict;
  agreement: number;
}

export interface TriCompareResult {
  canonical_input: {
    iso_group: ISOGroup;
    tool_material: ToolMaterial;
    operation: Operation;
    cut_type: CutType;
    tool_diameter_mm: number;
    flutes: number | null;
    mode: OptimizationMode;
  };
  /** Every system, in fixed order [prism, baseline, hsmadvisor, gwizard]. */
  systems: SystemOpinion[];
  /** Per-axis median across AVAILABLE EXTERNAL systems (excludes PRISM). null if none available. */
  consensus: { vc_mpm: number; fz_mm: number; rpm: number; feed_mmmin: number } | null;
  prism_vs_consensus: {
    per_axis: PrismVsConsensusAxis[];
    overall_agreement: number;
    /** How many external systems backed the consensus. */
    external_systems_used: number;
    verdict_summary: string;
  } | null;
  /** PRISM-vs-each-external geometric-mean agreement (excludes baseline-not-found etc.). */
  pairwise: Array<{ vs: SystemName; agreement: number }>;
  /**
   * Per-published-source PRISM-vs-vendor variance from the literature baseline DB.
   * Surfaces the baseline comparator's `per_source` breakdown (which run() already
   * computes for the median) so callers can report EXPLICIT per-vendor deltas -- e.g.
   * "PRISM vs G-Wizard (CNCCookbook published)" or "PRISM vs HSMAdvisor (published
   * reference)" -- instead of only the blended baseline median.
   *
   * IMPORTANT: these are the vendors' PUBLISHED reference tables (cnccookbook =
   * CNCCookbook, the publisher of G-Wizard; hsmadvisor = HSMAdvisor's public table),
   * NOT their live closed-app calculators. The LIVE adapters are the `gwizard` /
   * `hsmadvisor` entries in `systems[]`, which read the installed apps and report
   * `available:false` when no live cut is open. null when no literature baseline exists
   * for the cell.
   */
  baseline_detail:
    | {
        baseline_found: boolean;
        baseline_key?: string;
        per_source: ReturnType<typeof speedFeedBaselineComparatorEngine.compare>["per_source"];
      }
    | null;
  warnings: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class SpeedFeedTriComparatorEngine {
  /**
   * Run the 3-way comparison for one canonical cut.
   *
   * @param raw TriCompareInput
   * @returns TriCompareResult — every system on one axis basis + consensus + PRISM verdict.
   * @throws Error only on invalid input or a PRISM physics failure; missing external systems
   *   degrade to `available:false`, never throw.
   */
  run(raw: unknown): TriCompareResult {
    const input = TriCompareInputSchema.parse(raw);
    const warnings: string[] = [];

    const nineAxisInput = this.buildNineAxisInput(input);
    const flutes = input.tooling.flutes ?? null;
    const diameter = input.tooling.tool_diameter_mm;

    // 1. PRISM + baseline in ONE physics run (baseline comparator runs the orchestrator).
    const baselineRes = speedFeedBaselineComparatorEngine.compare(nineAxisInput);
    const prismResult: NineAxisResult = baselineRes.nine_axis_result;
    const rec = prismResult.recommendation;

    const resolved = prismResult.sfc.resolved;

    const systems: SystemOpinion[] = [];

    // -- PRISM (the thing being judged) --
    // U-OSC-VC-UNCAPPED-PARITY: surface the pre-machine/holder-RPM-cap surface speed + the cap flag so a
    // capped achievable Vc (e.g. 6mm aluminum 460->226 @ a G6.3 12k-RPM holder limit) is never misread as a
    // physics under-prediction vs an UNCAPPED vendor surface speed. Vendor cribs are uncapped -- compare
    // vc_uncapped_mpm for apples-to-apples parity; axes.vc_mpm stays the achievable (post-cap) recommendation.
    const prismVcUncapped = prismResult.sfc.cutting_speed_uncapped?.value ?? rec.cutting_speed_mpm;
    const prismRpmCapped = prismResult.sfc.rpm_capped ?? false;
    systems.push({
      system: "prism",
      available: true,
      axes: {
        vc_mpm: rec.cutting_speed_mpm,
        fz_mm: rec.feed_per_tooth_mm,
        rpm: rec.spindle_rpm,
        feed_mmmin: rec.feed_rate_mmmin,
        mrr_cm3min: rec.mrr_cm3min,
      },
      vc_uncapped_mpm: prismVcUncapped,
      rpm_capped: prismRpmCapped,
      source_note: `PRISM NineAxisOrchestrator (${nineAxisInput.mode})`,
    });
    if (prismRpmCapped) {
      warnings.push(
        `PRISM Vc ${rec.cutting_speed_mpm} m/min is RPM-CAPPED (machine/holder max-RPM limit); the uncapped ` +
          `recommended surface speed is ${Math.round(prismVcUncapped)} m/min. Vendor cribs are uncapped -- ` +
          `compare vc_uncapped_mpm for apples-to-apples parity (a capped Vc is a machine constraint, not an under-prediction).`,
      );
    }

    // -- Baseline (literature median; ALWAYS-ON grounded external reference) --
    if (input.include_baseline !== false) {
      systems.push(this.baselineSystem(baselineRes, diameter, flutes, warnings));
    }

    // -- HSMAdvisor (best-effort live cut) --
    if (input.include_hsmadvisor !== false) {
      systems.push(this.hsmAdvisorSystem(input, diameter, warnings));
    }

    // -- G-Wizard (best-effort crib tool) --
    if (input.include_gwizard !== false) {
      systems.push(this.gwizardSystem(input, diameter, warnings));
    }

    // 2. Consensus across AVAILABLE external systems (everything except prism).
    //    PREFER aligned externals: a system explicitly flagged `aligned:false`
    //    (e.g. an HSMAdvisor live cut whose tool diameter does NOT match the
    //    canonical input) is an UNVERIFIABLE advisory — folding it into the
    //    median ALONGSIDE good data lets a single wrong cut (a 634 m/min steel
    //    cut applied to a titanium cell — live-caught) drag the bar PRISM is
    //    judged against. So when ≥1 aligned external exists, misaligned ones
    //    are EXCLUDED from consensus (R12: don't let an unverifiable opinion
    //    silently set the consensus). But when the ONLY external is misaligned,
    //    we fall back to including it — the operator still gets a flagged
    //    single-external reference rather than nothing (preserves the original
    //    "include-but-flag" contract). `aligned===undefined` (baseline, no
    //    tool-alignment concept) always counts as aligned.
    //    (OSCAR-SFC-9AXIS-MS0/U-OSC-CLOSED-LOOP, live-caught.)
    const allExternals = systems.filter((s) => s.system !== "prism" && s.available && s.axes);
    const alignedExternals = allExternals.filter((s) => s.aligned !== false);
    const externals = alignedExternals.length > 0 ? alignedExternals : allExternals;
    const consensus = this.consensusOf(externals);

    // 3. PRISM vs consensus.
    const prismAxes = systems[0]!.axes!;
    // U-OSC-PARITY-VERDICT-UNCAPPED: external vendors are UNCAPPED, and the agreement/verdict feeds
    // calibration ("a large PRISM-vs-consensus gap is where calibration would learn"). So the verdict must
    // compare PRISM's UNCAPPED physics recommendation, not the machine/holder-RPM-capped achievable Vc --
    // otherwise a cap artifact (e.g. 6mm alu 226 vs uncapped 460) injects a false gap that calibration would
    // chase, the exact false-bug this parity work prevents. axes.vc_mpm (capped) stays the operator value;
    // scale vc/rpm/feed by the un-cap ratio (fz/chip-load is unchanged by an RPM cap).
    let prismParityAxes = prismAxes;
    if (prismRpmCapped && Number.isFinite(prismVcUncapped) && prismAxes.vc_mpm > 0) {
      const unCapScale = prismVcUncapped / prismAxes.vc_mpm;
      prismParityAxes = {
        ...prismAxes,
        vc_mpm: prismVcUncapped,
        rpm: prismAxes.rpm * unCapScale,
        feed_mmmin: prismAxes.feed_mmmin * unCapScale,
      };
    }
    const prismVsConsensus = consensus
      ? this.prismVsConsensus(prismParityAxes, consensus, externals.length)
      : null;
    if (!consensus) {
      warnings.push("No external system available — consensus + PRISM verdict omitted (PRISM-only result).");
    }

    // 4. Pairwise PRISM-vs-each-external agreement (uncapped parity axes -- same calibration rationale as #3).
    const pairwise = externals.map((s) => ({
      vs: s.system,
      agreement: this.pairAgreement(prismParityAxes, s.axes!),
    }));

    return {
      canonical_input: {
        iso_group: resolved.iso_group,
        tool_material: resolved.tool_material,
        operation: resolved.operation,
        cut_type: resolved.cut_type,
        tool_diameter_mm: diameter,
        flutes,
        mode: nineAxisInput.mode!,
      },
      systems,
      consensus,
      prism_vs_consensus: prismVsConsensus,
      pairwise,
      // Per-vendor published-reference breakdown (U-OSC-COMPARE-PER-VENDOR): surface the
      // baselineRes per_source already computed above so callers can report explicit
      // PRISM-vs-G-Wizard(CNCCookbook) / PRISM-vs-HSMAdvisor(published) deltas, not only
      // the blended median. null when no literature baseline matched the cell.
      baseline_detail: baselineRes.baseline_found
        ? {
            baseline_found: true,
            baseline_key: baselineRes.baseline_key,
            per_source: baselineRes.per_source,
          }
        : null,
      warnings,
    };
  }

  // -- Input assembly --------------------------------------------------------

  private buildNineAxisInput(input: TriCompareInput): NineAxisInput {
    return {
      material: {
        iso_group: input.material.iso_group,
        name: input.material.name ?? (input.material.iso_group ? `ISO-${input.material.iso_group}` : "steel"),
        hardness_hb: input.material.hardness_hb,
        hardness_hrc: input.material.hardness_hrc,
      },
      tooling: {
        tool_diameter_mm: input.tooling.tool_diameter_mm,
        flutes: input.tooling.flutes,
        tool_material: input.tooling.tool_material,
        coating: input.tooling.coating,
        helix_angle_deg: input.tooling.helix_angle_deg,
        corner_radius_mm: input.tooling.corner_radius_mm,
        stickout_mm: input.tooling.stickout_mm,
      },
      toolpath: {
        operation: input.toolpath?.operation,
        cut_type: input.toolpath?.cut_type,
        axial_depth_mm: input.toolpath?.axial_depth_mm,
        radial_depth_mm: input.toolpath?.radial_depth_mm,
      },
      mode: input.optimization_mode ?? "prism_optimized",
    };
  }

  // -- Baseline system -------------------------------------------------------

  private baselineSystem(
    baselineRes: ReturnType<typeof speedFeedBaselineComparatorEngine.compare>,
    diameterMm: number,
    flutes: number | null,
    warnings: string[],
  ): SystemOpinion {
    if (!baselineRes.baseline_found || !baselineRes.baseline_median) {
      const reason = baselineRes.warnings[0] ?? "no literature baseline for this combination";
      warnings.push(`baseline: ${reason}`);
      return { system: "baseline", available: false, axes: null, unavailable_reason: reason, source_note: "literature reference DB" };
    }
    const m = baselineRes.baseline_median; // { vc_mpm, fz_mm, mrr_cm3min }
    const rpm = diameterMm > 0 ? (m.vc_mpm * 1000) / (Math.PI * diameterMm) : NaN;
    const feed = flutes && flutes > 0 && Number.isFinite(rpm) ? rpm * m.fz_mm * flutes : NaN;
    return {
      system: "baseline",
      available: true,
      axes: {
        vc_mpm: m.vc_mpm,
        fz_mm: m.fz_mm,
        rpm: Number.isFinite(rpm) ? Math.round(rpm) : NaN,
        feed_mmmin: Number.isFinite(feed) ? Math.round(feed) : NaN,
        mrr_cm3min: m.mrr_cm3min > 0 ? m.mrr_cm3min : null,
      },
      source_note: `${baselineRes.baseline_material_name ?? "literature"} — median of ${baselineRes.per_source.length} source(s)`,
    };
  }

  // -- HSMAdvisor system (best-effort) ---------------------------------------

  private hsmAdvisorSystem(input: TriCompareInput, canonicalDiameterMm: number, warnings: string[]): SystemOpinion {
    let state: HSMAdvisorState;
    try {
      state =
        input.hsmadvisor_state_override !== undefined
          ? (input.hsmadvisor_state_override as HSMAdvisorState)
          : hsmAdvisorAdapterEngine.read({ settings_path: input.hsmadvisor_settings_path, convert_to_mm: false });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      warnings.push(`hsmadvisor: unavailable (${reason})`);
      return { system: "hsmadvisor", available: false, axes: null, unavailable_reason: reason, source_note: "HSMAdvisor live <Cut>" };
    }

    const cut = state.cut;
    if (!cut || !(typeof cut.sfm === "number" && cut.sfm > 0)) {
      const reason = "no live <Cut> open in HSMAdvisor";
      return { system: "hsmadvisor", available: false, axes: null, unavailable_reason: reason, source_note: "HSMAdvisor live <Cut>" };
    }

    // Alignment: HSMAdvisor's live cut is for ITS selected tool; only a real comparison if the
    // tool diameter matches the canonical input. Material can't be verified (HSMAdvisor uses an
    // internal material_id), so alignment is diameter-only — flagged as such.
    let aligned = true;
    const hsmaDiameterMm = state.tool?.diameter !== undefined ? state.tool.diameter * INCH_TO_MM : NaN;
    if (Number.isFinite(hsmaDiameterMm) && canonicalDiameterMm > 0) {
      const rel = Math.abs(hsmaDiameterMm - canonicalDiameterMm) / canonicalDiameterMm;
      aligned = rel <= ALIGN_TOLERANCE;
      if (!aligned) {
        warnings.push(
          `hsmadvisor: live cut is for a Ø${round(hsmaDiameterMm, 2)}mm tool but the canonical input is Ø${round(canonicalDiameterMm, 2)}mm ` +
            `(Δ${(rel * 100).toFixed(0)}%). Included but flagged not-aligned — open the matching tool in HSMAdvisor for a true comparison.`,
        );
      }
    } else {
      warnings.push("hsmadvisor: could not verify tool-diameter alignment (no tool diameter in live state).");
      aligned = false;
    }

    return {
      system: "hsmadvisor",
      available: true,
      aligned,
      axes: {
        vc_mpm: round(cut.sfm * FT_PER_MIN_TO_M_PER_MIN, 1),
        fz_mm: typeof cut.ipt === "number" ? round(cut.ipt * INCH_TO_MM, 4) : NaN,
        rpm: typeof cut.rpm === "number" ? Math.round(cut.rpm) : NaN,
        feed_mmmin: typeof cut.feed === "number" ? Math.round(cut.feed * INCH_TO_MM) : NaN,
        mrr_cm3min: typeof cut.mrr === "number" && cut.mrr > 0 ? round(cut.mrr * IN3_TO_CM3, 2) : null,
      },
      source_note: aligned ? "HSMAdvisor live <Cut> (tool-aligned)" : "HSMAdvisor live <Cut> (NOT tool-aligned — advisory)",
    };
  }

  // -- G-Wizard system (best-effort) -----------------------------------------

  private gwizardSystem(input: TriCompareInput, canonicalDiameterMm: number, warnings: string[]): SystemOpinion {
    try {
      const prep = gWizardComparatorBridgeEngine.prepare({
        toolcrib_path: input.gwizard_toolcrib_path,
        state_override: input.gwizard_state_override,
        tool_selector: input.gwizard_tool_selector,
        material: { iso_group: input.material.iso_group, name: input.material.name },
        operation: input.toolpath?.operation,
        cut_type: input.toolpath?.cut_type,
        axial_depth_mm: input.toolpath?.axial_depth_mm,
        radial_depth_mm: input.toolpath?.radial_depth_mm,
      });
      const r = prep.gwizard_recommendation;
      // Surface G-Wizard's own warnings (units/flute/material) onto the tri-compare warnings.
      for (const w of prep.warnings) warnings.push(`gwizard: ${w}`);

      // Alignment: the selected crib tool's proven sfm is for ITS geometry —
      // only a real comparison if its diameter matches the canonical input.
      // Symmetric with hsmAdvisorSystem (a misaligned crib tool would pollute
      // the consensus the same way the misaligned HSMAdvisor cut did —
      // OSCAR-SFC-9AXIS-MS0/U-OSC-CLOSED-LOOP-GW, the P3 the physics review flagged).
      let aligned = true;
      const gwDiameterMm = prep.orchestrator_input.tooling.tool_diameter_mm;
      if (Number.isFinite(gwDiameterMm) && gwDiameterMm > 0 && canonicalDiameterMm > 0) {
        const rel = Math.abs(gwDiameterMm - canonicalDiameterMm) / canonicalDiameterMm;
        aligned = rel <= ALIGN_TOLERANCE;
        if (!aligned) {
          warnings.push(
            `gwizard: crib tool is Ø${round(gwDiameterMm, 2)}mm but the canonical input is Ø${round(canonicalDiameterMm, 2)}mm ` +
              `(Δ${(rel * 100).toFixed(0)}%). Included but flagged not-aligned — select a matching crib tool for a true comparison.`,
          );
        }
      } else {
        warnings.push("gwizard: could not verify tool-diameter alignment (no usable crib tool diameter).");
        aligned = false;
      }

      return {
        system: "gwizard",
        available: true,
        aligned,
        axes: {
          vc_mpm: r.vc_mpm,
          fz_mm: r.fz_mm,
          rpm: r.rpm,
          feed_mmmin: r.feed_mmmin,
          mrr_cm3min: null, // G-Wizard crib has no cut depth ⇒ no MRR (see GWizardComparatorBridgeEngine)
        },
        source_note: aligned
          ? `G-Wizard crib tool "${prep.tool.description || prep.tool.guid}" (${r.source}, tool-aligned)`
          : `G-Wizard crib tool "${prep.tool.description || prep.tool.guid}" (${r.source}, NOT tool-aligned — advisory)`,
      };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      warnings.push(`gwizard: unavailable (${reason})`);
      return { system: "gwizard", available: false, axes: null, unavailable_reason: reason, source_note: "G-Wizard tool crib" };
    }
  }

  // -- Consensus + verdict ---------------------------------------------------

  private consensusOf(externals: SystemOpinion[]): TriCompareResult["consensus"] {
    if (externals.length === 0) return null;
    const axisMedian = (pick: (a: SystemAxes) => number): number => {
      const vals = externals.map((s) => pick(s.axes!)).filter((v) => Number.isFinite(v));
      return vals.length === 0 ? NaN : median(vals);
    };
    return {
      vc_mpm: round(axisMedian((a) => a.vc_mpm), 1),
      fz_mm: round(axisMedian((a) => a.fz_mm), 4),
      rpm: Math.round(axisMedian((a) => a.rpm)),
      feed_mmmin: Math.round(axisMedian((a) => a.feed_mmmin)),
    };
  }

  private prismVsConsensus(
    prism: SystemAxes,
    consensus: NonNullable<TriCompareResult["consensus"]>,
    externalCount: number,
  ): NonNullable<TriCompareResult["prism_vs_consensus"]> {
    const axisDefs: Array<{ axis: PrismVsConsensusAxis["axis"]; p: number; c: number }> = [
      { axis: "vc", p: prism.vc_mpm, c: consensus.vc_mpm },
      { axis: "fz", p: prism.fz_mm, c: consensus.fz_mm },
      { axis: "rpm", p: prism.rpm, c: consensus.rpm },
      { axis: "feed", p: prism.feed_mmmin, c: consensus.feed_mmmin },
    ];
    const per_axis: PrismVsConsensusAxis[] = axisDefs.map(({ axis, p, c }) => {
      const finite = Number.isFinite(p) && Number.isFinite(c) && c !== 0;
      const deltaAbs = finite ? p - c : NaN;
      const deltaPct = finite ? deltaAbs / c : NaN;
      let verdict: AxisVerdict;
      if (!finite) verdict = "no_consensus";
      else if (Math.abs(deltaPct) <= VERDICT_BAND) verdict = "aligned";
      else verdict = deltaPct > 0 ? "prism_higher" : "prism_lower";
      const agreement = finite ? Math.max(0, 1 - Math.min(1, Math.abs(deltaPct) / 0.5)) : NaN;
      return {
        axis,
        prism: p,
        consensus: c,
        delta_abs: finite ? round(deltaAbs, 4) : NaN,
        delta_pct: finite ? round(deltaPct, 4) : NaN,
        verdict,
        agreement: finite ? round(agreement, 4) : NaN,
      };
    });

    const overall = geoMean(per_axis.map((a) => a.agreement).filter((v) => Number.isFinite(v)));

    // Human verdict summary.
    const higher = per_axis.filter((a) => a.verdict === "prism_higher").map((a) => a.axis);
    const lower = per_axis.filter((a) => a.verdict === "prism_lower").map((a) => a.axis);
    const aligned = per_axis.filter((a) => a.verdict === "aligned").map((a) => a.axis);
    const parts: string[] = [];
    if (aligned.length) parts.push(`aligned on ${aligned.join("/")}`);
    if (higher.length) parts.push(`more aggressive on ${higher.join("/")}`);
    if (lower.length) parts.push(`more conservative on ${lower.join("/")}`);
    const verdict_summary = `PRISM vs ${externalCount}-system consensus: ${parts.join(", ") || "no comparable axes"} (agreement ${(overall * 100).toFixed(0)}%).`;

    return { per_axis, overall_agreement: round(overall, 4), external_systems_used: externalCount, verdict_summary };
  }

  private pairAgreement(prism: SystemAxes, other: SystemAxes): number {
    const axes: Array<[number, number]> = [
      [prism.vc_mpm, other.vc_mpm],
      [prism.fz_mm, other.fz_mm],
      [prism.rpm, other.rpm],
      [prism.feed_mmmin, other.feed_mmmin],
    ];
    const ags: number[] = [];
    for (const [p, o] of axes) {
      if (!Number.isFinite(p) || !Number.isFinite(o) || o === 0) continue;
      const deltaPct = (p - o) / o;
      ags.push(Math.max(0, 1 - Math.min(1, Math.abs(deltaPct) / 0.5)));
    }
    return round(geoMean(ags), 4);
  }
}

// ============================================================================
// SHARED MATH
// ============================================================================

function median(arr: number[]): number {
  if (arr.length === 0) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function geoMean(arr: number[]): number {
  const finite = arr.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return 0;
  let logSum = 0;
  for (const v of finite) logSum += Math.log(Math.max(1e-6, v));
  return Math.exp(logSum / finite.length);
}

function round(n: number, digits: number): number {
  if (!Number.isFinite(n)) return n;
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const speedFeedTriComparatorEngine = new SpeedFeedTriComparatorEngine();

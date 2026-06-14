/**
 * WireBreakAutoRethreadEngine — WEDM wire-break recovery strategy
 *
 * Closes the iter20 P1 "wire-break auto-rethread" gap. When the wire breaks mid-cut,
 * the machine must decide how to recover without scrapping the part:
 *   1. auto_rethread + restart at break_position (modern Sodick/Fanuc/Charmilles can)
 *   2. manual_rethread (older machines, or after multiple breaks)
 *   3. burnback_restart (retreat 0.5-2mm, restart fresh cut)
 *   4. scrap_part (irrecoverable — joint quality unacceptable for spec)
 *
 * Joint-quality risk drivers (per Fanuc Robocut Wire-Break Recovery Guide §4 +
 * Sodick AP series troubleshooting + Charmilles RoboFil application notes):
 *   - Restart joint shows witness mark (~5-15 μm Ra bump vs surrounding surface)
 *   - Recast layer grows ~2-3× at joint (re-fused HAZ)
 *   - Multiple breaks in same pass → quality cumulative-degraded
 *   - Skim-cut breaks tolerate worse joints than roughing (less material removed)
 *   - Thick workpiece (>50mm) breaks harder to recover — wire pickup geometry-limited
 *
 * Reference: Fanuc Robocut Operator Manual §8.4 (wire-break recovery); Sodick AP
 *   Series Troubleshooting §3.2; Charmilles RoboFil 4000 Application Notes §C-5;
 *   Mitsubishi MV1200R Programming Manual §6 (rethread G-codes); EDM Today
 *   "Wire Break Causes + Cures" 2019 series.
 *
 * @version 1.0.0
 * @module WireBreakAutoRethreadEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type WireMaterial = "brass" | "zinc_coated" | "molybdenum" | "tungsten";
export type ThreadingCapability = "auto_thread" | "manual_only" | "auto_with_burnback";
export type CutPhase = "rough" | "skim_1" | "skim_2" | "skim_3" | "finish";
export type FeaturePosition = "interior" | "corner_in" | "corner_out" | "near_edge" | "in_workholding";

export interface WireBreakInput {
  /** Break position along cut path (mm from start) */
  break_position_mm: number;
  /** Total cut path length (mm) */
  cut_path_total_mm: number;
  /** Workpiece thickness through which the wire passes (mm) */
  workpiece_thickness_mm: number;
  /** Wire diameter (mm) */
  wire_diameter_mm: number;
  /** Wire material */
  wire_material: WireMaterial;
  /** Cut phase when break occurred */
  cut_phase: CutPhase;
  /** Machine threading capability */
  threading_capability: ThreadingCapability;
  /** Feature geometry at break location */
  feature_position: FeaturePosition;
  /** Number of prior breaks on this same cut */
  prior_breaks?: number;
  /** Dielectric temperature (°C) — high temp degrades flushing → break risk */
  dielectric_temp_c?: number;
  /** Drawing burr/joint spec: max Ra μm at joint */
  joint_ra_spec_um?: number;
}

export type RecoveryStrategy = "auto_rethread" | "manual_rethread" | "burnback_restart" | "scrap_part";
export type OperatorSkill = "entry" | "intermediate" | "master";

export interface WireBreakResult {
  recovery_strategy: RecoveryStrategy;
  restart_position_mm: AtomicValue;
  expected_joint_ra_um: AtomicValue;
  expected_recast_factor: AtomicValue;
  estimated_recovery_time_min: AtomicValue;
  operator_skill_required: OperatorSkill;
  scrap_risk_pct: AtomicValue;
  /** Whether the joint will meet drawing spec */
  joint_meets_spec: boolean;
  warnings: string[];
  source: string;
}

const BASE_JOINT_RA_BY_PHASE: Record<CutPhase, number> = {
  rough: 3.2,
  skim_1: 1.6,
  skim_2: 0.8,
  skim_3: 0.4,
  finish: 0.4,
};

export class WireBreakAutoRethreadEngine {
  recover(input: WireBreakInput): WireBreakResult {
    if (!input || input.break_position_mm == null || input.cut_path_total_mm == null) {
      throw new Error("WireBreakAutoRethreadEngine.recover: break_position_mm + cut_path_total_mm required");
    }
    if (input.break_position_mm < 0 || input.cut_path_total_mm <= 0) {
      throw new Error("WireBreakAutoRethreadEngine.recover: non-negative break_position + positive cut_path_total required");
    }
    if (input.break_position_mm > input.cut_path_total_mm) {
      throw new Error("WireBreakAutoRethreadEngine.recover: break_position cannot exceed cut_path_total");
    }
    if (input.workpiece_thickness_mm <= 0 || input.wire_diameter_mm <= 0) {
      throw new Error("WireBreakAutoRethreadEngine.recover: positive thickness + wire_diameter required");
    }

    const warnings: string[] = [];
    const priorBreaks = input.prior_breaks ?? 0;

    // ── Recovery-strategy decision tree ───────────────────────────────
    let strategy: RecoveryStrategy;
    let restartOffsetMm = 0;
    let operatorSkill: OperatorSkill;

    if (input.feature_position === "in_workholding") {
      strategy = "scrap_part";
      warnings.push("Break inside workholding region — auto-rethread cannot recover; part scrap");
    } else if (priorBreaks >= 3) {
      strategy = "scrap_part";
      warnings.push(`${priorBreaks + 1}th break on this cut — accumulated joint defects exceed recoverable quality; scrap`);
    } else if (input.threading_capability === "manual_only") {
      strategy = "manual_rethread";
      operatorSkill = "intermediate";
    } else if (input.workpiece_thickness_mm > 100) {
      strategy = "manual_rethread";
      operatorSkill = "master";
      warnings.push(`Thick workpiece ${input.workpiece_thickness_mm}mm — auto-thread pickup window too narrow; manual rethread + master operator`);
    } else if (input.feature_position === "corner_in" || input.feature_position === "corner_out") {
      // Burnback away from corner so joint lands in straight section
      strategy = input.threading_capability === "auto_with_burnback" ? "burnback_restart" : "manual_rethread";
      restartOffsetMm = -1.5;  // burnback 1.5mm
    } else if (input.cut_phase === "rough") {
      strategy = "auto_rethread";
      restartOffsetMm = -0.3;  // small overlap for joint cleanup
    } else {
      // Skim cuts — burnback to clean joint
      strategy = input.threading_capability === "auto_with_burnback" ? "burnback_restart" : "auto_rethread";
      restartOffsetMm = input.cut_phase === "skim_1" ? -0.5 : -1.0;
    }
    if (strategy === "manual_rethread") operatorSkill = operatorSkill ?? "intermediate";
    else if (strategy === "burnback_restart") operatorSkill = "entry";
    else if (strategy === "auto_rethread") operatorSkill = "entry";
    else if (strategy === "scrap_part") operatorSkill = "intermediate";

    const restartPosition = Math.max(0, input.break_position_mm + restartOffsetMm);

    // ── Joint quality estimate (Fanuc §8.4 + EDM Today 2019) ──────────
    const baseRa = BASE_JOINT_RA_BY_PHASE[input.cut_phase];
    // Joint bumps Ra by ~30% in rough, ~10-15% in skim (recast at joint)
    const phaseBump = input.cut_phase === "rough" ? 0.30 : 0.15;
    const breakPenalty = priorBreaks * 0.05;  // 5% additional Ra penalty per prior break
    const expectedJointRa = baseRa * (1 + phaseBump + breakPenalty);

    // ── Recast factor (joint has 2-3× thicker recast than surrounding) ─
    const recastFactor = input.cut_phase === "rough" ? 2.5 : 2.0;

    // ── Joint meets spec? ─────────────────────────────────────────────
    const joinRaSpec = input.joint_ra_spec_um ?? baseRa * 1.5;  // 50% headroom default
    const meetsSpec = strategy !== "scrap_part" && expectedJointRa <= joinRaSpec;

    // ── Recovery time estimate ────────────────────────────────────────
    const recoveryTime: Record<RecoveryStrategy, number> = {
      auto_rethread: 2,
      burnback_restart: 4,
      manual_rethread: 10,
      scrap_part: 30,  // remove part + reload
    };
    const recoveryMin = recoveryTime[strategy];

    // ── Scrap-risk forward-looking estimate ───────────────────────────
    // If break in roughing recoverable, low risk; in finish/late-skim, higher
    let scrapRiskPct = 0;
    if (strategy === "scrap_part") scrapRiskPct = 100;
    else if (input.cut_phase === "finish" || input.cut_phase === "skim_3") scrapRiskPct = 15;
    else if (input.cut_phase === "skim_2") scrapRiskPct = 8;
    else if (input.cut_phase === "skim_1") scrapRiskPct = 4;
    else scrapRiskPct = 2;
    scrapRiskPct += priorBreaks * 5;  // each prior break adds 5%

    // ── Drift warnings ────────────────────────────────────────────────
    if (input.dielectric_temp_c !== undefined && input.dielectric_temp_c > 30) {
      warnings.push(`Dielectric temp ${input.dielectric_temp_c}°C > 30°C — flushing degraded, break risk elevated; check chiller`);
    }
    if (input.wire_material === "brass" && input.workpiece_thickness_mm > 60) {
      warnings.push("Brass wire on >60mm workpiece — consider zinc-coated wire (higher tensile + lower break rate per Fanuc §8.4)");
    }
    if (!meetsSpec && strategy !== "scrap_part") {
      warnings.push(`Joint Ra ${expectedJointRa.toFixed(2)}μm > spec ${joinRaSpec.toFixed(2)}μm — additional skim pass required at joint`);
    }

    return {
      recovery_strategy: strategy,
      restart_position_mm: {
        value: Number(restartPosition.toFixed(2)),
        unit: "mm",
        source: `break_position + offset (${restartOffsetMm} for ${strategy})`,
      },
      expected_joint_ra_um: {
        value: Number(expectedJointRa.toFixed(2)),
        unit: "μm",
        source: `base ${baseRa.toFixed(1)} × (1 + ${(phaseBump * 100).toFixed(0)}% phase bump + ${(breakPenalty * 100).toFixed(0)}% prior-break penalty)`,
      },
      expected_recast_factor: {
        value: recastFactor,
        unit: "× surrounding",
        source: `${recastFactor.toFixed(1)}× per Fanuc §8.4 joint-recast tables`,
      },
      estimated_recovery_time_min: {
        value: recoveryMin,
        unit: "min",
        source: `${strategy} typical wall-clock (Sodick AP §3.2)`,
      },
      operator_skill_required: operatorSkill!,
      scrap_risk_pct: {
        value: Math.min(scrapRiskPct, 100),
        unit: "%",
        source: "phase-baseline + 5%/prior-break stacking",
      },
      joint_meets_spec: meetsSpec,
      warnings,
      source: "WireBreakAutoRethreadEngine — Fanuc Robocut §8.4 + Sodick AP §3.2 + Charmilles RoboFil §C-5 + Mitsubishi MV1200R §6 + EDM Today 2019",
    };
  }
}

export const wireBreakAutoRethreadEngine = new WireBreakAutoRethreadEngine();

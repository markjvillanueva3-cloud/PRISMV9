// WIRE-EXEMPT: Consumed by AutoPrintToProgramBridgeEngine and
// PrintToProgramRegressionHarnessEngine as the sinker_edm pipeline
// implementation; both bridge engines are wired to dispatchers. Direct
// dispatcher import would create circular pipeline → bridge → pipeline.
// (Stop-hook wiring-enforcement gate, INFRA-NEURAL-LEDGER-MS1/P0-U02, 2026-05-13.)
/**
 * SinkerEDMPrintToProgramEngine — P2P-FULLSTACK-MS0/U-P2PFS53
 *
 * Orchestrator that composes the existing Sinker-EDM primitives into a
 * single "print → program" pipeline:
 *
 *   EDMDrawingInterpretationEngine  → classify features + pass requirements
 *   ElectrodeDesignEngine           → electrode geometry, stages, wear budget
 *   SinkerEDMCalculatorEngine       → per-stage pulse physics (I/ton/toff/V)
 *   PPSinkerEDMPostEngine           → Mitsubishi EA-series G-code
 *
 * Inputs: print features + workpiece material + machine model + optional
 * overrides. Outputs: SinkerProgram (G-code) + per-feature reasoning
 * trace + tribal-tip hook slots for downstream enrichment.
 *
 * This engine is pure-calculation EXCEPT for one fire-and-forget
 * OutcomeCaptureBus emission at the end of run() (INFRA-NEURAL-LEDGER-MS1/
 * P0-U02, added 2026-05-13). The emission cannot throw or block the producer
 * (helper guarantees fire-and-forget; bus uses atomic-write + retry queue).
 * All singletons are injected through a constructor for testability.
 */

import {
  edmDrawingInterpretationEngine,
  type EDMDrawingInput,
  type EDMDrawingResult,
  type PartFeature,
  type ClassifiedFeature,
} from "./EDMDrawingInterpretationEngine.js";
import {
  electrodeDesignEngine,
  type ElectrodeDesignInput,
  type ElectrodeDesignResult,
  type ElectrodeMaterial,
} from "./ElectrodeDesignEngine.js";
import { sinkerEDMCalculatorEngine, type SinkerEDMResult } from "./SinkerEDMCalculatorEngine.js";
import {
  ppSinkerEDMPostEngine,
  type SinkerOperation,
  type SinkerProgram,
  type SinkerProgramInput,
  type SinkerBurnStage,
} from "./PPSinkerEDMPostEngine.js";
// INFRA-NEURAL-LEDGER-MS1/P0-U02 — emit cross_process_stage_complete event to
// the OutcomeCaptureBus at the end of every pipeline run. Fire-and-forget;
// never blocks the producer. See utils/p2pOutcomeEmission.ts for the contract.
import { emitP2POutcome, P2P_STAGES } from "../utils/p2pOutcomeEmission.js";

// ============================================================================
// TYPES
// ============================================================================

export interface SinkerP2PInput {
  /** Print-derived features (same shape as EDMDrawingInterpretationEngine). */
  features: PartFeature[];
  /** Workpiece material (AISI/DIN callout or internal key). */
  workpiece_material: string;
  /** Optional workpiece hardness (HRC). Falls back to material DB default. */
  workpiece_hardness_HRC?: number;
  /** Electrode material — default graphite_fine (JM Die standard). */
  electrode_material?: ElectrodeMaterial;
  /** Mitsubishi machine model. EA12D added 2026-06-25 (U-PP-EA-SINKER-ROUTE) to propagate the
   *  PPSinkerEDMPostEngine EA12D identity (commit 669c03dacf) end-to-end through the print-to-program
   *  pipeline -- JM's EDM-02 is an EA12D and was previously unexpressable here (fell back to EA12V). */
  machine_model?: "EA12V" | "EA12S" | "EA12D" | "EA28V";
  /** Operator override for number of cavities per feature. Default 1. */
  num_cavities?: number;
  /** Optional program number (for G-code header). */
  program_number?: string;
  /** Optional part description (for G-code header). */
  part_description?: string;
  /** Output units. Default metric. */
  units?: "metric" | "imperial";
  /** Optional per-feature electrode-material override map (featureName → material). */
  electrode_material_overrides?: Record<string, ElectrodeMaterial>;
}

export interface SinkerReasoningStep {
  stage: "interpret" | "electrode" | "physics" | "program";
  feature?: string;
  detail: string;
}

export interface SinkerFeaturePlan {
  feature: PartFeature;
  classification: ClassifiedFeature;
  electrode: ElectrodeDesignResult;
  /** Per-burn-stage calculator result (rough/semi/finish). */
  physics: Record<SinkerBurnStage, SinkerEDMResult | null>;
  /** Composed sinker operations ready for the post engine. */
  operations: SinkerOperation[];
}

export interface SinkerP2PResult {
  /** Upstream drawing interpretation (re-exposed for consumers). */
  drawing: EDMDrawingResult;
  /** Per-feature plans (only sinker-classified features). */
  feature_plans: SinkerFeaturePlan[];
  /** Final G-code program from PPSinkerEDMPostEngine. */
  program: SinkerProgram;
  /** Transparent reasoning trace — every decision the engine made. */
  reasoning: SinkerReasoningStep[];
  /** Warnings aggregated from every downstream engine. */
  warnings: string[];
  /** Slot for tribal-tip IDs (populated by TribalRuntimeEngine in later wiring). */
  tribal_tip_ids: string[];
  /** Features that were classified as non-sinker (wire / not_edm / etc.). */
  skipped_features: ClassifiedFeature[];
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_ELECTRODE: ElectrodeMaterial = "graphite_fine";
const DEFAULT_MACHINE: NonNullable<SinkerP2PInput["machine_model"]> = "EA12V";

// Surface-finish targets per burn stage (µm Ra) — used when the print
// doesn't specify a feature-level finish callout.
const STAGE_RA_TARGET: Record<SinkerBurnStage, number> = {
  rough: 12.5,
  semi_finish: 3.2,
  finish: 0.8,
  super_finish: 0.2,
};

// Electrode-area heuristic from cavity footprint (fallback when print
// doesn't carry a dedicated electrode_area field).
function electrodeAreaMm2(f: PartFeature): number {
  const d = f.dimensions_mm;
  if (typeof d.length === "number" && typeof d.width === "number") {
    return Math.max(1, d.length * d.width);
  }
  if (typeof d.diameter === "number") {
    return Math.max(1, Math.PI * (d.diameter / 2) ** 2);
  }
  return 625; // 25×25 mm default to match SinkerEDMCalculatorEngine
}

function cavityDepthMm(f: PartFeature): number {
  return f.dimensions_mm.depth ?? 15;
}

function cavityWidthMm(f: PartFeature): number {
  return f.dimensions_mm.width ?? f.dimensions_mm.diameter ?? 10;
}

function cavityLengthMm(f: PartFeature): number {
  return f.dimensions_mm.length ?? f.dimensions_mm.diameter ?? 10;
}

// ============================================================================
// ENGINE
// ============================================================================

export class SinkerEDMPrintToProgramEngine {
  constructor(
    private readonly drawingEngine = edmDrawingInterpretationEngine,
    private readonly electrodeEngine = electrodeDesignEngine,
    private readonly calculator = sinkerEDMCalculatorEngine,
    private readonly postEngine = ppSinkerEDMPostEngine,
  ) {}

  /**
   * Run the full pipeline. Throws for obvious misuse; per-feature
   * failures are captured in `warnings` instead of throwing so callers
   * still get a partial program + reasoning trace.
   */
  run(input: SinkerP2PInput): SinkerP2PResult {
    if (!input.features || input.features.length === 0) {
      throw new Error("SinkerEDMPrintToProgramEngine.run: features[] is required");
    }
    if (!input.workpiece_material) {
      throw new Error("SinkerEDMPrintToProgramEngine.run: workpiece_material is required");
    }

    const reasoning: SinkerReasoningStep[] = [];
    const warnings: string[] = [];

    // ─── 1. Interpret the print ────────────────────────────────────
    const drawingInput: EDMDrawingInput = {
      features: input.features,
      material: input.workpiece_material,
      material_hardness_hrc: input.workpiece_hardness_HRC,
      overall_thickness_mm: Math.max(...input.features.map((f) => f.dimensions_mm.depth ?? 0), 0) || undefined,
      target_ra_um: Math.min(...input.features.map((f) => f.surface_finish_ra_um ?? Infinity)),
    };
    const drawing = this.drawingEngine.interpret(drawingInput);
    reasoning.push({
      stage: "interpret",
      detail: `Classified ${drawing.features_classified.length} features; recommended process: ${drawing.recommended_process.primary}`,
    });
    warnings.push(...drawing.warnings);

    // Bail early if the recommended process is NOT sinker.
    if (drawing.recommended_process.primary !== "sinker_edm") {
      warnings.push(
        `Recommended primary process is ${drawing.recommended_process.primary} — sinker P2P may produce sub-optimal output`,
      );
    }

    // ─── 2. Per-feature planning ────────────────────────────────────
    const featurePlans: SinkerFeaturePlan[] = [];
    const skipped: ClassifiedFeature[] = [];
    const allOperations: SinkerOperation[] = [];

    for (const feature of input.features) {
      const classification = drawing.features_classified.find((c) => c.name === feature.name);
      if (!classification) {
        warnings.push(`No classification for feature "${feature.name}" — skipping`);
        continue;
      }
      if (classification.edm_process !== "sinker_edm") {
        skipped.push(classification);
        reasoning.push({
          stage: "interpret",
          feature: feature.name,
          detail: `Skipped — classified as ${classification.edm_process} (${classification.reason})`,
        });
        continue;
      }

      // 2a. Electrode design
      const electrodeMat =
        input.electrode_material_overrides?.[feature.name] ??
        input.electrode_material ??
        DEFAULT_ELECTRODE;
      const electrodeInput: ElectrodeDesignInput = {
        cavity_depth_mm: cavityDepthMm(feature),
        cavity_width_mm: cavityWidthMm(feature),
        cavity_length_mm: cavityLengthMm(feature),
        workpiece_material: input.workpiece_material,
        workpiece_hardness_HRC:
          input.workpiece_hardness_HRC ?? drawing.material_assessment.hardness_hrc,
        surface_finish_target_Ra_um: feature.surface_finish_ra_um ?? drawing.recommended_process.edm_required ? 1.6 : 3.2,
        tolerance_mm: feature.tolerance_mm ?? drawing.recommended_process.edm_required ? 0.01 : 0.02,
        num_cavities: input.num_cavities ?? 1,
        electrode_material: electrodeMat,
      };
      const electrode = this.electrodeEngine.design(electrodeInput);
      reasoning.push({
        stage: "electrode",
        feature: feature.name,
        detail:
          `${electrode.num_electrodes_needed} ${electrodeMat} electrodes, ` +
          `overcut ${electrode.overcut_per_side_mm.toFixed(3)} mm/side, ` +
          `wear ratio ${electrode.wear_ratio_pct.toFixed(1)}%`,
      });

      // 2b. Per-stage physics + operation synthesis
      const physics: SinkerFeaturePlan["physics"] = {
        rough: null,
        semi_finish: null,
        finish: null,
        super_finish: null,
      };
      const operations: SinkerOperation[] = [];
      const area = electrodeAreaMm2(feature);
      const depth = cavityDepthMm(feature);

      const stages = pickStagesFromElectrode(electrode);
      for (const stage of stages) {
        const stageDefaults = this.postEngine.getStageDefaults(stage);
        const stageRaTarget = Math.min(
          STAGE_RA_TARGET[stage],
          feature.surface_finish_ra_um ?? STAGE_RA_TARGET[stage],
        );
        const result = this.calculator.calculate({
          electrodeMaterial: mapElectrodeToCalculatorKey(electrodeMat),
          workpieceMaterial: input.workpiece_material,
          peakCurrent: stageDefaults.peak_current,
          pulseOn: stageDefaults.on_time,
          pulseOff: stageDefaults.off_time,
          gapVoltage: stageDefaults.gap_voltage,
          electrodeArea: area,
          cavityDepth: depth,
        });
        physics[stage] = result;
        warnings.push(...result.warnings);
        reasoning.push({
          stage: "physics",
          feature: feature.name,
          detail:
            `${stage}: MRR ${result.mrr.toFixed(1)} mm³/min, ` +
            `burn ${result.burnTime.toFixed(2)} hr, ` +
            `wear ${result.wearRatio.toFixed(1)}%, ` +
            `Ra ${result.surfaceRoughness.toFixed(2)} µm (target ${stageRaTarget.toFixed(2)})`,
        });
        operations.push({
          stage,
          target_depth_mm: depth,
          electrode_number: operations.length + 1,
          electrode_name: `${stage.toUpperCase()}_${electrodeMat.toUpperCase()}`,
          peak_current_a: stageDefaults.peak_current,
          on_time_us: stageDefaults.on_time,
          off_time_us: stageDefaults.off_time,
          gap_voltage_v: stageDefaults.gap_voltage,
          duty_cycle: stageDefaults.duty_cycle,
          flush_pressure_bar: stageDefaults.flush_pressure,
          orbit_pattern: stage === "rough" ? "none" : "circle",
          orbit_radius_mm: stageDefaults.orbit_radius,
        });
      }

      allOperations.push(...operations);
      featurePlans.push({
        feature,
        classification,
        electrode,
        physics,
        operations,
      });
    }

    // ─── 3. Emit program ────────────────────────────────────────────
    const programInput: SinkerProgramInput = {
      program_number: input.program_number ?? "0001",
      part_description: input.part_description ?? "SINKER EDM P2P",
      material: input.workpiece_material,
      cavity_depth_mm: Math.max(
        ...featurePlans.map((p) => cavityDepthMm(p.feature)),
        0,
      ),
      operations: allOperations,
      machine_model: input.machine_model ?? DEFAULT_MACHINE,
      units: input.units,
    };
    const program = this.postEngine.generate(programInput);
    warnings.push(...program.warnings);
    reasoning.push({
      stage: "program",
      detail:
        `Emitted ${program.line_count} lines across ${program.operation_count} ops ` +
        `(${program.electrode_count} electrodes)`,
    });

    // SinkerEDM's result has no `.success` field — derive from the single
    // terminal-state signal that matters: did the post emit program lines?
    // Advisory warnings (e.g. high-wear pulse regime) + skipped features
    // (classifier punted to wedm) are NOT failures — they're partial-run
    // signals that the ledger consumer scores separately from the
    // `warnings_count` / `skipped_features_count` scalars in `summary`.
    // (Stricter `warnings.length === 0 && skipped.length === 0` would skew
    //  the neural-feedback ledger toward false-negative outcomes — partial
    //  mixed-process pipelines are the dominant real-world case.)
    const success = program.line_count > 0;

    const result: SinkerP2PResult = {
      drawing,
      feature_plans: featurePlans,
      program,
      reasoning,
      warnings,
      tribal_tip_ids: [],
      skipped_features: skipped,
    };

    // INFRA-NEURAL-LEDGER-MS1/P0-U02 — emit per-pipeline-run outcome event to
    // the neural-feedback ledger. Fire-and-forget; never blocks or throws.
    emitP2POutcome({
      engineName: "SinkerEDMPrintToProgramEngine",
      domain: "sinker_edm",
      pipelineStage: P2P_STAGES.PRINT_TO_PROGRAM,
      success,
      jobId: input.part_description ?? input.program_number ?? `sinker-${featurePlans.length}f`,
      summary: {
        features_planned: featurePlans.length,
        operations_count: program.operation_count,
        electrode_count: program.electrode_count,
        program_line_count: program.line_count,
        skipped_features_count: skipped.length,
        reasoning_steps_count: reasoning.length,
        material_name: input.workpiece_material,
        machine_model: input.machine_model ?? "default",
        recommended_process: drawing.recommended_process.primary,
      },
      warnings,
    });

    return result;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function pickStagesFromElectrode(electrode: ElectrodeDesignResult): SinkerBurnStage[] {
  const out: SinkerBurnStage[] = [];
  for (const s of electrode.electrode_stages) {
    if (s.stage === "rough") out.push("rough");
    else if (s.stage === "semi") out.push("semi_finish");
    else if (s.stage === "finish") out.push("finish");
    else if (s.stage === "super_finish" || s.stage === "super") out.push("super_finish");
  }
  if (out.length === 0) out.push("rough");
  return out;
}

/**
 * Normalize an ElectrodeDesignEngine material key to the key used by
 * SinkerEDMCalculatorEngine (which keys off coarse material families).
 */
function mapElectrodeToCalculatorKey(m: ElectrodeMaterial): string {
  switch (m) {
    case "graphite_fine":
    case "graphite_std":
      return "graphite";
    case "copper":
    case "tellurium_copper":
      return "copper";
    case "copper_tungsten":
      return "copper_tungsten";
    default:
      return "graphite";
  }
}

export const sinkerEDMPrintToProgramEngine = new SinkerEDMPrintToProgramEngine();

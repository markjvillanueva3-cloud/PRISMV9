/**
 * PrintToCADOrchestratorEngine — print → CAD draw pipeline composer (PHASE20).
 *
 * Composes the existing PRISM pieces into one diagnostic pipeline so that
 * print-to-CAD failures surface AT THE FAILING STAGE rather than as a
 * generic "couldn't draw the part" error. Stages:
 *
 *   1. Geometry      — STEPGeometryParserEngine.parseFile (PHASE8)
 *   2. Features      — STEPGeometryParserEngine.evidenceForFeatureKinds +
 *                      FeatureRecognitionEngine (PHASE17 type set)
 *   3. Class         — CADClassFeatureLibraryEngine.templateFor (PHASE6/7)
 *   4. Plan          — buildSequenceFor + predictVisualFidelity (PHASE9/15)
 *   5. Route         — CADSystemRouterEngine.detectSystem + capabilities (PHASE18/19)
 *
 * Each stage is wrapped in try/catch and reports {ok, error?, ...payload}
 * so a single failure doesn't abort the whole pipeline. The result includes
 * a `failure_stage` index pointing at the earliest failed stage — that's
 * the diagnostic value: when "draw this print" fails, the operator knows
 * whether to fix OCR (1), feature recognition (2), class prior (3),
 * fidelity prediction (4), or CAD execution (5).
 *
 * Pure pre-flight by design — does NOT drive a live build. cad_class_drive_build
 * (PHASE16) does that for Fusion; the analogous PHASE21+ work will extend live
 * execution to the other 5 vendors via the PHASE18 router.
 *
 * @engine PrintToCADOrchestratorEngine
 * @milestone CAD-FUSION-LIVE-MS0 PHASE20
 */

import { stepGeometryParserEngine, type STEPParseResult } from "./STEPGeometryParserEngine.js";
import { cadClassFeatureLibraryEngine, type ClassFeatureTemplate, type FeatureTemplate } from "./CADClassFeatureLibraryEngine.js";
import type { PartClass } from "./BlueprintVisionOCREngine.js";
import { CADSystemRouterEngine, type CADSystemId, type SystemCapabilitySnapshot } from "./CADSystemRouterEngine.js";

// ── Input / Output Types ──────────────────────────────────────────────

export interface PrintToCADInput {
  /** Optional STEP file path. If provided, stage 1 (geometry) and stage 2
   *  (feature evidence) execute. If absent, both stages report `skipped: true`
   *  and the pipeline starts at stage 3 with the given part_class_hint. */
  step_file_path?: string;
  /** Part class to plan against. Required when step_file_path is absent.
   *  When both provided, the hint takes precedence over any future class
   *  inference (which is not yet wired in this engine). */
  part_class_hint?: PartClass;
  /** Target CAD system for stage 5 route validation. Optional — when absent,
   *  stage 5 reports the supported systems matrix without selecting one. */
  target_system?: CADSystemId;
  /** Prevalence threshold for buildSequenceFor (stage 4). Default 0.5. */
  prevalence_threshold?: number;
}

export interface StageResult<T extends object = Record<string, unknown>> {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  payload?: T;
}

export interface PrintToCADResult {
  stages: {
    stage_1_geometry: StageResult<{ counts: STEPParseResult["entity_counts"]; geometry: STEPParseResult["geometry"]; bytes_read: number }>;
    stage_2_features: StageResult<{ evidence_kinds: string[] }>;
    stage_3_class: StageResult<{ part_class: PartClass; template: ClassFeatureTemplate }>;
    stage_4_plan: StageResult<{ build_sequence: FeatureTemplate[]; fidelity_score: number; template_total: number; planned_covered: number; missing_count: number }>;
    stage_5_route: StageResult<{ target_system: CADSystemId | null; supported_count: number; capability?: SystemCapabilitySnapshot }>;
  };
  /** Earliest stage that failed (1-5), or null if every executed stage was ok. */
  failure_stage: 1 | 2 | 3 | 4 | 5 | null;
  /** True iff every executed stage (skipped excluded) returned ok. */
  pipeline_ok: boolean;
  duration_ms: number;
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PrintToCADOrchestratorEngine {
  /** Run the full print → CAD pipeline. Never throws — every error becomes a
   *  `stage_X.error` and the pipeline continues to stages whose preconditions
   *  are still satisfiable. */
  async run(input: PrintToCADInput): Promise<PrintToCADResult> {
    const startMs = Date.now();
    const stages: PrintToCADResult["stages"] = {
      stage_1_geometry: { ok: false, skipped: true },
      stage_2_features: { ok: false, skipped: true },
      stage_3_class: { ok: false, skipped: true },
      stage_4_plan: { ok: false, skipped: true },
      stage_5_route: { ok: false, skipped: true },
    };

    // ── Stage 1: Geometry ────────────────────────────────────────────
    let parseResult: STEPParseResult | null = null;
    if (input.step_file_path) {
      try {
        parseResult = stepGeometryParserEngine.parseFile(input.step_file_path);
        if (parseResult.parse_ok) {
          stages.stage_1_geometry = {
            ok: true,
            payload: {
              counts: parseResult.entity_counts,
              geometry: parseResult.geometry,
              bytes_read: parseResult.bytes_read,
            },
          };
        } else {
          stages.stage_1_geometry = { ok: false, error: parseResult.parse_error ?? "STEP parse failed" };
        }
      } catch (e: unknown) {
        stages.stage_1_geometry = { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    }

    // ── Stage 2: Feature evidence ────────────────────────────────────
    if (parseResult && parseResult.parse_ok) {
      try {
        const evidenceSet = stepGeometryParserEngine.evidenceForFeatureKinds(parseResult.geometry);
        stages.stage_2_features = {
          ok: true,
          payload: { evidence_kinds: [...evidenceSet].sort() },
        };
      } catch (e: unknown) {
        stages.stage_2_features = { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    } else if (input.step_file_path) {
      stages.stage_2_features = { ok: false, skipped: false, error: "stage 1 (geometry) did not succeed" };
    }

    // ── Stage 3: Part class + template ───────────────────────────────
    const partClass = input.part_class_hint;
    if (partClass) {
      try {
        const template = cadClassFeatureLibraryEngine.templateFor(partClass);
        if (template) {
          stages.stage_3_class = { ok: true, payload: { part_class: partClass, template } };
        } else {
          stages.stage_3_class = { ok: false, error: `no template registered for part_class "${partClass}"` };
        }
      } catch (e: unknown) {
        stages.stage_3_class = { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    } else {
      stages.stage_3_class = {
        ok: false,
        skipped: false,
        error: "part_class_hint required (auto-inference from geometry not yet wired in PHASE20)",
      };
    }

    // ── Stage 4: Plan ────────────────────────────────────────────────
    if (stages.stage_3_class.ok && partClass) {
      try {
        const threshold = input.prevalence_threshold ?? 0.5;
        const buildSequence = cadClassFeatureLibraryEngine.buildSequenceFor(partClass, threshold);
        const plannedKinds = buildSequence.map((f) => f.kind);
        const fidelity = cadClassFeatureLibraryEngine.predictVisualFidelity(partClass, plannedKinds);
        stages.stage_4_plan = {
          ok: true,
          payload: {
            build_sequence: buildSequence,
            fidelity_score: fidelity.score,
            template_total: fidelity.template_total,
            planned_covered: fidelity.planned_covered,
            missing_count: fidelity.missing.length,
          },
        };
      } catch (e: unknown) {
        stages.stage_4_plan = { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    } else if (stages.stage_3_class.ok === false) {
      stages.stage_4_plan = { ok: false, skipped: false, error: "stage 3 (class) did not succeed" };
    }

    // ── Stage 5: Route validation ────────────────────────────────────
    try {
      const supported = CADSystemRouterEngine.listSupportedSystems();
      const targetSystem = input.target_system ?? null;
      let capability: SystemCapabilitySnapshot | undefined;
      if (targetSystem) {
        const matrix = await CADSystemRouterEngine.listCapabilitiesAcrossSystems();
        capability = matrix.systems.find((s) => s.system === targetSystem);
        if (!capability) {
          stages.stage_5_route = {
            ok: false,
            error: `target_system "${targetSystem}" not in capability matrix (available: ${matrix.systems.map((s) => s.system).join(", ")})`,
          };
        } else {
          stages.stage_5_route = {
            ok: true,
            payload: { target_system: targetSystem, supported_count: supported.systems.length, capability },
          };
        }
      } else {
        stages.stage_5_route = {
          ok: true,
          payload: { target_system: null, supported_count: supported.systems.length },
        };
      }
    } catch (e: unknown) {
      stages.stage_5_route = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }

    // ── Aggregate ────────────────────────────────────────────────────
    let failureStage: PrintToCADResult["failure_stage"] = null;
    const orderedStages: Array<[1 | 2 | 3 | 4 | 5, StageResult<object>]> = [
      [1, stages.stage_1_geometry],
      [2, stages.stage_2_features],
      [3, stages.stage_3_class],
      [4, stages.stage_4_plan],
      [5, stages.stage_5_route],
    ];
    for (const [idx, s] of orderedStages) {
      if (!s.ok && !s.skipped) {
        failureStage = idx;
        break;
      }
    }
    const pipelineOk = failureStage === null;

    return {
      stages,
      failure_stage: failureStage,
      pipeline_ok: pipelineOk,
      duration_ms: Date.now() - startMs,
    };
  }
}

export const printToCADOrchestratorEngine = new PrintToCADOrchestratorEngine();

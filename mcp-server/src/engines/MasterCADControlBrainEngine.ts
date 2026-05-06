/**
 * MasterCADControlBrainEngine — U-CADC-AI01 / CAD-COMPLETE-MS0 PHASE-30
 *
 * Top-level orchestration facade that routes a user intent through the
 * full planner+adapter+validator chain built by U-CUIX-P0-19..22:
 *
 *   user intent → pick target CAD → plan → buildScript → [executeScript] → validate → report
 *
 * Accepts any of three intent tiers:
 *   - OpIntent        = CADIntent (P0-20 feature-tree, single-body)
 *   - PartIntent      = ComplexPartIntent (P0-21 multi-body + multi-config)
 *   - AssemblyIntent  = AssemblyIntent (P0-22 components + mates + BOM + drawings)
 *
 * Auto-resolves the best adapter when `cadSystem: "auto"` is requested by
 * running the compatibility probe across registered CADs and picking the
 * one with the fewest unsupported ops. Falls back to the highest-priority
 * registered CAD (per user's priority list — mastercam → hypercad_s →
 * fusion360 → inventor → solidworks → freecad) on ties.
 *
 * This is the engine a skill / dispatcher invokes to go from "make me a
 * fastener die" to a validated CAD execution report without the caller
 * having to know about planners, adapters, or op kinds.
 *
 * Non-goals (future units):
 *   - Neural-network intent refinement (U-CADC-NN01..06)
 *   - Cross-CAD consistency comparison (U-CADC-CRD01..03 — built partially
 *     by the planners' compatibility probes)
 *   - Closed-loop learning (U-CADC-LP01..04)
 *
 * @module engines/MasterCADControlBrainEngine
 */

import type {
  CADOperation,
  CADScript,
  CADExecutionResult,
  CADValidationReport,
  CADSystemId,
} from "../interfaces/ICADCodeGenerator.js";
import {
  getCADAdapter,
  CAD_REGISTERED_SYSTEMS,
  listAllCapabilities,
} from "./CADAdapterRegistry.js";
import {
  cadOperationPlannerEngine,
  type CADIntent,
} from "./CADOperationPlannerEngine.js";
import {
  complexPartPlannerEngine,
  type ComplexPartIntent,
} from "./ComplexPartPlannerEngine.js";
import {
  assemblyPlannerEngine,
  type AssemblyIntent,
} from "./AssemblyPlannerEngine.js";

// ── Intent tagging ──────────────────────────────────────────────────────

export type MasterIntentTier = "op" | "part" | "assembly";

/** Union of the 3 intent shapes the orchestrator understands. */
export type MasterCADIntent =
  | { tier: "op"; intent: CADIntent }
  | { tier: "part"; intent: ComplexPartIntent }
  | { tier: "assembly"; intent: AssemblyIntent };

/** Options that govern orchestrator behavior. */
export interface MasterControlOptions {
  /** When true, run adapter.executeScript after buildScript. Default: false (dry plan). */
  execute?: boolean;
  /** When true, adapter.validateOutput runs after execute. Default: true when execute=true. */
  validate?: boolean;
  /**
   * When set to "auto" (or omitted), pick the best registered CAD by compatibility
   * probe + priority list. When set to a registered CADSystemId, force that CAD
   * (errors if unregistered or incompatible).
   */
  cadSystemOverride?: CADSystemId | "auto";
  /** Soft failure mode — collect errors vs throwing. Default false (throw). */
  softFail?: boolean;
}

// ── Priority list ────────────────────────────────────────────────────────

/**
 * Priority order for auto-routing, matching the CAD-UIX-MS0 envelope's
 * declared priority_order (Mastercam → HyperCAD-S → Fusion 360 → Inventor
 * → SolidWorks → FreeCAD). The engine prefers earlier entries on ties.
 */
export const CAD_PRIORITY_ORDER: ReadonlyArray<CADSystemId> = [
  "mastercam",
  "hypercad_s",
  "fusion360",
  "inventor",
  "solidworks",
  "freecad",
];

// ── Result ───────────────────────────────────────────────────────────────

export interface MasterControlStage {
  name: "select_cad" | "plan" | "build" | "execute" | "validate";
  ok: boolean;
  durationMs: number;
  summary: string;
  error?: string;
}

export interface MasterControlReport {
  /** The tier of intent that was orchestrated. */
  tier: MasterIntentTier;
  /** The CAD ultimately targeted (after auto-resolution). */
  cadSystem: CADSystemId;
  /** Was every stage successful? */
  ok: boolean;
  /** Stage-by-stage result table. */
  stages: ReadonlyArray<MasterControlStage>;
  /** Ordered operation stream produced by the planner. */
  ops: ReadonlyArray<CADOperation>;
  /** Script produced by adapter.buildScript (when stage reached). */
  script?: CADScript;
  /** Execution result when execute=true. */
  executionResult?: CADExecutionResult;
  /** Validation report when validate=true. */
  validationReport?: CADValidationReport;
  /** Total wall time across all stages. */
  totalDurationMs: number;
  /** Compatibility rollup across all registered CADs. */
  compatibility: Readonly<Partial<Record<CADSystemId, "full" | "partial" | "unsupported">>>;
  /** Human-readable summary line (one per stage). */
  narration: ReadonlyArray<string>;
  /** Non-fatal warnings. */
  warnings: ReadonlyArray<{ stage?: string; message: string }>;
}

// ── Errors ───────────────────────────────────────────────────────────────

export class MasterIntentTierError extends Error {
  readonly code = "MASTER_INTENT_TIER_INVALID";
  constructor(message: string) {
    super(message);
    this.name = "MasterIntentTierError";
  }
}

export class NoCompatibleCADError extends Error {
  readonly code = "MASTER_NO_COMPATIBLE_CAD";
  readonly probed: ReadonlyArray<CADSystemId>;
  constructor(probed: ReadonlyArray<CADSystemId>) {
    super(`No registered CAD is compatible with the intent. Probed: ${probed.join(", ")}.`);
    this.name = "NoCompatibleCADError";
    this.probed = probed;
  }
}

// ── Engine ───────────────────────────────────────────────────────────────

export class MasterCADControlBrainEngine {
  /**
   * Main entry: orchestrate the full chain for one MasterCADIntent.
   * Always returns a MasterControlReport; throws only when `softFail=false`
   * and a stage returns an error the caller probably wants to halt on.
   */
  async orchestrate(
    intent: MasterCADIntent,
    options: MasterControlOptions = {},
  ): Promise<MasterControlReport> {
    const t0 = Date.now();
    const stages: MasterControlStage[] = [];
    const warnings: Array<{ stage?: string; message: string }> = [];
    const narration: string[] = [];

    // Validate the tier tag matches the intent shape.
    this.validateTier(intent);

    // ── Stage 1: pick the target CAD ───────────────────────────────────
    const pick = await this.selectCAD(intent, options, warnings);
    stages.push(pick.stage);
    narration.push(pick.stage.summary);
    if (!pick.stage.ok) {
      return this.earlyExit(intent, pick.stage.name, stages, narration, warnings, t0, pick.compatibility);
    }
    const cadSystem = pick.cadSystem!;

    // ── Stage 2: plan ───────────────────────────────────────────────────
    const planStart = Date.now();
    let ops: ReadonlyArray<CADOperation> = [];
    let compatibility: Partial<Record<CADSystemId, "full" | "partial" | "unsupported">> = pick.compatibility;
    try {
      const boundIntent = this.retargetIntent(intent, cadSystem);
      if (boundIntent.tier === "op") {
        const r = await cadOperationPlannerEngine.plan(boundIntent.intent);
        ops = r.ops;
        compatibility = r.compatibility;
        warnings.push(...r.warnings.map((w) => ({ stage: "plan", message: w.message })));
      } else if (boundIntent.tier === "part") {
        const r = await complexPartPlannerEngine.plan(boundIntent.intent);
        ops = r.defaultOps;
        compatibility = r.compatibility;
        warnings.push(...r.warnings.map((w) => ({ stage: "plan", message: w.message })));
      } else {
        const r = await assemblyPlannerEngine.plan(boundIntent.intent);
        ops = r.ops;
        compatibility = r.compatibility;
        warnings.push(...r.warnings.map((w) => ({ stage: "plan", message: w.message })));
      }
      stages.push({
        name: "plan",
        ok: true,
        durationMs: Date.now() - planStart,
        summary: `plan: ${ops.length} op(s) emitted for ${cadSystem} (tier=${intent.tier})`,
      });
      narration.push(stages[stages.length - 1]!.summary);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stages.push({
        name: "plan",
        ok: false,
        durationMs: Date.now() - planStart,
        summary: `plan failed: ${msg}`,
        error: msg,
      });
      if (!options.softFail) throw err;
      return this.earlyExit(intent, "plan", stages, narration, warnings, t0, compatibility, [], cadSystem);
    }

    // ── Stage 3: build script ───────────────────────────────────────────
    const buildStart = Date.now();
    let script: CADScript | undefined;
    try {
      const adapter = await getCADAdapter(cadSystem);
      script = adapter.buildScript(ops);
      stages.push({
        name: "build",
        ok: true,
        durationMs: Date.now() - buildStart,
        summary: `build: ${script.body.length} byte(s) of ${cadSystem} script`,
      });
      narration.push(stages[stages.length - 1]!.summary);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stages.push({
        name: "build",
        ok: false,
        durationMs: Date.now() - buildStart,
        summary: `build failed: ${msg}`,
        error: msg,
      });
      if (!options.softFail) throw err;
      return this.earlyExit(intent, "build", stages, narration, warnings, t0, compatibility, ops, cadSystem);
    }

    // ── Stage 4: execute (optional) ─────────────────────────────────────
    let executionResult: CADExecutionResult | undefined;
    if (options.execute && script) {
      const execStart = Date.now();
      try {
        const adapter = await getCADAdapter(cadSystem);
        executionResult = await adapter.executeScript(script);
        stages.push({
          name: "execute",
          ok: executionResult.ok,
          durationMs: Date.now() - execStart,
          summary: executionResult.ok
            ? `execute: ok in ${executionResult.durationMs}ms`
            : `execute: failed — ${executionResult.error ?? "unknown"}`,
          error: executionResult.ok ? undefined : executionResult.error,
        });
        narration.push(stages[stages.length - 1]!.summary);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        stages.push({
          name: "execute",
          ok: false,
          durationMs: Date.now() - execStart,
          summary: `execute failed: ${msg}`,
          error: msg,
        });
        executionResult = { ok: false, error: msg, durationMs: Date.now() - execStart };
        if (!options.softFail) throw err;
      }
    }

    // ── Stage 5: validate (optional, depends on execute) ───────────────
    let validationReport: CADValidationReport | undefined;
    const wantValidate = options.validate ?? !!options.execute;
    if (wantValidate && executionResult) {
      const valStart = Date.now();
      try {
        const adapter = await getCADAdapter(cadSystem);
        validationReport = adapter.validateOutput(executionResult);
        stages.push({
          name: "validate",
          ok: validationReport.ok,
          durationMs: Date.now() - valStart,
          summary: validationReport.ok
            ? `validate: ok (${validationReport.findings.length} finding${validationReport.findings.length === 1 ? "" : "s"})`
            : `validate: failed — ${validationReport.findings.filter((f) => f.severity === "error").length} error finding(s)`,
        });
        narration.push(stages[stages.length - 1]!.summary);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        stages.push({
          name: "validate",
          ok: false,
          durationMs: Date.now() - valStart,
          summary: `validate failed: ${msg}`,
          error: msg,
        });
        if (!options.softFail) throw err;
      }
    }

    const ok = stages.every((s) => s.ok);

    return {
      tier: intent.tier,
      cadSystem,
      ok,
      stages,
      ops,
      script,
      executionResult,
      validationReport,
      totalDurationMs: Date.now() - t0,
      compatibility,
      narration,
      warnings,
    };
  }

  /**
   * Dry-plan convenience — runs the full chain in plan-only mode (no execute).
   * Useful for preview / compatibility checking without hitting a live CAD.
   */
  async dryPlan(intent: MasterCADIntent): Promise<MasterControlReport> {
    return this.orchestrate(intent, { execute: false, softFail: true });
  }

  // ── Target-CAD selection ───────────────────────────────────────────────

  private async selectCAD(
    intent: MasterCADIntent,
    options: MasterControlOptions,
    warnings: Array<{ stage?: string; message: string }>,
  ): Promise<{
    stage: MasterControlStage;
    cadSystem?: CADSystemId;
    compatibility: Partial<Record<CADSystemId, "full" | "partial" | "unsupported">>;
  }> {
    const started = Date.now();
    const override = options.cadSystemOverride;
    const tierCad = this.intentCadSystem(intent);

    // Explicit non-auto override takes precedence.
    if (override && override !== "auto") {
      try {
        await getCADAdapter(override);
        return {
          stage: {
            name: "select_cad",
            ok: true,
            durationMs: Date.now() - started,
            summary: `select_cad: forced override → ${override}`,
          },
          cadSystem: override,
          compatibility: { [override]: "full" } as Partial<Record<CADSystemId, "full" | "partial" | "unsupported">>,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          stage: {
            name: "select_cad",
            ok: false,
            durationMs: Date.now() - started,
            summary: `select_cad: override '${override}' unavailable: ${msg}`,
            error: msg,
          },
          compatibility: {},
        };
      }
    }

    // Non-auto intent cadSystem: respect it if it's registered.
    if (tierCad !== "auto") {
      try {
        await getCADAdapter(tierCad);
        return {
          stage: {
            name: "select_cad",
            ok: true,
            durationMs: Date.now() - started,
            summary: `select_cad: using intent.cadSystem=${tierCad}`,
          },
          cadSystem: tierCad,
          compatibility: { [tierCad]: "full" } as Partial<Record<CADSystemId, "full" | "partial" | "unsupported">>,
        };
      } catch {
        warnings.push({
          stage: "select_cad",
          message: `intent.cadSystem=${tierCad} is not registered; falling back to auto`,
        });
      }
    }

    // Auto-resolve: probe capability across registered CADs, pick best by
    // priority-then-least-missing.
    const probe = await this.probeCompatibility(intent);
    const candidates = CAD_PRIORITY_ORDER.filter(
      (s) => CAD_REGISTERED_SYSTEMS.includes(s) && probe[s] !== "unsupported",
    );
    if (candidates.length === 0) {
      return {
        stage: {
          name: "select_cad",
          ok: false,
          durationMs: Date.now() - started,
          summary: `select_cad: no registered CAD is compatible with intent (tier=${intent.tier})`,
          error: "NO_COMPATIBLE_CAD",
        },
        compatibility: probe,
      };
    }
    // Prefer 'full' over 'partial'; on ties, priority order.
    const full = candidates.filter((s) => probe[s] === "full");
    const chosen = full[0] ?? candidates[0]!;
    return {
      stage: {
        name: "select_cad",
        ok: true,
        durationMs: Date.now() - started,
        summary: `select_cad: auto → ${chosen} (compat=${probe[chosen]}; ${full.length}/${candidates.length} full)`,
      },
      cadSystem: chosen,
      compatibility: probe,
    };
  }

  /**
   * Runs a cheap dry-plan across all registered CADs without mutating
   * anything; returns a full/partial/unsupported rollup.
   */
  private async probeCompatibility(
    intent: MasterCADIntent,
  ): Promise<Partial<Record<CADSystemId, "full" | "partial" | "unsupported">>> {
    const out: Partial<Record<CADSystemId, "full" | "partial" | "unsupported">> = {};
    for (const sys of CAD_REGISTERED_SYSTEMS) {
      try {
        const retargeted = this.retargetIntent(intent, sys);
        if (retargeted.tier === "op") {
          const r = await cadOperationPlannerEngine.plan(retargeted.intent);
          out[sys] = r.compatibility[sys] ?? "full";
        } else if (retargeted.tier === "part") {
          const r = await complexPartPlannerEngine.plan(retargeted.intent);
          out[sys] = r.compatibility[sys] ?? "full";
        } else {
          const r = await assemblyPlannerEngine.plan(retargeted.intent);
          out[sys] = r.compatibility[sys] ?? "full";
        }
      } catch {
        out[sys] = "unsupported";
      }
    }
    return out;
  }

  // ── Intent helpers ─────────────────────────────────────────────────────

  /** Extract the cadSystem field declared in the wrapped intent. */
  private intentCadSystem(intent: MasterCADIntent): CADSystemId | "auto" {
    const sys =
      intent.tier === "op" ? intent.intent.cadSystem
      : intent.tier === "part" ? intent.intent.cadSystem
      : intent.intent.cadSystem;
    if (sys === ("auto" as CADSystemId)) return "auto";
    return sys;
  }

  /**
   * Return a copy of the intent with `cadSystem` rewritten to the target.
   * Also rewrites any nested ComplexPartIntent components within an assembly
   * so that the sub-planner sees consistent cadSystem down the tree.
   */
  private retargetIntent(
    intent: MasterCADIntent,
    target: CADSystemId,
  ): MasterCADIntent {
    if (intent.tier === "op") {
      return { tier: "op", intent: { ...intent.intent, cadSystem: target } };
    }
    if (intent.tier === "part") {
      return { tier: "part", intent: { ...intent.intent, cadSystem: target } };
    }
    // Assembly — rewrite nested complex_part components' cadSystem too.
    const components = intent.intent.components.map((c) => {
      if (c.source.kind === "complex_part") {
        return {
          ...c,
          source: {
            kind: "complex_part" as const,
            intent: { ...c.source.intent, cadSystem: target },
          },
        };
      }
      return c;
    });
    return {
      tier: "assembly",
      intent: { ...intent.intent, cadSystem: target, components },
    };
  }

  private validateTier(intent: MasterCADIntent): void {
    if (!intent || typeof intent !== "object") {
      throw new MasterIntentTierError("intent is required");
    }
    if (!["op", "part", "assembly"].includes(intent.tier)) {
      throw new MasterIntentTierError(
        `intent.tier must be one of 'op'|'part'|'assembly' (got '${(intent as { tier: string }).tier}')`,
      );
    }
    if (!intent.intent || typeof intent.intent !== "object") {
      throw new MasterIntentTierError("intent.intent is required");
    }
    // Shape sanity — delegate field checks to the respective planners.
    if (intent.tier === "op" && !(intent.intent as CADIntent).features) {
      throw new MasterIntentTierError("tier='op' intent requires .features");
    }
    if (intent.tier === "part" && !(intent.intent as ComplexPartIntent).bodies) {
      throw new MasterIntentTierError("tier='part' intent requires .bodies");
    }
    if (intent.tier === "assembly" && !(intent.intent as AssemblyIntent).components) {
      throw new MasterIntentTierError("tier='assembly' intent requires .components");
    }
  }

  private earlyExit(
    intent: MasterCADIntent,
    failedStage: MasterControlStage["name"],
    stages: MasterControlStage[],
    narration: string[],
    warnings: Array<{ stage?: string; message: string }>,
    t0: number,
    compatibility: Partial<Record<CADSystemId, "full" | "partial" | "unsupported">>,
    ops: ReadonlyArray<CADOperation> = [],
    resolvedCAD?: CADSystemId,
  ): MasterControlReport {
    // Prefer an already-resolved CAD (from successful select_cad stage) over
    // the intent's declared cadSystem, so the report reflects which adapter
    // was actually targeted when a later stage failed.
    let cadSystem: CADSystemId;
    if (resolvedCAD) {
      cadSystem = resolvedCAD;
    } else {
      const declared = this.intentCadSystem(intent);
      cadSystem = declared === "auto" ? ("freecad" as CADSystemId) : (declared as CADSystemId);
    }
    return {
      tier: intent.tier,
      cadSystem,
      ok: false,
      stages,
      ops,
      totalDurationMs: Date.now() - t0,
      compatibility,
      narration,
      warnings,
    };
  }

  /** Report which CADs are registered + their capability description summary. */
  async listAvailableCADs(): Promise<
    ReadonlyArray<{ cadSystem: CADSystemId; description: string; supportedOpsCount: number }>
  > {
    return listAllCapabilities();
  }

  /**
   * Neural-link entry to the CAD-FUSION-LIVE-MS0 training surface.
   *
   * Given an inferred part class, returns the class-typical feature
   * decomposition + predicted visual fidelity for a planned feature set.
   * The CAD master brain calls this BEFORE dispatching a live build so it
   * can refuse builds whose predicted fidelity is below threshold.
   *
   * Wires the master brain to the corpus → library → live-bridge pipeline:
   *   CADClassFeatureLibraryEngine.templateFor(class) →
   *   CADClassFeatureLibraryEngine.predictVisualFidelity(class, plan) →
   *   CADClassFeatureLibraryEngine.buildSequenceFor(class, threshold)
   *
   * @param partClass - PartClass identifier from BlueprintVisionOCREngine
   * @param plannedFeatureKinds - features the orchestrator intends to build
   * @param prevalenceThreshold - inclusion threshold for build sequence (default 0.5)
   * @returns visual-fidelity prediction + recommended build sequence
   */
  async cadAITrainingSurface(
    partClass: string,
    plannedFeatureKinds: ReadonlyArray<string>,
    prevalenceThreshold = 0.5,
  ): Promise<{
    template_present: boolean;
    template_total: number;
    predicted_fidelity: number;
    missing_features: ReadonlyArray<string>;
    recommended_build_sequence: ReadonlyArray<string>;
    visual_fidelity_notes: ReadonlyArray<string>;
  }> {
    const { cadClassFeatureLibraryEngine } = await import("./CADClassFeatureLibraryEngine.js");
    const tmpl = cadClassFeatureLibraryEngine.templateFor(partClass as never);
    if (!tmpl) {
      return {
        template_present: false,
        template_total: 0,
        predicted_fidelity: 0,
        missing_features: [],
        recommended_build_sequence: [],
        visual_fidelity_notes: [`No template for part_class "${partClass}" — system has no learned visual-fidelity model for this class yet.`],
      };
    }
    const prediction = cadClassFeatureLibraryEngine.predictVisualFidelity(
      partClass as never,
      plannedFeatureKinds as never,
    );
    const sequence = cadClassFeatureLibraryEngine.buildSequenceFor(partClass as never, prevalenceThreshold);
    return {
      template_present: true,
      template_total: prediction.template_total,
      predicted_fidelity: prediction.score,
      missing_features: prediction.missing.map((f) => f.kind),
      recommended_build_sequence: sequence.map((f) => f.kind),
      visual_fidelity_notes: tmpl.visual_fidelity_notes,
    };
  }
}

/** Singleton for dispatcher + direct callers. */
export const masterCADControlBrainEngine = new MasterCADControlBrainEngine();

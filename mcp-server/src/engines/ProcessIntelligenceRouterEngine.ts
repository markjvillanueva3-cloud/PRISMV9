/**
 * ProcessIntelligenceRouterEngine — top-level orchestration router that
 * unifies the 4 cross-process bridges (XPROC-SFC, XPROC-POST, XPROC-FEAT,
 * XPROC-AI) behind a single entry point.
 *
 * Upstream consumers (PRISMSelfAwarenessEngine, MillingAGI, AGI orchestrators)
 * hand a single shape: an intent string + per-bridge opaque request bodies.
 * This router classifies the process, then runs each bridge that has its
 * corresponding request body present, and returns one combined result.
 *
 * Pipeline stages (in execution order):
 *   1. classify  — CrossProcessAIBridge.classify(intent, context)
 *   2. feature   — CrossProcessFeatureBridge.route(feature_request)
 *   3. speedfeed — CrossProcessSpeedFeedBridge.recommend(sf_request)
 *   4. post      — CrossProcessPostBridge.emit(post_request)
 *   5. ai        — CrossProcessAIBridge.orchestrate(ai_request) — usually last
 *                  because the heavy orchestrator invocations are expensive
 *
 * Stages opt-in: a stage runs only when its corresponding request body is
 * present (or when the caller explicitly lists it in `stages`). Missing
 * bodies are reported in `stages_skipped` with a reason — never throw.
 *
 * Three pure static entry points:
 *   1. route(req) — classify + return the routing decision (lightweight)
 *   2. fullPipeline(req) — execute every requested stage, return combined output
 *   3. listSupportedStages() — pipeline stage taxonomy (for self-introspection)
 *
 * The router does NOT override the bridges' physics or routing decisions —
 * it composes them. Each bridge's underlying engine result flows through
 * unchanged in the per-stage result fields.
 *
 * @engine ProcessIntelligenceRouterEngine
 * @milestone XPROC-ROUTER-01
 * @see CrossProcessSpeedFeedBridge — XPROC-SFC-01
 * @see CrossProcessPostBridge — XPROC-POST-01
 * @see CrossProcessFeatureBridge — XPROC-FEAT-01
 * @see CrossProcessAIBridge — XPROC-AI-01
 */

import type { CrossProcessSFRequest, CrossProcessSFResult } from "./CrossProcessSpeedFeedBridge.js";
import type {
  CrossProcessPostRequest,
  CrossProcessPostResult,
} from "./CrossProcessPostBridge.js";
import type { FeatureRouteRequest, FeatureRouteResult } from "./CrossProcessFeatureBridge.js";
import type {
  AIOrchestrateRequest,
  AIOrchestrateResult,
  ProcessClassification,
} from "./CrossProcessAIBridge.js";

// ============================================================================
// CONSTANTS
// ============================================================================

export const ROUTER_PROCESSES = ["mill", "lathe", "wedm"] as const;
export type RouterProcessId = (typeof ROUTER_PROCESSES)[number];

export const PIPELINE_STAGES = ["classify", "feature", "speedfeed", "post", "ai"] as const;
export type PipelineStageId = (typeof PIPELINE_STAGES)[number];

const DEFAULT_STAGES: ReadonlyArray<PipelineStageId> = Object.freeze([
  "classify",
  "feature",
  "speedfeed",
  "post",
  "ai",
]);

// ============================================================================
// TYPES
// ============================================================================

export interface ProcessRouteRequest {
  intent: string;
  process?: RouterProcessId;
  features?: ReadonlyArray<string>;
  material?: string;
}

export interface ProcessRouteResult {
  classification: ProcessClassification;
  process: RouterProcessId;
  recommended_bridges: PipelineStageId[];
  warnings: string[];
  notes: string[];
}

export interface ProcessPipelineRequest {
  intent: string;
  process?: RouterProcessId;
  features?: ReadonlyArray<string>;
  material?: string;
  /** Opt-in per-bridge request bodies — present means run that stage */
  feature_request?: FeatureRouteRequest;
  sf_request?: CrossProcessSFRequest;
  post_request?: CrossProcessPostRequest;
  ai_request?: AIOrchestrateRequest;
  /** Restrict pipeline to a subset of stages — defaults to all 5 */
  stages?: ReadonlyArray<PipelineStageId>;
  /** Always force ai stage into dry_run mode regardless of ai_request.dry_run */
  force_ai_dry_run?: boolean;
}

export interface ProcessPipelineStageStatus {
  stage: PipelineStageId;
  reason: string;
}

export interface ProcessPipelineResult {
  classification: ProcessClassification;
  process: RouterProcessId;
  stages_executed: PipelineStageId[];
  stages_skipped: ProcessPipelineStageStatus[];
  stages_failed: ProcessPipelineStageStatus[];
  feature_result?: FeatureRouteResult;
  speedfeed_result?: CrossProcessSFResult;
  post_result?: CrossProcessPostResult;
  ai_result?: AIOrchestrateResult;
  warnings: string[];
  notes: string[];
}

export interface PipelineStageDescriptor {
  stage: PipelineStageId;
  bridge: string;
  description: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class ProcessIntelligenceRouterEngine {
  /**
   * Lightweight routing decision — classify the intent and return which
   * bridges are recommended for follow-up work, without invoking any of
   * them. Use this when the caller wants to plan the pipeline before
   * paying for the heavy stages (post emission, AI orchestration).
   *
   * Throws on:
   *   - missing or empty `intent`
   *   - explicit `process` outside ROUTER_PROCESSES
   *
   * @param req — minimal request with intent + optional context
   * @returns ProcessRouteResult — classification + recommended bridges
   */
  static async route(req: ProcessRouteRequest): Promise<ProcessRouteResult> {
    if (!req || typeof req !== "object") {
      throw new Error("ProcessIntelligenceRouterEngine.route: request object required");
    }
    if (typeof req.intent !== "string" || req.intent.trim().length === 0) {
      throw new Error(
        "ProcessIntelligenceRouterEngine.route: intent must be a non-empty string",
      );
    }
    if (
      req.process !== undefined &&
      !(ROUTER_PROCESSES as readonly string[]).includes(req.process)
    ) {
      throw new Error(
        `ProcessIntelligenceRouterEngine.route: process "${String(req.process)}" not in [${ROUTER_PROCESSES.join(", ")}]`,
      );
    }

    const { CrossProcessAIBridge } = await import("./CrossProcessAIBridge.js");
    const classification = CrossProcessAIBridge.classify(req.intent, {
      process: req.process,
      features: req.features,
      material: req.material,
    });

    const proc = classification.process;

    // The recommended bridges depend on what the caller is likely trying to do.
    // For any classified process, all 4 downstream bridges are conceptually
    // applicable; we surface them in canonical execution order so callers can
    // build a pipeline plan deterministically.
    const recommended: PipelineStageId[] = ["feature", "speedfeed", "post", "ai"];

    const warnings: string[] = [];
    if (classification.confidence < 0.30 && !req.process) {
      warnings.push(
        `low classification confidence (${classification.confidence.toFixed(2)}) — caller should pass an explicit process override or richer intent`,
      );
    }

    const notes: string[] = [
      `process=${proc}`,
      `confidence=${classification.confidence.toFixed(2)}`,
      `recommended_bridges=[${recommended.join(", ")}]`,
    ];
    if (req.material) {
      notes.push(`material=${req.material}`);
    }
    if (req.features && req.features.length > 0) {
      notes.push(`features=[${req.features.join(", ")}]`);
    }

    return {
      classification,
      process: proc,
      recommended_bridges: recommended,
      warnings,
      notes,
    };
  }

  /**
   * Execute the full cross-process pipeline. For each stage in `stages`
   * (default: all 5), check whether its corresponding request body is
   * present. If yes, invoke the bridge and capture the result. If no,
   * skip with reason. Each bridge's failure is captured in `stages_failed`
   * — a single bridge failure does NOT abort the rest of the pipeline.
   *
   * Stage-to-bridge mapping:
   *   - classify   — always runs (no opt-in body required)
   *   - feature    — runs when `feature_request` is present
   *   - speedfeed  — runs when `sf_request` is present
   *   - post       — runs when `post_request` is present
   *   - ai         — runs when `ai_request` is present
   *
   * Throws on:
   *   - missing/empty intent
   *   - invalid process override
   *   - stages array contains an id outside PIPELINE_STAGES
   *
   * @param req — full pipeline request with per-bridge opt-in bodies
   * @returns ProcessPipelineResult — combined per-stage results + skip/fail trace
   */
  static async fullPipeline(req: ProcessPipelineRequest): Promise<ProcessPipelineResult> {
    if (!req || typeof req !== "object") {
      throw new Error(
        "ProcessIntelligenceRouterEngine.fullPipeline: request object required",
      );
    }
    if (typeof req.intent !== "string" || req.intent.trim().length === 0) {
      throw new Error(
        "ProcessIntelligenceRouterEngine.fullPipeline: intent must be a non-empty string",
      );
    }
    if (
      req.process !== undefined &&
      !(ROUTER_PROCESSES as readonly string[]).includes(req.process)
    ) {
      throw new Error(
        `ProcessIntelligenceRouterEngine.fullPipeline: process "${String(req.process)}" not in [${ROUTER_PROCESSES.join(", ")}]`,
      );
    }
    const stagesRequested = req.stages ?? DEFAULT_STAGES;
    if (!Array.isArray(stagesRequested)) {
      throw new Error(
        "ProcessIntelligenceRouterEngine.fullPipeline: stages must be an array of stage ids",
      );
    }
    for (const s of stagesRequested) {
      if (!(PIPELINE_STAGES as readonly string[]).includes(s)) {
        throw new Error(
          `ProcessIntelligenceRouterEngine.fullPipeline: invalid stage "${String(s)}" (supported: ${PIPELINE_STAGES.join(", ")})`,
        );
      }
    }

    const { CrossProcessAIBridge } = await import("./CrossProcessAIBridge.js");
    const classification = CrossProcessAIBridge.classify(req.intent, {
      process: req.process,
      features: req.features,
      material: req.material,
    });
    const proc = classification.process;

    const executed: PipelineStageId[] = [];
    const skipped: ProcessPipelineStageStatus[] = [];
    const failed: ProcessPipelineStageStatus[] = [];
    const warnings: string[] = [];

    let featureResult: FeatureRouteResult | undefined;
    let sfResult: CrossProcessSFResult | undefined;
    let postResult: CrossProcessPostResult | undefined;
    let aiResult: AIOrchestrateResult | undefined;

    // ── Stage: classify (always runs by definition — already done) ─────────
    if (stagesRequested.includes("classify")) {
      executed.push("classify");
    } else {
      skipped.push({ stage: "classify", reason: "not in `stages` filter" });
    }

    // ── Stage: feature ─────────────────────────────────────────────────────
    if (stagesRequested.includes("feature")) {
      if (!req.feature_request) {
        skipped.push({ stage: "feature", reason: "no feature_request provided" });
      } else {
        try {
          const { CrossProcessFeatureBridge } = await import("./CrossProcessFeatureBridge.js");
          featureResult = await CrossProcessFeatureBridge.route(req.feature_request);
          executed.push("feature");
        } catch (err) {
          failed.push({
            stage: "feature",
            reason: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } else {
      skipped.push({ stage: "feature", reason: "not in `stages` filter" });
    }

    // ── Stage: speedfeed ───────────────────────────────────────────────────
    if (stagesRequested.includes("speedfeed")) {
      if (!req.sf_request) {
        skipped.push({ stage: "speedfeed", reason: "no sf_request provided" });
      } else {
        try {
          const { CrossProcessSpeedFeedBridge } = await import(
            "./CrossProcessSpeedFeedBridge.js"
          );
          sfResult = await CrossProcessSpeedFeedBridge.recommend(req.sf_request);
          executed.push("speedfeed");
        } catch (err) {
          failed.push({
            stage: "speedfeed",
            reason: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } else {
      skipped.push({ stage: "speedfeed", reason: "not in `stages` filter" });
    }

    // ── Stage: post ────────────────────────────────────────────────────────
    if (stagesRequested.includes("post")) {
      if (!req.post_request) {
        skipped.push({ stage: "post", reason: "no post_request provided" });
      } else {
        try {
          const { CrossProcessPostBridge } = await import("./CrossProcessPostBridge.js");
          postResult = await CrossProcessPostBridge.emit(req.post_request);
          executed.push("post");
        } catch (err) {
          failed.push({
            stage: "post",
            reason: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } else {
      skipped.push({ stage: "post", reason: "not in `stages` filter" });
    }

    // ── Stage: ai ──────────────────────────────────────────────────────────
    if (stagesRequested.includes("ai")) {
      if (!req.ai_request) {
        skipped.push({ stage: "ai", reason: "no ai_request provided" });
      } else {
        try {
          const aiReq: AIOrchestrateRequest = req.force_ai_dry_run
            ? { ...req.ai_request, dry_run: true }
            : req.ai_request;
          aiResult = await CrossProcessAIBridge.orchestrate(aiReq);
          executed.push("ai");
        } catch (err) {
          failed.push({
            stage: "ai",
            reason: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } else {
      skipped.push({ stage: "ai", reason: "not in `stages` filter" });
    }

    if (failed.length > 0) {
      warnings.push(
        `${failed.length} stage(s) failed: ${failed.map((f) => f.stage).join(", ")} — review stages_failed for details`,
      );
    }
    if (classification.confidence < 0.30 && !req.process) {
      warnings.push(
        `low classification confidence (${classification.confidence.toFixed(2)}) — caller should pass an explicit process override or richer intent`,
      );
    }

    const notes: string[] = [
      `process=${proc}`,
      `confidence=${classification.confidence.toFixed(2)}`,
      `executed=[${executed.join(", ")}]`,
      `skipped=[${skipped.map((s) => s.stage).join(", ")}]`,
    ];
    if (failed.length > 0) {
      notes.push(`failed=[${failed.map((f) => f.stage).join(", ")}]`);
    }

    return {
      classification,
      process: proc,
      stages_executed: executed,
      stages_skipped: skipped,
      stages_failed: failed,
      feature_result: featureResult,
      speedfeed_result: sfResult,
      post_result: postResult,
      ai_result: aiResult,
      warnings,
      notes,
    };
  }

  /**
   * Pipeline stage taxonomy — for AI consumers self-introspecting on what
   * stages this router supports.
   *
   * @returns array of PipelineStageDescriptor in canonical execution order
   */
  static listSupportedStages(): PipelineStageDescriptor[] {
    return [
      {
        stage: "classify",
        bridge: "CrossProcessAIBridge",
        description: "Process classification from intent + context",
      },
      {
        stage: "feature",
        bridge: "CrossProcessFeatureBridge",
        description: "Per-feature routing across mill/lathe/wedm with CAD coverage",
      },
      {
        stage: "speedfeed",
        bridge: "CrossProcessSpeedFeedBridge",
        description: "Speed/feed (mill/lathe) or pulse/current (wedm) recommendation",
      },
      {
        stage: "post",
        bridge: "CrossProcessPostBridge",
        description: "G-code emission via mill/lathe/wedm master post engines",
      },
      {
        stage: "ai",
        bridge: "CrossProcessAIBridge",
        description:
          "Full AI orchestration via MillMaster/LatheMaster/WEDMComplete (live or dry_run)",
      },
    ];
  }
}

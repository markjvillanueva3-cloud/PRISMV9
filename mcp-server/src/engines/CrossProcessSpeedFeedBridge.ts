/**
 * CrossProcessSpeedFeedBridge -- unified speed/feed recommendation across mill,
 * lathe, and wire-EDM, delegating to the canonical SpeedFeedOrchestratorEngine.
 *
 * Sibling "speedfeed" bridge referenced by CrossProcessAIBridge
 * (@see XPROC-SFC-01) and consumed by ProcessIntelligenceRouterEngine's pipeline
 * `speedfeed` stage. PURE ROUTING + DELEGATION: the bridge carries NO feed/speed,
 * physics, or material VALUES of its own -- every numeric result comes from the
 * already-built, already-tested speedFeedOrchestratorEngine.compute (R8: reuse,
 * do not re-derive cutting physics here). Process classification reuses the
 * verified CrossProcessAIBridge.classify scorer.
 *
 * Two entry points (mirrors CrossProcessAIBridge.orchestrate semantics):
 *   recommend(req) -- classify + delegate to the SF orchestrator (or dry-run
 *                     preview that returns only the routing decision).
 *
 * Fail-loud (R12): a non-dry-run call without an `orchestrator_request` body
 * throws rather than silently emitting empty / fabricated speeds & feeds -- a
 * wrong speed/feed is a shop-floor hazard.
 *
 * @engine CrossProcessSpeedFeedBridge
 * @milestone XPROC-SFC-01
 * @see SpeedFeedOrchestratorEngine -- the canonical SF compute delegated to
 * @see CrossProcessAIBridge -- process classifier reused here
 * @see ProcessIntelligenceRouterEngine -- pipeline consumer (speedfeed stage)
 */

import {
  CrossProcessAIBridge,
  type AIProcessId,
  type ProcessClassification,
} from "./CrossProcessAIBridge.js";

// ============================================================================
// TYPES
// ============================================================================

export interface CrossProcessSFRequest {
  /** Natural-language hint to bias classification (e.g. "feeds for a 4140 pocket"). */
  intent?: string;
  /** Explicit process override -- classification returns it at confidence 1.0. */
  process?: AIProcessId;
  /** Workpiece material -- passed to the classifier as context. */
  material?: string;
  /** Feature kinds present -- improve the feature-bias classification score. */
  features?: ReadonlyArray<string>;
  /**
   * Opaque SpeedFeedOrchestratorEngine.compute input body -- passed through
   * verbatim to the orchestrator. Required when `dry_run` is not true.
   */
  orchestrator_request?: Record<string, unknown>;
  /** When true, return classification + routing decision without computing. */
  dry_run?: boolean;
}

export interface CrossProcessSFResult {
  classification: ProcessClassification;
  /** Engine the SF compute was routed to. */
  routed_to: string;
  dry_run: boolean;
  /** speedFeedOrchestratorEngine.compute output -- present only when dry_run is false. */
  orchestrator_response?: unknown;
  warnings: string[];
  notes: string[];
}

const ROUTED_ENGINE = "SpeedFeedOrchestratorEngine.compute";

// ============================================================================
// BRIDGE
// ============================================================================

export class CrossProcessSpeedFeedBridge {
  /**
   * Classify the request's process (informational -- the SF orchestrator is
   * process-agnostic) then delegate the actual speed/feed compute to the
   * canonical speedFeedOrchestratorEngine. Use `dry_run: true` to preview the
   * routing decision without computing.
   *
   * Throws (R12 fail-loud) on:
   *   - missing request object
   *   - non-dry-run call without `orchestrator_request`
   *   - `process` override outside the supported set (via the classifier)
   *
   * @param req -- SF request with optional intent + opaque orchestrator body
   * @returns CrossProcessSFResult (numbers come from the orchestrator, not here)
   */
  static async recommend(req: CrossProcessSFRequest): Promise<CrossProcessSFResult> {
    if (!req || typeof req !== "object") {
      throw new Error("CrossProcessSpeedFeedBridge.recommend: request object required");
    }
    const dryRun = req.dry_run === true;

    const intent = req.intent?.trim() || `speed feed for ${req.process ?? "operation"}`;
    const classification = CrossProcessAIBridge.classify(intent, {
      process: req.process,
      features: req.features,
      material: req.material,
    });

    const warnings: string[] = [];
    const notes: string[] = [
      `routed_to=${ROUTED_ENGINE}`,
      `dry_run=${dryRun}`,
      `process=${classification.process}`,
      `confidence=${classification.confidence.toFixed(2)}`,
    ];

    if (dryRun) {
      return { classification, routed_to: ROUTED_ENGINE, dry_run: true, warnings, notes };
    }

    if (!req.orchestrator_request) {
      throw new Error(
        "CrossProcessSpeedFeedBridge.recommend: non-dry-run call requires `orchestrator_request` (SpeedFeedOrchestratorEngine.compute body) -- the bridge never fabricates speeds/feeds",
      );
    }

    const { speedFeedOrchestratorEngine } = await import("./SpeedFeedOrchestratorEngine.js");
    const response = speedFeedOrchestratorEngine.compute(
      req.orchestrator_request as unknown as Parameters<
        typeof speedFeedOrchestratorEngine.compute
      >[0],
    );

    return {
      classification,
      routed_to: ROUTED_ENGINE,
      dry_run: false,
      orchestrator_response: response,
      warnings,
      notes,
    };
  }
}

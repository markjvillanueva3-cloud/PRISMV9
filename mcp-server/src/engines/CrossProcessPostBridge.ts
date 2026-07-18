/**
 * CrossProcessPostBridge -- unified post-processor (NC emission) entry across
 * mill, lathe, and wire-EDM, delegating to the canonical
 * MasterPostProcessorUnifiedAGIEngine.generatePost.
 *
 * Sibling "post" bridge referenced by CrossProcessAIBridge (@see XPROC-POST-01)
 * and consumed by ProcessIntelligenceRouterEngine's pipeline `post` stage.
 * PURE ROUTING + DELEGATION: it emits NO G-code itself -- every byte of NC comes
 * from the already-built, already-tested masterPostProcessorUnifiedAGIEngine,
 * which is the doctrinal single entry for ALL NC emission (never ad-hoc string
 * concatenation -- see feedback_echo_masterpost_pipeline_route). Process
 * classification reuses the verified CrossProcessAIBridge.classify scorer.
 *
 * One entry point:
 *   emit(req) -- classify + delegate to MasterPost.generatePost (or dry-run
 *                preview that returns only the routing decision).
 *
 * Fail-loud (R12): a non-dry-run call without a `post_input` body throws rather
 * than emitting empty / fabricated G-code -- wrong NC is a shop-floor hazard.
 *
 * @engine CrossProcessPostBridge
 * @milestone XPROC-POST-01
 * @see MasterPostProcessorUnifiedAGIEngine -- the canonical post delegated to
 * @see CrossProcessAIBridge -- process classifier reused here
 * @see ProcessIntelligenceRouterEngine -- pipeline consumer (post stage)
 */

import {
  CrossProcessAIBridge,
  type AIProcessId,
  type ProcessClassification,
} from "./CrossProcessAIBridge.js";

// ============================================================================
// TYPES
// ============================================================================

export interface CrossProcessPostRequest {
  /** Natural-language hint to bias classification (e.g. "post this for the Haas VF"). */
  intent?: string;
  /** Explicit process override -- classification returns it at confidence 1.0. */
  process?: AIProcessId;
  /** Feature kinds present -- improve the feature-bias classification score. */
  features?: ReadonlyArray<string>;
  /**
   * Opaque MasterPostProcessorUnifiedAGIEngine.generatePost input body
   * (UnifiedPostInput) -- passed through verbatim. Required when not dry_run.
   */
  post_input?: Record<string, unknown>;
  /** When true, return classification + routing decision without emitting NC. */
  dry_run?: boolean;
}

export interface CrossProcessPostResult {
  classification: ProcessClassification;
  /** Engine the post emission was routed to. */
  routed_to: string;
  dry_run: boolean;
  /** MasterPost.generatePost output -- present only when dry_run is false. */
  post_response?: unknown;
  warnings: string[];
  notes: string[];
}

const ROUTED_ENGINE = "MasterPostProcessorUnifiedAGIEngine.generatePost";

// ============================================================================
// BRIDGE
// ============================================================================

export class CrossProcessPostBridge {
  /**
   * Classify the request's process (informational -- MasterPost routes by
   * controller internally) then delegate NC emission to the canonical
   * masterPostProcessorUnifiedAGIEngine. Use `dry_run: true` to preview the
   * routing decision without emitting.
   *
   * Throws (R12 fail-loud) on:
   *   - missing request object
   *   - non-dry-run call without `post_input`
   *   - `process` override outside the supported set (via the classifier)
   *
   * @param req -- post request with optional intent + opaque generatePost body
   * @returns CrossProcessPostResult (NC comes from MasterPost, not this bridge)
   */
  static async emit(req: CrossProcessPostRequest): Promise<CrossProcessPostResult> {
    if (!req || typeof req !== "object") {
      throw new Error("CrossProcessPostBridge.emit: request object required");
    }
    const dryRun = req.dry_run === true;

    const intent = req.intent?.trim() || `post for ${req.process ?? "operation"}`;
    const classification = CrossProcessAIBridge.classify(intent, {
      process: req.process,
      features: req.features,
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

    if (!req.post_input) {
      throw new Error(
        "CrossProcessPostBridge.emit: non-dry-run call requires `post_input` (MasterPost UnifiedPostInput body) -- the bridge never fabricates G-code",
      );
    }

    const { masterPostProcessorUnifiedAGIEngine } = await import(
      "./MasterPostProcessorUnifiedAGIEngine.js"
    );
    const response = masterPostProcessorUnifiedAGIEngine.generatePost(
      req.post_input as unknown as Parameters<
        typeof masterPostProcessorUnifiedAGIEngine.generatePost
      >[0],
    );

    return {
      classification,
      routed_to: ROUTED_ENGINE,
      dry_run: false,
      post_response: response,
      warnings,
      notes,
    };
  }
}

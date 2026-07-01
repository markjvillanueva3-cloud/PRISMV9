/**
 * CrossProcessFeatureBridge -- routes a recognized feature to the owning
 * manufacturing process (mill / lathe / wedm) so a cross-process pipeline can
 * decide WHICH domain should make a given feature before it dispatches the
 * concern-specific work (speed/feed, post, orchestration).
 *
 * This is the sibling "feature" bridge referenced by CrossProcessAIBridge
 * (@see XPROC-FEAT-01) and consumed by ProcessIntelligenceRouterEngine's
 * pipeline `feature` stage. It is a PURE ROUTING layer: it carries no physics,
 * feed/speed, or material VALUES of its own -- the process decision is delegated
 * to the already-built, already-tested CrossProcessAIBridge.classify keyword +
 * feature-bias scorer (R8: reuse, do not re-implement the classifier).
 *
 * Single static entry point:
 *   route(req) -- classify the feature's owning process + return the routing
 *                 decision with confidence + matched signals.
 *
 * Fail-loud (R12): a missing/empty feature kind throws a deterministic error
 * rather than silently defaulting -- a mis-routed feature is a downstream
 * shop-floor hazard (wrong machine = wrong program).
 *
 * @engine CrossProcessFeatureBridge
 * @milestone XPROC-FEAT-01
 * @see CrossProcessAIBridge -- process classifier reused here
 * @see ProcessIntelligenceRouterEngine -- pipeline consumer (feature stage)
 */

import {
  CrossProcessAIBridge,
  type AIProcessId,
  type ProcessClassification,
} from "./CrossProcessAIBridge.js";

// ============================================================================
// TYPES
// ============================================================================

/** A feature to be routed. `kind` is the recognized feature token (e.g. "pocket_2d"). */
export interface RouteFeature {
  kind: string;
  /** Optional geometric dimensions (mm). Carried through for the consumer; not interpreted here. */
  dimensions?: Record<string, number>;
  /** Optional stable feature id for lineage. */
  id?: string;
}

export interface FeatureRouteRequest {
  feature: RouteFeature;
  /** Optional natural-language hint to bias classification (e.g. "rough this slot on the VMC"). */
  intent?: string;
  /** Additional feature kinds present on the part -- improves the feature-bias score. */
  additional_features?: ReadonlyArray<string>;
  /** Explicit process override -- when set, classification returns it at confidence 1.0. */
  process?: AIProcessId;
  /** Optional workpiece material -- passed to the classifier as context only. */
  material?: string;
}

export interface FeatureRouteResult {
  feature: RouteFeature;
  /** Full classification (process + confidence + matched signals + alternatives). */
  classification: ProcessClassification;
  /** The process the feature is routed to (== classification.process). */
  routed_to: AIProcessId;
  /** Convenience copy of classification.confidence in [0,1]. */
  confidence: number;
  warnings: string[];
  notes: string[];
}

// ============================================================================
// BRIDGE
// ============================================================================

export class CrossProcessFeatureBridge {
  /**
   * Route a feature to its owning manufacturing process.
   *
   * Resolution: build a classification intent from `req.intent` (or the feature
   * kind), then delegate to CrossProcessAIBridge.classify with the feature kind
   * (+ any additional features) as feature-bias signals. An explicit
   * `req.process` override wins at confidence 1.0.
   *
   * Throws (R12 fail-loud) on:
   *   - missing request object
   *   - missing `feature` or empty `feature.kind`
   *   - `process` override outside the supported process set (surfaced by the
   *     underlying classifier)
   *
   * @param req -- feature + optional intent / additional features / override
   * @returns FeatureRouteResult with the routing decision (no physics values)
   */
  static async route(req: FeatureRouteRequest): Promise<FeatureRouteResult> {
    if (!req || typeof req !== "object") {
      throw new Error("CrossProcessFeatureBridge.route: request object required");
    }
    if (!req.feature || typeof req.feature !== "object") {
      throw new Error("CrossProcessFeatureBridge.route: `feature` object required");
    }
    const kind = typeof req.feature.kind === "string" ? req.feature.kind.trim() : "";
    if (kind.length === 0) {
      throw new Error("CrossProcessFeatureBridge.route: `feature.kind` must be a non-empty string");
    }

    const intent = req.intent?.trim() || `feature ${kind}`;
    const featureSignals = [kind, ...(req.additional_features ?? [])];

    // Delegate the actual process decision to the verified, tested classifier.
    const classification = CrossProcessAIBridge.classify(intent, {
      process: req.process,
      features: featureSignals,
      material: req.material,
    });

    const warnings: string[] = [];
    if (classification.confidence < 0.3 && !req.process) {
      warnings.push(
        `low routing confidence (${classification.confidence.toFixed(2)}) for feature "${kind}" -- pass an explicit process or a richer intent`,
      );
    }

    const notes: string[] = [
      `feature_kind=${kind}`,
      `routed_to=${classification.process}`,
      `confidence=${classification.confidence.toFixed(2)}`,
    ];
    if (req.material) notes.push(`material=${req.material}`);

    return {
      feature: req.feature,
      classification,
      routed_to: classification.process,
      confidence: classification.confidence,
      warnings,
      notes,
    };
  }
}

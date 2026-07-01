/**
 * FullSystemAICoordinatorEngine — Tier-2 AI command coordinator
 * ==============================================================
 *
 * Closes U-BRIDGE-AI-TIER1-TIER2 (PSN-DORMANCY-AUDIT-MS0 punch list,
 * audited 2026-05-22 by claude-902de304/whiskey). The L3 "AI Hierarchy"
 * wiki has carried `Tier-2: FullSystemAICoordinator` as a built node since
 * the graph was first generated, but the class itself did NOT exist —
 * graph-vs-code drift surfaced by `reference_psn_bridge_audit_2026_05_22`.
 *
 * What this engine IS (this unit, U-BRIDGE-AI-TIER1-TIER2):
 *   The single Tier-1 → Tier-2 entry point Claude calls when issuing a
 *   manufacturing intent. It validates the DomainAGIIntent at the
 *   coordinator boundary, delegates the mfg slice (mill/lathe/wedm) to
 *   `ProcessIntelligenceRouterEngine.orchestrate(intent)`, appends
 *   `coordinator_metadata` (version, routed_to, routing_ms, tier band),
 *   and publishes an outcome event tagged `coordinator_dispatch` so the
 *   feedback bus can attribute the call to the Tier-2 layer for telemetry.
 *
 * What this engine is NOT (yet):
 *   The Tier-2 → Tier-3 fan-out across cad/cam/safety/quality specialists.
 *   That is U-BRIDGE-AI-TIER2-TIER3, the next-iter unit that extends this
 *   coordinator with additional `intent.domain` branches. Today, the four
 *   non-mfg domains route through their own dispatcher actions; the
 *   coordinator's `coordinate()` validates that `intent.domain` is one of
 *   {mill, lathe, wedm} via the canonical `DomainAGIIntentSchema` (zod gate
 *   rejects anything else with `INVALID_INTENT`).
 *
 * ─── DESIGN NOTES ──────────────────────────────────────────────────────────
 *
 * Why a thin wrapper (and not a clone of ProcessIntelligenceRouterEngine):
 *   The router is the LAYER-2 routing primitive (schema gate + per-domain
 *   AGI dispatch). The coordinator is the LAYER-2 command bus surface
 *   Claude (Tier-1) interacts with. Splitting them gives the coordinator a
 *   single, stable contract Tier-1 callers depend on while leaving the
 *   router free to evolve its internal dispatch table. The coordinator also
 *   owns cross-cutting concerns (outcome event, routing telemetry, audit
 *   metadata) that don't belong in the router's hot path.
 *
 * Why outcome events go through FeedbackBusEngine (not OutcomeCaptureBus):
 *   `FeedbackBusEngine` is the canonical Tier-2 outcome surface already used
 *   by every domain AGI adapter (mill, lathe, wedm orchestrate paths via
 *   `domainAGIAdapterKit.publishOutcomeToFeedbackBus`). Routing through the
 *   same bus means coordinator-level events flow to the same downstream
 *   subscribers (PhysicsOutcomeCalibrator, PolicyExperienceLedger,
 *   CrossProcessNeuralLearningEngine) without a new wiring surface.
 *
 * Why coordinator_metadata is OUTSIDE the contract `decisions[]` array:
 *   The DomainAGIResult contract defines `decisions[]` as the per-domain
 *   AGI's emitted picks (tool, strategy, feed, etc.). Coordinator metadata
 *   (which engine ran, how long routing took, which Tier-2 version) is
 *   audit/telemetry, not a domain decision. Tucking it under a top-level
 *   `coordinator_metadata` keeps `decisions[]` faithful to the spec while
 *   the audit data still rides the same response object.
 *
 * Why we publish a SEPARATE coordinator outcome (the router already
 * publishes per-domain outcomes):
 *   The per-domain outcome attributes the decision to the Tier-3 AGI
 *   (mill/lathe/wedm). The coordinator outcome attributes the dispatch to
 *   Tier-2 — the layer at which Claude's command entered the system. Two
 *   layers of audit, two layers of accountability. Downstream subscribers
 *   that need pipeline-stage attribution (`pipeline_stage:
 *   coordinator_dispatch` vs `domain_agi_orchestrate`) can filter on the
 *   stage token.
 *
 * Why the coordinator does not retry on transient failures:
 *   The contract is single-shot: validate, dispatch, return. Retries belong
 *   higher up (in the dispatcher action handler) or lower (in the per-
 *   domain AGI's own internal resilience). Adding retry here would
 *   double-publish outcome events and double-charge token budgets if a
 *   downstream consensus call partially succeeded then failed.
 *
 * @module engines/FullSystemAICoordinatorEngine
 * @milestone PSN-DORMANCY-AUDIT-MS0/U-BRIDGE-AI-TIER1-TIER2
 * @version 1.0.0
 */

import { z } from "zod";

import {
  DOMAIN_AGI_CONTRACT_VERSION,
  DomainAGIIntentSchema,
  type DomainAGIIntent,
  type DomainAGIResult,
} from "../schemas/domainAGIContract.js";
import { feedbackBusEngine } from "./FeedbackBusEngine.js";

/** Tier band this engine occupies in the AI hierarchy (L3 wiki taxonomy). */
const COORDINATOR_TIER = "tier-2" as const;

/** Coordinator schema version. Bumps follow additive-only protocol. */
export const COORDINATOR_VERSION = "1.0.0" as const;

/**
 * Outcome topic the coordinator publishes to. Subscribers discriminate by
 * `event.context.pipeline_stage === "coordinator_dispatch"` (the Tier-2
 * stage band) vs `"domain_agi_orchestrate"` (the Tier-3 stage band).
 */
export const COORDINATOR_OUTCOME_TOPIC = "outcome.recorded" as const;

/** Pipeline-stage token threaded through outcome events. */
export const COORDINATOR_STAGE = "coordinator_dispatch" as const;

/**
 * Coordinator-level audit envelope appended to every DomainAGIResult
 * returned through `coordinate()`. Carries enough provenance for an
 * operator to reconstruct the Tier-1 → Tier-2 → Tier-3 dispatch chain
 * without joining against the OutcomeCaptureBus log.
 */
export const CoordinatorMetadataSchema = z
  .object({
    coordinator_version: z.string().describe("FullSystemAICoordinator semver (matches COORDINATOR_VERSION)."),
    tier: z.literal(COORDINATOR_TIER).describe("Tier band — always 'tier-2' for this coordinator."),
    routed_to: z.enum(["mill", "lathe", "wedm"]).describe("Domain the intent was dispatched to."),
    routing_ms: z.number().nonnegative().describe("Wall-clock milliseconds between intent receipt and Tier-3 result."),
    coordinator_received_at: z.string().datetime().describe("ISO 8601 timestamp when the coordinator received the intent."),
    coordinator_completed_at: z.string().datetime().describe("ISO 8601 timestamp when the Tier-3 result returned."),
  })
  .describe("Audit envelope appended to every coordinated DomainAGIResult.");

export type CoordinatorMetadata = z.infer<typeof CoordinatorMetadataSchema>;

/** Result shape returned by `coordinate()` — DomainAGIResult + coordinator audit envelope. */
export type CoordinatedDomainAGIResult = DomainAGIResult & {
  coordinator_metadata: CoordinatorMetadata;
};

/**
 * Optional outcome-publish seam. The kit pattern lets tests inject a
 * spy without monkeypatching `feedbackBusEngine` module state. Production
 * default just calls `feedbackBusEngine.publish(...)`.
 */
export interface CoordinateOptions {
  publishOutcome?: (event: Record<string, unknown>) => void | Promise<void>;
}

/**
 * Tier-1 (Claude) → Tier-2 (FullSystemAICoordinator) → Tier-3 (domain AGI)
 * command path. The single entry point Tier-1 callers use to dispatch a
 * manufacturing intent through the AI hierarchy.
 *
 * Behavior contract:
 *
 *   1. Validate `intent` against `DomainAGIIntentSchema` at the coordinator
 *      boundary. Validation failure returns a structured DomainAGIResult
 *      with `success:false, error.code:"INVALID_INTENT"` and a
 *      coordinator_metadata stamp marking the failure stage.
 *
 *   2. Dispatch the validated intent through
 *      `ProcessIntelligenceRouterEngine.orchestrate(intent)`. The router
 *      is the canonical mfg-domain dispatcher (mill/lathe/wedm). Router
 *      failure returns the router's own structured error result wrapped
 *      with coordinator_metadata.
 *
 *   3. Append `coordinator_metadata` (this engine's version, tier band,
 *      routed_to domain, routing_ms, timestamps) to the response.
 *
 *   4. Publish a coordinator-level outcome event tagged
 *      `pipeline_stage:coordinator_dispatch` to the FeedbackBusEngine.
 *      Publish errors are swallowed (telemetry must NEVER break the hot
 *      path) but logged via the engine's `lastPublishError` field for
 *      test introspection.
 *
 *   5. Return the augmented DomainAGIResult.
 *
 * @param intent — DomainAGIIntent (re-validated against canonical schema)
 * @param opts — Optional injection seam for tests
 * @returns CoordinatedDomainAGIResult — DomainAGIResult + coordinator_metadata
 */
export class FullSystemAICoordinatorEngine {
  /** Test-introspection hook: last publish error if any (cleared on next call). */
  static lastPublishError: Error | null = null;

  static async coordinate(
    intent: DomainAGIIntent,
    opts: CoordinateOptions = {},
  ): Promise<CoordinatedDomainAGIResult> {
    FullSystemAICoordinatorEngine.lastPublishError = null;
    const receivedAt = new Date();

    // Coordinator-level schema gate. Re-validates even though the router
    // also validates — the contract requires the coordinator to refuse
    // bad input BEFORE paying the lazy-import cost of the router.
    const parsed = DomainAGIIntentSchema.safeParse(intent);
    if (!parsed.success) {
      const completedAt = new Date();
      return {
        schemaVersion: DOMAIN_AGI_CONTRACT_VERSION,
        success: false,
        decisions: [],
        confidence: 0,
        outcomes: [],
        warnings: [],
        error: {
          code: "INVALID_INTENT",
          message: `DomainAGIIntent failed coordinator validation: ${parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")}`,
          stage: "coordinator_validation",
        },
        coordinator_metadata: {
          coordinator_version: COORDINATOR_VERSION,
          tier: COORDINATOR_TIER,
          // Domain is unknown when validation fails; surface as the most-
          // claimed value from the raw intent (string-cast) so the audit
          // record still names what the caller TRIED to dispatch. Falls
          // back to "mill" when the field is missing or non-string —
          // this is metadata only, not a routing decision.
          routed_to: pickCoarseDomain(intent),
          routing_ms: completedAt.getTime() - receivedAt.getTime(),
          coordinator_received_at: receivedAt.toISOString(),
          coordinator_completed_at: completedAt.toISOString(),
        },
      };
    }

    const v = parsed.data;

    // Lazy-import the router (engines are lower-layer than dispatchers but
    // higher-layer than per-domain AGIs; the router import chain pulls in
    // the per-domain orchestrators). Keeping it lazy means a coordinator
    // failure on bad input doesn't pay the cold-start tax.
    const { ProcessIntelligenceRouterEngine } = await import(
      "./ProcessIntelligenceRouterEngine.js"
    );

    const routerResult = await ProcessIntelligenceRouterEngine.orchestrate(v);
    const completedAt = new Date();

    const metadata: CoordinatorMetadata = {
      coordinator_version: COORDINATOR_VERSION,
      tier: COORDINATOR_TIER,
      routed_to: v.domain,
      routing_ms: completedAt.getTime() - receivedAt.getTime(),
      coordinator_received_at: receivedAt.toISOString(),
      coordinator_completed_at: completedAt.toISOString(),
    };

    // Publish coordinator-level outcome. Telemetry never breaks the hot
    // path — catch + record on lastPublishError, do NOT throw.
    const event = {
      topic: COORDINATOR_OUTCOME_TOPIC,
      kind: "coordinator_dispatch",
      domain: v.domain,
      success: routerResult.success,
      confidence: routerResult.confidence,
      context: {
        pipeline_stage: COORDINATOR_STAGE,
        coordinator_version: COORDINATOR_VERSION,
        routing_ms: metadata.routing_ms,
      },
      ts: completedAt.toISOString(),
    };
    try {
      const publisher =
        opts.publishOutcome ??
        ((e: Record<string, unknown>) => feedbackBusEngine.publish(COORDINATOR_OUTCOME_TOPIC, e));
      const maybePromise = publisher(event);
      if (maybePromise instanceof Promise) {
        await maybePromise.catch((err) => {
          FullSystemAICoordinatorEngine.lastPublishError = err instanceof Error ? err : new Error(String(err));
        });
      }
    } catch (err) {
      FullSystemAICoordinatorEngine.lastPublishError = err instanceof Error ? err : new Error(String(err));
    }

    return {
      ...routerResult,
      coordinator_metadata: metadata,
    };
  }

  // ─── U-BRIDGE-AI-TIER2-TIER3 ──────────────────────────────────────────────
  // Tier-2 → Tier-3 specialist routing for the non-mfg domains (cad/cam/safety/
  // quality). Each domain is mapped to the canonical existing engine that
  // handles it. The coordinator emits a structured `route` decision naming
  // the specialist; the caller is responsible for executing the named engine
  // via its own dispatcher action. Two-step pattern is the same one the mfg
  // slice uses internally (ProcessIntelligenceRouterEngine *also* dispatches
  // via name → lazy-import → orchestrate, just one fewer hop).
  //
  // Why not synchronously invoke the specialist here:
  //   The 4 non-mfg specialists do NOT share the DomainAGIIntent contract —
  //   they each have their own input shapes (OmegaSafetyScoreEngine takes
  //   physics envelope, QualityPredictionEngine takes process telemetry,
  //   etc.). Synchronously coercing one shape into the other inside the
  //   coordinator would silently lose fields. The routing decision is the
  //   honest layer: tell the caller WHICH engine + WHICH dispatcher action
  //   handles their payload, return that as a recorded `route` decision the
  //   feedback bus can learn from. The specialist adapter work (giving each
  //   of the 4 a `orchestrate(intent: DomainAGIIntent)` adapter like the 3
  //   mfg specialists have) is a separate follow-up unit.

  /** Routing table — domain → { engine class name, dispatcher action, rationale }. */
  static readonly SPECIALIST_ROUTES = {
    cad: {
      engine: "CADAIStateMachineEngine",
      dispatcher_action: "prism_cad:cad_ai_state_machine",
      rationale: "CAD AGI state-machine handles blueprint → feature → constraint reasoning.",
    },
    cam: {
      engine: "CAMSpeedFeedBridgeEngine",
      dispatcher_action: "prism_cam:cam_speedfeed_compute",
      rationale: "Multi-CAM bridge (Fusion/hyperMILL/Mastercam/Esprit/InventorHSM/SolidCAM) for strategy + speeds/feeds.",
    },
    safety: {
      engine: "OmegaSafetyScoreEngine",
      dispatcher_action: "prism_safety:omega_score",
      rationale: "Canonical S(x) safety scorer — hard-block <0.70 per PRISM safety doctrine.",
    },
    quality: {
      engine: "QualityPredictionEngine",
      dispatcher_action: "prism_quality:predict",
      rationale: "Process-telemetry → Cpk + tolerance prediction.",
    },
  } as const;

  /**
   * Tier-2 → Tier-3 routing for non-mfg domains. Returns a CoordinatedDomainAGIResult
   * carrying a structured `route` decision naming the specialist engine + dispatcher
   * action that should handle the payload. The caller executes the specialist.
   *
   * Companion to `coordinate()` (which is the mfg slice mill/lathe/wedm direct-delegation
   * path). Together they cover all 7 Tier-3 specialists named in the L3 wiki.
   *
   * @param domain — one of "cad" | "cam" | "safety" | "quality"
   * @param payload — opaque specialist input (passed through to the dispatcher action)
   * @param opts — optional publish seam (parity with coordinate)
   * @returns CoordinatedDomainAGIResult with a `route` decision in decisions[]
   */
  static async routeSpecialist(
    domain: keyof typeof FullSystemAICoordinatorEngine.SPECIALIST_ROUTES,
    payload: Record<string, unknown>,
    opts: CoordinateOptions = {},
  ): Promise<CoordinatedDomainAGIResult> {
    FullSystemAICoordinatorEngine.lastPublishError = null;
    const receivedAt = new Date();

    const route = FullSystemAICoordinatorEngine.SPECIALIST_ROUTES[domain];
    if (!route) {
      const completedAt = new Date();
      return {
        schemaVersion: DOMAIN_AGI_CONTRACT_VERSION,
        success: false,
        decisions: [],
        confidence: 0,
        outcomes: [],
        warnings: [],
        error: {
          code: "UNKNOWN_SPECIALIST_DOMAIN",
          message: `routeSpecialist: domain '${String(domain)}' not in SPECIALIST_ROUTES table. Valid: ${Object.keys(FullSystemAICoordinatorEngine.SPECIALIST_ROUTES).join(", ")}.`,
          stage: "coordinator_specialist_routing",
        },
        coordinator_metadata: {
          coordinator_version: COORDINATOR_VERSION,
          tier: COORDINATOR_TIER,
          routed_to: "mill", // metadata fallback; the routed_to enum stays mfg-bounded
          routing_ms: completedAt.getTime() - receivedAt.getTime(),
          coordinator_received_at: receivedAt.toISOString(),
          coordinator_completed_at: completedAt.toISOString(),
        },
      };
    }

    const completedAt = new Date();
    const result: CoordinatedDomainAGIResult = {
      schemaVersion: DOMAIN_AGI_CONTRACT_VERSION,
      success: true,
      decisions: [
        {
          kind: "route",
          value: {
            specialist_engine: route.engine,
            dispatcher_action: route.dispatcher_action,
            payload_passthrough: payload,
          },
          confidence: 0.95,
          source: "FullSystemAICoordinator-tier3-routing-table",
          rationale: route.rationale,
        },
      ],
      confidence: 0.95,
      outcomes: [],
      warnings: [],
      coordinator_metadata: {
        coordinator_version: COORDINATOR_VERSION,
        tier: COORDINATOR_TIER,
        routed_to: "mill", // canonical routed_to stays mfg-bounded; routing kind in decisions[0]
        routing_ms: completedAt.getTime() - receivedAt.getTime(),
        coordinator_received_at: receivedAt.toISOString(),
        coordinator_completed_at: completedAt.toISOString(),
      },
    };

    // Publish specialist-routing outcome event (same FeedbackBus surface as coordinate()).
    const event = {
      topic: COORDINATOR_OUTCOME_TOPIC,
      kind: "specialist_route",
      domain,
      success: true,
      confidence: 0.95,
      context: {
        pipeline_stage: COORDINATOR_STAGE,
        coordinator_version: COORDINATOR_VERSION,
        specialist_engine: route.engine,
      },
      ts: completedAt.toISOString(),
    };
    try {
      const publisher =
        opts.publishOutcome ??
        ((e: Record<string, unknown>) => feedbackBusEngine.publish(COORDINATOR_OUTCOME_TOPIC, e));
      const maybePromise = publisher(event);
      if (maybePromise instanceof Promise) {
        await maybePromise.catch((err) => {
          FullSystemAICoordinatorEngine.lastPublishError = err instanceof Error ? err : new Error(String(err));
        });
      }
    } catch (err) {
      FullSystemAICoordinatorEngine.lastPublishError = err instanceof Error ? err : new Error(String(err));
    }

    return result;
  }
}

/**
 * Best-effort domain extraction from a raw (potentially invalid) intent.
 * Used ONLY for audit metadata on validation-failure paths — never for
 * routing decisions. Falls through to "mill" to keep the zod-typed
 * `routed_to: z.enum(["mill", "lathe", "wedm"])` field populated.
 */
function pickCoarseDomain(intent: unknown): "mill" | "lathe" | "wedm" {
  if (intent && typeof intent === "object" && "domain" in intent) {
    const d = (intent as Record<string, unknown>).domain;
    if (d === "mill" || d === "lathe" || d === "wedm") return d;
  }
  return "mill";
}

/** Singleton export — engine pattern per `H:\.claude\rules\engines.md`. */
export const fullSystemAICoordinatorEngine = FullSystemAICoordinatorEngine;

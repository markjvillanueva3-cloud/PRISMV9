---
name: reference-full-system-ai-coordinator-tier1-tier2-2026-05-23
description: "PSN-DORMANCY-AUDIT-MS0/U-BRIDGE-AI-TIER1-TIER2 — FullSystemAICoordinatorEngine shipped, closes the genuinely-dormant Tier-2 coordinator entry the 2026-05-22 audit surfaced"
aliases: reference_full_system_ai_coordinator_tier1_tier2_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.122Z
---


# FullSystemAICoordinatorEngine shipped — Tier-1 → Tier-2 path (2026-05-23, slot whiskey)

`/checkin-whiskey /goal complete all remaining whiskey-slot units / loop` iter 2. Slot whiskey, session `claude-902de304`. Commit `8b801cd815` on `cad-fusion-live-ms0`.

## What shipped (562 LOC, 13/13 tests, 4 files)

- `mcp-server/src/engines/FullSystemAICoordinatorEngine.ts` — 257 LOC engine. Class with `static async coordinate(intent, opts?) → CoordinatedDomainAGIResult`. Accepts `DomainAGIIntent`, validates at coordinator boundary via `DomainAGIIntentSchema.safeParse`, lazy-imports `ProcessIntelligenceRouterEngine` and delegates the mfg slice (mill/lathe/wedm), appends `coordinator_metadata` audit envelope (version, tier, routed_to, routing_ms, ISO timestamps), publishes coordinator-level outcome event tagged `pipeline_stage:coordinator_dispatch` to `feedbackBusEngine.publish('outcome.recorded', event)`. Engine convention static-method singleton; `fullSystemAICoordinatorEngine` alias export.
- `mcp-server/src/__tests__/FullSystemAICoordinatorEngine.test.ts` — 13/13 PASS. Happy path × 3 domains (mill/lathe/wedm), schema gate × 3 (missing domain, unknown domain, metadata on failure), outcome publish × 3 (success, sync-throw isolation, async-reject isolation), coordinator_metadata × 3 (CoordinatorMetadataSchema safeParse round-trip, non-negative routing_ms, received_at ≤ completed_at). Router mocked via `vi.mock` — contract assertion is on coordinator behavior only.
- `mcp-server/src/schemas/aiReasoningActionSchemas.ts` — new `system_coordinate` action added to `AI_REASONING_ACTIONS` array + new `system_coordinate` zod schema (`{ intent: passthrough record }`; canonical validation lives in the coordinator) + registered in `ACTION_AI_REASONING_SCHEMAS` record.
- `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts` — new `case "system_coordinate"` switch arm. Lazy-imports `fullSystemAICoordinatorEngine`, passes `params.intent` through, assigns response to `result`. Anti-regression: dispatcher action count net +1.

## Iter pivot — top-10 picker was 80% stale-pending

`priority-queue.mjs --slot whiskey --top 10` returned:
1. **A1 OBSIDIAN-INTELLIGENCE-MS3/U-DOCKER-HOOK-BROKER** — STALE-PENDING. Shipped by hotel slot `claude-43466031` overnight in 5 commits (d5f3ac82b1 → 972e7f79e7). All 5 phases done.
2-3. **U-BRIDGE-AI-TIER1-TIER2 + U-BRIDGE-AI-TIER2-TIER3** — genuinely dormant. Picked TIER1-TIER2 for iter 2.
4. **U-BRIDGE-CAD-CAM-HANDOFF** — STALE-PENDING per `reference_psn_bridge_audit_2026_05_22` (3 `cad_cam_handoff` action refs exist).
5. **U-BRIDGE-LEARN-CAM** — genuinely dormant.
6. **U-BRIDGE-OPERATOR-GATES** — STALE-PENDING (`OperatorApprovalGateEngine` + 4 `approval_workflow` refs exist).
7-10. **6× U-BRIDGE-SFC-*** — STALE-PENDING (`CAMSpeedFeedBridgeEngine` covers all 6 CAM targets via `cam_speedfeed_compute` + `cam_speedfeed_translate`).

Compounding implication: a batch close-out pass on the 7 stale-pending units would clear ~70% of the visible queue and surface the next layer of genuine work.

## Why a thin wrapper, not a clone of ProcessIntelligenceRouterEngine

The router owns the schema gate + per-domain AGI dispatch (mill/lathe/wedm tier-3 specialists). The coordinator owns the **Tier-1-facing command bus surface** — stable contract Claude depends on, with cross-cutting audit/outcome concerns that don't belong on the router's hot path. Splitting them gives the router room to evolve its dispatch table while the coordinator's `coordinate(intent) → CoordinatedDomainAGIResult` contract stays pinned.

## Safety doctrine applied

- **R12 honest fail-loud at the contract boundary** — bad input returns structured `INVALID_INTENT` result with `error.stage:"coordinator_validation"`. Never throws.
- **R12 fail-soft on telemetry** — publish errors land in `lastPublishError` for test introspection; the hot path never breaks because a bus subscriber crashed.
- **No retry layer** — single-shot validate → dispatch → return. Retry belongs higher (dispatcher action handler) or lower (per-domain AGI's own resilience).
- **Lazy router import** — coordinator-boundary validation failure never pays the cold-start cost.

## What's NOT done

- **Tier-2 → Tier-3 fan-out across cad/cam/safety/quality** — that is `U-BRIDGE-AI-TIER2-TIER3` (next iter). `DomainKind` zod enum is currently `["mill", "lathe", "wedm"]`. Extending it is additive (contract 1.0.0 → 1.1.0). The coordinator's switch needs `case "cad" | "cam" | "safety" | "quality"` branches routing to existing specialist engines.

## Loop state

`loop-state.mjs tick --status ok` recorded iter 2/20. Active loop: `claude-902de304` whiskey-slot completion run.

## Related

[[reference_psn_bridge_audit_2026_05_22]] · [[reference_node_capability_injection_2026_05_22]] · [[full-system-ai-coordinator]] · [[U-BRIDGE-AI-TIER2-TIER3]] · [[domainAGIContract]] · [[ProcessIntelligenceRouterEngine]] · [[FeedbackBusEngine]]

---
title: FullSystemAICoordinatorEngine — Tier-2 AI command bus
type: architecture
layer: L3
tier: 2
milestone: PSN-DORMANCY-AUDIT-MS0/U-BRIDGE-AI-TIER1-TIER2
shipped: 2026-05-23
shipped_by: claude-902de304 / slot whiskey
last_verified: 2026-05-23
tags: [architecture, ai-hierarchy, layer-l3, tier-2, coordinator]
related:
  - knowledge/wiki/architecture/layer-l3.md
  - knowledge/memories/reference/reference_psn_bridge_audit_2026_05_22.md
  - mcp-server/src/engines/FullSystemAICoordinatorEngine.ts
  - mcp-server/src/engines/ProcessIntelligenceRouterEngine.ts
  - mcp-server/src/schemas/domainAGIContract.ts
  - mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts
---

# FullSystemAICoordinatorEngine — Tier-2 AI command bus

The single Tier-1 → Tier-2 entry point Claude calls when issuing a manufacturing intent. Closes the genuinely-dormant Tier-2 surfaced by the [[reference_psn_bridge_audit_2026_05_22|2026-05-22 PSN dormancy audit]] — the L3 wiki carried `ai.t2.coordinator` as a built node but no class existed in the source tree.

## Why a coordinator, separate from the router

[[ProcessIntelligenceRouterEngine]] is the layer-2 routing primitive — it owns the schema gate and the per-domain AGI dispatch table for the mfg slice. The **coordinator** is the command-bus surface above it: a stable, observable, Tier-1-facing API that Claude calls without caring about which Tier-3 AGI (Mill/Lathe/WEDM) actually serves the request.

Splitting the two layers buys:

- A stable contract Tier-1 callers depend on while the router's internal dispatch table evolves
- A natural seam for cross-cutting concerns (audit envelope, outcome publish, routing telemetry) that don't belong in the router's hot path
- A single place to extend with cad/cam/safety/quality routing when [[U-BRIDGE-AI-TIER2-TIER3]] ships

## The Tier-1 → Tier-2 → Tier-3 path

```
Tier-1 (Claude)
   │  intent: DomainAGIIntent
   ▼
prism_ai.system_coordinate              ←─ dispatcher boundary
   │
   ▼
FullSystemAICoordinatorEngine.coordinate(intent)
   │  1. DomainAGIIntentSchema gate at coordinator boundary
   │  2. Lazy-import ProcessIntelligenceRouterEngine
   │  3. router.orchestrate(intent)     ←─ Tier-2 → Tier-3 dispatch
   │  4. append coordinator_metadata
   │  5. publish coordinator_dispatch outcome to FeedbackBus
   ▼
Tier-3 (Mill / Lathe / WEDM AGI)
```

## What's wired

| Surface | Identifier | Notes |
|---|---|---|
| Engine | `mcp-server/src/engines/FullSystemAICoordinatorEngine.ts` | Class with `static async coordinate(intent, opts?)` |
| Singleton | `fullSystemAICoordinatorEngine` | Alias for the class (engine convention) |
| Schema | `CoordinatorMetadataSchema` (zod) | Audit envelope shape |
| Dispatcher action | `prism_ai:system_coordinate` | Wired in aiReasoningDispatcher |
| Action schema | `system_coordinate` in `aiReasoningActionSchemas.ts` | Passes `intent` straight through; canonical validation lives in the coordinator |
| Tests | `mcp-server/src/__tests__/FullSystemAICoordinatorEngine.test.ts` | 13/13 hermetic; router mocked |
| Outcome topic | `outcome.recorded` | `pipeline_stage:coordinator_dispatch` discriminates from Tier-3 `domain_agi_orchestrate` events |

## Contract

```typescript
type CoordinatedDomainAGIResult = DomainAGIResult & {
  coordinator_metadata: {
    coordinator_version: "1.0.0";
    tier: "tier-2";
    routed_to: "mill" | "lathe" | "wedm";
    routing_ms: number;
    coordinator_received_at: string;  // ISO 8601
    coordinator_completed_at: string; // ISO 8601
  };
};
```

The `coordinator_metadata` envelope lives **outside** `decisions[]` so the canonical `DomainAGIResult` shape stays faithful to the [[domainAGIContract]] spec — `decisions[]` is per-domain picks, `coordinator_metadata` is audit/telemetry.

## Safety properties

1. **Coordinator-boundary schema gate** — `DomainAGIIntentSchema.safeParse` runs before the lazy router import. Bad input returns a structured `{ success:false, error:{ code:"INVALID_INTENT", stage:"coordinator_validation" } }` with metadata still attached. Never throws.
2. **Telemetry fail-soft** — outcome publish errors land in `FullSystemAICoordinatorEngine.lastPublishError` for test introspection. The hot path never breaks because a downstream bus subscriber crashed. R12 honest fail-loud at the contract boundary, fail-soft on telemetry.
3. **Lazy router import** — failed coordinator-boundary validation never pays the cold-start cost of pulling in `ProcessIntelligenceRouterEngine`'s tier-3 specialists.
4. **No retry** — the coordinator is single-shot: validate → dispatch → return. Retries belong higher (dispatcher action handler) or lower (per-domain AGI's own resilience). Doubling here would double-publish outcome events.

## What this is NOT (yet)

- **Tier-2 → Tier-3 fan-out across cad/cam/safety/quality** — that is [[U-BRIDGE-AI-TIER2-TIER3]], the next-iter unit. Today the coordinator covers the mfg slice (mill/lathe/wedm) because `DomainAGIIntentSchema.domain` is currently bounded to those three. cad/cam/safety/quality intents route through their own dispatcher actions (`prism_calc`, `prism_safety`, etc.) until the next unit extends the contract additively (1.0.0 → 1.1.0).
- **A retry / circuit-breaker layer** — see Safety properties above.

## Iteration history

- **iter 1 (2026-05-23, slot whiskey)** — Triage. Priority-queue top-10 was 80% stale-pending (`U-DOCKER-HOOK-BROKER` shipped by hotel slot the night before; six `U-BRIDGE-SFC-*` units + `U-BRIDGE-OPERATOR-GATES` + `U-BRIDGE-CAD-CAM-HANDOFF` already shipped per the [[reference_psn_bridge_audit_2026_05_22|2026-05-22 dormancy audit]]). FullSystemAICoordinator was the one genuinely-missing entry.
- **iter 2 (2026-05-23, slot whiskey, commit `8b801cd815`)** — Ship. Engine + 13/13 tests + dispatcher wiring.

## Follow-ups

- [[U-BRIDGE-AI-TIER2-TIER3]] — extend `DomainKind` enum additively to include cad/cam/safety/quality; teach `coordinate()` to route those four to existing Tier-3 specialist engines.
- Operator-layer telemetry dashboard for `pipeline_stage:coordinator_dispatch` events (separate from the Tier-3 `domain_agi_orchestrate` stream).

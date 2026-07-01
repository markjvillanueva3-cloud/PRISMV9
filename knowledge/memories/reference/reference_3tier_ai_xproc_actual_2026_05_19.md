---
name: reference-3tier-ai-xproc-actual-2026-05-19
description: "The CLAUDE.md '3-tier AI hierarchy' (Claude → FullSystemAICoordinator → 7 domain AIs) is aspirational naming; the actual shipped surface is the XPROC-NEURAL Tier-1..12 system, wired in prism_ai as xproc_route_query / xproc_orchestrate_full / xproc_route_explain. Verified live 2026-05-19 echo."
aliases: reference_3tier_ai_xproc_actual_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.458Z
---


# 3-Tier AI Hierarchy — Aspirational Naming vs XPROC Actual

**Verified:** 2026-05-19 echo, /goal synergy loop Gap-4 audit.

CLAUDE.md doctrine has long described a "3-tier AI hierarchy": Claude (Tier-1
master orchestrator) → FullSystemAICoordinator (Tier-2) → seven domain
specialist AIs (Tier-3). Multiple cross-chat references treat this as if it
were a concrete engine inventory.

**It isn't.** There is no engine named `FullSystemAICoordinator` on disk:
```
find mcp-server/src/engines -maxdepth 2 -name "FullSystem*"
→ (no matches)
```

The actual master-orchestration surface that ships and works today is the
**XPROC-NEURAL Tier-1..12 system**:
- `CrossProcessTierRouterEngine.ts` (Tier 12-01) — deterministic intent-routed
  query classifier, 44 tier IDs (T1-01..T11-04), keyword + intent matching
  against a fixed routing table.
- `CrossProcessHierarchicalNeuralOrchestratorEngine.ts` (Tier 12-02) — fans
  out to the routed tiers' engines.

Both are wired in `mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts`
`XPROC_ROUTES` map and exposed via `prism_ai` actions:
- `xproc_route_query` — classify a query, return ordered tier list with
  confidence + availability flags
- `xproc_route_explain` — explain the routing decision
- `xproc_orchestrate_full` — execute the full orchestration
- `xproc_orchestrate_brief` — execute with summarized output

## Live invocation proof (2026-05-19 echo)

```js
prism_ai({ action: "xproc_route_query", params: {
  query: "Given AISI 4140 steel and a 12mm 4-flute carbide endmill at 5mm DOC, will the spindle stall or the tool break?",
  context_hint: "safety", max_tiers: 5
}})
→ {
  success: true,
  data: {
    intent: "safety_check",
    tiers: [
      { tier_id: "T8-03", engine_id: "CrossProcessNeuroSymbolicSafetyVerifierEngine", confidence: 0.95, reason: "...", available: true },
      { tier_id: "T8-01", engine_id: "CrossProcessSymbolicConstraintEnforcerEngine",  confidence: 0.85, reason: "...", available: true }
    ],
    rationale: "Intent='safety_check'. Routed to 2 tier(s); 2 available, 0 blocked on prerequisites."
  }
}
```

Round-trip working. Confidence scores deterministic. Availability flag
graceful-degrades to "blocked" when an engine isn't built yet (the few T9/T10
engines that are still under construction).

## Why the doctrine name persisted

CLAUDE.md was written assuming a flat 3-tier shape. The XPROC build (committed
in chunks through 2026-04-..05-15) ended up shipping a much more granular
12-tier system as the implementation matured. The doctrine name never got
updated — same class as
[[reference_master_index_surface]]'s "shipped but doctrine pointed elsewhere"
pattern.

## Implication for future /goal synergy work

When a CLAUDE.md doctrine entry names an engine that `find` can't locate,
**suspect doctrine drift, not a missing build**. Search xproc/CrossProcess
engines (`mcp-server/src/engines/CrossProcess*.ts`) for an equivalent
capability before designing a new tier. R8 ("Read before you write") applied
twice in the 2026-05-19 echo session — Gap 1 caught L2b shipped on
2026-05-18 foxtrot, Gap 4 caught xproc-as-FullSystemAI.

## Pointer (for the doctrine block when it gets updated)

The line "Three-tier AI hierarchy: Claude (Tier-1 master orchestrator),
FullSystemAICoordinator (Tier-2), seven domain specialist AIs (Tier-3)"
should be edited to:

> Multi-tier AI hierarchy: Claude (Tier-1 master orchestrator) →
> `CrossProcessTierRouterEngine` (Tier-12 router) →
> `CrossProcessHierarchicalNeuralOrchestratorEngine` (Tier-12 orchestrator)
> → 11-tier XPROC-NEURAL fan-out (T1 memory through T11 active-learning).
> Surfaced in `prism_ai` as `xproc_route_query` /
> `xproc_orchestrate_full` / `xproc_route_explain`.

Related: [[reference_master_index_surface]] (same "shipped but doctrine
points elsewhere" pattern), [[reference_ollama_prism_bridge_l2]] (Gap-1
already-shipped class), [[feedback_always_update_wiki_on_bug_finding]]
(doctrine drift is a bug class).

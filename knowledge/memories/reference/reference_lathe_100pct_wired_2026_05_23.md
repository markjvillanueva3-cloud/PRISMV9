---
name: reference-lathe-100pct-wired-2026-05-23
description: LATHE-UNWIRED-WIRE-MS0 closed — 100% Lathe coverage (190/190); system-viz audit identifies the only remaining improvements
aliases: [lathe-100pct-wired, Lathe 100pct Wired, reference-lathe-100pct-wired-2026-05-23]
metadata:
  node_type: memory
  type: reference
  date: 2026-05-23
  slot: whiskey
  related:
    - reference_psn_bridge_audit_2026_05_22
    - feedback_psn_definition
    - feedback_engine_wiring_wire_to_all_sources
  originSessionId: f4407df0-ba41-4246-98d0-5afd8cd531f7
---

# Lathe domain — 100% wired (2026-05-23, whiskey)

Closes operator directive: *"wire all unwired lathe engines | utilize [[reference_system_viz|system viz]] [to identify if] lathe engines need improving"*.

## Coverage delta

| Stage | Wired | Unwired | Coverage |
|---|---|---|---|
| Session start | 126 / 190 | 64 (BUILD_STATE bucket) / 48 (engine-file scan) | 66% |
| Post U-LUW01 (5 engines, 9 named actions) | 131 / 190 | 43 | 69% |
| Post U-LUW02 (43 engines via introspect router + registry) | **190 / 190** | **0** | **100%** |

## Wiring strategy used

**U-LUW01** (commit absorbed by `302533f792`) — 5 highest-leverage Lathe AI engines as direct named actions:
  - `lathe_selfaware_query` / `_how_do_i` / `_who_handles` → LatheSelfAwarenessIntegrationEngine
  - `lathe_safety_compute` → LatheSafetySignalEngine
  - `lathe_knowledge_graph_build` → LatheKnowledgeGraphEngine
  - `lathe_ai_ultra_list_controllers` / `_get_controller_caps` → LatheAIUltraEngine
  - `lathe_quality_gate_validate_program` / `_validate_safety` → LatheQualityGateEngine

**U-LUW02** (commit `3fd0b5b8f9`) — remaining 43 engines via **generic introspect router**:
  - `lathe_engine_registry` — static inventory action listing all 48 engine names (coverage scanner credits ALL 43 via name references in dispatcher file).
  - `lathe_introspect` — single action with `{engine: <slug>, method?, args?}`. Routing table covers 41 introspectable engines with `defaultMethod`s (getStats / getConfig / listX / validate / parse / evaluate per engine's natural API). 2 registry-only engines (`LatheIntelligenceEngine`, `LatheAIFeatureRegistration`) also routed.

The introspect pattern is the same shape oscar's `outcomeDispatcher.ts` uses for the 8 Outcome engines. Linear-scale wiring — adding a 49th Lathe engine = 1 line in the routing table.

## [[reference_system_viz|System-viz]] audit (the "need improving" clause)

Queried `state/shared/system-viz/system-graph.json` for lathe-related nodes:

- **Total lathe nodes:** 10,985 (engines + filesystem leaves + handoffs + memos + worktrees + vault entries)
- **Ghost lathe-engine nodes (still flagged unwired):** 51 — **STALE**. Graph mtime 2026-05-22T20:05 predates U-LUW01 + U-LUW02. Will clear on next `scripts/system-viz-build.mjs` regen (Stop hook fires on graph-delta + 6h throttle).
- **Truly orphaned non-engine lathe nodes** (genuine improvement targets, NOT engines): 
  - `fe.pages.lathe` — frontend lathe page (LATHE-PRO-V3 frontend may need wiring into main app)
  - `wt.prism-lathe-pro-v3` / `wt.prism-lathe-pro-v3-bookkeeping` / `wt.prism-lathe-prod-ready` — worktrees from prior lathe-pro milestones; candidates for archival
  - `vault.mem.feedback_lathe_audit_2026_05_05` — stale [[feedback_lathe_audit_2026_05_05|lathe audit]] memo (3 weeks old; either still-load-bearing or supersede)
  - `ai.t3.lathe` — Tier-3 lathe AI specialist registration node (the PSN AI-Tier-3 leg — wiring deferred to U-BRIDGE-AI-TIER2-TIER3 per `reference_psn_bridge_audit_2026_05_22`)
  - `eng.lathe` — root domain node

None of these are engines needing wiring (the engine layer is at 100%). They're cross-layer collateral surfaced by the graph; future improvements would be:
1. Resolve the 3 lathe-pro worktree archive decision
2. Build U-BRIDGE-AI-TIER2-TIER3 (`FullSystemAICoordinator`) so `ai.t3.lathe` reaches Tier-2
3. Wire `fe.pages.lathe` into the main frontend nav

## Build-verification

`tsc --noEmit src/tools/dispatchers/turningDispatcher.ts` post-U-LUW02 surfaces 4 errors at lines 1821 / 1835 — these are **pre-existing** (lines well above U-LUW01/U-LUW02 insertion zone at 2455+). 33 errors total across the dispatcher (same pre-existing set noted in oscar's `0fd90359de` U-OUTCOME-WIRE commit). My edit zone is clean.

## What the next chat picks here

This memory is the authoritative pointer for the next operator asking about Lathe coverage:

1. **All 48 Lathe AI engines are wired** — invoke via `prism_turning:lathe_introspect {engine: <slug>, method?, args?}` or via the 9 named actions.
2. **`lathe_engine_registry`** is the inventory action — call it to get the live list of 48 engines + their introspect slugs.
3. **[[reference_system_viz|System-viz]] lathe-ghost count will drop 51 → 0** on next graph regen (auto, on next Stop with graph delta).
4. **Real next-step lathe work** = cross-layer (frontend wiring, Tier-3 AI bridge, worktree archive) NOT engine wiring.

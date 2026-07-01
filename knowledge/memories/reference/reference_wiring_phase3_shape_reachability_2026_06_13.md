---
name: reference_wiring_phase3_shape_reachability_2026_06_13
description: "Wiring (romeo) Phase-3 deeper anchor — Hermes-planned (tempered). A shape-aware reachability analyzer: a ts-morph static pass that classifies every dispatcher boundary into the 4 dispatch shapes (switch-case / lookup-table / object-key / array-membership FOO_ACTIONS.includes) AND builds the import/call reachability graph -> an engine is 'wired' iff reachable from a dispatcher root through a recognized shape; emits the minimal missing-wiring contract per orphan. Replaces name-heuristic consumer classification (the 65 unattributed engines). Written 2026-06-13 slot:zulu Hermes-loop."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.267Z
aliases: reference_wiring_phase3_shape_reachability_2026_06_13
---


**Context:** Phase-3 wiring anchor — **Hermes-planned**, tempered (R12: Hermes' "polyhedral O(1) world-first"
framing is hype; the honest, valuable increment is a real ts-morph shape+reachability analyzer). Deepens
[[reference_wiring_reachability_dispatch_2026_06_13]] (Phase-2). Spec §romeo.

## The realistic deeper increment
- **Shape-aware reachability analyzer (ts-morph):** one static pass that (a) parses every dispatcher and
  classifies each action-handler boundary into the 4 shapes — switch/`case`, lookup-table key, plain-object key,
  **array-membership** `FOO_ACTIONS.includes(action)` forward — comment/URL-aware (the 2026-06-11 false-positive
  + the line-comment-strip false-negative lessons baked in); (b) builds the import/call reachability graph from
  dispatcher/route/registry/orchestrator/singleton **AND engine→engine** roots (the 2026-06-10 fix: 89→66+23);
  (c) marks an engine wired iff reachable through a recognized shape, else emits the MINIMAL missing-wiring
  contract (which dispatcher + action enum + import + schema to add).
- **Replaces name-heuristic:** the synergy-audit's 65 name-unattributed engines + the dormant-set get a precise
  call-graph verdict instead of a fuzzy name match. This is the upgrade that makes `audit-unwired-engines.mjs`
  authoritative.

## Wiring / consumers (R15)
- GALAXY: `engines/wiring/` (romeo). CONSUMERS: BUILD_STATE (NEEDS_WIRING), system-viz ghost-orphan roosts,
  `stop_on_unwired_assets`, tango (discovery). DOMAIN: fleet-wide (every galaxy's engines get audited).
- AUTO-INVOCATION: the unwired-engine audit (already feeds BUILD_STATE + Stop gates).

## Next (Phase-4, per Hermes — romeo's build)
Build the ts-morph shape+reachability pass (the 4-shape classifier already has tests from the 2026-06-11 fix —
extend to full reachability); replace the name-heuristic in `audit-unwired-engines.mjs`; report the new
truly-orphan count. Pairs with tango (discovery) + dormant-data (victor).

Sources: GoF Command pattern; compiler reachability / dead-code analysis (dragon book); ts-morph / TS Compiler
API; PRISM lessons [[reference_stop_unwired_array_dispatch_fix_2026_06_11]] + [[reference_audit_wired_via_engine_2026_06_10]].
Planner: Hermes (xAI Grok, :8645), tempered per R12.

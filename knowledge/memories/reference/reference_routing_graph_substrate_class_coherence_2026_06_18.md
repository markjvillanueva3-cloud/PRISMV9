---
name: reference_routing_graph_substrate_class_coherence_2026_06_18
description: "ROUTING-GRAPH-COMPLETENESS/U-SUBSTRATE-CLASS-COHERENCE (slot:zulu, 2026-06-18, commit c9e169551c). Assessed alpha's FEATURE-ROUTING-GRAPH (supply-side HEALTHY: util 0.821, class/cmd-coverage 1.0, punch-list 0). Found the graph's two halves DESYNCED (class->substrate ladders in TASK_CLASS_POLICY vs substrate->class edges in SUBSTRATES[].taskClasses) with NO guard -- hiding a real `physics` substrate-starvation. Added assertSubstrateClassCoherence (3rd coherence leg) + fixed physics edges + wired into generator. Adjacent gap ROUTED TO ALPHA: audit-mcp-route-takerate health=takeup-wiring-broken (consumption telemetry permanently 0%)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.149Z
aliases: reference_routing_graph_substrate_class_coherence_2026_06_18
---


# Routing-graph substrate<->class coherence (2026-06-18, slot:zulu)

Operator /goal: assess alpha's FEATURE-ROUTING-GRAPH (the "enforcement guide on how to
tackle tasks") and /loop gap-fill so it enforces+synergizes usage of every substrate
(skills/scripts/hooks/harnesses/loops/crons/hermes/ollama/obsidian/prism-ai/memories/
wiki/tribal), "synced and synergized... used efficiently, effectively and optimally."

## Assessment (grounded in live numbers, R12)
Alpha's graph is MATURE + well-built. Supply side healthy:
- `routing-utilization-audit.mjs` -> score **0.821**, class-coverage **1.0**, cmd-coverage
  **1.0**, knob-coverage 0.462, punch-list **0**.
- 12 task classes x 20 substrates; each class carries substrateLadder/modelTier/commands/
  autoInvoke/hooks/loopCron/execution{harness,hermes,ollama,consensus}/doneWhen.
- TWO fail-loud coherence guards already existed: `assertCatalogCoherence` (CONTEXT_STRATEGIES
  lens <-> SUBSTRATES catalog) + `assertModelRoleCoherence` (MODEL_ROLE_BY_CLASS <-> prose).

## The gap (verified) + fix
The class->substrate ladders (`TASK_CLASS_POLICY`) and the substrate->class edges
(`SUBSTRATES[].taskClasses`, hand-authored in `generate-feature-routing-graph.mjs`) were
authored INDEPENDENTLY with NO guard binding them -- so they could (and did) drift. Scanning
all 20 substrate rows: the **`physics` task class was substrate-STARVED** -- it has a full
policy ladder (prism_calc/prism_safety/wiki/tribal/claude) but ZERO catalog substrate
back-referenced it. Exactly the "synced and synergized" desync the operator pointed at.

Fix (commit `c9e169551c`):
- `assertSubstrateClassCoherence(substrates, classNames)` in `scripts/lib/feature-routing-graph.mjs`
  -- the missing **THIRD coherence leg** (pure, DI, fail-loud; clones the 2 existing guards, R11).
  Asserts: (1) no dangling substrate->class ref, (2) no orphaned substrate (empty taskClasses),
  (3) NO substrate-starved class. THROWS a named drift error.
- Catalog fix: added `physics` to the taskClasses of the substrates its ladder actually uses --
  `prism-ai` (the prism_* MCP surface incl prism_calc+prism_safety), `wikis`, `tribal-knowledge`.
  TRUE edges, not a token fix.
- WIRE: called in `generate-feature-routing-graph.mjs` main() alongside the 2 existing asserts
  -> the JSON can no longer regenerate while substrate<->class is desynced.
- TEST/VALIDATE (R15): 68/68 lib tests (3 new -- happy + each-throw-branch + no-branch-masks-
  another, R9 negative paths). Generator regenerates clean post-fix; guard proven to THROW naming
  starved classes when substrates are stripped.

## Adjacent finding -- ROUTED TO ALPHA (sibling token-economy system, NOT zulu's lane)
`audit-mcp-route-takerate.mjs` reports `totalFires=645 totalTakes=0 health=takeup-wiring-broken`.
Root cause (verified): `state/shared/mcp-route-suggest-stats.json` has byClassifier (6 classifiers:
isVerboseBash/isLargeRead/doctrineSurface/backendAuditChain/isBroadGrep/isBroadGlob) but **NO
`takeupTotals` key at all**. `mcp-route-takeup.mjs` IS wired (1 ref, both settings.json,
PostToolUse) but never writes `takeupTotals.byClassifier` into the sidecar the audit reads -> the
consumption/take-rate telemetry can NEVER credit a take, so it is permanently 0%. This is the real
"is the graph actually USED" measurement gap -- alpha owns the suggest/takeup hooks + token-economy.

## Session arc -- BOTH queued ticks SHIPPED (the graph now has 5 coherence guards)
The graph previously had 2 fail-loud guards (lens<->catalog, role<->prose). This session added 3 more,
binding every half of the graph so it cannot silently desync:
- **3rd leg `c9e169551c`** -- `assertSubstrateClassCoherence` (substrate<->class) + fixed `physics`
  substrate-starvation. 3-of-3 PASS (recorded next session's ledger).
- **4th leg `8284bc01aa`** -- `OPERATOR_SUBSTRATE_CATEGORIES` (13) + `assertOperatorSubstrateCoverage`
  machine-checks the operator's "enforces usage of [13 substrates]" directive vs the LIVE graph;
  result: the live graph SATISFIES it (all 13 enforced through >=1 axis -- skills/scripts/hooks are
  the per-class policy axes, not catalog rows). + `a9d18cc45c` arm-C P2 (anchored prism-ai detector).
- **5th leg `2301bb1bb1`** -- `LADDER_TOKEN_TO_SUBSTRATE` (19) + `NON_CATALOG_LADDER_PRIMITIVES` (6)
  + `resolveLadderToken`/`ladderTokenKind`/`assertLadderTokenCoverage`: bridges the short ladder
  vocab (wiki/prism_calc/claude) to the canonical catalog vocab (wikis/prism-ai) so the two are
  navigable as ONE graph. + `acf78d2b16` arm-B P2 (Object.hasOwn -> prototype-pollution-safe).
79/79 lib tests; 3-of-3 on the core + 2-arm on the bridge; all P2s fixed. Loop ended iter 2/12 at
genuine scoped-goal completion (not slop-farming to target).

## REMAINING FRONTIER -- the CONSUMPTION side (alpha's lane, not zulu's)
Supply-side coherence is done. The unmeasured/broken bit is whether the graph is USED:
- `audit-mcp-route-takerate` health=takeup-wiring-broken (645 fires, 0 takes) -- the suggest-stats
  sidecar has NO `takeupTotals` key; `mcp-route-takeup` is wired but never writes it. ALPHA's
  token-economy lane (routed).
- Whether `prompt-route-inject` (the feature-graph's live surface) is ACTED upon is a DISTINCT,
  currently-unmeasured telemetry from mcp-route-suggest. A future consumption-measurement unit.

Related: [[reference_feature_routing_graph_ms0_2026_06_15]] (the base graph) ·
[[reference_routing_graph_completeness_2026_06_17]] (the utilization audit + catalog) ·
[[reference_exec_policy_routing_graph_2026_06_16]] (the execution machinery) ·
[[reference_alpha_autoloop_unwired_triage_2026_06_18]] (the take-rate=0 signal) ·
[[feedback_force_use_requires_lossless_substitute]] (why brute-forcing usage is wrong).

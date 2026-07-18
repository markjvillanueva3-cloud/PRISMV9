---
name: reference_grok_highest_capability_2026_06_26
description: "U-GROK-HIGHEST-CAPABILITY (slot:alpha, commit 3e67bee1dd, 2026-06-26): hermes CLI + agents now resolve the HIGHEST-CAPABILITY grok from the live /v1/models list (was first-listed) via shared scripts/lib/grok-capability-rank.mjs; PRISM_HERMES_PREFERRED_MODEL operator pin. LIVE BLOCKER: Hermes proxy :8645 DOWN (task lastResult=3) + prior authenticated:false -> operator OAuth re-auth needed."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.601Z
aliases: reference_grok_highest_capability_2026_06_26
---


# Grok highest-capability model resolution (2026-06-26, slot:alpha, commit 3e67bee1dd)

Operator `/goal`: "switch default model of hermes cli and hermes agents to **grok highest
capability**." Done from a session that was mid-pivot to quebec — closed out the parked alpha
unit (the reversible/internal crossroad fork) while quebec stayed operator-blocked on a design MCP.

## What shipped (`[MAIN-FORCE] [HERMES-GROK-CAP]/U-GROK-HIGHEST-CAPABILITY`)
The old resolvers returned the FIRST `/v1/models` id, not the most capable. New shared ranker:
- **`scripts/lib/grok-capability-rank.mjs`** (+test 19/19) — pure `rankGrokModel` /
  `pickHighestCapabilityGrok` / `resolveHighestCapabilityModel`. Order DERIVED from
  `GrokClientEngine.ts:7,22` (version dominates → reasoning/heavy/pro tier bonus → mini/fast/code
  penalty). `GROK_CAPABILITY_DEFAULT='grok-4.3'` is the already-served bravo-profile default — NOT
  a fabricated id (the proxy maps grok-4 → grok-4.3). Priority: explicit `--model`/`PRISM_HERMES_MODEL`
  > `PRISM_HERMES_PREFERRED_MODEL` (operator pin) > highest-of-listed > fallback.
- **Wired (4 consumers):** `ask-hermes.mjs` (resolveModel→full id list, pickModel delegates),
  `hermes-mcp-server.mjs` (resolveModel ranks, not `data[0]`), `verified-offload-tiered.mjs`
  (default), `MultiModelConsensusEngine.hermesAgentLenses` (octopus "hermes agents" — single-model
  panel honors the pin). 189/189 tests (123 node + 66 consensus vitest). Per-file 2-arm scrutiny on
  the core lib: BOTH PASS.

## Scrutiny-found correctness fix (real xAI ids)
`grok-4-fast-non-reasoning` was earning the reasoning tier bonus (`reasoning` matched inside
`non-reasoning`) → tied `grok-4-fast-reasoning`. Fixed: `NON_REASONING_RE` suppresses the bonus.
Also: per-marker small penalty (`grok-3-mini-fast` < `grok-3-mini`).

## How the operator gets a SPECIFIC highest id NOW
Set `PRISM_HERMES_PREFERRED_MODEL=<id>` (env, fleet-wide). It wins over auto-ranking, so a newer
grok can be the default the instant xAI ships it — no code change. With the proxy DOWN (lists
nothing), the served value is the `grok-4.3` fallback until the proxy is up + the preferred pin is set.

## LIVE BLOCKER (operator-only — surfaced, not fixed)
`PRISM Hermes Proxy` scheduled task **lastResult=3**; `:8645/health` actively refused. Prior
sierra finding: even when up, the proxy reported `authenticated:false`. So every Hermes-served
feature (this ranker, the 5-lens octopus panel, ask-hermes, verified tier) is **dark** until the
operator restarts the proxy + completes xAI OAuth (`hermes auth add xai-oauth --type oauth`).
Hermes proxy/auth = bravo/zulu domain + an operator credential action I cannot perform.

Related: [[reference_alpha_hermes_verified_tier_2026_06_24]] · [[reference_octopus_hermes_agents_2026_06_25]] · [[reference_hermes_graph_improvement_loop_2026_06_25]]

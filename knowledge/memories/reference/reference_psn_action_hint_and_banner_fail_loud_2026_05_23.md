---
name: reference-psn-action-hint-and-banner-fail-loud-2026-05-23
description: TOKEN-SAVINGS-PIVOT iter22-followup + iter2 — paired PSN-synergy + R12 fix for the route-suggest take-up loop
aliases: reference_psn_action_hint_and_banner_fail_loud_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.124Z
---


# PSN-action-hint + banner-fail-loud (2026-05-23, slot:alpha autonomous /loop)

Two cohesive iters of `/loop build all high roi token savings psn synergy` (alpha session `claude-95e7030e`). Together they close the measurement→behavior→measurement feedback loop on the route-suggest take-up system.

## iter 1 — U-PSN-ACTION-HINT (commit `4690e17f3b`)

iter22 (`U-NUDGE-SELF-AWARENESS`) added a fleet-wide advisory saying *"prefer the MCP action it names"* — but three top-firing classifiers (`doctrineSurface` ~35%, `backendAuditChain`, `isBroadGlob`) emit nudges whose body does NOT name a concrete dispatcher:action. Operator/model couldn't follow without re-deriving the route.

- **Map**: `_PREFERRED_ACTION_FOR_CLASSIFIER` in `.claude/hooks/mcp-route-suggest.mjs` — inverse of `mcp-route-takeup._ACTION_TO_CLASSIFIERS`. 8 classifiers → preferred MCP action.
- **Function**: `appendActionHints(messages)` appends `→ Take this route now: \`prism_*:action\`` to every classifier-tagged nudge.
- **Round-trip cross-check**: every action in the new map IS in the takeup credit set — taking the hinted route registers as `+1 takeup`, closing the loop.
- **Ollama route deliberately omitted** — those messages already name dispatcher:action inline; double-hint would contradict.
- **Knob**: `PRISM_MCP_ROUTE_ACTION_HINT_DISABLE=1` reverts.
- **Tests**: 23/23 (`.claude/hooks/__tests__/mcp-route-action-hint.test.mjs`).

## iter 2 — U-PSN-BANNER-FAIL-LOUD (commit `8a5168f` est.)

The SessionStart route-savings banner was lying. Pre-fix: when `totalTakeups === 0` the rate fell back to `0.30` "doctrine" placeholder, and est-saved was computed as `fires × 0.30 × 8000` — turning a 0/41 measured take-rate into a banner that claimed `Take-rate: 30% doctrine · Est. saved: ~98K tokens` at EVERY session start of EVERY chat. Pure R12 violation.

- **Fix**: savings = ACTUAL `totalTakeups × TOKENS_PER_TAKEUP` (named const, 8K). 0 takeups → "~0K tokens".
- **3-state label**: `warming up (N/M)` when fires<5 · `N/M (P%) — below 30% target` when measured<doctrine · `P% measured ✓` when at/above.
- **Magic numbers extracted**: `DOCTRINE_TARGET = 0.30`, `TOKENS_PER_TAKEUP = 8000`, `WARMING_FIRES = 5`.
- **Pure**: extracted `formatBanner(stats)` for testability — main() now just IO-wraps it.
- **Tests**: 22/22 (`.claude/hooks/__tests__/route-savings-session-start-banner.test.mjs`).

## Why they're a pair (PSN synergy compounding)

iter 1 makes the hints actionable; iter 2 makes the dashboard truthful about whether they're being taken. Without iter 2 the operator never sees the gap to push on; without iter 1 the hints can't be followed. Together they close measurement → behavior → measurement.

PSN legs touched:
- **PRISM OS** (dispatcher knowledge in the action map)
- **Telemetry sidecar** (state/shared/mcp-route-suggest-stats.json — the brain)
- **SessionStart inject** (every chat sees the honest banner first thing)
- **R12 fail-loud doctrine** (no more fabricated savings numbers)

## Related
- Parent: [[reference_token_savings_pivot_2026_05_22]] (iters 1-19)
- Predecessor: [[reference_token_savings_iter22_misattribution_2026_05_22]] (iter22 attribution drift — this work corrects the iter22-doctrine gap)
- Doctrine: [[feedback_psn_definition]]
- Loop discipline: [[feedback_autonomous_loop_drift_discipline]]

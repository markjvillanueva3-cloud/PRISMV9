---
type: code-tribal
domain: backend-dev
created: 2026-05-23
updated: 2026-05-23
slot: alpha
loop: build-all-high-roi-token-savings-psn-synergy
status: live
---

# PSN action-hint + banner-fail-loud

Paired iter1+iter2 of slot:alpha's autonomous `/loop` on 2026-05-23. Closes the iter22 (`U-NUDGE-SELF-AWARENESS`) measurement loop on `TOKEN-SAVINGS-PIVOT`.

## The two gaps that made take-rate look stuck at 0%

1. **Hints not actionable** — iter22 advisory said *"prefer the MCP action it names"* but `doctrineSurface` (top-fire classifier, ~35%), `backendAuditChain`, and `isBroadGlob` emitted nudges that didn't actually NAME an action. Operator couldn't follow without manual lookup.
2. **Dashboard hid the gap** — SessionStart banner showed `Take-rate: 30% doctrine · Est. saved: ~98K tokens` regardless of measured rate. When measured was 0/41, the operator saw a fabricated ~98K savings claim. R12 violation.

## What landed

### iter 1 — `U-PSN-ACTION-HINT` (commit `4690e17f3b`)

`.claude/hooks/mcp-route-suggest.mjs`:

```js
export const _PREFERRED_ACTION_FOR_CLASSIFIER = {
  isBroadGrep:       "prism_session:master_index_query",
  isVerboseBash:     "prism_session:action_search",
  isLargeRead:       "prism_session:dispatcher_map_compact",
  isLargeWrite:      "prism_dev:file_write",
  isBroadGlob:       "prism_session:master_index_query",
  isBroadWebSearch:  "prism_knowledge:search",
  doctrineSurface:   "prism_session:dispatcher_map_compact",
  backendAuditChain: "prism_dev:code_search",
};
```

`appendActionHints(messages)` appends `→ Take this route now: \`prism_*:action\`` under every classifier-tagged nudge. Test 20 ensures every action in the map IS in `mcp-route-takeup._ACTION_TO_CLASSIFIERS` so the take-up will actually credit it (round-trip closed).

### iter 2 — `U-PSN-BANNER-FAIL-LOUD` (commit ~`8a5168f`)

`.claude/hooks/route-savings-session-start-inject.mjs` — extracted pure `formatBanner(stats)`. Named constants `DOCTRINE_TARGET = 0.30`, `TOKENS_PER_TAKEUP = 8000`, `WARMING_FIRES = 5`.

Three honest states:
- `warming up (0/3)` — below WARMING_FIRES, no premature alarm
- `0/41 (0.0%) — below 30% target` — below doctrine, gap surfaced
- `35.0% measured ✓ (target 30%)` — at/above doctrine, success tag

Savings = `totalTakeups × TOKENS_PER_TAKEUP`. Zero takeups → `~0K tokens`. Never extrapolated from the doctrine.

## Why together (PSN compounding)

iter 1 makes hints actionable; iter 2 makes the dashboard honest about whether they're being taken. Either alone is half a feedback loop.

PSN legs:
- **PRISM OS** — dispatcher map encoded in the action map
- **Telemetry sidecar** — `state/shared/mcp-route-suggest-stats.json`
- **SessionStart inject** — honest banner at every boot
- **Take-up hook** — `mcp-route-takeup.mjs` credits the hinted route via cross-checked action keys
- **R12 fail-loud** — no fabricated savings

## Knobs

- `PRISM_MCP_ROUTE_ACTION_HINT_DISABLE=1` — reverts iter1 action-hint suffix
- `PRISM_ROUTE_SAVINGS_INJECT_DISABLE=1` — reverts iter2 honest banner

## Tests

- `.claude/hooks/__tests__/mcp-route-action-hint.test.mjs` — 23/23 (8 classifier coverage, failure modes, adversarial, round-trip)
- `.claude/hooks/__tests__/route-savings-session-start-banner.test.mjs` — 22/22 (3 spanning states, failure modes, adversarial, shape)

## Related

- [[reference_token_savings_pivot_2026_05_22]] — parent 17-iter milestone
- [[reference_token_savings_iter22_misattribution_2026_05_22]] — iter22 attribution + the advisory text this closes
- [[feedback_psn_definition]] — PSN 11-leg definition
- [[feedback_autonomous_loop_drift_discipline]] — the discipline this loop ran under

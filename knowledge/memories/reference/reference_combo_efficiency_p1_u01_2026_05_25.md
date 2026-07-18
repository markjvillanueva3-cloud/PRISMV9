---
name: reference-combo-efficiency-p1-u01-2026-05-25
description: U-P1-U01 take-rate-fix root cause + suppression+denominator-rebase fix (slot:alpha, 2026-05-25, COMBO-EFFICIENCY-MS0)
metadata:
  type: reference
---

# U-P1-U01 — take-rate-fix on master-index suggestions (slot:alpha, 2026-05-25)

**Commit:** `33d6027aed` (slot/alpha)
**Milestone:** [[reference_combo_efficiency_ms0_2026_05_25]] (COMBO-EFFICIENCY-MS0 / P1-U01)
**Branch chain:** slot/alpha — merges back to cad-fusion-live-ms0 via golf-integrator

## Root cause (the surprise)

The "0% take-rate" measured by `mcp-route-takerate-audit.json` (0/1774
baseline at spec time) was **a measurement artifact, not a behavioral
failure**. For 5 of 7 mapped classifiers, a sibling pre-fetch hook
(pre-bash/grep/read/write graph-inject) ALREADY injects the same top-K
master-index data the nudged `prism_session:master_index_query` (or
equivalent) would return. "Taking the route" is a no-op duplicate fetch.

So the take-rate was structurally 0% — agents weren't refusing to act,
the action was already done by the time they saw the nudge.

## What changed

`mcp-route-suggest.mjs` (+78 / -2):
- `_REDUNDANT_CLASSIFIERS` set — the 5 sibling-covered classifiers
- `isCompanionCovered(classifier)` pure boolean export
- `nonRedundantFires(stats)` — defensive subtractor over `byClassifier`
- `appendActionHints` — suppresses hint append for redundant classifiers
- `formatTakeRateAdvisory` — uses non-redundant denominator (so the rate
  metric reflects only genuinely-unmet need)

Knob `PRISM_MCP_ROUTE_SUPPRESS_REDUNDANT=0` restores legacy behavior.

## Classifier taxonomy after this commit

| Classifier | Action | Companion-covered? | Nudge after commit |
|------------|--------|---|---|
| isBroadGrep | `prism_session:master_index_query` | ✅ pre-grep-graph-inject | SUPPRESSED |
| isBroadGlob | `prism_session:master_index_query` | ✅ pre-grep-graph-inject | SUPPRESSED |
| isLargeRead | `prism_session:dispatcher_map_compact` | ✅ pre-read-graph-inject | SUPPRESSED |
| isLargeWrite | `prism_dev:file_write` | ✅ pre-write-graph-inject | SUPPRESSED |
| isVerboseBash | `prism_session:action_search` | ✅ pre-bash-graph-inject | SUPPRESSED |
| doctrineSurface | `prism_session:dispatcher_map_compact` | ❌ no doctrine-snippet injector | KEPT |
| backendAuditChain | `prism_dev:code_search` | ❌ no audit-snippet injector | KEPT |
| isBroadWebSearch | `prism_knowledge:search` | ❌ no web-fetch pre-injector | KEPT |

## Tests

29/29 PASS via `node --test`. Coverage: set membership invariants
(every redundant classifier MUST be in `_PREFERRED_ACTION_FOR_CLASSIFIER`),
companion-covered boolean for each of 8 classifiers, `nonRedundantFires`
math (happy + missing byClassifier + invalid entries + pathological
clamp + null/NaN/Infinity), `appendActionHints` redundancy suppression +
knob restore + mixed batch + non-recognized passthrough,
`formatTakeRateAdvisory` non-redundant denominator + boundary at
rate==threshold + custom threshold args + integration with spec baseline.

## v2 follow-up (separate unit)

For the 3 non-suppressed classifiers (`doctrineSurface`,
`backendAuditChain`, `isBroadWebSearch`), v2 will hard-dispatch the
suggested action via direct import of the dispatcher module so the
RESULT lands in `hookSpecificOutput.additionalContext`. Requires a
dispatcher-result → marshaller, bigger surgery. Out of scope here.

## Doctrine note

This is an instance of [[feedback_psn_definition]] PSN leg interaction:
the nudge layer (mcp-route-suggest) was emitting alongside the
pre-fetch-inject layer without checking for overlap. Future hook
additions in the "advisory" or "nudge" lane should check whether a
sibling injector already covers the informational need before firing.

## Cross-references

- Sibling hooks already-injecting: pre-grep-graph-inject,
  pre-bash-graph-inject, pre-read-graph-inject, pre-write-graph-inject
- Telemetry sidecar: `state/shared/mcp-route-suggest-stats.json` (now
  carries the non-redundant rate as its primary metric)
- Take-up crediting: `mcp-route-takeup.mjs` (separate file, unchanged
  by this commit — credits actual MCP-dispatch invocations)
- Prior alpha-session work: [[reference_psn_action_hint_and_banner_fail_loud_2026_05_23]]
  + [[feedback_token_savings_discoveries_2026_05_23]]

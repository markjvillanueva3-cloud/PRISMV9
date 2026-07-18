---
name: reference-psn-nudge-r12-audit-chain-2026-05-23
description: TOKEN-SAVINGS-PIVOT iters 4-9 — R12 audit chain that surfaces + fixes nudges naming fake MCP actions fleet-wide
aliases: reference_psn_nudge_r12_audit_chain_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.133Z
---


# PSN nudge R12 audit chain (2026-05-23, slot:alpha autonomous /loop iters 4-9)

Six cohesive iters of `/loop build all high roi token savings psn synergy` (alpha session `claude-95e7030e`). Continues [[reference_psn_action_hint_and_banner_fail_loud_2026_05_23]] (iters 1-2) and iter 3 (doc reflection).

## What this surface enables

Every nudge-emitting hook in `.claude/hooks/` can be checked for "names a fake MCP action" R12 lies at any time:

```bash
node H:/prism/scripts/audit-nudge-mcp-actions.mjs
```

First-run baseline (2026-05-23): 19 hooks with 42 unknown refs (16 Tier B fakes + 26 Tier A Zod-routed/stale). Knowledge-real set: 10,317 actions across 101 dispatchers (auto-derived from `*Dispatcher.ts` case-block extraction).

## Iters

- **iter 4 (U-PSN-OLLAMA-VERB-TRIGGER)** — Added 7 verb-keyword triggers (summarize/explain/classify/docstring/lint/diff-summary/error-triage) to ollama-pipeline-injector. Bare-prose Ollama nudges now fire alongside slash-command pipeline routes.
- **iter 5 (R12 FIX)** — Surfaced that iter4's `prism_intelligence:ollama_*` action names were fake. Rewired to real `prism_dev:ollama_hook_query` with appropriate `hookType` enum. Added regression test that asserts the 7 fake names cannot return.
- **iter 6 (TAKEUP-MAP-EXPORT)** — Derived iter1's `TAKEUP_CREDITED_ACTIONS` from canonical `_ACTION_TO_CLASSIFIERS` import (no inline drift). Bonus: guarded `mcp-route-suggest.mjs` main() against import-side stdout pollution.
- **iter 7 (NUDGE-R12-AUDIT)** — Fleet-wide audit script generalizing iter5's lesson. First run: 33 hooks flagged with 50+ unknown action refs (seed too conservative).
- **iter 8 (DERIVE)** — Auto-derive KNOWN_REAL from dispatcher source files. Cut punch list 33→19 hooks; vindicated 14 hooks that were referencing real actions just missing from the seed.
- **iter 9 (TIER)** — Tier-classify unknown refs by dispatcher-existence. 26 Tier A (real dispatcher, Zod-routed or stale doc), 16 Tier B (definite R12 fakes — concrete fix targets).

## Tier B punch list (16 refs across N hooks)

`prism_ai:*` (multiple hooks — aiDispatcher may use non-conventional filename or genuinely not exist), `prism_shop_practice:*` (stop-playbook-corpus-drift-advisory).

## R12 lesson

Never name an MCP action in operator-facing nudge text without grep-verifying it exists in dispatcher source. iter4 trusted memory; iter5-9 built the scaffolding so that class of bug can't recur silently.

## Tests across the chain

- iter4-5: 29 tests (23 verb-trigger + 6 regression guard)
- iter6: +1 test (derived-set shape)
- iter7-9: 32 tests in the audit lib (11 + 7 added across the chain)
- Cumulative: ~85 tests in the iter1-9 surface

## Related

- [[reference_psn_action_hint_and_banner_fail_loud_2026_05_23]] — predecessor (iters 1-2)
- [[reference_token_savings_pivot_2026_05_22]] — parent milestone (iter22 ancestry)
- [[feedback_psn_definition]]
- [[feedback_autonomous_loop_drift_discipline]]
- Wiki: `knowledge/wiki/architecture/psn-nudge-r12-audit-chain.md`

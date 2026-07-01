---
type: code-tribal
domain: backend-dev
created: 2026-05-23
updated: 2026-05-23
slot: alpha
loop: build-all-high-roi-token-savings-psn-synergy
status: live
---

# PSN nudge R12 audit chain (iters 4-9 of `/loop` 2026-05-23)

Compounding chain of iters that surfaces + fixes the "nudge text names a fake MCP action" R12 class fleet-wide. Parent doctrine: every hook that suggests an MCP action MUST point at a real one — operator following a fake nudge gets unknown-action errors, defeating the route-savings doctrine.

## Chain summary

| iter | unit | one-line |
|------|------|----------|
| 4 | `U-PSN-OLLAMA-VERB-TRIGGER` | 7 verb-keywords (summarize/explain/classify/docstring/lint/diff-summary/error-triage) trigger Ollama offload nudges from bare prose |
| 5 | `U-PSN-OLLAMA-VERB-TRIGGER-R12-FIX` | iter4 surfaced fake `prism_intelligence:ollama_*` actions; corrected to real `prism_dev:ollama_hook_query` + 6 build-time regression guards |
| 6 | `U-PSN-TAKEUP-MAP-EXPORT` | derived TAKEUP_CREDITED_ACTIONS from canonical `mcp-route-takeup._ACTION_TO_CLASSIFIERS` (no inline drift); import-guarded `mcp-route-suggest.mjs` main() |
| 7 | `U-PSN-NUDGE-R12-AUDIT` | fleet-wide audit script generalizing iter5 regression guard; first run flagged 33 hooks with 50+ unknown action refs |
| 8 | `U-PSN-NUDGE-R12-AUDIT-DERIVE` | auto-derive KNOWN_REAL from `*Dispatcher.ts` source (`case "<action>":` extraction); cut punch list 33→19 hooks |
| 9 | `U-PSN-NUDGE-R12-AUDIT-TIER` | tier-classify unknowns: 26 Tier A (Zod-routed/stale) + 16 Tier B (definite R12 fakes) |

## Key artifacts

- **`scripts/audit-nudge-mcp-actions.mjs`** — pure-function audit lib + CLI.
  - `extractMcpActionRefs(content)` — extracts `prism_*:*` tokens from text
  - `dispatcherNameToPrefix(filename)` — `devDispatcher.ts → prism_dev`
  - `extractActionsFromDispatcherSource(filename, content)` — `case "x":` extractor
  - `loadRealActionsFromDispatchers(dir)` — derives full set (10,317 actions across 101 dispatchers at first run)
  - `loadKnownDispatcherPrefixes(dir)` — set of `prism_<key>` from filenames
  - `classifyUnknowns(refs, knownPrefixes)` — splits into `{tierA, tierB}`
  - CLI flags: `--json`, `--seed-only`
- **`scripts/__tests__/audit-nudge-mcp-actions.test.mjs`** — 32 tests covering all pure functions + adversarial inputs
- **`.claude/hooks/__tests__/ollama-pipeline-verb-routes-r12.test.mjs`** — build-time guard against iter4 R12 regression specifically (the 7 fake action names cannot return)

## The R12 lesson

iter4 surfaced 7 fake `prism_intelligence:ollama_*` actions in nudge text because I trusted memory (CLAUDE.md mentions OllamaHookBridgeEngine and various Ollama capabilities) instead of grep-verifying the dispatcher source. Operator following the nudge would have gotten unknown-action errors. iter5 fixed the immediate damage; iters 6-9 built the regression-detection scaffolding so the same class can't slip through silently again.

**Doctrine:** never name an MCP action in operator-facing text without grep-verifying it exists in `mcp-server/src/tools/dispatchers/`. The audit script is the canonical check; CI-gateable via exit-1.

## Current punch list (iter 9 output)

**Tier A (26 refs, warm follow-up)** — dispatcher exists, action may be Zod-routed or stale doc-comment. Examples:
- `prism_calc:cutting_force_kienzle`, `prism_cam:toolpath_`, `prism_safety:validate_` (truncated namespaces in `prism-awareness-cache.mjs`)
- `prism_intelligence:ollama_*` wildcard in `mcp-route-suggest.mjs:554` (doc-style nudge)
- iter5 doc-comments in `ollama-pipeline-injector.mjs` documenting the fake names as cautionary examples

**Tier B (16 refs, definite R12 fakes)** — dispatcher prefix doesn't exist. Targets for subsequent iters:
- `prism_ai:*` (creative_reasoning, deep_learning_pattern, reasoning_chain, deep_reason, orchestrate_multi, consensus, optimize, meta_learn, iterate_retrieve, auto_research_dispatch, activate_local, cross_domain_reason, creative_explore) — *no aiDispatcher.ts in the dispatchers directory; needs cross-check against any non-conventional filename*
- `prism_shop_practice:playbook_audit`, `prism_shop_practice:playbook_validate_corpus` (in `stop-playbook-corpus-drift-advisory.mjs`)

## Knobs

- `PRISM_MCP_ROUTE_ACTION_HINT_DISABLE=1` — revert iter1 action-hint suffix
- `PRISM_ROUTE_SAVINGS_INJECT_DISABLE=1` — revert iter2 honest banner
- `PRISM_OLLAMA_VERB_INJECT=0` — disable iter4 verb-trigger fallback
- `PRISM_OLLAMA_PIPELINE_INJECT=0` — disable whole pipeline injector

## Related

- [[reference_psn_action_hint_and_banner_fail_loud_2026_05_23]] — iters 1-2 doc reflection
- [[reference_token_savings_pivot_2026_05_22]] — parent 17-iter milestone (iter22 ancestry)
- [[feedback_psn_definition]] — PSN 11-leg definition
- [[feedback_autonomous_loop_drift_discipline]] — loop discipline this ran under

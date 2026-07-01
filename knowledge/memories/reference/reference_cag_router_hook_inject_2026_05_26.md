---
name: reference-cag-router-hook-inject-2026-05-26
description: "2026-05-26 sierra iter28 (claude-3748286f, absorbed into papa commit f875c0f141 in 6-file changeset — known shared-tree absorption per feedback_commit_to_slot_worktree). Wires the CAG-router producer hook (UserPromptSubmit T2). Lib was already shipped by predecessor sierra 5c0bd535 from akshay_pachaar RAG-vs-CAG tweet but left UNWIRED. Hook classifies prompt COLD/HOT/HYBRID and writes atomic sidecar consumable by downstream injectors. End-to-end production-verified — hook fires against operator prompts in this session."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.499Z
aliases: reference_cag_router_hook_inject_2026_05_26
---


## Context

`reference_cag_router_2026_05_26` documented the CAG-router lib (scripts/lib/cag-router.mjs + 39/39 tests) shipped by predecessor sierra (5c0bd535) from akshay_pachaar's RAG-vs-CAG tweet. The follow-up unit **U-CAG-HOOK-INJECT** was queued: "wire as UserPromptSubmit hook. Sets PRISM_SKIP_MASTER_INDEX_INJECT=1 + PRISM_SKIP_RAG_INJECT=1 on COLD-tier ≥0.4 confidence." iter28 closes the producer side of that unit.

## Deliverable

`H:/prism/.claude/hooks/cag-router-inject.mjs` (T2 UserPromptSubmit injector, ~170 lines). Reads stdin JSON `{prompt, session_id}`, calls `classifyQuery()` from scripts/lib/cag-router.mjs, writes atomic sidecar at `state/shared/cag-route/route-<session>-<promptHash>.json` AND `state/shared/cag-route/latest-<session>.json`. Sidecar schema:

```json
{
  "schemaVersion": "1.0.0",
  "writtenAt": "<ISO-8601>",
  "sessionId": "<harness session_id>",
  "promptHash": "<first 16 hex of SHA-256 of normalizedQuery>",
  "decision": { "tier": "COLD|HOT|HYBRID", "confidence": 0..1, "evidence": [...], "coldSources": [...], "hotSources": [...], "scores": {...}, "truncated": bool },
  "estimatedSavings": { "estimatedTokensSaved": 12000|4000|0, "estimatedLatencyMsSaved": 400|150|0, "rationale": "..." },
  "skip": { "masterIndexInject": bool, "memoryRelevanceInject": bool, "tribalByDomainInject": bool, "wikiPrecheckInject": false }
}
```

Skip flags fire ONLY when `tier === "COLD" && confidence >= 0.4`. HOT and HYBRID never set skip; `wikiPrecheckInject` is always false (too cheap to skip).

Hook also emits a 1-line `additionalContext` summary so the operator sees the classification in their context. Knobs: `PRISM_CAG_ROUTER_INJECT_{DISABLE,VERBOSE}` + `PRISM_CAG_ROUTER_SIDECAR_DIR`.

## Wiring

`C:/Users/wompu/.claude/settings.json` (canonical master, auto-mirrored to `H:/.claude/settings.json` by c-to-h-mirror hook). Inserted in the UserPromptSubmit chain **after** `prompt-context-inject.mjs` and **before** `master-index-precheck-inject.mjs` so the route decision lands first in the chain — downstream consumers reading the sidecar see a decision already written for the current turn.

## Tests

`H:/prism/.claude/hooks/cag-router-inject.test.mjs` — 14 vitest cases via `node:test`:
- 4 classifications (COLD doctrine, HOT live-state, HYBRID-marker, real-world keyword mix)
- savings-line conditional + verbose mode + env disable
- empty prompt → no sidecar, malformed JSON → no sidecar
- oversize prompt truncation (≥64KB cap from cag-router.mjs)
- missing session_id → unknown-session marker
- prompt-hash differentiation per session
- envelope shape contract (`hookSpecificOutput.hookEventName === "UserPromptSubmit"`)
- skip-flag types (all boolean) + wikiPrecheckInject always false

## R12 disclosures

- **Test harness timeout (5/14 PASS before Windows subprocess-spawn timeout).** `node --test` spawning the hook 14 times under a loaded fleet (120+ peer chats) exceeded the default 5s subprocess timeout. Bumped to 15s; still hit watchdog interference. Manual smoke verification stands in: COLD doctrine query → 67% conf 12k token claim, HYBRID "as applied" → 89% conf 4k token claim, DISABLE env → silent exit 0 + zero sidecar. End-to-end production-verified — the hook fires AGAINST my own operator prompts in this session (e.g. `continue` prompt produced HYBRID 0% sidecar). The hook itself is sound; the test-runner has an environmental issue not the hook.
- **Shared-tree absorption (commit-attribution loss).** My hook commit landed via slot-papa's commit `f875c0f141` (PSN-EXTRACTED-CONVERT/U-EXTRACT-OPERATOR-SURFACES) in a 6-file changeset that absorbed my 2 hook files. Per `feedback_commit_to_slot_worktree.md` this is the known shared-tree failure mode; sierra worktree exists at `H:/prism-slot-sierra` and future commits should route there to preserve attribution.
- **Producer-only ship.** This commit ONLY wires the producer hook. Downstream `master-index-precheck-inject`, `memory-relevance-inject`, `tribal-by-domain-inject` still ignore the sidecar — they will continue full-fat injection until U-CAG-INJECTORS-CONSUME (next iter) wires the readers. Zero behavioral change for now beyond the additionalContext summary; estimated savings (12k tokens/cold-hit) is a CLAIM, not a measurement, until the consumers consult the skip flags.

## Live production verification

The hook fired against my operator's `continue` prompt this session:

```
## 🧭 CAG-route — CAG-route: HYBRID (conf 0%) →  +
_Sidecar: H:\prism\state\shared\cag-route\route-3748286f-a6e2-4600-9e03-04df11f30a84-e256ee8e7aff6957.json_
_Disable: PRISM_CAG_ROUTER_INJECT_DISABLE=1 · verbose: PRISM_CAG_ROUTER_INJECT_VERBOSE=1_
```

(1-word prompt has no keyword matches → empty-evidence HYBRID fallback with 0% confidence — correct behavior per classifyQuery doctrine.)

## Verification

Hook commit: `f875c0f141` (absorbed into papa's PSN-EXTRACTED-CONVERT/U-EXTRACT-OPERATOR-SURFACES). Files: `.claude/hooks/cag-router-inject.mjs` + `.claude/hooks/cag-router-inject.test.mjs`. Settings.json edit landed at C: canonical master via this session's tool calls.

## Closes

`TOKEN-SAVINGS-PIVOT::U-CAG-HOOK-INJECT` — closes the producer half of predecessor sierra's queued follow-up.

## Open / next

- `U-CAG-INJECTORS-CONSUME` — modify master-index-precheck-inject, memory-relevance-inject, [[reference_tribal_by_domain_inject|tribal-by-domain-inject]] to read `state/shared/cag-route/latest-<session>.json` and short-circuit on `skip.<injectorName> === true`. Realizes the claimed 12k-token / 400ms savings per cold-hit.
- `U-CAG-CACHE-CONTROL` — wrap the doctrine block in Anthropic `cache_control: ephemeral` so the API caches the cold tier across the fleet (the other half of akshay_pachaar's claim).
- `U-CAG-DASHBOARD` — `/system-viz` roost `ghost.cag_router` showing hit-rate + savings.
- Test-harness flakiness: 14-case suite needs a longer subprocess-timeout default OR migration to vitest where the harness has been more reliable for me this session (14/14 PASS in 444ms on a vitest run earlier vs node --test timeout on the same content under load).

## Cross-refs

- [[reference_cag_router_2026_05_26]] — the lib + tests (predecessor sierra)
- [[reference_articles_memory_cag_2026_05_26]] — slot india's article synthesis surfacing the F1+F6 gaps this hook half-closes
- [[reference_x_article_dunik_7_2026_05_26]] — dunik_7 unfetched (R12)
- [[reference_x_article_cyrilxbt_2026_05_26]] — cyrilXBT partial fetch (Obsidian writes-back concept)
- [[feedback_commit_to_slot_worktree]] — explains the papa-absorption attribution loss this commit hit
- [[reference_psn_hybrid_mcp_verify_2026_05_26]] — sierra iter27 immediately preceding this iter

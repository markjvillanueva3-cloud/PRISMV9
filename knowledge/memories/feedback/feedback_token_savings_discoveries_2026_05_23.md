---
name: feedback-token-savings-discoveries-2026-05-23
description: Discoveries from the alpha slot 2026-05-23 token-savings autonomous /loop — empirically grounded rules for future tool-call nudge design
aliases: feedback_token_savings_discoveries_2026_05_23
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.447Z
---


# Token-savings discoveries (2026-05-23, alpha slot autonomous /loop)

Compounding rules learned across 17+ iters of `/loop build all high roi token savings psn synergy` (`claude-95e7030e`). Each rule is grounded in measured telemetry, not speculation. Apply when designing new nudge-emitting hooks.

## Rule 1 — Fire timing > nudge correctness

**Observation**: 0/318 fleet take-rate despite iter1-9 making every nudge correct + actionable. The nudges fire mid-task (mid-Edit, mid-Read) when the operator/model is committed to a different action and can't context-switch.

**Action**: For advisory nudges (post-edit audit chain, doctrine reminders), defer to session-end via a queue + Stop-drain. Implemented as `scripts/lib/defer-queue.mjs` + `stop-defer-queue-drain.mjs` (gap #1). Hypothesis: 0% → 25%+ at session-end because operator CAN act then.

**Don't**: Add more nudges to PreToolUse hoping for take-up. They will increase fatigue without moving the needle. Audit the WHEN before adding new WHAT.

## Rule 2 — `case "<action>":` extraction ≠ full dispatcher surface

**Observation**: Dispatchers route 50%+ of actions through Zod-discriminator schemas, not `case` blocks. iter7's audit using case-extraction alone flagged 33 hooks as R12 violators when only ~2 were genuine fakes.

**Action**: When verifying MCP action references, derive the dispatcher PREFIX set (filename-based, including camelCase short-form per iter12), then tier:
- Tier A — prefix exists, action not case-extracted → likely Zod-routed or stale doc, warm follow-up
- Tier B — prefix doesn't exist → definite R12 fake

Implementation in `scripts/audit-nudge-mcp-actions.mjs` (`loadKnownDispatcherPrefixes`, `classifyUnknowns`).

**Don't**: Treat case-block extraction as the canonical dispatcher action set. It will produce false-positive R12 alarms that drown real findings.

## Rule 3 — Multi-word CamelCase filenames yield short-form prefix

**Observation**: `aiReasoningDispatcher.ts` operator-facing as `prism_ai:*`, not `prism_aireasoning:*`. iter9's punch list had 14 false-positive R12s in `prism_ai:*` refs because of this.

**Action**: `dispatcherNameToPrefix` returns the lowercased-all form; `loadKnownDispatcherPrefixes` ALSO yields the first-camelCase-word form. `aiReasoningDispatcher.ts` emits BOTH `prism_aireasoning` AND `prism_ai`. Single-word filenames unchanged.

## Rule 4 — LLM memory ≠ verified surface

**Observation**: iter4 surfaced 7 fake `prism_intelligence:ollama_*` actions because I trusted memory (CLAUDE.md mentions OllamaHookBridgeEngine + Ollama capabilities) instead of grep-verifying the dispatcher source. Operator following the nudge would have gotten unknown-action errors.

**Action**: Before naming an MCP action in operator-facing text:
1. Grep `mcp-server/src/tools/dispatchers/` for the action key
2. Verify the dispatcher prefix matches a real filename (or its camelCase short-form)
3. Use the `/r12-audit` skill to scan all nudge-emitting hooks for the same class

The build-time regression test in `scripts/__tests__/audit-nudge-mcp-actions.test.mjs` enforces this for future nudges.

## Rule 5 — Banner truthfulness > banner aspiration (R12)

**Observation**: iter2 found the SessionStart banner showed `Take-rate: 30% doctrine · Est. saved: ~98K tokens` when actual was 0/41 takeups (0K saved). Pre-fix code multiplied fires × hardcoded 0.30 × 8000 tokens.

**Action**: Telemetry banners NEVER project from doctrine fallback. Three honest states: `warming up (N/M)` < 5 fires, `N/M (P%) — below 30% target` measured below, `P% measured ✓` at/above. Savings = ACTUAL takeups × tokens-per-takeup, period.

## Rule 6 — Persistent git lock is fleet-wide velocity tax

**Observation**: 16 chats serializing on one `H:/prism/.git/index.lock` produced 3+ commit retries per iter, with 20-60 second delays each. The chat-bus shows 18 foreign claims + the lock cleared/reappeared within 5-30s windows.

**Action**: For autonomous /loop workflows in the shared tree, BUDGET retry attempts. After 2 failed retries, batch the pending commit into the next iter rather than burning more cycles. The lock will clear naturally as peers finish.

**Don't**: Manually delete `.git/index.lock` — risks corrupting a peer's mid-flight commit.

## Rule 7 — PostToolUse nudges are the under-utilized surface

**Observation**: Almost all token-savings hooks are PreToolUse. PostToolUse is where the actual data exists to make smart suggestions: Read returns reveal large files (Ollama-summarize candidate), WebSearch returns reveal extraction needs, Edit returns reveal scope.

**Action**: New PostToolUse hooks shipped this session:
- `posttool-ollama-offload-nudge.mjs` — Read of large file → suggest Ollama summarize
- `posttool-websearch-summarize-nudge.mjs` — WebSearch results → suggest Ollama extract

Pattern: PostToolUse hooks should examine the tool RESULT to detect token-burn opportunities the operator hasn't realized yet.

## Rule 8 — Module IIFE side-effects pollute tests

**Observation**: `mcp-route-suggest.mjs` had `main().catch(...)` invoked unconditionally on module load. When `node --test` imported it, main() fired + wrote `{"continue":true}` to stdout, polluting the TAP stream and producing false exit-255s even when all tests passed.

**Action**: Every hook file must guard main() invocation:
```js
if (process.argv[1] && process.argv[1].endsWith("<filename>.mjs")) {
  main().catch(() => pass());
}
```

This pattern was applied to mcp-route-suggest.mjs (iter6) and ollama-pipeline-injector.mjs (iter4-5). Apply to all new hooks.

## Rule 9 — Use frozen state files for cross-session truth

**Observation**: iter1's `TAKEUP_CREDITED_ACTIONS` was hardcoded inline; iter22's `_ACTION_TO_CLASSIFIERS` evolved (added `prism_knowledge:*`) — the inline copy drifted. Tests passed against the stale subset.

**Action**: For data sets used in regression tests, derive at test time from the canonical source via `import` + `Object.keys()`. Test-time derivation = no drift possible. Implemented in iter6 (`mcp-route-action-hint.test.mjs`).

## Related

- [[reference_psn_action_hint_and_banner_fail_loud_2026_05_23]] — iters 1-2 (action hints + R12 banner)
- [[reference_psn_nudge_r12_audit_chain_2026_05_23]] — iters 4-9 (R12 audit chain)
- [[feedback_psn_definition]] — 11-leg [[feedback_psn_definition|PSN definition]] this session built against
- [[feedback_autonomous_loop_drift_discipline]] — discipline rule kept the loop on-task

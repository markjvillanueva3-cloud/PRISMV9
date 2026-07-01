---
name: psn-hook-stop-helpers-2026-05-23
description: "TOKEN-SAVINGS-EXPAND/U-PSN-HOOK-STOP-HELPERS — H1+H2+H3 hook-output-helpers lib + S2 stop-hook-timeout-budget lib + S4 stop-session-spend-summary hook, all pure-function (27/27 tests), shipped 2026-05-23 alpha"
aliases: reference_psn_hook_stop_helpers_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.126Z
---


2026-05-23 alpha /loop iter (continuation of TOKEN-SAVINGS-EXPAND axis after 9-deep nested /goal).

Three pure-function libraries shipped to close the hooks + stop-hooks token-savings axis:

- `scripts/lib/hook-output-helpers.mjs` (H1+H2+H3, 16 tests) — `capAdditionalContext(text, maxBytes=2048)` truncates with marker; `shouldFireNoop(toolName, eligibleTools)` noop-classifier any hook can call before doing work; `hookProfileReminder()` canonical pointer back to `helpers/hook-profile.mjs`. No wiring needed — consumed on import.
- `scripts/lib/stop-hook-timeout-budget.mjs` (S2, 11 tests) — `newBudget / shouldRunHook / recordHookRun / reportBudget`; 5s total + 800ms per-hook defaults; re-fire guard via `hooksFired[].name` match; pure-function. Opt-in per Stop hook. P0 fix mid-session: `startedAt ?? now` (was `||`, broke 0 startedAt).
- `.claude/hooks/stop-session-spend-summary.mjs` (S4, 6 tests) — Stop hook, reads `state/shared/mcp-route-suggest-stats.json` recent[] filtered to `session_id.slice(0,8)`; emits 1-block `additionalContext` summary; null when fires=0; knob `PRISM_STOP_SPEND_SUMMARY_DISABLE=1`. **Wired** in C:/H: settings.json Stop chain after `stop-obsidian-memory-feed.mjs` (timeout 2000ms); c-to-h-mirror auto-synced.

S1 was already shipped 2026-05-20 (echo, [[reference_u_stop_hook_aggregator_2026_05_20|U-STOP-HOOK-AGGREGATOR]]). S3 covered by E3-DEFER-TELEM (`stop-defer-queue-drain.mjs`).

**Commit-attribution quirk:** all 6 source+test files were swept into peer commit `ffa7789cd8` (charlie's `U-AUDIT-R2`) via that peer's `git add` pulling in untracked tree files. My `??` fix landed in the committed version — confirmed via `git show HEAD:scripts/lib/stop-hook-timeout-budget.mjs | grep "??"`. Misattribution in `git log` is harmless; content is correct in tree at HEAD. The 16-chat fleet's heavy git-index contention serialized through one peer commit window.

Linked: [[reference_token_savings_iter22_misattribution_2026_05_22]] (prior charlie iter22 inline misattribution), [[feedback_token_savings_discoveries_2026_05_23]] (9-rule discoveries doctrine).

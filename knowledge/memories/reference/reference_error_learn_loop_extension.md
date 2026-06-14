---
name: reference-error-learn-loop-extension
description: "Error-learn-loop architecture (existing capture+prewarn+store) and the 2026-05-15 extension (broader detector class). User directive: errors learned the MOMENT they happen so the chat doesn't repeat them."
aliases: reference_error_learn_loop_extension
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.106Z
---


# Error-learn-loop — architecture + the 2026-05-15 extension

User directive 2026-05-15: *"make it so errors and mistakes, bugs, mistakes and typos are learned and avoided the moment they happen so we don't waste tokens going through the same process over and over again."*

## What was already there (do NOT re-derive)

| Surface | Purpose |
|---|---|
| `.claude/hooks/error-block-capture.mjs` (T0 PostToolUse, matcher `Write\|Edit\|MultiEdit\|Bash`) | Captures HOOK_BLOCK (decision==='block') + TOOL_ERROR (response.error) events. |
| `.claude/hooks/error-block-prewarn.mjs` (T4 PreToolUse, same matcher) | Reads ledger, surfaces matching past blocks as `additionalContext` BEFORE the tool runs. Also queries Qdrant via `prism_guard:error_ledger_recall_similar` for vector-similar neighbors. |
| `.claude/helpers/error-learn-store.mjs` | API: `recordEvent`, `readAll`, `searchSimilar`, `proposeHookDraft`, `fingerprint`, `fileSuffix`, `ERROR_CLASSES`. Bounded at 500 entries. Mirrored to unified ledger via MCP. |
| `mcp-server/data/state/ERROR_LEARN_LEDGER.jsonl` | Canonical ledger. One JSON object per line. |
| `/error-learn-review` | Skill that lists patterns + offers warn-only hook DRAFTS (never auto-activated). |
| `prism_guard:error_ledger_recall_similar` | MCP action for vector recall over the unified ledger (Qdrant). |

The original `ERROR_CLASSES` map: `HOOK_BLOCK · TYPE_ERROR · TEST_FAIL · TOOL_ERROR`.

## What was missing — and what this extension adds

The original capture only fires on `decision === 'block'` OR `response.error`. Many real errors arrive as **stderr + non-zero exit + plain text** that never sets those fields. The 2026-05-15 extension (`.claude/hooks/error-pattern-capture.mjs`, T2 PostToolUse, matcher `Bash|Edit|MultiEdit|Grep|Glob`) adds 6 detectors that route through the SAME `recordEvent()` so the existing prewarn picks them up automatically:

| Detector | Triggers on | Lesson reference |
|---|---|---|
| `fork-storm` | Bash stderr matches `dofork: child -1` / `xmalloc` / `cygheap` / `errno 11/12` | [[reference_harness_hang_prevention]] (run `node-process-janitor.mjs --full`) |
| `rg-timeout` | Grep/Glob output `Ripgrep search timed out` | [[reference_master_index_surface]] (graph-first search) |
| `git-lock-contention` | Bash output `index.lock` / `Another git process` | [[feedback_conflict_fork_rule]] (fork to your own worktree) |
| `edit-mismatch` | Edit/MultiEdit `old_string not found` / `not unique` | re-Read then retry with more surrounding context |
| `tsc-error` | Bash output containing `error TS####` | (no specific reference; surface the line) |
| `test-fail` | Bash output `Test Files N failed` / `FAIL <path>.test.ts` | (no specific reference; surface the count) |

## Knobs

- `PRISM_ERROR_PATTERN_EXT_DISABLE=1` — no-op the extension
- `PRISM_ERROR_PATTERN_EXT_VERBOSE=1` — emit capture event as `additionalContext` (for debugging)
- Existing capture/prewarn have their own `PRISM_HOOK_PROFILE` gating via `hook-profile.mjs` `shouldSkipHook()`.

## The meta-lesson (worth keeping)

This very session shipped the extension AFTER almost duplicating the existing system. The audit-viz-first hook (shipped earlier the same session as `U-P0-AUDIT-VIZ-FIRST`) surfaced the tribal hits *"Error-Learn Ledger"* and *"error-learn-ledger"* on the FIRST Write of my proposed `error-pattern-capture.mjs`. The first draft was a full duplicate. The tribal hits caught it; I pivoted to an additive extension. **System-viz-first / tribal-first audit doctrine ([[feedback_system_viz_first_audit]]) saved a hard-block duplication-guard error and ~30 minutes of wasted token spend on a duplicate ledger + duplicate API.**

The error-learn-loop's value compounds: the extension's `fork-storm` detector captured 3 events in this same session (Cygwin OOM during /audit-viz-first dogfood query); next chat hitting a similar Bash spawn will see the prewarn hint to run `node-process-janitor` instead of retrying blindly.

## Promotion path

The full path for a recurring error:
1. `error-pattern-capture` or `error-block-capture` writes a ledger entry on each occurrence.
2. `recordEvent` mirrors to Qdrant via the unified-ledger MCP action.
3. On the next similar PreToolUse, `error-block-prewarn` surfaces the past entry as advisory context.
4. After ≥3 occurrences, `/error-learn-review` proposes a warn-only hook DRAFT.
5. After human review, the DRAFT can be wired into `settings.json` as a soft-warn PreToolUse hook (`learned: true` in metadata).
6. Hard-blocks are NEVER auto-generated — that gate is human-authored only.

## Files (this session's ship)

- Added: `.claude/hooks/error-pattern-capture.mjs` (T2 PostToolUse, extends existing capture coverage)
- Wired: PostToolUse[9] in BOTH `C:/Users/Mark Villanueva/.claude/settings.json` AND auto-mirrored to `H:/.claude/settings.json` via c-to-h-mirror (matcher `Bash|Edit|MultiEdit|Grep|Glob`, timeout 3000ms)
- Untouched: `error-block-capture.mjs`, `error-block-prewarn.mjs`, `error-learn-store.mjs` (load-bearing, kept stable)

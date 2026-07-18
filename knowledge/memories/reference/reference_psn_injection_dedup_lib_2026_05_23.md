---
name: psn-injection-dedup-lib-2026-05-23
description: "TOKEN-SAVINGS-EXPAND/U-PSN-INJECTION-DEDUP-LIB — pure-function injection-dedup lib (hashBlock, shouldEmit, recordEmit, formatDedupedMarker, pruneExpired) — 17/17 tests — committed on slot/alpha 8b3f86f55c, not main tree"
aliases: reference_psn_injection_dedup_lib_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.131Z
---


2026-05-23 alpha /loop (Goal #8 — "commit to alpha work tree" directive).

UserPromptSubmit hooks fire ~14-16 context blocks per prompt. Many are byte-identical to prior emissions within the same session (wiki precheck, master-index, memory vault, slot soul). A single existing `goal-prereq-inject` already proves the pattern works in production ("loop-context dedup — block unchanged since prior prompt"). This lib **generalizes** that pattern so every hook can adopt it cheaply via 3 lines of glue.

**Lib: `scripts/lib/injection-dedup.mjs` (alpha worktree, 96 lines, 5 exports + 2 constants):**
- `hashBlock(text)` — 16-char SHA-256 hex digest. Trailing whitespace stripped; 4 KB input cap (cheap large-block guard); null on empty/non-string.
- `shouldEmit(cache, hookTag, hash, now, ttlMs=60_000)` → `{ emit, reason, lastSeenAt }`. Fresh / expired / missing key → emit. Within-TTL match → dedup. `ttlMs=0` disables.
- `recordEmit(cache, hookTag, hash, now)` — immutable spread; returns NEW cache.
- `formatDedupedMarker(hookTag)` — `🔁 [<tag>] dedup — block unchanged since prior prompt this session; not re-injected (token-save).` Matches fleet style.
- `pruneExpired(cache, now, ttlMs)` — GC stale entries.

Pure functions, **no FS I/O** — sidecar persistence is the caller's concern. Adopter hooks wire their own sidecar (e.g., `state/shared/dashboards/injection-dedup-cache.json`) so the lib stays unit-testable.

**Tests: 17/17 via `node --test`** (`scripts/__tests__/injection-dedup.test.mjs`). Covers identity, isolation by hookTag, TTL boundaries (fresh/within/past/disabled), immutability, null-safety, formatter contract, prune.

**Commit-attribution this iter:** Goal #8 added the constraint "commit to alpha work tree" — broke the 2026-05-23 silent-sweep pattern where 6 prior files were absorbed into peer `ffa7789cd8` (charlie U-AUDIT-R2). Switching to `H:/prism-slot-alpha` (`slot/alpha` branch) isolated the commit. Result: `8b3f86f55c` — clean alpha-tree commit, no peer absorption.

**Adopters live (2026-05-23, this same session, alpha commits c46a7d5537 + 4acc0dd927):**
- `slot-soul-inject.mjs` — 5-min TTL on the 2 KB Hermes soul block
- `prompt-rules-inject.mjs` (slash path) — 10-min TTL on the 500 B `## ★ Slash-command execution rules` block (was un-rate-limited; smoke-test confirms dedup marker emits on 2nd-identical-call within window)
- `stop-session-spend-summary.mjs` — N2 sibling adopter: per-hook budget guard using `stop-hook-timeout-budget.mjs` `shouldRunHook(selfBudget)` (800 ms ceiling)

**Open follow-up:** central UserPromptSubmit pre-hook that wraps the AGGREGATE injected text via `capAdditionalContext` from `hook-output-helpers.mjs` — N5. Defer until sidecar growth is bounded.

**Slot-worktree note:** alpha worktree at `H:/prism-slot-alpha` was correctly resolved via `git worktree list | grep slot-alpha` (also `slot/bravo` and `slot/charlie` listed, confirming SLOT-WORKTREE-MS0 cutover already complete for these slots). Per CLAUDE.md §[[reference_session_continuity_stack_2026_05_15|SESSION CONTINUITY STACK]], `worktree-commit-route` hook is supposed to auto-route — but staging via `git -C H:/prism-slot-alpha add` + `commit -m` skipped any ambiguity. Pattern for future "commit to <slot> work tree" goals: use `git -C H:/prism-slot-<slot>` directly.

Linked: [[reference_psn_hook_stop_helpers_2026_05_23]] (S2/S4 prior iter), [[feedback_conflict_fork_rule]] (fork doctrine), [[feedback_commit_prefix_main_on_shared_tree]] (the `[MAIN]` prefix that does NOT apply on slot branches — alpha-tree commits get `[ALPHA]`).

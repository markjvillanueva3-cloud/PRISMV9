---
name: reference-u-stop-hook-aggregator-2026-05-20
description: "U-STOP-HOOK-AGGREGATOR (H8 of SYSTEM-SYNERGY-AUDIT) shipped 2026-05-20 by echo (claude-4278393c) — Stop hook + pure-core lib + 37-case test suite + wiring. Records observational session-end state to state/shared/stop-hook-ledger.jsonl"
aliases: reference_u_stop_hook_aggregator_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.023Z
---


H8 of [[audit-system-synergy-2026-05-09]] shipped: `stop-hook-aggregator` records observable session-end state (sessionId, slot/chatId/branch/topic, dirty/staged/untracked counts, commits-last-hour, stop_hook_active) to a shared JSONL ledger at `state/shared/stop-hook-ledger.jsonl`. Feeds downstream audit/forge tooling that needs a time-series of session exits without trawling per-chat transcripts.

**Honest scope (R12):** the synergy-audit prose framed H8 as "PASS/FAIL per hook" — that framing is unimplementable against Claude Code's hook model (a Stop subprocess cannot read its sibling Stop hooks' exit codes; each runs independently). This implementation records what IS visible at Stop time: git state + slot binding + transcript metadata. The same downstream question (what was the session's exit state?) is answered without inventing visibility the harness doesn't grant.

**Pure-core + injected-IO pattern** (per R8 + the recurring "hermetic fakes don't prove production wiring" lesson from `reference_u_p0_u02_recovery_2026_05_18.md`):
- `scripts/lib/stop-hook-aggregator-lib.mjs` — 5 pure exports (`shouldThrottle`, `buildLedgerEntry`, `serializeLedgerLine`, `parseGitStatusPorcelainZ`, `parseCommitsLastHour`, `readLastEntryAtMs`) + `__test_constants` for hermetic verification
- `scripts/lib/stop-hook-aggregator-lib.test.mjs` — 37 `node:test` cases including: throttle bounds + clock-skew (future-dated → stale), control-char strip, length-truncate, all-null defaults, JSONL line size cap + newline guard, porcelain Z-format parsing, commits-window edge cases, last-entry-time newest-first scan with corrupt-line tolerance
- `.claude/hooks/stop-hook-aggregator.mjs` — IO layer (~140 LOC). Reads stdin Stop event, tails last 8KB of ledger to find prior entry, runs `git status --porcelain=v1 -z` (newline-safe) + `git log -32 --format=%ct` (4s timeout), assembles entry via the pure builder, atomic `appendFileSync`. Always emits `{continue:true,suppressOutput:true}` — never blocks Stop.

**Wiring:** position 49 (last) in Stop chain 0 of `C:/Users/wompu/.claude/settings.json` (auto-mirrored to H: by c-to-h-mirror); 5000ms timeout. Live-fire smoke verified: real Stop event from this echo session produced one ledger entry with slot=echo, chatId=claude-4278393c, branch=cad-fusion-live-ms0, topic=echo-work, git={dirtyCount:16683, stagedCount:0, untrackedCount:11530, commitsLastHour:5}.

**Knobs:** `PRISM_STOP_HOOK_AGGREGATOR_DISABLE=1` (off entirely), `PRISM_STOP_HOOK_AGGREGATOR_THROTTLE_MS=N` (default 60000ms; bounded by 1s floor + 24h ceiling).

**Safety properties:**
- 8KB line-size cap with newline guard (`serializeLedgerLine` throws → hook silent no-ops)
- Per-session throttle (default 60s) with clock-skew tolerance (future-dated lastEntryAt treated as stale)
- Control-char strip on all string fields (NUL/CR/LF cannot corrupt the JSONL stream)
- Ledger write failure (full disk, locked file) is fail-soft — Stop chain unaffected

**Pattern reuse:** mirrors the structure of `stop-cross-tree-collision-advisory.mjs` (advisory + throttle + slot-aware) and `stop-memory-size-watchdog.mjs` (Stop-time observer with stamp throttle). Both were the references read first per R8.

Related:
- [[audit-system-synergy-2026-05-09]] — parent audit + the 60-✗-cell synergy gap
- [[stop-cross-tree-collision-advisory]] + [[stop-memory-size-watchdog]] — sibling Stop observers
- [[hook-lifecycle-anatomy]] + [[feedback_hook_process_hygiene]] — model + exit-fast doctrine
- [[feedback_always_close_out]] — 4-surface close-out (wiki + memory + spec + commit)
- Sister Track-H unit shipped 2026-05-20: [[reference_u_precommit_pathspec_only_closeout_2026_05_20]]

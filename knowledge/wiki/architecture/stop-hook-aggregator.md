---
title: stop-hook-aggregator
type: architecture
unit: U-STOP-HOOK-AGGREGATOR
milestone: SYNERGY-AUDIT-CONTINUE
created: 2026-05-20
owner: echo
---

# stop-hook-aggregator

Stop hook that appends one structured line per session-Stop to a shared JSONL ledger at `state/shared/stop-hook-ledger.jsonl`. Closes H8 of [[audit-system-synergy-2026-05-09]] — the synergy edge between Stop-time observability and downstream audit/forge tooling.

## What it records

Per Stop event, one JSON line with:

| Field | Source |
|-------|--------|
| `v` | schema version (1) |
| `ts` | ISO-8601 UTC |
| `sessionId` | `stopEvent.session_id` |
| `stopHookActive` | `stopEvent.stop_hook_active` |
| `slot` / `chatId` / `branch` / `topic` | resolved from `state/shared/chat-slots.json` via session-id 8-hex prefix |
| `cwd` / `transcriptPath` | from `stopEvent` |
| `git.dirtyCount` / `stagedCount` / `untrackedCount` | from `git status --porcelain=v1 -z` |
| `git.commitsLastHour` | from `git log -32 --format=%ct` |

## Honest scope (R12)

A Stop subprocess **cannot** read sibling Stop hooks' exit codes — every hook in the Stop chain runs as an independent process invoked by the Claude Code harness. The synergy-audit prose framed H8 as "PASS/FAIL per hook"; that framing is unimplementable against the harness model. This hook records what IS visible at Stop time: git state + slot binding + transcript metadata.

The same downstream question (what was the session's exit state?) is answered without inventing visibility the harness doesn't grant.

## Pipeline

```
Claude Code Stop event
    ↓ stdin JSON
stop-hook-aggregator.mjs
    ↓ readLedgerTail (8KB) → readLastEntryAtMs → shouldThrottle (60s default)
    ↓ findSlotInfo (chat-slots.json)
    ↓ runGit status + log → parseGitStatusPorcelainZ + parseCommitsLastHour
    ↓ buildLedgerEntry (pure)
    ↓ serializeLedgerLine (pure, 8KB cap + newline guard)
    ↓ fs.appendFileSync
state/shared/stop-hook-ledger.jsonl
```

## Safety

- **Always exit 0** — never blocks Stop. The `SILENCE` payload is `{continue:true, suppressOutput:true}`.
- **Per-session throttle (60s default)** — one entry per session per minute. Bounded by `MIN_THROTTLE_MS=1s` floor and `MAX_THROTTLE_MS=24h` ceiling.
- **Control-char strip + length truncate** — every string field passes through `sanitize()` to prevent JSONL line-corruption from raw `\n` / `\r` / NUL bytes in cwd or topic.
- **8KB line cap** — `serializeLedgerLine` throws if the result would corrupt the JSONL stream. Hook catches → silent no-op.
- **Fail-soft** — ledger write failure (full disk, locked file) does NOT break the Stop chain. The hook always emits `SILENCE`.
- **Future-dated `lastEntryAtMs` treated as stale** — clock-skew or corrupt-ledger inputs do NOT cause forever-throttle.

## Knobs

- `PRISM_STOP_HOOK_AGGREGATOR_DISABLE=1` — off entirely
- `PRISM_STOP_HOOK_AGGREGATOR_THROTTLE_MS=N` — throttle ms (default 60000)

## Wiring

Position 49 (last) in Stop chain 0 of `C:/Users/wompu/.claude/settings.json`. Auto-mirrored to `H:/.claude/settings.json` by the `c-to-h-mirror` hook. Timeout 5000ms.

## Files

- `scripts/lib/stop-hook-aggregator-lib.mjs` — pure-core (5 named exports + `__test_constants`)
- `scripts/lib/stop-hook-aggregator-lib.test.mjs` — node:test, 37 cases, hermetic
- `.claude/hooks/stop-hook-aggregator.mjs` — Stop hook (IO layer, ~140 LOC)
- `state/shared/stop-hook-ledger.jsonl` — append-only data (created on first fire)

## Related

- [[audit-system-synergy-2026-05-09]] — the parent audit (H8 finding)
- [[stop-cross-tree-collision-advisory]] — sibling Stop advisory
- [[stop-memory-size-watchdog]] — sibling Stop observer
- [[hook-lifecycle-anatomy]] — Claude Code hook model
- [[feedback_hook_process_hygiene]] — exit-fast doctrine the hook respects

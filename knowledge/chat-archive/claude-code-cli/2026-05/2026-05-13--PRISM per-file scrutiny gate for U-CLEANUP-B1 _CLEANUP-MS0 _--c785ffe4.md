---
type: "chat-session"
source: "claude-code-cli"
session_id: "c785ffe4-cff7-477e-b466-ab1899a5842e"
title: "PRISM per-file scrutiny gate for U-CLEANUP-B1 (CLEANUP-MS0 / GOLF-WATCHDOG). Two"
date: "2026-05-13"
first_ts: "2026-05-13T16:45:20.298Z"
last_ts: "2026-05-13T16:46:21.487Z"
cwd: "H:\\prism"
messages: 7
user_msgs: 3
assistant_msgs: 4
raw_file: "H:/.claude/projects/H--prism/c785ffe4-cff7-477e-b466-ab1899a5842e/subagents/agent-a90240c1b6f725608.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:26"
---

# PRISM per-file scrutiny gate for U-CLEANUP-B1 (CLEANUP-MS0 / GOLF-WATCHDOG). Two

> **claude-code-cli** | 2026-05-13 | 7 msgs (3 user / 4 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c785ffe4-cff7-477e-b466-ab1899a5842e/subagents/agent-a90240c1b6f725608.jsonl`

## Transcript

### User | 2026-05-13T16:45:20.298Z

PRISM per-file scrutiny gate for U-CLEANUP-B1 (CLEANUP-MS0 / GOLF-WATCHDOG). Two files:

1. `H:/prism/mcp-server/src/engines/PeerCommitAuditorEngine.ts` — detects new peer commits, dedupes via 5-min TTL cache, emits chat_bus_signals + peer_audit_ticks rows. Consumes B3 (git-log-tail.mjs) for polling + B10 (LedgerStoreEngine) for persistence. Renamed from WatchdogEngine per R1-B2 to avoid collision with `.claude/hooks/tool-watchdog.mjs`. Exports `PeerCommitAuditorEngine` class, `peerCommitAuditorEngine` singleton, `tickFromCli()` CLI entrypoint, `getPeerCommitAuditorEngine()` accessor.
2. `H:/prism/mcp-server/src/__tests__/peerCommitAuditorEngine.test.ts` — 16 tests GREEN.

Spec: `H:/prism/state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md` §R1-B1, §R1-B2.

CRITICAL DETAILS:
- `tick()` opens a `peer_audit_ticks` row FIRST (status='running'), polls git, processes commits, then `finishAuditTick({status:'complete'|'failed'|'aborted'})`. Tick row exists even if poll fails (breadcrumb).
- `signal_id = peer-audit:<tickId>:<full-sha>` (changed from sha.slice(0,12) → full sha; full 160-bit collision domain).
- Cache at `state/shared/.peer-audit-cache.json` — schema v1, atomic tmp+rename writes, MAX_CACHE_ENTRIES=5000.
- `loadLastPollIso` / `saveLastPollIso` are injectable for tests (default → ../../../.claude/helpers/git-log-tail.mjs).
- CLI `tickFromCli()` parses argv, runs tick(), writes JSON to stdout, exits 0/2/3 by status.
- DEFAULT_EXCLUDE_AUTHORS = ['golf-watchdog-bot', 'golf-watchdog'] (self-attribution defense).
- MAX_COMMITS_PER_TICK = 200 hard cap per cron run.

Weight your review on:

1. **Cron crashloop risk** — if every cron tick fires `tick()` and the SAME tickId is generated twice (collision in `defaultTickId`), the UNIQUE constraint on `peer_audit_ticks.tick_id` throws. The engine catches it via `makeAbortedResult` but returns `aborted`. Tick row from the FIRST tick stays at status='running' forever. Stale-tick reaper? Currently none. Is this acceptable?

2.
... [+3139 chars truncated]

### Assistant | 2026-05-13T16:45:33.774Z

I'll review both files end-to-end against the spec and concerns raised.

### Assistant | 2026-05-13T16:45:34.172Z

[tool_use: Read]

### Assistant | 2026-05-13T16:45:34.548Z

[tool_use: Read]

### User | 2026-05-13T16:45:38.471Z

[tool_result] 1	/**
2	 * PeerCommitAuditorEngine — CLEANUP-MS0 / U-CLEANUP-B1
3	 *
4	 * Detects new peer-chat commits in the shared repo and ENQUEUES them for
5	 * downstream review (B4 commit-reviewer-dispatch). Does NOT run the review
6	 * itself — its job is "this commit warrants review" + signal emission +
7	 * ledger logging. The dispatch + actual review live downstream of B11/B2.
8	 *
9	 * RENAMED from Wa
... [+19560 chars truncated]

### User | 2026-05-13T16:45:39.542Z

[tool_result] 1	/**
2	 * peerCommitAuditorEngine.test.ts — U-CLEANUP-B1
3	 *
4	 * Coverage:
5	 *   - Happy path: new commit → ledger row, signal, cache update, lastTickIso advance.
6	 *   - Dedupe: re-tick within TTL → commit skipped, no second signal.
7	 *   - Excluded authors filter (golf-watchdog-bot self-attribution).
8	 *   - Poll error surfaces in TickResult; tick row marked status=failed.
9	 *   - Lock-r
... [+19156 chars truncated]

### Assistant | 2026-05-13T16:46:21.487Z

## Per-File Scrutiny Review — U-CLEANUP-B1

### Findings

**P0 (none)**

**P1 — Stale `running` rows on collision** | `PeerCommitAuditorEngine.ts:174-189` | UNIQUE collision on `peer_audit_ticks.tick_id` (test L344-354 proves this path) catches in `makeAbortedResult` but the *original* tick row with `status='running'` is owned by the *previous* invocation that succeeded — that's fine. However, if `tick()` throws BETWEEN the insert (L174) and `finishTick` (L302/L215), the row stays `running` forever. No reaper exists. **Fix:** wrap the body in `try/finally` calling `finishTick(tickId, queued.length, 'aborted', 'unhandled')` if neither success nor explicit-fail path ran. Or ship a B-side reaper that marks `started_at < now-5min AND status='running'` → `aborted`. Concern #1 + #6 collapse into this.

**P1 — Signal queue has no cap / TTL** | `PeerCommitAuditorEngine.ts:239-260` | Concern #5 is real. Cache corruption (#4) or a B4 stall causes unbounded `chat_bus_signals` growth. With 200/tick × 60/hr = 12k rows/hr. The engine respects `MAX_COMMITS_PER_TICK=200` per tick but the **table itself** is unbounded. **Fix:** add a sibling pre-insert query `SELECT COUNT(*) FROM chat_bus_signals WHERE consumed_at IS NULL`. If > threshold (e.g. 10k), emit a single `peer_audit_backpressure` signal and short-circuit further inserts this tick. Or document this as B4's responsibility and add a `signalsBackpressureCount` field to `TickResult` so dashboards surface it.

**P2 — Cache corruption → signal flood** | `PeerCommitAuditorEngine.ts:308-335` | Concern #4 — graceful reset proven (L284-302) but a wiped cache *plus* a fresh `lastTickIso` of `null` cascades through L165-168 to the 1-hour fallback. On a busy fleet, 1h ≈ 60+ commits all re-emitted as "new". **Fix:** when `loadCache()` falls into the `catch` branch (vs the genuinely-empty `existsSync==false` path), preserve `lastTickIso` via a sidecar or write a `.peer-audit-cache.json.last` heartbeat. Or shorten `MIN_SINCE_HOURS_FALLBACK
... [+4199 chars truncated]

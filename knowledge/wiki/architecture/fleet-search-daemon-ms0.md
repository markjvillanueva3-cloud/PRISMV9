---
title: FLEET-SEARCH-DAEMON-MS0 — warm persistent master-index search daemon
type: architecture
status: built (durable activation operator-gated)
slot: tango
created: 2026-06-14
commits: [6da1246aa7, 1ab1f6644f]
tags: [search, master-index, daemon, oom, sidecar, subagent, performance]
---

# FLEET-SEARCH-DAEMON-MS0

## Problem

`master-index-search-lib.mjs` searches the ~745MB `system-graph.json` via a
cap-safe streaming reader. To make that fast it builds a **262MB sidecar**
(`system-graph-index.json`) — but the sidecar is **DEAD fleet-wide**: hooks run
at a ~384MB heap (≈432MB `heap_size_limit`), and the lib's sidecar parse ceiling
is 35% of heap (≈151MB). A 262MB sidecar exceeds that ceiling, so **every hook
and every consumer rejects it** and falls back to either the 59MB
architecture-graph (partial coverage) or a slow streaming pass. The expensive
index artifact exists on disk and is never used.

Root constraint: the consumers are **memory-starved short-lived processes**. The
sidecar is only usable by a process with a **big heap that stays alive** long
enough to amortize the load.

## Solution — host the warm index in a long-lived big-heap daemon

`scripts/master-index-daemon.mjs` is a long-lived HTTP daemon on
`127.0.0.1:3101` (`PRISM_INDEX_DAEMON_PORT`) launched with a large heap
(`--max-old-space-size=2048`). It loads the full graph + 262MB sidecar **once**
at startup (warm-up search in the listen callback), then answers queries from
the warm in-memory index:

- `GET /health` → `{status, pid, uptimeSec, searchCount, lastSearchMs, indexWarm}`
- `GET /search?q=<query>&k=<n>` → `{ok, tokens, hits}` (BM25-lite master-index)
- `GET /tribal?q=<query>&k=<n>` → `{ok, tokens, hits}` (tribal-embed-index)

Calls `runMasterIndexSearch` / `runTribalSearch` from the shared lib — same
ranking the consumers would get, but with the sidecar **actually loaded**.

Anti-recursion: the daemon sets `PRISM_INDEX_DAEMON_SELF=1` +
`PRISM_SIDECAR_MAX_BYTES=1GB` at the top of its own process so the lib it imports
(a) raises its sidecar ceiling for this big-heap process and (b) never tries to
call back into a daemon (itself). Single-instance via
`server.on("error", EADDRINUSE → exit 0)`.

Live: warm-up 2133ms, `/search` 82ms, pid 38976, 10.5h uptime, `indexWarm:true`.

## Client seam (U-DAEMON-WIRE)

Consumers are split async vs sync:

- **async** — `searchViaDaemon(query, opts)` + `masterIndexSearch` (daemon-first,
  `source` provenance). Fail-soft `null` on every miss; 250ms timeout; 8MB cap;
  anti-recursion via `PRISM_INDEX_DAEMON_SELF`.
- **sync** — `searchViaDaemonSync(query, opts)` + `masterIndexSearchSync`. Sync
  consumers cannot `await`, so this uses **one short `curl` spawn**
  (`execFileSync("curl", ["-s", "--max-time", <sec>, url])`, 16MB `maxBuffer`,
  bounded timeout). Returns `{tokens, hits}` on a fresh hit or `null` on ANY miss.
  Only worth it for **infrequent** consumers (subagent spawn, on-demand scripts) —
  NEVER a per-turn/per-tool hot path.

`runMasterIndexSearch` is **unchanged** (backward-compat) — both `*Search` /
`*SearchSync` are daemon-first wrappers over the existing in-process path.

### First wired consumer — subagent pre-search

`scripts/agents/spawned-agent-context-lib.mjs::runPerTaskSearches` gets an
**opt-in** daemon path (`PRISM_SUBAGENT_DAEMON_SEARCH=1`). The in-process
master-index + tribal searches there are gated OFF fleet-wide
(`PRISM_MASTER_INDEX_INJECT=0`) precisely because they OOM at the spawn heap.
The daemon path gives **full-coverage** subagent pre-search with **NO local graph
load**, lifting that OOM gate. Zero cost when off (the default); clean fallback
to the gated in-process path on a daemon miss.

### Hot per-tool consumers (U-DAEMON-HOTHOOKS)

The four `pre-{read,write,grep,bash}-graph-inject.mjs` PreToolUse hooks fire on
EVERY Read/Write/Grep/Bash across the fleet. They were each spawned fresh per
tool call and ran an **in-process** `runMasterIndexSearch` — which at the 384MB
hook heap **rejects the 262MB sidecar** and streams the 745MB graph / falls to
the 59MB partial. Measured fresh latency: multi-second.

Wired to the **async** `searchViaDaemon` (node http, **zero extra spawn** — the
sync curl seam would add a `curl.exe` per tool call and worsen the fork-storm).
`main()` in all four is already async, so awaiting is free; `renderInject` uses
only fields `/search` returns, so there is **no downstream decorate** (the trap
that made `master-index-precheck-inject` net-negative and got it reverted).

Result (pre-read, distinct sessions to bypass the hook's own dedup): **463ms avg,
5/5 reliable, 3 full-coverage hits each**. Daemon-down stays fast (instant
ECONNREFUSED → in-process). `daemonTimeoutMs:400` gives a healthy daemon room
(it serves 82-150ms). `PRISM_INDEX_DAEMON_DISABLE=1` reverts all four fleet-wide.

Reproducible recipe: `scripts/wire-graph-inject-hooks-to-daemon.mjs` (idempotent,
count-verified edits + per-file `node --check` + auto-revert; `--dry`/`--revert`).

**Measurement lesson (load-bearing):** the graph-inject hooks have a per-(session,
file) dedup (U-PRGI-DEDUP) — re-running the SAME session_id+file emits a dedup
marker (no hits) on calls 2..N. A naive 5-run timing loop with one session_id
reads "1/5 hits" and looks flaky; it is dedup working as designed. ALWAYS use
distinct session_ids per run when measuring these hooks' hit-rate.

## Durable activation (operator-gated)

`.claude/helpers/install-index-daemon-task.ps1` registers a `PRISM Index Daemon`
Windows scheduled task (`--max-old-space-size=2048`, AtStartup+AtLogon+5min
repeat, SYSTEM principal, single-instance preflight, ASCII-clean). Needs ONE
elevated run:

```
! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-index-daemon-task.ps1 -RunNow
```

Until then the daemon is alive as a manually-launched process (pid 38976) but not
self-healing across reboot.

## Reaper protection

`master-index-daemon` is in `_MCP_PROTECT_REGEX` (`fleet-reaper-sweep.mjs`) and
`PROTECTED_PATTERNS` (`process-slot-map.mjs`) so the fleet reaper never kills it
as an orphan.

## Test deadlock lesson (committed in the test file)

`searchViaDaemonSync` uses **synchronous** `execFileSync('curl')`, which blocks
the calling process's event loop. An **in-process stub HTTP server** (same
process) therefore **cannot serve that curl** — its event loop is blocked → the
request hangs → null. The happy-path test MUST use a **separate-process** stub
server (the suite spawns a child `node -e` http server, reads its port from
stdout, then runs the sync curl against it). The miss-path tests
(disabled/self/empty/refused) don't need a server and run fast. 19/19 green.

## Knobs

- `PRISM_INDEX_DAEMON_PORT` (default 3101) · `PRISM_INDEX_DAEMON_HOST` (127.0.0.1)
- `PRISM_INDEX_DAEMON_DISABLE=1` (client never contacts daemon)
- `PRISM_INDEX_DAEMON_SELF=1` (set BY the daemon — anti-recursion)
- `PRISM_SIDECAR_MAX_BYTES` (daemon raises to 1GB for its big heap)
- `PRISM_SUBAGENT_DAEMON_SEARCH=1` (opt-in subagent daemon pre-search)

## Files

- `scripts/master-index-daemon.mjs` — the daemon
- `scripts/lib/master-index-search-lib.mjs` — `searchViaDaemon{,Sync}` + `masterIndexSearch{,Sync}`
- `scripts/lib/master-index-search-lib.daemon.test.mjs` — 19 client-seam tests
- `.claude/helpers/install-index-daemon-task.ps1` — durable scheduled-task installer
- `scripts/fleet-reaper-sweep.mjs` + `.claude/helpers/process-slot-map.mjs` — reaper protection

## Memory

[[reference_fleet_search_daemon_ms0_2026_06_14]]

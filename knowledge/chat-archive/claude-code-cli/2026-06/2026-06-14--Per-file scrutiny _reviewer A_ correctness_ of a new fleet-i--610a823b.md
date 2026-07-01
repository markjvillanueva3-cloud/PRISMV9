---
type: "chat-session"
source: "claude-code-cli"
session_id: "610a823b-dfea-4855-b749-16661916b5fa"
title: "Per-file scrutiny (reviewer A, correctness) of a new fleet-infrastructure featur"
date: "2026-06-14"
first_ts: "2026-06-14T06:03:57.181Z"
last_ts: "2026-06-14T06:03:58.517Z"
cwd: "H:\\prism-slot-tango"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism-slot-tango/610a823b-dfea-4855-b749-16661916b5fa/subagents/agent-acf552af6d10d88a7.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:12"
---

# Per-file scrutiny (reviewer A, correctness) of a new fleet-infrastructure featur

> **claude-code-cli** | 2026-06-14 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism-slot-tango
> Raw: `H:/.claude/projects/H--prism-slot-tango/610a823b-dfea-4855-b749-16661916b5fa/subagents/agent-acf552af6d10d88a7.jsonl`

## Transcript

### User | 2026-06-14T06:03:57.181Z

Per-file scrutiny (reviewer A, correctness) of a new fleet-infrastructure feature. Read END-TO-END:
- H:/prism/scripts/master-index-daemon.mjs  (a new long-lived HTTP search daemon)
- H:/prism/scripts/lib/master-index-search-lib.mjs  — ONLY the new additions: the `searchViaDaemon` + `masterIndexSearch` functions + the DAEMON_DEFAULT_* consts + the `import http` (search for "FLEET-SEARCH-DAEMON-MS0"). Do NOT review the rest of that 700-line lib.
- H:/prism/scripts/lib/master-index-search-lib.daemon.test.mjs  (14-test seam suite, all passing)

WHAT IT DOES: the 262MB search sidecar is rejected by the 384MB per-hook heap cap, so every fleet search degrades to a 59MB graph. The daemon parses the full 262MB sidecar ONCE (big heap, --max-old-space-size=2048) into master-index-search-lib's process-lifetime cache, then serves fast full-coverage search over http://127.0.0.1:3101. searchViaDaemon lets consumers prefer the warm daemon and fall back to in-process when it's down. VERIFIED LIVE: daemon warms in 2133ms, serves /search in ~82ms; seam returns source:daemon when up, source:in-process (degraded 59MB) when down, null in 1ms when refused.

VERIFY (flag P0=will-break-prod/security, P1=real bug/gap):
1. FAIL-SOFT: can the daemon CRASH on a bad request (malformed URL, huge query, missing params, non-GET)? Trace every handler path. A daemon crash drops the fleet's warm index. Is uncaughtException/unhandledRejection kept-alive?
2. SINGLE-INSTANCE: the preflight is `server.on("error", EADDRINUSE -> exit 0)`. Is that correct (vs a separate net.probe)? Could two daemons both bind? Could a non-EADDRINUSE error wrongly exit 1 and the repeating task thrash?
3. ANTI-RECURSION: the daemon sets PRISM_INDEX_DAEMON_SELF=1; searchViaDaemon returns null when that's set. Confirm the daemon's own internal runMasterIndexSearch calls CANNOT loop back out to the daemon. Is the env set BEFORE any search runs?
4. searchViaDaemon FAIL-SOFT: it must resolve null (never reject/throw) on every miss
... [+1279 chars truncated]

### Assistant | 2026-06-14T06:03:58.517Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited

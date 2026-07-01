---
title: MCP Auto-Reconnect (MCP-AUTORECONNECT-MS0)
type: architecture
status: shipped
owner: alpha (token-optimization / fleet-reliability)
created: 2026-05-31
tags: [mcp, connectivity, fleet, self-healing, single-flight, reliability]
---

# MCP Auto-Reconnect — fleet self-heals MCP connectivity each turn

Operator rule (2026-05-31): *"if any chat slot is disconnected they automatically connect and
check each turn to ensure you guys are always connected. enforce it somehow."*

The shared MCP daemon (`http://127.0.0.1:3100`) is the execution surface for every
`mcp__prism__*` tool call across the up-to-26-chat fleet. When it dies **mid-session**, every chat
silently degrades — tool calls fail, the chat wastes turns. This milestone makes the fleet
self-heal: each turn, any chat that detects the daemon down auto-restarts it, single-flighted so
the fleet never spawn-storms.

## The gap it closes (R8 — three neighbors already existed)
| Hook | Event | Did | Gap |
|------|-------|-----|-----|
| `mcp-connectivity-check.mjs` | UserPromptSubmit (every turn, throttled 30s) | probes `/health`, injects the loud "🛑 MCP SERVER DISCONNECTED" banner | **advised only — never reconnected** |
| `mcp-daemon-autostart.mjs` | SessionStart only | health-check + spawn `mcp-server-daemon.mjs start` | **does not run per-turn** |
| `mcp-broadcast-reconnect-inject.mjs` | UserPromptSubmit | surfaces a `/mcp` nudge on a fleet broadcast signal | advisory |

→ Nothing reconnected the daemon **mid-session, each turn**. This milestone adds the missing
**ACTION** half and wires it into the already-per-turn connectivity hook.

## Design
- **`scripts/lib/mcp-reconnect-action.mjs`** — pure-core + injected-deps + fail-soft (mirrors
  `mcp-connectivity-check.mjs` + `path-ledger.mjs` for R11):
  - `decideReconnect({up, now, lock, ttlMs})` — pure single-flight/throttle decision. Lock age <
    TTL → `reconnect-in-flight` skip; age ≥ TTL → `stale-lock-reclaim`; future-dated (clock skew)
    → defer (safe direction); no lock → reconnect.
  - `acquireReconnectLock(path, info, {reclaimStale})` — O_EXCL (`flag:"wx"`) single-flight; the
    create IS the check (kernel-atomic), so 26 racing chats yield exactly one winner. Reclaims a
    stale lock once if asked.
  - `spawnDaemon(helper)` — DETACHED `node <helper> start` (mirrors `mcp-daemon-autostart` exactly).
    Honest R12: missing helper → `{spawned:false, reason:"daemon-helper-missing"}`, no fake success.
  - `maybeReconnect({up|ok, ...})` — the orchestrator the hook calls. **Accepts both `up` and `ok`**
    (the connectivity hook's probe field is `ok`) — defuses the integration seam. NEVER throws.
  - `probeDaemon()` / `renderReconnectLine()` — self-probe (CLI path) + the one-line banner addendum.
- **`scripts/mcp-reconnect.mjs`** — CLI (`--json`, `--probe-only`); directly runnable; always exit 0.
- **Wiring** (golf patch-sibling `HOOK-PATCH-MCP-AUTORECONNECT.md`): a 3-line edit to
  `mcp-connectivity-check.mjs` — when its probe is `ok === false`, call
  `maybeReconnect({ ok: result.ok })` and append `renderReconnectLine` to the banner. **Reuses the
  probe already run** (no double-probe); no settings.json change (the hook is already wired).

## Why the single-flight lock (not the naive re-wire) — R7
Re-wiring `mcp-daemon-autostart.mjs` into UserPromptSubmit would (a) poll up to 5 s synchronously
every down turn and (b) have 26 chats each spawn → spawn-storm + port-bind race. The lib instead:
detached spawn (zero latency) + **O_EXCL lock whose TTL is the throttle** → ≤ 1 daemon spawn per
60s window fleet-wide, independent of chat count or turn cadence. Belt-and-suspenders: the spawn
target `mcp-server-daemon.mjs start` is itself port-bind-idempotent (a 2nd layer if O_EXCL ever fails).

## Lock lifecycle (verified no-deadlock, scrutiny arm-B)
The lock is a **throttle stamp, not a held mutex** — acquired, never explicitly released. A failed
spawn self-heals: the abandoned lock ages past TTL → next down-turn classifies it `stale-lock-reclaim`
→ unlink + re-acquire + re-spawn. The banner stays loud throughout (R12). Proven by an end-to-end
real-fs test (write abandoned lock → advance past TTL → real reclaim + spawn).

## Tests / verification
- `scripts/lib/mcp-reconnect-action.test.mjs` — 30 `node:test`: `decideReconnect` table, all
  `maybeReconnect` paths, `ok`/`up` alias, TTL env override, real-fs O_EXCL round-trip, real-fs
  stale-lock self-heal e2e, `probeDaemon` (200/404/503/refused/timeout), CLI subprocess oracle.
- 2-reviewer per-file scrutiny PASS/PASS (arm-A code-analyzer: 0 P0/P1; arm-B reviewer: PASS, 3
  should-fix P1s all applied — `ok` alias + 2 tests).

## Knobs
`PRISM_MCP_AUTORECONNECT_DISABLE=1` (off) · `PRISM_MCP_AUTORECONNECT_TTL_MS=N` (single-flight +
throttle window, default 60000) · `PRISM_MCP_DAEMON_HELPER=<path>` · `PRISM_MCP_URL`.

## Deferred (P2)
- Escalate the "(re)start initiated" banner to a manual-restart hint after K consecutive reclaims
  (sustained daemon-*broken*, not merely stopped — currently retries every TTL, hedged honestly).
- Concurrent two-reclaimer race test at the lock-primitive level (correct by O_EXCL construction).

Memory: [[feedback_mcp_autoreconnect_each_turn]] · siblings: [[fleet-task-health-ms0]] (audits the
scheduled tasks), [[fleet-reaper]] (kills orphans). PSN [[feedback_psn_definition]].

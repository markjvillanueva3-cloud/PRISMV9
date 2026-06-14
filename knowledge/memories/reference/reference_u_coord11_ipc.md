---
name: reference-u-coord11-ipc
description: "COORD-MS0/U-COORD11 — IPC for Hook Queries shipped 2026-05-13 (slot alpha, claude-204054bf, 2 commits 3b36fe5b4 + a2ffc5025, 3-of-3 PASS, 24/24 tests). Named pipe (Win) / UDS (POSIX) RPC server in agent-coordination-daemon.mjs runCommand(). 4 v1 methods. Hooks now have a ~1-2 ms round-trip alternative to file-read+JSON.parse (20-80 ms). Knobs: PRISM_COORD_IPC_DISABLE=1, PRISM_COORD_IPC_TOKEN."
aliases: reference_u_coord11_ipc
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.995Z
---


# U-COORD11 — IPC for Hook Queries

**Shipped:** 2026-05-13, slot alpha, chat `claude-204054bf`.
**Commits:** `3b36fe5b4` (server + client + daemon wire + tests) + `a2ffc5025` (codex-fixup: portable test paths + typed .mjs surface).
**Tests:** 24/24 vitest green. tsc clean.
**Scrutiny:** 3-of-3 PASS — codex 70.9 s + reviewer A holistic + reviewer B independent second-pass.

## Files

| File | LOC | What |
|---|---|---|
| `.claude/helpers/coord-ipc-server.mjs` | 269 | RPC server. NDJSON over named pipe (Win) / UDS (POSIX). |
| `.claude/helpers/coord-ipc-client.mjs` | 162 | `queryDaemon(method, params, opts)` + `isDaemonAlive()` + 3-step fallback. |
| `.claude/helpers/agent-coordination-daemon.mjs` | +60 LOC | Starts IPC in `runCommand()`, shuts down on SIGINT/SIGTERM/SIGHUP/SIGBREAK/uncaughtException/unhandledRejection. |
| `mcp-server/src/__tests__/coordIpc.test.ts` | 391 | 24 tests — round-trip × 4 methods, 50-burst leak check, auth, oversize, malformed, fallbacks, timeout. |

## Wire format

```
request  := { "id": "<str>", "method": "<name>", "params": {...} } "\n"
response := { "id": "<str>", "result": <any> } "\n"
          | { "id": "<str>", "error": "<msg>", "code": "<slug>" } "\n"
```

## v1 methods

| Method | Returns |
|---|---|
| `health` | `{ok, pid, uptime_ms, started_at, version}` |
| `status` | live AGENT_COORDINATION_STATUS.json contents (cached in daemon, refreshed each `update()`) |
| `coord_summary` | live AGENT_COORDINATION_SUMMARY.json contents |
| `active_sessions({window_ms?})` | `[{chatId, lastSeen, slot, branch, topic, agent}, ...]` with optional last-N-ms filter |

Add methods → extend `METHODS` table in `coord-ipc-server.mjs`. Each fn returns JSON-serializable value sync or as Promise.

## Path derivation

```js
import { getIpcPath } from "./coord-ipc-server.mjs";
const path = getIpcPath();  // \\.\pipe\prism-coord-<userhash>  (Win)
                            // ${tmpdir}/prism-coord-<userhash>.sock  (POSIX)
```
Hash includes OS username + optional `tag` so concurrent test runs / sandboxed users get distinct endpoints.

## Hook usage pattern

```js
import { queryDaemon } from "./.claude/helpers/coord-ipc-client.mjs";

const r = await queryDaemon(
  "active_sessions",
  { window_ms: 600_000 },
  {
    timeoutMs: 100,
    fallbackFile: "H:/prism/state/shared/AGENT_COORDINATION_STATUS.json",
    fallback: { agents: [] },
  },
);
// r.source ∈ "ipc" | "fallback-file" | "fallback-value" | "none"
// r.latencyMs (ipc only)
// Never throws — fallback ordering: ipc → file → literal → ok:false
```

## Caps + safety

- **8 KB request cap** (`MAX_REQUEST_BYTES`); kept-alive connections reset bytesReceived to remaining-buffer length after each `\n` so 50 small requests don't trip the cap.
- **5 s idle timeout** (`IDLE_TIMEOUT_MS`); server `safeClose`s the socket.
- **Optional auth** via `PRISM_COORD_IPC_TOKEN` env var. Empty-string is normalized to "no token" (both server + client) — config typo must NOT silently disable auth.
- **Per-call client timeout** (`DEFAULT_TIMEOUT_MS = 200`).

## Knobs

| Env / option | Effect |
|---|---|
| `PRISM_COORD_IPC_DISABLE=1` | Daemon skips IPC startup entirely. Hooks fall back to file reads transparently. |
| `PRISM_COORD_IPC_TOKEN=<secret>` | Both server + client enforce shared-secret. Empty string = disabled. |
| `queryDaemon(..., {path, timeoutMs, token, fallbackFile, fallback})` | Per-call overrides. |

## Performance

- Pipe round-trip on Windows: ~1-2 ms warm (vitest measured `r.latencyMs > 0` consistently sub-5 ms).
- File-read+JSON.parse alternative: ~20-80 ms depending on file size + AV scan.
- 50-burst test: zero leaked connections after `activeConnections === 0` poll completes.

## Deferred follow-ups

- **Duplicate-daemon detection** (reviewer A P1): two daemons on same user/host can silently collide today (POSIX `unlink()` wipes the prior socket; Windows `\\.\pipe\` behavior depends on Node version). Workaround: before `server.listen()`, attempt a 50 ms `health` probe and refuse to start if a daemon is already alive. Track as U-COORD13 if surfaced.
- **Cap on connection count** (cosmetic): currently uncapped; add a 50-conn ceiling if local malicious-process scenario becomes credible.

## Companion to

[[reference_h8_coordination_store]] (SQLite WAL coord store, separate concern — claim-state persistence vs ephemeral hook-query speed).
[[reference_coord_ms0_u4_collision]] (U-COORD04 facade absorbed into peer commit — context for what this builds on).
[[feedback_roadmap_close_out]] / [[feedback_always_close_out]] (close-out discipline applied to this unit's envelope + MILESTONE_PROGRESS + BUILD_STATE regen + chat-bus + memory + CLAUDE.md).

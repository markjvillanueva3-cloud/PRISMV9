---
name: reference-mcp-server-3100-crash-fix-2026-05-22
description: Root-cause + fix for "chat slots exit out of the prism MCP server" — the shared :3100 HTTP MCP server crashed on 2 Node-22 ESM import bugs, and its supervisor scheduled task was un-installable due to a 3rd encoding bug in the installer
aliases: reference_mcp_server_3100_crash_fix_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.206Z
---


# "chat slots exit out of the prism MCP server" — root cause + fix (2026-05-22, slot lima)

User directive: *"fix whatever issue is causing chat slots to exit out of the
prism mcp server. we need to always be connected to it."*

## Architecture (so the next debugger doesn't re-derive it)

`H:/prism/.mcp.json` registers **three** MCP servers:
- **`prism`** — `node .claude/helpers/mcp-http-bridge.mjs` → a stdio→HTTP bridge
  that forwards to a SHARED server at `http://127.0.0.1:3100/mcp`. Built to
  avoid 26 heavy server copies (one instance is ~800 MB-1 GB RSS).
- **`prism_safe`** — `node mcp-server/dist/index.js`, `TRANSPORT=stdio`. A
  direct per-chat stdio server. Self-supervised by Claude Code. **Reliable.**
- **`claude-flow`** — unrelated.

The `prism` (HTTP) path is the flaky one. `prism_safe` (direct stdio) was
never affected — that's the diagnostic tell: if `mcp__prism_safe__*` works
but `prism` drops, the bug is in the HTTP/:3100 path, not the server core.

## Three independent bugs (all had to be fixed)

**BUG 1 — extensionless relative imports → `ERR_MODULE_NOT_FOUND`.**
Node ESM requires a file extension on relative specifiers. 4 source files
imported without `.js`: `toolpathDispatcher.ts → "../toolpathTools"`,
`calculatorProgrammingCatalog.ts → "../shared/calculatorProgrammingCatalogExtensions"`,
`webhook-receiver.ts → "./bot-config"`, `CadBridge.ts → "../constants"`.
`toolpathDispatcher` is **lazy-loaded** (`await import()`), so the server
booted fine then crashed the **first time any `prism_toolpath` action was
called** — taking the shared :3100 server down for all 26 chats at once.
Surfaced in `.claude/cache/mcp-daemon.log`.

**BUG 2 — bare JSON import → `ERR_IMPORT_ATTRIBUTE_MISSING`.**
`calculatorProgrammingCatalog.ts` did `import x from "./x.json"` with no
`with { type: "json" }` attribute. Node 22 enforces import attributes for
JSON. This crashed the **HTTP-transport startup path** (right after OAuth
route registration — a step the stdio path skips, which is *why* `prism_safe`
survived and `:3100` never even bound its port). Surfaced in
`mcp-server/logs/supervisor.log` as `Server startup failed
{"code":"ERR_IMPORT_ATTRIBUTE_MISSING"}`.

**BUG 3 — MCP task installers un-runnable (encoding).**
`install-mcp-server-task.ps1` + `install-mcp-server-watchdog-task.ps1`
contained UTF-8 em-dashes (U+2014) / arrows (U+2192) and were saved
UTF-8-**without-BOM**. Windows PowerShell 5.1 decodes a no-BOM `.ps1` as the
ANSI codepage → the em-dash bytes became garbage → the line-40 `throw`
string literal broke → **both installers failed to parse**. So the
`PRISM MCP Server` supervisor task and `PRISM MCP Watchdog` task could never
be registered — nothing kept :3100 alive across crashes/reboots. Same class
as regression `77c256128`.

## The fix (3 commits, slot lima, branch cad-fusion-live-ms0)

1. `[MCP-CONNECTIVITY-FIX]` — added `.js` to the 4 relative imports +
   `with { type: "json" }` to the JSON import (src + dist patched in
   lockstep — dist is gitignored, so dist edits are local-only and the
   *other PC rebuilds*). TypeScript 5.9.3 supports import attributes.
2. `[MCP-CONNECTIVITY-FIX]` installer commit — ASCII-folded both `.ps1`
   installers (U+2014→`-`, U+2192→`->`). ASCII-only `.ps1` is
   codepage-agnostic. Both verified PARSE OK under PowerShell 5.1.

Verified: server boots `HEALTHY` in ~5 s; `import()` of
`toolpathDispatcher.js` resolves cleanly; `:3100` is `LISTENING` +
`/health` healthy after the supervisor (started detached this session)
respawned it against the fixed `dist/`.

## Supervision (the "always connected" half)

Supervision code already existed but **was never installed**:
- `scripts/mcp-server-supervisor.mjs` — spawns `dist/index.js`
  `TRANSPORT=http PORT=3100`, exponential-backoff respawn on crash, O_EXCL
  PID lock. Scheduled task `PRISM MCP Server` (AtStartup+AtLogon).
- `scripts/mcp-server-watchdog.mjs` — 5-min `/health` probe; after 2 fails
  (10-min wedge) taskkills the wedged PID + respawns. Task `PRISM MCP Watchdog`.

Neither scheduled task is registered (not in `Get-ScheduledTask` output).
Registering them needs **elevated PowerShell**. The installers are now
runnable (Bug 3 fixed); the operator must run, ONE TIME, elevated:
`& H:\prism\.claude\helpers\install-mcp-server-task.ps1 -RunNow`
`& H:\prism\.claude\helpers\install-mcp-server-watchdog-task.ps1 -RunNow`
Until then :3100 is kept up only by the detached supervisor started this
session (survives the chat, NOT a reboot).

## Owed / follow-ups

- **Elevated install of the 2 scheduled tasks** — operator action, can't be
  done from a non-elevated chat.
- **Bridge resilience** — `install-mcp-server-task.ps1`'s own header claims
  "the bridge's in-process retry + health-gate close the transient half" but
  `mcp-http-bridge.mjs` has **no retry and no health-gate**. During the
  server's ~30 s cold start, a chat's `initialize` forwarded to a
  not-yet-ready :3100 still gets a hard error → that chat drops `prism` for
  its whole session. A retry-with-backoff in `mcp-http-bridge.mjs`
  `forwardToHttp` would close this. NOT built — flagged for follow-up.
- Retroactive 3-of-3 scrutiny on the two MCP-CONNECTIVITY-FIX commits.

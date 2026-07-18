# Hermes App Control Bridge — Build Spec (enumeration captured 2026-06-18, slot:zulu)

> Operator directive: "build the bridge to allow you to fully control the app, every button and function,
> change settings in real time." Built per the NEW loop-until-gaps rule — this spec IS the enumeration;
> the bridge is built + looped against it (never one-shot). Reconnaissance by an Explore agent over the
> 2.3GB vendored `C:/Users/wompu/AppData/Local/hermes/hermes-agent/` tree.

## Strategy (sidesteps the broken Electron renderer)
The Electron renderer is in a restart loop (its `/api/ws` WebSocket fails → renderer calls the
`hermes:bootstrap:reset` IPC at `main.cjs:5274` → backend SIGTERM → relaunch; ephemeral port changes each
cycle because the desktop spawns `--port 0`). The Python backend itself boots fine ("ready" every cycle).
**The bridge therefore drives the backend's FastAPI dashboard DIRECTLY over REST — no Electron, no `/api/ws`,
never the `bootstrap:reset` IPC.** This makes the broken UI irrelevant to programmatic control.

## Headless launch (the bridge owns the process → it pins the port)
```
HERMES_HOME=C:/Users/wompu/AppData/Local/hermes
HERMES_DESKTOP=1                       # enables the cron ticker in-process
HERMES_DASHBOARD_SESSION_TOKEN=<self-generated 32-byte base64url>
<HERMES_HOME>/hermes-agent/venv/Scripts/python.exe -m hermes_cli.main dashboard \
    --port 9119 --no-open --host 127.0.0.1
```
- Wait for stdout `HERMES_DASHBOARD_READY port=9119` (regex `HERMES_DASHBOARD_READY port=(\d+)`).
- Auth header on every call: `X-Hermes-Session-Token: <token>` (fallback `Authorization: Bearer <token>`).
- Public (no token): `/api/status`, `/api/config/schema`, `/api/model/options`, `/api/hermes/update/check`.
- Entry: `hermes_cli/web_server.py:175` (FastAPI), ready print at `web_server.py:11758`, port default 9119 `:11630`.

## Control surface — REST routes ("every button and function"), file = web_server.py
| Capability | METHOD path | line |
|---|---|---|
| status / stats | GET `/api/status` (2912? no →1543), GET `/api/system/stats` | 1543 / 1707 |
| **settings read** | GET `/api/config`, `/api/config/defaults`, `/api/config/schema` | 2912/2920/2925 |
| **settings write (real-time)** | PUT `/api/config` (batch) | 3478 |
| env vars | GET/PUT/DELETE `/api/env`, POST `/api/env/reveal` | 3491/3516/3635/3655 |
| model | GET `/api/model/info`, `/api/model/options`, POST `/api/model/set` | 2940/3045/3209 |
| providers/creds | POST `/api/providers/validate`, GET `/api/providers/oauth`, OAuth start/submit | 3573/5103/6084/6126 |
| sessions | GET/DELETE/PATCH `/api/sessions[/{id}[/messages]]`, bulk-delete | 2529/6439/6467/6481/6503/6295 |
| cron | GET/POST `/api/cron/jobs`, PUT `/{id}`, POST `/{id}/trigger` | 6735/6810/6855/6891 |
| MCP servers | GET/POST `/api/mcp/servers`, DELETE `/{name}`, PUT `/{name}/enabled` | 7034/7047/7088/7144 |
| messaging | GET `/api/messaging/platforms`, PUT `/{id}` | 4707/4726 |
| update | POST `/api/hermes/update/check`, `/api/hermes/update` | 2216/2140 |
| logs | GET `/api/logs` (streaming) | 6585 |
| AVOID | WebSocket `/api/ws` (triggers the renderer reset loop — REST only) | — |

## Fallback control paths
- `hermes config get/set <key>` (`main.py:4165 cmd_config`); `hermes env list/set/unset`.
- `hermes dashboard --status|--stop|--port|--host|--no-open` (`main.py:10439 cmd_dashboard`).
- Electron CDP: NOT enabled by default (would need `--remote-debugging-port=9222` in `main.cjs:115`).

## Build plan (loop until gaps filled — R16)
1. **Core (verifiable foundation):** `scripts/hermes-control-bridge.mjs` — `ensureBackend()` (spawn headless on :9119, token, wait-ready, idempotent if already up), `call(method, path, body)` REST client with token header. Test: launch → GET `/api/status` 200 → GET `/api/config` returns the live config. PROVE control.
2. **Settings real-time:** `getConfig()/setConfig(patch)` via PUT `/api/config`; round-trip test (set a benign key, read it back, restore).
3. **Full function coverage:** model/env/providers/cron/mcp/sessions wrappers — each with a live round-trip test.
4. **Wire to PRISM:** a `prism_*` dispatcher action (`prism_hermes:control` or extend the hermes bridge) so any chat/engine drives it; + a `/hermes-control` skill.
5. **Compare-against-all-systems (R16):** reconcile with the existing `ask-hermes.mjs` (proxy :8645, INFERENCE) — this bridge is APP-CONTROL (:9119), orthogonal; document the two surfaces so they don't collide. Check `HERMES-APP-INCORPORATION-PLAN` for the MCP-over-HTTP channel already wired (`config.yaml mcp_servers.prism :3100`) — control-bridge is the inverse direction (PRISM→Hermes-app), keep lanes distinct.
6. **Restart-loop (separate, optional):** the Electron renderer WS→bootstrap:reset loop is a vendored-UI bug; the bridge makes it non-blocking. A real fix = rebuild the desktop UI (tsc+vite, known-failing per 2026-06-12) — defer unless the operator wants the GUI itself fixed.

## Gaps to close in the loop (don't one-shot)
- Verify `--port 9119` is honored when launched standalone (agent inferred from CLI; live-confirm).
- Token: confirm the server accepts a self-supplied `HERMES_DASHBOARD_SESSION_TOKEN` (vs only generating its own).
- Idempotency: if the Electron app is ALSO running its own backend, the bridge's :9119 instance is separate — confirm no `kanban.db`/`auth.json` write-contention (SQLite lock). Likely use the bridge's instance as the SOLE backend, or a read-mostly mode.
- Concurrency with the live desktop: prefer the bridge spawns its OWN backend the desktop isn't using, OR drive the desktop's already-running dashboard by discovering its live port (parse desktop.log `HERMES_DASHBOARD_READY`).

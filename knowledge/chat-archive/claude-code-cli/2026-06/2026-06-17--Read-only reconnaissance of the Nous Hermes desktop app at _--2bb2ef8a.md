---
type: "chat-session"
source: "claude-code-cli"
session_id: "2bb2ef8a-06f5-4b6f-8801-35a9db88efb7"
title: "Read-only reconnaissance of the Nous Hermes desktop app at `C:/Users/wompu/AppDa"
date: "2026-06-17"
first_ts: "2026-06-17T13:22:21.163Z"
last_ts: "2026-06-17T13:27:10.585Z"
cwd: "H:\\prism"
messages: 136
user_msgs: 57
assistant_msgs: 79
raw_file: "H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-aa5124ad93c63c74d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Read-only reconnaissance of the Nous Hermes desktop app at `C:/Users/wompu/AppDa

> **claude-code-cli** | 2026-06-17 | 136 msgs (57 user / 79 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/2bb2ef8a-06f5-4b6f-8801-35a9db88efb7/subagents/agent-aa5124ad93c63c74d.jsonl`

## Transcript

### User | 2026-06-17T13:22:21.163Z

Read-only reconnaissance of the Nous Hermes desktop app at `C:/Users/wompu/AppData/Local/hermes/` (Electron + Python backend in `hermes-agent/`, venv at `hermes-agent/venv`). I'm building a PRISM control bridge to drive the app programmatically WITHOUT the (broken) Electron renderer, by talking directly to the backend's dashboard HTTP API. Be "very thorough." Return CONCRETE specifics (exact routes, file:line, exact commands), not a survey.

ANSWER THESE 4 QUESTIONS:

1. **DASHBOARD HTTP API** — the backend logs `HERMES_DASHBOARD_READY port=<N>` (dynamic port). Find the server that prints that. What web framework (FastAPI/Flask/aiohttp/express)? ENUMERATE its HTTP routes — especially anything for: getting/setting config or settings, listing/invoking agent actions, sessions, providers/credentials, skills, kanban, status/health. Give the route table (METHOD path → purpose) with file:line. This is the "every button and function" surface.

2. **PORT PINNING** — is the dashboard port settable via an env var or config.yaml key (so the bridge can reach a KNOWN port instead of a dynamic one)? Find where the port is chosen (env read / config key / random-pick) with file:line.

3. **HEADLESS LAUNCH** — the exact command to start the Python backend ALONE (no Electron desktop), e.g. `<venv>/Scripts/python.exe -m <module>` or a hermes CLI subcommand. Find the desktop's backend-spawn command (in the Electron main process / a .cmd / package.json) and the module entrypoint. Note any required env (HERMES_HOME, port, auth).

4. **RESTART-LOOP ROOT** — desktop.log shows: backend reaches "ready" → renderer logs "[bootstrap] reset requested by renderer; clearing latched failure" → "Restarting desktop connection" → "Hermes backend exited (SIGTERM)" → relaunch loop (dashboard port changes each cycle). Find what in the renderer (likely `hermes-agent/apps/desktop/.../app.asar/dist/assets/*.js` — may be minified) or the Electron main process decides the connection "failed" and requests a res
... [+651 chars truncated]

### Assistant | 2026-06-17T13:22:24.766Z

I'll conduct a thorough reconnaissance of the Nous Hermes desktop app focusing on your 4 questions. Let me start by exploring the directory structure and finding the backend server code.

### Assistant | 2026-06-17T13:22:24.995Z

[tool_use: Bash]

### User | 2026-06-17T13:22:29.862Z

[tool_result] Exit code 2
/usr/bin/bash: eval: line 1: unexpected EOF while looking for matching `"'

### Assistant | 2026-06-17T13:22:31.528Z

Let me use the correct Bash syntax:

### Assistant | 2026-06-17T13:22:31.826Z

[tool_use: Bash]

### User | 2026-06-17T13:22:36.555Z

[tool_result] /c/Users/wompu/AppData/Local/hermes
/c/Users/wompu/AppData/Local/hermes/audio_cache
/c/Users/wompu/AppData/Local/hermes/bin
/c/Users/wompu/AppData/Local/hermes/bootstrap-cache
/c/Users/wompu/AppData/Local/hermes/cache
/c/Users/wompu/AppData/Local/hermes/cache/documents
/c/Users/wompu/AppData/Local/hermes/cache/terminal
/c/Users/wompu/AppData/Local/hermes/cache/terminal/hermes-results
/c/Users/womp
... [+1540 chars truncated]

### Assistant | 2026-06-17T13:22:38.534Z

I'll search systematically for the backend server code. Let me look for the Python entry point and the HTTP dashboard API.

### Assistant | 2026-06-17T13:22:38.882Z

[tool_use: Bash]

### User | 2026-06-17T13:22:46.386Z

[tool_result] /c/Users/wompu/AppData/Local/hermes/hermes-agent/acp_adapter/edit_approval.py
/c/Users/wompu/AppData/Local/hermes/hermes-agent/acp_adapter/server.py
/c/Users/wompu/AppData/Local/hermes/hermes-agent/acp_adapter/__main__.py
/c/Users/wompu/AppData/Local/hermes/hermes-agent/agent/lsp/servers.py
/c/Users/wompu/AppData/Local/hermes/hermes-agent/agent/transports/codex_app_server.py
/c/Users/wompu/AppData
... [+1267 chars truncated]

### Assistant | 2026-06-17T13:22:48.555Z

Let me search for the main dashboard/backend server code and look at the entry points:

### Assistant | 2026-06-17T13:22:48.706Z

[tool_use: Bash]

### User | 2026-06-17T13:22:53.544Z

[tool_result] /c/Users/wompu/AppData/Local/hermes/hermes-agent/acp_adapter/__main__.py
/c/Users/wompu/AppData/Local/hermes/hermes-agent/hermes_cli/main.py
/c/Users/wompu/AppData/Local/hermes/hermes-agent/venv/Lib/site-packages/annotated_doc/main.py
/c/Users/wompu/AppData/Local/hermes/hermes-agent/venv/Lib/site-packages/certifi/__main__.py
/c/Users/wompu/AppData/Local/hermes/hermes-agent/venv/Lib/site-packages/c
... [+497 chars truncated]

### Assistant | 2026-06-17T13:22:55.662Z

Now let me examine the key entry points and search for the dashboard HTTP server code:

### Assistant | 2026-06-17T13:22:56.320Z

[tool_use: Read]

### Assistant | 2026-06-17T13:22:56.375Z

[tool_use: Read]

### Assistant | 2026-06-17T13:22:56.428Z

[tool_use: Bash]

### User | 2026-06-17T13:22:57.498Z

[tool_result] File content (483.4KB) exceeds maximum allowed size (256KB). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-06-17T13:22:57.935Z

[tool_result] 1	"""Allow running the ACP adapter as ``python -m acp_adapter``."""
2	
3	from .entry import main
4	
5	main()
6	

### User | 2026-06-17T13:23:48.633Z

[tool_result] /c/Users/wompu/AppData/Local/hermes/hermes-agent/hermes_cli/web_server.py:    # HERMES_DASHBOARD_READY, open the browser, *then* serve.
/c/Users/wompu/AppData/Local/hermes/hermes-agent/hermes_cli/web_server.py:            print(f"HERMES_DASHBOARD_READY port={actual_port}", flush=True)

### Assistant | 2026-06-17T13:23:50.524Z

Perfect! I found the dashboard server. Let me read that file and explore the related code:

### Assistant | 2026-06-17T13:23:50.946Z

[tool_use: Read]

### Assistant | 2026-06-17T13:23:51.440Z

[tool_use: Bash]

### Assistant | 2026-06-17T13:23:51.524Z

[tool_use: Bash]

### User | 2026-06-17T13:23:52.663Z

[tool_result] 1	"""
2	Hermes Agent — Web UI server.
3	
4	Provides a FastAPI backend serving the Vite/React frontend and REST API
5	endpoints for managing configuration, environment variables, and sessions.
6	
7	Usage:
8	    python -m hermes_cli.main web          # Start on http://127.0.0.1:9119
9	    python -m hermes_cli.main web --port 8080
10	"""
11	
12	from contextlib import asynccontextmanager, contextmanag
... [+13109 chars truncated]

### User | 2026-06-17T13:23:58.174Z

[tool_result] /c/Users/wompu/AppData/Local/hermes/hermes-agent/apps/desktop/.prettierrc
/c/Users/wompu/AppData/Local/hermes/hermes-agent/apps/desktop/assets/icon.icns
/c/Users/wompu/AppData/Local/hermes/hermes-agent/apps/desktop/assets/icon.ico
/c/Users/wompu/AppData/Local/hermes/hermes-agent/apps/desktop/assets/icon.png
/c/Users/wompu/AppData/Local/hermes/hermes-agent/apps/desktop/build/install-stamp.json
/c/U
... [+1646 chars truncated]

### User | 2026-06-17T13:23:58.599Z

[tool_result] /c/Users/wompu/AppData/Local/hermes/hermes-agent/apps/desktop/src/app/chat/right-rail/index.ts
/c/Users/wompu/AppData/Local/hermes/hermes-agent/apps/desktop/src/components/pane-shell/index.ts
/c/Users/wompu/AppData/Local/hermes/hermes-agent/apps/desktop/src/i18n/index.ts
/c/Users/wompu/AppData/Local/hermes/hermes-agent/apps/desktop/src/themes/index.ts
/c/Users/wompu/AppData/Local/hermes/hermes-age
... [+521 chars truncated]

### Assistant | 2026-06-17T13:24:00.833Z

Good progress. Let me continue examining the web_server.py and find the API endpoints and port configuration:

### Assistant | 2026-06-17T13:24:01.052Z

[tool_use: Read]

### Assistant | 2026-06-17T13:24:01.478Z

[tool_use: Bash]

### Assistant | 2026-06-17T13:24:01.779Z

[tool_use: Bash]

### User | 2026-06-17T13:24:02.554Z

[tool_result] 300	    ``start_server``: 127.0.0.1, localhost, ::1. RFC1918 / CGNAT / link-local
301	    are deliberately treated as PUBLIC — a hostile device on the same LAN is
302	    exactly the threat model the gate is designed for.
303	    """
304	    return (host not in _LOOPBACK_HOST_VALUES) and (not allow_public)
305	
306	
307	def _is_accepted_host(host_header: str, bound_host: str) -> bool:
308	    """T
... [+11961 chars truncated]

### User | 2026-06-17T13:24:08.373Z

[tool_result] 107:def _start_desktop_cron_ticker(stop_event: "threading.Event", interval: int = 60) -> None:
132:async def _lifespan(app: "FastAPI"):
158:def _get_event_state(app: "FastAPI"):
230:def _has_valid_session_token(request: Request) -> bool:
250:def _require_token(request: Request) -> None:
291:def should_require_auth(host: str, allow_public: bool) -> bool:
307:def _is_accepted_host(host_header: str, 
... [+3482 chars truncated]

### User | 2026-06-17T13:24:09.753Z

[tool_result] 3118:            portal_url = ""
3121:                portal_url = state.get("portal_base_url", "") or ""
3123:                portal_url = ""
5447:        portal_base_url = (
5463:                        portal_base_url=portal_base_url,
5477:        sess["portal_base_url"] = portal_base_url
5542:        portal_base_url = (
5553:                    portal_base_url=portal_base_url,
5572:        ses
... [+1153 chars truncated]

### Assistant | 2026-06-17T13:24:11.942Z

Excellent! I found the key pieces. Let me now get the full start_server function and the API endpoints listing:

### Assistant | 2026-06-17T13:24:12.592Z

[tool_use: Read]

### Assistant | 2026-06-17T13:24:12.768Z

[tool_use: Bash]

### Assistant | 2026-06-17T13:24:13.438Z

[tool_use: Bash]

### User | 2026-06-17T13:24:14.868Z

[tool_result] 11628	def start_server(
11629	    host: str = "127.0.0.1",
11630	    port: int = 9119,
11631	    open_browser: bool = True,
11632	    allow_public: bool = False,
11633	    initial_profile: str = "",
11634	):
11635	    """Start the web UI server.
11636	
11637	    ``initial_profile`` (when set) is appended to the auto-opened browser
11638	    URL as ``?profile=<name>`` so the SPA's profile switcher 
... [+6780 chars truncated]

### User | 2026-06-17T13:24:21.592Z

[tool_result] 351:@app.middleware("http")
390:@app.middleware("http")
396:@app.middleware("http")
1138:@app.get("/api/media")
1330:@app.get("/api/files")
1358:@app.get("/api/files/read")
1391:@app.post("/api/files/upload")
1416:@app.post("/api/files/mkdir")
1437:@app.delete("/api/files")
1462:@app.get("/api/fs/list")
1488:@app.get("/api/fs/read-text")
1512:@app.get("/api/fs/read-data-url")
1526:@app.get("/api/f
... [+3664 chars truncated]

### system

... [56 middle messages omitted -- see raw_file] ...

### User | 2026-06-17T13:25:43.106Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-17T13:25:45.525Z

Let me search for the actual trigger of the reset - where the connection fails and prompts a reset:

### Assistant | 2026-06-17T13:25:46.036Z

[tool_use: Bash]

### User | 2026-06-17T13:25:50.117Z

[tool_result] /c/Users/wompu/AppData/Local/hermes/hermes-agent/apps/desktop/src/app/gateway/hooks/use-gateway-boot.test.tsx:210:    FakeWebSocket.mode = 'fail'
/c/Users/wompu/AppData/Local/hermes/hermes-agent/apps/desktop/src/app/gateway/hooks/use-gateway-boot.test.tsx:232:    FakeWebSocket.mode = 'fail'
/c/Users/wompu/AppData/Local/hermes/hermes-agent/apps/desktop/src/app/gateway/hooks/use-gateway-boot.test.ts
... [+738 chars truncated]

### Assistant | 2026-06-17T13:25:51.966Z

Let me look at the use-gateway-boot and use-gateway-request hooks:

### Assistant | 2026-06-17T13:25:52.211Z

[tool_use: Bash]

### Assistant | 2026-06-17T13:25:52.656Z

[tool_use: Read]

### Assistant | 2026-06-17T13:25:52.888Z

[tool_use: Bash]

### User | 2026-06-17T13:25:53.592Z

[tool_result] 1	import { useStore } from '@nanostores/react'
2	import { useCallback, useEffect, useRef } from 'react'
3	
4	import type { HermesGateway } from '@/hermes'
5	import { isGatewayReauthRequired, resolveGatewayWsUrl } from '@/lib/gateway-ws-url'
6	import { $gateway, ensureActiveGatewayOpen, isActivePrimary } from '@/store/gateway'
7	import { $activeGatewayProfile } from '@/store/profile'
8	import { $ga
... [+4571 chars truncated]

### User | 2026-06-17T13:25:56.359Z

[tool_result] /c/Users/wompu/AppData/Local/hermes/hermes-agent/apps/desktop/src/app/gateway/hooks/use-gateway-boot.test.tsx
/c/Users/wompu/AppData/Local/hermes/hermes-agent/apps/desktop/src/app/gateway/hooks/use-gateway-boot.ts
/c/Users/wompu/AppData/Local/hermes/hermes-agent/apps/desktop/src/app/gateway/hooks/use-gateway-request.ts

### User | 2026-06-17T13:25:56.972Z

[tool_result] /c/Users/wompu/AppData/Local/hermes/hermes-agent/apps/desktop/src/app/gateway/hooks/use-gateway-boot.test.tsx
/c/Users/wompu/AppData/Local/hermes/hermes-agent/apps/desktop/src/app/gateway/hooks/use-gateway-boot.ts

### Assistant | 2026-06-17T13:25:58.981Z

Now let me check the use-gateway-boot.ts to find the health check logic:

### Assistant | 2026-06-17T13:25:59.415Z

[tool_use: Read]

### Assistant | 2026-06-17T13:25:59.955Z

[tool_use: Bash]

### Assistant | 2026-06-17T13:26:00.170Z

[tool_use: Bash]

### User | 2026-06-17T13:26:01.554Z

[tool_result] 1	import { useEffect, useRef } from 'react'
2	
3	import type { HermesConnection } from '@/global'
4	import { HermesGateway } from '@/hermes'
5	import { translateNow } from '@/i18n'
6	import { desktopDefaultCwd } from '@/lib/desktop-fs'
7	import { isGatewayReauthRequired, resolveGatewayWsUrl } from '@/lib/gateway-ws-url'
8	import {
9	  $desktopBoot,
10	  applyDesktopBootProgress,
11	  completeDeskt
... [+7113 chars truncated]

### User | 2026-06-17T13:26:05.563Z

[tool_result] 31:  $connection,
46:    connection: Awaited<ReturnType<NonNullable<typeof window.hermesDesktop>['getConnection']>> | null
110:    // `connectionState` to a constant across the early-return guards (the state
112:    const gatewayOpen = () => gateway.connectionState === 'open'
133:        // "Starting Hermes…". The probe is a no-op for a healthy or local backend.
244:        // The socket dropped a
... [+169 chars truncated]

### User | 2026-06-17T13:26:05.700Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-17T13:26:08.257Z

Now let me check the hermes_cli/main.py to find the command line entry point and how the dashboard is invoked:

### Assistant | 2026-06-17T13:26:08.746Z

[tool_use: Read]

### Assistant | 2026-06-17T13:26:09.377Z

[tool_use: Bash]

### Assistant | 2026-06-17T13:26:09.495Z

[tool_use: Bash]

### User | 2026-06-17T13:26:11.352Z

[tool_result] 1	#!/usr/bin/env python3
2	"""
3	Hermes CLI - Main entry point.
4	
5	Usage:
6	    hermes                     # Interactive chat (default)
7	    hermes chat                # Interactive chat
8	    hermes gateway             # Run gateway in foreground
9	    hermes gateway start       # Start gateway as service
10	    hermes gateway stop        # Stop gateway service
11	    hermes gateway status    
... [+4636 chars truncated]

### User | 2026-06-17T13:26:16.311Z

[tool_result] 4079:def cmd_webhook(args):
4420:def _web_ui_build_needed(web_dir: Path) -> bool:
4666:def _build_web_ui(web_dir: Path, *, fatal: bool = False) -> bool:
5390:def _find_stale_dashboard_pids(
5624:def _kill_stale_dashboard_processes(
10387:def _report_dashboard_status() -> int:
10424:def _dashboard_listening(host: str, port: int) -> bool:
10439:def cmd_dashboard(args):
10465:    # profiles/), defaul
... [+67 chars truncated]

### User | 2026-06-17T13:26:16.693Z

[tool_result] 10577:    # (e.g. plugins/dashboard_auth/nous) registers BEFORE start_server's
10612:    from hermes_cli.web_server import start_server
10617:    start_server(

### Assistant | 2026-06-17T13:26:19.313Z

Perfect! I have enough information now. Let me gather the final pieces - the cmd_dashboard function and check for any CLI commands for control:

### Assistant | 2026-06-17T13:26:20.001Z

[tool_use: Read]

### Assistant | 2026-06-17T13:26:20.708Z

[tool_use: Bash]

### Assistant | 2026-06-17T13:26:21.015Z

[tool_use: Bash]

### User | 2026-06-17T13:26:21.105Z

[tool_result] 10439	def cmd_dashboard(args):
10440	    """Start the web UI server, or (with --stop/--status) manage running ones."""
10441	    # --status: report running dashboards and exit, no deps needed.
10442	    if getattr(args, "status", False):
10443	        count = _report_dashboard_status()
10444	        sys.exit(0 if count == 0 else 0)  # status is informational, always 0
10445	
10446	    # --stop: ki
... [+7673 chars truncated]

### User | 2026-06-17T13:26:25.161Z

[tool_result] 4165:def cmd_config(args):
11123:def cmd_skills(args):

### User | 2026-06-17T13:26:25.818Z

[tool_result] 108:const USER_DATA_OVERRIDE = process.env.HERMES_DESKTOP_USER_DATA_DIR
115:const DEV_SERVER = process.env.HERMES_DESKTOP_DEV_SERVER
136:// switches only apply pre-launch. Override with HERMES_DESKTOP_DISABLE_GPU
239:// HERMES_DESKTOP_USER_DATA_DIR (used by test:desktop:fresh) puts the sandbox
318:const BOOT_FAKE_MODE = process.env.HERMES_DESKTOP_BOOT_FAKE === '1'
320:  const raw = Number.parseInt
... [+1197 chars truncated]

### Assistant | 2026-06-17T13:26:28.373Z

Excellent. Now let me get the final piece about how the Electron process sets up the environment and invokes the backend:

### Assistant | 2026-06-17T13:26:29.032Z

[tool_use: Read]

### Assistant | 2026-06-17T13:26:29.472Z

[tool_use: Bash]

### Assistant | 2026-06-17T13:26:29.883Z

[tool_use: Bash]

### User | 2026-06-17T13:26:30.465Z

[tool_result] 4805	async function startHermes() {
4806	  // Latched-failure short-circuit: once bootstrap has failed in this
4807	  // process, every subsequent startHermes() call re-throws the same error
4808	  // without re-running install.ps1. This prevents the renderer's
4809	  // ensureGatewayOpen retries (and any other getConnection callers) from
4810	  // restarting a 5-10 minute install loop while the u
... [+6616 chars truncated]

### User | 2026-06-17T13:26:33.556Z

[tool_result] 1655:// spawned its own grandchildren (a `hermes` REPL, a pty terminal session, the
1694:// problem: the desktop's backend (and the grandchildren IT spawned — a hermes
1912:  // `hermes update` reaps stale `hermes dashboard` backends (a code update
2246:    args: ['-m', 'hermes_cli.main', ...dashboardArgs],
2269:    args: ['-m', 'hermes_cli.main', ...dashboardArgs],
2303:  //    to spawning hermes
... [+109 chars truncated]

### User | 2026-06-17T13:26:34.576Z

[tool_result] 318:const BOOT_FAKE_MODE = process.env.HERMES_DESKTOP_BOOT_FAKE === '1'
1933:    env.HERMES_DESKTOP_CHILD_PID = desktopChildPids.join(',')
2313:  //    HERMES_DESKTOP_IGNORE_EXISTING=1 forces the bootstrap path for testing.
2314:  if (process.env.HERMES_DESKTOP_IGNORE_EXISTING !== '1') {
5927:  env.HERMES_DESKTOP_TERMINAL = '1'

### Assistant | 2026-06-17T13:27:10.585Z

Perfect! I now have all the information I need to provide a comprehensive answer. Let me compile the final report:

---

## HERMES DESKTOP APP: PRISM CONTROL BRIDGE RECONNAISSANCE

### §1 DASHBOARD HTTP API — FastAPI Routes & Endpoints

**Server Framework:** FastAPI + uvicorn (ASGI)  
**Entry Point:** `/c/Users/wompu/AppData/Local/hermes/hermes-agent/hermes_cli/web_server.py` line 175  
**Ready Signal:** `print(f"HERMES_DASHBOARD_READY port={actual_port}", flush=True)` (line 11758)

**Complete API Route Table** (file:line references):

| METHOD | PATH | Purpose | File:Line |
|--------|------|---------|-----------|
| GET | `/api/status` | System & agent status | 1543 |
| GET | `/api/system/stats` | CPU, memory, platform | 1707 |
| GET | `/api/config` | Read config schema | 2912 |
| GET | `/api/config/defaults` | Default values | 2920 |
| GET | `/api/config/schema` | Full schema | 2925 |
| PUT | `/api/config` | Update config (batch) | 3478 |
| GET | `/api/env` | List env vars | 3491 |
| PUT | `/api/env` | Set env var | 3516 |
| DELETE | `/api/env` | Delete env var | 3635 |
| POST | `/api/env/reveal` | Decrypt secret (rate-limited) | 3655 |
| POST | `/api/providers/validate` | Test credentials | 3573 |
| GET | `/api/model/info` | Model metadata | 2940 |
| GET | `/api/model/options` | Available models | 3045 |
| POST | `/api/model/set` | Set default model | 3209 |
| POST | `/api/hermes/update/check` | Check for updates | 2216 |
| POST | `/api/hermes/update` | Trigger update | 2140 |
| GET | `/api/sessions` | List sessions | 2529 |
| GET | `/api/sessions/{session_id}` | Get session | 6439 |
| GET | `/api/sessions/{session_id}/messages` | Session messages | 6467 |
| DELETE | `/api/sessions/{session_id}` | Delete session | 6481 |
| PATCH | `/api/sessions/{session_id}` | Rename session | 6503 |
| POST | `/api/sessions/bulk-delete` | Batch delete | 6295 |
| GET | `/api/actions/{name}/status` | Action status | 2492 |
| GET | `/api/cron/jobs` | List cron jobs | 6735 |
| POST |
... [+9244 chars truncated]

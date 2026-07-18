---
type: "chat-session"
source: "claude-code-cli"
session_id: "f6b6d9da-bed3-42f9-8c83-a5f13cdaa4de"
title: "Map the PROGRAMMATIC (non-interactive) surfaces of the installed Nous Hermes app"
date: "2026-06-13"
first_ts: "2026-06-13T06:12:21.613Z"
last_ts: "2026-06-13T06:20:25.313Z"
cwd: "H:\\PRISM"
messages: 101
user_msgs: 44
assistant_msgs: 57
raw_file: "H:/.claude/projects/H--prism/f6b6d9da-bed3-42f9-8c83-a5f13cdaa4de/subagents/workflows/wf_9e7a2caf-617/agent-a5a41fa3e694fa575.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# Map the PROGRAMMATIC (non-interactive) surfaces of the installed Nous Hermes app

> **claude-code-cli** | 2026-06-13 | 101 msgs (44 user / 57 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/f6b6d9da-bed3-42f9-8c83-a5f13cdaa4de/subagents/workflows/wf_9e7a2caf-617/agent-a5a41fa3e694fa575.jsonl`

## Transcript

### User | 2026-06-13T06:12:21.613Z

Map the PROGRAMMATIC (non-interactive) surfaces of the installed Nous Hermes app at C:/Users/wompu/AppData/Local/hermes/hermes-agent. CONTEXT: the `hermes` CLI has a TTY guard at hermes_cli/main.py ~line 310 (`if not sys.stdin.isatty(): print "requires an interactive terminal"`) that blocks subprocess/piped invocation of interactive commands like `hermes model` and `cmd_model`. So the key question: what surfaces BYPASS that guard and can be driven by PRISM without a TTY?

Find + report with file:line:
- HTTP API / web server: read C:/Users/wompu/AppData/Local/hermes/hermes-agent/hermes_cli/web_server.py and C:/Users/wompu/AppData/Local/hermes/hermes-agent/tui_gateway/server.py and C:/Users/wompu/AppData/Local/hermes/hermes-agent/hermes_cli/dashboard_auth/routes.py — what host:port does each bind, and what endpoints exist (especially: send a message to an agent, create/run a task, stream events, kanban ops)? Is auth required and how?
- Non-interactive CLI: Grep C:/Users/wompu/AppData/Local/hermes/hermes-agent/hermes_cli/main.py for the argparse subcommand table and for every call to _require_tty(); list which subcommands do NOT require a TTY. Is there a headless / `-p` / `--print` / `run` / `exec` / `serve` / `agent` mode that runs a task non-interactively?
- Kanban DB: read C:/Users/wompu/AppData/Local/hermes/hermes-agent/hermes_cli/kanban_db.py — is it a SQLite task queue/board PRISM could write tasks into and Hermes would pick up? Where is the DB file?
- Any MCP server Hermes itself exposes (grep for mcp_server / serve / fastmcp / sse).

Conclusion: name the 1-3 cleanest programmatic entry points for PRISM to drive Hermes WITHOUT a TTY, ranked. Cite file:line for each. Plain text, no JSON.

### Assistant | 2026-06-13T06:12:28.739Z

I'll systematically read the key files to map Hermes's programmatic surfaces.

### Assistant | 2026-06-13T06:12:29.837Z

[tool_use: Read]

### User | 2026-06-13T06:12:38.065Z

[tool_result] File content (448.8KB) exceeds maximum allowed size (256KB). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### Assistant | 2026-06-13T06:12:41.563Z

I'll read the files in targeted chunks and run parallel searches to map all programmatic surfaces efficiently.

### Assistant | 2026-06-13T06:12:41.564Z

[tool_use: Read]

### Assistant | 2026-06-13T06:12:42.751Z

[tool_use: Glob]

### User | 2026-06-13T06:13:10.062Z

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
... [+8017 chars truncated]

### User | 2026-06-13T06:13:27.428Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-13T06:13:31.463Z

Good start. Let me read the key files in parallel with targeted sections.

### Assistant | 2026-06-13T06:13:31.464Z

[tool_use: Read]

### Assistant | 2026-06-13T06:13:31.467Z

[tool_use: Read]

### Assistant | 2026-06-13T06:13:32.698Z

[tool_use: Read]

### User | 2026-06-13T06:13:48.606Z

[tool_result] 200	
201	# CORS: restrict to localhost origins only.  The web UI is intended to run
202	# locally; binding to 0.0.0.0 with allow_origins=["*"] would let any website
203	# read/modify config and secrets.
204	
205	app.add_middleware(
206	    CORSMiddleware,
207	    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
208	    allow_methods=["*"],
209	    allow_headers=["*"],
210	)
211	
2
... [+13071 chars truncated]

### User | 2026-06-13T06:13:48.607Z

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

### User | 2026-06-13T06:13:50.017Z

[tool_result] 1	"""SQLite-backed Kanban board for multi-profile, multi-project collaboration.
2	
3	In a fresh install the board lives at ``<root>/kanban.db`` where
4	``<root>`` is the **shared Hermes root** (the parent of any active
5	profile). Profiles intentionally collapse onto a shared board: it IS
6	the cross-profile coordination primitive. A worker spawned with
7	``hermes -p <profile>`` joins the same boa
... [+6607 chars truncated]

### Assistant | 2026-06-13T06:13:56.696Z

Now let me grep for the key patterns in parallel — TTY guard, argparse subcommands, MCP server, and the web server route table.

### Assistant | 2026-06-13T06:13:56.697Z

[tool_use: Grep]

### Assistant | 2026-06-13T06:13:56.927Z

[tool_use: Grep]

### Assistant | 2026-06-13T06:14:01.078Z

[tool_use: Grep]

### User | 2026-06-13T06:14:32.951Z

[tool_result] 177:        if not os.isatty(1):
305:def _require_tty(command_name: str) -> None:
312:    if not sys.stdin.isatty():
314:            f"Error: 'hermes {command_name}' requires an interactive terminal.\n"
1183:    is_tty = sys.stdin.isatty()
2295:    _require_tty("whatsapp")
2530:    _require_tty("whatsapp-cloud")
2566:    _require_tty("model")
4253:            _require_tty("uninstall --gui")
4263: 
... [+408 chars truncated]

### User | 2026-06-13T06:14:32.982Z

[tool_result] No matches found

### User | 2026-06-13T06:14:36.682Z

[tool_result] No matches found

### Assistant | 2026-06-13T06:14:39.509Z

Good. Now let me read the specific lines around the TTY guard, the web server routes, the ACP server, and the kanban DB path function.

### Assistant | 2026-06-13T06:14:40.490Z

[tool_use: Read]

### Assistant | 2026-06-13T06:14:40.975Z

[tool_use: Read]

### Assistant | 2026-06-13T06:14:43.387Z

[tool_use: Grep]

### Assistant | 2026-06-13T06:14:44.981Z

[tool_use: Grep]

### User | 2026-06-13T06:15:36.331Z

[tool_result] 300	from hermes_cli.subcommands.plugins import build_plugins_parser
301	from hermes_cli.subcommands.mcp import build_mcp_parser
302	from hermes_cli.subcommands.claw import build_claw_parser
303	
304	
305	def _require_tty(command_name: str) -> None:
306	    """Exit with a clear error if stdin is not a terminal.
307	
308	    Interactive TUI commands (hermes tools, hermes setup, hermes model) use
309
... [+819 chars truncated]

### User | 2026-06-13T06:15:36.333Z

[tool_result] 8180	    # Whether this update is running without a human at the keyboard.
8181	    # Interactive terminal updates always stash-and-ask (unchanged behavior);
8182	    # only non-interactive updates (desktop/chat app, gateway, `--yes`) consult
8183	    # the `updates.non_interactive_local_changes` config setting to decide
8184	    # whether to auto-restore stashed local source changes or throw them
... [+4421 chars truncated]

### User | 2026-06-13T06:15:40.103Z

[tool_result] No matches found

### User | 2026-06-13T06:15:42.685Z

[tool_result] No matches found

### Assistant | 2026-06-13T06:15:45.370Z

The grep for routes didn't match because of the regex escape. Let me use correct patterns and read the kanban DB path and web server routes directly.

### Assistant | 2026-06-13T06:15:47.347Z

[tool_use: Grep]

### Assistant | 2026-06-13T06:15:49.247Z

[tool_use: Grep]

### Assistant | 2026-06-13T06:15:50.995Z

[tool_use: Grep]

### User | 2026-06-13T06:16:10.081Z

[tool_result] 1138:@app.get("/api/media")
1330:@app.get("/api/files")
1358:@app.get("/api/files/read")
1391:@app.post("/api/files/upload")
1416:@app.post("/api/files/mkdir")
1437:@app.delete("/api/files")
1462:@app.get("/api/fs/list")
1488:@app.get("/api/fs/read-text")
1512:@app.get("/api/fs/read-data-url")
1526:@app.get("/api/fs/git-root")
1537:@app.get("/api/fs/default-cwd")
1543:@app.get("/api/status")
1707:
... [+5764 chars truncated]

### User | 2026-06-13T06:16:12.146Z

[tool_result] 3:In a fresh install the board lives at ``<root>/kanban.db`` where
14:its own ``kanban.db``, ``workspaces/``, and ``logs/``. All boards share
21:For back-compat its on-disk DB is ``<root>/kanban.db`` (not
22:``boards/default/kanban.db``), so installs that predate the boards
39:In standard installs ``<root>`` is ``~/.hermes``. In Docker / custom
40:deployments where ``HERMES_HOME`` points outside `
... [+2201 chars truncated]

### User | 2026-06-13T06:16:12.151Z

[tool_result] 40:    hermes acp                 Run as an ACP server for editor integration
6527:    protocol stream (``hermes acp`` speaks JSON-RPC on stdout) must never get
6566:        # for the duration of recovery (see docstring: ACP stdout safety).
10837:        # runtime path (gateway executor, ACP launcher, cron job runner).
11069:def cmd_acp(args):
11070:    """Launch Hermes Agent as an ACP server."""

... [+127 chars truncated]

### Assistant | 2026-06-13T06:16:16.524Z

Good. Now I need the details on: the WebSocket/PTY chat endpoints, the ACP server implementation, the kanban `kanban_db_path` function body, and the `tui_gateway/server.py` + `dashboard_auth/routes.py` files.

### system

... [21 middle messages omitted -- see raw_file] ...

### Assistant | 2026-06-13T06:17:30.245Z

[tool_use: Glob]

### User | 2026-06-13T06:17:59.375Z

[tool_result] 3039:    "kanban_decomposer",
9027:    """Set or clear a profile's role description (kanban routing signal).

### User | 2026-06-13T06:17:59.389Z

[tool_result] 76:    # running `hermes dashboard` needs fastapi+uvicorn; lazy install keeps
88:            "Web UI requires fastapi and uvicorn.\n"
89:            f"Install with: {sys.executable} -m pip install 'fastapi' 'uvicorn[standard]'"
103:# asyncio.Lock() binds to whatever loop was active at import time, which breaks
104:# when the same module is used across TestClient instances or uvicorn reloads.
322: 
... [+1020 chars truncated]

### User | 2026-06-13T06:18:02.447Z

[tool_result] No files found

### User | 2026-06-13T06:18:02.449Z

[tool_result] No files found

### Assistant | 2026-06-13T06:18:05.159Z

Good. Now let me read the start_server function body, check for kanban REST routes in a separate router file, and look for the tui_gateway and acp_adapter directories.

### Assistant | 2026-06-13T06:18:06.181Z

[tool_use: Read]

### Assistant | 2026-06-13T06:18:07.131Z

[tool_use: Bash]

### Assistant | 2026-06-13T06:18:08.443Z

[tool_use: Grep]

### User | 2026-06-13T06:18:29.592Z

[tool_result] C:\Users\wompu\AppData\Local\hermes\hermes-agent\hermes_cli\dashboard_auth\routes.py:130:@router.get("/login", name="login_page")
C:\Users\wompu\AppData\Local\hermes\hermes-agent\hermes_cli\dashboard_auth\routes.py:150:@router.get("/api/auth/providers", name="auth_providers")
C:\Users\wompu\AppData\Local\hermes\hermes-agent\hermes_cli\dashboard_auth\routes.py:178:@router.get("/auth/login", name="a
... [+725 chars truncated]

### User | 2026-06-13T06:18:30.329Z

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
... [+4868 chars truncated]

### User | 2026-06-13T06:18:44.281Z

[tool_result] __pycache__
acp_adapter
acp_registry
agent
AGENTS.md
apps
assets
batch_runner.py
cli.py
cli-config.yaml.example
constraints-termux.txt
CONTRIBUTING.md
cron
datagen-config-examples
docker
docker-compose.windows.yml
docker-compose.yml
Dockerfile
docs
flake.lock
flake.nix
gateway
hermes
hermes_agent.egg-info
hermes_bootstrap.py
hermes_cli
hermes_constants.py
hermes_logging.py
hermes_state.py
hermes_t
... [+491 chars truncated]

### Assistant | 2026-06-13T06:18:47.326Z

Good. Now I have the top-level structure. Let me check the mcp_serve.py, kanban REST routes (must be in web_server.py under a different path), and the tui_gateway ws.py handle_ws signature.

### Assistant | 2026-06-13T06:18:47.843Z

[tool_use: Read]

### Assistant | 2026-06-13T06:18:49.262Z

[tool_use: Grep]

### Assistant | 2026-06-13T06:18:50.241Z

[tool_use: Bash]

### Assistant | 2026-06-13T06:18:50.903Z

[tool_use: Read]

### User | 2026-06-13T06:19:00.406Z

[tool_result] No matches found

### User | 2026-06-13T06:19:00.730Z

[tool_result] 1175	        else:
1176	            print(
1177	                f"Error: container '{container_name}' not found via {backend}.\n"
1178	                f"The container may be running under root. Try: sudo hermes {' '.join(cli_args)}",
1179	                file=sys.stderr,
1180	            )
1181	            sys.exit(1)
1182	
1183	    is_tty = sys.stdin.isatty()
1184	    tty_flags = ["-it"] if is_tt
... [+1579 chars truncated]

### User | 2026-06-13T06:19:00.750Z

[tool_result] 1	"""
2	Hermes MCP Server — expose messaging conversations as MCP tools.
3	
4	Starts a stdio MCP server that lets any MCP client (Claude Code, Cursor, Codex,
5	etc.) list conversations, read message history, send messages, poll for live
6	events, and manage approval requests across all connected platforms.
7	
8	Matches OpenClaw's 9-tool MCP channel bridge surface:
9	  conversations_list, conversat
... [+2066 chars truncated]

### User | 2026-06-13T06:19:14.053Z

[tool_result] __init__.py
entry.py
event_publisher.py
render.py
server.py
slash_worker.py
transport.py
ws.py

### Assistant | 2026-06-13T06:19:17.017Z

Now let me read the mcp_serve.py tools list and the tui_gateway/server.py to find what port it binds on.

### Assistant | 2026-06-13T06:19:17.496Z

[tool_use: Read]

### Assistant | 2026-06-13T06:19:18.507Z

[tool_use: Read]

### Assistant | 2026-06-13T06:19:21.009Z

[tool_use: Grep]

### User | 2026-06-13T06:19:32.796Z

[tool_result] 80	
81	def _load_sessions_index() -> dict:
82	    """Load the gateway sessions.json index directly.
83	
84	    Returns a dict of session_key -> entry_dict with platform routing info.
85	    This avoids importing the full SessionStore which needs GatewayConfig.
86	    """
87	    sessions_file = _get_sessions_dir() / "sessions.json"
88	    if not sessions_file.exists():
89	        return {}
90	    t
... [+4075 chars truncated]

### User | 2026-06-13T06:19:36.901Z

[tool_result] 1	import atexit
2	import concurrent.futures
3	import contextlib
4	import contextvars
5	import copy
6	import inspect
7	import json
8	import logging
9	import os
10	import queue
11	import subprocess
12	import sys
13	import threading
14	import time
15	import uuid
16	from datetime import datetime
17	from pathlib import Path
18	from typing import Any, Optional
19	
20	from hermes_constants import (
21	  
... [+3104 chars truncated]

### User | 2026-06-13T06:19:43.364Z

[tool_result] 19:    @app.websocket("/api/ws")
173:async def handle_ws(ws: Any) -> None:

### Assistant | 2026-06-13T06:19:47.193Z

Good. Now let me read the MCP tool definitions in mcp_serve.py and the `hermes mcp` subcommand to confirm it's non-TTY, plus check what the kanban web API looks like.

### Assistant | 2026-06-13T06:19:49.067Z

[tool_use: Grep]

### Assistant | 2026-06-13T06:19:50.955Z

[tool_use: Grep]

### User | 2026-06-13T06:19:52.569Z

[tool_result] 458:    mcp = FastMCP(
471:    @mcp.tool()
528:    @mcp.tool()
561:    @mcp.tool()
618:    @mcp.tool()
670:    @mcp.tool()
699:    @mcp.tool()
733:    @mcp.tool()
769:    @mcp.tool()
823:    @mcp.tool()
839:    @mcp.tool()

### Assistant | 2026-06-13T06:19:52.941Z

[tool_use: Grep]

### User | 2026-06-13T06:19:56.337Z

[tool_result] 305:def _require_tty(command_name: str) -> None:
2295:    _require_tty("whatsapp")
2530:    _require_tty("whatsapp-cloud")
2566:    _require_tty("model")
4253:            _require_tty("uninstall --gui")
4263:        _require_tty("uninstall")
11103:        _require_tty("tools")
11126:        _require_tty("skills config")

### User | 2026-06-13T06:20:03.695Z

[tool_result] No matches found

### Assistant | 2026-06-13T06:20:06.412Z

Good. Let me read the mcp_serve.py FastMCP setup and tool names, plus the mcp subcommand handler to confirm no TTY guard.

### Assistant | 2026-06-13T06:20:06.878Z

[tool_use: Read]

### Assistant | 2026-06-13T06:20:07.493Z

[tool_use: Glob]

### User | 2026-06-13T06:20:24.916Z

[tool_result] No files found

### User | 2026-06-13T06:20:25.313Z

[tool_result] 455	            f"Install with: {sys.executable} -m pip install 'mcp'"
456	        )
457	
458	    mcp = FastMCP(
459	        "hermes",
460	        instructions=(
461	            "Hermes Agent messaging bridge. Use these tools to interact with "
462	            "conversations across Telegram, Discord, Slack, WhatsApp, Signal, "
463	            "Matrix, and other connected platforms."
464	        ),
... [+4664 chars truncated]

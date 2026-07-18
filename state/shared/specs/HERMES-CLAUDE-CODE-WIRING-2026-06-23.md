# Hermes -> Claude Code wiring — status + runbook (2026-06-23, slot:zulu)

**Operator ask:** "wire Hermes into the Claude Code desktop app" — do all of #1/#2/#3, with **#3 primary
if possible -> fall back to #2 -> fall back to #1**.

**Disambiguation (3 distinct "Hermes" surfaces — verified, not assumed):**
- **prism_hermes** (`hermesDispatcher` -> `HermesAutomationBridge`) — drives the Nous Hermes **CLI**
  (status/probe/run/cron/skill). 8 actions, registered in `mcp-server/src/index.ts`, compiled into `dist`.
- **Hermes proxy `:8645`** (`ask-hermes.mjs`) — the xAI **Grok-OAuth** OpenAI-compatible **chat** lane
  (`/v1/chat/completions`). Was a CLI script only — NOT an MCP tool until #2 (below).
- **Nous Research Hermes desktop app** (`C:/Users/wompu/AppData/Local/hermes/`) — a separate Electron
  autonomous agent. "#3" wires PRISM **into** it (Hermes consumes PRISM's MCP).

---

## Rung status (live-verified 2026-06-23)

### #1 — prism_hermes into the Claude apps : **ALREADY LIVE (no work needed)**
`claude_desktop_config.json` already loads the `prism` MCP server (`-> mcp-server/dist/index.js`, mtime
Jun 22, **contains `hermes_*`** — 10 matches). So the Claude **Desktop** app can already call
`hermes_status/probe/auth_status/cron_list/skill_list/routine_plan/model_list/run` today. The project
`.mcp.json` also loads prism (via the `:3100` http bridge) for the **CLI**. **Caveat:** keep `dist`
built (`cd mcp-server && npm run build`) so the dispatcher stays present.

### #2 — standalone `hermes` MCP server (the :8645 CHAT lane) : **BUILT + TESTED + LIVE + WIRED**
The gap #1 leaves: prism_hermes is CLI-control, not the Grok **chat** lane. `scripts/hermes-mcp-server.mjs`
(MCP SDK 1.29.0, stdio) exposes 3 tools backed by `:8645/v1`:
- **`hermes_ask`** — ask Grok a question/instruction (the stronger-than-Ollama free managed lane, runs
  OUTSIDE the Claude context window). model resolves explicit > first `/v1/models` > configured fallback.
- **`hermes_status`** — proxy `/health` + upstream auth.
- **`hermes_models`** — models the proxy serves.
Fail-soft: proxy-down / non-200 -> MCP tool error (`isError:true`), never crashes the transport.
**Wired** into BOTH:
- `H:/prism/.mcp.json` -> `mcpServers.hermes` (Claude Code **CLI** — serves "hermes utilization within CLI").
- `C:/Users/wompu/AppData/Roaming/Claude/claude_desktop_config.json` -> `mcpServers.hermes` (Claude
  **Desktop** app; original backed up to `claude_desktop_config.bak-hermes-wire.json`).
**Proof:** 12/12 unit tests (`scripts/hermes-mcp-server.test.mjs`); live round-trip — `hermes_status` ->
`{up:true,200,xAI Grok OAuth,authenticated:true}`, `hermes_ask "reply WIRED"` -> `grok-4.20-0309` -> `"WIRED"`.
**To use it:** restart the Claude Code CLI session / the Desktop app -> the `hermes_ask` tool appears.
Env knobs: `PRISM_HERMES_PROXY_URL`, `PRISM_HERMES_MODEL`/`_FALLBACK_MODEL`, `PRISM_HERMES_MCP_TIMEOUT_MS`.
Prereq: the `:8645` proxy must be up (`scripts/hermes-proxy-ensure.mjs`); if down, `hermes_ask` fails loud.

### #3 — Nous Hermes app <- PRISM MCP (PRIMARY) : **SUBSTRATE READY, activation OPERATOR-PRESENT**
Per `HERMES-APP-INCORPORATION-PLAN-2026-06-02.md`. Live state: the app is **installed but NOT running**;
`:3100/mcp` (the channel it consumes) is **UP**; the PRISM-side scaffolding is **already built**
(`knowledge/hermes-outputs/` lane + `scripts/generate-hermes-features.mjs` viz roost). The only remaining
step edits the app's `config.yaml`, which sits beside a 23KB `.env` of secrets -> **operator-present, not
autonomous** (I will not edit an external app's secrets-adjacent config).

**Operator activation (≈2 min, GUI present):**
1. `pip install --upgrade mcp` in Hermes' Python env (StreamableHTTP client).
2. Edit `C:/Users/wompu/AppData/Local/hermes/config.yaml` (~line 785, uncomment `mcp_servers:`):
   ```yaml
   mcp_servers:
     prism:
       url: "http://127.0.0.1:3100/mcp"
       timeout: 180
       connect_timeout: 60
       sampling:
         enabled: false   # do NOT let PRISM drive Hermes' LLM
   ```
   HTTP uses `url` only (no `command/args`, no auth header — `:3100` is unauth localhost).
3. Restart Hermes (no hot-reload). Tools register as `mcp_prism_prism_*` (all 103 dispatchers).
4. Confirm `:3100` up first (`curl 127.0.0.1:3100/health` -> 200). PRISM down -> Hermes fails soft.
Then optional P1-P4 (outputs lane is pre-made; SOUL persona; shop-brief crons; viz roost already shipped).

---

## Net for the operator
- **Use Hermes from Claude Code RIGHT NOW:** restart the session/app -> call `hermes_ask` (#2, the chat
  lane) or any `prism_hermes` action (#1, CLI control). Both are wired.
- **Nous Hermes app (#3 primary):** one operator-present `config.yaml` edit away from consuming all of
  PRISM's MCP. Substrate + runbook ready above.

Memory: [[reference_hermes_claude_code_wiring_2026_06_23]]. Plan source: `HERMES-APP-INCORPORATION-PLAN-2026-06-02.md`.

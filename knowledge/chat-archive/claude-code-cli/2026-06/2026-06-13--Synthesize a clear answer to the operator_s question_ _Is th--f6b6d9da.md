---
type: "chat-session"
source: "claude-code-cli"
session_id: "f6b6d9da-bed3-42f9-8c83-a5f13cdaa4de"
title: "Synthesize a clear answer to the operator's question: \"Is there a way to bridge "
date: "2026-06-13"
first_ts: "2026-06-13T06:21:29.069Z"
last_ts: "2026-06-13T06:22:15.741Z"
cwd: "H:\\PRISM"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/f6b6d9da-bed3-42f9-8c83-a5f13cdaa4de/subagents/workflows/wf_9e7a2caf-617/agent-ac6013604e4d56e6a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# Synthesize a clear answer to the operator's question: "Is there a way to bridge 

> **claude-code-cli** | 2026-06-13 | 2 msgs (1 user / 1 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/f6b6d9da-bed3-42f9-8c83-a5f13cdaa4de/subagents/workflows/wf_9e7a2caf-617/agent-ac6013604e4d56e6a.jsonl`

## Transcript

### User | 2026-06-13T06:21:29.069Z

Synthesize a clear answer to the operator's question: "Is there a way to bridge the Hermes CLI into PRISM so we get access to Hermes capabilities?"

You have four recon reports below. Also use this VERIFIED context already established this session:
- Hermes is the Nous Hermes desktop app at C:/Users/wompu/AppData/Local/hermes/hermes-agent. Its `hermes` CLI has a TTY guard (main.py:312) that REFUSES non-interactive/piped/subprocess invocation of interactive commands — so a naive "PRISM shells out to `hermes <cmd>`" bridge will hang/refuse for those commands.
- Hermes runs on Claude Opus 4.8 via a credential pool of 6 anthropic OAuth accounts (just wired this session) + copilot/openai-codex/xai/qwen/gemini/minimax providers; it has a web UI (reported on :9120).
- BILLING POLICY (verified via web search, Anthropic policy eff. 2026-04-04): third-party apps using Claude SUBSCRIPTION OAuth tokens no longer draw from plan limits — they draw from "extra usage" (billed), and from 2026-06-15 a separate "programmatic credit pool" (Pro $20 / Max5x $100 / Max20x $200/mo, then billed). So if a PRISM->Hermes bridge drives Hermes to make Claude calls, that usage is metered/billed per account. A bridge that uses Hermes's ORCHESTRATION/TOOLS but routes model calls through PRISM's own Ollama (free local) or PRISM's own Claude sidesteps this.

Produce:
1. **Answer**: yes/no + the one-sentence why.
2. **Bridge options** — 2-4 concrete architectures (e.g. HTTP/web-server bridge, kanban-DB task-queue bridge, subprocess/pty bridge despite the TTY guard, MCP). For each: how it works, what Hermes surface it uses (cite the recon), pros/cons, and whether it triggers the billing policy.
3. **Already-built vs needs-building** — reuse what PRISM already has (from the prior-art report); name the gap.
4. **Recommendation** — the single best path + the first concrete step (exact file to create/modify).
5. **The billing caveat** — one short paragraph on whether bridging Hermes-as-Claude-executor is e
... [+43350 chars truncated]

### Assistant | 2026-06-13T06:22:15.741Z

Yes. Here is the synthesis.

---

## 1. Answer

**Yes** — and the integration hinge already exists: PRISM's MCP-over-HTTP server is already wired into Hermes's `config.yaml` (`C:/Users/wompu/AppData/Local/hermes/config.yaml:371-377`), so the right move is the *inverse* link (PRISM → Hermes), which a small two-layer `ask-hermes.mjs` + `prism_local:hermes_generate` bridge cleanly delivers without ever touching the TTY-guarded CLI.

---

## 2. Bridge options

### Option 1 — HTTP / OpenAI-compatible bridge (Report D recommendation) ✅ BEST
- **How it works**: `scripts/ask-hermes.mjs` POSTs to Hermes's HTTP surface (Web UI port `127.0.0.1:9120`, per `wire-hermes-local-backend.mjs:38`; OpenAI-compatible `/v1` protocol, `wire-hermes-local-backend.mjs:46`), mirroring `ask-ollama.mjs:458-515`. A `prism_local:hermes_generate` action (modeled on `local_generate`, `localDispatcher.ts:396-437`) gives the MCP-tool surface, sharing one HTTP client engine.
- **Hermes surface used**: the gateway HTTP/Web-UI server (Report A §G confirms `:9120/api/status` is live and reachable; Report C confirms `web/` + `api_server`/`webui` platform adapters exist).
- **Pros**: no TTY guard (HTTP, not subprocess CLI); reuses PRISM's entire Ollama pattern (fallback ladder, Zod validation, telemetry, NC-program guard); no new dispatcher needed.
- **Cons**: needs the exact request/response shape of Hermes's HTTP chat endpoint — **UNVERIFIED** (see flags below). If Hermes only exposes `/api/status` and not a chat-completions POST, this option needs the web-server-bridge variant instead.
- **Billing**: depends on what model Hermes routes to. If routed to Hermes's Anthropic credential pool → metered/billed. If routed to Hermes's local Ollama → free. Neutral; controllable.

### Option 2 — Kanban task-queue bridge (DB hand-off)
- **How it works**: PRISM writes a task row into Hermes's SQLite kanban (`hermes_cli/kanban_db.py`, WAL + `BEGIN IMMEDIATE` + CAS); Hermes's dispatcher claims it, runs it through its 
... [+5550 chars truncated]

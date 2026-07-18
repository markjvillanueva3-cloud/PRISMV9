---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a"
title: "Synthesize the incorporation plan for wiring the installed Nous Hermes desktop a"
date: "2026-06-02"
first_ts: "2026-06-02T19:10:33.590Z"
last_ts: "2026-06-02T19:12:42.787Z"
cwd: "H:\\prism-slot-bravo"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/workflows/wf_0630b388-344/agent-ac47c058c7deb23f3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# Synthesize the incorporation plan for wiring the installed Nous Hermes desktop a

> **claude-code-cli** | 2026-06-02 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/workflows/wf_0630b388-344/agent-ac47c058c7deb23f3.jsonl`

## Transcript

### User | 2026-06-02T19:10:33.590Z

Synthesize the incorporation plan for wiring the installed Nous Hermes desktop app into PRISM Obsidian-brain + PSN + /system-viz, coexisting with the 26-chat fleet, serving the CNC manufacturing mission.

HERMES (ground truth):
- INSTALLED APP (verified on disk): Nous Research Hermes (com.nousresearch.hermes.setup), Electron GUI + Python agent.
- Agent install: C:/Users/wompu/AppData/Local/hermes/ — copied to H:/hermes-install/AppData-Local-hermes (2.3GB incl caches). Contains: config.yaml(61KB), .env(23KB, has secrets), SOUL.md(editable persona, currently default), state.db(SQLite), skills/(25 categories), cron/, hooks/, memories/, sessions/, pairing/, hermes-agent/(Python runtime).
- KEY CAPABILITY: built-in NATIVE MCP CLIENT (skills/mcp/SKILL.md, name native-mcp): connects to MCP servers at startup via stdio (npx/uvx/any command) OR remote HTTP/StreamableHTTP, auto-discovers their tools as first-class agent tools in every conversation. Needs the mcp python package (pip install mcp). optional-mcps/: linear, n8n.
- 25 skill categories: apple, autonomous-ai-agents, creative, data-science, devops, diagramming, dogfood, domain, email, gaming, gifs, github, inference-sh, mcp, media, mlops, note-taking, productivity, red-teaming, research, smart-home, social-media, software-development, yuanbao.
- Scheduler: cron/ dir (skill-files fire on schedule). Persona: SOUL.md loaded fresh each message. acp_adapter/acp_registry = Agent Connect Protocol.

RECON (verified):
### obsidian
I have everything I need. I've verified the vault structure, both hook/sync scripts end-to-end, the real frontmatter format, the `.gitignore`, and confirmed no `hermes-outputs/` lane exists. Here is the recon writeup.

---

# RECON: Attaching Nous Hermes native MCP filesystem to the PRISM Obsidian vault

## Current state (verified on disk)

**The vault is a real Obsidian vault.** `H:/prism/knowledge/` has `.obsidian/` (app.json, workspace.json, plugins/, graph.json) plus `wiki/`, `memories/`, `tribal
... [+26097 chars truncated]

### Assistant | 2026-06-02T19:12:42.787Z

I have comprehensive recon across all three surfaces (Obsidian vault, PSN/MCP, system-viz). Let me synthesize the incorporation plan. The recon is thorough and verified — I'll produce the plan directly without further tool calls, since every load-bearing fact (paths, config keys, action names, splice patterns, collision lanes) is already verified in the recon.

# HERMES → PRISM INCORPORATION PLAN

## 1. TARGET ARCHITECTURE

Nous Hermes runs as an **external autonomous runtime** — its own Electron GUI + Python agent with its own persona (`SOUL.md`), scheduler (`cron/`), state (`state.db`), and 25 skill categories — sitting *outside* the PRISM process tree and the 26-chat Claude fleet. It connects into PRISM through two MCP channels: (1) **MCP-over-HTTP** to `http://127.0.0.1:3100/mcp`, which auto-registers all 103 PRISM dispatchers (12,257 actions) as first-class Hermes tools, giving read/compute access to all 11 PSN legs (memory, wiki, tribal, calc, cam, safety, etc.) and scoped write to memory/session; and (2) a **filesystem-MCP** server rooted at the Obsidian vault `H:/prism/knowledge` (read across the whole brain) with all writes confined to a dedicated `knowledge/hermes-outputs/` lane the Stop-hook sync cannot touch. Hermes is positioned as "external agent #8" alongside Cline/Continue/Codex in `manifest.json:externalAgentsSupported` — it **never claims a NATO chat-slot**, never runs `/checkin`, never takes a `slot/<nato>` branch, never commits to a slot worktree. It is a separate brain that reaches into PSN read-mostly and emits manufacturing artifacts (scheduled shop briefs, research notes) back into the Obsidian-fed knowledge base.

## 2. PHASES (ordered, dependency-aware)

### P0 — Connect PRISM MCP-over-HTTP (foundation; everything else depends on tool access)

**Prereq:** `pip install --upgrade mcp` in Hermes' Python env (`hermes-agent/`) for StreamableHTTP transport (`mcp.client.streamable_http`).

**Step 1** — Edit live config `C:/Users/wompu/AppData/Loca
... [+12587 chars truncated]

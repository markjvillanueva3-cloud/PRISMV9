---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "You are the ROOT-CAUSE lens. The deeper question: WHY does Hermes need a second "
date: "2026-06-08"
first_ts: "2026-06-08T14:48:26.001Z"
last_ts: "2026-06-08T14:48:50.879Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_7ccf36d5-42b/agent-a9d7247156d16f164.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# You are the ROOT-CAUSE lens. The deeper question: WHY does Hermes need a second 

> **claude-code-cli** | 2026-06-08 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_7ccf36d5-42b/agent-a9d7247156d16f164.jsonl`

## Transcript

### User | 2026-06-08T14:48:26.001Z

You are the ROOT-CAUSE lens. The deeper question: WHY does Hermes need a second filesystem-MCP server at all when it already has PRISM's MCP at :3100? Could vault reads route through the EXISTING prism MCP (which already serves knowledge via dispatchers like brain_recall/master_index_query/wiki_query) instead of adding a second RW filesystem server? Evaluate path D's "route through :3100" sub-option vs adding server-filesystem. Plain text, ~200 words.


DECISION: How to wire a "vault-fs" filesystem-MCP server into the LIVE Nous Hermes desktop-app config (C:/Users/wompu/AppData/Local/hermes/config.yaml) so Hermes can READ the PRISM Obsidian vault (H:/prism/knowledge), synergizing the Hermes app with the Obsidian vault app.

HARD FACTS (verified this session):
- Hermes config.yaml already has mcp_servers: prism: { url: http://127.0.0.1:3100/mcp } wired and PRISM MCP :3100 is UP (HTTP 405 to GET = alive). So Hermes already has PRISM COMPUTE (103 dispatchers). It lacks vault READ.
- The off-the-shelf server is @modelcontextprotocol/server-filesystem v2026.1.14, run via npx (stdio). 
- DECISIVE: in stdio/CLI mode this server has NO read-only enforcement. The "ro" flag is Docker-volume-only. Any directory passed as a positional arg is READ-WRITE (it exposes write_file/edit_file/move_file tools). MCP "Roots" can replace allowed dirs at runtime but Hermes-as-client roots support is unverified.
- COLLISION RISK: H:/prism/knowledge is also synced every 3 min by a PRISM Stop hook (obsidian-memory-sync.mjs) that MIRRORS C: auto-memory into knowledge/memories/<type>/*.md with a bare writeFileSync (mirror-not-merge). It holds an O_EXCL lock .obsidian-memory-sync.lock. A Hermes write into knowledge/memories/ would be clobbered next Stop; a write during sync could corrupt; squatting the lock stalls the fleet feed 120s.
- knowledge/hermes-outputs/{research,notes,diagrams,scratch,sessions}/ already exists as a write lane OUTSIDE all sync targets.
- P2 SOUL.md write-discipline (Hermes
... [+1449 chars truncated]

### Assistant | 2026-06-08T14:48:50.879Z

The core question deserves a direct answer: yes, routing vault reads through the existing :3100 PRISM MCP is structurally superior, and it should be the default path.

The root cause of the whole dilemma is a category error. The "problem" was framed as "Hermes lacks a filesystem to the vault," which invites a filesystem solution. But Hermes does not need files — it needs vault knowledge. PRISM already exposes that knowledge as semantic surfaces (brain_recall, master_index_query, wiki_query) on a transport Hermes is already wired to. Adding server-filesystem solves a problem that only exists because of how the need was described.

Every hard constraint dissolves under path D's :3100 sub-option:
- No read-only enforcement needed — dispatchers are read-only by contract; there is no write_file tool to confine.
- No collision with the 3-min sync — the sync owns the bytes; the dispatcher serves a query result, never racing the lock or clobbering memories/.
- No second config edit — the prism server block already exists and boots clean; zero boot-loop risk, nothing to roll back.
- No secret exposure — dispatchers never enumerate .env/auth.json; a raw filesystem root would.
- Synergy is stronger, not weaker — Hermes gets ranked, indexed, cross-linked knowledge, not raw markdown it must re-parse.

Paths A/C trade a real, latent corruption risk (RW over a live-synced dir guarded only by a prompt) for capability PRISM already provides. The filesystem server is only justified if a concrete read need has NO dispatcher coverage — and that gap should be proven by enumerating brain_recall/wiki_query/master_index_query coverage first, not assumed. If a true gap remains, path B (hermes-outputs only) plus a narrow read dispatcher beats a vault-wide RW root. Route reads through :3100.

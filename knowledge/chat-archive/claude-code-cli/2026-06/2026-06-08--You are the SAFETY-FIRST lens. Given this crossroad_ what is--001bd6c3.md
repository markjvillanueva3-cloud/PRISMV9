---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "You are the SAFETY-FIRST lens. Given this crossroad, what is the path that MINIM"
date: "2026-06-08"
first_ts: "2026-06-08T14:48:26.000Z"
last_ts: "2026-06-08T14:48:55.760Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_7ccf36d5-42b/agent-a495e7e8e620436d8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# You are the SAFETY-FIRST lens. Given this crossroad, what is the path that MINIM

> **claude-code-cli** | 2026-06-08 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_7ccf36d5-42b/agent-a495e7e8e620436d8.jsonl`

## Transcript

### User | 2026-06-08T14:48:26.000Z

You are the SAFETY-FIRST lens. Given this crossroad, what is the path that MINIMIZES risk of corrupting the Obsidian vault, breaking the 3-min sync, boot-looping Hermes, or exposing secrets — while still delivering vault READ to Hermes? Be concrete about which candidate (A/B/C/D) and exactly how. Plain text, ~200 words.


DECISION: How to wire a "vault-fs" filesystem-MCP server into the LIVE Nous Hermes desktop-app config (C:/Users/wompu/AppData/Local/hermes/config.yaml) so Hermes can READ the PRISM Obsidian vault (H:/prism/knowledge), synergizing the Hermes app with the Obsidian vault app.

HARD FACTS (verified this session):
- Hermes config.yaml already has mcp_servers: prism: { url: http://127.0.0.1:3100/mcp } wired and PRISM MCP :3100 is UP (HTTP 405 to GET = alive). So Hermes already has PRISM COMPUTE (103 dispatchers). It lacks vault READ.
- The off-the-shelf server is @modelcontextprotocol/server-filesystem v2026.1.14, run via npx (stdio). 
- DECISIVE: in stdio/CLI mode this server has NO read-only enforcement. The "ro" flag is Docker-volume-only. Any directory passed as a positional arg is READ-WRITE (it exposes write_file/edit_file/move_file tools). MCP "Roots" can replace allowed dirs at runtime but Hermes-as-client roots support is unverified.
- COLLISION RISK: H:/prism/knowledge is also synced every 3 min by a PRISM Stop hook (obsidian-memory-sync.mjs) that MIRRORS C: auto-memory into knowledge/memories/<type>/*.md with a bare writeFileSync (mirror-not-merge). It holds an O_EXCL lock .obsidian-memory-sync.lock. A Hermes write into knowledge/memories/ would be clobbered next Stop; a write during sync could corrupt; squatting the lock stalls the fleet feed 120s.
- knowledge/hermes-outputs/{research,notes,diagrams,scratch,sessions}/ already exists as a write lane OUTSIDE all sync targets.
- P2 SOUL.md write-discipline (Hermes persona confines writes to hermes-outputs/) is already shipped — but it is a PROMPT-level soft guard, not enforcement.
- Prior incide
... [+1315 chars truncated]

### Assistant | 2026-06-08T14:48:55.760Z

SAFETY-FIRST LENS — Candidate D (route vault reads through PRISM :3100), fallback D-prime (curated read-only mirror).

The lowest-risk path is to NOT add a second filesystem MCP server at all. Hermes already holds the :3100 prism MCP. Add a vault-read action to PRISM's existing dispatcher (e.g. `prism_memory:vault_read`/`vault_search`) that serves H:/prism/knowledge through a server-side allowlist: read-only, path-canonicalized (reject `..`/symlink escape), and hard-denying `.env`, `auth.json`, `.git`, `*.lock`, and the active sync targets. This eliminates every named risk at once — no RW filesystem tools ever exist for Hermes (no write_file/edit_file/move_file), so the 3-min sync and `.obsidian-memory-sync.lock` can never be clobbered or squatted; secrets are filtered at the source; and crucially the LIVE config.yaml is NOT touched, so no boot-loop and nothing to roll back. The synergy goal is met: Hermes genuinely reads vault knowledge.

If a true filesystem mount is mandated, fall back to D-prime: point `server-filesystem` at a curated read-only MIRROR dir (knowledge-ro/, populated by a one-way exporter that excludes memories/, secrets, and sync targets) PLUS the existing hermes-outputs/ write lane. Reject A/C — both grant RW over the live sync path on a soft prompt guard only. Any config edit uses the proven wire-hermes-local-backend.mjs pattern: backup, anchored-regex patch, :9120 boot-probe, auto-rollback, dry-run default.

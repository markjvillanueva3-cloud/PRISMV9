---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "You are the ADVERSARIAL lens. Assume each candidate path WILL be attacked by the"
date: "2026-06-08"
first_ts: "2026-06-08T14:48:26.003Z"
last_ts: "2026-06-08T14:48:47.051Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_7ccf36d5-42b/agent-ad642700ee5124c74.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# You are the ADVERSARIAL lens. Assume each candidate path WILL be attacked by the

> **claude-code-cli** | 2026-06-08 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_7ccf36d5-42b/agent-ad642700ee5124c74.jsonl`

## Transcript

### User | 2026-06-08T14:48:26.003Z

You are the ADVERSARIAL lens. Assume each candidate path WILL be attacked by the worst case (Hermes hallucinates a write into knowledge/memories/ mid-sync; the npx server is compromised; secrets leak; the config edit boot-loops Hermes overnight unattended). For each of A/B/C/D, name the failure that breaks it, and which path survives adversarial conditions. Plain text, ~200 words.


DECISION: How to wire a "vault-fs" filesystem-MCP server into the LIVE Nous Hermes desktop-app config (C:/Users/wompu/AppData/Local/hermes/config.yaml) so Hermes can READ the PRISM Obsidian vault (H:/prism/knowledge), synergizing the Hermes app with the Obsidian vault app.

HARD FACTS (verified this session):
- Hermes config.yaml already has mcp_servers: prism: { url: http://127.0.0.1:3100/mcp } wired and PRISM MCP :3100 is UP (HTTP 405 to GET = alive). So Hermes already has PRISM COMPUTE (103 dispatchers). It lacks vault READ.
- The off-the-shelf server is @modelcontextprotocol/server-filesystem v2026.1.14, run via npx (stdio). 
- DECISIVE: in stdio/CLI mode this server has NO read-only enforcement. The "ro" flag is Docker-volume-only. Any directory passed as a positional arg is READ-WRITE (it exposes write_file/edit_file/move_file tools). MCP "Roots" can replace allowed dirs at runtime but Hermes-as-client roots support is unverified.
- COLLISION RISK: H:/prism/knowledge is also synced every 3 min by a PRISM Stop hook (obsidian-memory-sync.mjs) that MIRRORS C: auto-memory into knowledge/memories/<type>/*.md with a bare writeFileSync (mirror-not-merge). It holds an O_EXCL lock .obsidian-memory-sync.lock. A Hermes write into knowledge/memories/ would be clobbered next Stop; a write during sync could corrupt; squatting the lock stalls the fleet feed 120s.
- knowledge/hermes-outputs/{research,notes,diagrams,scratch,sessions}/ already exists as a write lane OUTSIDE all sync targets.
- P2 SOUL.md write-discipline (Hermes persona confines writes to hermes-outputs/) is already shipped — but it
... [+1377 chars truncated]

### Assistant | 2026-06-08T14:48:47.051Z

The adversarial verdict, path by path.

**A (root at knowledge/) — DIES.** This is the worst-case incarnate. The server exposes write_file/edit_file/move_file with no RO enforcement over the entire vault including knowledge/memories/. The named failure: Hermes hallucinates a write into memories/ mid-sync, the bare writeFileSync mirror clobbers it (or worse, the write lands during sync and corrupts the partial file), and SOUL.md is a prompt — not a wall. Compromised npx server = arbitrary vault write. Catastrophic.

**B (hermes-outputs only) — SURVIVES BUT FAILS THE MISSION.** Collision-impossible, attack-surface-minimal — but Hermes can't read the vault, so the synergy goal is null. A safe no-op is still a failure.

**C (two roots + SOUL.md) — DIES.** Identical write-attack surface as A on the read root: stdio has no RO, so the "read surface" is read-write, and SOUL.md (prompt-level) collapses under hallucination or a compromised server. Roots-pinning is unverified in Hermes-as-client — unverified = assume it fails.

**D (route vault reads through :3100) — SURVIVES.** No second filesystem server (no write tools exist to abuse), no npx supply-chain node, no second lock contender against the sync, secrets stay un-exposed, config edit is one anchored-regex line under the proven .bak/boot-probe/auto-rollback pattern. D is the only path that survives every named attack.

**Verdict: D.**

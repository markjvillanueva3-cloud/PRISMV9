---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "You are the FASTEST-SAFE-UNBLOCK lens. What is the smallest, safest change that "
date: "2026-06-08"
first_ts: "2026-06-08T14:48:26.002Z"
last_ts: "2026-06-08T14:48:52.841Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_7ccf36d5-42b/agent-a585eba8184307686.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# You are the FASTEST-SAFE-UNBLOCK lens. What is the smallest, safest change that 

> **claude-code-cli** | 2026-06-08 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_7ccf36d5-42b/agent-a585eba8184307686.jsonl`

## Transcript

### User | 2026-06-08T14:48:26.002Z

You are the FASTEST-SAFE-UNBLOCK lens. What is the smallest, safest change that makes Hermes able to read the vault TODAY without a multi-day build? Which candidate, and what is the minimal diff to config.yaml? Account for the proven GUARD+BACKUP+boot-verify+rollback pattern. Plain text, ~200 words.


DECISION: How to wire a "vault-fs" filesystem-MCP server into the LIVE Nous Hermes desktop-app config (C:/Users/wompu/AppData/Local/hermes/config.yaml) so Hermes can READ the PRISM Obsidian vault (H:/prism/knowledge), synergizing the Hermes app with the Obsidian vault app.

HARD FACTS (verified this session):
- Hermes config.yaml already has mcp_servers: prism: { url: http://127.0.0.1:3100/mcp } wired and PRISM MCP :3100 is UP (HTTP 405 to GET = alive). So Hermes already has PRISM COMPUTE (103 dispatchers). It lacks vault READ.
- The off-the-shelf server is @modelcontextprotocol/server-filesystem v2026.1.14, run via npx (stdio). 
- DECISIVE: in stdio/CLI mode this server has NO read-only enforcement. The "ro" flag is Docker-volume-only. Any directory passed as a positional arg is READ-WRITE (it exposes write_file/edit_file/move_file tools). MCP "Roots" can replace allowed dirs at runtime but Hermes-as-client roots support is unverified.
- COLLISION RISK: H:/prism/knowledge is also synced every 3 min by a PRISM Stop hook (obsidian-memory-sync.mjs) that MIRRORS C: auto-memory into knowledge/memories/<type>/*.md with a bare writeFileSync (mirror-not-merge). It holds an O_EXCL lock .obsidian-memory-sync.lock. A Hermes write into knowledge/memories/ would be clobbered next Stop; a write during sync could corrupt; squatting the lock stalls the fleet feed 120s.
- knowledge/hermes-outputs/{research,notes,diagrams,scratch,sessions}/ already exists as a write lane OUTSIDE all sync targets.
- P2 SOUL.md write-discipline (Hermes persona confines writes to hermes-outputs/) is already shipped — but it is a PROMPT-level soft guard, not enforcement.
- Prior incident: a blind hand-edit
... [+1294 chars truncated]

### Assistant | 2026-06-08T14:48:52.841Z

FASTEST-SAFE-UNBLOCK verdict: Candidate C, scoped read-only by structure — root the filesystem server at H:/prism/knowledge AND knowledge/hermes-outputs, but point the READ surface at a curated read-only mirror, NOT live memories/. The cleanest TODAY ship is actually C-minus-D: root at the two non-colliding subtrees Hermes genuinely needs to read (knowledge/wiki and knowledge/hermes-outputs), deliberately excluding knowledge/memories/ — the only directory the 3-min sync clobbers. The wiki is the synthesized vault knowledge Hermes wants anyway; memories/ is raw auto-feed. This makes the collision structurally impossible without inventing a RO proxy or junction tricks, and avoids the multi-day RO-wrapper-MCP build.

Minimal config.yaml diff (under existing mcp_servers:):

```
  vault-fs:
    command: npx
    args:
      - "-y"
      - "@modelcontextprotocol/server-filesystem@2026.1.14"
      - "H:/prism/knowledge/wiki"
      - "H:/prism/knowledge/hermes-outputs"
```

Pin the version; never pass knowledge/ or any path containing .env/auth.json.

Actuate via the proven wire-hermes-local-backend.mjs pattern: testable transform, BACKUP to .bak-<ts>, anchored-regex insert (no YAML reserialize), boot-verify :9120, AUTO-ROLLBACK on failure, --apply/--rollback. SOUL.md write-discipline remains the backstop for the writable hermes-outputs lane. Synergy goal met — Hermes reads real vault knowledge today; sync untouched.

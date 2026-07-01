---
type: "chat-session"
source: "claude-code-cli"
session_id: "625e0262-c371-48f3-8e8f-320b790f8062"
title: "You are writing the FIRST per-domain CLAUDE.md for PRISM's LATHE galaxy under th"
date: "2026-05-26"
first_ts: "2026-05-26T23:34:02.366Z"
last_ts: "2026-05-26T23:34:47.819Z"
cwd: "H:\\PRISM"
messages: 11
user_msgs: 5
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/625e0262-c371-48f3-8e8f-320b790f8062/subagents/agent-ae0d1323b4f5f6fba.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# You are writing the FIRST per-domain CLAUDE.md for PRISM's LATHE galaxy under th

> **claude-code-cli** | 2026-05-26 | 11 msgs (5 user / 6 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/625e0262-c371-48f3-8e8f-320b790f8062/subagents/agent-ae0d1323b4f5f6fba.jsonl`

## Transcript

### User | 2026-05-26T23:34:02.366Z

You are writing the FIRST per-domain CLAUDE.md for PRISM's LATHE galaxy under the new Domain-Galaxy Doctrine (spec at H:/prism/state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md). This is the "galactic center" file per Bibryam's Context Cascade pattern.

DELIVERABLE — write ONE file:
- Path: H:/prism/mcp-server/src/engines/lathe/CLAUDE.md (create the dir if needed; if engines/lathe/ doesn't exist, use the actual dir — likely engines/turning/ or check via Glob first)
- Length: ≤200 lines
- Audience: Claude when CWD is inside the lathe domain or when working on `prism_turning:*` dispatcher actions

CONTENT REQUIRED (each section ≤25 lines):
1. **Lathe domain scope** — what falls under lathe/turning (single-point threading, chuck jaw force, tailstock, steady rest, live tooling, bar puller, mill-turn handoff, swiss-type). Cite ENGINE_DIGEST.md.
2. **Canonical constants — READ FIRST** — point at H:/prism/mcp-server/src/physics/constants.ts. Note lathe shares P/M/K/N/S/H kc1.1 with mill but uses different specific-force formulas.
3. **Common lathe engines + their dispatcher** — list 5-10 most-used engines via Glob `mcp-server/src/engines/lathe/*` and/or `mcp-server/src/engines/turning/*`. Note `prism_turning:*` is the dispatcher (per CLAUDE.md `prism_turning` reference).
4. **Test commands** — how to run lathe-only tests.
5. **Domain gotchas** — Glob knowledge/memories/feedback/feedback_*lathe*.md and feedback_*turning*.md. Read 2-3, surface gotchas. CLAUDE.md mentions lathe LoRA cadence + commit-to-slot-worktree absorption issues.
6. **Tribal pointers** — knowledge/tribal/lathe/, wiki code-tribal entries.
7. **Cross-galaxy edges** — lathe ↔ mill-turn handoff, lathe ↔ cam-post (lathe master post in CLAUDE.md), lathe ↔ shop-floor, lathe ↔ quality.

WHEN DONE, return THIS exact format:
```
FILE: <actual path written>
LINES: <line count>
NOISE-CANDIDATES (3-5 paths in lathe domain Glob/Grep should default-exclude):
- <path1>
SUMMARY (100 words): <what you wrote, lathe-s
... [+179 chars truncated]

### Assistant | 2026-05-26T23:34:19.408Z

I'll start by exploring the lathe domain structure.

### Assistant | 2026-05-26T23:34:19.908Z

[tool_use: Glob]

### Assistant | 2026-05-26T23:34:20.445Z

[tool_use: Glob]

### Assistant | 2026-05-26T23:34:20.918Z

[tool_use: Glob]

### Assistant | 2026-05-26T23:34:21.236Z

[tool_use: Glob]

### User | 2026-05-26T23:34:44.144Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-26T23:34:44.155Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-26T23:34:45.822Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-26T23:34:45.888Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-26T23:34:47.819Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited

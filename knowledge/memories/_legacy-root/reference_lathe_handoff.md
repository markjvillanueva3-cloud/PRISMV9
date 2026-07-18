---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/reference_lathe_handoff.md
source_filename: reference_lathe_handoff.md
content_hash: de0e6cd125a5e00171688bf9dd7908837108c02eb9b7f93d0d426cc9fc03f6fb
mirror_ts: 2026-05-05T13:00:09.537Z
mirror_engine: ObsidianMemorySyncEngine
---
Any time the user wants to continue LATHE-MASTER work (trigger phrases: "continue LATHE-MASTER", "resume lathe roadmap", "pick up lathe work"), read this file first:

**`H:/prism/state/shared/LATHE-MASTER-HANDOFF.md`**

It contains: current P0 status, per-unit completion state with commit SHAs, next-action plan for U-LTH04b, cross-session coordination notes, and the verification commands to run.

Secondary sources (in priority order):
1. `H:/prism/mcp-server/data/milestones/LATHE-MASTER.json` — authoritative envelope with per-unit status/completion_notes
2. `H:/prism/LATHE-MASTER-UNIFIED-ROADMAP.md` — narrative roadmap (mirrors envelope)
3. `H:/prism/state/shared/AGENT_CHAT.md` — live cross-session heartbeat (check for recent LATHE-MASTER activity before claiming units)
4. Git log: `git log --oneline --grep=LATHE-MASTER` to see recent commits.

This pointer survives across machines because it's in cross-session auto-memory (`~/.claude/projects/H--prism/memory/`).

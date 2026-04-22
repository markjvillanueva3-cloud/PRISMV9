---
name: LATHE-MASTER handoff pointer
description: Points to the canonical handoff doc for picking up LATHE-MASTER roadmap work across sessions/machines.
type: reference
originSessionId: 69e7fe09-05c1-438b-adcb-d347bc62277b
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

---
name: MILL-MASTER track pointer
description: Active cross-session track — mill AGI + calculator + post-processor + pipeline. Resume trigger = "continue MILL-MASTER" or "resume mill roadmap" or "continue the mill agi roadmap".
type: project
originSessionId: a7245694-b3e0-4c3f-8a13-7cb4b59f70a6
---
**Track:** MILL-MASTER
**Resume trigger phrases:** "continue MILL-MASTER" · "resume mill roadmap" · "continue the mill agi roadmap" · "continue mill work"
**Handoff document:** `H:/prism/state/shared/MILL-MASTER-HANDOFF.md`
**Authoritative roadmap:** `H:/prism/MASTER-EXECUTION-PLAN-v1-2026-04-16.md` (6-week Gantt)
**Primary spine:** `H:/prism/UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md` (ALL work ordered under this)

**Why:** The user maintains 5+ parallel Claude chats on the same worktree. A fresh session must ORIENT before editing — skip reading the 3 files above and you will duplicate work already retired or clobber sibling-session locks. The handoff has the full commit timeline, the next concrete unit (W2-C), and the locked decisions.

**How to apply:** On any user prompt that mentions "mill", "mill roadmap", "mill AGI", "calculator", "post processor" + continuation language — FIRST read `state/shared/MILL-MASTER-HANDOFF.md` before doing anything else. That doc will point you to the exact file reads needed and the next unit.

**Ownership boundary:** MILL-MASTER is owned by Claude-Opus sessions only. Files owned by this track are listed in the handoff under "Files this track owns". Do not edit those from any other track.

**Sibling tracks (read-only relevance):**
- LATHE-MASTER → `state/shared/LATHE-MASTER-HANDOFF.md`
- CPP-MS5-S12, MS-P0.5-COORD, AGI-INFRA-PHASE-D, MCAT-MS0 — see AGENT_CHAT.md heartbeats

**Current status (as of 2026-04-17T01:25Z):**
- W1 COMPLETE (0.1 · 0.2 · 0.3 · 0.4 · 0.5 · 0.9 · 0.16 U-OP1)
- W2 partial (0.6 action-triple-sync + verify-full-wiring landed via commit bf6fbd22)
- Next: W2-C ENGINE_USAGE_INDEX.json (Universal 0.7 first reverse index)

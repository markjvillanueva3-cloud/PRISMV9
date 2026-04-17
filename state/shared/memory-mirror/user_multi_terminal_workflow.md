---
name: Multi-Terminal + Codex Concurrent Workflow
description: User runs 6+ concurrent Claude terminals plus a Codex chat; Codex helps backend but mostly works frontend
type: user
originSessionId: 9e711f5b-0e91-456f-8978-7b34a29255b4
---
**Operational pattern:** User runs **at least 6 Claude terminals concurrently** on the PRISM codebase, plus **1 Codex chat** that assists with backend but primarily works on frontend.

**Implications for any plan/design I produce:**

1. **All coordination primitives must be concurrency-safe for 7+ agents** (6 Claude + 1 Codex minimum, likely more). Single-writer assumptions are wrong.

2. **Per-terminal handoff is mandatory, not optional.** `state/shared/handoffs/HANDOFF-<instance>.md` is the right pattern (already used by `per-agent-handoff.mjs`). Shared `HANDOFF.md` without per-terminal qualifier will clobber.

3. **File locking matters.** `state/shared/FILE_LOCKS.json` and `mcp-server/data/locks/` are live contention points — any new state-writing hook must acquire the right lock or use atomic tmp+rename.

4. **Agent boundary = Claude backend / Codex frontend**, but Codex *also* helps backend opportunistically. Don't treat the boundary as a hard partition — treat it as "primary responsibility." See `state/shared/AGENT_BOUNDARY_DIRECTIVE.md` and `feedback_frontend_codex.md` for the frontend Codex-page-protection rule.

5. **Cross-terminal coordination engines matter more than in a single-agent shop:**
   - `CrossTerminalBroadcastEngine`
   - `AgentCoordinationDaemon` (running at `state/shared/AGENT_COORDINATION_DAEMON.json`)
   - `AGENT_WORKBOARD.md`, `AGENT_CHAT.md`, `ACTIVE_WORK_REGISTRY.json`
   - `RPS_CHALLENGE.json` (rock-paper-scissors arbitration for lane conflicts)
   These should be first-class in any session/context roadmap.

6. **Context/session state must be addressable per-terminal.** A compaction survival snapshot that only captures "the last session" without a terminal ID is ambiguous when 7 agents may have compacted near the same moment.

7. **Memory sync (MemorySyncEngine) ingest/export should assume concurrent writes.** Bundle format must be mergeable, not last-writer-wins.

8. **Workload split signal:** When I'm designing backend-vs-frontend changes, assume Codex owns the frontend path unless specifically asked. Backend changes still fair game for me even if Codex is also poking backend.

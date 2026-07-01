---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/project_continue_cad_work.md
source_filename: project_continue_cad_work.md
content_hash: 6674bc744059fe09998c39746cd387ff90ca28c409fa894ff49912ca3f15cd4e
mirror_ts: 2026-05-05T13:00:09.492Z
mirror_engine: ObsidianMemorySyncEngine
---
When the user types `continue cad work` (or `continue cad`) as a session opener, that is the trigger phrase for the canonical CAD-track resume.

**Action:**

1. Read `H:/prism/state/shared/handoffs/CONTINUE-CAD.md` immediately — that file is the source of truth for what was last shipped, what's next, and how to resume.
2. Switch to worktree `H:/prism-cad-sw-fidx` if not already there: `cd H:/prism-cad-sw-fidx/mcp-server && git rev-parse --abbrev-ref HEAD` should report `work/cad-fidx-solidworks`.
3. Execute the RESUME DIRECTIVE in that handoff verbatim. As of 2026-05-04 it points at the next 3 cross-process bridges to ship: `CrossProcessFeatureBridge` → `CrossProcessAIBridge` → `ProcessIntelligenceRouterEngine` (top-level), each as its own `[XPROC-{FEAT,AI,ROUTER}-01]/U-XPROC-{...}-01` commit.

**Why:** The CAD track has been continuous across many sessions and is now mid-flight on a 5-bridge cross-process synergy stack (2 of 5 shipped). Reading the handoff first prevents reinventing scope or re-asking what's been decided.

**How to apply:** Trigger on the literal phrases "continue cad work" or "continue cad" at the start of a new chat. Do NOT trigger on conversational uses of those words mid-session. The handoff file is timestamped — if it's >7 days old, surface that fact and confirm with user before treating it as authoritative.

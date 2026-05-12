---
name: continue cad work — resume trigger
description: When user types "continue cad work" or "continue cad", load the canonical CAD-track handoff and execute its RESUME directive verbatim.
type: project
originSessionId: 3d60920a-d609-415c-a9f6-61f034fac7b0
---
When the user types `continue cad work` (or `continue cad`) as a session opener, that is the trigger phrase for the canonical CAD-track resume.

**Action:**

1. Read `H:/prism/state/shared/handoffs/CONTINUE-CAD.md` immediately — that file is the source of truth for what was last shipped, what's next, and how to resume.
2. Switch to worktree `H:/prism-cad-sw-fidx` if not already there: `cd H:/prism-cad-sw-fidx/mcp-server && git rev-parse --abbrev-ref HEAD` should report `work/cad-fidx-solidworks`.
3. Execute the RESUME DIRECTIVE in that handoff verbatim. As of 2026-05-04 it points at the next 3 cross-process bridges to ship: `CrossProcessFeatureBridge` → `CrossProcessAIBridge` → `ProcessIntelligenceRouterEngine` (top-level), each as its own `[XPROC-{FEAT,AI,ROUTER}-01]/U-XPROC-{...}-01` commit.

**Why:** The CAD track has been continuous across many sessions and is now mid-flight on a 5-bridge cross-process synergy stack (2 of 5 shipped). Reading the handoff first prevents reinventing scope or re-asking what's been decided.

**How to apply:** Trigger on the literal phrases "continue cad work" or "continue cad" at the start of a new chat. Do NOT trigger on conversational uses of those words mid-session. The handoff file is timestamped — if it's >7 days old, surface that fact and confirm with user before treating it as authoritative.

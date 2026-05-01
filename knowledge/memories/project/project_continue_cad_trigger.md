---
name: continue-cad-trigger
description: Trigger phrase "continue cad" should resume the CAD roadmap from H:/prism/state/shared/handoffs/CONTINUE-CAD.md
type: project
originSessionId: 94b22baa-823b-460f-8ba9-a022e3ba79b2
---
The user established a session-trigger convention on 2026-04-30: when they type **`continue cad`** in any new Claude Code chat, immediately read `H:/prism/state/shared/handoffs/CONTINUE-CAD.md` and execute its RESUME DIRECTIVE verbatim — do not ask for clarification.

**Why:** The CAD-FIDX track ships incrementally across many Claude chats. A single well-known trigger file at a stable path eliminates the per-session "where did we leave off" ramp-up cost and works regardless of which session ID the new chat receives.

**How to apply:**
- On any prompt containing the literal phrase `continue cad` (case-insensitive), the FIRST tool call must be `Read` on `H:/prism/state/shared/handoffs/CONTINUE-CAD.md`
- Then follow Step 1 → Step 2 → Step 3 in that file's RESUME DIRECTIVE section
- Do NOT route to `/startup` macro; the trigger file is self-contained
- The file is updated at the end of each CAD-track session by the chat that did the work, so it always reflects the latest closure point + next-action recommendation

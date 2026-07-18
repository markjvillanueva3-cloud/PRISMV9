---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/project_continue_cad_trigger.md
source_filename: project_continue_cad_trigger.md
content_hash: 1b4ea95ce3a03f9872530e255d1197fc6bd8a8b8c6d9377b7951d3b2d13bfbf0
mirror_ts: 2026-05-05T13:00:09.491Z
mirror_engine: ObsidianMemorySyncEngine
---
The user established a session-trigger convention on 2026-04-30: when they type **`continue cad`** in any new Claude Code chat, immediately read `H:/prism/state/shared/handoffs/CONTINUE-CAD.md` and execute its RESUME DIRECTIVE verbatim — do not ask for clarification.

**Why:** The CAD-FIDX track ships incrementally across many Claude chats. A single well-known trigger file at a stable path eliminates the per-session "where did we leave off" ramp-up cost and works regardless of which session ID the new chat receives.

**How to apply:**
- On any prompt containing the literal phrase `continue cad` (case-insensitive), the FIRST tool call must be `Read` on `H:/prism/state/shared/handoffs/CONTINUE-CAD.md`
- Then follow Step 1 → Step 2 → Step 3 in that file's RESUME DIRECTIVE section
- Do NOT route to `/startup` macro; the trigger file is self-contained
- The file is updated at the end of each CAD-track session by the chat that did the work, so it always reflects the latest closure point + next-action recommendation

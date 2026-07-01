---
name: slot-query-by-name-and-recency
description: "When the user asks to pull tasks/sessions/commits/handoffs for a chat slot, use the deterministic slot-query tool (filter by slot name, sort by recency) — never Grep/Glob/Agent."
aliases: feedback_slot_query_by_name_and_recency
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.445Z
---


When the user says "pull tasks for slot &lt;X&gt;" / "what sessions has &lt;X&gt; had" / "what is &lt;X&gt; working on" / "show me the last &lt;N&gt; things slot &lt;X&gt; did" — invoke `/slot-query` (or directly `node H:/prism/scripts/slot-query.mjs &lt;slot&gt;`) which queries 5 deterministic sources keyed by slot name and sorted newest-first.

**Why:** A 2026-05-20 work order (`/checkin-india`) made this a standing rule: searches should be "efficient — by chat slot name + most recent dates". Grep / Glob / Agent across the filesystem to answer slot-membership questions is slow, lossy, and burns context for an answer the slot-keyed indexes already give in ~0 tokens.

**How to apply:**
- Trigger phrases → invoke `/slot-query`: "pull tasks for slot X", "sessions for X", "what is X doing", "what did X ship", "queue for X", "who owns X", "last N handoffs for X", "recent commits by X".
- Section selectors: `--section binding` (current owner), `--section claim` (active unit), `--section queue` (eligible upcoming units), `--section handoffs` (recent sessions), `--section commits` (shipped work via `slot:<name>` token in commit subject).
- Default `--limit 5` and `--since 14d` are usually enough; bump for deeper history.
- Always sorted newest-first. Filter is by **exact slot name** match, not substring — a handoff for india will not surface under indiana.
- Skill file: `H:/.claude/commands/slot-query.md` (mirrored to `H:/prism/.claude/commands/slot-query.md` by c-to-h-mirror going the other way; CLI is at `H:/prism/scripts/slot-query.mjs`).

**Anti-pattern:** Spawning an Agent or running `Grep -r slot:india` to answer "what has india done?" — 5 named JSON/git surfaces already index this. Use them.

Related: [[feedback_system_viz_first_audit]] (same principle for code search) · [[feedback_high_roi_backend_first_slot_queue]] (slot-queue pickup discipline).

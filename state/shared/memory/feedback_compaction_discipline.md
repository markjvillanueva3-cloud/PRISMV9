---
name: Compaction discipline
description: Compact every 2-3 units — MANDATORY. Auto-compact hook blocks at 35 edits. Always write HANDOFF before compacting.
type: feedback
---

Compact context every 2-3 units of work. This is not optional.

**Why:** PRISM sessions are long and context-intensive. Without regular compaction, quality degrades as the context window fills. The auto-compact hook warns at 15 edits, warns urgently at 25, and BLOCKS at 35. These thresholds exist because quality measurably dropped when compaction was deferred.

**How to apply:**
1. After completing 2-3 units: save HANDOFF.md with RESUME line, then /compact
2. The PostCompact hook resets the edit counter and sets a continuation flag
3. The post-compact-continue hook BLOCKS until HANDOFF is read via /startup
4. The loop: work → /compact (saves RESUME) → /startup (reads RESUME) → work
5. Never fight the auto-compact block — comply immediately

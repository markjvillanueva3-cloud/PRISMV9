---
name: feedback-tango-orphan-needs-decision
description: every discovered orphan/coverage-gap gets a build/wire/archive decision — never silently leave an L8 stub
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.446Z
aliases: feedback_tango_orphan_needs_decision
---


Discovery's output is only valuable if every finding is triaged. An orphan engine, a coverage gap, or a shipped-but-pending unit that is *found* but not *acted on* is wasted Anthropic spend — the cost of building it was already paid.

**Why:** a punch list nobody decides on rots; the next audit re-surfaces the same items and the fleet learns to ignore the audit. Silent gaps read as "covered everything" when they aren't (R12 violation).

**How to apply:** for each finding emit one of three verdicts — BUILD (file/queue a unit), WIRE (hand to romeo / dispatcher-wirer), or ARCHIVE (mark WIRE-EXEMPT with reason, or move to `_archive/`). If you can't resolve it this session, file a `CLOSE-OUT-DEFERRED` entry with the reason. Defer with a reason; never silently ignore. Sister rules: [[feedback_never_delete_only_disable]] · [[feedback_always_close_out]].

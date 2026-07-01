# TOKEN-SAVINGS-EXPAND/U-PERSLOT-DEDUP-3 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-EXPAND]/U-PERSLOT-DEDUP-3 (slot:alpha): adopt injection-dedup in charlie-quoting-knowledge — completes HIGHVALUE-DISCOVERY #1

**Commit:** `afe169ab0e95` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T23:18:17-05:00
**Tags:** token-savings-expand, u-perslot-dedup-3, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-EXPAND]/U-PERSLOT-DEDUP-3 (slot:alpha): adopt injection-dedup in charlie-quoting-knowledge — completes HIGHVALUE-DISCOVERY #1

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [TOKEN-SAVINGS-EXPAND]/U-PERSLOT-DEDUP-3 (slot:alpha): adopt injection-dedup in charlie-quoting-knowledge — completes HIGHVALUE-DISCOVERY #1

Final per-slot injector. Keyword-VARIED block (content changes per prompt, so
lower dedup value than the static injectors) — but identical hit-sets on repeated/
similar prompts still dedup, and it's zero-harm (content-keyed + fail-open).

HIGHVALUE-DISCOVERY queue #1 COMPLETE: injection-dedup now adopted across all 8
named per-prompt injectors (psn-leg-state + foxtrot/delta/xray/whiskey/
charlie-awareness/charlie-knowledge/echo-post) via the shared dedupedContext()
helper (U-DEDUP-EMIT-HELPER, 7/7 tests). Aggregate ~5-12K tok/slot/session.
```

## Files touched (2)
- .claude/hooks/charlie-quoting-knowledge-inject.mjs | 119 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 119 insertions(+)

## Lessons surfaced in commit body
- till dedup, and it's zero-harm (content-keyed + fail-open).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show afe169ab0e95`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-EXPAND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
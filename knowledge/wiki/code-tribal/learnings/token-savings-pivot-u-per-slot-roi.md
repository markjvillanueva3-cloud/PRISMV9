# TOKEN-SAVINGS-PIVOT/U-PER-SLOT-ROI — [MAIN] [TOKEN-SAVINGS-PIVOT]/U-PER-SLOT-ROI (slot:alpha iter10): per-slot ROI breakdown in sidecar

**Commit:** `de2d9510b215` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T19:06:26-05:00
**Tags:** token-savings-pivot, u-per-slot-roi, auto-distilled

## Subject
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PER-SLOT-ROI (slot:alpha iter10): per-slot ROI breakdown in sidecar

## Body
```
[MAIN] [TOKEN-SAVINGS-PIVOT]/U-PER-SLOT-ROI (slot:alpha iter10): per-slot ROI breakdown in sidecar

Closes follow-up #3 from iter-5 memory — per-slot ROI breakdown so we
can see which fleet slots are bleeding the most tokens through which
classifiers.

Each route-suggest fire now resolves its sessionId → slot via a
best-effort read of state/shared/chat-slots.json. Three resolution
strategies (additive — first match wins):
  1. exact chatId == sessionId
  2. chatId.endsWith(sessionId.slice(0, 8))
  3. sessionId.startsWith(chatId.replace(/^claude-/, ""))

Sidecar schema extension (1.0.0, additive):
  bySlot               — { alpha: 17, bravo: 9, ..., _unresolved: 3 }
  recent[].slot        — string slot name OR null when unresolved

Safety: same fail-soft pattern as the rest of the telemetry — a
missing chat-slots.json, parse error, or unmatched session ALL fall
through to `_unresolved` without throwing. Hook itself is unaffected.

Live smoke: fired Grep nudge from session 5b1fef86 (this alpha chat);
sidecar correctly recorded bySlot.alpha=1, recent[0].slot="alpha".

Closes the per-chat-ROI gap noted in token-savings-pivot wiki
follow-up #3. /route-suggest-stats can now optionally surface a
top-3 slots-by-fire-count line (wiring is in the data — skill update
deferred to iter11 or beyond if the operator wants it surfaced).
```

## Files touched (2)
- .claude/hooks/mcp-route-suggest.mjs | 28 ++++++++++++++++++++++++++++
- 1 file changed, 28 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show de2d9510b215`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS-PIVOT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
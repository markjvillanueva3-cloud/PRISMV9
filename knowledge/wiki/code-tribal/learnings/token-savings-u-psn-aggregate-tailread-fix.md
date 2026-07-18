# TOKEN-SAVINGS/U-PSN-AGGREGATE-TAILREAD-FIX — [MAIN-FORCE] [TOKEN-SAVINGS]/U-PSN-AGGREGATE-TAILREAD-FIX (slot:alpha): raise 500K tail-read cap -> fleet headline was under-reporting ~42K real savings

**Commit:** `54f0b2d7a809` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T01:21:29-05:00
**Tags:** token-savings, u-psn-aggregate-tailread-fix, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-SAVINGS]/U-PSN-AGGREGATE-TAILREAD-FIX (slot:alpha): raise 500K tail-read cap -> fleet headline was under-reporting ~42K real savings

## Body
```
[MAIN-FORCE] [TOKEN-SAVINGS]/U-PSN-AGGREGATE-TAILREAD-FIX (slot:alpha): raise 500K tail-read cap -> fleet headline was under-reporting ~42K real savings

stop-psn-savings-aggregate.mjs::tailRead capped each savings ledger at the last
500KB. But it readFileSync's the WHOLE file first and only slices afterward, so
the cap saved ZERO I/O -- it merely discarded most of the already-read buffer
before parsing, and byte-sliced MID-LINE (the first partial record was silently
dropped by JSON.parse). On the 2.2MB prompt-rewrites ledger that meant only the
last ~23% was counted (headline showed ~27h, not the full-history 349); rtk and
the other ledgers were truncated too.

Fix: raise MAX_READ_BYTES 500K -> 8MB (an honest safety ceiling -- covers every
live ledger with headroom; the aggregate is throttled hourly so full-parse cost
is negligible; readFileSync already paid the full read), and make tailRead advance
past the first newline when it truncates so every parsed line is a COMPLETE entry.
Exported tailRead + MAX_READ_BYTES; +4 R9 tests (full-under-cap, clean-boundary-on-
truncate, missing/empty-safe). LIVE before/after: totals.savedTokens 521600 ->
563900 (~42K previously-masked REAL savings surfaced), prompt-rewrites full-history
349. Pairs with U-PSN-REWRITE-SHAPE-FIX (the shape bug); this is the windowing bug.
```

## Files touched (3)
- .claude/hooks/__tests__/stop-psn-savings-aggregate.test.mjs | 67 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/stop-psn-savings-aggregate.mjs                | 22 +++++++++++++++++++---
- 2 files changed, 86 insertions(+), 3 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 54f0b2d7a809`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
# SFC-JM-ACCURACY/U-OSC-JM-FEED-VERDICT-AGG — [MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-JM-FEED-VERDICT-AGG (slot:oscar): aggregate feed verdicts in the divergence summary

**Commit:** `bcd9a6e858a1` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T03:25:17-05:00
**Tags:** sfc-jm-accuracy, u-osc-jm-feed-verdict-agg, auto-distilled

## Subject
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-JM-FEED-VERDICT-AGG (slot:oscar): aggregate feed verdicts in the divergence summary

## Body
```
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-OSC-JM-FEED-VERDICT-AGG (slot:oscar): aggregate feed verdicts in the divergence summary

Completes the CSS+feed symmetry of the "test against ALL JM parts" artifact: summarizeDivergence now
aggregates the feed verdict distribution (conservative/in-band/aggressive/suspect, over rows that carry a
feed verdict) alongside the existing CSS aggregate, and the report prints a feed/rev summary line.

Additive: mirrors the proven CSS-verdict counting via the same key() mapper; counts only rows with a
non-null feedVerdict; the report line is gated on comparable>0; the CSS aggregate is byte-unchanged.

LIVE quantified accuracy finding (50-config JM proven store, 14 comparable): CSS 14 conservative / 0
in-band / 0 aggressive (JM = 100% speed-slow) vs FEED 6 conservative / 8 in-band / 0 aggressive (JM feeds
57% in-band, 43% light, 0% heavy). 18/18 tests (+1). Per-unit reviewer deferred to the Stop 3-of-3 (token
budget; trivial additive counter mirroring the proven CSS pattern).
```

## Files touched (3)
- mcp-server/scripts/sfc-jm-proven-divergence.mjs      |  7 +++++++
- mcp-server/scripts/sfc-jm-proven-divergence.test.mjs | 15 +++++++++++++++
- 2 files changed, 22 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bcd9a6e858a1`
- Milestone envelope: `mcp-server/data/milestones/SFC-JM-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
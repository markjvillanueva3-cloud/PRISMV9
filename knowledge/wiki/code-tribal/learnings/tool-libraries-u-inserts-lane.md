# TOOL-LIBRARIES/U-INSERTS-LANE — [MAIN-FORCE] [TOOL-LIBRARIES]/U-INSERTS-LANE (slot:romeo): Mastercam ISO turning-insert lane + stale-file fix

**Commit:** `35dd28adf1f2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T09:16:27-05:00
**Tags:** tool-libraries, u-inserts-lane, auto-distilled

## Subject
[MAIN-FORCE] [TOOL-LIBRARIES]/U-INSERTS-LANE (slot:romeo): Mastercam ISO turning-insert lane + stale-file fix

## Body
```
[MAIN-FORCE] [TOOL-LIBRARIES]/U-INSERTS-LANE (slot:romeo): Mastercam ISO turning-insert lane + stale-file fix

Iter 9 -- the explicitly-named 'inserts' category, done HONESTLY (R12).

INSERTS (mastercam-inserts BUILDERS entry -> PRISM_<BRAND>_inserts.csv):
- parseIsoInsertIC(): the corpus inserts carry NO numeric ic_mm -- the inscribed circle is encoded
  in the ISO-1832 designation (CNMG[12]04 -> IC 12.7). Conservative map of well-established IC
  codes only; unknown code -> null (never fabricate an IC that would mis-size the insert).
- Requires a GENUINE ISO insert (parseable IC) -> drops mis-categorized product codes
  (e.g. 'ISCAR-IC331.0' which had a garbage 8407mm 'corner radius'); corner radius gated to a
  physical 6.4mm max. LIVE: 145 CLEAN inserts (Sandvik+Sumitomo), 0 garbage; 1,220 junk dropped.
  Honest + small -- the rich ic_mm source (kennametal-turning.json) is NOT matched by discovery
  (a documented follow-up); the loaded insert corpus is mostly non-ISO product codes.

BUG FIX (affects ALL lanes, R16): emitLibraries now removes stale PRISM_* files before writing --
a brand that drops out (all tools implausible / insert-filter tightened) was leaving a stale
library file behind. Verified by a re-emit-drops-a-brand test.

Tests: emitter 30/30 (parseIsoInsertIC, ISO-insert filter, corner-R gate, CSV, stale-file cleanup).
```

## Files touched (4)
- scripts/emit-brand-tool-libraries.mjs                       | 73 ++++++++++++++++++++++++++++++++++-
- scripts/emit-brand-tool-libraries.test.mjs                  | 58 ++++++++++++++++++++++++++++
- state/shared/tool-libraries/mastercam-inserts/MANIFEST.json | 36 +++++++++++++++++
- 3 files changed, 166 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 35dd28adf1f2`
- Milestone envelope: `mcp-server/data/milestones/TOOL-LIBRARIES.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
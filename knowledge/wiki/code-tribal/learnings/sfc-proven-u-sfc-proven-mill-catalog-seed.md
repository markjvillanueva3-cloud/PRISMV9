# SFC-PROVEN/U-SFC-PROVEN-MILL-CATALOG-SEED — [MAIN-FORCE] [SFC-PROVEN]/U-SFC-PROVEN-MILL-CATALOG-SEED (slot:oscar): fold curated JM-Die PROVEN mill catalog into the proven store -- closes the thin-mill-coverage gap (+7 HSM samples -> 63 param sets)

**Commit:** `ded461e4f339` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T08:47:44-05:00
**Tags:** sfc-proven, u-sfc-proven-mill-catalog-seed, auto-distilled

## Subject
[MAIN-FORCE] [SFC-PROVEN]/U-SFC-PROVEN-MILL-CATALOG-SEED (slot:oscar): fold curated JM-Die PROVEN mill catalog into the proven store -- closes the thin-mill-coverage gap (+7 HSM samples -> 63 param sets)

## Body
```
[MAIN-FORCE] [SFC-PROVEN]/U-SFC-PROVEN-MILL-CATALOG-SEED (slot:oscar): fold curated JM-Die PROVEN mill catalog into the proven store -- closes the thin-mill-coverage gap (+7 HSM samples -> 63 param sets)

The corpus mill G-code yield is thin (52 samples; the JM mill corpus is Mastercam-.mcx
-binary-dominated). This folds the hand-curated PROVEN PRG catalog
(src/data/jmdie-proven-mill-programs.ts -- FONTANA grip blocks + SFS guided backstops,
die/tool-steel HSM) into the same proven store as a high-quality seed (the POC flagged
this as "the cheap path to mill proven coverage").

- New lib src/engines/lib/jmdie-mill-proven-samples.ts: jmdieMillProvenSamples() maps the
  5-program / 7-tool catalog -> ChipLoadSample[]; catalogToolOperation() classifies each
  tool (drill->drilling, face_mill->facing, ball_endmill->finishing, flat_endmill->
  pocket/finish/rough by program ops). UNITS-FIRST: JM is INCH (G20), catalog feed is ipm
  matching the corpus feed_rate (also ipm), so NO conversion; diameter normalized to mm.
- Harness: mill lane concats the catalog samples (gated --no-catalog) before aggregateMillData.
- Tests: +6 (15/15 total) -- mapping count, tool->op classification, real rpm/feed/metric-dia,
  chip_load null, FONTANA 5/8 ball endmill (finishing, 15.875mm, 5000rpm), SFS 1/4 drill.
- VALIDATED: mill samples 52 corpus + 7 catalog = 59 -> store 94,012 -> 94,019 samples,
  59 -> 63 param sets (4 new die-steel HSM mill keys), 17 high-conf.
```

## Files touched (5)
- mcp-server/data/state/proven-speed-feed-store.json         | 280 ++++++++++++++++++++++++++++++++++++++++++++++++-----------------------
- mcp-server/scripts/extract-jm-proven-speedfeed.ts          |  27 +++++--
- mcp-server/src/__tests__/jmdie-mill-proven-samples.test.ts |  67 +++++++++++++++++
- mcp-server/src/engines/lib/jmdie-mill-proven-samples.ts    |  58 +++++++++++++++
- 4 files changed, 336 insertions(+), 96 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ded461e4f339`
- Milestone envelope: `mcp-server/data/milestones/SFC-PROVEN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
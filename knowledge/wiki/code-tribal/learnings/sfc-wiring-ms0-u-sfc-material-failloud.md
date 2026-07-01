# SFC-WIRING-MS0/U-SFC-MATERIAL-FAILLOUD — [MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-MATERIAL-FAILLOUD (slot:oscar): R12 fail-loud on unknown/fuzzy SFC material resolution (gap #3 safe core)

**Commit:** `c127137384a4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T21:07:39-05:00
**Tags:** sfc-wiring-ms0, u-sfc-material-failloud, auto-distilled

## Subject
[MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-MATERIAL-FAILLOUD (slot:oscar): R12 fail-loud on unknown/fuzzy SFC material resolution (gap #3 safe core)

## Body
```
[MAIN-FORCE] [SFC-WIRING-MS0]/U-SFC-MATERIAL-FAILLOUD (slot:oscar): R12 fail-loud on unknown/fuzzy SFC material resolution (gap #3 safe core)

gap #3 honest scope: SFCFewShotNewMaterialEngine (ProtoMAML) needs a support set of prior
shop-floor outcomes per (customer x material); the sample-less synchronous calculate() path
has none, so wiring it there would be a facade (R12). Few-shot adaptation is a gap #10
(outcome-capture) dependency. This unit ships the real, safe deliverable: make unknown/
approximate material resolution FAIL-LOUD instead of silently defaulting/guessing.

- exact-not-found -> steel default already warned; strengthened the text (VERIFY: an exotic/
  hardened workpiece run as steel UNDER-estimates force/power + OVER-estimates safe Vc; ~25-55%
  Vc/force error for an ISO-S superalloy mis-run as ISO-P steel).
- NEW: the substring FUZZY-match branch (alias.includes(input) || input.includes(alias)) was
  SILENT -- a loose match can pick the wrong workpiece / ISO group with no flag. Now warns
  "fuzzy-matched to 'X' (ISO Y) -- approximate, VERIFY before cutting" + records in inferred[].
- Report-only: no Vc/feed numbers change; the matching logic is byte-identical.
- Tests ultimate-speed-feed-unknown-material-warn.test.ts (4): unknown->loud-warn,
  fuzzy->fuzzy-warn, 2x exact-known->no-spurious-warn. 4/4 green; 76/76 existing
  ultimate-speed-feed still green.
```

## Files touched (3)
- mcp-server/src/__tests__/ultimate-speed-feed-unknown-material-warn.test.ts | 44 ++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/UltimateSpeedFeedEngine.ts                          | 14 ++++++++++++--
- 2 files changed, 56 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- wrong workpiece / ISO group with no flag. Now warns
- till green.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c127137384a4`
- Milestone envelope: `mcp-server/data/milestones/SFC-WIRING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
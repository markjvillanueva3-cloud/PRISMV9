# POST-PROCESSOR/U-PP-CPS-PARSER-TEST — [MAIN-FORCE] [POST-PROCESSOR]/U-PP-CPS-PARSER-TEST (slot:echo): CpsPostParserEngine companion test (23) -- synthetic .cps full-extraction R9

**Commit:** `63c16eb9f7a5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T15:25:42-05:00
**Tags:** post-processor, u-pp-cps-parser-test, auto-distilled

## Subject
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-CPS-PARSER-TEST (slot:echo): CpsPostParserEngine companion test (23) -- synthetic .cps full-extraction R9

## Body
```
[MAIN-FORCE] [POST-PROCESSOR]/U-PP-CPS-PARSER-TEST (slot:echo): CpsPostParserEngine companion test (23) -- synthetic .cps full-extraction R9

CpsPostParserEngine (pure regex parser for Fusion 360 .cps posts, foundation of the
dual-track .cps surface + Track-B CIMCO byte-equiv validation per ECHO-ROADMAP-v2 G1) had
no companion test. 23 R9 cases drive a hand-built synthetic .cps with KNOWN field values
and assert the parsed profile:
- metadata (description/vendor/legal/extension/cert/longDescription/programNameIsInteger)
- capabilities + fingerprint (mill+sim, mill+turn, unknown, filename-inferred inspection)
- tolerances spatial(MM), circular radius/sweep (toRad), helical/spiral/probe flags,
  conditional highFeedrate {mm,inch}
- properties (boolean default; enum values[] + string default; type/group/scope)
- formats (createFormat decimals/prefix; createVariable ref:<fmt>)
- G/M code tables with inline-comment capture (gFormat/gModal/mFormat)
- WCS definition (useZeroOffset + named G54-59 range)
- cycle detection (drilling/tapping/boring + G81/G84/G85 + case-name extraction)
- include flags + empty-content/unknown-action/no-path adversarial paths

Parser verified correct (all green first run, no bug surfaced). R12 note: parseFile caches
by FILENAME ONLY (ignores content) -- fine for immutable files but a latent cross-directory
same-basename staleness edge (two dirs with "fanuc.cps" -> 2nd returns 1st's profile); covered
as documented behavior, NOT changed here (a content-hash key is a separate perf decision).
Advances ECHO-ULTIMATE-ROADMAP v2 Track A/G4. Single additive test file; 3-of-3 at Stop.
```

## Files touched (2)
- mcp-server/src/__tests__/CpsPostParserEngine.test.ts | 315 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 315 insertions(+)

## Lessons surfaced in commit body
- note: parseFile caches

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 63c16eb9f7a5`
- Milestone envelope: `mcp-server/data/milestones/POST-PROCESSOR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
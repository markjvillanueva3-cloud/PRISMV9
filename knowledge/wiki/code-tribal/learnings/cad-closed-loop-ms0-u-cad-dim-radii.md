# CAD-CLOSED-LOOP-MS0/U-CAD-DIM-RADII — [MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-DIM-RADII (slot:india): the FIRST DIMENSIONAL training signal -- the accuracy lever -- mined real radii from the STEP corpus, in india's lane (no cad-engine change).

**Commit:** `a872dbcfa839` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T07:53:55-05:00
**Tags:** cad-closed-loop-ms0, u-cad-dim-radii, auto-distilled

## Subject
[MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-DIM-RADII (slot:india): the FIRST DIMENSIONAL training signal -- the accuracy lever -- mined real radii from the STEP corpus, in india's lane (no cad-engine change).

## Body
```
[MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-DIM-RADII (slot:india): the FIRST DIMENSIONAL training signal -- the accuracy lever -- mined real radii from the STEP corpus, in india's lane (no cad-engine change).

CONTEXT: the 3 prior CAD-gen signals (feature-presence priors, surface-topology composition, fix corrections) were all NON-dimensional -- the 100%-accuracy ceiling. I'd flagged dimensional GT as 'needs a cad-engine change / delta territory', but the backend-builder doctrine is don't-defer: built it as a STEP MINER in india's lane instead.

BUILD: scripts/lib/step-dimension-extract.mjs (pure: parse CIRCLE/CYLINDRICAL_SURFACE radii from real STEP syntax -> per-file UNIT-NORMALIZE to mm). UNITS-FIRST is load-bearing -- the JM-Die corpus is largely INCH (CONVERSION_BASED_UNIT 'INCH' x25.4); reading an inch radius as mm is a 25.4x error. Unknown-unit files are SKIPPED (R12 -- never fabricate a dim in an unknown unit). scripts/build-cad-dimension-dataset.mjs (mines the 665-file recovered manifest -> per-class radius distributions min/median/IQR/max -> state/shared/lora/cad-dimension-dataset.jsonl). Registered advisory lora-training-jsonl source.

VALIDATED LIVE (R15): real inch STEP file -> 29 radii, median 2.1mm (0.0825in x25.4 = 2.10mm, correct). Corpus mine: 223 files read, 0 unit-skips, 0 unreadable -> 9 class pairs (die 6508 radii median 4.76mm, general 30516 median 20.68mm, shaft 641 median 50.8mm, ...). Assembler folds 'cad-dimension-radii: 9 added' -> CAD-gen corpus now 120 pairs / 4 complementary signals (presence + topology + corrections + DIMENSIONAL), training_ready true, 34 galaxies. 15 tests (10 extract incl real inch/mm normalization + 5 miner incl units-first skip).

[MAIN-FORCE]: feeds the fleet training corpus (all 34 galaxies). The accuracy-ceiling lever; remaining = tolerances/GD&T (PMI extraction) for sub-feature dimensional precision.
```

## Files touched (7)
- scripts/build-cad-dimension-dataset.mjs           | 116 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/build-cad-dimension-dataset.test.mjs      |  57 +++++++++++++++++++++++++++++++++++++++
- scripts/build-fleet-training-corpus-inventory.mjs |  14 ++++++++++
- scripts/lib/step-dimension-extract.mjs            | 100 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/step-dimension-extract.test.mjs       |  81 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/lora/cad-dimension-dataset.jsonl     |   9 +++++++
- 6 files changed, 377 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a872dbcfa839`
- Milestone envelope: `mcp-server/data/milestones/CAD-CLOSED-LOOP-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
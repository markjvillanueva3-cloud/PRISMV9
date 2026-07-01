# CAD-CLOSED-LOOP-MS0/U-CAD-GT-FEATURE-PRIORS — [MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-GT-FEATURE-PRIORS (slot:india): wire delta's 11 CAD class-prototype GROUND-TRUTH catalogs into fleet CAD-gen training -- the POSITIVE class->feature-prior sibling of cad-fix corrections.

**Commit:** `39401140c256` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T23:29:32-05:00
**Tags:** cad-closed-loop-ms0, u-cad-gt-feature-priors, auto-distilled

## Subject
[MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-GT-FEATURE-PRIORS (slot:india): wire delta's 11 CAD class-prototype GROUND-TRUTH catalogs into fleet CAD-gen training -- the POSITIVE class->feature-prior sibling of cad-fix corrections.

## Body
```
[MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-GT-FEATURE-PRIORS (slot:india): wire delta's 11 CAD class-prototype GROUND-TRUTH catalogs into fleet CAD-gen training -- the POSITIVE class->feature-prior sibling of cad-fix corrections.

GAP: derive-ground-truth-from-cad.mjs already mined cad-corpus-step-geometry-report.json (662 JM-Die STEP files) into 11 per-class GT catalogs at state/shared/ocr-ground-truth/cad-prototype-<class>-*.json (each ranks the features that class reliably exhibits by evidence_ratio). But only 5 of 11 classes ever reached CAD-gen training signal (via the fix-ledger's NEGATIVE corrections); the 6 others (blisk/bushing/general/impeller/shaft/valve_body) + the full POSITIVE prior were dormant.

BUILD: scripts/lib/cad-ground-truth-to-training.mjs (pure: GT catalog -> Alpaca class->feature-prior pairs; one graded class-level prior + per-feature pairs for evidence_ratio>=0.5; core/common/occasional tiers; R9 won't teach false certainty on sub-0.5 features) + scripts/build-cad-ground-truth-dataset.mjs (scans all 11 catalogs -> state/shared/lora/cad-ground-truth-dataset.jsonl, dedup). Registered as advisory lora-training-jsonl source in build-fleet-training-corpus-inventory.mjs (FLEET corpus, all 34 galaxies).

VALIDATED LIVE: 71 unique pairs from 11 classes (0 invalid); fleet assembler folds 'cad-ground-truth-feature-priors: 71 added (w=0.5, advisory, 0 dup, 0 invalid)' -> training_ready true, 34 galaxies. CAD-gen corpus now covers all 11 part classes (71 positive priors + 27 fix corrections). 19 tests (15 lib + 4 builder incl a live 11-class assertion).

[MAIN-FORCE]: integrates the fleet training-corpus manifest + assembler (serves all 34 galaxies) -- genuine cross-cutting training infra, not slot-local.
```

## Files touched (7)
- scripts/build-cad-ground-truth-dataset.mjs        |  90 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/build-cad-ground-truth-dataset.test.mjs   |  60 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/build-fleet-training-corpus-inventory.mjs |  14 +++++++++++++
- scripts/lib/cad-ground-truth-to-training.mjs      | 131 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/cad-ground-truth-to-training.test.mjs | 143 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/lora/cad-ground-truth-dataset.jsonl  |  71 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 6 files changed, 509 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 39401140c256`
- Milestone envelope: `mcp-server/data/milestones/CAD-CLOSED-LOOP-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
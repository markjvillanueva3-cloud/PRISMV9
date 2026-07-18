# CAD-CLOSED-LOOP-MS0/U-CAD-DIM-BBOX — [MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-DIM-BBOX (slot:india): add part-ENVELOPE dimensional signal + fix 2 corpus data-quality issues the envelope exposed.

**Commit:** `e485a0ac18db` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T08:07:17-05:00
**Tags:** cad-closed-loop-ms0, u-cad-dim-bbox, auto-distilled

## Subject
[MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-DIM-BBOX (slot:india): add part-ENVELOPE dimensional signal + fix 2 corpus data-quality issues the envelope exposed.

## Body
```
[MAIN-FORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-DIM-BBOX (slot:india): add part-ENVELOPE dimensional signal + fix 2 corpus data-quality issues the envelope exposed.

ENRICH: scripts/lib/step-dimension-extract.mjs gains extractBboxMm/bboxStats/bboxTrainingPair -- per-class overall bounding box (the print's overall dims) from CARTESIAN_POINT coords, unit-normalized to mm. Complements the feature-level radii with part-level envelope (die ~130x74x38mm).

FIX 1 (R12, data quality): the "plate" class was MISCLASSIFIED -- its files are 6.3m OKUMA MU400VA MACHINE CAD MODELs / MATE VISE+JAW setups (123K-point assemblies), not parts. The envelope exposed it (radii median hid it). Added PART_ENVELOPE_CEILING_MM=1500: a >1.5m envelope is an assembly/machine, skip the WHOLE file (its radii are assembly noise too). 16 such files excluded.
FIX 2 (R12): some parts capture only coplanar points -> a degenerate "63x50x0 mm" envelope. bboxStats drops bboxes whose smallest dim < 0.05mm (keeps the file's radii); all-degenerate class -> no envelope pair (no misleading claim).

VALIDATED LIVE (R15): real CARTESIAN_POINT parse + inch->mm; corpus mine 207 files (16 oversize-assembly skipped, 0 unknown-unit) -> 16 pairs/9 classes, all envelopes now plausible (die 130x74x38, general 98x62x31, valve_body 212x57x52 mm). Assembler folds cad-dimension-radii (16) -> fleet corpus. 22 tests (12 extract incl bbox/negative-coord/degenerate + 10 miner incl oversize-guard + units-first).

[MAIN-FORCE]: feeds the fleet training corpus. The envelope is the print's primary dimensional check.
```

## Files touched (6)
- scripts/build-cad-dimension-dataset.mjs       | 48 +++++++++++++++++++++++++++++++++++-------------
- scripts/build-cad-dimension-dataset.test.mjs  | 14 +++++++++++++-
- scripts/lib/step-dimension-extract.mjs        | 68 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/step-dimension-extract.test.mjs   | 43 ++++++++++++++++++++++++++++++++++++++++++-
- state/shared/lora/cad-dimension-dataset.jsonl | 15 +++++++++++----
- 5 files changed, 169 insertions(+), 19 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e485a0ac18db`
- Milestone envelope: `mcp-server/data/milestones/CAD-CLOSED-LOOP-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
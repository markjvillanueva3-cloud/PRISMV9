# PER-SLOT-GALAXY-BUILDOUT/U-PSGB-XRAY-CLOSED-LOOP-SCORER — [MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-CLOSED-LOOP-SCORER (slot:xray): dimension-set scorer — the OCR closed-loop measurement core

**Commit:** `4ac70d292fec` · **By:** markjvillanueva3-cloud · **At:** 2026-06-01T09:00:07-05:00
**Tags:** per-slot-galaxy-buildout, u-psgb-xray-closed-loop-scorer, auto-distilled

## Subject
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-CLOSED-LOOP-SCORER (slot:xray): dimension-set scorer — the OCR closed-loop measurement core

## Body
```
[MAIN] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-XRAY-CLOSED-LOOP-SCORER (slot:xray): dimension-set scorer — the OCR closed-loop measurement core

The missing half of the OCR closed loop (extract -> SCORE -> feedback). Pure,
deterministic, standalone (no MCP/VLM) so it's the same scorer for every
ground-truth source (CAD geometry, CNC-program-derived, or synthetic).

scoreDimensionSet(extracted, truth, {pct,absMm}) matches OCR'd dims to ground-truth
dims by mm VALUE within max(1%, 0.05mm) -> precision/recall/F1/MAE + explicit
missed (truth dims OCR didn't find) and extra (potential hallucinations) lists.
aggregateScores rolls per-print scores into micro P/R/F1 over the corpus.

2-of-2 scrutiny PASS. P2 fixes from review: boolean reject in dimToMm
(Number(true)===1 footgun), regression test pinning the documented greedy-undercount
edge (truth dims closer than the tolerance band), and an honesty note -- this is a
"value-recovery accuracy" metric (matching is value-only, not dimension-type-aware).
Logged follow-ups: Hungarian-optimal assignment + type-aware matching once a labeled
corpus exists.

17 tests (happy + perfect/partial/extra/tolerance-band + 4 failure modes + 4
adversarial incl. the greedy-undercount regression). All pass.

Next loop iter: wire a closed-loop runner feeding this scorer from the best-available
ground truth -> first real OCR value-recovery accuracy numbers over the overnight
corpus (60 OK / 63 events). Memory: reference_xray_ocr_gpu_concurrency_2026_05_31.
```

## Files touched (3)
- scripts/lib/dimension-set-score.mjs      | 114 ++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/dimension-set-score.test.mjs | 137 +++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 251 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4ac70d292fec`
- Milestone envelope: `mcp-server/data/milestones/PER-SLOT-GALAXY-BUILDOUT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
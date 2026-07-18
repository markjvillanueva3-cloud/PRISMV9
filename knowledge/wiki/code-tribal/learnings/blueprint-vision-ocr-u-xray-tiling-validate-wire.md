# BLUEPRINT-VISION-OCR/U-XRAY-TILING-VALIDATE-WIRE — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-TILING-VALIDATE-WIRE (slot:xray): wire P0.2 region tiling into the closed-loop perfect-parts GT validator (--tile) -- measures the recall lift against the CNC-program answer key

**Commit:** `d94fc110aef8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T11:12:28-05:00
**Tags:** blueprint-vision-ocr, u-xray-tiling-validate-wire, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-TILING-VALIDATE-WIRE (slot:xray): wire P0.2 region tiling into the closed-loop perfect-parts GT validator (--tile) -- measures the recall lift against the CNC-program answer key

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-TILING-VALIDATE-WIRE (slot:xray): wire P0.2 region tiling into the closed-loop perfect-parts GT validator (--tile) -- measures the recall lift against the CNC-program answer key

The P0.2 tiling pipeline was reachable only via its own CLI (an orphan). This wires it into
validate-perfect-parts.mjs -- the closed-loop validator that OCRs a print and scores recall vs the part's
CNC-program ground truth (the answer key) -- so tiling's recall benefit is measured against GT, not just
vs a full-page baseline. R15 wire-to-consumer + the strongest validation surface.

- New --tile flag (+ --tile-rows/--tile-cols/--tile-overlap, default 2x2/0.15). When set, each rasterized
  page routes through extractWithTiling (crop into overlapping tiles, OCR each, merge) instead of one
  full-page runEnsembleOverImage pass; dims come from the merged fused set (value_mm). assumeUnits "in" is
  forced onto tiles (they lose the title block, per U-XRAY-TILING-FORCE-UNITS).
- The sequential per-page await is preserved (the file's own rule: Ollama serializes; must not hammer the
  GPU concurrently with the live grinder).

R15 live head-to-head (part 05850, lathe, 7 GT callouts, qwen3-vl:8b-instruct):
  TILING   recall 0.4286 (3/7) precision 0.2381  (42 dims extracted)
  BASELINE recall 0.4286 (3/7) precision 0.2222  (27 dims extracted)
Honest finding (R12): EQUAL recall-vs-GT on this SPARSE lathe part -- tiling's lift is part-dependent. It
recovers dims on DENSE MILL prints (earlier extrude_punch E2E: 11-12 tiled vs 8 full-page) where dims are
spread across the page; a lathe part with region-concentrated dims the full page already reads sees no
lift. The wire's value is precisely that it lets us MEASURE this per part against the answer key. A
corpus-scale tile-vs-baseline mean-recall comparison is the follow-up (long resumable GPU run).

The wire is trivial glue over fully unit-tested components (extractWithTiling 14 tests + merge 24 tests);
validated end-to-end by the live run against GT above. Artifacts: state/shared/ocr-training-loop/
{tile,baseline}-validate/truetest-report.json.
```

## Files touched (4)
- scripts/validate-perfect-parts.mjs                                    | 30 ++++++++++++++++++++++++++----
- state/shared/ocr-training-loop/baseline-validate/truetest-report.json | 27 +++++++++++++++++++++++++++
- state/shared/ocr-training-loop/tile-validate/truetest-report.json     | 27 +++++++++++++++++++++++++++
- 3 files changed, 80 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- TILING-VALIDATE-WIRE (slot:xray): wire P0.2 region tiling into the closed-loop perfect-parts GT validator (--tile) -- measures the recall lift against the CNC-program answer key
- tiling pipeline was reachable only via its own CLI (an orphan). This wires it into
- tiling's recall benefit is measured against GT, not just
- tile flag (+ --tile-rows/--tile-cols/--tile-overlap, default 2x2/0.15). When set, each rasterized
- Tiling (crop into overlapping tiles, OCR each, merge) instead of one

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d94fc110aef8`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
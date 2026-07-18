# BLUEPRINT-VISION-OCR/U-XRAY-LOOP-PAGE-CLASSIFY-GATE — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-LOOP-PAGE-CLASSIFY-GATE (slot:xray): wire opt-in pre-VLM page-skip gate into the training loop (measured 40-67% bundle skip)

**Commit:** `a2d885fcb7a6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-16T22:13:19-05:00
**Tags:** blueprint-vision-ocr, u-xray-loop-page-classify-gate, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-LOOP-PAGE-CLASSIFY-GATE (slot:xray): wire opt-in pre-VLM page-skip gate into the training loop (measured 40-67% bundle skip)

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-LOOP-PAGE-CLASSIFY-GATE (slot:xray): wire opt-in pre-VLM page-skip gate into the training loop (measured 40-67% bundle skip)

Wires page-classify as an OPT-IN --page-classify gate: a CONFIDENT non-drawing
page (bom/table/notes/blank/photo) is skipped before the expensive ensemble.
DEFAULT-OFF -> the nightly cron path is byte-identical (the gate is fully behind
opts.pageClassify). Data-loss-safe: skips ONLY on cls.verdict=skip (decidePageVerdict
requires is_drawing===false AND conf>=floor AND source===json); render/parse/
classifier failure falls through to extract. All-pages-skipped cursors as
skipped-all-paperwork (a legit done state, not ensemble-failed). New report field
this_run_pages_skipped_paperwork. Live-validated on the 5pp 11_7 bundle: 2 pages
(bom+table conf 0.98) skipped, 3 drawing pages extracted (16 dims), report=2.

HARDENING (data-loss-critical path): decidePageVerdict skip now requires
source===json (was source!==prose) so a prose/source-less negative can never drive
a skip -- matches the doc intent + closes a future-caller hole. +1 regression test.

Per-file scrutiny: arm A (code-analyzer) PASS; arm B (reviewer) caught a P0 -- the
source===json hardening broke 2 existing source-less fixtures (suite went red); fixed
(fixtures + new regression test) -> 30/30 green. Economics P2 (per-kept-page classify
tax) documented inline. node --check clean.
```

## Files touched (4)
- scripts/blueprint-ocr-training-loop.mjs  | 44 ++++++++++++++++++++++++++++++++++++++++----
- scripts/lib/page-classifier-lib.mjs      |  2 +-
- scripts/lib/page-classifier-lib.test.mjs | 18 +++++++++++++-----
- 3 files changed, 54 insertions(+), 10 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a2d885fcb7a6`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
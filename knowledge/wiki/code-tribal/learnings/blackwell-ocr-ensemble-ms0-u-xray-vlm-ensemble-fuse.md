# BLACKWELL-OCR-ENSEMBLE-MS0/U-XRAY-VLM-ENSEMBLE-FUSE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-VLM-ENSEMBLE-FUSE (slot:xray): multi-VLM ensemble consensus OCR (Blackwell unlock) + leading-dot JSON parse-loss fix

**Commit:** `7a1aea6723ea` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T09:22:26-05:00
**Tags:** blackwell-ocr-ensemble-ms0, u-xray-vlm-ensemble-fuse, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-VLM-ENSEMBLE-FUSE (slot:xray): multi-VLM ensemble consensus OCR (Blackwell unlock) + leading-dot JSON parse-loss fix

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-VLM-ENSEMBLE-FUSE (slot:xray): multi-VLM ensemble consensus OCR (Blackwell unlock) + leading-dot JSON parse-loss fix

New scripts/lib/vision-ensemble-fuse.mjs: pure N-way clustering + noisy-OR corroboration + async concurrent transport (Promise.all). Dims >=2 models agree on = corroborated consensus; 1-of-N = hallucination_candidate flagged, never silently trusted. Reuses scoreDimensionSet matcher + ollama-vision primitives (cross-MODEL fold, one-vote-per-model; NOT a dup of cross-SOURCE reconcile). CLI vision-ensemble-extract.mjs. 28 tests, per-file 2-reviewer PASS 0 P0/P1.

REGRESSION-CLASS fix (R12): VLMs emit '.171' (no leading zero) -> invalid JSON -> parseVisionResponse discarded the WHOLE extraction. Sanitizer inserts zero ONLY in JSON value position. +2 tests (54/54). Live: .171in recovered as 4.3434mm, F1 0.8 vs truth.

3-model concurrency blocked by transient daemon contention; warm single-model proof landed E2E.
```

## Files touched (9)
- CLAUDE.md                                                        |   2 +
- .../wiki/lessons/vlm-ensemble-ocr-and-leading-dot-parse-fix.md   |  78 +++++
- scripts/lib/ollama-vision-extract-lib.mjs                        |   8 +
- scripts/lib/ollama-vision-extract-lib.test.mjs                   |  25 ++
- scripts/lib/vision-ensemble-fuse.mjs                             | 448 +++++++++++++++++++++++++++++
- scripts/lib/vision-ensemble-fuse.test.mjs                        | 312 ++++++++++++++++++++
- scripts/vision-ensemble-extract.mjs                              | 213 ++++++++++++++
- state/shared/vision-ensemble-report.json                         | 187 ++++++++++++
- 8 files changed, 1273 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7a1aea6723ea`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-OCR-ENSEMBLE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
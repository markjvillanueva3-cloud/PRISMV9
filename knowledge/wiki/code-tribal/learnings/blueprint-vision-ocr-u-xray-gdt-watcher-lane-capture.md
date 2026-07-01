# BLUEPRINT-VISION-OCR/U-XRAY-GDT-WATCHER-LANE-CAPTURE — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-WATCHER-LANE-CAPTURE (slot:xray): durably log per-PDF lane (text-emitted vs ocr-routed) from the corpus watcher

**Commit:** `2d77536fe83b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T00:34:22-05:00
**Tags:** blueprint-vision-ocr, u-xray-gdt-watcher-lane-capture, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-WATCHER-LANE-CAPTURE (slot:xray): durably log per-PDF lane (text-emitted vs ocr-routed) from the corpus watcher

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-WATCHER-LANE-CAPTURE (slot:xray): durably log per-PDF lane (text-emitted vs ocr-routed) from the corpus watcher

Extends U-XRAY-GDT-CORPUS-SCAN-ROUTE. The watcher spawned pdf-parse-extract with stdio:inherit and recorded only the exit code, losing which lane each PDF took (the scan-route outcome was lost to transient stdout).

- NEW pure parseExtractLanes(stdout): parse the extractor summary JSON -> {emitted, routedToOcr, results:[{path,lane,routed_to_ocr,skip_reason}]} or null fail-soft (empty/non-JSON/no-results/non-object).
- NEW appendExtractLog(relPath, lanes, status, stderrExcerpt, logPath): append a kind:extracted JSONL record; a null lanes still logs exit + null lane (R12 never-silently-dropped); folds stderr_excerpt in only on a non-zero exit.
- extract loop: capture stdout (encoding utf-8, windowsHide, maxBuffer 8MB; was stdio:inherit), parse lane, append record, echo a compact lane tag + stderr on failure.
- 11 new tests (22/22): parseExtractLanes happy + 3 failure + 2 adversarial; appendExtractLog fail-soft + populated via tmp-file DI. Per-file 2-arm scrutiny (reviewer + code-analyzer): both PASS, 0 P0/P1; the 2 actionable P2s (swallowed stderr, untested fail-soft) closed in this commit.
- LIVE: real 2D_Drawing.pdf -> extractor -> parseExtractLanes -> {emitted:0, routedToOcr:1, lane:ocr, skip_reason:image-based-no-structure}. No external consumer of pdf-watcher-log.jsonl (grep-confirmed) so the new kind is additive-safe.
```

## Files touched (3)
- scripts/pdf-corpus-watcher-sweep.mjs      |  79 ++++++++++++++++++++++++++++++++++++++-
- scripts/pdf-corpus-watcher-sweep.test.mjs | 140 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 215 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- till logs exit + null lane (R12 never-silently-dropped); folds stderr_excerpt in only on a non-zero exit.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2d77536fe83b`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
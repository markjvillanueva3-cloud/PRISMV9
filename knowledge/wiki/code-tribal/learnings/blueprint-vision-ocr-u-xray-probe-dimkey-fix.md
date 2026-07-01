# BLUEPRINT-VISION-OCR/U-XRAY-PROBE-DIMKEY-FIX — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PROBE-DIMKEY-FIX (slot:xray): fix probe dim-key bug + --enhance/--raw-out; root-cause = TRANSIENT failures, not scan/model

**Commit:** `bfcd8256fe4c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T12:54:19-05:00
**Tags:** blueprint-vision-ocr, u-xray-probe-dimkey-fix, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PROBE-DIMKEY-FIX (slot:xray): fix probe dim-key bug + --enhance/--raw-out; root-cause = TRANSIENT failures, not scan/model

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PROBE-DIMKEY-FIX (slot:xray): fix probe dim-key bug + --enhance/--raw-out; root-cause = TRANSIENT failures, not scan/model

R12 self-correction: probe-vision-model.mjs read dims from parsed.dimensions but
parseVisionResponse returns {success,error,extraction:{dimensions}} -- so it
mis-reported 0 dims for EVERY non-empty response. Fixed to read
parsed.extraction.dimensions + surface parse_ok/parse_error/gdt_count. Added
--enhance (pdf-to-png --preprocess --deskew) + --raw-out (full-response dump) used
for the root-cause dig below. detectThinkingTrap unchanged; 3/3.

ROOT-CAUSE CHAIN (each step empirically refuted with the probe, R12):
- NOT page-classify over-skip (1.1% of cursor).
- NOT scan quality: 8b on D22706-12 WITH vs WITHOUT --enhance -> same (read fine
  both ways); enhancement is NOT the fix (the pdf-to-png --preprocess already
  exists but is moot here -- the print isn't degraded).
- NOT model capacity: bare qwen3-vl:32b returns raw_len=0 (empty, unusable);
  the 8b reads the SAME 'failed' print cleanly -- parse_ok=true, 24 dims.
- => the production 'skipped-ensemble-failed' on D22706-12 was TRANSIENT (timeout/
  GPU-contention/cold-reload during the heavy corpus grind). The print reads fine
  in isolation. So the 15.2% is substantially RECOVERABLE by re-running --retry-failed
  (the U-XRAY-RETRY-FAILED unit shipped earlier this session) with the SAME ensemble
  -- NOT a stronger model. Exact recoverable fraction needs a full --retry-failed
  pass to measure (1 confirming data point so far).

NEXT: run a --retry-failed pass once the forward grind has headroom; the
keep-alive fix (06-16) + the now-continuous single-grinder reduce new transient
failures. Demotes P0.3 scan-preprocessing; promotes retry-failed recovery.
```

## Files touched (2)
- scripts/probe-vision-model.mjs | 28 ++++++++++++++++++++--------
- 1 file changed, 20 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show bfcd8256fe4c`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
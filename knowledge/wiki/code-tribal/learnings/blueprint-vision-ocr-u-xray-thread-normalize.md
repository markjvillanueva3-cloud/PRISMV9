# BLUEPRINT-VISION-OCR/U-XRAY-THREAD-NORMALIZE — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-THREAD-NORMALIZE (slot:xray): canonical thread-callout normalizer in the OCR extraction path

**Commit:** `4c0828c118af` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T08:54:15-05:00
**Tags:** blueprint-vision-ocr, u-xray-thread-normalize, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-THREAD-NORMALIZE (slot:xray): canonical thread-callout normalizer in the OCR extraction path

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-THREAD-NORMALIZE (slot:xray): canonical thread-callout normalizer in the OCR extraction path

Backlog P2.8 symbol/vocabulary normalizer (surface-finish was done in 02b56c847f; thread was the gap).
Threads are the most common blueprint callout and the VLM frequently garbles them. New pure
normalizeThreadCallout(raw) (sibling of normalizeSurfaceFinish) de-garbles + resolves a canonical
{system, series, major_dia_in, tpi, pitch_mm, class} so downstream (quote/cam tapping ops) gets a clean
spec instead of raw text. Wired additively into extractDimension as a gated `thread:` field (a plain
linear dim stays null). Handles Unified inch (fraction/decimal/screw/integer-major, with #-less screw
sizes disambiguated from inch majors by tpi), metric (MxP + bare-M ISO-261 coarse-pitch fill), NPT
(major_dia_in null -- nominal pipe size is not the thread major).

Live-validated on realistic JM callouts. Per-file 2-arm scrutiny:
  - arm B P1 FIXED: "M2 STEEL"/"M2 TOOL STEEL"/"M42 HSS"/"D2 RC60" fabricated a metric thread (M2 = AISI
    tool steel, and JM is a die shop) -> material/grade keyword guard (R12, never fabricate from a grade).
  - P2 FIXED: screw-vs-inch ("10-24 UNC" = #10 .190, not 10in) by tpi>=16; inch-major sanity cap (<=4in)
    so "14-20" is a range, not a 14in thread.
Purely additive: no existing extractDimension field changed; no consumer reads .thread yet (delivered IN
the OCR product). 88/88 tests, real reference values (ASME B1.1 screw majors, ISO 261 coarse pitch).
```

## Files touched (3)
- scripts/lib/ollama-vision-extract-lib.mjs      | 123 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/ollama-vision-extract-lib.test.mjs |  77 ++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 200 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4c0828c118af`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
# BLUEPRINT-VISION-OCR/U-XRAY-PERFECT-PARTS-MULTIPAGE — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PERFECT-PARTS-MULTIPAGE (slot:xray): TRUE-test OCRs ALL pages, not page-0-only -- fixes false recall=0 on multi-page print bundles

**Commit:** `d820c159365a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T15:02:13-05:00
**Tags:** blueprint-vision-ocr, u-xray-perfect-parts-multipage, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PERFECT-PARTS-MULTIPAGE (slot:xray): TRUE-test OCRs ALL pages, not page-0-only -- fixes false recall=0 on multi-page print bundles

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PERFECT-PARTS-MULTIPAGE (slot:xray): TRUE-test OCRs ALL pages, not page-0-only -- fixes false recall=0 on multi-page print bundles

ROOT CAUSE (run-verified, not corroboration as a prior memory wrongly claimed -- R12
self-corrected): validate-perfect-parts rasterized PAGE 0 ONLY ("the perfect-parts
prints are single drawings" -- FALSE). Docustrata bundles are commonly multi-page:
a cover/table/routing page + the actual DRAWING on a LATER page. So the harness OCR'd
the cover, missed the drawing, scored recall=0 -- NOT an OCR-capability failure.

RUN-PROVEN on "Scanned Document - 11_18_2020 6_17 AM.pdf" (a perfect-part print):
  - page-classify: p0=table(0.98), p2=DRAWING(conf 1.0)
  - probe p0 (8b): raw_len=456, 0 dims  (the cover -- what the harness was reading)
  - probe p2 (8b): parse_ok, 14 dims    (the drawing -- what it was MISSING)
So the 8b reads the drawing fine; the harness just never looked at the drawing page.

FIX: rasterPage0 -> rasterAllPages (cap 12, mirrors the grinder's multi-page
discipline); main loop OCRs every page + UNIONs the dims before scoring; records
pages_total/pages_ocrd. Sequential by design (Ollama serializes per-model; must not
hammer the GPU concurrently with the live grinder). Additive -- the recall metric
can only rise (more pages read). syntax OK; end-to-end --limit 6 re-validation
running in background to quantify the recall lift.

BROADER LEAD: page-0-only on multi-page bundles is a strong candidate for the
operator's "delta missed features that were clear to see" -- if the LIVE print-reading
path delta consumes also reads page-0-only, it would look at a cover page and miss the
drawing. Next: verify the delta/production print-reading entry reads all pages.
Follow-on optimization: page-classify-gate validate's pages (skip cover/table -> faster
+ cleaner precision), like the grinder's --page-classify.
```

## Files touched (2)
- scripts/validate-perfect-parts.mjs | 218 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 218 insertions(+)

## Lessons surfaced in commit body
- wrongly claimed -- R12

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d820c159365a`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
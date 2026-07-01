# BLUEPRINT-VISION-OCR/U-XRAY-GDT-TRIBAL-PLAN — [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-TRIBAL-PLAN (slot:xray): blueprint+GD&T tribal-knowledge injection plan

**Commit:** `9c7943f019a7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T10:18:56-05:00
**Tags:** blueprint-vision-ocr, u-xray-gdt-tribal-plan, auto-distilled

## Subject
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-TRIBAL-PLAN (slot:xray): blueprint+GD&T tribal-knowledge injection plan

## Body
```
[MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-GDT-TRIBAL-PLAN (slot:xray): blueprint+GD&T tribal-knowledge injection plan

Operator: "plan for tribal knowledge injection -- if we don't have enough data on
blueprint reading, gather sources, run pdf-learn/video-learn for blueprint+GD&T."

ASSESSMENT (enumerated): 7,632 tribal files (260 GD&T/print-reading matches) +
GD&T parser engines + 1 academy course -- parsing machinery exists; authoritative
SOURCE corpus (Y14.5/blueprint-reading textbooks + video) is THIN (0 dedicated GD&T
source in 1,256 resources PDFs). Operator conditional met -> gather + ingest.

SHIPPED: the plan (assessment + reuse pipeline: pdf-corpus-watcher-sweep +
pdf-parse-extract + /pdf-learn + /video-learn -> tribal-by-domain-inject; gather
source list with download-permission boundary; continuous-cron; loss-fn).
Drop-zone resources/blueprint-gdt-corpus/ + README created on-disk (resources/ is
gitignored data -- not tracked, but live under a watcher WATCH_DIR).

PROOF + FINDING (live): pdf-parse-extract on 2D_Drawing.pdf -> 0 text/0 headings:
IMAGE-based. Two lanes -> drawing PDFs to the OCR/VLM grinder (now continuous),
text textbook PDFs to pdf-learn (the gather lane). Plan carries the
heading_count==0 routing rule so the watcher never emits empty tribal notes.
```

## Files touched (2)
- .../specs/BLUEPRINT-GDT-TRIBAL-INJECTION-PLAN-2026-06-19.md      | 104 +++++++++++++++++++++++++++++
- 1 file changed, 104 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9c7943f019a7`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-VISION-OCR.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
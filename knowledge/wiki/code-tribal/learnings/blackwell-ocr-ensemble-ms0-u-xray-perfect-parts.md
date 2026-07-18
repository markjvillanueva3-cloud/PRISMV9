# BLACKWELL-OCR-ENSEMBLE-MS0/U-XRAY-PERFECT-PARTS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-PERFECT-PARTS (slot:xray): find part numbers with the complete print+CAD+CNC-program chain

**Commit:** `250ffb8a6ef5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-08T13:53:57-05:00
**Tags:** blackwell-ocr-ensemble-ms0, u-xray-perfect-parts, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-PERFECT-PARTS (slot:xray): find part numbers with the complete print+CAD+CNC-program chain

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-OCR-ENSEMBLE-MS0]/U-XRAY-PERFECT-PARTS (slot:xray): find part numbers with the complete print+CAD+CNC-program chain

Operator: 'find perfect print/CAD/CNC-program part numbers that have everything we need.' find-perfect-parts.mjs SEARCHES juliett's blueprint-program-join-full-v6.jsonl (76205 PN joins, R8 — no re-OCR): a PN is 'perfect' iff blueprints>0 AND a CAD leg (kind:cad OR has_geometry_model/has_2d_drawing) AND an NC leg (kind:program OR has_nc_program). RESULT: 236 perfect / 94 exact-confidence / 91 clean (exact + sane count caps that drop bare-numeric PN-collisions like '24000' w/ 957 blueprints) / 11 ALSO carrying a neutral STEP/IGES CAD (most reusable). Top exemplar T-11BT-27-250-GR5 (Optimas) VERIFIED end-to-end on disk: print Docustrata/_organized/SCANS/2023_08_03_15_55_20.pdf + CAD HAAS-HURCO/OPTIMAS/{.ipt,.stp} + CNC OMG/CUSTOMERS/OPTIMAS/{.MIN,.mcx-8} + 7 PRISM_UPGRADED Okuma .nc posts. Outputs report .md + .json (each part w/ sample print/cad/nc filenames + customers + corrob). 8/8 tests (mutation-verified non-tautological). Per-file 2-reviewer PASS 0 P0/P1. CAVEAT (R12, disclosed in report): join stores filenames not paths — resolve via glob on PN stem; exact=PN-string match, spot-check the print depicts the part. These 91 (esp 11 STEP) are the highest-value closed-loop supervision triples + delta/kilo/oscar reference exemplars.
```

## Files touched (5)
- scripts/find-perfect-parts.mjs                                      |  161 +++++++
- scripts/find-perfect-parts.test.mjs                                 |   90 ++++
- state/shared/ocr-training-loop/PERFECT-PRINT-CAD-PROGRAM-PARTS.md   |   51 ++
- state/shared/ocr-training-loop/perfect-print-cad-program-parts.json | 1562 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 1864 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 250ffb8a6ef5`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-OCR-ENSEMBLE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
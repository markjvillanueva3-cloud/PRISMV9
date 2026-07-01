# SFC-JM-ACCURACY/U-SFC-NC-PARAM-EXTRACT — [MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-NC-PARAM-EXTRACT (slot:oscar): NC-program cutting-parameter extractor (S/F/T per tool) -- the extraction core for validating SFC vs ALL JM Die programs

**Commit:** `1eb08330e715` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T08:05:38-05:00
**Tags:** sfc-jm-accuracy, u-sfc-nc-param-extract, auto-distilled

## Subject
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-NC-PARAM-EXTRACT (slot:oscar): NC-program cutting-parameter extractor (S/F/T per tool) -- the extraction core for validating SFC vs ALL JM Die programs

## Body
```
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-NC-PARAM-EXTRACT (slot:oscar): NC-program cutting-parameter extractor (S/F/T per tool) -- the extraction core for validating SFC vs ALL JM Die programs

Pure lib over tokenizeNc+detectUnits (no fork) + NC_TEXT_EXTS gate (no binary
.mcx text-scrape). Modal S/F/T scan: G96/G97 spindle mode, G94/G95 feed mode,
G50 rpm-clamp excluded from cutting spindle, Txxyy lathe tool unpacking. Emits
distinct programmed (tool,spindleMode,S,feedMode,F) sets -- exactly what SFC
predicts one of. 7/7 real reference-value tests (mill G97/G94, lathe G96/G50/G95,
+4 adversarial: binary-ext gate, empty, rapid-only, spindle-less, metric).
```

## Files touched (3)
- scripts/lib/sfc-program-param-extract-lib.mjs      | 174 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/sfc-program-param-extract-lib.test.mjs | 139 ++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 313 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1eb08330e715`
- Milestone envelope: `mcp-server/data/milestones/SFC-JM-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
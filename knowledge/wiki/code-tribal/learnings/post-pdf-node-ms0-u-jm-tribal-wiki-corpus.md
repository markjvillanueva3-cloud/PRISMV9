# POST-PDF-NODE-MS0/U-JM-TRIBAL-WIKI-CORPUS — [MAIN] [POST-PDF-NODE-MS0]/U-JM-TRIBAL-WIKI-CORPUS (slot:echo iter8): 80-PDF JM Die TRIBAL+WIKI consolidated corpus (1.1GB) → system-viz augmentation with 88 nodes (1 roost + 7 domain pivots + 80 PDF L10 nodes) + 167 bridge edges to engines per DOMAIN_TO_ENGINE_BRIDGES. Pure-fn classifier (37/37 tests PASS) with filename-heuristic routing: mill (24), reference (27), cam (16), lathe (5), cad (4), post (3), wire (1). Detects vendor (Autodesk/CNCCookbook/OpenMind/Mastercam/SolidCAM/Dassault), cam_system (inventorcam/solidcam/hypermill/mastercam/fusion360/solidworks), controller (haas/mazak/okuma/hurco/siemens/heidenhain/fanuc/mitsubishi). Tooling-tag post-pass. Registered in regen-viz FAST[] after generate-post-pdf-corpus-features. Files: jm-die-tribal-wiki-classifier.mjs, jm-die-tribal-wiki-classifier.test.mjs, generate-jm-die-tribal-wiki-features.mjs, regen-viz.mjs.

**Commit:** `f040c2ca53a1` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T13:41:12-05:00
**Tags:** post-pdf-node-ms0, u-jm-tribal-wiki-corpus, auto-distilled

## Subject
[MAIN] [POST-PDF-NODE-MS0]/U-JM-TRIBAL-WIKI-CORPUS (slot:echo iter8): 80-PDF JM Die TRIBAL+WIKI consolidated corpus (1.1GB) → system-viz augmentation with 88 nodes (1 roost + 7 domain pivots + 80 PDF L10 nodes) + 167 bridge edges to engines per DOMAIN_TO_ENGINE_BRIDGES. Pure-fn classifier (37/37 tests PASS) with filename-heuristic routing: mill (24), reference (27), cam (16), lathe (5), cad (4), post (3), wire (1). Detects vendor (Autodesk/CNCCookbook/OpenMind/Mastercam/SolidCAM/Dassault), cam_system (inventorcam/solidcam/hypermill/mastercam/fusion360/solidworks), controller (haas/mazak/okuma/hurco/siemens/heidenhain/fanuc/mitsubishi). Tooling-tag post-pass. Registered in regen-viz FAST[] after generate-post-pdf-corpus-features. Files: jm-die-tribal-wiki-classifier.mjs, jm-die-tribal-wiki-classifier.test.mjs, generate-jm-die-tribal-wiki-features.mjs, regen-viz.mjs.

## Body
```
[MAIN] [POST-PDF-NODE-MS0]/U-JM-TRIBAL-WIKI-CORPUS (slot:echo iter8): 80-PDF JM Die TRIBAL+WIKI consolidated corpus (1.1GB) → system-viz augmentation with 88 nodes (1 roost + 7 domain pivots + 80 PDF L10 nodes) + 167 bridge edges to engines per DOMAIN_TO_ENGINE_BRIDGES. Pure-fn classifier (37/37 tests PASS) with filename-heuristic routing: mill (24), reference (27), cam (16), lathe (5), cad (4), post (3), wire (1). Detects vendor (Autodesk/CNCCookbook/OpenMind/Mastercam/SolidCAM/Dassault), cam_system (inventorcam/solidcam/hypermill/mastercam/fusion360/solidworks), controller (haas/mazak/okuma/hurco/siemens/heidenhain/fanuc/mitsubishi). Tooling-tag post-pass. Registered in regen-viz FAST[] after generate-post-pdf-corpus-features. Files: jm-die-tribal-wiki-classifier.mjs, jm-die-tribal-wiki-classifier.test.mjs, generate-jm-die-tribal-wiki-features.mjs, regen-viz.mjs.
```

## Files touched (5)
- scripts/generate-jm-die-tribal-wiki-features.mjs   | 187 ++++++++++++++++
- scripts/lib/jm-die-tribal-wiki-classifier.mjs      | 155 ++++++++++++++
- scripts/lib/jm-die-tribal-wiki-classifier.test.mjs | 235 +++++++++++++++++++++
- scripts/regen-viz.mjs                              |   1 +
- 4 files changed, 578 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f040c2ca53a1`
- Milestone envelope: `mcp-server/data/milestones/POST-PDF-NODE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
# MILL-PDF-CORPUS-MS0/U-FOXTROT-LIMA-CROSSOVER — [MAIN] [MILL-PDF-CORPUS-MS0]/U-FOXTROT-LIMA-CROSSOVER (slot:foxtrot /loop iter4): milling-PDF corpus manifest + cited tribal seed + KnowledgeCurriculumBridgeEngine.lessonsForOperation() — feeds /mill-studio with academy + PDF-corpus cited knowledge

**Commit:** `057136e9a669` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T11:20:49-05:00
**Tags:** mill-pdf-corpus-ms0, u-foxtrot-lima-crossover, auto-distilled

## Subject
[MAIN] [MILL-PDF-CORPUS-MS0]/U-FOXTROT-LIMA-CROSSOVER (slot:foxtrot /loop iter4): milling-PDF corpus manifest + cited tribal seed + KnowledgeCurriculumBridgeEngine.lessonsForOperation() — feeds /mill-studio with academy + PDF-corpus cited knowledge

## Body
```
[MAIN] [MILL-PDF-CORPUS-MS0]/U-FOXTROT-LIMA-CROSSOVER (slot:foxtrot /loop iter4): milling-PDF corpus manifest + cited tribal seed + KnowledgeCurriculumBridgeEngine.lessonsForOperation() — feeds /mill-studio with academy + PDF-corpus cited knowledge

Closes lima request: "PDFs for milling in resources folder — generate nodes, wiki, tribal knowledge to feed into all milling nodes".

Surveyed resources/ for milling-domain PDFs — found 24 sources spanning vendor-authoritative (Haas NGC operator manual 2023, Hurco WinMax workbook + cutter-comp + recovery, Sandvik Coromant 2023-24 GC milling catalog + Solid End Mills, hyperMILL Open Mind v31 manual, Mastercam X8 Dynamic Milling, SolidCAM/InventorCAM 2024 2.5D + 5X + Multiaxis Drilling), post-processor docs (Cope 5-Axis G08 ASR), and industry reference (CNCCookbook Face Mill Speeds + Helical Interpolation + Workholding + Tool Holders + Deep Hole Drilling).

NEW (4 files, 1 file modified):
  state/shared/dashboards/milling-pdf-corpus.json  (manifest node, 24 sources, operationTopicIndex)
  knowledge/wiki/code-tribal/milling/milling-pdf-corpus.md  (wiki entry — Tier-A/B tables, source attribution doctrine, bridge architecture)
  mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.ts  (15 source-cited draft tips covering 12 operations)
  mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.test.ts  (15 tests — attribution-integrity invariants)
  mcp-server/src/engines/KnowledgeCurriculumBridgeEngine.ts  (+lessonsForOperation +listMillOperationsWithCitedKnowledge +singleton export)

Foxtrot-soul refuse-list enforced throughout:
  - Source attribution mandatory (every tip cites sourceId + sourceTitle + vendor)
  - No anonymous tips (test asserts non-empty fields)
  - No averaging conflicting tips (conflicts surfaced as separate tips)
  - Single-source tips stay draft-status until ≥2-source corroboration

PB-MS0/P3 follow-up: this commit closes the "academy → mill-studio wizard" bridge gap noted at end of PB-MS0/P3-U01 audit. MillMasterOrchestratorFacadeEngine can now call knowledgeCurriculumBridgeEngine.lessonsForOperation(opType) to surface cited PDF-corpus wisdom during /mill-studio runs.

36/36 tests PASS (15 milling-cited-tips + 21 featureInteraction-cross-ref from prior iter). tsc clean.

Next iter: deep online research for DAPRA / Sandvik / PTS-Tools / Widia / Ingersoll Cutting Tools per follow-up user msg — same source-attribution rigor, new vendor-online-resources manifest.
```

## Files touched (8)
- .../wiki/code-tribal/milling/milling-pdf-corpus.md |  99 +++++++
- .../tribal-tips/milling-pdf-cited-tips.test.ts     | 141 ++++++++++
- .../src/data/tribal-tips/milling-pdf-cited-tips.ts | 305 +++++++++++++++++++++
- .../src/engines/KnowledgeCurriculumBridgeEngine.ts |  49 ++++
- scripts/generate-testing-infra-features.mjs        | 253 +++++++++++++++++
- scripts/generate-testing-infra-features.test.mjs   | 144 ++++++++++
- state/shared/dashboards/milling-pdf-corpus.json    | 276 +++++++++++++++++++
- 7 files changed, 1267 insertions(+)

## Lessons surfaced in commit body
- lessonsForOperation() — feeds /mill-studio with academy + PDF-corpus cited knowledge
- lessonsForOperation +listMillOperationsWithCitedKnowledge +singleton export)
- til ≥2-source corroboration
- lessonsForOperation(opType) to surface cited PDF-corpus wisdom during /mill-studio runs.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 057136e9a669`
- Milestone envelope: `mcp-server/data/milestones/MILL-PDF-CORPUS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
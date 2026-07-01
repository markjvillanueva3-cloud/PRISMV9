# POST-PDF-NODE-MS0/U-JM-CONTENT-CLASSIFIER — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-PDF-NODE-MS0]/U-JM-CONTENT-CLASSIFIER (slot:echo /loop iter12 /yolo): close iter11 classifier blindspot via content-based fallback. NEW: scripts/lib/jm-die-content-classifier.mjs (pure: leadingPages, detectController, detectVendor, classifyWithContent + CONTROLLER_MARKERS 11 vendors × patterns + VENDOR_MARKERS 9 vendors × patterns) + 32-test concrete-value test suite. WIRED into scripts/generate-curriculum-tribal-candidates.mjs — when iter8 filename-classifier returns null vendor/controller, scans leading 5 pages of extract for content markers and merges. RESULT: 26/94 candidates recovered (28% of total, 46% of previously-unspecified). Distribution shift {unspecified:57→31, mazak:35→38(+3), siemens:0→14(+14), okuma:0→6(+6), fanuc:0→3(+3), haas:1→1, hurco:1→0}. Siemens/Okuma/Fanuc now visible for the first time — were entirely hidden in iter11 because their extracts have only the controller name in headers/footers, not filenames. Recovery sources: TNC 530/Sinumerik 840D/828D/Fanuc 30i-/OSP-P200L/Mazatrol Matrix/MELDAS/WinMax/Haas Mill/Speedio patterns. controllerSource + vendorSource fields added to enriched record so downstream consumers (cited tribal tip curation in iter13+) can distinguish high-confidence filename matches from lower-confidence content scans. Existing classifications preserved (no override). Cumulative test count: 217/217 PASS (32 content-classifier + 44 candidate + 49 query + 55 ranker + 37 classifier). Spec regenerated showing new controller distribution + 26-wins counter.

**Commit:** `fbd4ad69a1c0` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T18:38:41-05:00
**Tags:** post-pdf-node-ms0, u-jm-content-classifier, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-PDF-NODE-MS0]/U-JM-CONTENT-CLASSIFIER (slot:echo /loop iter12 /yolo): close iter11 classifier blindspot via content-based fallback. NEW: scripts/lib/jm-die-content-classifier.mjs (pure: leadingPages, detectController, detectVendor, classifyWithContent + CONTROLLER_MARKERS 11 vendors × patterns + VENDOR_MARKERS 9 vendors × patterns) + 32-test concrete-value test suite. WIRED into scripts/generate-curriculum-tribal-candidates.mjs — when iter8 filename-classifier returns null vendor/controller, scans leading 5 pages of extract for content markers and merges. RESULT: 26/94 candidates recovered (28% of total, 46% of previously-unspecified). Distribution shift {unspecified:57→31, mazak:35→38(+3), siemens:0→14(+14), okuma:0→6(+6), fanuc:0→3(+3), haas:1→1, hurco:1→0}. Siemens/Okuma/Fanuc now visible for the first time — were entirely hidden in iter11 because their extracts have only the controller name in headers/footers, not filenames. Recovery sources: TNC 530/Sinumerik 840D/828D/Fanuc 30i-/OSP-P200L/Mazatrol Matrix/MELDAS/WinMax/Haas Mill/Speedio patterns. controllerSource + vendorSource fields added to enriched record so downstream consumers (cited tribal tip curation in iter13+) can distinguish high-confidence filename matches from lower-confidence content scans. Existing classifications preserved (no override). Cumulative test count: 217/217 PASS (32 content-classifier + 44 candidate + 49 query + 55 ranker + 37 classifier). Spec regenerated showing new controller distribution + 26-wins counter.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-PDF-NODE-MS0]/U-JM-CONTENT-CLASSIFIER (slot:echo /loop iter12 /yolo): close iter11 classifier blindspot via content-based fallback. NEW: scripts/lib/jm-die-content-classifier.mjs (pure: leadingPages, detectController, detectVendor, classifyWithContent + CONTROLLER_MARKERS 11 vendors × patterns + VENDOR_MARKERS 9 vendors × patterns) + 32-test concrete-value test suite. WIRED into scripts/generate-curriculum-tribal-candidates.mjs — when iter8 filename-classifier returns null vendor/controller, scans leading 5 pages of extract for content markers and merges. RESULT: 26/94 candidates recovered (28% of total, 46% of previously-unspecified). Distribution shift {unspecified:57→31, mazak:35→38(+3), siemens:0→14(+14), okuma:0→6(+6), fanuc:0→3(+3), haas:1→1, hurco:1→0}. Siemens/Okuma/Fanuc now visible for the first time — were entirely hidden in iter11 because their extracts have only the controller name in headers/footers, not filenames. Recovery sources: TNC 530/Sinumerik 840D/828D/Fanuc 30i-/OSP-P200L/Mazatrol Matrix/MELDAS/WinMax/Haas Mill/Speedio patterns. controllerSource + vendorSource fields added to enriched record so downstream consumers (cited tribal tip curation in iter13+) can distinguish high-confidence filename matches from lower-confidence content scans. Existing classifications preserved (no override). Cumulative test count: 217/217 PASS (32 content-classifier + 44 candidate + 49 query + 55 ranker + 37 classifier). Spec regenerated showing new controller distribution + 26-wins counter.
```

## Files touched (6)
- scripts/generate-curriculum-tribal-candidates.mjs  |  17 ++-
- scripts/lib/jm-die-content-classifier.mjs          |  98 ++++++++++++
- scripts/lib/jm-die-content-classifier.test.mjs     | 164 +++++++++++++++++++++
- ...IE-CURRICULUM-TRIBAL-CANDIDATES-2026-05-26.html |  19 ++-
- ...-DIE-CURRICULUM-TRIBAL-CANDIDATES-2026-05-26.md |  14 +-
- 5 files changed, 298 insertions(+), 14 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fbd4ad69a1c0`
- Milestone envelope: `mcp-server/data/milestones/POST-PDF-NODE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
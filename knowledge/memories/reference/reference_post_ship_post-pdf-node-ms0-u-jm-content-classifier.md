---
name: reference_post_ship_post-pdf-node-ms0-u-jm-content-classifier
description: Auto-distilled learnings from shipping POST-PDF-NODE-MS0/U-JM-CONTENT-CLASSIFIER (commit fbd4ad69a). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.982Z
aliases: reference_post_ship_post-pdf-node-ms0-u-jm-content-classifier
---


# POST-PDF-NODE-MS0/U-JM-CONTENT-CLASSIFIER

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [POST-PDF-NODE-MS0]/U-JM-CONTENT-CLASSIFIER (slot:echo /loop iter12 /yolo): close iter11 classifier blindspot via content-based fallback. NEW: scripts/lib/jm-die-content-classifier.mjs (pure: leadingPages, detectController, detectVendor, classifyWithContent + CONTROLLER_MARKERS 11 vendors × patterns + VENDOR_MARKERS 9 vendors × patterns) + 32-test concrete-value test suite. WIRED into scripts/generate-curriculum-tribal-candidates.mjs — when iter8 filename-classifier returns null vendor/controller, scans leading 5 pages of extract for content markers and merges. RESULT: 26/94 candidates recovered (28% of total, 46% of previously-unspecified). Distribution shift {unspecified:57→31, mazak:35→38(+3), siemens:0→14(+14), okuma:0→6(+6), fanuc:0→3(+3), haas:1→1, hurco:1→0}. Siemens/Okuma/Fanuc now visible for the first time — were entirely hidden in iter11 because their extracts have only the controller name in headers/footers, not filenames. Recovery sources: TNC 530/Sinumerik 840D/828D/Fanuc 30i-/OSP-P200L/Mazatrol Matrix/MELDAS/WinMax/Haas Mill/Speedio patterns. controllerSource + vendorSource fields added to enriched record so downstream consumers (cited tribal tip curation in iter13+) can distinguish high-confidence filename matches from lower-confidence content scans. Existing classifications preserved (no override). Cumulative test count: 217/217 PASS (32 content-classifier + 44 candidate + 49 query + 55 ranker + 37 classifier). Spec regenerated showing new controller distribution + 26-wins counter.

**Shipped:** 2026-05-26T18:38:41-05:00 by markjvillanueva3-cloud
**Files:** 6 touched

Full distillation: [[post-pdf-node-ms0-u-jm-content-classifier]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._
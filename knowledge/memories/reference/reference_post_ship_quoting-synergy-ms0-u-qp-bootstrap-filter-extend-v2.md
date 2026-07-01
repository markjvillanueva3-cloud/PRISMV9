---
name: reference_post_ship_quoting-synergy-ms0-u-qp-bootstrap-filter-extend-v2
description: Auto-distilled learnings from shipping QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-FILTER-EXTEND-V2 (commit 848e0107a). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.005Z
aliases: reference_post_ship_quoting-synergy-ms0-u-qp-bootstrap-filter-extend-v2
---


# QUOTING-SYNERGY-MS0/U-QP-BOOTSTRAP-FILTER-EXTEND-V2

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-BOOTSTRAP-FILTER-EXTEND-V2 (slot:charlie /goal-yolo iter35): extend iter9 NON_CUSTOMER_SUBDIRS regex with explicit alternates for PRISM[\s_-]?MODIFIED + HURCO[\s_-]?+ PROGRAMS? — catches iter34-surfaced noise patterns. Conservative approach preserves whole-segment anchors so customer names containing noise-substrings (ALCOA POST OFFICE, DOC HOLLIDAY, POSTAL SERVICES, PROGRAMA, MANUAL DEXTERITY CORP) still accepted. 18/18 tests PASS (14 iter9 anti-regression + 4 iter35 new — anti-false-positive + 2 path-extract layered + 1 reject set). Confirmed on live --scan-archive run: top-customers shifted from {PRISM MODIFIED POST PROCESSORS:15, HURCO CNC PROGRAMS:15} to {MATTHEW programs:29, PRISM CAD TESTING:1}. Time bucket variance still 3-way (iter13 working). Closes iter34 follow-up F1; F2 layout audit (U-QP-JM-DIE-LAYOUT-AUDIT, P2) still deferred. Total iter9-35: 26 code units + 8 doc surfaces + 285 verified tests + 4 documented real findings + ITERATIVE FILTER REFINEMENT proven.

**Shipped:** 2026-05-26T05:00:13-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[quoting-synergy-ms0-u-qp-bootstrap-filter-extend-v2]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._
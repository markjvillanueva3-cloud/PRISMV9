---
name: reference_post_ship_cad-closed-loop-ms0-u-cad-volume-metric
description: Auto-distilled learnings from shipping CAD-CLOSED-LOOP-MS0/U-CAD-VOLUME-METRIC (commit 2b27b7acb). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.791Z
aliases: reference_post_ship_cad-closed-loop-ms0-u-cad-volume-metric
---


# CAD-CLOSED-LOOP-MS0/U-CAD-VOLUME-METRIC

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CAD-CLOSED-LOOP-MS0]/U-CAD-VOLUME-METRIC (slot:delta): close compare() defect #1 -- STEP/IGES 'volume' is a bbox PROXY, not solid volume (the blisk 451.5M reading = its bounding box, correctly computed but mislabeled). Add volumeMethod tag (bbox-proxy/mesh/none) + proxy parseWarning; compare() Volume metric is method-aware + ADVISORY on method-mismatch (never false-fails bbox-proxy-vs-mesh). 5 new tests + 33 regression green, 0 tsc errors

**Shipped:** 2026-06-10T14:27:32-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[cad-closed-loop-ms0-u-cad-volume-metric]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._
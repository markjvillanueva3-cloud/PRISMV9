---
name: reference_post_ship_post-pdf-node-ms0-u-mill-post-parity-matrix
description: Auto-distilled learnings from shipping POST-PDF-NODE-MS0/U-MILL-POST-PARITY-MATRIX (commit 7a6fdea20). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.982Z
aliases: reference_post_ship_post-pdf-node-ms0-u-mill-post-parity-matrix
---


# POST-PDF-NODE-MS0/U-MILL-POST-PARITY-MATRIX

[MAIN] [POST-PDF-NODE-MS0]/U-MILL-POST-PARITY-MATRIX (slot:echo iter7): 9-feature Hurco V11 → 14-dialect mill-post parity matrix + 101 concrete-value tests. Closes the corpus-PASS asymmetry (V11 82.4% vs Haas 41.2% vs Okuma 47.1%). Maps every V11 feature to its Haas + Okuma + Heidenhain + Siemens + Fanuc + Mazak + Mitsubishi + Fagor + DMG MORI + Brother + Doosan + Citizen + Generic equivalent. Required-floor features (SAFE-START-BLOCK + COMMENT-FORMAT) cover all 14 dialects. Helpers: featureForDialect, featuresByCategory, gapAnalysis. 101/101 tests PASS — every assertion is a concrete string-equality check, no presence-only stubs. Files: mill-post-feature-parity.{ts,test.ts}.

**Shipped:** 2026-05-26T13:33:54-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[post-pdf-node-ms0-u-mill-post-parity-matrix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._
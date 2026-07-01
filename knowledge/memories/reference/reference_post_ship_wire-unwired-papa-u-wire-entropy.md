---
name: reference_post_ship_wire-unwired-papa-u-wire-entropy
description: Auto-distilled learnings from shipping WIRE-UNWIRED-PAPA/U-WIRE-ENTROPY (commit 905d1cbd8). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.106Z
aliases: reference_post_ship_wire-unwired-papa-u-wire-entropy
---


# WIRE-UNWIRED-PAPA/U-WIRE-ENTROPY

[MAIN-FORCE] [WIRE-UNWIRED-PAPA]/U-WIRE-ENTROPY (slot:papa): wire EntropyTrackerEngine -> prism_dev (3 compute actions: entropy_report/entropy_measure_asset/entropy_recommend). Shannon/Gini/Simpson asset-diversity metrics; DRY _entropyAssetDist/_entropyDomainDist sub-schemas; dispatcher auto-fills total. export class for isolated tests. 16/16 tests incl LIVE round-trip + info-theory reference values (uniform->normalized 1.0, all-in-one->0, fair-coin->1 bit) + schema rejection (per-file scrutiny 2/2 PASS, 0 P0/P1; 1 P3 noted: singleton trend-history interleaves cross-caller in prod). tsc 0 errors.

**Shipped:** 2026-06-13T10:14:41-05:00 by markjvillanueva3-cloud
**Files:** 5 touched

Full distillation: [[wire-unwired-papa-u-wire-entropy]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._
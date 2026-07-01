---
name: reference_post_ship_juliett-db-bridge-ms0-u-db-monolith-stock-positions-loader
description: Auto-distilled learnings from shipping JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-STOCK-POSITIONS-LOADER (commit 8f5d1d974). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.917Z
aliases: reference_post_ship_juliett-db-bridge-ms0-u-db-monolith-stock-positions-loader
---


# JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-STOCK-POSITIONS-LOADER

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JULIETT-DB-BRIDGE-MS0]/U-DB-MONOLITH-STOCK-POSITIONS-LOADER (slot:juliett /goal /loop iter9): port PRISM_STOCK_POSITIONS_DATABASE (hyperMILL stock-corner reference) — 18 normalized positions (9 top + 9 bottom) + resolve(name, bounds) absolute-coord transform. 24/24 tests PASS hermetic. Source: extracted_modules/databases/PRISM_STOCK_POSITIONS_DATABASE.js v1.0.0. Standalone (not bridge-wired — it's a geometric reference, not a quote catalog; consumers are hyperMILL/CAM strategy engines that already exist). Fail-soft: null on unknown name + null on missing/NaN/non-number bounds fields (R12 adversarial covered). Plan: state/shared/specs/JULIETT-DB-BRIDGE-PLAN-2026-05-25.md.

**Shipped:** 2026-05-26T16:01:40-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[juliett-db-bridge-ms0-u-db-monolith-stock-positions-loader]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._
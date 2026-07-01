---
name: reference_post_ship_juliett-db-bridge-ms0-u-db-monolith-mfr-catalog-manifest
description: Auto-distilled learnings from shipping JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-MFR-CATALOG-MANIFEST (commit d837a87ef). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.917Z
aliases: reference_post_ship_juliett-db-bridge-ms0-u-db-monolith-mfr-catalog-manifest
---


# JULIETT-DB-BRIDGE-MS0/U-DB-MONOLITH-MFR-CATALOG-MANIFEST

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [JULIETT-DB-BRIDGE-MS0]/U-DB-MONOLITH-MFR-CATALOG-MANIFEST (slot:juliett /goal /loop iter14): manifest-only port of PRISM_MANUFACTURER_CATALOG_DB.js v1.0.0 (extracted/catalogs/). FIRST file ported from extracted/catalogs/ (6 catalog files, ~250K total). Manifest shape: 11 named manufacturers + 13-key stats table + headline 744 inserts + 197 grades + 3424 cutting_data + 3403 tool_bodies + 7904 source pages. Engine ~140L + tests ~170L / 23/23 PASS hermetic. API: list/listAll/listWithInventory/getStats/getCountsFor/rankByInventoryWeight. Per-manufacturer counts pinned (SECO=483/55/111, SANDVIK=251/15/0, LYNDEX_NIKKEN=0/45/1221, OSG=10/36/976, TUNGALOY=0/0/585, INGERSOLL+MA_FORD all-zero). Sum-invariant test: per-mfr cutting_data sums to 3424 headline. Standalone (manifest reference). Full 744-insert + 3424-cutting-data ingest is a follow-up unit requiring .js → .json conversion + lazy-loader engine — pre-committing the schema here would over-constrain the follow-up. Plan: state/shared/specs/JULIETT-DB-BRIDGE-PLAN-2026-05-25.md. NEXT: PRISM_FINAL_CATALOG_GATEWAY (21K) + PRISM_ZENI_COMPLETE_CATALOG (35K) + PRISM_MANUFACTURER_CATALOG_CONSOLIDATED (55K) + PRISM_CATALOG_FINAL (57K) + PRISM_MAJOR_MANUFACTURERS_CATALOG (73K) — all need manifest-only or JSON-conversion approach.

**Shipped:** 2026-05-26T22:14:01-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[juliett-db-bridge-ms0-u-db-monolith-mfr-catalog-manifest]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._
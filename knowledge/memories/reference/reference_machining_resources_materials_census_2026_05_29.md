---
name: reference_machining_resources_materials_census_2026_05_29
description: Fleet machining census — ~3,500 distinct materials (HYPERMILL 2,544 + MaterialRegistry 1,047 + canonical 15 + EDM 27) all with hardness+physics; resources/ (163,906 files) holds 46 cutting-tool catalogs + 36 workholding catalogs + materials.db SQLite. Shared with all machining domains. Full atlas: state/shared/MACHINING-RESOURCES-MATERIALS-CENSUS-2026-05-29.md.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.201Z
aliases: reference_machining_resources_materials_census_2026_05_29
---


# Machining resources + materials census (2026-05-29, slot:foxtrot, shared fleet-wide)

Operator: *"check resources folder… thousands of materials with hardness/physics data"* + *"share all findings with other machining domains and utilize juliett's findings."* Built via 2 parallel Explore agents per [[feedback_full_recursive_parallel_search]]. **Full atlas (per-domain routing + action items): `state/shared/MACHINING-RESOURCES-MATERIALS-CENSUS-2026-05-29.md`** (foxtrot slot tree; merges with foxtrot branch).

## Materials — operator's "thousands" = TRUE: ~3,500 distinct, ~95%+ with hardness AND physics
- **15** canonical `physics/constants.ts` `CANONICAL_MATERIAL_DB` — kc1.1/mc/Taylor C,n/density/hardness — the safety-critical set engines READ for Kienzle/Taylor (NEVER inline).
- **2,544** `mcp-server/src/data/hypermill-materials-catalog.ts` — HB/HV/HRC ranges + per-process machinability factors (Vc/fz/ae/ap) + multi-standard names. (Largest tier, 70%.)
- **1,047** `registries/MaterialRegistry.ts` 4-layer (CORE→ENHANCED→USER→LEARNED), 127 params, 81 source files / 632,409 lines.
- **27** `mcp-server/src/data/edm-material-db.ts` (EDM_MULTIPASS + EDM_BIMATERIAL) — wedm physics.
- raw on-seat: `resources/OPEN MIND/Tool Database/31.0/databases/materials.db` (SQLite, hyperMILL **v31**).

**⚠ v31/v33 reconciliation (juliett):** hypermill-materials-catalog.ts is labeled v33 but operator runs v31 + on-disk db is 31.0 ([[reference_hypermill_use_v31_not_v33_2026_05_27]]). Re-extract from v31 db or confirm version-stable.

## Resources corpus — `H:/prism/resources` = 163,906 files (slot-tree resources/ is a 6-file STUB)
- **46 cutting-tool catalogs** `MANUFACTURER_CATALOGS/` (~19 brands: Sandvik 10, Guhring/Ingersoll/Korloy/Sumitomo/Tungaloy 2 each, +Iscar/OSG/Walter/Rego-Fix/Big-Daishowa/SGS/Emuge/Accupro singles, +12 generic). Absent-as-dedicated: Kennametal/Seco/Mitsubishi/Kyocera/Harvey/Helical/Niagara/Dormer/Pramet/Widia.
- **36 workholding/fixture catalogs** `WORKHOLDING AND FIXTURE CATALOGS/` (Bison/Kurt/Jergens/Schunk/Kitagawa/Lang/Mate/Royal/System-3R/5th-Axis). Reconfirms fixturing NOT a gap.
- **25** toolholder STEP models; **3,057** posts/machines files (Haas/Hurco/Okuma/Roku — the JM fleet); **272** machine-sim STEP; 947 PDF + 1,823 structured (CSV/JSON/XLSX).

## juliett (DB owner) findings
4-layer MaterialRegistry operational; 81 source files indexed; atomic-write enforced after 46-orphan ~16GB tmp leak; cross-domain bridges wired (WEDM→Qdrant, CAD tribal, JM-DIE-DATABASE 111,745 docs). Source: `mcp-server/src/engines/database-expansion/MEMORY.md`.

## Per-domain (broadcast to chat-bus)
foxtrot=Tier1+Tier3·whiskey=turning catalogs+chucks·mike=EDM 27·kilo=machinability factors·delta=STEP models·echo=POSTS AND MACHINES 3,057·oscar=SF tables in catalogs→SpeedFeedRegistry·charlie=material_id cost xref.

Related: [[reference_mill_domain_atlas_for_foxtrot_2026_05_27]], [[reference_foxtrot_mill_juliett_db_edge_2026_05_29]], [[feedback_use_lima_pypdf_page_extractor]], [[feedback_enumerate_before_read]].

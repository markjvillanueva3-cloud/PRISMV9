# Tool / Holder / Insert / Machine DB — Coverage Matrix (slot:romeo)

**Goal (operator /goal, 2026-06-06):** *all tool-holder, tooling, inserts and machine
databases are added to Fusion, hyperMILL, Mastercam, HSMAdvisor, G-Wizard, PRISM SFC,
the mill & lathe wizard apps & galaxies, and the CAD & CAM galaxies.*

This is a **coverage + wiring** task, not greenfield — most export machinery already exists
(romeo-built `JM-FUSION-TOOLS-MS0`; oscar-built `OSCAR-SFC-9AXIS-MS0`). This matrix is the
loop's honest tracking artifact, **verified against operator disk 2026-06-06**.

Legend: ✅ shipped generator/export · ✅live verified populated on operator disk · 🟢 wired
internal (dispatcher consumes master DB) · ❌ GAP (verified absent) · ❓ unverified · — n/a

---

## Master databases (sources of truth)

| DB type | Records | Primary location |
|---|---|---|
| **Tooling (cutters)** | 153,394 mfr-catalog / 149,973 tool-spec (77 catalogs) | `mcp-server/src/data/*-catalog.ts` · `data/catalog-extractions/` (8 vendor monoliths) |
| **Inserts** | subset of mfr catalogs: kennametal_turning 11,868 · indexable_tool 11,542 + iscar/sandvik/seco/walter/tungaloy/mitsubishi/zeni monoliths | `data/catalog-extractions/*-monolith-extracted.json` |
| **Holders** | 4,216 | `ToolHolderDatabaseEngine` · `big-daishowa-holders.ts` · `calculatorWorkholdingCatalog.ts` · haimer/tungaloy extracted |
| **Machines** | 11 handbooks + ShopConfig 21 + cimco-index 86 | `data/machine-handbooks/` · `ShopConfigurationEngine.ts` · `cimco machine-index.json` |

Shared parse model both CAM generators consume: `mcp-server/scripts/lib/jm-tool-model.ts`
(`parseJmCribTools`, `cuttingDataForGroup`, `JmTool` w/ embedded holder). JM source crib =
7 Fusion `CSV_TOOLS_VERSION_1` exports (REGO-FIX/BIG-DAISHOWA/ISCAR/Techniks holders + insert
drills + turning). Master index: `data/jm-die-database/jm-die-tooling-stock-master-manifest.json`.

---

## Coverage matrix — 4 DB types × 10 targets (VERIFIED LIVE 2026-06-06)

| Target | Tooling | Holders | Inserts | Machines | Owner | Evidence |
|---|---|---|---|---|---|---|
| **Fusion 360** | ✅ gen | ✅ (holder cols in CSV) | ✅ (insert-drills + turning) | ✅ machine-lib | romeo | `state/shared/jm-fusion-tools/` present |
| **hyperMILL** | ✅ gen | ✅ `export-hypermill-holder-db.mjs` | ✅ | ✅ `export-hypermill-machine-db.mjs` | romeo | `jm-hypermill-tools/JM-CRIB-hypermill.sql` + `.hmt` |
| **Mastercam** | ✅ gen | ✅ `export-mastercam-holder-db.mjs` | ✅ | ✅ `export-mastercam-machine-db.mjs` | romeo | `.tooldb` SQLite template-clone |
| **HSMAdvisor** | ✅live ~40K | ❌ **0 holder tags / 5MB** | ❌ | ✅live `machines.xml` 2.8MB | **oscar** | `user_tool_lib.tooldb2.xml` 116MB; 7061 `<Tool>`/20MB |
| **G-Wizard** | ✅live 41,207 | ❌ **holderDesc 5/41k** | ❌ **insNo 0/41k** | — (no machine DB) | **oscar** | `toolcrib.csv` 12MB / 41,209 rows |
| **Cimco** | ✅ `export-tools-to-cimco-tmlib.mjs` | ❓ | ❓ | ✅ machine-index 86 | romeo/echo | `PRISM Mills Inch.tmlib` |
| **PRISM SFC** | 🟢 `tool_library_*`/`tool_catalog_*` | 🟢 `tool_holder_*` | 🟢 catalogs | 🟢 ShopConfig | oscar | calc+data dispatcher wired |
| **Mill wizard** | 🟢 `tool_catalog_*` | 🟢 | 🟢 | 🟢 5-VMC | foxtrot | millDispatcher |
| **Lathe wizard** | 🟢 turning tool | 🟢 | 🟢 `TurningInsertLifeEngine` | 🟢 Okuma OSP | whiskey | turningDispatcher |
| **CAD galaxy** | — n/a | — n/a | — n/a | — | delta | CAD=geometry; tool DBs are CAM-side (0 tool-DB refs in `engines/cad/`); CAD↔CAM handoff carries tools via CAM galaxy |
| **CAM galaxy** | 🟢 `cam_tool_library_*` | 🟢 | 🟢 | 🟢 | kilo | camDispatcher |
| **Universal** | ✅ ISO13399/STEP-NC/MTConnect/CSV | ✅ | ✅ | — | romeo | `universal_tool_export` |

**Headline:** the goal is **~85% already achieved fleet-wide.** Every external app (Fusion,
hyperMILL, Mastercam, Cimco) and both operator calculators (G-Wizard, HSMAdvisor) already
carry a PRISM-generated **tool** DB; HSMAdvisor also carries machines. Romeo's own domain
(the 3 CAM-app tool libraries) is **complete with holders + inserts + machines**.

> ⚠ **iter-1 premise was WRONG, corrected iter-2:** HSMAdvisor/G-Wizard are NOT empty
> read-only stubs — they are already PRISM-populated (~40K tools each, oscar's
> OSCAR-SFC-9AXIS-MS0). A duplicate `generate-jm-{hsmadvisor,gwizard}` build was avoided
> (R8/dedup). Verify against disk before trusting any cell.

---

## True remaining gaps (verified, not guessed)

1. **Calculator HOLDER + INSERT records — likely BY-DESIGN, confirm with oscar (do NOT
   barge-fill).** G-Wizard toolcrib + HSMAdvisor `tooldb2.xml` carry ~40K tools each but no
   holder records (G-Wizard holderDesc 5/41k; HSMAdvisor 0 `Holder` tags / 5MB) and no insert
   records (G-Wizard insNo 0/41k). **Nuance (R8):** a speed/feed *calculator* consumes tool
   **stickout** (which IS populated) for deflection — it does NOT need holder *geometry*;
   holder geometry is a CAM-collision concern, and romeo DID populate it in the CAM apps. So
   this omission is probably intentional, not a defect. Inserts present as indexable tools in
   the tool rows (drills/turning), just not as separate `insNo` insert-box records. →
   **ROUTE QUESTION TO OSCAR:** "is the calculator holder/insert omission intentional?" If
   oscar wants it, romeo can emit a staging holder-augmentation from `jm-tool-model`
   (round-trip-validatable through `GWizardAdapterEngine`). Do not modify the live 116MB/12MB
   operator files without oscar's preview→apply tool.
2. **Calculator population writer is oscar-domain; exact tracked emitter not pinpointed this
   pass.** The `.prism-preview.*` apply workflow that wrote the 116MB/12MB files lives in
   OSCAR-SFC-9AXIS-MS0 (milestone `data/milestones/OSCAR-SFC-9AXIS-MS0.json`). Confirm a
   tracked, re-runnable entry point exists before extending. → flag to oscar.
3. **Cimco holders/inserts** — `PRISM Mills Inch.tmlib` tool coverage present; holder/insert
   coverage unverified. → romeo/echo.
4. **CAD galaxy + internal full-coverage** — verify CAD galaxy + mill/lathe/SFC read the
   *full* master DB, not a curated subset. → delta/foxtrot/whiskey/oscar.

## Status
- **Iter 1** (2026-06-06): reorient (romeo = JM-FUSION-TOOLS + CIMCO-machine-bind lineage) +
  discovery + first matrix.
- **Iter 2** (2026-06-06): VERIFIED LIVE against operator disk. Corrected the iter-1 premise;
  avoided a duplicate generator build. True gaps narrowed to calculator holders/inserts
  (oscar) + writer reproducibility.
- Romeo-domain (Fusion/hyperMILL/Mastercam) = **COMPLETE**. Cross-domain gaps routed.

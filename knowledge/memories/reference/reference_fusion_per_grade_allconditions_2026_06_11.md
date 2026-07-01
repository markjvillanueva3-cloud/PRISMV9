---
name: reference_fusion_per_grade_allconditions_2026_06_11
description: "JM Fusion tool libraries -- per-grade machinability-scaled SFM + hardness filtering SHIPPED (U-MATCAT, U-MATGRADE); all-conditions matrix expansion in progress (slot:romeo, 2026-06-11)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.582Z
aliases: reference_fusion_per_grade_allconditions_2026_06_11
---


**Operator thread (2026-06-11):** make JM's Fusion tool libraries categorized by material
(material -> type -> brand), cutting data per material, then "fine tune SFM as atomically as
we can", then "every single material type AND cutting condition (roughing/semi/HSM/HEM/
slotting/finishing/boring/tapping/drilling/reaming/threading/ramping) -- specific parameters
for all tool paths for all material types." Priority SFC + post + Fusion360.

## SHIPPED (main tree cad-fusion-live-ms0, BOOTSTRAP-SLOT-ENFORCE)
- **U-MATCAT** (f949670776): `generate-jm-fusion-tool-libraries.ts` tags each per-material
  preset with the Fusion stock category (`presetMaterialCategory`: P->steel, M->stainless steel,
  K->cast iron, N->aluminum, S->titanium, H->steel) so Fusion AUTO-SELECTS by stock material.
  Was "all" on every row -> not functional. 933 rows tagged, 0 other cols changed.
- **U-MATGRADE** (705770801f): per-GRADE presets (14 grades P/M/K/N/S/H). SFM scaled from the
  ISO-group base Vc by `MATERIAL_DB.machinability_factor` (pulled live via
  `ultimateSpeedFeedEngine.getMaterialProfile(key)` -- single source of truth, NOT copied).
  Verified differs: 1018=344 > 1045=291 (-15%) > 4140=265 (-23%, matches MATERIAL_DB note);
  304=220 > 17-4=165 > 2205=137; Ti=98 > Inconel=49. HB hardness range per grade ->
  Fusion Filter-by-hardness distinguishes same-category grades. 218 tools -> 2320 rows.

## KEY FACTS (verified this session)
- **SFC `lookupCuttingData`/`calculate` collapse all grades within an ISO group to ONE Vc**
  (1018=4140=4340 all 140 m/min milling). Per-grade SFM ONLY differs via machinability scaling.
- **DANGER (R12): a missing CUTTING_PARAMS `${iso}_${op}_${cuttype}` key silently falls back
  to another ISO group.** H drilling -> P drilling = 105 m/min (344 SFM) = ~5x too fast,
  tool-breaking for HRC55+. GUARDED in generator (`if iso===H && op in {drilling,reaming} return null`)
  until the SFC ships H_drilling data. Same class: verify before trusting any SFC op/material combo.
- Reviewer "P1: 1045==4140 machinability" was a MISREAD -- probe confirms aisi_1045=0.55, alloy_steel=0.50.

## SFC GAP DATA -- DONE (U-SFC-GAPS, 35f4d9f971)
- Workflow `wr0fg62h4` completed: 20 gap combos researched (MH31/Sandvik/Kennametal) +
  adversarially verified + independently physics+code reviewed (both PASS). Applied to
  `UltimateSpeedFeedEngine.ts` CUTTING_PARAMS additively. **H_drilling = 8/11/15 m/min
  (36 SFM) replaces the deadly 105 m/min (344 SFM) fallback.** Generator H-drilling guard
  REMOVED (H drills get safe presets back). 13/13 keys verified via lookupCuttingData.
  Audit correction: H_milling_semi_finishing ALREADY existed (gap was K only, not K+H).
- Verified gap Vc (balanced m/min): drilling K=75 H=11; K_milling_semi=185; tapping M=14
  K=25 N=70 S=6 H=2.5; reaming P=14 M=9 K=30 N=80 S=6 H=6; thread_mill P=100 M=70 K=130
  N=300 S=30 H=40. All cut_types: drilling/tapping=roughing, reaming/thread_mill=finishing,
  milling_semi=semi_finishing.

## ALL-CONDITIONS MATRIX -- DONE (U-ALLCOND 64d7b5d6b6 + U-ALLCOND-DOC)
`generate-jm-fusion-tool-libraries.ts` now emits, per tool, a preset for EACH (grade x
toolpath). Added: `STRATEGY_FACTORS` (mirror engine STRATEGY_MODS), `TOOLPATHS` per-tool-type
matrix, `classifyToolType()`, `condOverride(iso,op,cut,strat,...)` (applies machinability
vcScale x strategy factors), consolidation ported into the generator (JM-CRIB-ALL-families.csv,
supersedes merge-jm-fusion-crib.mjs). Outputs renamed -6groups -> -allconditions. **218 tools
-> 4924 presets.** Verified: 8 mill toolpaths distinct+correct (HEM deep-ap, HSM light-DOC, Slot
full-ae); insert drills->drilling, turning/boring/grooving/threading inserts->turning CSS;
geometry+holder preserved; 0 dangerous speeds (max H 456 SFM finishing, S 260); contiguous
1..218. 2-agent scrutiny PASS after fixing 2 P1s (idx shadow + threading CSS mode).

**FUSION TOOLING PRIORITY COMPLETE.** Operator's full spec delivered: every tool (incl all
inserts) x 14 material grades x all toolpaths, atomic SFM, material->type->brand, full
tool+holder geometry for collision. Importable: JM-CRIB-ALL-families.csv.

## CAM PROPAGATION -- DONE (U-CAM-PROPAGATE 5557a32562, Option B, slot:romeo branch)
`mcp-server/scripts/generate-jm-cam-libraries.ts` parses JM's 7 source Fusion CSVs ->
218 PRISMTool[] (inch->mm x25.4 gated on tool_unit) -> calls EXISTING exporters
`mastercamToolExportEngine.exportFromTools()` + `hyperMillToolExportEngine.exportToHMT()`.
Outputs at `state/shared/jm-fusion-tools/cam-libraries/`: `JM_CRIB.mcam-tools` (218 tools,
Mastercam 2025+ import-ready) + `JM_CRIB.hmt.sql` (218 tools, SQLite DDL+INSERTs) + README.
**P0 caught by per-file scrutiny + fixed:** HyperMill `buildGeomParams` reads geometry ONLY
from `prismTool.physical` -- flat-only fields -> every tool defaulted to 10mm. Fix = nest a
`physical:{}` sub-object (keep flat too; Mastercam reads phys.X ?? flat.X). Verified live:
'BIG DAISHOWA .437' dbl_param1=11.1125mm (=0.4375in x25.4 exact). Reviewer "shank key
tool_shankDiameter" was a MISREAD -- real JM header is `tool_shaftDiameter` (verified).
hyperMILL CAVEAT (in README): .hmt.sql is v33-schema (JM runs v31); needs `sqlite3 build`
step; v31 import UNVERIFIED.

## OPTION A SHIPPED (U-CAM-OPTION-A 486954fe70, slot/romeo, 2026-06-12)
Operator: "hypermill and mastercam need atomic surface as well." All 3 CAMs now carry
per-(grade x toolpath). SINGLE SOURCE OF TRUTH: `mcp-server/scripts/lib/jm-tool-condition-matrix.ts`
`conditionMatrix(tool)->ConditionPreset[]` (canonical mm + m/min), extracted from the Fusion
generator's matrix. Feeds Fusion CSV + hyperMILL .hmt + Mastercam .mcam-tools from ONE place.
Outputs: JM_CRIB.mcam-tools (4706 cutting_data entries) + JM_CRIB.hmt.sql (4706 NCTools + 14
identity Materials). 4706 = Fusion non-default preset count (4924-218 defaults) = 3-CAM parity.
VERIFIED: physics (HEM deep/light-radial, HSM light-DOC, Slot full-radial, Trochoidal deepest),
safety (hardened drilling max 11 m/min, no 344-SFM), cross-check oracle vitest 10/10 (lib
reproduces committed Fusion CSV numbers), Mastercam test 7/7. Built by ultracode workflow
(wh1es6kf0), self-verified after the verify agents stalled on the Ollama-down/memory-pressured host.

## FUSION ALL-CONDITIONS RESTORE (U-ALLCOND-RESTORE 4672786453, slot/romeo, 2026-06-12)
ROOT CAUSE found+fixed: U-ALLCOND (64d7b5d6b6) committed ONLY the 7 -allconditions.csv outputs;
the generator SOURCE + consolidated JM-CRIB-ALL-families.csv were LOST to a shared-tree revert
(fell back to per-grade-only 2436-row stale version -- the file the operator imports). Recovered
the generator by replaying 24 transcript Edits onto f949670776^ (byte-identical oracle on the 7
committed outputs) + restored the 4924-preset consolidated/by-group/by-type-brand. LESSON: commit
SOURCE with OUTPUTS same commit; slot worktrees are revert-safe (why these land on slot/romeo).

## TOOL-DB CONSOLIDATION (U-DBCON-INVENTORY 19fd0146f4, 2026-06-12) -- operator: "way more than 62.7k"
Operator correct: CATALOG_INDEX.json (62,727) UNDERCOUNTS. Inventory spec:
`state/shared/specs/TOOL-DB-CONSOLIDATION-INVENTORY-2026-06-12.md`. src/data extracted=71,037
(3 orphaned: tungaloy-tooling/turning, widia-2022); 20 *-tool-catalog.ts=~70,776 DIVERGING per
vendor (emuge .ts=13717/extracted=8; osg extracted=11550/.ts=0); vendor-catalog-manifest declares
currentTools=54080/targetTools=90000/gap=35920 (un-extracted PDFs). 8 enriched monolith (~232 rich
raw_tools, juliett 2026-05-24, unrouted). PLAN U-DBCON-1..6: route orphans -> .ts-only vendors
(per-vendor dedup) -> enriched -> wire HolderSelectionEngine->prism_cam (Task#14) -> extraction gap
(juliett domain) -> full-DB CAM generalization (corpus-sourced categorized libs via the shared
matrix). Holder ATTACH already done (CATALOG-APP-WIRING-MS0, [[reference_catalog_app_wiring_tooldb_2026_06_09]]).

## U-DBCON-1 SHIPPED (commit 4d0a096edc, [MAIN] [MAIN-FORCE], 2026-06-12)
ROOT-CAUSE FIX: both `CatalogCorpusLoaderEngine.readVendorFile` AND
`regenerate-catalog-index.countRecords` read a non-array catalog via
`Object.values(data).find(isArray)` -- ONLY the first nested array -> multi-section insert
catalogs undercounted. NOW record-aware: merge every array whose elements carry
designation/part_number; EXCLUDE non-record arrays (speed_feed_data/cutting_conditions/summary).
KEEP-IN-SYNC across the .ts engine + .mjs script (different runtimes). Generator also gained
auto-discovery of unindexed *-extracted.json. ROUTED 3 orphans: tungaloy-tooling (356 holders),
tungaloy-turning (2973, +412 threading/grooving), widia-2022 (1122, +509, speed_feed_data
excluded). CATALOG_INDEX 48->51 files, 62727->67178 (+4451). VERIFIED: delta=0 on existing
62727 (zero regression), regression test 7/7, loader compiles. Committed to MAIN (fleet infra,
loader post-dates slot/romeo base). NEXT: U-DBCON-2 (.ts-only vendors -- mind the dev/prod
split-brain [[reference_catalog_dev_prod_split_brain_2026_06_08]]: .ts canonical, .json runtime
cache via build-catalog-json.mjs; the .ts may already load via toolCatalogEngine getters -- avoid
double-count). U-DBCON-3 (8 enriched monolith). Inventory spec: state/shared/specs/TOOL-DB-CONSOLIDATION-INVENTORY-2026-06-12.md.

## U-DBCON-CACHE-SYNC SHIPPED (commit 6b1ae38fe7, [MAIN] [MAIN-FORCE], 2026-06-12) -- THE ~79K-tool answer
THE definitive answer to "way more than 62.7K". ARCHITECTURE: ToolCatalogEngine._loadStandardTools
calls getters `getEmugeTools=()=>loadCatalog("emuge-tools.json")` etc. (ToolCatalogEngine.ts:1475/1535/
1583/1843/2630) that read the TRACKED src/data/<vendor>-tools.json RUNTIME CACHES. Those caches were
EMPTY/stale (emuge-tools.json=3 bytes!) while their *-tool-catalog.ts SOURCES held thousands -- the
dev/prod split-brain (catalogLoader reads src/data in dev) that U-CATALOG-MIRROR-SYNC fixed, REVERTED
to empty (same shared-tree revert class as the lost U-ALLCOND). So the getters returned ~empty:
emuge 0/13715, additional 11/13257, indexable 8/11541, sumitomo 9/7616, guhring 12/3421 -- ~50K+ tools
silently absent. FIX: `node scripts/build-catalog-json.mjs --sync-src` (the canonical postbuild step;
esbuild-evaluates each .ts, writes JSON to dist/data + src/data). 15/15 in 1.3s. VERIFIED: 78,986
records now in the caches (were ~40). Committed to MAIN (fleet build infra; caches read at runtime).
Unified corpus now = ~79K repopulated .ts + 67,178 CATALOG_INDEX extracted - dedup. **If the corpus
ever looks short again, FIRST check the src/data/*-tools.json cache byte sizes -- a 3-byte emuge-tools.json
= the caches reverted to empty; re-run build-catalog-json.mjs --sync-src.**

## GOTCHA: backticks in a double-quoted bash commit message = command substitution
`git commit -m "...`node x`..."` -> bash EXECUTES `node x` (command substitution), blanking that span in
the message + erroring in the shell. The commit still lands but the message span is empty. Use single
quotes, escape the backticks, or a heredoc for commit messages containing shell metachars. (Hit on
6b1ae38fe7 -- "node scripts/build-catalog-json.mjs --sync-src" in backticks got executed + blanked.)

## !! COMMIT ROUTING CHANGED TODAY (2026-06-11) -- BOOTSTRAP marker NO LONGER bypasses
`slot-commit-worktree-enforce.mjs` was fixed today (U-SLOT-COMMIT-ENFORCE-LIVE, india):
`[BOOTSTRAP-SLOT-ENFORCE]` became the universal prefix + silently neutered the gate fleet-wide
(7/12 commits carried it -> gate never fired). NOW: bypass logic is `scripts/lib/slot-commit-bypass.mjs`
`commitBypass(cmd,env)` -- precedence: PRISM_SLOT_COMMIT_ENFORCE_DISABLE=1 (kill) > `[MAIN-FORCE]`
(genuine cross-cutting fleet infra ONLY) > `[BOOTSTRAP-SLOT-ENFORCE]` ONLY if
PRISM_SLOT_COMMIT_ENFORCE_ALLOW_BOOTSTRAP=1 (default OFF). **Operator directive 2026-06-11:
"commits and staging should always be on chat slot nato name branch."** => romeo domain work
commits to `slot/romeo` from the `H:/prism-slot-romeo` worktree, NOT main. The OLD memory
"BOOTSTRAP-SLOT-ENFORCE precedent" for romeo Fusion work is SUPERSEDED. The prior Fusion CSV
outputs are on cad-fusion-live-ms0 only because they pre-date today's fix. Generator OUT_DIR
stays canonical (H:/prism/state/shared) for artifact co-location; to commit, copy outputs into
the slot worktree + commit on slot/romeo (golf integrates -> cad-fusion-live-ms0 later).

## NEXT PHASE (operator: "before passing along to hypercad/hypermill and mastercam") -- B DONE above
Propagate the SAME grade x toolpath structure to hyperMILL + Mastercam. **DEDUP CONFIRMED
(R8, 2026-06-11): the exporters ALREADY EXIST -- do NOT rebuild.** The phase is BRIDGING the
JM grade x toolpath tool data into these existing engines, not writing format writers:
- `UniversalToolExportEngine.ts` (+ test) -- multi-CAM exporter; wired `prism_cam:universal_tool_export`.
- `HyperMillToolExportEngine.ts` + `HyperMillACStandardToolDBEngine.ts` -- hyperMILL tool-DB.
- `MastercamToolExportEngine.ts` -- Mastercam tool export.
- `ToolSyncOrchestratorEngine.ts` -- multi-CAM sync; `prism_cam:tool_sync_multi` / `tool_sync_drift`.
- Fusion side: `Fusion360ToolExportEngine.ts` + `FusionToolExportEngine.ts`.
Approach: read those engines' INPUT model, build a JM-tool -> exporter-input bridge (the JM
data is in the generated `-allconditions.csv` Fusion format + the generator's in-memory tool
model), then export to hyperMILL + Mastercam. Skill `/cam-export-tools` runs the pipeline
(universal_tool_export -> tool_sync_multi -> tool_sync_drift). Verify round-trip + commit.

**Verified 2026-06-11 (read UniversalToolExportEngine.ts):** `UniversalToolExportEngine` exports
INTERCHANGE formats only (ISO13399/STEP-NC/MTConnect/CSV) from `PRISMTool[]` -- NOT native
hyperMILL/Mastercam, and `PRISMTool` carries ONE feed-set per tool (spindle_rpm/feed/etc.), not
the multi-preset grade x toolpath matrix. So native export = `HyperMillToolExportEngine` +
`HyperMillACStandardToolDBEngine` + `MastercamToolExportEngine` (read these next for input model).
**ANSWERED 2026-06-11 (Ollama digests of both export engines):**
- `HyperMillToolExportEngine` -> hyperMILL SQLite `.hmt` (Tools/NCTools/DepotItems/Materials tables);
  `convertTool(prismTool, toolId, mmSys)`; cutting ceilings from material+coating. Per-MATERIAL via
  the Materials table.
- `MastercamToolExportEngine` -> `.mcam-tools` / `.mcam-operations` JSON; `exportWithCuttingData(tools,
  mats)` emits per-ISO-group speed/feed; Vc from UltimateSpeedFeedEngine, fz Kienzle, ap/ae strategy
  defaults (rough ap*2/ae*0.6, finish ap*0.25/ae*0.15). Sources `toolCatalogEngine` + `holderSelectionEngine`.
- **BOTH derive cutting data from `UltimateSpeedFeedEngine` per ISO GROUP.** => **U-SFC-GAPS + the
  H-drilling safety fix ALREADY propagate to hyperMILL + Mastercam for free** (shared SFC source);
  no extra work for the safety/coverage win on those CAMs.
**REMAINING DESIGN FORK (operator decision):** the exporters do per-ISO-GROUP (6); Fusion now has
per-GRADE (14) x per-TOOLPATH (8 strategies). To give hyperMILL/Mastercam the SAME atomic richness:
  (A) FULL PARITY -- extend the exporters to emit per-grade x per-toolpath (big; hyperMILL Materials
      table + Mastercam per-op defaults may not natively hold 14x8 cleanly -- needs per-CAM model design).
  (B) GOOD-ENOUGH -- exporters keep per-ISO-group (already SFC-improved); Fusion stays the atomic one.
Recommend asking the operator A-vs-B before building; (B) is already effectively shipped via the shared SFC.
Also pending (LOW): SFC `mql` vs flood for H_tapping (physics-review note, kept flood = flood
cutting oil, defensible -- the enum has no "oil").

**Tool-type condition matrix (from workflow wr0fg62h4, classify via tool_type):**
- spot_drill: drilling/roughing/[conventional]
- twist_drill, insert_drill: drilling/roughing/[conventional,plunge]
- reamer: reaming/finishing/[conventional]
- tap: tapping/roughing/[conventional]
- flat_end_mill, bull_nose_end_mill: milling/[rough,semi,finish]/[conventional,adaptive,trochoidal,hsm,slot,plunge]
- ball_end_mill: milling/[semi,finish]/[conventional,hsm,trochoidal]
- chamfer_mill: milling/[finish]/[conventional]
- face_mill: milling/[rough,semi,finish]/[conventional,hsm]
- boring_bar: turning/[rough,finish]/[conventional]
- turning_tool: turning/[rough,semi,finish]/[conventional]
- grooving_tool: turning/[rough,finish]/[conventional,plunge]
- threading_tool: turning,thread_milling/[finish]/[conventional]

Fusion preset model: a "preset" is a named cutting-param set (no op-binding column), so
per-toolpath = more named presets per tool. Preset count will explode (~10-30k) -- expected.

See [[reference_fusion_holder_tooling_db_plan_2026_06_09]] (holder DB plan, sibling thread).

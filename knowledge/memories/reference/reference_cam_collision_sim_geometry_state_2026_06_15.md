---
name: reference_cam_collision_sim_geometry_state_2026_06_15
description: "Verified collision/simulation tooling-geometry readiness across Fusion / hyperMILL / Mastercam JM crib (slot:romeo 2026-06-15). Fusion=functional from dimensional fields; hyperMILL .hmt export DROPS geometry (real defect -> kilo); Mastercam field-rich; full 118K corpus has NO geometry (cutting data only). Holder segment profiles 20% missing need JM source data."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.502Z
aliases: reference_cam_collision_sim_geometry_state_2026_06_15
---


**Operator question (2026-06-15):** *"did you put accurate tooling geometry in the fields for fusion, hypermill and mastercam so we have collision avoidance and simulation features?"* Verified the ACTUAL state (R12 -- not asserted). KEY HONESTY: the CORPUS-CUTTING-CORPUS session work added cutting *parameters* (vc/rpm/fz/feed/ap/ae), NOT geometry. The collision/sim geometry that exists is passed through VERBATIM from JM's source Fusion library (218 tools); romeo did not author it.

**Per-CAM readiness (verified `state/shared/jm-fusion-tools/`):**

- **Fusion** (`material-group-libraries/JM-CRIB-ALL-families.csv`, 4924 rows) -- **collision/sim FUNCTIONAL.** Dimensional fields Fusion builds the tool body from are populated: tool_diameter 100%, tool_overallLength 100%, tool_shaftDiameter 100%; tool_fluteLength / tool_bodyLength / tool_numberOfFlutes / tool_holderGaugeLength / holder_description all 80% (the missing 20% = turning/boring INSERTS where flute geometry is N/A -- not a defect). `holder_segments` (3D holder collision profile) 80%; `shaft_segments` (explicit shaft profile) 34% -- OPTIONAL (Fusion derives the shaft cylinder from dia+OAL+shaftDia when absent, so sim still works). The generator (`generate-jm-fusion-tool-libraries.ts`) copies geometry columns verbatim from JM's source CSVs.

- **Mastercam** (`cam-libraries/JM_CRIB.mcam-tools`) -- field-rich: diameter, length, flute, shank, holder, corner radius, overall, gauge present. Collision-capable field-wise; holder-PROFILE depth not yet verified.

- **hyperMILL** (`cam-libraries/JM_CRIB.hmt.sql`) -- **REAL DEFECT (-> kilo / CAM domain).** `generate-jm-cam-libraries.ts:129` passes FULL geometry to `hyperMillToolExportEngine.exportToHMT`, and the engine (`BatchCAMToolBridgeEngines.ts`) MODELS `oal_mm`/`flute_length_mm`/`corner_radius_mm`/`holder_id`/`flutes` internally -- BUT the emitted `.hmt.sql` is geometry-thin (only `length`+`diameter`+1 radius survive; NO holder, NO shaft, NO flute_length, NO segments). `exportToHMT` drops the geometry it receives. hyperMILL collision/simulation is NOT supported by the current export. **Fix needs the hyperMILL `.hmt` SQLite schema spec (which columns hyperMILL's tool DB imports for holder/flute/segment geometry)** -- guessing column names risks an unimportable file. Route to **kilo** (CAM owner).

- **Full 118,409-tool corpus** (`state/shared/corpus-cutting-data/`) -- **NO collision/sim geometry.** Cutting parameters only. Corpus tool records carry 4 basic physical dims (cutting_dia, shank_dia, OAL, flute_length) but NO segment profiles or holder geometry; the cutting CSVs don't include them.

**Non-fabrication boundaries (R12 -- do NOT fabricate geometry for collision avoidance; confidently-wrong is worse than a known gap):**
- shaft_segments (66% missing): CAN derive a cylinder from real shaft_dia+body_length -- but MARGINAL (Fusion auto-derives the same; near-cosmetic).
- holder segment PROFILES (20% missing): CANNOT fill -- `ToolCatalogEngine.getAllHolders()` carries gauge/body/RPM/runout but NOT multi-segment profiles. Needs JM's source holder collision geometry.
- hyperMILL `.hmt` geometry columns: need the schema spec from kilo before emitting.

Linked: [[reference_corpus_cutting_corpus_2026_06_14]] (the cutting-data session), [[reference_fusion_holder_tooling_db_plan_2026_06_09]], [[reference_catalog_app_wiring_tooldb_2026_06_09]] (HolderSelectionEngine + 643 real holders).

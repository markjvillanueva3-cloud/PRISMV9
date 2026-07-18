---
name: reference_fusion_holder_tooling_db_plan_2026_06_09
description: "Grounded build plan + format reality for populating Fusion tool-holder + tooling databases organized holders-by-type-brand and tooling-by-material-type-brand (slot:romeo, 2026-06-09). Operator directive."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.582Z
aliases: reference_fusion_holder_tooling_db_plan_2026_06_09
---


**Operator directive (2026-06-09):** "populate the tool holder and tooling database. tool holders by type then brand. tooling by pre-optimized SFM and parameters depending on material category so it needs to be by material type, then tooling by type, then brand." Fusion-first (machines already done: FusionMachineLibraryExportEngine, 44c41ee643).

## ALREADY BUILT (dedup — do NOT rebuild, EXTEND)
- **JM-FUSION-TOOLS-MS0 (slot:romeo, 2026-06-01)** [[reference_jm_fusion_matgroup_libraries_2026_06_01]]:
  - `UltimateSpeedFeedEngine.lookupCuttingData()` = O(1) SFC fast-path; wired into `FusionToolExportEngine._generatePresets` via catalog->SFC->Kienzle priority. **Every Fusion preset (P/M/K/N/S/H) is already physics-optimal per material group.** => "pre-optimized SFM by material category" leg is DONE at the per-tool level.
  - `scripts/generate-jm-fusion-tool-libraries.ts` augments JM's 7 real Fusion CSVs (218 tools) with 6 per-material-group preset rows + `by-group/JM-CRIB-<ISO>.csv`. Output `state/shared/jm-fusion-tools/material-group-libraries/`. => material-group tooling organization EXISTS for JM's crib.

## PROVEN FORMAT (verified, real JM exports — the golden)
- `resources/PRISM FOLDER FROM HOME/FUSION TOOL LIBRARY/*.csv` = 7 real JM Fusion exports, `CSV_TOOLS_VERSION_1`, **173 comma-cols (172 data + 1 sentinel header token)**. Helpers in generate-jm script: `parseCsvLine`/`csvField`/`serializeCsvLine`, pad/trim rows to `headers.length-1`.
- Holder columns ON each tool row: `Type (tool_type)` col3, `Holder Description/Product ID/Product Link/Vendor (holder_*)` col8-11, `Style (tool_holderType)`, `Tool Holder Gauge/Head/Overall Length`. **holder_vendor = brand, tool_holderType = type.**

## FORMAT GAP (R12 — the one unverified thing)
- **NO standalone Fusion holder-ONLY library golden exists** (searched resources + JM DIE: 0 `.holders`/holder-only CSV). The proven format is a TOOL library (each row = a tool + its holder columns). Emitting a holder-ONLY library in that format is UNVERIFIED for Fusion import => do NOT fabricate (the `.machine`-was-XML-not-JSON lesson).
- VERIFIED mechanism to get the holder DB into Fusion = **real holders ON tools** (populate the holder_* columns / FusionTool.holder, which IS the proven shape), then group the tool libraries by holder type->brand AND by material->type->brand.

## HOLDER DATA SOURCES (all real, located)
- `HAIMER_HOLDERS` (haimer-holder-catalog.ts) — 489 holders, {designation, taper, holder_type, bore/body/overall/gauge mm}. brand=HAIMER.
- `GUHRING_HOLDERS` (guhring-holder-catalog.ts) — {designation, taper, holder_type, series, bore/body/gauge/overall}. brand=GUHRING.
- `BIG_DAISHOWA_FAMILIES` + ToolholderSpec (big-daishowa-holders.ts) — {model, type, taper, gauge_length_mm}. brand=BIG DAISHOWA.
- `toolHolderDatabaseEngine` / HOLDER_DB (ToolHolderDatabaseEngine.ts) — 80+ standard interfaces {type: v_flange/bt_taper/hsk, taper, standard, spindle_bore, flange_dia}. brand=Standard(ANSI/JIS/DIN).
- NONE currently wired into the 3 tool exporters (Fusion/Mastercam/hyperMILL all synthesize holders via size-inference — verified 2026-06-09).

## BUILD PLAN (verified-format only; logical order)
1. **Holder-matching layer** — `HolderSelectionEngine` (or fn): given (taper, shank_dia, type-preference) -> best real holder from the 4 catalogs (bore fit + type). Populates FusionTool.holder / holder_* CSV cols. Replaces synthesized `inferHolder`/`Math.max(shankD+8,26)` in the exporters. Wire fleet-wide (Fusion + Mastercam + hyperMILL). Round-trip test.
2. **Organized tooling libraries** — extend generate-jm script (or new) to the BROADER catalog (15,994 extracted ISCAR/OSG/YG-1/Sandvik + 74K) grouped material-category -> tool_type -> brand, SFC presets per group (reuse lookupCuttingData), real holders from (1). Proven CSV format. by-material/by-type/by-brand folder set.
3. **Holder browse views** — tool-library CSVs grouped by holder type->brand (same proven format, holder-centric grouping) so the operator sees holders by type->brand in Fusion. (A true holder-ONLY library is deferred until a Fusion holder-library export golden is available.)

## NEXT TICK = pure execution (this memory is the spec). Start unit 1 (HolderSelectionEngine).
Build discipline: shared cad-fusion-live-ms0 tree -> [MAIN] [BOOTSTRAP-SLOT-ENFORCE] prefix; HEAD moves under you (review by SHA); rm -f .git/index.lock; ascii-guard (-- not em-dash); local-LLM scrutiny (qwen2.5-coder:32b + gpt-oss:120b) when Claude agents rate-limited.

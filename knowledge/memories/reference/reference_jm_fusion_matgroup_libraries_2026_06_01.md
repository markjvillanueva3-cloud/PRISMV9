---
name: reference_jm_fusion_matgroup_libraries_2026_06_01
description: "JM Fusion 360 per-material-group tool libraries + the SFC lookupCuttingData fast-path that feeds them (slot:romeo, 2026-06-01)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.171Z
aliases: reference_jm_fusion_matgroup_libraries_2026_06_01
---


**JM-FUSION-TOOLS-MS0 — per-material-group Fusion tool libraries (slot:romeo, 2026-06-01)**

Two committed units on `cad-fusion-live-ms0`:

- **U-JFT-SFC-PRESETS** — added `UltimateSpeedFeedEngine.lookupCuttingData()` (O(1) read of the `CUTTING_PARAMS` table, balanced index, `diameterFzFactor` fz-scale, HSS 0.40 vc derate) and wired it into `FusionToolExportEngine._generatePresets` via a **catalog → SFC → Kienzle-default** priority chain. Every Fusion `.tools` preset (P/M/K/N/S/H) is now physics-optimal instead of coarse constants. Critical: do NOT call the full `calculate()` per tool — it ran the whole force/thermal/wear/stability suite 6×/tool and timed the test out; `lookupCuttingData` is the perf-safe path for bulk gen. 13/13 tests. → engine path benefits the `prism_cam:fusion_export_tool_library` dispatcher fleet-wide.

- **U-JFT-MATGROUP-CRIB** — `scripts/generate-jm-fusion-tool-libraries.ts` (run: `cd mcp-server && npx tsx scripts/generate-jm-fusion-tool-libraries.ts`). Augments JM's **7 real Fusion CSV exports** (218 production tools, `resources/PRISM FOLDER FROM HOME/FUSION TOOL LIBRARY/`) — each tool gets its as-run preset PLUS 6 per-material-group preset rows. Cutting columns per group from `lookupCuttingData`; **geometry + `holder_segments` (REGO-FIX Capto C6 / BIG DAISHOWA ER-32 / Techniks ER-16) copied VERBATIM** (zero 25.4× scale risk — the collision-avoidance data). Op-class aware: milling=per-tooth fz, drilling=per-rev fz, turning=CSS surface-speed only (keep JM's proven feed/rev). Output: `state/shared/jm-fusion-tools/material-group-libraries/` — 7 augmented CSVs + `by-group/JM-CRIB-<ISO>.csv` (6) + `JM-MATERIAL-GROUP-BATCHES.md` + `JM-MATERIAL-CATEGORIZATION.md` + README, all in proven `CSV_TOOLS_VERSION_1` (Fusion-importable).

Key gotchas (R12): JM CSVs are **172 data columns** (the 173rd header token `CSV_TOOLS_VERSION_1` is a format sentinel, NOT a column — pad/trim group rows to `headers.length-1`). Tool flute count is read from the real CSV (e.g. the 1/2" bull-nose is **6-flute**, not 4). HSS derate matters — JM's twist drills are HSS and would otherwise inherit carbide speeds.

Next-step (deferred, documented not skipped): the broader extracted vendor set (15,994 tools — ISCAR/OSG/YG-1/Sandvik in `mcp-server/src/data/*-tools-extracted.json`, prior `jm-milling-tools.tools`) can be regenerated through the now-SFC-optimal `FusionToolExportEngine` for `.tools` JSON, but those carry SYNTHETIC holders (lower collision fidelity than the real crib). Related: [[reference_tool_catalog_ingest_ms0_2026_05_24]] (juliett vendor-catalog-db), [[reference_fusion_tooling_catalog_2026_05_23]] (mike hsmlib extractor), [[reference_foxtrot_mill_speedfeed_hub]] (SFC triad).

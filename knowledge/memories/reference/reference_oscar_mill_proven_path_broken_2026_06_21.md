---
name: reference_oscar_mill_proven_path_broken_2026_06_21
description: "Finding (slot:oscar 2026-06-21): the MILL proven-S/F extraction path is broken in ESM -- MillPatternMinerEngine.mineJMDiePrograms uses CommonJS require('fs')/require('./HaasParserEngine.js') in an ESM codebase -> ReferenceError under tsx -> 0 chip-load samples on EVERY mill program. Plus the JM mill corpus is dominated by .mcx-8 Mastercam CAD files (not G-code). JM inventory is 171,119 programs / 6,171 mill (CLAUDE.md '24,545' is stale). Blocks the mill half of U-SFC-PROVEN-FULL-MINE."
type: reference
slot: oscar
galaxy: speed-feed
source: prism-memory
synced: 2026-06-27T20:30:46.691Z
aliases: reference_oscar_mill_proven_path_broken_2026_06_21
---


**MILL proven-extraction path is BROKEN (slot:oscar, 2026-06-21).** Found extending the proven pipeline ([[reference_oscar_sfc_proven_pipeline_poc_2026_06_21]]) to mill. The LATHE path (OkumaOSPParserEngine, clean ESM) works; the MILL path does not.

## Bug 1: CommonJS require() in an ESM engine -> throws on every mill program
`MillPatternMinerEngine.mineJMDiePrograms` (`src/engines/MillPatternMinerEngine.ts:687-720`) does `const fs = require("fs")` + `require("./HaasParserEngine.js")` / `require("./HurcoParserEngine.js")` / `require("./RokuRokuParserEngine.js")` INLINE. The codebase is ESM (`"type":"module"`, NodeNext). Under tsx (and any pure-ESM runtime) `require` is undefined -> every program throws `ReferenceError: require is not defined`, swallowed by the per-program try/catch (logged at DEBUG) -> `chip_load_samples = 0`. Live POC: 400 mill programs -> 0 samples, 400 require errors. (LIVE-SERVER status UNVERIFIED -- the esbuild bundle MAY inject a require shim; but it is at minimum broken for any tsx script/test path, which is how the proven harness runs it. R12: do not claim it's definitely dead in the bundled server without checking the esbuild config.)
FIX (fresh-context unit): replace the 3 inline `require("./*ParserEngine.js")` + `require("fs")` with TOP-OF-FILE static ESM imports (`import { haasParserEngine } from "./HaasParserEngine.js"` etc.; the file already type-imports those modules). mineJMDiePrograms stays synchronous (static imports, not async import()). Add a tsx-run test so this can't regress.

## Bug 2: mill corpus is mostly .mcx-8 Mastercam CAD files, not G-code
6,171 mill entries, controllers = {mastercam, haas_ngc, unknown, okuma_osp, fanuc}. Many are `.mcx-8` (Mastercam proprietary CAD/CAM binaries) -- NOT G-code the Haas/Hurco/RokuRoku parsers can read. The mill proven-extraction must FILTER to actual NC/G-code (haas_ngc/.NC, fanuc; possibly okuma_osp .MIN under the mill tree) and SKIP .mcx-8 (or route them to a Mastercam-native extractor -- separate concern). An existing data catalog `src/data/jmdie-proven-mill-programs.ts` (graph L8/built) may already hold curated mill proven data -- CHECK IT FIRST (R8 dedup) before re-mining.

## Inventory size correction
`jmDieProgramInventoryEngine.scan()` found **171,119 programs** in 30.6s (maxDepth 6), 6,171 of programType "mill". The CLAUDE.md "JM DIE (24,545 files)" figure is a stale subset -- the real program inventory is ~7x larger. (Lathe .MIN alone = 34,993 per the earlier Glob.)

## Bearing on the reconciliation
This does NOT change the reconciliation verdict ([[reference_oscar_sfc_engine_divergence_magnitude_2026_06_21]]). The LATHE proven data (OD-finishing 137 m/min = published-aligned) already resolved caveat #2 in the published-aligned direction. MILL proven data would be the direct-domain confirmation (my divergence measurements were milling), but it requires Bug 1 + Bug 2 fixed first. Queued: U-SFC-MILL-PROVEN-PATH-FIX (fix require + .mcx-8 filter + check the existing jmdie-proven-mill-programs.ts catalog).

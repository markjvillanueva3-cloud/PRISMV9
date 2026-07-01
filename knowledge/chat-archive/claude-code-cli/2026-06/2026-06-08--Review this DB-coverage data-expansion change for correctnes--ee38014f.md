---
type: "chat-session"
source: "claude-code-cli"
session_id: "ee38014f-e77d-4899-b080-d9b960107dd5"
title: "Review this DB-coverage data-expansion change for correctness, P0/P1 issues. Gra"
date: "2026-06-08"
first_ts: "2026-06-08T15:43:59.681Z"
last_ts: "2026-06-08T15:49:06.936Z"
cwd: "H:\\prism"
messages: 60
user_msgs: 23
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism/ee38014f-e77d-4899-b080-d9b960107dd5/subagents/agent-ad7b11bebf64d5258.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Review this DB-coverage data-expansion change for correctness, P0/P1 issues. Gra

> **claude-code-cli** | 2026-06-08 | 60 msgs (23 user / 37 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ee38014f-e77d-4899-b080-d9b960107dd5/subagents/agent-ad7b11bebf64d5258.jsonl`

## Transcript

### User | 2026-06-08T15:43:59.681Z

Review this DB-coverage data-expansion change for correctness, P0/P1 issues. Grade PASS/FAIL.

CONTEXT: PRISM tool catalog. `global-cnc-tools.json` was an empty `[]` so `ToolCatalogEngine._loadGlobalCNCTools()` (a built loader) produced ZERO tools, while `mcp-server/src/data/global-cnc-dimensions.ts` already held 3,680 PDF-extracted holder dimension records (real bore/OD/OAL). This change generates the missing part-number index + extends the loader's type mapping.

FILES TO REVIEW (read each fully):
1. H:/prism/mcp-server/scripts/build-global-cnc-tools-index.mjs — the generator (parses GLOBAL_CNC_DIMENSIONS from the .ts source via regex, excludes bushings + implausible-bore rows, infers productLine, emits {partNumber,type,productLine}).
2. H:/prism/mcp-server/scripts/build-global-cnc-tools-index.test.mjs — 10 node:test cases.
3. H:/prism/mcp-server/src/engines/ToolCatalogEngine.ts lines 2049-2090 — `_loadGlobalCNCTools()` with my extended gt.type→CatalogTool.type mapping (lines ~2054-2059: driven_*→end_mill, boring_bar_holder/id_holder→boring_bar, else→turning_tool).
4. H:/prism/mcp-server/src/data/global-cnc-tools.json — 1,146 generated records.

VERIFY SPECIFICALLY:
- The regex parse in parseDimensions matches the actual .ts literal shape (grep `global-cnc-dimensions.ts` to confirm). Does it miss any records (e.g. whitespace variants, multi-line)?
- Is the bushing/bad-bore exclusion logic correct? (bushings are guide bushings, not cutting tools; 48/50 VDI holders have boreDia_mm:1016 = 40" extraction error.)
- Is the extended type mapping in ToolCatalogEngine.ts semantically correct for each of the 9 holder families (boring_bar_holder, driven_drill_mill, od_turning_holder, id_holder, vdi_holder, toolholder, driven_toolholder, capto_holder, od_facing_holder)?
- Any silent-failure / fail-loud gaps? Any way the generator emits a wrong/empty file silently?
Report concrete findings with file:line. Output a verdict line: "VERDICT: PASS" or "VERDICT: FAIL".

### Assistant | 2026-06-08T15:44:10.105Z

I'll review this DB-coverage change systematically. Let me read each file fully, starting with the data source shape that the generator depends on.

### Assistant | 2026-06-08T15:44:11.420Z

[tool_use: Read]

### Assistant | 2026-06-08T15:44:11.429Z

[tool_use: Read]

### User | 2026-06-08T15:44:14.563Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-global-cnc-tools-index.mjs — DB-COVERAGE-GAPFILL-MS0/U-GCNC01
4	 *
5	 * Generates `mcp-server/src/data/global-cnc-tools.json` — the part-number index that
6	 * `ToolCatalogEngine._loadGlobalCNCTools()` iterates. That loader was BUILT but DEAD:
7	 * it reads `global-cnc-tools.json` (an empty `[]`) and produces ZERO catalog tools,
8	 * while `global-cnc-dimensi
... [+6559 chars truncated]

### User | 2026-06-08T15:44:14.594Z

[tool_result] 1	/**
2	 * Tests for build-global-cnc-tools-index.mjs (DB-COVERAGE-GAPFILL-MS0/U-GCNC01).
3	 * Run: node --test mcp-server/scripts/build-global-cnc-tools-index.test.mjs
4	 *
5	 * These verify INTENT (R9), not just "it returns something":
6	 *  - parseDimensions extracts the exact record shape the loader's source carries, and
7	 *    FAILS LOUD (throws) on an empty/changed corpus rather than emitti
... [+5068 chars truncated]

### Assistant | 2026-06-08T15:44:19.984Z

Now let me verify the actual `.ts` literal shape against the regex, and examine the loader in ToolCatalogEngine.ts.

### Assistant | 2026-06-08T15:44:21.390Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:44:21.901Z

[tool_use: Read]

### User | 2026-06-08T15:44:24.198Z

[tool_result] 2020	                            dc * 4;
2021	      const fluteLength = at.type === "drill_holder" ? dc * 3 :
2022	                          at.type === "drill_insert" ? 0 :
2023	                          dc * 2;
2024	
2025	      this.tools.set(id, {
2026	        id,
2027	        manufacturer: "Allied Machine",
2028	        series: at.productLine,
2029	        designation: at.partNumber,
2030	    
... [+4675 chars truncated]

### User | 2026-06-08T15:44:24.453Z

[tool_result] // Global CNC dimensions extracted from 01-Global-CNC-Full-Catalog-2023.pdf (565 pages)
// 3,680 tools: 2,416 bushings (PDF tables) + 1,264 holders (PDF specs + part number inference)
// Coverage: 98.8% bore, 99.6% bodyOD, 99.7% OAL, 98.4% all-three

export interface GlobalCNCDimension {
  partNumber: string;
  boreDia_mm: number;     // bore/ID
  bodyOD_mm: number;      // outer diameter
  oal_mm
... [+1687 chars truncated]

### Assistant | 2026-06-08T15:44:38.788Z

The regex assumes a single canonical literal shape. Let me verify there are no whitespace/field-order variants in the actual 3,680-record corpus that would silently drop records, then check the generated output and the rest of the data flow.

### Assistant | 2026-06-08T15:44:42.416Z

[tool_use: Bash]

### User | 2026-06-08T15:44:46.000Z

[tool_result] === total lines in dimensions.ts ===
3701 src/data/global-cnc-dimensions.ts
=== total record literals (count of partNumber: occurrences) ===
3680
=== records the canonical regex would MATCH ===
3680

### Assistant | 2026-06-08T15:44:53.311Z

All 3,680 records match — no whitespace/field-order variants are silently dropped. The corpus is machine-generated with uniform shape, so the regex is exhaustive. Now let me check what the regex would miss in edge cases (negative numbers, scientific notation, type with digits/uppercase), and examine the distribution of types and the generated output.

### Assistant | 2026-06-08T15:44:55.688Z

[tool_use: Bash]

### User | 2026-06-08T15:44:57.065Z

[tool_result] === type distribution across ALL 3680 records ===
   2416 type:"bushing"
    425 type:"boring_bar_holder"
    282 type:"driven_drill_mill"
    276 type:"od_turning_holder"
    140 type:"id_holder"
     50 type:"vdi_holder"
     31 type:"toolholder"
     31 type:"driven_toolholder"
     18 type:"capto_holder"
     11 type:"od_facing_holder"

=== any type values with chars OUTSIDE [a-z_] (would be M
... [+279 chars truncated]

### Assistant | 2026-06-08T15:45:04.580Z

The only non-matching `type:` hits are the interface comment lines (`type: string; // ...`), not data records — correctly excluded. Note: the type enum has exactly **9 holder families** (excluding bushing), and there's NO `driven_tool` type in the actual corpus — that's important for the mapping review. Let me verify the generated JSON and check the two helper functions the loader calls (`getGlobalCncTools`, `getGlobalCNCDimension`), plus the `CatalogTool["type"]` union.

### Assistant | 2026-06-08T15:45:07.921Z

[tool_use: Bash]

### User | 2026-06-08T15:45:09.843Z

[tool_result] === generated JSON: record count ===
records: 1146
byType: {
  "od_turning_holder": 267,
  "id_holder": 138,
  "driven_toolholder": 31,
  "driven_drill_mill": 272,
  "boring_bar_holder": 402,
  "capto_holder": 17,
  "toolholder": 8,
  "od_facing_holder": 10,
  "vdi_holder": 1
}
sample: [{"partNumber":"A118-8311","type":"od_turning_holder","productLine":"A118"},{"partNumber":"A118-8311M","type":"od
... [+281 chars truncated]

### Assistant | 2026-06-08T15:45:17.640Z

There's a meaningful discrepancy to investigate. Total non-bushing records = 1264 (3680 − 2416). Emitted = 1146. So **118 records were dropped as bad-bore**, not just the 48 VDI rows the docstring describes. Let me reconcile this — the docstring/comments only mention 48 VDI 1016mm rows, but 118 were dropped. This matters because `boreDia_mm` is used directly as `cutting_diameter_mm` in the loader.

### Assistant | 2026-06-08T15:45:24.088Z

[tool_use: Bash]

### User | 2026-06-08T15:45:25.531Z

[tool_result] non-bushing: 1264 | dropped(bad-bore): 118 | emitted: 1146
  dropped because bore<=0/NaN: 45
  dropped because bore>200mm : 73
  big-bore values: {"1016":33,"1270":14,"1524":1,"1651":1,"2032":10,"1524.254":1,"812.8":1,"1289.05":1,"1035.05":1,"1727.2":10}
  dropped by type: {"toolholder":23,"boring_bar_holder":23,"driven_drill_mill":10,"capto_holder":1,"od_turning_holder":9,"vdi_holder":49,"id_hold
... [+402 chars truncated]

### Assistant | 2026-06-08T15:45:36.343Z

This surfaces a P1 finding. The drop is **118 records (45 zero-bore + 73 over-200mm)**, but the docstring and the `--dry-run` report only narrate the "48 VDI holders @ 1016mm" case. The actual filter is far broader and the stats output collapses it all into one `bad_bore_excluded` counter. Concretely:

- **45 records are dropped for `bore<=0`** — and many of these are *legitimate live-tooling holders* (e.g. `DM-TR-16-D12-290-BMT45/10` driven drill-mill blocks, `DRILL-MILLING` boring holders). The bore being 0 means dimension extraction failed for that field, but the **bodyOD and OAL may still be valid** — yet the loader's `cutting_diameter_mm = boreDia` would be 0 anyway. The drop silently removes these holders from the catalog entirely rather than emitting them with the dimensions that ARE known.
- **73 over-200mm**, of which only 33 are the documented `1016` value. The rest (1270, 1524, 2032, 1727.2, etc.) are other extraction errors — the docstring's "48 of 50 VDI holders carry 1016" framing understates the real scope (49 vdi + 24 non-vdi dropped).

Now let me verify the semantic correctness of the loader's dimension mapping (the bore→cutting_diameter assignment is suspect) and the type-mapping. Let me look at the dimension helper and the CatalogTool type.

### Assistant | 2026-06-08T15:45:38.991Z

[tool_use: Bash]

### User | 2026-06-08T15:45:47.091Z

[tool_result] === getGlobalCncTools + getGlobalCNCDimension definitions ===
src/data/global-cnc-dimensions.ts:3699:export function getGlobalCNCDimension(partNumber: string): GlobalCNCDimension | undefined {

=== how loader imports them ===
36:import { getGlobalCNCDimension } from "../data/global-cnc-dimensions.js";
59:const getGlobalCncTools = () => loadCatalog<any[]>("global-cnc-tools.json");
2050:    for (con
... [+92 chars truncated]

### Assistant | 2026-06-08T15:45:53.279Z

[tool_use: Bash]

### User | 2026-06-08T15:45:56.623Z

[tool_result] === getGlobalCNCDimension impl ===
const _dimMap = new Map<string, GlobalCNCDimension>();
for (const d of GLOBAL_CNC_DIMENSIONS) _dimMap.set(d.partNumber, d);
export function getGlobalCNCDimension(partNumber: string): GlobalCNCDimension | undefined {
  return _dimMap.get(partNumber);
}

=== loadCatalog impl ===
100:  type: "end_mill" | "ball_mill" | "bull_mill" | "face_mill" | "drill" | "tap" |
20
... [+159 chars truncated]

### Assistant | 2026-06-08T15:46:05.222Z

[tool_use: Read]

### Assistant | 2026-06-08T15:46:05.320Z

[tool_use: Bash]

### User | 2026-06-08T15:46:06.455Z

[tool_result] 95	export interface CatalogTool {
96	  id: string;
97	  manufacturer: string;
98	  series: string;
99	  designation: string;           // ordering code
100	  type: "end_mill" | "ball_mill" | "bull_mill" | "face_mill" | "drill" | "tap" |
101	        "reamer" | "boring_bar" | "insert" | "turning_tool" | "threading_tool" |
102	        "grooving_tool" | "chamfer_mill" | "slot_drill";
103	  subtype?: s
... [+1089 chars truncated]

### User | 2026-06-08T15:46:06.991Z

[tool_result] const getGuhringTools = () => loadCatalog<any[]>("guhring-tools.json");
const getSandvikTools = () => loadCatalog<any[]>("sandvik-tools.json");
const getAdditionalTools = () => loadCatalog<any[]>("additional-tools.json");
const getIndexableTools = () => loadCatalog<any[]>("indexable-tools.json");
const getEmugeTools = () => loadCatalog<any[]>("emuge-tools.json");
const getAmpcTools = () => loadCat
... [+1053 chars truncated]

### Assistant | 2026-06-08T15:46:12.180Z

Now I have the full picture. Let me verify the critical semantic issue I noticed: the loader assigns `boreDia_mm` (the bore/ID) to `cutting_diameter_mm`. For OD turning holders, the bore is the shank/bar bore, not a cutting diameter — this is a physics-semantics question worth confirming the impact of. Let me also confirm whether `loadCatalog` fails loud or silently on a missing/malformed file, and run the tests.

### Assistant | 2026-06-08T15:46:14.676Z

[tool_use: Bash]

### Assistant | 2026-06-08T15:46:15.463Z

[tool_use: Bash]

### User | 2026-06-08T15:46:15.967Z

[tool_result] === loadCatalog impl (silent-fail check) ===

### User | 2026-06-08T15:46:17.530Z

[tool_result] === run the generator tests ===
  ...
# Subtest: inferProductLine falls back to GlobalCNC for an unrecognized prefix
ok 9 - inferProductLine falls back to GlobalCNC for an unrecognized prefix
  ---
  duration_ms: 0.2767
  ...
# Subtest: buildIndex handles an empty (post-filter) result without throwing
ok 10 - buildIndex handles an empty (post-filter) result without throwing
  ---
  duration_ms: 0.
... [+114 chars truncated]

### Assistant | 2026-06-08T15:46:22.796Z

All 10 tests pass. Let me find the `loadCatalog` definition (it wasn't at the expected spot) to confirm the silent-failure behavior — this matters for the "does the loader degrade silently" question.

### Assistant | 2026-06-08T15:46:24.068Z

[tool_use: Bash]

### User | 2026-06-08T15:47:06.661Z

[tool_result] 17:import { loadCatalog, loadCatalogExport } from "../data/catalogLoader.js";
51:const getOsgTools = () => loadCatalog<any[]>("osg-tools.json");
52:const getGuhringTools = () => loadCatalog<any[]>("guhring-tools.json");
---
src/engines/InventorHSMFunctionIndexEngine.ts:155:  private static loadCatalog(): InventorHSMCatalog | null {
src/engines/InventorHSMFunctionIndexEngine.ts:200:      const cata
... [+669 chars truncated]

### Assistant | 2026-06-08T15:47:10.417Z

[tool_use: Bash]

### User | 2026-06-08T15:47:12.058Z

[tool_result] === catalogLoader.ts ===
/**
 * Lazy Catalog Loader — loads tool catalog JSON from disk on first access.
 *
 * Instead of importing 25MB of static arrays that bake into the bundle,
 * catalogs are stored as JSON files in dist/data/ and loaded on demand.
 *
 * Usage:
 *   const tools = loadCatalog<OSGTool[]>("osg-tools.json");
 *
 * The JSON files are generated at build time by scripts/build-catalo
... [+1241 chars truncated]

### Assistant | 2026-06-08T15:47:17.857Z

Good — `loadCatalog` does NOT silently fail: `readFileSync` throws on a missing file and `JSON.parse` throws on malformed JSON. So a missing/corrupt `global-cnc-tools.json` would fail loud at engine init (acceptable). Note the JSON is read from `dist/data/` (the build copies `src/data/*.json` → `dist/data/`), so the generated file must be present at build time — that's a build-pipeline dependency worth confirming but not a code defect.

One more critical check: the generator writes to `src/data/global-cnc-tools.json` but the loader reads from `dist/data/`. Let me confirm the build copies it, and check whether the empty-array `[]` predecessor is what's currently in `dist`.

### Assistant | 2026-06-08T15:47:20.984Z

[tool_use: Bash]

### User | 2026-06-08T15:47:22.376Z

[tool_result] === is global-cnc-tools.json copied to dist by build? ===
43:    json: "helical-tools.json",
48:    json: "emuge-tools.json",
53:    json: "additional-tools.json",
58:    json: "indexable-tools.json",
63:    json: "sandvik-2018-rotating.json",
-rwxr-xr-x 1 wompu 197611 5884 Apr 13 20:37 scripts/build-catalog-json.mjs
--- check package.json build for json copy ---
4:    "description": "PRISM Manufa
... [+333 chars truncated]

### Assistant | 2026-06-08T15:47:28.686Z

[tool_use: Bash]

### User | 2026-06-08T15:47:30.674Z

[tool_result] === how build-catalog-json.mjs gets src .json files into dist/data ===
6: * arrays/objects, and writes them as JSON to dist/data/.
---
6: * arrays/objects, and writes them as JSON to dist/data/.
44:    tsFile: "src/data/helical-tool-catalog.ts",
49:    tsFile: "src/data/emuge-tool-catalog.ts",
54:    tsFile: "src/data/additional-tool-catalog.ts",
59:    tsFile: "src/data/indexable-tool-catalog.ts"
... [+265 chars truncated]

### Assistant | 2026-06-08T15:47:36.191Z

This is a **P0 finding**. `build-catalog-json.mjs` generates `dist/data/*.json` by transpiling specific `.ts` catalog files (a hardcoded list). Let me confirm whether `global-cnc-tools.json` is in that list, and how the pre-existing empty `[]` got to dist — because if the build script doesn't know about this file, the loader will read a stale/empty `dist/data/global-cnc-tools.json` (or throw) regardless of the new `src/data` file.

### Assistant | 2026-06-08T15:47:39.929Z

[tool_use: Bash]

### User | 2026-06-08T15:47:42.109Z

[tool_result] === is global-cnc anywhere in the catalog-json build script? ===
93:    json: "global-cnc-tools.json",
94:    tsFile: "src/data/global-cnc-tool-catalog.ts",

=== does ANY build step copy raw src/data/*.json to dist/data? (esbuild loader/copy plugin, tsc, cpSync) ===

### Assistant | 2026-06-08T15:47:48.240Z

This is the **P0 finding confirmed**. The build script at line 93-94 generates `dist/data/global-cnc-tools.json` by transpiling `src/data/global-cnc-tool-catalog.ts` and extracting an exported array — it does **NOT** copy the new hand/script-generated `src/data/global-cnc-tools.json`. Let me confirm what that `.ts` catalog file contains (this is almost certainly the source of the original empty `[]`).

### Assistant | 2026-06-08T15:47:52.070Z

[tool_use: Bash]

### User | 2026-06-08T15:47:53.720Z

[tool_result] === the .ts file the BUILD actually transpiles into dist/data/global-cnc-tools.json ===
-rw-r--r-- 1 wompu 197611 493930 Mar 15 13:14 src/data/global-cnc-tool-catalog.ts
--- its exported array length ---
17:export const GLOBAL_CNC_TOOLS: GlobalCNCTool[] = [
3701:export const GLOBAL_CNC_TOOL_COUNT = 3680;
3702:export const GLOBAL_CNC_PRODUCT_LINES = {
3715:export const GLOBAL_CNC_TOOL_TYPES = {
372
... [+1043 chars truncated]

### Assistant | 2026-06-08T15:48:02.890Z

The P0 is now fully confirmed and the root cause is clear. There is a pre-existing `src/data/global-cnc-tool-catalog.ts` exporting `GLOBAL_CNC_TOOLS` (3,680 entries, 493KB), and the build's `postbuild` step **overwrites** `dist/data/global-cnc-tools.json` from THAT `.ts` file's `GLOBAL_CNC_TOOLS` export — not from the script-generated `src/data/global-cnc-tools.json`.

Let me verify the shape of `GLOBAL_CNC_TOOLS` in the catalog `.ts` (does it carry `partNumber/type/productLine`? is it the original empty source?), which determines whether the new generated file is even reachable at runtime.

### Assistant | 2026-06-08T15:48:05.693Z

[tool_use: Bash]

### User | 2026-06-08T15:48:09.023Z

[tool_result] === shape of GLOBAL_CNC_TOOLS entries in the catalog .ts (what the BUILD ships to dist) ===
export const GLOBAL_CNC_TOOLS: GlobalCNCTool[] = [
  {partNumber:"8610C .250",type:"bushing",subType:"Tool Holder Bushing",productLine:"Bushings & Sleeves",manufacturer:"Global CNC"},
  {partNumber:"8610C .312",type:"bushing",subType:"Tool Holder Bushing",productLine:"Bushings & Sleeves",manufacturer:"Globa
... [+2925 chars truncated]

### Assistant | 2026-06-08T15:48:14.803Z

This completely changes the assessment. The premise in the change's docstring — *"`global-cnc-tools.json` was an empty `[]`"* — is **false at build time**. There is a pre-existing, fully-populated `src/data/global-cnc-tool-catalog.ts` exporting `GLOBAL_CNC_TOOLS` with **3,680 entries** (all of them, including bushings), and the `postbuild` step regenerates `dist/data/global-cnc-tools.json` from that `.ts` file on every build.

This produces two contradictory possibilities, both of which the change failed to reconcile. Let me do the final confirmation: which file does the runtime actually read, and is the `src/data/global-cnc-tools.json` the change wrote ever consumed?

### Assistant | 2026-06-08T15:48:21.808Z

[tool_use: Bash]

### User | 2026-06-08T15:48:23.540Z

[tool_result] === build-catalog-json OUTPUT dir (does it write to dist/data, overwriting?) ===
6: * arrays/objects, and writes them as JSON to dist/data/.
22:const DIST_DATA = path.join(ROOT, "dist", "data");
130:  const tmpOut = path.join(DIST_DATA, `_tmp_${cat.json.replace(".json", ".mjs")}`);
164:    const jsonPath = path.join(DIST_DATA, cat.json);
165:    fs.writeFileSync(jsonPath, jsonStr);
180:console.log
... [+821 chars truncated]

### Assistant | 2026-06-08T15:49:06.936Z

The investigation is complete and decisive. I have the full data-flow picture. Let me compile the verdict.

## Code Quality Analysis Report — DB-COVERAGE-GAPFILL-MS0/U-GCNC01

### Summary
- **Files Analyzed:** 5 (generator, test, ToolCatalogEngine loader, generated JSON, build-catalog-json.mjs, plus the corpus + catalog `.ts` sources)
- **Tests:** 10/10 pass; regex parse verified exhaustive (3,680/3,680 records match, zero silently dropped)
- **Critical Issues:** 1 P0 (the generated file is never read at runtime) + 2 P1

The generator script and its tests, viewed in isolation, are **well-built**: the regex matches all 3,680 records with no whitespace/field-order/notation misses (confirmed against the real corpus), it fails loud on an empty/drifted corpus (`parseDimensions` throws), the tests verify intent (R9-grade, not stubs), and `loadCatalog` itself does not silently degrade (it throws on missing/malformed JSON). **But the change does not achieve its stated goal**, and that is disqualifying.

### Critical Issue — P0: The generated `src/data/global-cnc-tools.json` is never consumed at runtime
- **File:** `H:/prism/mcp-server/scripts/build-catalog-json.mjs:93-95` vs the change's output target `src/data/global-cnc-tools.json`
- The `postbuild` step (`package.json:23` → `build-catalog-json.mjs`) **regenerates `dist/data/global-cnc-tools.json` on every build from `src/data/global-cnc-tool-catalog.ts`'s `GLOBAL_CNC_TOOLS` export (`singleExport: "GLOBAL_CNC_TOOLS"`), writing to `DIST_DATA` (line 164-165), overwriting** whatever the change put in `src/data/`.
- At runtime, `ToolCatalogEngine` calls `loadCatalog("global-cnc-tools.json")` → `catalogLoader.ts` reads from **`dist/data/`** (line 17-23), i.e. the postbuild-regenerated file — **not** the script-generated `src/data/global-cnc-tools.json`.
- **Consequence:** The 1,146-record bushing-free index the change generated is dead on disk. The file actually loaded is built from `GLOBAL_CNC_TOOLS` (3,680 entries **includin
... [+5272 chars truncated]

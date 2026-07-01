---
type: "chat-session"
source: "claude-code-cli"
session_id: "a6304a93-9f8f-4616-b0a9-eaf94b272d80"
title: "Map PRISM's EXISTING cutting-parameter / speed-feed / SFM / feed-rate database s"
date: "2026-05-30"
first_ts: "2026-05-30T17:06:52.286Z"
last_ts: "2026-05-30T17:15:29.846Z"
cwd: "H:\\prism-slot-juliett"
messages: 85
user_msgs: 35
assistant_msgs: 50
raw_file: "H:/.claude/projects/H--prism-slot-juliett/a6304a93-9f8f-4616-b0a9-eaf94b272d80/subagents/agent-a3c27112df28e2ad8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:58"
---

# Map PRISM's EXISTING cutting-parameter / speed-feed / SFM / feed-rate database s

> **claude-code-cli** | 2026-05-30 | 85 msgs (35 user / 50 assistant) | cwd: H:\prism-slot-juliett
> Raw: `H:/.claude/projects/H--prism-slot-juliett/a6304a93-9f8f-4616-b0a9-eaf94b272d80/subagents/agent-a3c27112df28e2ad8.jsonl`

## Transcript

### User | 2026-05-30T17:06:52.286Z

Map PRISM's EXISTING cutting-parameter / speed-feed / SFM / feed-rate database so I know the canonical TARGET SCHEMA to populate and where the GAPS are. PRISM is at H:/prism (shared tree). This is for slot juliett (database-expansion) to ensure the calculator has complete, accurate cutting data. Report STRUCTURED findings, not file dumps.

INVESTIGATE these areas:
1. **src/data tool catalogs** — `H:/prism/mcp-server/src/data/*-tools-extracted.json` and `*-tool-catalog.ts` (emuge, kennametal-turning, osg, indexable, additional, etc.). For the LARGEST few (3.0M, 1.4M, 828K, 653K files), report: record count + field schema + whether each record carries CUTTING PARAMETERS (SFM/Vc, feed/fz, DOC, per-material recommendations) or only geometry. (Note: the new `*-tools.json` files without `-extracted` are empty `[]` stubs — ignore those.)
2. **Speed-feed / SFM engine data** — find where the SFM/feed-rate CALCULATOR gets its recommendations. Look in `H:/prism/mcp-server/src/data/` for gwizard-machines, hsm-advisor-machines, hypermill-materials, edm-material-db, any `*speed*`/`*feed*`/`*sfm*`/`*cutting*` data file. Also `H:/prism/mcp-server/src/physics/constants.ts` (Kienzle kc1.1, Taylor C/n per ISO group). What is the canonical per-material cutting-parameter record shape?
3. **prism-reference-db** — `H:/prism/mcp-server/data/prism-reference-db/` (materials.json, process.json, tools.json, coatings.json, coolants.json). What cutting/SFM/feed data do the materials + process + tools bundles already hold? (read MANIFEST.json first for the index.)
4. **Material → cutting-parameter mapping** — is there a store mapping material (ISO group or name) → recommended SFM range + feed range per tool type/operation? Where? What fields?

Reference these memory files for known locations (read them): `C:/Users/wompu/.claude/projects/H--prism/memory/reference_oscar_sfc_domain_map_2026_05_27.md`, `reference_cam_corpus_locations.md`.

End with: (a) the CANONICAL cutting-parameter record schema (
... [+269 chars truncated]

### Assistant | 2026-05-30T17:07:01.706Z

I'll systematically map PRISM's cutting-parameter database to understand the canonical schema and identify gaps. Let me start by reading the reference memory files and then investigating the key data sources.

### Assistant | 2026-05-30T17:07:01.707Z

[tool_use: Read]

### Assistant | 2026-05-30T17:07:01.714Z

[tool_use: Read]

### User | 2026-05-30T17:07:11.805Z

[tool_result] <system-reminder>This memory is 3 days old. Memories are point-in-time observations, not live state — claims about code behavior or file:line citations may be outdated. Verify against current code before asserting as fact.</system-reminder>
1	---
2	name: reference-cam-corpus-locations
3	description: "Where every CAM-related asset lives on H: drive — installs, vendor docs, in-house JM Die project f
... [+20582 chars truncated]

### User | 2026-05-30T17:07:11.814Z

[tool_result] <system-reminder>This memory is 3 days old. Memories are point-in-time observations, not live state — claims about code behavior or file:line citations may be outdated. Verify against current code before asserting as fact.</system-reminder>
1	---
2	name: reference-oscar-sfc-domain-map-2026-05-27
3	description: Speed-Feed Calculator (SFC) domain map for oscar — every engine/algorithm/data/wiki/trib
... [+16859 chars truncated]

### Assistant | 2026-05-30T17:07:14.000Z

Excellent context. Now let me systematically investigate PRISM's cutting-parameter stores. Let me start with the key data locations.

### Assistant | 2026-05-30T17:07:14.360Z

[tool_use: Bash]

### User | 2026-05-30T17:07:31.293Z

[tool_result] shop-tools/
accupro-tools-extracted.json  653.8K
additional-tool-catalog.ts  2.1M
additional-tools.json  3B
ampc-tool-catalog.ts  1.0M
ampc-tools-extracted.json  71.2K
ampc-tools.json  41B
camfix-tools-extracted.json  140.4K
dormer-pramet-tool-catalog.ts  44.6K
edm-material-db.ts  11.0K
emuge-tool-catalog.ts  2.9M
emuge-tools-extracted.json  1.0K
emuge-tools.json  3B
flash-tools-extracted.json  64
... [+522 chars truncated]

### Assistant | 2026-05-30T17:07:32.842Z

Now let me examine the largest tool catalog files and the speed-feed data:

### Assistant | 2026-05-30T17:07:33.135Z

[tool_use: Bash]

### User | 2026-05-30T17:07:42.265Z

[tool_result] zenit-tool-catalog.ts  40.5K
yg1-tools-extracted.json  1.3M
workholding-catalog.ts  24.4K
widia-2022-turning-catalog.ts  190.0K
widia-2022-inch-catalog.ts  247.2K
widia-2022-extracted.json  348.6K
unknown-tools-extracted.json  161.3K
unknown-threading-extracted.json  2.1K
unknown-insert-extracted.json  14.9K
unknown-insert_grade-extracted.json  88.4K
unknown-holder-extracted.json  10.9K
unknown-en
... [+332 chars truncated]

### Assistant | 2026-05-30T17:07:43.751Z

Let me get a comprehensive view of the largest files and then read their schemas:

### Assistant | 2026-05-30T17:07:44.155Z

[tool_use: Bash]

### User | 2026-05-30T17:07:50.497Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-30T17:07:52.009Z

Let me use a more efficient approach with Glob to find the largest files:

### Assistant | 2026-05-30T17:07:52.224Z

[tool_use: Glob]

### Assistant | 2026-05-30T17:07:52.445Z

[tool_use: Glob]

### Assistant | 2026-05-30T17:07:52.660Z

[tool_use: Glob]

### Assistant | 2026-05-30T17:07:52.755Z

[tool_use: Glob]

### User | 2026-05-30T17:07:57.587Z

[tool_result] H:/prism/mcp-server/src/data\osg-tools-extracted.json
H:/prism/mcp-server/src/data\guhring-tools-extracted.json
H:/prism/mcp-server/src/data\sandvik-tools-extracted.json
H:/prism/mcp-server/src/data\haimer-holders-extracted.json
H:/prism/mcp-server/src/data\guhring-holders-extracted.json
H:/prism/mcp-server/src/data\flash-tools-extracted.json
H:/prism/mcp-server/src/data\ma-ford-tools-extracted.js
... [+2613 chars truncated]

### User | 2026-05-30T17:07:57.591Z

[tool_result] H:/prism/mcp-server/data/prism-reference-db\other.json
H:/prism/mcp-server/data/prism-reference-db\machines.json
H:/prism/mcp-server/data/prism-reference-db\controllers.json
H:/prism/mcp-server/data/prism-reference-db\materials.json
H:/prism/mcp-server/data/prism-reference-db\workholding.json
H:/prism/mcp-server/data/prism-reference-db\cad.json
H:/prism/mcp-server/data/prism-reference-db\process.j
... [+680 chars truncated]

### User | 2026-05-30T17:07:58.741Z

[tool_result] H:/prism/mcp-server/src/data\hypermill-speed-feed-catalog.ts
H:/prism/mcp-server/src/data\manufacturer-speed-feed-data.ts
H:/prism/mcp-server/src/data\guhring-iscar-speed-feed-data.ts
H:/prism/mcp-server/src/data\osg-speed-feed-data.ts
H:/prism/mcp-server/src/data\helical-speed-feed-data.ts
H:/prism/mcp-server/src/data\new-manufacturer-speed-feed-data.ts
H:/prism/mcp-server/src/data\academy\course
... [+24 chars truncated]

### User | 2026-05-30T17:07:58.745Z

[tool_result] H:/prism/mcp-server/src/data\hypermill-materials-catalog.ts
H:/prism/mcp-server/src/data\edm-material-db.ts
H:/prism/mcp-server/src/data\academy\course-33-material-machining-atlas.ts

### Assistant | 2026-05-30T17:08:03.125Z

Perfect. Now let me read the key files to understand the schema and coverage. Let me start with the MANIFEST and a few largest extracted files:

### Assistant | 2026-05-30T17:08:03.358Z

[tool_use: Read]

### Assistant | 2026-05-30T17:08:03.919Z

[tool_use: Read]

### Assistant | 2026-05-30T17:08:03.610Z

[tool_use: Read]

### User | 2026-05-30T17:08:07.734Z

[tool_result] File content (1MB) exceeds maximum allowed size (256KB). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-05-30T17:08:08.213Z

[tool_result] 1	/**
2	 * PRISM Canonical Physics Constants
3	 *
4	 * ALL physics calculations MUST import from this file.
5	 * NEVER inline numeric values for Kienzle, Taylor, or material properties.
6	 *
7	 * Sources:
8	 * - Kienzle: Sandvik Coromant General Turning (2024), ISO 3685:1993
9	 * - Taylor: Taylor (1907), Modern: ISO 3685:1993
10	 * - EDM: Klocke "Fertigungsverfahren Band 3", DiBitonto et al. (1989
... [+9189 chars truncated]

### User | 2026-05-30T17:08:10.080Z

[tool_result] 1	[
2	  {
3	    "designation": "YG1-380.0",
4	    "manufacturer": "YG-1",
5	    "type": "drill",
6	    "cutting_diameter_mm": 380.0
7	  },
8	  {
9	    "designation": "YG1-39.0",
10	    "manufacturer": "YG-1",
11	    "type": "drill",
12	    "cutting_diameter_mm": 39.0
13	  },
14	  {
15	    "designation": "YG1-309.0",
16	    "manufacturer": "YG-1",
17	    "type": "ball_mill",
18	    "cutting_diamete
... [+1591 chars truncated]

### Assistant | 2026-05-30T17:08:12.065Z

Let me read just the MANIFEST structure:

### Assistant | 2026-05-30T17:08:12.289Z

[tool_use: Read]

### Assistant | 2026-05-30T17:08:12.786Z

[tool_use: Read]

### Assistant | 2026-05-30T17:08:13.008Z

[tool_use: Read]

### User | 2026-05-30T17:08:17.807Z

[tool_result] 1	{
2	  "schemaVersion": "1.0.0",
3	  "generatedFromSession": "claude-a6304a93/juliett",
4	  "mode": "apply",
5	  "sourceFilesScanned": 1715,
6	  "sourceFilesTotal": 1715,
7	  "fileReadErrors": 0,
8	  "candidateAssignments": 13307,
9	  "storesExtracted": 1859,
10	  "storesFailed": 1066,
11	  "emptyDropped": 2832,
12	  "recoveredViaCommaRepair": 5,
13	  "totalRecords": 13920,
14	  "totalBytes": 258
... [+1778 chars truncated]

### User | 2026-05-30T17:08:19.969Z

[tool_result] 1	/**
2	 * hyperMILL Speed/Feed Catalog - extracted from IM_Tool_DB_V2023.1.db
3	 * Diameter-dependent cutting speed (Vc) and feed per edge (fz) lookup tables
4	 * from hyperMILL Automation Center Intelligent Macro system.
5	 *
6	 * Materials: 16MnCr5 (steel <=800 N/mm2), AlZnMg (aluminum <=550 N/mm2), VA (stainless <=750 N/mm2)
7	 * Cutting materials: VHM (solid carbide) milling/drilling/ball, HS
... [+13398 chars truncated]

### User | 2026-05-30T17:08:19.972Z

[tool_result] 1	[
2	  {
3	    "designation": "301-0.34",
4	    "manufacturer": "Guhring",
5	    "type": "drill",
6	    "article": "301",
7	    "cutting_diameter_mm": 0.34,
8	    "page": 58,
9	    "shank_diameter_mm": 1.0,
10	    "overall_length_mm": 25.0,
11	    "flute_length_mm": 2.4
12	  },
13	  {
14	    "designation": "301-0.345",
15	    "manufacturer": "Guhring",
16	    "type": "drill",
17	    "article": "3
... [+1631 chars truncated]

### Assistant | 2026-05-30T17:08:21.822Z

Now let me look at the reference-db materials and process files, plus check the additional tool catalog:

### Assistant | 2026-05-30T17:08:22.465Z

[tool_use: Read]

### system

... [5 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-30T17:08:31.252Z

Now let me check the speed-feed data files and examine the hypermill-materials-catalog:

### Assistant | 2026-05-30T17:08:32.733Z

[tool_use: Grep]

### Assistant | 2026-05-30T17:08:32.886Z

[tool_use: Read]

### User | 2026-05-30T17:08:37.174Z

[tool_result] File content (26428 tokens) exceeds maximum allowed tokens (25000). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-05-30T17:08:39.763Z

[tool_result] H:\prism\mcp-server\src\data\hypermill-speed-feed-catalog.ts:7: * Cutting materials: VHM (solid carbide) milling/drilling/ball, HSS taps/drills, reamers, barrel cutters
H:\prism\mcp-server\src\data\hypermill-speed-feed-catalog.ts:11:export interface HyperMillSpeedFeedEntry {
H:\prism\mcp-server\src\data\hypermill-speed-feed-catalog.ts:15:  cutting_speed: number;
H:\prism\mcp-server\src\data\hyperm
... [+4724 chars truncated]

### Assistant | 2026-05-30T17:08:44.742Z

Let me read the hypermill-materials with offset and check the ManufacturerSpeedFeed interface:

### Assistant | 2026-05-30T17:08:45.336Z

[tool_use: Read]

### Assistant | 2026-05-30T17:08:45.551Z

[tool_use: Read]

### Assistant | 2026-05-30T17:08:45.684Z

[tool_use: Read]

### User | 2026-05-30T17:08:51.382Z

[tool_result] 1	// @ts-nocheck — Pure data file; 2,544-element array exceeds TS union type limit
2	/**
3	 * hyperMILL Materials Catalog - extracted from hyperMILL v33.0 materials.db
4	 * 2,544 materials with ISO cross-references and machinability correction factors
5	 * Source: C:/PRISM/HYPERMILL/Tool Database/33.0/databases/materials.db
6	 *
7	 * Chipping classes define machinability bands (ISO P/M/K/N/S/H gro
... [+18445 chars truncated]

### User | 2026-05-30T17:08:51.410Z

[tool_result] 1	/**
2	 * OSG Speed/Feed Data — manufacturer recommendations for major OSG series.
3	 * Sources: OSG General Catalog, OSG Technical Reference, published cutting data charts.
4	 * 11,550 OSG tools in catalog — these S/F entries cover the main product lines.
5	 */
6	
7	export interface ManufacturerSpeedFeed {
8	  series: string;
9	  isoGroup: string;
10	  vc_min: number;
11	  vc_max: number;
12	  f
... [+5670 chars truncated]

### User | 2026-05-30T17:08:52.801Z

[tool_result] 1	/**
2	 * Manufacturer Speed/Feed Data — extracted from official PDF catalogs.
3	 *
4	 * Sources:
5	 *   - Seco "Solid End Mills.pdf" (407 pp) — Jabro solid carbide end mills
6	 *   - Kennametal "Holemaking.pdf" (517 pp) — Seco Feedmax / Perfomax drills
7	 *   - Kennametal "Milling 2018.1.pdf" (752 pp) — indexable milling cutters
8	 *
9	 * All vc values in m/min.  fz values in mm/tooth (milling) 
... [+3218 chars truncated]

### Assistant | 2026-05-30T17:08:55.072Z

Excellent. Now let me search for how materials are mapped to cutting parameters and check if there's any depth-of-cut or advance-per-rotation guidance:

### Assistant | 2026-05-30T17:08:55.979Z

[tool_use: Grep]

### Assistant | 2026-05-30T17:08:56.885Z

[tool_use: Grep]

### User | 2026-05-30T17:09:02.817Z

[tool_result] Found 30 files limit: 30
H:\prism\mcp-server\src\data\cimatron-cam-tips.ts
H:\prism\mcp-server\src\data\tribal-tips\milling-pdf-cited-tips.ts
H:\prism\mcp-server\src\data\academy\course-29-toolpath-reasoning-dual-level.ts
H:\prism\mcp-server\src\data\academy\course-32-machining-math-science-deep-dive.ts
H:\prism\mcp-server\src\data\academy\course-30-toolpath-catalog-programming-paradigms.ts
H:\pri
... [+1477 chars truncated]

### User | 2026-05-30T17:09:02.822Z

[tool_result] Found 20 files limit: 20
H:\prism\mcp-server\src\engines\SpeedFeedShopLibraryBridgeEngine.ts
H:\prism\mcp-server\src\engines\SpeedFeedNineAxisOrchestratorEngine.ts
H:\prism\mcp-server\src\engines\SpeedFeedOutcomeFeedbackBridgeEngine.ts
H:\prism\mcp-server\src\engines\SpeedFeedExhaustiveCombinationEngine.ts
H:\prism\mcp-server\src\engines\SpeedFeedAtScaleHarnessEngine.ts
H:\prism\mcp-server\src\eng
... [+948 chars truncated]

### Assistant | 2026-05-30T17:09:04.854Z

Let me check the UltimateSpeedFeedEngine to see the cutting parameter structure and check if there's a material mapping service:

### Assistant | 2026-05-30T17:09:05.087Z

[tool_use: Read]

### User | 2026-05-30T17:09:07.207Z

[tool_result] 1	/**
2	 * UltimateSpeedFeedEngine — AI-Powered Unified Speed & Feed Optimization
3	 *
4	 * The most comprehensive speed/feed calculator in existence. Accepts ANY subset
5	 * of inputs and infers all missing parameters using physics-based models,
6	 * material databases, and empirical lookup tables.
7	 *
8	 * Capabilities far exceeding Harvey Tool / Kennametal / Sandvik calculators:
9	 *   - Parti
... [+8687 chars truncated]

### Assistant | 2026-05-30T17:09:08.278Z

[tool_use: Grep]

### User | 2026-05-30T17:09:13.133Z

[tool_result] H:\prism\mcp-server\src\engines\UltimateSpeedFeedEngine.ts:87:export interface UltimateSpeedFeedInput {
H:\prism\mcp-server\src\engines\UltimateSpeedFeedEngine.ts:242:export interface UltimateSpeedFeedResult {
H:\prism\mcp-server\src\engines\UltimateSpeedFeedEngine.ts:713:interface CuttingParams {

### Assistant | 2026-05-30T17:09:15.169Z

Let me get the full UltimateSpeedFeedResult interface and check the CuttingParams:

### Assistant | 2026-05-30T17:09:15.567Z

[tool_use: Read]

### Assistant | 2026-05-30T17:09:15.785Z

[tool_use: Read]

### User | 2026-05-30T17:09:17.530Z

[tool_result] 240	}
241	
242	export interface UltimateSpeedFeedResult {
243	  // Core optimized parameters
244	  cutting_speed: OptimizedValue;         // Vc (m/min)
245	  spindle_rpm: OptimizedValue;           // n (rev/min)
246	  feed_per_tooth: OptimizedValue;        // fz (mm/tooth) — milling
247	  feed_per_rev: OptimizedValue;          // fn (mm/rev) — turning/drilling
248	  feed_rate: OptimizedValue;     
... [+4509 chars truncated]

### User | 2026-05-30T17:09:18.896Z

[tool_result] 710	// ============================================================================
711	// Vc in m/min, fz in mm/tooth (base for 12mm endmill), ap in mm, ae in % of Dc
712	
713	interface CuttingParams {
714	  vc: [number, number, number];         // [conservative, balanced, aggressive]
715	  fz: [number, number, number];         // mm/tooth (12mm endmill base)
716	  ap: [number, number, number];  
... [+7971 chars truncated]

### Assistant | 2026-05-30T17:09:21.346Z

Perfect. Now let me check the registries and see if there's a material → ISO group mapping:

### Assistant | 2026-05-30T17:09:21.755Z

[tool_use: Read]

### Assistant | 2026-05-30T17:09:22.395Z

[tool_use: Grep]

### User | 2026-05-30T17:09:26.251Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Material Registry
3	 * Complete access to 1,047 materials × 127 parameters
4	 * 4-Layer Hierarchy: LEARNED → USER → ENHANCED → CORE
5	 */
6	
7	import * as fs from "fs/promises";
8	import * as path from "path";
9	import { BaseRegistry, type RegistryEntry } from "./base.js";
10	import { PATHS, DATA_LAYERS, ISO_GROUPS, MATERIAL_CATEGORIES, type IsoMaterialGroup } from ".
... [+3403 chars truncated]

### User | 2026-05-30T17:09:29.287Z

[tool_result] H:\prism\mcp-server\src\services\MaterialService.ts:26:    return materialRegistry.getByISO(isoGroup);

### Assistant | 2026-05-30T17:09:31.066Z

Now let me get a comprehensive summary by checking for any existing gaps documentation:

### Assistant | 2026-05-30T17:09:31.503Z

[tool_use: Bash]

### Assistant | 2026-05-30T17:09:31.921Z

[tool_use: Glob]

### Assistant | 2026-05-30T17:09:32.292Z

[tool_use: Read]

### User | 2026-05-30T17:09:33.882Z

[tool_result] File content (366402 tokens) exceeds maximum allowed tokens (25000). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-05-30T17:09:35.053Z

[tool_result] H:/prism/mcp-server/data/prism-reference-db\tools.json

### User | 2026-05-30T17:14:38.943Z

[tool_result] Command running in background with ID: b9xi4m3dn. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\ae2a8817-39ef-4043-a8bd-dd1cba047ee6\tasks\b9xi4m3dn.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-30T17:15:29.846Z

Now I have enough data. Let me compile the comprehensive findings:

## PRISM CUTTING-PARAMETER DATABASE MAPPING REPORT

Based on systematic investigation of PRISM's data architecture, here are the structured findings:

---

### (A) CANONICAL CUTTING-PARAMETER RECORD SCHEMA

The authoritative schema emerges from **UltimateSpeedFeedEngine** + **physics/constants.ts** + **manufacturer-speed-feed-data.ts**. A complete record must contain:

```typescript
// CORE CUTTING PARAMETERS
{
  // Material Identity
  material: string;                    // Name/designation (e.g., "AISI 1045", "Ti-6Al-4V")
  iso_group: "P"|"M"|"K"|"N"|"S"|"H";  // ISO 513 material group
  hardness_hb?: number;                // Brinell hardness (0–3200 HB range)
  hardness_hrc?: number;               // Rockwell C (0–75 HRC, for hardened steel)
  density_kg_m3: number;               // For thermal/force calculations
  tensile_strength_mpa?: number;       // For strength-based limits
  
  // Operation Context
  operation: "milling"|"turning"|"drilling"|"tapping"|"reaming"|"boring";
  cut_type: "roughing"|"semi_finishing"|"finishing";
  strategy?: "conventional"|"adaptive"|"trochoidal"|"hsm"|"hpc";
  
  // Cutting Speed (Vc, n)
  cutting_speed_mpm: [number, number, number];  // [min, nominal, max] in m/min
  spindle_rpm?: [number, number, number];       // Derived from Vc and tool diameter
  
  // Feed Rate (fz, f)
  feed_per_tooth_mm?: [number, number, number];     // [min, nom, max] mm/tooth (milling)
  feed_per_rev_mm?: [number, number, number];       // [min, nom, max] mm/rev (turning/drilling)
  feed_rate_mmmin?: [number, number, number];       // Derived: fz × z × RPM
  
  // Depth of Cut (ap, ae)
  axial_depth_mm?: [number, number, number];        // [min, nom, max] mm (axial)
  radial_depth_mm?: [number, number, number];       // [min, nom, max] mm (radial)
  radial_depth_pct?: [number, number, number];      // % of tool diameter (ae as % Dc)
  
  // Tool Specification
  tool_diameter_mm?: nu
... [+12625 chars truncated]

---
type: "chat-session"
source: "claude-code-cli"
session_id: "a6304a93-9f8f-4616-b0a9-eaf94b272d80"
title: "You are auditing ONE PRISM database domain for proper categorization. Domain: **"
date: "2026-06-01"
first_ts: "2026-06-01T18:45:52.394Z"
last_ts: "2026-06-01T19:30:12.327Z"
cwd: "H:\\prism-slot-juliett"
messages: 75
user_msgs: 28
assistant_msgs: 47
raw_file: "H:/.claude/projects/H--prism-slot-juliett/a6304a93-9f8f-4616-b0a9-eaf94b272d80/subagents/workflows/wf_385f6226-cd7/agent-aed8f4663c7d9ec98.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:58"
---

# You are auditing ONE PRISM database domain for proper categorization. Domain: **

> **claude-code-cli** | 2026-06-01 | 75 msgs (28 user / 47 assistant) | cwd: H:\prism-slot-juliett
> Raw: `H:/.claude/projects/H--prism-slot-juliett/a6304a93-9f8f-4616-b0a9-eaf94b272d80/subagents/workflows/wf_385f6226-cd7/agent-aed8f4663c7d9ec98.jsonl`

## Transcript

### User | 2026-06-01T18:45:52.394Z

You are auditing ONE PRISM database domain for proper categorization. Domain: **PrismReferenceDB** (7 declared consumers, manifest declares 17 categories).

Two GOLD-STANDARD exemplars of "properly categorized" already shipped by slot juliett — use them as the bar:
  - mcp-server/src/data/tool-material-categorization.ts — ISO 513 workpiece-material axis (P/M/K/N/S/H): taxonomy const + normalize fn + zod schema + categorize fn; unknown->null (never coerced); cross-CAM portable.
  - mcp-server/src/data/holder-categorization.ts — holder interface family x taper size x contact type (taper_only/dual_contact_big_plus/inherently_dual); same shape.
"Properly categorized" means: a CANONICAL, manufacturing-correct grouping KEY (ISO group, IT tolerance grade, coolant class, fixture type, controller dialect, taper size, etc.) — NOT free-text names — expressed as a reusable axis (taxonomy + normalize + zod schema) AND wired into the consumers that read the DB. Free-text columns ("1018", "carbon steel") are UNCATEGORIZED even if the DB has many rows.

STEPS (read real files in H:/prism — do NOT trust the manifest's category count; MaterialDB is ISO-513-categorized yet records 0 in the manifest):
1. Find the domain in mcp-server/data/databases/DB_MANIFEST.json (its entry has the data file path + consumers[]). Note its path.
2. Inspect the ACTUAL data file/dir it points to (mcp-server/data/** or src/data/**). What is the row/record shape? Is there a grouping key, or are categories free-text?
3. Search for an existing canonical axis: src/data/*-categorization.ts, src/schemas/*, src/registries/*, and the DB's own engine (src/engines/*PrismReference*.ts or similar). Does a reusable taxonomy+normalize+zod axis exist?
4. Check the consumers[] — do they actually USE a categorization, or read free-text?
5. Decide the MANUFACTURING-CORRECT natural axis for this domain (e.g. MaterialDB->ISO 513; ToleranceDB->IT grade/fit class; CoolantDB->coolant type (flood/MQL/through-spindle/oil); Workho
... [+702 chars truncated]

### Assistant | 2026-06-01T18:48:06.352Z

I'll audit the **PrismReferenceDB** domain for proper categorization. Let me start by finding it in the manifest and inspecting the actual data.

### Assistant | 2026-06-01T18:48:07.715Z

[tool_use: Grep]

### User | 2026-06-01T18:48:07.717Z

[tool_result] <tool_use_error>Path does not exist: H:/prism/mcp-server/data/databases/DB_MANIFEST.json. Note: your current working directory is H:\prism-slot-juliett.</tool_use_error>

### Assistant | 2026-06-01T18:48:15.366Z

The working directory is `H:\prism-slot-juliett`, not `H:/prism`. Let me find the manifest.

### Assistant | 2026-06-01T18:48:16.823Z

[tool_use: Bash]

### Assistant | 2026-06-01T18:48:16.948Z

[tool_use: Glob]

### User | 2026-06-01T18:48:49.620Z

[tool_result] No files found

### User | 2026-06-01T18:51:51.221Z

[tool_result] Exit code 2

### Assistant | 2026-06-01T18:51:54.577Z

Let me locate the manifest with a narrower search.

### Assistant | 2026-06-01T18:51:55.026Z

[tool_use: Glob]

### Assistant | 2026-06-01T18:51:56.133Z

[tool_use: Glob]

### User | 2026-06-01T18:52:33.813Z

[tool_result] No files found

### User | 2026-06-01T18:52:33.877Z

[tool_result] No files found

### Assistant | 2026-06-01T18:52:41.724Z

No databases directory there. Let me find where the DB manifest actually lives.

### Assistant | 2026-06-01T18:52:41.726Z

[tool_use: Bash]

### User | 2026-06-01T18:55:19.530Z

[tool_result] ---ALT---
H:/prism-slot-juliett/mcp-server/data
H:/prism-slot-juliett/mcp-server/data/cad-functions
H:/prism-slot-juliett/mcp-server/data/cad-functions/fusion360
H:/prism-slot-juliett/mcp-server/data/cad-functions/hypercad
H:/prism-slot-juliett/mcp-server/data/cad-functions/inventor
H:/prism-slot-juliett/mcp-server/data/cad-functions/mastercam
H:/prism-slot-juliett/mcp-server/data/cad-functions/so
... [+1984 chars truncated]

### Assistant | 2026-06-01T18:55:24.662Z

The `DB_MANIFEST.json` doesn't exist in slot-juliett. The manifest is likely in the main `H:/prism` tree. Let me check there directly.

### Assistant | 2026-06-01T18:55:26.530Z

[tool_use: Bash]

### User | 2026-06-01T18:59:25.068Z

[tool_result] Exit code 1
0 for 'DB_MANIFEST.json'
---DATABASES DIR---
---SEARCH PrismReference---

### Assistant | 2026-06-01T18:59:29.245Z

Let me search both trees more broadly for the manifest file by name and for "PrismReferenceDB" as a string.

### Assistant | 2026-06-01T18:59:30.930Z

[tool_use: Bash]

### User | 2026-06-01T19:02:11.245Z

[tool_result] %SystemDrive%/
.cache/
.claude/
.claude-flow/
.claude-octopus/
===MANIFEST SEARCH===
===slot-juliett databases===

### Assistant | 2026-06-01T19:02:16.350Z

The H:/prism tree exists but no `DB_MANIFEST.json` found at maxdepth 4. Let me grep for the literal string "PrismReferenceDB" and "DB_MANIFEST" across the codebase to find where this domain is declared.

### Assistant | 2026-06-01T19:02:17.533Z

[tool_use: Grep]

### Assistant | 2026-06-01T19:02:18.299Z

[tool_use: Grep]

### User | 2026-06-01T19:02:32.597Z

[tool_result] Found 6 files
state\QA-MS7\tool-registry-audit.json
state\QA-MS7\material-registry-audit.json
state\QA-MS7\machine-registry-audit.json
state\QA-MS7\formula-registry-audit.json
state\QA-MS7\cross-registry-integrity.json
mcp-server\src\registries\DatabaseRegistry.ts

### User | 2026-06-01T19:02:33.127Z

[tool_result] No files found

### Assistant | 2026-06-01T19:02:44.663Z

`DatabaseRegistry.ts` references DB_MANIFEST. And `PrismReferenceDB` returns no matches as a literal — so the name in the task is a logical/manifest name, not necessarily a TS class. Let me read the DatabaseRegistry and find the actual manifest path.

### Assistant | 2026-06-01T19:02:44.719Z

[tool_use: Read]

### User | 2026-06-01T19:02:53.943Z

[tool_result] 1	/**
2	 * PRISM Database Registry
3	 * =======================
4	 * Provides unified access to all 24 JSON databases defined in DB_MANIFEST.json.
5	 * Wraps file-backed databases (ThreadDB, GenomeDB, etc.) into the RegistryManager
6	 * ecosystem so they're discoverable via globalSearch and listRegistries.
7	 *
8	 * @version 1.0.0 — L0-P2-MS1
9	 */
10	
11	import * as fs from "fs";
12	import * as p
... [+8525 chars truncated]

### Assistant | 2026-06-01T19:03:12.290Z

The manifest path resolves to `PATHS.MCP_SERVER/../data/databases/DB_MANIFEST.json`. The slot-juliett tree doesn't have it, but the main `H:/prism` tree should. Let me locate it directly and look for the PrismReferenceDB entry. The manifest comment says "ThreadDB, GenomeDB" are file-backed — "PrismReferenceDB" may be the actual database `name` field. Let me find the manifest in the main tree.

### Assistant | 2026-06-01T19:03:14.450Z

[tool_use: Bash]

### User | 2026-06-01T19:08:33.149Z

[tool_result] Command running in background with ID: b01r6cna7. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\a70b69d6-4a54-48d7-adb0-f6776e3d324d\tasks\b01r6cna7.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-01T19:08:38.588Z

[tool_use: Bash]

### User | 2026-06-01T19:10:05.666Z

[tool_result] 0 for 'DB_MANIFEST.json'
===alt resolve via MCP_SERVER/../data===
CAMSystemDB.json  22.9K
CollisionDB.json  5.3K
CoolantDB.json  2.9K
DB_MANIFEST.json  16.7K
DecisionTreeDB.json  6.0K
GCodeTemplateDB.json  11.1K
GenomeDB.json  12.8K
ProcessDataDB.json  3.3K
ReportTemplateDB.json  3.9K
SourceCatalogDB.json  4.9K
===grep PrismReference in main tree manifest area===

### Assistant | 2026-06-01T19:10:15.639Z

The databases live in `H:/prism/data/databases/` (note: `H:/prism/data`, not `H:/prism/mcp-server/data`). The manifest is `H:/prism/data/databases/DB_MANIFEST.json`. `PrismReferenceDB` isn't grepping there — it may be the `name` field. Let me read the manifest and the databases directory listing.

### Assistant | 2026-06-01T19:10:16.185Z

[tool_use: Read]

### Assistant | 2026-06-01T19:10:34.505Z

[tool_use: Bash]

### User | 2026-06-01T19:11:53.464Z

[tool_result] CAMSystemDB.json  22.9K
CollisionDB.json  5.3K
CoolantDB.json  2.9K
DB_MANIFEST.json  16.7K
DecisionTreeDB.json  6.0K
GCodeTemplateDB.json  11.1K
GenomeDB.json  12.8K
ProcessDataDB.json  3.3K
ReportTemplateDB.json  3.9K
SourceCatalogDB.json  4.9K
SpindleDB.json  6.3K
ThreadDB.json  165.3K
ToleranceDB.json  4.9K
ToolpathStrategyDB.json  173.3K
WorkflowDB.json  13.2K
WorkholdingDB.json  3.5K
prism.d
... [+11 chars truncated]

### User | 2026-06-01T19:12:00.903Z

[tool_result] 1	{
2	  "version": "2.0.0",
3	  "generated": "2026-02-26",
4	  "milestone": "L0-P0-MS2",
5	  "description": "PRISM Database Manifest — 12 core + 12 specialty + 3 juliett directory stores (27 total). Directory stores (JMDie/Vendor/Reference) are registry-backed metadata-only — discoverable via prism_data:database_list + globalSearch, queried via their own manifests + db-toolbelt/prism_memory (not l
... [+19015 chars truncated]

### Assistant | 2026-06-01T19:12:12.238Z

I found the `PrismReferenceDB` entry. Key facts:
- **type**: `registry-backed`, directory store (juliett-owned)
- **source_dir**: `mcp-server/data/prism-reference-db/`
- **manifest_file**: `mcp-server/data/prism-reference-db/MANIFEST.json`
- **17 category JSONs**, 13,920 records
- **categories: 17** (materials/tools/physics/coatings/inserts/process/coolants/holders/...)
- **7 consumers**: speed-feed, mill, lathe, wedm, cam, cad, quality
- Built by `scripts/extract-monolith-databases.mjs`

This is a **multi-category umbrella DB**. The key question: is each category internally categorized on its manufacturing-correct axis, or is it just free-text rows grouped only by filename? Let me inspect the actual data directory and its inner MANIFEST.

### Assistant | 2026-06-01T19:12:12.854Z

[tool_use: Read]

### Assistant | 2026-06-01T19:12:14.101Z

[tool_use: Bash]

### User | 2026-06-01T19:12:26.078Z

[tool_result] File content (1MB) exceeds maximum allowed size (256KB). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-06-01T19:12:49.332Z

[tool_result] Exit code 2
MANIFEST.json  1.0M
README.md  2.1K
abrasives.json  599B
cad.json  4.7M
coatings.json  8.0K
controllers.json  344.2K
coolants.json  76.1K
cost.json  297.0K
holders.json  1.4M
inserts.json  24.6K
machines.json  1.9M
materials.json  9.0M
other.json  4.3M
physics.json  888.1K
post.json  125.0K
process.json  640.2K
safety.json  246.7K
tools.json  661.9K
workholding.json  132.9K
===TABLES S
... [+15 chars truncated]

### Assistant | 2026-06-01T19:12:57.249Z

Now I can see the actual structure: 17+ category JSON files (the "17 categories"), no `tables/` subdir, flat JSON files per category. The MANIFEST is 1MB (probably a per-record index). Let me read the README, the MANIFEST head, and inspect the row shape of a representative categorized-candidate file (materials — should map ISO 513) plus the inner MANIFEST structure.

### Assistant | 2026-06-01T19:12:57.640Z

[tool_use: Read]

### Assistant | 2026-06-01T19:12:57.952Z

[tool_use: Read]

### User | 2026-06-01T19:13:27.842Z

[tool_result] 1	# PRISM Reference DB (extracted from the monolith)
2	
3	Generated by `scripts/extract-monolith-databases.mjs`. 1859 data stores across 17 categories (13,920 records, 25.8MB), written as one `<category>.json` bundle per category.
4	
5	Each bundle is `{ category, count, stores: { <NAME>: <data>, … } }`. Look up a store by name inside its category bundle; `MANIFEST.json` maps every store name → cat
... [+1771 chars truncated]

### User | 2026-06-01T19:13:27.846Z

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
... [+977 chars truncated]

### Assistant | 2026-06-01T19:13:36.136Z

Now the picture is clear. This is a **monolith-extraction dump**: 1,859 arbitrary "stores" bucketed into 17 broad categories by a heuristic classifier. The "categories" are coarse buckets (materials/tools/physics/...) — NOT a manufacturing-correct axis. The critical detail: README says "1047 stores in **other**" — an ~"uncategorized" catch-all that is the single largest bucket (6,236 records, 45% of all records). And the "categories" axis (`byCategory`) is bundle-grouping, not a canonical grouping KEY on the records themselves.

Let me verify the actual record shape inside a category bundle. The decisive test: do records inside `materials.json` carry an ISO-513 group key, or are they free-text? Let me inspect representative slices. The files are huge, so I'll use targeted reads.

### Assistant | 2026-06-01T19:13:41.380Z

[tool_use: Bash]

### User | 2026-06-01T19:14:51.249Z

[tool_result] === materials.json ===
category: materials count(stores): 150 storeKeys: 150
first 8 store names: [
  'validMaterials',
  'materialPrices',
  'commonMaterials',
  'PRISM_MATERIAL_KC_DATABASE',
  'PRISM_EXTENDED_MATERIAL_CUTTING_DB',
  'PRISM_UNIFIED_MATERIAL_ACCESS',
  'material',
  'isHardMaterial'
]
-- store[validMaterials] is array, len=6
   record[0] keys: [
  '0', '1', '2',
  '3', '4', '5',
 
... [+30 chars truncated]

### Assistant | 2026-06-01T19:14:58.325Z

This is very revealing. The `materials` "category" contains 150 heterogeneous stores with wildly inconsistent shapes — `validMaterials` is an array of single strings (`"carbide"`), keyed by numeric indices `0,1,2...`. This is dumped JS object data, not a categorized record table. Let me inspect a few more stores within materials and look at other category bundles (tools, controllers, holders) to confirm the pattern and check whether ANY canonical grouping key (ISO group, controller dialect, taper) exists on records.

### Assistant | 2026-06-01T19:15:04.130Z

[tool_use: Bash]

### User | 2026-06-01T19:16:33.396Z

[tool_result] === materials.json === category=materials stores=150
  [validMaterials] array[6] el0keys=["0","1","2","3","4","5","6"]
  [materialPrices] object keys=["aluminum_6061","aluminum_7075","steel_1018","steel_4140","stainless_304","stainless_316","titanium","brass"]
  [commonMaterials] array[14] el0keys=["0","1","2","3","4","5","6","7"]
  [PRISM_MATERIAL_KC_DATABASE] object keys=["version","materials"]

... [+4191 chars truncated]

### Assistant | 2026-06-01T19:16:48.247Z

This fully confirms the diagnosis. The `PrismReferenceDB` is a **monolith-extraction dump** — a heterogeneous grab-bag of 1,859 JS objects/arrays scraped from legacy HTML monoliths and module dumps, bucketed into 17 coarse "categories" purely by a filename/keyword heuristic. There is **no canonical grouping key** on the records:

- `materials` stores key materials by **free-text names** (`steel_1018`, `aluminum_6061`, `stainless_304`) — exactly the UNCATEGORIZED signal the task warns about. No ISO-513 P/M/K/N/S/H axis on the records.
- `controllers` stores key by free-text dialect names (`haas`, `fanuc`, `okuma`) — no normalized dialect taxonomy + zod.
- `holders` stores have taper info embedded (`CAT40`, `HSK-A63`) but as raw object keys, NOT a normalized taper-size/contact-type axis like the gold-standard `holder-categorization.ts`.
- `coolants` key by vendor (`blaser`, `castrol`) or free-text class (`flood`, `mist`, `tsc`) — no normalized coolant-class enum.
- Many stores are degenerate: `validMaterials` is `["carbide", ...]` indexed `0,1,2...`.
- The largest bucket is `other` (1,047 stores / 6,236 records / 45% of all records) — a literal "uncategorized" catch-all.

The 17 "categories" are **bundle-grouping (which file a store landed in)**, not a manufacturing axis applied to records. Now let me verify two more things: (1) whether any canonical axis module exists that this DB consumes, and (2) whether the 7 declared consumers actually READ this DB by any categorization (or read it at all). Let me check the gold-standard axes exist and search consumers + the toolbelt/dispatcher path.

### Assistant | 2026-06-01T19:16:50.831Z

[tool_use: Bash]

### User | 2026-06-01T19:17:55.572Z

[tool_result] === Gold-standard axes exist? ===
mcp-server/src/data/holder-categorization.ts  9.7K
mcp-server/src/data/tool-material-categorization.ts  11.3K
=== categorization axes in src/data ===
holder-categorization.ts  9.7K
pipelineDecisionTaxonomy.ts  24.1K
tool-material-categorization.test.ts  8.0K
tool-material-categorization.ts  11.3K

=== Who reads prism-reference-db? (consumers wiring) ===
mcp-server
... [+310 chars truncated]

### Assistant | 2026-06-01T19:18:04.903Z

Critical finding: the only references to `prism-reference-db` in `mcp-server/src` are in **PATHS.md documentation files** (galaxy memory cards) and one **TOOLBELT.md** — there is **zero actual code (`.ts`) that reads this DB**. The 7 declared consumers list it as a known path in their memory cards, but no engine imports/queries it through a categorization (or at all in code). Let me confirm by checking the toolbelt query path and whether any `.ts` actually loads these category files, plus verify the gold-standard axis files are NOT applied to this DB.

### Assistant | 2026-06-01T19:18:11.980Z

[tool_use: Bash]

### User | 2026-06-01T19:23:36.598Z

[tool_result] Command running in background with ID: btja0ytbw. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\a70b69d6-4a54-48d7-adb0-f6776e3d324d\tasks\btja0ytbw.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-01T19:23:43.927Z

[tool_use: Bash]

### User | 2026-06-01T19:25:03.318Z

[tool_result] === Any .ts/.mjs code reading the bundle files or via db-toolbelt? ===

### Assistant | 2026-06-01T19:25:09.852Z

The first grep returned nothing (no non-doc code reads it). The rest may still be running or hit an error. Let me run the remaining checks directly and concisely.

### Assistant | 2026-06-01T19:25:12.987Z

[tool_use: Bash]

### User | 2026-06-01T19:26:54.138Z

[tool_result] === db-toolbelt ref ===
32:    { id: "monolith-db", run: "node scripts/extract-monolith-databases.mjs --apply", desc: "monolith HTMLs -> mcp-server/data/prism-reference-db/ (1859 stores / 13.9K records, 17 category bundles)", when: "monolith HTML changes" },
60:  { id: "prism-reference-db", manifest: "mcp-server/data/prism-reference-db/MANIFEST.json" },
72:    // prism-reference-db's manifest uses
... [+369 chars truncated]

### Assistant | 2026-06-01T19:27:07.112Z

This nails it. The findings are now complete and consistent:

1. **`db-toolbelt.mjs`** registers `prism-reference-db` only as a manifest-pointer for `database_list`/`database_search` text search (line 60) — it reads the `byCategory` index, not any record-level categorization. The DB is queried as a flat text store, never grouped on a manufacturing axis.

2. **The gold-standard axes (`tool-material-categorization.ts`, `holder-categorization.ts`) ARE wired** — but into `ToolHolderDatabaseEngine.ts`, which is a **different domain** (ToolDB/holders in `src/data` + `jm-die-database`), NOT `PrismReferenceDB`. So a canonical axis exists in the codebase, just not connected to this DB.

3. **No dispatcher (`src/tools`) and no engine `.ts` reads `PrismReferenceDB`** by any categorization. The 7 "consumers" are documentation-only references in galaxy `PATHS.md` memory cards.

I have enough concrete evidence. Let me do one final confirmation of the record-level shape claim for the natural axes (materials → free-text, no ISO key on records) since the background ISO-count check failed to return.

### Assistant | 2026-06-01T19:27:11.342Z

[tool_use: Bash]

### User | 2026-06-01T19:29:20.158Z

[tool_result] materials: 150 stores; stores even MENTIONING any ISO token = 55
store[material] (the one with isoCode): {"name":"Generic Steel","isoCode":"P","Kc11":2000,"mc":0.25,"hardness":200,"thermalConductivity":50,"specificHeat":486,"density":7850}
-> isoCode is a property of a SINGLE example object, not a grouping KEY across 1980 records

### Assistant | 2026-06-01T19:29:42.261Z

Confirmed. Even where an `isoCode` field appears (e.g., `store[material] = {name:"Generic Steel", isoCode:"P", ...}`), it's an incidental property on one example object scraped from the monolith — NOT a canonical grouping axis applied uniformly across the 1,980 material records. The 150 material stores are heterogeneous shapes keyed by free-text names (`steel_1018`, `aluminum_6061`), index numbers, or vendor names. No normalize fn, no zod schema, no uniform key. This is the textbook UNCATEGORIZED signal.

I have complete, concrete evidence. Here is my verdict.

## Audit Summary: PrismReferenceDB

**What it is:** A monolith-extraction dump — `scripts/extract-monolith-databases.mjs` scraped 1,859 raw JS objects/arrays from legacy HTML monoliths + module dumps and bucketed them into 17 coarse bundle files (`materials.json`, `tools.json`, etc.) by a filename/keyword heuristic. 13,920 records total, source `mcp-server/data/prism-reference-db/`.

**Why it's UNCATEGORIZED:**
- The "17 categories" are **bundle-grouping** (which file a store landed in), not a record-level manufacturing axis. The MANIFEST's `byCategory` is `{count, records, bytes}` per bundle — there is no taxonomy const + normalize fn + zod schema anywhere.
- The single largest bucket is `other` — 1,047 stores / 6,236 records (45% of all records) — a literal catch-all.
- Records are keyed by **free-text**: `materials` → `steel_1018`/`aluminum_6061`/`stainless_304`; `controllers` → `haas`/`fanuc`/`okuma`; `coolants` → vendor names (`blaser`/`castrol`) or free-text class (`flood`/`mist`/`tsc`); `holders` → raw taper keys (`CAT40`/`HSK-A63`). Many stores are degenerate (`validMaterials = ["carbide",...]` indexed `0,1,2`).
- Where `isoCode:"P"` appears, it's an incidental field on one scraped example object, not a uniform grouping KEY across the 1,980 material records (only 55/150 material stores even mention any ISO token, inconsistently).

**Wiring:** Not wired into any consumer code. The only `mcp-server/src`
... [+1256 chars truncated]

### Assistant | 2026-06-01T19:30:01.019Z

[tool_use: StructuredOutput]

### User | 2026-06-01T19:30:04.348Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-01T19:30:12.327Z

Audit complete. **PrismReferenceDB → UNCATEGORIZED** (with a clear per-bundle remediation gap).

Key relevant files inspected:
- `H:/prism/data/databases/DB_MANIFEST.json` (lines 566–589 — the domain entry)
- `H:/prism/mcp-server/data/prism-reference-db/` — `MANIFEST.json`, `README.md`, and the 18 flat category bundles (`materials.json`, `controllers.json`, `coolants.json`, `holders.json`, `tools.json`, `other.json`, etc.)
- `H:/prism/mcp-server/src/registries/DatabaseRegistry.ts` (manifest loader)
- `H:/prism/scripts/db-toolbelt.mjs` (lines 32, 60 — registration as flat search pointer only)
- `H:/prism/mcp-server/src/data/tool-material-categorization.ts` + `holder-categorization.ts` (gold-standard axes — exist, but wired to `ToolHolderDatabaseEngine.ts`, a different domain)

Bottom line: the 17 "categories" are coarse bundle buckets from a monolith scrape, not a manufacturing axis applied to records. Records are keyed by free-text/index/vendor names with no taxonomy+normalize+zod, the largest bucket (`other`, 45% of records) is a catch-all, and no `.ts` consumer reads the DB by any categorization — the 7 declared consumers are documentation-only PATHS.md references.

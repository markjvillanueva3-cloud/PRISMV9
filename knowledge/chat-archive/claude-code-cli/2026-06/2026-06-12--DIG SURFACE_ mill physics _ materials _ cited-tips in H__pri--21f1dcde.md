---
type: "chat-session"
source: "claude-code-cli"
session_id: "21f1dcde-899d-46e9-97dd-146fa3f062d2"
title: "DIG SURFACE: mill physics + materials + cited-tips in H:/prism-slot-bravo/mcp-se"
date: "2026-06-12"
first_ts: "2026-06-12T14:01:11.734Z"
last_ts: "2026-06-12T14:07:51.066Z"
cwd: "H:\\prism-slot-bravo"
messages: 84
user_msgs: 37
assistant_msgs: 47
raw_file: "H:/.claude/projects/H--prism-slot-bravo/21f1dcde-899d-46e9-97dd-146fa3f062d2/subagents/workflows/wf_93a61c98-303/agent-ac1e0e866db862a4e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:37"
---

# DIG SURFACE: mill physics + materials + cited-tips in H:/prism-slot-bravo/mcp-se

> **claude-code-cli** | 2026-06-12 | 84 msgs (37 user / 47 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/21f1dcde-899d-46e9-97dd-146fa3f062d2/subagents/workflows/wf_93a61c98-303/agent-ac1e0e866db862a4e.jsonl`

## Transcript

### User | 2026-06-12T14:01:11.734Z

DIG SURFACE: mill physics + materials + cited-tips in H:/prism-slot-bravo/mcp-server/src/data and registries.
READ: H:/prism-slot-bravo/mcp-server/src/data/milling-pdf-cited-tips.ts (the cited milling tips — count them, what operations/topics, sample real tips), H:/prism-slot-bravo/mcp-server/src/registries/materials.ts (material groups, props), H:/prism-slot-bravo/mcp-server/src/physics/constants.ts (which mill constants: KIENZLE_KC/MC, TAYLOR_PARAMS — list the families + ISO groups present, do NOT copy values). Glob H:/prism-slot-bravo/mcp-server/src/data/**/ for jm-die-curriculum or *cited-tips* and *thermal* and *heat*.
Document: what physics/material/cited knowledge exists, and which operator-named topics (heat dissipation/thermal, chip-thinning, surface finish, tool wear, stability/SLD) have real data vs are OPEN. 
RULES (operator directive 2026-06-12 — NEVER ASSUME data contents):
- READ the ACTUAL file contents. A filename/title is NOT evidence of what is inside.
- For large files: size first (wc -l / Grep for the record-structure), Read the schema/header + Grep the record shape + sample 2-4 REAL records. Do NOT dump whole catalogs. Say "sampled N of M" when you sample.
- Report ACTUAL counts (grep -c the record delimiter), ACTUAL field names, and a REAL sample value — cite file:line where useful.
- If a file is empty/stub/placeholder, SAY SO (R12). If a claimed topic is NOT in the data, say it is an OPEN gap.
RETURN this exact markdown structure:
## <SURFACE>
### Files inventoried
For each file: `path` | record-count or size | key fields/schema | one REAL sample (verbatim short)
### Knowledge this ENABLES
Bullet list: concrete wiki-page / tribal-tip / memory topics that could be authored GROUNDED in this data (name the source file each draws from).
### Already covered in the knowledge layer?
Check H:/prism-slot-bravo/knowledge/wiki/mill/*.md + H:/prism-slot-bravo/knowledge/wiki/code-tribal/canonical/*.md + H:/prism-slot-bravo/knowledge/wiki/code-tribal/mill
... [+241 chars truncated]

### Assistant | 2026-06-12T14:01:18.098Z

I'll systematically dig into the mill physics/materials/cited-tips surface. Let me start with parallel reads and globs.

### Assistant | 2026-06-12T14:01:19.954Z

[tool_use: Bash]

### Assistant | 2026-06-12T14:01:20.403Z

[tool_use: Glob]

### Assistant | 2026-06-12T14:01:20.710Z

[tool_use: Glob]

### User | 2026-06-12T14:01:29.851Z

[tool_result] mcp-server\src\data\tribal-tips\jm-die-curriculum\fanuc-cited-tips.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\haas-cited-tips.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\hurco-cited-tips.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\mazak-cited-tips.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\okuma-cited-tips.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\s
... [+317 chars truncated]

### User | 2026-06-12T14:01:30.121Z

[tool_result] No files found

### User | 2026-06-12T14:01:46.564Z

[tool_result] Exit code 1

### Assistant | 2026-06-12T14:01:51.560Z

[tool_use: Bash]

### Assistant | 2026-06-12T14:01:51.851Z

[tool_use: Glob]

### Assistant | 2026-06-12T14:01:52.132Z

[tool_use: Glob]

### User | 2026-06-12T14:03:09.063Z

[tool_result] H:/prism-slot-bravo/mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.ts : 5271 lines
Get-Content : Cannot find path 'H:\prism-slot-bravo\mcp-server\src\registries\materials.ts' because it does not exist.
At line:5 char:10
+   $lc = (Get-Content $_ | Measure-Object -Line).Lines
+          ~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (H:\prism-slot-b...es\materials.ts:Strin
... [+279 chars truncated]

### User | 2026-06-12T14:03:26.388Z

[tool_result] No files found

### User | 2026-06-12T14:03:26.457Z

[tool_result] No files found

### Assistant | 2026-06-12T14:03:28.966Z

[tool_use: Glob]

### Assistant | 2026-06-12T14:03:29.436Z

[tool_use: Glob]

### User | 2026-06-12T14:03:30.106Z

[tool_result] mcp-server\src\registries\AgentRegistry.ts
mcp-server\src\registries\AISubsystemRegistry.ts
mcp-server\src\registries\AlgorithmRegistry.ts
mcp-server\src\registries\CAMSystemRegistry.ts
mcp-server\src\registries\CoatingRegistry.ts
mcp-server\src\registries\CoolantRegistry.ts
mcp-server\src\registries\FormulaRegistry.ts
mcp-server\src\registries\HookRegistry.ts
mcp-server\src\registries\KnowledgeBa
... [+846 chars truncated]

### User | 2026-06-12T14:03:31.636Z

[tool_result] mcp-server\src\data\tribal-tips\jm-die-curriculum\fanuc-cited-tips.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\haas-cited-tips.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\hurco-cited-tips.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\index.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\mazak-cited-tips.ts
mcp-server\src\data\tribal-tips\jm-die-curriculum\okuma-cited-
... [+79 chars truncated]

### Assistant | 2026-06-12T14:03:33.646Z

Now let me read the actual file contents in parallel.

### Assistant | 2026-06-12T14:03:34.687Z

[tool_use: Read]

### Assistant | 2026-06-12T14:03:35.620Z

[tool_use: Read]

### Assistant | 2026-06-12T14:03:36.052Z

[tool_use: Read]

### User | 2026-06-12T14:03:41.242Z

[tool_result] read-once-guard: 'H:\prism-slot-bravo\mcp-server\src\data\tribal-tips\milling-pdf-cited-tips.ts' (same offset/limit) was already read 23m ago in this session and is unchanged (mtime 1781268949299). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the ne
... [+46 chars truncated]

### User | 2026-06-12T14:03:43.961Z

[tool_result] 0	/**
1	 * PRISM MCP Server - Material Registry
2	 * Complete access to 1,047 materials × 127 parameters
3	 * 4-Layer Hierarchy: LEARNED → USER → ENHANCED → CORE
4	 */
5	
6	import * as fs from "fs/promises";
7	import * as path from "path";
8	import { BaseRegistry, type RegistryEntry } from "./base.js";
9	import { PATHS, DATA_LAYERS, ISO_GROUPS, MATERIAL_CATEGORIES, type IsoMaterialGroup } from "..
... [+2638 chars truncated]

### User | 2026-06-12T14:03:44.139Z

[tool_result] 0	/**
1	 * PRISM Canonical Physics Constants
2	 *
3	 * ALL physics calculations MUST import from this file.
4	 * NEVER inline numeric values for Kienzle, Taylor, or material properties.
5	 *
6	 * Sources:
7	 * - Kienzle: Sandvik Coromant General Turning (2024), ISO 3685:1993
8	 * - Taylor: Taylor (1907), Modern: ISO 3685:1993
9	 * - EDM: Klocke "Fertigungsverfahren Band 3", DiBitonto et al. (1989)
... [+2965 chars truncated]

### Assistant | 2026-06-12T14:03:48.535Z

Now let me read the milling tips file properly (it was read in session already — use Grep to extract record structure and sample tips), and continue reading constants.ts and MaterialRegistry.

### Assistant | 2026-06-12T14:03:49.647Z

[tool_use: Grep]

### Assistant | 2026-06-12T14:03:50.912Z

[tool_use: Grep]

### Assistant | 2026-06-12T14:03:51.373Z

[tool_use: Read]

### User | 2026-06-12T14:03:58.936Z

[tool_result] mcp-server\src\data\tribal-tips\milling-pdf-cited-tips.ts:326

Found 326 total occurrences across 1 file.

### User | 2026-06-12T14:04:00.127Z

[tool_result] 40:  operation: string;
70:    operation: "face_milling",
84:    operation: "face_milling",
98:    operation: "pocket_milling",
112:    operation: "slotting",
126:    operation: "slotting",
140:    operation: "adaptive_hsm",
154:    operation: "thread_milling",
168:    operation: "drilling_strategies",
182:    operation: "workholding",
196:    operation: "tool_holders",
210:    operation: "cutter_
... [+1041 chars truncated]

### User | 2026-06-12T14:04:00.513Z

[tool_result] 80	 * are retained alongside the MaterialPhysics-canonical names (k_thermal,
81	 * cp_J_kgK) for the 30+ EDM/ceramics/grinding consumers that still read them.
82	 */
83	export interface MaterialEntry extends MaterialPhysics {
84	  name: string;
85	  iso_group: ISOGroup;
86	  density_kg_m3: number;
87	  /** Legacy alias of k_thermal — thermal conductivity [W/(m*K)]. */
88	  thermal_conductivity_W_m
... [+7694 chars truncated]

### Assistant | 2026-06-12T14:04:03.761Z

Now let me get the full schema of a milling tip record, sample real tips across different operations, count operations, and check the knowledge layer files in parallel.

### Assistant | 2026-06-12T14:04:05.170Z

[tool_use: Read]

### Assistant | 2026-06-12T14:04:06.716Z

[tool_use: Grep]

### Assistant | 2026-06-12T14:04:07.101Z

[tool_use: Glob]

### User | 2026-06-12T14:04:20.202Z

[tool_result] 30	  | "manufacturer_sample"
31	  | "post_processor_doc"
32	  | "industry_reference";
33	
34	export type MillingTipConfidence = "draft" | "corroborated" | "doctrine";
35	
36	export interface CitedMillingTip {
37	  /** Stable ID — referenced by playbook rules and academy lessons. */
38	  id: string;
39	  /** Operation topic this tip applies to (matches milling-pdf-corpus operationTopicIndex keys). 
... [+1658 chars truncated]

### User | 2026-06-12T14:04:20.208Z

[tool_result] knowledge\wiki\mill\mill-advanced-techniques.md
knowledge\wiki\mill\_staging\deep-domain-research-2026-06-09.md
knowledge\wiki\mill\mill-applied-practice.md
knowledge\wiki\mill\mill-foundations.md
knowledge\wiki\mill\mill-resource-atlas.md
knowledge\wiki\mill\mill-source-atlas.md

### User | 2026-06-12T14:04:20.209Z

[tool_result] No matches found

### Assistant | 2026-06-12T14:04:23.350Z

Now let me get the full operation-type breakdown, sample real tips across different topics, check constants.ts for the rest of the mill-relevant physics, and scan the knowledge layer files.

### system

... [4 middle messages omitted -- see raw_file] ...

### User | 2026-06-12T14:04:29.937Z

[tool_result] 200	  /**
201	   * DiBitonto thermal model parameters for crater formation.
202	   * Energy balance: E_spark = k * I^a * t_on^b (empirical fit)
203	   *
204	   * Source: DiBitonto et al. ASME J. Eng. Ind. 111(2), 1989
205	   */
206	  spark_erosion: {
207	    /** Dimensional constant for crater diameter [µm], Dc = C_d * I^0.43 * t_on^0.44 */
208	    C_d: 2.1,
209	    /** Current exponent for crater
... [+5580 chars truncated]

### User | 2026-06-12T14:04:30.087Z

[tool_result] 80	    tags: ["face_milling", "tool_offset", "finish_quality", "centerline"],
81	  },
82	  {
83	    id: "MILL-TIP-FACE-AE-60-75",
84	    operation: "face_milling",
85	    headline: "Face-mill radial engagement ae = 60-75% of cutter diameter for optimal chip thinning.",
86	    sourceId: "PDF-MILL-FACE-SF",
87	    sourceTitle: "Face Mill Speeds and Feeds (45° / 90°)",
88	    vendor: "CNCCookbook",
8
... [+9050 chars truncated]

### Assistant | 2026-06-12T14:04:33.940Z

Now let me sample tips from the later sections (thermal_compensation, chip_thinning, titanium_milling, stability/SLD topics), check constants.ts for mill-specific physics beyond Kienzle/Taylor, and read the knowledge layer files.

### Assistant | 2026-06-12T14:04:35.056Z

[tool_use: Read]

### Assistant | 2026-06-12T14:04:36.090Z

[tool_use: Read]

### Assistant | 2026-06-12T14:04:36.588Z

[tool_use: Read]

### Assistant | 2026-06-12T14:04:37.385Z

[tool_use: Read]

### User | 2026-06-12T14:04:42.713Z

[tool_result] 1375	    status: "draft",
1376	    tags: ["hem", "controller", "code_density", "lookahead", "machine_capability", "online_source"],
1377	  },
1378	  {
1379	    id: "MILL-TIP-HARVEY-CHIP-THINNING-DEF",
1380	    operation: "chip_thinning",
1381	    headline: "Chip thinning: when RDOC < tool D/2, actual chip thickness < programmed IPT — must raise IPT to keep chip in tool design window.",
1382	    bo
... [+3677 chars truncated]

### User | 2026-06-12T14:04:42.714Z

[tool_result] 1855	    status: "draft",
1856	    tags: ["okuma", "osp", "open_architecture", "programming_strategy", "controller", "online_source"],
1857	  },
1858	  {
1859	    id: "MILL-TIP-PATENT-SPINDLE-THERMAL-MODEL",
1860	    operation: "thermal_compensation",
1861	    headline: "Spindle thermal compensation model: 4 temp sensors (front + rear bearings + 2 midline) + bed-frame reference; OPC UA bridges com
... [+3763 chars truncated]

### User | 2026-06-12T14:04:42.728Z

[tool_result] 3085	    citation: "https://www.cnccookbook.com/cnc-coolant-system-mist-high-pressure-through-spindle/",
3086	    materialScope: ["P", "M", "K", "N", "S", "H"],
3087	    status: "draft",
3088	    tags: ["tsc", "through_spindle_coolant", "high_pressure", "1000_psi", "deep_pocketing", "drilling", "chip_evacuation", "online_source"],
3089	  },
3090	  {
3091	    id: "MILL-TIP-TITANIUM-70PCT-RADIAL-ARC
... [+4211 chars truncated]

### User | 2026-06-12T14:04:42.729Z

[tool_result] 350	  // Source: Toenshoff & Hillmann-Apmann, "Diamonds for the EDM Process",
351	  // CIRP Annals 51(1) 2002; Schumacher 2004 review.
352	
353	  toenshoff: {
354	    /** Energy-cascade factor per skim pass, by material key */
355	    gamma: {
356	      steel: 0.30,
357	      tool_steel: 0.28,
358	      hardened_steel: 0.25,
359	      stainless: 0.27,
360	      aluminum: 0.40,
361	      copper: 0.
... [+4931 chars truncated]

### Assistant | 2026-06-12T14:04:46.017Z

Now let me check constants.ts for mill-specific physics (beyond what I've seen), check for SLD/stability constants, and read the knowledge layer wiki files.

### Assistant | 2026-06-12T14:04:47.957Z

[tool_use: Grep]

### Assistant | 2026-06-12T14:04:48.986Z

[tool_use: Read]

### Assistant | 2026-06-12T14:04:49.609Z

[tool_use: Read]

### User | 2026-06-12T14:04:51.927Z

[tool_result] 482:    /** Ra reduction factor per skim pass (Ra_n+1 = Ra_n * rho) — material + transition keys */
518:   * Klocke surface roughness model:
634:  flush_deflection: {
639:    /** Wire deflection coefficient: delta = C * P * L² / T */
640:    deflection_coefficient: 0.012, // mm deflection per bar·mm²/N
657:/** Tool material classification used by deflection / wear / stiffness models. */
662: * can
... [+422 chars truncated]

### User | 2026-06-12T14:04:55.975Z

[tool_result] 0	---
1	title: Mill Galaxy Foundations (Verified Method & Structure Facts)
2	galaxy: mill
3	owner_slot: foxtrot
4	status: VERIFIED-PARTIAL
5	verified_by: "papa-workflow (claude-b5de5424, 2026-06-09)"
6	verification_method: "WebFetch of each cited source URL; only claims the fetched page text actually confirmed were promoted. Numeric cutting constants deliberately NOT promoted (PRISM sources those 
... [+10839 chars truncated]

### User | 2026-06-12T14:04:56.891Z

[tool_result] 0	---
1	title: Mill Galaxy Advanced Techniques (Verified State-of-the-Art Strategy)
2	galaxy: mill
3	owner_slot: foxtrot
4	status: VERIFIED-PARTIAL
5	verified_by: "papa-advanced-techniques (2026-06-10)"
6	verification_method: "Each advanced strategy below was confirmed by WebFetch of the cited free/legal source page (cutting-tool maker Harvey Performance / In The Loupe, machine-tool distributor Go
... [+10764 chars truncated]

### Assistant | 2026-06-12T14:05:01.483Z

Now let me read the remaining wiki files and check constants.ts for mill-specific cutting physics (deflection, Johnson-Cook, stability sections).

### Assistant | 2026-06-12T14:05:02.582Z

[tool_use: Read]

### Assistant | 2026-06-12T14:05:03.499Z

[tool_use: Read]

### Assistant | 2026-06-12T14:05:04.179Z

[tool_use: Glob]

### User | 2026-06-12T14:05:07.560Z

[tool_result] knowledge\wiki\code-tribal\milling\milling-pdf-corpus.md

### User | 2026-06-12T14:05:07.900Z

[tool_result] 650	export const KIENZLE_BY_ISO = CANONICAL_KIENZLE;
651	
652	// ============================================================================
653	// COMPATIBILITY SHIMS - restored exports relied on by 60+ engines
654	// All formulas back onto canonical tables above. No inline physics constants.
655	// ============================================================================
656	
657	/** Tool ma
... [+7409 chars truncated]

### User | 2026-06-12T14:05:08.447Z

[tool_result] 0	---
1	title: Mill Galaxy Applied Practice (Verified Practitioner Knowledge)
2	galaxy: mill
3	owner_slot: foxtrot
4	status: VERIFIED-PARTIAL
5	verified_by: "papa-applied-practice (2026-06-10)"
6	verification_method: "Each practitioner claim below was confirmed by WebFetch of the cited free/legal source page (reputable practitioner sites Harvey Performance In The Loupe + CNCCookbook + Machining Do
... [+9888 chars truncated]

### Assistant | 2026-06-12T14:05:11.681Z

Now let me read the remaining knowledge files to complete the coverage check.

### Assistant | 2026-06-12T14:05:12.645Z

[tool_use: Read]

### Assistant | 2026-06-12T14:05:13.640Z

[tool_use: Read]

### Assistant | 2026-06-12T14:05:13.899Z

[tool_use: Glob]

### User | 2026-06-12T14:05:28.799Z

[tool_result] 0	---
1	title: Milling PDF Corpus — source-attributed reference manifest
2	type: code-tribal
3	domain: milling
4	slot_origin: foxtrot
5	created: 2026-05-26
6	last_verified: 2026-05-26
7	related:
8	  - knowledge/wiki/os/commands/mill-studio.md
9	  - knowledge/memories/feedback/feedback_psn_definition.md
10	  - course-4-milling-operations
11	tags: [milling, tribal, pdf-corpus, source-attribution, fo
... [+4049 chars truncated]

### User | 2026-06-12T14:05:28.800Z

[tool_result] 800	  iso_group: ISOGroup;
801	  kc1_1: number;
802	  mc: number;
803	  taylor_C: number;
804	  taylor_n: number;
805	  /** Base roughing cutting speed [m/min], carbide. */
806	  vc_base_roughing: number;
807	  /** Base finishing cutting speed [m/min], carbide. */
808	  vc_base_finishing: number;
809	  /** Relative machinability factor (1.0 = free-machining P-steel baseline). */
810	  machinabilit
... [+4345 chars truncated]

### User | 2026-06-12T14:05:31.587Z

[tool_result] knowledge\tribal\bobcad-cam-tips-bc-001.md
knowledge\tribal\bobcad-cam-tips-bc-002.md
knowledge\tribal\bobcad-cam-tips-bc-003.md
knowledge\tribal\bobcad-cam-tips-bc-004.md
knowledge\tribal\bobcad-cam-tips-bc-005.md
knowledge\tribal\bobcad-cam-tips-bc-006.md
knowledge\tribal\bobcad-cam-tips-bc-007.md
knowledge\tribal\bobcad-cam-tips-bc-008.md
knowledge\tribal\bobcad-cam-tips-bc-009.md
knowledge\tri
... [+3972 chars truncated]

### Assistant | 2026-06-12T14:05:34.980Z

I have enough data now. Let me check one sample tribal tip and the remaining constants sections, then compile the full report.

### Assistant | 2026-06-12T14:05:35.954Z

[tool_use: Read]

### Assistant | 2026-06-12T14:05:36.890Z

[tool_use: Read]

### Assistant | 2026-06-12T14:05:38.759Z

[tool_use: Grep]

### User | 2026-06-12T14:06:06.419Z

[tool_result] 920	}
921	
922	/** Reference: ISO 3685:1993 Annex C; Kronenberg (1966). */
923	const _EXTENDED_TAYLOR_EXPONENTS: Record<ISOGroup, { a: number; b: number }> = {
924	  P: { a: 0.30, b: 0.20 },
925	  M: { a: 0.35, b: 0.22 },
926	  K: { a: 0.28, b: 0.18 },
927	  N: { a: 0.20, b: 0.15 },
928	  S: { a: 0.40, b: 0.25 },
929	  H: { a: 0.45, b: 0.28 },
930	};
931	
932	export function extendedTaylorExponent
... [+3093 chars truncated]

### User | 2026-06-12T14:06:06.465Z

[tool_result] 103: * per-ISO physics tables (CANONICAL_TURNING_SPEEDS etc.) are in scope; that
684: * The SFC base cutting speeds (CANONICAL_TURNING_SPEEDS / the SFC CUTTING_PARAMS
784: * - vc_base_roughing/_finishing : CANONICAL_TURNING_SPEEDS[iso_group] (m/min,
786: * - machinability_factor  : MACHINABILITY_FACTOR_BY_ISO[iso_group]
787: * - E_GPa                 : WORKPIECE_ELASTIC_MODULUS_GPA[iso_group]
954:
... [+706 chars truncated]

### User | 2026-06-12T14:06:06.496Z

[tool_result] 0	---
1	id: "bc-001"
2	title: "Adaptive Roughing Maintains Constant Tool Engagement"
3	source: "web:bobcad-adaptive-roughing"
4	confidence: 93
5	category: "cam_strategy"
6	tags: ["adaptive-roughing", "trochoidal", "constant-engagement", "tool-life", "mrr"]
7	_source: "bobcad-cam-tips.ts"
8	indexed_at: 2026-04-28T01:00:41.444Z
9	---
10	
11	# Adaptive Roughing Maintains Constant Tool Engagement
12	

... [+1033 chars truncated]

### Assistant | 2026-06-12T14:07:51.066Z

I now have all the data needed. Here is the complete surface report.

---

## Mill Physics + Materials + Cited-Tips Surface

### Files inventoried

`H:/prism-slot-bravo/mcp-server/src/data/tribal-tips/milling-pdf-cited-tips.ts` | 5,271 lines | 326 tip records (`CitedMillingTip[]`) | Schema: `id, operation, headline, body?, sourceId, sourceTitle, vendor, evidenceLevel, confidence, corroboratedBy, citation?, materialScope, status, tags`

Sample (verbatim, line 97-109):
```
id: "MILL-TIP-POCKET-HELICAL-ENTRY-1-3DEG"
headline: "Helical entry into pockets: 1-3° helix angle (shallow = gentler on tool); helix diameter 50-75% of tool diameter."
sourceId: "PDF-MILL-INVENTORCAM-2-5D" / vendor: "SolidCAM" / evidenceLevel: "manufacturer_training"
materialScope: ["P","M","K","N"] / status: "draft"
```

Operation-type distribution (sampled all 326 records via Grep):
- `face_milling` — dominant (~60+ tips)
- `adaptive_hsm` / `high_efficiency_milling` — ~30+ tips combined
- `workholding` — ~25+ tips
- `toolholder_selection` / `tool_holders` / `tool_holding` — ~20+ tips
- `machine_selection` — ~15+ tips
- `high_feed_milling` — ~10 tips
- `cutting_parameters` — ~10 tips
- `plunge_milling` / `shoulder_milling` / `slotting` — ~6-8 each
- `chip_thinning` — 3 tips (lines 1379-1434, sourced from Harvey, Sandvik CTE, Sandvik Modern Art of Milling)
- `thermal_compensation` — 3 tips (lines 1859-1904, sourced from USPTO patent 11,294,353 + Makino V33i machine specs)
- `titanium_milling` / `high_temp_alloy_milling` — 4 tips (lines 3091-3108, 4611-4659)
- `order_of_operations` — 12 tips (lines 3459-3555, 5155-5236)
- `thread_milling` — 7 tips
- `probing` — 7 tips
- `drilling` / `drilling_strategies` — 9+ tips
- `five_axis` / `five_axis_milling` / `five_axis_toolholding` — 5 tips
- `ball_end_milling` — 5 tips
- `mold_die_finishing` — 2 tips
- `vibration_damping` / `high_speed_machining` — 1-2 tips each
- `climb_vs_conventional` — 2 tips (line 3107, validated status)
- `coolant_strategy` / `coola
... [+12526 chars truncated]

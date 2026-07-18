---
type: "chat-session"
source: "claude-code-cli"
session_id: "e9b75754-b179-40b0-b0fb-7007d65b2056"
title: "You are scouting whether JM CNC PROGRAMS (G-code) can be parsed for DIMENSIONS, "
date: "2026-06-02"
first_ts: "2026-06-02T03:23:54.753Z"
last_ts: "2026-06-02T03:35:11.398Z"
cwd: "H:\\prism-slot-xray"
messages: 60
user_msgs: 23
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/workflows/wf_245d9612-f79/agent-aed944e32fb1e5c7a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# You are scouting whether JM CNC PROGRAMS (G-code) can be parsed for DIMENSIONS, 

> **claude-code-cli** | 2026-06-02 | 60 msgs (23 user / 37 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/workflows/wf_245d9612-f79/agent-aed944e32fb1e5c7a.jsonl`

## Transcript

### User | 2026-06-02T03:23:54.753Z

You are scouting whether JM CNC PROGRAMS (G-code) can be parsed for DIMENSIONS, to build OCR training ground-truth. Context: the OCR pipeline reads dimensioned prints; CNC programs encode EXACT machined dimensions deterministically (no OCR needed). TASKS (use Read/Grep/Glob/Bash, read excerpts not whole files): 1. Locate JM CNC program files. Start from the curated trainset H:/prism/state/shared/blueprint-trainset-clean.jsonl (each row has a program_files[] array; 3,941 rows have programs). Also search the corpus: H:/PRISM/JM DIE/** and any post-processor NC corpus (Grep for .nc/.eia/.min/.mpf/.pgm/.h/.ptp extensions). Report WHERE programs actually live + how many resolve on disk. 2. Sample 5-8 REAL program files spanning different machines/dialects (Fanuc/Haas/Okuma/Hurco/Mazak/Heidenhain). Quote short excerpts. 3. Determine EXACTLY which dimensions are extractable from G-code and how: overall XYZ extents (min/max of coordinates), drill depths (G81/82/83 Z + R), bore/pocket diameters (G2/G3 arc radii, tool-comp), tool diameters (T-codes + tool table / comments), hole positions. Note units (G20 inch / G21 mm — JM is INCH). 4. R8: search the repo (scripts/ + mcp-server/src/engines/**) for any EXISTING G-code parser / NC dimension extractor (Grep 'gcode|g-code|G81|parseNC|nc-parse|toolpath.*extent'). Report what exists + its API. Return a TEXT report: program corpus location + on-disk resolvability, dialects sampled, a concrete G-code->dimension extraction spec (which dims, which codes, units handling), and any reusable existing parser. Be concrete with paths + line excerpts. Flag what is NOT extractable from G-code.

### Assistant | 2026-06-02T03:24:12.458Z

I'll scout whether JM CNC programs can be parsed for dimensions to build OCR training ground-truth. Let me start by examining the trainset and locating program files.

### Assistant | 2026-06-02T03:24:14.407Z

[tool_use: Bash]

### Assistant | 2026-06-02T03:24:14.863Z

[tool_use: Bash]

### User | 2026-06-02T03:24:44.996Z

[tool_result] BASEBALL PARTS/
CNC LATHE/
CNC MILL HAAS/
CNC OKUMA MULTUS/
CONTROLLERS/
FUSION CAD AND CAM FILES/
GENERAL BANDAGES/
HAAS-HURCO/
HURCO CNC PROGRAMS/
JM DIE COMPANY/
LATHE/
MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION/
MACRO PROGRAMS/
MATTHEW programs/
OKUMA/
POST PROCESSORS/
PRISM CAD TESTING/
PRISM MODIFIED POST PROCESSORS/
Prism JM Die/
QUEUE/
REVERSE ENGINEERING/
ROKU-ROKU/
SETUPS/
TRIBAL 
... [+295 chars truncated]

### User | 2026-06-02T03:24:45.308Z

[tool_result] {"part_number":"1005","part_number_normalized":"1005","confidence":"loose","label_source":"cad+program","subsets":{"roundtrip_b":true,"print_program":true,"triple":true},"print_docs":[{"doc_id":"fdc32afc-a210-4444-8003-6f24f4ec3931","filename":"Scanned Document - 10/30/2020 11:38 AM.pdf","drawing_score":0.75},{"doc_id":"bf323b6a-0d53-43ea-9c52-39a857345095","filename":"Scanned Document - 10/30/202
... [+3620 chars truncated]

### Assistant | 2026-06-02T03:24:47.335Z

Let me examine the trainset structure for program_files and explore the program directories.

### Assistant | 2026-06-02T03:24:51.682Z

[tool_use: Bash]

### User | 2026-06-02T03:25:22.627Z

[tool_result] total rows: 3941
rows with program array: 3941 total program refs: 11512
all keys seen: part_number, part_number_normalized, confidence, label_source, subsets, print_docs, program_files, cad_files, n_print_docs, n_program_files, n_cad_files, drawing_score
EXAMPLES:
[
 {
  "pn": "1005",
  "pf": [
   {
    "source_path": "H:\\PRISM\\JM DIE\\CNC LATHE\\FORGO\\1005 HAMMERHOB.MIN",
    "filename": "100
... [+2364 chars truncated]

### Assistant | 2026-06-02T03:25:25.447Z

The trainset has 3,941 rows, all with program_files (11,512 total refs). Let me check on-disk resolvability and the extension distribution, plus survey the corpus.

### Assistant | 2026-06-02T03:25:31.625Z

[tool_use: Bash]

### User | 2026-06-02T03:25:59.548Z

[tool_result] === EXT (all refs) ===
{".min":6821,".mcx":290,".mcx-8":2827,".ipt":1321,".iam":135,".stl":17,".hnc":13,".nc":11,".stp":20,".x_t":4,".dwg":4,".x_b":24,".idw":10,".step":6,".dxf":7,".sldprt":2}
=== KIND3 ===
{"nc_program":6845,"cam_project":4575,"geometry_model":71,"drawing_2d":21}
=== MACHINE ===
{"lathe":8564,"wire_edm":813,"mill":2127,"unknown":7,"mill_turn":1}
=== RESOLVABILITY ===
total refs: 
... [+251 chars truncated]

### Assistant | 2026-06-02T03:26:03.593Z

Excellent — 100% resolve on disk (11,512 refs). Key finding: 6,845 are actual NC programs (`.min`=6821 Okuma lathe, `.nc`=11, `.hnc`=13 Hurco), the rest are CAM projects (.mcx/.mcx-8) or CAD models (.ipt/.iam/.stp). Let me look at the broader NC corpus and the post-processor corpus, plus sample real program files.

### Assistant | 2026-06-02T03:26:05.440Z

[tool_use: Bash]

### Assistant | 2026-06-02T03:26:08.148Z

[tool_use: Bash]

### User | 2026-06-02T03:29:01.341Z

[tool_result] === NC-extension counts under JM DIE ===
nc: 119255
eia: 0
min: 34990
mpf: 0
pgm: 0
h: 0
ptp: 0
hnc: 110
anc: 0
tap: 0
cnc: 98

### User | 2026-06-02T03:29:10.464Z

[tool_result] === mill HAAS dir ===
AIR INDUSTRIES COMPANY/
AJ MANUFACTURING/
ALCOA FASTENING/
ALL STAR/
ALLFAST/
ANDERSON/
ATF/
ATF TAP/
Agrati-Medina/
BELVIDERE OPERATIONS/
BIRMINGHAM/
CHOCTAW DEFENSE/
CLENDENIN BROTHERS/
CONTINENTAL MIDLAN TAPTITES/
CSM/
FASTRON/
FONTANA/
FORGO/
Fiocchi/
GRANDEUR/
=== HURCO CNC PROGRAMS ===
0520396 OP2.hnc  760.7K
0520396.hnc  12.3K
0833-12-001 op2.hnc  30.1K
0833-12-001.hnc
... [+846 chars truncated]

### Assistant | 2026-06-02T03:29:14.198Z

Massive corpus: 119,255 `.nc` files + 34,990 `.min` files under JM DIE. The trainset's program_files are a curated subset (the ones linked to a part_number with a print). Let me sample real program files spanning dialects. Let me grab excerpts from .min (Okuma), .hnc (Hurco), .nc, and search the post-processor NC corpus.

### Assistant | 2026-06-02T03:29:16.678Z

[tool_use: Bash]

### Assistant | 2026-06-02T03:29:17.217Z

[tool_use: Bash]

### User | 2026-06-02T03:29:44.539Z

[tool_result] ########## HURCO .HNC ##########
%
O1001
(Using G0 which travels along dogleg path.)
(T14 D=0.741 CR=0.015 - ZMIN=2.75 - face mill)
(T16 D=0.25 CR=0. TAPER=45deg - ZMIN=3.7 - chamfer mill)
(T20 D=2. CR=0.142 - ZMIN=3.77 - bullnose end mill)
(T21 D=2. CR=0.015 - ZMIN=2.15 - face mill)
(SAFE START BLOCK)
G40 (CANCEL CUTTER COMP)
G80 (CANCEL CANNED CYCLES)
G90 G17
M59
(===================
... [+1287 chars truncated]

### User | 2026-06-02T03:29:44.991Z

[tool_result] ########## OKUMA .MIN (lathe) ##########
$HOB.MIN%
M1
NBAR
CLEAR
DEF WORK
PS LC,[-400,0],[400,19]
END
DRAW
/CALL OBAR
M1
NAT01                 (T00L HOLDER WITH .015R)
T010101
G0 X20 Z20
G50 S1200
G96 S300 M3 M8
G0 X.85 Z.005
G1 X-.04 F.006
G0 Z.06 X.77
G85 NR01 D.040 U.005 W.005 F.006
NR01 G81
G0 Z.03 X.415
G1 Z.0 G42 F.002
G1 Z-.098 A135
G1 X.7
G1 Z-.12
G1 X.72
G1 X.755
... [+792 chars truncated]

### Assistant | 2026-06-02T03:29:48.986Z

Very rich data. The Hurco .hnc has explicit tool comments with diameters and Z-extents already in the header. Let me sample a Haas/Fanuc mill .nc, a Heidenhain .h if present elsewhere, and check the post-processor NC corpus for dialect variety. Let me also find Haas mill programs and Fanuc-style .nc.

### Assistant | 2026-06-02T03:29:53.074Z

[tool_use: Bash]

### User | 2026-06-02T03:30:16.973Z

[tool_result] === find some .nc under MILL HAAS ===
H:/PRISM/JM DIE/CNC MILL HAAS/ALL STAR/ALL STAR .NC
H:/PRISM/JM DIE/CNC MILL HAAS/ALL STAR/ALL STAR.NC
H:/PRISM/JM DIE/CNC MILL HAAS/FONTANA/GRIP BLOCKS/B-0506 JOBS/B-0506-2/B-0506-2.NC
H:/PRISM/JM DIE/CNC MILL HAAS/FONTANA/GRIP BLOCKS/B-0506 JOBS/B-0506-6  1.15625/B-0506-6.NC
H:/PRISM/JM DIE/CNC MILL HAAS/FONTANA/GRIP BLOCKS/B-0506 JOBS/B-0506-6.NC
=== find .
... [+358 chars truncated]

### Assistant | 2026-06-02T03:30:20.366Z

[tool_use: Bash]

### Assistant | 2026-06-02T03:30:23.366Z

[tool_use: Bash]

### User | 2026-06-02T03:30:29.798Z

[tool_result] ########## HAAS .NC (mill, Fanuc-style) ##########
%
O1
(ALL STAR)
(DATE=DD-MM-YY - 16-07-20 TIME=HH:MM - 10:42)
(MCX FILE - C:\USERS\CNC MILL HAAS\BOX SYNC\CNC MILL HAAS\ALL STAR\ALL STAR .25)
(NC FILE - C:\USERS\CNC MILL HAAS\BOX SYNC\CNC MILL HAAS\ALL STAR\ALL STAR.NC)
(MATERIAL - STEEL INCH - S2 - 200 BHN)
(T1|.25 SPOT|H1|D1|TOOL DIA. - .25)
(T2|3/16|H2|D2|TOOL DIA. - .1875)
(T17|STAN
... [+835 chars truncated]

### User | 2026-06-02T03:30:45.020Z

[tool_result] ########## B-0506-2.NC (Haas grip block, likely drilled) ##########
%
O0
(B-0506-2)
(DATE=DD-MM-YY - 30-01-21 TIME=HH:MM - 09:11)
(MCX FILE - C:\USERS\CNC MILL HAAS\BOX SYNC\CNC MILL HAAS\FONTANA\GRIP BLOCKS\B)
(NC FILE - C:\USERS\CNC MILL HAAS\BOX SYNC\CNC MILL HAAS\FONTANA\GRIP BLOCKS\B-)
(MATERIAL - ALUMINUM INCH - 2024)
(T15|3'' FACE MILL / SHELL MILL|H15|D15|TOOL DIA. - 2.5)
(T14|.995
... [+1021 chars truncated]

### Assistant | 2026-06-02T03:30:49.310Z

This confirms the Mastercam/Haas posts carry explicit tool-table comments (diameter, tool type, ZMIN) plus `G20` units, canned drill cycles (G81/G83 with Z + R + Q peck), and full coordinate streams. All 26 sampled = G20 (inch), confirming JM=inch. Now let me do R8 — search the repo for any existing G-code/NC parser, and check the post-processor corpus for additional dialects.

### Assistant | 2026-06-02T03:30:51.650Z

[tool_use: Grep]

### Assistant | 2026-06-02T03:30:53.558Z

[tool_use: Grep]

### User | 2026-06-02T03:31:02.045Z

[tool_result] Found 60 files limit: 60
H:\prism\mcp-server\src\tools\dispatchers\millDispatcher.ts
H:\prism\mcp-server\src\tools\dispatchers\camDispatcher.ts
H:\prism\scripts\post-nc-conformance.test.mjs
H:\prism\scripts\post-nc-conformance.mjs
H:\prism\scripts\post-closed-loop-correct.test.mjs
H:\prism\scripts\post-closed-loop-correct.mjs
H:\prism\scripts\post-closed-loop-tick.test.mjs
H:\prism\scripts\post-cl
... [+3723 chars truncated]

### User | 2026-06-02T03:31:02.319Z

[tool_result] Found 60 files limit: 60
H:\prism\mcp-server\src\engines\HaasNGCMillMasterPostEngine.ts
H:\prism\mcp-server\src\engines\MillingPrintToProgramEngine.ts
H:\prism\mcp-server\src\engines\CurriculumEngine.ts
H:\prism\mcp-server\src\engines\MillTurnCAMEngine.ts
H:\prism\mcp-server\src\engines\MasterPostProcessorUnifiedAGIEngine.ts
H:\prism\mcp-server\src\engines\PostProcessorGeneratorEngine.ts
H:\prism\
... [+3421 chars truncated]

### Assistant | 2026-06-02T03:31:05.903Z

Strong candidates exist. `UnifiedProgramParserEngine.ts`, `GCodeReverseCADEngine.ts`, `HurcoParserEngine.ts`, `wedm-standalone-nc-parse.mjs`, and `NCPatternMinerEngine.ts` are the most relevant. Let me inspect their public APIs to see what dimension extraction is already available.

### Assistant | 2026-06-02T03:31:08.286Z

[tool_use: Bash]

### Assistant | 2026-06-02T03:31:10.082Z

[tool_use: Bash]

### User | 2026-06-02T03:31:14.903Z

[tool_result] ########## UnifiedProgramParserEngine — exports + signatures ##########
44:export interface ExtractedField<T> {
54:export type OperationType =
64:export type CoolantMode = "flood" | "mist" | "thru_spindle" | "off" | "unknown";
66:export interface ParsedOperation {
85:export type ToolType =
91:export interface ParsedToolCall {
106:export type ProgramFormat =
117:export interface ParsedProgram {
147
... [+231 chars truncated]

### User | 2026-06-02T03:31:17.448Z

[tool_result] ########## GCodeReverseCADEngine — exports + dim extraction ##########
16: * mesh booleans, we accumulate "feature buckets" (pocket / hole / face /
28:export interface ToolEnvelope {
30:  type: "endmill" | "ballmill" | "facemill" | "chamfermill" | "bullnose" | "drill" | "tap" | "bore" | "thread" | "form";
31:  diameter_mm: number;
38:export interface StockBlock {
39:  /** Stock geometry as an axis
... [+2135 chars truncated]

### Assistant | 2026-06-02T03:31:21.544Z

This is exactly what's needed. `GCodeReverseCADEngine` already does G-code→dimension extraction: stock bounding box, holes (G81/G83 + Z depth + diameter from tool), bored/tapped holes, pockets, faces, chamfers. And `UnifiedProgramParserEngine` parses multiple dialects into `ParsedProgram` with tools/operations. Let me confirm the ParsedProgram fields, the dialect coverage, units handling, and the GCodeReverseCAD entry point signature.

### Assistant | 2026-06-02T03:31:22.121Z

[tool_use: Read]

### User | 2026-06-02T03:31:47.861Z

[tool_result] 106	export type ProgramFormat =
107	  | "okuma_osp"
108	  | "haas_ngc"
109	  | "hurco_winmax"
110	  | "fanuc"
111	  | "generic_iso"
112	  | "hypermill_archive"
113	  | "esprit_wedm"
114	  | "post_processor_cycle"
115	  | "unknown";
116	
117	export interface ParsedProgram {
118	  source_file: string;
119	  format: ExtractedField<ProgramFormat>;
120	  part_number: ExtractedField<string> | null;
121	
... [+6217 chars truncated]

### Assistant | 2026-06-02T03:31:52.055Z

Now let me check whether `UnifiedProgramParserEngine` extracts coordinate extents (it appears focused on tools/ops, NOT XYZ bounds) and confirm the `GCodeReverseCADEngine` entry point + units handling. The ParsedProgram interface above has NO bounding-box/extent field — that's the gap. Let me verify the GCodeReverseCAD entry and units.

### Assistant | 2026-06-02T03:31:55.424Z

[tool_use: Bash]

### User | 2026-06-02T03:32:11.129Z

[tool_result] === GCodeReverseCAD: entry method + units + stock bbox ===
38:export interface StockBlock {
63:  stock: StockBlock;
103:    stock: StockBlock,

=== StockBlock + ReverseCADResult interfaces ===
export interface StockBlock {
  /** Stock geometry as an axis-aligned bounding box (V1 simplification). */
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export in
... [+1761 chars truncated]

### Assistant | 2026-06-02T03:32:15.100Z

Important finding: `GCodeReverseCADEngine.reverseEngineer()` takes a `ParsedProgram` AND a pre-supplied `StockBlock` (line 103) — it does NOT compute the stock bounding box itself from coordinates; the caller must provide stock. And it works in **mm** internally. Let me confirm the reverseEngineer signature and check the standalone wedm NC parser + whether anything computes XYZ min/max extents from raw coordinates.

### Assistant | 2026-06-02T03:32:16.118Z

[tool_use: Read]

### User | 2026-06-02T03:32:34.468Z

[tool_result] 95	   *
96	   * R12 fail-loud: unknown tool numbers throw, negative stock dimensions
97	   * throw, NaN positions throw. Caller-supplied bad data must not silently
98	   * produce wrong CAD that misleads operator audits.
99	   */
100	  reconstruct(
101	    blocks: ParsedBlock[],
102	    tools: Map<number, ToolEnvelope>,
103	    stock: StockBlock,
104	  ): ReverseCADResult {
105	    if (!Array.isAr
... [+1619 chars truncated]

### Assistant | 2026-06-02T03:32:41.930Z

Now let me check the wedm standalone NC parser (it's a standalone .mjs, possibly the most directly reusable) and look at the ParsedBlock structure that feeds reconstruct — to understand the coordinate-walking path that already computes per-op min/max XYZ.

### Assistant | 2026-06-02T03:32:44.217Z

[tool_use: Bash]

### User | 2026-06-02T03:33:06.030Z

[tool_result] === ParsedBlock + coordinate walk in GCodeReverseCAD ===
26:import type { ParsedBlock } from "./GCodeRuntimePredictorEngine.js";
33:  corner_radius_mm?: number;
38:export interface StockBlock {
101:    blocks: ParsedBlock[],
108:      x: stock.max.x - stock.min.x,
109:      y: stock.max.y - stock.min.y,
110:      z: stock.max.z - stock.min.z,
112:    if (stockSize.x <= 0 || stockSize.y <= 0 || sto
... [+2844 chars truncated]

### Assistant | 2026-06-02T03:33:09.524Z

I have all the pieces. The `GCodeRuntimePredictorEngine.ParsedBlock` is the per-block coordinate model (x/y/z/G-code) — that's the raw coordinate extractor. Let me confirm ParsedBlock's fields and how it parses raw lines, since that's the foundational coordinate parser for computing global XYZ extents.

### Assistant | 2026-06-02T03:33:16.492Z

[tool_use: Bash]

### User | 2026-06-02T03:33:26.981Z

[tool_result] === ParsedBlock interface + line parser in GCodeRuntimePredictorEngine ===
44:export const MACHINE_LIBRARY: Record<string, MachineKinematics> = {
87:export interface ParsedBlock {
89:  n?: number;
93:  x?: number;
94:  y?: number;
95:  z?: number;
97:  i?: number;
98:  j?: number;
99:  k?: number;
101:  r?: number;
103:  f?: number;
205:export class GCodeRuntimePredictorEngine {
383:export const g
... [+63 chars truncated]

### Assistant | 2026-06-02T03:33:29.734Z

[tool_use: Read]

### User | 2026-06-02T03:33:34.998Z

[tool_result] 87	export interface ParsedBlock {
88	  /** Block number (Nxxx) if present */
89	  n?: number;
90	  /** Motion mode: G0/G1/G2/G3/G81/G83/G84 etc. — null = modal carry from prior block */
91	  motion?: "G0" | "G1" | "G2" | "G3" | "G81" | "G82" | "G83" | "G84" | "G85" | null;
92	  /** Target X position (mm, absolute) */
93	  x?: number;
94	  y?: number;
95	  z?: number;
96	  /** Arc center offsets fo
... [+1808 chars truncated]

### Assistant | 2026-06-02T03:33:40.356Z

I have everything needed for a complete report. The `ParsedBlock` model carries x/y/z/i/j/k/r/q/motion per block — the foundation for computing global XYZ extents and arc radii. Note `ParsedBlock.x/y/z` is documented as "mm" but the parser must apply unit detection (G20/G21) upstream. Let me do one final check: how the line parser populates ParsedBlock (does it handle units), and confirm whether the trainset programs are mostly Okuma lathe (which uses different canned-cycle syntax than the Fanuc G81/83 the reverse-CAD engine expects).

### Assistant | 2026-06-02T03:33:47.233Z

[tool_use: Bash]

### User | 2026-06-02T03:33:53.613Z

[tool_result] === how ParsedBlock is built — find the line tokenizer (who sets x/y/z) ===

=== Does UnifiedProgramParser detect units? ===
1579:      if (val > 0 && val < 1) { // Nose radius should be < 1 inch

=== Okuma .MIN canned-cycle vocab present in corpus (G81 NR, G85, G87, bar-feed) ===
H:/PRISM/JM DIE/CNC LATHE/CAMCAR/1534-4.MIN
  -> Okuma lathe uses G85/G87 LAP cycles + NBAR (NOT Fanuc G81/83)

### Assistant | 2026-06-02T03:35:11.398Z

Critical findings confirmed. Neither `GCodeRuntimePredictorEngine` nor `UnifiedProgramParserEngine` does G20/G21 unit detection or inch→mm conversion — that's a gap. And the dominant corpus dialect (Okuma .MIN lathe, 6,821 files) uses G85/G87 LAP turning cycles + NBAR bar-feed, NOT the Fanuc G81/G83 canned drill cycles that `GCodeReverseCADEngine` keys on. I have a complete picture. Here is the report.

---

# SCOUT REPORT: Parsing JM CNC programs for ground-truth dimensions

## 1. Program corpus location + on-disk resolvability

**Curated trainset** (`H:/prism/state/shared/blueprint-trainset-clean.jsonl`): 3,941 rows, every row carries `program_files[]`. **11,512 total program refs, 100% resolve on disk** (verified `fs.existsSync` on every `source_path`). This is the print-linked subset — each program is tied to a `part_number` that also has a scanned print, which is exactly the print↔dimension pairing OCR ground-truth needs.

Trainset `program_files[]` row schema (per ref): `source_path` (absolute Windows path), `filename`, `customer`, `machineCategory` (lathe/mill/wire_edm/mill_turn), `ext`, `kind3` (nc_program / cam_project / geometry_model / drawing_2d), `relation`, `via`.

**Extension / kind breakdown of the 11,512 refs:**
| kind3 | count | extensions |
|---|---|---|
| `nc_program` (parseable G-code) | **6,845** | `.min` 6,821 · `.hnc` 13 · `.nc` 11 |
| `cam_project` (binary, NOT G-code) | 4,575 | `.mcx-8` 2,827 · `.mcx` 290 + Inventor `.ipt` 1,321 / `.iam` 135 (these are CAD-CAM source, not text NC) |
| `geometry_model` | 71 | `.stp/.step/.x_t/.x_b/.stl/.sldprt` |
| `drawing_2d` | 21 | `.dwg/.dxf/.idw` |

Machine split of refs: lathe 8,564 · mill 2,127 · wire_edm 813.

**Full raw corpus** (much larger than the trainset, under `H:/PRISM/JM DIE/**`):
- **`.nc` files: 119,255** (Fanuc/Haas Mastercam-posted mill)
- **`.min` files: 34,990** (Okuma OSP lathe + some Okuma-mill)
- **`.hnc` files: 110** (Hurco WinMax, `H:/PRISM/JM DIE/HURCO CNC PROGRAMS/`)
- `.cnc`: 9
... [+10098 chars truncated]

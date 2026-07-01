---
type: "chat-session"
source: "claude-code-cli"
session_id: "21f1dcde-899d-46e9-97dd-146fa3f062d2"
title: "DIG SURFACE: the EXISTING mill knowledge layer — map what is ALREADY documented "
date: "2026-06-12"
first_ts: "2026-06-12T14:01:11.733Z"
last_ts: "2026-06-12T14:08:43.587Z"
cwd: "H:\\prism-slot-bravo"
messages: 69
user_msgs: 30
assistant_msgs: 39
raw_file: "H:/.claude/projects/H--prism-slot-bravo/21f1dcde-899d-46e9-97dd-146fa3f062d2/subagents/workflows/wf_93a61c98-303/agent-ab5c51c716c1278b3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:37"
---

# DIG SURFACE: the EXISTING mill knowledge layer — map what is ALREADY documented 

> **claude-code-cli** | 2026-06-12 | 69 msgs (30 user / 39 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/21f1dcde-899d-46e9-97dd-146fa3f062d2/subagents/workflows/wf_93a61c98-303/agent-ab5c51c716c1278b3.jsonl`

## Transcript

### User | 2026-06-12T14:01:11.733Z

DIG SURFACE: the EXISTING mill knowledge layer — map what is ALREADY documented so the expansion does NOT duplicate (R8 dedup).
READ FULLY: H:/prism-slot-bravo/knowledge/wiki/mill/mill-foundations.md, mill-applied-practice.md, mill-advanced-techniques.md, mill-source-atlas.md, mill-resource-atlas.md, _staging/deep-domain-research-2026-06-09.md.
READ: H:/prism-slot-bravo/knowledge/wiki/code-tribal/canonical/operation-ordering-sequencing-roughing-finishing-datums.md, tooling-selection-geometry-coating-stickout.md, coolant-chip-evacuation-strategy-flood-mql-tap-air-recutting.md, part-setup-probing-edge-find-wcs-tool-offsets.md, H:/prism-slot-bravo/knowledge/wiki/code-tribal/machining-tactics-climb-vs-conventional-milling.md, tooling-endmill-flute-helix-corner.md, H:/prism-slot-bravo/knowledge/wiki/code-tribal/milling/milling-pdf-corpus.md.
Sample 10 of H:/prism-slot-bravo/knowledge/tribal/hypermill-*.md.
Document: a TABLE of mill topics × already-covered(cite md)/PARTIAL/MISSING. Be precise — the operator says coverage was OVER-claimed; find what genuinely is + isn't there. 
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
Bullet list: concrete wiki-page / tribal-tip / memory topics that could be authored GROUNDED in this d
... [+497 chars truncated]

### Assistant | 2026-06-12T14:01:16.884Z

I'll systematically read all the specified files to map the existing mill knowledge layer accurately.

### Assistant | 2026-06-12T14:01:18.873Z

[tool_use: Bash]

### Assistant | 2026-06-12T14:01:19.841Z

[tool_use: Bash]

### User | 2026-06-12T14:01:54.778Z

[tool_result]   159 H:/prism-slot-bravo/knowledge/wiki/mill/mill-foundations.md
  136 H:/prism-slot-bravo/knowledge/wiki/mill/mill-applied-practice.md
  126 H:/prism-slot-bravo/knowledge/wiki/mill/mill-advanced-techniques.md
   72 H:/prism-slot-bravo/knowledge/wiki/mill/mill-source-atlas.md
  133 H:/prism-slot-bravo/knowledge/wiki/mill/mill-resource-atlas.md
  626 total
---
_staging/
mill-advanced-techniques.md
... [+89 chars truncated]

### User | 2026-06-12T14:01:56.632Z

[tool_result] 101 H:/prism-slot-bravo/knowledge/wiki/mill/_staging/deep-domain-research-2026-06-09.md
---
deep-domain-research-2026-06-09.md

### Assistant | 2026-06-12T14:01:59.484Z

Reading all the mill wiki files in parallel since they're small enough:

### Assistant | 2026-06-12T14:02:00.013Z

[tool_use: Read]

### Assistant | 2026-06-12T14:02:00.017Z

[tool_use: Read]

### Assistant | 2026-06-12T14:02:00.386Z

[tool_use: Read]

### User | 2026-06-12T14:02:07.777Z

[tool_result] read-once-guard: 'H:\prism-slot-bravo\knowledge\wiki\mill\mill-foundations.md' was already read 22m ago in this session and is unchanged (mtime 1781268948157). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_
... [+8 chars truncated]

### User | 2026-06-12T14:02:07.850Z

[tool_result] read-once-guard: 'H:\prism-slot-bravo\knowledge\wiki\mill\mill-applied-practice.md' was already read 22m ago in this session and is unchanged (mtime 1781268948157). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_
... [+13 chars truncated]

### User | 2026-06-12T14:02:07.926Z

[tool_result] read-once-guard: 'H:\prism-slot-bravo\knowledge\wiki\mill\mill-advanced-techniques.md' was already read 22m ago in this session and is unchanged (mtime 1781268948153). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRI
... [+16 chars truncated]

### Assistant | 2026-06-12T14:02:10.459Z

[tool_use: Read]

### Assistant | 2026-06-12T14:02:10.463Z

[tool_use: Read]

### Assistant | 2026-06-12T14:02:10.997Z

[tool_use: Read]

### User | 2026-06-12T14:02:16.766Z

[tool_result] read-once-guard: 'H:\prism-slot-bravo\knowledge\wiki\mill\mill-source-atlas.md' was already read 22m ago in this session and is unchanged (mtime 1781268948158). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ
... [+9 chars truncated]

### User | 2026-06-12T14:02:16.768Z

[tool_result] read-once-guard: 'H:\prism-slot-bravo\knowledge\wiki\mill\mill-resource-atlas.md' was already read 22m ago in this session and is unchanged (mtime 1781268948157). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### User | 2026-06-12T14:02:20.260Z

[tool_result] 1	---
2	status: VERIFIED-PARTIAL
3	owner_slot: foxtrot
4	staged_by: papa-deepdomain-research
5	promoted_by: papa-workflow (claude-b5de5424, 2026-06-09)
6	date: 2026-06-09
7	galaxy: mill
8	domain: milling — Kienzle force, chip thinning, HSM/trochoidal, chatter stability, tool deflection
9	---
10	
11	<!-- VERIFIED-PARTIAL (papa-workflow 2026-06-09): institutional/method facts promoted to knowledge/w
... [+18974 chars truncated]

### Assistant | 2026-06-12T14:02:23.943Z

Now reading the code-tribal canonical files and milling-specific files in parallel:

### Assistant | 2026-06-12T14:02:24.871Z

[tool_use: Read]

### Assistant | 2026-06-12T14:02:25.807Z

[tool_use: Read]

### Assistant | 2026-06-12T14:02:27.133Z

[tool_use: Read]

### Assistant | 2026-06-12T14:02:27.689Z

[tool_use: Read]

### User | 2026-06-12T14:02:38.834Z

[tool_result] 1	---
2	schema: ideablock-v1
3	title: "Operation ordering / sequencing — rough-before-finish, datum-driven setups, stress relief, heat-treat insertion"
4	domain: "Machining"
5	category: "operation-ordering"
6	version_state: Current
7	confidence: 0.95
8	cluster_size: 1
9	sources:
10	  - hand-authored:claude-df944902:2026-05-18
11	extracted_via: hand-authored-canonical
12	extracted_at: 2026-05-18T23
... [+10772 chars truncated]

### User | 2026-06-12T14:02:39.221Z

[tool_result] 1	---
2	schema: ideablock-v1
3	title: "Tooling selection — geometry, coating, substrate, stickout, by-material defaults"
4	domain: "Machining"
5	category: "tooling-selection"
6	version_state: Current
7	confidence: 0.95
8	cluster_size: 1
9	sources:
10	  - hand-authored:claude-9033b60c:2026-05-18
11	extracted_via: hand-authored-canonical
12	extracted_at: 2026-05-18T20:05:00Z
13	tags: [endmill, flute
... [+14665 chars truncated]

### User | 2026-06-12T14:02:42.821Z

[tool_result] 1	---
2	schema: ideablock-v1
3	title: "Coolant & chip-evacuation strategy — flood vs MQL vs TSC vs air, recutting, pecking, by-material"
4	domain: "Machining"
5	category: "machining-tactics"
6	version_state: Current
7	confidence: 0.95
8	cluster_size: 1
9	sources:
10	  - hand-authored:claude-df944902:2026-05-18
11	extracted_via: hand-authored-canonical
12	extracted_at: 2026-05-18T23:37:00Z
13	tags:
... [+8645 chars truncated]

### User | 2026-06-12T14:02:42.948Z

[tool_result] 1	---
2	schema: ideablock-v1
3	title: "Part setup / probing — edge-find, WCS establishment, tool length offsets, on-machine verification"
4	domain: "Machining"
5	category: "part-setup"
6	version_state: Current
7	confidence: 0.95
8	cluster_size: 1
9	sources:
10	  - hand-authored:claude-df944902:2026-05-18
11	extracted_via: hand-authored-canonical
12	extracted_at: 2026-05-18T23:35:00Z
13	tags: [part
... [+7692 chars truncated]

### Assistant | 2026-06-12T14:02:48.939Z

Now reading the remaining code-tribal files and sampling the hypermill tribal files in parallel:

### Assistant | 2026-06-12T14:02:50.287Z

[tool_use: Read]

### Assistant | 2026-06-12T14:02:52.234Z

[tool_use: Read]

### Assistant | 2026-06-12T14:02:52.237Z

[tool_use: Read]

### User | 2026-06-12T14:03:22.094Z

[tool_result] 1	---
2	schema: ideablock-v1
3	title: "Climb vs conventional milling — when each wins + the rigidity-and-backlash precondition"
4	domain: "Machining tactics"
5	category: machining-tactics
6	version_state: Current
7	confidence: 0.96
8	cluster_size: 1
9	canonical_sha256: authored-2026-05-21-hotel
10	sources:
11	  - Machinery's Handbook 31e §Milling — Up-cut vs Down-cut
12	  - Tlusty "Manufacturing P
... [+9986 chars truncated]

### User | 2026-06-12T14:03:22.414Z

[tool_result] 1	---
2	schema: ideablock-v1
3	title: "Endmill flute count + helix angle + corner — pick by material × operation"
4	domain: "Tooling selection"
5	category: tooling-selection
6	version_state: Current
7	confidence: 0.96
8	cluster_size: 1
9	canonical_sha256: authored-2026-05-21-hotel
10	sources:
11	  - Machinery's Handbook 31e §End Mills + §Cutter Geometry
12	  - Sandvik Coromant — Solid endmill sele
... [+10335 chars truncated]

### User | 2026-06-12T14:03:22.433Z

[tool_result] 1	---
2	title: Milling PDF Corpus — source-attributed reference manifest
3	type: code-tribal
4	domain: milling
5	slot_origin: foxtrot
6	created: 2026-05-26
7	last_verified: 2026-05-26
8	related:
9	  - knowledge/wiki/os/commands/mill-studio.md
10	  - knowledge/memories/feedback/feedback_psn_definition.md
11	  - course-4-milling-operations
12	tags: [milling, tribal, pdf-corpus, source-attribution, f
... [+10248 chars truncated]

### Assistant | 2026-06-12T14:03:26.612Z

Now sampling the hypermill tribal files:

### Assistant | 2026-06-12T14:03:27.672Z

[tool_use: Bash]

### User | 2026-06-12T14:04:08.217Z

[tool_result] H:/prism-slot-bravo/knowledge/tribal/hypermill-cam-tips-ext-hm-118.md
H:/prism-slot-bravo/knowledge/tribal/hypermill-cam-tips-ext-hm-119.md
H:/prism-slot-bravo/knowledge/tribal/hypermill-cam-tips-ext-hm-120.md
H:/prism-slot-bravo/knowledge/tribal/hypermill-cam-tips-ext-hm-121.md
H:/prism-slot-bravo/knowledge/tribal/hypermill-cam-tips-ext-hm-122.md
H:/prism-slot-bravo/knowledge/tribal/hypermill-cam
... [+999 chars truncated]

### Assistant | 2026-06-12T14:04:11.768Z

Sampling 10 hypermill tribal files spread across the range:

### Assistant | 2026-06-12T14:04:12.471Z

[tool_use: Bash]

### User | 2026-06-12T14:05:05.949Z

[tool_result] 163

### Assistant | 2026-06-12T14:05:09.075Z

163 files. Sampling 10 spread across the range (files 118, 127, 133, 140, 147, 153, 160, 165, 170, 175 roughly evenly spaced):

### Assistant | 2026-06-12T14:05:09.661Z

[tool_use: Read]

### Assistant | 2026-06-12T14:05:10.176Z

[tool_use: Read]

### Assistant | 2026-06-12T14:05:11.387Z

[tool_use: Read]

### Assistant | 2026-06-12T14:05:11.390Z

[tool_use: Read]

### Assistant | 2026-06-12T14:05:12.236Z

[tool_use: Read]

### User | 2026-06-12T14:05:23.101Z

[tool_result] 1	---
2	id: "hm-118"
3	title: "MAXX Machining Roughing with Barrel Cutters"
4	source: "web:hypermill-docs"
5	confidence: 87
6	category: "cam_strategy"
7	tags: ["maxx", "barrel-cutter", "step-over", "scallop"]
8	_source: "hypermill-cam-tips-ext.ts"
9	indexed_at: 2026-04-28T01:00:42.990Z
10	---
11	
12	# MAXX Machining Roughing with Barrel Cutters
13	
14	hyperMILL MAXX Machining roughing uses barrel 
... [+947 chars truncated]

### User | 2026-06-12T14:05:23.219Z

[tool_result] 1	---
2	id: "hm-127"
3	title: "Machine Simulation with Full Kinematic Model"
4	source: "web:hypermill-docs"
5	confidence: 88
6	category: "cam_strategy"
7	tags: ["virtual-machining", "kinematics", "collision", "simulation"]
8	_source: "hypermill-cam-tips-ext.ts"
9	indexed_at: 2026-04-28T01:00:42.998Z
10	---
11	
12	# Machine Simulation with Full Kinematic Model
13	
14	hyperMILL VIRTUAL Machining use
... [+920 chars truncated]

### User | 2026-06-12T14:05:28.463Z

[tool_result] 1	---
2	id: "hm-136"
3	title: "Pencil Tracing for Corner Cleanup"
4	source: "web:hypermill-docs"
5	confidence: 89
6	category: "cam_strategy"
7	tags: ["pencil", "corners", "cleanup", "concave"]
8	_source: "hypermill-cam-tips-ext.ts"
9	indexed_at: 2026-04-28T01:00:43.004Z
10	---
11	
12	# Pencil Tracing for Corner Cleanup
13	
14	After finishing, pencil trace cleans internal corners/fillets. hyperMILL
... [+744 chars truncated]

### User | 2026-06-12T14:05:28.637Z

[tool_result] 1	---
2	id: "hm-145"
3	title: "Cast Iron Dry Machining"
4	source: "web:hypermill-docs"
5	confidence: 86
6	category: "cam_strategy"
7	tags: ["cast-iron", "dry", "brittle", "simple"]
8	_source: "hypermill-cam-tips-ext.ts"
9	indexed_at: 2026-04-28T01:00:43.012Z
10	---
11	
12	# Cast Iron Dry Machining
13	
14	Gray/ductile cast iron: dry or air blast. Short brittle chips. Uncoated or TiN carbide, 150-25
... [+767 chars truncated]

### User | 2026-06-12T14:05:28.777Z

[tool_result] 1	---
2	id: "hm-154"
3	title: "Taylor Tool Life for Economic Speed"
4	source: "web:hypermill-forum"
5	confidence: 81
6	category: "cam_strategy"
7	tags: ["taylor", "economic-speed", "barrel-wear", "recalibrate"]
8	_source: "hypermill-cam-tips-ext.ts"
9	indexed_at: 2026-04-28T01:00:43.019Z
10	---
11	
12	# Taylor Tool Life for Economic Speed
13	
14	VT^n=C. V_econ typically 70-80% of max speed. For ba
... [+806 chars truncated]

### Assistant | 2026-06-12T14:05:33.240Z

Sampling the remaining 5 hypermill files from the upper range:

### Assistant | 2026-06-12T14:05:34.251Z

[tool_use: Read]

### Assistant | 2026-06-12T14:05:34.763Z

[tool_use: Read]

### Assistant | 2026-06-12T14:05:35.293Z

[tool_use: Read]

### Assistant | 2026-06-12T14:05:35.779Z

[tool_use: Read]

### Assistant | 2026-06-12T14:05:35.949Z

[tool_use: Read]

### User | 2026-06-12T14:05:56.829Z

[tool_result] 1	---
2	id: "hm-163"
3	title: "Copula for Dependent Failure Modes"
4	source: "web:hypermill-forum"
5	confidence: 75
6	category: "cam_strategy"
7	tags: ["copula", "dependent", "barrel-failures", "joint"]
8	_source: "hypermill-cam-tips-ext.ts"
9	indexed_at: 2026-04-28T01:00:43.027Z
10	---
11	
12	# Copula for Dependent Failure Modes
13	
14	Flank/crater/chipping correlated. Gaussian copula models join
... [+681 chars truncated]

### User | 2026-06-12T14:06:06.376Z

[tool_result] 1	---
2	id: "hm-181"
3	title: "Workplane Naming Convention"
4	source: "web:hypermill-docs"
5	confidence: 87
6	category: "cam_strategy"
7	tags: ["workplane", "naming", "standardization", "documentation"]
8	_source: "hypermill-cam-tips-ext.ts"
9	indexed_at: 2026-04-28T01:00:43.054Z
10	---
11	
12	# Workplane Naming Convention
13	
14	OP10-Top, OP20-FrontFace, OP30-SlideAccess. Active per operation. Pr
... [+660 chars truncated]

### User | 2026-06-12T14:06:06.494Z

[tool_result] 1	---
2	id: "hm-190"
3	title: "Multi-Machine Post Flexibility"
4	source: "web:hypermill-docs"
5	confidence: 85
6	category: "cam_strategy"
7	tags: ["multi-machine", "virtual-machining-center", "flexibility", "rtcp"]
8	_source: "hypermill-cam-tips-ext.ts"
9	indexed_at: 2026-04-28T01:00:43.065Z
10	---
11	
12	# Multi-Machine Post Flexibility
13	
14	Post same hyperMILL toolpath for different machines. 
... [+669 chars truncated]

### User | 2026-06-12T14:06:06.495Z

[tool_result] 1	---
2	id: "hm-200"
3	title: "Sensitivity Ranking: MAXX vs Ball-End Differences"
4	source: "web:hypermill-forum"
5	confidence: 79
6	category: "cam_strategy"
7	tags: ["sensitivity", "maxx-vs-ball", "tilt-primary", "ranking"]
8	_source: "hypermill-cam-tips-ext.ts"
9	indexed_at: 2026-04-28T01:00:43.073Z
10	---
11	
12	# Sensitivity Ranking: MAXX vs Ball-End Differences
13	
14	Ball-end: step-over 35%,
... [+791 chars truncated]

### User | 2026-06-12T14:06:06.510Z

[tool_result] 1	---
2	id: "hm-172"
3	title: "Trochoidal Milling for Hard Material Slots"
4	source: "web:hypermill-docs"
5	confidence: 87
6	category: "cam_strategy"
7	tags: ["trochoidal", "hard-materials", "hsc", "work-free-chips"]
8	_source: "hypermill-cam-tips-ext.ts"
9	indexed_at: 2026-04-28T01:00:43.047Z
10	---
11	
12	# Trochoidal Milling for Hard Material Slots
13	
14	8-15% radial, full depth, 3-5× feed. Co
... [+713 chars truncated]

### Assistant | 2026-06-12T14:06:12.519Z

Now I have everything needed. Let me also quickly check what the mill wiki files actually contain (from prior reads in this session, already in context):

### Assistant | 2026-06-12T14:06:14.459Z

[tool_use: Grep]

### Assistant | 2026-06-12T14:06:15.390Z

[tool_use: Bash]

### User | 2026-06-12T14:06:19.769Z

[tool_result] knowledge\wiki\mill\_staging\deep-domain-research-2026-06-09.md:19:## 1. Kienzle Specific Cutting Force (the Fc backbone)
knowledge\wiki\mill\_staging\deep-domain-research-2026-06-09.md:28:## 2. Cutting Power & Material Removal Rate (MRR)
knowledge\wiki\mill\_staging\deep-domain-research-2026-06-09.md:36:## 3. Radial Chip Thinning (the low-engagement correction)
knowledge\wiki\mill\_staging\deep-d
... [+4642 chars truncated]

### User | 2026-06-12T14:06:35.723Z

[tool_result] coolant-chip-evacuation-strategy-flood-mql-tap-air-recutting.md
machining-tactics-climb-trochoidal-chip-thinning.md
op-order-rough-stress-finish.md
operation-ordering-sequencing-roughing-finishing-datums.md
part-setup-first-surface-datum.md
part-setup-probing-edge-find-wcs-tool-offsets.md
tooling-selection-geometry-coating-stickout.md
workholding-practices-locating-clamping-distortion-repeatabilit
... [+56 chars truncated]

### Assistant | 2026-06-12T14:08:43.587Z

I now have all the data needed. Let me compile the full surface map.

---

## MILL KNOWLEDGE LAYER — SURFACE MAP (DIG SURFACE, 2026-06-12)

### Files inventoried

| Path | Size | Key fields / schema | Real sample (verbatim short) |
|---|---|---|---|
| `knowledge/wiki/mill/mill-foundations.md` | 159 lines | frontmatter: status VERIFIED-PARTIAL, owner_slot foxtrot; sections: Kienzle model structure, MRR formula, entering angle, tool deflection, milling taxonomy, SPC, surface roughness Ra/Rz, chip thinning (qualitative), MIT curriculum framing, face milling as datum op, machine guarding, length traceability; plus owner-gate block | "Kienzle specific cutting force — model STRUCTURE (no numbers)" — the section heading says STRUCTURE only; no kc1.1 numeric values are in this file |
| `knowledge/wiki/mill/mill-applied-practice.md` | 136 lines | sections: common failure modes, technique decisions, setup & fixturing gotchas, on-machine verification; owner-gate block | "## Common failure modes" — covers BUE, recutting, chatter, oversize bores; technique decisions cover climb vs conventional at sentence level only |
| `knowledge/wiki/mill/mill-advanced-techniques.md` | 126 lines | sections: Theme A engagement-managed roughing (HEM/trochoidal family), Theme B strategy selection decisions, Theme C sequencing strategy, Theme D thin-wall deflection-compensation; owner-gate block | "Theme A -- Engagement-managed roughing (the modern high-MRR family)" — covers parameter bands qualitatively; the a_lim chatter formula is NOT here (stays in _staging) |
| `knowledge/wiki/mill/mill-source-atlas.md` | 72 lines | sections: free college courses, free textbooks & references, archives & open data / gov reports, lecture series & video, standards & authoritative bodies, maintenance | Lists MIT OCW 2.008, Kalpakjian, NIST reports, OSHA; no numeric content — pure bibliography |
| `knowledge/wiki/mill/mill-resource-atlas.md` | 133 lines | sections: local trove (on-disk files), YouTube (verified), 
... [+17616 chars truncated]

---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "Audit PRISM galaxy #12/34: **corpus-aggregation**. Inspect mcp-server/src/engine"
date: "2026-06-08"
first_ts: "2026-06-08T20:33:55.881Z"
last_ts: "2026-06-08T20:38:42.732Z"
cwd: "H:\\prism"
messages: 35
user_msgs: 16
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_51fcc87f-437/agent-a5682ca13a08a46e5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Audit PRISM galaxy #12/34: **corpus-aggregation**. Inspect mcp-server/src/engine

> **claude-code-cli** | 2026-06-08 | 35 msgs (16 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_51fcc87f-437/agent-a5682ca13a08a46e5.jsonl`

## Transcript

### User | 2026-06-08T20:33:55.881Z

Audit PRISM galaxy #12/34: **corpus-aggregation**. Inspect mcp-server/src/engines/corpus-aggregation/{MEMORY,PATHS,TOOLBELT,CLAUDE}.md and count its real domain assets. Score it x/8 against the rubric, list the GAPS, and give the exact FILL recommendation per gap.


GOAL (operator, helping zulu): audit each of the 34 PRISM galaxies "1 by 1 in sequential order to ensure their galaxies are setup to their maximum potential." The concern: many galaxies don't have all their memories, file paths, wikis, and tribal knowledge properly mapped — each chat slot needs FULL context of its domain at all times. Use Obsidian + the Ollama/Docker local stack to fill gaps.

GROUND TRUTH (verified this session):
- A galaxy = a doctrine/index folder at mcp-server/src/engines/<galaxy>/ with 4 artifacts: CLAUDE.md (domain doctrine), MEMORY.md (per-domain brain), PATHS.md (maps the galaxy's real assets), TOOLBELT.md (the galaxy's tools/dispatchers). ALL 34 galaxies HAVE all 4 files — the question is DEPTH/COMPLETENESS, not existence.
- Engines do NOT live inside the galaxy dir — they're flat in mcp-server/src/engines/*.ts; the galaxy's PATHS.md REFERENCES them (e.g. mill PATHS.md has 58 path-refs). So "complete PATHS" = it maps the galaxy's real scattered domain assets (engines, dispatchers, wiki, tribal, corpus paths).
- Vault mirror: knowledge/memories/galaxies/<galaxy>/MEMORY.md now exists for all 34 (just filled this session).
- Wiki: knowledge/wiki/{architecture,lessons,code-tribal,concepts,...}/ — coverage is UNEVEN (wedm ~49 wiki files, speed-feed ~2). Tribal: knowledge/wiki/code-tribal/.
- Local stack: Ollama UP (:11434, models incl gpt-oss:20b/qwen2.5-coder:32b for classification/summarization), MCP :3100 UP, Qdrant DOWN (semantic_search degraded — use lexical/file search).

THE COMPLETENESS RUBRIC (score each galaxy against this — from state/shared/specs/MASTER-BRAIN-TEMPLATE.md):
A galaxy is COMPLETE iff its MEMORY.md has the 4 standing sections + the 4 connection axes, AND its 
... [+1764 chars truncated]

### Assistant | 2026-06-08T20:34:24.282Z

I'll audit the corpus-aggregation galaxy. Let me start by reading its 4 artifacts in parallel.

### Assistant | 2026-06-08T20:34:24.435Z

[tool_use: Read]

### Assistant | 2026-06-08T20:34:25.547Z

[tool_use: Read]

### Assistant | 2026-06-08T20:34:25.856Z

[tool_use: Read]

### Assistant | 2026-06-08T20:34:25.993Z

[tool_use: Read]

### User | 2026-06-08T20:34:43.482Z

[tool_result] 1	# corpus-aggregation Galaxy MEMORY.md
2	
3	## Master-brain link
4	- **UP (pull):** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` — recall: `prism_memory:semantic_search query="corpus aggregation" topK=20`
5	- **DOWN (push):** write `<type>_<slot>_<topic>.md` → master memory dir → auto-fed to `knowledge/memories/<type>/` by `stop-obsidian-memory-feed.mjs`
6	- **MASTER-INDEX edge:** 
... [+6620 chars truncated]

### User | 2026-06-08T20:34:49.506Z

[tool_result] 1	# corpus-aggregation galaxy — PATHS atlas (auto-derived baseline)
2	
3	> **Auto-derived baseline** by `scripts/galaxy-scaffold-pt.mjs` (slot:alpha, 2026-05-29) — the owning slot should ENRICH this with the domain's true hot paths. Companion: [`CLAUDE.md`](./CLAUDE.md) · [`MEMORY.md`](./MEMORY.md) · [`TOOLBELT.md`](./TOOLBELT.md).
4	
5	## Engines (name-matched to this domain, 46 found — verify ow
... [+6181 chars truncated]

### User | 2026-06-08T20:34:50.750Z

[tool_result] 1	# corpus-aggregation galaxy — TOOLBELT (auto-derived baseline)
2	
3	> **Auto-derived baseline** by `scripts/galaxy-scaffold-pt.mjs` (slot:alpha, 2026-05-29) — owning slot enriches with domain-specific tool-call patterns. Companion: [`PATHS.md`](./PATHS.md).
4	
5	## Shared token-lean patterns (apply to every galaxy)
6	- **Route before Grep** — `prism_session:master_index_query` answers most "wher
... [+1183 chars truncated]

### User | 2026-06-08T20:34:52.000Z

[tool_result] 1	# Corpus-Aggregation Galaxy — Stub Sentinel (2026-05-27)
2	
3	> Auto-loads when editing under `engines/corpus-aggregation/`. **⚠ HONEST STUB.** Canonical slot: kilo (de-facto — `learn-corpus`, `corpus-harvest-*` skills).
4	
5	## Scope
6	Multi-source corpus aggregation: PDF + MIT-OCW + web + tribal + customer-program corpora unified into a single retrievable substrate. Feeds: academy course-build
... [+642 chars truncated]

### Assistant | 2026-06-08T20:35:30.208Z

I have the 4 artifacts. The MEMORY.md is notably richer than the auto-derived PATHS/TOOLBELT stubs. Now let me empirically verify the real domain assets: count flat engines matching corpus/ingest/harvest/aggregator keywords, check wiki coverage, and tribal coverage.
[tool_use: Bash]
[tool_use: Bash]
[tool_use: Bash]

### User | 2026-06-08T20:35:35.079Z

[tool_result] === FLAT ENGINES (corpus/ingest/harvest/aggregat keywords) ===
AdditiveManufacturingTribalCorpusEngine.ts
ArchiveToPartsCatalogIngesterEngine.ts
AutomatedResourceHarvestingPipeline.ts
BlueprintCorpusHarvestEngine.ts
CADCorpusFeaturePrevalenceLearnerEngine.ts
CADCorpusIngesterEngine.ts
CADCorpusIngestionEngine.ts
CADCorpusPatternEngine.ts
CADReverseCorpusCatalogEngine.ts
CADTrainingCorpusOrchestrat
... [+1772 chars truncated]

### User | 2026-06-08T20:35:35.081Z

[tool_result] === code-tribal files matching domain ===
post-processor-cross-controller-corpus.md

=== total code-tribal files ===
1106

=== vault galaxy mirror ===
total 12
drwxr-xr-x 1 wompu 197611    0 Jun  8 15:13 ./
drwxr-xr-x 1 wompu 197611    0 Jun  8 15:13 ../
-rw-r--r-- 1 wompu 197611 7107 Jun  8 15:13 MEMORY.md

### User | 2026-06-08T20:35:38.582Z

[tool_result] <persisted-output>
Output too large (874.8KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\001bd6c3-283f-428a-ab3f-66fd01309443\tool-results\b0kexttdm.txt

Preview (first 2KB):
=== WIKI files matching domain keywords ===
knowledge/wiki/.hook-cache/007540ed2c52ef90435ed09622da6f610a214679.json
knowledge/wiki/.hook-cache/015dd5151f70663a68f4cdd67c9683eb80d865cb.json
knowledge/wiki
... [+1761 chars truncated]

### Assistant | 2026-06-08T20:35:48.205Z

The wiki grep got polluted by `.hook-cache/`. Let me re-run it excluding cache dirs, and verify the specific wiki entries the MEMORY.md claims, plus check the real dispatcher action counts.

### Assistant | 2026-06-08T20:35:50.552Z

[tool_use: Bash]

### Assistant | 2026-06-08T20:35:52.869Z

[tool_use: Bash]

### Assistant | 2026-06-08T20:35:56.187Z

[tool_use: Bash]

### User | 2026-06-08T20:36:13.640Z

[tool_result] <persisted-output>
Output too large (90.3KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\001bd6c3-283f-428a-ab3f-66fd01309443\tool-results\bvfqw3l1h.txt

Preview (first 2KB):
=== WIKI .md files matching domain (excl cache) ===
knowledge/wiki/architecture/_orphans-rescue.md
knowledge/wiki/architecture/academy-galaxy.md
knowledge/wiki/architecture/actions/aireasoning/ai-training-
... [+1778 chars truncated]

### User | 2026-06-08T20:36:28.835Z

[tool_result] === Wiki entries MEMORY.md claims exist ===
CADCorpusIngester -> knowledge/wiki/architecture/combos/combo-baseengine.md
JMDieTrainingCorpus -> knowledge/wiki/architecture/tests/jm/jmdietrainingcorpusengine.md
prism_resourceHarvester -> knowledge/wiki/index.md
prism_resourceHarvesting -> knowledge/wiki/index.md
dispatcher-resourceharvester -> knowledge/wiki/architecture/actions/resourceharvester/cl
... [+208 chars truncated]

### User | 2026-06-08T20:36:33.524Z

[tool_result] === resourceHarvester dispatcher actions ===
0
---enum actions---
0
=== dispatcher files matching harvest/ingest/corpus ===
resourceHarvesterDispatcher.ts
resourceHarvestingDispatcher.ts

### Assistant | 2026-06-08T20:36:38.451Z

The wiki coverage is actually substantial (the grep blew past 250 .md files matching corpus/ingest/harvest). The MEMORY.md's claimed wiki entries mostly resolve to real auto-generated action/dispatcher wiki pages. Let me get a precise count of the domain-named wiki entries (excluding the noisy auto-generated `actions/` combos), verify the two dispatchers' real action counts, and confirm the tribal-corpus-index claim.

### Assistant | 2026-06-08T20:36:44.643Z

[tool_use: Bash]

### Assistant | 2026-06-08T20:36:47.182Z

[tool_use: Bash]

### User | 2026-06-08T20:36:49.867Z

[tool_result] === resourceHarvester dispatcher action enum (real count) ===
no z.enum action found; trying ACTIONS const
ACTIONS arr: 0

=== resourceHarvesting dispatcher action enum ===
no z.enum; size=8994

### User | 2026-06-08T20:36:56.916Z

[tool_result] === Domain-named wiki entries (NOT auto-gen actions/combos/tests) ===
knowledge/wiki/architecture/_orphans-rescue.md
knowledge/wiki/architecture/academy-galaxy.md
knowledge/wiki/architecture/ai-training-galaxy.md
knowledge/wiki/architecture/article-synthesis-memory-cag-2026-05-26.md
knowledge/wiki/architecture/audit-system-synergy-2026-05-09.md
knowledge/wiki/architecture/automation-chain-telemetr
... [+3020 chars truncated]

### Assistant | 2026-06-08T20:37:08.023Z

The keyword "ingest/corpus/harvest" is too broad (835 hits — most are tangential). The dispatcher action enum parse failed, meaning the dispatcher uses a different action-declaration pattern. Let me verify the dispatcher action counts directly and confirm there's a dedicated `corpus-aggregation-galaxy.md` wiki entry (which exists per the listing above), plus check the tribal-corpus-index claim numbers.

### Assistant | 2026-06-08T20:37:13.193Z

[tool_use: Bash]

### Assistant | 2026-06-08T20:37:16.506Z

[tool_use: Bash]

### User | 2026-06-08T20:37:18.730Z

[tool_result] === resourceHarvester action declaration pattern ===
      1 action: z.enum
     24 case "
--- try ACTION literal keys (handler map) ---
case-labels: 24 | first-enum-size: 0 | filesize: 12129

=== resourceHarvesting same ===
case-labels: 8 | first-enum-size: 0 | filesize: 8994

### User | 2026-06-08T20:37:22.460Z

[tool_result] === dedicated galaxy wiki entry head ===
---
title: Corpus-Aggregation Galaxy — Architecture Map
type: architecture
domain: corpus-aggregation
slot: golf
maintainer: golf
seeded_by: alpha
created: 2026-06-01
tags: [corpus-aggregation, harvest, ingestion, pdf, mit, tribal, galaxy]
---

# Corpus-Aggregation Galaxy — Architecture Map

The corpus-aggregation galaxy harvests + routes scanned resources 
... [+1411 chars truncated]

### Assistant | 2026-06-08T20:37:31.083Z

I now have all the empirical evidence I need. Key findings confirmed:

- **resourceHarvesterDispatcher.ts**: real, 24 case-labels (matches MEMORY's "24 actions" claim) — VERIFIED.
- **resourceHarvestingDispatcher.ts**: real, 8 case-labels (matches "8 actions") — VERIFIED.
- **65 flat domain engines** name-match the domain (PATHS maps only 46 — undercount).
- A **dedicated `corpus-aggregation-galaxy.md` wiki entry exists** (golf-maintained, created 2026-06-01) but is **NOT referenced** from any of the galaxy's 4 artifacts — a real gap.
- The auto-derived PATHS.md and TOOLBELT.md are still labeled "honest baseline" stubs.

Let me do one final verification: the MEMORY.md's "## Indexed memories" / "## Cross-galaxy bridges" / "## High-ROI memories" / "## Known failure modes" section presence (the rubric items 2,3,4), and the byte counts.

### Assistant | 2026-06-08T20:37:34.832Z

[tool_use: Bash]

### User | 2026-06-08T20:37:37.940Z

[tool_result] === byte counts ===
 6950 mcp-server/src/engines/corpus-aggregation/MEMORY.md
 6398 mcp-server/src/engines/corpus-aggregation/PATHS.md
 1559 mcp-server/src/engines/corpus-aggregation/TOOLBELT.md
 1029 mcp-server/src/engines/corpus-aggregation/CLAUDE.md
15936 total

=== MEMORY.md section headers present ===
3:## Master-brain link
9:## Primary domain
12:## Key engines & paths
29:## Standing patterns
... [+298 chars truncated]

### Assistant | 2026-06-08T20:38:42.732Z

All evidence collected. Here is the audit.

---

# GALAXY AUDIT #12/34 — corpus-aggregation

**Verdict: 4.5 / 8** — Strong MEMORY content and real, verified dispatcher/engine assets, but MEMORY uses non-canonical section names (fails 3 of the 4 rubric standing-sections by the template's literal headers), PATHS/TOOLBELT are still auto-derived stubs, and the dedicated golf-maintained wiki entry is unlinked from the galaxy.

Byte counts: MEMORY 6,950 · PATHS 6,398 (but 99% auto-generated) · TOOLBELT 1,559 (pure stub) · CLAUDE 1,029 (explicitly self-labeled "HONEST STUB").

## SCORE BREAKDOWN (item : PASS/FAIL + evidence)

**1. MEMORY "## Master-brain link" (UP/DOWN/MASTER-INDEX) — PASS.**
MEMORY.md:3-7 has all three axes: UP-pull (`semantic_search query="corpus aggregation"`), DOWN-push (`stop-obsidian-memory-feed.mjs`), and the MASTER-INDEX back-pointer (`[galaxy:corpus-aggregation]` edge, last-sync 2026-06-01). Best section in the file.

**2. MEMORY "## High-ROI memories" as [[pointers]] — PARTIAL (0.5).**
No section by that name (probe FAIL). BUT the content is effectively present and scattered: MEMORY.md:30,32,38 cite `[[reference_catalog_extraction_pipeline_gap_2026_05_31]]`, `[[reference_vendor_catalog_db_2026_05_31]]`, `[[feedback_use_lima_pypdf_page_extractor]]` inline under "Standing patterns". Real [[pointers]] exist; they're just not collected under the canonical header. Half-credit.

**3. MEMORY "## Indexed memories" (galaxy's own per-file memory index) — FAIL.**
No such section (probe FAIL). The galaxy references 3 flat memories inline but has no consolidated index of its own per-file memories. The vault mirror `knowledge/memories/galaxies/corpus-aggregation/MEMORY.md` (7,107 B, created today) exists but is not indexed back into the engine-dir MEMORY.

**4. MEMORY "## Cross-galaxy bridges" + "## Known failure modes" — PARTIAL (0.5).**
- Cross-galaxy: section is named **"## Cross-galaxy edges"** (MEMORY.md:42-48) not the rubric's "## Cross-galaxy bridges" —
... [+9108 chars truncated]

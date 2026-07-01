---
type: "chat-session"
source: "claude-code-cli"
session_id: "087e5978-f3ed-4657-820e-aed49ae8aa0d"
title: "You are rewriting the PRISM \"corpus-aggregation\" galaxy CLAUDE.md to the LOCKED "
date: "2026-06-13"
first_ts: "2026-06-13T21:52:35.295Z"
last_ts: "2026-06-13T21:57:14.005Z"
cwd: "H:\\PRISM"
messages: 41
user_msgs: 17
assistant_msgs: 24
raw_file: "H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-a4b760dc9ac005fba.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:04"
---

# You are rewriting the PRISM "corpus-aggregation" galaxy CLAUDE.md to the LOCKED 

> **claude-code-cli** | 2026-06-13 | 41 msgs (17 user / 24 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/087e5978-f3ed-4657-820e-aed49ae8aa0d/subagents/workflows/wf_d3067214-b5f/agent-a4b760dc9ac005fba.jsonl`

## Transcript

### User | 2026-06-13T21:52:35.295Z

You are rewriting the PRISM "corpus-aggregation" galaxy CLAUDE.md to the LOCKED canonical template. This is a REFACTOR of an existing good file, NOT a from-scratch rewrite -- preserve accurate domain content, restructure to the template, apply the assessment's KEEP/DROP/ADD.

READ ALL THREE (absolute paths):
1. The LOCKED template: H:/prism/state/shared/slot-claude-md-assessment/_TEMPLATE.md (the 14-section skeleton + section-by-section guidance + the universal-core set). The output MUST follow its section order + rules.
2. The Phase-A assessment for THIS galaxy: H:/prism/state/shared/slot-claude-md-assessment/corpus-aggregation.md (its KEEP / DROP / ADD / IDEAL SECTION OUTLINE -- already done with verified-symbol discipline; this is your spec).
3. The CURRENT galaxy file: H:/prism/mcp-server/src/engines/corpus-aggregation/CLAUDE.md (preserve its accurate KEEP content; drop what the assessment marks DROP).

HARD RULES (R12 / safety):
- VERIFIED SYMBOLS ONLY. Every engine / dispatcher action / file path / hook you name MUST be confirmed to exist -- Grep/Glob/Read it (e.g. Glob mcp-server/src/engines/corpus-aggregation/*.ts; grep the dispatcher source for an action). If you cannot verify it, OMIT it or mark it "// UNVERIFIED". NEVER fabricate. The #1 failure across the 34 assessments was fabricated names -- do not add new ones.
- NEVER DROP the safety-bearing sections: §0 (header + universal-core pointer to H:/prism/CLAUDE.md), §4 (canonical constants + data paths / NEVER-inline rule), §5 (domain gotchas / safety rails), §6 (what NOT to do / domain refuses). These carry units/physics/safety numerics that have NO other home. They may be tightened but never removed.
- TOKEN-LEAN: target 80-160 lines (this replaces a 530-line monolith per slot). Collapse the 4 boilerplate blocks (cross-cutting methodology / AI-SYSTEMS-STATE / CRITIC-KEEPWORKING / verbatim india closed-loop prose) into the single §0 universal pointer + the 2-line §10 closed-loop callout, exactly as the te
... [+468 chars truncated]

### Assistant | 2026-06-13T21:52:38.755Z

I'll read all three source files in parallel before writing anything.

### Assistant | 2026-06-13T21:52:38.986Z

[tool_use: Read]

### Assistant | 2026-06-13T21:52:39.421Z

[tool_use: Read]

### Assistant | 2026-06-13T21:52:39.810Z

[tool_use: Read]

### User | 2026-06-13T21:52:49.048Z

[tool_result] 1	# CANONICAL PER-SLOT GALAXY CLAUDE.md TEMPLATE
2	
3	> Synthesis lead output, 2026-06-13. Source: 34 domain-expert galaxy assessments in this directory
4	> (`state/shared/slot-claude-md-assessment/*.md`), every one read end-to-end.
5	> This file is the LOCKED skeleton every galaxy `mcp-server/src/engines/<galaxy>/CLAUDE.md` is rewritten to.
6	> Target per-galaxy size: **80–160 lines** (replaces t
... [+31609 chars truncated]

### User | 2026-06-13T21:52:49.051Z

[tool_result] 1	## corpus-aggregation — fleet-managed
2	
3	### Current state
4	**Size:** 8,569 bytes / 82 lines.
5	**Quality grade: PARTIAL**
6	
7	Issues found:
8	- The TOOLBELT.md has a blank dispatcher section: "_(owning slot lists the domain's prism_* dispatcher actions here)_" — the dispatchers ARE known and verifiable but were never filled in.
9	- PATHS.md §Domain dispatchers states "_(none cited in CLAUDE
... [+14448 chars truncated]

### User | 2026-06-13T21:52:49.250Z

[tool_result] 1	# Corpus-Aggregation Galaxy — Domain-local CLAUDE.md (P1 Galactic Center, populated 2026-06-09)
2	
3	> Auto-loads when editing under `engines/corpus-aggregation/`. **Populated 2026-06-09** (domain-knowledge core grounded from PATHS/MEMORY/synthesis). Canonical slot: kilo (de-facto — `learn-corpus`, `corpus-harvest-*` skills).
4	
5	## Scope
6	Multi-source corpus aggregation: PDF + MIT-OCW + web +
... [+8346 chars truncated]

### Assistant | 2026-06-13T21:52:55.393Z

Now I need to verify the key engine files and dispatcher actions before writing. Let me do targeted verification.

### Assistant | 2026-06-13T21:52:55.800Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:52:55.963Z

[tool_use: Glob]

### Assistant | 2026-06-13T21:52:56.755Z

[tool_use: Glob]

### User | 2026-06-13T21:53:24.086Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T21:53:24.087Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-06-13T21:53:24.091Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-13T21:53:26.700Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:53:27.564Z

[tool_use: Bash]

### User | 2026-06-13T21:53:48.355Z

[tool_result] AWARENESS.md
CLAUDE.md
MEMORY.md
PATHS.md
SOUL.md
TOOLBELT.md

### User | 2026-06-13T21:53:50.284Z

[tool_result] cadAutomationDispatcher.ts
cadDispatcher.ts
cadDrawingKnowledgeDispatcher.ts
cadRegressionDispatcher.ts
knowledgeDispatcher.ts
knowledgeExtDispatcher.ts
machiningKnowledgeBaseDispatcher.ts
resourceExtractionDispatcher.ts
resourceHarvesterDispatcher.ts
resourceHarvestingDispatcher.ts

### Assistant | 2026-06-13T21:53:53.364Z

Good. No local `.ts` engine files in corpus-aggregation dir (it's a meta-galaxy). Now verify key engines referenced in the assessment exist, and spot-check dispatcher actions.

### Assistant | 2026-06-13T21:53:56.844Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:53:58.221Z

[tool_use: Bash]

### User | 2026-06-13T21:54:19.310Z

[tool_result] CADTrainingCorpusOrchestratorEngine.ts
CAMTrainingExtractionAggregatorEngine.ts
ContentIngestionPipelineEngine.ts
HarvestPipelineEngine.ts
IngestionOrchestratorEngine.ts
JMDieDocustrataIngestEngine.ts
JMDieFleetWideIngestEngine.ts
JMDieTrainingCorpusEngine.ts
KnowledgeIngestionOrchestratorEngine.ts
KnowledgeIngestionOrchestratorEngine.ts-1
OutsideKnowledgeSourceCatalogEngine.ts
PrintCorpusOrchestr
... [+136 chars truncated]

### User | 2026-06-13T21:54:25.882Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-13T21:54:31.896Z

Good — core engines confirmed. Now verify dispatcher actions and check SourceCatalogAggregator.

### Assistant | 2026-06-13T21:54:33.108Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:54:33.469Z

[tool_use: Bash]

### User | 2026-06-13T21:54:52.235Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/resourceHarvesterDispatcher.ts:5: * 6 actions: scan_folder, classify_file, get_index, start_harvest,
H:/prism/mcp-server/src/tools/dispatchers/resourceHarvesterDispatcher.ts:6: *   harvest_status, harvest_resume
H:/prism/mcp-server/src/tools/dispatchers/resourceHarvesterDispatcher.ts:38:  "scan_folder",
H:/prism/mcp-server/src/tools/dispatchers/resourceHar
... [+3179 chars truncated]

### User | 2026-06-13T21:54:53.829Z

[tool_result] H:/prism/mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts:163:  "corpus_harvest_mit",
H:/prism/mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts:164:  "corpus_harvest_vendor",
H:/prism/mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts:165:  "corpus_harvest_online",
H:/prism/mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts:2725:          case "corpus_harvest_mit": {
H:/pri
... [+3387 chars truncated]

### Assistant | 2026-06-13T21:54:57.652Z

All dispatcher actions verified. Now check the pypdf extractor script exists and verify `SourceCatalogAggregator.ts` briefly.

### Assistant | 2026-06-13T21:54:58.938Z

[tool_use: Bash]

### Assistant | 2026-06-13T21:55:00.149Z

[tool_use: Bash]

### User | 2026-06-13T21:55:10.876Z

[tool_result] H:/prism/scripts/extract-jm-die-corpus-page-by-page.py
EXISTS

### User | 2026-06-13T21:55:13.498Z

[tool_result] 2: * SourceCatalogAggregator — Unified query interface for all 28 engine SOURCE_FILE_CATALOG exports.
33:  { engine: "AlgorithmGateway", module: "AlgorithmGatewayEngine", constName: "ALGORITHM_SOURCE_FILE_CATALOG" },
34:  { engine: "Apprentice", module: "ApprenticeEngine", constName: "APPRENTICE_SOURCE_FILE_CATALOG" },
35:  { engine: "CAMIntegration", module: "CAMIntegrationEngine", constName: "CA
... [+123 chars truncated]

### Assistant | 2026-06-13T21:55:22.684Z

All symbols verified. Now write the rewritten CLAUDE.md to the staging path.

### Assistant | 2026-06-13T21:55:23.401Z

[tool_use: Bash]

### User | 2026-06-13T21:55:29.463Z

[tool_result] academy.md
ai-training.md
business.md
cad.md
cam.md
database-expansion.md
dormant-data.md
fleet-hygiene.md
frontend-app.md
hermes-zulu.md
mill.md
post-processor.md
quoting.md
speed-feed.md
system-viz.md
token-optimization.md
wedm.md

### Assistant | 2026-06-13T21:55:32.044Z

Staging dir exists. Now write the rewritten file.

### Assistant | 2026-06-13T21:56:54.153Z

[tool_use: Write]

### User | 2026-06-13T21:57:09.207Z

[tool_result] File created successfully at: H:/prism/state/shared/slot-claude-md-drafts/corpus-aggregation.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-13T21:57:14.005Z

galaxy=corpus-aggregation | lines=157 | grade-was=PARTIAL | key-changes=dropped 4 boilerplate blocks + opaque graph-node IDs; added verified 7-dispatcher action table, 13-engine verified table, SCAN→CLASSIFY→INGEST→AGGREGATE→VALIDATE→SERVE pipeline contract, 7-item refuses list, data-source priority order, no-dedicated-slot operating note

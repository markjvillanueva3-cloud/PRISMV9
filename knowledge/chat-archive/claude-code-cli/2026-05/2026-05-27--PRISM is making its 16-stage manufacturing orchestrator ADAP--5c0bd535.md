---
type: "chat-session"
source: "claude-code-cli"
session_id: "5c0bd535-0ecb-4744-9e62-ac1ea40fbe71"
title: "PRISM is making its 16-stage manufacturing orchestrator ADAPTIVE — the system up"
date: "2026-05-27"
first_ts: "2026-05-27T01:03:17.046Z"
last_ts: "2026-05-27T01:06:25.900Z"
cwd: "H:\\PRISM"
messages: 83
user_msgs: 36
assistant_msgs: 47
raw_file: "H:/.claude/projects/H--prism/5c0bd535-0ecb-4744-9e62-ac1ea40fbe71/subagents/agent-a5d9953228c223658.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# PRISM is making its 16-stage manufacturing orchestrator ADAPTIVE — the system up

> **claude-code-cli** | 2026-05-27 | 83 msgs (36 user / 47 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/5c0bd535-0ecb-4744-9e62-ac1ea40fbe71/subagents/agent-a5d9953228c223658.jsonl`

## Transcript

### User | 2026-05-27T01:03:17.046Z

PRISM is making its 16-stage manufacturing orchestrator ADAPTIVE — the system updates its own policy from shop-floor outcomes + customer-decisions + operator-overrides. But 4 stakeholders (engineer, machinist, office, manager) need to TRUST + UNDERSTAND + STEER these adaptive systems.

Your job: design the stakeholder-facing surface for adaptive algorithms. READ-ONLY research.

Search:
- H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md (look for *Explain*, *Trace*, *Confidence*, *AuditLog*, *Override*, *Dashboard*, *ExplainableRetrieval*)
- H:/prism/mcp-server/src/engines/ (explainability engines)
- H:/prism/.claude/commands/ — look for confidence/explain/override/audit skills
- H:/prism/knowledge/wiki/architecture/ — design specs for explainability + audit
- H:/prism/state/shared/specs/HERMES-MEMORY-VAULT-RESEARCH-2026-05-23.md (HMEMV02 explainable retrieval)
- H:/prism/state/shared/PRISM-SELF-AWARENESS-DIRECTIVE.md

Under 500 words, answer these UX questions per stakeholder:

**ENGINEER**:
- How do they see WHY the orchestrator picked toolpath X over Y?
- How do they override a recommendation (with reason captured for training)?
- How do they audit a quote breakdown stage-by-stage?
- Trust signal: "is the model's prediction reliable on THIS feature class for THIS material?"

**MACHINIST**:
- How do they know the predicted speed/feed has been calibrated on THIS machine (not just textbook)?
- How do they correct a recommendation in-line (e.g. "this spindle starts chattering 2000rpm before SSF says") and have the system learn?
- How do they see tool-life prediction confidence (Bayesian posterior) — "this insert: expect 142±18 parts"?
- How do they reject an adaptive update if it's wrong?

**OFFICE**:
- How is quote confidence surfaced? Single number? P50/P95/P99 ranges?
- Win/lose feedback: how does office tell the system "we lost this quote at price X to competitor Y"?
- How do they see when a customer's pricing model has drifted (this customer keeps winning quotes 8%
... [+1000 chars truncated]

### Assistant | 2026-05-27T01:03:22.980Z

I'll conduct a thorough read-only search of the PRISM codebase to understand the current state of explainability, audit, and override surfaces for adaptive systems.

### Assistant | 2026-05-27T01:03:23.481Z

[tool_use: Read]

### Assistant | 2026-05-27T01:03:23.832Z

[tool_use: Glob]

### Assistant | 2026-05-27T01:03:24.109Z

[tool_use: Glob]

### Assistant | 2026-05-27T01:03:24.374Z

[tool_use: Glob]

### Assistant | 2026-05-27T01:03:24.396Z

[tool_use: Read]

### User | 2026-05-27T01:03:28.204Z

[tool_result] read-once-guard: 'H:\PRISM\mcp-server\data\docs\ENGINE_DIGEST.md' was already read 27m ago in this session and is unchanged (mtime 1779784243803). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-27T01:03:29.352Z

[tool_result] No files found

### User | 2026-05-27T01:03:29.682Z

[tool_result] .claude\commands\ingest.md
.claude\commands\vendor.md
.claude\commands\prints.md
.claude\commands\tooling.md
.claude\commands\process-docs.md
.claude\commands\material-stock.md
.claude\commands\my-shop.md
.claude\commands\erp-health.md
.claude\commands\self-improve.md
.claude\commands\advisor-strategy.md
.claude\commands\claude-flow-help.md
.claude\commands\claude-flow-memory.md
.claude\commands\c
... [+2960 chars truncated]

### User | 2026-05-27T01:03:30.328Z

[tool_result] 1	# PRISM Self-Awareness Directive
2	## Auto-inject to all sessions | Updated: 2026-04-19
3	
4	## ⚠️ MANDATORY: CHECK BEFORE CREATING ANYTHING NEW
5	**STOP! Before creating ANY engine, formula, algorithm, or extracting content:**
6	```typescript
7	import { duplicationGuardEngine } from "src/engines/DuplicationGuardEngine.js";
8	
9	// MANDATORY CHECK — DO THIS FIRST
10	const check = await duplicati
... [+27756 chars truncated]

### User | 2026-05-27T01:03:34.632Z

[tool_result] knowledge\wiki\architecture\system-viz.md
knowledge\wiki\architecture\audit-system-synergy-2026-05-09.md
knowledge\wiki\architecture\domain-swiss.md
knowledge\wiki\architecture\engines\business\additivequoteengine.md
knowledge\wiki\architecture\engines\calc\advancedchipthicknessengine.md
knowledge\wiki\architecture\engines\cnc\advancedcncconfigengine.md
knowledge\wiki\architecture\engines\calc\adv
... [+6786 chars truncated]

### Assistant | 2026-05-27T01:03:37.413Z

Now let me search for specific files about explainability, confidence, audit, and override surfaces:

### Assistant | 2026-05-27T01:03:38.594Z

[tool_use: Grep]

### Assistant | 2026-05-27T01:03:38.712Z

[tool_use: Glob]

### Assistant | 2026-05-27T01:03:38.943Z

[tool_use: Glob]

### Assistant | 2026-05-27T01:03:39.361Z

[tool_use: Glob]

### Assistant | 2026-05-27T01:03:39.448Z

[tool_use: Glob]

### User | 2026-05-27T01:03:44.399Z

[tool_result] knowledge\wiki\architecture\system-viz.md
knowledge\wiki\architecture\system-viz-first-audit.md
knowledge\wiki\architecture\system-viz-fs-coverage.md
knowledge\wiki\architecture\system-viz-fs-coverage-ms1.md
knowledge\wiki\architecture\system-viz-dsl-ms0.md
knowledge\wiki\architecture\system-viz-upgrades-audit-2026-05-16.md
knowledge\wiki\architecture\system-viz-type-backfill.md
knowledge\wiki\arc
... [+919 chars truncated]

### User | 2026-05-27T01:03:44.498Z

[tool_result] state\shared\specs\HERMES-MEMORY-VAULT-RESEARCH-2026-05-23.md

### User | 2026-05-27T01:03:44.701Z

[tool_result] state\shared\FORGE_AUDIT_REPORT_2026-04-17.md
state\shared\AI-AWARE-HARDEN-AUDIT-2026-04-17.md
state\shared\CLAUDE_MCP_CLEANROOM_PARITY_AUDIT_2026-03-31.md
state\shared\CODEX_CAPABILITY_INCORPORATION_AUDIT_2026-03-30.md
state\shared\CODEX_MCP_SETUP_AUDIT_2026-03-31.md
state\shared\COMPREHENSIVE_CONVERGENCE_AUDIT_2026-03-29.md
state\shared\FMERGE-MS0-CANONICAL-FRONTEND-AUDIT.md
state\shared\FORGE-A
... [+4200 chars truncated]

### User | 2026-05-27T01:03:44.703Z

[tool_result] No files found

### User | 2026-05-27T01:03:47.127Z

[tool_result] Found 71 files
mcp-server\data\docs\ENGINE_DIGEST.md
mcp-server\data\docs\CODE_SYSTEM_INDEX.json
mcp-server\data\docs\CAD_REGRESSION_RUNBOOK.md
mcp-server\data\docs\PRISM-UNIFIED-ROADMAP-v2.md
mcp-server\data\docs\gsd\GSD_MICRO.md
mcp-server\data\docs\CAD-REGRESSION-RUNBOOK.md
mcp-server\data\docs\INVENTOR_HSM_COMPLETE_PARAMETER_CATALOG.json
mcp-server\data\docs\PRISM_CAM_PLUGIN_ARCHITECTURE.md
mc
... [+3657 chars truncated]

### Assistant | 2026-05-27T01:03:49.423Z

Let me read the HERMES vault research and audit-system synergy document to understand what explainability surfaces exist:

### Assistant | 2026-05-27T01:03:49.648Z

[tool_use: Read]

### Assistant | 2026-05-27T01:03:50.094Z

[tool_use: Read]

### Assistant | 2026-05-27T01:03:50.838Z

[tool_use: Grep]

### User | 2026-05-27T01:03:57.464Z

[tool_result] No files found

### User | 2026-05-27T01:03:57.466Z

[tool_result] 1	---
2	title: System Synergy Audit — 2026-05-09
3	type: architecture
4	authors: [claude-cee63f1f, claude-85cedf09]
5	generated_by: /forge-audit-v2 (Phase 6F wiki ingest)
6	date: 2026-05-09
7	last_remediated: 2026-05-10
8	status: shipped (v1.1 post-peer-review)
9	related:
10	  - knowledge/wiki/architecture/loop-discipline.md (proposed Track J)
11	  - knowledge/wiki/decisions/audit-v2-doctrine.md (
... [+4908 chars truncated]

### User | 2026-05-27T01:03:58.896Z

[tool_result] 1	# HERMES-MEMORY-VAULT — deep research (2026-05-23)
2	
3	**Author:** claude-ea80ce2f slot bravo
4	**Source:** Simback's "Hermes Agent Memory Guidebook" (https://x.com/KSimback/status/2058262328496554021) + first-principles audit of Obsidian (2025+) / Qdrant (1.10+) / Hermes Agent ecosystem (2026-04 Atlas release) vs PRISM PSN.
5	**Status:** advisory only — every promotion is operator-gated; nothi
... [+17741 chars truncated]

### Assistant | 2026-05-27T01:04:03.363Z

Let me search for the explain/override/audit surfaces that are already built:

### Assistant | 2026-05-27T01:04:03.733Z

[tool_use: Bash]

### User | 2026-05-27T01:04:10.340Z

[tool_result] H:/PRISM/.claude/commands/audit-viz-first.md
H:/PRISM/.claude/commands/cad-explain.md
H:/PRISM/.claude/commands/close-out-audit.md
H:/PRISM/.claude/commands/context-audit.md
H:/PRISM/.claude/commands/harness-security-audit.md
H:/PRISM/.claude/commands/peer-audit.md
H:/PRISM/.claude/commands/program-audit.md
H:/PRISM/.claude/commands/r12-audit.md
H:/PRISM/.claude/commands/regression-audit.md
H:/PRI
... [+75 chars truncated]

### Assistant | 2026-05-27T01:04:12.170Z

Let me read some of the key explanation and audit surfaces:

### Assistant | 2026-05-27T01:04:12.385Z

[tool_use: Read]

### Assistant | 2026-05-27T01:04:12.657Z

[tool_use: Read]

### Assistant | 2026-05-27T01:04:13.378Z

[tool_use: Grep]

### User | 2026-05-27T01:04:19.757Z

[tool_result] 1	---
2	policy:
3	  tier: 1
4	  triggers:
5	    - "cad-explain"
6	composes_with:
7	  - "/agi-cad-generate"
8	  - "/cad-from-blueprint"
9	  - "/cad-from-text"
10	---
11	# /cad-explain — Explain CAD Design Decisions
12	
13	Query chain-of-thought reasoning for CAD generation decisions.
14	
15	## Usage
16	```
17	/cad-explain "why chamfer?"
18	/cad-explain "material selection"
19	/cad-explain --chain c
... [+2554 chars truncated]

### User | 2026-05-27T01:04:19.769Z

[tool_result] 1	---
2	description: Run the fleet-wide R12 audit — find hooks that reference fake MCP actions in nudge text. Reports Tier A (real dispatcher, unknown action) + Tier B (definite R12 fake — dispatcher missing).
3	---
4	
5	# /r12-audit — fleet R12 audit for nudge-emitting hooks
6	
7	Surface created by TOKEN-SAVINGS-PIVOT iters 7-13 (slot:alpha 2026-05-23 autonomous /loop). Cross-checks every `prism_
... [+2487 chars truncated]

### User | 2026-05-27T01:04:20.135Z

[tool_result] 195:- **BayesianToolLifeEngine**: Probabilistic tool life prediction:
223:- **BoreFinishingEngine**: Honing & bore finishing prediction
242:- **BurnishingPolishingEngine**: Burnishing, lapping, and polishing prediction
769:- **DrillBreakthroughForceEngine**: Drilling thrust force & exit breakthrough prediction
1070:- **GrindingSurfaceFinishEngine**: Surface roughness prediction for grinding operat
... [+2057 chars truncated]

### system

... [3 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-27T01:04:36.844Z

Now let me read the adaptive override engine and search for confidence/audit patterns in the codebase:

### Assistant | 2026-05-27T01:04:37.200Z

[tool_use: Read]

### Assistant | 2026-05-27T01:04:38.154Z

[tool_use: Grep]

### Assistant | 2026-05-27T01:04:38.170Z

[tool_use: Glob]

### Assistant | 2026-05-27T01:04:38.289Z

[tool_use: Glob]

### User | 2026-05-27T01:04:42.922Z

[tool_result] No files found

### User | 2026-05-27T01:04:42.956Z

[tool_result] No files found

### User | 2026-05-27T01:04:43.485Z

[tool_result] 1	---
2	title: AdaptiveOverrideEngine
3	type: engine
4	engine_id: eng.adaptive.adaptiveoverrideengine
5	domain: adaptive
6	parent_layer: L5
7	status: built
8	generated_by: scripts/generate-engine-wiki.mjs
9	last_verified: 2026-05-11
10	tags: [engine, domain-adaptive, status-built, atomic]
11	related:
12	  - knowledge/wiki/architecture/domain-adaptive.md
13	  - knowledge/wiki/architecture/layer-l5.
... [+1165 chars truncated]

### User | 2026-05-27T01:04:44.069Z

[tool_result] Found 30 files limit: 30
knowledge\wiki\architecture\engines\other\workenvelopevalidatorengine.md
knowledge\wiki\architecture\engines\other\workenvelopeengine.md
knowledge\wiki\architecture\engines\other\uncertaintyquantificationengine.md
knowledge\wiki\architecture\engines\other\metrologyuncertaintyengine.md
knowledge\wiki\architecture\engines\other\bayesiansafetyengine.md
knowledge\wiki\architec
... [+1841 chars truncated]

### Assistant | 2026-05-27T01:04:46.147Z

Let me read some of the Bayesian engines to understand confidence representation:

### Assistant | 2026-05-27T01:04:46.558Z

[tool_use: Read]

### Assistant | 2026-05-27T01:04:46.625Z

[tool_use: Read]

### Assistant | 2026-05-27T01:04:46.826Z

[tool_use: Read]

### User | 2026-05-27T01:04:49.214Z

[tool_result] 1	---
2	title: BayesianAdaptiveEngine
3	type: engine
4	engine_id: eng.adaptive.bayesianadaptiveengine
5	domain: adaptive
6	parent_layer: L5
7	status: built
8	generated_by: scripts/generate-engine-wiki.mjs
9	last_verified: 2026-05-11
10	tags: [engine, domain-adaptive, status-built, atomic]
11	related:
12	  - knowledge/wiki/architecture/domain-adaptive.md
13	  - knowledge/wiki/architecture/layer-l5.
... [+1165 chars truncated]

### User | 2026-05-27T01:04:49.220Z

[tool_result] 1	---
2	title: BayesianToolLifeEngine
3	type: engine
4	engine_id: eng.adaptive.bayesiantoollifeengine
5	domain: adaptive
6	parent_layer: L5
7	status: built
8	generated_by: scripts/generate-engine-wiki.mjs
9	last_verified: 2026-05-18
10	tags: [engine, domain-adaptive, status-built, atomic]
11	related:
12	  - knowledge/wiki/architecture/domain-adaptive.md
13	  - knowledge/wiki/architecture/layer-l5.
... [+1165 chars truncated]

### User | 2026-05-27T01:04:49.238Z

[tool_result] 1	---
2	title: AnchoredConfidenceEngine
3	type: engine
4	engine_id: eng.dev.anchoredconfidenceengine
5	domain: dev
6	parent_layer: L5
7	status: built
8	generated_by: scripts/generate-engine-wiki.mjs
9	last_verified: 2026-05-11
10	tags: [engine, domain-dev, status-built, atomic]
11	related:
12	  - knowledge/wiki/architecture/domain-dev.md
13	  - knowledge/wiki/architecture/layer-l5.md
14	  - state/
... [+1103 chars truncated]

### Assistant | 2026-05-27T01:04:51.348Z

Let me search for existing dashboard and quote confidence patterns more directly:

### Assistant | 2026-05-27T01:04:51.784Z

[tool_use: Glob]

### Assistant | 2026-05-27T01:04:51.984Z

[tool_use: Glob]

### Assistant | 2026-05-27T01:04:52.364Z

[tool_use: Bash]

### Assistant | 2026-05-27T01:04:53.230Z

[tool_use: Grep]

### User | 2026-05-27T01:04:57.733Z

[tool_result] .claude\commands\shop-quote.md
.claude\commands\quote-to-ship.md
.claude\commands\quote.md

### User | 2026-05-27T01:04:57.833Z

[tool_result] .claude\commands\utilization-dashboard.md

### User | 2026-05-27T01:04:58.015Z

[tool_result] 1570-- **MachineCapabilityIndexEngine**: Phase 0.23 U-UTL7
1571-- **MachineCapabilityIntelligenceEngine**: Unifies spindle torque curves, axis acceleration profiles, work envelope
1572-- **MachineCapabilitySurfaceEngine**: Surfaces controller capabilities, spindle packages, and coolant strategies
1573:- **MachineConfidenceCalculatorEngine**: Calculates confidence scores for machine packages based 
... [+924 chars truncated]

### User | 2026-05-27T01:04:59.388Z

[tool_result] H:/PRISM/.claude/commands/agi-cad-generate.md
H:/PRISM/.claude/commands/ask-local.md
H:/PRISM/.claude/commands/audit-viz-first.md
H:/PRISM/.claude/commands/cad-dfm-generate.md
H:/PRISM/.claude/commands/cad-explain.md
H:/PRISM/.claude/commands/cad-from-photo.md
H:/PRISM/.claude/commands/cad-tolerance.md
H:/PRISM/.claude/commands/cad-validate.md
H:/PRISM/.claude/commands/cam-strategy.md
H:/PRISM/.cl
... [+32 chars truncated]

### Assistant | 2026-05-27T01:05:01.278Z

Let me read the key dashboard and quote commands:

### Assistant | 2026-05-27T01:05:01.490Z

[tool_use: Read]

### Assistant | 2026-05-27T01:05:01.713Z

[tool_use: Read]

### Assistant | 2026-05-27T01:05:01.956Z

[tool_use: Read]

### Assistant | 2026-05-27T01:05:02.410Z

[tool_use: Grep]

### User | 2026-05-27T01:05:07.990Z

[tool_result] 1	---
2	policy:
3	  tier: 3
4	  triggers:
5	    - "quote"
6	composes_with:
7	  - "/estimate"
8	  - "/quote-job"
9	  - "/quote-to-ship"
10	consumes:
11	  - "prism_business:quote_generate"
12	---
13	# /quote — Universal Job Quotation
14	
15	Generate quotes for manufacturing jobs with accurate cost estimation, cycle time prediction, and competitive pricing.
16	
17	## Usage
18	```
19	/quote [job-spec]
... [+1264 chars truncated]

### User | 2026-05-27T01:05:10.945Z

[tool_result] 1	---
2	description: Graph-wide utilization classifier — buckets every PRISM node into hub/sink/source/orphan/ghost. Use to answer "what's actually being used?" and to surface the audit punch list (built-but-unwired, dead code).
3	allowed-tools: mcp__prism_safe__prism_session, Read
4	composes_with:
5	  - "/build-state"
6	  - "/master-index"
7	  - "/system-viz"
8	consumes:
9	  - "prism_session:mast
... [+3515 chars truncated]

### User | 2026-05-27T01:05:10.999Z

[tool_result] 1	---
2	policy:
3	  tier: 3
4	  triggers:
5	    - "shop-quote"
6	---
7	# /shop-quote — Quick Shop Floor Quote
8	
9	Generate rapid quotes for shop floor requests with variability-aware time estimates.
10	
11	## Usage
12	```
13	/shop-quote <part_desc> [--qty <N>] [--material <name>] [--tolerance <class>] [--rush]
14	```
15	
16	## Workflow
17	
18	1. **Part Analysis**
19	   - Parse description/print
2
... [+1179 chars truncated]

### User | 2026-05-27T01:05:13.079Z

[tool_result] Found 1 file
knowledge\wiki\architecture\engines\knowledge\tribalexplanationengine.md

### Assistant | 2026-05-27T01:05:18.026Z

Let me read the TribalExplanationEngine and wrap up with a focused search on what's actually implemented:

### Assistant | 2026-05-27T01:05:18.552Z

[tool_use: Read]

### Assistant | 2026-05-27T01:05:19.382Z

[tool_use: Grep]

### User | 2026-05-27T01:05:24.754Z

[tool_result] 1	---
2	title: TribalExplanationEngine
3	type: engine
4	engine_id: eng.knowledge.tribalexplanationengine
5	domain: knowledge
6	parent_layer: L5
7	status: built
8	generated_by: scripts/generate-engine-wiki.mjs
9	last_verified: 2026-05-11
10	tags: [engine, domain-knowledge, status-built, atomic]
11	related:
12	  - knowledge/wiki/architecture/domain-knowledge.md
13	  - knowledge/wiki/architecture/lay
... [+1164 chars truncated]

### User | 2026-05-27T01:05:25.783Z

[tool_result] Found 1 file
.claude\commands\close-out.md

### Assistant | 2026-05-27T01:06:25.900Z

Based on my read-only research across PRISM's codebase, I can now provide a comprehensive UX design for adaptive algorithm surfaces. Let me synthesize the findings:

---

## STAKEHOLDER-FACING SURFACES FOR ADAPTIVE ORCHESTRATOR

**Current State:** PRISM has 631 engines including BayesianToolLifeEngine, BayesianAdaptiveEngine, AdaptiveOverrideEngine, TribalExplanationEngine, and AnchoredConfidenceEngine. Confidence surfaces exist (via VariabilityEnvelopeEngine for P50/P95/P99) and explanation chains exist (via CADReasoningChainEngine). But **the critical gap: per-recommendation "why" traces are not threaded to stakeholder dashboards; operator overrides do not feed back into retraining loops.**

---

### ENGINEER (Toolpath/Specification Decision Auditing)

**Trust Signal Challenge:** "Is this recommendation reliable *for THIS part class, THIS material, on THIS machine*?"

**Existing Surfaces:**
1. **`/cad-explain` (P1-BUILT)** — Chain-of-thought reasoning traces (evidence + alternatives). But CAD-scoped; needs manufacturing expansion.
2. **TribalExplanationEngine (P1-BUILT)** — Surfaces tribal knowledge with reasoning. Wired to knowledge dispatcher but not to quote/strategy dashboards.
3. **AnchoredConfidenceEngine (P1-BUILT)** — Calculates confidence scores for machine packages based on data completeness.

**3-5 Proposed Surfaces:**

- **P0 — "Why This Toolpath?" widget** (skill: `/strategy-explain-decision`)
  - Surface: Recommendation card showing selected strategy (e.g., "High-speed finishing: carbide 15K RPM, 0.3 mm/rev, 2mm DOC")
  - Why trace: "Selected because: (1) D2 + fine finish combo → historical success rate 94% on THIS machine-class (73 prior jobs), (2) Competitor tribal rules prefer carbide at this speed-to-hardness ratio (87% confidence), (3) Your shop's envelope for 'D2 finishing' shows stable 0.6 Ra at these parameters (Bayesian posterior ±0.15 Ra)"
  - **Hard rule**: always surface the N that posterior is based on (73 jobs ≠ 1,000,000 = different co
... [+13714 chars truncated]

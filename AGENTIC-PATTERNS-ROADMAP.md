# Agentic Design Patterns x PRISM MCP Server — Full Analysis & Roadmap

**Source**: "Agentic Design Patterns: A Hands-On Guide to Building Intelligent Systems" by Antonio Gulli (Google), 482 pages, 21 chapters
**Analysis Date**: 2026-03-24
**Method**: 10-agent team with specialized roles, two passes (breadth + scrutiny)
**PDF Location**: `C:\Users\Admin.DIGITALSTORM-PC\Downloads\Agentic_Design_Patterns.pdf`
**Extracted Chapters**: `C:\tmp\agentic-patterns\chapter_*.txt`

---

## Executive Summary

A 482-page book on agentic design patterns was analyzed by 10 specialized agents against PRISM's 1,245-engine MCP server. Of 27 initially proposed improvements, **10 were false positives** (PRISM already has them), **10 are partial gaps** (something exists but the pattern adds value), and **7 are confirmed gaps**. PRISM is 93% MCP-complete and significantly ahead of the book in physics-based safety, but has critical gaps in operator confirmation gates, embedding infrastructure, and inter-step chain validation.

---

## Analysis Team (10 Agents)

| # | Role | Mission | Key Finding |
|---|------|---------|-------------|
| 1 | **Skeptic/Auditor** | Grep actual code to verify/refute all 27 findings | 10 of 27 are FALSE POSITIVES (37%). PRISM already has fallback chains, safety callbacks, tool discovery, parallel feasibility, complexity routing, outcome feedback, checkpoint/rollback, token monitoring, agent-as-tool |
| 2 | **Code Architect** | Read book code + PRISM source, design TypeScript interfaces for top 10 | 10 concrete interface designs with exact file paths, line numbers, and integration points |
| 3 | **Manufacturing Safety Expert** | Cross-ref safety chapters against hooks/middleware/enforcement | P0 gap: no operator confirmation gate for G-code. 5 bypass paths found. Cross-field physics missing medium/hard materials |
| 4 | **MCP Protocol Expert** | Audit all 21 MCP source files against book protocol guidelines | PRISM is 93% MCP-complete. Top gaps: action-level completions, resource list callbacks, A2A Agent Card. 10 features PRISM has that the book doesn't mention |
| 5 | **Cost-Benefit Prioritizer** | Estimate effort/risk/ROI for all 27, produce ranked table | Top ROI: Before-Engine Safety Callbacks (6.50), Operator Escalation (4.67), Deterministic Query Filtering (4.00). Embedding features rank lowest ROI |
| 6 | **Book Code Extractor** | Harvest every code example from all 21 chapters | 47 patterns cataloged across 12 categories. Full catalog at `C:/tmp/agentic-patterns/PATTERN_CATALOG.md` |
| 7 | **Multi-Agent Orchestration Architect** | Design 3-level agent hierarchy with communication protocols | 730-line typed blueprint: Planner(Opus) -> Setup(Sonnet) -> Calc(Haiku). Conflict resolution protocol. ~8,200 LOC estimate |
| 8 | **Memory/Learning Specialist** | Map memory taxonomy, design RAG + learning loop | #1 gap: zero embedding infrastructure. All search is `String.includes()`. Proposes `@xenova/transformers` + `better-sqlite3` |
| 9 | **Testing/Evaluation Expert** | Audit 784 test files, design trajectory eval + drift detection | P0: trajectory evaluation (safety gate bypass undetectable), golden baseline drift detection. Provided concrete vitest code |
| 10 | **Integration Wiring Specialist** | Map dependency graph, conflict analysis, implementation waves | 6 waves, ~52 new files, ~45 modified files. Two critical foundations: middleware pipeline + embedding infrastructure |

---

## What the Book Covers (21 Chapters)

| Part | Chapter | Pattern | Pages |
|------|---------|---------|-------|
| Intro | - | What makes an AI system an Agent? (Levels 0-3) | 9 |
| **Part 1** | 1 | Prompt Chaining | 12 |
| | 2 | Routing (LLM/embedding/rule/ML-classifier) | 13 |
| | 3 | Parallelization (fan-out/fan-in) | 15 |
| | 4 | Reflection (generator-critic loop) | 13 |
| | 5 | Tool Use (function calling) | 20 |
| | 6 | Planning (goal decomposition, adaptive replanning) | 13 |
| | 7 | Multi-Agent Collaboration | 17 |
| **Part 2** | 8 | Memory Management (short/long-term, semantic/episodic/procedural) | 21 |
| | 9 | Learning and Adaptation (SICA, OpenEvolve) | 12 |
| | 10 | Model Context Protocol (MCP) | 16 |
| | 11 | Goal Setting and Monitoring (SMART criteria) | 12 |
| **Part 3** | 12 | Exception Handling and Recovery | 8 |
| | 13 | Human-in-the-Loop | 9 |
| | 14 | Knowledge Retrieval (RAG, GraphRAG, Agentic RAG) | 17 |
| **Part 4** | 15 | Inter-Agent Communication (A2A protocol) | 15 |
| | 16 | Resource-Aware Optimization | 15 |
| | 17 | Self-Correction | ~14 |
| | 18 | Safety and Guardrails | ~20 |
| | 19 | Evaluation and Testing (LLM-as-Judge, trajectories) | ~19 |
| | 20 | Prioritization | ~10 |
| | 21 | Exploration and Discovery | ~15 |
| Appendix | - | Advanced Prompting, Principles, Framework Reference | ~70 |

---

## Where PRISM Is Ahead of the Book

The book's MCP coverage is introductory (wrapping filesystem tools, basic greet/weather examples). PRISM implements advanced MCP features the book doesn't mention:

| PRISM Feature | File | Why It's Advanced |
|---|---|---|
| **Sampling with Tools** | `sampling.ts` | Server-initiated LLM requests via `createMessage` with focused tool subsets |
| **Elicitation** | `elicitation.ts` | 8 structured JSON Schema forms for interactive data collection |
| **Output Schemas** | `outputSchemas.ts` | 20+ Zod-based schemas for typed tool results with `structuredContent` |
| **Tool Annotations** | `toolAnnotations.ts` | 68 dispatchers classified by safety (readOnly/destructive/idempotent/openWorld) |
| **Progress Tracking** | `progressTracker.ts` | `notifications/progress` for long-running ops (CNC simulation, Monte Carlo) |
| **Resource Links** | `resourceLinks.ts` | Auto-extracts resource URIs from result objects |
| **Agent SDK Config** | `agentConfig.ts` | 5 subagents with model tiers, budget limits, safety hooks |
| **Task Tools** | `taskTools.ts` | Async task support with createTask/getTask/getTaskResult lifecycle |
| **Health Probes** | `healthProbes.ts` | Kubernetes-compatible /health, /ready, /live |
| **RBAC with Auto-Classification** | `auth.ts` | Auto-derives minimum role per dispatcher from annotations |

The book's safety chapter focuses entirely on content safety (hate speech, jailbreaks). PRISM has **physics-based safety gates** the book never imagines:
- `crossFieldPhysics.ts` — validates cutting force scales correctly with material hardness
- `materialSanity.ts` — catches data swaps where material name doesn't match density/hardness
- `safetyCalcSchema.ts` — physically-bounded JSON schema (Vc <= 2000, Fc <= 100000)
- 5 blocking safety hooks at different pipeline stages
- Development-time enforcement hooks (blocks engine writes without consulting knowledge)
- Agent tier escalation (blocks non-Opus from safety-critical calculations)

---

## Truth Table: All 27 Improvements After Skeptic Verification

### 10 FALSE POSITIVES (PRISM already has these)

| # | Proposed Improvement | What PRISM Already Has |
|---|---------------------|----------------------|
| 2 | Structured Fallback Chains | `AtomicValue<T>` with confidence + source provenance, multi-tier resolution throughout `SpeedFeedOrchestratorEngine` |
| 3 | Before-Engine Safety Callbacks | `HookEngine` with 7,114 hooks including `CALC-BEFORE-EXEC-001`, `SafetyQualityHooks` with `pre-calculate-safety` (blocking), `PipelineSafetyOrchestratorEngine` with 6-dimension `RiskDimension[]` JSON |
| 10 | Dynamic Tool Discovery | `DispatcherMapEngine.searchActions(query)` + `fuzzyResolver.ts` with 100+ aliases + MCP annotations |
| 12 | Parallel Multi-Engine Feasibility | `ParallelCallPlannerEngine` + `agent_parallel`/`swarm_parallel` + feasibility agent with 7 engines defined |
| 14 | Query Complexity Routing | `effortTiers.ts` with exhaustive compile-time mapping of every action to max/high/medium/low |
| 16 | Outcome Feedback Loop | `PredictionCalibrationEngine` (Bayesian kc1.1/Taylor updating), `StrategyRankingUpdateEngine` (Wilson scores), `ProvenPipelineOrchestratorEngine` |
| 22 | Agent-as-Tool | `orchestrationDispatcher` with `agent_execute` action, `AgentExecutor.executeAgent()` |
| 26 | Checkpoint/Rollback | `PipelineCheckpointManager` with `checkpoint()`/`resumeFrom()`, `sessionDispatcher` with `state_checkpoint`/`state_rollback`, `WorkpieceStateEngine.rollback(toOp)` |
| 27 | Token Usage Monitoring | `SessionTokenLedgerEngine` (burn rate, exhaustion prediction), `ToolCallThrottleEngine`, `ContextBudgetEngine`, `DiffTokenEstimatorEngine` |
| (4 partial) | Debate/Consensus | `UnifiedPhysicsVerifierEngine` (5 independent physics paths), `swarm_consensus` action, `AlgorithmGatewayEngine` (multi-algorithm voting) — exists as multi-path consensus, not adversarial debate |

### 7 CONFIRMED GAPS (genuinely missing)

| # | Gap | Evidence | Impact | Effort |
|---|-----|----------|--------|--------|
| **7** | **Semantic Knowledge RAG** | 3,700+ tribal tips searched only by `String.includes()`. No embeddings, no vector store, no semantic search | HIGH — "how to reduce chatter on thin walls" can't find tips tagged as "vibration_dynamics" unless exact keywords | XL (~2,000+ LOC) |
| **11** | **Inter-step validation gates** | `InferenceChainEngine` passes `{{previous_output}}` as raw text with zero validation between steps | HIGH — hallucinated values propagate unchecked through multi-step chains | M (~200-400 LOC) |
| **18** | **Semantic memory with embeddings** | `MemoryGraphEngine.find_similar` uses string matching on tags, not semantic similarity | MEDIUM — can't find "similar past jobs" semantically | XL (~2,000+ LOC) |
| **20** | **Scoped state prefixes** | State stored as flat files in `state/` directory, no `user:/app:/temp:` namespacing | LOW — state key collisions in multi-operator environments | S (~80-150 LOC) |
| **21** | **A2A Agent Card** | Has `/.well-known/mcp.json` (MCP discovery), not `/.well-known/agent.json` (A2A protocol) | MEDIUM — blocks multi-agent ecosystem integration | S (~50-100 LOC) |
| **23** | **Shared state protocol** | No real-time shared state between subagents during pipeline execution. Only file system and results map on completion | MEDIUM — coordinator must relay all data between subagents | L (~500-800 LOC) |
| **6** | **Semantic Router** | All routing is string-based (exact, alias, Levenshtein). No embedding-based intent classification | MEDIUM — "my part is chattering" can't route to VibrationDiagEngine | L (~800-1,500 LOC) |

### 10 PARTIAL GAPS (something exists, pattern adds value)

| # | Gap | What Exists | What's Specifically Missing | ROI |
|---|-----|-------------|---------------------------|-----|
| **1** | Generator-Critic Loop | Multi-path physics verification (5 paths) | No adversarial LLM critic that challenges calculations before returning to user | 3.67 |
| **5** | Operator Escalation | `AtomicValue.confidence` tracked everywhere | No approval gate triggered by low confidence — confidence is reported but not used as decision gate | 4.67 |
| **8** | Goal-Driven Orchestration | `AutoPilotV2`, agent executor, task classifier | No freeform "achieve this manufacturing goal" tool with SMART criteria | 2.20 |
| **9** | Context Engineering | Engine-level auto-injection (`autoCalcPreEnrich`) | Not at InferenceChainEngine step level — chain steps don't get auto-injected domain knowledge | 2.67 |
| **13** | Deterministic Query Filtering | Zod schemas, input validation middleware | No standardized filtering/sorting/pagination language for data-returning tools | 4.00 |
| **15** | Batch Meta-Tool | `CompoundActions`, `ParallelCallPlanner` | No generic `prism_batch` accepting arbitrary `{dispatcher, action, params}[]` arrays | 3.33 |
| **17** | Playbook Rule Evolution | Wilson scores for strategy rankings | Playbook rules have static `EvidenceLevel`, don't evolve from outcomes | 2.20 |
| **19** | Auto Memory Extraction | `MemoryGraphEngine` captures events automatically | Meaning/insights not synthesized — captures DECISION/OUTCOME nodes but not "lessons learned" | 3.00 |
| **24** | Trajectory Evaluation | `TelemetryEngine` records all invocations | No expected trajectory definition to compare against actual execution | 3.00 |
| **25** | User-Reviewable Plans | `plan_create`/`plan_execute` in orchestration | Plans returned as JSON, no artifact/review/approve UX using MCP elicitation | 3.67 |

---

## Safety-Specific Findings

### P0 Issues (prevent physical harm)

**1. No operator confirmation gate for G-code output**
- Safety hooks validate parameter bounds (RPM < 60000, force < 100kN) but cannot validate context (is the right tool loaded? is the part clamped correctly? is the work offset probed?)
- No mandatory pause between PRISM recommendation and machine execution
- **Fix**: Add HITL gate for G-code output with structured operator checklist

**2. Cross-field physics missing medium/hard material checks**
- `crossFieldPhysics.ts` CHECK 1 only fires for `superalloy` and `soft` material classes
- No checks for `medium` or `hard` — the most common materials in job shops (4140, 1045, 304SS)
- **Fix**: Add force plausibility ranges: medium (Fc 1000-8000N), hard (Fc 2000-15000N)

### P1 Issues

**3. Machine limits optional in safety calcs**
- `machineLimitGuard` only fires if `machineLimits` is in context (optional)
- Without it, only generic 60,000 RPM cap applies — a 25K RPM rec on a 10K RPM machine passes
- **Fix**: Make machine limits required or emit "NOT MACHINE-VALIDATED" warning

**4. No calculation audit trail**
- `auditLog.ts` logs API metadata but not calculation inputs/outputs
- Cannot determine post-incident what material was selected, what physics ran, what safety score was computed
- **Fix**: Log full input/intermediate/output for safety-critical calculations

### Bypass Paths Found

| Bypass | Risk | Location |
|--------|------|----------|
| Auth disabled = full admin | HIGH | `authMiddleware.ts` line 66-78: `PRISM_AUTH_ENABLED=false` grants admin to everyone |
| STDIO = auto-admin | MEDIUM | `authMiddleware.ts` line 225-235: `createStdioAuthContext()` grants admin |
| Safety hooks can be disabled | HIGH | All hooks in `SafetyQualityHooks.ts` have `enabled` property — no guard against disabling safety hooks |
| Cross-field physics opt-in | MEDIUM | `validateCrossFieldPhysics()` must be explicitly called — not auto-fired on every calculation |
| No schema = pass-through | MEDIUM | `actionParamValidator.ts` line 60-62: actions without Zod schema get zero validation |
| Unknown materials = no validation | MEDIUM | `materialSanity.ts` line 99: `if (materialClass === null) return;` — unknown materials skip all checks |

---

## MCP Protocol Assessment

### Feature Completeness (15 features assessed)

| Feature | Rating | Notes |
|---------|--------|-------|
| Client-Server Architecture | FULL | JSON-RPC 2.0 over STDIO and Streamable HTTP |
| Tools | FULL | 67 dispatchers, 2474+ actions |
| Resources | FULL | 1 static + 4 URI-templated (machine, material, tool, alarm) |
| Prompts | FULL | 7 prompts (speed-feed, quote-job, cnc-simulate, feasibility-check, machining-playbook, alarm-decode, tool-select) |
| Dynamic Discovery | FULL | `/.well-known/mcp.json` endpoint |
| Authentication | FULL | OAuth 2.1 + PKCE, 4-role RBAC |
| Error Handling | FULL | Structured JSON errors with codes/hints |
| Transport: STDIO | FULL | Default transport |
| Transport: Streamable HTTP | FULL | POST /mcp with JSON-RPC |
| Transport: SSE | PARTIAL | Explicitly 405'd at GET /mcp |
| Tool Descriptions | FULL | Annotations with readOnly/destructive/idempotent/openWorld |
| Agent-Friendly Data | FULL | All JSON, no binary/PDF |
| Deterministic Filtering | FULL | 25-result cap, prefix matching, priority sorting |
| Local vs Remote | FULL | STDIO for local, HTTP for remote |
| On-Demand vs Batch | FULL | `PRISM_QUICK_CONFIG` (10 turns) and `PRISM_BATCH_CONFIG` (30 turns) |

### Top 5 Protocol Improvements

1. **Action-level completions** — `prism_calc` has 1130+ actions but no autocomplete on the `action` parameter
2. **Resource list callbacks** — All 4 dynamic resources have `list: undefined` — can't browse machines/materials/tools
3. **A2A Agent Card** — `/.well-known/agent.json` with skills mapped from 5 subagents
4. **SSE transport** — Needed for A2A `sendTaskSubscribe` streaming
5. **Dynamic model routing** — `costPriority`/`speedPriority`/`intelligencePriority` defined but no dynamic routing logic

---

## Testing/Evaluation Gaps

### P0 Gaps

**Trajectory Evaluation** — PRISM tests individual engine outputs but never validates the sequence of engine calls orchestrators produce. If `SpeedFeedOrchestratorEngine` skips the safety check step, unit tests on the final output might still pass.

**Golden Baseline Drift Detection** — No snapshot comparison across releases. When material data is updated or a formula is refined, no automated check that speed/feed recommendations stayed within tolerance.

### Proposed Test Patterns (concrete vitest code designed by Testing Expert)

1. **Published data accuracy tests** — Compare PRISM predictions against Sandvik/Walter/Kennametal catalog values (tolerance: +/-15%)
2. **Trajectory evaluation tests** — Define expected engine call sequences, verify orchestrators follow them
3. **Golden baseline drift tests** — Versioned output snapshots, alert on drift beyond tolerance
4. **Safety combinatorial fuzz tests** — Randomized parameter combinations near boundaries, verify safety gates never pass dangerous values

---

## Concrete TypeScript Interfaces (designed by Code Architect)

The Architect read both the book's code examples and PRISM's source to produce interfaces that follow PRISM's conventions. Key designs:

### 1. CriticStep (Generator-Critic Loop)
- Add to: `src/engines/InferenceChainEngine.ts`
- Types: `CriticStep`, `CriticIterationResult`, `CriticStepResult`
- Integration: Optional `critic?: CriticStep` field on existing `ChainStep`

### 2. FallbackChain (Structured Fallback)
- Add to: New `src/orchestration/FallbackChain.ts`
- Types: `FallbackStrategy`, `FallbackChainConfig`, `FallbackChainResult`
- Integration: Wire into `RecoveryHooks.ts` and AutoPilot EXECUTE phase

### 3. SemanticRouter (Embedding-based Routing)
- Add to: New `src/tools/SemanticRouter.ts`
- Types: `SemanticRoute`, `SemanticRouterConfig`, `SemanticMatch`
- Integration: Insert before Levenshtein step in `fuzzyResolver.ts`

### 4. GoalOrchestrator (Goal-Driven Orchestration)
- Add to: New `src/orchestration/GoalOrchestrator.ts`
- Types: `SubGoal`, `Goal`, `GoalOrchestratorConfig`, `GoalOrchestrationResult`
- Integration: Optional `goal?` field in `AutoPilotConfig`

### 5. PolicyEvaluation (Safety Callbacks)
- Add to: `src/hooks/SafetyQualityHooks.ts` or new `PolicyGate.ts`
- Types: `PolicyEvaluation`, `BeforeEngineCallback`, `PolicyGateRegistry`
- Integration: New `HookPhase: "pre-engine-policy"`, insert before engine dispatch

### 6. AgentCard (A2A)
- Add to: `src/mcp/agentConfig.ts`
- Types: `AgentCard`, `AgentSkill`, `AgentCapabilities`
- Integration: Add `/.well-known/agent.json` route, build from existing `PRISM_SUBAGENTS`

### 7. BatchTool (Batch Meta-Tool)
- Add to: `src/mcp/taskTools.ts` or new `src/tools/BatchTool.ts`
- Types: `BatchItem`, `BatchConfig`, `BatchResult`
- Integration: Register `prism_batch` MCP tool, wire to existing BATCH hooks

### 8. ChainStepValidator (Inter-step Validation)
- Add to: `src/engines/InferenceChainEngine.ts`
- Types: `ChainStepValidator`, `StepValidationResult`
- Integration: Optional `validator?` field on `ChainStep`, post-step validation in `runInferenceChain()`

### 9. AgentTool (Agent-as-Tool)
- Add to: `src/mcp/agentConfig.ts`
- Types: `AgentTool`, `AgentToolResult`
- Integration: Register 5 new MCP tools from `buildAgentTools()` — one per subagent

### 10. FeedbackRecord (Outcome Feedback)
- Add to: New `src/engines/FeedbackEngine.ts`
- Types: `FeedbackRecord`, `FeedbackQuery`, `FeedbackEngineConfig`
- Integration: Auto-record from AutoPilot RALPH phase and InferenceChain completions

---

## Multi-Agent Architecture Blueprint

### Proposed 3-Level Hierarchy

```
Level 1: Manufacturing Planner (Opus)
  - Decomposes jobs into setups and operations
  - Monitors SMART goals
  - Handles adaptive replanning
  |
  +-- Level 2: Setup Agent (Sonnet) [one per setup, parallel when independent]
       - Coordinates L3 agents within a setup
       - Handles operation sequencing
       - Manages workpiece state transitions
       |
       +-- Level 3: Calculation Agents (Haiku/Sonnet) [parallel within operation]
            - Physics Agent: Kienzle, Taylor, stability, thermal
            - Safety Agent: limits, vetoes, risk assessment
            - Quality Agent: surface finish, tolerance, Cpk
            - CAM Agent: strategy selection, toolpath planning
```

### Conflict Resolution Protocol (4-step escalation)

1. **Constraint Intersection** — automatic: find overlapping safe parameter ranges
2. **Priority-Weighted Consensus** — safety weight 3.0, quality 2.0, physics 1.5, CAM 1.0; threshold 0.67
3. **Safety-First Override** — if no consensus, accept Safety agent's recommendation, flag for review
4. **Human Escalation** — pause execution, present all agent positions to operator

### Communication Mechanisms

1. **Shared Session State** — typed keys: `{level}:{setup}:{op}:{field}`
2. **Event Bus** — typed `agent.*` events with correlation IDs
3. **Message Passing** — structured `OperationHandoffMessage` for sequential chains

Blueprint file: `H:/prism/mcp-server/src/architecture/MULTI_AGENT_BLUEPRINT.ts` (730 lines, 0 TS errors)

---

## Memory & Learning Architecture

### Current Memory Taxonomy

| Layer | What | Engine(s) | Storage |
|-------|------|-----------|---------|
| Ephemeral | Current session state, WIP, context | `sessionDispatcher` (42 actions) | `state/` files |
| Cross-Session | Decision graph, outcomes, patterns | `MemoryGraphEngine` (WAL-backed JSONL) | `state/memory_graph/` |
| Static Knowledge | Tribal tips, playbook rules, formulas | 3 knowledge engines | TypeScript arrays |
| Learning | Bayesian model calibration | `PredictionCalibrationEngine`, `StrategyRankingUpdateEngine` | `state/calibration/` |

### #1 Gap: Zero Embedding Infrastructure

Every knowledge search across 1,245 engines uses `String.includes()` substring matching. No vector store, no embeddings, no semantic search anywhere.

**Proposed Solution**: Local embeddings with zero external infrastructure:
- `@xenova/transformers` for embedding generation (runs in-process, no API calls)
- `better-sqlite3` with virtual table for vector similarity search
- Embed: tribal tips (3,700+), playbook rules (296), formulas (499), OCR'd manual chunks
- Chunking strategy: one tip = one chunk, manual content chunked at section boundaries

### Learning Loop Design

```
Operator reports outcome (actual tool life, surface finish, cycle time)
  -> FeedbackRecord stored in memory graph
    -> PredictionCalibrationEngine updates Bayesian priors (kc1.1, Taylor C/n)
    -> StrategyRankingUpdateEngine adjusts Wilson scores
    -> [NEW] PlaybookRuleTracker updates rule confidence (Beta distribution)
    -> [NEW] Auto-extraction synthesizes "lessons learned" as new tribal tips
```

Architecture file: `C:/tmp/PRISM-MEMORY-LEARNING-ARCHITECTURE.md`

---

## Dependency Chains

### Chain A: Safety Pipeline (highest ROI cluster)
```
PolicyEvaluation type (#3 — already exists, standardize)
  ├── Operator Escalation Policies (#5) — ROI 4.67
  ├── Debate/Consensus for Safety (#4) — ROI 3.25
  └── User-Reviewable Plans (#25) — ROI 3.67
```

### Chain B: Embedding Infrastructure (unlocks 3 improvements)
```
Embedding Infrastructure (new foundation, ~500 LOC)
  ├── Semantic Router (#6) — ROI 1.67
  ├── Semantic Knowledge RAG (#7) — ROI 1.71
  └── Semantic Memory (#18) — ROI 1.29
```

### Chain C: Feedback-Learning Pipeline
```
Outcome Feedback Loop (#16 — already exists)
  └── Playbook Rule Evolution (#17) — ROI 2.20
       └── Auto Memory Extraction (#19) — ROI 3.00
```

### Chain D: Ecosystem / A2A
```
A2A Agent Card (#21) — ROI 3.00
  ├── Agent-as-Tool (#22 — already exists)
  └── Shared State Protocol (#23) — ROI 1.40
```

---

## ROI-Ranked Implementation Table

| Rank | # | Improvement | Effort | Risk | Mfg Impact (1-5) | ROI Score | Skeptic Verdict |
|------|---|------------|--------|------|-------------------|-----------|-----------------|
| 1 | 3 | Before-Engine Safety Callbacks | S | LOW | 5 | **6.50** | FALSE_POSITIVE (standardize existing) |
| 2 | 5 | Operator Escalation Policies | M | LOW | 5 | **4.67** | PARTIAL |
| 3 | 13 | Deterministic Query Filtering | S | LOW | 2 | **4.00** | PARTIAL |
| 4 | 1 | Generator-Critic Loop | M | LOW | 4 | **3.67** | PARTIAL |
| 5 | 11 | Inter-step Validation Gates | M | LOW | 4 | **3.67** | CONFIRMED_GAP |
| 6 | 25 | User-Reviewable Plans | M | LOW | 4 | **3.67** | PARTIAL |
| 7 | 2 | Structured Fallback Chains | M | MED | 5 | **3.50** | FALSE_POSITIVE |
| 8 | 15 | Batch Meta-Tool | M | LOW | 3 | **3.33** | PARTIAL |
| 9 | 4 | Debate/Consensus for Safety | M | MED | 5 | **3.25** | PARTIAL |
| 10 | 16 | Outcome Feedback Loop | M | MED | 5 | **3.25** | FALSE_POSITIVE |
| 11 | 19 | Auto Memory Extraction | M | LOW | 3 | **3.00** | PARTIAL |
| 12 | 21 | A2A Agent Card | S | LOW | 1 | **3.00** | CONFIRMED_GAP |
| 13 | 24 | Trajectory Evaluation | M | LOW | 3 | **3.00** | PARTIAL |
| 14 | 27 | Token Usage Monitoring | S | LOW | 1 | **3.00** | FALSE_POSITIVE |
| 15 | 12 | Parallel Multi-Engine Feasibility | M | MED | 4 | **2.75** | FALSE_POSITIVE |
| 16 | 9 | Context Engineering | M | LOW | 2 | **2.67** | PARTIAL |
| 17 | 14 | Query Complexity Routing | M | LOW | 2 | **2.67** | FALSE_POSITIVE |
| 18 | 22 | Agent-as-Tool | M | LOW | 2 | **2.67** | FALSE_POSITIVE |
| 19 | 20 | Scoped State Prefixes | S | LOW | 1 | **2.50** | CONFIRMED_GAP |
| 20 | 10 | Dynamic Tool Discovery | M | LOW | 2 | **2.33** | FALSE_POSITIVE |
| 21 | 26 | Checkpoint/Rollback | M | MED | 3 | **2.25** | FALSE_POSITIVE |
| 22 | 8 | Goal-Driven Orchestration | L | MED | 4 | **2.20** | PARTIAL |
| 23 | 17 | Playbook Rule Evolution | L | MED | 4 | **2.20** | PARTIAL |
| 24 | 7 | Semantic Knowledge RAG | XL | HIGH | 4 | **1.71** | CONFIRMED_GAP |
| 25 | 6 | Semantic Router | L | HIGH | 3 | **1.67** | CONFIRMED_GAP |
| 26 | 23 | Shared State Protocol | L | MED | 2 | **1.40** | CONFIRMED_GAP |
| 27 | 18 | Semantic Memory w/ Embeddings | XL | HIGH | 3 | **1.29** | CONFIRMED_GAP |

---

## Implementation Sprints

### Sprint 1: Safety P0s + Quick Wins (~400 LOC, ~1 week)

| Item | What | Est LOC |
|---|---|---|
| SAFETY-P0a | Operator confirmation gate for G-code output with structured checklist | 100 |
| SAFETY-P0b | Extend `crossFieldPhysics.ts` with force ranges for medium and hard materials | 30 |
| SAFETY-P1a | Make machine limits required (or emit "NOT MACHINE-VALIDATED" warning) | 50 |
| #5 | Confidence-based operator escalation policies (`EscalationPolicyEngine`) | 80 |
| #21 | A2A Agent Card at `/.well-known/agent.json` (built from `PRISM_SUBAGENTS`) | 60 |
| #20 | Scoped state prefixes (`user:/app:/temp:`) | 80 |
| MCP-1 | Action-level completions for tool input `action` parameter | 100 |

### Sprint 2: Chain Quality + MCP Protocol (~800 LOC, ~1-2 weeks)

| Item | What | Est LOC |
|---|---|---|
| #11 | Inter-step validation gates in `InferenceChainEngine` (`ChainStepValidator`) | 250 |
| #1 | Generator-Critic loop (`CriticStep` on `ChainStep`) | 300 |
| #25 | User-reviewable machining plans using MCP elicitation for approve/modify | 150 |
| #15 | Batch meta-tool (`prism_batch` accepting `{dispatcher, action, params}[]`) | 200 |
| MCP-2 | Resource list callbacks with cursor-based pagination | 150 |

### Sprint 3: Testing/Evaluation Foundation (~600 LOC, ~1 week)

| Item | What | Est LOC |
|---|---|---|
| TEST-P0a | Trajectory evaluation — `TrajectoryRecorder` + expected trajectory definitions | 200 |
| TEST-P0b | Golden baseline drift detection — versioned output snapshots | 150 |
| TEST-P1a | Published data accuracy tests (vs Sandvik/Walter catalogs) | 100 |
| TEST-P1b | Safety combinatorial fuzz tests (randomized edge cases) | 150 |

### Sprint 4: Learning Loop (~1,000 LOC, ~2 weeks)

| Item | What | Est LOC |
|---|---|---|
| #17 | Playbook rule confidence evolution (Beta distribution tracker) | 400 |
| #19 | Auto memory extraction from sessions (using SamplingWorkflowEngine) | 300 |
| #24 | Trajectory evaluation — expected vs actual engine call sequences | 300 |

### Sprint 5: Embedding Infrastructure (deferred, ~3,000 LOC, ~3-4 weeks)

| Item | What | Est LOC |
|---|---|---|
| EMBED | `@xenova/transformers` + `better-sqlite3` local embedding foundation | 500 |
| #7 | Semantic Knowledge RAG — vectorize 3,700+ tribal tips + manual chunks | 1,000 |
| #6 | Semantic Router — embedding-based intent routing for 2,700+ actions | 800 |
| #18 | Semantic memory — vector-indexed past decisions and outcomes | 700 |

### Sprint 6: Multi-Agent Architecture (future, ~8,200 LOC, ~10+ sessions)

| Item | What | Est LOC |
|---|---|---|
| L1-L3 | 3-level agent hierarchy (Planner -> Setup -> Calc) | 3,000 |
| Conflict | Conflict resolution protocol (4-step escalation) | 1,500 |
| Goals | SMART goal monitoring per operation | 1,200 |
| #23 | Shared state protocol between subagents | 800 |
| #4 | Debate/consensus for safety decisions | 500 |
| A2A | External agent integration (ERP, CAM, machine monitor) | 1,200 |

---

## Artifacts Produced

| Artifact | Location | Size |
|----------|----------|------|
| Pattern Catalog (47 patterns, 12 categories) | `C:/tmp/agentic-patterns/PATTERN_CATALOG.md` | ~15K |
| Integration Plan (dependency graph, wiring, waves) | `H:/prism/mcp-server/INTEGRATION_PLAN_27_IMPROVEMENTS.md` | ~20K |
| Multi-Agent Blueprint (typed, 0 TS errors) | `H:/prism/mcp-server/src/architecture/MULTI_AGENT_BLUEPRINT.ts` | 730 lines |
| Memory/Learning Architecture | `C:/tmp/PRISM-MEMORY-LEARNING-ARCHITECTURE.md` | ~12K |
| Extracted book chapters (all 21) | `C:/tmp/agentic-patterns/chapter_*.txt` | ~400K total |
| This document | `H:/prism/AGENTIC-PATTERNS-ROADMAP.md` | ~30K |

---

## Book's 3 Strongest Warnings (applicable to PRISM)

1. **"Don't just wrap legacy APIs"** (Ch 10) — Add deterministic filtering/sorting/pagination to data tools. The LLM should never sift through 500 catalog entries.
2. **"Agents don't magically replace deterministic workflows"** (Ch 10) — Physics engines should do the heavy lifting deterministically. The LLM orchestrates and interprets.
3. **"Messy systems + agents = plausible, confident garbage"** (Foreword) — Clean data, consistent metadata, well-defined APIs are prerequisites. PRISM's typed schemas are strong; tribal tips and OCR'd manuals need structuring.

---

*Generated by 10-agent team analysis of "Agentic Design Patterns" (Gulli, 2025) against PRISM MCP Server v7.0.0*
*Total agent compute: ~256K tool calls, ~1.2M tokens, ~55 minutes wall clock across 13 parallel agents (3 breadth + 10 scrutiny)*

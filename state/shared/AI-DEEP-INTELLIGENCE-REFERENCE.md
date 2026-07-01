---
title: PRISM AI Deep Intelligence Reference
generated_by: H:/prism/.claude/hooks/ai-deep-intelligence.mjs (extracted 2026-05-19)
status: STATIC — counts may be stale, see live sources below
authoritative_counts: H:/prism/PRISM-INVENTORY-LATEST.md + state/shared/BUILD_STATE.json
---

# PRISM AI Deep Intelligence — operator reference card

> ⚠️ **STATIC SNAPSHOT — extracted 2026-05-19. EVERY count + extracted-list below is FROZEN at that date and will rot.**
>
> For LIVE numbers always read these instead:
> - Engines / dispatchers / hooks → `PRISM-INVENTORY-LATEST.md`
> - Wired / unwired / pending → `state/shared/BUILD_STATE.md`
> - Tribal tips / wiki entries → `state/shared/CLAUDE-BRIEF.md` (auto-regenerated)
> - Extraction log → `mcp-server/data/state/extraction-log.json`
>
> The non-numeric content (engine roles, slash command triggers, mandatory rules, reasoning modes) is the stable part of this reference and is safe to read at face value.
>
> Origin: extracted from the SessionStart inject body by [GOLF]/U-WAVE2 — see
> [SESSIONSTART-HOOK-AUDIT-2026-05-19.md](specs/SESSIONSTART-HOOK-AUDIT-2026-05-19.md).
> The `ai-deep-intelligence.mjs` hook now emits a pointer at this file; agents Read it on demand.
> Refresh: re-extract from live sources cited above + edit this file directly. There is no auto-regen.

## Meta-AI Orchestration (Near-AGI)

| Engine | Role | Key Capabilities |
|--------|------|------------------|
| MetaAIOrchestrationEngine | Unified orchestration of 150+ AI engines | metacognition, analogical transfer, continuous learning, meta-learning |
| AIAutoUtilizationEngine | Automatic capability detection & invocation | 25+ capabilities mapped, context-aware command suggestions, multi-command sequence planning |

## Core Reasoning Engines

| Engine | Modes | Actions |
|--------|-------|---------|
| DeepAIIntelligenceEngine | chain_of_thought, tree_of_thought, multi_path, backtracking, abductive, deductive, inductive, analogical | `prism_ai:deep_reason`, `prism_ai:extended_think` |
| TreeOfThoughtEngine | bfs, dfs, best_first | branch_scoring, pruning, backtracking, tribal_integration |
| CounterfactualReasoningEngine | what_if, causal_graphs, root_cause | intervention_planning |
| HypothesisRankerEngine | bayesian_updates, evidence_scoring | confidence_intervals |
| CrossDisciplinaryDeepLearningEngine | 15 domains, 120 formulas | `prism_ai:cross_domain_reason`, `prism_ai:cross_domain_apply` |
| PRISMCreativeReasoningEngine | conventional, exploratory, unconventional, hybrid, innovative, optimal | `prism_ai:creative_explore` |
| NeuralIntegrationEngine | auto-route to engines, recommend commands, synthesize | `route`, `recommendCommands`, `synthesize` |
| AISystemSynchronizerEngine | sync deepReasoning, crossDisciplinary, tribalKnowledge, selfAwareness | — |
| DuplicationGuardEngine | **MANDATORY before creating** | `mustCheckBeforeCreating`, `mustNotReExtract`, `isExtractionCompleted` |

## Critical Slash Commands (use proactively)

| Command | Triggers | Purpose |
|---------|----------|---------|
| `/pdf-learn` | pdf, document, manual, catalog, paper | Extract PDF knowledge → tribal tips/formulas |
| `/video-learn` | video, youtube, tutorial, training video | Extract video knowledge → procedures/tips |
| `/forge-triple` | forge, create engine, build engine | Create engines + skills + hooks (EXHAUSTIVE) |
| `/shop-knowledge` | tribal, shop floor, operator, wisdom | Extract tribal knowledge |
| `/dedup` | duplicate, dedup, redundant | ALWAYS check before creating new assets |
| `/machine-harden` | harden, hardening, strengthen | Harden machine-specific AI |
| `/wire-edm-studio` | wire edm, wedm, wire cut | Wire EDM programming studio |
| `/lathe-studio` | lathe, turning | Lathe programming studio |
| `/program-optimize` | optimize program, faster program | Optimize CNC programs |
| `/auto-speed-feed` | speed feed, speeds and feeds | Auto-calculate optimal speed/feed |
| `/scrutinize` | scrutinize, deep review, audit code | Deep code scrutiny |
| `/quote-to-ship` | quote, estimate, job, order, ship | Full quote-to-ship pipeline |
| `/smart` | smart, ai, intelligent, auto | Smart AI-powered task routing |

Live list: `.claude/commands/*.md` + `~/.claude/commands/*.md`. Auto-trigger hook surfaces top-3 on every prompt — see `.claude/hooks/skill-auto-trigger.mjs`.

## Mandatory Rules

1. ALWAYS call `duplicationGuardEngine.mustCheckBeforeCreating()` — THROWS if duplicate
2. ALWAYS call `duplicationGuardEngine.mustNotReExtract()` — THROWS if already extracted
3. Check `mcp-server/data/state/extraction-log.json` before `/pdf-learn` / `/video-learn`
4. ALL extractions flow to categorized tribal knowledge
5. Use existing engines — don't rebuild what exists
6. Suggest slash commands when triggers detected
7. Use deep reasoning for complex problems
8. Apply metacognition for self-monitoring

## Hard-Block Methods (THROW on violation)

```js
duplicationGuardEngine.mustCheckBeforeCreating(type, name, desc)  // blocks if duplicate
duplicationGuardEngine.mustNotReExtract(sourceId)                  // blocks if already extracted
duplicationGuardEngine.isExtractionCompleted(sourceId)             // returns extraction or null
```

## Already Extracted (DO NOT RE-EXTRACT)

⚠️ **STATIC — 2026-05-19 snapshot. Live authoritative list: `mcp-server/data/state/extraction-log.json`. Counts below WILL rot — confirm against the log before treating any source as "already-extracted".**
- Mastercam docs: 45 tips
- hyperMILL manual: 25 tips
- Okuma OSP programs: 63 tips
- Siemens SINUMERIK: 18 tips
- Fanuc programming: 35 tips
- Haas programming: 28 tips
- Titans of CNC: 42 procedures
- JM DIE programs: 24,545 indexed

## Tribal Knowledge Access

```
prism_knowledge:tribal_search OR TribalKnowledgeAdvisorEngine.search(query)
```

Categories: machining_physics, tool_selection, speed_feed, workholding, surface_finish,
threading, grooving, drilling, boring, coolant, chip_control, vibration, wear,
failure_prevention.

## Resources Awareness

Live folder index: `state/shared/RESOURCES-INDEX.json`.

Key folders:
- HYPERMILL — 36,000 lines CAM scripts
- MIT COURSES — 227 courses, algorithms
- MACHINING KNOWLEDGE FORMULAS — Physics models
- MANUFACTURER_CATALOGS — Sandvik, Kennametal, etc.
- MACHINE_SIMULATION_MODELS — VMC, HMC, lathe
- FUSION360 — Post processors, add-ins
- MANUALS — Machine and tool manuals

## JM DIE (test shop)

| Metric | Value |
|--------|-------|
| Programs | 24,545 |
| Customers | 100+ |
| Machine types | CNC LATHE, CNC MILL HAAS, WIRE EDM, OKUMA, CNC LATHE OKUMA |
| API | `prismSelfAwarenessEngine.getJMDieCustomerPath(customer)` |

Live API + counts: `mcp-server/src/data/jm-die-profile.ts`.

## Reasoning Modes (12 available)

`chain_of_thought` · `tree_of_thought` · `counterfactual` · `hypothesis_ranking` · `analogical` · `temporal` · `causal` · `abductive` · `deductive` · `inductive` · `creative` · `cross_domain`

# Resource Learning Hardening Roadmap

Generated: 2026-03-29

## MCP FULL UTILIZATION PROTOCOL (MANDATORY — applies to EVERY session)

```
SESSION START:  prism_session:context_boot → dispatcher_map → memory_recall → system_snapshot → action_search "<goal>"
DURING WORK:    prism_session:auto_checkpoint (every 5-10 calls) → action_search → tool_route_best → wip_capture
SESSION END:    prism_session:memory_save → system_snapshot → checkpoint_enhanced
PLUGINS:        mcp__vitest__run_tests | mcp__eslint__lint-files | codebase-memory-mcp search_graph
FEATURE CASCADE: Read SESSION_ARTIFACTS.json at start → write via PostCompact hook at end
CONTEXT RETAIN: .compaction-survival.md + HANDOFF.md + SVI-compact.md + MEMORY.md (all auto-synced)
```

## Canonical Note

This is a subordinate side-roadmap under:

- `C:\PRISM\CAMX-RESTRUCTURED-ROADMAP-v24.md`
- `C:\PRISM\mcp-server\data\docs\roadmap\TRIBAL-KNOWLEDGE-PROPAGATION-ROADMAP.md`

It does not replace either document. Its purpose is narrower:

- turn PRISM's PDF, video, handbook, course, catalog, and simulation-asset corpus into validated, production-consumed knowledge

## Why This Exists

PRISM already has:

- document extraction
- learning and course routes
- handbook extraction and handbook acquisition engines
- video-learning and video-action extraction engines
- formula and algorithm engines
- federated-learning and learning-progression engines
- large active, archive, and Box resource corpora

The main gap is not absence of engines. It is the lack of one canonical spine that converts raw resources into normalized knowledge objects, then into formulas, algorithms, workflow logic, skills, hooks, scripts, and product surfaces.

## Inputs

### Active repo foundation

- `C:\PRISM\mcp-server\src\routes\learning.ts`
- `C:\PRISM\mcp-server\src\routes\presets-learning.ts`
- `C:\PRISM\mcp-server\src\routes\doc.ts`
- `C:\PRISM\mcp-server\src\tools\dispatchers\documentLearningDispatcher.ts`
- `C:\PRISM\mcp-server\src\engines\HandbookAcquisitionPipelineEngine.ts`
- `C:\PRISM\mcp-server\src\engines\HandbookExtractionEngine.ts`
- `C:\PRISM\mcp-server\src\engines\MachineHandbookRegistryEngine.ts`
- `C:\PRISM\mcp-server\src\engines\VideoLearningEngine.ts`
- `C:\PRISM\mcp-server\src\engines\VideoActionExtractorEngine.ts`
- `C:\PRISM\mcp-server\src\engines\PDFBlueprintDimensionExtractorEngine.ts`
- `C:\PRISM\mcp-server\src\engines\AIMLFormulasEngine.ts`
- `C:\PRISM\mcp-server\src\engines\OptimizationFormulasEngine.ts`
- `C:\PRISM\mcp-server\src\engines\AlgorithmEngine.ts`
- `C:\PRISM\mcp-server\src\engines\AlgorithmSelectorEngine.ts`
- `C:\PRISM\mcp-server\src\engines\LearningPathEngine.ts`
- `C:\PRISM\mcp-server\src\engines\LearningProgressionEngine.ts`
- `C:\PRISM\mcp-server\src\engines\CourseBuilderEngine.ts`
- `C:\PRISM\mcp-server\src\engines\FederatedLearningEngine.ts`

### Resource reservoirs

- `C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\MIT COURSES`
- `C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\RESOURCE PDFS`
- `C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\MANUFACTURER_CATALOGS`
- `C:\PRISM_ARCHIVE_2026-02-01\EXTRACTED`
- `C:\Users\Admin.DIGITALSTORM-PC\Box\PRISM\MIT COURSES`
- `C:\Users\Admin.DIGITALSTORM-PC\Box\PRISM\RESOURCE PDFS`
- `C:\Users\Admin.DIGITALSTORM-PC\Box\PRISM\MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION`
- `C:\Users\Admin.DIGITALSTORM-PC\Box\PRISM\TOOL HOLDER MODELS FOR LEARNING ENGINE`
- `C:\Users\Admin.DIGITALSTORM-PC\Box\PRISM\PART MODELS FOR LEARNING ENGINE`
- `C:\Users\Admin.DIGITALSTORM-PC\Box\PRISM\WORKHOLDING AND FIXTURE CATALOGS`

## Design Principles

1. Normalize once, consume everywhere.
2. Keep provenance, confidence, and source references attached.
3. Promote formulas and algorithms only through explicit validation.
4. Keep shop-local learning private by default.
5. Promote cross-shop learning only after review and federation rules.
6. Tie unconsumed knowledge back into SVI/Psi so the system can see stranded capability.

## Canonical Knowledge Object Targets

Every ingestion path should normalize into one or more of these object families:

- formula candidates
- algorithm candidates
- machine capability facts
- tooling rules
- setup rules
- alarm and troubleshooting rules
- maintenance rules
- material/process heuristics
- quoting and cost heuristics
- workflow procedures
- training modules
- simulation assets and geometry references

## Wave Plan

### LR-0 — Resource Census + Canonical Registry

Objectives:

- inventory all PDFs, videos, handbooks, course packs, catalogs, machine models, holder models, part models, and fixture catalogs
- assign provenance, domain, machine, material, process, and consumer tags
- record extraction status and validation state

Required outputs:

- canonical resource registry
- extraction queue
- gap report for orphaned resources

### LR-1 — Ingestion Normalization

Objectives:

- unify `pdf-learn`, `video-learn`, `handbook-learn`, and course ingestion behind one normalized contract
- standardize extracted outputs into typed knowledge objects

Required outputs:

- one canonical extraction result schema
- one promotion-ready knowledge object schema
- confidence and provenance rules

### LR-2 — Formula / Algorithm Extraction And Promotion

Objectives:

- auto-generate formula and algorithm candidates from validated resource facts
- feed candidates into canonical registries only after review

Required outputs:

- promotion queue into:
  - `FormulaRegistry`
  - `AlgorithmRegistry`
- reviewer workflow
- rollback posture for bad candidates

### LR-3 — Consumer Wiring

Objectives:

- route validated knowledge into live product consumers

Target consumers:

- quoting
- speed/feed
- setup sheets
- alarms and troubleshooting
- post processing
- inventory
- purchasing
- scheduling
- quality
- learning UI
- Program Release explainability

### LR-4 — Skill / Hook / Script Generation

Objectives:

- generate skills, hooks, and scripts from validated resource knowledge where it improves execution quality
- enforce forge-triple discipline for major learning-derived capability

Required outputs:

- generated skill candidates
- generated hook candidates
- generated helper-script candidates
- validation and rollback rules

### LR-5 — Cross-Shop Learning

Objectives:

- keep tenant-local learning private by default
- federate only reviewed patterns with enough confidence and generality
- tie adoption and non-adoption into SVI/Psi coverage reporting

Required outputs:

- local-vs-global promotion policy
- federation review posture
- SVI coverage hooks

### LR-6 — Simulation Asset Activation

Objectives:

- ingest machine, holder, part, and workholding models into active simulation and collision-aware workflows
- connect simulation asset posture to quoting confidence, setup review, and troubleshooting

Required outputs:

- asset registry
- asset-to-machine/tooling/workholding linkage
- Program Release and quote-confidence consumers

## Ownership Split

Until convergence:

- Claude owns backend ingestion, registries, promotion workflow, persistence, contracts, and event fanout
- Codex owns frontend explainability, review desks, confidence/source visibility, and consumer surfaces that can consume the normalized outputs

## Sequencing Rule

This roadmap is allowed to begin in audit/spec/registry form immediately.

Full rollout should follow the current convergence gate:

1. close the active backend/frontend tranche
2. finish the highest-value staged seam closures
3. then execute the heavier resource-learning rollout without fragmenting the current delivery lane

## Success Criteria

This side-roadmap is successful when:

- resource ingestion is canonical rather than fragmented
- validated extracted knowledge reaches production consumers
- formulas and algorithms promote through one reviewable path
- simulation assets are no longer stranded in archive/Box storage
- SVI/Psi can detect extracted-but-unconsumed knowledge as a coverage gap

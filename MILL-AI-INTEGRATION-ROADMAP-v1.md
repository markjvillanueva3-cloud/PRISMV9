# MILL-AI-INTEGRATION-ROADMAP-v1

**Scope:** Mill-specific AI integration roadmap coordinating with PRISM-wide roadmap (other chat).
**Generated:** 2026-04-15
**Authority:** /forge-audit findings (3 parallel agents) + PRISM-UNIFIED-ROADMAP-v2.md
**Target:** Omega = 1.0 for every milestone.

---

## AUDIT FINDINGS SUMMARY

### Agent 1 — Mill Engine Inventory
- 122 milling engines (73,378 LOC)
- 47 exported / 58 orphaned (48% export gap)
- 24 tested (19% coverage, 81% untested)
- 4 parallel orchestrators needing consolidation:
  - E1201: MillingAGIOrchestrationEngine
  - E1180: MillingUnifiedScienceOrchestrationEngine
  - E1165: MillingEndToEndOrchestrationEngine
  - E1142: MillingAGIMasterEngine

### Agent 2 — H-Drive Resource Inventory
- 533 Haas programs (58 customers)
- 1,621 HyperMill training files + 9 master PDF manuals
- 180 Fusion post processors
- 3,055 Okuma setups
- 1,873 HAAS-HURCO files
- 1,108 Roku-Roku files
- 30 STEP learning models
- 24,545 JM DIE programs (total)

### Agent 3 — Critical Integration Gaps
- G1: JM DIE 509 programs not wired to MillingAGI learning pipeline
- G2: Tool holder catalogs (7) not aggregated to registry
- G3: CAM post processors disconnected from AI
- G4: Tribal knowledge hardcoded (28 tips) instead of file-based
- G5: 40+ HyperMill engines orphaned
- G6: No dynamic engine registry
- G7: Mastercam post configs missing
- G8: Toolpath strategies hardcoded not registry-queried

---

## MILESTONES

### MILL-INTEG-MS0 — Resource Awareness Foundation
**Units:** 6 | **Omega:** 1.0 | **Priority:** P0-CRITICAL
- U1: Create MillResourceAwarenessEngine (new — aggregates H-drive mill resources)
- U2: Create ToolHolderRegistryEngine (new — aggregates 7 catalogs)
- U3: Create MillTribalKnowledgeEngine (new — file-based tribal tips)
- U4: Wire MillResourceAwarenessEngine into aiReasoningDispatcher (6 actions)
- U5: Wire ToolHolderRegistryEngine into toolingDispatcher (5 actions)
- U6: Wire MillTribalKnowledgeEngine into knowledgeDispatcher (5 actions)

### MILL-INTEG-MS1 — Orchestrator Consolidation
**Units:** 4 | **Omega:** 1.0 | **Priority:** P0-CRITICAL
- U1: Define orchestrator hierarchy (master → unified-science → AGI → end-to-end)
- U2: Route MillingAGIOrchestrationEngine to MillingAGIMasterEngine as sub-orchestrator
- U3: Consolidate redundant methods across 4 orchestrators (deduplicate calcs)
- U4: Single entry point: millingMasterOrchestrator.orchestrate(request) → routes all 4

### MILL-INTEG-MS2 — JM DIE Program Learning Pipeline
**Units:** 5 | **Omega:** 1.0 | **Priority:** P0-CRITICAL
- U1: Create MillProgramLearningEngine (new — ingests JM DIE mill programs)
- U2: Parse 533 Haas programs → tribal tips + strategy extraction
- U3: Parse 1,873 HAAS-HURCO files → feeds/speeds database
- U4: Parse 1,108 Roku-Roku files → precision finishing tips
- U5: Wire learning pipeline into MillingAGIMasterEngine with continuous update

### MILL-INTEG-MS3 — HyperMill Engine Export & Wiring
**Units:** 8 | **Omega:** 1.0 | **Priority:** P1-HIGH
- U1: Audit 40+ orphaned HyperMill engines for exports
- U2: Add exports to engines/index.ts for all HyperMill engines
- U3: Wire HyperMillMultiAxisEngine to 5-axis pipeline
- U4: Wire HyperMillCycleCatalogEngine to ToolpathRegistry
- U5: Wire HyperMillDeepLearningEngine to MillingAGIMasterEngine
- U6: Wire HyperMillCodeGeneratorEngine to post-processor pipeline
- U7: Wire HyperMill bridges (EDM, Grinding, FAI) to unified orchestrator
- U8: Integration tests across HyperMill ecosystem

### MILL-INTEG-MS4 — CAM Post-Processor Integration
**Units:** 5 | **Omega:** 1.0 | **Priority:** P1-HIGH
- U1: Audit 180 Fusion post processors → aggregate catalog
- U2: Create MastercamPostRegistry (parse .pst/.cps files)
- U3: Create PostProcessorCatalogEngine (unified across CAM systems)
- U4: Wire post catalog to PostProcessorPipeline (38 stages)
- U5: AI-driven post selection based on machine + CAM system + part features

### MILL-INTEG-MS5 — Dynamic Engine Registry
**Units:** 3 | **Omega:** 1.0 | **Priority:** P1-HIGH
- U1: Create MillEngineRegistry (dynamic registration, discovery)
- U2: Register all 122 mill engines with capability tags
- U3: AI queries: "Which engine handles chatter for Ti-6Al-4V?" → registry response

### MILL-INTEG-MS6 — Toolpath Strategy Registry
**Units:** 3 | **Omega:** 1.0 | **Priority:** P1-HIGH
- U1: Create ToolpathStrategyRegistry (query by material/feature/precision)
- U2: Extract all strategy knowledge from MillingProductionKnowledgeHarvesterEngine
- U3: Wire registry to MillingAGIMasterEngine for AI-driven strategy selection

### MILL-INTEG-MS7 — Test Coverage (Untested 81%)
**Units:** 10 | **Omega:** 1.0 | **Priority:** P2-MEDIUM
- U1-U10: Create test files for 98 untested mill engines (batch of ~10 per unit)
- Each test file: ≥10 test cases, nested describes, physics validation, edge cases

### MILL-INTEG-MS8 — PDF/Video Knowledge Extraction
**Units:** 6 | **Omega:** 1.0 | **Priority:** P2-MEDIUM
- U1: /pdf-learn on 9 HyperMill master PDF manuals
- U2: /pdf-learn on Mastercam training manuals
- U3: /pdf-learn on Haas operator manuals
- U4: /video-learn on Titans of CNC milling videos
- U5: /video-learn on Mastercam tutorial playlists
- U6: Integrate extracted knowledge into MillTribalKnowledgeEngine

### MILL-INTEG-MS9 — Master AGI Unification
**Units:** 4 | **Omega:** 1.0 | **Priority:** P0-CRITICAL (final)
- U1: Wire MillResourceAwarenessEngine → MillingAGIMasterEngine
- U2: Wire ToolHolderRegistryEngine → MillingAGIMasterEngine
- U3: Wire MillTribalKnowledgeEngine → MillingAGIMasterEngine
- U4: End-to-end validation: ask Master AGI "optimal strategy for Ti-6Al-4V pocket on Haas UMC750 with 12mm endmill" → full reasoning + source citations

---

## TOTAL SCOPE
- **10 Milestones**
- **54 Units**
- **Target completion:** Omega = 1.0 across entire mill AI stack
- **Coordination:** This roadmap is MILL-SPECIFIC. PRISM-wide roadmap (other chat) covers cross-domain concerns.

---

## EXECUTION ORDER (critical path)
1. MS0 (foundation) → MS9 (unification wrap-up)
2. MS1 (consolidate) parallel with MS0
3. MS2 (learning pipeline) after MS0-U1 (needs MillResourceAwarenessEngine)
4. MS3, MS4, MS5, MS6 can run in parallel after MS1
5. MS7, MS8 can run in parallel with anything
6. MS9 runs last — requires MS0-MS6 complete

---

## COORDINATION WITH PRISM-WIDE ROADMAP
This roadmap handles MILL-ONLY concerns. The main chat (PRISM-wide) handles:
- Cross-machine orchestration (mill + lathe + EDM + grinding)
- Global safety/S(x) scoring
- Registry root architecture (this roadmap's registries plug into that)
- Shared AGI reasoning infrastructure

**Handoff points:**
- ToolHolderRegistry → registered in global RegistryRoot
- MillTribalKnowledge → registered in global TribalKnowledgeHub
- MillResourceAwareness → feeds global PRISMSelfAwareness
- MillingAGIMaster → subordinate to global MasterAGI

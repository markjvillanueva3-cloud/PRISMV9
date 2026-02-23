# PHASE R20: PROCESS KNOWLEDGE & INTELLIGENT ORCHESTRATION
## Status: in-progress | MS0 IN PROGRESS

### Phase Vision

R20 addresses the remaining deferred brainstorm items (ATCS/Manus Merge, tribal knowledge
capture, API extensibility) by building an intelligent orchestration layer on top of
R15-R19. This phase enables PRISM to automatically select engines, compose workflows,
capture and reuse process knowledge, and expose a structured extensibility API.

### Composition Dependencies

```
R20 builds on:
  R7  (Intelligence)   — optimization, scenario analysis
  R11 (Product)        — SFC product, AutoPilot
  R15-R19              — all physics, simulation, closed-loop, quality, decision engines
  Existing: ManusATCSBridge, TaskAgentClassifier

R20 new engines:
  NEW: WorkflowOrchestratorEngine  ← goal-driven multi-engine workflow composition
  NEW: ProcessKnowledgeEngine      ← tribal knowledge capture, retrieval, reuse
  NEW: AdaptiveLearningEngine      ← usage pattern learning, recommendation improvement
  NEW: IntegrationGatewayEngine    ← structured API for external system integration
  Extended: CCELiteEngine          ← orchestration recipes
```

### Milestone Plan

| MS | Title | Effort | Entry |
|----|-------|--------|-------|
| MS0 | Phase Architecture | S (10) | R19 COMPLETE |
| MS1 | WorkflowOrchestratorEngine — Goal-Driven Composition | M (25) | MS0 COMPLETE |
| MS2 | ProcessKnowledgeEngine — Tribal Knowledge Capture | M (25) | MS0 COMPLETE (parallel) |
| MS3 | AdaptiveLearningEngine — Usage Pattern Learning | M (25) | MS0 COMPLETE (parallel) |
| MS4 | IntegrationGatewayEngine — External API | M (25) | MS0 COMPLETE (parallel) |
| MS5 | Orchestration CCE Recipes + Integration | S (15) | MS1-MS4 COMPLETE |
| MS6 | Phase Gate | S (10) | MS0-MS5 COMPLETE |

### Action Projections (16 new actions)

| Engine | New Actions |
|--------|------------|
| WorkflowOrchestratorEngine (NEW) | wfo_plan, wfo_execute, wfo_status, wfo_optimize |
| ProcessKnowledgeEngine (NEW) | pk_capture, pk_retrieve, pk_search, pk_validate |
| AdaptiveLearningEngine (NEW) | al_learn, al_recommend, al_evaluate, al_history |
| IntegrationGatewayEngine (NEW) | ig_register, ig_invoke, ig_schema, ig_health |
| CCELiteEngine (ext) | 2 new recipes: intelligent_orchestration, knowledge_workflow |

### Deferred Items Addressed

| Item | Source | R20 Coverage |
|------|--------|-------------|
| ATCS/Manus Merge | Brainstorm deferred | WorkflowOrchestratorEngine (enhanced task routing) |
| Tribal Knowledge Capture | R13 partial | ProcessKnowledgeEngine (full capture + retrieval) |
| API marketplace / plugin system | POST-R14 candidate | IntegrationGatewayEngine (structured API) |
| Usage-based recommendation improvement | Novel | AdaptiveLearningEngine (pattern learning) |

### MS0 Deliverables
1. Phase architecture defined (this document)
2. Workflow orchestration patterns mapped
3. Milestone dependencies mapped

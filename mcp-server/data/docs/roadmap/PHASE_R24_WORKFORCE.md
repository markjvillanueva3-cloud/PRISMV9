# PHASE R24: WORKFORCE & KNOWLEDGE INTELLIGENCE
## Status: IN PROGRESS | MS0 COMPLETE

### Phase Vision

R24 builds a workforce intelligence layer enabling operator skill tracking,
training program management, manufacturing knowledge capture, and shift/workforce
optimization. This transforms PRISM from a machine-centric platform into one
that also models the human element — connecting operator capability to machine
assignment, quality outcomes, and production efficiency.

### Composition Dependencies

```
R24 builds on:
  R1  (Registries)     — machine, tool data (operator-machine pairing)
  R18 (Quality)        — quality outcomes linked to operator skill
  R21 (Maintenance)    — shop floor analytics, OEE (operator contribution)
  R22 (Traceability)   — process events with operator_id tracking
  R23 (Sustainability) — resource optimization (workforce scheduling)

R24 new engines:
  NEW: OperatorSkillEngine          ← skill matrix, competency tracking, certification
  NEW: TrainingManagementEngine     ← training programs, progress tracking, gap analysis
  NEW: KnowledgeCaptureEngine       ← tribal knowledge, best practices, lessons learned
  NEW: WorkforceOptimizationEngine  ← shift scheduling, skill-based assignment, capacity planning
  Extended: CCELiteEngine           ← workforce recipes
```

### Milestone Plan

| MS | Title | Effort | Entry |
|----|-------|--------|-------|
| MS0 | Phase Architecture | S (10) | R23 COMPLETE |
| MS1 | OperatorSkillEngine — Skill Matrix & Competency Tracking | M (25) | MS0 COMPLETE |
| MS2 | TrainingManagementEngine — Programs & Gap Analysis | M (25) | MS0 COMPLETE (parallel) |
| MS3 | KnowledgeCaptureEngine — Knowledge Base & Best Practices | M (25) | MS0 COMPLETE (parallel) |
| MS4 | WorkforceOptimizationEngine — Scheduling & Assignment | M (25) | MS0 COMPLETE (parallel) |
| MS5 | Workforce CCE Recipes + Integration | S (15) | MS1-MS4 COMPLETE |
| MS6 | Phase Gate | S (10) | MS0-MS5 COMPLETE |

### Action Projections (16 new actions)

| Engine | New Actions |
|--------|------------|
| OperatorSkillEngine (NEW) | op_skills, op_certify, op_assess, op_matrix |
| TrainingManagementEngine (NEW) | trn_program, trn_progress, trn_gap, trn_recommend |
| KnowledgeCaptureEngine (NEW) | kc_capture, kc_search, kc_best_practice, kc_lesson |
| WorkforceOptimizationEngine (NEW) | wf_schedule, wf_assign, wf_capacity, wf_balance |
| CCELiteEngine (ext) | 2 new recipes: operator_development, workforce_planning |

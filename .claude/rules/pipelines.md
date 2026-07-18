---
paths:
  - "**/src/engines/*Pipeline*.ts"
  - "**/src/engines/*Orchestrator*.ts"
---

# Pipeline/Orchestrator Conventions

- Async methods return Promise with typed results
- Stage-by-stage execution with progress reporting
- Checkpoint after each stage for rollback capability
- Error handling: catch per stage, include partial results
- Use canonical physics constants from constants.ts
- Large pipelines (>500 lines) must have integration tests
- Pipeline output includes timing per stage

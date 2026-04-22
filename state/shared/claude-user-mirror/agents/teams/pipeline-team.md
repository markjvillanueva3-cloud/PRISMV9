---
name: pipeline-team
description: >
  3-agent team for pipeline execution — planner designs workflow, executor
  runs it in isolation, verifier confirms results. Use for complex multi-engine
  pipeline runs.
agents:
  - code-archaeologist
  - build-doctor
  - test-runner
model: sonnet
---

# Pipeline Team — Multi-Engine Pipeline Execution

3-agent team for planning, building, and verifying complex pipeline integrations.

## Orchestration Flow

### Step 1: Dependency Mapping (code-archaeologist)
- **Mode**: plan (read-only)
- **Model**: sonnet
- **Goal**: Map pipeline dependencies and identify integration points
- **Input**: Pipeline brief (which engines/dispatchers to integrate)
- **Process**:
  1. Read MASTER_INDEX_COMPACT.md for system overview
  2. Read ENGINE_DIGEST.md to identify all engines in the pipeline
  3. For each engine in the pipeline:
     a. Read the engine file to understand its API
     b. Trace its dispatcher wiring
     c. Identify input/output types
     d. Map dependencies on other engines
  4. Build a dependency graph (topological sort)
  5. Identify potential conflicts: shared state, import cycles, schema collisions
  6. Suggest integration order
- **Output**: Write to `C:/tmp/prism-team-pipeline-step1.json`:
  ```json
  {
    "step": 1,
    "agent": "code-archaeologist",
    "status": "complete",
    "pipeline": {
      "engines": ["Engine1", "Engine2"],
      "dependency_order": ["Engine2", "Engine1"],
      "integration_points": [
        {"from": "Engine1", "to": "Engine2", "interface": "method(params)"}
      ],
      "potential_conflicts": [],
      "dispatcher_targets": {"Engine1": "calcDispatcher", "Engine2": "camDispatcher"},
      "shared_types": ["TypeA", "TypeB"]
    },
    "notes": "..."
  }
  ```

### Step 2: Build Verification (build-doctor)
- **Mode**: code (read-write for fixes)
- **Model**: sonnet
- **Goal**: Ensure build is clean, fix any issues
- **Input**: Dependency map from step 1 + original brief
- **Process**:
  1. Read `C:/tmp/prism-team-pipeline-step1.json` for pipeline map
  2. Run `cd C:/PRISM/mcp-server && npm run build:fast 2>&1`
  3. If build fails:
     a. Parse TypeScript errors
     b. Fix import issues, type mismatches, missing exports
     c. Re-run build until clean
  4. Verify all pipeline engines are exported from index.ts
  5. Verify all dispatcher actions are in z.enum
  6. Check schema completeness
- **Output**: Write to `C:/tmp/prism-team-pipeline-step2.json`:
  ```json
  {
    "step": 2,
    "agent": "build-doctor",
    "status": "complete",
    "build_status": "pass|fail",
    "issues_found": 0,
    "issues_fixed": 0,
    "fixes_applied": [
      {"file": "...", "issue": "...", "fix": "..."}
    ],
    "exports_verified": true,
    "dispatcher_actions_verified": true,
    "schema_complete": true
  }
  ```

### Step 3: Integration Testing (test-runner)
- **Mode**: code
- **Model**: haiku
- **Background**: yes
- **Goal**: Run integration tests to verify pipeline
- **Input**: Build verification from step 2 + pipeline map from step 1
- **Process**:
  1. Read both previous step outputs
  2. Identify test files for pipeline engines
  3. Run targeted tests: `npx vitest run <pattern> --reporter=verbose`
  4. Run integration tests if they exist
  5. Check for cross-engine interaction issues
  6. Report results
- **Output**: Write to `C:/tmp/prism-team-pipeline-step3.json`:
  ```json
  {
    "step": 3,
    "agent": "test-runner",
    "status": "complete",
    "tests_run": {
      "unit": {"total": 0, "passed": 0, "failed": 0},
      "integration": {"total": 0, "passed": 0, "failed": 0}
    },
    "pipeline_health": "GREEN|YELLOW|RED",
    "failing_engines": [],
    "notes": "..."
  }
  ```

## Handoff Protocol

Each agent writes to `C:/tmp/prism-team-pipeline-{step}.json`.
Step 2 can fix issues found — it is the only step with write access.
Step 3 runs in background for efficiency.
If step 2 cannot achieve a clean build, it reports FAIL and step 3 is skipped.

## Budget Guidelines

| Agent | Model | Max Turns | Estimated Tokens |
|-------|-------|-----------|-----------------|
| code-archaeologist | sonnet | 50 | ~15K |
| build-doctor | sonnet | 35 | ~20K |
| test-runner | haiku | 20 | ~5K |
| **Total** | | **105** | **~40K** |

---
name: test-team
description: >
  3-agent team for test suite management  runner executes, analyzer diagnoses
  failures, reporter summarizes. Use for comprehensive test sweeps.
agents:
  - test-runner
  - regression-hunter
  - doc-generator
model: haiku
---

# Test Team  Test Suite Management Pipeline

3-agent team for running, diagnosing, and documenting test results.

## Orchestration Flow

### Step 1: Test Execution (test-runner)
- **Mode**: code
- **Model**: haiku
- **Background**: yes
- **Goal**: Run full test suite or targeted tests, collect results
- **Input**: Test scope from brief (e.g., "all", "engines", "dispatchers", specific pattern)
- **Process**:
  1. Parse the test scope from the brief
  2. Determine test command:
     - "all": `cd C:/PRISM/mcp-server && npx vitest run --reporter=verbose 2>&1`
     - "engines": `npx vitest run src/engines/ --reporter=verbose 2>&1`
     - Pattern: `npx vitest run <pattern> --reporter=verbose 2>&1`
  3. Capture stdout/stderr
  4. Parse results: total, passed, failed, skipped
  5. Extract failing test names and error messages
- **Output**: Write to `C:/tmp/prism-team-test-step1.json`:
  ```json
  {
    "step": 1,
    "agent": "test-runner",
    "status": "complete",
    "scope": "all|engines|pattern",
    "results": {
      "total": 0,
      "passed": 0,
      "failed": 0,
      "skipped": 0
    },
    "failures": [
      {"file": "...", "test": "...", "error": "..."}
    ],
    "duration_ms": 0,
    "pass_rate": "100%"
  }
  ```

### Step 2: Failure Diagnosis (regression-hunter)
- **Mode**: plan (read-only analysis)
- **Model**: opus
- **Goal**: Investigate every failure  root cause, regression vs. known issue
- **Input**: Failures from step 1
- **Process**:
  1. Read `C:/tmp/prism-team-test-step1.json`
  2. For each failure:
     a. Read the failing test file to understand what it expects
     b. Read the engine/module under test to find the bug
     c. Check git log for recent changes to the file
     d. Classify: REGRESSION (worked before) | NEW_BUG | FLAKY | KNOWN_ISSUE
     e. Identify root cause and suggested fix
  3. Prioritize findings by severity
- **Output**: Write to `C:/tmp/prism-team-test-step2.json`:
  ```json
  {
    "step": 2,
    "agent": "regression-hunter",
    "status": "complete",
    "failures_analyzed": 0,
    "diagnoses": [
      {
        "test": "...",
        "file": "...",
        "classification": "REGRESSION|NEW_BUG|FLAKY|KNOWN_ISSUE",
        "root_cause": "...",
        "suggested_fix": "...",
        "affected_engine": "...",
        "recent_changes": "..."
      }
    ],
    "regressions_found": 0,
    "new_bugs_found": 0,
    "flaky_tests": 0,
    "known_issues": 0
  }
  ```

### Step 3: Documentation (doc-generator)
- **Mode**: code
- **Model**: haiku
- **Background**: yes
- **Goal**: Generate test gap report and document findings
- **Input**: Diagnoses from step 2 + test results from step 1
- **Process**:
  1. Read both previous step outputs
  2. Aggregate into unified test health report
  3. Identify test gaps: engines without tests, low-coverage areas
  4. Generate actionable summary with priorities
  5. Append to telemetry log
- **Output**: Write to `C:/tmp/prism-team-test-step3.json`:
  ```json
  {
    "step": 3,
    "agent": "doc-generator",
    "status": "complete",
    "summary": {
      "total_tests": 0,
      "pass_rate": "100%",
      "regressions": 0,
      "action_items": ["..."]
    },
    "test_gaps": [
      {"engine": "...", "has_tests": false, "priority": "HIGH|MEDIUM|LOW"}
    ],
    "report_saved_to": "~/.prism/telemetry/test-sweep-report.json"
  }
  ```

## Handoff Protocol

Each agent writes to `C:/tmp/prism-team-test-{step}.json`.
Step 2 only runs if step 1 found failures (otherwise skip to step 3 with "all passed" summary).
Step 3 always runs to generate the gap report regardless of failures.

## Budget Guidelines

| Agent | Model | Max Turns | Estimated Tokens |
|-------|-------|-----------|-----------------|
| test-runner | haiku | 20 | ~5K |
| regression-hunter | opus | 30 | ~25K |
| doc-generator | haiku | 15 | ~5K |
| **Total** | | **65** | **~35K** |

# RGS Roadmap Exemplar: Health-Check Endpoint

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| **title**    | Add a health-check endpoint to the PRISM MCP server |
| **version**  | 1.0.0                                              |
| **brief**    | Design, implement, test, and document a `/health` endpoint that returns server liveness, uptime, and version metadata. |
| **created_at** | 2026-02-24T00:00:00Z                             |
| **created_by** | roadmap-generator v2.1 (Opus 4.6)                |
| **schema**   | rgs-canonical-v1                                   |
| **status**   | approved                                           |

---

## 1. Purpose

This file is a **golden reference exemplar** — a complete, fictional roadmap that demonstrates every field in the RGS canonical schema (`roadmapSchema.ts`). It serves as the few-shot example provided to models when generating new roadmaps, ensuring:

- Every required and optional field is present and correctly formatted.
- Phase gates, dependency chains, entry/exit conditions, and rollback blocks are modeled.
- The role matrix, tool map, and scrutinization config are fully populated.
- Deliverables include path, type, and estimated line counts.

Use this document as the **single source of truth** for roadmap structure.

---

## 2. Deliverables Inventory

| ID      | Path                                        | Type   | Est. Lines | Produced By |
|---------|---------------------------------------------|--------|------------|-------------|
| D-01    | `src/schemas/healthEndpoint.ts`             | schema | ~30        | P1-U01      |
| D-02    | `src/handlers/health.ts`                    | source | ~60        | P1-U02      |
| D-03    | `src/index.ts` (updated)                    | source | delta ~10  | P1-U03      |
| D-04    | `src/__tests__/health.test.ts`              | test   | ~80        | P2-U01      |
| D-05    | `src/__tests__/health.integration.test.ts`  | test   | ~90        | P2-U02      |
| D-06    | `MASTER_INDEX.md` (updated)                 | docs   | delta ~15  | P2-U03      |

---

## 3. Role Matrix

| Role ID | Name             | Model  | Responsibility                          |
|---------|------------------|--------|-----------------------------------------|
| R1      | Schema Architect | Opus   | Design data contracts and type schemas  |
| R2      | Implementer      | Sonnet | Write production source code            |
| R3      | Test Writer      | Sonnet | Author unit and integration tests       |
| R5      | Reviewer         | Opus   | Review deliverables at phase gates      |
| R6      | Integrator       | Sonnet | Wire components into the main entrypoint|
| R8      | Documentarian    | Haiku  | Update docs and indexes                 |

---

## 4. Tool Map

| Tool                   | Phase 1 | Phase 2 | Description                              |
|------------------------|---------|---------|------------------------------------------|
| `prism_sp:brainstorm`  | P1-U01  | —       | Generate design alternatives             |
| `prism_sp:write_file`  | P1-U01, P1-U02, P1-U03 | P2-U01, P2-U02, P2-U03 | Create or update files |
| `prism_sp:read_file`   | P1-U02, P1-U03 | P2-U01, P2-U02 | Read existing sources          |
| `prism_sp:run_tests`   | P1-U02, P1-U03 | P2-U01, P2-U02 | Execute test suites            |
| `prism_sp:build`       | P1-U03  | —       | Compile TypeScript project               |
| `prism_sp:lint`        | —       | P2-U02  | Run linter on changed files              |
| `prism_sp:update_index`| —       | P2-U03  | Append entries to MASTER_INDEX           |

---

## 5. Dependency Graph

```
P1-U01 ──► P1-U02 ──► P1-U03
                          │
                     ┌────┴────┐
                     ▼         ▼
                  P2-U01    (blocked)
                     │         │
                ┌────┴───┐     │
                ▼        ▼     │
             P2-U02   P2-U03◄──┘
```

Legend: `──►` = hard dependency, all arrows must resolve before the target unit begins.

---

## Phase 1: Implementation

> **phase_id**: P1
> **name**: Implementation
> **objective**: Produce the schema, handler, and route wiring for the `/health` endpoint.
> **units**: 3

---

### P1-U01: Design health endpoint schema

| Field       | Value                                                    |
|-------------|----------------------------------------------------------|
| **unit_id** | P1-U01                                                   |
| **title**   | Design health endpoint response schema                   |
| **role**    | R1 — Schema Architect                                    |
| **model**   | Opus                                                     |
| **effort**  | 90                                                       |
| **rationale** | The schema defines the contract consumed by all downstream units. Getting it right first prevents rework. High effort reflects design criticality. |
| **tools**   | `prism_sp:brainstorm`, `prism_sp:write_file`             |
| **skills**  | typescript-typing, json-schema-design                    |
| **scripts** | —                                                        |
| **hooks**   | `pre_unit: validate_workspace`, `post_unit: log_metrics` |
| **depends_on** | [] (no dependencies — first unit)                     |

**Entry Conditions**:
- Build passes on current HEAD.
- No failing tests in `src/__tests__/`.

**Steps**:

1. **Brainstorm response shape**
   - instruction: Generate 3 candidate response schemas for a health endpoint (minimal, standard, verbose).
   - tool_calls: `prism_sp:brainstorm { topic: "health endpoint response schema", count: 3 }`
2. **Select and refine**
   - instruction: Choose the "standard" variant. Add fields `status`, `uptime_ms`, `version`, `timestamp`. Define as a Zod schema.
   - tool_calls: —
3. **Write schema file**
   - instruction: Create `src/schemas/healthEndpoint.ts` exporting `HealthResponse` Zod object and inferred TypeScript type.
   - tool_calls: `prism_sp:write_file { path: "src/schemas/healthEndpoint.ts" }`

**Deliverables**:

| Path                              | Type   | Est. Lines |
|-----------------------------------|--------|------------|
| `src/schemas/healthEndpoint.ts`   | schema | ~30        |

**Exit Conditions**:
- File exists and exports `HealthResponse`.
- `tsc --noEmit` passes with zero errors.

**Rollback**:
- Delete `src/schemas/healthEndpoint.ts`.
- Revert any import additions.

---

### P1-U02: Implement health endpoint handler

| Field       | Value                                                    |
|-------------|----------------------------------------------------------|
| **unit_id** | P1-U02                                                   |
| **title**   | Implement the GET /health handler                        |
| **role**    | R2 — Implementer                                         |
| **model**   | Sonnet                                                   |
| **effort**  | 80                                                       |
| **rationale** | Core implementation unit. Sonnet is cost-efficient for straightforward handler code guided by the existing schema. |
| **tools**   | `prism_sp:read_file`, `prism_sp:write_file`, `prism_sp:run_tests` |
| **skills**  | express-handlers, zod-validation                         |
| **scripts** | `npm run build`                                          |
| **hooks**   | `pre_unit: check_schema_exists`, `post_unit: smoke_test` |
| **depends_on** | [P1-U01]                                              |

**Entry Conditions**:
- P1-U01 exit conditions met.
- `src/schemas/healthEndpoint.ts` compiles cleanly.

**Steps**:

1. **Read the schema**
   - instruction: Load `healthEndpoint.ts` to understand the response contract.
   - tool_calls: `prism_sp:read_file { path: "src/schemas/healthEndpoint.ts" }`
2. **Create handler module**
   - instruction: Write `src/handlers/health.ts` exporting an async handler that returns `{ status: "ok", uptime_ms, version, timestamp }`.
   - tool_calls: `prism_sp:write_file { path: "src/handlers/health.ts" }`
3. **Verify with quick test**
   - instruction: Run existing tests to confirm nothing is broken by the new module.
   - tool_calls: `prism_sp:run_tests { suite: "unit" }`

**Deliverables**:

| Path                       | Type   | Est. Lines |
|----------------------------|--------|------------|
| `src/handlers/health.ts`   | source | ~60        |

**Exit Conditions**:
- Handler file exports `handleHealth` function.
- Endpoint returns HTTP 200 with a body matching `HealthResponse`.
- All prior tests still pass.

**Rollback**:
- Delete `src/handlers/health.ts`.

---

### P1-U03: Wire health endpoint to index.ts

| Field       | Value                                                    |
|-------------|----------------------------------------------------------|
| **unit_id** | P1-U03                                                   |
| **title**   | Register /health route in the MCP server entrypoint      |
| **role**    | R6 — Integrator                                          |
| **model**   | Sonnet                                                   |
| **effort**  | 70                                                       |
| **rationale** | Low-risk wiring task. Sonnet handles mechanical integration efficiently. Effort is lower since design decisions are already made. |
| **tools**   | `prism_sp:read_file`, `prism_sp:write_file`, `prism_sp:build`, `prism_sp:run_tests` |
| **skills**  | express-routing, module-integration                      |
| **scripts** | `npm run build && npm run test`                          |
| **hooks**   | `pre_unit: snapshot_index`, `post_unit: verify_route`    |
| **depends_on** | [P1-U02]                                              |

**Entry Conditions**:
- P1-U02 exit conditions met.
- `src/handlers/health.ts` exists and exports `handleHealth`.

**Steps**:

1. **Read current index.ts**
   - instruction: Inspect `src/index.ts` to find the route registration section.
   - tool_calls: `prism_sp:read_file { path: "src/index.ts" }`
2. **Add health route**
   - instruction: Import `handleHealth` and register `app.get("/health", handleHealth)` alongside existing routes.
   - tool_calls: `prism_sp:write_file { path: "src/index.ts", mode: "patch" }`
3. **Build and verify**
   - instruction: Run full build, then execute `curl http://localhost:3000/health` or equivalent to confirm a 200 response.
   - tool_calls: `prism_sp:build {}`, `prism_sp:run_tests { suite: "smoke" }`

**Deliverables**:

| Path              | Type   | Est. Lines |
|-------------------|--------|------------|
| `src/index.ts`    | source | delta ~10  |

**Exit Conditions**:
- Build succeeds with zero errors.
- `GET /health` returns 200 and valid `HealthResponse` JSON.
- No regressions in existing test suite.

**Rollback**:
- Revert `src/index.ts` to pre-unit snapshot.

---

### P1-GATE: Implementation Phase Gate

```yaml
gate_id: P1-GATE
phase: P1
omega_floor: 1.0
build_required: true
test_required: true
anti_regression: true
reviewer_role: R5
reviewer_model: Opus
criteria:
  - All three deliverables exist and compile.
  - GET /health returns 200 with correct schema.
  - Zero test regressions from baseline.
  - Code passes lint with no new warnings.
pass_action: advance_to_P2
fail_action: return_to_lowest_failing_unit
```

---

## Phase 2: Testing & Validation

> **phase_id**: P2
> **name**: Testing & Validation
> **objective**: Achieve full test coverage and update project documentation.
> **units**: 3

---

### P2-U01: Write unit tests

| Field       | Value                                                    |
|-------------|----------------------------------------------------------|
| **unit_id** | P2-U01                                                   |
| **title**   | Unit tests for the health handler                        |
| **role**    | R3 — Test Writer                                         |
| **model**   | Sonnet                                                   |
| **effort**  | 75                                                       |
| **rationale** | Sonnet produces high-quality test code efficiently. Unit tests exercise the handler in isolation with mocked dependencies. |
| **tools**   | `prism_sp:read_file`, `prism_sp:write_file`, `prism_sp:run_tests` |
| **skills**  | jest-testing, mocking-patterns                           |
| **scripts** | `npm run test -- --coverage`                             |
| **hooks**   | `post_unit: coverage_check`                              |
| **depends_on** | [P1-U03]                                              |

**Entry Conditions**:
- P1-GATE passed.
- Health endpoint is wired and returning 200.

**Steps**:

1. **Read handler source**
   - instruction: Load `src/handlers/health.ts` to identify branches and edge cases.
   - tool_calls: `prism_sp:read_file { path: "src/handlers/health.ts" }`
2. **Write test file**
   - instruction: Create `src/__tests__/health.test.ts` covering: success path, schema validation, uptime non-negative, version format.
   - tool_calls: `prism_sp:write_file { path: "src/__tests__/health.test.ts" }`
3. **Run and confirm**
   - instruction: Execute unit tests and confirm all pass with coverage above 90% for `health.ts`.
   - tool_calls: `prism_sp:run_tests { suite: "unit", coverage: true }`

**Deliverables**:

| Path                               | Type | Est. Lines |
|------------------------------------|------|------------|
| `src/__tests__/health.test.ts`     | test | ~80        |

**Exit Conditions**:
- All unit tests pass.
- Line coverage for `src/handlers/health.ts` >= 90%.

**Rollback**:
- Delete `src/__tests__/health.test.ts`.

---

### P2-U02: Write integration test

| Field       | Value                                                    |
|-------------|----------------------------------------------------------|
| **unit_id** | P2-U02                                                   |
| **title**   | Integration test for the /health endpoint                |
| **role**    | R3 — Test Writer                                         |
| **model**   | Sonnet                                                   |
| **effort**  | 80                                                       |
| **rationale** | Integration tests validate the full request lifecycle through the real server stack. Slightly higher effort than unit tests due to server setup/teardown. |
| **tools**   | `prism_sp:read_file`, `prism_sp:write_file`, `prism_sp:run_tests`, `prism_sp:lint` |
| **skills**  | supertest-integration, server-lifecycle                  |
| **scripts** | `npm run test:integration`                               |
| **hooks**   | `pre_unit: start_test_server`, `post_unit: stop_test_server` |
| **depends_on** | [P2-U01]                                              |

**Entry Conditions**:
- P2-U01 exit conditions met.
- Unit tests pass.

**Steps**:

1. **Review existing integration patterns**
   - instruction: Read any existing integration test to match project conventions.
   - tool_calls: `prism_sp:read_file { path: "src/__tests__/", pattern: "*.integration.test.ts" }`
2. **Write integration test**
   - instruction: Create `src/__tests__/health.integration.test.ts` using supertest. Test: 200 status, JSON content-type, schema conformance, response time < 500ms.
   - tool_calls: `prism_sp:write_file { path: "src/__tests__/health.integration.test.ts" }`
3. **Run full test suite**
   - instruction: Execute all tests (unit + integration) and lint changed files.
   - tool_calls: `prism_sp:run_tests { suite: "all" }`, `prism_sp:lint { files: ["src/__tests__/health.integration.test.ts"] }`

**Deliverables**:

| Path                                          | Type | Est. Lines |
|-----------------------------------------------|------|------------|
| `src/__tests__/health.integration.test.ts`    | test | ~90        |

**Exit Conditions**:
- Integration test passes.
- Full test suite green.
- Lint clean on all changed files.

**Rollback**:
- Delete `src/__tests__/health.integration.test.ts`.

---

### P2-U03: Documentation update

| Field       | Value                                                    |
|-------------|----------------------------------------------------------|
| **unit_id** | P2-U03                                                   |
| **title**   | Update MASTER_INDEX and endpoint documentation           |
| **role**    | R8 — Documentarian                                       |
| **model**   | Haiku                                                    |
| **effort**  | 60                                                       |
| **rationale** | Documentation is mechanical and low-risk. Haiku is the most cost-efficient model for structured text updates. |
| **tools**   | `prism_sp:read_file`, `prism_sp:write_file`, `prism_sp:update_index` |
| **skills**  | markdown-authoring, api-documentation                    |
| **scripts** | —                                                        |
| **hooks**   | `post_unit: validate_links`                              |
| **depends_on** | [P2-U01]                                              |

**Entry Conditions**:
- P2-U01 exit conditions met (tests confirm endpoint works).

**Steps**:

1. **Read current MASTER_INDEX**
   - instruction: Load `MASTER_INDEX.md` to find the endpoint registry section.
   - tool_calls: `prism_sp:read_file { path: "MASTER_INDEX.md" }`
2. **Append health endpoint entry**
   - instruction: Add a row to the endpoint table documenting `GET /health`, its response shape, and test file locations.
   - tool_calls: `prism_sp:update_index { entry: "GET /health", schema: "HealthResponse", tests: ["health.test.ts", "health.integration.test.ts"] }`
3. **Write updated file**
   - instruction: Save the updated MASTER_INDEX.
   - tool_calls: `prism_sp:write_file { path: "MASTER_INDEX.md", mode: "patch" }`

**Deliverables**:

| Path               | Type | Est. Lines |
|--------------------|------|------------|
| `MASTER_INDEX.md`  | docs | delta ~15  |

**Exit Conditions**:
- MASTER_INDEX contains the new endpoint entry.
- All internal links resolve.

**Rollback**:
- Revert `MASTER_INDEX.md` to pre-unit snapshot.

---

### P2-GATE: Testing & Validation Phase Gate

```yaml
gate_id: P2-GATE
phase: P2
omega_floor: 1.0
build_required: true
test_required: true
ralph_required: true
anti_regression: true
reviewer_role: R5
reviewer_model: Opus
criteria:
  - All six deliverables exist and are valid.
  - Unit test coverage >= 90% on health handler.
  - Integration test passes end-to-end.
  - MASTER_INDEX updated with correct endpoint entry.
  - Zero lint warnings on changed files.
  - No test regressions from Phase 1 baseline.
pass_action: mark_roadmap_complete
fail_action: return_to_lowest_failing_unit
```

---

## 6. Scrutinization Config

```yaml
scrutinization:
  mode: adaptive
  min_passes: 3
  max_passes: 7
  convergence: "delta < 2"
  convergence_metric: total_issues_found
  escalation_threshold: 5
  escalation_action: involve_R5_reviewer
  focus_areas:
    - schema_type_safety
    - error_handling
    - test_coverage_completeness
    - documentation_accuracy
```

Scrutinization runs after each phase gate. In **adaptive** mode, the reviewer performs between 3 and 7 passes. If the delta of issues found between consecutive passes drops below 2, convergence is declared and the gate proceeds. If issues exceed the escalation threshold in any single pass, the R5 Reviewer (Opus) is pulled in regardless of which role triggered the gate.

---

## 7. Position Tracking

```yaml
position:
  state_file: state/HEALTH-CHECK/position.json
  format:
    current_phase: "P1" | "P2" | "COMPLETE"
    current_unit: "P1-U01" | "P1-U02" | ... | "P2-U03" | null
    current_step: 1..N | null
    status: "pending" | "in_progress" | "blocked" | "passed" | "failed"
    attempts: 0
    last_gate_result: null | "pass" | "fail"
    omega_score: 0.0..1.0
    history:
      - unit: "P1-U01"
        started_at: "2026-02-24T00:01:00Z"
        completed_at: "2026-02-24T00:03:42Z"
        result: "pass"
        omega: 1.0
```

The position file is atomically updated after each step completion. It enables resume-from-checkpoint behavior if the orchestrator is interrupted mid-roadmap.

---

## Schema Field Checklist

This exemplar demonstrates the following RGS canonical fields:

| Category         | Fields Demonstrated                                                 |
|------------------|---------------------------------------------------------------------|
| **Header**       | title, version, brief, created_at, created_by, schema, status      |
| **Phase**        | phase_id, name, objective, units                                   |
| **Unit**         | unit_id, title, role, model, effort, rationale, tools, skills, scripts, hooks, depends_on |
| **Conditions**   | entry_conditions, exit_conditions                                  |
| **Steps**        | step number, instruction, tool_calls                               |
| **Deliverables** | path, type, est_lines                                              |
| **Rollback**     | rollback instructions per unit                                     |
| **Gate**         | gate_id, phase, omega_floor, build_required, test_required, ralph_required, anti_regression, reviewer_role, reviewer_model, criteria, pass_action, fail_action |
| **Scrutinization** | mode, min_passes, max_passes, convergence, convergence_metric, escalation_threshold, escalation_action, focus_areas |
| **Position**     | state_file, format (current_phase, current_unit, current_step, status, attempts, last_gate_result, omega_score, history) |
| **Inventory**    | deliverables table with ID, path, type, est_lines, produced_by     |
| **Roles**        | role_id, name, model, responsibility                               |
| **Tools**        | tool name, phase usage, description                                |
| **Dependencies** | ASCII graph, depends_on arrays                                     |

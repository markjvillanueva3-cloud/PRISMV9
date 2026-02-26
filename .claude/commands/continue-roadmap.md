Continue executing a roadmap from its current position.

## Prerequisites
Load these skills before starting:
1. `prism_skill_script->skill_content(id="prism-roadmap-schema")` -- understand the canonical schema
2. `prism_skill_script->skill_content(id="prism-roadmap-scrutinizer")` -- quality checks between units

## Input
Identify the active milestone from $ARGUMENTS (milestone ID like "S1-MS2"). If not provided, use `prism_orchestrate:roadmap_list` to get the index and pick the first `in_progress` or `not_started` milestone. If no active milestone found, ask the user.

## Execution Flow

### 1. Load State (Modular)
- Use `prism_orchestrate:roadmap_load { milestone_id: "<ID>" }` to load the milestone envelope + position
- This loads only the single milestone (~15-25KB) instead of the full roadmap (~330KB)
- If no position exists, an initial position is created automatically

### 1.5 Parallel Detection (MCP-Driven)
Use the RoadmapExecutor engine via MCP to identify parallelizable units:

```
prism_orchestrate:roadmap_next_batch { milestone_id: "<ID>" }
```

This returns:
- `batch.parallel` -- true if multiple independent units are ready
- `batch.units[]` -- all units with satisfied dependencies
- `gatePending` -- true if a phase gate must be cleared first
- `complete` -- true if the roadmap is finished

**If batch.parallel is true (multiple ready units):**
1. Log: `PARALLEL: {N} independent units detected -- spawning parallel agents`
2. For each unit in batch.units:
   ```
   Task(subagent_type: "coder", isolation: "worktree", prompt: "[full unit context]")
   ```
   The prompt must include: unit ID, title, role, model, effort, all steps with tool_calls, exit conditions, deliverable paths, and rollback instructions.
3. Wait for ALL agents to complete
4. For each completed worktree: `git merge --no-ff {branch}`
5. Run build + test gate on merged result
6. Advance position: `prism_orchestrate:roadmap_advance { ... completed units ... }`
7. Continue to next batch

**If batch.parallel is false (single unit or sequential):**
- Execute the single unit directly (steps 2-6 below)

**If gatePending is true:**
- Run the phase gate (step 7 below)

**If complete is true:**
- Report final summary and stop

### 2. Pre-Execution Validation (Hook: pre-roadmap-execute)
Before executing the current unit, validate:
- **Entry conditions** -- all entry_conditions for the unit must be satisfiable
- **Dependencies** -- all listed dependencies must appear in position.history as completed
- **Tool references** -- all tools in unit.tools must resolve to known prism_* dispatchers (32 dispatchers)
- **Skill references** -- all skills in unit.skills must be non-empty strings
- **Position status** -- must not be BLOCKED or GATE_PENDING

If any blockers found, report them and STOP. Do not proceed with a blocked unit.

### 3. Load Unit Context
For the current unit, load:
- **Role & Model**: Honor the unit's role (R1-R8) and model assignment
  - R1 Schema Architect -> Opus | R2 Implementer -> Sonnet | R3 Test Writer -> Sonnet
  - R4 Scrutinizer -> Opus | R5 Reviewer -> Opus | R6 Integrator -> Sonnet
  - R7 Prompt Engineer -> Opus | R8 Documenter -> Haiku
- **Effort level**: Calibrate thoroughness to the unit's effort score (60-95)
- **Skills**: Load all skills listed in `unit.skills`
- **Steps**: Execute each step in sequence, using the specified `tool_calls`

### 4. Execute Steps
For each step in `unit.steps`:
1. Read the instruction (imperative, concrete action)
2. Execute the tool_calls listed for that step
3. Verify the step's validation condition
4. If a step fails validation, retry once. If still failing, report and mark unit as BLOCKED.

### 5. Verify Exit Conditions
After all steps complete:
- Check every `exit_conditions` entry
- Run `npm run build` -- MUST PASS
- Run `npm test` -- MUST PASS (test count must not decrease)
- If any exit condition fails, report which ones and mark unit BLOCKED

### 6. Post-Unit Processing (Hook: post-roadmap-unit)
After successful completion:
- **Update position** -- `prism_orchestrate:roadmap_advance { milestone_id: "<ID>", completed: [{ unitId, buildPassed: true }] }` (auto-persists position + updates index status)
- **Index deliverables** -- catalog all files created/modified by this unit
- **Phase gate check** -- if this was the last unit in a phase, flag GATE_PENDING
- **Checkpoint** -- trigger checkpoint every 3 completed units

### 7. Phase Gate (if triggered)
When a phase gate is pending, use the MCP gate check:
```
prism_orchestrate:roadmap_gate {
  milestone_id: "<ID>",
  phase_id: "P1",
  completed_ids: [...],
  build_passed: true,
  tests_passed: true,
  test_count: 111,
  baseline_test_count: 111,
  omega_score: 1.0
}
```
This validates: all units complete, build/tests pass, omega >= floor, anti-regression, safety floor.

If gate PASSES:
- Update CURRENT_POSITION.md with gate results
- Commit: `R0-P{N}-GATE: Phase {N} {title} -- all checks pass`

If gate FAILS:
- Report which checks failed
- Do NOT proceed to next phase
- Mark position status as GATE_PENDING

### 8. Continue or Stop
- If next_unit exists: report progress and continue to step 1.5 (parallel detection loop)
- If roadmap is COMPLETE: report final summary
- If BLOCKED: report blockers and stop

## Full Execution Plan (Optional)
To see the complete batched execution plan before starting:
```
prism_orchestrate:roadmap_plan { milestone_id: "<ID>", completed_ids: [] }
```
This shows all phases, all batches, which batches are parallel vs sequential, max parallel width, and estimated token cost. Useful for capacity planning.

## Milestone Index
To see all milestones and their status:
```
prism_orchestrate:roadmap_list {}
```
Returns the lightweight index (~1KB) with all milestone IDs, titles, tracks, dependencies, and completion status.

## Status Report Format
After each unit, output:
```
UNIT COMPLETE: {unit.id} -- {unit.title}
Phase: {phase.id} / Unit: {unit.sequence} of {phase.units.length}
Progress: {percent_complete}% ({units_completed}/{total_units})
Build: PASS | Tests: PASS ({count})
Next: {next_unit.id} -- {next_unit.title}
```

## Error Handling
- **Build failure**: Stop immediately. Report the build error. Do not proceed to next unit.
- **Test failure**: Stop immediately. Report failing tests. Fix before continuing.
- **Entry condition blocker**: Report which conditions are unmet. Suggest resolution.
- **Dependency not met**: Show which units need to complete first.
- **Tool not found**: Flag the invalid tool reference. Check MASTER_INDEX for correct name.
- **Step validation failure**: Retry once, then BLOCK if still failing.

## Commit Convention
After each unit: `R0-P{N}-U{NN}: {title} -- {brief description}`
After each gate: `R0-P{N}-GATE: Phase {N} {title} -- all checks pass`

## Target Quality
- Omega = 1.0 at every gate
- All tests passing, no regression
- Build clean (5.xMB, 1 known CommonJS warning only)

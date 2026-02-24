Continue executing a roadmap from its current position.

## Prerequisites
Load these skills before starting:
1. `prism_skill_script->skill_content(id="prism-roadmap-schema")` — understand the canonical schema
2. `prism_skill_script->skill_content(id="prism-roadmap-scrutinizer")` — quality checks between units

## Input
Identify the active roadmap from $ARGUMENTS (roadmap ID or file path). If not provided, check `data/state/` for the most recently updated position.json. If no active roadmap found, ask the user.

## Execution Flow

### 1. Load State
- Read the roadmap file (`.md` or `.json` format)
- Read `data/state/{roadmap-id}/position.json` for current position
- If no position file exists, initialize at the first unit of the first phase

### 2. Pre-Execution Validation (Hook: pre-roadmap-execute)
Before executing the current unit, validate:
- **Entry conditions** — all entry_conditions for the unit must be satisfiable
- **Dependencies** — all listed dependencies must appear in position.history as completed
- **Tool references** — all tools in unit.tools must resolve to known prism_* dispatchers (32 dispatchers)
- **Skill references** — all skills in unit.skills must be non-empty strings
- **Position status** — must not be BLOCKED or GATE_PENDING

If any blockers found, report them and STOP. Do not proceed with a blocked unit.

### 3. Load Unit Context
For the current unit, load:
- **Role & Model**: Honor the unit's role (R1-R8) and model assignment
  - R1 Schema Architect → Opus | R2 Implementer → Sonnet | R3 Test Writer → Sonnet
  - R4 Scrutinizer → Opus | R5 Reviewer → Opus | R6 Integrator → Sonnet
  - R7 Prompt Engineer → Opus | R8 Documenter → Haiku
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
- Run `npm run build` — MUST PASS
- Run `npm test` — MUST PASS (test count must not decrease)
- If any exit condition fails, report which ones and mark unit BLOCKED

### 6. Post-Unit Processing (Hook: post-roadmap-unit)
After successful completion:
- **Update position** — mark unit complete, advance current_unit to next
- **Index deliverables** — catalog all files created/modified by this unit
- **Phase gate check** — if this was the last unit in a phase, flag GATE_PENDING
- **Checkpoint** — trigger checkpoint every 3 completed units

### 7. Phase Gate (if triggered)
When a phase gate is pending:
- Run `npm run build` — MUST PASS
- Run `npm test` — MUST PASS (no regression from baseline)
- Verify Omega >= gate.omega_floor (target: 1.0)
- If gate.anti_regression: verify no test count decrease
- If gate.ralph_required: run Ralph loop
- Update CURRENT_POSITION.md with gate results
- Commit: `R0-P{N}-GATE: Phase {N} {title} — all checks pass`

### 8. Continue or Stop
- If next_unit exists: report progress and continue to step 2 (loop)
- If roadmap is COMPLETE: report final summary
- If BLOCKED: report blockers and stop

## Status Report Format
After each unit, output:
```
UNIT COMPLETE: {unit.id} — {unit.title}
Phase: {phase.id} / Unit: {unit.sequence} of {phase.units.length}
Progress: {percent_complete}% ({units_completed}/{total_units})
Build: PASS | Tests: PASS ({count})
Next: {next_unit.id} — {next_unit.title}
```

## Error Handling
- **Build failure**: Stop immediately. Report the build error. Do not proceed to next unit.
- **Test failure**: Stop immediately. Report failing tests. Fix before continuing.
- **Entry condition blocker**: Report which conditions are unmet. Suggest resolution.
- **Dependency not met**: Show which units need to complete first.
- **Tool not found**: Flag the invalid tool reference. Check MASTER_INDEX for correct name.
- **Step validation failure**: Retry once, then BLOCK if still failing.

## Commit Convention
After each unit: `R0-P{N}-U{NN}: {title} — {brief description}`
After each gate: `R0-P{N}-GATE: Phase {N} {title} — all checks pass`

## Target Quality
- Omega = 1.0 at every gate
- All tests passing, no regression
- Build clean (5.xMB, 1 known CommonJS warning only)

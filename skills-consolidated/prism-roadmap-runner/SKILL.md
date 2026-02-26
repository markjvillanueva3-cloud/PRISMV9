## Quick Reference (Operational)

### When To Use
- Trigger keywords: "continue roadmap", "next unit", "resume roadmap", "roadmap status", "continue roadmap {id}", "roadmap list", "switch roadmap {id}"
- Executing the next unit in an active roadmap
- Checking roadmap progress and status
- Switching between multiple active roadmaps

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-roadmap-runner")`
2. Identify the target roadmap (from argument, default active, or user prompt)
3. Follow the 10-step execution workflow below
4. The runner handles pre-validation, execution, post-processing, and gate checks automatically

### What It Returns
- **Format**: Structured status report after each unit
- **State files**: `data/state/{roadmap-id}/position.json` (updated), `data/state/{roadmap-id}/scrutiny-log.json`
- **Success**: Unit complete, position advanced, deliverables indexed
- **Failure**: Blockers reported, unit marked BLOCKED, execution stopped

---

## Architecture

### RGS Schema Awareness
This runner is designed for RGS-format roadmaps (validated against `roadmapSchema.ts`). For each unit, it honors:
- **Role** (R1-R8): Determines approach and thoroughness
- **Model**: Determines which AI model to use
- **Effort** (60-95): Calibrates depth of work
- **Steps**: Executed sequentially with tool_calls
- **Entry/Exit conditions**: Validated before and after execution

### Multi-Roadmap Support
Position files are stored at `data/state/{roadmap-id}/position.json`. The runner can:
- **Continue default**: Resume the most recently active roadmap
- **Continue by ID**: `continue roadmap RGS` or `continue roadmap TEST-health-check`
- **List active**: Show all roadmaps with position trackers
- **Switch**: Change the default active roadmap

### Hook Integration
Two hooks fire automatically during execution:
1. **pre-roadmap-execute** (before unit): Validates entry conditions, dependencies, tool refs, skill refs, position status
2. **post-roadmap-unit** (after unit): Updates position, indexes deliverables, checks phase gate, triggers checkpoint

---

## Execution Workflow (10 Steps)

### Step 1: Identify Roadmap
Determine which roadmap to continue:
- If argument provided: use that roadmap ID
- If no argument: find most recently updated `position.json` in `data/state/*/`
- If no active roadmaps: prompt user

### Step 2: Read Position
Load `data/state/{roadmap-id}/position.json`:
- `current_unit`: The unit to execute next
- `status`: Must be `IN_PROGRESS` (not BLOCKED, COMPLETE, or GATE_PENDING)
- `history`: Previously completed units

### Step 3: Load Roadmap
Read the roadmap file from `mcp-server/data/docs/roadmap/{ROADMAP-ID}-*.md` or the path stored in position.json.

### Step 4: Find Current Unit
Parse the roadmap to locate the unit matching `position.current_unit`. Extract all schema fields.

### Step 5: Pre-Execute Hook
Fire `roadmap.unit.pre_execute`:
- Validate all entry_conditions are satisfiable
- Verify all dependencies appear in position.history
- Check all tool references resolve to known prism_* dispatchers (32 dispatchers)
- Check all skill references are non-empty
- Verify position status is not BLOCKED or GATE_PENDING

If any blockers: STOP and report. Do not execute a blocked unit.

### Step 6: Execute Unit
Honor the unit's assigned role, model, and effort:

| Role | Approach | Model |
|------|----------|-------|
| R1 Schema Architect | Deep design thinking, type safety | Opus |
| R2 Implementer | Clean production code | Sonnet |
| R3 Test Writer | Thorough test coverage | Sonnet |
| R4 Scrutinizer | Critical analysis, gap detection | Opus |
| R5 Reviewer | Quality gates, validation | Opus |
| R6 Integrator | Wiring, registration, indexes | Sonnet |
| R7 Prompt Engineer | Prompt crafting, few-shot design | Opus |
| R8 Documenter | Clear documentation | Haiku |

For each step in `unit.steps`:
1. Read the instruction
2. Execute the specified tool_calls
3. Verify the step's validation condition
4. If validation fails: retry once, then BLOCK

### Step 7: Verify Exit Conditions
After all steps complete:
- Check every exit_conditions entry
- Run `npm run build` — MUST PASS
- Run `npm test` — test count must not decrease
- If any condition fails: report and mark BLOCKED

### Step 8: Post-Unit Hook
Fire `roadmap.unit.post_complete`:
- **Update position**: Mark unit complete, advance to next unit
- **Index deliverables**: Catalog files created/modified
- **Phase gate check**: Flag if last unit in phase
- **Checkpoint**: Trigger every 3 completed units

### Step 9: Phase Gate (if triggered)
When the post-unit hook flags `gate_pending: true`:
- Run `npm run build` — MUST PASS
- Run `npm test` — no regression
- Verify Omega >= gate.omega_floor (target: 1.0)
- If gate.anti_regression: verify test count did not decrease
- Update CURRENT_POSITION.md with gate results
- Commit: `R0-P{N}-GATE: Phase {N} {title} — all checks pass`

### Step 10: Continue or Stop
- **Next unit exists**: Report progress, loop to Step 2
- **Roadmap COMPLETE**: Report final summary with all deliverables
- **BLOCKED**: Report blockers and stop

---

## Status Report Format

After each unit:
```
UNIT COMPLETE: {unit.id} — {unit.title}
Phase: {phase.id} / Unit: {unit.sequence} of {phase.units.length}
Progress: {percent_complete}% ({units_completed}/{total_units})
Build: PASS | Tests: PASS ({count})
Next: {next_unit.id} — {next_unit.title}
```

After each gate:
```
GATE PASS: {phase.id} — {phase.title}
Omega: {score} | Tests: {count} | Build: PASS
Anti-regression: VERIFIED
```

---

## Error Handling

| Error | Action |
|-------|--------|
| Build failure | Stop immediately, report error |
| Test failure | Stop immediately, report failing tests |
| Entry condition unmet | Report which conditions, suggest resolution |
| Dependency not met | Show required units, their status |
| Tool not found | Flag invalid reference, check MASTER_INDEX |
| Step validation fail | Retry once, then BLOCK |
| Position BLOCKED | Report reason, require manual intervention |
| Position GATE_PENDING | Run gate protocol first |

---

## Commit Convention

- After each unit: `{roadmap-prefix}-U{NN}: {title} — {brief description}`
- After each gate: `{roadmap-prefix}-GATE: Phase {N} {title} — all checks pass`

---

## Related Skills
- `prism-roadmap-schema` — canonical schema reference
- `prism-roadmap-generator` — 7-stage generation pipeline
- `prism-roadmap-scrutinizer` — 12-category gap analysis
- `prism-roadmap-atomizer` — decomposition rules

## Related Files
- Schema: `mcp-server/src/schemas/roadmapSchema.ts`
- Pre-hook: `mcp-server/src/hooks/pre-roadmap-execute.ts`
- Post-hook: `mcp-server/src/hooks/post-roadmap-unit.ts`
- Indexer: `mcp-server/src/scripts/index-roadmap-outputs.ts`
- Command: `.claude/commands/continue-roadmap.md`

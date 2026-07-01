## Quick Reference (Operational)

### When To Use
- Trigger keywords: "atomize roadmap", "decompose phase", "break down roadmap", "split into units", "unit decomposition"
- Decomposing a high-level phase into atomic execution units
- Refining coarse-grained roadmap phases into detailed unit-level plans
- Assigning roles, models, tools, and effort levels to each unit
- Validating that a phase is fully decomposed with no orphaned deliverables

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-roadmap-atomizer")`
2. Provide the phase description or entire roadmap for decomposition
3. Apply the atomization rules and decomposition heuristics below
4. Assign roles, models, and tools using the assignment tables
5. Validate each resulting unit against `roadmapSchema.ts`

### What It Returns
- **Format**: Array of RoadmapUnit objects for each phase
- **Success**: All units validate against schema, no orphaned deliverables, every file touched appears in exactly one unit
- **Failure**: Specific gap descriptions for units that fail validation, with remediation guidance

---

## Atomization Rules

These rules are absolute constraints. Every unit produced by atomization must satisfy all seven.

1. **MAX UNIT SIZE**: No unit should take more than 1 session (~45 min). If estimated_minutes exceeds 45, split the unit further.
2. **SINGLE RESPONSIBILITY**: Each unit does exactly ONE thing. A unit that "creates types AND writes tests" must become two units.
3. **TESTABLE**: Each unit has verifiable exit conditions. "Done" is never an exit condition. Use concrete checks: "build passes", "file exists at path", "test suite green".
4. **REVERSIBLE**: Each unit has a rollback plan. Default: `git checkout -- [files]`. Safety-critical units must verify S(x) state restoration.
5. **ORDERED**: Units within a phase execute sequentially unless explicitly marked parallel. Declare dependencies in the `dependencies` array.
6. **COMPLETE**: Every file created or modified appears in exactly one unit's deliverables array. No orphaned files.
7. **INDEXED**: Every unit that creates a skill, script, hook, or command must set the corresponding `creates_skill`, `creates_script`, `creates_hook`, or `creates_command` flag to true.

---

## Decomposition Heuristics

Use these patterns as starting points. Adjust unit count based on complexity.

| Work Type                   | Typical Units | Pattern                                      |
|-----------------------------|---------------|----------------------------------------------|
| Create a new engine         | 3-4           | types/interface, implementation, tests, wiring |
| Create a new skill          | 2             | SKILL.md + metadata, registration            |
| Create a new script         | 2-3           | implementation, tests, registration          |
| Refactor existing code      | 2-3           | audit, refactor, validation                  |
| Add a new dispatcher action | 2             | implementation, tests                        |
| Integration/wiring          | 1-2           | wire + verify                                |
| Documentation               | 1             | write + commit                               |

### How to Read the Table

- **Work Type**: The high-level task described in the phase.
- **Typical Units**: How many atomic units this work type usually decomposes into.
- **Pattern**: The ordered sequence of unit responsibilities.

### When to Deviate

- If the engine has complex state management, add a dedicated "state design" unit before implementation.
- If the skill needs integration tests beyond registration, add a verification unit.
- If refactoring touches safety-critical code, add a dedicated scrutiny unit after validation.

---

## Role Assignment Rules

Every unit must have exactly one role. Use this table to determine which role fits.

| Unit Type                        | Role Code | Role Name        | Model      | Effort |
|----------------------------------|-----------|------------------|------------|--------|
| Creates types/interfaces/schemas | R1        | Schema Architect | Opus       | 95     |
| Writes production code           | R2        | Implementer      | Sonnet     | 80     |
| Writes tests                     | R3        | Test Writer      | Sonnet     | 75     |
| Does security review             | R4        | Scrutinizer      | Opus       | 95     |
| Runs Ralph/Omega validation      | R5        | Reviewer         | Opus       | 90     |
| Wires systems together           | R6        | Integrator       | Sonnet     | 80     |
| Creates prompts/templates        | R7        | Prompt Engineer  | Opus       | 90     |
| Writes docs/skills               | R8        | Documenter       | Haiku      | 60     |

### Role Assignment Logic

1. Determine what the unit **produces** (types, code, tests, docs, etc.).
2. Match the output to the Unit Type column.
3. If a unit spans two types, split it into two units -- each gets its own role.
4. Safety-critical work (R1, R4, R5) always uses Opus regardless of complexity.
5. Bulk/repetitive work (R8) uses Haiku to conserve budget.

---

## Tool Assignment Rules

Every step within a unit should reference the specific tools it needs. Use these rules to determine mandatory and recommended tools.

### Mandatory Tools (Must Include)

| Condition                        | Required Tool                              |
|----------------------------------|--------------------------------------------|
| Modifies TypeScript              | `prism_dev:build` (mandatory exit check)   |
| Could break tests                | `prism_dev:test_smoke` (mandatory exit check) |
| Phase gate                       | `prism_omega:compute` + `prism_ralph:loop` |
| Creates files                    | Desktop Commander or `prism_dev:file_write` |
| Saves learnings                  | `prism_guard:learning_save`                |
| Checkpoints                      | `prism_session:state_checkpoint`           |

### Recommended Tools (Include When Applicable)

| Condition                        | Recommended Tool                           |
|----------------------------------|--------------------------------------------|
| Searches codebase                | `prism_skill_script:skill_search`          |
| Needs architecture input         | `prism_sp:brainstorm`                      |
| Registers new assets             | `prism_skill_script:skill_load`            |
| Needs context from prior work    | `prism_session:state_recall`               |
| Runs full test suite             | `prism_dev:test_full`                      |

### Tool Assignment Logic

1. Read the unit's steps. For each step, identify what system interaction it requires.
2. Check the Mandatory table first. If a condition matches, the tool is non-negotiable.
3. Check the Recommended table. Include tools that improve reliability or traceability.
4. List all tools in the unit's `tools` array with `action` and `params` hints.

---

## Atomization Procedure

Follow this step-by-step procedure when decomposing a phase.

### Step 1: Inventory the Work

Read the phase description. List every file that will be created, modified, or deleted. List every system that will be touched (build, tests, registration, wiring).

### Step 2: Group by Responsibility

Cluster the file operations by responsibility type (schema, implementation, test, integration, docs). Each cluster becomes a candidate unit.

### Step 3: Apply Heuristics

Match each cluster to the Decomposition Heuristics table. Split or merge clusters until each maps to a single row in the table.

### Step 4: Assign Metadata

For each unit, assign:
- `id`: Phase prefix + sequential number (e.g., P2-U03)
- `role` and `role_name`: From the Role Assignment table
- `model`: From the Role Assignment table
- `effort`: From the Role Assignment table
- `tools`: From the Tool Assignment rules
- `deliverables`: Every file this unit touches
- `entry_conditions`: What must be true before this unit starts
- `exit_conditions`: What must be true after this unit completes
- `rollback`: How to undo this unit's changes
- `dependencies`: Which unit IDs must finish first

### Step 5: Validate

Run these checks on the full set of units:

1. **Coverage**: Every file from Step 1 appears in exactly one unit's deliverables.
2. **Size**: No unit exceeds 45 minutes estimated time.
3. **Ordering**: Dependencies form a DAG (no cycles).
4. **Roles**: Each unit has exactly one role from the assignment table.
5. **Tools**: Mandatory tools are present for all matching conditions.
6. **Exit conditions**: Every unit has at least one concrete, testable exit condition.
7. **Index flags**: Units that create skills/scripts/hooks/commands have the correct boolean flags set.

### Step 6: Emit

Output the units as an array of RoadmapUnit objects conforming to `roadmapSchema.ts`. Include the phase gate with appropriate `omega_floor` and `safety_floor` values.

---

## Anti-Patterns

Avoid these common mistakes during atomization.

1. **Units too large** (>1 session) -- Split further using decomposition heuristics.
2. **Units with no exit conditions** -- Add testable criteria: "build passes", "file exists", "test green".
3. **Units with TBD fields** -- Populate every field before proceeding. TBD is not a valid value.
4. **Multiple responsibilities in one unit** -- Split into separate units, one responsibility each.
5. **Missing deliverables for created files** -- Every `fs.writeFile` or file creation must appear in deliverables.
6. **Dependencies not declared** -- If unit B reads a file that unit A creates, B must list A in dependencies.
7. **Wrong role for unit type** -- Follow the Role Assignment table strictly. Do not assign R8 (Documenter) to production code.
8. **Missing mandatory tools** -- TypeScript changes without `prism_dev:build` in exit checks will cause silent failures.
9. **Circular dependencies** -- Units must form a directed acyclic graph. Cycles indicate a decomposition error.
10. **Skipped phase gate** -- Every phase must end with a gate unit or gate configuration. No exceptions.

---

## Example: Atomizing "Create a New Engine"

Given a phase description: "Create the FooEngine with types, implementation, tests, and wiring."

| Unit ID | Title                      | Role | Model  | Effort | Deliverables                        |
|---------|----------------------------|------|--------|--------|-------------------------------------|
| P2-U01  | Define FooEngine types     | R1   | Opus   | 95     | src/engines/foo/types.ts            |
| P2-U02  | Implement FooEngine        | R2   | Sonnet | 80     | src/engines/foo/fooEngine.ts        |
| P2-U03  | Write FooEngine tests      | R3   | Sonnet | 75     | src/engines/foo/__tests__/foo.test.ts |
| P2-U04  | Wire FooEngine to registry | R6   | Sonnet | 80     | src/engines/registry.ts (modified)  |

- P2-U02 depends on P2-U01 (needs types)
- P2-U03 depends on P2-U02 (needs implementation to test)
- P2-U04 depends on P2-U02 (needs implementation to wire)
- P2-U03 and P2-U04 can run in parallel (no mutual dependency)

---

## Related Files
- Schema: `mcp-server/src/schemas/roadmapSchema.ts`
- Generator: `skills-consolidated/prism-roadmap-generator/SKILL.md`
- Schema skill: `skills-consolidated/prism-roadmap-schema/SKILL.md`

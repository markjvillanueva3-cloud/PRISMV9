# Stage 5: Unit Population

You are a precision unit architect for CNC manufacturing intelligence systems. Your task is to take the phase skeletons from Stage 4 and populate every unit with complete, schema-conformant detail. This is the largest and most critical stage of the pipeline -- every mandatory field must be filled for every unit.

## Input

You will receive three inputs from previous stages:

**Phase Skeletons (Stage 4):**
```json
{{PHASE_SKELETONS}}
```

**Codebase Audit (Stage 2):**
```json
{{CODEBASE_AUDIT}}
```

**Schema Reference:** Each unit must conform to the `RoadmapUnit` schema defined in `roadmapSchema.ts`. The mandatory fields are listed in the checklist below.

## Instructions

For each phase skeleton, expand every unit hint into a fully populated `RoadmapUnit` object. Follow these steps for each unit:

### Step 1: Assign Identity

- `id`: Format as `P{phase}-U{sequence:02d}` (e.g., `P1-U01`, `P2-U03`)
- `rid`: Format as a section reference `{roadmap-id}.P{phase}.{sequence:02d}` (optional)
- `title`: Clear, imperative title describing the deliverable
- `phase`: Parent phase ID (e.g., `P1`)
- `sequence`: Zero-based execution order within the phase

### Step 2: Assign Role and Model

Use the role assignment matrix to select the correct role, model, and effort level:

| Unit Work Type           | Role | Role Name         | Model      | Effort |
|--------------------------|------|-------------------|------------|--------|
| Architecture / design    | R1   | Schema Architect  | opus-4.6   | 95     |
| Implementation           | R2   | Implementer       | sonnet-4.6 | 80     |
| Tests (unit/integration) | R3   | Test Writer       | sonnet-4.6 | 75     |
| Security review          | R4   | Scrutinizer       | opus-4.6   | 95     |
| Quality review           | R5   | Reviewer          | opus-4.6   | 90     |
| Integration / wiring     | R6   | Integrator        | sonnet-4.6 | 80     |
| Prompts / templates      | R7   | Prompt Engineer   | opus-4.6   | 90     |
| Documentation            | R8   | Documenter        | haiku-3.6  | 60     |

- `role`: The role code (R1-R8)
- `role_name`: The human-readable role name
- `model`: The model identifier from the matrix
- `effort`: The effort level from the matrix (adjust +/- 10 based on unit complexity)
- `rationale`: One sentence explaining why this role/model/effort was chosen

### Step 3: Assign Tools and Resources

- `tools`: Array of `ToolRef` objects. Each must include `tool` (the dispatcher name) and optionally `action` and `params_hint`. Only reference tools from the 32 PRISM dispatchers (see master-generator.md §Dispatcher Catalog for the complete list).
- `skills`: Array of skill references. PRISM has **two skill systems**:
  - **Claude Code Skills** (57 in `.claude/skills/`): Native SKILL.md files for security, documents, media, business, PM, MCP, dev. Reference by directory name (e.g., `owasp-security`, `xlsx`, `video-toolkit`).
  - **PRISM Internal Skills** (96 in `skills-consolidated/`): Three-tier MCP skills served via `prism_skill_script`. Reference by skill ID (e.g., `mfg-speed-feed`, `prism-roadmap-generator`).
  - Cross-reference the codebase audit's `existing_cc_skills` and `existing_prism_skills` arrays.
- `scripts`: Array of script paths from `src/scripts/`. Cross-reference the codebase audit.
- `hooks`: Array of hook names. Standard hooks include:
  - `pre_unit: validate_workspace` — verify clean build before starting
  - `post_unit: log_metrics` — record unit completion metrics
  - `pre_unit: check_deps` — verify dependency units completed
  - `post_unit: snapshot` — checkpoint state after completion
  - `post_unit: session_breadcrumb` — write breadcrumb for session continuity
  - `post_unit: sync_memory` — update MEMORY.md with latest position
- `features`: Array of PRISM features used. Available features:
  - `Desktop Commander` — file system operations via MCP
  - `web_search` — internet research
  - `file_operations` — read/write/edit files
  - `claude_flow` — multi-agent coordination (swarm orchestration, worktree agents, memory sharing). Use when the unit involves parallel work, cross-agent coordination, or would benefit from hierarchical/mesh/pipeline topology.
  - `session_infrastructure` — auto-memory sync, compaction survival, breadcrumbs
  - `playwright` — browser automation and testing
- `dependencies`: Array of unit IDs that must complete before this unit starts.

### Step 4: Define Conditions

- `entry_conditions`: Array of testable boolean statements that must be true before the unit starts. Examples:
  - "Build passes on current HEAD"
  - "P1-U01 exit conditions met"
  - "File src/schemas/foo.ts exists and compiles"
- `exit_conditions`: Array of testable boolean statements that must be true after the unit completes. Examples:
  - "File exists at specified deliverable path"
  - "All tests pass with zero failures"
  - "tsc --noEmit reports zero errors"
- `rollback`: A concrete rollback plan. Default: `git checkout -- [files modified by this unit]`. Be specific about which files.

### Step 5: Write Steps

- `steps`: Array of `RoadmapStep` objects. Each step must include:
  - `number`: Sequential integer starting at 1
  - `instruction`: Imperative, specific action. Write as a command, not a description. Include the WHY, not just the WHAT.
  - `tool_calls`: Array of tool call strings in format `dispatcher:action { param_hints }`. May be empty.
  - `validation`: How to verify this step succeeded (optional but recommended).
  - `notes`: Edge cases, warnings, or tips (optional).

- Aim for 2-5 steps per unit. Each step should be a single, verifiable action.

### Step 6: Define Deliverables

- `deliverables`: Array of `RoadmapDeliverable` objects. Each must include:
  - `path`: Relative file path from project root
  - `type`: One of: `skill`, `script`, `hook`, `command`, `schema`, `config`, `state`, `doc`, `test`, `source`, `template`, `data`
  - `description`: What this file does
  - `line_count_est`: Estimated lines of code (integer)
  - `index_entry`: How it appears in MASTER.md (optional)

### Step 7: Set Token and Time Estimates

- `estimated_tokens`: Approximate token cost for executing this unit (100-2000 range)
- `estimated_minutes`: Approximate wall-clock time in minutes (5-60 range)

### Step 8: Set Indexing Flags

- `index_in_master`: true if deliverables should appear in MASTER_INDEX.md
- `creates_skill`: true if this unit produces a new skill definition (either CC or PRISM)
- `creates_script`: true if this unit produces a new automation script
- `creates_hook`: true if this unit produces a new lifecycle hook
- `creates_command`: true if this unit produces a new slash command
- `uses_claude_flow`: true if this unit requires multi-agent coordination via claude-flow. When true, specify the topology (hierarchical, mesh, pipeline) in the unit's `features` array note.

## Mandatory Field Checklist

For EVERY unit, verify all of the following are populated:

- [ ] `id` -- unique within the roadmap
- [ ] `title` -- clear and imperative
- [ ] `phase` -- matches parent phase ID
- [ ] `sequence` -- zero-based, no gaps within a phase
- [ ] `role` -- valid R1-R8 code
- [ ] `role_name` -- matches the role code
- [ ] `model` -- matches the role assignment matrix
- [ ] `effort` -- 0-100 integer, matches matrix +/- 10
- [ ] `steps` -- at least 1 step, each with number and instruction
- [ ] `entry_conditions` -- at least 1 testable condition
- [ ] `exit_conditions` -- at least 1 testable condition
- [ ] `rollback` -- concrete, not generic
- [ ] `deliverables` -- at least 1 deliverable with path and type
- [ ] `dependencies` -- correct unit IDs or empty array for first units

## Anti-Patterns to Avoid

1. **Vague steps.** "Implement the feature" is not a step. "Create src/handlers/health.ts exporting an async handleHealth function that returns HealthResponse" is a step.
2. **Missing tool calls.** If a step creates a file, it must reference `prism_sp:write_file`. If it reads a file, it must reference `prism_sp:read_file`.
3. **Generic rollback.** "Undo changes" is not a rollback plan. "Delete src/handlers/health.ts and revert src/index.ts to pre-unit snapshot" is a rollback plan.
4. **Orphaned deliverables.** Every deliverable path must appear in at least one step's tool calls or instructions.
5. **Circular dependencies.** Unit A depending on Unit B while Unit B depends on Unit A.
6. **Missing exit conditions.** Every unit must have at least one testable exit condition.
7. **Effort mismatch.** Documentation units (R8) should not have effort 95. Schema design units (R1) should not have effort 60.
8. **Role mismatch.** Test-writing work should not be assigned to R2 (Implementer). Use R3 (Test Writer).
9. **Ignoring CC skills.** If a unit involves document generation (xlsx, docx, pdf, pptx), security review, or video creation, the corresponding CC skill MUST be referenced in the `skills` array. Do not rely only on PRISM internal skills.
10. **Missing claude-flow for parallel work.** If a phase has 3+ independent units, `uses_claude_flow` should be true and the feature `claude_flow` should be listed. Multi-agent coordination dramatically improves throughput for parallelizable phases.
11. **Fabricated dispatcher names.** Only use the 32 actual PRISM dispatchers listed in master-generator.md. Do NOT invent dispatcher names.

## Output Format

Return a JSON array of fully populated `RoadmapPhase` objects. Each phase contains its `units` array with every field filled:

```json
[
  {
    "id": "P1",
    "title": "Phase title",
    "description": "Phase description",
    "sessions": "1-2",
    "primary_role": "R1",
    "primary_model": "opus-4.6",
    "units": [
      {
        "id": "P1-U01",
        "title": "Unit title",
        "phase": "P1",
        "sequence": 0,
        "role": "R1",
        "role_name": "Schema Architect",
        "model": "opus-4.6",
        "effort": 95,
        "rationale": "...",
        "tools": [{ "tool": "prism_sp", "action": "write_file", "params_hint": "path: src/schemas/foo.ts" }],
        "skills": ["typescript-typing", "owasp-security"],
        "scripts": [],
        "hooks": ["pre_unit: validate_workspace", "post_unit: session_breadcrumb"],
        "features": ["file_operations"],
        "dependencies": [],
        "entry_conditions": ["Build passes on current HEAD"],
        "exit_conditions": ["File src/schemas/foo.ts exists and compiles"],
        "rollback": "Delete src/schemas/foo.ts",
        "steps": [
          {
            "number": 1,
            "instruction": "Design the response schema using Zod with fields status, uptime_ms, version, timestamp",
            "tool_calls": ["prism_sp:brainstorm { topic: 'response schema' }"],
            "validation": "Schema exports expected type",
            "notes": "Follow existing schema patterns in src/schemas/"
          }
        ],
        "deliverables": [
          {
            "path": "src/schemas/foo.ts",
            "type": "schema",
            "description": "Zod schema for the response contract",
            "line_count_est": 30
          }
        ],
        "estimated_tokens": 400,
        "estimated_minutes": 15,
        "index_in_master": true,
        "creates_skill": false,
        "creates_script": false,
        "creates_hook": false,
        "creates_command": false,
        "uses_claude_flow": false
      }
    ],
    "gate": {
      "omega_floor": 1.0,
      "safety_floor": 0.70,
      "ralph_required": false,
      "ralph_grade_floor": "B",
      "anti_regression": true,
      "test_required": true,
      "build_required": true,
      "checkpoint": true,
      "learning_save": true,
      "custom_checks": []
    },
    "scrutiny_checkpoint": false,
    "scrutiny_focus": []
  }
]
```

## Token Budget

Target output: ~2,000-5,000 tokens (scales linearly with unit count). Budget approximately 150-250 tokens per unit. For an XL roadmap with 40+ units, the output may approach 10,000 tokens -- this is acceptable for Stage 5 only.

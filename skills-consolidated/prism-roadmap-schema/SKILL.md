## Quick Reference (Operational)

### When To Use
- Trigger keywords: "roadmap schema", "roadmap format", "unit schema", "phase schema", "what fields does a roadmap need", "canonical roadmap", "RGS schema"
- Creating a new roadmap document
- Validating an existing roadmap against the canonical schema
- Understanding mandatory vs optional fields for roadmap units

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-roadmap-schema")`
2. Reference the field tables below for unit/phase/gate/envelope structure
3. Use factory functions from `src/schemas/roadmapSchema.ts` for programmatic creation
4. Validate JSON roadmaps with `parseRoadmap()` or `validateRoadmap()`

### What It Returns
- **Format**: Zod schema reference with field descriptions and constraints
- **Location**: `mcp-server/src/schemas/roadmapSchema.ts` (501 lines)
- **Exemplar**: `mcp-server/data/templates/roadmap-exemplar.md` + `.json`
- **Success**: Valid roadmap that passes all schema checks
- **Failure**: ZodError with field-level details on what's wrong

---

## Canonical Schema Reference

### Unit Fields (Mandatory)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique within roadmap, e.g. "P1-U01" |
| `title` | string | Human-readable title |
| `phase` | string | Parent phase ID |
| `sequence` | number | Execution order within phase |
| `role` | RoleCode | R1-R8 from role matrix |
| `role_name` | string | Human-readable role name |
| `model` | string | "opus-4.6", "sonnet-4.6", "haiku-4.5", or chain |
| `effort` | number | 0-100 effort level |
| `steps` | Step[] | Ordered actions (number, instruction, tool_calls, validation) |
| `deliverables` | Deliverable[] | Files/artifacts produced (path, type, description) |
| `entry_conditions` | string[] | Must be true before starting |
| `exit_conditions` | string[] | Must be true after completing |
| `rollback` | string | What to do if unit fails |

### Unit Fields (Optional but Recommended)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `rid` | string | — | Global reference ID, e.g. "§RGS.P1.01" |
| `rationale` | string | — | Why this role/model/effort was chosen |
| `tools` | ToolRef[] | [] | prism_* tools with action + params hint |
| `skills` | string[] | [] | Skill IDs to load |
| `scripts` | string[] | [] | Script paths to execute |
| `hooks` | string[] | [] | Hooks that fire during this unit |
| `features` | string[] | [] | PRISM features used |
| `dependencies` | string[] | [] | Unit IDs that must complete first |
| `estimated_tokens` | number | — | Approximate token cost |
| `estimated_minutes` | number | — | Approximate wall-clock time |
| `index_in_master` | boolean | false | Whether deliverables go in MASTER.md |
| `creates_skill` | boolean | false | Whether unit produces a new skill |
| `creates_script` | boolean | false | Whether unit produces a new script |
| `creates_hook` | boolean | false | Whether unit produces a new hook |
| `creates_command` | boolean | false | Whether unit produces a slash command |

### Phase Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Phase identifier, e.g. "P1" |
| `title` | string | Human-readable title |
| `description` | string | 1-2 sentence summary |
| `sessions` | string | Estimated session range, e.g. "1-2" |
| `primary_role` | RoleCode | Dominant role for this phase |
| `primary_model` | string | Dominant model for this phase |
| `units` | Unit[] | Ordered atomic units (min 1) |
| `gate` | Gate | Phase-end quality gate |
| `scrutiny_checkpoint` | boolean | Pause for scrutiny before execution? |
| `scrutiny_focus` | string[] | What scrutinizer should focus on |

### Gate Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `omega_floor` | number | 0.75 | Minimum Omega score (target 1.0) |
| `safety_floor` | number | 0.70 | Minimum safety score |
| `ralph_required` | boolean | false | Ralph loop mandatory? |
| `ralph_grade_floor` | string | "B" | Minimum Ralph grade |
| `anti_regression` | boolean | true | Snapshot diff required? |
| `test_required` | boolean | true | Tests must pass? |
| `build_required` | boolean | true | Build must pass? |
| `checkpoint` | boolean | true | Create session checkpoint? |
| `learning_save` | boolean | true | Persist learnings? |
| `custom_checks` | string[] | [] | Additional validation steps |

### Envelope Fields (Top-Level)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique roadmap ID, e.g. "RGS" |
| `version` | string | Semver, e.g. "1.0.0" |
| `title` | string | Human-readable title |
| `brief` | string | Original request that triggered generation |
| `created_at` | string | ISO timestamp |
| `created_by` | string | Creator identifier |
| `phases` | Phase[] | Ordered phases (min 1) |
| `total_units` | number | Sum of all units |
| `total_sessions` | string | Estimated session range |
| `role_matrix` | RoleSpec[] | All roles used |
| `tool_map` | ToolMapEntry[] | All tools used and where |
| `deliverables_index` | Deliverable[] | Flat list of all deliverables |
| `scrutiny_config` | ScrutinyConfig | Adaptive scrutiny settings |

---

## Common Anti-Patterns

1. **Missing exit conditions** — Every unit needs measurable exit criteria, not just "done"
2. **Vague steps** — Steps must be imperative and concrete: "Create file X" not "Set things up"
3. **No tool calls in steps** — Every step should reference specific `prism_*` calls or commands
4. **Missing rollback** — Default: `git checkout -- [files]`. Safety-critical: verify S(x) restoration
5. **Role/model mismatch** — Safety-critical work needs Opus, not Haiku. Bulk scanning needs Haiku, not Opus
6. **Missing dependencies** — If U03 needs U01's output, it must list U01 in dependencies
7. **Orphaned deliverables** — Every deliverable must be produced by exactly one unit
8. **No gate on phase** — Every phase needs an explicit quality gate with omega_floor

---

## Related Files
- Schema: `mcp-server/src/schemas/roadmapSchema.ts`
- Exemplar (md): `mcp-server/data/templates/roadmap-exemplar.md`
- Exemplar (json): `mcp-server/data/templates/roadmap-exemplar.json`
- RGS source: `RGS-roadmap-generation-system.md`

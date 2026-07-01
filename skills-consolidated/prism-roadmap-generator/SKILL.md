## Quick Reference (Operational)

### When To Use
- Trigger keywords: "generate roadmap", "create roadmap", "build roadmap for", "plan roadmap", "new roadmap from brief", "roadmap generation"
- Converting a human brief into a fully-detailed RGS-format roadmap
- When starting a new project phase that needs structured execution planning
- When the user describes what they want built and needs a step-by-step execution plan

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-roadmap-generator")`
2. Follow the 8-step workflow below (Steps 1-7 are the core pipeline, Step 8 is scrutinization)
3. Validate output against prism-roadmap-schema
4. Deliver the roadmap `.md` file plus state files to the user

### What It Returns
- **Format**: Complete RGS-format roadmap (markdown document + JSON state files)
- **Location**: `mcp-server/data/roadmaps/{roadmap-id}.md` + `data/state/{roadmap-id}/`
- **Success**: Validated RoadmapEnvelope with all mandatory fields, passing schema checks
- **Failure**: Specific error messages indicating which pipeline stage failed and why

---

## 8-Step Generation Workflow

### Step 1: INTAKE (Brief Analysis)

Capture the brief from the user. If the brief is ambiguous, ask clarifying questions before proceeding.

**Structured brief fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `goal` | string | Yes | What the user wants to achieve |
| `scope` | string | Yes | Boundaries -- what is in and what is out |
| `constraints` | string[] | No | Technical, time, or resource constraints |
| `domain` | enum | Yes | "manufacturing" / "infrastructure" / "tooling" / "meta" / "product" |
| `urgency` | enum | Yes | "low" / "normal" / "high" / "critical" |
| `category` | enum | Yes | "new_feature" / "refactor" / "integration" / "infrastructure" / "documentation" / "meta_system" |

**Validation rules:**
- If brief is < 10 characters, return error requesting more detail
- If no clear scope, return up to 3 clarifying questions
- If conflicting signals detected (e.g. "quick" + "comprehensive"), surface the conflict

**Token budget:** ~500 tokens output

---

### Step 2: AUDIT (Codebase Search)

Search the existing codebase for relevant assets that can be reused or extended.

**Actions:**
1. Call `prism_skill_script:skill_search` with keywords extracted from the brief
2. Call `prism_knowledge:search` with domain terms
3. Search for matching files and patterns in the relevant source directories
4. Build the leverage table: what exists, what can be reused, what needs modification

**Asset universe (current counts):**

| Asset Type | Count | Location |
|-----------|-------|----------|
| Skills | 61 | `skills-consolidated/` |
| Scripts | 48 | `src/scripts/` |
| Dispatchers | 32 | `src/dispatchers/` |
| Engines | 73 | `src/engines/` |
| Algorithms | 17 | `src/algorithms/` |
| Hooks | varies | `src/hooks/` |

**Output:** `CodebaseAudit` object with `existing_skills`, `existing_scripts`, `related_dispatchers`, `related_engines`, `reusable_patterns` arrays.

**If no relevant assets found:** Return empty arrays. This indicates ground-up work with no leverage.

**Token budget:** ~1,000 tokens output

---

### Step 3: ESTIMATE (Scope Sizing)

Based on brief complexity combined with audit results, produce a scope estimate.

**Complexity-to-scope mapping:**

| Complexity | Phases | Units | Sessions | Typical Tokens |
|-----------|--------|-------|----------|----------------|
| S | 1-2 | 3-8 | 1-2 | 6,600 |
| M | 3-4 | 8-20 | 3-5 | 7,500 |
| L | 5-7 | 20-40 | 5-10 | 8,500 |
| XL | 8+ | 40+ | 10+ | 9,600+ |

**Adjustment rules:**
- Each reusable skill or script from the audit saves ~1-2 units
- Clamp phases to 1-15 range
- Clamp units to 1-100 range
- If estimated tokens exceed 15,000, consider splitting into multiple roadmaps

**Output fields:** `phases_count`, `units_count`, `sessions_estimate`, `new_skills_needed`, `new_scripts_needed`, `new_hooks_needed`, `files_to_create`, `files_to_modify`, `estimated_total_tokens`

**Token budget:** ~300 tokens output

---

### Step 4: DECOMPOSE (Phase Breakdown)

Break the scope into ordered phases, each representing a logical grouping of related work.

**Phase ordering principles:**
1. Foundations first (schemas, types, interfaces)
2. Core implementation in the middle (engines, dispatchers, logic)
3. Integration and wiring after core
4. Testing and validation near the end
5. Documentation and polish last

**Per-phase requirements:**
- Each phase gets: `id`, `title`, `description`, `sessions` estimate, `primary_role`, `primary_model`
- Each phase should be completable in 1-3 sessions
- Each phase has a quality gate with at minimum `omega_floor` and `test_required`
- Dependency phases must be listed (no implicit ordering)

**Validation:** If only 1 phase, still wrap in array. If >15 phases, re-evaluate and consolidate.

**Token budget:** ~800 tokens output

---

### Step 5: POPULATE (Unit Details)

For EVERY unit in EVERY phase, fill ALL mandatory schema fields. This is the largest and most critical stage.

**Per-unit mandatory checklist:**
- [ ] `id` assigned (format: "P{n}-U{nn}", e.g. "P1-U01")
- [ ] `title` -- concise, descriptive
- [ ] `phase` -- parent phase ID
- [ ] `sequence` -- execution order within phase (1-based)
- [ ] `role` and `role_name` -- assigned per the Role Assignment Matrix below
- [ ] `model` -- assigned per the Role Assignment Matrix below
- [ ] `effort` -- 60-95 based on complexity
- [ ] `steps[]` -- numbered, imperative, specific, with tool calls where applicable
- [ ] `entry_conditions[]` -- testable boolean statements (what must be true before starting)
- [ ] `exit_conditions[]` -- testable boolean statements (what must be true after completing)
- [ ] `rollback` -- recovery plan if unit fails
- [ ] `deliverables[]` -- files/artifacts with paths, types, line estimates
- [ ] `dependencies[]` -- unit IDs that must complete first

**Per-unit recommended fields:**
- [ ] `rid` -- global reference ID (format: "section-RGS.P{n}.{nn}")
- [ ] `tools[]` -- `prism_*` tool references with action and params
- [ ] `skills[]` -- skill IDs to load
- [ ] `scripts[]` -- script paths to execute
- [ ] `hooks[]` -- hooks that fire during this unit
- [ ] `estimated_tokens` and `estimated_minutes`
- [ ] Index flags: `creates_skill`, `creates_script`, `creates_hook`, `creates_command`

**Token budget:** ~2,000-5,000 tokens output (scales with unit count)

---

### Step 6: RESOLVE (Tool and Dependency Validation)

Validate all references and build the cross-cutting artifacts.

**Validation checks (all must pass):**
1. All `prism_*` tool references resolve to actual dispatchers (32 dispatchers, 541 actions)
2. All skill references resolve to entries in SkillRegistry (61 skills)
3. All script references resolve to entries in ScriptRegistry (48 scripts)
4. No circular dependencies -- topological sort must succeed
5. Sequence numbers respect dependency order
6. Every deliverable is produced by exactly one unit (no orphans, no duplicates)

**Output artifacts:**
- `tool_map[]` -- which tools are used by which units
- `role_matrix[]` -- which roles appear and their unit count
- `dependency_graph` -- ASCII representation of unit dependencies

**Error handling:**
- If circular dependency found: break the cycle and emit a warning
- If a tool reference does not exist: flag as error, do not silently skip
- If a deliverable is orphaned: assign it to the nearest relevant unit

**Token budget:** ~500 tokens output

---

### Step 7: FORMAT (Output Rendering)

Render the complete roadmap as markdown and create the state files.

**Markdown document structure (follows exemplar):**
1. Header with metadata: id, version, title, brief, created_at, created_by
2. Deliverables inventory table
3. Role matrix table
4. Tool map table
5. Dependency graph (ASCII art)
6. Leverage table (existing assets reused from audit)
7. Scrutiny config block
8. Phase sections -- each with full unit details
9. Gate sections -- each with quality criteria

**State files to create:**
- `data/state/{roadmap-id}/position.json` -- initialized to first unit of first phase
- `data/state/{roadmap-id}/scrutiny-log.json` -- empty array, ready for scrutiny passes

**Final validation:** Run the complete envelope through `parseRoadmap()` or `validateRoadmap()` from `roadmapSchema.ts` before writing.

**Token budget:** ~1,500 tokens output

---

### Step 8: SCRUTINIZE (Adaptive Quality Loop)

Auto-run adaptive scrutinization on the generated roadmap.

**Process:**
1. Load `prism-roadmap-scrutinizer` skill
2. Run adaptive loop: minimum 3 passes, maximum 7 passes
3. Convergence criterion: delta (new issues found) < 2 between consecutive passes
4. Fix gaps found in each round before the next pass
5. If CRITICAL-severity gaps survive past round 4: escalate for human review
6. Log each pass result to `data/state/{roadmap-id}/scrutiny-log.json`

**Pass focus areas (rotate):**
- Pass 1: Schema completeness -- are all mandatory fields populated?
- Pass 2: Dependency integrity -- do all references resolve? Any cycles?
- Pass 3: Specificity -- are steps concrete and imperative? Any vague language?
- Pass 4+: Cross-cutting concerns -- role/model fit, token budgets, parallelism opportunities

**Exit criteria for scrutinization:**
- All CRITICAL gaps resolved
- All HIGH gaps resolved or explicitly deferred with rationale
- Delta < 2 for two consecutive passes
- Total passes <= 7

---

## Role Assignment Matrix

| Unit Type | Role Code | Role Name | Model | Effort Level |
|-----------|-----------|-----------|-------|-------------|
| Architecture / design | R1 | Schema Architect | opus-4.6 | 95 |
| Implementation / coding | R2 | Implementer | sonnet-4.6 | 80 |
| Tests / test writing | R3 | Test Writer | sonnet-4.6 | 75 |
| Security review | R4 | Scrutinizer | opus-4.6 | 95 |
| Quality review / audit | R5 | Reviewer | opus-4.6 | 90 |
| Integration / wiring | R6 | Integrator | sonnet-4.6 | 80 |
| Prompts / templates | R7 | Prompt Engineer | opus-4.6 | 90 |
| Documentation / docs | R8 | Documenter | haiku-4.5 | 60 |

**Model selection rationale:**
- **opus-4.6** -- Deep reasoning, architecture decisions, security analysis, prompt crafting
- **sonnet-4.6** -- High-volume code generation, implementation, integration, tests
- **haiku-4.5** -- Bulk documentation, boilerplate, index updates, low-stakes formatting

---

## Token Budget Summary

| Stage | Tokens (est) |
|-------|-------------|
| 1. INTAKE (Brief Analysis) | 500 |
| 2. AUDIT (Codebase Search) | 1,000 |
| 3. ESTIMATE (Scope Sizing) | 300 |
| 4. DECOMPOSE (Phase Breakdown) | 800 |
| 5. POPULATE (Unit Details) | 2,000-5,000 |
| 6. RESOLVE (Validation) | 500 |
| 7. FORMAT (Output Rendering) | 1,500 |
| **Total (pipeline only)** | **6,600-9,600** |
| 8. SCRUTINIZE (3-7 passes) | 1,500-3,500 |
| **Total (with scrutiny)** | **8,100-13,100** |

---

## Anti-Patterns to Avoid

1. **Vague steps** -- "implement the feature" is never acceptable. ALWAYS be specific: "Create file `src/engines/fooEngine.ts` exporting class `FooEngine` with methods `init()`, `process()`, `shutdown()`"
2. **Missing tool calls** -- EVERY unit that touches PRISM infrastructure must list the specific `prism_*` tools and actions it will call
3. **Missing exit conditions** -- EVERY unit needs testable exit criteria. "Done" is not an exit condition. "File `src/engines/fooEngine.ts` exists and exports `FooEngine` class" is
4. **Wrong model assignment** -- Opus for deep thinking (architecture, security, prompts). Sonnet for building (implementation, tests, wiring). Haiku for documentation and bulk formatting. Never assign Haiku to security-critical work
5. **Orphaned deliverables** -- EVERY file produced must appear in exactly one unit's `deliverables[]` array. No file should be created without being tracked
6. **Unindexed outputs** -- EVERY skill, script, hook, or command produced must set the corresponding index flag (`creates_skill`, `creates_script`, etc.) so the MASTER_INDEX stays current
7. **Sequential when parallel is possible** -- If two units have no dependency relationship, they should be marked as parallelizable. Do not force artificial sequencing
8. **Missing rollback plans** -- Default rollback is `git checkout -- [affected files]`. Safety-critical units need explicit state verification in their rollback

---

## Error Recovery Strategy

| Failure Type | Action |
|-------------|--------|
| Stage fails validation | Retry once with error context appended to prompt |
| Unit fails schema check | Fix the specific field and re-validate |
| Referenced tool does not exist | Flag as error in warnings array, do not silently skip |
| Token output exceeds 2x budget | Summarize, split into sub-roadmaps, or reduce unit detail |
| >3 stages fail | Abort pipeline and report full diagnostics to user |
| Circular dependency detected | Break the weakest edge, emit warning, re-run topological sort |
| Scrutiny finds CRITICAL gaps past round 4 | Escalate to human review with gap details |

---

## Related Files

- **Pipeline architecture**: `mcp-server/data/docs/RGS_PIPELINE_ARCHITECTURE.md`
- **Schema (source of truth)**: `mcp-server/src/schemas/roadmapSchema.ts`
- **Schema skill (field reference)**: `skills-consolidated/prism-roadmap-schema/SKILL.md`
- **Prompt templates**: `mcp-server/data/templates/rgs-prompts/`
- **Exemplar (markdown)**: `mcp-server/data/templates/roadmap-exemplar.md`
- **Exemplar (JSON)**: `mcp-server/data/templates/roadmap-exemplar.json`
- **Scrutinizer skill**: `skills-consolidated/prism-roadmap-scrutinizer/SKILL.md`
- **Atomizer skill**: `skills-consolidated/prism-roadmap-atomizer/SKILL.md`

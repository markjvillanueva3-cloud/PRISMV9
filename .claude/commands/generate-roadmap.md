Generate a fully-detailed RGS-format roadmap from a brief.

## Prerequisites
Load these skills before starting:
1. `prism_skill_script->skill_content(id="prism-roadmap-schema")` — understand the format
2. `prism_skill_script->skill_content(id="prism-roadmap-generator")` — follow the 7-stage pipeline
3. `prism_skill_script->skill_content(id="prism-roadmap-atomizer")` — decomposition rules

## Input
Capture the user's brief from $ARGUMENTS or ask for it if not provided.

## Execution
Execute the 7-stage pipeline:

1. **Brief Analysis** — Parse raw text into structured brief (goal, scope, constraints, domain, urgency, complexity, category). If ambiguous, ask clarifying questions.
2. **Codebase Audit** — Search existing assets: skills (61), scripts (48), dispatchers (32), engines (73), algorithms (17). Build leverage table.
3. **Scope Estimation** — Classify complexity (S/M/L/XL), estimate phases, units, sessions, token cost.
4. **Phase Decomposition** — Break scope into ordered phases. Foundations before features. Each phase 1-3 sessions.
5. **Unit Population** — For EVERY unit, fill ALL mandatory schema fields: role (R1-R8), model, effort, steps with tool calls, entry/exit conditions, rollback, deliverables, index flags.
6. **Dependency Resolution** — Validate DAG (no cycles), resolve tool/skill references, build tool_map + role_matrix + dependency_graph.
7. **Output Formatting** — Render markdown roadmap + position.json + scrutiny-log.json.

## Model Selection
- Use Opus for stages 1, 4, 5 (analysis, decomposition, population)
- Use Sonnet for stages 2, 3, 6 (audit, estimation, resolution)
- Use Haiku for stage 7 (formatting)

## Output Files (Modular)
For each milestone generated:
- Envelope: `C:\PRISM\mcp-server\data\milestones\{MILESTONE-ID}.json` (per-milestone JSON envelope)
- Position: `C:\PRISM\mcp-server\data\state\{MILESTONE-ID}\position.json`
- Index entry added to: `C:\PRISM\mcp-server\data\roadmap-index.json`

Legacy (full roadmap markdown, optional):
- Roadmap: `C:\PRISM\mcp-server\data\docs\roadmap\{ROADMAP-ID}-{slug}.md`
- Scrutiny log: `C:\PRISM\state\{roadmap-id}\scrutiny-log.json`

## Post-Generation
- Write each milestone envelope to `data/milestones/{MILESTONE-ID}.json`
- Update `data/roadmap-index.json` with new milestone entries (id, title, track, dependencies, total_units, envelope_path, position_path)
- Run adaptive scrutinization (load prism-roadmap-scrutinizer, 3-7 passes, delta < 2)
- Report: roadmap location, unit count, session estimate, scrutiny score
- Target Omega >= 1.0 for generated roadmap quality

## Validation
- Every unit must validate against roadmapSchema.ts
- Every deliverable must be produced by exactly one unit
- Every tool reference must resolve to an actual prism_* dispatcher
- Every skill reference must exist in skills-consolidated/
- No circular dependencies allowed

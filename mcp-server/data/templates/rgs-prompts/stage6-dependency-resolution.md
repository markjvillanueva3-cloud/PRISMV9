# Stage 6: Dependency Resolution

You are a dependency resolver for CNC manufacturing intelligence systems. Your task is to validate the populated phases from Stage 5, resolve all dependencies, build cross-cutting maps, and ensure the roadmap is structurally sound before final formatting.

## Input

You will receive the fully populated phases from Stage 5:

```json
{{POPULATED_PHASES}}
```

## Instructions

Perform the following validation and resolution passes in order:

### Pass 1: Dependency Graph Validation

1. **Build a directed acyclic graph (DAG)** from all unit `dependencies` arrays.
2. **Detect circular dependencies.** Perform a topological sort on the DAG. If a cycle is detected, identify the cycle members and break it by removing the weakest dependency (the one with the highest sequence number).
3. **Verify ordering.** For every dependency edge `A -> B`, confirm that `A.sequence` < `B.sequence` within the same phase, or that `A.phase` precedes `B.phase` across phases.
4. **Verify completeness.** Every unit ID referenced in a `dependencies` array must exist in the roadmap. Flag any dangling references.

### Pass 2: Tool Resolution

1. **Collect all tool references** from every unit's `tools` array and `steps[].tool_calls`.
2. **Validate against the dispatcher catalog.** All `prism_*` tool references must resolve to one of the 32 registered dispatchers (541 total actions). Flag any unknown tools.
3. **Build the tool map.** For each unique tool, record which phases and units use it.

### Pass 3: Skill and Script Resolution

1. **Collect all skill references** from every unit's `skills` array.
2. **Validate against the skill registry.** All skill IDs must resolve to entries in `skills-consolidated/` (61 skills). Flag any unknown skills.
3. **Collect all script references** from every unit's `scripts` array.
4. **Validate against the script registry.** All script paths must resolve to entries in `src/scripts/` (48 scripts). Flag any unknown scripts.

### Pass 4: Deliverable Validation

1. **Collect all deliverables** across all units.
2. **Check for orphans.** Every deliverable must be produced by exactly one unit. Flag duplicates (two units producing the same path).
3. **Check for gaps.** If a unit's steps reference a file path that does not appear in its deliverables, flag it.

### Pass 5: Sequence Integrity

1. **Verify phase ordering.** P1 < P2 < P3 etc.
2. **Verify unit sequences.** Within each phase, sequences must be contiguous starting from 0.
3. **Verify dependency ordering.** A unit's dependencies must all have lower sequence numbers (same phase) or belong to earlier phases.

## Output Format

Return a JSON object with four fields:

```json
{
  "validated_phases": [],
  "tool_map": [
    {
      "tool": "prism_sp",
      "phases": ["P1", "P2"],
      "purpose": "File operations and build management"
    }
  ],
  "role_matrix": [
    {
      "code": "R1",
      "name": "Schema Architect",
      "model": "opus-4.6",
      "effort": 95,
      "description": "Design data contracts and type schemas"
    }
  ],
  "dependency_graph": "P1-U01 --> P1-U02 --> P1-U03\n                              |\n                         P2-U01 --> P2-U02",
  "warnings": [],
  "errors": []
}
```

- `validated_phases`: The input phases, corrected if any issues were found (broken cycles, fixed sequences).
- `tool_map`: Array of `ToolMapEntry` objects -- one per unique tool used.
- `role_matrix`: Array of `RoleSpec` objects -- one per unique role used.
- `dependency_graph`: ASCII representation of the full dependency graph.
- `warnings`: Non-blocking issues (e.g., unused skills, redundant dependencies).
- `errors`: Blocking issues that must be resolved (e.g., circular deps, missing tools).

## Error Handling

- **Circular dependency found:** Break the cycle by removing the dependency from the unit with the higher sequence number. Add a warning.
- **Unknown tool reference:** Add an error. The tool must exist or be removed.
- **Unknown skill/script reference:** Add a warning. The skill/script may need to be created.
- **Duplicate deliverable:** Add an error. Two units must not produce the same file.
- **Dangling dependency:** Add an error. The referenced unit ID does not exist.

## Token Budget

Target output: ~500 tokens for the maps and graph, plus the validated phases (same size as input). Total should not exceed input size + 800 tokens.

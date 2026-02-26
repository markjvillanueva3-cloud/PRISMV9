Run scrutinization on a roadmap file.

## Prerequisites
Load these skills before starting:
1. `prism_skill_script->skill_content(id="prism-roadmap-scrutinizer")` — gap analysis framework
2. `prism_skill_script->skill_content(id="prism-roadmap-schema")` — schema reference

## Input
Read the roadmap file from $ARGUMENTS (path to .md or .json file). If no path provided, ask the user.

## Execution
1. Parse the roadmap structure (markdown or JSON)
2. Run all 12 gap category checks:
   - Schema Completeness — mandatory fields populated
   - Tool Validity — all prism_* references resolve
   - Skill Validity — all skill IDs exist
   - Dependency Integrity — no cycles, no missing targets
   - Role/Model Alignment — correct model for unit type
   - Exit Condition Quality — testable, specific, complete
   - Step Specificity — imperative, concrete, tool calls included
   - Deliverable Coverage — no orphans, no phantoms
   - Index Flags — creates_skill/script/hook/command set correctly
   - Sequence Optimization — parallelizable units identified
   - Gate Coverage — every phase has quality gate
   - Rollback Coverage — actionable rollback per unit
3. Score the roadmap (0-1.0 scale)
4. If score < 0.92: run adaptive improvement loop
   - Min 3 passes, max 7
   - Auto-fix MINOR gaps
   - Propose fixes for MAJOR gaps
   - Escalate CRITICAL gaps surviving round 4+
   - Converge when delta < 2 new gaps per round
5. Write scrutiny-log.json to state/{roadmap-id}/
6. Report results

## Output Format
```
SCRUTINY REPORT: {roadmap-id}
Score: X.XX / 1.00
Status: APPROVED / NEEDS_WORK / ESCALATED
Mode: Adaptive (converged at round N of 7)

Gaps: X critical, X major, X minor
Rounds: X (converged: yes/no)
Auto-fixed: X
Remaining: X
Escalated: yes/no
```

If CRITICAL gaps remain, list each with:
- Unit ID, field, issue description, recommended fix
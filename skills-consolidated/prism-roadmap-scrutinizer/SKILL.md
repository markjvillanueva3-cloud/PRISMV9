## Quick Reference (Operational)

### When To Use
- Trigger keywords: "scrutinize roadmap", "check roadmap", "validate roadmap", "roadmap gaps", "roadmap quality", "roadmap review"
- Validating a roadmap before execution begins
- Finding gaps, missing fields, dependency issues, or role mismatches in an existing roadmap
- Running adaptive improvement loops to bring a roadmap up to approval threshold
- Scoring a roadmap on the 0-1.0 quality scale

### How To Use
1. Load skill: `prism_skill_script->skill_content(id="prism-roadmap-scrutinizer")`
2. Parse the target roadmap (JSON envelope or markdown document)
3. Run all 12 gap category checks against every unit in every phase
4. Score the roadmap using the weighted formula
5. If score < 0.92 or any CRITICAL gaps remain: enter the adaptive improvement loop
6. Output results to `data/state/{roadmap-id}/scrutiny-log.json`

### What It Returns
- **Format**: ScrutinyLog JSON with per-pass gap reports and cumulative scoring
- **Success**: `score >= 0.92`, `approved=true`, `convergence_achieved=true`, zero CRITICAL gaps
- **Failure**: `approved=false` with a list of remaining gaps including severity, category, unit ID, and specific fix instructions
- **Escalation**: If CRITICAL-severity gaps survive past round 4, `escalated=true` with human review flag

---

## 12 Gap Categories

### 1. SCHEMA_COMPLETENESS

For every unit in the roadmap, verify ALL mandatory schema fields are populated with real values.

**Detection:**
- Walk every unit and check each mandatory field from `roadmapSchema.ts`
- Mandatory fields: `id`, `title`, `phase`, `sequence`, `role`, `role_name`, `model`, `effort`, `steps`, `deliverables`, `entry_conditions`, `exit_conditions`, `rollback`
- Flag any field that is: empty string, null, undefined, "TBD", "TODO", "PLACEHOLDER", or obvious placeholder text (e.g. "fill in later", "...")

**Severity:**
- CRITICAL: A required field is missing entirely or null
- MINOR: A required field contains placeholder text ("TBD", "TODO")

**Fix:**
- Populate the field with an appropriate value based on the unit type, phase context, and surrounding units
- For `steps`: generate imperative, tool-referenced steps matching the unit title
- For `exit_conditions`: derive testable boolean statements from the deliverables list
- For `rollback`: default to `git checkout -- [affected files]` unless safety-critical

---

### 2. TOOL_VALIDITY

For every tool reference in every unit, verify the tool and action actually exist.

**Detection:**
- Collect all `tools[]` entries and inline `prism_*` references from step text
- Cross-reference against the 32 prism_* dispatchers (541 registered actions) and Desktop Commander tools
- Check both the dispatcher name and the specific action name

**Severity:**
- MAJOR: Tool dispatcher does not exist (e.g. `prism_nonexistent->action`)
- MINOR: Dispatcher exists but action name is wrong (e.g. `prism_skill_script->wrong_action`)

**Fix:**
- MAJOR: Replace with the correct dispatcher:action pair, or remove the reference if no suitable tool exists
- MINOR: Correct the action name to the nearest valid match from the dispatcher's action list

---

### 3. SKILL_VALIDITY

For every skill reference in every unit, verify the skill exists in `skills-consolidated/`.

**Detection:**
- Collect all `skills[]` entries from every unit
- Check each skill ID against the directory listing of `skills-consolidated/`
- A valid skill has a directory with at minimum a `SKILL.md` file

**Severity:**
- MAJOR: Referenced skill does not exist

**Fix:**
- If the skill is supposed to be created by an earlier unit in the same roadmap, verify that unit has `creates_skill=true` and the dependency is declared
- If the skill simply does not exist and is not planned: remove the reference and add a note, or create a new unit to produce the skill

---

### 4. DEPENDENCY_INTEGRITY

Verify all dependency references form a valid directed acyclic graph.

**Detection:**
- Collect all `dependencies[]` from every unit
- Verify every dependency target exists as a real unit ID in the roadmap
- Run topological sort to detect circular dependencies
- Check that dependencies respect phase boundaries (a unit in P1 should not depend on a unit in P3)
- Check that sequence numbers align with dependency order within the same phase

**Severity:**
- CRITICAL: Circular dependency detected (topological sort fails)
- CRITICAL: Dependency target does not exist as a unit ID
- MAJOR: Dependency violates phase ordering (later phase depends on earlier, which is normal; earlier phase depends on later, which is not)
- MINOR: Sequence numbers within a phase contradict declared dependencies

**Fix:**
- Circular: Break the weakest edge in the cycle (the dependency with the least semantic justification)
- Missing target: Add the missing unit or remove the dangling dependency
- Phase violation: Reorder phases or move the unit to the correct phase
- Sequence mismatch: Renumber sequences to match dependency order

---

### 5. ROLE_MODEL_ALIGNMENT

Verify that the role, model, and effort level assigned to each unit match the unit's type of work.

**Detection:**
- Classify each unit by its work type based on title, steps, and deliverables
- Compare the assigned `role`, `model`, and `effort` against the canonical Role Assignment Matrix

**Role Assignment Matrix:**

| Unit Work Type | Expected Role | Expected Model | Expected Effort |
|---------------|---------------|----------------|-----------------|
| Architecture / schema design | R1 (Schema Architect) | opus-4.6 | 95 |
| Implementation / coding | R2 (Implementer) | sonnet-4.6 | 80 |
| Tests / test writing | R3 (Test Writer) | sonnet-4.6 | 75 |
| Security review / audit | R4 (Scrutinizer) | opus-4.6 | 95 |
| Quality review / validation | R5 (Reviewer) | opus-4.6 | 90 |
| Integration / wiring | R6 (Integrator) | sonnet-4.6 | 80 |
| Prompts / templates | R7 (Prompt Engineer) | opus-4.6 | 90 |
| Documentation / docs | R8 (Documenter) | haiku-4.5 | 60 |

**Severity:**
- MAJOR: Safety-critical work (architecture, security) assigned to Haiku or low effort
- MAJOR: Architecture or security review assigned to R2/R3/R6/R8
- MINOR: Documentation assigned to Opus (wasteful but not incorrect)
- MINOR: Effort level off by more than 10 from expected

**Fix:**
- Reassign the unit to the correct role, model, and effort per the matrix
- If the unit genuinely spans two types, assign the higher-stakes role/model

---

### 6. EXIT_CONDITION_QUALITY

Verify that exit conditions are testable, specific, and complete.

**Detection:**
- For each unit, examine every entry in `exit_conditions[]`
- Check for testability: Can this be evaluated as a boolean true/false? Reject subjective language ("looks good", "seems correct", "properly implemented")
- Check for specificity: Does it reference actual file paths, command outputs, score thresholds, or measurable criteria?
- Check for completeness: Is every deliverable covered by at least one exit condition?

**Severity:**
- MAJOR: Exit condition is vague or subjective ("everything works", "code is clean")
- MAJOR: No exit conditions defined at all
- MINOR: Exit conditions exist but do not cover all deliverables

**Fix:**
- Replace vague conditions with specific, testable statements
- Example: Replace "tests pass" with "Running `npm test -- --grep 'FooEngine'` exits with code 0 and all assertions pass"
- Add conditions for uncovered deliverables: "File `src/engines/fooEngine.ts` exists and exports class `FooEngine`"

---

### 7. STEP_SPECIFICITY

Verify that every step in every unit is concrete, actionable, and uses imperative voice.

**Detection:**
- For each step in each unit, check for:
  - Imperative voice: starts with an action verb ("Create", "Run", "Validate", "Add")
  - Concrete action: not hedging language ("consider", "think about", "maybe", "possibly", "if appropriate")
  - Tool calls: steps that interact with PRISM infrastructure should reference specific `prism_*` tool:action pairs
  - Validation: steps that produce output should include a verification sub-step

**Severity:**
- MAJOR: Step uses vague or passive language ("the file should be updated", "consider adding tests")
- MINOR: Step is concrete but missing a tool call where one would be appropriate
- MINOR: Step produces output but has no validation sub-step

**Fix:**
- Rewrite vague steps in imperative voice with specific targets
- Add tool call references where the step interacts with PRISM dispatchers, engines, or scripts
- Add validation sub-steps (e.g. "Verify the file compiles: `tsc --noEmit src/engines/fooEngine.ts`")

---

### 8. DELIVERABLE_COVERAGE

Verify that deliverables are complete, non-orphaned, and fully described.

**Detection:**
- Collect all file paths mentioned in steps across all units
- Collect all entries in `deliverables[]` across all units
- Cross-reference: every file mentioned in steps should appear in a deliverables list
- Cross-reference: every deliverable should be traceable to at least one step that creates or modifies it
- Verify each deliverable entry has: `path`, `type`, `description`

**Severity:**
- MAJOR: A file is mentioned in steps but does not appear in any deliverables list (orphaned file)
- MAJOR: A deliverable is listed but no step creates or modifies it (phantom deliverable)
- MINOR: A deliverable is listed but missing its `description` field

**Fix:**
- Orphaned file: Add it to the correct unit's `deliverables[]` with appropriate type and description
- Phantom deliverable: Either add a step that produces it or remove it from the deliverables list
- Missing description: Generate a description from the file path, type, and surrounding context

---

### 9. INDEX_FLAGS

Verify that index flags are correctly set based on what each unit actually produces.

**Detection:**
- For each unit, scan deliverables and steps for:
  - Skill creation: deliverable path matches `skills-consolidated/*/SKILL.md` pattern -> `creates_skill` should be true
  - Script creation: deliverable path matches `src/scripts/*.ts` pattern -> `creates_script` should be true
  - Hook creation: deliverable path matches `src/hooks/*.ts` pattern -> `creates_hook` should be true
  - Command creation: deliverable path matches `.claude/commands/*.md` pattern -> `creates_command` should be true

**Severity:**
- MINOR: All index flag issues are MINOR (auto-fixable, no semantic impact)

**Fix:**
- Set the appropriate boolean flag to true
- This is always safe to auto-fix without human review

---

### 10. SEQUENCE_OPTIMIZATION

Check for unnecessary sequential ordering that could be parallelized.

**Detection:**
- For each pair of units within the same phase, check if they share any dependencies
- If two units have no dependency relationship (neither depends on the other, and they share no common upstream), they can run in parallel
- Flag units that are marked sequential but could be parallel

**Severity:**
- MINOR: All sequencing issues are MINOR (optimization, not correctness)

**Fix:**
- Remove the artificial dependency or add a note that these units are parallelizable
- Adjust sequence numbers if needed to reflect parallel execution opportunity

---

### 11. GATE_COVERAGE

Verify that every phase has a properly configured quality gate.

**Detection:**
- For each phase, check that a `gate` object exists
- Check mandatory gate fields: `omega_floor` (number), `test_required` (boolean), `build_required` (boolean), `checkpoint` (boolean)
- Verify `omega_floor` is a reasonable value (typically 0.70 - 1.0)

**Severity:**
- MAJOR: Phase has no gate defined at all
- MAJOR: Gate exists but `omega_floor` is missing or zero
- MINOR: Gate exists but missing `test_required`, `build_required`, or `checkpoint` fields

**Fix:**
- MAJOR (no gate): Create a gate with sensible defaults: `omega_floor: 0.75`, `test_required: true`, `build_required: true`, `checkpoint: true`
- MAJOR (no omega_floor): Set `omega_floor` to 0.75 (default floor)
- MINOR: Set missing boolean fields to `true` (safe default)

---

### 12. ROLLBACK_COVERAGE

Verify that every unit has a specific, actionable rollback plan.

**Detection:**
- For each unit, check that `rollback` field exists and is not empty
- Check that the rollback is actionable: contains specific commands, file paths, or operations
- Reject generic rollback text: "undo everything", "revert changes", "fix it"
- Safety-critical units (R1, R4, R5) should have rollback plans that verify state restoration

**Severity:**
- MAJOR: Rollback field is missing or empty
- MINOR: Rollback exists but is vague ("revert changes")

**Fix:**
- Default rollback: `git checkout -- [list of affected files from deliverables]`
- Safety-critical rollback: Include state verification steps (e.g. "Run `npm test` to confirm no regression after revert")
- If unit creates new files only (no modifications): `rm -f [list of created files]`

---

## Adaptive Improvement Loop

### Algorithm

```
config:
  min_passes: 3
  max_passes: 7
  convergence_rule: "delta < 2"
  approval_threshold: 0.92

Round 1 -- SCAN:
  Run all 12 gap category checks against every unit.
  Compute initial score.
  Record all gaps with severity, category, unit_id, description, and suggested fix.

Round 2 -- FIX + RESCAN:
  Apply fixes from Round 1:
    - Auto-fix all MINOR gaps (index flags, obvious role corrections, missing descriptions).
    - Propose fixes for MAJOR gaps (rewritten in the gap report, applied if unambiguous).
    - Flag CRITICAL gaps for manual review (do not auto-fix).
  Re-run all 12 gap checks on the modified roadmap.
  Record delta = count of NEW gaps found in this round (not carried over from Round 1).

Round 3 -- SECOND-ORDER EFFECTS:
  Apply fixes from Round 2.
  Re-run all 12 gap checks.
  Record delta.
  This round catches cascading effects: a fix in Round 2 may have introduced a new
  dependency issue or orphaned a deliverable.

Round 4+ -- CONVERGENCE CHECK:
  Apply remaining fixes, re-run checks, record delta.
  Decision logic:
    If delta < 2 AND no CRITICAL remaining:
      -> CONVERGED. Stop. Mark approved=true.
    If delta < 2 AND CRITICAL remaining:
      -> ESCALATED. Stop. Mark escalated=true, approved=false.
    If delta >= 2 AND no CRITICAL AND round < max_passes:
      -> CONTINUE to next round.
    If delta >= 2 AND CRITICAL AND round >= 4:
      -> ESCALATED. Stop. Mark escalated=true, approved=false.
    If round == max_passes (7):
      -> FORCE STOP. Mark approved=(score >= 0.92 AND no CRITICAL).
```

### Convergence Expectations by Roadmap Size

| Complexity | Units | Pass 1 Gaps | Pass 2 | Pass 3 | Pass 4 | Typical Convergence |
|-----------|-------|-------------|--------|--------|--------|-------------------|
| S | 3-8 | 5-10 | 2-4 | 0-1 | -- | Round 3 |
| M | 8-20 | 15-25 | 5-10 | 1-3 | 0-1 | Round 4 |
| L | 20-40 | 25-40 | 10-15 | 3-5 | 1-2 | Round 5 |
| XL | 40+ | 40+ | 15-25 | 5-10 | 2-5 | Round 6-7 |

### Per-Round Focus Rotation

While all 12 categories are checked every round, each round has a primary focus for fix prioritization:

- **Round 1**: Schema completeness and tool/skill validity (categories 1-3)
- **Round 2**: Dependencies and role alignment (categories 4-5)
- **Round 3**: Exit conditions and step specificity (categories 6-7)
- **Round 4+**: Cross-cutting concerns: deliverables, index flags, sequencing, gates, rollback (categories 8-12)

---

## Scoring Formula

```
scrutiny_score = 1.0 - (weighted_gap_sum / total_possible_checks)

Where:
  weighted_gap_sum = (critical_count * 3) + (major_count * 2) + (minor_count * 1)
  total_possible_checks = 12 * total_units
```

The denominator represents the theoretical maximum if every unit failed every category check exactly once.

### Approval Thresholds

| Outcome | Condition | Action |
|---------|-----------|--------|
| APPROVED | `score >= 0.92` AND zero CRITICAL gaps remaining | Roadmap is ready for execution |
| NEEDS_WORK | `score < 0.92` OR any CRITICAL remaining (but not escalated) | Return gap report with fix instructions |
| ESCALATED | CRITICAL gaps survived past round 4 OR round 7 reached with CRITICAL remaining | Flag for human review with full gap details |

### Score Interpretation Guide

| Score Range | Quality Level | Typical Action |
|------------|--------------|----------------|
| 0.95 - 1.00 | Excellent | Approve immediately |
| 0.92 - 0.95 | Good | Approve, minor polish optional |
| 0.85 - 0.92 | Acceptable | Fix remaining MAJOR gaps, re-scrutinize |
| 0.70 - 0.85 | Needs Work | Significant gaps, multiple fix rounds needed |
| Below 0.70 | Poor | Consider regenerating the roadmap |

---

## Output Format (scrutiny-log.json)

```json
{
  "roadmap_id": "RGS",
  "scrutiny_version": "1.0.0",
  "started_at": "2026-02-24T10:00:00Z",
  "completed_at": "2026-02-24T10:02:15Z",
  "config": {
    "min_passes": 3,
    "max_passes": 7,
    "convergence_rule": "delta < 2",
    "approval_threshold": 0.92
  },
  "total_units": 24,
  "total_phases": 5,
  "passes": [
    {
      "round": 1,
      "type": "SCAN",
      "focus": "schema_completeness, tool_validity, skill_validity",
      "gaps_found": 18,
      "gaps_by_severity": {
        "CRITICAL": 2,
        "MAJOR": 8,
        "MINOR": 8
      },
      "gaps_by_category": {
        "SCHEMA_COMPLETENESS": 4,
        "TOOL_VALIDITY": 2,
        "SKILL_VALIDITY": 1,
        "DEPENDENCY_INTEGRITY": 1,
        "ROLE_MODEL_ALIGNMENT": 3,
        "EXIT_CONDITION_QUALITY": 2,
        "STEP_SPECIFICITY": 1,
        "DELIVERABLE_COVERAGE": 1,
        "INDEX_FLAGS": 2,
        "SEQUENCE_OPTIMIZATION": 0,
        "GATE_COVERAGE": 1,
        "ROLLBACK_COVERAGE": 0
      },
      "gaps": [
        {
          "id": "GAP-001",
          "category": "SCHEMA_COMPLETENESS",
          "severity": "CRITICAL",
          "unit_id": "P2-U03",
          "field": "exit_conditions",
          "description": "exit_conditions array is empty",
          "suggested_fix": "Add: ['File src/engines/fooEngine.ts exists and exports FooEngine class', 'Running tsc --noEmit exits with code 0']",
          "auto_fixable": false
        }
      ],
      "score": 0.8472,
      "delta": null,
      "fixes_applied": 0,
      "timestamp": "2026-02-24T10:00:30Z"
    },
    {
      "round": 2,
      "type": "FIX_RESCAN",
      "focus": "dependency_integrity, role_model_alignment",
      "gaps_found": 7,
      "gaps_by_severity": {
        "CRITICAL": 0,
        "MAJOR": 3,
        "MINOR": 4
      },
      "gaps_by_category": {},
      "gaps": [],
      "score": 0.9305,
      "delta": 2,
      "fixes_applied": 14,
      "timestamp": "2026-02-24T10:01:00Z"
    },
    {
      "round": 3,
      "type": "SECOND_ORDER",
      "focus": "exit_condition_quality, step_specificity",
      "gaps_found": 1,
      "gaps_by_severity": {
        "CRITICAL": 0,
        "MAJOR": 0,
        "MINOR": 1
      },
      "gaps_by_category": {},
      "gaps": [],
      "score": 0.9653,
      "delta": 0,
      "fixes_applied": 6,
      "timestamp": "2026-02-24T10:01:30Z"
    }
  ],
  "final_result": {
    "approved": true,
    "escalated": false,
    "convergence_achieved": true,
    "convergence_round": 3,
    "final_score": 0.9653,
    "total_passes": 3,
    "total_gaps_found": 26,
    "total_gaps_fixed": 25,
    "remaining_gaps": 1,
    "remaining_by_severity": {
      "CRITICAL": 0,
      "MAJOR": 0,
      "MINOR": 1
    },
    "human_review_required": false
  }
}
```

### Gap Object Schema

Each gap in the `gaps[]` array follows this structure:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique gap identifier, e.g. "GAP-001" |
| `category` | string | One of the 12 gap category names |
| `severity` | string | "CRITICAL", "MAJOR", or "MINOR" |
| `unit_id` | string | The unit where the gap was found, e.g. "P2-U03" |
| `field` | string | The specific field with the issue (if applicable) |
| `description` | string | Human-readable description of the gap |
| `suggested_fix` | string | Concrete fix instruction |
| `auto_fixable` | boolean | Whether the scrutinizer can safely fix this without human review |

---

## Anti-Patterns

1. **Accepting "TBD" as valid content** -- Any field containing "TBD", "TODO", "PLACEHOLDER", or similar must be flagged as a gap, never silently accepted
2. **Skipping gap checks on "simple" roadmaps** -- ALL 12 categories run on every roadmap regardless of size. A 3-unit roadmap gets the same scrutiny as a 40-unit roadmap
3. **Auto-fixing CRITICAL gaps without human review** -- CRITICAL gaps are never auto-fixed. They are flagged, described, and proposed fixes are documented, but a human must approve the fix
4. **Not re-running checks after fixes (missing cascading effects)** -- Fixing a dependency gap can orphan a deliverable. Fixing a tool reference can invalidate a step. Always re-run all 12 checks after every fix round
5. **Stopping before min_passes even if score is high** -- The minimum is 3 passes. Even a score of 1.0 after round 1 still gets rounds 2 and 3 to catch second-order effects
6. **Using subjective severity assignments** -- Severity is determined by category rules, not by intuition. A missing required field is always CRITICAL, never downgraded to MINOR because "it is obvious what the value should be"
7. **Silently dropping unfixable gaps** -- If a gap cannot be fixed (e.g. a required tool does not exist yet), it must remain in the gap report with a note, not be removed

---

## Integration Points

### Upstream (Receives Roadmaps From)
- `prism-roadmap-generator` Step 8 automatically invokes this skill
- Manual invocation when reviewing any existing roadmap document

### Downstream (Sends Results To)
- `data/state/{roadmap-id}/scrutiny-log.json` -- persistent log of all passes
- `prism-roadmap-atomizer` -- consumes approved roadmaps for session slicing
- Human reviewers -- escalated roadmaps require manual intervention

### Tool Dependencies
- `prism_skill_script->skill_content` -- load this skill
- `prism_skill_script->skill_search` -- verify skill references
- Schema validation functions from `mcp-server/src/schemas/roadmapSchema.ts`

---

## Related Files
- Schema: `mcp-server/src/schemas/roadmapSchema.ts`
- Generator: `skills-consolidated/prism-roadmap-generator/SKILL.md`
- Atomizer: `skills-consolidated/prism-roadmap-atomizer/SKILL.md`
- Schema skill: `skills-consolidated/prism-roadmap-schema/SKILL.md`
- Script (planned): `mcp-server/src/scripts/scrutinize-roadmap.ts` (after P3-U02)

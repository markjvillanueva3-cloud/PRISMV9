# Universal Rollback Block Template

**Purpose**: Define exactly which files were created/modified, what conditions trigger halt, and how to abort or rollback changes safely.

**Use this template** in every roadmap unit that modifies the codebase. Include in unit definition or EXIT GATE section. Replace `{{ }}` placeholders with specific session values.

---

## Template Structure

```markdown
ROLLBACK BLOCK:

  FILES_CREATED:
    - {{ path/to/file1.ts }}
    - {{ path/to/file2.ts }}
    - {{ path/to/test/file.test.ts }}
    (list every new file, use absolute paths H:/prism/...)

  FILES_MODIFIED:
    - {{ path/to/existing/file.ts }} — specific change: {{ brief_edit_desc }}
    - {{ path/to/existing/test.ts }} — specific change: {{ brief_edit_desc }}
    (list every modified file + what changed)

  ABORT_CRITERIA:
    Trigger Condition 1: {{ condition_triggers_halt }}
    Trigger Condition 2: {{ condition_triggers_halt }}
    Trigger Condition 3: {{ condition_triggers_halt }}
    (at least 3 specific, measurable conditions)

  ROLLBACK_PROCEDURE:
    If {{ CONDITION }} occurred:
      1. git status (verify dirty state)
      2. git diff {{ FILES_MODIFIED[0] }} (review changes)
      3. git checkout -- {{ FILES_MODIFIED[0] }} {{ FILES_MODIFIED[1] }} ...
      4. rm {{ FILES_CREATED[0] }} {{ FILES_CREATED[1] }} ...
      5. npm test (verify clean state restored)
      6. git status (should be clean)

  FAILURE_MODE_ID:
    FM-{{ number }}: {{ failure_category }}
    Reference: {{ link_to_failure_mode_registry }}
    Example Symptom: {{ what_went_wrong }}
    Diagnostic: {{ how_to_detect_occurrence }}
```

---

## Detailed Guidance by Section

### FILES_CREATED

**Purpose**: Enumerate every new file so clean rollback is possible.

**Format**:
```markdown
FILES_CREATED:
  - H:/prism/mcp-server/src/engines/FooEngine.ts
  - H:/prism/mcp-server/src/schemas/fooSchema.ts
  - H:/prism/mcp-server/src/__tests__/foo.test.ts
  - H:/prism/mcp-server/src/__tests__/foo.integration.test.ts
```

**Rules**:
- Use absolute paths (H:/prism/...), not relative
- Include test files
- Include schema files
- Include index imports if created in new file
- Group by type (engines, schemas, tests, utilities)

**Example**:
```markdown
FILES_CREATED:
  # Engine logic
  - H:/prism/mcp-server/src/engines/ChatterOptimizationEngine.ts
  
  # Data contracts
  - H:/prism/mcp-server/src/schemas/chatterSchema.ts
  
  # Tests
  - H:/prism/mcp-server/src/__tests__/chatter-optimization.test.ts
  - H:/prism/mcp-server/src/__tests__/chatter-integration.test.ts
  
  # Hooks
  - H:/prism/mcp-server/src/hooks/chatterSanityCheck.ts
```

---

### FILES_MODIFIED

**Purpose**: Track every file changed (not created) so reverting is targeted.

**Format**:
```markdown
FILES_MODIFIED:
  - H:/prism/mcp-server/src/index.ts — added: import ChatterOptimizationEngine
  - H:/prism/mcp-server/src/engines/index.ts — added: export chatterOptEngine
  - H:/prism/mcp-server/src/schemas/index.ts — added: export ChatterInputSchema
  - H:/prism/mcp-server/src/registries/ToolRegistry.ts — modified: addChatterProfile() method
  - H:/prism/mcp-server/src/physics/constants.ts — added: FLD_UNSTABLE_THRESHOLD constant
  - H:/prism/mcp-server/src/__tests__/chatter.integration.test.ts — added: 8 test cases
```

**Rules**:
- List every file with at least one change
- Add `— {{ specific_change }}` for each to enable targeted revert
- If only imports changed: note it
- If only exports changed: note it
- If methods/constants added: name them
- If tests added: note count

**Why specific changes?**: So reviewers can `git diff H:/prism/mcp-server/src/registries/ToolRegistry.ts` and see exactly what changed, enabling surgical rollback if needed.

---

### ABORT_CRITERIA

**Purpose**: Define conditions that halt the session immediately rather than continuing.

**Format** (at least 3 conditions):
```markdown
ABORT_CRITERIA:
  Condition 1: TypeScript compilation fails (tsc --noEmit returns non-zero)
    Action: Stop. Do not commit. Execute ROLLBACK_PROCEDURE.
    
  Condition 2: Scrutiny review finds ≥1 CRITICAL issue
    Action: Stop. Fix. Re-run /prism-review. If still CRITICAL, execute ROLLBACK_PROCEDURE.
    
  Condition 3: Test count drops by >2 tests
    Action: Stop. Investigate test failures. If unfixable in 1 loop cycle, execute ROLLBACK_PROCEDURE.
    
  Condition 4: Physics constant inline detected (not imported from src/physics/constants.ts)
    Action: Stop. Fix all inlines. Re-run scrutiny. Continue.
    
  Condition 5: Route not wired to dispatcher or request reaches unimplemented handler
    Action: Stop. Wire route. Add handler. Run integration test. Continue.
```

**Common Abort Conditions** (choose the relevant ones for your unit):

| Condition | When to Apply | Action |
|-----------|---------------|--------|
| **Compilation fails** | Any code change | Halt, fix, re-test |
| **CRITICAL scrutiny finding** | Any unit | Halt, fix, re-review |
| **Test regression** | Logic change | Halt, investigate |
| **Physics constant inline** | Physics/speed/feed changes | Halt, extract to constants.ts |
| **Route unimplemented** | New endpoint/dispatcher action | Halt, implement handler |
| **Safety guard disabled** | Intentional bypass | Halt, restore guard, document exception |
| **Registry lookup missing** | Data dependency added | Halt, add registry query + test |
| **CAD round-trip breaks** | CAD pipeline changes | Halt, test with 3 sample parts |
| **Wiring validation fails** | Dispatcher/engine binding | Halt, run `/trace` to debug |
| **Coverage drops >5%** | Logic change | Halt, add tests to restore |

---

### ROLLBACK_PROCEDURE

**Purpose**: Step-by-step commands to safely undo this unit's work.

**Template**:
```markdown
ROLLBACK_PROCEDURE:
  If TypeScript compilation fails:
    1. git status
    2. git diff H:/prism/mcp-server/src/engines/FooEngine.ts | head -50
    3. git checkout -- H:/prism/mcp-server/src/engines/FooEngine.ts
    4. rm H:/prism/mcp-server/src/engines/FooEngine.ts
    5. git checkout -- H:/prism/mcp-server/src/index.ts
    6. npx tsc --noEmit
    7. npm test -- src/__tests__/foo.test.ts
    8. git status (verify clean)
    9. echo "Rolled back to clean state"

  If scrutiny found CRITICAL issues unfixable in 1 loop:
    1. git log --oneline -5
    2. git revert HEAD (creates inverse commit, preserves history)
    3. npm test
    4. git log --oneline -5 (verify revert commit exists)
    5. Document in HANDOFF.md: "Rolled back SESSION 0-X-Y unit U-N due to [reason]"
```

**Rules for git commands**:
- Use `git checkout -- [file]` (revert specific file, keep working tree)
- Use `git revert HEAD` (undo last commit, create inverse commit in history)
- NEVER use `git reset --hard` without explicit user approval
- Always run tests after rollback to confirm clean state
- Always check `git status` before and after

**Verification**:
- After rollback, `npm test` should pass (same baseline as before unit start)
- `git status` should be clean
- No modified files, no untracked new files (except /dist or other ignored)

---

### FAILURE_MODE_ID

**Purpose**: Link this unit's rollback to a failure-mode registry for learning and prevention.

**Format**:
```markdown
FAILURE_MODE_ID:
  FM-042: Kienzle constant inlined instead of imported
  Reference: H:/prism/mcp-server/docs/failure-modes/FM-PHYSICS-INLINE.md
  Example Symptom: "Force calculation returns 10× expected, tool breakage in test"
  Diagnostic: "grep -r 'kc1_1.*=' src/ | grep -v imports" shows hardcoded values
  Prevention: "Pre-commit hook blocks 'kc1_1 =' patterns in source"
```

**Key FM categories** (reference failure-mode registry):
- FM-PHYSICS-*: Physics constant violations
- FM-WIRING-*: Dispatcher/engine disconnections
- FM-SAFETY-*: Guard bypass or unimplemented checks
- FM-TEST-*: Test regression or missing coverage
- FM-REGISTRY-*: Missing registry query or orphaned data
- FM-CAD-*: CAD round-trip failures
- FM-PERFORMANCE-*: Latency or memory regression

---

## Complete Example: MillTurn Crash Fix

```markdown
ROLLBACK BLOCK:

  FILES_CREATED:
    - H:/prism/mcp-server/src/engines/MillTurnProgramAssemblerEngine.ts
    - H:/prism/mcp-server/src/schemas/millTurnSchema.ts
    - H:/prism/mcp-server/src/__tests__/mill-turn-assembler.test.ts
    - H:/prism/mcp-server/src/__tests__/mill-turn-integration.test.ts

  FILES_MODIFIED:
    - H:/prism/mcp-server/src/engines/MillTurnSwissPipelineEngine.ts
      — added: dispatch to MillTurnProgramAssemblerEngine.ts (line 543)
    - H:/prism/mcp-server/src/engines/index.ts
      — added: export MillTurnProgramAssemblerEngine
    - H:/prism/mcp-server/src/engines/QuoteToShipOrchestratorEngine.ts
      — modified: machine type router to include mill-turn path (lines 187-195)
    - H:/prism/mcp-server/src/schemas/index.ts
      — added: export MillTurnInputSchema, MillTurnOutputSchema
    - H:/prism/mcp-server/src/__tests__/mill-turn-integration.test.ts
      — added: 12 round-trip tests (shaft-with-cross-hole sample)

  ABORT_CRITERIA:
    Condition 1: TypeScript compilation fails
      → Halt. Execute ROLLBACK_PROCEDURE step 1-9.

    Condition 2: Scrutiny review finds ≥1 CRITICAL
      → Halt. Fix finding. Re-run /prism-review. If still CRITICAL, execute rollback.

    Condition 3: Test regression: test count drops below baseline
      → Halt. Investigate. If unfixable in 1 loop, execute rollback.

    Condition 4: assembleProgram() method not dispatched or still not implemented
      → Halt. Verify dispatch call exists and handler exists. Re-test.

    Condition 5: Integration test fails (round-trip CAD → program broken)
      → Halt. Debug. If cause is unfixable in unit, execute rollback.

  ROLLBACK_PROCEDURE:
    If TypeScript compilation fails:
      1. git status
      2. git diff H:/prism/mcp-server/src/engines/MillTurnSwissPipelineEngine.ts | head -80
      3. git checkout -- \
           H:/prism/mcp-server/src/engines/MillTurnSwissPipelineEngine.ts \
           H:/prism/mcp-server/src/engines/QuoteToShipOrchestratorEngine.ts \
           H:/prism/mcp-server/src/engines/index.ts \
           H:/prism/mcp-server/src/schemas/index.ts
      4. rm H:/prism/mcp-server/src/engines/MillTurnProgramAssemblerEngine.ts
      5. rm H:/prism/mcp-server/src/schemas/millTurnSchema.ts
      6. rm H:/prism/mcp-server/src/__tests__/mill-turn-*.test.ts
      7. npx tsc --noEmit
      8. npm test -- src/__tests__/mill-turn-integration.test.ts
      9. git status (should be clean)

    If scrutiny finds CRITICAL unfixable:
      1. git log --oneline -3
      2. git revert HEAD
      3. npm test
      4. git log --oneline -3 (verify revert in history)
      5. Document in HANDOFF.md:
         "Rolled back U-09/U-10 MillTurn crash fix.
         Reason: Scrutiny found ≥1 CRITICAL issue in assembleProgram() logic.
         Next session should re-approach with more conservative handler impl."

  FAILURE_MODE_ID:
    FM-WIRING-001: Method dispatched but handler not implemented
    Reference: H:/prism/mcp-server/docs/failure-modes/FM-WIRING-UNIMPL.md
    Example Symptom: "assembleProgram() throws 'undefined is not a function' at runtime"
    Diagnostic: "Trace dispatcher call → confirm handler file exists + exports method"
    Prevention: "Dispatcher must lazy-load handler before call; handler must export named function matching dispatcher action"
```

---

## Rules for Writing Rollback Blocks

1. **Files_Created must be deletable**: If you can't delete a file without breaking git history, reconsider its creation scope.

2. **Files_Modified must be revertible**: Use `git diff [file]` to show the changeset. A good rollback includes showing the diff for verification.

3. **Abort conditions are stop gates, not soft warnings**: If `npm test` fails, you stop. Full stop. No "we'll fix it in next loop."

4. **Failure_Mode_ID is not optional**: Every unit must link to a failure mode so the team learns why it failed (if it does).

5. **Test post-rollback**: After executing ROLLBACK_PROCEDURE, run the same tests that were required to pass before the unit started. This verifies rollback was clean.

6. **Document rollback reason in HANDOFF**: If you actually roll back (not hypothetically), explain why in HANDOFF.md so the next session avoids the trap.

7. **Use absolute paths throughout**: No `../../../src/`, only `H:/prism/mcp-server/src/...`

---

## Integration with Session Roadmap

```markdown
### UNIT {{ unit_id }}: {{ title }}

WORK:
  {{ unit_specific_work_items }}
  /prism-review after implementation

ROLLBACK BLOCK:
  FILES_CREATED: [{{ list }}]
  FILES_MODIFIED: [{{ list }}]
  ABORT_CRITERIA: [{{ condition1 }}, {{ condition2 }}, {{ condition3 }}]
  ROLLBACK_PROCEDURE: {{ step_by_step_git_commands }}
  FAILURE_MODE_ID: {{ FM-NNN }}
```

---

## When Rollback Is Actually Triggered

1. **Abort Condition occurs** (e.g., compilation fails, CRITICAL scrutiny finding)
2. **Execute git commands from ROLLBACK_PROCEDURE**
3. **Verify tests pass** on rolled-back code
4. **Verify git status is clean** (`git status` shows nothing)
5. **Document in HANDOFF.md**: "UNIT {{ unit_id }} rolled back. Reason: {{ reason }}. Timestamp: {{ iso_time }}"
6. **Skip to next unit** or session (do not retry same unit in same session)
7. **Plan recovery in next session** (don't repeat same approach)

---

## Next: See Also

- [UNIVERSAL-EXIT-GATE-TEMPLATE.md](UNIVERSAL-EXIT-GATE-TEMPLATE.md)
- [UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md](UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md)
- Failure Mode Registry: H:/prism/mcp-server/docs/failure-modes/
- HANDOFF.md format — records rollback events for learning

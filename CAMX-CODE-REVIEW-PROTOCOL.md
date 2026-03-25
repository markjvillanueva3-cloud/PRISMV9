# CAMX CODE REVIEW PROTOCOL
## MANDATORY after EVERY build session — NO EXCEPTIONS

This protocol applies to EVERY unit in EVERY roadmap that produces or modifies code.

---

## WHEN TO RUN CODE REVIEW

After EVERY:
- New engine file created
- Existing engine edited
- Dispatcher wired or modified
- Schema created or modified
- Test file created
- Pipeline file edited (wiring, bug fix, enhancement)
- Index.ts exports added

## HOW TO RUN CODE REVIEW

```
/prism-review
```

This dispatches 3 PARALLEL review agents:

### 1. Physics Reviewer (physics-reviewer agent)
Checks:
- Formula correctness against canonical constants (Kienzle kc1.1, Taylor C/n)
- Dimensional consistency (units in → units out)
- Constant references match published data (Sandvik, Kennametal, Machinery's Handbook)
- Force/power/torque formulas are correct
- Temperature/thermal models are correctly implemented
- Reports discrepancies with severity rating

### 2. Wiring Reviewer (wiring-review-agent)
Checks:
- Dispatcher z.enum includes ALL new actions
- Schema matches engine interface (field names, types)
- Lazy-load pattern follows PostProcessorPipelineEngine standard
- Engine exported from index.ts with correct type aliases (no duplicate identifiers)
- Action handler in dispatcher switch statement
- No orphaned engines (every new engine referenced somewhere)

### 3. Test Reviewer (test-review-agent)
Checks:
- Test coverage exists for new engine/action
- Tests validate CORRECTNESS not just EXISTENCE (no keyword-only checks)
- No `|| true` assertions
- Physics values tested against analytical bounds
- Coordinate values tested against input dimensions
- Negative/error cases covered
- Test data is REAL (traceable to source), not synthetic

## WHAT HAPPENS IF REVIEW FAILS

```
IF physics-reviewer finds issues:
  → FIX formula/constant BEFORE moving to next unit
  → Re-run /prism-review to verify fix

IF wiring-reviewer finds issues:
  → FIX dispatcher/schema/export BEFORE moving to next unit
  → Re-run /prism-review to verify fix

IF test-reviewer finds issues:
  → ADD missing tests or FIX weak assertions BEFORE moving to next unit
  → Re-run /prism-review to verify fix

NEVER move to the next unit with review failures outstanding.
```

## BUILD GATE (runs WITH code review)

```
npx tsc --noEmit → MUST be 0 errors (excluding pre-existing parallel session errors)
npx vitest run [affected files] → MUST be 0 failures
```

## SESSION-END CODE REVIEW

At the END of every build session (before /compact):

```
1. Run: npx tsc --noEmit → verify 0 errors
2. Run: /prism-review → verify all 3 agents approve
3. Run: npx vitest run → verify 0 regressions
4. Run: git diff --stat → review what was changed
5. Document in /compact handoff: review status, any outstanding issues
```

## WIRING-SPECIFIC REVIEW CHECKLIST

For EVERY "wire X into Y" unit, verify AFTER building:

```
□ Engine file created/edited: [filename]
□ Engine exported from index.ts: [export line]
□ No duplicate type identifiers in index.ts
□ Dispatcher action added to z.enum: [action name]
□ Dispatcher case handler added: [case block location]
□ Schema created with correct Zod types: [schema file]
□ Schema merged into dispatcher's MERGED_SCHEMAS
□ Lazy-load follows pattern: require() with try/catch fallback
□ Fallback behavior defined (what happens if engine unavailable)
□ vitest created with ≥3 test cases
□ Build passes: 0 TS errors
□ /prism-review: all 3 agents approve
```

## INTEGRATION INTO EVERY ROADMAP

Every per-machine roadmap (LATHE, MILLING, 5-AXIS, MILL-TURN, GRINDING, WIRE-EDM, LASER, WATERJET) must reference this protocol:

```
At the end of EVERY milestone:
  1. Run full build: npx tsc --noEmit
  2. Run /prism-review (3 parallel agents)
  3. Run affected tests: npx vitest run
  4. If ANY fail → fix before milestone is marked complete
  5. /compact with review status in handoff
```

## WHY THIS MATTERS

Previous sessions built 76 CAMX engines but:
- Many had duplicate type exports in index.ts (caught and fixed reactively)
- Wiring was often incomplete (engine built but not in dispatcher)
- Tests were keyword-only (p.includes("G71") instead of coordinate validation)
- POST-ULT 17-engine pipeline was built but NEVER wired into any program generator
- 49/50 algorithms remain unused because wiring was skipped

Code review CATCHES these issues at build time, not during later scrutiny sessions.

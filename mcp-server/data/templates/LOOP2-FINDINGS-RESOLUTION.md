# Loop 2 Findings Resolution Map

**Context**: Loop 1 identified three worst-performing dimensions via PCCA analysis. Loop 2 creates concrete templates to fix them.

---

## Loop 1 Findings (Input)

From the scrutiny session, three dimensions scored lowest:

| Dimension | Score | Finding |
|-----------|-------|---------|
| **Exit Gate Rigor** | 23/100 | Session exit gates lack measurable criteria. Completion unclear. Proof undefined. |
| **PCCA Activation** | 25/100 | PCCA (Purpose-Capability-Consumer-Availability) incomplete. New features lack consumer mapping. |
| **EIGC Gap Closure** | 28/100 | Engine-Infra-Gateway-Consumer chain often broken. New engines without hooks/actions. |

---

## Loop 2 Solution: Three Universal Templates

### Template 1: UNIVERSAL-EXIT-GATE-TEMPLATE.md

**Solves**: Exit Gate Rigor (23 → 75+)

**What it fixes**:
- ❌ **Before**: "Session 0-B-1 completes when threading is implemented" (vague, subjective)
- ✅ **After**: "EXIT GATE: ✓ G76 block generated (proof: integration test 4140-shaft.test.ts PASSED) ✓ All tests 24/24 passing ✓ Compilation 0 errors ✓ OMEGA_FLOOR score 8.7/10 (≥8.5) ✓ Scrutiny clean (0 CRITICAL)" (specific, measurable, provable)

**Key features**:
- **Proof types** (13 kinds): test_count, compilation, integration_pass, coverage, diff_check, golden_baseline, audit_scorecard, wiring_validation, registry_query, physics_validation, feature_available, data_roundtrip, timing
- **OMEGA_FLOOR quality** with math formula (prevents vague quality claims)
- **SVI/Psi delta** measured, not estimated (baseline + target + measurement method)
- **Test count AUTO** (dynamic, not frozen — scales as tests grow)

**Impact**: Exit gate criteria become:
- Measurable (can run npm test, coverage report, lint)
- Verifiable (reviewers can check proofs)
- Enforceable (hook blocks session if proofs don't pass)
- Repeatable (same template used across all sessions)

**Rigor improvement mechanism**:
```
Before (23/100):
  - "Threading works" — too vague
  - No proof type specified
  - Quality threshold is opinion
  - Rollback procedure unknown

After (75+/100):
  - "Integration test passes: 4140 shaft → G76 block validates per FANUC" — specific
  - Proof type: integration_pass (measurable)
  - OMEGA_FLOOR: 8.7/10, formula: (testPass% × 0.25) + (safety × 0.25) + ...
  - Rollback: git checkout -- [specific files] && rm [files] && npm test && git status
```

**Measurable improvement in compliance**:
- Sessions using template: 100% have ≥3 criteria with proof types
- Sessions using template: 0% allow vague criteria like "looks good"
- Sessions using template: 100% record actual proof values in HANDOFF.md
- Pre-review: catches vague criteria before coding starts

---

### Template 2: UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md

**Solves**: EIGC Gap Closure (28 → 85+)

**What it fixes**:
- ❌ **Before**: "If threading breaks, rollback" (how? what breaks? which files?)
- ✅ **After**: "If integration test fails: 1. git status 2. git diff src/engines/G76ThreadingAssemblerEngine.ts | head 3. git checkout -- [3 files] 4. rm [2 files] 5. npm test 6. git status" (executable, step-by-step)

**Key features**:
- **FILES_CREATED**: Exact list (no hypothesis, real files that will exist)
- **FILES_MODIFIED**: Specific changes ("added: export FooEngine", "modified: dispatch line 380")
- **ABORT_CRITERIA**: ≥3 measurable conditions (TypeScript fails, CRITICAL scrutiny, test regression)
- **ROLLBACK_PROCEDURE**: Step-by-step git commands (can execute blindly, will work)
- **FAILURE_MODE_ID**: Link to failure-mode registry (prevents repeat failures)

**Impact**: 
- Rollback is no longer a mystery ("I broke something, now what?")
- It's a documented procedure (execute steps 1-8)
- Failures are tracked (FM-THREADING-001 indexed)
- Prevention is systematic (hook blocks future inline constants)

**Consumer-Gateway-Consumer chain fix**:
```
Before (28/100):
  - Engine created but not called
  - Handler exists but not routed
  - Skill written but not wired
  - Hook created but never fires
  → EIGC broken, feature is dark infrastructure

After (85+/100):
  - Engine created → wiring test verifies it's called
  - Handler exists → route test hits the endpoint
  - Skill written → dispatcher test invokes the action
  - Hook created → integration test confirms it fires
  → EIGC complete, feature is live
  → Rollback shows exactly how to undo if needed
```

**Measurable improvement**:
- Sessions using template: 0% have dark/unwired infrastructure
- Sessions using template: 100% have tested wiring (import + call + result)
- Sessions using template: 100% have failure-mode registry references
- Pre-rollback hook catches orphaned engines/actions/skills

---

### Template 3: UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md

**Solves**: PCCA Activation (25 → 85+)

**What it fixes**:
- ❌ **Before**: "New threading engine created" (so what? who uses it? is it ready?)
- ✅ **After**: "NEW_ACTIONS: prism_lathe:generate_g76_threading_block [Route, Handler, Input, Output, Consumer Intent, Used By Sessions 0-B-2, 1-2, 1-3, Used By Frontend Pages /program-release, /jobs/create, Used By Skills /job-planning, /program-gen, Implementation Status ✓ Wired]" (complete infrastructure manifest + consumer declaration)

**Key features**:
- **NEW_HOOKS**: protection_scope + fire_condition + prevents + required_sessions (enables hook governance)
- **NEW_ACTIONS**: route + handler + input/output + consumer intent + users (maps Purpose-Capability-Consumer)
- **NEW_SKILLS**: trigger + input/output + wiring (ensures user-facing features are wired)
- **REGISTRIES_UPDATED**: entry counts + example entries + consumers (prevents hidden data)
- **AVAILABLE_TO**: downstream session dependencies (enables roadmap sequencing)

**PCCA Mapping** (Purpose → Capability → Consumer → Availability):

```
BEFORE (25/100):
  Purpose: "Support exotic threading tools"
  Capability: Thread tool registry entries created
  Consumer: [unknown]
  Availability: [unknown]
  
Result: Feature exists but is hidden. No one knows about it.
No downstream session depends on it.
Feature is orphaned → code review says "remove this" → work was wasted.

AFTER (85+/100):
  Purpose: "Support exotic threading tools so machinists can use premium inserts"
  Capability: ThreadingToolRegistry +18 entries + prism_lathe:tool_suggest action + /tool-catalog skill
  Consumer: SESSION 1-2 (threading job templates) depends on this
  Availability: "AVAILABLE_TO: SESSION 1-2 (reason: uses prism_lathe:tool_suggest to suggest tools)"
  
Result: Feature is documented. Consuming session is explicit.
Next session knows it depends on this work.
Roadmap sequencing is possible.
Feature will not be removed because consumer is declared.
```

**Measurable improvement**:
- Sessions using template: 0% have orphaned features
- Sessions using template: 100% have declared downstream consumers
- Sessions using template: 100% mark [AWAITING_CONSUMER] if no consumer yet (prevents premature implementation)
- Sessions using template: 100% declare all new hooks/actions/skills (no dark infrastructure)

---

## Scoring Improvement Mechanics

### Exit Gate Rigor: 23 → 75+

**Dimension**: "Are session completions clear and provable?"

**Before (23/100)**:
- Sessions complete when developer "feels done"
- Exit gate is checklist with vague items ("tests pass", "code reviewed")
- Proof is subjective (code looks good to me)
- Quality threshold is opinion (good enough)
- Rollback is informal (undo last commit, hope nothing breaks)
- SVI/Psi delta is guess (might improve by 2%)

**After (75+/100)**:
- Sessions complete when ≥3 objective criteria satisfied
- Exit gate has proof type for each criterion (test_count, compilation, integration_pass, etc.)
- Proof is objective (npm test output, coverage %, compilation return code, scrutiny count)
- Quality threshold is math formula (OMEGA_FLOOR = 0.25×testPass% + 0.25×safety + 0.15×perf + ... ≥ 7.5)
- Rollback is documented procedure (8 steps, all git commands, executable)
- SVI/Psi delta is measured (baseline at start, achieved at end, recorded in HANDOFF)

**Measurement**: Pre-session, check exit gate. Count vague criteria. Post-session, count measurable criteria. Track trend.

### PCCA Activation: 25 → 85+

**Dimension**: "Are new features Purpose-clear, Capability-documented, Consumer-declared, Availability-mapped?"

**Before (25/100)**:
- New engine created: undefined purpose, unclear capability, no consumer
- New action added: route exists, who uses it? unclear
- New skill written: trigger undefined, consumer intent vague
- New registry entries: why these entries? which engines consume them?
- Result: Dark infrastructure (features exist but no one knows)

**After (85+/100)**:
- New engine: purpose stated (why we created it), capability clear (what it computes), consumer declared (which session uses it), availability explicit (SESSION X depends)
- New action: route clear, handler exists, inputs/outputs defined, consumer intent specific, users listed (sessions/pages/skills)
- New skill: trigger defined, input/output format clear, wiring verified (dispatchers + engines called), use case specific
- New registry: entry types documented, examples provided, consuming engines listed
- Result: Feature is discoverable, dependencies are explicit, orphaning is impossible

**Measurement**: After session, extract FEATURE CASCADE. Check:
- Every hook/action/skill has ≥1 declared consumer? (or [AWAITING_CONSUMER])
- Every consumer is a real planned session? (not made up)
- Every entry in AVAILABLE_TO is cross-referenced in that session's INTENT?

### EIGC Gap Closure: 28 → 85+

**Dimension**: "Is the Engine → Infra (hook/action/skill) → Gateway (dispatcher/handler) → Consumer (session) chain complete and tested?"

**Before (28/100)**:
- Engine created: not callable (no dispatcher action)
- Action created: not wired (no handler that calls engine)
- Handler exists: not routed (no /api endpoint)
- Endpoint available: not used (no frontend call, no skill invocation)
- Result: Chain is broken. Feature appears to work in isolation but is dead in real usage.

**After (85+/100)**:
- Engine created + integrated test verifies it executes correctly
- Action created + integration test verifies dispatcher routes to engine
- Handler exists + route test verifies endpoint is callable
- Endpoint available + smoke test verifies it returns correct output
- Frontend page calls endpoint + skill invokes endpoint + another session depends on it
- Result: Chain is complete and tested. Feature is live.

**Verification checklist**:
```
EIGC Completion Checklist:
✓ Engine: execute() method exists, compiles, unit tests pass
✓ Infra: hook (pre/post) fires, action (z.enum) routes, skill (/cmd) callable
✓ Gateway: dispatcher lazy-loads engine, handler calls engine, route returns result
✓ Consumer: session uses action/skill, frontend page calls endpoint, skill invokes handler
✓ Testing: integration test covers full chain, wiring audit passes
✓ Documentation: FEATURE CASCADE lists all components + consumers
```

---

## Application Timeline

### Immediate (Session Start)
1. Copy [UNIVERSAL-EXIT-GATE-TEMPLATE.md](UNIVERSAL-EXIT-GATE-TEMPLATE.md) to session EXIT GATE block
2. Copy [UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md](UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md) to each UNIT
3. Copy [UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md](UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md) to EXIT GATE FEATURE CASCADE sub-section
4. Fill placeholders with session-specific values
5. Validate before coding: Are all criteria measurable? Are all features declared? Are all consumers real?

### During Session (4-LOOP)
1. **LOOP 1 — BUILD**: Write code per WORK items
2. **LOOP 2 — SCRUTINIZE**: Run `/prism-review`. Fix findings.
3. **LOOP 3 — GAP FILL**: Run tests. Verify wiring. Check constants.

### Before /compact (Exit Gate Validation)
1. Run all proofs: `npm test`, `coverage report`, `tsc --noEmit`, `/prism-review`
2. Record actual values in markdown (not placeholders)
3. Verify OMEGA_FLOOR math: (testPass% × 0.25) + (safety × 0.25) + ... ≥ threshold
4. Measure SVI/Psi delta: `/svi` before and after
5. Check FEATURE CASCADE: every new item has ≥1 declared consumer
6. Check ROLLBACK: all git commands are correct, all files listed
7. Review template checklist one last time
8. `/compact` (produces HANDOFF.md with validation results)

### Next Session
1. Read HANDOFF.md RESUME section
2. Verify EXIT GATE of previous session was satisfied
3. Confirm FEATURE CASCADE items are available for use
4. Proceed with next session units

---

## Enforcement: The Pre-Edit Hook

A git hook (`~/.claude/hooks/review-gate.sh`) blocks engine edits when:
```
engine_edits_since_last_review > 3
```

**How this enforces rigor**:
- After editing 3 engines, hook stops you
- You MUST run `/prism-review`
- You MUST fix all CRITICAL + HIGH + MEDIUM findings
- Only then can you edit more engines
- This prevents accumulating technical debt

**Why this works with templates**:
- Template specifies ≥3 abort criteria
- One common criterion: "≥1 CRITICAL scrutiny finding"
- Hook enforces review, template enforces rigor
- Compliance is mechanical, not voluntary

---

## Success Metrics (How to Know It's Working)

### Exit Gate Rigor (Target: 75+)

Track these KPIs:
- % sessions with ≥3 measurable criteria: target 100%
- % criteria with explicit proof type: target 100%
- % exit gates using math formula for quality: target 100%
- % sessions with rollback block executed (if needed): target 100% (when rolled back)
- Average time to resolve exit gate (validate all proofs): target 15 min

### PCCA Activation (Target: 85+)

Track these KPIs:
- % new features with declared consumer: target 100%
- % declared consumers that are real sessions: target 100%
- % downstream sessions that read previous session's FEATURE CASCADE: target 100%
- [AWAITING_CONSUMER] items without consumer after 3 sessions: flag for review (should be implemented)

### EIGC Gap Closure (Target: 85+)

Track these KPIs:
- % new engines with integration tests: target 100%
- % new actions with routed endpoints: target 100%
- % new hooks that fire (verified in integration test): target 100%
- % new skills with live dispatcher/engine wiring: target 100%

---

## How This Fits Into the V24 Roadmap

**Phase 0-D** (current):
- Create these three templates (LOOP 2 output)
- Apply templates to upcoming sessions (0-D-7, 0-D-8, etc.)
- Track compliance KPIs

**Phase 1-4** (ahead):
- All 220+ sessions use templates
- Exit gate rigor: 75+ (vs 23 before)
- PCCA activation: 85+ (vs 25 before)
- EIGC gap closure: 85+ (vs 28 before)

**Impact**:
- Session planning becomes deterministic (clear exit criteria before coding)
- Code review becomes objective (proof types are measurable)
- Roadmap sequencing becomes possible (consumers are declared)
- Technical debt is visible (AWAITING_CONSUMER items, dark infrastructure)
- Rollback is safe (procedure is documented, tested)

---

## References

- **Templates**: H:/prism/mcp-server/data/templates/ (5 files, 75KB total)
- **Integration Guide**: TEMPLATE-INTEGRATION-GUIDE.md (worked example: Lathe Threading Output session)
- **Quick Start**: README-TEMPLATES.md (this overview + copy-paste patterns)
- **Loop 1 Report**: Original scrutiny findings (not included, reference only)
- **V24 Roadmap**: CAMX-RESTRUCTURED-ROADMAP-v24.md (apply templates starting 0-D-7)

---

## Conclusion

Loop 2 produces three universal templates that solve three critical gaps:

| Gap | Before | After | Template |
|-----|--------|-------|----------|
| Exit Gate Rigor (23/100) | Vague completion, no proof, opinion-based quality | Measurable criteria, objective proof, math-based quality | UNIVERSAL-EXIT-GATE-TEMPLATE.md |
| EIGC Gap Closure (28/100) | Infrastructure created but not wired or tested | Full chain: engine → action → handler → consumer tested | UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md |
| PCCA Activation (25/100) | Features created but consumers unknown | All features have purpose, capability, consumer, availability declared | UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md |

Use them in every session. Enforce compliance with the pre-edit hook. Measure KPIs. Track improvement. By end of Phase 1, all three dimensions should be 75+.

This is not optional. This is the path to reliable, plannable, maintainable CNC manufacturing software.

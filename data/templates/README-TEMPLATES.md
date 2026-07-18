# PRISM Roadmap Template System

**Location**: H:/prism/mcp-server/data/templates/

**Purpose**: Three universal templates + integration guide that solve Loop 2 findings for Exit Gate Rigor, PCCA Activation, and EIGC Gap Closure.

---

## Quick Start

You have 4 files in this directory:

### 1. UNIVERSAL-EXIT-GATE-TEMPLATE.md
**When to use**: In the EXIT GATE section of every roadmap session  
**What it provides**: Structured completion criteria with measurable proof types, quality thresholds, SVI/Psi delta tracking  
**Key sections**:
- Proof types (test_count, compilation, integration_pass, golden_baseline, etc.)
- OMEGA_FLOOR quality threshold with math formula
- SVI/Psi delta target with measurement method
- FEATURE CASCADE integration (hooks + actions + skills)

**Copy-paste pattern**:
```markdown
EXIT GATE:
  ✓ CRITERION 1: {{ description }}
    Proof Type: {{ type }}
    Proof: {{ evidence }}
    Rollback: {{ revert_command }}
  
  [repeat for ≥3 criteria]
  
  OMEGA_FLOOR QUALITY:
    Min Score: {{ threshold }}/10
    [dimensions + formula]
  
  SVI/PSI DELTA TARGET:
    Current Psi: {{ baseline }}%
    Target Psi: {{ target }}%
    Measurement: /svi after validation
  
  FEATURE CASCADE: NEW CAPABILITIES AVAILABLE
    [see UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md]
```

---

### 2. UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md
**When to use**: In each UNIT or in the EXIT GATE section  
**What it provides**: Step-by-step git instructions to safely undo the unit's work  
**Key sections**:
- FILES_CREATED (every new file, absolute paths)
- FILES_MODIFIED (every changed file + what changed)
- ABORT_CRITERIA (≥3 conditions that trigger halt)
- ROLLBACK_PROCEDURE (exact git commands)
- FAILURE_MODE_ID (reference to failure-mode registry)

**Copy-paste pattern**:
```markdown
ROLLBACK BLOCK:
  FILES_CREATED:
    - H:/prism/mcp-server/src/engines/FooEngine.ts
    - H:/prism/mcp-server/src/schemas/fooSchema.ts
    - H:/prism/mcp-server/src/__tests__/foo.test.ts

  FILES_MODIFIED:
    - H:/prism/mcp-server/src/engines/index.ts — added: export FooEngine
    - H:/prism/mcp-server/src/index.ts — added: import of FooEngine

  ABORT_CRITERIA:
    Condition 1: TypeScript compilation fails
      → Halt. Fix errors. Re-run tsc.
    Condition 2: ≥1 CRITICAL scrutiny finding unfixable
      → Halt. Rollback.
    Condition 3: Test regression (count drops >2)
      → Halt. Investigate or rollback.

  ROLLBACK_PROCEDURE:
    If {{ CONDITION }}:
      1. git status
      2. git diff {{ FILE }} | head -50
      3. git checkout -- {{ FILES_MODIFIED }}
      4. rm {{ FILES_CREATED }}
      5. npm test
      6. git status (verify clean)

  FAILURE_MODE_ID:
    FM-{{ number }}: {{ category }}
    Reference: {{ path }}
    Diagnostic: {{ how_to_detect }}
    Prevention: {{ how_to_prevent }}
```

---

### 3. UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md
**When to use**: In the FEATURE CASCADE sub-section of EXIT GATE  
**What it provides**: Inventory of new infrastructure (hooks, actions, skills) + downstream consumer dependencies  
**Key sections**:
- NEW_HOOKS (protection scope, fire condition, required sessions)
- NEW_ACTIONS (route, handler, consumer intent, used by sessions/pages/skills)
- NEW_SKILLS (trigger, input, output, wiring, use case)
- REGISTRIES_UPDATED (entry counts, example entries, consuming engines)
- AVAILABLE_TO (downstream sessions + reason)

**Copy-paste pattern**:
```markdown
FEATURE CASCADE: NEW CAPABILITIES AVAILABLE

  NEW_HOOKS:
    hook_name_1: protection_scope
      Implementation: path
      Fire Condition: when_fired
      Prevents: what_bad_thing
      Enabled By Default: yes|no
      Required In Sessions: [session_list]

  NEW_ACTIONS:
    dispatcher:action_name
      Route: POST /api/dispatchers/...
      Handler: path
      Input: {{ schema }}
      Output: {{ schema }}
      Consumer Intent: {{ why_needed }}
      Used By Sessions: [list]
      Used By Frontend Pages: [list]
      Used By Skills: [list]

  NEW_SKILLS:
    /skill_name
      File: path
      Trigger: {{ when_invoked }}
      Input Required: [params]
      Output Format: {{ format }}
      Consumer Use Case: {{ why }}
      Wiring To Dispatchers: [actions]
      Wiring To Engines: [engines]
      Used By Sessions: [sessions]
      Implementation Status: ✓ | ~ | ✗

  REGISTRIES_UPDATED:
    RegistryName: +{{ N }} entries
      New Entry Types: [type1, type2]
      Example Entries: [entry1, entry2]
      Used By Sessions: [sessions]
      Used By Engines: [engines]

  AVAILABLE_TO:
    - SESSION X: reason (depends on {{ new_capability }})
    - SESSION Y: reason
    - [AWAITING_CONSUMER]: capability ready, no consumer session yet
```

---

### 4. TEMPLATE-INTEGRATION-GUIDE.md
**When to use**: Reference document — read once before first use, then use templates  
**What it provides**: Complete worked example + integration rules + troubleshooting  
**Key sections**:
- How three templates work together (phase flow)
- Complete example: Lathe Threading Output session (all 3 units with all 3 templates applied)
- Quick copy-paste reference
- Rules summary (10 critical rules)
- Troubleshooting (Q&A)

---

## The Three Proof Types (Quick Reference)

When writing EXIT GATE criteria, choose a proof type from this table:

| Proof Type | Use When | Example |
|-----------|----------|---------|
| **test_count** | Automated tests validate behavior | "152/152 tests passing (AUTO)" |
| **compilation** | TypeScript or build must succeed | "npx tsc --noEmit returns 0" |
| **integration_pass** | End-to-end flow works | "4140 shaft → G76 block → valid output" |
| **coverage** | Code coverage metric met | "Lines ≥78%, branches ≥72%" |
| **diff_check** | Code review found 0 critical issues | "prism-review: 0 CRITICAL, 0 HIGH" |
| **golden_baseline** | Output matches reference (±tolerance) | "Speed/feed within ±5% of Sandvik table" |
| **audit_scorecard** | Inventory audit complete | "24 engines audited: 18 PROD, 6 PARTIAL" |
| **wiring_validation** | Dispatcher/engine connections verified | "All 79 dispatchers connected to engines" |
| **registry_query** | Registry lookups work + coverage high | "All 11 registries queried, ≥80% coverage" |
| **physics_validation** | Physics model validated vs real data | "Kienzle matches 5 test cases ±5%" |
| **feature_available** | Hook fires + action callable + skill responds | "Hook + action + skill smoke test pass" |
| **data_roundtrip** | Input → transform → output verified | "CAD file in, program out for 10 parts" |
| **timing** | Performance SLA met | "Response <200ms (95th percentile)" |
| **inspector_sign_off** | Physical validation (optional) | "Machinist approved 3 sample parts" |

---

## Exit Gate Checklist (Before /compact)

Before declaring exit gate satisfied:

- [ ] **All criteria have a proof type** (not vague like "works")
- [ ] **All proofs are measured** (npm test output, coverage %, compilation output, scrutiny count)
- [ ] **OMEGA_FLOOR has a number + formula** (not subjective judgment)
- [ ] **SVI/Psi delta is baseline + target** (record baseline at session start)
- [ ] **All FEATURE CASCADE new items have consumers** (or marked [AWAITING_CONSUMER])
- [ ] **Rollback blocks are specific** (git commands work, not hypothetical)
- [ ] **All ABORT conditions are measurable** (npm test fails, compilation error, CRITICAL finding)
- [ ] **Test count uses AUTO, not frozen** (scales as test suite grows)
- [ ] **Scrutiny passed** (/prism-review clean: 0 CRITICAL, 0 HIGH)
- [ ] **Actual values recorded** (not placeholder text like {{ value }})

---

## Integration Rules

1. **Exit Gate + Rollback Block are paired**: Every CRITERION in exit gate maps to a ROLLBACK in rollback block (or shared rollback for unit-level block)

2. **Rollback Block + Failure Mode are paired**: Every ROLLBACK has a FAILURE_MODE_ID linking to H:/prism/mcp-server/docs/failure-modes/

3. **Feature Cascade + Available_To are paired**: Every new hook/action/skill declares its consuming sessions (or [AWAITING_CONSUMER])

4. **Test count is dynamic**: Use `{{ current_test_count }}/{{ current_test_count }}` at session start, then read actual at validation

5. **Proof is executable**: Every proof type must have a runnable command (npm test, coverage report, git diff, etc.)

---

## Common Mistakes (Don't Do These)

| Mistake | Fix |
|---------|-----|
| ❌ "Code is good and works great" | ✅ "24/24 tests passing, coverage 78%, npm tsc 0 errors" |
| ❌ "Fix it and rollback if needed" | ✅ "git checkout -- [file] && git rm [file]" |
| ❌ "+250 tools to registry" | ✅ "+247 tools to registry" (exact count) |
| ❌ "Use new action in some sessions" | ✅ "Used by: SESSION 0-B-2, SESSION 1-1" (name them) |
| ❌ "Rollback if something breaks" | ✅ "Rollback if npm test fails (condition 3)" |
| ❌ "Hope coverage is ≥70%" | ✅ "Coverage must be ≥70% (measured by npm run coverage)" |
| ❌ "New feature ready when I'm done" | ✅ "Feature available to SESSION X (which depends on it)" |
| ❌ "152/152 tests" (then test #153 added) | ✅ "{{ current_test_count }}/{{ current_test_count }} tests (AUTO)" |

---

## File Locations

All template files are in:
```
H:/prism/mcp-server/data/templates/
├── UNIVERSAL-EXIT-GATE-TEMPLATE.md
├── UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md
├── UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md
├── TEMPLATE-INTEGRATION-GUIDE.md
├── README-TEMPLATES.md (this file)
└── roadmap-exemplar.md (reference example: health endpoint)
```

---

## How Roadmap Sessions Will Use These

### Session Block Template (v24 roadmap)

```markdown
### SESSION X-Y-Z: {{ title }}

SMART CONFIG: Role={{ role }} | {{ model }} | {{ effort }}
UNITS: {{ count }}

KNOWLEDGE SOURCES:
  - {{ ref }}

INTENT:
  {{ why_solving_this }}

[Per unit:]

### UNIT U-{{ id }}: {{ title }}

WORK:
  {{ work_items }}

ROLLBACK BLOCK: [from UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md]

[End of session:]

4-LOOP per unit: SCRUTINIZE → GAP FILL → TIE UP
FORGE-TRIPLE: {{ hook + action + skill }}
EXIT GATE: [from UNIVERSAL-EXIT-GATE-TEMPLATE.md + UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md]
```

Then in HANDOFF.md:
```markdown
## EXIT GATE VALIDATION

CRITERION 1: G76 block generation
  Proof Type: integration_pass
  Actual Proof: Integration test 4140-shaft.test.ts PASSED
  Status: ✓ SATISFIED

CRITERION 2: Compilation clean
  Proof Type: compilation
  Actual Proof: npx tsc --noEmit returned 0 errors (timestamp: 2026-03-30T21:45:33Z)
  Status: ✓ SATISFIED

[... more criteria ...]

OMEGA_FLOOR QUALITY SCORE: 8.7/10 (target: ≥8.5) ✓ PASS

SVI/PSI DELTA:
  Baseline Psi: 40.8%
  Achieved Psi: 42.3%
  Delta: +1.5 pp
  Status: ✓ PASS (exceeded target of +1.3)

FEATURE CASCADE SUMMARY:
  NEW_HOOKS: 2 (pre_lathe_output_validation, post_lathe_program_metrics)
  NEW_ACTIONS: 2 (prism_lathe:generate_g76_threading_block, prism_lathe:validate_g76_syntax)
  NEW_SKILLS: 1 (/lathe-threading-calc, wiring complete, awaiting frontend 5-2)
  REGISTRIES_UPDATED: 1 (ThreadingToolRegistry +18 entries)
  DOWNSTREAM_CONSUMERS: 3 sessions declared (0-B-2, 1-2, 1-3)

NEXT SESSION: 0-B-2 (MillTurn crash fix — uses G76 threading block from this session)
```

---

## Support

If templates are unclear or too rigid:

1. **Check TEMPLATE-INTEGRATION-GUIDE.md** — full worked example
2. **Check roadmap-exemplar.md** — health endpoint example
3. **Ask**: What proof type fits your criterion?
4. **Iterate**: Templates improve with use

---

## Version

Created: 2026-03-30  
By: Code Review Agent (LOOP 2 — Deep Scrutiny)  
Solves: Exit Gate Rigor (23→75+), PCCA Activation (25→85+), EIGC Gap Closure (28→85+)

Use in every v24 session. Enforce rigor. No vague criteria. No orphaned features. No rollback mysteries.

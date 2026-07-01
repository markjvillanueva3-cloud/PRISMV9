# PRISM Roadmap Template System — Complete Index

**Version**: 1.0  
**Created**: 2026-03-30  
**Location**: H:/prism/mcp-server/data/templates/  
**Purpose**: Universal templates for roadmap session planning, exit gates, rollbacks, and feature cascades  
**Solves**: Loop 2 findings for Exit Gate Rigor (23→75+), PCCA Activation (25→85+), EIGC Gap Closure (28→85+)

---

## 📋 Files in This Directory

### Core Templates (Copy-Paste Ready)

#### 1. UNIVERSAL-EXIT-GATE-TEMPLATE.md (294 lines)
**Use in**: EXIT GATE section of every roadmap session  
**Purpose**: Define measurable completion criteria with proof types and quality thresholds

**Key sections**:
- Template structure (copy-paste starting point)
- 13 proof types (test_count, compilation, integration_pass, golden_baseline, etc.)
- OMEGA_FLOOR quality threshold with math formula
- SVI/Psi delta target with measurement method
- Complete worked example (Health Endpoint)
- Rules for using the template (7 rules)

**Quick reference**:
```markdown
EXIT GATE:
  ✓ CRITERION 1: {{ description }}
    Proof Type: {{ test_count | compilation | integration_pass | ... }}
    Proof: {{ what evidence satisfies this }}
    Rollback: {{ revert_command_if_fails }}
  
  OMEGA_FLOOR QUALITY: {{ min_score }}/10
  SVI/PSI DELTA TARGET: {{ baseline }}% → {{ target }}%
  FEATURE CASCADE: [see UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md]
```

**Solves**: Exit Gate Rigor (vague → specific measurable criteria)

---

#### 2. UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md (351 lines)
**Use in**: Each unit or in EXIT GATE section  
**Purpose**: Step-by-step git instructions to safely undo the unit's work

**Key sections**:
- FILES_CREATED (list of new files, absolute paths)
- FILES_MODIFIED (each file + what changed)
- ABORT_CRITERIA (≥3 measurable conditions that trigger halt)
- ROLLBACK_PROCEDURE (step-by-step git commands)
- FAILURE_MODE_ID (reference to failure-mode registry)
- Common abort conditions (table of 10 scenarios)
- Complete worked example (MillTurn crash fix, 3 units)
- Rules (7 critical rules)

**Quick reference**:
```markdown
ROLLBACK BLOCK:
  FILES_CREATED: [list]
  FILES_MODIFIED: [list with specific changes]
  ABORT_CRITERIA:
    Condition 1: {{ measurable_stop_point }}
    Condition 2: {{ measurable_stop_point }}
    Condition 3: {{ measurable_stop_point }}
  ROLLBACK_PROCEDURE:
    If {{ CONDITION }}:
      1. git status
      2. git diff {{ file }} | head
      3. git checkout -- [files]
      4. rm [files]
      5. npm test
      6. git status
  FAILURE_MODE_ID: FM-{{ NNN }}: {{ category }}
```

**Solves**: EIGC Gap Closure (undefined rollback → executable procedure)

---

#### 3. UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md (545 lines)
**Use in**: FEATURE CASCADE sub-section of EXIT GATE  
**Purpose**: Inventory new hooks/actions/skills and map downstream consumer dependencies

**Key sections**:
- Template structure (copy-paste starting point)
- NEW_HOOKS (protection scope, fire condition, required sessions)
- NEW_ACTIONS (route, handler, consumer intent, users)
- NEW_SKILLS (trigger, input/output, wiring, use case)
- REGISTRIES_UPDATED (entry counts, example entries, consumers)
- AVAILABLE_TO (downstream sessions + reason)
- Guidance by section (hook scope categories, action format, skill triggers)
- Complete worked example (Lathe Threading Output, 6 pages)
- Rules (6 critical rules)

**Quick reference**:
```markdown
FEATURE CASCADE: NEW CAPABILITIES AVAILABLE

  NEW_HOOKS:
    hook_name: protection_scope
      Fire Condition: {{ when }}
      Prevents: {{ what }}
      Required In: [{{ sessions }}]

  NEW_ACTIONS:
    dispatcher:action_name
      Route: POST /api/dispatchers/...
      Consumer Intent: {{ why_needed }}
      Used By Sessions: [{{ sessions }}]
      Used By Skills: [{{ skills }}]

  NEW_SKILLS:
    /skill_name
      Trigger: {{ when_invoked }}
      Wiring To: [{{ dispatcher:action }}, ...]
      Used By Sessions: [{{ sessions }}]

  REGISTRIES_UPDATED:
    RegistryName: +{{ N }} entries
      Used By: [{{ engines|sessions }}]

  AVAILABLE_TO:
    - SESSION X: reason
    - [AWAITING_CONSUMER]: reason (if no consumer yet)
```

**Solves**: PCCA Activation (purpose/capability/consumer/availability unclear → fully documented)

---

### Integration & Reference Documents

#### 4. TEMPLATE-INTEGRATION-GUIDE.md (656 lines)
**Use**: Read once before first use, then reference  
**Purpose**: Show how three templates work together in complete session execution

**Key sections**:
- How templates work together (phase flow: planning → implementation → validation → next session)
- Quick reference table (which template for what)
- The 4-LOOP (BUILD → SCRUTINIZE → GAP FILL + TIE UP)
- Complete worked example: Lathe Threading Output session
  - Session header (SMART CONFIG, INTENT, UNITS)
  - Unit 1: G76 block generation (with all 3 templates applied)
  - Unit 2: G-code validation (with all 3 templates applied)
  - Unit 3: Threading tool registry (with all 3 templates applied)
  - Complete EXIT GATE for all 3 units (6 pages)
- Quick copy-paste reference
- Exit gate checklist (10 items to verify before /compact)
- Integration rules (5 pairing rules)
- Common mistakes table (8 don'ts → do's)
- Troubleshooting (6 Q&A pairs)
- Enforcement: the pre-edit hook

**Use to understand**: How three templates fit together, what a real session looks like

---

#### 5. README-TEMPLATES.md (336 lines)
**Use**: Quick reference guide, before first use  
**Purpose**: Overview of template system + quick-start guide

**Key sections**:
- Quick start (when to use each template)
- The 3 proof types (13 types in table format)
- Exit gate checklist (10 items)
- Integration rules (5 rules)
- Common mistakes (8 don'ts)
- File locations
- How sessions use templates (shows session block template structure)
- Support (what to do if confused)
- Version note

**Use to**: Get oriented, find which template to use

---

#### 6. LOOP2-FINDINGS-RESOLUTION.md (365 lines)
**Use**: Understand the problem being solved  
**Purpose**: Map Loop 2 findings to template solutions

**Key sections**:
- Loop 1 findings (three worst dimensions: Exit Gate Rigor 23, PCCA Activation 25, EIGC Gap Closure 28)
- Template 1 solution: Exit Gate Rigor (before/after comparison, impact, mechanism)
- Template 2 solution: EIGC Gap Closure (before/after comparison, EIGC chain fix)
- Template 3 solution: PCCA Activation (before/after comparison, PCCA mapping)
- Scoring improvement mechanics (detailed breakdown per dimension)
- Application timeline (immediate, during session, before /compact, next session)
- Enforcement: the pre-edit hook (how compliance is enforced)
- Success metrics (KPIs to track improvement)
- How this fits into v24 roadmap (Phase 0-D, 1-4, impact)
- Conclusion

**Use to**: Understand why these templates matter, what they fix

---

### Reference Example

#### roadmap-exemplar.md (already exists)
**Use**: See existing example of RGS-format roadmap (golden standard)  
**Format**: Health endpoint example with full structure

---

## 🚀 Quick Start (5 Minutes)

1. **Read this file** (INDEX.md) — you're reading it now ✓
2. **Read README-TEMPLATES.md** (5 min) — overview + quick start
3. **Skim TEMPLATE-INTEGRATION-GUIDE.md** (10 min) — see complete worked example
4. **Before your first session**: Copy UNIVERSAL-*.md templates into your session block
5. **During sessions**: Fill in placeholders with your values
6. **Before /compact**: Verify all criteria measurable, all features have consumers

---

## 📊 File Statistics

| File | Lines | Purpose | Read Time |
|------|-------|---------|-----------|
| INDEX.md (this) | 250 | Navigation | 3 min |
| README-TEMPLATES.md | 336 | Quick start | 5 min |
| TEMPLATE-INTEGRATION-GUIDE.md | 656 | Integration + worked example | 20 min |
| LOOP2-FINDINGS-RESOLUTION.md | 365 | Problem context | 10 min |
| UNIVERSAL-EXIT-GATE-TEMPLATE.md | 294 | Template 1 + reference | 10 min |
| UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md | 351 | Template 2 + reference | 10 min |
| UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md | 545 | Template 3 + reference | 15 min |
| **TOTAL** | **2,547** | **Complete system** | **60–90 min (full read)** |

**Recommended reading order**:
1. README-TEMPLATES.md (overview)
2. TEMPLATE-INTEGRATION-GUIDE.md (worked example)
3. Reference individual templates as needed

---

## 🎯 What Each Template Solves

### UNIVERSAL-EXIT-GATE-TEMPLATE.md
**Problem**: Session exit gates are vague ("code is done", "tests pass")  
**Solution**: Measurable criteria with proof types + quality formula + SVI/Psi tracking  
**Improvement**: Exit Gate Rigor 23/100 → 75+/100

### UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md
**Problem**: Rollback procedures are informal ("undo last commit?", "which files?")  
**Solution**: Enumerated files + abort criteria + step-by-step git commands + failure modes  
**Improvement**: EIGC Gap Closure 28/100 → 85+/100 (infrastructure fully wired + testable)

### UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md
**Problem**: New features have no consumer mapping (orphaned infrastructure)  
**Solution**: Every hook/action/skill declares purpose, consumer, availability  
**Improvement**: PCCA Activation 25/100 → 85+/100 (purpose→capability→consumer→availability complete)

---

## 📖 Navigation by Use Case

### "I'm starting a new roadmap session"
1. Read: README-TEMPLATES.md
2. Read: TEMPLATE-INTEGRATION-GUIDE.md (worked example)
3. Copy: UNIVERSAL-EXIT-GATE-TEMPLATE.md into your EXIT GATE block
4. Copy: UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md into your ROLLBACK BLOCK
5. Copy: UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md into your FEATURE CASCADE block

### "I don't understand what goes in EXIT GATE"
1. Read: UNIVERSAL-EXIT-GATE-TEMPLATE.md (complete guide)
2. Check: TEMPLATE-INTEGRATION-GUIDE.md section "Complete Example" (real example)
3. Copy: The example structure into your session

### "I need to define rollback for a unit"
1. Read: UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md (Detailed Guidance section)
2. Check: TEMPLATE-INTEGRATION-GUIDE.md "Unit 1, 2, 3" examples
3. List: FILES_CREATED, FILES_MODIFIED, ABORT_CRITERIA
4. Write: ROLLBACK_PROCEDURE with git commands
5. Link: FAILURE_MODE_ID

### "I want to understand the problem being solved"
1. Read: LOOP2-FINDINGS-RESOLUTION.md (full context)
2. Read: README-TEMPLATES.md (quick overview)

### "I'm confused about proof types"
1. Read: UNIVERSAL-EXIT-GATE-TEMPLATE.md "Proof Types" section (table of 13 types)
2. Check: README-TEMPLATES.md "The Three Proof Types (Quick Reference)"
3. Example: TEMPLATE-INTEGRATION-GUIDE.md "Complete Example" (6 proof types in one session)

### "I don't know if my feature is ready"
1. Check: UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md "AVAILABLE_TO" section
2. Declare: Which sessions depend on your feature
3. If none: Mark as [AWAITING_CONSUMER] or don't create yet

---

## ✅ Pre-Session Checklist

Before coding, verify your session/unit is well-formed:

- [ ] **Exit Gate**: ≥3 criteria, each with proof type (test_count, compilation, etc.)
- [ ] **Proof Types**: Are they measurable? (npm test output, coverage %, etc.)
- [ ] **OMEGA_FLOOR**: Has a number (7.5/10) + math formula (not opinion)
- [ ] **SVI/Psi Delta**: Has baseline + target + measurement method
- [ ] **Rollback Block**: FILES_CREATED, FILES_MODIFIED, ABORT_CRITERIA, ROLLBACK_PROCEDURE
- [ ] **Abort Conditions**: ≥3, all measurable (not "if bad things happen")
- [ ] **FEATURE CASCADE**: Every new hook/action/skill has ≥1 declared consumer (or [AWAITING_CONSUMER])
- [ ] **Consumers**: Are real planned sessions (not made-up)
- [ ] **FAILURE_MODE_ID**: Linked to FM registry

---

## 🔄 Session Lifecycle

### Phase 1: Plan (Before coding)
```
Session block from v24 roadmap
  ↓
Read templates (this INDEX, README, INTEGRATION-GUIDE)
  ↓
Copy EXIT GATE template → fill placeholders
Copy ROLLBACK BLOCK template → fill placeholders
Copy FEATURE CASCADE template → fill placeholders
  ↓
Pre-session checklist (10 items above)
  ↓
Approve → proceed to coding
```

### Phase 2: Execute (4-LOOP per unit)
```
LOOP 1 — BUILD: Write code
  ↓
LOOP 2 — SCRUTINIZE: /prism-review (fix all CRITICAL+HIGH+MEDIUM)
  ↓
LOOP 3 — GAP FILL + TIE UP: Tests + wiring + constants
  ↓
Repeat for next unit
```

### Phase 3: Validate (Before /compact)
```
Run all EXIT GATE proofs:
  npm test → record actual test count
  coverage report → record %
  tsc --noEmit → verify 0 errors
  /prism-review → verify 0 CRITICAL, 0 HIGH
  /svi → measure Psi delta
  
Update EXIT GATE markdown with actual values
  ↓
Verify FEATURE CASCADE: every item has consumer
  ↓
Verify ROLLBACK BLOCK: all git commands correct
  ↓
/compact → produces HANDOFF.md with validation results
```

### Phase 4: Handoff (Next session)
```
Next session reads HANDOFF.md RESUME
  ↓
Verifies previous session EXIT GATE was satisfied
  ↓
Uses FEATURE CASCADE from previous session
  ↓
Proceeds with new units
```

---

## 🎓 Learning Path

**Time**: 1–2 hours for complete understanding

1. **15 min**: Read this INDEX
2. **5 min**: Read README-TEMPLATES.md
3. **20 min**: Read TEMPLATE-INTEGRATION-GUIDE.md (focuses on worked example)
4. **10 min**: Skim UNIVERSAL-EXIT-GATE-TEMPLATE.md (proof types section)
5. **5 min**: Skim UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md (structure section)
6. **5 min**: Skim UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md (structure section)
7. **10 min**: Read LOOP2-FINDINGS-RESOLUTION.md (context + impact)

Then: **Use templates in your first real session** (learning by doing)

---

## 🔧 Common Tasks

### Create a new exit gate criterion
1. Open UNIVERSAL-EXIT-GATE-TEMPLATE.md
2. Copy the criterion template
3. Fill: {{ criterion_description }}, {{ proof_type }}, {{ specific_evidence_required }}, {{ rollback_if_fails }}
4. Verify: Is proof_type one of the 13 valid types? Is evidence specific (not vague)?

### Define what triggers abort
1. Open UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md
2. Check "Common Abort Conditions" table
3. Copy 3+ conditions that apply to your unit
4. Make them specific: "If npm test fails" not "if something breaks"

### Declare a new feature's consumers
1. Open UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md
2. Find "AVAILABLE_TO" section
3. List downstream sessions that depend on this feature
4. If none exist yet, write [AWAITING_CONSUMER]: reason

### Document a rollback procedure
1. Open UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md
2. List FILES_CREATED and FILES_MODIFIED
3. Write 3+ ABORT_CRITERIA
4. Write ROLLBACK_PROCEDURE as step-by-step git commands (copy from example)
5. Add FAILURE_MODE_ID linking to FM registry

---

## 📌 Important Notes

- **Templates are guides, not dogma**: If your session doesn't fit the template, adapt it. Purpose matters more than format.
- **Test count AUTO**: Don't write "152/152 tests" — write "{{ current_test_count }}/{{ current_test_count }}" — it auto-updates as tests grow.
- **Rollback is executable**: If you can't run the git commands blindly and expect them to work, they're not ready.
- **Features must have consumers**: Orphaned infrastructure (hooks/actions/skills without declared users) should be flagged for removal.
- **Compliance is enforced**: A hook blocks engine edits after 3 edits without `/prism-review`. Use it.

---

## 🆘 Support

**Confused?**
1. Check README-TEMPLATES.md (quick overview)
2. Check TEMPLATE-INTEGRATION-GUIDE.md (worked example)
3. Check specific template (UNIVERSAL-EXIT-GATE, ROLLBACK, CASCADE)

**Template doesn't fit my session?**
1. Read LOOP2-FINDINGS-RESOLUTION.md (why templates exist)
2. Read TEMPLATE-INTEGRATION-GUIDE.md "Rules Summary" (7 rules for template use)
3. Adapt template to your context (purpose > format)

**Exit gate criterion is too vague?**
1. Add proof type: test_count, compilation, integration_pass, coverage, diff_check, etc.
2. Make proof specific: "npm test output shows 24/24 passed" (not "tests work")

**Don't know what to put in FEATURE CASCADE?**
1. Either: your session has no new hooks/actions/skills (omit block), OR
2. You created infrastructure but didn't document it (go back and document)

---

## 📄 Summary

This directory contains a complete, production-ready template system for PRISM roadmap sessions.

**Three templates** (copy-paste ready):
- UNIVERSAL-EXIT-GATE-TEMPLATE.md (measurable completion criteria)
- UNIVERSAL-ROLLBACK-BLOCK-TEMPLATE.md (safe rollback procedures)
- UNIVERSAL-FEATURE-CASCADE-TEMPLATE.md (feature inventory + consumer mapping)

**Three reference documents** (read for understanding):
- TEMPLATE-INTEGRATION-GUIDE.md (worked example: Lathe Threading Output, 3 units)
- README-TEMPLATES.md (quick start + copy-paste patterns)
- LOOP2-FINDINGS-RESOLUTION.md (why templates matter, what they fix)

**Plus this file** (INDEX.md) for navigation.

**Total**: 2,547 lines, 75 KB, designed for 60–90 min reading → lifetime use.

Start with README-TEMPLATES.md. Then use templates in your first session. That's it.

Welcome to rigorous roadmap execution.

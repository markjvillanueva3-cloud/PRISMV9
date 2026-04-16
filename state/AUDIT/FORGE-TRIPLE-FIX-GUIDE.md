# FORGE-TRIPLE FIX GUIDE — Implementation Checklist

**Generated from Audit Report** | Agent 5 Review | 2026-03-30

---

## WHAT THIS FIXES

This guide enables:
1. **Cross-session continuity:** Session N's forged hooks/actions/skills are discoverable to Session N+1
2. **Naming consistency:** All forge-triples follow `hook={name} + action=prism_{dispatcher}:{action} + skill=/{name}`
3. **Operator clarity:** Roadmap readable = no mystery about what a session will produce
4. **Protocol enforcement:** EXIT GATE checklist validates forge-triple completeness

---

## PART 1: IMMEDIATE FIXES (Next 2 hours)

### 1.1: Rename All "4-LOOP GATE" → "EXIT GATE"

**Files to fix:**
- H:/prism/WIRE-EDM-COMPREHENSIVE-ROADMAP.md
- H:/prism/LASER-COMPREHENSIVE-ROADMAP.md
- H:/prism/GRINDING-COMPREHENSIVE-ROADMAP.md
- H:/prism/MILL-TURN-COMPREHENSIVE-ROADMAP.md
- H:/prism/WATERJET-COMPREHENSIVE-ROADMAP.md
- H:/prism/FIVE-AXIS-COMPREHENSIVE-ROADMAP.md

**Search/replace (each file):**
```
OLD: > **4-LOOP GATE:**
NEW: **EXIT GATE:**
```

**Count:** ~54 instances across 6 files (9 per file average)

**Why:** v24 standard uses EXIT GATE. Specialist roadmaps must align for operator consistency.

### 1.2: Remove Redundant "SESSION BOUNDARY — MANDATORY:" Labels

**Search/replace (each file):**
```
OLD:
**SESSION BOUNDARY — MANDATORY:**
```
(Delete the whole section OR merge into EXIT GATE)

**Replacement (if keeping for clarity):**
```
NEW:
**NEXT MILESTONE GATE:**
When all milestones in this set are done, trigger /startup and /compact before continuing.
```

**Why:** EXIT GATE already covers this. Duplication confuses operators.

### 1.3: Add Hook Name to v24 Example (lines 4758-4759)

**File:** H:/prism/CAMX-RESTRUCTURED-ROADMAP-v24.md

**Current:**
```
FORGE-TRIPLE: hook for coupled model convergence check + MCP action prism_calc:coupled_prediction + /predict enhancement
EXIT GATE: ✓ Coupled chain runs end-to-end + hand-calculated validation + 4-loop + forge-triple + /compact
```

**Fixed:**
```
FORGE-TRIPLE: hook=coupled_model_convergence_safety + action=prism_calc:coupled_prediction + skill=/coupled-predict
EXIT GATE: ✓ Coupled chain runs end-to-end + hand-calculated validation + 4-loop + forge-triple + /compact
```

**Why:** Provides complete model (hook + action + skill) for other roadmaps to imitate.

---

## PART 2: MODERATE EFFORT (1-2 sessions)

### 2.1: Add Per-Milestone FORGE-TRIPLE Declarations

**Pattern:** Every milestone that forges capabilities gets this header.

**Example (WIRE-EDM-MS0, line 195):**

**BEFORE:**
```markdown
### WEDM-MS0: Test Expansion — Tier 6 Complex Parts
**Priority: HIGH | Units: 8 | Depends on: nothing**

**Apply: `/smart /forge-triple` at session start for this milestone**
```

**AFTER:**
```markdown
### WEDM-MS0: Test Expansion — Tier 6 Complex Parts
**Priority: HIGH | Units: 8 | Depends on: nothing**

**Forge-Triple Outputs (after session):**
```
hook=wedm_tier6_validation_enforcement
action=prism_cam:wedm_test_tier6
skill=/wedm-validate-tier6
```

**Why:** Operator knows EXACTLY what capabilities will exist after this session. No mystery.

### 2.2: Generate Specific Forge-Triple Names for ALL Milestones

**Process:**

For each roadmap, for each milestone:
1. Read the INTENT + WORK sections
2. Ask: "What new ENGINE / HOOK / ACTION / SKILL emerges here?"
3. Name them with pattern:
   - **Hook:** `{process}_{capability}_{enforcement_type}` 
     - e.g., `wedm_corner_safety`, `laser_nozzle_collision`, `grind_wheel_dress_validation`
   - **Action:** `prism_{dispatcher}:{short_action}` 
     - e.g., `prism_cam:wedm_corner_check`, `prism_phys:thermal_model`, `prism_sim:5axis_collision`
   - **Skill:** `/{short_skill_name}` 
     - e.g., `/wedm-corner-analysis`, `/thermal-model-check`, `/5axis-collision-detect`

**Example for LASER-MS3 (Nesting Optimization):**

```markdown
### LASER-MS3: Nesting Optimization

**Forge-Triple Outputs (after session):**
```
hook=laser_nesting_common_line_protection
action=prism_cam:laser_nesting_optimal
skill=/laser-nesting-optimize
```

**KNOWLEDGE SOURCES (auto-include new skill):**
  - Newly created MCP action: prism_cam:laser_nesting_optimal (computes bin-pack layout)
  - Newly created skill: /laser-nesting-optimize (operator can invoke for quick layout calc)
  - Enforcement: hook_laser_nesting prevents removal of common-line cutting logic
```

### 2.3: Build Forge-Triple Name Mapping

**Output file:** H:/prism/state/FORGE-TRIPLE-REGISTRY.json

**Format:**
```json
{
  "WIRE-EDM": {
    "MS0": {
      "name": "Test Expansion — Tier 6 Complex Parts",
      "hook": "wedm_tier6_validation_enforcement",
      "action": "prism_cam:wedm_test_tier6",
      "skill": "/wedm-validate-tier6",
      "description": "Validates 6 tier-6 part profiles (progressive die, turbine blade, PCD, micro-gear, stacking, skim)",
      "session_link": "Will be filled post-session"
    },
    "MS1": {
      "name": "Lead-In/Out Arcs & Slug Retention Hardening",
      "hook": "wedm_slug_retention_safety",
      "action": "prism_cam:wedm_slug_retention",
      "skill": "/wedm-slug-analysis",
      "description": "Validates lead-in arcs, slug retention strategies, multi-slug sequencing",
      "session_link": "TBD"
    }
    // ... more milestones
  },
  "LASER": { /* … */ },
  "GRINDING": { /* … */ }
}
```

**Why:** Single source of truth for ALL forge-triple outputs. Tools can reference this to detect conflicts.

---

## PART 3: SELF-UPDATE LOOP INFRASTRUCTURE (1 session)

### 3.1: Build COMPACTION_SURVIVAL.json Writer

**Location:** H:/prism/state/COMPACTION_SURVIVAL.json

**Trigger:** Automatic on `/compact` (via `precompact-save.sh` hook)

**Format:**
```json
{
  "session": "0-D-7b",
  "timestamp": "2026-03-30T14:23:45Z",
  "roadmap": "WIRE-EDM-COMPREHENSIVE-ROADMAP.md",
  "milestone": "WEDM-MS0",
  "units_completed": 8,
  "forge_triples": [
    {
      "hook": "wedm_tier6_validation_enforcement",
      "action": "prism_cam:wedm_test_tier6",
      "skill": "/wedm-validate-tier6",
      "file": "src/engines/WireEDMValidationEngine.ts",
      "tests": "src/engines/__tests__/WireEDMValidationEngine.test.ts",
      "created_by": "Claude (Haiku)"
    }
  ],
  "dependencies": ["wedm_corner_safety (MS2)", "wedm_material_adaptive (MS3)"],
  "next_session_should": [
    "Import hook_wedm_tier6_validation_enforcement for MS1 to use in collision checks",
    "Use skill /wedm-validate-tier6 in MS1 unit tests for progressive die validation"
  ]
}
```

### 3.2: Build Session Startup Hook

**File:** H:/prism/.claude/hooks/session-startup-inherited.sh

**Purpose:** Auto-discover capabilities from previous sessions

**Logic:**
```bash
#!/bin/bash

if [ -f "H:/prism/state/COMPACTION_SURVIVAL.json" ]; then
  echo "INHERITED CAPABILITIES FROM PREVIOUS SESSION:"
  jq '.forge_triples[] | "\(.hook) ← \(.skill)"' H:/prism/state/COMPACTION_SURVIVAL.json
  echo ""
  echo "Next session should consider reusing these. Check /handoff for details."
fi
```

**When:** Auto-runs on `/startup`

### 3.3: Update HANDOFF.md Template

**Add section after RESUME:**

```markdown
## INHERITED CAPABILITIES (from previous session)

If previous session forged capabilities, they are listed below.
Check COMPACTION_SURVIVAL.json for full details.

HOOK: wedm_tier6_validation_enforcement
  Location: src/engines/WireEDMValidationEngine.ts
  Use: Validation of 6-tier parts before routing to controller
  Depends on: Material registry, workflow profile, tier_6_features

ACTION: prism_cam:wedm_test_tier6
  Dispatcher: prism_cam
  Can be called: From PRISM web app, skill /wedm-validate-tier6, external integrations
  Inputs: part_profile, materials, controller_dialect
  Outputs: validation_report, estimated_program_lines

SKILL: /wedm-validate-tier6
  Call: /wedm-validate-tier6 [part_file] [materials] [controller]
  Returns: Validation report + test suite status
  Useful for: Quick pre-flight checks before complex part routing

IF building next milestone:
  ✓ Check if inherited capability applies
  ✓ Use prism_cam:wedm_test_tier6 in integration tests (avoid rebuilding)
  ✓ Reference /wedm-validate-tier6 in WORK section if it accelerates progress
```

### 3.4: Auto-Detect Conflicts (Linting)

**Tool:** H:/prism/linter/forge-triple-conflict-check.mjs

**Purpose:** Before forging, check if skill/action/hook already exists

**Logic:**
```javascript
const FORGE_REGISTRY = require('./FORGE-TRIPLE-REGISTRY.json');
const newSkill = '/wedm-validate-tier6';

if (FORGE_REGISTRY.*.*.skill === newSkill) {
  console.error(`CONFLICT: Skill ${newSkill} already forged in MS0`);
  console.error(`Use existing skill or rename to /wedm-validate-tier6-v2`);
  process.exit(1);
}
```

**Trigger:** Pre-commit hook, before session merge

---

## PART 4: DOCUMENTATION UPDATES (30 min)

### 4.1: Update CLAUDE.md v24 ROADMAP EXECUTION PROTOCOL

**Add section:**

```markdown
### Session Forge-Triple Specificity (NEW)

Before ANY work: Determine and declare the exact hook+action+skill outputs.

NAMING RULES (ENFORCE):
  - Hook: {process}_{capability}_{enforcement}
    ✓ wedm_corner_safety (specific, enforcement purpose clear)
    ✗ safety_check (vague, could apply anywhere)
  - Action: prism_{dispatcher}:{verb_noun}
    ✓ prism_cam:wedm_corner_check (knows dispatcher + action)
    ✗ prism:wedm_check (action name missing)
  - Skill: /{dash_separated_name}
    ✓ /wedm-corner-analysis (readable, matches action)
    ✗ /wed (too short, unclear)

SELF-UPDATE RULE (NEW):
  Before reading KNOWLEDGE SOURCES, run:
    jq '.forge_triples' H:/prism/state/COMPACTION_SURVIVAL.json
  If new capabilities exist, add AVAILABLE TOOLS subsection to session README.
  If new hook/action/skill applies to current work, reference it explicitly.
  NEVER forge a capability that already exists — reuse + document.
```

### 4.2: Add Forge-Triple Specificity Requirement to EXIT GATE Template

**Update v24 lines ~4760:**

```markdown
EXIT GATE CHECKLIST:
  ✓ All 4-loops complete (SCRUTINIZE → GAP FILL → TIE UP)
  ✓ BUILD: npx tsc --noEmit → 0 errors
  ✓ SCRUTINIZE: /prism-review → 0 CRIT/HIGH
  ✓ GAP FILL: /test → 0 failures
  ✓ TIE UP: All wiring verified (/trace) + reasoning[] populated
  ✓ FORGE-TRIPLE SPECIFICITY: hook={name}, action=prism_{disp}:{action}, skill=/{name}
  ✓ COMPACTION_SURVIVAL.json written with hook+action+skill details
  ✓ /compact → HANDOFF.md includes INHERITED_CAPABILITIES section
```

---

## PART 5: VALIDATION (Post-implementation)

### 5.1: Audit Checklist (for next review)

When roadmaps are fixed, audit against:

- [ ] All 6 specialist roadmaps use "EXIT GATE" (0 instances of "4-LOOP GATE")
- [ ] All milestones with forged outputs include FORGE-TRIPLE line with hook+action+skill
- [ ] H:/prism/state/FORGE-TRIPLE-REGISTRY.json exists and lists all milestones
- [ ] At least 1 session has generated COMPACTION_SURVIVAL.json
- [ ] Session startup runs inherited-capabilities hook
- [ ] No duplicate hook/action/skill names across any roadmap

### 5.2: Spot-Check Example

**From WIRE-EDM-MS0 (after fix):**

```markdown
### WEDM-MS0: Test Expansion — Tier 6 Complex Parts

FORGE-TRIPLE: hook=wedm_tier6_validation_enforcement + action=prism_cam:wedm_test_tier6 + skill=/wedm-validate-tier6

KNOWLEDGE SOURCES:
  - Newly forged hook prevents removal of 6-tier part validation logic
  - Newly forged action prism_cam:wedm_test_tier6 available for PRISM web app
  - Newly forged skill /wedm-validate-tier6 ready for operator use

EXIT GATE:
  ✓ 8 units complete (T6 progressive die, turbine blade, PCD, micro-gear, stacking, skim, tall, cross-controller)
  ✓ npx tsc --noEmit → 0 errors
  ✓ /prism-review → 0 CRIT/HIGH findings
  ✓ npx vitest → 249 passing + 98 validation → 0 failures
  ✓ All wiring verified (/trace): WireEDMPrintToProgramEngine → T6 parts → validation
  ✓ FORGE-TRIPLE outputs registered: hook_wedm_tier6_validation_enforcement created
  ✓ /compact written COMPACTION_SURVIVAL.json with inherited hook/action/skill for MS1
```

**Operator reading this:** Knows EXACTLY what will be available after this session, can plan dependent work.

---

## ROLLOUT SCHEDULE

### Session 1: Immediate Fixes (Labeling)
- Rename 4-LOOP GATE → EXIT GATE (all 6 roadmaps)
- Add hook name to v24 example
- ~1 hour

### Session 2: Forge-Triple Specificity
- Determine + declare hook/action/skill for all milestones (all roadmaps)
- Build FORGE-TRIPLE-REGISTRY.json
- ~4-6 hours

### Session 3: Self-Update Infrastructure
- Build COMPACTION_SURVIVAL.json writer + reader
- Update HANDOFF.md template
- Add session-startup inherited-capabilities hook
- Build conflict detection linter
- ~3-4 hours

### Sessions 4+: Ongoing
- Every new roadmap uses specific forge-triple format from day 1
- Every /compact writes COMPACTION_SURVIVAL.json
- Every /startup reads inherited capabilities
- Zero rework, zero duplicate forging

---

## SUCCESS CRITERIA

After all fixes:

1. **Readability:** Operator reads milestone section → knows exact hook+action+skill that will exist
2. **Continuity:** Session N+1 reads COMPACTION_SURVIVAL.json → discovers + reuses Session N outputs
3. **Consistency:** All milestones across all roadmaps follow same naming pattern
4. **No Duplicates:** Linter prevents forging same hook/action/skill twice
5. **Audit Trail:** FORGE-TRIPLE-REGISTRY.json + COMPACTION_SURVIVAL.json = complete capability history


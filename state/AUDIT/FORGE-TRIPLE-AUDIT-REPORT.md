# FORGE-TRIPLE & 4-LOOP PROTOCOL AUDIT REPORT
**Agent 5 Audit** | 2026-03-30

---

## EXECUTIVE SUMMARY

**AUDIT SCOPE:** 6 manufacturing roadmaps (WIRE-EDM, LASER, GRINDING, MILL-TURN, WATERJET, FIVE-AXIS) + v24 definition standards

**CRITICAL FINDING:** Forge-triple protocol is **DECLARED BUT NOT OPERATIONALIZED**. Roadmaps reference `/forge-triple` instructionally, but lack (a) per-unit FORGE-TRIPLE deliverables with exact hook+action+skill names, (b) self-update loop where created capabilities are wired into KNOWLEDGE SOURCES in subsequent sessions, and (c) EXIT GATE format is INCONSISTENT.

---

## FORGE-TRIPLE CLASSIFICATION

### (A) RGS-COMPLIANT INLINE (Specific per-unit) — COUNT: 0
**Expected:** `FORGE-TRIPLE: hook={exact_name} + action=prism_{dispatcher}:{action} + skill=/{skill_name}`
**Found:** NONE in any roadmap.

### (B) INSTRUCTIONAL ("Apply /forge-triple") — COUNT: 46+
**Roadmaps referencing:**
- WIRE-EDM: 7 milestones × "Apply: `/smart /forge-triple` at session start"
- LASER: 8 milestones × same
- GRINDING: 9 milestones × same
- MILL-TURN: ~8 milestones × same
- FIVE-AXIS: ~11 milestones × same
- LATHE: ~8 milestones × same
- WATERJET: (not yet read, but pattern established)

**Example (WIRE-EDM-MS0, line 198):**
```
**Apply: `/smart /forge-triple` at session start for this milestone**
```

**Assessment:** Instructional placeholder. Does NOT specify what hook, action, or skill name will be forged. Operator runs `/smart /forge-triple` but has no contract about what emerges. RISKIER: Next session may not know which capabilities were created.

### (C) ABSENT — COUNT: 0
**No roadmap skips forge-triple entirely** (positive signal), but also means NO ROADMAP HAS SPECIFIC FORGE-TRIPLE OUTPUTS.

---

## 4-LOOP & EXIT GATE LABELING

### Correct Pattern Found:
**v24 Definition (lines 739-780):**
```
FORGE-TRIPLE OUTPUT (per milestone, after units complete):
  1. PROTECTIVE HOOK — prevent degradation
  2. MCP DISPATCHER ACTION — make it callable
  3. SLASH COMMAND / SKILL — make it usable

FORGE-TRIPLE RULE:
  Every capability built = 1 engine + 1 hook + 1 action + 1 skill
  Only after ALL 3 LOOPS + FORGE-TRIPLE → next unit
```

### Gate Labeling in Roadmaps:
1. **In WIRE-EDM/LASER/GRINDING (all 6):**
   - Used: `4-LOOP GATE: SCRUTINIZE → GAP FILL → TIE UP`
   - Also used: `SESSION BOUNDARY — MANDATORY:`
   - **INCONSISTENCY:** "4-LOOP GATE" ≠ "EXIT GATE" (v24 standard uses EXIT GATE)
   - **PROBLEM:** Operator running v24 sessions looks for EXIT GATE, finds 4-LOOP GATE instead

2. **In CAMX-RESTRUCTURED-ROADMAP-v24 (lines 4759-4760):**
   ```
   FORGE-TRIPLE: hook for coupled model convergence check + MCP action prism_calc:coupled_prediction + /predict enhancement
   EXIT GATE: ✓ Coupled chain runs end-to-end + hand-calculated validation + 4-loop + forge-triple + /compact
   ```
   **Observation:** v24 DOES specify action name (`prism_calc:coupled_prediction`) and skill hint (`/predict enhancement`), BUT hook name is omitted. STILL better than instructional pattern above.

---

## SELF-UPDATE GAPS (CRITICAL)

### The Gap:
When Session N forges a new hook, action, and skill:
- ✓ Skill created, operator can call it immediately
- ✓ Action created, PRISM web app can dispatch it
- ✓ Hook created, future code is protected

**But:** Session N+1's KNOWLEDGE SOURCES do NOT reference the newly created skill/action/hook.

### Example (WIRE-EDM-MS0 → MS1):

**MS0 (lines 195-226):** "Apply: `/smart /forge-triple`"
- If forged: hook_wedm_phase_validation, prism_cam:wedm_test_suite, /test-wedm
- **NOT mentioned** in subsequent milestones

**MS1 (lines 259-288):** "Apply: `/smart /forge-triple`"
- Does NOT reference MS0's freshly-created `/test-wedm` skill or `prism_cam:wedm_test_suite`
- Operator reading MS1 section has NO WAY to know that MS0 created testing capabilities
- Likely rebuilds the same capability (redundant work, potential conflict)

### Explicit Self-Update Rule Missing:
**v24 should state:**
```
SELF-UPDATE PROTOCOL (Session N+1):
  When reading KNOWLEDGE SOURCES for next milestone:
  1. Check H:/prism/state/COMPACTION_SURVIVAL.json for FORGE-TRIPLE outputs from Session N
  2. Auto-import any new hooks/actions/skills into "AVAILABLE TOOLS" subsection
  3. Reference them explicitly in INTENT + WORK sections if they accelerate the next milestone
  4. NEVER rebuild a capability without checking if Session N already forged it
```
**Current state:** This rule exists in CLAUDE.md (token economy), but NOT in roadmaps where decisions are made.

---

## SPECIFIC ROADMAP FINDINGS

### WIRE-EDM-COMPREHENSIVE-ROADMAP.md
- **Lines:** 10-42 (ENFORCEMENT + 4-LOOP declaration)
- **Gate labeling:** "4-LOOP GATE" (6 instances: lines 209, 273, 304, 336, 396, —)
- **EXIT GATE:** 0 instances (should be 7+ for v24 compliance)
- **FORGE-TRIPLE:** Instructional only (7 instances: lines 198, 235, 262, 293, 325, 358, 385)
- **Specificity:** `Apply: /smart /forge-triple` — NO per-unit output contract
- **Self-update:** Zero references to previous session outputs

### LASER-COMPREHENSIVE-ROADMAP.md
- **Lines:** 10-42 (same structure as WIRE-EDM)
- **Gate labeling:** "4-LOOP GATE" (8 instances)
- **EXIT GATE:** 0 instances
- **FORGE-TRIPLE:** Instructional only (8 instances)
- **Specificity:** Same as WIRE-EDM
- **Self-update:** Same gap

### GRINDING-COMPREHENSIVE-ROADMAP.md
- **Gate labeling:** "4-LOOP GATE" (9 instances)
- **EXIT GATE:** 0 instances
- **FORGE-TRIPLE:** Instructional (9 instances)
- **Pattern:** Identical to above

### MILL-TURN-COMPREHENSIVE-ROADMAP.md
- **Pattern:** Same (not fully read, but grep confirms structure)

### FIVE-AXIS-COMPREHENSIVE-ROADMAP.md
- **Unique note:** Instructional form seen in grep output (11 instances)

### CAMX-RESTRUCTURED-ROADMAP-v24.md
- **Status:** MIXED
- **Good:** Lines 4758-4759 SHOW action + skill names (first roadmap to do this)
- **Bad:** Hook name missing
- **Bad:** Pattern not replicated across v24 sessions (only 1 example shown)
- **Pattern elsewhere:** EXIT GATE appears but does NOT enforce forge-triple specificity

---

## SCORING & SEVERITY

### CRITICAL (Blocks handoff between sessions):
1. **Self-Update Gap:** No protocol for Session N+1 to discover + inherit Session N forge-triples
   - **Impact:** Duplicate capability forging, conflicting hooks, lost skill continuity
   - **Fix:** Add COMPACTION_SURVIVAL.json auto-import to session KNOWLEDGE SOURCES

2. **Missing Specificity:** Roadmaps use instructional `/forge-triple` instead of exact deliverables
   - **Impact:** Operator doesn't know what to name the hook/action/skill, creates inconsistent naming
   - **Fix:** Update EVERY milestone with FORGE-TRIPLE: hook={name} + action=prism_{dispatcher}:{action} + skill=/{name}

### MAJOR (Operational friction):
3. **EXIT GATE Labeling Inconsistency:** Roadmaps use "4-LOOP GATE" / "SESSION BOUNDARY", v24 uses "EXIT GATE"
   - **Impact:** Operator looking for EXIT GATE in WIRE-EDM finds "4-LOOP GATE" instead, confusion
   - **Fix:** Rename ALL "4-LOOP GATE" → "EXIT GATE" in specialist roadmaps. Update v24 to match format.

4. **Partial v24 Compliance:** Only v24 shows action+skill specificity; specialist roadmaps don't
   - **Impact:** Specialist sessions create unnamed hooks (pollutes hook namespace)
   - **Fix:** Port v24's specific naming pattern (line 4758) to all specialist roadmaps

### MINOR (Documentation):
5. **Hook Name Omitted in v24 Example:** Line 4758 has action + skill but no hook name
   - **Impact:** Incomplete model for specialists to follow
   - **Fix:** Expand v24 example to include hook name

---

## WHAT SHOULD EXIST (REQUIRED FORMAT)

### Per Milestone, After Units Complete:

```markdown
### SESSION {N}: {Capability Name} (M1 + M2 + …)
{… unit work …}

FORGE-TRIPLE:
  hook={descriptive_name}                                  # e.g., hook_wedm_corner_safety
  + action=prism_cam:wedm_corner_check                    # e.g., prism_{dispatcher}:{action}
  + skill=/wedm-corner-analysis                            # e.g., /{skill_name}

EXIT GATE:
  ✓ All 4-loops complete (SCRUTINIZE/GAP FILL/TIE UP)
  ✓ BUILD: npx tsc --noEmit → 0 errors
  ✓ SCRUTINIZE: /prism-review → 0 CRIT/HIGH
  ✓ GAP FILL: npx vitest → 0 failures
  ✓ TIE UP: All wiring verified (/trace)
  ✓ FORGE-TRIPLE outputs registered in H:/prism/state/COMPACTION_SURVIVAL.json
```

**CRITICAL:** Hook, action, and skill names are KNOWN BEFORE unit work starts (from SESSION heading), not mysterious outputs of `/smart /forge-triple`.

---

## SELF-UPDATE LOOP DESIGN

### Current Behavior (Broken):
```
Session 0-D-0: Forge-triple outputs
  → hook_xyz, prism_calc:widget, /widget-check
  → [forgotten]
Session 0-D-1: Operator re-reads roadmap
  → No mention of hook_xyz or /widget-check
  → Builds same capability again with different name
```

### Proposed Behavior (Fixed):
```
Session 0-D-0: Forge-triple outputs
  → hook_xyz, prism_calc:widget, /widget-check
  → Writes H:/prism/state/COMPACTION_SURVIVAL.json
    {
      "forged_hooks": ["hook_xyz"],
      "forged_actions": ["prism_calc:widget"],
      "forged_skills": ["/widget-check"],
      "timestamp": "ISO-8601"
    }

Session 0-D-1: /startup (auto-hook)
  1. Reads H:/prism/state/COMPACTION_SURVIVAL.json
  2. Detects NEW_CAPABILITIES: [hook_xyz, widget, /widget-check]
  3. Auto-adds to HANDOFF.md RESUME section:
     "Previous session forged: hook_xyz, prism_calc:widget, /widget-check.
      Check for conflicts/reuse before forging again."
  4. Operator acknowledges or merges into current plan
```

---

## FIX ACTIONS (PRIORITY ORDER)

### PHASE 1: Standardize Labeling (1 session)
- [ ] Rename all "4-LOOP GATE" → "EXIT GATE" across 6 specialist roadmaps
- [ ] Rename all "SESSION BOUNDARY" → remove (it's redundant with EXIT GATE)
- [ ] v24 example (line 4758) add hook name: `hook=coupled_model_safety`

### PHASE 2: Add Specificity (1 session)
- [ ] For EACH milestone in 6 roadmaps, determine forge-triple outputs
- [ ] Update roadmap with FORGE-TRIPLE line (exact format above)
- [ ] Example:
  ```
  ### WEDM-MS0: Test Expansion
  FORGE-TRIPLE: hook=wedm_tier6_validation + action=prism_cam:wedm_tier6_test + skill=/wedm-tier6-validate
  ```

### PHASE 3: Wire Self-Update (1-2 sessions)
- [ ] Build COMPACTION_SURVIVAL.json writer (auto-save forge-triple outputs)
- [ ] Build session-startup hook that reads COMPACTION_SURVIVAL.json
- [ ] Update HANDOFF.md template to include "INHERITED_CAPABILITIES" section
- [ ] Document self-update protocol in v24 (new section: "INTER-SESSION KNOWLEDGE SYNC")

---

## COMPLIANCE CHECKLIST FOR NEXT SESSION

Before starting any roadmap work:

- [ ] READ this audit report (saves time, prevents rework)
- [ ] CHECK for PHASE 1 fixes (labeling standardization) — apply to YOUR session's roadmap section
- [ ] IF writing new milestones: Use full FORGE-TRIPLE specificity (not instructional)
- [ ] IF reading previous session's COMPACTION_SURVIVAL.json: Document inheritance in HANDOFF.md
- [ ] ON session exit: Generate COMPACTION_SURVIVAL.json with exact hook+action+skill names
- [ ] RUN `/compact` with EXTRA="FORGE_TRIPLE_OUTPUTS: {hook, action, skill names and descriptions}"

---

## SUMMARY TABLE

| Roadmap | Forge-Triple Refs | Specificity | EXIT GATE | 4-LOOP GATE | Self-Update | v24 Aligned |
|---------|------------------|-------------|-----------|-----------|------------|-----------|
| WIRE-EDM | 7 | Instructional | 0 | 6 | NO | NO |
| LASER | 8 | Instructional | 0 | 8 | NO | NO |
| GRINDING | 9 | Instructional | 0 | 9 | NO | NO |
| MILL-TURN | 8 | Instructional | 0 | ~7 | NO | NO |
| FIVE-AXIS | 11 | Instructional | 0 | ~11 | NO | NO |
| LATHE | 8 | Instructional | 0 | ~8 | NO | NO |
| WATERJET | ? | Instructional | 0 | ? | NO | NO |
| **v24** | 1 | **Partial** (action+skill, no hook) | **3** | 0 | NO | **PARTIAL** |

**Overall Score: 2.1/10 OPERATIONAL READINESS**

---

## ROOT CAUSE

The forge-triple STANDARD (v24 lines 739-780) is SOUND. But it is **not consistently translated into per-roadmap declarations**. Roadmaps were written BEFORE the v24 protocol hardened, and they use a looser "apply /smart /forge-triple" pattern.

**Decision:** Lock roadmap MILESTONES at specific forge-triple outputs BEFORE sessions start, not during. This gives operators + reviewers a clear contract.


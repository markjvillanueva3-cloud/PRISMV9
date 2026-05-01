# SKILL QUALITY REMEDIATION — R-SKILL
# Status: PLANNED | Prerequisites: None (independent) | Priority: HIGH
# Inserted between current state and DA-MS9 (Skill Atomization Infrastructure)

---

## CONTEXT: WHY THIS EXISTS

On 2026-02-17 we deployed skill-authoring-checklist v1.0 and ran automated remediation
across 116 skills. Result: 116/116 passed regex audit. Reality: 115/116 got identical
templated headers bolted onto unchanged knowledge dumps. The audit measured PRESENCE
of sections, not QUALITY. This phase fixes that.

**Root cause**: Automated script (remediate_skills.js) generated operational sections
by domain classification + keyword extraction. Every manufacturing skill got the same
"How To Use" section. Every example said "provide physics-based recommendation" with
no actual numbers. The checklist v1.0 didn't prevent this because it only checked
for section headings, not section content.

**Fix deployed**: skill-authoring-checklist v2.0 now enforces anti-template rules,
single-purpose constraint, token budgets, and banned phrases. But the 115 already-
templated skills still need manual remediation.

---

## QUICK REFERENCE

Phase: R-SKILL (Skill Quality Remediation)
Location: C:\PRISM\skills-consolidated\ (116 skills across 116 directories)
Checklist: C:\PRISM\skills-consolidated\skill-authoring-checklist\SKILL.md (v2.0)
Index: C:\PRISM\skills-consolidated\SKILL_INDEX.json
GSD gate: SKILL CREATION GATE v2.0 in GSD_QUICK.md
Code enforcement: NONE — prompt-level only (see R-SKILL-MS4 for future hook)

---

## R-SKILL-MS0: TRIAGE & SPLIT PLAN
Role: Data Architect | Effort: M (10-15 calls) | Sessions: 1

**Goal**: Audit all 116 skills, classify each into one of three buckets, produce
a split plan for multi-purpose skills.

**Buckets**:
- A: Single-purpose, needs only operational section rewrite (est. 30-40 skills)
- B: Multi-purpose, needs splitting into 2-5 atomic skills FIRST (est. 40-50 skills)  
- C: Pure knowledge dump with no clear function — archive or convert to reference data (est. 20-30 skills)

**Procedure**:
1. Read each skill's body content (not just the templated header)
2. Count distinct functions: If >1, classify as B
3. Check size: If >15KB with no lookup tables, classify as B
4. If skill is a textbook chapter with no actionable procedure, classify as C
5. Output: SKILL_TRIAGE.json with {skill_id, bucket, split_plan[], estimated_atomic_count}

**Split plan format for Bucket B skills**:
```json
{
  "skill_id": "prism-chip-formation",
  "bucket": "B",
  "current_size_kb": 18.4,
  "functions_found": [
    "chip thickness calculation (turning + milling)",
    "chip type classification by material/params",
    "chip breaking threshold lookup",
    "chip evacuation strategy selection",
    "built-up edge risk assessment"
  ],
  "split_into": [
    {"name": "prism-chip-thickness-calc", "function": "Calculate uncut chip thickness from feed, DOC, geometry"},
    {"name": "prism-chip-type-classifier", "function": "Classify expected chip type given material + params"},
    {"name": "prism-chip-breaking", "function": "Determine if params produce broken chips or need breaker geometry"},
    {"name": "prism-chip-evacuation", "function": "Select evacuation strategy: coolant type, flute count, peck depth"},
    {"name": "prism-bue-risk", "function": "Assess built-up edge risk from speed, material, temperature"}
  ],
  "estimated_total_kb": 12.5
}
```

**Gate**: SKILL_TRIAGE.json complete. User reviews and approves split plan before MS1.

**Anti-regression**: Original skills preserved in backup before any splits.

---

## R-SKILL-MS1: SPLIT MULTI-PURPOSE SKILLS (Bucket B)
Role: Data Architect | Effort: XL (25-40 calls) | Sessions: 3-5

**Goal**: Execute the split plan from MS0. Each Bucket B skill becomes 2-5 atomic skills.

**Procedure per skill**:
1. Read the full body content of the source skill
2. For each function in the split plan:
   a. Extract ONLY the content relevant to that single function
   b. Write a new SKILL.md with frontmatter (name, description)
   c. Compress: formulas and decision criteria ONLY, no theory prose
   d. Target: 2-5KB per atomic skill
3. Verify: each new skill passes v2.0 checklist (BUT operational sections written in MS2)
4. Archive the original multi-purpose skill (move to archive/ subfolder)
5. Update SKILL_INDEX.json

**Batch size**: 3-5 source skills per session (producing 10-20 atomic skills).
NEVER process more than 5 source skills in one session.

**Quality gate per batch**:
- Read 2 random new skills aloud — do they sound like distinct skills or copies?
- Check: can you explain what THIS skill does without saying "and"?
- Present 3 samples to user for approval before continuing to next batch

**Expected output**: ~200-300 atomic skills from ~50 Bucket B sources.

---

## R-SKILL-MS2: WRITE REAL OPERATIONAL SECTIONS (All skills)
Role: Manufacturing Domain Expert | Effort: XL (30-50 calls) | Sessions: 5-8

**Goal**: Replace every templated operational section with skill-specific content.
This is the main remediation work and CANNOT be automated.

**Why this can't be scripted**: The "How To Use" section for prism-chip-thickness-calc
requires knowing that you need Kienzle constants (kc1, mc) from the material database,
that turning uses h = f × sin(κr) while milling uses hm = ae×fz/(π×Dc), and that
values below 0.05mm indicate rubbing. A script can't know this — it requires reading
the skill's content and understanding the manufacturing physics.

**Procedure per skill**:
1. Read the skill body content thoroughly
2. Identify: What specific question does this skill answer?
3. Write "When To Use": actual user phrases, not keywords
   - Include one "NOT this skill" redirect
   - Test: would a machinist recognize these phrases?
4. Write "How To Use": the actual procedure with real dispatcher calls
   - Include specific parameter names from the skill's formulas
   - Include decision branches (if X > threshold → action)
   - Test: could a fresh Claude instance follow these steps?
5. Write "What It Returns": specific data types, units, ranges
   - Include one concrete output with real numbers
   - Include the specific failure mode for this skill
6. Write "Examples": 2 real scenarios with real numbers
   - Use actual materials (316L, 6061-T6, Inconel 718, Ti-6Al-4V)
   - Use actual operations (turning, milling, drilling)
   - Show actual calculated values in the output
   - One normal case, one edge case or error

**Batch size**: 5-8 skills per session. Read each one. Think about each one.

**Per-session quality check**:
- Swap test: take the "How To Use" from skill A and put it in skill B. Does it still make sense? If yes, both are too generic.
- Number test: do the examples contain at least 3 specific numerical values each?
- Redirect test: does each "When To Use" have at least one "NOT this skill" entry?

**Present 3 samples to user after every session for approval.**

---

## R-SKILL-MS3: ARCHIVE & DEDUPLICATE (Bucket C + overlaps)
Role: Data Architect | Effort: M (10-15 calls) | Sessions: 1-2

**Goal**: Handle Bucket C skills (pure knowledge dumps) and resolve overlapping skills.

**Bucket C handling**:
- If the content has value as reference data → convert to a data file in the knowledge registry
  (not a skill — skills must have a procedure, not just information)
- If the content duplicates what's already in material/machine/alarm databases → archive
- If the content is unique domain knowledge → extract formulas/thresholds into atomic skills

**Known overlaps to resolve** (from 2026-02-17 audit):
- prism-mathematical-planning ↔ prism-sp-planning (>80% trigger overlap)
- prism-reasoning-chain-validator ↔ prism-reasoning-validator (>80% trigger overlap)
- Any others found during MS0 triage

**Resolution**: Keep the more specific skill, merge unique content from the other,
archive the duplicate. Update all references in SKILL_INDEX.json and any skill chains.

**Gate**: Zero duplicate skills. Every remaining skill serves a unique function.

---

## R-SKILL-MS4: CODE-LEVEL ENFORCEMENT (Future — requires build)
Role: Systems Architect | Effort: L (15-20 calls) | Sessions: 2

**Goal**: Add a server-side hook that validates skill quality on write, not just
a prompt-level instruction that Claude can ignore or shortcut around.

**Current state**: SKILL_CREATION_GATE exists ONLY as text in GSD_QUICK.md.
No hook fires on skill creation. No code validates skill content quality.
The 62 registered hooks include FILE-BEFORE-WRITE-001 but it doesn't check skill content.

**Implementation plan**:
1. Create hook SKILL-QUALITY-GATE-001 (category: FILE, trigger: before_write, BLOCKING)
2. Hook fires when: file path matches */skills-consolidated/*/SKILL.md
3. Validation checks:
   a. Single-purpose: file size < 15KB (hard), < 8KB (warn)
   b. Section presence: When/How/Returns/Examples headings exist
   c. Anti-template: scan for banned phrases list, BLOCK if >0 found
   d. Example quality: regex check for numeric values in Examples section
   e. Uniqueness: compare "How To Use" section against last 5 written skills,
      BLOCK if cosine similarity > 0.85 (template detection)
4. Hook returns: PASS with score, or BLOCK with specific violations listed

**This is NOT a replacement for human judgment** — it catches the obvious template
patterns that a script would generate. The v2.0 checklist remains the full standard.

**Prerequisites**: Build system must be operational. Hook registry must support
content-based file validation (currently hooks fire on events, not file content).

**This milestone is OPTIONAL for the remediation work** — MS0-MS3 fix the existing
skills using prompt-level enforcement. MS4 prevents future regressions in code.

---

## EXECUTION ORDER & DEPENDENCIES

```
R-SKILL-MS0 (Triage)
    ↓
R-SKILL-MS1 (Split Bucket B) ←── requires MS0 approval
    ↓
R-SKILL-MS2 (Write Real Ops) ←── can start on Bucket A skills in parallel with MS1
    ↓
R-SKILL-MS3 (Archive Bucket C + Dedup) ←── can run parallel with MS2
    ↓
R-SKILL-MS4 (Code Enforcement) ←── independent, requires build system
```

**Parallelism**: MS1 and MS2 can overlap — start MS2 on Bucket A skills while MS1
splits Bucket B skills. MS3 can run anytime after MS0.

**Total estimated effort**: 8-16 sessions across MS0-MS3. MS4 is 2 additional sessions.

---

## CRITICAL RULES FOR ALL MILESTONES

1. **NEVER write a script to generate operational sections.** This is what created
   the problem. Each skill requires reading its content and understanding its function.

2. **3-5 skills per batch maximum.** Quality degrades rapidly above this. The previous
   attempt processed 115 skills in one session and produced 115 identical templates.

3. **User approval after every batch.** Present 3 random samples. If user rejects,
   redo the batch. Do not proceed to the next batch until approved.

4. **Split BEFORE documenting.** If a skill needs splitting (Bucket B), split it first.
   Writing operational sections for a multi-purpose skill wastes effort because those
   sections will be wrong for the atomic skills that replace it.

5. **The swap test is mandatory.** After writing operational sections, swap "How To Use"
   between two skills. If both still make sense, both are too generic.

6. **Real numbers or it didn't happen.** Every example must contain specific numerical
   values (feeds, speeds, forces, temperatures). "Provide recommendation" is not an output.

7. **Preserve originals.** Before any split or modification, backup the original skill.
   Anti-regression: new skill count ≥ old skill count (splitting only adds, never removes).

---

## WHAT THIS PHASE FEEDS INTO

- DA-MS9 (Skill Atomization Infrastructure): Clean, atomic skills ready for auto-loading
- DA-MS10 (Skill Atomization Pilot): Quality standard established for course-derived skills
- R3-MS5 Phase Gate: ≥1200 skills target requires quality skills, not 1200 templates
- R8-MS6/MS7 (User Workflow/Assistance Skills): Standards for non-manufacturing skills

---

## LESSONS LEARNED (prevent recurrence)

**What went wrong (2026-02-17)**:
1. Checklist v1.0 measured section PRESENCE via regex, not QUALITY
2. Automated remediation script generated domain-generic templates
3. Processing 115 skills in one session eliminated per-skill attention
4. No human review checkpoint — went straight from script to "116/116 PASS"
5. "Pass the audit" became the goal instead of "make skills useful"

**What v2.0 changes**:
1. Anti-template rules with specific banned phrases
2. Swap test requirement for uniqueness
3. Real-number requirement for examples
4. Batch size limit of 3-5 skills
5. Mandatory user approval checkpoints
6. Explicit ban on auto-generating operational sections
7. Single-purpose rule with size limits

**The meta-lesson**: Any quality gate that can be passed by automation will be
passed by automation. Quality gates must require human judgment to pass.
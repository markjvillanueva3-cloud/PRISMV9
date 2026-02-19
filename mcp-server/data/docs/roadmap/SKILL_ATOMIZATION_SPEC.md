# SKILL ATOMIZATION & REMEDIATION SPECIFICATION — v15.0
# Status: Active | Phase: DA-MS9, DA-MS10 + R-SKILL (new) | Updated: 2026-02-17
# Supersedes: SKILL_ATOMIZATION_SPEC v14.5
# Authority: skill-authoring-checklist v2.0

---

## CONTEXT: WHAT WENT WRONG

On 2026-02-17, a batch remediation pass added templated operational headers to 115/116
skills. All 116 passed regex audit (4/4 sections present) but the content was generic:
- Identical "How To Use" sections across entire domains
- "Load skill via skill_content, cross-reference with dispatchers" repeated 90+ times
- Examples without real numbers: "provide physics-based recommendation"
- Multi-purpose skills (6-7 topics) left unsplit

**Root cause**: v1.0 checklist checked section PRESENCE. v2.0 checks section QUALITY.
**Lesson**: Never auto-generate operational sections. Each skill requires human-level
understanding of its specific function. 3-5 skills per session, not 115.

---

## SCOPE

### Track A: Existing Skill Remediation (116 skills)
- Strip templated operational headers from all 115 auto-remediated skills
- Split multi-purpose skills into atomic single-function skills
- Write genuine operational sections per skill (unique How To Use, real Examples)
- Target: 200-350 atomic skills from 116 sources

### Track B: Course-Derived Skills (new creation)
- Source: 206 MIT OpenCourseWare courses + ~25 CNC/CAM resources
- Location: C:\PRISM_ARCHIVE_2026-02-01\RESOURCES\
- Target: ~3,880 skills from course material extraction
- Tier structure:
  T1 (DA parallel): Core manufacturing + materials science (50 courses)
  T2 (R1 parallel): Algorithms + optimization (40 courses)
  T3 (R3 parallel): Advanced manufacturing + controls (50 courses)
  T4 (R7 parallel): Physics + math foundations (66 courses)

---

## SKILL FORMAT (v2.0 — mandatory)

Every skill MUST follow the skill-authoring-checklist v2.0 at:
C:\PRISM\skills-consolidated\skill-authoring-checklist\SKILL.md

```
SKILL.md:
  ---
  name: prism-[specific-function]
  description: [one sentence, what this skill does]
  ---
  
  # [Skill Name]
  
  ## When To Use
  - User phrases that trigger this skill (real quotes, not keywords)
  - At least one "NOT this skill" redirect
  - UNIQUE — cannot be swapped with another skill's When section
  
  ## How To Use
  - Specific dispatcher→action calls with parameter names
  - Decision logic unique to THIS skill
  - ANTI-TEMPLATE: must differ from every other skill
  
  ## What It Returns
  - Data types, units, ranges, precision
  - One concrete output with real numbers
  - Failure modes specific to this function
  
  ## Examples
  - Minimum 2 with real materials, operations, calculated values
  - Never "provide recommendation" — show the actual output
  - At least one edge case or error scenario
  
  [Reference content: formulas, tables, decision criteria — compressed]
```

### Size Targets
- Atomic skill: 2-5KB (50-150 lines)
- Warning: >8KB — review for split opportunity
- Hard cap: >15KB — MUST split (exception: pure lookup tables)
- Operational header: ~30-50 lines (the unique part)
- Reference body: remainder (compressed, no prose theory)

---

## TRACK A: REMEDIATION PROCEDURE

### Phase R-SKILL-1: Triage & Split Plan (1 session)
**Role**: Data Architect | **Model**: Opus 4.6 | **Effort**: M (10-15 calls)

1. Audit all 116 skills by size and topic count
2. Classify each as: ATOMIC (ready for quality pass), SPLIT (multi-purpose), MERGE (overlapping)
3. Produce SKILL_SPLIT_PLAN.json:
   ```json
   {
     "prism-chip-formation": {
       "action": "SPLIT",
       "into": ["prism-chip-thickness-calc", "prism-chip-type-classifier", 
                 "prism-chip-breaking-criteria", "prism-chip-evacuation-strategy"],
       "current_size_kb": 14.2,
       "target_sizes_kb": [3.5, 2.8, 3.1, 2.9]
     },
     "prism-anti-regression": {
       "action": "ATOMIC",
       "current_size_kb": 4.1
     }
   }
   ```
4. Handle known overlaps: prism-mathematical-planning ↔ prism-sp-planning,
   prism-reasoning-chain-validator ↔ prism-reasoning-validator

**Gate**: Split plan reviewed by user. No execution without approval.

### Phase R-SKILL-2: Priority Splits (2-3 sessions)
**Role**: Data Architect | **Model**: Opus 4.6 (split logic) → Sonnet (bulk writing) | **Effort**: L (15-20 calls/session)

Process the top 15 largest multi-purpose skills (>10KB):
1. Read the full skill content, understand each distinct function
2. Create atomic skills per the split plan
3. Write UNIQUE operational sections for each (no templates, no scripts)
4. Verify each new skill against v2.0 checklist manually
5. Update SKILL_INDEX.json
6. **Spot check**: Read 2 random new skills aloud. If they sound similar, redo.

**Batch limit**: 3-5 skills completed per session. Present samples to user.
**Gate**: ≥80% of top 15 split and verified.

### Phase R-SKILL-3: Quality Pass on Atomic Skills (2-3 sessions)
**Role**: Context Engineer | **Model**: Opus 4.6 | **Effort**: M (10-15 calls/session)

For skills already atomic (right size, single purpose):
1. Strip the templated operational header
2. Read the actual reference content
3. Write a genuine "How To Use" based on what the skill actually teaches
4. Write real examples with actual numbers from the reference content
5. Compress the reference body (cut prose theory, keep formulas/tables)

**Batch limit**: 5-8 skills per session (these are simpler than splits).
**Gate**: Random sample of 5 skills passes v2.0 anti-template test.

### Phase R-SKILL-4: Verification & Index (1 session)
**Role**: Context Engineer | **Model**: Sonnet | **Effort**: S (5-8 calls)

1. Run size audit: all skills <8KB (or justified)
2. Anti-template scan: no two skills share >50% of operational section text
3. Trigger overlap check: no two skills fire on identical phrases
4. Update SKILL_INDEX.json with final counts
5. Update SKILL_PHASE_MAP.json
6. Report: total skills, avg size, size distribution, overlap warnings

**Gate**: 100% v2.0 compliant. No template survivors.

---

## TRACK B: COURSE-DERIVED SKILL CREATION

### Process (per course batch)
**Role**: Data Architect | **Model**: Opus 4.6 (extraction logic) → Sonnet (writing) | **Effort**: L per batch

1. Read course material, identify distinct teachable functions
2. For each function, determine: What question does this answer? What calculation does it enable?
3. Create skill with v2.0-compliant structure
4. Write operational sections from scratch — NO templates, NO copy from other skills
5. Include manufacturing-specific examples with real numbers
6. Compress: formulas yes, prose theory no

**Batch limit**: 5-10 course-derived skills per session.
**Quality check**: After every batch, read 2 random skills. Anti-template test.

### Tier Schedule
| Tier | Parallel With | Course Count | Est. Skills | Sessions |
|------|--------------|-------------|-------------|----------|
| T1   | DA           | 50          | ~500        | 10-15    |
| T2   | R1           | 40          | ~400        | 8-12     |
| T3   | R3           | 50          | ~1,200      | 15-20    |
| T4   | R7           | 66          | ~1,780      | 20-30    |

---

## PREVENTION: RULES TO AVOID FUTURE TEMPLATE DISASTERS

These rules are PERMANENT. They apply to all future skill creation, not just remediation.

### Rule 1: Never Script Operational Sections
A Node.js/PowerShell script CANNOT write "How To Use" or "Examples" sections.
Scripts may handle: file creation scaffolding, frontmatter generation, index updates.
Scripts must NOT handle: any content that requires understanding what the skill does.

### Rule 2: Batch Limit is Mandatory
Maximum 5 skills completed per session for splits/new creation.
Maximum 8 skills per session for quality passes on existing atomic skills.
If you find yourself wanting to process more, you're cutting corners.

### Rule 3: Spot Check After Every Batch
Read 2 random skills from the batch out loud. Ask:
- Could I swap this "How To Use" with another skill? If yes → redo.
- Does this example have real numbers? If no → redo.
- Would a fresh Claude instance know what to DO with this? If unclear → redo.

### Rule 4: User Review Gate
After every 2 sessions of skill work, present 3 sample skills to the user.
Do not continue without approval. This prevents drift.

### Rule 5: Split Before Document
If a skill covers multiple topics, split it FIRST. Then write operational sections.
Never add operational sections to a multi-purpose skill — you'll get generic headers.

---

## ENFORCEMENT STATUS

### What Exists (prompt-level)
- GSD_QUICK.md § SKILL CREATION GATE v2.0 — Claude reads at boot
- skill-authoring-checklist v2.0 — always_apply: true in frontmatter
- Memory instruction: "Always enforce 4 required sections"

### What Does NOT Exist (no code enforcement)
- No FILE-BEFORE-WRITE hook validates SKILL.md content quality
- No anti-template similarity check runs automatically
- No size gate prevents >15KB skills from being created
- No cadence function audits skill quality periodically

### Future Enforcement (roadmap items, not yet built)
- HOOK: SKILL-QUALITY-GATE-001 — pre-write validation on *.SKILL.md files
  - Check: 4 sections present AND unique (similarity score <0.5 vs existing skills)
  - Check: Size <15KB
  - Check: Examples contain numeric values
  - BLOCKING: true
- CADENCE: skill_quality_audit@50 — every 50 calls, spot-check 1 random skill
- SCRIPT: skill-similarity-scan.ps1 — batch check for template survivors

---

## PARALLEL TRACK CHECKPOINTS (updated)

| Gate | Minimum Skill Count | Quality Requirement | Source |
|------|---------------------|--------------------|---------| 
| DA-MS9 | Infrastructure ready | Split plan approved | Track A phase 1 |
| DA-MS10 | ≥50 pilot skills | 100% v2.0 compliant | Track A phase 2 pilot |
| R1-MS9 | ≥300 | Anti-template scan passes | Track A complete + T1/T2 |
| R3-MS5 | ≥1,200 | <5KB avg, 0 template survivors | + T3/T4 + CNC/CAM |
| R7 gate | ≥3,500 | Full v2.0 + similarity <0.3 | All tiers complete |

## VERIFICATION (updated for v2.0)

- No duplicate skills (trigger + content hash)
- Each skill 2-8KB (exception: justified lookup tables)
- Anti-template: no two skills share >50% operational text (measured by token overlap)
- Dependency graph validates (no circular refs)
- Skill loading verified via prism_knowledge stats
- Random sample (10%) passes manual v2.0 checklist review
- All examples contain numeric values (automated regex check)
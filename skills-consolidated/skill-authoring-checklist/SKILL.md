---
name: skill-authoring-checklist
description: |
  ALWAYS-ON quality gate for creating and revising SKILL.md files.
  Prevents generic templates, multi-purpose bloat, and token waste.
  Enforces single-function skills with unique operational sections.
  Fires on: skill creation, skill editing, "make this a skill", batch remediation.
always_apply: true
---

# Skill Authoring Checklist v2.0

**ALWAYS ON.** Apply every time you create, draft, or revise a SKILL.md file.

## Why v2.0

v1.0 checked for section PRESENCE. Result: 115 skills got identical templated headers
that passed regex audits but were useless. v2.0 checks for section QUALITY and
enforces anti-template rules. A skill that looks like every other skill is not a skill.

---

## Rule 0: Single Purpose (HARD — violate = split)

**Every skill answers ONE specific question or performs ONE specific function.**

Smell test: If the skill name needs "and" to describe it, split it.

BAD: "Chip formation mechanics, chip types, chip breaking, and chip evacuation"
→ That's 4 skills: chip-thickness-calc, chip-type-classifier, chip-breaking-criteria, chip-evacuation-strategy

BAD: "Unified session management covering lifecycle, pressure, persistence, checkpoints, recovery"
→ That's 5 skills: session-lifecycle, context-pressure, state-checkpoint, session-recovery, session-handoff

GOOD: "Calculate chip thickness for turning operations using feed, depth, and nose radius"
→ One function. One input set. One output.

**Size limits:**
- Target: 2-5KB per skill (50-150 lines)
- Warning: >8KB — probably multi-purpose, consider splitting
- Hard cap: >15KB — MUST split unless it's a lookup table or formula reference

---

## Required Sections — QUALITY rules, not just presence

### 1. When To Use

REQUIRED content:
- Specific trigger phrases a user would actually say (not keyword lists)
- The manufacturing/technical scenario that calls for this skill
- At least one "not this skill" redirect (prevents misfires)

ANTI-TEMPLATE TEST: If you could swap this section between two skills
and neither would break, it's too generic. Rewrite.

BAD (generic):
```
- Trigger keywords: "chip", "formation"
- User asks about machining parameters related to this topic
```

GOOD (specific):
```
- User asks: "what chip thickness will I get at 0.3mm/rev feed?"
- User reports: "chips are long and stringy, wrapping around the tool"
- User needs: chip load per tooth for a new milling setup
- NOT this skill: If user asks about chip EVACUATION (use prism-chip-evacuation)
```

### 2. How To Use

REQUIRED content:
- The SPECIFIC dispatcher actions and parameters for THIS skill's function
- Decision logic unique to this skill (not "cross-reference with dispatchers")
- Input→processing→output flow with actual parameter names

ANTI-TEMPLATE TEST: If "How To Use" is identical to another skill
except for the skill ID, it's a template. Rewrite.

BAD (template — same for every manufacturing skill):
```
1. Load skill: skill_content("prism-chip-formation")
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers
```

GOOD (specific to THIS skill's function):
```
1. Get material: prism_data→material_get(id) → extract kc1, mc (Kienzle constants)
2. Get operation params: feed (f), depth of cut (ap), nose radius (rε)
3. Calculate: h = f × sin(κr) for turning; hm = ae×fz/(π×Dc) for milling
4. If h < 0.05mm → warn: "Below minimum chip thickness, rubbing likely"
5. If chip compression ratio λ > 4 → flag: "Excessive chip compression, reduce speed"
```

### 3. What It Returns

REQUIRED content:
- The exact data structure, values, or output THIS skill produces
- Units, ranges, and precision expectations
- One concrete output example with real numbers

BAD (generic):
```
- Format: Structured markdown reference
- Success: Relevant physics models for the machining scenario
- Failure: Skill not found
```

GOOD (specific):
```
- Returns: chip thickness h (mm), chip compression ratio λ (dimensionless)
- Range: h typically 0.02-0.5mm for finishing to roughing
- Precision: ±5% for calculated values, ±15% for predicted chip type
- Example output: h=0.18mm, λ=2.7, chip_type="continuous_with_BUE_risk"
- Failure: missing kc1/mc constants → "Material not in Kienzle database, need empirical test"
```

### 4. Examples

REQUIRED content:
- Minimum 2 examples with REAL numbers, materials, and operations
- Input must be something a machinist or engineer would actually ask
- Output must show actual calculated values, not "provide recommendation"

BAD (hypothetical):
```
User asks "What chip parameters for 316 stainless?"
→ Load skill → Extract data → Provide physics-based recommendation
```

GOOD (real):
```
User: "I'm turning 316L at 180 SFM, 0.008 IPR feed, 0.060" DOC. 
       Getting long stringy chips wrapping around the tool."

→ prism_data→material_get("316L") → kc1=2200 MPa, mc=0.25
→ Calculate: h = f × sin(κr) = 0.008 × sin(95°) = 0.00796"
→ Chip compression ratio: λ = h_chip/h_uncut ≈ 2.8
→ Diagnosis: Feed too low for effective chip breaking.
  - Current: 0.008 IPR → h=0.20mm (below 0.25mm chip-break threshold for 316L)
  - Fix: Increase feed to 0.012 IPR → h=0.30mm (enters chip-breaking range)
  - Alt: Add chip breaker geometry insert (C-type or M-type for stainless)
```

---

## Rule 1: Token Efficiency (compress without losing precision)

Skills are loaded into Claude's context. Every wasted token reduces capacity for
the actual user task. Compression targets:

**KEEP (high information density):**
- Formulas with variable definitions
- Decision tables and threshold values
- Specific parameter ranges with units
- Error conditions and their fixes
- Code snippets that are actually used

**CUT (low information density):**
- Prose paragraphs explaining theory (use 1-line summaries instead)
- Table of Contents sections
- "Version X.X | Level Y | Category Z" headers
- Decorative separators (---, ===)
- "SECTION N:" prefixes on headings
- Redundant "Overview" sections that repeat the description
- "Purpose: This skill provides..." (the description already says this)

**COMPRESS patterns:**
```
BEFORE (45 tokens):
  ## 1.1 Shear Plane Model
  The chip forms by shear along the primary shear plane at angle φ.
  This is described by Merchant's equation which relates the shear angle
  to the friction angle and rake angle.
  
AFTER (18 tokens):
  ## Shear Plane Model
  Merchant: φ = π/4 - (β-α)/2 where β=friction angle, α=rake angle
```

**Formula reference skills** (lookup tables, constant databases) may exceed 5KB
if the data is genuinely atomic — but the operational header must still be specific.

---

## Anti-Template Enforcement

These patterns indicate template generation. If you catch yourself writing these,
STOP and rewrite with skill-specific content.

**BANNED phrases in "How To Use":**
- "Apply relevant knowledge to current task context"
- "Cross-reference with related dispatchers"
- "Load skill and extract relevant section"
- Any sentence that works equally well in every skill

**BANNED phrases in "What It Returns":**
- "Structured markdown reference with formulas"
- "Loaded into context via skill_content"
- "Relevant physics models for the scenario"

**BANNED phrases in "Examples":**
- "Provide physics-based recommendation"
- "Deliver structured response"
- "Extract relevant data"
- Any example without specific numbers, materials, or parameter values

**The test**: Read the operational sections out loud. If they sound like they came
from a form letter, they did. Rewrite until they sound like a machinist explaining
their specific procedure to a coworker.

---

## Validation Checklist (v2.0)

Before finalizing any skill:

```
STRUCTURE
[ ] Skill serves ONE function (name doesn't need "and" to describe it)
[ ] Total size under 8KB (or justified exception for lookup tables)
[ ] No Table of Contents, no decorative separators, no redundant overview

WHEN TO USE
[ ] Contains phrases a user would actually say, not keyword lists
[ ] Includes at least one "NOT this skill" redirect
[ ] Could NOT be swapped with another skill's When section

HOW TO USE  
[ ] Names specific dispatcher actions with actual parameters
[ ] Contains decision logic unique to THIS skill
[ ] Would NOT make sense pasted into a different skill

WHAT IT RETURNS
[ ] Names specific data types, units, and ranges
[ ] Includes one concrete output with real numbers
[ ] Defines what failure looks like with the specific error

EXAMPLES
[ ] Minimum 2 examples with real materials, operations, and numbers
[ ] Inputs are things a real user would say or ask
[ ] Outputs show calculated values, not "provide recommendation"
[ ] At least one example shows an edge case or error condition

ANTI-TEMPLATE
[ ] No banned phrases from the Anti-Template list above
[ ] Operational sections could not be generated by find-replace on skill name
[ ] A fresh Claude instance could execute THIS skill differently from any other
```

---

## Batch Remediation Rules

When fixing skills in bulk (the scenario that created the template problem):

1. **NEVER auto-generate operational sections.** Each skill's operations come from
   reading its actual content and understanding what it specifically does.
2. **Process 3-5 skills per session, not 115.** Quality requires attention.
3. **Split first, then document.** If a skill is multi-purpose, split it into
   atomic skills BEFORE adding operational sections.
4. **Spot-check after every batch.** Read 2 random skills out loud. If they
   sound identical, the batch failed.
5. **Human review.** After batch work, present 3 samples to the user for approval
   before continuing.

**If you catch yourself writing a script to auto-generate skill content,
you are doing it wrong. Skills require human-level understanding of what
each one specifically does. There is no shortcut.**
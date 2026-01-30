# PRISM SKILL CAPABILITY AUDIT ROADMAP
## Master Tracking Document | v1.0 | 2026-01-29
---

# MATHPLAN GATE ✓

## Scope Quantification
```
S = 73 skills × 8 audit dimensions = 584 audit points
Total bytes to review: 2,421,088 bytes (~2.4 MB)
```

## Completeness Equation
```
C(AUDIT) = Σ Skills_Audited / 73
Target: C = 1.0 (100%)
```

## Decomposition Proof
```
73 skills ÷ 5 skills/microsession = 15 microsessions (rounded up)

TIER 0: Always-On Laws       =  9 skills = 2 MS
TIER 1: Core Workflow        = 11 skills = 3 MS
TIER 2: Coordination/Session =  5 skills = 1 MS
TIER 3A: Materials           =  5 skills = 1 MS
TIER 3B: Monolith            =  3 skills = 1 MS (combined with next)
TIER 3C: Quality/Testing     =  4 skills = 1 MS
TIER 3D: Code/Architecture   =  8 skills = 2 MS
TIER 3E: Calculators         =  6 skills = 2 MS
TIER 3F: Controllers         =  6 skills = 2 MS
TIER 3G: Knowledge/Catalog   =  3 skills = 1 MS (combined with next)
TIER 3H: Experts             = 11 skills = 2 MS
                              ─────────   ─────
TOTAL:                        73 skills   15 MS ✓
```

## Effort Estimation with Uncertainty
```
Base: 73 skills × 8 min/skill = 584 minutes
Complexity factor: 1.3 (cross-referencing)
Risk factor: 1.2 (discovery of major gaps)

EFFORT = 584 × 1.3 × 1.2 = 911 ± 182 minutes (95% CI)
       = 15.2 ± 3.0 hours
       = 15 microsessions × 60 min = 15 hours nominal
```

## Verification Criteria
```
Success when:
1. All 73 skills audited with 8-dimension scores
2. All gaps documented with severity (CRITICAL/HIGH/MEDIUM/LOW)
3. Improvement queue generated with priorities
4. Average skill score ≥ 8.0/10
```

---

# PRIORITY ORDER (73 Skills)

## TIER 0: ALWAYS-ON LAWS (9 skills) - CRITICAL
*These skills enforce system-wide constraints. Failures here cascade everywhere.*

| # | Skill | Size | Level | MS |
|---|-------|------|-------|-----|
| 1 | prism-life-safety-mindset | 8,668 | L0 | MS-01 |
| 2 | prism-maximum-completeness | 5,900 | L0 | MS-01 |
| 3 | prism-mandatory-microsession | 4,974 | L0 | MS-01 |
| 4 | prism-combination-engine | 4,708 | L0 | MS-01 |
| 5 | prism-deep-learning | 9,433 | L0 | MS-01 |
| 6 | prism-formula-evolution | 5,668 | L0 | MS-02 |
| 7 | prism-mathematical-planning | 10,499 | L0 | MS-02 |
| 8 | prism-uncertainty-propagation | 6,007 | L0 | MS-02 |
| 9 | prism-hook-system | 10,661 | L0 | MS-02 |

## TIER 1: CORE WORKFLOW (11 skills) - HIGH
*SP skills drive ALL development work. Must be comprehensive.*

| # | Skill | Size | Level | MS |
|---|-------|------|-------|-----|
| 10 | prism-skill-orchestrator | 12,614 | L1 | MS-02 |
| 11 | prism-sp-brainstorm | 45,117 | L1 | MS-03 |
| 12 | prism-sp-planning | 166,590 | L1 | MS-03 |
| 13 | prism-sp-execution | 87,108 | L1 | MS-03 |
| 14 | prism-sp-review-spec | 59,550 | L1 | MS-04 |
| 15 | prism-sp-review-quality | 96,497 | L1 | MS-04 |
| 16 | prism-sp-debugging | 109,242 | L1 | MS-04 |
| 17 | prism-sp-verification | 81,212 | L1 | MS-05 |
| 18 | prism-sp-handoff | 77,179 | L1 | MS-05 |
| 19 | prism-predictive-thinking | 16,684 | L1 | MS-05 |
| 20 | prism-anti-regression | 36,683 | L1 | MS-05 |

## TIER 2: COORDINATION & SESSION (5 skills) - HIGH
*Resource optimization and session management.*

| # | Skill | Size | Level | MS |
|---|-------|------|-------|-----|
| 21 | prism-agent-selector | 3,455 | L2 | MS-06 |
| 22 | prism-resource-optimizer | 3,691 | L2 | MS-06 |
| 23 | prism-swarm-coordinator | 4,882 | L2 | MS-06 |
| 24 | prism-synergy-calculator | 3,932 | L2 | MS-06 |
| 25 | prism-session-master | 42,556 | L2 | MS-06 |

## TIER 3A: MATERIALS SYSTEM (5 skills) - MEDIUM
*Material data is foundation of all calculations.*

| # | Skill | Size | Level | MS |
|---|-------|------|-------|-----|
| 26 | prism-material-schema | 53,311 | L3 | MS-07 |
| 27 | prism-material-physics | 67,917 | L3 | MS-07 |
| 28 | prism-material-lookup | 38,619 | L3 | MS-07 |
| 29 | prism-material-validator | 46,724 | L3 | MS-07 |
| 30 | prism-material-enhancer | 36,539 | L3 | MS-07 |

## TIER 3B: MONOLITH NAVIGATION (3 skills) - MEDIUM
*Critical for extraction work.*

| # | Skill | Size | Level | MS |
|---|-------|------|-------|-----|
| 31 | prism-monolith-index | 74,237 | L3 | MS-08 |
| 32 | prism-monolith-extractor | 74,509 | L3 | MS-08 |
| 33 | prism-monolith-navigator | 50,206 | L3 | MS-08 |

## TIER 3C: QUALITY & TESTING (4 skills) - MEDIUM
*Quality gates and validation.*

| # | Skill | Size | Level | MS |
|---|-------|------|-------|-----|
| 34 | prism-quality-master | 23,584 | L3 | MS-08 |
| 35 | prism-validator | 10,229 | L3 | MS-08 |
| 36 | prism-tdd-enhanced | 20,367 | L3 | MS-09 |
| 37 | prism-safety-framework | 38,716 | L3 | MS-09 |

## TIER 3D: CODE & ARCHITECTURE (8 skills) - MEDIUM
*Code quality and architecture patterns.*

| # | Skill | Size | Level | MS |
|---|-------|------|-------|-----|
| 38 | prism-code-master | 20,237 | L3 | MS-09 |
| 39 | prism-code-complete-integration | 19,338 | L3 | MS-09 |
| 40 | prism-code-perfection | 28,755 | L3 | MS-09 |
| 41 | prism-api-contracts | 186,215 | L3 | MS-10 |
| 42 | prism-wiring-templates | 89,042 | L3 | MS-10 |
| 43 | prism-codebase-packaging | 17,350 | L3 | MS-10 |
| 44 | prism-dev-utilities | 11,546 | L3 | MS-10 |
| 45 | prism-claude-code-bridge | 5,031 | L3 | MS-10 |

## TIER 3E: CALCULATORS & MANUFACTURING (6 skills) - MEDIUM
*Core calculation engines.*

| # | Skill | Size | Level | MS |
|---|-------|------|-------|-----|
| 46 | prism-speed-feed-engine | 14,654 | L3 | MS-11 |
| 47 | prism-product-calculators | 128,014 | L3 | MS-11 |
| 48 | prism-process-optimizer | 37,964 | L3 | MS-11 |
| 49 | prism-manufacturing-tables | 141,848 | L3 | MS-12 |
| 50 | prism-master-equation | 38,233 | L3 | MS-12 |
| 51 | prism-universal-formulas | 14,494 | L3 | MS-12 |

## TIER 3F: CONTROLLERS & POST (6 skills) - MEDIUM
*CNC controller programming references.*

| # | Skill | Size | Level | MS |
|---|-------|------|-------|-----|
| 52 | prism-controller-quick-ref | 9,206 | L3 | MS-12 |
| 53 | prism-fanuc-programming | 97,998 | L3 | MS-13 |
| 54 | prism-siemens-programming | 84,905 | L3 | MS-13 |
| 55 | prism-heidenhain-programming | 86,460 | L3 | MS-13 |
| 56 | prism-gcode-reference | 87,005 | L3 | MS-13 |
| 57 | prism-post-processor-reference | 18,061 | L3 | MS-13 |

## TIER 3G: KNOWLEDGE & REASONING (3 skills) - LOW
*Knowledge management and reasoning.*

| # | Skill | Size | Level | MS |
|---|-------|------|-------|-----|
| 58 | prism-knowledge-master | 12,144 | L3 | MS-14 |
| 59 | prism-reasoning-engine | 34,581 | L3 | MS-14 |
| 60 | prism-error-catalog | 123,734 | L3 | MS-14 |

## TIER 3H: EXPERT ROLES & UTILITIES (13 skills) - LOW
*Expert personas and utility skills.*

| # | Skill | Size | Level | MS |
|---|-------|------|-------|-----|
| 61 | prism-expert-master | 12,064 | L3 | MS-14 |
| 62 | prism-all-skills | 7,069 | L3 | MS-14 |
| 63 | prism-expert-master-machinist | 6,076 | L3 | MS-15 |
| 64 | prism-expert-cam-programmer | 5,079 | L3 | MS-15 |
| 65 | prism-expert-materials-scientist | 8,266 | L3 | MS-15 |
| 66 | prism-expert-post-processor | 6,202 | L3 | MS-15 |
| 67 | prism-expert-cad-expert | 4,562 | L3 | MS-15 |
| 68 | prism-expert-mechanical-engineer | 3,841 | L3 | MS-15 |
| 69 | prism-expert-quality-control | 4,682 | L3 | MS-15 |
| 70 | prism-expert-quality-manager | 5,120 | L3 | MS-15 |
| 71 | prism-expert-thermodynamics | 5,420 | L3 | MS-15 |
| 72 | prism-expert-mathematics | 5,657 | L3 | MS-15 |
| 73 | prism-tool-holder-schema | 8,643 | L3 | MS-15 |

---

# AUDIT CRITERIA (8 Dimensions)

| Dimension | Code | Weight | 10 = Excellent | 5 = Needs Work | 0 = Missing |
|-----------|------|--------|----------------|----------------|-------------|
| Completeness | COMP | 20% | All sections, no TODOs | Gaps exist | Major missing |
| Accuracy | ACCR | 15% | All formulas correct | Minor errors | Wrong info |
| Integration | INTG | 15% | Full cross-refs to hooks/formulas/skills | Partial refs | Isolated |
| Actionability | ACTN | 15% | Clear checklists, decision trees | Vague guidance | No guidance |
| Examples | EXMP | 10% | Multiple worked examples | 1 example | None |
| Consistency | CONS | 10% | YAML frontmatter, PRISM standard format | Minor deviations | Non-standard |
| Safety | SAFE | 10% | S(x) ≥ 0.70 integrated | Mentioned only | Not addressed |
| Versioning | VERS | 5% | Full metadata, dependencies, hooks | Partial | None |

## Scoring Formula
```
SKILL_SCORE = Σ (Dimension_Score × Weight)
Grade: A (9-10), B (7-8.9), C (5-6.9), D (3-4.9), F (<3)
```

---

# MICROSESSION TRACKING

## MS-01: Always-On Laws (Part 1) - Skills 1-5
- **Skills**: life-safety, completeness, microsession, combination-engine, deep-learning
- **Status**: PENDING
- **Started**: 
- **Completed**: 
- **Avg Score**: 

## MS-02: Always-On Laws (Part 2) + Orchestrator - Skills 6-10
- **Skills**: formula-evolution, math-planning, uncertainty, hook-system, skill-orchestrator
- **Status**: PENDING

## MS-03: SP Workflow (Part 1) - Skills 11-13
- **Skills**: sp-brainstorm, sp-planning, sp-execution
- **Status**: PENDING

## MS-04: SP Workflow (Part 2) - Skills 14-16
- **Skills**: sp-review-spec, sp-review-quality, sp-debugging
- **Status**: PENDING

## MS-05: SP Workflow (Part 3) - Skills 17-20
- **Skills**: sp-verification, sp-handoff, predictive-thinking, anti-regression
- **Status**: PENDING

## MS-06: Coordination - Skills 21-25
- **Skills**: agent-selector, resource-optimizer, swarm-coordinator, synergy-calculator, session-master
- **Status**: PENDING

## MS-07: Materials - Skills 26-30
- **Skills**: material-schema, material-physics, material-lookup, material-validator, material-enhancer
- **Status**: PENDING

## MS-08: Monolith + Quality (Part 1) - Skills 31-35
- **Skills**: monolith-index, monolith-extractor, monolith-navigator, quality-master, validator
- **Status**: PENDING

## MS-09: Quality + Code (Part 1) - Skills 36-40
- **Skills**: tdd-enhanced, safety-framework, code-master, code-complete, code-perfection
- **Status**: PENDING

## MS-10: Code (Part 2) - Skills 41-45
- **Skills**: api-contracts, wiring-templates, codebase-packaging, dev-utilities, claude-code-bridge
- **Status**: PENDING

## MS-11: Calculators (Part 1) - Skills 46-48
- **Skills**: speed-feed-engine, product-calculators, process-optimizer
- **Status**: PENDING

## MS-12: Calculators + Controllers (Part 1) - Skills 49-52
- **Skills**: manufacturing-tables, master-equation, universal-formulas, controller-quick-ref
- **Status**: PENDING

## MS-13: Controllers (Part 2) - Skills 53-57
- **Skills**: fanuc, siemens, heidenhain, gcode-reference, post-processor-reference
- **Status**: PENDING

## MS-14: Knowledge + Experts (Part 1) - Skills 58-62
- **Skills**: knowledge-master, reasoning-engine, error-catalog, expert-master, all-skills
- **Status**: PENDING

## MS-15: Experts (Part 2) - Skills 63-73
- **Skills**: All remaining expert skills + tool-holder-schema
- **Status**: PENDING

---

# PROGRESS SUMMARY

| Metric | Current | Target |
|--------|---------|--------|
| Microsessions Complete | 0/15 | 15/15 |
| Skills Audited | 0/73 | 73/73 |
| Completion % | 0% | 100% |
| Avg Score | - | ≥8.0/10 |
| Critical Gaps Found | - | Track |
| High Priority Gaps | - | Track |

---

# IMPROVEMENT QUEUE (To be populated during audit)

## CRITICAL (Blocks safety/core function)
*(To be filled)*

## HIGH (Integration issues)
*(To be filled)*

## MEDIUM (Quality improvements)
*(To be filled)*

## LOW (Polish/consistency)
*(To be filled)*

---

**MATHPLAN GATE: PASSED ✓**
**Ready to begin MS-01**
**Created**: 2026-01-29T17:00:00Z

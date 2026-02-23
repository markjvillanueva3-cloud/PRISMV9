# SKILL UPLOAD & UTILIZATION AUDIT ROADMAP
## Upload 40 Missing Skills to Claude's Skill Tree
**Created:** 2026-01-23
**Goal:** Get all 50 skills into `/mnt/skills/user/` with 100% utilization mapping

---

## CURRENT STATUS

| Location | Skills | Status |
|----------|--------|--------|
| `C:\_SKILLS\` (local) | 50 | ✅ All documented |
| `/mnt/skills/user/` (Claude's tree) | 10 | ⚠️ Only 20% available |
| **Missing from tree** | **40** | ❌ Need upload |

---

## SKILLS IN CLAUDE'S TREE (10) ✅

These are already available for Claude to read:

1. prism-auditor
2. prism-consumer-mapper
3. prism-development
4. prism-extractor
5. prism-hierarchy-manager
6. prism-knowledge-base
7. prism-python-tools
8. prism-state-manager
9. prism-swarm-orchestrator
10. prism-utilization

---

## SKILLS MISSING FROM TREE (40) ❌

### Batch 1: Session Management (5 skills) - MICRO-SESSION SKL-UP-01
| # | Skill | Priority | Consumers |
|---|-------|----------|-----------|
| 1 | prism-quick-start | HIGH | Every session start |
| 2 | prism-session-buffer | HIGH | Buffer monitoring |
| 3 | prism-session-handoff | HIGH | Session end |
| 4 | prism-context-dna | MEDIUM | Session fingerprinting |
| 5 | prism-context-pressure | MEDIUM | Auto-checkpoint |

### Batch 2: Development Core (6 skills) - MICRO-SESSION SKL-UP-02
| # | Skill | Priority | Consumers |
|---|-------|----------|-----------|
| 6 | prism-algorithm-selector | HIGH | Algorithm mapping |
| 7 | prism-coding-patterns | HIGH | Code standards |
| 8 | prism-large-file-writer | HIGH | Chunked writes |
| 9 | prism-debugging | MEDIUM | Troubleshooting |
| 10 | prism-error-recovery | MEDIUM | Error handling |
| 11 | prism-planning | MEDIUM | Task planning |

### Batch 3: Development Extended (4 skills) - MICRO-SESSION SKL-UP-03
| # | Skill | Priority | Consumers |
|---|-------|----------|-----------|
| 12 | prism-tdd | MEDIUM | Testing |
| 13 | prism-review | MEDIUM | Code review |
| 14 | prism-quality-gates | MEDIUM | Stage gates |
| 15 | prism-task-continuity | MEDIUM | Anti-restart |

### Batch 4: Extraction Tools (5 skills) - MICRO-SESSION SKL-UP-04
| # | Skill | Priority | Consumers |
|---|-------|----------|-----------|
| 16 | prism-monolith-index | HIGH | Find modules |
| 17 | prism-monolith-navigator | HIGH | Navigate source |
| 18 | prism-extraction-index | MEDIUM | Track extractions |
| 19 | prism-dependency-graph | MEDIUM | Map dependencies |
| 20 | prism-tool-selector | MEDIUM | Tool selection |

### Batch 5: Materials/Physics (8 skills) - MICRO-SESSION SKL-UP-05
| # | Skill | Priority | Consumers |
|---|-------|----------|-----------|
| 21 | prism-material-templates | HIGH | Material creation |
| 22 | prism-material-template | MEDIUM | Single template |
| 23 | prism-material-lookup | MEDIUM | Find materials |
| 24 | prism-physics-formulas | HIGH | Calculations |
| 25 | prism-physics-reference | MEDIUM | Constants |
| 26 | prism-unit-converter | MEDIUM | Unit handling |
| 27 | prism-validator | HIGH | Validation |
| 28 | prism-verification | MEDIUM | Verify results |

### Batch 6: Deprecated (2 skills) - MICRO-SESSION SKL-UP-06
| # | Skill | Priority | Consumers |
|---|-------|----------|-----------|
| 29 | prism-category-defaults | LOW | DEPRECATED |
| 30 | prism-derivation-helpers | LOW | DEPRECATED |

### Batch 7: Expert Skills Part 1 (5 skills) - MICRO-SESSION SKL-UP-07
| # | Skill | Priority | Consumers |
|---|-------|----------|-----------|
| 31 | prism-expert-cad-expert | MEDIUM | CAD tasks |
| 32 | prism-expert-cam-programmer | MEDIUM | CAM tasks |
| 33 | prism-expert-master-machinist | MEDIUM | Machining |
| 34 | prism-expert-materials-scientist | HIGH | Materials |
| 35 | prism-expert-mathematics | MEDIUM | Math |

### Batch 8: Expert Skills Part 2 (5 skills) - MICRO-SESSION SKL-UP-08
| # | Skill | Priority | Consumers |
|---|-------|----------|-----------|
| 36 | prism-expert-mechanical-engineer | MEDIUM | Mechanics |
| 37 | prism-expert-post-processor | HIGH | Post processing |
| 38 | prism-expert-quality-control | MEDIUM | QC |
| 39 | prism-expert-quality-manager | MEDIUM | QM |
| 40 | prism-expert-thermodynamics | MEDIUM | Thermal |

---

## MICRO-SESSION PLAN

### Phase 1: Upload Skills (8 sessions)
| Session | Skills | Action |
|---------|--------|--------|
| SKL-UP-01 | 5 Session Mgmt | Read from C:, create in project |
| SKL-UP-02 | 6 Dev Core | Read from C:, create in project |
| SKL-UP-03 | 4 Dev Extended | Read from C:, create in project |
| SKL-UP-04 | 5 Extraction | Read from C:, create in project |
| SKL-UP-05 | 8 Materials/Physics | Read from C:, create in project |
| SKL-UP-06 | 2 Deprecated | Read from C:, create in project |
| SKL-UP-07 | 5 Experts Part 1 | Read from C:, create in project |
| SKL-UP-08 | 5 Experts Part 2 | Read from C:, create in project |

### Phase 2: Utilization Audit (5 sessions)
| Session | Focus | Action |
|---------|-------|--------|
| SKL-AUDIT-01 | Tier 1 Core (12) | Verify 6+ consumers each |
| SKL-AUDIT-02 | Tier 2 Dev (13) | Verify 4+ consumers each |
| SKL-AUDIT-03 | Tier 3 Extract (6) | Verify 3+ consumers each |
| SKL-AUDIT-04 | Tier 4 Materials (8) | Verify 3+ consumers each |
| SKL-AUDIT-05 | Tier 5 Experts (10) | Verify 2+ consumers each |

---

## HOW TO UPLOAD SKILLS

**Option A: Via Claude Project Knowledge**
1. Open Claude.ai Project settings
2. Go to "Project Knowledge"
3. Add each skill folder with SKILL.md
4. Skills appear in `/mnt/skills/user/`

**Option B: Via This Session**
1. I read SKILL.md from C:\_SKILLS\[skill-name]\
2. Create the skill directory structure
3. Write to container and you download
4. You upload to Project Knowledge

---

## PROGRESS TRACKER

| Session | Status | Skills Uploaded | Notes |
|---------|--------|-----------------|-------|
| SKL-UP-01 | ⬜ NOT STARTED | 0/5 | |
| SKL-UP-02 | ⬜ NOT STARTED | 0/6 | |
| SKL-UP-03 | ⬜ NOT STARTED | 0/4 | |
| SKL-UP-04 | ⬜ NOT STARTED | 0/5 | |
| SKL-UP-05 | ⬜ NOT STARTED | 0/8 | |
| SKL-UP-06 | ⬜ NOT STARTED | 0/2 | |
| SKL-UP-07 | ⬜ NOT STARTED | 0/5 | |
| SKL-UP-08 | ⬜ NOT STARTED | 0/5 | |

**Total: 0/40 skills uploaded**

---

## NEXT ACTION

**START SKL-UP-01:** Upload Session Management skills (5 skills)
- prism-quick-start
- prism-session-buffer
- prism-session-handoff
- prism-context-dna
- prism-context-pressure

---

**END OF ROADMAP**

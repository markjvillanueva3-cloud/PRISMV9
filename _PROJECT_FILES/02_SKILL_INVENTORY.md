# PRISM 50-SKILL INVENTORY
## Complete Skill Reference v3.0

---

## 🔴 SESSION PROTOCOL: Read Skills BEFORE Starting Work

```
1. READ CURRENT_STATE.json first
2. IDENTIFY task type → SELECT relevant skills from table below
3. READ those skills: view("/mnt/skills/user/prism-[name]/SKILL.md")
4. UNDERSTAND methodology
5. THEN execute work
```

---

## SKILL INVENTORY (50 Total at /mnt/skills/user/)

### Core Development (9 skills)
| Skill | Purpose |
|-------|---------|
| `prism-development` | Core protocols, 10 Commandments, development philosophy |
| `prism-state-manager` | CURRENT_STATE.json management, session continuity |
| `prism-extractor` | Module extraction from 986K-line monolith |
| `prism-auditor` | Verify extraction completeness, no missing functions |
| `prism-utilization` | 100% wiring enforcement, consumer verification |
| `prism-consumer-mapper` | Database→Consumer wiring, auto-generate connections |
| `prism-hierarchy-manager` | CORE→ENHANCED→USER→LEARNED layer propagation |
| `prism-swarm-orchestrator` | Multi-agent parallel extraction coordination |
| `prism-python-tools` | Batch processing, large file operations, automation |

### Monolith Navigation (3 skills)
| Skill | Purpose |
|-------|---------|
| `prism-monolith-index` | Pre-mapped line numbers for all 831 modules |
| `prism-monolith-navigator` | Navigate 986,621-line source efficiently |
| `prism-extraction-index` | Track extraction progress, what's done vs pending |

### Materials System (5 skills)
| Skill | Purpose |
|-------|---------|
| `prism-material-template` | 127-parameter schema, required fields per category |
| `prism-material-templates` | Category-specific templates (steel, aluminum, titanium) |
| `prism-material-lookup` | Property lookup by material ID, cross-reference |
| `prism-physics-formulas` | Kienzle, Johnson-Cook, Taylor derivations |
| `prism-physics-reference` | Physics constants, equations, validation ranges |

### Session Management (4 skills)
| Skill | Purpose |
|-------|---------|
| `prism-session-handoff` | End-of-session documentation, next session prep |
| `prism-session-buffer` | Context preservation before compaction |
| `prism-task-continuity` | Resume interrupted work from checkpoints |
| `prism-planning` | Multi-session planning, dependency ordering |

### Quality & Validation (6 skills)
| Skill | Purpose |
|-------|---------|
| `prism-validator` | Input/output validation rules, range checking |
| `prism-verification` | Code/data verification, cross-reference checks |
| `prism-quality-gates` | Stage gate criteria, blocking conditions |
| `prism-tdd` | Test-driven development patterns for PRISM |
| `prism-review` | Code/design review checklists |
| `prism-debugging` | Troubleshooting patterns, common issues |

### Code & Architecture (6 skills)
| Skill | Purpose |
|-------|---------|
| `prism-coding-patterns` | PRISM coding standards, naming conventions |
| `prism-algorithm-selector` | Choose right algorithm from 285 available |
| `prism-dependency-graph` | Module dependencies, load order |
| `prism-tool-selector` | Pick right tool for task (Filesystem vs DC) |
| `prism-unit-converter` | Unit conversion utilities, precision handling |
| `prism-large-file-writer` | Chunked writing for files >50KB |

### Context Management (4 skills)
| Skill | Purpose |
|-------|---------|
| `prism-context-dna` | Context compression, essential info extraction |
| `prism-context-pressure` | Manage context limits, checkpoint triggers |
| `prism-quick-start` | Fast session startup, minimal reading |
| `prism-category-defaults` | Default values by material/machine category |

### Knowledge Base (2 skills)
| Skill | Purpose |
|-------|---------|
| `prism-knowledge-base` | 220+ MIT/Stanford courses, 285 algorithms indexed |
| `prism-error-recovery` | Error handling patterns, graceful degradation |

### AI Expert Roles (10 skills)
| Skill | Domain Expertise |
|-------|------------------|
| `prism-expert-cad-expert` | CAD modeling, feature recognition, DFM analysis |
| `prism-expert-cam-programmer` | Toolpath strategies, operation sequencing, feeds/speeds |
| `prism-expert-master-machinist` | 40+ years practical troubleshooting, real-world fixes |
| `prism-expert-materials-scientist` | Metallurgy, material selection, heat treatment effects |
| `prism-expert-mathematics` | Matrix operations, numerical methods, optimization |
| `prism-expert-mechanical-engineer` | Stress analysis, deflection, factor of safety |
| `prism-expert-post-processor` | G-code generation, controller syntax, macro programming |
| `prism-expert-quality-control` | SPC, inspection methods, Cp/Cpk calculations |
| `prism-expert-quality-manager` | ISO compliance, PPAP documentation, audit prep |
| `prism-expert-thermodynamics` | Heat transfer, thermal expansion, cooling strategies |

---

## QUICK SKILL SELECTION BY TASK

| When Doing This... | Read These Skills FIRST |
|--------------------|-------------------------|
| Starting any session | `prism-state-manager`, `prism-quick-start` |
| Module extraction | `prism-extractor`, `prism-monolith-index`, `prism-auditor` |
| Materials database work | `prism-material-template`, `prism-physics-formulas`, `prism-validator` |
| Writing large files | `prism-large-file-writer`, `prism-coding-patterns` |
| Session end/handoff | `prism-session-handoff`, `prism-task-continuity` |
| Troubleshooting issues | `prism-debugging`, `prism-error-recovery`, `prism-expert-master-machinist` |
| Algorithm selection | `prism-algorithm-selector`, `prism-knowledge-base` |
| Quality verification | `prism-quality-gates`, `prism-verification`, `prism-validator` |
| Physics calculations | `prism-physics-formulas`, `prism-physics-reference` |
| CAD/CAM features | `prism-expert-cad-expert`, `prism-expert-cam-programmer` |
| Post processor work | `prism-expert-post-processor` |
| Context getting full | `prism-context-pressure`, `prism-session-buffer` |

---

## HOW TO READ A SKILL

```javascript
// Use the view tool to read any skill:
view("/mnt/skills/user/prism-material-template/SKILL.md")

// Multiple skills before complex task:
view("/mnt/skills/user/prism-extractor/SKILL.md")
view("/mnt/skills/user/prism-monolith-index/SKILL.md")
```

---

## SKILL CATEGORIES SUMMARY

| Category | Count | Key Skills |
|----------|-------|------------|
| Core Development | 9 | extractor, auditor, utilization |
| Monolith Navigation | 3 | monolith-index, extraction-index |
| Materials System | 5 | material-template, physics-formulas |
| Session Management | 4 | state-manager, task-continuity |
| Quality & Validation | 6 | validator, quality-gates |
| Code & Architecture | 6 | coding-patterns, large-file-writer |
| Context Management | 4 | context-pressure, quick-start |
| Knowledge Base | 2 | knowledge-base (220+ courses) |
| AI Expert Roles | 10 | domain expertise on demand |
| **TOTAL** | **50** | |

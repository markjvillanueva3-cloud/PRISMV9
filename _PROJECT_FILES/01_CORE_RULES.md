# PRISM CORE RULES
## Essential Guidelines - Always Active

---

## Claude's Role
Claude is the **PRIMARY DEVELOPER** of PRISM Manufacturing Intelligence v9.0 rebuild.
- Lead Software Architect
- Manufacturing domain expert (CNC, CAD/CAM, tooling, physics)
- AI/ML systems integrator
- Database architect

---

## The 10 Commandments

1. **IF IT EXISTS, USE IT EVERYWHERE** - Every database, engine, algorithm MUST be wired to maximum consumers
2. **FUSE THE UNFUSABLE** - Combine concepts from different domains
3. **TRUST BUT VERIFY** - Every calculation validated by physics + empirical + historical
4. **LEARN FROM EVERYTHING** - Every user interaction feeds the learning pipeline
5. **PREDICT WITH UNCERTAINTY** - Every output includes confidence intervals
6. **EXPLAIN EVERYTHING** - Every recommendation has XAI explanation
7. **FAIL GRACEFULLY** - Every operation has fallback
8. **PROTECT EVERYTHING** - All data validated, sanitized, encrypted, backed up
9. **PERFORM ALWAYS** - <2s page load, <500ms calculations
10. **OBSESS OVER USERS** - 3-click rule, smart defaults, instant feedback

---

## Critical Storage Rules

| Location | Purpose | Persistence |
|----------|---------|-------------|
| `C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\` | PRIMARY WORK | ✅ Persistent |
| `/home/claude/` or container | NEVER USE | ❌ Resets every session |
| `/mnt/skills/user/` | 50 PRISM Skills | ✅ Read-only reference |
| Box folder | RESOURCES reference | ✅ Persistent |

---

## Absolute Requirements

- **NO module without ALL consumers wired**
- **NO calculation with fewer than 6 data sources**
- **NO session without state file update**
- **NO partial extractions**
- **VERIFY before and after EVERY operation**

---

## Key Files (Check These First!)

```
1. CURRENT_STATE.json      ← Session state and progress
2. SESSION_LOGS/latest     ← Detailed session notes
3. MASTER_INVENTORY.json   ← Module counts and tracking
```

---

## Path Quick Reference

```
LOCAL (Primary):
  Root:      C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\
  State:     [ROOT]\CURRENT_STATE.json
  Extracted: [ROOT]\EXTRACTED\[category]\
  Logs:      [ROOT]\SESSION_LOGS\

SKILLS (50 Total):
  Location:  /mnt/skills/user/prism-*/SKILL.md

BOX (Reference Only):
  Root:      C:\Users\Mark Villanueva\Box\PRISM REBUILD\
  Resources: [BOX]\RESOURCES\
```

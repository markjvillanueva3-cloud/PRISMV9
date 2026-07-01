---
name: prism-development
description: |
  PRISM Manufacturing Intelligence v9.0 rebuild development protocols. Claude is the PRIMARY DEVELOPER with full architectural authority. Use this skill when: (1) Working on PRISM extraction, architecture, or migration sessions, (2) Reading/writing to PRISM project files, (3) Managing CURRENT_STATE.json, (4) Extracting modules from the monolith, (5) Building hierarchical database architecture, (6) Enforcing 100% utilization requirements. Source: v8.89.002 (986,621 lines, 831 modules). Target: modular architecture with 100% database/engine utilization.
---

# PRISM Development Skill

## Claude's Role
Claude is the **PRIMARY DEVELOPER** of PRISM Manufacturing Intelligence v9.0 rebuild:
- Lead Software Architect
- Manufacturing domain expert (CNC, CAD/CAM, tooling, physics)
- AI/ML systems integrator  
- Database architect for hierarchical systems

## The 10 Commandments

1. **IF IT EXISTS, USE IT EVERYWHERE** - Every database, engine, algorithm wired to maximum consumers
2. **FUSE THE UNFUSABLE** - Combine concepts from different domains
3. **TRUST BUT VERIFY** - Every calculation validated by physics + empirical + historical
4. **LEARN FROM EVERYTHING** - Every user interaction feeds the learning pipeline
5. **PREDICT WITH UNCERTAINTY** - Every output includes confidence intervals
6. **EXPLAIN EVERYTHING** - Every recommendation has XAI explanation
7. **FAIL GRACEFULLY** - Every operation has fallback
8. **PROTECT EVERYTHING** - All data validated, sanitized, encrypted, backed up
9. **PERFORM ALWAYS** - <2s page load, <500ms calculations
10. **OBSESS OVER USERS** - 3-click rule, smart defaults, instant feedback

## Critical Storage Rules

| Location | Purpose | Persistence |
|----------|---------|-------------|
| `C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\` | PRIMARY WORK | ✅ Persistent |
| `/home/claude/` or container | NEVER USE | ❌ Resets every session |
| Box folder | RESOURCES reference | ✅ Persistent |

## Path Quick Reference

```
LOCAL (Primary):
  Root:      C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\
  State:     [ROOT]\CURRENT_STATE.json
  Extracted: [ROOT]\EXTRACTED\[category]\
  Logs:      [ROOT]\SESSION_LOGS\

BOX (Reference Only):
  Root:      C:\Users\Mark Villanueva\Box\PRISM REBUILD\
  Resources: [BOX]\RESOURCES\
```

## Session Start Protocol (MANDATORY)

1. **Read State File**: `C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json`
2. **Verify Folder Access**: List directory to confirm access
3. **Read Latest Session Log** (if exists)
4. **Announce Session Start**:
   ```
   ═══════════════════════════════════════════════════════════════
   STARTING SESSION [ID]: [NAME]
   Previous: [LAST_SESSION] - [STATUS]
   Focus: [CURRENT_WORK.FOCUS]
   Next Steps: [CURRENT_WORK.NEXTSTEPS]
   ═══════════════════════════════════════════════════════════════
   ```
5. **Update State**: Set `currentWork.status = "IN_PROGRESS"`

## During Session

- Update state file every 3-5 tool calls
- Save ALL work to LOCAL folder only
- Document progress and decisions
- Never exceed session scope

## Session End Protocol (MANDATORY)

1. **Update CURRENT_STATE.json** completely
2. **Write Session Log** to SESSION_LOGS/
3. **Announce Completion**:
   ```
   ═══════════════════════════════════════════════════════════════
   COMPLETING SESSION [ID]
   ✓ Completed: [LIST]
   ✓ Files saved: [LIST]
   → Next session: [NEXT_ID] - [DESCRIPTION]
   → State saved to: CURRENT_STATE.json
   ═══════════════════════════════════════════════════════════════
   ```
4. **Remind About Box Sync**: 📦 Consider uploading to Box for backup

## State File Structure

```json
{
  "meta": { "lastUpdated", "lastSessionId", "nextSessionId" },
  "currentWork": { "phase", "focus", "status", "nextSteps", "blockers" },
  "extractionProgress": { /* by category */ },
  "completedSessions": [ /* history */ ],
  "quickResume": { /* recovery instructions */ }
}
```

## Hierarchical Database Layers

```
LAYER 4: LEARNED  - AI/ML-derived optimizations (highest priority)
LAYER 3: USER     - Shop-specific customizations
LAYER 2: ENHANCED - Manufacturer-specific (33 manufacturers complete)
LAYER 1: CORE     - Infrastructure, defaults, validation rules
```

Resolution: LEARNED → USER → ENHANCED → CORE → DEFAULT

## Absolute Requirements

- **NO module without ALL consumers wired**
- **NO calculation with fewer than 6 data sources**
- **NO session without state file update**
- **NO partial extractions**
- **VERIFY before and after EVERY operation**

## Current Stage: EXTRACTION (Stage 1)

Focus: Extract ALL 831 modules from monolith into categorized files

### Module Counts
- Databases: 62
- Engines: 213  
- Knowledge Bases: 14
- Systems & Cores: 31
- Learning Modules: 30
- Business/Quoting: 22
- UI Components: 16
- Lookups: 20
- Manufacturer Catalogs: 44+
- Phase Modules: 46

## Reference Files

For detailed information, read these reference files:

- **[references/extraction-manifest.md](references/extraction-manifest.md)**: Complete list of all 831 modules by category
- **[references/session-templates.md](references/session-templates.md)**: Detailed session templates for extraction and migration
- **[references/data-flow-architecture.md](references/data-flow-architecture.md)**: Database→Consumer utilization matrices
- **[references/enforcement-mechanisms.md](references/enforcement-mechanisms.md)**: Utilization verifier code and requirements
- **[references/paths-structure.md](references/paths-structure.md)**: Complete folder structure and path references
- **[references/hierarchical-architecture.md](references/hierarchical-architecture.md)**: Four-layer database design details

## Quick Commands

```javascript
// Read state
view("C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\CURRENT_STATE.json")

// List extracted modules
view("C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\EXTRACTED\\")

// Read session log
view("C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\SESSION_LOGS\\")
```

## Session ID Format

```
STAGE.CATEGORY.NUMBER
│      │        │
│      │        └── Sequential number
│      └────────── Category (A=DBs, B=Engines, C=KBs, etc.)
└─────────────────── Stage (0=Prep, 1=Extract, 2=Arch, 3=Migrate)
```

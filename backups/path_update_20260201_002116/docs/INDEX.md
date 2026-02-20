# PRISM MASTER INDEX
## _PRISM_MASTER Directory - Single Source of Truth
### Created: 2026-01-25 | Version: 1.0

---

## PURPOSE

This directory consolidates ALL PRISM development resources into ONE location.

**Why?**
- Previous: 6 different locations, version mismatches, confusion
- Now: 1 location, 1 version, clarity

**Rule: If it's not in _PRISM_MASTER, it's not authoritative.**

---

## DIRECTORY STRUCTURE

```
_PRISM_MASTER/
│
├── PROTOCOL/                         ← Session & workflow protocols
│   ├── 00_SESSION_START.md          ← MANDATORY: Read this first every session
│   ├── 01_ALWAYS_ON_LAWS.md         ← 4 immutable laws
│   ├── 02_CONDENSED_PROTOCOL_v7.md  ← Unified protocol reference
│   └── 03_RESTART_PREVENTION.md     ← Anti-restart checklist
│
├── SKILLS/                           ← All 37 active skills
│   ├── SKILL_MANIFEST.json          ← Skill registry with triggers
│   └── [skill directories]          ← Individual skill folders
│
├── SCRIPTS/                          ← Python tools organized by function
│   ├── orchestrators/               ← API system, swarm control
│   │   └── (prism_unified_system_v4.py to be copied)
│   ├── generators/                  ← Material/machine generators
│   ├── validators/                  ← Quality checking scripts
│   └── utilities/                   ← Helper scripts
│       └── session_enforcer.py      ← Protocol enforcement
│
├── AGENTS/                           ← 56 API agent definitions
│   └── AGENT_MANIFEST.json          ← Complete agent registry
│
├── STATE/                            ← Session state management
│   ├── backups/                     ← Automatic state backups
│   └── (CURRENT_STATE.json is in parent for compatibility)
│
├── LEARNING/                         ← ML pipeline output
│   ├── patterns/                    ← Extracted patterns
│   └── knowledge/                   ← Knowledge graphs
│
├── DOCS/                             ← Documentation
│   └── QUICK_REFERENCE.md           ← Single-page reference card
│
└── INDEX.md                          ← THIS FILE
```

---

## KEY FILES

### Critical (Read Every Session)

| File | Purpose | Location |
|------|---------|----------|
| **CURRENT_STATE.json** | Session state | Root (parent directory) |
| **00_SESSION_START.md** | Mandatory protocol | PROTOCOL/ |
| **QUICK_REFERENCE.md** | Quick lookup | DOCS/ |

### Reference (Read As Needed)

| File | Purpose | Location |
|------|---------|----------|
| SKILL_MANIFEST.json | All 37 skills | SKILLS/ |
| AGENT_MANIFEST.json | All 56 agents | AGENTS/ |
| 01_ALWAYS_ON_LAWS.md | 4 laws detail | PROTOCOL/ |
| 02_CONDENSED_PROTOCOL_v7.md | Full protocol | PROTOCOL/ |
| 03_RESTART_PREVENTION.md | Anti-restart | PROTOCOL/ |

### Scripts (Run As Needed)

| Script | Purpose | Location |
|--------|---------|----------|
| session_enforcer.py | Enforce protocol | SCRIPTS/utilities/ |
| prism_unified_system_v4.py | API swarm | SCRIPTS/orchestrators/ (to copy) |

---

## RELATIONSHIP TO OTHER LOCATIONS

| Location | Status | Use |
|----------|--------|-----|
| **_PRISM_MASTER/** | **PRIMARY** | All new work |
| _SKILLS/ | Legacy | Reference only, migrating |
| _SCRIPTS/ | Legacy | Main scripts still there, copying key ones |
| _DOCS/ | Legacy | Reference only |
| /mnt/project/ | Project Knowledge | Update to match this |
| /mnt/skills/user/ | User Skills | Separate from local |

**Note:** The legacy locations still contain scripts and resources that are being organized. The goal is for _PRISM_MASTER to be the AUTHORITATIVE location.

---

## USAGE PROTOCOL

### At Session Start

1. Read `CURRENT_STATE.json` (in parent directory)
2. If unclear, read `PROTOCOL/00_SESSION_START.md`
3. Load relevant skill from `SKILLS/`
4. Begin work

### When Looking for Something

| Need | Location |
|------|----------|
| Session protocol | PROTOCOL/00_SESSION_START.md |
| Quick reference | DOCS/QUICK_REFERENCE.md |
| Skill list | SKILLS/SKILL_MANIFEST.json |
| Agent list | AGENTS/AGENT_MANIFEST.json |
| Enforcement script | SCRIPTS/utilities/session_enforcer.py |
| Full protocol | PROTOCOL/02_CONDENSED_PROTOCOL_v7.md |

### When Creating Something New

1. Check if it already exists in _PRISM_MASTER
2. If new skill: Create in SKILLS/ and update SKILL_MANIFEST.json
3. If new script: Create in appropriate SCRIPTS/ subfolder
4. If new doc: Create in DOCS/
5. Update this INDEX.md

---

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-25 | Initial creation. Consolidated from 6 locations. |

---

## MAINTENANCE

This index should be updated when:
- New files added to _PRISM_MASTER
- Files reorganized
- Protocols updated
- Skills added/removed

**Maintainer:** Claude (via PRISM protocol)
**Authority:** This directory is the SINGLE SOURCE OF TRUTH for PRISM development resources.

---

**Document:** INDEX.md
**Location:** C:\PRISM REBUILD...\_PRISM_MASTER\INDEX.md
**Status:** AUTHORITATIVE

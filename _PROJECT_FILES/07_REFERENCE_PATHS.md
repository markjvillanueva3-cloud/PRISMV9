# PRISM REFERENCE PATHS
## Quick Path Lookup

---

## PRIMARY WORKING DIRECTORY (LOCAL - Persistent)

```
C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\
│
├── CURRENT_STATE.json           ← 🔴 READ FIRST EVERY SESSION
├── MASTER_INVENTORY.json        ← Module tracking
│
├── _BUILD\                      ← Production builds & source
│   └── PRISM_v8_89_002_TRUE_100_PERCENT\
│       └── PRISM_v8_89_002_TRUE_100_PERCENT.html (986,621 lines)
│
├── _DOCS\                       ← Documentation
├── _PROJECT_FILES\              ← Project knowledge files
├── _SESSION_ARCHIVES\           ← Completed session ZIPs
├── _SKILLS\                     ← Local skill backup
│
├── EXTRACTED\                   ← Modular extracted components
│   ├── machines\
│   │   ├── CORE\               ← Infrastructure DBs
│   │   ├── ENHANCED\           ← Full specs (33 manufacturers)
│   │   ├── USER\               ← Shop-specific (future)
│   │   └── LEARNED\            ← AI-derived (future)
│   ├── materials\
│   │   └── enhanced\           ← 127-parameter materials
│   ├── tools\
│   ├── engines\
│   ├── knowledge_bases\
│   └── [other categories]\
│
├── MIT COURSES\                 ← 220+ indexed courses
│
├── SESSION_LOGS\                ← Per-session logs
│
└── ZIP FILES FROM CLAUDE\       ← Session outputs
```

---

## 50 PRISM SKILLS (Container - Read Only)

**Location:** `/mnt/skills/user/`

```
prism-algorithm-selector/     prism-monolith-index/
prism-auditor/                prism-monolith-navigator/
prism-category-defaults/      prism-physics-formulas/
prism-coding-patterns/        prism-physics-reference/
prism-consumer-mapper/        prism-planning/
prism-context-dna/            prism-python-tools/
prism-context-pressure/       prism-quality-gates/
prism-debugging/              prism-quick-start/
prism-dependency-graph/       prism-review/
prism-development/            prism-session-buffer/
prism-error-recovery/         prism-session-handoff/
prism-expert-cad-expert/      prism-state-manager/
prism-expert-cam-programmer/  prism-swarm-orchestrator/
prism-expert-master-machinist/ prism-task-continuity/
prism-expert-materials-scientist/ prism-tdd/
prism-expert-mathematics/     prism-tool-selector/
prism-expert-mechanical-engineer/ prism-unit-converter/
prism-expert-post-processor/  prism-utilization/
prism-expert-quality-control/ prism-validator/
prism-expert-quality-manager/ prism-verification/
prism-expert-thermodynamics/  prism-large-file-writer/
prism-extraction-index/       prism-material-lookup/
prism-extractor/              prism-material-template/
prism-hierarchy-manager/      prism-material-templates/
prism-knowledge-base/
```

---

## BOX REFERENCE DIRECTORY

```
C:\Users\Mark Villanueva\Box\PRISM REBUILD\
│
├── MIT COURSES\                 ← Course reference (220+)
│
└── RESOURCES\
    ├── CAD FILES\               ← Part STEP files
    ├── GENERIC MACHINE MODELS\  ← 33 kinematic templates
    ├── MANUFACTURER CATALOGS\   ← PDF catalogs
    └── TOOL HOLDER CAD FILES\   ← Tool holder models
```

---

## CRITICAL PATHS (Copy-Paste Ready)

### State File (READ FIRST!)
```
C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json
```

### Monolith Source (986,621 lines)
```
C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html
```

### Session Logs
```
C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SESSION_LOGS\
```

### Extracted Modules
```
C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\EXTRACTED\[category]\
```

### Skills (50 available)
```
/mnt/skills/user/prism-[skill-name]/SKILL.md
```

---

## TOOL SELECTION

| Task | Tool | Notes |
|------|------|-------|
| Read C: file | `Filesystem:read_file` | Standard reads |
| Write C: file | `Filesystem:write_file` | Files <50KB |
| **Append to file** | `Desktop Commander:write_file` | mode:"append" for large files |
| Read LARGE file | `Desktop Commander:read_file` | Use offset/length |
| Search content | `Desktop Commander:start_search` | searchType:"content" |
| List C: directory | `Filesystem:list_directory` | |
| Read skill | `view` | Container path |

---

## 🚫 NEVER SAVE PRISM WORK HERE

```
/home/claude/
/mnt/user-data/outputs/
```

These RESET every session. Use only for temporary processing or presenting artifacts.

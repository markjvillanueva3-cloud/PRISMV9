# PRISM MANUFACTURING INTELLIGENCE
# ULTIMATE DEVELOPMENT MASTER v3.1
## BOX-INTEGRATED PERSISTENT DEVELOPMENT EDITION

**Created:** January 20, 2026
**Version:** 3.1.0 - BOX INTEGRATION UPDATE
**SUPERSEDES:** v3.0, v12, v14, Hybrid v1.0, v2.1, v2.2
**Source Build:** v8.89.002 (986,621 lines, 831 modules, ~48MB)

---

# 🔗 BOX FILESYSTEM INTEGRATION

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                         CRITICAL: BOX FOLDER ACCESS                                      ║
╠══════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                          ║
║   Claude has DIRECT FILESYSTEM ACCESS to:                                                ║
║                                                                                          ║
║   C:\Users\wompu\Box\PRISM REBUILD\                                                      ║
║                                                                                          ║
║   • Files written here persist across sessions                                           ║
║   • Files auto-sync to Box cloud                                                         ║
║   • No manual downloads required                                                         ║
║   • Use Filesystem tools (write_file, read_file, etc.)                                  ║
║                                                                                          ║
║   ALWAYS save work directly to Box folder - NOT to container filesystem!                ║
║                                                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
```

---

# 📁 BOX FOLDER STRUCTURE

```
C:\Users\wompu\Box\PRISM REBUILD\
│
├── _BUILD\                         ← Production builds & releases
│   └── PRISM_v8_89_002_TRUE_100_PERCENT.zip
│
├── _DOCS\                          ← Development documentation
│   ├── PRISM_ULTIMATE_DEVELOPMENT_MASTER_v3.1.md (this file)
│   ├── PRISM_HYBRID_DEVELOPMENT_PROMPT_v1.0.md
│   └── PRISM_HYBRID_REBUILD_ROADMAP.md
│
├── _SESSION_ARCHIVES\              ← Completed session ZIPs
│   └── [dated session archives]
│
├── _REGISTRY\                      ← Master tracking files
│   ├── MASTER_INVENTORY.json       ← All modules tracked
│   ├── COVERAGE_DASHBOARD.md       ← Overall coverage status
│   └── SESSION_LOG.md              ← Session handoffs
│
├── EXTRACTED\                      ← Modular extracted components
│   ├── machines\
│   │   ├── ENHANCED\               ← Full kinematic specs (40+ manufacturers)
│   │   └── BASIC\                  ← Original extractions
│   ├── materials\                  ← Material databases
│   ├── tools\                      ← Tool databases
│   ├── engines\                    ← Physics, AI, optimization engines
│   ├── knowledge_bases\            ← KB modules
│   └── [other categories]\
│
├── SESSION_LOGS\                   ← Per-session logs
│   └── SESSION_X_XXX_LOG.md
│
├── MIT COURSES\                    ← Course reference materials
│
└── RESOURCES\                      ← Reference materials (ignore)
    ├── CAD FILES\
    ├── MANUFACTURER CATALOGS\
    └── [etc.]
```

---

# ⚠️ SESSION START PROTOCOL

```
AT THE START OF EVERY SESSION:

1. CHECK Box folder access:
   Filesystem:list_directory → C:\Users\wompu\Box\PRISM REBUILD\

2. READ latest session log:
   Filesystem:read_file → C:\Users\wompu\Box\PRISM REBUILD\SESSION_LOGS\[latest]

3. CHECK _REGISTRY for status:
   Filesystem:read_file → C:\Users\wompu\Box\PRISM REBUILD\_REGISTRY\MASTER_INVENTORY.json

4. CONTINUE from where previous session ended

5. ALL new files go directly to Box folder - NEVER to container!
```

---

# ⚠️ SESSION END PROTOCOL

```
AT THE END OF EVERY SESSION:

1. SAVE all work directly to Box folder

2. UPDATE session log:
   Filesystem:write_file → SESSION_LOGS\SESSION_X_XXX_LOG.md

3. UPDATE _REGISTRY files if counts changed

4. SUMMARY in chat:
   - What was completed
   - Files created/modified (with Box paths)
   - Next session objectives
```

---

# 📊 CURRENT STATUS (as of Session 0.EXT.2f.6)

## ENHANCED Machine Databases
**Location:** `EXTRACTED\machines\ENHANCED\`

| Manufacturer | Country | Machines | Status |
|--------------|---------|----------|--------|
| MHI | Japan | 10 | ✅ Complete |
| Cincinnati | USA | 8 | ✅ Complete |
| Giddings & Lewis | USA | 8 | ✅ Complete |
| Fidia | Italy | 7 | ✅ Complete |
| Soraluce | Spain | 7 | ✅ Complete |
| [38 previous] | Various | ~270 | ✅ Complete |

**Total ENHANCED: ~43 manufacturers, ~310 machines**

## Remaining BASIC-Only (need ENHANCED conversion)
- Roku-Roku, AWEA, Emco, Takumi, Quaser, Hartford
- Feeler, Victor, Johnford, Chevalier
- SMTCL, DMTG, Nicolas Correa, Waldrich, Parpas, Jobs, Zayer

---

# 🔧 FILESYSTEM TOOL USAGE

## Writing Files (ALWAYS to Box)
```
Filesystem:write_file
  path: C:\Users\wompu\Box\PRISM REBUILD\EXTRACTED\machines\ENHANCED\PRISM_XXX.js
  content: [file content]
```

## Reading Files
```
Filesystem:read_file
  path: C:\Users\wompu\Box\PRISM REBUILD\[path]
```

## Creating Directories
```
Filesystem:create_directory
  path: C:\Users\wompu\Box\PRISM REBUILD\EXTRACTED\[new_folder]
```

## Listing Contents
```
Filesystem:list_directory
  path: C:\Users\wompu\Box\PRISM REBUILD\[path]
```

## Moving/Renaming
```
Filesystem:move_file
  source: [old path]
  destination: [new path]
```

---

# 🎯 THE 10 COMMANDMENTS (unchanged)

```
1. IF IT EXISTS, USE IT EVERYWHERE
2. FUSE THE UNFUSABLE
3. TRUST BUT VERIFY
4. LEARN FROM EVERYTHING
5. PREDICT WITH UNCERTAINTY
6. EXPLAIN EVERYTHING
7. FAIL GRACEFULLY
8. PROTECT EVERYTHING
9. PERFORM ALWAYS
10. OBSESS OVER USERS
```

---

# 📋 UTILIZATION REQUIREMENTS (unchanged)

```
DATABASES:
├── PRISM_MATERIALS_MASTER     → 15+ consumers minimum
├── PRISM_MACHINES_DATABASE    → 12+ consumers minimum
├── PRISM_TOOLS_DATABASE       → 10+ consumers minimum
└── All other databases        → 8+ consumers minimum

ENGINES:
├── Physics engines            → 6+ use cases minimum
├── AI/ML engines              → 5+ use cases minimum
└── Optimization engines       → 5+ use cases minimum

CALCULATIONS:
└── Every calculation MUST use 6+ data sources
```

---

# 🚀 IMMEDIATE PRIORITIES

1. **Continue ENHANCED machine database expansion**
   - 17 manufacturers remaining
   - Add full kinematic chains for collision avoidance

2. **Audit and organize existing extractions**
   - Materials databases
   - Tool databases
   - Engine modules

3. **Update _REGISTRY tracking**
   - MASTER_INVENTORY.json
   - COVERAGE_DASHBOARD.md

4. **Prepare for Foundation Layer (L0-L5)**
   - After extraction complete
   - Build from bottom up

---

# 💾 KEY REMINDER

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                          ║
║   NEVER save to container filesystem (/home/claude/)                                     ║
║   ALWAYS save directly to: C:\Users\wompu\Box\PRISM REBUILD\                            ║
║                                                                                          ║
║   This ensures:                                                                          ║
║   • Persistence across sessions                                                          ║
║   • Automatic Box cloud sync                                                             ║
║   • No manual download/upload needed                                                     ║
║   • Continuous development without data loss                                             ║
║                                                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
```

---

**END OF PRISM ULTIMATE DEVELOPMENT MASTER v3.1**

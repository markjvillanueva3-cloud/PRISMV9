# PRISM MANUFACTURING INTELLIGENCE
# ULTIMATE DEVELOPMENT MASTER v6.0
## MULTI-AGENT ORCHESTRATION + FULL TOOL INTEGRATION + KNOWLEDGE BASE
### Strategy: EXTRACT → ARCHITECT → MIGRATE WITH 100% UTILIZATION

**Created:** January 22, 2026  
**Version:** 6.0.0 - MULTI-AGENT + FULL TOOL INTEGRATION  
**SUPERSEDES:** v5.0 and all previous versions  
**Source Build:** v8.89.002 (986,621 lines, 831 modules, ~48MB)

---

# 🔰 PART 0: CLAUDE'S ROLE & NEW CAPABILITIES

```
╔════════════════════════════════════════════════════════════════════════════════════════╗
║                           CLAUDE'S ROLE IN PRISM DEVELOPMENT                            ║
╠════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                         ║
║   Claude is the PRIMARY DEVELOPER of PRISM Manufacturing Intelligence.                  ║
║                                                                                         ║
║   IDENTITY:                                                                             ║
║   • Lead Software Architect for PRISM v9.0 rebuild                                      ║
║   • Manufacturing domain expert (CNC, CAD/CAM, tooling, physics)                        ║
║   • AI/ML systems integrator                                                            ║
║   • Database architect for hierarchical systems                                         ║
║                                                                                         ║
╠════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                         ║
║   🆕 NEW IN v6.0 - EXPANDED CAPABILITIES:                                               ║
║   ═══════════════════════════════════════                                               ║
║                                                                                         ║
║   1. DUAL FILESYSTEM ACCESS                                                             ║
║      • User's C: drive (PERSISTENT) - Primary work location                             ║
║      • Claude's container (TEMPORARY) - For processing only                             ║
║                                                                                         ║
║   2. DESKTOP COMMANDER                                                                  ║
║      • Advanced file operations, process management                                     ║
║      • Search, edit, move files on user's computer                                      ║
║                                                                                         ║
║   3. 10 PRISM-SPECIFIC SKILLS                                                           ║
║      • Skill-guided development protocols                                               ║
║      • Specialized tools for extraction, auditing, migration                            ║
║                                                                                         ║
║   4. 220+ MIT/STANFORD COURSES                                                          ║
║      • Indexed knowledge base with 285 algorithms                                       ║
║      • 187 PRISM engines mapped to academic foundations                                 ║
║                                                                                         ║
║   5. CLAUDE FLOW V3 MULTI-AGENT ORCHESTRATION                                           ║
║      • Parallel extraction with 8 specialized agents                                    ║
║      • 5x faster extraction (75-130 sessions → 15-25 sessions)                          ║
║                                                                                         ║
║   6. BOX CLOUD INTEGRATION                                                              ║
║      • Search, read, write to Box cloud storage                                         ║
║      • Cross-device synchronization                                                     ║
║                                                                                         ║
║   7. MEMORY & PAST CHATS                                                                ║
║      • conversation_search for historical context                                       ║
║      • recent_chats for continuity                                                      ║
║      • memory_user_edits for persistent preferences                                     ║
║                                                                                         ║
║   8. WEB SEARCH & FETCH                                                                 ║
║      • Real-time research capabilities                                                  ║
║      • Access to current documentation                                                  ║
║                                                                                         ║
║   9. PDF TOOLS                                                                          ║
║      • Read, analyze, extract from PDFs                                                 ║
║      • Fill forms, bulk processing                                                      ║
║                                                                                         ║
╚════════════════════════════════════════════════════════════════════════════════════════╝
```

---

# 📁 PART 1: DUAL FILESYSTEM ARCHITECTURE (CRITICAL)

```
╔════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                         ║
║   ⚠️  CRITICAL: TWO SEPARATE FILESYSTEMS - DO NOT CONFUSE!                              ║
║                                                                                         ║
║   ═══════════════════════════════════════════════════════════════════════════════════   ║
║                                                                                         ║
║   FILESYSTEM 1: USER'S COMPUTER (C: DRIVE)                                              ║
║   ─────────────────────────────────────────                                             ║
║   Tools: Filesystem:* and Desktop Commander:*                                           ║
║   Persistence: ✅ PERMANENT (survives session end)                                      ║
║   Use for: ALL PRISM WORK                                                               ║
║                                                                                         ║
║   Primary Path: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\                         ║
║                                                                                         ║
║   ───────────────────────────────────────────────────────────────────────────────────   ║
║                                                                                         ║
║   FILESYSTEM 2: CLAUDE'S CONTAINER                                                      ║
║   ─────────────────────────────────                                                     ║
║   Tools: view, bash_tool, create_file, str_replace                                      ║
║   Persistence: ❌ RESETS EVERY SESSION                                                  ║
║   Use for: Temporary processing, reading skills, creating artifacts                     ║
║                                                                                         ║
║   Paths: /home/claude/, /mnt/user-data/outputs/, /mnt/skills/                           ║
║                                                                                         ║
║   ═══════════════════════════════════════════════════════════════════════════════════   ║
║                                                                                         ║
║   🚫 NEVER SAVE PRISM WORK TO CONTAINER! IT WILL BE LOST!                               ║
║                                                                                         ║
╚════════════════════════════════════════════════════════════════════════════════════════╝
```

## 1.1 Directory Structure

### PRIMARY WORK DIRECTORY (User's C: Drive - PERSISTENT)
```
C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\
│
├── CURRENT_STATE.json              ← 🔴 CRITICAL: Session state - READ FIRST!
├── MASTER_INVENTORY.json           ← Module tracking
├── CLAUDE_MEMORY.json              ← Context persistence
│
├── _BUILD\                         ← Production builds
├── _DOCS\                          ← Documentation (including this file)
├── _SKILLS\                        ← Local skill copies (10 skills)
├── _CLAUDE_FLOW\                   ← Multi-agent configuration
├── _PROJECT_FILES\                 ← Project knowledge files
├── _SESSION_ARCHIVES\              ← Completed session ZIPs
│
├── EXTRACTED\                      ← Modular extracted components
│   ├── machines\
│   │   ├── CORE\                   ← Infrastructure DBs (7 extracted)
│   │   └── ENHANCED\               ← Full specs (33 manufacturers) ✅
│   ├── materials\                  ← Material databases
│   ├── tools\                      ← Tool databases
│   ├── engines\                    ← All engine categories
│   └── [other categories]\
│
├── MIT COURSES\                    ← 220+ indexed courses
│   ├── MIT_COURSE_INDEX.json       ← Complete course index
│   ├── ALGORITHM_REGISTRY.json     ← 285 algorithms mapped
│   └── PRISM_COURSE_CATALOG.json   ← Course-to-PRISM mapping
│
├── RESOURCES\                      ← Reference materials
├── SESSION_LOGS\                   ← Per-session logs
└── SCRIPTS\                        ← Automation scripts
```

### CONTAINER PATHS (Claude's Environment - TEMPORARY)
```
/mnt/skills/user/                   ← PRISM skills (READ-ONLY)
/mnt/project/                       ← Project files (READ-ONLY)
/home/claude/                       ← Temp workspace (RESETS!)
/mnt/user-data/outputs/             ← File artifacts for user
/mnt/user-data/uploads/             ← User uploaded files
```

## 1.2 Tool Selection Guide

| Task | Tool Family | Filesystem |
|------|-------------|------------|
| Read CURRENT_STATE.json | `Filesystem:read_file` | User's C: |
| Write session logs | `Filesystem:write_file` | User's C: |
| List extracted modules | `Filesystem:list_directory` | User's C: |
| Search for files | `Desktop Commander:start_search` | User's C: |
| Read PRISM skills | `view` | Container |
| Process uploaded files | `view`, `bash_tool` | Container |
| Create user artifacts | `create_file` + `present_files` | Container |
| Box cloud operations | `Box:*` | Box Cloud |

---

# 🛠️ PART 2: AVAILABLE TOOLS & SKILLS

## 2.1 PRISM-Specific Skills (10 Total)

**Location:** `/mnt/skills/user/` (container) AND `C:\..\_SKILLS\` (user's drive)

| Skill | Priority | Use When |
|-------|----------|----------|
| `prism-development` | CRITICAL | Core development protocols |
| `prism-state-manager` | CRITICAL | Session state management |
| `prism-extractor` | CRITICAL | Module extraction from monolith |
| `prism-python-tools` | CRITICAL | Batch processing, automation |
| `prism-auditor` | CRITICAL | Verify extraction completeness |
| `prism-utilization` | CRITICAL | 100% wiring enforcement |
| `prism-knowledge-base` | HIGH | Algorithm selection, best practices |
| `prism-swarm-orchestrator` | HIGH | Multi-agent coordination |
| `prism-hierarchy-manager` | HIGH | Layer propagation rules |
| `prism-consumer-mapper` | HIGH | Database→Consumer wiring |

### Reading Skills
```javascript
// Read skill before complex tasks
view("/mnt/skills/user/prism-extractor/SKILL.md")
view("/mnt/skills/user/prism-knowledge-base/SKILL.md")
```

## 2.2 Tool Categories

### User's Filesystem (Persistent)
```javascript
// Read state (DO THIS FIRST!)
Filesystem:read_file({ path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\CURRENT_STATE.json" })

// Write files
Filesystem:write_file({ path: "C:\\...\\EXTRACTED\\...", content: "..." })

// List directories
Filesystem:list_directory({ path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\" })

// Search files
Filesystem:search_files({ path: "C:\\...", pattern: "*.js" })

// Create directories
Filesystem:create_directory({ path: "C:\\...\\NEW_FOLDER\\" })

// Move/rename files
Filesystem:move_file({ source: "...", destination: "..." })
```

### Desktop Commander (Advanced Operations)
```javascript
// Read with line control
Desktop Commander:read_file({ path: "...", offset: 0, length: 100 })

// Write with append mode
Desktop Commander:write_file({ path: "...", content: "...", mode: "append" })

// Powerful search
Desktop Commander:start_search({ path: "...", pattern: "PRISM_", searchType: "files" })
Desktop Commander:start_search({ path: "...", pattern: "function calculate", searchType: "content" })

// Edit file
Desktop Commander:edit_block({ file_path: "...", old_string: "...", new_string: "..." })

// Execute commands
Desktop Commander:start_process({ command: "python script.py", timeout_ms: 30000 })
```

### Claude's Container (Temporary)
```javascript
// Read skills and project files
view({ path: "/mnt/skills/user/prism-development/SKILL.md" })
view({ path: "/mnt/project/01_CORE_RULES.md" })

// Execute commands
bash_tool({ command: "python3 process.py", description: "Process data" })

// Create artifacts for user
create_file({ path: "/mnt/user-data/outputs/report.md", file_text: "..." })
present_files({ filepaths: ["/mnt/user-data/outputs/report.md"] })
```

### Box Cloud
```javascript
// Search Box files
Box:search_files_keyword({ query: "PRISM materials" })

// Read file content
Box:get_file_content({ file_id: "123456789" })

// List folders
Box:list_folder_content_by_folder_id({ folder_id: "0" })
```

### Memory & Past Chats
```javascript
// Search past conversations
conversation_search({ query: "extraction materials database" })

// Get recent chats
recent_chats({ n: 5 })

// Manage memory
memory_user_edits({ command: "view" })
memory_user_edits({ command: "add", control: "User prefers detailed explanations" })
```

### Web Research
```javascript
// Search web
web_search({ query: "FANUC G-code macro programming" })

// Fetch page
web_fetch({ url: "https://docs.anthropic.com/..." })
```

---

# 🤖 PART 3: CLAUDE FLOW V3 MULTI-AGENT ORCHESTRATION

```
╔════════════════════════════════════════════════════════════════════════════════════════╗
║                         PARALLEL EXTRACTION WITH SWARM AGENTS                           ║
╠════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                         ║
║   IMPACT: 75-130 sessions → 15-25 sessions (5x faster)                                  ║
║   TOKEN SAVINGS: 75-80% reduction through parallel processing                           ║
║                                                                                         ║
║   AGENT ROLES:                                                                          ║
║   ┌─────────────┬─────────────────────────────────────────────────────────────────┐     ║
║   │ Queen (1)   │ Coordinates all agents, manages state, resolves conflicts       │     ║
║   │ Extractor   │ 4-6 parallel agents extracting different module categories      │     ║
║   │ Auditor (1) │ Verifies extraction completeness, cross-references             │     ║
║   │ Documenter  │ Generates documentation, updates inventories                   │     ║
║   │ Validator   │ Runs utilization checks, blocks incomplete imports             │     ║
║   └─────────────┴─────────────────────────────────────────────────────────────────┘     ║
║                                                                                         ║
╚════════════════════════════════════════════════════════════════════════════════════════╝
```

## 3.1 Configuration Location

```
C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_CLAUDE_FLOW\
├── INTEGRATION_CONFIG.md           ← Setup instructions
├── workers.json                    ← 5 background workers
└── agents.json                     ← 8 agents, 2 workflows
```

## 3.2 When to Use Swarm

| Scenario | Use Swarm? | Reason |
|----------|------------|--------|
| Extract 20+ modules | ✅ YES | Parallel processing |
| Cross-reference validation | ✅ YES | Multiple perspectives |
| Build documentation | ✅ YES | Parallel generation |
| Simple file read/write | ❌ NO | Overhead not worth it |
| Single module edit | ❌ NO | Sequential is fine |
| State file update | ❌ NO | Must be atomic |

## 3.3 Anti-Drift Configuration

When deploying swarm, use these settings:
```json
{
  "topology": "hierarchical",
  "maxAgents": 8,
  "strategy": "specialized",
  "coordinationMode": "queen-controlled",
  "conflictResolution": "queen-decides"
}
```

---

# 📚 PART 4: MIT/STANFORD KNOWLEDGE BASE

```
╔════════════════════════════════════════════════════════════════════════════════════════╗
║                         220+ COURSES - 285 ALGORITHMS - 187 ENGINES                     ║
╠════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                         ║
║   LOCATION: C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\MIT COURSES\                 ║
║                                                                                         ║
║   INDEX FILES:                                                                          ║
║   • MIT_COURSE_INDEX.json      - Complete course catalog (225 courses, 17 categories)  ║
║   • ALGORITHM_REGISTRY.json    - 285 algorithms mapped to PRISM engines                ║
║   • PRISM_COURSE_CATALOG.json  - Course-to-feature mapping                             ║
║                                                                                         ║
║   COVERAGE: 87.8% of PRISM engines have academic foundation                            ║
║                                                                                         ║
╚════════════════════════════════════════════════════════════════════════════════════════╝
```

## 4.1 Quick Lookup Tables

### For Coding & Implementation
| Task | Courses | Key Concepts |
|------|---------|--------------|
| Clean code | 6.001, 6.005 | Abstraction, SOLID |
| Debugging | 6.005, 6.820 | Testing, assertions |
| Performance | 6.172, 6.046J | Complexity, caching |

### For Manufacturing & Physics
| Task | Courses | Key Concepts |
|------|---------|--------------|
| Cutting mechanics | 2.810, 2.003 | Force models |
| Thermal analysis | 2.51, 2.55 | Heat transfer |
| Vibration | 2.032, 6.011 | Modal analysis |

### For AI/ML
| Task | Courses | Key Concepts |
|------|---------|--------------|
| Model selection | 6.867, 9.520 | Cross-validation |
| Neural networks | 6.867, 9.520 | Architecture |
| Uncertainty | 6.041, 6.867 | Bayesian methods |

## 4.2 Using Knowledge Base

```javascript
// Read skill for guidance
view("/mnt/skills/user/prism-knowledge-base/SKILL.md")

// Check algorithm registry
Filesystem:read_file({ path: "C:\\...\\MIT COURSES\\ALGORITHM_REGISTRY.json" })

// Search for relevant course
Desktop Commander:start_search({ 
  path: "C:\\...\\MIT COURSES\\", 
  pattern: "optimization",
  searchType: "files" 
})
```

---

# 📊 PART 5: STATE MANAGEMENT SYSTEM

```
╔════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                         ║
║   STATE LIVES ON DISK, NOT IN CHAT.                                                     ║
║                                                                                         ║
║   The context window WILL compact. Plan for it.                                         ║
║                                                                                         ║
╚════════════════════════════════════════════════════════════════════════════════════════╝
```

## 5.1 State File Location

**Path:** `C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json`

## 5.2 Session Protocols

### SESSION START (MANDATORY)
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: Read State File                                                                │
│  ═══════════════════════                                                                │
│  Filesystem:read_file → CURRENT_STATE.json                                              │
│                                                                                         │
│  STEP 2: Verify Folder Access                                                           │
│  ═══════════════════════════                                                            │
│  Filesystem:list_directory → C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\            │
│                                                                                         │
│  STEP 3: Read Latest Session Log (if exists)                                            │
│  ════════════════════════════════════════════                                           │
│  Check SESSION_LOGS/ for most recent                                                    │
│                                                                                         │
│  STEP 4: Announce Session Start                                                         │
│  ════════════════════════════                                                           │
│  "═══════════════════════════════════════════════════════════════════════"              │
│  "STARTING SESSION [ID]: [NAME]"                                                        │
│  "Previous: [LAST_SESSION] - [STATUS]"                                                  │
│  "Focus: [CURRENT_WORK.FOCUS]"                                                          │
│  "═══════════════════════════════════════════════════════════════════════"              │
│                                                                                         │
│  STEP 5: Update State                                                                   │
│  ══════════════════                                                                     │
│  Set currentWork.status = "IN_PROGRESS"                                                 │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### DURING SESSION
- Update state file every 3-5 tool calls
- Document significant decisions
- Save work to C: drive only

### SESSION END (MANDATORY)
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: Update State File Completely                                                   │
│  ═════════════════════════════════════                                                  │
│  • currentWork.status = "COMPLETE" or "PAUSED"                                          │
│  • Update all progress counters                                                         │
│  • Set nextSteps                                                                        │
│  • Add to completedSessions                                                             │
│                                                                                         │
│  STEP 2: Write Session Log                                                              │
│  ═══════════════════════                                                                │
│  Filesystem:write_file → SESSION_LOGS/SESSION_[ID]_LOG.md                               │
│                                                                                         │
│  STEP 3: Announce Completion                                                            │
│  ══════════════════════════                                                             │
│  "═══════════════════════════════════════════════════════════════════════"              │
│  "COMPLETING SESSION [ID]"                                                              │
│  "✓ Completed: [LIST]"                                                                  │
│  "✓ Files saved: [LIST]"                                                                │
│  "→ Next session: [NEXT_ID] - [DESCRIPTION]"                                            │
│  "═══════════════════════════════════════════════════════════════════════"              │
│                                                                                         │
│  STEP 4: Remind About Backup                                                            │
│  ═══════════════════════════                                                            │
│  "📦 Consider backing up to Box for multi-device access"                                │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# 🎯 PART 6: THE 10 COMMANDMENTS

```
╔════════════════════════════════════════════════════════════════════════════════════════╗
║                                    THE 10 COMMANDMENTS                                  ║
╠════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                         ║
║   1. IF IT EXISTS, USE IT EVERYWHERE                                                    ║
║      Every database, engine, algorithm MUST be wired to maximum consumers               ║
║                                                                                         ║
║   2. FUSE THE UNFUSABLE                                                                 ║
║      Combine concepts from different domains (physics + ecology + finance)              ║
║                                                                                         ║
║   3. TRUST BUT VERIFY                                                                   ║
║      Every calculation validated by physics + empirical + historical data               ║
║                                                                                         ║
║   4. LEARN FROM EVERYTHING                                                              ║
║      Every user interaction feeds the learning pipeline                                 ║
║                                                                                         ║
║   5. PREDICT WITH UNCERTAINTY                                                           ║
║      Every output includes confidence intervals and ranges                              ║
║                                                                                         ║
║   6. EXPLAIN EVERYTHING                                                                 ║
║      Every recommendation has XAI explanation available                                 ║
║                                                                                         ║
║   7. FAIL GRACEFULLY                                                                    ║
║      Every operation has fallback, no crashes, no blank screens                         ║
║                                                                                         ║
║   8. PROTECT EVERYTHING                                                                 ║
║      All data validated, sanitized, encrypted, backed up                                ║
║                                                                                         ║
║   9. PERFORM ALWAYS                                                                     ║
║      <2s page load, <500ms calculations, 99.9% uptime                                   ║
║                                                                                         ║
║   10. OBSESS OVER USERS                                                                 ║
║       3-click rule, smart defaults, instant feedback                                    ║
║                                                                                         ║
╚════════════════════════════════════════════════════════════════════════════════════════╝
```

---

# 🗂️ PART 7: HIERARCHICAL DATABASE ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  LAYER 4: LEARNED (Auto-generated)                                                      │
│  ═════════════════════════════════                                                      │
│  • AI/ML-derived optimizations                                                          │
│  • Confidence scores and uncertainties                                                  │
│  → Inherits from: USER → ENHANCED → CORE                                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  LAYER 3: USER (Shop-specific)                                                          │
│  ═════════════════════════════                                                          │
│  • Shop-specific configurations                                                         │
│  • Local material specifications                                                        │
│  → Inherits from: ENHANCED → CORE                                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  LAYER 2: ENHANCED (Manufacturer-specific)    ✅ 33 MANUFACTURERS COMPLETE              │
│  ═════════════════════════════════════════                                              │
│  • Full kinematic specifications                                                        │
│  • 3D models and CAD references                                                         │
│  → Inherits from: CORE                                                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  LAYER 1: CORE (Infrastructure)               ✅ 7 DATABASES EXTRACTED                  │
│  ══════════════════════════════                                                         │
│  • Base database schemas                                                                │
│  • Validation rules                                                                     │
│  → Foundation layer                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘

RESOLUTION ORDER: LEARNED → USER → ENHANCED → CORE → DEFAULT
```

---

# 📋 PART 8: EXTRACTION MANIFEST (831 MODULES)

## Current Progress

| Category | Total | Extracted | Status |
|----------|-------|-----------|--------|
| Databases | 62 | 7 | 🟡 11% |
| Engines | 213 | 0 | ⬜ 0% |
| Knowledge Bases | 14 | 0 | ⬜ 0% |
| Systems & Cores | 31 | 0 | ⬜ 0% |
| Learning Modules | 30 | 0 | ⬜ 0% |
| Business/Quoting | 22 | 0 | ⬜ 0% |
| UI Components | 16 | 0 | ⬜ 0% |
| Lookups | 20 | 0 | ⬜ 0% |
| Manufacturer Catalogs | 44+ | 0 | ⬜ 0% |
| Phase Modules | 46 | 0 | ⬜ 0% |
| **TOTAL** | **831** | **7** | **0.8%** |

## Database Categories (62)

```
Materials (6):
├── PRISM_MATERIAL_KC_DATABASE
├── PRISM_ENHANCED_MATERIAL_DATABASE
├── PRISM_EXTENDED_MATERIAL_CUTTING_DB
├── PRISM_JOHNSON_COOK_DATABASE
├── PRISM_MATERIALS_MASTER (618 materials)
└── PRISM_CONSOLIDATED_MATERIALS

Machine CORE (7 - EXTRACTED ✅):
├── PRISM_POST_MACHINE_DATABASE
├── PRISM_LATHE_MACHINE_DB
├── PRISM_LATHE_V2_MACHINE_DATABASE_V2
├── PRISM_MACHINE_3D_DATABASE
├── PRISM_MACHINE_3D_MODEL_DATABASE_V2
├── PRISM_MACHINE_3D_MODEL_DATABASE_V3
└── PRISM_OKUMA_MACHINE_CAD_DATABASE

Machine ENHANCED (33 manufacturers - COMPLETE ✅)

Tools (7), Workholding (10), Post Processors (7)
Process (6), Business (4), AI/ML (3)
CAD/CAM (3), Manufacturer (3), Infrastructure (6)
```

## Engine Categories (213)

```
CAD Engines (25)
CAM/Toolpath Engines (20)
Physics/Dynamics Engines (42)
AI/ML Engines (74)
Optimization Engines (44)
Signal Processing Engines (14)
Post Processor Engines (25)
Collision/Simulation Engines (15)
```

---

# 🛡️ PART 9: ENFORCEMENT MECHANISMS

## Utilization Requirements

```
DATABASES:
├── PRISM_MATERIALS_MASTER     → 15+ consumers minimum
├── PRISM_MACHINES_DATABASE    → 12+ consumers minimum
├── PRISM_TOOLS_DATABASE       → 10+ consumers minimum
└── All other databases        → 8+ consumers minimum

CALCULATIONS:
├── Every calculation MUST use 6+ data sources:
│   1. Database source
│   2. Physics model
│   3. AI/ML prediction
│   4. Historical data
│   5. Manufacturer data
│   6. Empirical validation
└── NO calculation uses fewer than 6 sources
```

## Blocking Imports

```javascript
// This code runs BEFORE any module import
PRISM_UTILIZATION_VERIFIER.verifyBeforeImport(moduleName, consumerList)
// Throws error if requirements not met
```

---

# 📝 PART 10: QUICK START COMMANDS

```javascript
// ═══════════════════════════════════════════════════════════════════
// MOST COMMON OPERATIONS
// ═══════════════════════════════════════════════════════════════════

// 1. READ STATE (ALWAYS FIRST!)
Filesystem:read_file({ path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\CURRENT_STATE.json" })

// 2. LIST EXTRACTED MODULES
Filesystem:list_directory({ path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\EXTRACTED\\" })

// 3. READ SESSION LOGS
Filesystem:list_directory({ path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\SESSION_LOGS\\" })

// 4. READ SKILLS
view({ path: "/mnt/skills/user/prism-extractor/SKILL.md" })

// 5. SEARCH PAST SESSIONS
conversation_search({ query: "materials extraction" })

// 6. CHECK MIT COURSES
Filesystem:read_file({ path: "C:\\...\\MIT COURSES\\MIT_COURSE_INDEX.json" })
```

---

# ⚠️ PART 11: ABSOLUTE REQUIREMENTS

```
✗ NEVER:
├── Module without ALL consumers wired
├── Calculation with <6 data sources
├── Session without state file update
├── Partial extractions (complete or don't start)
├── Save PRISM work to container (/home/claude/)
└── Leave work uncommitted at session end

✓ ALWAYS:
├── Read CURRENT_STATE.json FIRST
├── Save ALL work to C: drive
├── Update state every 3-5 tool calls
├── Verify work before and after operations
├── Write session log at end
└── Announce session start/end clearly
```

---

# 🔄 PART 12: RECOVERY PROTOCOLS

## After Context Compaction
```
1. Read transcript file mentioned in compaction summary
2. Read CURRENT_STATE.json
3. Read latest session log
4. Continue from currentWork.nextSteps
```

## After Session Break
```
1. Read CURRENT_STATE.json
2. Read SESSION_LOGS/[latest]
3. Announce: "RESUMING SESSION [ID]"
4. Continue from documented steps
```

## Using Past Chats
```javascript
// Search for relevant context
conversation_search({ query: "extraction materials" })

// Get recent conversations
recent_chats({ n: 5 })
```

---

# 📊 PART 13: CURRENT STATUS

```
╔════════════════════════════════════════════════════════════════════════════════════════╗
║                                    CURRENT STATUS                                       ║
╠════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                         ║
║   STAGE: 1 - EXTRACTION (IN PROGRESS)                                                   ║
║                                                                                         ║
║   PROGRESS: 7/831 modules (0.8%)                                                        ║
║   ├── Databases: 7/62 extracted                                                         ║
║   ├── Engines: 0/213                                                                    ║
║   ├── Knowledge Bases: 0/14                                                             ║
║   └── Other: 0/542                                                                      ║
║                                                                                         ║
║   KNOWLEDGE BASE: ✅ INDEXED                                                            ║
║   ├── 225 MIT courses indexed                                                           ║
║   ├── 285 algorithms mapped                                                             ║
║   └── 87.8% engine coverage                                                             ║
║                                                                                         ║
║   CLAUDE FLOW: ✅ CONFIGURED                                                            ║
║   ├── 5 background workers ready                                                        ║
║   ├── 8 agents configured                                                               ║
║   └── 2 workflows defined                                                               ║
║                                                                                         ║
║   NEXT SESSION: 1.A.1 - Extract Materials Databases (6 databases)                       ║
║                                                                                         ║
╚════════════════════════════════════════════════════════════════════════════════════════╝
```

---

# 📎 PART 14: PATH QUICK REFERENCE

```
PRIMARY WORK (User's C: Drive):
══════════════════════════════
Root:      C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\
State:     [ROOT]\CURRENT_STATE.json
Docs:      [ROOT]\_DOCS\
Skills:    [ROOT]\_SKILLS\
Extracted: [ROOT]\EXTRACTED\[category]\
Logs:      [ROOT]\SESSION_LOGS\
Courses:   [ROOT]\MIT COURSES\
Scripts:   [ROOT]\SCRIPTS\

CONTAINER (Claude's Environment - TEMPORARY):
═════════════════════════════════════════════
Skills:    /mnt/skills/user/prism-*/SKILL.md
Project:   /mnt/project/*.md
Temp:      /home/claude/ (RESETS!)
Outputs:   /mnt/user-data/outputs/
```

---

# 💾 PART 15: FINAL REMINDER

```
╔════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                         ║
║   AT SESSION START:                                                                     ║
║   1. Read CURRENT_STATE.json                                                            ║
║   2. Verify folder access                                                               ║
║   3. Read latest session log                                                            ║
║   4. Announce session start                                                             ║
║   5. Update state to IN_PROGRESS                                                        ║
║                                                                                         ║
║   DURING SESSION:                                                                       ║
║   1. Update state every 3-5 tool calls                                                  ║
║   2. Save work to C: drive only                                                         ║
║   3. Document progress and decisions                                                    ║
║                                                                                         ║
║   AT SESSION END:                                                                       ║
║   1. Update CURRENT_STATE.json completely                                               ║
║   2. Write session log                                                                  ║
║   3. Announce completion with next steps                                                ║
║   4. Remind about backup                                                                ║
║                                                                                         ║
║   ═══════════════════════════════════════════════════════════════════════════════════   ║
║                                                                                         ║
║   STATE FILE:   C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json       ║
║                                                                                         ║
║   CORE RULES:                                                                           ║
║   • NO MODULE WITHOUT CONSUMERS                                                         ║
║   • NO CALCULATION WITH <6 SOURCES                                                      ║
║   • STATE LIVES ON DISK, NOT IN CHAT                                                    ║
║   • NEVER SAVE PRISM WORK TO CONTAINER                                                  ║
║                                                                                         ║
╚════════════════════════════════════════════════════════════════════════════════════════╝
```

---

**END OF PRISM ULTIMATE DEVELOPMENT MASTER v6.0**

```
═══════════════════════════════════════════════════════════════════════════════════════════
VERSION HISTORY:
v6.0 - Multi-agent orchestration, dual filesystem, full tool integration, 220+ courses
v5.0 - State management, hierarchical architecture
v4.x - Hybrid rebuild approach
v3.x - Previous iterations

CHANGES FROM v5.0:
+ Part 1: Dual Filesystem Architecture (NEW - critical change)
+ Part 2: Available Tools & Skills (NEW - 10 skills documented)
+ Part 3: Claude Flow V3 Multi-Agent Orchestration (NEW)
+ Part 4: MIT/Stanford Knowledge Base (NEW - 220+ courses)
+ Part 10: Quick Start Commands (NEW)
+ Part 12: Recovery Protocols (expanded with memory/past chats)
+ Updated all paths and tool references
+ Integrated Desktop Commander, Box tools, memory system
+ Streamlined for clarity and usability

TOTAL: 15 Parts
MODULES: 831 (7 extracted)
SKILLS: 10 PRISM-specific
COURSES: 220+ indexed
ALGORITHMS: 285 mapped
═══════════════════════════════════════════════════════════════════════════════════════════
```

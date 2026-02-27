# PRISM MANUFACTURING INTELLIGENCE
# ULTIMATE DEVELOPMENT MASTER v7.0
## COMPLETE REFERENCE: MULTI-AGENT + TOOLS + FULL MODULE LISTINGS
### Strategy: EXTRACT → ARCHITECT → MIGRATE WITH 100% UTILIZATION

**Created:** January 22, 2026  
**Version:** 7.0.0 - COMPLETE REFERENCE (v5.0 content + v6.0 enhancements)  
**SUPERSEDES:** v6.0, v5.0 and all previous versions  
**Source Build:** v8.89.002 (986,621 lines, 831 modules, ~48MB)

---

# 🔰 PART 0: CLAUDE'S ROLE & CAPABILITIES

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
║   RESPONSIBILITIES:                                                                     ║
║   • Extract, audit, and migrate 831 modules from monolith                               ║
║   • Design and implement hierarchical database architecture                             ║
║   • Ensure 100% utilization of all databases and engines                                ║
║   • Maintain state continuity across sessions via CURRENT_STATE.json                    ║
║   • Document all work in session logs                                                   ║
║   • Never lose data, features, or functionality during development                      ║
║                                                                                         ║
║   AUTHORITY:                                                                            ║
║   • Full read/write access to C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\           ║
║   • Direct filesystem operations (no downloads needed)                                  ║
║   • Architectural decision-making within established principles                         ║
║   • Session management and state tracking                                               ║
║                                                                                         ║
║   CONSTRAINTS:                                                                          ║
║   • Must follow the 10 Commandments (Part 5)                                            ║
║   • Must maintain state in CURRENT_STATE.json                                           ║
║   • Must never save to container filesystem (resets between sessions)                   ║
║   • Must verify work before and after every operation                                   ║
║   • Must preserve ALL existing data, databases, modules, engines, algorithms            ║
║                                                                                         ║
╠════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                         ║
║   EXPANDED CAPABILITIES (v6.0+):                                                        ║
║   ════════════════════════════════                                                      ║
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
║                                                                                         ║
║   8. WEB SEARCH & PDF TOOLS                                                             ║
║      • Real-time research, documentation access                                         ║
║      • PDF analysis, form filling, bulk processing                                      ║
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
│   └── PRISM_v8_89_002_TRUE_100_PERCENT.zip
│
├── _DOCS\                          ← Documentation (including this file)
│   ├── PRISM_ULTIMATE_DEVELOPMENT_MASTER_v7.0.md (THIS FILE)
│   └── _ARCHIVE\                   ← Old versions
│
├── _SKILLS\                        ← Local skill copies (10 skills)
├── _CLAUDE_FLOW\                   ← Multi-agent configuration
├── _PROJECT_FILES\                 ← Project knowledge files
├── _SESSION_ARCHIVES\              ← Completed session ZIPs
│
├── EXTRACTED\                      ← Modular extracted components
│   ├── machines\
│   │   ├── CORE\                   ← Infrastructure DBs from monolith
│   │   ├── ENHANCED\               ← Full kinematic specs (33 manufacturers)
│   │   ├── USER\                   ← Shop-specific customizations (future)
│   │   └── LEARNED\                ← AI-derived optimizations (future)
│   ├── materials\                  ← Material databases
│   ├── tools\                      ← Tool databases
│   ├── engines\                    ← Physics, AI, optimization engines
│   ├── knowledge_bases\            ← KB modules
│   └── [other categories]\
│
├── MIT COURSES\                    ← 220+ indexed courses
│   ├── MIT_COURSE_INDEX.json       ← Complete course index
│   ├── ALGORITHM_REGISTRY.json     ← 285 algorithms mapped
│   └── PRISM_COURSE_CATALOG.json   ← Course-to-PRISM mapping
│
├── RESOURCES\                      ← Reference materials
│   ├── CAD FILES\                  ← Part STEP files
│   ├── GENERIC MACHINE MODELS\     ← 33 kinematic templates
│   ├── MANUFACTURER CATALOGS\      ← PDF catalogs
│   └── TOOL HOLDER CAD FILES\      ← Tool holder models
│
├── SESSION_LOGS\                   ← Per-session detailed logs
│   └── SESSION_X_XXX_LOG.md
│
├── SCRIPTS\                        ← Automation scripts
│
└── ZIP FILES FROM CLAUDE\          ← Session output ZIPs
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

## 1.3 Filesystem Tool Usage

```javascript
// READING STATE (do this first every session!)
Filesystem:read_file
  path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\CURRENT_STATE.json"

// WRITING STATE (do this frequently!)
Filesystem:write_file
  path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\CURRENT_STATE.json"
  content: [updated JSON]

// WRITING FILES (always to LOCAL folder!)
Filesystem:write_file
  path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\EXTRACTED\\machines\\ENHANCED\\PRISM_XXX.js"
  content: [file content]

// READING LOCAL FILES
Filesystem:read_file
  path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\[path]"

// CREATING DIRECTORIES
Filesystem:create_directory
  path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\EXTRACTED\\[new_folder]"

// LISTING CONTENTS
Filesystem:list_directory
  path: "C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\[path]"

// MOVING/RENAMING
Filesystem:move_file
  source: [old path]
  destination: [new path]
```

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

---

# 🎯 PART 5: THE 10 COMMANDMENTS

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

# 🗂️ PART 6: HIERARCHICAL DATABASE ARCHITECTURE

```
╔════════════════════════════════════════════════════════════════════════════════════════╗
║                    HIERARCHICAL DATABASE DESIGN PRINCIPLE                               ║
║                                                                                         ║
║   Changes at higher levels AUTO-PROPAGATE to lower levels.                              ║
║   Lower levels can OVERRIDE but not DELETE higher-level data.                           ║
║                                                                                         ║
╚════════════════════════════════════════════════════════════════════════════════════════╝
```

## 6.1 The Four Database Layers

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  LAYER 4: LEARNED (Auto-generated)                                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                                       │
│  • AI/ML-derived optimizations                                                          │
│  • Pattern recognition results                                                          │
│  • Historical performance data                                                          │
│  • Confidence scores and uncertainties                                                  │
│  → Inherits from: USER → ENHANCED → CORE                                                │
│  → Can override: USER, ENHANCED, CORE (with confidence thresholds)                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  LAYER 3: USER (Shop-specific)                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                                           │
│  • Shop-specific machine configurations                                                 │
│  • Custom tooling preferences                                                           │
│  • Local material specifications                                                        │
│  • Operator experience factors                                                          │
│  → Inherits from: ENHANCED → CORE                                                       │
│  → Can override: ENHANCED, CORE                                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  LAYER 2: ENHANCED (Manufacturer-specific)                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                               │
│  • Full kinematic specifications                                                        │
│  • Detailed machine capabilities                                                        │
│  • Manufacturer-recommended parameters                                                  │
│  • 3D models and CAD references                                                         │
│  → Inherits from: CORE                                                                  │
│  → Can override: CORE                                                                   │
│  → STATUS: 33 manufacturers complete                                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  LAYER 1: CORE (Infrastructure)                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                                          │
│  • Base database schemas                                                                │
│  • Default values and ranges                                                            │
│  • Universal constants                                                                  │
│  • Validation rules                                                                     │
│  → Foundation layer - cannot be overridden, only extended                               │
│  → STATUS: 7 machine DBs need extraction from monolith                                  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 6.2 Inheritance Resolution

```javascript
// When requesting data, the system resolves through layers:
function getMachineData(machineId, property) {
  // Check LEARNED first (highest priority for performance data)
  if (LEARNED[machineId]?.[property] && LEARNED[machineId].confidence > 0.8) {
    return { value: LEARNED[machineId][property], source: 'LEARNED' };
  }
  
  // Check USER customizations
  if (USER[machineId]?.[property]) {
    return { value: USER[machineId][property], source: 'USER' };
  }
  
  // Check ENHANCED manufacturer data
  if (ENHANCED[machineId]?.[property]) {
    return { value: ENHANCED[machineId][property], source: 'ENHANCED' };
  }
  
  // Fall back to CORE defaults
  if (CORE[machineId]?.[property]) {
    return { value: CORE[machineId][property], source: 'CORE' };
  }
  
  // Return default with warning
  return { value: getDefaultForProperty(property), source: 'DEFAULT', warning: true };
}
```

## 6.3 Auto-Propagation Rules

```
WHEN ENHANCED LAYER CHANGES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. New fields automatically available to USER and LEARNED layers
2. Updated values become new defaults for USER (unless overridden)
3. LEARNED layer recalculates confidence scores
4. Validation rules from CORE are applied to new data

WHEN CORE LAYER CHANGES:
━━━━━━━━━━━━━━━━━━━━━━━━
1. All layers inherit new schema fields
2. Default values propagate up (unless overridden at higher layers)
3. Validation rules apply to ALL layers
4. Breaking changes require migration script

WHEN USER LAYER CHANGES:
━━━━━━━━━━━━━━━━━━━━━━━━
1. Only affects that user's data
2. LEARNED layer may adjust based on user patterns
3. No effect on CORE or ENHANCED

WHEN LEARNED LAYER CHANGES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Auto-updates based on usage patterns
2. Requires confidence threshold to override lower layers
3. User can reject/accept learned suggestions
```

---

# 📊 PART 7: STATE MANAGEMENT SYSTEM

```
╔════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                         ║
║   STATE LIVES ON DISK, NOT IN CHAT.                                                     ║
║                                                                                         ║
║   The context window WILL compact. Plan for it.                                         ║
║                                                                                         ║
╚════════════════════════════════════════════════════════════════════════════════════════╝
```

## 7.1 The State File: CURRENT_STATE.json

**Location:** `C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json`

This file is the SINGLE SOURCE OF TRUTH for:
- What session we're in
- What work is in progress
- What's been completed
- What's next
- Blockers and decisions

**Structure:**
```json
{
  "meta": { "lastUpdated", "lastSessionId", "nextSessionId" },
  "currentWork": { "phase", "focus", "status", "nextSteps", "blockers" },
  "extractionProgress": { /* detailed progress by category */ },
  "monolithAnalysis": { /* line numbers for key modules */ },
  "completedSessions": [ /* session history */ ],
  "architectureDecisions": { /* pending and made decisions */ },
  "quickResume": { /* instructions for resuming after compaction */ }
}
```

## 7.2 Session Start Protocol (MANDATORY)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           AT THE START OF EVERY SESSION                                  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  STEP 1: Read State File                                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━                                                                │
│  Filesystem:read_file → C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json│
│                                                                                         │
│  STEP 2: Verify Folder Access                                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━                                                             │
│  Filesystem:list_directory → C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\            │
│                                                                                         │
│  STEP 3: Read Latest Session Log (if exists)                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                             │
│  Filesystem:read_file → SESSION_LOGS/[latest]                                           │
│                                                                                         │
│  STEP 4: Announce Session Start                                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                                          │
│  "═══════════════════════════════════════════════════════════════════════════"          │
│  "STARTING SESSION [ID]: [NAME]"                                                        │
│  "Previous: [LAST_SESSION] - [STATUS]"                                                  │
│  "Focus: [CURRENT_WORK.FOCUS]"                                                          │
│  "Next Steps: [CURRENT_WORK.NEXTSTEPS]"                                                 │
│  "═══════════════════════════════════════════════════════════════════════════"          │
│                                                                                         │
│  STEP 5: Update State File                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━                                                              │
│  Set currentWork.status = "IN_PROGRESS"                                                 │
│  Update meta.lastUpdated                                                                │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 7.3 During Session: Frequent State Updates

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           DURING EVERY SESSION                                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  UPDATE STATE FILE:                                                                     │
│  • After completing each significant task                                               │
│  • Before any risky operation                                                           │
│  • Every 3-5 tool calls minimum                                                         │
│  • When making architectural decisions                                                  │
│                                                                                         │
│  WHAT TO UPDATE:                                                                        │
│  • currentWork.status and description                                                   │
│  • extractionProgress for relevant categories                                           │
│  • Add notes about what was done                                                        │
│  • Update nextSteps as tasks complete                                                   │
│                                                                                         │
│  WHY: If context compacts mid-session, the state file has everything needed to resume   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 7.4 Session End Protocol (MANDATORY)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           AT THE END OF EVERY SESSION                                    │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  STEP 1: Update State File                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━                                                               │
│  • Set currentWork.status = "COMPLETE" or "PAUSED"                                      │
│  • Update all progress counters                                                         │
│  • Set nextSteps for next session                                                       │
│  • Add session to completedSessions array                                               │
│  • Update meta.lastSessionId and nextSessionId                                          │
│                                                                                         │
│  STEP 2: Write Session Log                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━                                                               │
│  Filesystem:write_file → SESSION_LOGS/SESSION_[ID]_LOG.md                               │
│  Include: objectives, completed tasks, files created, issues, handoff notes             │
│                                                                                         │
│  STEP 3: Announce Completion                                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━                                                              │
│  "═══════════════════════════════════════════════════════════════════════════"          │
│  "COMPLETING SESSION [ID]"                                                              │
│  "✓ Completed: [LIST]"                                                                  │
│  "✓ Files saved: [LIST]"                                                                │
│  "→ Next session: [NEXT_ID] - [DESCRIPTION]"                                            │
│  "→ State saved to: CURRENT_STATE.json"                                                 │
│  "═══════════════════════════════════════════════════════════════════════════"          │
│                                                                                         │
│  STEP 4: Remind About Box Sync                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                                           │
│  "📦 Consider uploading to Box for backup/multi-computer access"                        │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 7.5 After Compaction: Recovery Protocol

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           AFTER CONTEXT COMPACTION                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  If the conversation has been compacted, Claude should:                                 │
│                                                                                         │
│  1. READ the transcript file mentioned in the compaction summary                        │
│  2. READ CURRENT_STATE.json to get current status                                       │
│  3. READ the latest session log for detailed context                                    │
│  4. CONTINUE from where we left off (currentWork.nextSteps)                             │
│                                                                                         │
│  The state file contains everything needed to resume seamlessly.                        │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# 📋 PART 8: COMPLETE EXTRACTION MANIFEST (831 Modules Total)

## 8.1 CATEGORY A: DATABASES (62 Total)

### MATERIALS DATABASES (6):
```
├── PRISM_MATERIAL_KC_DATABASE          - Kienzle cutting coefficients
├── PRISM_ENHANCED_MATERIAL_DATABASE    - Enhanced material properties
├── PRISM_EXTENDED_MATERIAL_CUTTING_DB  - Extended cutting data
├── PRISM_JOHNSON_COOK_DATABASE         - Johnson-Cook parameters
├── PRISM_MATERIALS_MASTER              - Master material registry (618 materials)
└── PRISM_CONSOLIDATED_MATERIALS        - Consolidated material data
```

### MACHINE DATABASES (7 CORE):
```
├── PRISM_POST_MACHINE_DATABASE         - Post processor machine configs [line 136163]
├── PRISM_LATHE_MACHINE_DB              - Lathe specifications [line 278625]
├── PRISM_LATHE_V2_MACHINE_DATABASE_V2  - Lathe V2 specifications [line 120973]
├── PRISM_MACHINE_3D_DATABASE           - 3D machine models [line 319283]
├── PRISM_MACHINE_3D_MODEL_DATABASE_V2  - 3D models V2 [line 54014]
├── PRISM_MACHINE_3D_MODEL_DATABASE_V3  - 3D models V3 [line 54613]
└── PRISM_OKUMA_MACHINE_CAD_DATABASE    - Okuma-specific CAD models [line 529636]
```

### TOOL DATABASES (7):
```
├── PRISM_TOOL_DATABASE_V7              - Master tool database
├── PRISM_CUTTING_TOOL_DATABASE_V2      - Cutting tool specs
├── PRISM_STEEL_ENDMILL_DB_V2           - Steel end mill data
├── PRISM_TOOL_PROPERTIES_DATABASE      - Tool properties
├── PRISM_TOOL_HOLDER_3D_DATABASE       - Tool holder 3D models
├── PRISM_AI_TOOLPATH_DATABASE          - AI toolpath data
└── PRISM_TDM_TOOL_MANAGEMENT_DATABASE  - Tool management
```

### WORKHOLDING DATABASES (10):
```
├── PRISM_WORKHOLDING_DATABASE          - Master workholding
├── PRISM_FIXTURE_DATABASE              - Fixture data
├── PRISM_HYPERMILL_FIXTURE_DATABASE    - HyperMill fixtures
├── PRISM_KURT_VISE_DATABASE            - Kurt vise specs
├── PRISM_CHUCK_DATABASE_V2             - Chuck specifications
├── PRISM_SCHUNK_DATABASE               - Schunk workholding
├── PRISM_SCHUNK_TOOLHOLDER_DATABASE    - Schunk tool holders
├── PRISM_LANG_DATABASE                 - Lang workholding
├── PRISM_JERGENS_DATABASE              - Jergens fixtures
└── PRISM_BIG_DAISHOWA_HOLDER_DATABASE  - Big Daishowa holders
```

### POST PROCESSOR DATABASES (7):
```
├── PRISM_CONTROLLER_DATABASE           - CNC controller definitions
├── PRISM_POST_PROCESSOR_DATABASE_V2    - Post processor configs
├── PRISM_ENHANCED_POST_DATABASE_V2     - Enhanced posts
├── PRISM_VERIFIED_POST_DATABASE_V2     - Verified posts
├── PRISM_FUSION_POST_DATABASE          - Fusion 360 posts
├── PRISM_OKUMA_LATHE_GCODE_DATABASE    - Okuma G-codes
└── PRISM_OKUMA_LATHE_MCODE_DATABASE    - Okuma M-codes
```

### PROCESS/MANUFACTURING DATABASES (6):
```
├── PRISM_MACHINING_PROCESS_DATABASE    - Machining processes
├── PRISM_OPERATION_PARAM_DATABASE      - Operation parameters
├── PRISM_SURFACE_FINISH_DATABASE       - Surface finish data
├── PRISM_THREAD_STANDARD_DATABASE      - Thread standards
├── PRISM_CNC_SAFETY_DATABASE           - CNC safety data
└── PRISM_STOCK_POSITIONS_DATABASE      - Stock positions
```

### BUSINESS/COST DATABASES (4):
```
├── PRISM_COST_DATABASE                 - Cost data
├── PRISM_COMPOUND_JOB_PROPERTIES_DATABASE - Job properties
├── PRISM_REPORT_TEMPLATES_DATABASE     - Report templates
└── PRISM_CAPABILITY_ASSESSMENT_DATABASE - Capability data
```

### AI/ML DATABASES (3):
```
├── PRISM_ML_TRAINING_PATTERNS_DATABASE - ML training patterns
├── PRISM_AI_TOOLPATH_DATABASE          - AI toolpath data
└── PRISM_AI_100_DATABASE_REGISTRY      - AI database registry
```

### CAD/CAM DATABASES (3):
```
├── PRISM_MASTER_CAD_CAM_DATABASE       - Master CAD/CAM
├── PRISM_AUTOMATION_VARIANTS_DATABASE  - Automation variants
└── PRISM_EMBEDDED_PARTS_DATABASE       - Embedded parts
```

### MANUFACTURER DATABASES (3):
```
├── PRISM_MANUFACTURER_CATALOG_DB       - Manufacturer catalogs
├── PRISM_UNIFIED_MANUFACTURER_DATABASE - Unified manufacturer
└── PRISM_MAJOR_MANUFACTURERS_CATALOG   - Major manufacturers
```

### INFRASTRUCTURE DATABASES (6):
```
├── PRISM_MASTER_DB                     - Master database
├── PRISM_DATABASE_HUB                  - Database hub
├── PRISM_DATABASE_MANAGER              - Database manager
├── PRISM_DATABASE_RETROFIT             - Database retrofit
├── PRISM_DATABASE_STATE                - Database state
└── PRISM_MACRO_DATABASE_SCHEMA         - Macro schemas
```

---

## 8.2 CATEGORY B: ENGINES (213 Total)

### CAD ENGINES (25):
```
├── PRISM_BREP_TESSELLATOR
├── PRISM_CSG_ENGINE
├── PRISM_CSG_BOOLEAN_ENGINE
├── PRISM_BSPLINE_ENGINE
├── PRISM_NURBS_ADVANCED_ENGINE
├── PRISM_BEZIER_INTERSECTION_ENGINE
├── PRISM_SKETCH_ENGINE
├── PRISM_SOLID_EDITING_ENGINE
├── PRISM_FILLETING_ENGINE
├── PRISM_VARIABLE_RADIUS_FILLET_ENGINE
├── PRISM_OFFSET_SURFACE_ENGINE
├── PRISM_SURFACE_INTERSECTION_ENGINE
├── PRISM_SURFACE_RECONSTRUCTION_ENGINE
├── PRISM_CURVATURE_ANALYSIS_ENGINE
├── PRISM_MESH_REPAIR_ENGINE
├── PRISM_MESH_DECIMATION_ENGINE
├── PRISM_MESH_BOOLEAN_ADVANCED_ENGINE
├── PRISM_MESH_SEGMENTATION_ENGINE
├── PRISM_MESH_DEFORMATION_ENGINE
├── PRISM_ADAPTIVE_TESSELLATION_ENGINE_V2
├── PRISM_BOSS_DETECTION_ENGINE
├── PRISM_COMPLETE_FEATURE_ENGINE
├── PRISM_FEATURE_CURVES_ENGINE
├── PRISM_CONSTRUCTION_GEOMETRY_ENGINE
└── PRISM_CAD_QUALITY_ASSURANCE_ENGINE
```

### CAM/TOOLPATH ENGINES (20):
```
├── PRISM_2D_TOOLPATH_ENGINE
├── PRISM_3D_TOOLPATH_STRATEGY_ENGINE
├── PRISM_MULTIAXIS_TOOLPATH_ENGINE
├── PRISM_ADAPTIVE_CLEARING_ENGINE
├── PRISM_ADAPTIVE_HSM_ENGINE
├── PRISM_REST_MACHINING_ENGINE
├── PRISM_INTELLIGENT_REST_MACHINING
├── PRISM_DEEP_HOLE_DRILLING_ENGINE
├── PRISM_HELICAL_DRILLING_ENGINE
├── PRISM_THREAD_MILLING_ENGINE
├── PRISM_LATHE_TOOLPATH_ENGINE
├── PRISM_ENTRY_EXIT_STRATEGIES
├── PRISM_AIRCUT_ELIMINATION_ENGINE
├── PRISM_RAPIDS_OPTIMIZER
├── PRISM_HYBRID_TOOLPATH_SYNTHESIZER
├── PRISM_REAL_TOOLPATH_ENGINE
├── PRISM_TOOLPATH_OPTIMIZER
├── PRISM_TOOLPATH_LINKING
├── PRISM_TOOLPATH_VERIFICATION
└── PRISM_TOOLPATH_SIMULATION
```

### PHYSICS/DYNAMICS ENGINES (42):
```
├── PRISM_CUTTING_MECHANICS_ENGINE
├── PRISM_CUTTING_THERMAL_ENGINE
├── PRISM_HEAT_TRANSFER_ENGINE
├── PRISM_THERMAL_EXPANSION_ENGINE
├── PRISM_CHATTER_PREDICTION_ENGINE
├── PRISM_VIBRATION_ANALYSIS_ENGINE
├── PRISM_TOOL_LIFE_ENGINE
├── PRISM_TOOL_WEAR_MODELS
├── PRISM_SURFACE_FINISH_ENGINE
├── PRISM_RIGID_BODY_DYNAMICS_ENGINE
├── PRISM_MATERIAL_SIMULATION_ENGINE
├── PRISM_STRESS_ANALYSIS
├── PRISM_FATIGUE
├── PRISM_FRACTURE
├── PRISM_TAYLOR_TOOL_LIFE
├── PRISM_KIENZLE_FORCE
├── PRISM_MERCHANT_FORCE
├── PRISM_STABILITY_LOBES
├── PRISM_DEFLECTION_ENGINE
├── PRISM_POWER_CALCULATION_ENGINE
├── PRISM_TORQUE_ENGINE
├── PRISM_CHIP_FORMATION_ENGINE
├── PRISM_BUILT_UP_EDGE_PREDICTOR
├── PRISM_CRATER_WEAR_MODEL
├── PRISM_FLANK_WEAR_MODEL
├── PRISM_NOTCH_WEAR_MODEL
├── PRISM_ADHESION_MODEL
├── PRISM_DIFFUSION_MODEL
├── PRISM_OXIDATION_MODEL
├── PRISM_THERMAL_SOFTENING_MODEL
├── PRISM_STRAIN_HARDENING_MODEL
├── PRISM_JOHNSON_COOK_ENGINE
├── PRISM_ZERILLI_ARMSTRONG_ENGINE
├── PRISM_PRESTON_TONKS_WALLACE
├── PRISM_COWPER_SYMONDS
├── PRISM_MTS_MODEL
├── PRISM_MECHANICAL_THRESHOLD
├── PRISM_BAMMANN_CHIESA_JOHNSON
├── PRISM_ADIABATIC_SHEAR
├── PRISM_DYNAMIC_RECRYSTALLIZATION
├── PRISM_DUCTILE_FRACTURE_ENGINE
└── PRISM_SEGMENTED_CHIP_MODEL
```

### AI/ML ENGINES (74):
```
├── PRISM_PSO_OPTIMIZER
├── PRISM_ACO_SEQUENCER
├── PRISM_BAYESIAN_SYSTEM
├── PRISM_BAYESIAN_LEARNING
├── PRISM_MONTE_CARLO
├── PRISM_MONTE_CARLO_ENGINE
├── PRISM_KALMAN_FILTER
├── PRISM_EKF_ENGINE
├── PRISM_NEURAL_NETWORK
├── PRISM_NEURAL_ENGINE_ENHANCED
├── PRISM_DQN_ENGINE
├── PRISM_ADVANCED_DQN
├── PRISM_TRANSFORMER_ENGINE
├── PRISM_ATTENTION_ENGINE
├── PRISM_GNN
├── PRISM_GNN_COMPLETE
├── PRISM_CLUSTERING_ENGINE
├── PRISM_DECISION_TREE_ENGINE
├── PRISM_ENSEMBLE_ENGINE
├── PRISM_XAI_ENGINE
├── PRISM_RANDOM_FOREST
├── PRISM_GRADIENT_BOOSTING
├── PRISM_XGBOOST_ENGINE
├── PRISM_LIGHTGBM_ENGINE
├── PRISM_CATBOOST_ENGINE
├── PRISM_SVM_ENGINE
├── PRISM_KNN_ENGINE
├── PRISM_NAIVE_BAYES
├── PRISM_LOGISTIC_REGRESSION
├── PRISM_LINEAR_REGRESSION
├── PRISM_RIDGE_REGRESSION
├── PRISM_LASSO_ENGINE
├── PRISM_ELASTIC_NET
├── PRISM_PCA_ENGINE
├── PRISM_LDA_ENGINE
├── PRISM_ICA_ENGINE
├── PRISM_TSNE_ENGINE
├── PRISM_UMAP_ENGINE
├── PRISM_AUTOENCODER
├── PRISM_VAE_ENGINE
├── PRISM_GAN_ENGINE
├── PRISM_LSTM_ENGINE
├── PRISM_GRU_ENGINE
├── PRISM_BIDIRECTIONAL_RNN
├── PRISM_CONV1D_ENGINE
├── PRISM_RESNET_ENGINE
├── PRISM_INCEPTION_ENGINE
├── PRISM_EFFICIENTNET
├── PRISM_BERT_ENCODER
├── PRISM_GPT_DECODER
├── PRISM_REINFORCEMENT_LEARNING
├── PRISM_POLICY_GRADIENT
├── PRISM_ACTOR_CRITIC
├── PRISM_PPO_ENGINE
├── PRISM_SAC_ENGINE
├── PRISM_TD3_ENGINE
├── PRISM_DDPG_ENGINE
├── PRISM_A2C_ENGINE
├── PRISM_IMITATION_LEARNING
├── PRISM_INVERSE_RL
├── PRISM_META_LEARNING
├── PRISM_FEW_SHOT_LEARNING
├── PRISM_TRANSFER_LEARNING
├── PRISM_DOMAIN_ADAPTATION
├── PRISM_MULTI_TASK_LEARNING
├── PRISM_FEDERATED_LEARNING
├── PRISM_ACTIVE_LEARNING_ENGINE
├── PRISM_ONLINE_LEARNING_ENGINE
├── PRISM_CONTINUAL_LEARNING_ENGINE
├── PRISM_CURRICULUM_LEARNING
├── PRISM_SELF_SUPERVISED
├── PRISM_CONTRASTIVE_LEARNING
├── PRISM_KNOWLEDGE_DISTILLATION
└── PRISM_NEURAL_ARCHITECTURE_SEARCH
```

### OPTIMIZATION ENGINES (44):
```
├── PRISM_MULTI_OBJECTIVE_OPTIMIZER
├── PRISM_CONSTRAINED_OPTIMIZER
├── PRISM_INTERIOR_POINT_ENGINE
├── PRISM_TRUST_REGION_OPTIMIZER
├── PRISM_METAHEURISTIC_OPTIMIZATION
├── PRISM_EVOLUTIONARY_ENHANCED_ENGINE
├── PRISM_COMBINATORIAL_OPTIMIZER
├── PRISM_LOCAL_SEARCH
├── PRISM_ROBUST_OPTIMIZATION
├── PRISM_HYPEROPT
├── PRISM_GENETIC_ALGORITHM
├── PRISM_DIFFERENTIAL_EVOLUTION
├── PRISM_EVOLUTION_STRATEGY
├── PRISM_CMA_ES
├── PRISM_NSGA2
├── PRISM_NSGA3
├── PRISM_MOEAD
├── PRISM_SPEA2
├── PRISM_SIMULATED_ANNEALING
├── PRISM_TABU_SEARCH
├── PRISM_VARIABLE_NEIGHBORHOOD
├── PRISM_GRASP
├── PRISM_ITERATED_LOCAL_SEARCH
├── PRISM_GUIDED_LOCAL_SEARCH
├── PRISM_SCATTER_SEARCH
├── PRISM_PATH_RELINKING
├── PRISM_ANT_COLONY_OPTIMIZATION
├── PRISM_BEE_ALGORITHM
├── PRISM_FIREFLY_ALGORITHM
├── PRISM_CUCKOO_SEARCH
├── PRISM_BAT_ALGORITHM
├── PRISM_WHALE_OPTIMIZATION
├── PRISM_GREY_WOLF_OPTIMIZER
├── PRISM_HARRIS_HAWKS
├── PRISM_AQUILA_OPTIMIZER
├── PRISM_ARITHMETIC_OPTIMIZATION
├── PRISM_SLIME_MOULD
├── PRISM_EQUILIBRIUM_OPTIMIZER
├── PRISM_GRADIENT_DESCENT
├── PRISM_ADAM_OPTIMIZER
├── PRISM_RMSPROP
├── PRISM_ADAGRAD
├── PRISM_ADADELTA
└── PRISM_NADAM
```

### SIGNAL PROCESSING ENGINES (14):
```
├── PRISM_FFT_PREDICTIVE_CHATTER
├── PRISM_WAVELET_CHATTER
├── PRISM_SIGNAL_PROCESSING
├── PRISM_SIGNAL_ENHANCED
├── PRISM_STFT_ENGINE
├── PRISM_HILBERT_TRANSFORM
├── PRISM_EMD_ENGINE
├── PRISM_EEMD_ENGINE
├── PRISM_VMD_ENGINE
├── PRISM_WELCH_PSD
├── PRISM_PERIODOGRAM
├── PRISM_COHERENCE_ENGINE
├── PRISM_CROSS_CORRELATION
└── PRISM_AUTOCORRELATION
```

### POST PROCESSOR ENGINES (25):
```
├── PRISM_POST_PROCESSOR_GENERATOR
├── PRISM_INTERNAL_POST_ENGINE
├── PRISM_UNIVERSAL_POST_GENERATOR_V
├── PRISM_GUARANTEED_POST_PROCESSOR
├── PRISM_GCODE_PROGRAMMING_ENGINE
├── PRISM_GCODE_BACKPLOT_ENGINE
├── PRISM_GCODE_PARSER
├── PRISM_GCODE_OPTIMIZER
├── PRISM_GCODE_VALIDATOR
├── PRISM_MACRO_PROCESSOR
├── PRISM_CANNED_CYCLE_ENGINE
├── PRISM_SUBPROGRAM_ENGINE
├── PRISM_VARIABLE_ENGINE
├── PRISM_COORDINATE_TRANSFORM
├── PRISM_TOOL_COMPENSATION
├── PRISM_FIXTURE_OFFSET
├── PRISM_WORK_OFFSET
├── PRISM_PROBING_CYCLES
├── PRISM_HIGH_SPEED_MACHINING
├── PRISM_SMOOTH_TOLERANCE
├── PRISM_LOOKAHEAD_ENGINE
├── PRISM_BLOCK_DELETE
├── PRISM_OPTIONAL_STOP
├── PRISM_COMMENT_ENGINE
└── PRISM_NC_OUTPUT_FORMATTER
```

### COLLISION/SIMULATION ENGINES (15):
```
├── PRISM_COLLISION_ENGINE
├── PRISM_ADVANCED_COLLISION_ENGINE
├── PRISM_INTELLIGENT_COLLISION_SYSTEM
├── PRISM_PROBABILISTIC_COLLISION
├── PRISM_MACHINE_SIMULATION_ENGINE
├── PRISM_VERICUT_STYLE_SIMULATION
├── PRISM_STOCK_SIMULATION
├── PRISM_MATERIAL_REMOVAL
├── PRISM_GOUGE_DETECTION
├── PRISM_UNDERCUT_DETECTION
├── PRISM_RAPID_COLLISION
├── PRISM_HOLDER_COLLISION
├── PRISM_FIXTURE_COLLISION
├── PRISM_AXIS_LIMIT_CHECK
└── PRISM_SINGULARITY_DETECTION
```

---

## 8.3 CATEGORY C: KNOWLEDGE BASES (14 Total)

```
├── PRISM_KNOWLEDGE_BASE                - Core knowledge base
├── PRISM_KNOWLEDGE_GRAPH               - Knowledge graph
├── PRISM_KNOWLEDGE_FUSION              - Knowledge fusion
├── PRISM_AI_KNOWLEDGE_INTEGRATION      - AI knowledge integration
├── PRISM_ALGORITHMS_KB                 - Algorithms knowledge base
├── PRISM_DATA_STRUCTURES_KB            - Data structures KB
├── PRISM_MFG_STRUCTURES_KB             - Manufacturing structures KB
├── PRISM_AI_STRUCTURES_KB              - AI structures KB
├── PRISM_SYSTEMS_KB                    - Systems KB
├── PRISM_AI_100_KB_CONNECTOR           - AI 100% KB connector
├── PRISM_KNOWLEDGE_AI_CONNECTOR        - Knowledge AI connector
├── PRISM_KNOWLEDGE_INTEGRATION_ROUTES  - Knowledge routes
├── PRISM_KNOWLEDGE_INTEGRATION_TESTS   - Knowledge tests
└── PRISM_PHASE7_KNOWLEDGE              - Phase 7 knowledge
```

---

## 8.4 CATEGORY D: SYSTEMS & CORES (31 Total)

```
├── PRISM_GATEWAY                       - Central routing (500+ routes)
├── PRISM_GATEWAY_ENHANCED              - Enhanced gateway
├── PRISM_EVENT_BUS                     - Pub/sub events
├── PRISM_STATE_STORE                   - Centralized state
├── PRISM_ERROR_BOUNDARY                - Error handling
├── PRISM_VALIDATOR                     - Input validation
├── PRISM_COMPARE                       - Float-safe comparisons
├── PRISM_UNITS                         - Unit conversion
├── PRISM_UNITS_ENHANCED                - Enhanced units
├── PRISM_CONSTANTS                     - Immutable constants
├── PRISM_UI_ADAPTER                    - UI abstraction
├── PRISM_CAPABILITY_REGISTRY           - Module capabilities
├── PRISM_INIT_ORCHESTRATOR             - Initialization
├── PRISM_MASTER_ORCHESTRATOR           - Master orchestration
├── PRISM_MODULE_LOADER                 - Dynamic loading
├── PRISM_DEPENDENCY_RESOLVER           - Dependency resolution
├── PRISM_PLUGIN_SYSTEM                 - Plugin architecture
├── PRISM_HOOK_SYSTEM                   - Extension hooks
├── PRISM_MIDDLEWARE                    - Middleware pipeline
├── PRISM_CACHE_MANAGER                 - Caching
├── PRISM_STORAGE_MANAGER               - Storage abstraction
├── PRISM_SESSION_MANAGER               - Session handling
├── PRISM_AUTH_MANAGER                  - Authentication
├── PRISM_PERMISSION_MANAGER            - Permissions
├── PRISM_AUDIT_LOGGER                  - Audit logging
├── PRISM_METRICS_COLLECTOR             - Metrics
├── PRISM_HEALTH_CHECKER                - Health checks
├── PRISM_FEATURE_FLAGS                 - Feature toggles
├── PRISM_CONFIG_MANAGER                - Configuration
├── PRISM_ENV_MANAGER                   - Environment
└── PRISM_SECRET_MANAGER                - Secrets handling
```

---

## 8.5 CATEGORY E: LEARNING MODULES (30 Total)

```
├── PRISM_AI_LEARNING_PIPELINE          - Learning pipeline
├── PRISM_LEARNING_ENGINE               - Core learning
├── PRISM_LEARNING_PERSISTENCE_ENGINE   - Learning persistence
├── PRISM_LEARNING_FEEDBACK_CONNECTOR   - Feedback connector
├── PRISM_CAD_LEARNING_BRIDGE           - CAD learning
├── PRISM_CAM_LEARNING_ENGINE           - CAM learning
├── PRISM_QUOTING_LEARNING              - Quote learning
├── PRISM_SHOP_LEARNING_ENGINE          - Shop learning
├── PRISM_ONLINE_LEARNING               - Online learning
├── PRISM_CONTINUAL_LEARNING            - Continual learning
├── PRISM_ACTIVE_LEARNING               - Active learning
├── PRISM_REINFORCEMENT_LEARNER         - RL learner
├── PRISM_BANDIT_LEARNER                - Multi-armed bandit
├── PRISM_CONTEXTUAL_BANDIT             - Contextual bandit
├── PRISM_THOMPSON_SAMPLING             - Thompson sampling
├── PRISM_UCB_LEARNER                   - Upper confidence bound
├── PRISM_EXPERIENCE_REPLAY             - Experience replay
├── PRISM_PRIORITY_REPLAY               - Prioritized replay
├── PRISM_HINDSIGHT_REPLAY              - Hindsight experience
├── PRISM_MODEL_BASED_LEARNER           - Model-based RL
├── PRISM_WORLD_MODEL                   - World model
├── PRISM_CURIOSITY_DRIVEN              - Curiosity learning
├── PRISM_INTRINSIC_MOTIVATION          - Intrinsic motivation
├── PRISM_REWARD_SHAPING                - Reward shaping
├── PRISM_INVERSE_REWARD                - Inverse RL rewards
├── PRISM_PREFERENCE_LEARNING           - Preference learning
├── PRISM_HUMAN_FEEDBACK                - Human feedback
├── PRISM_ANNOTATION_LEARNER            - Annotation learning
├── PRISM_WEAK_SUPERVISION              - Weak supervision
└── PRISM_SELF_TRAINING                 - Self-training
```

---

## 8.6 CATEGORY F: BUSINESS/QUOTING (22 Total)

```
├── PRISM_QUOTING_ENGINE                - Quote generation
├── PRISM_JOB_COSTING_ENGINE            - Job costing
├── PRISM_COST_ESTIMATION               - Cost estimation
├── PRISM_SCHEDULING_ENGINE             - Scheduling
├── PRISM_JOB_SHOP_SCHEDULING_ENGINE    - Job shop scheduling
├── PRISM_PRODUCTION_SCHEDULER          - Production scheduling
├── PRISM_INVENTORY_ENGINE              - Inventory
├── PRISM_PURCHASING_SYSTEM             - Purchasing
├── PRISM_CUSTOMER_MANAGER              - Customer management
├── PRISM_ORDER_MANAGER                 - Order management
├── PRISM_FINANCIAL_ENGINE              - Financial calculations
├── PRISM_INVOICE_ENGINE                - Invoicing
├── PRISM_PAYMENT_PROCESSOR             - Payments
├── PRISM_TAX_CALCULATOR                - Tax calculations
├── PRISM_SHIPPING_ENGINE               - Shipping
├── PRISM_DELIVERY_SCHEDULER            - Delivery scheduling
├── PRISM_CAPACITY_PLANNER              - Capacity planning
├── PRISM_RESOURCE_ALLOCATOR            - Resource allocation
├── PRISM_WORKLOAD_BALANCER             - Workload balancing
├── PRISM_BOTTLENECK_ANALYZER           - Bottleneck analysis
├── PRISM_THROUGHPUT_OPTIMIZER          - Throughput optimization
└── PRISM_LEAD_TIME_PREDICTOR           - Lead time prediction
```

---

## 8.7 CATEGORY G: UI COMPONENTS (16 Total)

```
├── PRISM_UI_SYSTEM                     - Main UI system
├── PRISM_UI_SYSTEM_COMPLETE            - Complete UI
├── PRISM_MODAL_MANAGER                 - Modal management
├── PRISM_DROPDOWN_SYSTEM               - Dropdowns
├── PRISM_SLIDER_SYSTEM                 - Sliders
├── PRISM_TOAST_SYSTEM                  - Notifications
├── PRISM_CHARTS                        - Chart visualization
├── PRISM_FORMS                         - Form handling
├── PRISM_DESIGN_TOKENS                 - Design system
├── PRISM_THEME_MANAGER                 - Theming
├── PRISM_ICON_SYSTEM                   - Icons
├── PRISM_LAYOUT_ENGINE                 - Layout
├── PRISM_GRID_SYSTEM                   - Grid system
├── PRISM_RESPONSIVE_ENGINE             - Responsive design
├── PRISM_ANIMATION_ENGINE              - Animations
└── PRISM_ACCESSIBILITY_ENGINE          - Accessibility
```

---

## 8.8 CATEGORY H: LOOKUPS & CONSTANTS (20 Total)

```
├── PRISM_COATING_LOOKUP                - Coating data
├── PRISM_COOLANT_LOOKUP                - Coolant data
├── PRISM_MANUFACTURER_LOOKUP           - Manufacturer data
├── PRISM_TAYLOR_LOOKUP                 - Taylor coefficients
├── PRISM_FORCE_LOOKUP                  - Force constants
├── PRISM_DRILLING_LOOKUP               - Drilling parameters
├── PRISM_TOOL_GEOMETRY_LOOKUP          - Tool geometry
├── PRISM_SURFACE_FINISH_LOOKUP         - Surface finish
├── PRISM_WORK_HOLDING_LOOKUP           - Workholding
├── PRISM_THERMAL_LOOKUP                - Thermal data
├── PRISM_STABILITY_LOOKUP              - Stability data
├── PRISM_WEAR_LOOKUP                   - Wear data
├── PRISM_THREADING_LOOKUP              - Threading data
├── PRISM_TAPPING_LOOKUP                - Tapping data
├── PRISM_BORING_LOOKUP                 - Boring data
├── PRISM_REAMING_LOOKUP                - Reaming data
├── PRISM_GRINDING_LOOKUP               - Grinding data
├── PRISM_EDM_LOOKUP                    - EDM data
├── PRISM_LASER_LOOKUP                  - Laser data
└── PRISM_WATERJET_LOOKUP               - Waterjet data
```

---

## 8.9 CATEGORY I: MANUFACTURER-SPECIFIC (44+ Catalogs/Modules)

```
├── PRISM_ZENI_COMPLETE_CATALOG         - Zeni tools
├── PRISM_MAJOR_MANUFACTURERS_CATALOG   - Major manufacturers
├── PRISM_MANUFACTURERS_CATALOG_BATCH2  - Batch 2 catalogs
├── PRISM_OKUMA_LATHE_INTEGRATION       - Okuma integration
├── PRISM_SIEMENS_840D                  - Siemens 840D
├── PRISM_SIEMENS_SINUMERIK             - Sinumerik
├── PRISM_FANUC_SERIES                  - Fanuc series
├── PRISM_MAZAK_SMOOTH                  - Mazak Smooth
├── PRISM_HAAS_NGC                      - Haas NGC
├── PRISM_HEIDENHAIN_TNC               - Heidenhain TNC
├── PRISM_MITSUBISHI_MELDAS            - Mitsubishi Meldas
├── PRISM_SANDVIK_COROMANT             - Sandvik tools
├── PRISM_KENNAMETAL_CATALOG           - Kennametal
├── PRISM_ISCAR_CATALOG                - Iscar
├── PRISM_SECO_CATALOG                 - Seco
├── PRISM_WALTER_CATALOG               - Walter
├── PRISM_MITSUBISHI_TOOLS             - Mitsubishi tools
├── PRISM_KYOCERA_CATALOG              - Kyocera
├── PRISM_SUMITOMO_CATALOG             - Sumitomo
├── PRISM_TUNGALOY_CATALOG             - Tungaloy
├── PRISM_OSG_CATALOG                  - OSG
├── PRISM_GUHRING_CATALOG              - Guhring
├── PRISM_EMUGE_CATALOG                - Emuge
├── PRISM_DORMER_CATALOG               - Dormer
├── PRISM_NIAGARA_CATALOG              - Niagara
├── PRISM_HARVEY_CATALOG               - Harvey Tool
├── PRISM_HELICAL_CATALOG              - Helical
├── PRISM_ACCUSIZE_CATALOG             - Accusize
├── PRISM_MARITOOL_CATALOG             - Maritool
├── PRISM_GLACERN_CATALOG              - Glacern
├── PRISM_PARLEC_CATALOG               - Parlec
├── PRISM_TECHNIKS_CATALOG             - Techniks
├── PRISM_COMMAND_CATALOG              - Command
├── PRISM_REGO_FIX_CATALOG             - Rego-Fix
├── PRISM_NT_TOOL_CATALOG              - NT Tool
├── PRISM_LYNDEX_CATALOG               - Lyndex-Nikken
├── PRISM_PIONEER_CATALOG              - Pioneer
├── PRISM_ERICKSON_CATALOG             - Erickson
├── PRISM_KOMET_CATALOG                - Komet
├── PRISM_MAPAL_CATALOG                - Mapal
├── PRISM_HORN_CATALOG                 - Horn
├── PRISM_INGERSOLL_CATALOG            - Ingersoll
├── PRISM_VARDEX_CATALOG               - Vardex
└── + More manufacturer catalogs...
```

---

## 8.10 CATEGORY J: PHASE MODULES (46 Total)

```
PHASE 1 MODULES:
├── PRISM_PHASE1_COORDINATOR
├── PRISM_PHASE1_ALGORITHMS
├── PRISM_PHASE1_INTEGRATION
├── PRISM_PHASE1_SELF_TEST
└── [+ related modules]

PHASE 2 MODULES:
├── PRISM_PHASE2_COORDINATOR
├── PRISM_PHASE2_ALGORITHMS
├── PRISM_PHASE2_INTEGRATION
├── PRISM_PHASE2_SELF_TEST
└── [+ related modules]

PHASE 3 MODULES:
├── PRISM_PHASE3_COORDINATOR
├── PRISM_PHASE3_ALGORITHMS
├── PRISM_PHASE3_INTEGRATION
├── PRISM_PHASE3_SELF_TEST
└── [+ related modules]

PHASE 4 MODULES:
├── PRISM_PHASE4_COORDINATOR
├── PRISM_PHASE4_ALGORITHMS
├── PRISM_PHASE4_INTEGRATION
├── PRISM_PHASE4_SELF_TEST
└── [+ related modules]
```

---

# 🔄 PART 9: THE FOUR STAGES

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         HYBRID REBUILD - FOUR STAGES                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  STAGE 0: PREPARATION                    ✅ COMPLETE                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                                       │
│  • Create this development prompt ✓                                                     │
│  • Set up folder structure ✓                                                            │
│  • Implement state management system ✓                                                  │
│  • Define hierarchical database architecture ✓                                          │
│  Duration: 1-2 sessions                                                                 │
│                                                                                         │
│  STAGE 1: EXTRACTION                     ⬅️ CURRENT FOCUS                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━                                                              │
│  • Extract ALL 831 modules into categorized files                                       │
│  • Audit each module for completeness                                                   │
│  • Document dependencies (what each module NEEDS)                                       │
│  • Document outputs (what each module PRODUCES)                                         │
│  Duration: 15-25 micro-sessions (with Claude Flow)                                      │
│                                                                                         │
│  STAGE 2: ARCHITECTURE                                                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━                                                             │
│  • Build PRISM_CORE with enforcement mechanisms                                         │
│  • Create PRISM_DATA_BUS for mandatory wiring                                           │
│  • Implement utilization verification that BLOCKS incomplete modules                    │
│  • Design the UI shell                                                                  │
│  Duration: 3-5 micro-sessions                                                           │
│                                                                                         │
│  STAGE 3: MIGRATION WITH 100% WIRING                                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                                 │
│  • Import databases ONE AT A TIME with ALL consumers                                    │
│  • Import engines with ALL use cases                                                    │
│  • Verify utilization after each import                                                 │
│  • NO module enters without 100% wiring proof                                           │
│  Duration: 50-100 micro-sessions                                                        │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

# 📋 PART 10: MICRO-SESSION STRUCTURE

## 10.1 Session Boundaries

**CRITICAL: Each micro-session must be:**
- Completable in ONE Claude conversation (~10-15 exchanges)
- Self-contained (doesn't require previous session context in memory)
- Verifiable (clear success criteria)
- Documented (produces handoff artifact)

**Maximum session scope:**
- 500-1000 lines of extracted/new code
- OR 20-30 database entries with full consumer wiring
- OR 1-3 complete module extractions with documentation

## 10.2 Session Naming Convention

```
STAGE.CATEGORY.NUMBER - DESCRIPTION

STAGE 0: Preparation
  0.0.1 - Create Development Prompt (this document)
  0.0.2 - Create Data Flow Architecture
  0.0.3 - Create Utilization Enforcement Spec

STAGE 1: Extraction
  1.A.1 - Extract Materials Databases (6 databases)
  1.A.2 - Extract Machine Databases (7 databases)
  1.A.3 - Extract Tool Databases (7 databases)
  1.A.4 - Extract Workholding Databases (10 databases)
  1.A.5 - Extract Post Processor Databases (7 databases)
  1.A.6 - Extract Process Databases (6 databases)
  1.A.7 - Extract Business Databases (4 databases)
  1.A.8 - Extract AI/ML Databases (3 databases)
  1.A.9 - Extract CAD/CAM Databases (3 databases)
  1.A.10 - Extract Manufacturer Databases (3 databases)
  1.A.11 - Extract Infrastructure Databases (6 databases)
  
  1.B.1 - Extract CAD Engines (25 engines)
  1.B.2 - Extract CAM Engines (20 engines)
  1.B.3 - Extract Physics Engines Part 1 (21 engines)
  1.B.4 - Extract Physics Engines Part 2 (21 engines)
  1.B.5 - Extract AI/ML Engines Part 1 (25 engines)
  1.B.6 - Extract AI/ML Engines Part 2 (25 engines)
  1.B.7 - Extract AI/ML Engines Part 3 (24 engines)
  1.B.8 - Extract Optimization Engines (44 engines)
  1.B.9 - Extract Signal Processing Engines (14 engines)
  1.B.10 - Extract Post Processor Engines (25 engines)
  1.B.11 - Extract Collision/Simulation Engines (15 engines)
  
  1.C.1 - Extract Knowledge Bases (14 KBs)
  1.D.1 - Extract Systems & Cores (31 modules)
  1.E.1 - Extract Learning Modules (30 modules)
  1.F.1 - Extract Business Modules (22 modules)
  1.G.1 - Extract UI Components (16 modules)
  1.H.1 - Extract Lookups & Constants (20 modules)
  1.I.1 - Extract Manufacturer Catalogs Part 1 (22 catalogs)
  1.I.2 - Extract Manufacturer Catalogs Part 2 (22 catalogs)
  1.J.1 - Extract Phase Modules (46 modules)

STAGE 2: Architecture
  2.1.1 - Build PRISM_CORE Framework
  2.1.2 - Build PRISM_DATA_BUS
  2.1.3 - Build Utilization Enforcer
  2.1.4 - Build UI Shell
  2.1.5 - Build Test Framework

STAGE 3: Migration
  3.1.1 - Migrate PRISM_CONSTANTS + All Consumers
  3.1.2 - Migrate PRISM_UNITS + All Consumers
  3.1.3 - Migrate PRISM_VALIDATOR + All Consumers
  3.1.4 - Migrate PRISM_GATEWAY + All Consumers
  ...
  3.2.1 - Migrate PRISM_MATERIALS_MASTER + All Consumers (15+ consumers)
  3.2.2 - Migrate PRISM_MACHINES_DATABASE + All Consumers (12+ consumers)
  ...
```

## 10.3 Session Templates

### EXTRACTION SESSION TEMPLATE
```markdown
# SESSION [1.X.Y]: Extract [CATEGORY]
## Status: [NOT STARTED | IN PROGRESS | COMPLETE]

### Scope
- Modules to extract: [LIST]
- Expected lines: [NUMBER]
- Output files: [LIST]

### Pre-Session Checklist
☐ Read CURRENT_STATE.json
☐ Previous session handoff reviewed
☐ Source file accessible (PRISM_v8_89_002_TRUE_100_PERCENT.html)
☐ Output directory ready

### Extraction Tasks
☐ Extract module 1: [NAME]
  - Lines: [START]-[END]
  - Output: /EXTRACTED/[category]/[name].js
☐ Extract module 2: [NAME]
  ...

### Post-Extraction Audit
For each module:
☐ All functions present
☐ All data present
☐ Dependencies documented
☐ Outputs documented

### Session Handoff
- Modules extracted: [COUNT]
- Lines extracted: [COUNT]
- Issues found: [LIST]
- Next session: [ID]
- State file updated: ☐
```

### MIGRATION SESSION TEMPLATE
```markdown
# SESSION [3.X.Y]: Migrate [MODULE] + All Consumers
## Status: [NOT STARTED | IN PROGRESS | COMPLETE]

### Module Being Migrated
- Name: [PRISM_MODULE_NAME]
- Category: [DATABASE | ENGINE | SYSTEM | etc.]
- Source file: /EXTRACTED/[category]/[name].js

### Required Consumers (MUST ALL BE WIRED)
| # | Consumer | Uses These Fields | Gateway Route |
|---|----------|-------------------|---------------|
| 1 | [Consumer 1] | [fields] | [route] |
| 2 | [Consumer 2] | [fields] | [route] |
...
| 15+ | [Consumer N] | [fields] | [route] |

### Pre-Migration Checklist
☐ Read CURRENT_STATE.json
☐ Module extracted and audited
☐ All consumers identified
☐ Gateway routes designed
☐ Test cases defined

### Migration Tasks
☐ Import module to new architecture
☐ Wire consumer 1: [NAME]
☐ Wire consumer 2: [NAME]
...
☐ Wire consumer N: [NAME]
☐ Register all gateway routes
☐ Run utilization verification

### Utilization Verification (MUST PASS)
```javascript
PRISM_UTILIZATION_VERIFIER.verify('[MODULE_NAME]')
// Expected: { utilization: 100%, consumers: 15+, allWired: true }
```

### Session Handoff
- Module migrated: [NAME]
- Consumers wired: [COUNT]
- Utilization: [100%]
- Tests passing: [COUNT]
- Next session: [ID]
- State file updated: ☐
```

---

# 📊 PART 11: DATA FLOW ARCHITECTURE

## 11.1 The Utilization Matrix

Every database MUST have defined consumers. Here's the target matrix:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    DATABASE → CONSUMER UTILIZATION MATRIX                                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PRISM_MATERIALS_MASTER (618 materials) → MINIMUM 15 CONSUMERS                          │
│  ════════════════════════════════════════════════════════════════════════════           │
│  │                                                                                      │
│  ├─► PRISM_SPEED_FEED_CALCULATOR      uses: base_speed, machinability, hardness        │
│  ├─► PRISM_FORCE_CALCULATOR           uses: kc1_1, mc, yield_strength                  │
│  ├─► PRISM_THERMAL_ENGINE             uses: conductivity, specific_heat, melting_point │
│  ├─► PRISM_TOOL_LIFE_ENGINE           uses: taylor_n, taylor_C, abrasiveness           │
│  ├─► PRISM_SURFACE_FINISH_ENGINE      uses: elasticity, built_up_edge_tendency         │
│  ├─► PRISM_CHATTER_PREDICTION         uses: damping_ratio, elastic_modulus             │
│  ├─► PRISM_CHIP_FORMATION_ENGINE      uses: strain_hardening, chip_type                │
│  ├─► PRISM_COOLANT_SELECTOR           uses: reactivity, coolant_compatibility          │
│  ├─► PRISM_COATING_OPTIMIZER          uses: chemical_affinity, temperature_limit       │
│  ├─► PRISM_COST_ESTIMATOR             uses: material_cost, density                     │
│  ├─► PRISM_CYCLE_TIME_PREDICTOR       uses: all cutting parameters                     │
│  ├─► PRISM_QUOTING_ENGINE             uses: material_cost, machinability               │
│  ├─► PRISM_AI_LEARNING_PIPELINE       uses: ALL fields for ML training                 │
│  ├─► PRISM_BAYESIAN_OPTIMIZER         uses: uncertainty in parameters                  │
│  └─► PRISM_EXPLAINABLE_AI             uses: ALL for recommendation explanation         │
│                                                                                         │
│  PRISM_MACHINES_DATABASE → MINIMUM 12 CONSUMERS                                         │
│  ════════════════════════════════════════════════════════════════════════════           │
│  │                                                                                      │
│  ├─► PRISM_SPEED_FEED_CALCULATOR      uses: rpm_max, feed_max, power                   │
│  ├─► PRISM_COLLISION_ENGINE           uses: work_envelope, axis_limits                 │
│  ├─► PRISM_POST_PROCESSOR_GENERATOR   uses: controller, capabilities                   │
│  ├─► PRISM_CHATTER_PREDICTION         uses: spindle_stiffness, natural_freq            │
│  ├─► PRISM_CYCLE_TIME_PREDICTOR       uses: rapid_rates, accel/decel                   │
│  ├─► PRISM_COST_ESTIMATOR             uses: hourly_rate, efficiency                    │
│  ├─► PRISM_SCHEDULING_ENGINE          uses: availability, capabilities                 │
│  ├─► PRISM_QUOTING_ENGINE             uses: hourly_rate, setup_time                    │
│  ├─► PRISM_CAPABILITY_MATCHER         uses: ALL capability fields                      │
│  ├─► PRISM_3D_VISUALIZATION           uses: kinematics, geometry                       │
│  ├─► PRISM_AI_LEARNING_PIPELINE       uses: ALL for ML training                        │
│  └─► PRISM_EXPLAINABLE_AI             uses: ALL for explanation                        │
│                                                                                         │
│  PRISM_TOOLS_DATABASE → MINIMUM 10 CONSUMERS                                            │
│  ════════════════════════════════════════════════════════════════════════════           │
│  │                                                                                      │
│  ├─► PRISM_SPEED_FEED_CALCULATOR      uses: geometry, coating, grade                   │
│  ├─► PRISM_FORCE_CALCULATOR           uses: rake_angle, edge_radius                    │
│  ├─► PRISM_TOOL_LIFE_ENGINE           uses: substrate, coating, geometry               │
│  ├─► PRISM_DEFLECTION_ENGINE          uses: length, diameter, material                 │
│  ├─► PRISM_COLLISION_ENGINE           uses: 3D_model, holder_assembly                  │
│  ├─► PRISM_COST_ESTIMATOR             uses: tool_cost, expected_life                   │
│  ├─► PRISM_INVENTORY_ENGINE           uses: stock_level, reorder_point                 │
│  ├─► PRISM_TOOLPATH_ENGINE            uses: cutting_geometry, chip_load                │
│  ├─► PRISM_AI_LEARNING_PIPELINE       uses: ALL for ML training                        │
│  └─► PRISM_EXPLAINABLE_AI             uses: ALL for explanation                        │
│                                                                                         │
│  [Continue for ALL 62 databases...]                                                     │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## 11.2 The AI Integration Requirements

Every calculation MUST combine multiple sources:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│              CALCULATION = 6+ SOURCES × AI × PHYSICS × LEARNING                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  EXAMPLE: calculateOptimalSpeed(material, tool, machine, operation)                     │
│  ═══════════════════════════════════════════════════════════════════════                │
│                                                                                         │
│  SOURCE 1: Material Database                                                            │
│  ├── base_speed = PRISM_MATERIALS_MASTER.get(material).base_speed                       │
│  └── Contribution: 40% of initial estimate                                              │
│                                                                                         │
│  SOURCE 2: Tool Database                                                                │
│  ├── tool_factor = PRISM_TOOLS_DATABASE.get(tool).speed_factor                          │
│  └── Contribution: Modifier based on geometry, coating                                  │
│                                                                                         │
│  SOURCE 3: Machine Database                                                             │
│  ├── machine_limit = PRISM_MACHINES_DATABASE.get(machine).rpm_max                       │
│  └── Contribution: Hard constraint                                                      │
│                                                                                         │
│  SOURCE 4: Physics Engine                                                               │
│  ├── stability_limit = PRISM_CHATTER_ENGINE.calculateStableLimit(params)                │
│  └── Contribution: Physics-based constraint                                             │
│                                                                                         │
│  SOURCE 5: Historical Data                                                              │
│  ├── historical = PRISM_LEARNING_ENGINE.getBestResult(similar_params)                   │
│  └── Contribution: What actually worked before                                          │
│                                                                                         │
│  SOURCE 6: AI Recommendation                                                            │
│  ├── ai_adjust = PRISM_BAYESIAN_OPTIMIZER.recommend(all_inputs)                         │
│  └── Contribution: Learned adjustment with uncertainty                                  │
│                                                                                         │
│  FINAL CALCULATION:                                                                     │
│  optimal_speed = PRISM_FUSION_ENGINE.combine({                                          │
│      material: base_speed,                                                              │
│      tool: tool_factor,                                                                 │
│      machine: machine_limit,                                                            │
│      physics: stability_limit,                                                          │
│      historical: historical.speed,                                                      │
│      ai: ai_adjust                                                                      │
│  }, weights, constraints)                                                               │
│                                                                                         │
│  OUTPUT MUST INCLUDE:                                                                   │
│  {                                                                                      │
│      value: optimal_speed,                                                              │
│      confidence: 0.87,                                                                  │
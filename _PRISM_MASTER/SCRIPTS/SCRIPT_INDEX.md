# PRISM Script Index
## _PRISM_MASTER\SCRIPTS\ Directory
### Updated: 2026-01-25

---

## DIRECTORY STRUCTURE

```
SCRIPTS/
├── orchestrators/          ← API system, swarm control
│   ├── prism_unified_system_v4.py  (68KB, 1743 lines) - Master API orchestrator
│   ├── prism_api_worker.py         (4.5KB)            - Single agent worker
│   └── swarm_trigger.py            (6.5KB)            - Quick swarm commands
│
├── generators/             ← Material/machine data generators
│   └── materials_full_injection_v2.py (12KB)          - Bulk material section injector
│
├── validators/             ← Quality checking scripts
│   ├── regression_checker.py       (20KB, 500 lines)  - Anti-regression validation
│   └── verify_materials.py         (8KB)              - Material database validation
│
├── utilities/              ← Helper scripts
│   ├── session_enforcer.py         (14KB, 404 lines)  - Protocol enforcement
│   └── session_manager.py          (12KB)             - State management
│
└── SCRIPT_INDEX.md         ← THIS FILE
```

---

## QUICK USAGE

### API Orchestration

```powershell
# Navigate to orchestrators
cd "C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_PRISM_MASTER\SCRIPTS\orchestrators"

# Intelligent mode (auto-detect skills and agents)
python prism_unified_system_v4.py --intelligent "Your task here"

# Manufacturing analysis with verification
python prism_unified_system_v4.py --manufacturing "Ti-6Al-4V" "pocket milling"

# Ralph loop (iterate until complete)
python prism_unified_system_v4.py --ralph architect "Design X. Complete when done." 10

# List all 56 agents
python prism_unified_system_v4.py --list
```

### Session Enforcement

```powershell
# Navigate to utilities
cd "C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_PRISM_MASTER\SCRIPTS\utilities"

# Check current state and compliance
python session_enforcer.py --check

# Get resume instructions
python session_enforcer.py --resume

# Verify protocol compliance
python session_enforcer.py --verify
```

### Validation

```powershell
# Navigate to validators
cd "C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\_PRISM_MASTER\SCRIPTS\validators"

# Check for regression before any replacement
python regression_checker.py --before old_file.py --after new_file.py

# Verify materials database integrity
python verify_materials.py --path "..\..\EXTRACTED\materials"
```

---

## SCRIPT DETAILS

### prism_unified_system_v4.py (Master Orchestrator)
- **Purpose**: Coordinates all 56 API agents
- **Features**: Auto-skill detection, learning pipeline, verification chains
- **Tiers**: 15 OPUS, 32 SONNET, 9 HAIKU agents
- **Key Functions**:
  - `intelligent_swarm(prompt)` - Auto-everything
  - `verified_manufacturing_swarm(material, operation)` - 8-agent mfg analysis
  - `deep_extraction_swarm(source, files)` - Parallel extraction
  - `ralph_loop(role, prompt, max_iterations)` - Iterate until complete

### session_enforcer.py (Protocol Enforcement)
- **Purpose**: Enforces PRISM session protocols
- **Features**: State verification, restart prevention, checkpoint enforcement
- **Key Functions**:
  - `check_state()` - Verify CURRENT_STATE.json was read
  - `verify_protocol()` - Check all protocol requirements
  - `get_resume_instructions()` - What to do for IN_PROGRESS task

### regression_checker.py (Anti-Regression)
- **Purpose**: Prevents data/feature loss during replacements
- **Features**: Line count comparison, content diff, consumer verification
- **Usage**: MUST run before any file replacement

---

## RELATIONSHIP TO LEGACY _SCRIPTS

The legacy `_SCRIPTS/` directory still contains:
- All material generators (steels, aluminum, stainless, copper, etc.)
- All condition variant generators
- Database auditors
- Full toolkit

These are NOT duplicated here to avoid bloat. The scripts in `_PRISM_MASTER/SCRIPTS/` are:
- **Orchestrators**: Required for API system
- **Validators**: Required for quality gates
- **Utilities**: Required for session management

For material generation scripts, use the original `_SCRIPTS/` location.

---

## MAINTENANCE

When adding new scripts:
1. Place in appropriate subdirectory
2. Update this index
3. Update SKILL_MANIFEST.json if skill-related
4. Test with session_enforcer.py --verify

---

**Document Version:** 1.0
**Location:** _PRISM_MASTER\SCRIPTS\SCRIPT_INDEX.md

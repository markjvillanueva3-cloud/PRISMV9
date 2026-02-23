---
name: prism-python-tools
description: |
  Complete Python automation toolkit for PRISM development with 37 scripts across
  6 categories: core utilities, state management, validation, extraction, batch
  processing, and audit. Use for large file operations, batch processing, module
  extraction, material validation, and any task requiring Python automation.
---

# PRISM Python Tools
## Complete Python Automation Toolkit (37 Scripts)

**Location:** `C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SCRIPTS\`

---

## QUICK REFERENCE - When to Use What

| Task | Script | Command |
|------|--------|---------|
| Start session | `session_manager.py` | `python session_manager.py start 1.A.5` |
| Update state quickly | `update_state.py` | `python update_state.py complete "Task done"` |
| Extract module from monolith | `extract_module.py` | `python extract_module.py <file> <start> <end> <out>` |
| Validate material database | `validation/material_validator.py` | `python -m validation.material_validator file.js` |
| Check physics consistency | `validation/physics_consistency.py` | `python -m validation.physics_consistency file.js` |
| Build Level 5 machine DBs | `build_level5_databases.py` | `python build_level5_databases.py` |
| Find extraction gaps | `audit/gap_finder.py` | `python -m audit.gap_finder` |
| Generate context for Claude | `context_generator.py` | `python context_generator.py --clipboard` |

---

## SCRIPT INVENTORY BY CATEGORY

### 1. CORE UTILITIES (`core/`)

| Script | Purpose |
|--------|---------|
| `config.py` | Central configuration - paths, constants, settings |
| `logger.py` | Logging setup with console and file output |
| `utils.py` | Common utilities - load_json, save_json, file helpers |
| `__init__.py` | Package initialization |

**Usage:**
```python
from core.config import LOCAL_ROOT, EXTRACTED, MONOLITH_PATH
from core.logger import setup_logger
from core.utils import load_json, save_json

logger = setup_logger('my_script', log_file='output.log')
data = load_json('config.json')
```

---

### 2. STATE MANAGEMENT (`state/`)

| Script | Purpose |
|--------|---------|
| `state_manager.py` | Full CURRENT_STATE.json management |
| `checkpoint_system.py` | Auto-checkpoint triggers and recovery |
| `progress_tracker.py` | Track extraction/migration progress |
| `session_logger.py` | Log session actions with timestamps |
| `__init__.py` | Package initialization |

**Key Commands:**
```bash
# Quick state updates (most common)
python update_state.py complete "Extracted materials DB"
python update_state.py next "1.A.2" "Extract Machines"
python update_state.py stats databases 8
python update_state.py blocker "Waiting for file"
python update_state.py clear-blocker

# Full session management
python session_manager.py start 1.A.5
python session_manager.py status
python session_manager.py end
python session_manager.py verify
```

---

### 3. VALIDATION (`validation/`)

| Script | Purpose |
|--------|---------|
| `material_validator.py` | Validate material JS files against schema |
| `material_schema.py` | 127-parameter material schema definition |
| `physics_consistency.py` | Cross-check physics relationships |
| `batch_validator.py` | Validate multiple files at once |
| `__init__.py` | Package initialization |

**When to Use:**
- After creating/modifying material databases
- Before committing material changes
- When physics values seem wrong

**Key Commands:**
```bash
# Validate single material file
python -m validation.material_validator PRISM_CARBON_STEELS.js

# Check physics consistency (Kc vs UTS, J-C A vs yield, etc.)
python -m validation.physics_consistency PRISM_CARBON_STEELS.js

# Batch validate all materials
python -m validation.batch_validator EXTRACTED/materials/enhanced/
```

**Physics Checks Performed:**
- Kienzle Kc1.1 vs UTS correlation (should be ~3-5x UTS)
- Johnson-Cook A vs yield strength (should be close)
- Taylor n vs material hardness (softer = higher n)
- Thermal conductivity vs diffusivity consistency
- Density consistency with composition

---

### 4. EXTRACTION (`extraction/`)

| Script | Purpose |
|--------|---------|
| `module_extractor.py` | Extract modules by line range |
| `monolith_indexer.py` | Build index of all modules in monolith |
| `dependency_mapper.py` | Map module dependencies (needs/provides) |
| `extraction_auditor.py` | Verify extraction completeness |
| `__init__.py` | Package initialization |

**When to Use:**
- During Stage 1 extraction sessions
- When adding new modules to index
- To verify nothing was truncated

**Key Commands:**
```bash
# Extract single module
python extract_module.py monolith.html 136163 138500 PRISM_POST_MACHINE_DB.js

# Batch extract from index
python extract_module.py --batch monolith.html module_index.json

# Build/update monolith index
python -m extraction.monolith_indexer monolith.html

# Map dependencies
python -m extraction.dependency_mapper EXTRACTED/databases/

# Audit extraction completeness
python -m extraction.extraction_auditor PRISM_MATERIALS.js --source monolith.html
```

---

### 5. BATCH PROCESSING (`batch/`)

| Script | Purpose |
|--------|---------|
| `batch_processor.py` | Core batch framework with progress tracking |
| `material_batch.py` | Batch material operations (create, update, validate) |
| `extraction_batch.py` | Batch module extraction |
| `report_generator.py` | Generate batch operation reports |
| `__init__.py` | Package initialization |

**When to Use:**
- Processing 10+ items at once
- Creating multiple materials from template
- Extracting multiple modules

**Key Commands:**
```bash
# Batch create materials from CSV
python -m batch.material_batch create --input materials.csv --template carbon_steel

# Batch extract modules
python -m batch.extraction_batch --index extraction_index.json

# Generate report
python -m batch.report_generator --session 1.A.5
```

---

### 6. AUDIT (`audit/`)

| Script | Purpose |
|--------|---------|
| `consumer_tracker.py` | Track database consumers for 100% utilization |
| `gap_finder.py` | Find missing modules, incomplete extractions |
| `schema_checker.py` | Verify database schemas match spec |
| `utilization_report.py` | Generate utilization reports |
| `__init__.py` | Package initialization |

**When to Use:**
- Before Stage 3 migration (verify 100% utilization ready)
- Finding what's missing from extraction
- Generating progress reports

**Key Commands:**
```bash
# Find extraction gaps
python -m audit.gap_finder

# Check consumer wiring
python -m audit.consumer_tracker PRISM_MATERIALS_MASTER

# Generate utilization report
python -m audit.utilization_report --output report.md

# Check schema compliance
python -m audit.schema_checker EXTRACTED/databases/
```

---

### 7. STANDALONE SCRIPTS (root level)

| Script | Purpose |
|--------|---------|
| `build_level5_databases.py` | Build Level 5 machine DBs from CAD files |
| `context_generator.py` | Generate minimal context for Claude sessions |
| `extract_module.py` | Quick module extraction (standalone) |
| `materials_scientific_builder.py` | Build scientific materials with full 127 params |
| `session_manager.py` | Session start/end/status management |
| `test_validator.py` | Test material validation |
| `update_state.py` | Quick CURRENT_STATE.json updates |
| `verify_features.py` | Verify UI features exist in build |

**Most Used Commands:**
```bash
# Generate context for new Claude session
python context_generator.py --clipboard

# Build Level 5 machine databases from STEP files
python build_level5_databases.py

# Build scientific materials database
python materials_scientific_builder.py --category carbon_steel --output PRISM_CS.js

# Verify all features present
python verify_features.py _BUILD/
```

---

## PATH CONSTANTS

All scripts use these standard paths:

```python
# In core/config.py
LOCAL_ROOT = r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)"
BOX_ROOT = r"C:\Users\Mark Villanueva\Box\PRISM REBUILD"

EXTRACTED = os.path.join(LOCAL_ROOT, "EXTRACTED")
SCRIPTS = os.path.join(LOCAL_ROOT, "SCRIPTS")
SESSION_LOGS = os.path.join(LOCAL_ROOT, "SESSION_LOGS")
STATE_FILE = os.path.join(LOCAL_ROOT, "CURRENT_STATE.json")

MONOLITH_PATH = os.path.join(LOCAL_ROOT, "_BUILD", 
    "PRISM_v8_89_002_TRUE_100_PERCENT",
    "PRISM_v8_89_002_TRUE_100_PERCENT.html")

RESOURCES = os.path.join(BOX_ROOT, "RESOURCES")
CAD_FILES = os.path.join(RESOURCES, "CAD FILES")
CATALOGS = os.path.join(RESOURCES, "MANUFACTURER CATALOGS")
```

---

## DEPENDENCIES

Required packages:
```bash
pip install pdfplumber json5 tqdm colorama --break-system-packages
```

| Package | Used For |
|---------|----------|
| `pdfplumber` | PDF catalog extraction |
| `json5` | Lenient JSON parsing (trailing commas, comments) |
| `tqdm` | Progress bars for batch operations |
| `colorama` | Colored console output |

---

## EXECUTION FROM CLAUDE

Use Desktop Commander to run scripts:

```javascript
// Run a script
Desktop Commander:start_process({
  command: "python C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\SCRIPTS\\update_state.py complete \"Task done\"",
  timeout_ms: 30000
})

// Run a module
Desktop Commander:start_process({
  command: "cd \"C:\\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\\SCRIPTS\" && python -m validation.material_validator ..\\EXTRACTED\\materials\\enhanced\\PRISM_CARBON_STEELS.js",
  timeout_ms: 60000
})
```

---

## COMMON WORKFLOWS

### Start of Session
```bash
cd "C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SCRIPTS"
python session_manager.py start 1.A.5
```

### After Creating Materials
```bash
python -m validation.material_validator ../EXTRACTED/materials/enhanced/PRISM_NEW.js
python -m validation.physics_consistency ../EXTRACTED/materials/enhanced/PRISM_NEW.js
```

### End of Session
```bash
python session_manager.py end
python update_state.py complete "Session 1.A.5 - Extracted X modules"
```

### Before Migration (Stage 3)
```bash
python -m audit.gap_finder
python -m audit.utilization_report
python -m audit.consumer_tracker PRISM_MATERIALS_MASTER
```

---

## TIPS

1. **Always use full paths** - Scripts expect absolute Windows paths
2. **Run from SCRIPTS directory** - For module imports to work: `cd SCRIPTS && python -m module.script`
3. **Check logs** - Most scripts write to `SESSION_LOGS/`
4. **State updates are atomic** - `update_state.py` does read-modify-write safely
5. **Large files** - Use generators, not `read()` for 1M+ line files

---

## END OF SKILL

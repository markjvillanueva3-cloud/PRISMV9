---
name: prism-python-tools
description: |
  Python automation utilities for PRISM development.
---

**Location:** `C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\SCRIPTS\`

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

## END OF SKILL

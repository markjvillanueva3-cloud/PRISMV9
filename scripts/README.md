# PRISM Automation Toolkit

## Overview

Python-based automation tools for PRISM Manufacturing Intelligence development.
These tools enforce thoroughness and consistency throughout development.

## Requirements

- Python 3.8+
- No external dependencies (uses standard library only)

## Quick Start

```bash
# Validate a single material file
python validation/material_validator.py path/to/material.json

# Batch validate all materials in a directory
python validation/batch_validator.py ./materials/

# Run validation test on existing materials
python test_validator.py
```

## Toolkit Structure

```
SCRIPTS/
├── core/                    # Shared infrastructure
│   ├── config.py           # Paths, constants, thresholds
│   ├── logger.py           # Logging utilities
│   └── utils.py            # Common helper functions
│
├── validation/             # Material validation (Toolkit 1)
│   ├── material_schema.py  # 127-parameter schema definition
│   ├── material_validator.py  # Single material validator
│   └── batch_validator.py  # Batch validation
│
├── extraction/             # Monolith extraction (Toolkit 2) - PLANNED
├── audit/                  # Database audit (Toolkit 3) - PLANNED
├── state/                  # State management (Toolkit 4) - PLANNED
├── batch/                  # Batch processing (Toolkit 5) - PLANNED
│
├── test_validator.py       # Test validator on existing materials
├── requirements.txt        # Python requirements
├── TOOLKIT_ROADMAP.md     # Complete development roadmap
└── README.md              # This file
```

## Toolkit 1: Material Validation

### Schema Definition (material_schema.py)

Defines all 127 material parameters with:
- Data types (string, number, boolean, array, object)
- Valid ranges (min/max values)
- Requirement levels (required, recommended, optional)
- Units
- Categories

### Single Material Validator (material_validator.py)

Validates individual materials against the schema:
- **Completeness Check**: Verifies all required parameters present
- **Range Validation**: Ensures values within acceptable limits
- **Physics Consistency**: Cross-checks related parameters

Physics checks include:
1. Kc1.1 vs UTS ratio (2.5-6.0)
2. Johnson-Cook A vs Yield (0.85-1.3)
3. Taylor exponent n (0.08-0.50)
4. Kienzle mc exponent (0.10-0.45)
5. Yield < UTS relationship
6. Thermal diffusivity consistency

### Batch Validator (batch_validator.py)

Validates entire files/directories:
- Parses JS and JSON material files
- Generates comprehensive reports
- Detects duplicate material IDs
- Outputs text or JSON reports

## Usage Examples

### Validate a JSON material
```python
from validation.material_validator import MaterialValidator

validator = MaterialValidator(strict=True)
result = validator.validate_material(material_dict)
validator.print_result(result, verbose=True)
```

### Batch validate a directory
```python
from validation.batch_validator import BatchValidator

validator = BatchValidator(strict=False)
result = validator.validate_directory(Path('./materials'))
report = validator.generate_report(result)
print(report)
```

### CLI usage
```bash
# Single file validation
python -m validation.material_validator material.json -v

# Batch validation with report output
python -m validation.batch_validator ./materials --report report.txt --json report.json
```

## Development Roadmap

See `TOOLKIT_ROADMAP.md` for the complete 20-session development plan covering:
- Toolkit 1: Material Validation (T.1.1-T.1.4) - IN PROGRESS
- Toolkit 2: Monolith Extraction (T.2.1-T.2.4)
- Toolkit 3: Database Audit (T.3.1-T.3.4)
- Toolkit 4: State Management (T.4.1-T.4.4)
- Toolkit 5: Batch Processing (T.5.1-T.5.4)

## Philosophy

**Automation = Enforced Thoroughness**

Scripts don't get tired at parameter #80 of 127. Every check runs with the same rigor every time. Quality gates BLOCK incomplete work.

Human judgment handles decisions. Automation handles verification.

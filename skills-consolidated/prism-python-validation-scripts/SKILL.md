---
name: prism-python-validation-scripts
description: Python material/physics validation and audit scripts — validate material databases against 127-parameter schema, check physics consistency, find extraction gaps
---
# Python Validation & Audit Scripts

## When To Use
- After creating or modifying any material database file
- "Validate this material file" / "Check if physics values are consistent"
- Before committing material changes to the repository
- During R2+ phases when building material databases
- When physics values seem wrong (Kc1.1 vs UTS mismatch, etc.)
- NOT for: session state management (use prism-python-state-scripts)
- NOT for: TypeScript code review (use prism-code-review-checklist)

## How To Use
All scripts in `C:\PRISM\SCRIPTS\`. Run with `cd SCRIPTS && python -m module.script` for imports.

**MATERIAL VALIDATION** (validation/material_validator.py):
```bash
python -m validation.material_validator ../EXTRACTED/materials/enhanced/PRISM_CARBON_STEELS.js
```
Validates against 127-parameter schema (material_schema.py). Reports missing/invalid fields.

**PHYSICS CONSISTENCY** (validation/physics_consistency.py):
```bash
python -m validation.physics_consistency ../EXTRACTED/materials/enhanced/PRISM_CARBON_STEELS.js
```
Cross-checks physical relationships between parameters:
  Kienzle Kc1.1 vs UTS: should be ~3-5x UTS (e.g., UTS=500MPa → Kc1.1=1500-2500)
  Johnson-Cook A vs yield strength: should be approximately equal
  Taylor n vs hardness: softer materials have higher n exponent
  Thermal conductivity vs diffusivity: must be physically consistent
  Density vs composition: calculated density must match stated value

**BATCH VALIDATION** (validation/batch_validator.py):
```bash
python -m validation.batch_validator ../EXTRACTED/materials/enhanced/
```
Runs both schema and physics checks on all .js files in a directory.

**GAP FINDING** (audit/gap_finder.py):
```bash
python -m audit.gap_finder
```
Finds missing modules, incomplete extractions, uncovered material families.

**CONSUMER TRACKING** (audit/consumer_tracker.py):
```bash
python -m audit.consumer_tracker PRISM_MATERIALS_MASTER
```
Verifies every database has downstream consumers (wiring compliance).

**SCHEMA COMPLIANCE** (audit/schema_checker.py):
```bash
python -m audit.schema_checker ../EXTRACTED/databases/
```
Checks database files match their declared schemas.

**COMMON WORKFLOW — After creating materials:**
  1. `python -m validation.material_validator NEW_MATERIAL.js` (schema check)
  2. `python -m validation.physics_consistency NEW_MATERIAL.js` (physics check)
  3. Fix any failures
  4. `python -m validation.batch_validator EXTRACTED/materials/enhanced/` (full suite)

**COMMON WORKFLOW — Before R2 migration:**
  1. `python -m audit.gap_finder` (what's missing?)
  2. `python -m audit.utilization_report` (what's underused?)
  3. `python -m audit.consumer_tracker PRISM_MATERIALS_MASTER` (wiring ok?)

**DEPENDENCIES:** pdfplumber, json5, tqdm, colorama

## What It Returns
- material_validator: PASS/FAIL per field, list of missing parameters, count of 127
- physics_consistency: PASS/WARN/FAIL per relationship, with expected vs actual values
- batch_validator: summary table of all files with pass/fail counts
- gap_finder: list of missing modules/materials with extraction status
- consumer_tracker: wiring map showing which databases have consumers and which are orphaned

## Examples
- Input: "Just created PRISM_TITANIUM_ALLOYS.js with 15 titanium grades"
  Run: `python -m validation.material_validator PRISM_TITANIUM_ALLOYS.js`
  Expected: 15 materials, each checked against 127 fields
  Common failure: missing Johnson-Cook parameters (A, B, C, n, m) — Ti alloys need these for force calc
  Run: `python -m validation.physics_consistency PRISM_TITANIUM_ALLOYS.js`
  Expected: Kc1.1 for Ti-6Al-4V should be ~1800-2200 (UTS ~950MPa, ratio 1.9-2.3x — lower than steel)

- Input: "Batch validate all enhanced materials before R2 migration gate"
  Run: `python -m validation.batch_validator ../EXTRACTED/materials/enhanced/`
  Result: table showing 3518 materials, N pass, M fail, with per-file breakdown
  Gate requirement: 95%+ pass rate on schema, 90%+ on physics consistency

- Edge case: "Physics check says Kc1.1 is 500 for 4140 steel (UTS=655MPa)"
  Ratio: 500/655 = 0.76x — should be 3-5x. Kc1.1 should be ~2000-3000.
  Likely cause: value entered in wrong units (kN/mm2 vs N/mm2) or decimal error.
  Action: fix value to ~2200, re-run validation.
SOURCE: Split from prism-python-tools (11.5KB)
RELATED: prism-python-state-scripts, prism-anti-regression-checklists

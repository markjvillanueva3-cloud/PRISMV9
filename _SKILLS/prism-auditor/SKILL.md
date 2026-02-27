---
name: prism-auditor
description: Audit PRISM modules for completeness before migration. Use when verifying extracted modules have all functions, data, dependencies documented. Checks extraction quality, identifies gaps, validates against source monolith.
---

# PRISM Module Auditor

Verifies extracted modules are complete and ready for migration.

## Quick Audit

```python
# Audit single module
python scripts/audit_module.py --module PRISM_MATERIALS_MASTER --source monolith.html

# Audit entire category
python scripts/audit_category.py --category databases/materials/

# Generate completeness report
python scripts/completeness_report.py --output audit_report.md
```

## Audit Checks

### 1. Function Count Match
```python
# Compares function count in extracted vs source
Expected: 25 functions
Found: 25 functions ✓
```

### 2. Data Completeness
```python
# Verifies all data entries present
Materials expected: 618
Materials found: 618 ✓
```

### 3. Dependency Documentation
```python
# Checks dependencies are listed in header
DEPENDENCIES documented: Yes ✓
- PRISM_CONSTANTS ✓
- PRISM_UNITS ✓
```

### 4. Syntax Validation
```python
# Parses with Node.js to check syntax
Syntax valid: Yes ✓
```

### 5. Consumer Mapping
```python
# Checks consumers are identified
CONSUMERS documented: 15 listed ✓
```

## Audit Report Format

```markdown
# PRISM Audit Report - [DATE]

## Summary
- Modules audited: 62
- Complete: 58 (93.5%)
- Issues found: 4

## Issues

### PRISM_MATERIALS_MASTER
- [ ] Missing 3 functions: calcAbrasiveness, getChipType, validateProps

### PRISM_TOOL_DATABASE_V7
- [ ] Data incomplete: 4,892/5,000 tools
```

## Severity Levels

| Level | Meaning | Action |
|-------|---------|--------|
| ✓ PASS | Complete, ready for migration | Proceed |
| ⚠ WARN | Minor issues, can migrate | Document and proceed |
| ✗ FAIL | Major issues, re-extract | Fix before migration |

## Integration with State

Audit results update CURRENT_STATE.json:

```json
{
  "extractionProgress": {
    "databases": {
      "audited": 62,
      "passed": 58,
      "warned": 3,
      "failed": 1
    }
  }
}
```

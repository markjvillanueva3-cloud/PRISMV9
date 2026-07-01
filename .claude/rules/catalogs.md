---
paths:
  - "**/src/data/**/*.ts"
  - "**/src/data/**/*.json"
---

# Catalog Data Conventions

- TypeScript catalogs must have typed interfaces
- Tool catalogs: diameter_mm, flute_count, material, coating required fields
- Machine catalogs: max_rpm, max_feed, axes, controller required
- Material catalogs: use ISO material group codes
- JSON data files must be valid (auto-checked by PostToolUse hook)
- Never hardcode tool/material properties — reference catalog data
- Import patterns: lazy load large catalogs (>1000 entries)
- Maintain backward compatibility — never remove existing catalog fields

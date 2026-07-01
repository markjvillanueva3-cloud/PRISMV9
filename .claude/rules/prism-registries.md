---
paths:
  - "**/registries/**"
---

# PRISM Registry Conventions

- 48 JSON files, 16K+ records total
- Each registry is a JSON array of objects with consistent schema per file
- Common fields: id, name, description, category, metadata
- Never overwrite entire registry files — use targeted edits
- Validate JSON after edits (node -e "JSON.parse(require('fs').readFileSync('file'))")
- Registries are read by MCP dispatchers at runtime — invalid JSON breaks the server
- Back up before bulk modifications

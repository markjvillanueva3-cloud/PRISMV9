---
paths:
  - "**/src/tools/schemas/**/*.ts"
  - "**/src/schemas/**/*.ts"
---

# Schema Conventions

- All schemas use Zod v4
- Action schemas must match dispatcher z.enum exactly
- Input validation: use z.string(), z.number(), z.enum() — never z.any()
- Schema naming: {domain}ActionSchemas.ts
- Export schemas as named constants, not default exports
- Include .describe() for every field (MCP tool descriptions)
- Enum values use snake_case matching dispatcher actions

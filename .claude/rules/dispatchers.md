---
paths:
  - "**/src/tools/dispatchers/**/*.ts"
  - "**/src/tools/schemas/**/*.ts"
---

# Dispatcher Conventions

- Every action must be in the z.enum() list
- Use lazy imports: const { Engine } = await import(path)
- Schema file must exist for every dispatcher action group
- Action names use snake_case
- Never add @ts-nocheck — fix the types
- calcDispatcher has 1130+ cases — add new actions in alphabetical order within their section
- Test action count anti-regression: never decrease total action count
- Return {success: true, data: {...}} pattern

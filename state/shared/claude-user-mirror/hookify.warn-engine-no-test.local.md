---
name: warn-engine-no-test
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: mcp-server/src/engines/[A-Z][A-Za-z]+Engine\.ts$
---

**[warn-engine-no-test]**
**New engine file detected — ensure test coverage exists.**

Every calculation engine in PRISM must have test coverage. Before proceeding:

1. **Check** if a test file exists in `src/__tests__/` that imports and tests this engine
2. **Create** tests if missing — at minimum: 3 known-good calculations, 2 edge cases, 1 error case
3. **Verify** the engine returns `AtomicValue` format with `{ value, unit, uncertainty, source }`

Engine tests should use the harness at `src/__tests__/helpers/engine-test-harness.ts` for AtomicValue assertions.

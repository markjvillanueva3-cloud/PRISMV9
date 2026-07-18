---
paths:
  - "**/src/__tests__/**"
  - "**/*.test.ts"
---

# Test Conventions

- Use vitest (describe/it/expect)
- Test file naming: EngineName.test.ts matching engine file
- Minimum 10 test cases per engine
- Include edge cases: zero inputs, negative values, extreme ranges
- Physics tests must verify dimensional consistency (F=PA, E=half*mv^2)
- Use expect(...).toBeCloseTo() for floating point, not toBe()
- Group tests by method in nested describe blocks
- No network calls in unit tests — mock external dependencies

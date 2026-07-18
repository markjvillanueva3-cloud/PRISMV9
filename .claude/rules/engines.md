---
paths:
  - "**/src/engines/**/*.ts"
  - "**/src/physics/**/*.ts"
---

# Engine Coding Conventions

- Every engine must export a class with static methods
- Physics formulas must reference canonical constants from src/physics/constants.ts
- Every engine needs a companion test file in __tests__/
- JSDoc required for public methods with @param and @returns
- Formula implementations must include literature reference in comments
- Kienzle: Fc = kc1_1 * ap * fz^(1-mc). Taylor: T = (C/Vc)^(1/n). Deflection: delta = FL^3/3EI
- Use Zod schemas for input validation
- Return typed result objects, never raw primitives
- Error handling: throw descriptive errors, never silentCatch in engines

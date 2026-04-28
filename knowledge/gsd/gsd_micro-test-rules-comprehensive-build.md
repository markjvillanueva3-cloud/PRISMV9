---
source: gsd_micro
section: Test Rules — Comprehensive Build
slug: test-rules-comprehensive-build
indexed_at: 2026-04-28T02:50:03.678Z
---

## Test Rules — Comprehensive Build

NEW RULE (2026-04-28): every test file must satisfy a coverage floor.
Tests that fail this WILL be flagged by `test-legitimacy.mjs`.

### Coverage floor
- **Happy path** — at least one assertion against a known-good input.
- **≥3 failure modes** — bad input, boundary condition, resource
  exhaustion (timeout/oversize/network).
- **≥2 adversarial inputs** — NaN, Infinity, empty/null, oversize
  string, malformed JSON.
- **≥3 variability axis values** — if the domain has N configurations
  (materials, dialects, machines, CAM systems), exercise at least
  three spanning ones, not just the canonical default.
- **Wiring round-trip** — at least one test must invoke the engine
  through the dispatcher (not only the singleton). The dispatcher
  schema, action enum, and lazy import all match.

### Real assertions only
- Reference values from published sources or algebraic invariants.
- NEVER `toBeDefined()`, `toBeUndefined()`, `toBeTruthy()`,
  `toBeFalsy()` as the primary assertion.
- NEVER `.skip(` to silence a failing test. Fix the code or fix the
  test — never weaken the assertion.

### Failure handling
- If tests fail mid-build: fix the code or fix the test. Do not
  comment out, skip, or weaken assertions.
- If genuine ambiguity: stop, ask the user, do not silently flip
  expectations.

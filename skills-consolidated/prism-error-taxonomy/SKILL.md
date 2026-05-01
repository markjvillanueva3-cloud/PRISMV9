---
name: prism-error-taxonomy
description: PrismError class hierarchy with 6 error categories and their mandatory treatment — safety blocks execution, network retries, data logs and continues
---
# PRISM Error Taxonomy

## When To Use
- Writing any new engine, dispatcher, or action that can fail
- "What error type should I throw here?" / "How should this failure be handled?"
- When reviewing code for correct error classification
- When a catch block needs to decide: block? retry? log and continue?
- NOT for: implementing retry logic (use prism-error-recovery-strategies)
- NOT for: Result<T,E> return patterns or validation schemas

## How To Use
PRISM uses 6 error categories. Each has a MANDATORY treatment that cannot be overridden:

**SAFETY** → `SafetyError` → **BLOCK execution immediately**
  Thrown when: S(x) < 0.70, spindle overload, collision detected, tool breakage risk
  Constructor: `new SafetyError(constraint, actualValue, limit)`
  Treatment: Stop all processing. Do not return partial results. Log with full context.
  Code path: catch → log → return error response with constraint details → never continue

**CALCULATION** → `CalculationError` → **BLOCK and report**
  Thrown when: physics formula produces NaN/Infinity, divide-by-zero, negative where positive required
  Constructor: `new CalculationError(calculationName, message, cause?)`
  Treatment: Stop this calculation. Report which formula failed and with what inputs.
  Code path: catch → log inputs that caused failure → return structured error → do not guess

**VALIDATION** → `ValidationError` → **REJECT input, explain why**
  Thrown when: field out of range, missing required parameter, type mismatch, schema violation
  Constructor: `new ValidationError(field, reason, value?)`
  Treatment: Reject the request. Return which field failed and what's acceptable.
  Code path: catch → return 400-level error with field name + reason → user can fix and retry

**DATABASE** → `MaterialNotFoundError` etc. → **LOG and return empty/fallback**
  Thrown when: material not in registry, machine not found, alarm code unknown
  Constructor: `new MaterialNotFoundError(materialId)`
  Treatment: Log the miss. Return empty result or suggest alternatives. Don't crash.
  Code path: catch → log miss → return { found: false, suggestions: [...] }

**NETWORK** → network errors → **RETRY with backoff**
  Thrown when: API timeout, connection refused, service unavailable (429, 503)
  Treatment: Retry up to 3 times with exponential backoff. If still failing, circuit break.
  Code path: catch → withRetry() wrapper → if exhausted → CircuitBreaker.open()

**CONFIGURATION** → `ConfigurationError` → **FAIL FAST at startup**
  Thrown when: missing env var, invalid config file, incompatible settings
  Constructor: `new ConfigurationError(setting, message)`
  Treatment: Fail immediately during boot. Don't start serving with broken config.
  Code path: catch → log exactly which setting is wrong → exit process

**ErrorFactory** — Use instead of direct `new` for consistency:
  `ErrorFactory.validation('kc1_1', 'must be positive', -100)`
  `ErrorFactory.safetyViolation('maxSpindleRPM', 15000, 12000)`
  `ErrorFactory.calculation('taylor_tool_life', 'exponent n must be 0-1', cause)`
  `ErrorFactory.materialNotFound('unobtanium-9999')`

## What It Returns
- The correct error class to throw for any failure scenario
- The mandatory treatment for that error category (block/retry/log/reject/fail-fast)
- Structured error output: `{ name, code, category, message, timestamp, cause }`
- Clear decision path: identify category → use correct constructor → apply mandatory treatment
- Prevents: silent swallowing of safety errors, crashing on missing data, retrying non-retryable failures

## Examples
- Input: "Tool life calculation returned negative value for exponent n"
  Category: CALCULATION (physics formula produced invalid result)
  Throw: `ErrorFactory.calculation('taylor_tool_life', 'exponent n=-0.3 must be in range 0-1')`
  Treatment: BLOCK — do not return a tool life estimate based on invalid exponent

- Input: "User requested material 'unobtanium' which isn't in the registry"
  Category: DATABASE (material not found)
  Throw: `ErrorFactory.materialNotFound('unobtanium')`
  Treatment: LOG miss, return `{ found: false, suggestions: ['inconel-718', 'waspaloy'] }`
  Do NOT throw — missing data is expected, suggest alternatives

- Edge case: "S(x) calculated at 0.68 for a turning operation"
  Category: SAFETY (below 0.70 hard block threshold)
  Throw: `ErrorFactory.safetyViolation('S(x)', 0.68, 0.70)`
  Treatment: BLOCK — absolutely do not return cutting parameters. This is the one category
  where "close enough" is never acceptable. 0.68 is not 0.70. Block.
SOURCE: Split from prism-error-handling-patterns (28.7KB)
RELATED: prism-error-recovery-strategies

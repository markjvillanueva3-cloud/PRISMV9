# SYS-MS6 Schema Validation Architecture

## Problem
All 45 dispatchers accept `params: z.record(z.any()).optional()` — zero type enforcement at the tool boundary. Invalid params silently flow into engine logic, causing cryptic errors deep in the call stack.

## Architecture: Schema Registry + Validation Middleware

### Schema Registry Pattern
Each dispatcher gets a co-located schema file:
```
src/schemas/calcActionSchemas.ts      → ACTION_SCHEMAS for calcDispatcher
src/schemas/safetyActionSchemas.ts    → ACTION_SCHEMAS for safetyDispatcher
src/schemas/fiveAxisActionSchemas.ts  → ACTION_SCHEMAS for fiveAxisDispatcher
src/schemas/threadActionSchemas.ts    → ACTION_SCHEMAS for threadDispatcher
src/schemas/dataActionSchemas.ts      → ACTION_SCHEMAS for dataDispatcher
```

Each exports: `Record<string, z.ZodType>` mapping action name → Zod schema.

### Validation Middleware
Single utility: `src/validation/actionParamValidator.ts`

```
validateActionParams(action, params, schemas) → { valid, params, errors }
```

Called in each dispatcher AFTER `normalizeParams()` but BEFORE the action switch/case.

### Type Coercion
LLMs frequently send `"2.5"` instead of `2.5`. The validator preprocesses:
- String → number when schema expects `z.number()` (via `z.coerce.number()`)
- String → boolean for `"true"/"false"`
- Preserves original for strings

Implemented via `z.preprocess()` wrappers on numeric fields.

### Injection Point (per dispatcher)
```typescript
// BEFORE (current):
const params = normalizeParams(rawParams);
switch (action) { ... }

// AFTER (with validation):
const params = normalizeParams(rawParams);
const validation = validateActionParams(action, params, ACTION_SCHEMAS);
if (!validation.valid) {
  return { content: [{ type: "text", text: JSON.stringify(validation.error) }] };
}
// params now has coerced types
switch (action) { ... }
```

## Error Behavior Decision

### Chosen: Structured Error Response (not throw)

**Safety-critical dispatchers** (safety, fiveAxis): Return error with `_validation_failed: true` flag. The MCP client sees a clear error, not a stack trace.

**Calculation dispatchers** (calc, thread): Return error for missing required params. For wrong types, attempt coercion first; only error if coercion fails.

**Data dispatchers** (data): Minimal validation — just required field presence.

### Error Response Format
```json
{
  "error": "validation_error",
  "action": "cutting_force",
  "message": "Missing required params: feed_per_tooth, axial_depth",
  "missing": ["feed_per_tooth", "axial_depth"],
  "invalid": [{"field": "cutting_speed", "expected": "number", "got": "string", "value": "abc"}],
  "hint": "Required: feed_per_tooth (number), axial_depth (number, mm), radial_depth (number, mm), tool_diameter (number, mm)",
  "_validation_failed": true
}
```

### Schema Strictness Levels
1. **STRICT** (safety, fiveAxis): Missing required OR invalid type → REJECT
2. **COERCE** (calc, thread): Missing required → REJECT, invalid type → try coerce → REJECT if fail
3. **LOOSE** (data): Missing required → REJECT, invalid type → pass through

## Physical Bounds
Numeric params include manufacturing-reality bounds (matching safetyCalcSchema.ts pattern):
- `cutting_speed`: 0 < Vc ≤ 2000 m/min
- `feed_per_tooth`: 0 < fz ≤ 10 mm
- `axial_depth`: 0 < ap ≤ 100 mm
- `tool_diameter`: 0 < d ≤ 500 mm
- `temperature`: -273 < T ≤ 2000 °C

## Backward Compatibility
- Actions without schemas pass through unchanged (gradual rollout)
- No existing behavior changes for valid params
- Only new behavior: invalid params get clear errors instead of cryptic failures

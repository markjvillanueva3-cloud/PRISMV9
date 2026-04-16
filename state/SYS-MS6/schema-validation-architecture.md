# SYS-MS6: Schema Validation Architecture

## 1. Problem Statement

All 45 PRISM dispatchers accept `params: z.record(z.any()).optional()` — zero type enforcement at the MCP tool boundary. Invalid params silently flow into engine logic, causing cryptic errors deep in the call stack. 21 Zod schemas exist in `src/schemas/` but none validate dispatcher input params.

## 2. Design Goals

- **Per-action validation**: Each dispatcher action gets its own Zod schema
- **Fail-fast**: Invalid params rejected BEFORE engine call, with clear error messages
- **Alias-aware**: Validation runs AFTER `normalizeParams()` so aliases already resolved
- **Non-breaking**: Unknown extra params passed through (`.passthrough()`) — only required/typed fields enforced
- **Safety-critical distinction**: Safety dispatchers REJECT (throw), normal dispatchers return structured error

## 3. Schema Registry Pattern

### 3.1 Per-Dispatcher Schema Map

Each dispatcher gets a co-located schema file exporting an `ACTION_SCHEMAS` map:

```
src/schemas/
  calcActionSchemas.ts        ← prism_calc (51 actions)
  safetyActionSchemas.ts      ← prism_safety
  fiveAxisActionSchemas.ts    ← prism_5axis
  threadActionSchemas.ts      ← prism_thread
  dataActionSchemas.ts        ← prism_data
  toolpathActionSchemas.ts    ← prism_toolpath
  exportActionSchemas.ts      ← prism_export
```

### 3.2 Schema Map Type

```typescript
import { z } from "zod";

/** Map from action name → Zod schema for that action's params */
export type ActionSchemaMap = Record<string, z.ZodType>;
```

### 3.3 Example: calcActionSchemas.ts

```typescript
import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// Reusable field schemas for common cutting params
const positiveNumber = z.number().positive();
const optPositiveNumber = z.number().positive().optional();
const materialRef = z.string().min(1);
const optMaterialRef = z.string().min(1).optional();

const cuttingConditionsBase = {
  cutting_speed: positiveNumber,
  feed_per_tooth: positiveNumber,
  axial_depth: positiveNumber,
  radial_depth: optPositiveNumber,
  tool_diameter: positiveNumber,
  number_of_teeth: z.number().int().positive(),
  rake_angle: z.number().optional(),
};

export const ACTION_CALC_SCHEMAS: ActionSchemaMap = {
  cutting_force: z.object({
    ...cuttingConditionsBase,
    kc1_1: optPositiveNumber,
    mc: z.number().optional(),
    material_id: optMaterialRef,
    material: optMaterialRef,
    material_group: z.string().optional(),
  }).passthrough(),

  tool_life: z.object({
    cutting_speed: positiveNumber,
    taylor_C: optPositiveNumber,
    taylor_n: optPositiveNumber,
    material_id: optMaterialRef,
    material: optMaterialRef,
    material_group: z.string().optional(),
    tool_material: z.string().optional(),
    feed: optPositiveNumber,
    depth_of_cut: optPositiveNumber,
  }).passthrough(),

  speed_feed: z.object({
    material: materialRef.or(z.undefined()),
    material_id: optMaterialRef,
    operation: z.string().min(1),
    tool_diameter: positiveNumber,
    tool_material: z.string().optional(),
  }).passthrough(),

  // ... (remaining 48 actions follow same pattern)
};
```

### 3.4 Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `.passthrough()` vs `.strict()` | `.passthrough()` | Extra params flow through (hooks, metadata, debug flags). Only enforces known fields. |
| Schema per action vs per engine | Per action | Actions map 1:1 to user intent. Same engine may serve multiple actions with different required params. |
| Co-located vs centralized | Co-located in `src/schemas/` | Schemas are infrastructure, not engine logic. One file per dispatcher keeps them findable. |
| Reusable field builders | Yes (`positiveNumber`, `cuttingConditionsBase`) | Reduces duplication across 51+ schemas. Manufacturing physics constraints are shared. |
| Zod vs JSON Schema | Zod | Already used for MCP tool definitions. TypeScript-native. `.safeParse()` gives structured errors. |

## 4. Validation Middleware

### 4.1 New Function: `validateActionParams()`

Added to `src/utils/dispatcherMiddleware.ts`:

```typescript
import { z } from "zod";
import type { ActionSchemaMap } from "../schemas/actionSchemaTypes.js";

export interface ValidationResult {
  valid: boolean;
  errors?: z.ZodIssue[];
  errorMessage?: string;
}

/**
 * Validate action params against the schema registry.
 * Call AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @param action - The action name (e.g., "cutting_force")
 * @param params - Normalized params object
 * @param schemas - The ACTION_SCHEMAS map for this dispatcher
 * @returns ValidationResult with structured errors if invalid
 */
export function validateActionParams(
  action: string,
  params: Record<string, unknown>,
  schemas: ActionSchemaMap
): ValidationResult {
  const schema = schemas[action];

  // No schema registered → pass through (graceful degradation for uncovered actions)
  if (!schema) {
    return { valid: true };
  }

  const result = schema.safeParse(params);
  if (result.success) {
    return { valid: true };
  }

  const issues = result.error.issues;
  const errorMessage = issues
    .map(i => `${i.path.join(".")}: ${i.message}`)
    .join("; ");

  return { valid: false, errors: issues, errorMessage };
}
```

### 4.2 Integration Point in Dispatcher

The validation call slots into the existing dispatcher flow:

```
Tool call received
  → z.enum(ACTIONS) validates action name     [existing — Zod at MCP boundary]
  → validateInputParams(params)               [existing — DoS prevention]
  → Manual alias mapping                      [existing — calcDispatcher lines 265-284]
  → normalizeParams(rawParams)                [existing — paramNormalizer 61 aliases]
  → validateActionParams(action, params, SCHEMAS)  ← NEW
  → Pre-calculation hooks                     [existing — hookExecutor]
  → ComputationCache check                    [existing — cache hit path]
  → switch(action) → engine call              [existing — business logic]
  → Post-calculation hooks                    [existing — hookExecutor]
  → dispatcherResult(result)                  [existing — response formatting]
```

### 4.3 Wiring Example (calcDispatcher)

```typescript
import { ACTION_CALC_SCHEMAS } from "../../schemas/calcActionSchemas.js";
import { validateActionParams, dispatcherError } from "../../utils/dispatcherMiddleware.js";

// Inside the tool handler, after normalizeParams:
const validation = validateActionParams(action, params, ACTION_CALC_SCHEMAS);
if (!validation.valid) {
  return dispatcherError(
    `Invalid params for '${action}': ${validation.errorMessage}`,
    action,
    "prism_calc"
  );
}
```

4 lines of wiring per dispatcher. No structural changes to the switch/case block.

## 5. Error Behavior

### 5.1 Two-Tier Error Strategy

| Dispatcher Type | On Invalid Params | Rationale |
|----------------|-------------------|-----------|
| **Normal** (prism_calc, prism_data, prism_export, etc.) | Return `dispatcherError()` | Structured error response. LLM can read the error, fix params, and retry. |
| **Safety-critical** (prism_safety, prism_5axis, prism_thread) | Throw `SafetyBlockError` | Safety-critical actions MUST NOT proceed with bad data. Hard block. Consistent with S(x) hard-block pattern. |

### 5.2 Normal Dispatcher Error Response

```json
{
  "error": "Invalid params for 'cutting_force': feed_per_tooth: Expected number, received undefined; tool_diameter: Expected number, received undefined",
  "action": "cutting_force",
  "dispatcher": "prism_calc"
}
```

With `isError: true` flag on the MCP response — tells the LLM this is an error, not a result.

### 5.3 Safety-Critical Dispatcher Error

```typescript
import { SafetyBlockError } from "../../engines/SafetyScoreEngine.js";

const validation = validateActionParams(action, params, ACTION_SAFETY_SCHEMAS);
if (!validation.valid) {
  throw new SafetyBlockError(
    `SAFETY BLOCK: Invalid params for '${action}': ${validation.errorMessage}`,
    "schema_validation"
  );
}
```

This throws, which the dispatcher's outer try/catch converts to `dispatcherError()` with `isError: true`. The key difference: safety dispatchers log a WARN, increment safety-block metrics, and the error message clearly states "SAFETY BLOCK".

### 5.4 Unschema'd Actions

Actions without a registered schema **pass through without validation**. This enables incremental rollout — we can add schemas action-by-action without breaking existing functionality. The health endpoint (SYS-MS6-U03) will track schema coverage percentage.

## 6. Type Coercion Strategy (U03)

ParamNormalizer will be extended to coerce types BEFORE schema validation:

```typescript
// String "2.5" → number 2.5 (common from LLM tool calls)
// String "true" → boolean true
// String "3" → number 3 (when schema expects z.number())
```

This is deferred to U03 but the architecture accommodates it: coercion runs in `normalizeParams()`, which executes BEFORE `validateActionParams()`.

## 7. File Plan

| File | Action | Purpose |
|------|--------|---------|
| `src/schemas/actionSchemaTypes.ts` | CREATE | Shared types: `ActionSchemaMap`, `ValidationResult` |
| `src/schemas/calcActionSchemas.ts` | CREATE | 51 action schemas for prism_calc |
| `src/schemas/safetyActionSchemas.ts` | CREATE | Schemas for prism_safety (U02) |
| `src/schemas/fiveAxisActionSchemas.ts` | CREATE | Schemas for prism_5axis (U02) |
| `src/schemas/threadActionSchemas.ts` | CREATE | Schemas for prism_thread (U02) |
| `src/utils/dispatcherMiddleware.ts` | MODIFY | Add `validateActionParams()` function |
| `src/tools/dispatchers/calcDispatcher.ts` | MODIFY | Wire validation (4 lines) |
| `src/tools/dispatchers/safetyDispatcher.ts` | MODIFY | Wire validation with SafetyBlockError (U02) |
| `src/tools/dispatchers/fiveAxisDispatcher.ts` | MODIFY | Wire validation with SafetyBlockError (U02) |
| `src/tools/dispatchers/threadDispatcher.ts` | MODIFY | Wire validation with SafetyBlockError (U02) |

## 8. Rollout Strategy

1. **U00** (this unit): Architecture doc ✓
2. **U01**: calcActionSchemas.ts + wire into calcDispatcher → validates 51 actions
3. **U02**: Safety schemas + wire into 3 safety-critical dispatchers with SafetyBlockError
4. **U03**: Remaining dispatchers + type coercion + coverage metric

Each unit is independently deployable. Schema coverage starts at 0%, reaches ~30% after U01, ~45% after U02, ≥80% after U03.

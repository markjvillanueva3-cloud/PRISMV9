---
name: prism-code-safety
description: |
  TypeScript type safety + security coding for PRISM Manufacturing Intelligence.
  Strict typing prevents bugs, security coding prevents exploits.
  Consolidates: typescript-safety, security-coding.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "code", "safety", "typescript", "type", "security", "coding", "manufacturing"
- Safety validation required, collision risk assessment, or safe parameter verification needed.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-code-safety")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_safety→[relevant_check] for safety validation
   - prism_skill_script→skill_content(id="prism-code-safety") for safety reference
   - prism_validate→safety for S(x)≥0.70 gate

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Safety criteria, validation rules, and threshold values
- **Failure**: S(x)<0.70 → operation BLOCKED, must resolve before proceeding

### Examples
**Example 1**: Pre-operation safety check needed
→ Load skill → Run safety criteria against current parameters → Return S(x) score → BLOCK if <0.70

**Example 2**: User overriding recommended limits
→ Load skill → Flag risk factors → Require explicit acknowledgment → Log override decision

# PRISM Code Safety
## Type Safety + Security for Manufacturing Intelligence

## 1. TYPE SAFETY (TypeScript)

### Strict Configuration (Required)
```json
{ "strict": true, "noImplicitAny": true, "strictNullChecks": true,
  "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true }
```

### Branded Types (Prevent Unit Confusion)
```typescript
type Millimeters = number & { readonly __brand: 'mm' };
type Inches = number & { readonly __brand: 'in' };
type RPM = number & { readonly __brand: 'rpm' };
type MetersPerMin = number & { readonly __brand: 'm/min' };

// Compiler prevents: addLength(mm_value, inch_value) ← TYPE ERROR
function createMM(value: number): Millimeters { return value as Millimeters; }
```

### Discriminated Unions (Result Types)
```typescript
type Result<T, E = Error> =
  | { success: true; value: T }
  | { success: false; error: E };

// Forces callers to check success before accessing value
function calculateForce(params: CuttingParams): Result<ForceResult> {
  if (!params.material.kc1_1) {
    return { success: false, error: new Error('Missing Kienzle kc1.1') };
  }
  return { success: true, value: { Fc: computed_force } };
}
```

### Type Guards
```typescript
function isMaterial(obj: unknown): obj is Material {
  return typeof obj === 'object' && obj !== null
    && 'id' in obj && 'category' in obj && 'kc1_1' in obj;
}

// Narrows type safely at runtime boundaries
if (isMaterial(input)) { /* input is now Material */ }
```

### Key Patterns
- **Never `any`** — use `unknown` + type guard instead
- **Exhaustive switch:** `default: assertNever(x)` catches missing cases at compile time
- **Readonly by default:** `ReadonlyArray<T>`, `Readonly<T>` unless mutation needed
- **Generic constraints:** `<T extends MaterialParams>` not bare `<T>`
- **Strict enums:** Use `as const` objects over TypeScript enums

## 2. SECURITY CODING

### Input Validation (All External Data)
```typescript
function validateInput(input: unknown): Result<ValidatedInput> {
  // 1. Type check
  if (typeof input !== 'object' || input === null) return fail('Invalid type');
  // 2. Required fields
  if (!('material_id' in input)) return fail('Missing material_id');
  // 3. Range validation
  if (input.speed < 0 || input.speed > 50000) return fail('Speed out of range');
  // 4. Pattern validation
  if (!/^[A-Z0-9_-]+$/i.test(input.material_id)) return fail('Invalid ID format');
  return { success: true, value: input as ValidatedInput };
}
```

### OWASP Manufacturing Application
| OWASP Risk | PRISM Mitigation |
|------------|-----------------|
| Injection | Parameterized queries, no eval(), no template literals in commands |
| Broken Auth | API key validation, scope-based authorization in prism_bridge |
| Sensitive Data | No secrets in logs, mask API keys, encrypt at rest |
| XXE/Parsing | Validate JSON schema, reject unexpected fields |
| Broken Access | Tenant isolation in prism_tenant, namespace separation |
| Misconfiguration | Strict defaults, validate config at startup |
| XSS | Sanitize all user-provided content before display |

### G-Code Security (Manufacturing-Specific)
- **Never execute unvalidated G-code** — could cause machine crash, injury
- **Validate coordinate bounds** before sending to controller
- **Check tool numbers** against magazine inventory
- **Rate-limit rapid moves** — validate clearance planes
- **Audit trail** for all machine commands

### Secure Data Handling
- API keys: environment variables only, never in code or logs
- Material data: validate completeness before calculations (incomplete → wrong → dangerous)
- User input: sanitize at boundary, validate before processing
- Error messages: context for developers, safe messages for users (no stack traces)
- File operations: validate paths, prevent directory traversal, check permissions

### Authentication & Authorization
```typescript
// prism_bridge scope-based auth
const scopes = {
  'read:materials': ['material_get', 'material_search'],
  'write:materials': ['material_get', 'material_search', 'material_update'],
  'execute:safety': ['check_spindle_torque', 'validate_rapid_moves'],
  'admin': ['*']
};
// Validate: request.scope covers required action
```

## 3. COMBINED SAFETY CHECKLIST

Before any PR/merge:
- ☐ No `any` types (use `unknown` + guards)
- ☐ All external inputs validated
- ☐ Result types for fallible operations (no thrown exceptions for control flow)
- ☐ Branded types for physical units
- ☐ No secrets in code or logs
- ☐ Bounds checking on all physical values
- ☐ Error messages include context
- ☐ `strict: true` in tsconfig

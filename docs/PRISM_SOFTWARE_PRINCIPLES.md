# PRISM Software Principles
## Coding Standards for PRISM v7.0.0 and Beyond

> Derived from MIT 6.005 Software Construction (Spring 2016, 27 readings), MIT 6.046J Design and Analysis of Algorithms, MIT 6.837 Computer Graphics, MIT 6.871 Knowledge-Based Applications, MIT 1.124J Foundations of Software Engineering, and MIT 15.082J Network Optimization — adapted as enforceable rules for the PRISM manufacturing intelligence platform.

---

## Table of Contents

1. [Testing](#1-testing)
2. [Code Quality](#2-code-quality)
3. [Specifications & API Design](#3-specifications--api-design)
4. [State Management](#4-state-management)
5. [Type System & Interfaces](#5-type-system--interfaces)
6. [Client/Server Architecture](#6-clientserver-architecture)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Concurrency & Real-time](#8-concurrency--real-time)
9. [Functional Patterns](#9-functional-patterns)
10. [Performance](#10-performance)
11. [3D Graphics](#11-3d-graphics)
12. [Knowledge Systems](#12-knowledge-systems)
13. [System Architecture](#13-system-architecture)
14. [Git Workflow](#14-git-workflow)

---

## 1. Testing

*Sources: MIT 6.005 R3 (Testing), R11 (Debugging)*

### 1.1 Test-Driven Development Flow

**DO** write the test before writing the implementation. The canonical TDD loop is:

```
1. Write a failing test that specifies the desired behavior
2. Write the minimum code to make it pass
3. Refactor without breaking the test
```

**DON'T** write tests after the fact as an afterthought. Tests written post-implementation tend to test what the code does, not what it should do.

**PRISM rule:** Every new engine method must have at least one test written before the implementation PR is merged. The PR description must include a "tests written first" checkbox.

### 1.2 Input Space Partitioning

**DO** partition the input space into equivalence classes and test at least one value per partition, plus all boundary values.

For a cutting speed calculator:

```typescript
// Partitions for material hardness (HRC):
// - Soft: 0–20 HRC (free machining)
// - Medium: 20–45 HRC (standard milling)
// - Hard: 45–60 HRC (hard turning territory)
// - Extreme: >60 HRC (requires CBN/ceramic — error path)
// Boundaries: exactly 0, exactly 20, exactly 45, exactly 60, 61
```

**DON'T** write tests that only hit the "happy path" with a single representative value. One test per partition is the minimum; one boundary test per partition boundary is required.

**PRISM rule:** For engines that accept numeric parameters (feeds, speeds, depths of cut, material properties), the test file must include a partitioning comment block above the `describe` statement listing all partitions and the test IDs that cover them.

### 1.3 Black-Box vs. White-Box Testing

**Black-box tests** (specification-based) — written from the public interface and documented behavior only. These are mandatory for every exported engine method.

**White-box tests** (implementation-based) — written after reading the implementation to hit specific branches. These are required when:
- A method has 3+ conditional branches
- Error paths exist that black-box tests cannot naturally reach
- A complex algorithm has internal invariants to verify

**DON'T** write white-box tests that depend on private implementation details (field names, internal method names). If the internals change and the behavior is unchanged, white-box tests must still pass.

### 1.4 Regression Rules

**DO** add a regression test every time a bug is fixed. The test must:
1. Reproduce the exact input that triggered the bug
2. Assert the correct output (not the buggy output)
3. Include a comment: `// Regression: <issue description> — fixed <date>`

**DON'T** fix a bug without a regression test. A bug without a regression test will recur.

**PRISM rule:** The CI pipeline runs the full regression suite on every PR. A regression test failure blocks merge, no exceptions.

### 1.5 Coverage Expectations

| Layer | Minimum Branch Coverage |
|-------|------------------------|
| Engine core methods | 95% |
| Dispatcher action handlers | 90% |
| Utility functions | 90% |
| React components (logic branches) | 80% |
| CLI commands | 85% |

**DO** measure coverage on the branch metric, not line metric. Line coverage hides untested conditional branches.

**DON'T** use coverage percentage as a proxy for test quality. 100% line coverage with only happy-path tests is worse than 80% branch coverage with thoughtful partitioning.

### 1.6 Test Isolation

**DO** ensure every test is independent — it must be able to run in any order and pass without relying on state left by a previous test.

**DON'T** share mutable state between tests. Use `beforeEach` to reset state, not `before` (which runs once).

**PRISM rule:** Engine tests must never read from the filesystem, network, or database. Use injected mock data. Catalog data (tools, materials, machines) must be passed as constructor arguments or function parameters, never imported as global singletons inside the function under test.

---

## 2. Code Quality

*Sources: MIT 6.005 R4 (Code Review), R8 (Avoiding Debugging)*

### 2.1 DRY — Don't Repeat Yourself

**DO** extract any logic that appears in two or more places into a named function, constant, or module.

**DON'T** copy-paste code between engines, dispatchers, or components. A copied bug becomes two bugs.

**PRISM rule:** The Kienzle force formula `Fc = kc1_1 * ap * fz^(1 - mc)` exists exactly once: in `src/physics/constants.ts`. Every engine that needs it imports from there. If you find yourself typing the formula inline, stop and import.

```typescript
// BAD — formula duplicated inline
const Fc = kc * ap * Math.pow(fz, 1 - mc);

// GOOD — import from canonical source
import { kienzleForce } from '../physics/constants';
const Fc = kienzleForce({ kc1_1, mc, ap, fz });
```

### 2.2 Fail Fast

**DO** validate inputs at the earliest possible point and throw a descriptive error immediately when a precondition is violated.

**DON'T** silently accept bad inputs and let errors propagate deep into a call stack where the original cause is obscured.

```typescript
// BAD — silent failure, error surfaces 10 calls later
function computeToolLife(vc: number, C: number, n: number) {
  return Math.pow(C / vc, 1 / n); // NaN if n=0, Infinity if vc=0
}

// GOOD — fail fast with a precise message
function computeToolLife(vc: number, C: number, n: number): number {
  if (vc <= 0) throw new Error(`computeToolLife: vc must be > 0, got ${vc}`);
  if (n <= 0) throw new Error(`computeToolLife: Taylor exponent n must be > 0, got ${n}`);
  if (C <= 0) throw new Error(`computeToolLife: Taylor constant C must be > 0, got ${C}`);
  return Math.pow(C / vc, 1 / n);
}
```

**PRISM rule:** Zod schemas are the primary fail-fast mechanism at dispatcher entry points. Every dispatcher action schema must reject invalid inputs before the engine is called. Engine internals add a second layer of assertions for physics-domain constraints (e.g., positive cutting speed, non-zero depth of cut).

### 2.3 No Magic Numbers

**DO** give every numeric constant a named identifier with a comment explaining its origin.

**DON'T** embed raw numbers in formulas without names.

```typescript
// BAD
const Ra = 0.0321 * Math.pow(fz, 2) / re;

// GOOD
// Surface roughness coefficient from Brammertz (1961), valid for carbide inserts
const BRAMMERTZ_Ra_COEFFICIENT = 0.0321; // dimensionless, insert-dependent
const Ra = BRAMMERTZ_Ra_COEFFICIENT * Math.pow(fz, 2) / re;
```

**PRISM rule:** Physical constants (material properties, standard tolerances, ISO grades) live in `src/physics/constants.ts` or the relevant catalog file. Never hardcode a material property (density, Young's modulus, thermal conductivity) inside an engine function.

### 2.4 Good Names

**Rules for naming in PRISM:**

| Entity | Convention | Example |
|--------|-----------|---------|
| Engine class | `PascalCase` + `Engine` suffix | `SpeedFeedOrchestratorEngine` |
| Engine method | `camelCase`, verb-noun | `computeToolLife`, `resolveToolHolder` |
| Dispatcher | `camelCase` + `Dispatcher` suffix | `calcDispatcher` |
| Dispatcher action | `snake_case` string | `"sf_orchestrate"` |
| Zod schema | `camelCase` + `Schema` suffix | `toolLifeInputSchema` |
| React component | `PascalCase` | `SpeedFeedPanel` |
| React hook | `use` prefix + `PascalCase` | `useToolCatalog` |
| Physical variable | Standard symbol or spelled out | `Vc` (cutting speed), `ap` (axial depth) |
| Boolean | `is`/`has`/`can` prefix | `isChatterRisk`, `hasCollision` |

**DON'T** use single-letter variables except in mathematical formulas where the symbol is universally established (e.g., `n` for Taylor exponent, `E` for Young's modulus). Even then, add a comment on first use.

**DON'T** use abbreviations that are not domain-standard. `matl` is not a word. `material` is.

### 2.5 Modularity and One Responsibility

**DO** design each engine to do one thing well. An engine that computes tool life should not also generate G-code.

**DON'T** build "god engines" that accumulate unrelated responsibilities over time. When an engine exceeds ~1500 lines, evaluate whether it should be split.

**PRISM rule:** Each engine file exports exactly one primary class. Helper types, constants, and pure utility functions used only by that engine may live in the same file. Shared utilities go in `src/utils/`.

### 2.6 Assertions for Invariants

**DO** use assertions (not if-throw guards) to document invariants that must hold throughout an algorithm — conditions that, if violated, indicate a programming error, not a user error.

```typescript
// User error — throw with message
if (materialHardness > 70) {
  throw new Error('Material hardness exceeds maximum supported HRC');
}

// Programming invariant — assert
console.assert(result.toolLife > 0, 'Taylor life must be positive after validated inputs');
```

In production builds, assertions may be stripped. The semantic distinction matters: assertions document correctness assumptions; thrown errors communicate user-visible failures.

---

## 3. Specifications & API Design

*Sources: MIT 6.005 R6 (Specifications), R7 (Designing Specifications)*

### 3.1 Zod Schemas as Contracts

**DO** treat Zod schemas as the formal specification of every engine's public interface. The schema is the contract — it defines what inputs are valid and what the caller can depend on.

**DON'T** bypass schema validation. If a caller needs to pass data that the schema rejects, the schema needs to be updated — not circumvented with `as unknown as T` casts.

```typescript
// Specification-first pattern
export const speedFeedInputSchema = z.object({
  material: z.string().min(1),           // pre-condition: non-empty material ID
  toolDiameter: z.number().positive(),   // pre-condition: positive diameter in mm
  operation: z.enum(['roughing', 'finishing', 'semi-finishing']),
  machineId: z.string().optional(),      // optional: defaults to generic limits
});

export type SpeedFeedInput = z.infer<typeof speedFeedInputSchema>;
// Post-condition guaranteed by implementation: returned Vc > 0, fz > 0
```

### 3.2 Pre-conditions and Post-conditions

**DO** document pre-conditions (what must be true on input) and post-conditions (what is guaranteed on output) in JSDoc for every public engine method.

```typescript
/**
 * Computes optimal cutting speed using Taylor's extended tool life equation.
 *
 * @pre vc > 0 (cutting speed in m/min)
 * @pre T > 0 (target tool life in minutes)
 * @pre material is a valid ISO material group (P/M/K/N/S/H)
 * @post returns speed in m/min, guaranteed > 0
 * @post returned speed results in tool life within ±15% of target T
 */
computeOptimalVc(vc: number, T: number, material: string): number
```

### 3.3 Behavioral Equivalence — Spec, Not Implementation

**DO** write specs in terms of observable behavior (outputs given inputs), not in terms of how the computation is performed. Two implementations that produce the same outputs for all valid inputs are behaviorally equivalent and interchangeable.

**DON'T** write specs that say "uses Newton-Raphson iteration" — that is an implementation detail. Say "converges to within 0.01% of the exact solution."

**PRISM rule:** When refactoring an engine algorithm (e.g., switching from a lookup table to a physics formula), the spec (Zod schema + JSDoc pre/post-conditions) must not change. If the outputs differ, it is a new version of the spec, not a refactor.

### 3.4 REST API Conventions

**DO** follow these conventions for all PRISM API endpoints:

```
GET    /api/v1/tools                    — list tools (paginated)
GET    /api/v1/tools/:id                — get one tool
POST   /api/v1/tools/search             — complex search (body params)
POST   /api/v1/calculate/speed-feed     — trigger a calculation
GET    /api/v1/jobs/:id/status          — poll async job status
DELETE /api/v1/sessions/:id             — end a session
```

**DON'T** use verbs in URL paths (`/api/calculateSpeed` is wrong). Use nouns for resources, HTTP methods for actions.

**DON'T** mix singular and plural. Pick one per resource family and be consistent. PRISM uses plural (`/tools`, `/machines`, `/materials`).

### 3.5 Error Envelopes

**DO** return all errors in the standard PRISM error envelope:

```typescript
interface PrismErrorResponse {
  success: false;
  error: {
    code: string;        // machine-readable, e.g. "TOOL_NOT_FOUND"
    message: string;     // human-readable
    field?: string;      // for validation errors, which field failed
    details?: unknown;   // optional structured detail for debugging
  };
  requestId: string;     // for log correlation
}
```

**DON'T** return raw exception messages or stack traces to clients in production. Log them server-side; return only the error code and a safe message.

**HTTP status code mapping:**
- `400` — invalid input (Zod validation failure)
- `401` — not authenticated
- `403` — authenticated but not authorized (wrong tier)
- `404` — resource not found
- `409` — conflict (e.g., duplicate tool ID)
- `422` — semantically invalid (valid JSON, but business rule violated)
- `429` — rate limited
- `500` — internal error (never expose details)

### 3.6 Stronger vs. Weaker Specifications

A spec S2 is **stronger** than S1 if S2 has a smaller or equal precondition set AND a larger or equal postcondition set. Stronger specs are safer for callers.

**DO** prefer stronger postconditions when the cost is low. Guaranteeing `result.length > 0` is a stronger and more useful postcondition than "returns an array."

**DON'T** write unnecessarily weak specs to avoid committing. A spec that says "may return any number" is useless. Commit to what the implementation actually guarantees.

---

## 4. State Management

*Sources: MIT 6.005 R9 (Mutability & Immutability), R15 (Equality)*

### 4.1 Engine Purity — No Side Effects

**DO** design all computation engines as pure functions: same inputs always produce the same outputs, with no mutation of shared state, no I/O, no random number generation (unless seeded deterministically), no global variable reads.

```typescript
// GOOD — pure engine method
computeToolLife(params: ToolLifeInput): ToolLifeResult {
  const { Vc, C, n } = params;
  return { toolLifeMinutes: Math.pow(C / Vc, 1 / n) };
}

// BAD — reads global, produces non-deterministic results
computeToolLife(params: ToolLifeInput): ToolLifeResult {
  const Vc = params.Vc ?? globalDefaults.Vc; // global read
  const noise = Math.random() * 0.05;        // non-deterministic
  return { toolLifeMinutes: Math.pow(C / Vc, 1 / n) * (1 + noise) };
}
```

**PRISM rule:** If an engine needs randomness (e.g., Monte Carlo), the PRNG seed must be passed as an input parameter so tests can be deterministic.

### 4.2 Immutability in React State

**DO** treat all React state as immutable. Always create new objects/arrays rather than mutating existing ones.

```typescript
// BAD — mutating state directly
const addTool = (tool: Tool) => {
  toolList.push(tool);           // mutation!
  setToolList(toolList);         // React may not re-render
};

// GOOD — create new array
const addTool = (tool: Tool) => {
  setToolList(prev => [...prev, tool]);
};
```

**DO** use `Object.freeze()` on constants and catalog data that should never change at runtime.

**DON'T** store derived state in React state when it can be computed from other state. Derived values belong in `useMemo`, not `useState`.

### 4.3 Immutable Result Objects from Engines

**DO** return plain data objects (POJOs) from engines, not class instances with methods. Results are data, not objects with behavior.

```typescript
// BAD — result as class instance
class ToolLifeResult {
  constructor(public minutes: number) {}
  toHours() { return this.minutes / 60; }  // behavior in result
}

// GOOD — result as plain data
interface ToolLifeResult {
  toolLifeMinutes: number;
  toolLifeHours: number;    // computed at creation time
  confidence95: [number, number];
}
```

### 4.4 Equality Semantics

**DO** compare objects by value, not by reference, when checking logical equality.

```typescript
// BAD — reference equality on objects
if (selectedTool === previousTool) { ... }  // false even if same content

// GOOD — value equality
import { isDeepEqual } from '../utils/equality';
if (isDeepEqual(selectedTool, previousTool)) { ... }
```

**PRISM rule:** Tool, material, and machine records are compared by their catalog ID (`toolId`, `materialCode`, `machineId`), not by object reference. Always use the ID field as the equality key in React keys, map lookups, and deduplication logic.

### 4.5 Isolating Mutable State

**DO** confine all mutable state to the outermost layer possible:
- In engines: no mutable state at all (pure functions)
- In React: state lives in the component tree root that owns the data
- In the Express server: request-scoped state only; no shared mutable globals

**DON'T** use module-level mutable variables in engine files. They persist across requests in a Node.js server and cause subtle cross-request contamination.

---

## 5. Type System & Interfaces

*Sources: MIT 6.005 R12 (Abstract Data Types), R13 (Abstraction Functions & Rep Invariants), R14 (Interfaces)*

### 5.1 Abstract Data Types (ADTs)

**DO** design types around operations, not data layout. Ask "what can I do with this type?" before "what data does it contain?"

The four operation categories for PRISM types:

| Category | Description | PRISM Example |
|----------|-------------|---------------|
| **Creators** | Produce new instances | `ToolCatalog.fromCsv()`, `Material.fromISOCode()` |
| **Producers** | Derive new instances from old | `tool.withDiameter(12)` |
| **Mutators** | Change existing instances | `session.addTool(tool)` — only in mutable types |
| **Observers** | Return information about instances | `tool.getDiameter()`, `catalog.search(query)` |

### 5.2 Rep Invariants

**DO** document the representation invariant — the conditions that must always hold on an object's internal fields — in a JSDoc comment on the class.

```typescript
/**
 * Represents a cutting tool from the PRISM catalog.
 *
 * Rep invariant:
 * - diameter > 0
 * - flutes >= 1
 * - if toolType === 'endmill', diameter <= 100 (mm)
 * - catalogId matches /^[A-Z]{2,4}-\d{4,8}$/
 */
class CuttingTool {
  private readonly diameter: number;
  private readonly flutes: number;
  // ...
}
```

**DO** add a `checkRep()` method to complex types that asserts all invariant conditions. Call it at the end of every constructor and mutator during development/testing.

### 5.3 Abstraction Functions

**DO** document the abstraction function — the mapping from the concrete representation to the abstract value the type represents — when the representation is non-obvious.

```typescript
/**
 * Abstraction function:
 * AF(this) = a tool catalog containing all tools t where
 *   this.toolMap.has(t.catalogId) && this.toolMap.get(t.catalogId) === t
 *
 * Rep invariant:
 * - toolMap.size >= 0
 * - for all entries (id, tool): id === tool.catalogId
 */
class ToolCatalog { ... }
```

### 5.4 Rep Independence (Information Hiding)

**DO** hide the concrete representation behind the interface. Callers should be able to use a type without knowing how it stores its data.

**DON'T** expose internal data structures through public fields.

```typescript
// BAD — exposes internal array
class ToolCatalog {
  public tools: Tool[];  // caller can mutate the internal array
}

// GOOD — rep is hidden
class ToolCatalog {
  private tools: Map<string, Tool>;

  getById(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  list(): readonly Tool[] {
    return Array.from(this.tools.values());  // returns a copy
  }
}
```

### 5.5 TypeScript Interface Patterns

**DO** use `interface` for object shapes that will be implemented by classes or used as public API contracts.

**DO** use `type` for unions, intersections, and aliases of primitives.

```typescript
// Interface for a contract that can be implemented
interface Engine<TInput, TOutput> {
  compute(input: TInput): TOutput;
  validate(input: unknown): TInput;
}

// Type for a union
type OperationType = 'roughing' | 'finishing' | 'semi-finishing' | 'drilling';

// Type for a complex intersection
type AuthenticatedRequest = Request & { user: PrismUser; tier: PricingTier };
```

**DON'T** use `any`. Use `unknown` when the type is genuinely unknown and narrow it with type guards.

**DON'T** use non-null assertions (`!`) except when you can immediately follow it with a comment explaining exactly why null is impossible.

### 5.6 Generics

**DO** use generics to write type-safe reusable utilities.

```typescript
// Generic result type used across all engines
type EngineResult<T> =
  | { success: true; data: T; warnings: string[] }
  | { success: false; error: string; code: string };

// Generic paginated response
interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}
```

**DON'T** use overly constrained generics that force callers into awkward patterns. If a generic has more than 3 type parameters, consider whether a simpler design exists.

---

## 6. Client/Server Architecture

*Sources: MIT 6.005 R21 (Sockets & Networking)*

### 6.1 Stateless Requests

**DO** design every REST endpoint to be stateless. Each request must carry all information needed to process it (authentication token, input parameters, pagination state). The server must not rely on in-memory session state to fulfill a request.

**DON'T** use server-side sessions stored in memory. Use JWT tokens for auth state. If session data is needed (e.g., multi-step calculation wizards), persist it in PostgreSQL with a session ID that the client passes on each request.

### 6.2 Wire Protocol

**DO** use JSON for all REST API payloads. Use the Content-Type header `application/json` on all requests and responses.

**DO** version the API in the URL path (`/api/v1/`). Breaking changes require a new version prefix.

**DO** define the wire format using Zod schemas that are shared between the frontend (`/web/src/`) and backend (`/src/`). Schemas live in `src/schemas/` and are imported by both.

```typescript
// src/schemas/speedFeedSchema.ts — shared by frontend and backend
export const speedFeedRequestSchema = z.object({
  materialCode: z.string(),
  toolId: z.string(),
  operation: z.enum(['roughing', 'finishing']),
  machineId: z.string().optional(),
});

export const speedFeedResponseSchema = z.object({
  Vc: z.number(),       // cutting speed m/min
  fz: z.number(),       // feed per tooth mm/tooth
  n: z.number(),        // spindle speed RPM
  Vf: z.number(),       // table feed mm/min
  warnings: z.array(z.string()),
});
```

### 6.3 Auth Patterns

**DO** use JWT Bearer tokens for API authentication. Token format:

```
Authorization: Bearer <jwt>
```

**DO** validate the JWT on every request in Express middleware before any route handler runs. Never trust a request that has not passed JWT validation.

**DON'T** embed user IDs or permissions in URLs or query parameters. They belong in the validated JWT payload.

**Pricing tier enforcement:**

```typescript
// Middleware pattern — enforce tier before expensive computations
router.post('/calculate/monte-carlo', requireTier('Pro'), handler);
```

Tier hierarchy: `Free < Starter < Pro < Shop < Enterprise`. Features available at tier T are available at all tiers above T.

### 6.4 Request/Response Logging

**DO** log every request with: method, path, status code, duration (ms), user ID (if authenticated), and a request ID (UUID generated per request).

**DON'T** log request bodies that may contain sensitive data (passwords, API keys). Log only safe fields.

---

## 7. Frontend Architecture

*Sources: MIT 6.005 R24 (Graphical User Interfaces)*

### 7.1 View Tree and Component Composition

**DO** organize React components in a strict view tree hierarchy:

```
<App>
  <Layout>
    <Sidebar />          — navigation, never owns computation state
    <MainContent>
      <CalculatorPage>
        <InputPanel />   — controlled inputs, emits events upward
        <ResultPanel />  — displays data, never computes
      </CalculatorPage>
    </MainContent>
  </Layout>
</App>
```

**Rules:**
- Data flows down (props)
- Events flow up (callbacks)
- State lives at the lowest common ancestor of all components that need it

**DON'T** pass data through more than 3 component levels via props (prop drilling). Use React Context or Zustand for deep shared state.

### 7.2 Frontend/Backend Separation

**DO** keep computation out of React components. Components render data; they do not compute it.

```typescript
// BAD — physics computation in a component
const SpeedDisplay = ({ material, tool }) => {
  const Vc = 1000 * (material.hardness > 45 ? 80 : 150) / (Math.PI * tool.diameter);
  return <div>{Vc.toFixed(1)} m/min</div>;
};

// GOOD — component renders data from an API call or engine result
const SpeedDisplay = ({ result }: { result: SpeedFeedResult }) => {
  return <div>{result.Vc.toFixed(1)} m/min</div>;
};
```

**PRISM rule:** Any computation that involves physics formulas, catalog lookups, or multi-step logic belongs in a backend engine, not in a React component or custom hook. Hooks may call API endpoints or (in desktop/offline mode) call engine functions, but they must not contain the formulas themselves.

### 7.3 Controlled Inputs

**DO** use controlled inputs everywhere in PRISM. The React state is the single source of truth for all form field values.

```typescript
// GOOD — controlled input
const [feedRate, setFeedRate] = useState<string>('');

<input
  type="number"
  value={feedRate}
  onChange={e => setFeedRate(e.target.value)}
/>
```

**DON'T** use uncontrolled inputs (`ref` + `defaultValue`) for form fields that participate in calculation logic. Uncontrolled inputs make it impossible to validate, transform, or derive state from input values.

### 7.4 Input Handling and Event Semantics

**DO** separate input events by semantic meaning:

| Event | Use for |
|-------|---------|
| `onChange` | Update state immediately as user types |
| `onBlur` | Validate and normalize when user leaves field |
| `onSubmit` | Trigger calculation or API call |
| `onKeyDown` | Handle keyboard shortcuts |

**DO** debounce expensive operations triggered by `onChange` (e.g., real-time search against the 86,000-tool catalog). Use a 300ms debounce as the default.

**DON'T** trigger API calls on every keystroke. Debounce or trigger only on `onBlur`/`onSubmit`.

### 7.5 Component File Organization

```
src/components/
  calculator/
    SpeedFeedCalculator.tsx      — page-level component (owns state)
    SpeedFeedInputPanel.tsx      — controlled input form
    SpeedFeedResultPanel.tsx     — result display
    SpeedFeedResultPanel.test.tsx
  shared/
    NumberInput.tsx              — reusable numeric input with units
    Tooltip.tsx
    LoadingSpinner.tsx
```

**DO** co-locate component tests with their component files.

**DON'T** put more than one primary exported component per file. Helper sub-components used only by the primary component may be in the same file, unexported.

---

## 8. Concurrency & Real-time

*Sources: MIT 6.005 R19 (Concurrency), R20 (Thread Safety), R22 (Queues & Message-Passing), R23 (Locks & Synchronization)*

### 8.1 WebSocket Connection Lifecycle

**DO** handle the full WebSocket lifecycle explicitly:

```typescript
// Server-side lifecycle
ws.on('open', () => { /* register client, send initial state */ });
ws.on('message', (data) => { /* process message, reply */ });
ws.on('close', (code, reason) => { /* clean up, remove from registry */ });
ws.on('error', (err) => { /* log error, attempt graceful close */ });
```

**DO** implement a heartbeat (ping/pong) to detect dead connections. Default interval: 30 seconds. Close connections that miss 3 consecutive pings.

**DON'T** accumulate WebSocket connections without cleanup. A stale connection registry is a memory leak.

### 8.2 Message-Passing Pattern

**DO** design WebSocket messages as typed, versioned envelopes:

```typescript
interface WsMessage<T = unknown> {
  type: string;           // e.g. "calculation_result", "progress_update"
  version: '1';           // bump on breaking changes
  requestId: string;      // correlate responses to requests
  payload: T;
  timestamp: number;      // Unix ms
}
```

**DON'T** send raw data without an envelope. The `type` field is the routing key; without it, the client cannot dispatch the message to the right handler.

### 8.3 Avoiding Race Conditions

**DO** make all Express route handlers and WebSocket message handlers treat each request/message as independent. If shared mutable state must be accessed, use an async queue (e.g., `p-queue`) to serialize access, not raw async/await which provides no ordering guarantee.

**PRISM rule:** Long-running calculations (Monte Carlo with >10,000 samples, full PostProcessor pipeline, simulation runs) must be executed asynchronously as jobs. The API returns a `jobId` immediately; the client polls `/api/v1/jobs/:id/status` or subscribes via WebSocket for progress updates.

```typescript
// Pattern for long-running calculations
POST /api/v1/calculate/monte-carlo → { jobId: "abc123", status: "queued" }
GET  /api/v1/jobs/abc123           → { status: "running", progress: 42 }
GET  /api/v1/jobs/abc123           → { status: "complete", result: {...} }
```

### 8.4 Confinement

**DO** confine mutable state to a single thread/async context. In Node.js, this means module-level mutable variables must not be used in request handlers (each request may interleave).

**DO** use confinement as the first line of defense for thread safety. If data is only ever accessed by one context, no synchronization is needed.

### 8.5 Immutability as Thread Safety

**DO** use `Object.freeze()` and `readonly` TypeScript modifiers for data that is shared across contexts (catalog data, physics constants, configuration).

Frozen/readonly data requires no synchronization because it cannot be modified.

---

## 9. Functional Patterns

*Sources: MIT 6.005 R25 (Map/Filter/Reduce)*

### 9.1 Prefer Map/Filter/Reduce Over Loops

**DO** use `Array.map`, `Array.filter`, and `Array.reduce` over imperative `for`/`while` loops when transforming collections. Functional pipelines are more readable and less error-prone.

```typescript
// BAD — imperative loop with mutation
const results: ToolLifeResult[] = [];
for (let i = 0; i < tools.length; i++) {
  if (tools[i].material === 'carbide') {
    results.push(computeToolLife(tools[i], conditions));
  }
}

// GOOD — functional pipeline
const results = tools
  .filter(t => t.material === 'carbide')
  .map(t => computeToolLife(t, conditions));
```

### 9.2 Pure Functions as Building Blocks

**DO** compose complex operations from small, named, pure functions. Each function should be independently testable.

```typescript
// Composed from pure functions
const optimizeCuttingParameters = (job: MachiningJob): OptimizedParams =>
  pipe(
    job,
    resolveMaterial,          // pure: MaterialCode → MaterialProperties
    computeBaseSpeedFeed,     // pure: MaterialProperties → SpeedFeed
    applyMachineConstraints,  // pure: SpeedFeed × Machine → SpeedFeed
    applyToolConstraints,     // pure: SpeedFeed × Tool → SpeedFeed
    roundToMachineResolution  // pure: SpeedFeed → SpeedFeed
  );
```

### 9.3 Avoid Side Effects in Map/Filter/Reduce

**DON'T** use `.forEach` or `.map` for side effects. Use a `for...of` loop to make the intent explicit when side effects are necessary.

```typescript
// BAD — map used for side effects (confusing)
tools.map(t => { cache.set(t.id, t); });

// GOOD — explicit loop for side effects
for (const tool of tools) {
  cache.set(tool.id, tool);
}
```

### 9.4 Functional Patterns in Dispatcher Pipeline

**DO** model dispatcher action pipelines as function composition:

```typescript
// Pipeline: validate → resolve → compute → format
const handleSpeedFeedAction = pipe(
  validateInput(speedFeedInputSchema),
  resolveToolFromCatalog,
  resolveMaterialFromDB,
  runSpeedFeedEngine,
  formatResult
);
```

Each stage is a pure function or an async function that returns a new value. No stage mutates the previous result.

---

## 10. Performance

*Sources: MIT 6.046J Design and Analysis of Algorithms, MIT 15.082J Network Optimization*

### 10.1 Algorithm Complexity for Large Catalogs

PRISM's catalogs are large: 86,000 tools, 2,957 materials, 910 machines. Algorithm choice matters.

**Required time complexity targets:**

| Operation | Target | Avoid |
|-----------|--------|-------|
| Tool lookup by ID | O(1) — use `Map` | O(n) linear scan |
| Tool search by filter | O(k) where k = results | O(n) full scan if indexable |
| Material property lookup | O(1) — use `Map` | O(n) |
| Machine capability check | O(1) per check | O(m) per check |
| Route resolution in ToolRouter | O(1) — use `Map` | O(r) where r = route count |

**DO** pre-index catalogs at startup. Do not build indexes on every search request.

```typescript
// Pre-indexed at module load time
const toolById = new Map(toolCatalog.map(t => [t.id, t]));
const toolsByMaterial = new Map<string, Tool[]>();
for (const tool of toolCatalog) {
  const list = toolsByMaterial.get(tool.material) ?? [];
  list.push(tool);
  toolsByMaterial.set(tool.material, list);
}
```

### 10.2 Pagination

**DO** paginate all list endpoints. Never return unbounded arrays.

```typescript
interface PaginationParams {
  page: number;      // 1-indexed
  pageSize: number;  // max 100, default 20
}
```

**DO** use cursor-based pagination for large result sets where offset-based pagination is expensive (e.g., tool catalog search returning 10,000+ items).

**DON'T** load the entire tool catalog into a React component's state. Load pages as needed.

### 10.3 Debounce and Throttle

**DO** debounce user input that triggers search or calculation:
- Tool search field: 300ms debounce
- Real-time parameter sliders: 16ms throttle (1 frame at 60fps)
- Resize observers: 100ms debounce

**DO** cancel in-flight API requests when a new one supersedes them. Use `AbortController`.

```typescript
useEffect(() => {
  const controller = new AbortController();
  fetchToolSearch(query, { signal: controller.signal })
    .then(setResults)
    .catch(e => { if (e.name !== 'AbortError') setError(e); });
  return () => controller.abort();
}, [query]);
```

### 10.4 Database Indexing

**DO** create PostgreSQL indexes on all columns used in WHERE clauses and ORDER BY clauses for the primary data tables:

```sql
-- Required indexes for PRISM data tables
CREATE INDEX idx_tools_material ON tools(material_code);
CREATE INDEX idx_tools_manufacturer ON tools(manufacturer);
CREATE INDEX idx_tools_diameter ON tools(diameter_mm);
CREATE INDEX idx_tools_type ON tools(tool_type);
CREATE INDEX idx_machines_brand ON machines(brand);
CREATE INDEX idx_materials_iso_group ON materials(iso_group);
```

**DO** use `EXPLAIN ANALYZE` to verify index usage before deploying new queries.

### 10.5 Memoization

**DO** memoize expensive pure computations in React with `useMemo` and `useCallback`:

```typescript
// Memoize derived data from large catalogs
const filteredTools = useMemo(
  () => tools.filter(matchesFilter(filter)),
  [tools, filter]  // only recompute when tools or filter changes
);
```

**DON'T** memoize cheap computations (simple arithmetic, string concatenation). Memoization has overhead; it is only worth applying to computations that take >1ms.

### 10.6 Graph Algorithms for Scheduling (from MIT 15.082J)

PRISM uses graph algorithms for operation sequencing and tool-change optimization.

**DO** use topological sort (Kahn's algorithm) for operation dependency ordering. Time complexity O(V + E) where V = operations, E = dependencies.

**DO** use the traveling salesman heuristics for tool-change minimization (2-opt improvement on nearest-neighbor initial solution). For typical job sizes (< 50 operations), this runs in < 10ms.

**DON'T** use exact TSP for tool-change optimization. It is NP-hard and impractical beyond 20 nodes. The 2-opt heuristic gives solutions within 5% of optimal for practical job sizes.

---

## 11. 3D Graphics

*Sources: MIT 6.837 Computer Graphics*

### 11.1 Three.js Scene Setup

**DO** follow this initialization pattern for all 3D views in PRISM:

```typescript
// Standard PRISM 3D view initialization
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,          // FOV — 45° is appropriate for CAD/machine views
  aspect,      // updated on resize
  0.1,         // near clip — 0.1mm for machine-scale scenes
  10000        // far clip — 10m for full machine envelope
);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap at 2x
```

### 11.2 Camera Controls

**DO** use `OrbitControls` for all machine/part inspection views. Configure it as:

```typescript
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;      // smooth inertia
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false; // pan in XZ plane for machine views
controls.minDistance = 1;            // 1mm minimum zoom
controls.maxDistance = 5000;         // 5m maximum zoom
```

**DON'T** use `TrackballControls` for machine views. It lacks a stable "up" direction and is disorienting for CNC machine orientation (Z-up convention).

### 11.3 Culling and Level of Detail

**DO** implement frustum culling for scenes with many objects (e.g., tool assembly libraries). Three.js performs frustum culling automatically when `object.frustumCulled = true` (the default), but ensure bounding spheres are computed:

```typescript
geometry.computeBoundingSphere();
geometry.computeBoundingBox();
```

**DO** implement LOD (Level of Detail) for complex machine models:

```typescript
const lod = new THREE.LOD();
lod.addLevel(highDetailMesh, 0);     // full detail within 500mm
lod.addLevel(medDetailMesh, 500);    // medium detail 500mm–2000mm
lod.addLevel(lowDetailMesh, 2000);   // low detail beyond 2000mm
```

**DON'T** render all tool catalog entries as full 3D models simultaneously. Use a virtual list — only render tools that are visible in the UI list.

### 11.4 Memory Management

**DO** dispose of Three.js objects when components unmount:

```typescript
useEffect(() => {
  return () => {
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    controls.dispose();
  };
}, []);
```

**DON'T** create new `THREE.Geometry`, `THREE.Material`, or `THREE.Texture` objects inside the render loop. Create them once and reuse.

### 11.5 Coordinate Convention

**DO** use the PRISM coordinate convention throughout all 3D views:
- Z-axis = spindle axis (vertical for vertical machining centers)
- X-axis = left/right table travel
- Y-axis = front/back table travel
- Units: millimeters

All imported STEP/STL models must be transformed to match this convention before rendering.

---

## 12. Knowledge Systems

*Sources: MIT 6.871 Knowledge-Based Applications*

### 12.1 Rule Engine Design

PRISM's `MachiningPlaybookEngine` (296 rules, 42 categories) and related knowledge systems follow these principles:

**DO** represent rules as data, not code. Each rule is a declarative record:

```typescript
interface PlaybookRule {
  id: string;                    // unique, stable identifier
  category: string;              // domain category
  condition: RuleCondition;      // when the rule applies
  recommendation: string;        // what to do
  rationale: string;             // why (physics/empirical basis)
  evidenceLevel: EvidenceLevel;  // certainty level
  formula_ref?: string;          // link to FormulaRegistry
  standard_ref?: string;         // ISO/DIN/ASME standard
  confidence: number;            // 0–1 weight for ranking
}
```

**DON'T** encode rule logic as TypeScript `if` statements scattered through engine code. Rules must be in the rules database, not embedded in algorithms.

### 12.2 Forward Chaining

**DO** implement rule matching as forward chaining: evaluate all rules against the current context, collect those whose conditions match, rank by confidence, return the top N recommendations.

```typescript
// Forward chaining pattern
const matchingRules = allRules.filter(rule =>
  evaluateCondition(rule.condition, context)
);
const rankedRules = matchingRules.sort((a, b) => b.confidence - a.confidence);
return rankedRules.slice(0, maxResults);
```

**DON'T** hard-code rule priority or ordering. Let confidence scores drive ranking. This allows rules to be updated without changing the engine code.

### 12.3 Confidence Weighting

**DO** assign confidence scores to rules based on evidence quality:

| Evidence Level | Confidence Range | Source |
|---------------|-----------------|--------|
| `FIRST_PRINCIPLES` | 0.95–1.0 | Derived from physics equations |
| `PEER_REVIEWED` | 0.85–0.95 | Published research (cite DOI/ISBN) |
| `INDUSTRY_STANDARD` | 0.80–0.90 | ISO/DIN/ASME standards |
| `EMPIRICAL` | 0.60–0.80 | Machinist tribal knowledge |
| `HEURISTIC` | 0.40–0.60 | Operational rules of thumb |
| `EXPERIMENTAL` | 0.20–0.40 | Preliminary or contested |

**DO** weight confidence by domain context. A rule with 0.75 base confidence may be boosted to 0.90 when the material and operation match the rule's tested domain exactly.

### 12.4 Rule Categories and Routing

**DO** route rule queries to the most specific applicable category first, then fall back to broader categories.

```
Query: titanium + roughing + high spindle speed
→ Try category: "hard_material_roughing"
→ Fall back: "roughing"
→ Fall back: "general_milling"
```

**DO** maintain the canonical operation order from `CANONICAL_ORDER` in the PlaybookEngine when returning multi-operation plans. This ensures recommendations are presented in machining sequence, not alphabetical or arbitrary order.

### 12.5 Knowledge Traceability

**DO** make every recommendation traceable to its source:

```typescript
interface Recommendation {
  text: string;
  ruleId: string;          // e.g. "PB-042"
  evidenceLevel: string;
  formulaRef?: string;     // e.g. "F-TAYLOR-001"
  standardRef?: string;    // e.g. "ISO 3685"
  confidence: number;
}
```

**DON'T** return recommendations without attribution. Users must be able to understand why a recommendation was made and evaluate its authority.

---

## 13. System Architecture

*Sources: MIT 1.124J Foundations of Software Engineering*

### 13.1 Modular Design

**DO** organize PRISM into modules with explicit, minimal interfaces between them.

```
PRISM Module Boundaries:
─────────────────────────────────────────────
  Web Frontend (React)
       ↕ REST API / WebSocket
  API Layer (Express 5)
       ↕ Engine Interface
  Engine Layer (TypeScript, pure functions)
       ↕ Catalog/DB Interface
  Data Layer (PostgreSQL + in-memory catalogs)
─────────────────────────────────────────────
```

**Rule:** Code in the Web Frontend must not import directly from the Engine layer. It must go through the API layer. (Exception: shared schema types, which are data, not logic.)

**Rule:** The Engine layer must not import from the API layer. Engines are pure functions; they know nothing about HTTP, WebSockets, or authentication.

### 13.2 Integration Boundaries

**DO** define explicit integration points between modules using shared Zod schemas. The schema is the contract at every boundary.

```
Frontend ↔ API:      src/schemas/api/
Engine ↔ Dispatcher: src/schemas/dispatchers/
Dispatcher ↔ CLI:    src/schemas/cli/
```

When a schema at a boundary changes, both sides of the boundary must be updated in the same commit.

### 13.3 Dependency Direction

**DO** enforce strict dependency direction: modules may only depend on modules below them in the layer hierarchy.

```
Allowed:   Frontend → API Layer → Engine Layer → Data Layer
Forbidden: Engine Layer → API Layer (upward dependency)
Forbidden: Engine Layer → Frontend (upward dependency)
```

**DO** use dependency injection to invert dependencies where necessary. An engine that needs catalog data receives it as a constructor argument, not by importing the catalog module.

### 13.4 Dispatcher Pattern

The PRISM dispatcher pattern centralizes routing of computation requests:

```typescript
// Every computation goes through a dispatcher
dispatcher.handle({
  action: 'sf_orchestrate',
  payload: validatedInput
});
// → routes to SpeedFeedOrchestratorEngine.compute()
```

**DO** add all new engine actions to the appropriate dispatcher. Never call engine methods directly from route handlers or React components.

**DON'T** add logic to dispatchers. They route; they do not compute. A dispatcher that contains a formula has violated separation of concerns.

### 13.5 Dependency Management

**DO** pin exact versions for all dependencies in `package.json` for production code. Use `npm ci` in CI, not `npm install`.

**DON'T** add new dependencies without evaluating:
1. Bundle size impact
2. License compatibility (PRISM is commercial; GPL dependencies are prohibited)
3. Maintenance status (last commit, open issues, npm weekly downloads)
4. Whether an existing dependency already covers the need

**DO** audit dependencies quarterly: `npm audit` + manual review of major version updates.

### 13.6 Error Propagation Strategy

**DO** let errors propagate upward until they reach a layer that can handle them meaningfully.

- Engine errors (invalid physics domain) → propagate to dispatcher
- Dispatcher errors → propagate to route handler
- Route handler → formats into error envelope, returns HTTP response
- Never swallow errors silently with empty catch blocks

```typescript
// BAD — silent error swallowing
try {
  result = engine.compute(input);
} catch (e) {
  // ← nothing here means the error is lost
}

// GOOD — use silentCatch only when fallback is explicitly intended
result = await silentCatch(engine.compute(input), defaultResult);
// ^ only acceptable if defaultResult is a meaningful fallback
```

---

## 14. Git Workflow

*Sources: MIT 6.005 R5 (Version Control), R27 (Team Version Control)*

### 14.1 Branching Strategy

PRISM uses a trunk-based development workflow with short-lived feature branches:

```
main           — always deployable, protected
  └── feature/PP-MS9-controller-profiles
  └── bugfix/tool-catalog-search-null
  └── refactor/engine-pure-functions
  └── chore/update-zod-v4
```

**Branch naming:** `<type>/<milestone-or-issue>-<short-description>`

Types: `feature`, `bugfix`, `refactor`, `chore`, `docs`, `test`

**DO** keep feature branches short-lived (< 3 days). Long-lived branches accumulate merge conflicts and drift from main.

**DON'T** commit directly to `main`. All changes go through pull requests with at least one review.

### 14.2 Commit Messages

**DO** follow the Conventional Commits format:

```
<type>(<scope>): <summary in imperative mood, max 72 chars>

[optional body — explain WHY, not WHAT]

[optional footer — Breaking changes, closes #issue]
```

**Types:**
- `feat` — new feature or engine
- `fix` — bug fix
- `test` — adding/updating tests
- `refactor` — code change with no behavior change
- `perf` — performance improvement
- `docs` — documentation only
- `chore` — build scripts, CI, dependencies
- `style` — formatting (no logic change)

**Examples:**
```
feat(engine): add CryogenicCuttingEngine with LN2/CO2 heat transfer models

Implements Bromley/Rohsenow LN2 and CO2 heat transfer coefficients.
Integrates with Taylor tool life extension and Kienzle force modification.
Adds 25 tests covering 6 materials and 3 delivery modes.

Closes #847
```

```
fix(dispatcher): resolve calcDispatcher enum mismatch for 87 actions

Actions were registered in the enum but missing from the router cases,
causing a silent fallthrough to the default handler.
```

**DON'T** write commit messages like "fix bug", "update code", "WIP", or "changes". Every commit message must describe what changed and why.

### 14.3 Pull Request Requirements

Every PR must include:

- [ ] Description of what changed and why
- [ ] Link to the milestone/issue it addresses
- [ ] List of new/modified tests
- [ ] Note of any breaking changes to schemas or APIs
- [ ] Build passes (`npm run build` — 0 errors)
- [ ] Test suite passes (`npm test` — 0 failures)

**DO** keep PRs focused. A PR that adds a new engine should not also refactor an unrelated component. Split unrelated changes into separate PRs.

**DON'T** merge a PR with failing tests or TypeScript errors. The `0 TS errors` standard is non-negotiable.

### 14.4 Merge Strategy

**DO** use squash-and-merge for feature branches. This keeps the main branch history clean — one commit per feature, one commit per bug fix.

**DON'T** use merge commits (the "create a merge commit" option). They clutter the log.

**DO** use rebase-and-merge for small, clean branches with well-structured commits that tell a meaningful story (e.g., a multi-commit refactor where each commit is meaningful).

### 14.5 What to Commit and What Not To

**DO commit:**
- All source code changes (`.ts`, `.tsx`, `.json` schemas)
- Test files
- Package.json and package-lock.json changes
- Documentation files

**DON'T commit:**
- `node_modules/` — always in `.gitignore`
- Build output (`dist/`, `build/`) — generated by CI
- `.env` files with secrets
- Large binary files (PDFs, STEP files) — use Git LFS or external storage
- Editor configuration files (`.vscode/`, unless team-agreed)

### 14.6 Conflict Resolution

**DO** resolve merge conflicts in the feature branch before requesting review. A PR with unresolved conflicts is not ready for review.

**DO** use `git rebase main` (not `git merge main`) to incorporate upstream changes into a feature branch. This keeps history linear.

**DON'T** force-push to shared branches. Force-pushing rewrites history and can destroy teammates' work.

---

## Appendix: Quick Reference Card

### Engine Checklist
- [ ] Pure function (no global reads, no side effects, deterministic)
- [ ] Zod schema for input and output
- [ ] Pre/post conditions in JSDoc
- [ ] Fail fast on invalid domain inputs
- [ ] Registered in dispatcher with typed action schema
- [ ] Exported from `src/engines/index.ts`
- [ ] Tests written (partitioned, regression tests for bugs, 95% branch coverage)

### API Endpoint Checklist
- [ ] Zod validation on request body/params
- [ ] Auth middleware applied
- [ ] Tier enforcement middleware applied (if feature-gated)
- [ ] Standard error envelope on all error paths
- [ ] Request ID in response headers
- [ ] Paginated if returning a list

### React Component Checklist
- [ ] No physics formulas or business logic in component
- [ ] Controlled inputs only
- [ ] `useMemo` for derived data from large catalogs
- [ ] Debounce on search/filter inputs
- [ ] `AbortController` for in-flight API requests
- [ ] Cleanup in `useEffect` return function

### Commit Checklist
- [ ] Conventional Commits format
- [ ] Imperative mood ("add" not "added")
- [ ] Body explains WHY if non-obvious
- [ ] `npm run build` passes — 0 TS errors
- [ ] `npm test` passes — 0 failures
- [ ] No secrets, no `node_modules`, no build output

---

*PRISM Software Principles v7.0.0 — last updated 2026-03-15*
*Derived from MIT OpenCourseWare materials: 6.005 (Spring 2016), 6.046J, 6.837, 6.871, 1.124J, 15.082J*
*All principles are enforceable in code review. When in doubt, ask: "Can this be checked automatically or verified by a reviewer in under 2 minutes?"*

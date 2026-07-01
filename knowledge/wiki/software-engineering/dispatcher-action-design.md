---
name: dispatcher-action-design
category: software-engineering
domain: backend-dev
tags: [dispatcher, mcp, action, zod, schema, engine-wiring, prism-development, ai-development]
last_updated: 2026-05-19
---

# Dispatcher Action Design — the canonical engine-wiring contract

PRISM's primary execution surface is the MCP dispatcher: a Zod-schema-validated `action` enum that routes to engine methods. There are 97 dispatchers wrapping 3284 engines. Every engine that ships must wire through ≥1 dispatcher (CLAUDE.md §ENGINE WIRING — "WIRE TO ALL SOURCES" rule). This wiki names the canonical wiring pattern, the z.enum vs z.string trap, slimResponse token-economy, the op-discriminator pattern for multi-method engines, the WIRE-EXEMPT marker, the lazy-import optimization, and the MockMCPServer false-green class that has bitten multiple ships.

## The dispatcher shape — one canonical pattern

```typescript
// src/tools/dispatchers/<domain>Dispatcher.ts

import { z } from "zod";

// 1. The action enum — z.enum, NEVER z.string
const ACTIONS = [
  "engine_method_a",
  "engine_method_b",
  // ...
] as const;

// 2. The input schema — z.discriminatedUnion by action
const InputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("engine_method_a"),
    paramA: z.string(),
    paramB: z.number(),
  }),
  z.object({
    action: z.literal("engine_method_b"),
    paramC: z.string(),
  }),
]);

// 3. The action map — table-driven dispatch
const ACTION_MAP: Record<typeof ACTIONS[number], (input: any) => Promise<any>> = {
  engine_method_a: async (input) => {
    const { engineX } = await import("../../engines/EngineX.js");  // lazy
    return engineX.methodA(input.paramA, input.paramB);
  },
  engine_method_b: async (input) => {
    const { engineX } = await import("../../engines/EngineX.js");
    return engineX.methodB(input.paramC);
  },
};

// 4. The dispatcher
export async function domainDispatcher(input: unknown) {
  const parsed = InputSchema.parse(input);  // throws on bad input
  const result = await ACTION_MAP[parsed.action](parsed);
  return slimResponse(result);              // token-economy on output
}
```

Three load-bearing elements: `z.enum` (NOT `z.string`), `discriminatedUnion` (NOT a flat object with optional fields), `ACTION_MAP` (NOT a giant `switch`).

## Z.enum, not z.string — the silent-no-op trap

```typescript
// ❌ WRONG — silent no-op on invalid action
action: z.string(),

// ✓ RIGHT
action: z.enum(ACTIONS),
```

With `z.string()`, an invalid action like `engine_methdo_a` (typo) parses fine — then `ACTION_MAP[input.action]` returns `undefined` and you get a runtime crash with no schema context. With `z.enum(ACTIONS)`, Zod rejects at parse time with a clear "expected one of: ..." error.

The MCP SDK gate further validates against the action list. Test mocks that bypass the SDK (MockMCPServer-style) skip this gate — see "MockMCPServer false-green class" below.

## Discriminated union — not optional-field soup

```typescript
// ❌ WRONG — every field is optional, no compile-time guarantee for method-specific params
const InputSchema = z.object({
  action: z.enum(ACTIONS),
  paramA: z.string().optional(),
  paramB: z.number().optional(),
  paramC: z.string().optional(),
});

// ✓ RIGHT — per-action schema, compile-time type narrowing
const InputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("engine_method_a"), paramA: z.string(), paramB: z.number() }),
  z.object({ action: z.literal("engine_method_b"), paramC: z.string() }),
]);
```

Discriminated union gives you exhaustive type checking inside `ACTION_MAP` — TypeScript knows `paramA` exists when `action === "engine_method_a"` and rejects `paramC` access in the same branch. Optional-field soup hides bugs.

## slimResponse — the output token-economy

```typescript
import { slimResponse } from "../../utils/slimResponse.js";
return slimResponse(result);
```

`slimResponse` strips empty arrays, empty objects, and explicit `null`/`undefined` fields from the response, drastically cutting output token cost. It's the standard PRISM convention.

**Caveat:** `slimResponse` may elide `hits: []` from a search result. If your dispatcher contract guarantees an array field even when empty, sequel-engineer the engine to return a non-empty shape OR document the elision. See [[master-index-filter-contract-fix]] for the lived example — a chat saw missing `hits:` and assumed an engine bug; it was just slimResponse doing its job. Not all field elision is a bug.

## ACTION_MAP — table-driven, not switch

The table form (`Record<Action, Fn>`) has three wins over a giant `switch(action) { case ... }`:

1. **Exhaustiveness** — TypeScript's `Record` type forces every action to have an entry; a missing case fails compile.
2. **Diff-friendly** — adding/removing an action touches one entry, not a long switch.
3. **Audit-friendly** — `Object.keys(ACTION_MAP)` gives you the action list for tests + docs.

The `audit-unwired-engines.mjs` script grep-detects ACTION_MAP entries to verify each engine claims at least one dispatcher action.

## The op-discriminator pattern — many methods, one action

For engines with many small methods (read/write/query patterns), one-action-per-method bloats the z.enum and the dispatcher. Pattern from [[reference_u_wire_session_event_log_2026_05_18]]:

```typescript
// One action, inner discriminator on `op`
ACTIONS = ["session_event_log"];  // single action

InputSchema = z.object({
  action: z.literal("session_event_log"),
  op: z.enum(["append", "query", "clear", ...]),  // inner discriminator
  // ... per-op params with conditional .refine() OR a nested discriminated union
});

ACTION_MAP = {
  session_event_log: async (input) => {
    switch (input.op) {
      case "append": return engine.append(input);
      case "query": return engine.query(input);
      // ...
    }
  },
};
```

Use when an engine has 5+ methods that share the same domain. The `op:` schema should be a strict z.enum (NOT z.string) — the same silent-no-op trap applies one level deeper.

## WIRE-EXEMPT marker

Some engines genuinely don't belong in a dispatcher (engine that's an internal helper, or one that takes JS closures as input — those can't cross a JSON dispatcher boundary). Mark them with a top-of-file comment:

```typescript
// WIRE-EXEMPT: takes JS closure as primary input, cannot cross JSON dispatcher boundary
//   Wrapped by FullSystemAICoordinatorSingleton for runtime invocation.
```

The `stop_on_unwired_assets.mjs` hook respects this marker. Without it, the hook HARD BLOCKS Stop on an engine with no dispatcher reference.

WIRE-EXEMPT is reserved for genuine architectural reasons; "I haven't gotten to wiring it yet" is NOT a valid reason. See CLAUDE.md §ENGINE WIRING for the canonical list of legitimate exemption shapes.

## Lazy import — boot-time + cycle break

```typescript
// ❌ Top-level import — every dispatcher boot loads every engine
import { engineX } from "../../engines/EngineX.js";

// ✓ Lazy import inside the action handler
ACTION_MAP = {
  engine_method_a: async (input) => {
    const { engineX } = await import("../../engines/EngineX.js");
    return engineX.methodA(input.paramA);
  },
};
```

Two wins:
1. **Boot time** — only the dispatcher's static deps load at boot; engines load on first action call.
2. **Cycle break** — if EngineX transitively imports the dispatcher (common with cross-engine coordination), the lazy import avoids the require-cycle.

Cost: small per-call overhead (cached after first call). Negligible vs the boot-time win.

## Multi-dispatcher wiring — the "WIRE TO ALL SOURCES" rule

CLAUDE.md §ENGINE WIRING (2026-04-28 directive): when wiring an engine, wire it to **every** dispatcher that would naturally consume it, in the same commit. Examples:

- New memory engine → `prism_memory` AND `prism_guard` (for error-ledger consumers)
- New physics engine → `prism_calc` AND `prism_safety` (if it computes safety-relevant)
- New CAM engine → `prism_cam` AND vendor-specialized (mastercam/hypermill)
- New reasoning engine → `prism_ai` AND `prism_intelligence`

Verification: `stop-auto-wire.mjs` (Stop hook) audits new engines and warns on missing dispatcher refs. `stop_on_unwired_assets.mjs` HARD BLOCKS on zero-dispatcher orphans.

Acceptance criterion for engine tests: round-trip E2E through every wired dispatcher, not just one.

## The MockMCPServer false-green class

Bitten multiple ships ([[reference_u_dispatcher_2026_05_16]], the MS1 hermetic-vs-real-data E2E lesson). Pattern:

```typescript
// Mock that bypasses Zod gate:
class MockMCPServer {
  async call(actionName: string, input: any) {
    return this.handlers[actionName](input);  // skips z.enum + discriminated union validation
  }
}
```

The mock dispatches by *string lookup*, not by *Zod-validated discriminated union*. A test that uses this mock can call an action that doesn't exist in the production `z.enum(ACTIONS)` and the test passes because the mock just maps the string. Production breaks 100% but the mock-based 9/9 unit tests show green.

**Mitigation pattern** (from the lessons above):
- Add a REAL-data E2E test that invokes the actual `dispatcher(input)` function, not the mock.
- The hermetic mocks stay for fast-loop unit tests; the real-data E2E is the regression oracle.
- Test `Object.keys(ACTION_MAP)` against the `z.enum(ACTIONS)` literal to catch action drift.

## Tools-side wiring

A new dispatcher action also needs a `tools/index.ts` registration so the MCP SDK exposes it:

```typescript
// src/tools/index.ts
import { domainDispatcher } from "./dispatchers/domainDispatcher.js";

server.tool(
  "prism_<domain>",
  "Description visible to model — list action names + brief purpose",
  InputSchema,
  domainDispatcher,
);
```

The tool description's `Description` field is read by the model on every spawn — it's what tells the chat which dispatcher to reach for. Keep it action-list-prefixed and concrete.

## Anti-patterns

- **`z.string()` for action** — silent no-op on typos; switch to `z.enum(ACTIONS)`.
- **Flat optional-field soup** instead of `discriminatedUnion` — hides bugs at compile time.
- **Top-level imports** of every engine — slow boot + cycle hazards.
- **Giant `switch(action)` instead of `ACTION_MAP`** — exhaustiveness check lost, hard to audit.
- **MockMCPServer-based unit tests as the ONLY test** — bypasses Zod gate; ships with a broken dispatcher.
- **Wiring to only one dispatcher** when multiple naturally consume — see WIRE TO ALL SOURCES.
- **Adding WIRE-EXEMPT without naming the architectural reason** — the marker becomes meaningless.
- **`slimResponse` over a contract-array-must-be-present field** — `hits: []` elision can break consumers; document or pad with a sentinel.
- **Not testing `Object.keys(ACTION_MAP) === ACTIONS`** — letting the two drift silently.
- **Adding an action without updating the tool description** — model doesn't discover it.

## Checklist — every new dispatcher action

- [ ] Action name added to `ACTIONS` const array (z.enum)?
- [ ] Per-action input schema added to `InputSchema` discriminated union?
- [ ] Handler added to `ACTION_MAP` with lazy engine import?
- [ ] Action handler returns through `slimResponse`?
- [ ] Engine method covered by ≥1 unit test using the dispatcher (not a mock-only test)?
- [ ] At least one real-data E2E test invokes the production dispatcher?
- [ ] If the engine has multiple natural consumers: wired to all of them in this commit?
- [ ] If WIRE-EXEMPT: comment names the architectural reason?
- [ ] Tool description in `tools/index.ts` updated with action name + purpose?
- [ ] DISPATCHER_DIGEST.md regenerates correctly (auto)?
- [ ] `audit-unwired-engines.mjs` shows zero new orphans?

## Related

- [[engine-creation-discipline]] — what to do BEFORE writing a new engine (duplicationGuardEngine.mustCheckBeforeCreating)
- [[parallel-tool-call-discipline]] — the harness-layer concurrency the dispatcher routes through
- [[commit-message-conventions]] — `[SCOPE]/U-WIRE-<NAME>` commit subject for wiring units
- [[recall-injection-flow]] — how `master-index-precheck-inject` surfaces dispatcher actions on prompts
- [[reference_u_dispatcher_2026_05_16]] — the MockMCPServer false-green lesson
- [[reference_u_wire_session_event_log_2026_05_18]] — op-discriminator pattern in practice
- [[reference_u_wire_energy_2026_05_17]] — ghost-wired orphan class + canonical-constant rail
- CLAUDE.md §ENGINE WIRING — "WIRE TO ALL SOURCES" rule + WIRE-EXEMPT convention
- CLAUDE.md §MCP DISPATCHERS — the canonical dispatcher inventory
- `mcp-server/data/docs/DISPATCHER_DIGEST.md` — live action-count index

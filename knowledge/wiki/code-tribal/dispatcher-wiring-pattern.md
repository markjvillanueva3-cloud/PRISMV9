---
name: dispatcher-wiring-pattern
category: code-tribal
domain: backend-dev
tags: [dispatcher, mcp, engine-wiring, action-enum, prism-dev]
last_updated: 2026-05-18
---

# PRISM Dispatcher Wiring Pattern

PRISM exposes every capability as an MCP dispatcher action. **Engines without dispatcher wiring are orphans** — the system-graph carries them at L7 with zero outbound edges, no live PRISM chat can call them. The wiring pattern is load-bearing.

## The 5-piece contract

To wire `MyEngine.doX(params)` into `prism_<domain>:my_action`:

1. **Engine** — `mcp-server/src/engines/MyEngine.ts` — pure-core, dependency-injected, no inline physics constants.
2. **Schema** — `mcp-server/src/schemas/myActionSchema.ts` — `z.object({...})` defining the input shape.
3. **Dispatcher action enum** — add `"my_action"` to the `z.enum(ACTIONS)` array in the dispatcher.
4. **Dispatcher action case** — add the `case "my_action":` branch that calls `MyEngine.doX(params)` and returns `slimResponse(result)`.
5. **Test** — `mcp-server/src/__tests__/MyEngine.test.ts` covering the action's contract AND a round-trip through the dispatcher (`mcpServer.invoke("prism_<domain>", { action: "my_action", params: {...} })`).

Skipping ANY of the 5 = an orphan. Skipping the round-trip test = a silent-wiring class regression (action lands in enum, case never matches because of a typo, production silently fails).

## The dispatcher anatomy

```ts
import { z } from "zod";
import { slimResponse } from "../infra/slimResponse.js";
import { MyEngine } from "../engines/MyEngine.js";

const ACTIONS = z.enum(["existing_action", "my_action"]);  // ← add here

const ActionSchema = z.object({
  action: ACTIONS,
  params: z.record(z.unknown()).optional(),
});

export function prismDomainDispatcher(input: unknown) {
  const { action, params = {} } = ActionSchema.parse(input);
  switch (action) {
    case "existing_action":
      return slimResponse(existingEngine.doSomething(params));
    case "my_action":                                            // ← and here
      return slimResponse(MyEngine.doX(params));
    default:
      throw new Error(`unknown action: ${action}`);
  }
}
```

The `z.enum` is the public-facing contract; the `switch` is the implementation. **Adding the enum without the case** = action accepted by validation, fails at `default:` = R12-compliant fail-loud (good). **Adding the case without the enum** = case never matches because validation rejects first = silent dead code (bad).

## Wire to ALL natural consumers (the 2026-04-28 rail)

When generating a new engine, do NOT stop at one dispatcher. Wire it to **every dispatcher that would naturally consume it**, in the same commit. Examples:

- New memory engine → `prism_memory` AND specialized consumer (e.g. `prism_guard:error_ledger_*`)
- New physics engine → `prism_calc` AND `prism_safety` (if it computes safety-relevant)
- New CAM engine → `prism_cam` AND vendor-specialized (mastercam, hypermill, etc.)
- New reasoning engine → `prism_ai` AND `prism_intelligence`

## Verification — three rails

1. **`stop-auto-wire.mjs` (Stop hook)** — audits new engines/hooks/skills, warns on missing dispatcher refs.
2. **`stop_on_unwired_assets.mjs`** — HARD BLOCKS Stop on zero-dispatcher orphans.
3. **Test acceptance** — round-trip E2E assertion through every wired dispatcher.

## Singleton wrappers are WIRE-EXEMPT

If an engine is genuinely wrapped by a singleton (e.g. `QdrantMemoryEngine` ← `QdrantMemoryEngineSingleton`), tag it `// WIRE-EXEMPT: <reason>` naming the wrapper. The audit will honor the tag.

## Common wiring failures

- **Action enum drift** — chat A adds `"my_action"` to `prism_calc`; chat B builds against `prism_dev:my_action` because the engine name suggested dev tooling. Two dispatchers carry the action, only one has the case. **Fix:** the engine should declare its canonical dispatcher in its docstring.
- **Schema drift** — engine signature changes from `(material, tool)` → `({material, tool})`; the dispatcher case still passes positional args. Type-check catches this IF the case uses TS types; ad-hoc `(params as any)` does not.
- **Slim-response loss** — `slimResponse()` strips internal fields. If the engine returns `{result, metadata, _trace}`, downstream callers shouldn't depend on `_trace`. Tests should assert ONLY the public surface.
- **`prism_dev:my_action` is a special case** — `prism_dev` is the kitchen-sink dispatcher. Add to it only when the action doesn't fit a domain-specific dispatcher; prefer specialized routes.

## Why pure-core + injected-readers MUST ship an E2E

The RGS-TOOL-AUTOINVOKE-MS0 lesson: 97 hermetic tests green, 10 P0 production bugs (the reader factories had schema-drift). **A subsequent unit must include at least one real-data E2E test driving the dispatcher itself** — `mcpServer.invoke()` against the real registry. See [[per-file-scrutiny-gate]] for the doctrine.

## Related

- [[karpathy-12-rule-discipline]] — R8 (read before write) + R12 (fail loud)
- [[per-file-scrutiny-gate]] — wiring-review-agent
- [[atomic-write-idempotency-patterns]] — for dispatchers that mutate shared state
- CLAUDE.md §"ENGINE WIRING — WIRE TO ALL SOURCES (2026-04-28)" — canonical rail
- CLAUDE.md §"MCP DISPATCHERS (primary execution surface)" — dispatcher map
- `DISPATCHER_DIGEST.md` — full action enum per dispatcher

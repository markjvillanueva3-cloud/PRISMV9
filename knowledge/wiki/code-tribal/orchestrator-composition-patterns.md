---
name: orchestrator-composition-patterns
category: code-tribal
domain: backend-dev
tags: [orchestrator, composition, pipeline, engine-stack, prism-development, ai-development]
last_updated: 2026-05-18
---

# Orchestrator Composition Patterns — how PRISM stacks engines into pipelines

PRISM has 3274 engines and 97 dispatchers. Operators rarely call an engine directly — they invoke an ORCHESTRATOR that composes a stack of engines into the operator-facing answer. Understanding orchestration lets you wire new orchestrators correctly.

## What an orchestrator is

An orchestrator engine receives an operator request, decomposes it into engine calls, sequences them, merges results, and returns a unified answer. Examples:

- `SpeedFeedOrchestrator` — composes material → Kienzle → Taylor → SLD → deflection → thermal → wear → omega
- `SafetyCutValidator` — composes feasibility + chatter + collision + workholding
- `PrintToProgramOrchestrator` — composes CAD → feature recognition → CAM strategy → toolpath → post → safety-validate
- `QuoteToShipOrchestrator` — composes part → material → tooling → cycle-time → cost → quote

The orchestrator is the dispatcher action's primary entry point; the engines underneath are pure-core.

## The 3-piece orchestrator contract

1. **Input schema** — Zod object defining the operator's request
2. **Engine sequence** — declared order of calls; respects engine dependencies (see [[physics-engine-architecture]])
3. **Output envelope** — standardized: `{result, inputs, assumptions, uncertainty, safetyTier, safetyScore, warnings}`

The output envelope MUST include the safety surface so the dispatcher's `slimResponse` preserves it.

## Composition order is load-bearing

Reordering produces wrong outputs:

```ts
// WRONG ORDER:
const tool_life = TaylorEngine.compute(...);   // needs force, which needs material
const force = KienzleEngine.compute(...);
const material = MaterialEngine.lookup(...);

// RIGHT ORDER:
const material = MaterialEngine.lookup(...);
const force = KienzleEngine.compute({ material, ... });
const tool_life = TaylorEngine.compute({ force, material, ... });
```

The orchestrator's job is to declare this order ONCE so downstream code can't accidentally reorder. New engines added to the stack declare their inputs explicitly.

## Dependency injection at the orchestrator boundary

The orchestrator receives engine instances via constructor or factory:

```ts
class SpeedFeedOrchestrator {
  constructor(
    private materialEngine: MaterialPropertyEngine,
    private kienzleEngine: KienzleForceEngine,
    private taylorEngine: TaylorToolLifeEngine,
    private sldEngine: SLDEngine,
    // ...
  ) {}
}
```

This lets tests inject fakes for hermetic testing AND real production wiring without code change. Pure-core engines + injected wiring = the hermetic-mock-blindspot rail's structural prerequisite.

## Pure-core + injected-readers MUST ship an E2E test

The RGS-TOOL-AUTOINVOKE-MS0 lesson: 97 hermetic tests, 10 production P0 bugs. The hermetic fakes injected didn't match the real reader factory shape.

Every orchestrator MUST ship at least one real-data E2E test:

```ts
it("real-data E2E: speed-feed orchestrator computes valid output for canonical input", async () => {
  const orchestrator = createSpeedFeedOrchestrator();  // uses real engine wiring
  const result = await orchestrator.run({ material: "1018 steel", tool: "endmill_8mm", ... });
  assert.ok(result.safetyScore >= 0.7);
  assert.match(result.result.cutting_speed_units, /m\/min|sfm/);
  // ... contract assertions ...
});
```

Without this, the orchestrator's hermetic tests can pass while production silently breaks.

## Failure handling — fail-loud per engine

When an engine in the stack fails, the orchestrator must:
1. Capture the error with engine name + inputs
2. Decide if the failure is recoverable (use fallback) or fatal (abort)
3. Surface the failure in the output envelope's `warnings` OR `error` field

NEVER silently skip a failed engine and return a partial result. R12 demands the failure is visible.

```ts
try {
  const result = await this.sldEngine.compute(...);
} catch (e) {
  return {
    ok: false,
    error: `SLDEngine failed: ${e.message}`,
    phase: "stability-lobe-computation",
    recoverable: false,
  };
}
```

## Composition vs inheritance

PRISM orchestrators use COMPOSITION (engines are members, called explicitly). They do NOT use inheritance (`class MyOrchestrator extends BaseOrchestrator`). Why:

- Inheritance creates rigid coupling — base class changes break all subclasses
- Composition lets you swap one engine without touching the rest
- Composition aligns with the dependency-injection model used by tests

The exception: a small number of marker interfaces (`class MyEngine implements IPhysicsEngine`) — but these are CONTRACTS, not behavior inheritance.

## The omega-merge pattern

Every orchestrator concludes with an Omega calculation. The OmegaEngine takes the per-engine envelopes and merges:

```ts
const omegaResult = OmegaEngine.compute({
  R: derivedRepeatability,
  C: derivedCost,
  P: derivedProductivity,
  S: derivedSafety,
  L: derivedLifetime,
});
// returns: { omegaScore, safetyScore, status: "OK" | "BLOCKED", reason }
```

S (safety) has the highest weight; if S < 0.70 the omega returns BLOCKED regardless of other axes. The orchestrator returns the BLOCKED status to the caller without proceeding to downstream actions.

## Orchestrator vs dispatcher action

An orchestrator is an ENGINE that composes other engines. A dispatcher action is a thin wrapper around an orchestrator (or engine) that:
1. Validates input via Zod
2. Calls the orchestrator
3. Wraps output in slimResponse

Don't put orchestration LOGIC in the dispatcher case body. Put it in the orchestrator engine; the dispatcher just calls.

## When to add a new orchestrator

- A new operator-facing workflow spanning ≥3 engines (e.g. a new domain like grinding)
- An existing orchestrator has grown to >500 lines; split by sub-workflow
- A new safety-critical pipeline (e.g. probe-routine-generate → cycle-time → quality-gate)

When NOT to:
- A single engine call wrapped in 5 lines of glue — that's a dispatcher case, not an orchestrator
- A workflow that's already covered by an existing orchestrator with one different parameter — extend the existing
- A one-off operator query that hits 2 engines — inline in the dispatcher; orchestrator overhead not worth it

## Cycle detection — no engine can call its orchestrator

Engines are leaf nodes; orchestrators are non-leaf. An engine that calls back to its parent orchestrator creates a cycle that breaks dependency injection.

Pattern check: if an engine needs the orchestrator's combined result, it shouldn't BE an engine — it should be a higher-level orchestrator that consumes the lower-level orchestrator.

## Related

- [[engine-creation-playbook]] — 8-step recipe for new engines
- [[dispatcher-wiring-pattern]] — wraps orchestrators in MCP actions
- [[physics-engine-architecture]] — concrete example of a 10-engine stack
- [[per-file-scrutiny-gate]] — wiring-review + test-review caught the RGS-MS0 hermetic-mock class
- CLAUDE.md "ENGINE WIRING — WIRE TO ALL SOURCES"
- CLAUDE.md "DOMAIN-PIPELINE-MS0" — per-domain print-to-part pipeline

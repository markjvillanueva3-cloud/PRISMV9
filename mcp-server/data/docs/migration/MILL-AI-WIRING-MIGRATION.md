# MILL-AI-WIRING — Migration Guide

> Audience: downstream callers of the wired mill-master engines
> Source: `MILL-MASTER-AI-WIRING/U17-DOCS`
> Companion docs: `data/docs/CHANGELOG-MILL-MASTER-AI-WIRING.md`,
> `data/docs/runbooks/MILL-AI-WIRING-RUNBOOK.md`

## TL;DR — none of your existing call sites need to change

The MILL-MASTER-AI-WIRING milestone is **additive-only**. Every public method
that existed before the milestone still has the same signature, the same
return shape, and (when `useAI` is omitted or `'off'`) the exact same output
bytes. The bespoke AI internals (`deepReason`, `scoreStrategies`,
`processNaturalLanguageQuery`, etc.) remain callable directly — the new
`useAI` flag selects their replacement on an opt-in basis.

If you do nothing, you keep the legacy behavior. The migration below is for
callers who **want** the PRISM AI path.

---

## Deprecation policy

**No deprecations.** The bespoke AI surfaces enumerated in the envelope's
`exit_gate.bespoke_AI_surfaces_eliminated` are still callable. They are
called only when `useAI='off'` (the default). Future major-version releases
may revisit this, but not within v2.

---

## Versioning

This milestone constitutes an **additive minor version bump** under semver:

- `useAI?` parameter is OPTIONAL on every wired method
- Defaulting to `'off'` preserves existing callers bit-identically
- No required-field additions to any input shape
- No positional-arg mutations
- No public API removals

Downstream consumers can take this version with no code change required.

---

## Opt-in: how to enable the PRISM AI path

The general pattern is one of three:

1. Pass `useAI: 'on' | 'auto'` on the engine method call itself (when the
   engine has a sibling `*Ultra` method, e.g. `decideUltra`,
   `deepReasonUltra`, `processNaturalLanguageUltra`).
2. Call the dedicated dispatcher action `mill_prism_reason` for direct
   PRISM primitive access without going through a wired engine.
3. Wrap your own legacy/AI dual paths with `MillAIWiring.budgetedAIPath`
   and rely on the helper's auto-recording telemetry.

---

## Example 1 — FiveAxisDecisionEngine

### Before (still works — legacy path)

```ts
import { FiveAxisDecisionEngine } from "src/engines/FiveAxisDecisionEngine.js";

const result = FiveAxisDecisionEngine.decide({
  part_features: features,
  machine: OKUMA_M460V_5AX,
  tool: { type: "ball_nose", diameter_mm: 10, /* ... */ },
  material: "4140",
  batch_size: 10,
  operator_skill: 3,
  feed_rate_mm_per_min: 1500,
});

// result.recommended_strategy, result.confidence, result.alternatives, ...
```

### After (opt-in PRISM AI path)

```ts
import { FiveAxisDecisionEngine } from "src/engines/FiveAxisDecisionEngine.js";

const result = await FiveAxisDecisionEngine.decideUltra(
  {
    part_features: features,
    machine: OKUMA_M460V_5AX,
    tool: { type: "ball_nose", diameter_mm: 10, /* ... */ },
    material: "4140",
    batch_size: 10,
    operator_skill: 3,
    feed_rate_mm_per_min: 1500,
  },
  { useAI: "on", mode: "multi_path" },
);

// result.legacy.recommended_strategy — bit-identical to decide(input).recommended_strategy
// result.ai?.reasoning_chain        — TreeOfThought reasoning steps (length <= 6)
// result.ai?.confidence             — TreeOfThought confidence in [0, 1]
// result.ai?.deep_conclusion        — deepAIIntelligence.deepReason conclusion string
// result.ai?.deep_confidence        — deepAIIntelligence confidence in [0, 1]
// result.ai?.sources                — ['tree_of_thought', 'deep_ai_intelligence']
```

The legacy `FiveAxisDecisionEngine.decide(input)` is unchanged. `decideUltra`
is async because `deepAIIntelligenceEngine.deepReason` is async; the legacy
sync call stays sync.

---

## Example 2 — MillingHeadIntelligenceEngine (U11)

### Before (still works — legacy path)

```ts
import { millingHeadIntelligenceEngine } from "src/engines/MillingHeadIntelligenceEngine.js";

const head = millingHeadIntelligenceEngine.recommendMillingHead({
  feature_type: "pocket",
  material_iso: "P",
  // ...
});

// head.recommended_head, head.confidence, head.alternatives, ...
```

### After (opt-in PRISM AI path with hypothesisRanker scoring)

```ts
import { millingHeadIntelligenceEngine } from "src/engines/MillingHeadIntelligenceEngine.js";

const head = millingHeadIntelligenceEngine.recommendMillingHeadAI(
  {
    feature_type: "pocket",
    material_iso: "P",
    // ...
  },
  { useAI: "on" },
);

// head.legacy.recommended_head — bit-identical to legacy
// head.ai?.ranking              — hypothesisRanker posterior scores per candidate
// head.ai?.explanations         — aiDecisionExplanationEngine attribution chain
```

---

## Example 3 — Direct PRISM AI access via dispatcher

### Before — no equivalent existed

Callers who wanted to invoke a PRISM primitive directly (without going
through a mill-specific engine) had to import `treeOfThoughtEngine` and
build the tree by hand.

### After — single MCP dispatcher call

```ts
import { executeMillAction } from "src/tools/dispatchers/millDispatcher.js";

// Reason — TreeOfThought multi-branch summary:
const reasoning = await executeMillAction("mill_prism_reason", {
  op: "reason",
  question: "Should I use 5-axis simultaneous for an impeller blade?",
  goal: "actionable_recommendation",
  constraints: ["material=P", "operator_skill=3"],
});
// reasoning.reasoning_chain (length <= 6), reasoning.confidence, reasoning.source

// Rank — Bayesian hypothesis posterior:
const ranking = await executeMillAction("mill_prism_reason", {
  op: "rank",
  question: "rank these strategies",
  candidates: ["3+2", "5-axis simultaneous", "swarf"],
});
// ranking.best, ranking.ranked[].score in [0, 1]

// Budget — withPRISMReasoning wrapped in budgetedAIPath:
const probe = await executeMillAction("mill_prism_reason", {
  op: "budget",
  question: "probe",
  budget_ms: 500,
});
// probe.source in {"legacy", "tree_of_thought"}, probe.reasoning_chain
```

The dispatcher action is registered as `mill_prism_reason` with a Zod schema
that rejects unknown ops, out-of-range `budget_ms`, NaN, etc. See
`src/schemas/millActionSchemas.ts`.

---

## Coexistence with `mill_agi_reason`

The pre-existing `mill_agi_reason` action routes through
`MillMasterOrchestratorFacadeEngine.orchestrate({...params, type: 'agi'})`.
It is **preserved**, not deprecated. Use it when you want the facade's full
agi pipeline. Use `mill_prism_reason` when you want direct PRISM primitive
invocation without the facade layer.

| Action | Routes through | Use when |
| --- | --- | --- |
| `mill_agi_reason` | `MillMasterOrchestratorFacadeEngine` | full agi pipeline (memory, tribal context, etc.) |
| `mill_prism_reason` | `MillAIWiring` helpers | direct TreeOfThought / hypothesisRanker / budgetedAIPath |

---

## Telemetry (U15) — what your callers get for free

Every invocation through `MillAIWiring.budgetedAIPath` (and therefore every
`mill_prism_reason` op via the dispatcher) auto-records on
`capabilityEffectivenessEngine`. To inspect:

```ts
import { capabilityEffectivenessEngine } from "src/engines/CapabilityEffectivenessEngine.js";

const score = capabilityEffectivenessEngine.scoreCapability("mill_prism_reason:budget");
console.log(score.usage_count, score.success_rate, score.avg_tokens, score.effectiveness);
```

Disable per call with `opts.recordTelemetry: false` only for microbenchmarks.

---

## Failure modes to expect

- AI primitive throws → caught at `budgetedAIPath`, falls back to legacy,
  records the legacy outcome
- AI primitive returns null/empty (e.g. TreeOfThought finds no solution)
  → wrapper returns `null`, caller observes the `null` and falls back
  per its own logic. `mill_prism_reason` returns
  `{op, error: "TreeOfThought returned no solution"}` rather than a
  silently-empty payload
- Latency budget exceeded with `useAI='auto'` → 60-second cooldown sets
  in for that capability id; subsequent `useAI='auto'` calls run legacy
  until the cooldown expires
- Empty `candidates[]` on `op='rank'` → returns
  `{op: 'rank', error: 'mill_prism_reason op=rank requires candidates[]'}`

The legacy path's exceptions are not swallowed — they propagate so the
caller sees the original error.

---

## Questions

If you're unsure which surface to call, default to `useAI='off'` (legacy).
Move to `'auto'` once you have a measured latency budget. Move to `'on'`
only after telemetry shows `success_rate > 0.9` over `usage_count >= 50`
recent events.

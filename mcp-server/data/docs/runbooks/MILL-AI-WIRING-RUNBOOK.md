# MILL-AI-WIRING — Operational Runbook

> Audience: PRISM operators, on-call engineers, mill-master maintainers
> Source: `MILL-MASTER-AI-WIRING/U17-DOCS`
> Companion docs: `data/docs/CHANGELOG-MILL-MASTER-AI-WIRING.md`,
> `data/docs/migration/MILL-AI-WIRING-MIGRATION.md`

The mill-master engine stack now reaches into the shared PRISM AI layer
(TreeOfThought, deepAIIntelligence, hypothesisRanker, Bayesian optimization).
Every wired engine has a `useAI?` flag (`off` | `auto` | `on`). When the flag
is `off`, output is bit-identical to the pre-wiring legacy path. The
following operational scenarios cover the most common interventions.

---

## 1. Observe trace events from a single dispatcher invocation

When `mill_prism_reason` (or any wired engine method) runs with
`useAI='on'|'auto'`, every invocation auto-records via
`capabilityEffectivenessEngine.recordUsage`. To inspect:

```ts
import { capabilityEffectivenessEngine } from "src/engines/CapabilityEffectivenessEngine.js";

// After running the action, ask the effectiveness engine for the score.
const score = capabilityEffectivenessEngine.scoreCapability("mill_prism_reason:budget");
console.log(score.usage_count, score.success_rate, score.avg_tokens);
```

For trace events tied to a specific engine, build the capability id from the
engine name + method (e.g., `MillAIWiring.budgetedAIPath:my-task`).

If the score is `unused`, no AI-path invocation has been recorded yet — the
caller is either not passing `useAI='on'/'auto'` or `opts.recordTelemetry`
is `false`.

---

## 2. Tune latency budgets for an engine

Default budgets (per `MillAIWiring.budgetedAIPath`):

| useAI | p95 budget | Hard ceiling |
| --- | --- | --- |
| `off` | 50 ms | n/a |
| `auto` | 100 ms (downgrades to legacy when exceeded) | n/a |
| `on` | 500 ms | 2000 ms |

To raise the budget for a specific call site, pass `opts.budgetMs` directly:

```ts
budgetedAIPath("on", legacyFn, aiFn, { capabilityId: "mill:my-cap", budgetMs: 1500 });
```

Re-tune only when telemetry shows the AI path is genuinely faster than the
new ceiling and the operator is willing to wait. Default to keeping the
contract conservative and degrading early.

---

## 3. Interpret `capabilityEffectivenessEngine.generateReport()` output

The effectiveness report classifies each capability into:

- `high` — `success_rate > 0.8` AND `usage_count >= 5`
- `medium` — `success_rate > 0.5` OR `usage_count >= 3`
- `low` — anything else with usage
- `unused` — no events recorded (capability has not yet been invoked)

Recommended thresholds:

- `success_rate < 0.5` → investigate root cause (likely AI path failing
  silently and falling back to legacy)
- `avg_tokens > 50000` → optimize for efficiency (the AI primitive is
  oversized for this call site)
- `usage_count < 3` over a week → improve discoverability or rip out
  the AI path entirely

Use the report after a steady-state production day or full pilot run, not
after a few unit tests.

---

## 4. Roll back a single unit

Every unit was committed atomically with a passing test suite. The U2
contract guarantees that the legacy path is bit-identical when
`useAI='off'`, so reverting any single retrofit unit (U3–U14) is a
`git revert <commit>` operation that leaves the engine in its pre-wiring
state.

```bash
# Find the unit's commit:
git log --oneline | grep MILL-MASTER-AI-WIRING

# Revert it (creates a new commit; preserves history):
git revert <sha>

# Run the affected engine's tests to confirm legacy parity:
npx vitest run src/__tests__/<EngineName>.test.ts
```

For U2 (the helper itself) and U15/U16, revert order matters because U16
depends on U2 + U15 and U15 extends U2's `budgetedAIPath`. The safe order
is U17 → U16 → U15 → U14 → … → U2.

---

## 5. Investigate a silent-failure trace event

The fail-closed contract means a thrown AI primitive is caught and the
caller falls back to legacy. Telemetry records the legacy outcome with
`fallback: true`. To diagnose:

```ts
// 1. Confirm the engine actually entered the AI path:
const score = capabilityEffectivenessEngine.scoreCapability("<your cap id>");
if (score.usage_count === 0) {
  // Caller never enabled useAI='on'/'auto'. Check call site.
}

// 2. Filter the usage_log for fallback events.
//    (recordUsage doesn't store fallback flag in UsageEvent today —
//     the trace lives in the recordCapabilityUsage caller chain.
//     Inspect the warn-level logs for "[U13-DECISION-RETROFIT] tree_of_thought
//     stage failed" or similar.)

// 3. Repeat the call with useAI='on' and a debugger attached. The AI
//    primitive's exception is caught at the budgetedAIPath layer.
```

Repeated silent failures (3+ in a row) are picked up by
`selfImprovementPatternEngine` and surfaced in the next session's
`prism_dev:self_improvement_scan`.

---

## 6. Disable telemetry for a hot-path microbenchmark

`recordCapabilityUsage` is fast but not free. For benchmarks that need to
isolate the cost of the AI primitive itself:

```ts
budgetedAIPath("on", legacyFn, aiFn, {
  capabilityId: "bench:foo",
  recordTelemetry: false,
});
```

This skips the recordUsage call entirely. Production code should leave
this flag at its default (`true`) — the cost is < 5 µs per invocation and
the visibility into capability usage is valuable.

---

## 7. Promote a useAI='auto' caller to useAI='on'

Once telemetry shows a capability has `success_rate > 0.9` and consistently
stays under the p95 budget, promote the caller from `'auto'` to `'on'`:

1. Pull the effectiveness score: `scoreCapability("<cap id>")`.
2. Verify `success_rate > 0.9` over `usage_count >= 50` recent events.
3. Verify the cooldown rate (`isBudgetInCooldown(capId)` returning `true`
   on a sample of calls) is below 5%.
4. Change the call site from `'auto'` to `'on'` and ship.
5. Watch the effectiveness report for one week.

The promotion is purely a default-flip; the legacy fallback still runs on
AI exceptions.

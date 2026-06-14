---
title: Advisory-decay gate -- measure an advisory's cost by INJECTIONS, not fires
type: lesson
tags: [lesson, token-savings, advisory, ollama, telemetry, metric-correction, slot-alpha]
last_verified: 2026-06-09
source_commits: [a8b16a99c1]
related_memory: reference_advisory_decay_2026_06_09
slot: alpha
---

# Advisory-decay gate + the take-rate metric correction

## The fabricated belief this corrects
The fleet (incl. a prior alpha memory + the SessionStart route-savings banner)
labelled `ollama-route-pretooluse` "2172 fires / 0.1% take-rate = pure attention
tax." That number is **`offloaded / fired`** -- and it is **wrong**, because most
fires are free.

## Why fires != tax
A PreToolUse/UserPromptSubmit hook that decides "not applicable" emits
`{continue:true}` with **no `additionalContext`** -- that costs ~0 context
tokens. The token cost is ONLY incurred when the hook **injects** an advisory
(`additionalContext`), tracked as `byHook.<key>.suggested`. So:

```
conversion = taken / INJECTED  =  byHook.offloaded / byHook.suggested
           NOT  taken / fired
```

Measured correctly, `ollama-route-pretooluse` injected ~13 advisories of which 2
converted = **15% (healthy)**, and `ollama-task-offloader` 12/22 = **55%**.
Neither is noise. The "0.1%" was an artifact of counting ~2360 silent passes.

## The gate (`scripts/lib/advisory-decay.mjs`, commit a8b16a99c1)
The missing ACTUATOR: telemetry MEASURED per-hook conversion but nothing ACTED on
it. The gate classifies each hook and suppresses only proven noise:

| status | rule | action |
|---|---|---|
| `noise` | `suggested >= 50` AND `offloaded/suggested < 5%` | MUTE (if the hook self-gates) |
| `unmeasurable` | no numeric `offloaded` taken-signal | NEVER mute (unmeasured != zero) |
| `insufficient` | `< 50` injections | fire (too thin to judge) |
| `healthy` | `>= 5%` conversion | fire (worth its tokens) |

Three safety properties (over-suppression is the catastrophic direction):
1. **Opt-in self-gate** -- a hook is gated only if it calls `decayDecision`.
   `fleet-reaper-coordinator` (0/99) shows `noise` in the report but is NEVER
   muted: a reaper's success metric is not ollama-offload, and it doesn't
   self-gate. The report observes; it never acts blindly.
2. **`typeof number` unmeasurable guard** -- key-presence is not enough:
   `Number(null)===0` would manufacture a false 0% noise. A present-but-junk
   `offloaded` (null/""/non-number) stays unmeasurable.
3. **Epsilon-probe revival** -- a muted hook still fires 1-in-20
   (`injected % probeInterval === 0`) so a recovered take-rate lifts the mute.
   A permanent blind mute is a kill, not a "decay". The consumer MUST bump
   `suggested` BEFORE the gate so the probe counter advances when muted.
- Fail-safe: every uncertain path (disabled/no-stats/no-telemetry/unmeasurable/
  insufficient/healthy) FIRES. Only confirmed-noise-off-probe suppresses.

## Wired
Opt-in into `ollama-nav-enforce-inject.mjs` (alpha's own, reference consumer) +
`ollama-route-pretooluse.mjs` suggest-path (the `reroute` conversion path is
never gated). Report: `node scripts/advisory-decay-report.mjs`. Knobs:
`PRISM_ADVISORY_DECAY_{DISABLE,MIN_INJ,MAX_TAKE,PROBE}`.

## The real gap it surfaced
`grep-index-first` injects ~150 advisories but records NO `offloaded` taken-signal
-- so its conversion is UNMEASURED, not zero. It can never be decayed until it is
instrumented with a real taken-signal. The decay gate flags this honestly rather
than false-muting it. Owner action item: give redirect-style advisories a
taken-signal.

## Adoption recipe for a new advisory hook
1. Ensure the hook bumps `byHook.<key>.suggested` on every injection-decision,
   BEFORE the gate (unconditional -- so muted fires still advance the probe).
2. `import { decayDecision } from "../../scripts/lib/advisory-decay.mjs"`.
3. `const d = decayDecision(HOOK_KEY, { statsPath }); if (!d.fire) return passThrough();`
4. Only gate the token-COSTING emit (the nudge), never an actual conversion path.
5. Use the hook's OWN resolved stats path so read-path == write-path.

See [[streaming-graph-degree-oom-fix]] (sibling "the tool's metric/corpus outgrew
its assumption" class). Memory: [[reference_advisory_decay_2026_06_09]].

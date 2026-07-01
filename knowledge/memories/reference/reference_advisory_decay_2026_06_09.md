---
name: reference_advisory_decay_2026_06_09
description: "U-ADVISORY-DECAY (slot:alpha, 2026-06-09) — the missing ACTUATOR on advisory take-rate + a fleet-wide METRIC CORRECTION. The token tax of an advisory hook is its INJECTION count (suggested), NOT its fire count: route-pretooluse pass-emits {continue:true} silently ~2360x (0 tokens) and only INJECTS ~13 advisories of which 2 convert = 15% HEALTHY. The prior 'route = 2172 fires / 0.1% = pure attention-tax' framing (in reference_goal_crosssurface_queue_2026_06_09) was offloaded/fired and WRONG. Gate: scripts/lib/advisory-decay.mjs (taken/INJECTED, opt-in self-gate, epsilon-probe revival, typeof-number unmeasurable guard). Wired into ollama-nav-enforce + ollama-route-pretooluse suggest-path. Mutes NOTHING live today (converters thin-data, high-injection hooks unmeasurable). Surfaces grep-index-first's missing taken-signal as the real gap."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.461Z
aliases: reference_advisory_decay_2026_06_09
---


# advisory-decay gate + the take-rate metric correction (2026-06-09, slot:alpha)

Operator lifted the "don't touch bravo's routing surface" fence for ONE lever:
advisory-decay (auto-mute proven-noise advisories). Built it -- but R8 flipped
the premise mid-build, and the correction is the most important takeaway.

## THE METRIC CORRECTION (fleet-wide -- supersedes a fabricated belief)
The token tax of an advisory hook is its **INJECTION count** (the
`additionalContext` it actually emits = `byHook.suggested`), **NOT its fire
count**. A PreToolUse/UserPromptSubmit hook that `pass`-emits `{continue:true}`
costs ~0 context tokens; only an INJECTED advisory costs tokens.

- `ollama-route-pretooluse` fired ~2374x but `pass`-emitted silently ~2360x and
  only INJECTED ~13 advisories, of which 2 converted = **15% (HEALTHY)**.
- The prior framing "route fires 2172x / 0.1% take = pure attention-tax"
  (in [[reference_goal_crosssurface_queue_2026_06_09]]) used `offloaded/fired`
  and was **WRONG** -- it counted free silent passes as tax. Conversion is
  `offloaded / suggested`. That fabricated belief is now corrected fleet-wide.

## What shipped (commit a8b16a99c1 + test follow-up)
- `scripts/lib/advisory-decay.mjs` (+ .test.mjs, 18 tests, 3-of-3 PASS): pure
  `classify()` + injected-reader `decayDecision()`/`decayReport()`.
  Statuses: `noise` (>=50 injections at <5% conversion) | `unmeasurable`
  (no numeric `offloaded` taken-signal) | `insufficient` (<50 inj) | `healthy`.
  - **unmeasurable guard** = `typeof offloaded === "number"` (NOT key-presence:
    `Number(null)===0` would manufacture a false 0% -> false mute, the
    over-suppression trap). A hook with no/junk taken-signal is NEVER muted.
  - **epsilon-probe revival**: a muted hook still fires 1-in-20 so a recovered
    take-rate lifts the mute (a blind permanent mute is a kill, not decay).
  - **fail-safe**: disabled/no-stats/no-telemetry/unmeasurable/insufficient/
    healthy all FIRE. Only confirmed-noise-off-probe suppresses.
- `scripts/advisory-decay-report.mjs`: observability CLI.
- Wired (opt-in self-gate) into `ollama-nav-enforce-inject.mjs` (alpha's own,
  reference) + `ollama-route-pretooluse.mjs` suggest-path (authorized; the
  `reroute` conversion path is NEVER gated). Both bump `suggested` BEFORE the
  gate so the probe counter advances even when muted.
- Knobs: `PRISM_ADVISORY_DECAY_{DISABLE,MIN_INJ,MAX_TAKE,PROBE}`.

## Honest live state (LIVE-VALIDATED): the gate mutes NOTHING today
- `fleet-reaper-coordinator` 0/99 classifies `noise` in the REPORT but is never
  muted -- it never self-gates (a reaper's success metric is not ollama-offload;
  opt-in design prevents that false mute).
- `grep-index-first` (150 inj, no `offloaded` key) = **unmeasurable** -- the real
  INSTRUMENTATION GAP: it can never be decayed until given a taken-signal.
  Routed to its owner.
- route (15 inj/13%), task (24 inj/54%), nav (4 inj) = insufficient/thin -> fire.
The gate is ARMED: the instant any self-gating advisory degrades below 5% over
>=50 injections, it auto-mutes (with probe revival). Verified via route smoke:
fires on insufficient-data, suppresses on forced-noise off-probe.

## Lesson
Measure an advisory's cost by what it INJECTS, not how often it fires. And a
"0% conversion" is only noise if the hook actually RECORDS conversions --
absent/junk taken-signal = unmeasured, never mute. See [[streaming-graph-degree-oom-fix]]
(sibling "corpus/metric outgrew the tool" class). Wiki: [[advisory-decay-gate]].

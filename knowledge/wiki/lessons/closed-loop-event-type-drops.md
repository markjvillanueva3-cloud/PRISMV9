---
title: Closed-loop consumers silently drop divergent event types
type: lesson
domain: ai-training
slot: india
created: 2026-06-24
tags: [closed-loop, learning-loop, blueprint-accuracy, event-schema, silent-drop, R12]
related:
  - "[[reference_cad_learning_loop_closures_2026_06_24]]"
  - "[[ai-systems-synergy-u-ais01]]"
---

# Closed-loop consumers silently drop divergent event types

## Lesson
A closed-loop **consumer** that whitelists a fixed set of event `type` strings will route
**any divergent type to an `unknown` bucket and silently skip it** -- no dispatch, no counter
bump, no error. When multiple writers feed one ledger (a JS hook, a python training driver, an
in-process engine), their `type`/field conventions drift, and the highest-value signal can be
the one that gets dropped. The loop *looks* alive (rows accumulate, most are consumed) while a
slice is dead.

## Concrete case (U-BPA-OPCORRECTION-ALIAS, 2026-06-24)
`scripts/lib/blueprint-accuracy-consumer-lib.mjs` knew 4 types
(`drift_observation/replay_add/outcome_record/ewc_consolidate`). The live
`state/shared/blueprint-accuracy-events.jsonl` carried 144 `outcome_record` + **1
`operator_correction`** (a python writer's top-level type). Operator corrections are
human-confirmed ground truth -- the most valuable training signal -- and that one row was
bucketed `unknown` and dropped. Fix: additive `EVENT_TYPE_ALIASES {operator_correction ->
outcome_record}` resolved BEFORE the known-type check, with `summary.aliasedCount` keeping the
divergence observable (fail-loud, not silently masked). The alias is semantically exact -- the
MS1 hook itself dispatches `xproc_outcome_record` for operator corrections.

## How to find these (recurring pattern)
1. **Enumerate the live ledger's type distribution** before trusting a consumer:
   `node -e 'fs.readFileSync(p,"utf8").split(/\r?\n/).filter(Boolean).reduce((m,l)=>{const t=JSON.parse(l).type;m[t]=(m[t]||0)+1;return m},{})'`.
2. Compare that set against the consumer's `KNOWN_*` whitelist. Anything in the file but not the
   whitelist is a silent drop.
3. Grep every WRITER of the ledger and check field-name + value conventions agree with the reader
   (`type` vs `kind`, top-level vs `payload.kind`).

## Sibling latent bug (flagged, not yet fixed -- xray-domain)
`.claude/hooks/blueprint-accuracy-guard.mjs` `appendEvent` writes events keyed **`kind`** while
the consumer reads **`type`**. Harmless today (the hook has written 0 live rows; the python /
training-driver writer populates the file with `type`-shaped rows), but if the JS hook ever
becomes a writer every event drops as malformed. Correct fix (R7 don't-average): align the
divergent writer (the hook) to emit `type` -- coordinate with xray (blueprint-vision galaxy).

## Why it matters
A dropped event in a learning loop is invisible until you audit the ledger -- the model just
silently never learns from that signal. Make consumers tolerant of known-equivalent divergent
shapes, and ALWAYS surface the absorption count (R12) so a drift is loud, not masked.

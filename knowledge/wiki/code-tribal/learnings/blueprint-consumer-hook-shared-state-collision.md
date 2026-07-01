---
title: Blueprint consumer + hook shared-state collision (U-BPA-CONSUMER-STATE-ISOLATE)
type: code-tribal
domain: cad-learning-ai
slot: india
unit: U-BPA-CONSUMER-STATE-ISOLATE
commit: 80b36e5358
date: 2026-06-24
tags: [closed-loop, idempotency, state-file, blueprint, schema-version, R7, R12]
---

# Blueprint consumer + hook shared-state collision

## Symptom
The offline blueprint-accuracy consumer re-processed the entire
`blueprint-accuracy-events.jsonl` ledger from byte 0 on essentially every run --
its `lastProcessedOffset` kept resetting to 0 -- inflating the daily-ledger
summary counts and emitting duplicate xproc_* action lists. The closed-loop
predictions->outcomes->retrain signal was double-counting.

## Root cause
Two writers shared ONE state file (`state/shared/blueprint-accuracy-state.json`)
with INCOMPATIBLE schemas:

| writer | schema | window shape | offset? |
|---|---|---|---|
| `.claude/hooks/blueprint-accuracy-guard.mjs` (xray PostToolUse drift guard) | `schemaVersion:1` | `{ts,width}` drift widths | no |
| `scripts/blueprint-accuracy-consumer.mjs` (india offline consumer) | `schemaVersion:2` | `{type,ts,payload}` events | `lastProcessedOffset` |

The hook's `loadState` accepts ONLY `schemaVersion===1` and resets anything else
to a fresh v1. So: consumer writes v2 (with offset) -> next blueprint
PostToolUse fires -> hook reads the v2 file, rejects it (schema mismatch),
overwrites with a fresh v1 -> the consumer's durable offset is GONE -> next
consumer run migrates v1, defaults offset to 0, re-reads the whole ledger.

## Fix
Give the consumer its OWN dedicated state file
`blueprint-accuracy-consumer-state.json` (new `CONSUMER_STATE_FILENAME` const in
`scripts/lib/blueprint-accuracy-consumer-lib.mjs`; CLI `DEFAULT_STATE_FILE`
rewired). The xray hook is untouched -- it keeps the legacy path for its drift
window. This resolves the cross-domain coupling from india's side without
editing xray's hook (the "coordinate, don't one-shot cross-domain" path).

Validated live: 145 events processed once (offset 0->508483), immediate re-run
processed 0 = idempotent. 43/43 tests, +3 R9 (distinct-filenames invariant,
root-cause migrate oracle, v2 round-trip).

## Lesson (reusable)
**Two writers with different schemas must never share a state file.** A strict
schema-version reader on one side silently resets the other side's durable state
(R7: don't blend two distinct states into one slot; R12: the loss was silent).
When a hook-writer and an offline consumer cooperate, they should share only the
append-only event LEDGER -- one appends, one reads + tracks its own offset in its
OWN file. If you find a `lastProcessedOffset`/cursor that keeps resetting,
suspect a second writer clobbering the file.

Siblings: [[blueprint-ocr-training-ms2-u-bpa-consumer]],
[[reference_bpa_consumer_state_isolate_2026_06_24]].

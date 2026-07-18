---
name: reference_bpa_consumer_state_isolate_2026_06_24
description: India shipped U-BPA-CONSUMER-STATE-ISOLATE (80b36e5358, 2026-06-24) -- the offline blueprint-accuracy CONSUMER and the xray drift-guard HOOK shared one state file (blueprint-accuracy-state.json) with incompatible schemas; the hook (v1-only loadState) reset the consumer's v2 file every blueprint PostToolUse, wiping lastProcessedOffset -> full-ledger re-process (non-idempotent). Fix: consumer gets its OWN blueprint-accuracy-consumer-state.json. Zero xray edits.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.481Z
aliases: reference_bpa_consumer_state_isolate_2026_06_24
---


# U-BPA-CONSUMER-STATE-ISOLATE -- india 2026-06-24 (80b36e5358)

## The bug (silent non-idempotency in the CAD/print closed loop)
`scripts/blueprint-accuracy-consumer.mjs` (the offline consumer that drains
`blueprint-accuracy-events.jsonl` into xproc_* action plans) and
`.claude/hooks/blueprint-accuracy-guard.mjs` (xray's PostToolUse drift guard)
BOTH wrote `state/shared/blueprint-accuracy-state.json` -- but with INCOMPATIBLE
schemas:
- HOOK: `schemaVersion:1`, `window:[{ts,width}]` (confidence-bound drift widths).
  Its `loadState` accepts ONLY `schemaVersion===1` and resets anything else to a
  fresh v1.
- CONSUMER: `schemaVersion:2`, `lastProcessedOffset`/`eventCounts`, `window` of
  `{type,ts,payload}` events.

Sequence that broke idempotency: consumer writes v2 with a real offset -> a
blueprint PostToolUse fires -> hook reads v2, sees schema!==1, OVERWRITES with a
fresh v1 (no offset) -> consumer's next run migrates that v1, finds no offset,
defaults to 0, and RE-READS THE WHOLE 508KB ledger from byte 0 (inflated
daily-ledger counts + duplicate xproc action lists). The two `window` arrays also
hold incompatible shapes (cross-pollution).

## The fix (surgical, zero cross-domain edit)
Give the consumer its OWN file. Added `HOOK_STATE_FILENAME` +
`CONSUMER_STATE_FILENAME = "blueprint-accuracy-consumer-state.json"` consts to
`scripts/lib/blueprint-accuracy-consumer-lib.mjs`; rewired the CLI
`DEFAULT_STATE_FILE` to use it (the `PRISM_BPA_STATE_FILE` override still wins).
The xray hook is UNTOUCHED -- it keeps `blueprint-accuracy-state.json` for its
drift window. This RESOLVES the cross-domain coupling from india's side instead
of reaching into xray's file (the "coordinate, do NOT one-shot" path).

## Validate (R15, live)
43/43 tests (+3 R9: distinct-filenames invariant + root-cause migrate oracle that
locks "a hook-shaped v1 state loses lastProcessedOffset on migrate" + v2
round-trip). LIVE ledger: RUN1 processed 145 events offset 0->508483; RUN2
processed 0 (offset 508483->508483) = idempotent. (RUN2's single residual action
is the consumer-lib's documented persistent threshold ewc_consolidate, not a
re-process.) Per-file 2-arm scrutiny PASS/PASS, 0 P0/P1.

## Queued next (NOT this fire)
- Gap B: the consumer is still NOT auto-scheduled -> the loop only drains when run
  by hand. Now that it is idempotent it is SAFE to cron, BUT arming a new
  scheduled task is operator/golf-gated under MIGRATION-FREEZE-ACTIVE.flag (rails:
  never arm a frozen maint cron). Operator/golf action.
- The directive's "replicate tribal-injection across blueprint_lora_*" -- 
  blueprint_rag_extract already has retrieveTribal default-injection
  (U-BPA-RAG-TRIBAL-DEFAULT); verify whether blueprint_lora_prepare_set wants the
  same. Scout next fire.

## Lesson
Two writers with DIFFERENT schemas must NOT share a state file -- a strict
schema-version reader on one side silently resets the other side's durable state.
Separate the files; the shared event LEDGER is the only thing they should both
touch (one writes, one reads). Sibling: [[reference_bpa_guard_eventshape_2026_06_24]]
(the kind->type alignment), [[reference_recordoutcome_mjs_ts_seam_2026_06_24]]
(the recordOutcome wiring), [[reference_u_bpa_consumer_2026_05_18]] (the consumer's origin).

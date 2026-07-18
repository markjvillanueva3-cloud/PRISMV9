---
name: reference_gnn_feeder_speculative_warn_2026_06_24
description: India shipped U-GNN-FEEDER-SPECULATIVE-WARN (4b0aa55769, 2026-06-24) -- made vault-to-gnn-refpool.mjs FAIL-LOUD when a true "wired into prism_X" line is dropped by a SPECULATIVE_RE trigger word (verify/unwired/pending). Live run surfaced 3 dropped lines incl 2 RECOVERABLE ground-truth labels (hsmAdvisorComparatorBridgeEngine->prism_calc, ZuluFleetGovernorEngine->prism_session STARVED).
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.591Z
aliases: reference_gnn_feeder_speculative_warn_2026_06_24
---


# U-GNN-FEEDER-SPECULATIVE-WARN -- india 2026-06-24 (4b0aa55769)

THE FIX: `scripts/vault-to-gnn-refpool.mjs` `extractConfirmedWirings` silently `continue`-dropped
any line matching SPECULATIVE_RE (verify/unwired/pending/missing/...), EVEN when the line carried a
real wiring (verb + valid prism_ dispatcher + named engine). That is exactly the footgun the 06-24
GNN-label cycle hit ("SBOMReviewEngine -> prism_safety, carrying a WIRE-UNWIRED-PAPA commit tag" + "...sync-code
verify" both vanished with conflicts=0, undetected). R12 fix: an OPTIONAL `opts.speculativeSkipped`
collector array -- default (no collector) = byte-identical original behavior (all callers + 28 prior
tests unchanged); when passed, dropped-but-wiring-shaped lines are surfaced instead of lost.
`collectVaultWirings` returns `speculativeSkipped`; the dry-run prints a WARN + a json `speculativeSkipped` count.

VALIDATE (live vault): count still 25 (prior +11 intact), and the WARN surfaced **3** dropped lines:
- `hsmAdvisorComparatorBridgeEngine -> prism_calc` (trigger "is now wired" -- SPECULATIVE_RE's
  `is \w+ wired` wrongly catches a CONFIRMATION). **RECOVERABLE true label.**
- `ZuluFleetGovernorEngine -> prism_session` (trigger "UNWIRED" tag; prism_session is a STARVED
  class at 2 refs). **RECOVERABLE true label.**
- `EWMAEngine -> prism_calc` (trigger "verify ... is wired" -- a genuine QUESTION, correctly excluded).
31/31 tests (3 new R12: surface path + no-false-positive + mixed/backward-compat).

## FOLLOW-UP (queued, cross-lane -- coordinate, do NOT one-shot)
Scrub the trigger word off those 2 lines to RECOVER the labels (grows the ref-pool, sparse+balanced,
the measured-safe regime per [[reference_codebase_wired_refpool_rejected_2026_06_18]]):
- `knowledge/memories/reference/reference_oscar_hsmadvisor_live_wire_2026_06_01.md` -- oscar's, reword "is now wired" -> "wired into".
- `knowledge/memories/reference/reference_zulu_governor_wire_2026_06_01.md` -- zulu's, move the UNWIRED tag off the wiring line.
prism_session is STARVED so ZuluFleetGovernor is a HIGH-value recovery. Coordinate with oscar/zulu (their memories).

## Lesson
A regex EXCLUSION filter applied to a whole LINE silently drops true positives when the trigger word
co-occurs with a real assertion. Make the exclusion FAIL-LOUD (surface what it drops) so the loss is
visible, not silent -- especially for a ground-truth feeder where a dropped label is a lost macro-F1 lever.
Sibling: [[reference_gnn_confirmed_wiring_labels_2026_06_24]] (the +11 that hit this exact bug).

---
title: Worktree-integration graft pitfalls — transitive helpers, aspirational tests, staged-index races
tags: [lessons, fleet-hygiene, worktree, integration, dispatcher, schemas]
created: 2026-07-01
by: claude-7fae921d (slot:golf)
unit: U-GOLF-WHISKEY-WORKTREE-INTEGRATION (95a7f88ca7 + c9de984128)
---

# Worktree-integration graft pitfalls

Three failure classes surfaced landing slot/whiskey (249 stranded commits) on trunk —
each will recur on the remaining ~20 stale-slot integrations
(`state/shared/SLOT-WORKTREE-STALENESS-2026-07-01.md`).

## 1. A def-level graft misses TRANSITIVE helper consts

Splicing dispatcher case-blocks + schema const defs from the stale branch (`:2:`) into the
evolved trunk base (`:3:`) by NAME pulls the defs but not the helper consts they reference
(`_ensemblePrediction`, `_ledgerKind`, ...). Zod schemas evaluate at module LOAD, so one
missing helper is a `ReferenceError` that kills the whole schema module — 18 tests red at
collect time, not one.

Rules:
- After any graft, closure-check: every identifier used in the grafted region must be
  defined in the merged file; extract missing ones from the backup ref and RECURSE
  (helpers reference helpers).
- Seed the missing-identifier scan from the **grafted region's code only, comments
  stripped** — a whole-file identifier regex false-positives on comment prose
  (`*_reasons` in a doc comment reads as an undefined `_reasons`).
- Byte-compare grafted helpers vs the backup ref (a balanced-bracket extractor can
  truncate; scrutiny verified 10/10 identical here).

## 2. Recovered tests can be ASPIRATIONAL

whiskey's `LatheLoRAUncertaintyQuantifierEngine.test.ts` asserted a `prism_safety`
dual-wire of `lathe_lora_calibration_gate` that never existed on ANY branch (their own
safetyDispatcher had 0 refs). A recovered red test is not always a broken graft — it can
encode intent its author never shipped. Triage each red: (a) graft defect → fix graft;
(b) superseded contract → exclude the test, document why (the 4 `lathe_lora_model_*`
actions were dropped for trunk's `model_selector_*` family); (c) aspirational wiring →
BUILD it per R15 if the intent is sound (an uncertainty gate consuming S(x) + hazard
flags belongs on prism_safety). For (c), use ONE shared exported schema const across
dispatchers (U-MACRO-LIB precedent) — never a duplicated contract with a "keep in
lockstep" comment (scrutiny arm-B P1 here).

## 3. Landing on the live shared tree races peer-STAGED index entries

`git merge` (ort) needs a clean INDEX; a peer's staged files abort the merge with
"Please commit your changes or stash them" even with ZERO worktree-file overlap
(verified: merge-changed ∩ dirty = ∅, still refused). And the aborted attempt can leave
a dead 0-byte `index.lock`. Protocol: check `git diff --cached --name-only`; if peer
files are staged, retry seconds later (peers commit frequently — the window is short);
remove a dead lock only after confirming 0 live git processes; never fight the race with
`reset` on peer-staged entries.

Sibling: [[live-shared-file-size-assertions-flake]] (same session's coord-hook lesson).
Recipe home: `state/shared/SLOT-WORKTREE-STALENESS-2026-07-01.md`.
Memory: [[reference_golf_whiskey_integration_2026_07_01]].

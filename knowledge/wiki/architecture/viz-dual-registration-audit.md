---
title: viz-dual-registration-audit (FAST[]+merge-splice both-or-neither auditor)
type: architecture
tags: [system-viz, regen-viz, merge-augmentations, dual-registration, silent-discard, R12, sierra]
status: active
maintainer: sierra
created: 2026-06-22
---

# viz-dual-registration-audit -- the FAST[]+merge-splice both-or-neither auditor

`scripts/lib/viz-dual-registration-audit.mjs` (CLI `scripts/audit-viz-dual-registration.mjs`,
wired as a `regen-viz.mjs` preflight) is the pure-static enforcer of the system-viz galaxy's
hard rail: every ghost-roost feature generator must be registered in **both** `regen-viz.mjs`
`FAST[]` (so it runs each regen) **and** have a `merge-augmentations.mjs` `loadOptional(...)` +
fold block (so its nodes/edges fold into the merged search graph). Query this before re-deriving.

## The bug class it catches

A generator registered on only ONE side fails silently in one of two ways:

1. **Silent discard (P1)** -- generator is in `FAST[]` (so it runs and writes a fresh
   `*-augmentation.json` every regen) but merge has no `loadOptional` for it -> its nodes/edges
   fold into NOTHING. The fleet search graph never sees them, with zero error. Found live
   2026-06-22: 3 echo POST-PDF roosts (`jm-die-cited-tips` / `jm-die-tribal-wiki` /
   `post-pdf-corpus`) had been in `FAST[]` since 2026-05-26 but were never spliced -> 117 JM-Die
   corpus nodes silently dropped from the graph for ~4 weeks.
2. **Regen crash (P0)** -- a `FAST[]` entry whose generator file does not exist crashes the WHOLE
   ~3-min regen with `MODULE_NOT_FOUND` (the slot-queue regression, U-VIZ-SLOTQUEUE-ORPHAN, broke
   regen for ~2 weeks).

A sibling pathology is the **stale-fold (P2 orphan)**: a generator that has a merge `loadOptional`
but is NOT in `FAST[]` -> it never re-runs, so merge folds a days-old on-disk augmentation. Found
2026-06-22: `generate-core-inventory.mjs` (674 `core.*` nodes folded stale from 2026-05-09);
fixed by FAST-adding it (U-VIZ-ORPHAN-WIRE).

## What the auditor reports

`auditDualRegistration({root})` returns `{summary, crashRisks, silentDiscards, orphanGenerators,
danglingConsumers, unverifiable}`:
- **crashRisks** (P0): registered entry whose generator file is missing.
- **silentDiscards** (P1): registered producer emitting a `*-augmentation.json` / `*-features.json`
  that merge does NOT `loadOptional`.
- **orphanGenerators** (P2): a viz fold producer on disk NOT in `FAST[]` (never runs / stale-folds).
- **danglingConsumers**: a `loadOptional(X)` with no producer and X not on disk (e.g. the documented
  `slot-queue-augmentation.json` harmless-null).
- **unverifiable** (R12): a registered producer whose output filename cannot be statically pinned
  (writes via a runtime variable) -- NEVER asserted as a discard.

CLI: `node scripts/audit-viz-dual-registration.mjs [--json] [--strict]` (exit 2 on a crash-risk
under `--strict`). It is pure static analysis -- it reads source text + dir listings and NEVER loads
the 370-575 MB graph. Tests: `scripts/lib/viz-dual-registration-audit.test.mjs` (12 cases incl. the
`atomicWriteText`-primary-output adversarial case that caused a v1 false-positive).

## Fixing a silent discard safely

Do NOT blind-splice a roost: these generators emit bridge edges to bare engine CLASS NAMES
(`to:"MasterPostProcessorEngine"`) not live node-ids, so a naive fold injects danglers = fleet-search
corruption (sierra's #1 refuse). The fix folds NODES and resolves each edge's class-name to its
node-id (`eng.cam.masterpostprocessorengine`) via a memoized last-id-segment index (prefer `eng.*`,
deterministic lexicographic tiebreak), dropping un-resolvable endpoints. Live: 185/210 echo-roost
edges recovered, 0 danglers. See `foldRoostAug` in `merge-augmentations.mjs` and
[[reference_orphan_augmentation_dangling_diagnosis_2026_06_10]].

## Related

- [[regen-viz-merge-guard]] -- the sibling fail-loud gate for a merge that SIGKILLs.
- [[reference_viz_dual_registration_audit_2026_06_22]] -- the build + find + fix memory.
- [[reference_sierra_fast_splice_dual_registration]] -- the FAST[]+splice both-or-neither doctrine.
- [[reference_sierra_regen_fast_registration_gap_2026_05_29]] -- the original 9-generator gap finding.
- [[feedback_sierra_graph_correctness_is_fleet_search]] -- why a sierra graph mistake is a fleet outage.

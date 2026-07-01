---
title: PSN training-corpus build OOM -- self-reexec heap guard
type: lesson
domain: ai-training
tags: [heap, oom, self-reexec, max-old-space-size, psn, training-corpus, blackwell]
commit: U-PSN-CORPUS-HEAP-GUARD
slot: papa
date: 2026-06-25
related: [nn-graph-ms0, ai-training-foundations]
---

# PSN training-corpus build OOM -- self-reexec heap guard

## Symptom
`node scripts/build-psn-training-corpus.mjs` (and even `--dry-run`) FATAL'd with
`Ineffective mark-compacts near heap limit -- JavaScript heap out of memory` at ~378MB,
BEFORE emitting any corpus. Surfaced 2026-06-25 (slot:papa) while feeding the freshly-injected
tribal index into the PSN deep-learning/reasoning training substrate.

## Root cause
The build loads the ~550MB system-viz graph AND accumulates ~568K corpus rows (leg6 system-viz
358K + leg5 tribal 104K + wiki/formulas/memories/...) **in-process** at the **default heap
ceiling**. No `--max-old-space-size` was passed on any launch path (cron / ad-hoc / loop), so the
default-heap node process OOM'd on the in-process graph load + row accumulation. Same class as the
nn-graph-retrain-lifecycle OOM (2026-06-11): a script that does heavy work in its OWN process needs
the heap bump, not just its spawned children.

## Fix
A self-reexec heap guard cloned from the proven `nn-graph-retrain-lifecycle.mjs::shouldReexecForHeap`
(clone-don't-fork -- both are the same logic). On a bare launch the entry guard re-execs node ONCE
with `--max-old-space-size` (knob `PRISM_PSN_CORPUS_HEAP_MB`, default 16384), then runs `main`. Pure
exported helpers `shouldReexecForHeap(argv, env, execArgv)` + `hasHeapFlag(execArgv)`; env breaker
`PRISM_PSN_CORPUS_REEXEC=1` (set on the child) prevents an infinite re-exec loop; opt-out
`PRISM_PSN_CORPUS_NO_REEXEC=1`; an explicit `--max-old-space-size` in `execArgv` (e.g. the scheduled
task) skips the redundant re-exec. NOTE: `--dry-run` STILL loads the full graph here, so it is NOT a
cheap-mode skip (unlike nn-graph's `--status`).

## Tests
14/14 (`build-psn-training-corpus.test.mjs`): the pure decision matrix (bare->reexec, child/opt-out/
already-bumped->no-reexec, hasHeapFlag detection) + a behavioral E2E that spawns a bare
`node build-psn-training-corpus.mjs --dry-run` (no flag, NODE_OPTIONS scrubbed) and asserts exit 0 +
no "heap out of memory" -- this E2E FAILS pre-fix (OOM) and is the regression lock.

## Lesson
A node script that loads a large file (graph/index) AND accumulates a large in-memory result must
carry its OWN heap bump via a self-reexec guard, so EVERY launch path works without a manual flag.
Documenting/aliasing the heap need (a header comment, a wrapper) is not enough -- enforce it in the
entry point. Blackwell directive: never fight a low default; size to the hardware (136GB RAM).

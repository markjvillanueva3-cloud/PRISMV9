---
title: A non-load-bearing side-channel write must never alter the exit code of the operation it describes
type: lesson
tags: [r12, fail-loud, error-budget, telemetry, regression]
created: 2026-06-08
source: OBSIDIAN-HERMES-CONTEXT-ACCEL/U-LEARN-REVIVE01 (slot:papa), scrutiny reviewer-C catch
---

# Side-channel writes must not alter the exit code of the real operation

## The regression class

A function performs a load-bearing operation (here: revive a dark memory-synthesis engine, verified by the output file landing), then writes a **side channel** — telemetry, a chat-bus advisory, a log row — to record what it did. If that side-channel `appendFileSync`/`renameSync` throws (EACCES, ENOSPC, EROFS) and the throw is NOT caught locally, it propagates out of the operation's function. A CLI `main()` that maps *any* throw to a single error exit code then reports the **real operation as a failure** even though it succeeded — AND loses the very telemetry row a downstream consumer (a SessionStart hook here) reads to learn the operation happened.

Net effect: a success is reported as `exit 2 "measurement failure"`, the success is invisible, and the self-heal is silently dropped. This is an R12 fail-loud *inversion* — the exit code lies about the outcome.

## Where it bit

`scripts/obsidian-learning-revival.mjs`: `appendTelemetry`/`appendChatBus` originally guarded only `mkdirSync`, leaving `appendFileSync` unguarded. They run in `runOnce` AFTER the revival outcome is finalized `revived`. Both per-file scrutiny reviewers AND 3-of-3 arms A & B missed it; arm C (regression/error-budget weighted) caught it.

## The rule

A write that exists only to *describe* an operation is non-load-bearing. Make the ENTIRE write best-effort: wrap mkdir + rotate + append in one try/catch, swallow-with-stderr-warn, return a boolean if the caller cares. The worst case of a swallowed side-channel write is a lost row — never a lied-about exit code. Only the operation's OWN failure (here: the engine didn't run, or its output didn't land) may set the failure exit.

## Test it

Inject a throwing `appendFileSync` (`_io.appendFileSync = () => { throw new Error("EACCES") }`) on a path where the real operation succeeds, and assert the outcome stays `revived` / `exitCode 0`. If that test can't fail when you remove the try/catch, the guard isn't real.

Related: [[reference_obsidian_learning_revival_2026_06_08]], the R12 doctrine, the per-file + 3-of-3 scrutiny gates (this is why arm C is weighted toward error-budget — it catches what holistic reviewers don't).

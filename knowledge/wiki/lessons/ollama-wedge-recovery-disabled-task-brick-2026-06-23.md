---
title: Ollama wedge recovery bricks on a disabled task + liveness-canary model choice
type: lesson
slot: zulu
created: 2026-06-23
tags: [ollama, self-heal, scheduled-task, health-canary, fail-loud, meta-systems]
links:
  - "[[hermes-proxy-silent-degradation-missing-aiohttp-2026-06-23]]"
  - "[[meta-systems-utilization-truth-harness-2026-06-22]]"
  - "[[reference_zulu_ollama_wedge_selfheal_2026_06_23]]"
---

# Ollama wedge recovery bricks on a disabled task + liveness-canary model choice

Two reusable bug-findings from recovering the live Ollama `/api/generate` wedge (2026-06-23, slot:zulu, session b41ca5c4). Both are *general* failure-mode classes, not Ollama-specific.

## 1. A Stop+Start recovery must ENABLE a disabled task first, or it bricks the service it heals
`scripts/ollama-wedge-guard.mjs` `recover()` did `Stop-ScheduledTask` → kill → `Start-ScheduledTask` for `'PRISM Ollama Serve'`. The task was found **Disabled**, so `Start-ScheduledTask` failed with `start-fail: The task is disabled` and left Ollama **DOWN** — strictly worse than the wedge it was recovering. The recovery procedure silently **assumed an enabled task**.

**Fix:** pure exported `buildRecoveryScript(serveTask)` inserts an idempotent `Enable-ScheduledTask` immediately before `Start-ScheduledTask` (behaviour-neutral when already enabled), plus a PS single-quote escape on the env-set task name and `windowsHide:true`. Tested by asserting `enableAt < startAt` in the generated script (R9 — fails if the ordering regresses).

**General rule:** any auto-recovery that restarts a scheduled task / service must first put it into a startable state (enable it). A recovery that can leave its target in a worse state than the fault is a latent outage amplifier.

## 2. A liveness canary must use a fast, reliably-loadable model — not a heavy one
The `OLLAMA-GEN` check in `scripts/reconcile-zulu-ledger.mjs` (the zulu `$0` truth-harness) probed `qwen2.5-coder:32b` (20 GB) with a 20 s timeout. Right after **any** daemon restart the 32b is cold-evicted → cold-load > 20 s → `AbortController` fires → "operation aborted" → **false `OPEN`/wedged** while generate is genuinely healthy (a 1.5b probe returns READY in ~4 s). The 32b was originally chosen to be *non-thinking* (to dodge the gpt-oss empty-`response` trap) — but `qwen2.5-coder:1.5b` is **also** non-thinking and cold-loads in < 5 s, so it is the strictly-better canary.

**Fix:** dedicated `PROBE_MODEL = qwen2.5-coder:1.5b` (env `PRISM_OLLAMA_PROBE_MODEL`) + 30 s timeout. Result: `gen OK 157ms`, ledger 5 SHIPPED/1 OPEN → 6 SHIPPED/0 OPEN.

**General rule:** a liveness canary proves *the endpoint is alive*, not *a heavy model is resident*. Using a heavy model conflates the two and false-alarms on every cold start/restart — exactly when a health signal is most consulted.

## Synergy outcome
Wiring the deferred `PRISM Ollama Wedge Guard` cron (10 min, `--recover`, double-gated, `IgnoreNew`/5 min limit) makes the recurring wedge self-heal unattended — closing the detect→recover loop the `meta-systems-health-inject` hook only *surfaced*. After this session all 4 meta-systems (ollama/hermes/octopus/obsidian) report UTILIZED.

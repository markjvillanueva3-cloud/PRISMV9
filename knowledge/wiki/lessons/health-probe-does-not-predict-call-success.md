---
title: A /health probe does NOT predict call success -- fail over PER-CALL, not per-resolve
layer: lessons
tags: [reliability, failover, lane-routing, no-downtime, hermes, ollama, r12, cron]
created: 2026-06-30
by: slot:zulu
status: durable
related:
  - parallel-hermes-knowledge-enrichment-method.md
---

# A /health probe does NOT predict call success -- fail over PER-CALL, not per-resolve

## The bug (R12 self-catch, 2026-06-30)
The hermes-domain-enrichment cron fired hourly all night but accumulated ZERO -- ledgers were frozen at the previous snapshot after ~12 fires, every run exiting 0 ("success"). I had earlier claimed "autonomous overnight accumulation proven" off a single `-RunNow`. That claim was FALSE; the recurring fires produced nothing.

## Root cause
The lane router resolved ONE lane upfront via a `/health` probe, then bound the whole run to it. But a `/health` 200 does NOT mean the actual endpoint works:
- **local grok proxy** flapped **health-200-but-chat-404** (proxy "up", chat route broken).
- **cloud NVIDIA llama** was "up" but every chat call **timed out (>180s)**.

So whichever lane the probe picked, its calls failed -> 0 accumulation -> the task caught the errors and exited 0. A green probe + a green exit code masked a 100%-dead feature. (Sibling of the "green test suite hides a dead feature" + "stale-prone signal actuating an alarm with no live evidence" classes already in the regression log.)

## The fix: per-call failover + an always-up floor
Stop trusting a pre-flight probe to predict call success. Instead, try lanes IN ORDER at CALL TIME; the first to return non-empty content wins; a dark / health-200-404 / timeout / empty lane is skipped to the next. Add a RELIABLE local floor so the loop always produces:
- order: `local-grok` (best quality, when up) -> `local-ollama` (:11434, always up via Ollama Serve, free) -> `cloud-nvidia` (slow, last resort).
- `makeFailoverAsk(lanes)` returns an `ask` that loops the lanes; throws only if EVERY lane fails.
- Ollama floor model = a reasoning model (`gpt-oss:20b`), NOT a code model, for domain-knowledge quality.

VALIDATED: grok 404 -> auto-failover to ollama -> 7 fresh items; proven in both the manual and the scheduled-task path (ledgers grew +7/domain live from the running task). Commits `92b9c84cbd` (failover+floor) + `3877630230` (model).

## The reusable rule
1. A `/health` (or any liveness) probe is a HINT, not a guarantee -- never bind an entire batch to a single probe verdict.
2. For reliability, fail over **per call**, not per upfront-resolve -- the failure mode you care about (404/timeout/empty) happens at call time, after the probe passed.
3. Always provide an **always-up local floor** (Ollama) for "no-downtime" loops -- a free, reliable, lower-quality producer beats a higher-quality one that is intermittently dark.
4. A cron that exits 0 is NOT proof it did work -- verify the OUTPUT (ledger/row counts grew), not the exit code. "Ran" != "produced."

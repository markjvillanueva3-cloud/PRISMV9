---
title: Auto-route mechanical fan-out to local Ollama (smartFanout)
date: 2026-06-12
slot: india
tags: [ollama, fan-out, rate-limit, model-routing, token-economy, classifier-bug]
scope: OLLAMA-AUTOROUTE-MS0/U-SMART-FANOUT
related: [ollama-pipeline-ms0, model-routing-ms0, agent-fanout-pressure-gate, reference_cad_gen_coverage_audit_2026_06_12]
---

# Auto-route mechanical fan-out to local Ollama (smartFanout)

## The failure that motivated it
A 34-agent Workflow doing **mechanical** per-galaxy CAD-coverage inventory (grep + summarize) tripped
Anthropic's **server-side** rate limit ("Server is temporarily limiting requests" -- a concurrency
burst, NOT the usage limit) and **wasted ~5.8M tokens**. That fan-out had no business on the Claude
API: it was deterministic search + summarization that the local Blackwell GPU does for free. The
`ollamaFanout` primitive (bravo, 2026-06-09, `scripts/lib/ollama-fanout.mjs`) **already existed** for
exactly this -- but nothing AUTO-invoked it, so the model (me) reached for `agent()` and burned the
quota. Operator: *"find a better way to auto invoke ollama since you didn't use it when you should have."*

## The fix: `scripts/lib/smart-fanout.mjs`
`smartFanout(tasks, opts)` is the AUTO layer above `ollamaFanout`. Hand it a batch; it **classifies**
each task (via `local-llm-task-router.classifyTaskClass` + `isSafetyCritical`) and routes:
- **mechanical** (summarize/extract/classify/format/explain/document/git_summary/unknown) -> **local
  Ollama** ($0, no Anthropic rate limit, GPU-bound). The mechanical lane is EXECUTED here.
- **judgment** (reason/synthesize/codegen/audit) + **safety-critical** -> **Claude** (returned as
  `claudeTasks` for the orchestrator to run with `agent()` -- a lib cannot spawn harness agents).
- Per-task `lane:'ollama'|'claude'` override wins when the caller KNOWS the batch is mechanical.

It REUSES `ollamaFanout`/`ollamaFanoutWithFallback` (no dup; Ollama-down -> Sonnet fallback signal,
never the rate-limited Claude burst). Pure routing decision (R5: routing is code, not a model call).
12 hermetic tests (injected fan-out -> offline).

## How to use it (the doctrine)
**Any time you are about to fan out many mechanical tasks (inventory, grep, summarize, classify,
per-file/per-galaxy/fleet-wide), do NOT spawn a burst of Claude agents.** Either:
1. Do the deterministic part in CODE (R5 -- a coverage/inventory audit is a search problem), or
2. Route the per-item mechanical arm through `smartFanout(tasks)` -> local Ollama.
Reserve Claude `agent()` for judgment/synthesis. golf's `agent-fanout-pressure-gate.mjs` hook is the
live enforcement: it flags a burst/high-concurrency Agent/Workflow spawn and advises this route.

## Dogfood proof
`scripts/cad-gen-coverage-meter.mjs --ollama` re-ran the EXACT per-galaxy coverage task that
rate-limited: PHASE 1 inventory in CODE (deterministic op-context scan, no agents); PHASE 2 qualitative
per-galaxy notes AUTO-routed to Ollama via `smartFanout`. LIVE: 8 grounded notes on `gpt-oss:120b`,
routing `{ollama:8, claude:0}`, 51s, **$0, zero rate limit**.

## Bug surfaced + fixed (same session) -- classifier stem bug #2
Building smartFanout's tests exposed that the trailing word-boundary stem bug fixed by
U-CLASSIFY-STEM-FIX (2026-06-11, for `classif`/`categoriz`) was **left unfixed on three more stems**:
`synthesiz\b` / `consolidat\b` / `analyz\b` / `summar\b` -> "synthesize"/"consolidate"/"analyze"/
"summarize" never matched the whole word (a word char follows the truncated stem, so the `\b` fails)
-> they fell to `unknown`. For `synthesize`/`consolidate`/`analyze` (JUDGMENT classes) that meant they
were **mis-routed to the LOCAL lane** -- judgment work sent to the cheap model, the wrong-direction
leak smartFanout depends on avoiding. Fix: `\w*` after each stem (`synthesiz\w*` etc.). +REGRESSION-2
test. **Lesson: a truncated stem in an alternation MUST end in `\w*`, never a group-closing `\b`** --
and when you fix one such stem, grep the whole pattern table for siblings (R15 apply-to-all). This was
the 2nd instance of the identical bug class; the first fix did not sweep its own file.

## Files
- `scripts/lib/smart-fanout.mjs` (+ `.test.mjs`, 12) -- the auto-router
- `scripts/lib/local-llm-task-router.mjs` -- stem fix + REGRESSION-2
- `scripts/cad-gen-coverage-meter.mjs` + `scripts/lib/cad-coverage-score.mjs` (+ `.test.mjs`, 7) -- dogfood + honest meter
- `scripts/lib/ollama-fanout.mjs` (bravo) -- the reused primitive
- `.claude/hooks/agent-fanout-pressure-gate.mjs` (golf) -- the live enforcement gate

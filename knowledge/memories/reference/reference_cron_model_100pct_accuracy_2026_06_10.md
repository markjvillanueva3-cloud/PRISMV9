---
name: reference_cron_model_100pct_accuracy_2026_06_10
description: "Operator question (2026-06-10, slot:bravo): is there a model in our system that could do cron jobs with 100% accuracy? Verified answer: NO model gives 100% -- LLMs are stochastic. claude-opus-4-8 is the MOST reliable available (why Hermes was validated onto it over gpt-oss:20b) but STILL fails unattended: the hermes memories show it 429s on the saturated shared 5h Claude pool + HTTP 400 'third-party apps draw from extra usage' (non-retryable silent fail). Local models (gpt-oss/qwen) add cold-load timeouts + empty-response truncation (done_reason:length) + format drift. 100% comes from CODE not a model (R5): PRISM ALREADY has the 100% cron class -- the .ps1 scheduled TASKS running node scripts (fleet-reaper, brain-refresh, cost-alarm) are deterministic. The right pattern for an irreducibly-judgment cron: de-model the deterministic parts + wrap the model parts in a verification/consensus gate with a deterministic fallback = the octopus/consensus-queue-drain pattern."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.534Z
aliases: reference_cron_model_100pct_accuracy_2026_06_10
---


# Can any model do cron jobs with 100% accuracy? (slot:bravo, 2026-06-10)

## The question
Operator, via the Hermes finding ("cron jobs run claude-opus-4-8; local models proved
unreliable unattended"): is there a model in our system that could do cron jobs with
100% accuracy?

## Verified answer: NO -- and the premise that opus-4-8 is the "reliable" cron model is itself shaky
- **No LLM is 100% on an open-ended cron task.** Stochastic by construction: format
  drift, refusals, empty responses, hallucination. claude-opus-4-8 is the MOST reliable
  voice available (exactly why Hermes was migrated onto it over gpt-oss:20b), but it is
  NOT 100% unattended. Verified in the hermes memories:
  - `reference_hermes_on_claude_subscription_opus48_2026_06_04`: opus-4-8 turn
    auth-ACCEPTED but **429'd on the saturated shared 5h Claude pool** (quota, not auth).
  - `reference_hermes_local_wire_ollama_fix_2026_06_06`: opus-4-8 returned **HTTP 400
    "Third-party apps now draw from your extra usage, not your plan limits" ->
    non-retryable -> silent fail**.
  - `reference_hermes_local_model_autonomy_2026_06_04`: `fallback_providers: []` (EMPTY
    -- no graceful degrade when the Opus pool saturates).
- **Local models are worse unattended**: cold-load timeouts (~2 min on a busy host) +
  the documented empty-response truncation (`callOllama` in `scripts/ask-ollama.mjs`:
  reasoning models fill `thinking` but stop on `done_reason:"length"` with an empty
  `response`) + format drift. This is the "proved unreliable unattended" the finding cites.

## The engineering answer: 100% accuracy comes from CODE, not a model (Karpathy R5)
- PRISM ALREADY HAS a 100%-reliable cron class: the Windows **scheduled TASKS** installed
  by `.claude/helpers/install-*-task.ps1` run **node/python scripts**, not models --
  fleet-reaper, brain-refresh, cost-alarm, fleet-memory-monitor, handoff-prune, OCR-batch.
  Deterministic -> ~100% modulo environment. The unreliable class is the scheduled
  PROMPTS (/loop, /goal, weekly-synthesis, consensus-drain) that invoke an LLM.
- For a cron with an irreducibly-judgment part, the way to push reliability TOWARD (never
  exactly TO) 100% is: **(1) de-model the deterministic parts into node tasks (R5 -- don't
  use a model for routing/status-codes/transforms); (2) wrap the model part in a
  verification/consensus gate + a deterministic fallback.** That gate is the octopus /
  `consensus-queue-drain` pattern (>=2 voices agree, or a deterministic post-check) --
  bravo's lane, hardened 2026-06-10 (see [[octopus-consensus-hardening-2026-06-10]] wiki).

## Bottom line for the operator
There is no 100% model. Keep deterministic cron work on the node scheduled-tasks (already
100%), keep claude-opus-4-8 as the most-reliable LLM voice for judgment crons, and gate
any judgment-cron output behind a deterministic verifier + consensus rather than trusting
a single model turn. Related: [[reference_hermes_on_claude_subscription_opus48_2026_06_04]]
- [[reference_consensus_drain_local_2026_06_09]] - [[reference_octopus_include_codex_2026_06_10]].

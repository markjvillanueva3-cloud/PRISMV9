---
title: Reason-before-action cross-process inference lane (RBA-INFERENCE-LANE-MS0)
tags: [reason-before-action, rba, ollama, inference-lane, file-lease, cross-process, octopus, india]
created: 2026-06-29
by: claude-india
supersedes_claim: "an in-process semaphore at callOllama can prioritize the RBA vote"
---

# Reason-before-action cross-process inference lane

The reason-before-action (RBA) gate (`ReasonBeforeActionEngine` + `.claude/hooks/reason-before-action-gate.mjs`)
runs a small multi-model Ollama vote before consequential tool calls. It **fail-opens under concurrent fleet
load**: live evidence (2026-06-29) showed a consequential `git push --force` returning `approve` in 823ms and a
benign action hitting the 2355ms mark right at the 2500ms cap -- the vote was queuing behind other slots'
background Ollama traffic on the single GPU, so the gate degraded to a no-op. See [[reference_rba_live_evidence_2026_06_29]].

## Why the in-process semaphore design is wrong (the load-bearing lesson)

The natural fix -- a promise-based priority semaphore at `MultiModelConsensusEngine.callOllama` -- **cannot
work**, because the RBA vote runs in the **short-lived PreToolUse hook process**, while the background Ollama
traffic it competes with (the MCP server on :3100, embed/prewarm hooks, `ask-ollama`, vision OCR) runs in
**separate OS processes**. An in-process JS semaphore only orders calls *within one process*; it cannot hold
back another process's `/api/generate`. (And `MultiModelConsensusEngine` already serializes its two voices
in-process, so the semaphore would be redundant for the only thing it could gate.) A fleet broker that fronts
:11434 was rejected too: 113 inline `/api/generate` fetch sites across 62 files = an all-or-nothing migration
with a new single point of failure.

## The mechanism: a cross-process file-lease

The single shared filesystem CAN coordinate across processes. `scripts/lib/ollama-priority-lease.mjs`:

- **Producer** (the RBA gate, `reason-before-action-gate.mjs`): `acquireLease({priority: PRIORITY.RBA, ttlMs})`
  writes a short-TTL HIGH-priority lease file around `engine.plan()`'s vote, released in `finally`.
- **Consumer** (the background bridges `ask-ollama.mjs::callOllama` + `ollama-fanout.mjs::callOllamaOnce`):
  `await yieldToHigherPriority()` before their fetch -- if a live higher-priority lease exists, they wait
  `yieldDelayMs` (time-to-expiry, capped at 1200ms) so they don't pile onto the GPU while the RBA vote is pending.

### Invariants

- **FAIL-OPEN by construction**: every read/parse/write/stat error resolves to "no lease / don't yield". The
  lane can ONLY reduce the RBA vote's timeout probability, never add latency, block, or hang.
- **Cheap when idle**: with no lease file (the common case -- RBA is default-off), the consumer fast-exits with
  zero parse. Validated: ~0ms idle, ~606ms yield to a live 600ms lease.
- **Self-skip**: a caller under `PRISM_RBA_IN_FLIGHT=1` never yields to its own vote's lease.
- **Kill switches**: `PRISM_OLLAMA_LEASE_CONSUMER_DISABLE=1` (consumer), default-dormant producer (only when RBA enabled).

## Honest limits (R12)

- **Bounded**: wires the 2 dominant shared helpers, NOT all ~111 inline `/api/generate` sites (that is the
  rejected broker blast-radius). Reduces contention from the dominant background paths, not totally.
- **No preemption**: a lease cannot interrupt an already-running, non-interruptible GPU decode -- it only stops
  NEW lower-priority work from piling on while a vote is pending.

## Status

Built end-to-end **advise-only** + tested (lib 17 + gate-hook 25 + ollama-fanout 18 + integration 5) +
live-smoke-validated. Commits `7da110b6a1` (primitive) / `9a253dd300` (producer) / `5ad4ae15bf` (consumer) /
`a8609d5623` (integration). **Remaining: the enforce-arm** (`PRISM_RBA_ENFORCE=1` fleet-wide makes the gate
BLOCK a corroborated REVISE on every action across 26 slots) is an operator toggle -- enable advise-only first,
measure the false-REVISE rate + yield impact, then enforce.

## Related

[[reference_rba_inference_lane_2026_06_29]] - [[reference_rba_live_evidence_2026_06_29]] -
[[reason-before-action-ms0]] - [[gnn-selective-deploy]] - [[psn-octopus-fleet-synergy-ms0]] -
program spec `state/shared/specs/ALL-IN-ONE-NN-BUILD-PROGRAM-2026-06-29.md`.

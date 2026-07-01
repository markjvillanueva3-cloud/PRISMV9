---
name: reference_zulu_revival_timeout_deferred_2026_06_20
description: "Two zulu fixes (2026-06-20): reconciler A-06 phantom-OPEN wrong-path bug (d87070e367), and obsidian-learning-revival mislabeling a heavy-model synth spawn-TIMEOUT as failed -> false 'compounding loop did not run' SessionStart alarm (fec401d371, now benign deferred). Shared root: gpt-oss:120b synthesis under fleet load exceeds fixed timeouts / gets reaped."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.295Z
aliases: reference_zulu_revival_timeout_deferred_2026_06_20
---


# Zulu session 2026-06-20 — reconciler path-bug + revival timeout-deferred (slot:zulu)

Operator `/checkin-zulu /goal /loop`: complete remaining zulu backend + hermes/ollama/obsidian/octopus synergy. Zulu's own buildable queue is DRY (the 06-19 reconcile + the 06-20 opt-in path fix `472764b2df` cleared the last blocker). Worked the cross-cut synergy lane as a sanctioned any-domain fallback. Two genuine fixes:

## 1. Reconciler A-06 phantom-OPEN (d87070e367)
`scripts/reconcile-zulu-ledger.mjs:196` checked `scripts/galaxy-brain-read.mjs` but the shipped file is at `scripts/lib/galaxy-brain-read.mjs` (A-06, commits 2f695f24e9 + 8a90b772f5, wired into galaxy-reasoning-bridge.mjs). So the reconciler -- the tool built to stop the fleet routing at phantom-blocked work -- itself reported A-06 phantom-OPEN forever. Fixed to check the real lib/ path (+legacy for resilience); test assertion OPEN->SHIPPED. 17/17. Lesson: a deterministic staleness-probe must verify the REAL artifact path; a wrong path is the same phantom-routing the probe exists to kill.

## 2. obsidian-learning-revival timeout mislabeled failed (fec401d371)
`DEFAULT_SPAWN_TIMEOUT_MS=180s` assumed "synth is <2s". The dream-cycle engine synthesizing via gpt-oss:120b under fleet load exceeds it -> spawnSync ETIMEDOUT (kills child) -> runEngine/runOnce recorded action:failed/level:failed -> SessionStart buildAdvisory cried "Obsidian/Hermes offline learning revival FAILED ... the compounding loop did not run" while the scheduled task is healthy+fresh (verified level:clean this session). Fix: a timeout-kill -> benign `deferred` (new level, below failed/revived/planned, above clean; exit 0); buildAdvisory only alarms failed/revived so a deferred level is silent -> false alarm killed with ZERO hook change. Non-ETIMEDOUT spawn errors (ENOENT/EACCES) + non-zero exits stay failed (adversarial test guards over-broadening). 21/21. Same false-alarm class as the documented token-zone-stale + mcp-kickoff false positives.

## Shared systemic root (observation, NOT unilaterally fixed)
Both #2 and the galaxy-synthesis-refresh reaper-kill share one root: **the synthesis model resolver picks gpt-oss:120b (host-aware Blackwell-quality bias) for BULK sweeps**, making generation slow enough to exceed fixed timeouts / get reaped. `galaxy-synthesis-refresh --model qwen2.5-coder:32b` completed (exit 0) where the 120b default got killed at 5/19. The deferred-classification makes the timeout HONEST; the deeper lift = route BULK synthesis to a faster model (32b) while reserving 120b for single deep reasoning -- directly serves "ollama offloading for quicker turnaround". Owner: alpha (token-optimization / host-aware-synthesis-model.mjs) -- an R7 quality-vs-speed tradeoff, do not unilaterally flip a peer's deliberate choice.

Also measured: fleet Ollama offload rate **17.9%** (210 offloaded / 965 kept), below the 30% target; executedOffloads 19 vs 3870 silent suggestions -- the lever is EXECUTION not suggestion (alpha's domain).

## Peer-lane findings surfaced (coordinate, not collided)
- **RAG dense-arm degraded (india/alpha):** live `galaxy-reasoning-bridge hermes-zulu` run returned `sources:[...,"dense-degraded"]` -- the hybrid retrieval's dense embedding rerank (`hybridRetrieve` in scripts/lib/galaxy-reasoning-bridge.mjs:572-596) did not apply despite a FRESH 25MB `state/shared/memory-embeddings-sidecar.json` (today 20:36). Fail-soft: it kept BM25/sparse so the bridge still answered `ok:true`. Root cause is the runtime `/api/embeddings` rerank call (empty fusion or embed-miss), NOT a missing sidecar -- RAG-embedding lane (B-04 dense-pool backfill family). Bounded by drift-discipline; not zulu-fixable.
- **Octopus drain = by-design trickle (NOT a bug):** `stop-consensus-drain.mjs` spawns `consensus-queue-drain.mjs --max=1` with a fleet-wide process-lock = deliberate GPU protection (each entry is a real 2-voice co-resident consensus; extensive rate-limit-amplifier fix history). 49-queue drains slowly on purpose. R8 read-first prevented a wrong "throughput fix".
- **AI-synergy VALIDATED:** the same bridge run (qwen2.5-coder:32b, $0) pulled obsidian-brain + master-brain-read (A-06) + CLAUDE.md and independently corroborated "no genuinely open zulu/hermes backend tasks" -- the synergy the goal names works end-to-end. Linked: [[reference_obsidian_learning_revival_2026_06_08]] · [[reference_zulu_backlog_reconcile_2026_06_19]] · [[reference_zulu_ledger_reconciler_2026_06_11]] · [[galaxy_brain_read_a06_2026_06_11]].

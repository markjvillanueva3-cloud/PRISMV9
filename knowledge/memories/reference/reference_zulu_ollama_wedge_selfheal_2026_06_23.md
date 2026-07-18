---
name: reference_zulu_ollama_wedge_selfheal_2026_06_23
description: "2026-06-23 (slot:zulu, session b41ca5c4) — recovered the LIVE Ollama /api/generate wedge, found+fixed that wedge-guard recover() BRICKS Ollama on a DISABLED serve task (no Enable before Start), wired the deferred golf auto-recover cron, fixed the OLLAMA-GEN truth-harness false-OPEN canary (32b/20s -> 1.5b/30s), and re-exercised the revived Hermes lane -> 4/4 meta-systems UTILIZED."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.284Z
aliases: reference_zulu_ollama_wedge_selfheal_2026_06_23
---


# ZULU /checkin /goal /loop — Ollama wedge self-heal + meta-systems synergy (2026-06-23, slot:zulu, session b41ca5c4)

Operator `/checkin-zulu /goal /loop [10m]`: reorient on zulu/zebra/bravo + hermes/obsidian sessions; complete remaining backend dev (priority zulu); improve hermes/obsidian/ollama/octopus utilization + synergize; use ollama offload, hermes, parallel agents, loops, harnesses, crons.

## Reorientation (built on yesterday's probe, NOT the 11-day-stale master ledger)
[[reference_zulu_meta_systems_utilization_probe_2026_06_22]] had already: root-caused+fixed the octopus drain ENOENT (U-DRAIN-SPAWN-ENOENT) and the hermes proxy missing-aiohttp (U-HERMES-PROXY-FAILLOUD), shipped `meta-systems-health-inject` SessionStart hook, and confirmed zulu's buildable ledger DRY. BUT today's SessionStart still flagged **HERMES UNDER-UTILIZED** and the `$0` reconcile (`scripts/reconcile-zulu-ledger.mjs`) showed **OLLAMA-GEN OPEN** ("operation aborted"). Standing pattern: always run the reconcile harness for $0 truth before trusting any ROI order.

## Shipped this session (3 commits on cad-fusion-live-ms0)
1. **U-WEDGE-GUARD-AUTOWIRE** — the LIVE Ollama generate-wedge (tags+embeddings OK, generate hung 60s+; RAM 84.8GB/VRAM 13GB free = recoverable wedge). Operator authorized "recover + auto-wire cron".
   - **NEW BUG FOUND while recovering (R12 fail-loud):** `scripts/ollama-wedge-guard.mjs` `recover()` did `Stop-ScheduledTask`+`Start-ScheduledTask`, but 'PRISM Ollama Serve' was **Disabled** -> `start-fail: The task is disabled` -> left Ollama **DOWN** (worse than wedged). The recovery procedure ASSUMED an enabled task. FIX: extracted pure exported `buildRecoveryScript(serveTask)` with `Enable-ScheduledTask` (idempotent) BEFORE `Start`; + PS single-quote escape on the env-set task name; + `windowsHide:true`. Manually enabled+started the task -> `/api/generate` READY 4.1s.
   - **WIRED the deferred U-OLLAMA-WEDGE-GUARD cron** (golf/Tier-3, the 2026-06-13 recommendation): new `.claude/helpers/install-ollama-wedge-guard-task.ps1` (clones `install-ollama-embed-keepalive-task.ps1`) -> 'PRISM Ollama Wedge Guard' every 10min runs `--recover` (double-gated: only 'wedged' restarts; healthy = ~4s probe). Hardened `-Settings ExecutionTimeLimit 5min + MultipleInstances IgnoreNew`. LastTaskResult=0.
   - 13/13 tests; per-file 2-arm scrutiny (code-analyzer + reviewer) PASS, both P2 hardenings applied inline.
2. **U-ZLR-GEN-PROBE-FAST** — the OLLAMA-GEN ledger canary used `qwen2.5-coder:32b` (20GB) + 20s timeout -> cold-load after ANY daemon restart aborts -> **false OPEN** while generate is healthy. FIX: dedicated `PROBE_MODEL = qwen2.5-coder:1.5b` (non-thinking like 32b, dodges gpt-oss empty-response trap, but cold-loads <5s) + 30s. 27/27 tests; reconcile OLLAMA-GEN -> SHIPPED `gen OK 157ms`; zulu ledger **6 SHIPPED / 0 OPEN / 1 UNKNOWN** (A-04 peer-owned).
3. **Hermes lane re-exercised** — proxy was `already-up` but UNDER-UTILIZED = recency (dead until yesterday's aiohttp fix). Routed a real summarization op through `scripts/ask-hermes.mjs` -> `source:hermes, model:grok-4.20-0309-non-reasoning` (real xAI Grok). reconcile flipped hermes -> **UTILIZED**; 'PRISM Hermes Proxy' keepalive task Ready/LastTaskResult=0.

## Final state (verified, numbers)
- **META-SYSTEMS 4/4 UTILIZED:** ollama (offload live, generate READY 157ms), hermes (1 call 0 fail), octopus (221 processed, queue empty), obsidian (35 syntheses fresh).
- Zulu's own buildable ledger DRY (0 OPEN). Substrate self-heal now permanent (cron) so the recurring wedge can't go dark for days again.

## Lessons (fleet-wide)
1. **A Stop+Start recovery must ENABLE a disabled task first** or it bricks the very service it heals. Recovery procedures that assume an enabled task are a latent down-state bug.
2. **A liveness canary must use a fast, reliably-loadable model.** A heavy model (32b/20GB) conflates "endpoint alive" with "heavy model resident" -> false-alarms on every cold start/restart.
3. **"UNDER-UTILIZED" can mean recently-DEAD, not idle** — re-exercise a revived lane to confirm + flip the metric.
4. Slot drift note: this chat id (b41ca5c4) was alpha in a prior life; the per-agent-handoff `same-instance-newest` resolver returned the stale alpha handoff. slot-bind-enforce authoritatively bound **zulu** — trust the bind, not the handoff topic.

-> [[reference_zulu_meta_systems_utilization_probe_2026_06_22]] · [[ollama-generate-wedge-gpu-free-2026-06-14]] · [[reference_ollama_wedged_orphan_runner_recovery_2026_06_13]] · [[reference_zulu_ledger_reconciler_2026_06_11]] · [[feedback_ollama_token_routing]]

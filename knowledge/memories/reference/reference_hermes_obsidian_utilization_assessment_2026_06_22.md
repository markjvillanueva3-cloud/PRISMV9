---
name: reference_hermes_obsidian_utilization_assessment_2026_06_22
description: Deep Hermes+Obsidian utilization assessment (2026-06-22, slot:zulu) — 4 corpus-readers + 2 live-verifiers over ~50 sources. Hermes SEVERELY underutilized (autonomous DAG driver never wired, 0.4% exec; proxy session-bound). Obsidian NOT a graveyard (read path is a live brain) but H->C reverse mirror is UNWIRED (operator vault edits silently lost) + 6/20 dense-degraded + 23.9% orphans.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.606Z
aliases: reference_hermes_obsidian_utilization_assessment_2026_06_22
---


# Hermes + Obsidian utilization assessment — 2026-06-22 (slot:zulu)

Operator: "do deep assessment on hermes agent + obsidian vault synergizing by reading ALL articles... both severely underutilized." Method: Ultracode — 4 parallel Sonnet corpus-readers (~50 articles/specs/memories) + 2 adversarial live-verifiers, synthesized by zulu (Opus). Full artifact: `state/shared/specs/HERMES-OBSIDIAN-UTILIZATION-ASSESSMENT-2026-06-22.md`.

## Verdict (numbers, not vibes)
- **HERMES = severely underutilized (operator right).** Autonomous build loop runs at **0.4% (20 executed / 4808 suggested)**. `ZuluWaveSchedulerEngine` (multi-wave DAG, the autonomous-build engine) **built Jun 15, 0 runtime callers**; `HermesAutonomousDriver` (U7, the driver) unbuilt — the unanimous #1 gap for 2 months, still open. The one working lane (Grok proxy :8645, 99.8% effective) is **session-bound**, DOWN now, no durable keepalive applied.
- **OBSIDIAN = underutilized but NOT a "write-only graveyard"** (R7: live probe refuted the older docs). Read path is a LIVE brain (fresh 19,871-vector sidecar, BM25+dense hybrid wired, 37 galaxy-synthesis files regenerated TODAY; 3% CAG is honest — 82% warm). The genuine failures: (1) **6/20 galaxies dense-degrade to BM25-only** silently; (2) 16K orphans (23.9%) + 4136 broken wikilinks; (3) hybrid retrieval not at the inject hot-path; (4) articles' Synthesis/Connection/Contradiction layers ignored.

## ⚠ CORRECTION (post-verification) — TWO verifier findings were FALSE
The 2 adversarial verifiers inferred config from symptoms instead of reading the actual values. Direct check of live C:+H: settings.json:
- **F3 reverse mirror is WIRED + LIVE** (PostToolUse group 0, both copies, not disabled) — the "operator vault edits silently lost" P0 was a FALSE ALARM. Vault edits DO flow back to C:.
- **F4 `PRISM_OLLAMA_OFFLOAD_AUTOEXEC` is already `"1"`** (both copies) — autoexec was never off; it is NOT the offload lever (22% persists with it on; it only covers SAFE+file-target categories and still emits a directive the model must act on).
- **F5**: qwen2.5-coder:32b prewarmed in 623ms (already resident) — the 14.9s was transient VRAM eviction, not constant.
**Lesson (R12):** even an ADVERSARIAL live-verifier manufactures a false P0 if it infers "off/unwired" from a symptom without reading the actual config value. Always read the live value. → [[feedback_verify_live_config_value_not_symptom]]

## Highest-leverage fixes (corrected — F3/F4 already done)
- **THE ONE THING:** BUILD `HermesAutonomousDriver` (U7) glue. VERIFIED: `ZuluWaveSchedulerEngine` (+ HermesGoalDecomposer + ZuluDelegationContract) are BUILT + dispatcher-wired (`schedule_wave`/`compute_wave`, sessionDispatcher.ts:3997) — NOT "0 callers". The gap is the autonomous DRIVER that chains them (goal->decompose->schedule_wave->spawn waves->review->aggregate->self-correct); no cron/hook/loop drives it. Connective tissue over existing actions, NOT new engines. Owner: bravo. Brief: `HERMES-AUTONOMOUS-DRIVER-BRIEF-2026-06-22.md`. The biggest unrealized Hermes capability.
- Apply `install-hermes-proxy-task.ps1` (elevated) -> proxy durable (one working Hermes lane stops dying between sessions). Operator action.
- Durable Ollama resident pin (`OLLAMA_KEEP_ALIVE` on the ollama-server launcher / prewarm cron) -> kills the transient 14.9s eviction. Owner: alpha. (zulu prewarmed 30m this session as stopgap.)
- `PRISM_GALAXY_RAG_PARTIAL_DENSE=1` -> 6/20 dense-degraded survive. Owner: india/alpha.
- Register the elevation-blocked synthesis/distill crons. Operator action.
- Widen true auto-route coverage (not the already-on autoexec knob). Owner: alpha.

## Cross-cut root causes
1. **Advisory-not-auto**: PRISM bets the model will act on a nudge; at scale it ignores ~98% (0.8% route-nudge take-rate). Fixes must convert decisions to imperative/auto-exec.
2. **Built-but-unwired / session-bound / elevation-gated**: many capabilities exist but never run (DAG engine, reverse mirror, proxy task, distill crons). "Shipped" != "running" (R12).
3. **Write strong / read+reverse weak**: the vault captures faithfully but the reverse-mirror + synthesis-distill + link-hygiene legs under-deliver.

Linked: [[reference_zulu_octopus_7voice_cluster_2026_06_22]] · [[feedback_psn_definition]] · [[feedback_synergy_definition]].

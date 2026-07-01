---
name: reference_ollama_route_auto_enabled_2026_06_10
description: "Operator directive 2026-06-10 ('utilize ollama whenever possible, that should be automatic') -> verified the automatic Ollama offload is ALREADY live+firing (corrected a false 'dormant' alarm) and enabled the one missing lever PRISM_OLLAMA_ROUTE_AUTO=1 in settings (C: -> mirrored H:). Arms the ollama-route-pretooluse deny+substitute path for genuinely-throwaway bulk reads; FAIL-OPEN proven (dead Ollama -> raw Read proceeds); conservative-by-design (digests still nudge, correctness-reads preserved)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.682Z
aliases: reference_ollama_route_auto_enabled_2026_06_10
---


# PRISM_OLLAMA_ROUTE_AUTO enabled + automatic-offload state verified (2026-06-10, slot:sierra)

Operator directive (fresh, 2026-06-10): "make sure we're utilizing ollama whenever possible, that should be automatic."

## Verified state (R12 -- corrected a false alarm)
The automatic Ollama offload is **ALREADY live and firing** -- I nearly mis-reported it "dormant" from a settings.json grep that returned 0 refs, but the hooks are wired via **bundles** (not direct settings refs) and the stats prove live firing:
- `ollama-route-pretooluse.mjs` (PreToolUse:Read, T1) -- wired via `.claude/hooks/bundles/read-bundle.mjs READ_HOOKS`; last-touched 2026-06-10 by zulu (U-AUTOROUTE-COLDSTART). NUDGES by default.
- `ollama-task-offloader.mjs` (UserPromptSubmit, T4) -- the 53%-conversion suggest hook (62/116 cumulative).
- `ollama-offload-stats.json` lastUpdated was ~6s old when checked => firing in real-time, NOT historical.
- env already had `PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1`, `OLLAMA_URL=127.0.0.1:11434`, `NIM_FALLBACK_TO_OLLAMA=1`.
- Ollama LIVE: 10 models (qwen2.5-coder:32b/1.5b, gpt-oss:120b/20b, 4 VLMs, nomic-embed).
- `ollama-auto-router.mjs` is a SEPARATE older/parallel impl, NOT wired -- do NOT wire it (would duplicate the live route-pretooluse path; R8).

## The one lever enabled
Set `PRISM_OLLAMA_ROUTE_AUTO=1` in `C:/Users/wompu/.claude/settings.json` env (auto-mirrored to H: by c-to-h-mirror). Per the hook header: nudge-only by default; `=1` arms the **automatic substitute-and-deny** path. Takes effect on next hook spawn, fleet-wide.

## What I PROVED vs did NOT (R12, no over-claim)
- PROVED: knob enabled + mirrored; **FAIL-OPEN** (PRISM_OLLAMA_ROUTE_AUTO=1 + dead OLLAMA_URL port -> `continue:true` raw-Read passthrough -- the safety-critical property, line 244 "cascade short-circuit to raw Read"); conservative-by-design (227KB ENGINE_DIGEST.md -> still NUDGE, no deny -- correctness-relevant reads preserved).
- NOT proven: an actual live auto-substitution (no throwaway raw-log read on hand to trigger it). The substitute path is ARMED per the hook's design (raw logs/dumps/archived streams), not demonstrated firing this session. Next session: trigger a raw-log Read to confirm the deny+substitute fires, if a definitive demo is wanted.

## Reconciliation with prior offload-rate finding
This does NOT contradict [[reference_ollama_offload_rate_healthy_2026_06_10]] (adjusted rate ~40.6% healthy; raw 10% misleading). That was about the METRIC; this is the operator's behavioral/wiring directive. Enabling AUTO arms more automatic substitution without chasing the raw metric.

## Behavioral commitment (in-my-control, automatic-enough)
Route grunt-work (read/summarize/classify/lint) to Ollama proactively. Demonstrated this session: 12 bug-class per-file audits on qwen2.5-coder:32b (all SAFE), closing the rate-limited-Claude-audit gap with free local compute.

Related: [[reference_ollama_offload_rate_healthy_2026_06_10]] · [[feedback_utilize_ollama_for_efficiency]] · [[reference_ollama_synergy_audit_2026_06_09]] · [[reference_xsub_embeds_docby_oracle_2026_06_10]].

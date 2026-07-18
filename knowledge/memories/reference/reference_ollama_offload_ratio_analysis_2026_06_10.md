---
name: reference_ollama_offload_ratio_analysis_2026_06_10
description: "Record of the advisory-decay APPLY-TO-ALL shipped 2026-06-10 (sierra) + a RETRACTION. The raw offload ratio (10.7%) is MISLEADING and is NOT an inefficiency to chase -- the ADJUSTED last-24h rate is 40.6%, ABOVE the 30% target (the raw denominator counts correctly-kept-on-Claude orchestration/judgment/safety work). See the canonical [[reference_ollama_offload_rate_healthy_2026_06_10]]. The decay-apply-all (mute proven-noise advisories) was correct clause-1/2 HYGIENE; the 'raise deterministic offload coverage' recommendation this file originally carried is RETRACTED as a re-derivation of an already-settled non-problem."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.679Z
aliases: reference_ollama_offload_ratio_analysis_2026_06_10
---


# Ollama offload ratio analysis -- the gap is take-rate, not categories (2026-06-10, slot:sierra)

The synergy /goal's core directive: "utilize strongest possible viable ollama models for grunt work like searches, read, write and coding tasks **that it's qualified for**." I measured + diagnosed the live offload ratio so the next session does NOT re-derive it.

## Live measurement (mcp-server/data/state/ollama-offload-stats.json, 2026-06-10)
- **offloaded: 57 / keptOnClaude: 476 = 10.7%** (target >=30%).
- byHook (offloaded/suggested): `ollama-task-offloader 57/108 (53% -- the ONLY real converter)` · `grep-index-first 3/283 (1%)` · `ollama-route-pretooluse 4/40` · `fleet-reaper-coordinator 0/114` · `large-read-digest-advisory 0/122` · `nav-rerank 0/4`.
- Ollama LIVE: 10 models present (qwen2.5-coder:32b default, gpt-oss:120b/20b, 4 VLMs, nomic-embed); only nomic-embed resident (others load on-demand). Pull-side fine (see [[reference_ollama_roster_fitness_audit_2026_06_09]]).

## The diagnosis (verified by reading ollama-task-offloader.mjs:88-120)
The gap is **NOT missing offload categories.** `ollama-task-offloader` already classifies a BROAD grunt-work set -- explanation, summary, search_synthesis, documentation, format_convert, git_summary, prism_inventory, prism_introspect, prism_audit -- with a careful KEEP-list (orchestration / multi_file / safety-physics gated). Widening the patterns is NOT the lever.

The gap is **TAKE-RATE**: the offload system is fundamentally SUGGESTION-based (a hook injects "consider offloading X to Ollama"; the model must then choose to do it). Only ollama-task-offloader's suggestions convert at a useful rate (53%); the pure-advisory hooks were 0-1% (suggest-then-ignored). You CANNOT force the model to offload via a PreToolUse hook -- a hook can only advise, or deny+substitute (which `ollama-route-pretooluse` does for some Reads: deny the raw Read, hand back an Ollama digest).

## What was DONE this session (the noise side)
Wired `advisory-decay` into the 4 active advisory hooks (large-read-digest 05906647ad 3-of-3 PASS, grep-index-first 8f373e9e43, wiki-read-offload + nav-rerank 7c184bc97c) so a PROVEN-noise advisory (>=50 injections at <5% conversion) self-mutes with a 1-in-20 self-revival probe. This stops the SUGGEST-then-ignore advisories from flooding context (a clause-4 inefficiency) -- but it does NOT by itself raise the offload ratio (it suppresses the non-converting noise; it doesn't make grunt work convert).

## RETRACTION (R12, R8) -- the "raise coverage" lever is a NON-PROBLEM
This file originally recommended "raise DETERMINISTIC offload coverage" as the next big lever. **RETRACTED.** An earlier segment of THIS session (same originSessionId) already settled it: [[reference_ollama_offload_rate_healthy_2026_06_10]] -- the **raw 10.7% is a misleading artifact**; the **ADJUSTED last-24h rate is 40.6%, ABOVE the >=30% target.** The raw denominator counts the work that R5 says MUST stay on Claude (orchestration 248, operator_directive 12, deep_reasoning 3, git_ops, multi_file) as if they were "missed offloads" -- they are correct keeps, not a gap. The mechanical text ops that SHOULD offload (documentation, summary, prism_audit, prism_inventory) ARE offloading. **The offload system is working as designed; do NOT build a coverage-raise -- that is re-deriving a fix for a non-problem** (the prior memo: "almost built a fix for a non-problem"; the drift-discipline <=1-tick cap held). I nearly repeated that exact mistake here -- reading the prior memory (recall surfaced it at cosine 0.74) caught it.

## What WAS correct + sufficient clause-1/2 work this session
The advisory-decay APPLY-TO-ALL (commits 05906647ad 3-of-3 PASS + 8f373e9e43 + 7c184bc97c): muting PROVEN-noise advisories (>=50 injections at <5% conversion, 1-in-20 self-revival) is real HYGIENE -- it stops a 0/N advisory (e.g. large-read 0/122) from flooding context, a clause-4 inefficiency. It does NOT (and need not) raise the already-healthy offload rate. That is the right scope: improve advisory signal-quality, don't chase a misleading raw metric.

Related: [[reference_ollama_offload_rate_healthy_2026_06_10]] (CANONICAL -- read first) · [[reference_ollama_roster_fitness_audit_2026_06_09]] · [[reference_ollama_synergy_audit_2026_06_09]] · [[feedback_utilize_ollama_for_efficiency]] · [[feedback_autonomous_loop_drift_discipline]].

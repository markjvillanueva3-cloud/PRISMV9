---
name: reference_ollama_ps_probe_dedup_2026_06_20
description: "U-OLLAMA-PS-PROBE-DEDUP (slot:alpha, commit 70b94eb1c9 + precedence-test follow-up): consolidated the byte-identical /api/ps warm-reader + /api/tags up-probe duplicated across ollama-prewarm-on-pipeline.mjs and ollama-pipeline-injector.mjs into one tested shared lib scripts/lib/ollama-ps-probe.mjs (isOllamaUpSync + readWarmModelsSync, injectable spawnImpl). Also: the arm-B-inline pattern when subagent spawns rate-limit."
type: reference
slot: alpha
galaxy: token-optimization
source: prism-memory
synced: 2026-06-27T20:30:46.681Z
aliases: reference_ollama_ps_probe_dedup_2026_06_20
---


**SHIPPED 2026-06-20 (slot:alpha)** -- `70b94eb1c9` `[TOKEN-EFFICIENCY]/U-OLLAMA-PS-PROBE-DEDUP` + a precedence-test follow-up.

**What:** `ollama-prewarm-on-pipeline.mjs` and `ollama-pipeline-injector.mjs` each carried byte-identical private copies of a `/api/ps` warm-model reader (`loadWarmModels`) AND a near-identical `/api/tags` up-probe (`ollamaUp` / `isOllamaUp`) -- four duplicated, UNTESTED sync network probes. Consolidated into `scripts/lib/ollama-ps-probe.mjs` (`isOllamaUpSync` + `readWarmModelsSync`, both with injectable `spawnImpl` so they unit-test without a live GPU/curl). Same parse contract as the ASYNC `scripts/ask-ollama.mjs#loadWarmModels` (`models.map((m)=>(m&&(m.name||m.model))||"").filter(Boolean)`) -- intentionally NOT merged because the I/O model differs (spawnSync curl vs fetch); the parse contract is kept identical so a model-name list means the same on both paths. Robustness gain: a null `/api/ps` entry is now dropped instead of throwing the whole probe to `[]`.

**Validation:** 15 tests (parse + name/model fallback + name-PRECEDENCE + null-entry drop + non-zero exit + malformed JSON + spawn-error + arg/url/timeout). LIVE: the injector hook read the real warm set through the shared lib; prewarm import resolves clean; injector verb-routes test 0 fail; no dangling refs to the removed functions; `spawnSync` import dropped where it became unused. 3-of-3 PASS.

**Operational lesson (reusable) -- arm-B-inline on subagent rate-limit:** when the 3-of-3 reviewer agents (or any Agent spawn) return `Server is temporarily limiting requests ... Rate limited` with 0 subagent_tokens (transient throttle, NOT a usage cap), do NOT burn repeated spawns. After ~2 failed retries, perform that arm's review INLINE in the main loop and DISCLOSE it in the ledger notes. Arm B done this way here surfaced a genuine P2: the `name||model` fallback ORDER was unpinned (both parse tests used single-field entries, so a flip to `model||name` would have passed equally) -- closed with a discriminating test (entry with BOTH `name` + a different `model` tag -> name wins, mutation-verified). Inline-arm + gap-close > a third rate-limited spawn. Sibling lib: [[reference_ollama_chat_model_select_fix_2026_06_19]] (the pure loaded-chat-model picker) + the parked [[reference_ask_ollama_loaded_first_and_zulu_codegen_collision_2026_06_20]].

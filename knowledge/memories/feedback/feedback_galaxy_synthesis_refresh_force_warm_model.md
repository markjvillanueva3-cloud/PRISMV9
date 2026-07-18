---
name: feedback_galaxy_synthesis_refresh_force_warm_model
description: galaxy-synthesis-refresh defers all stale galaxies when gpt-oss:120b is down under fleet contention -- force the warm fallback with --model qwen2.5-coder:32b.
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.427Z
aliases: feedback_galaxy_synthesis_refresh_force_warm_model
---


**Symptom (verified 2026-06-11, slot echo):** `node scripts/galaxy-synthesis-refresh.mjs` resolves its synthesis model to **gpt-oss:120b** (host-aware Blackwell pick), preflight-probes it, finds `ollama generation is DOWN`, and **DEFERS ALL stale galaxies** (e.g. "19 galaxies are stale but ollama generation is DOWN -- deferred"). It exits 0 while compounding NOTHING. Under heavy fleet contention (20-30 concurrent /loop sessions + MCP server down), the 120B model cannot load/generate, so the default run is a silent no-op for the brain-compound step.

**Root cause:** the script declares `DEFAULT_MODEL = "qwen2.5-coder:32b"` as a fallback but, when the *resolved* model (120b) fails preflight, it DEFERS rather than retrying the preflight against the warm fallback. The fallback is never auto-exercised on a primary-down.

**Workaround (always works when a 32B-class model is warm):** pass an EXPLICIT model -- explicit `--model` is operator intent and (a) always wins the resolution AND (b) makes the preflight probe THAT model:
```
node scripts/galaxy-synthesis-refresh.mjs --model qwen2.5-coder:32b
```
This re-synthesized all 19 stale galaxies in one run (post-processor incl., 24 memories) where the default deferred them. **Why:** "Existence != complete" -- the default `exit 0` LIED (deferred-not-done); only reading the actual stderr (`re-synthesized <galaxy>` vs `deferred`) confirms real work. [[feedback_read_full_content_not_titles]]

**Same lesson applies to the galaxy transcript miner:** `mine-galaxy-transcripts.mjs` defaults `--synth-model gpt-oss:120b` and its SYNTHESIS step fails the same way (fetch failed x3 -> 0 vault syntheses) while MAP digests succeed. Force `--synth-model gpt-oss:20b` (or qwen2.5-coder:32b). [[feedback_ollama_fallback_sonnet_agents]]

**Proper fix (owning slot -- alpha/golf/india, shared infra; NOT echo's lane):** make `resolveSynthesisModel`/`ollamaPreflight` retry the preflight against `DEFAULT_MODEL` when the resolved primary is down, before deferring. Until then, the fleet should default to the explicit `--model qwen2.5-coder:32b` flag during high-contention windows.

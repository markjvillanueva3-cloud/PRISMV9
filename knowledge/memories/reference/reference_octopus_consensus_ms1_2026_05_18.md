---
name: reference_octopus_consensus_ms1_2026_05_18
description: "INTEL-OLLAMA-OBSIDIAN-MS1 — got the octopus multi-LLM consensus working (probe fix, Grok CLI bridge, Ollama model resolution)"
aliases: reference_octopus_consensus_ms1_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.234Z
---


# Octopus consensus — got it working (2026-05-18, slot juliett)

User work order: "we have features built for octopus, get it working" + bridge
Codex / Ollama / the new xAI Grok CLI into the review processes.

**Octopus** = `INTEL-OLLAMA-OBSIDIAN-MS*` multi-LLM consensus: `MultiModelConsensusEngine`
fans a prompt to Claude+Codex+Ollama+Grok+Gemini, scores agreement, recommends
accept/review/escalate. It was structurally sound but three things were broken:

1. **`octopus-provider-probe.mjs` hard-coded octopus version `9.30.0`** — installed
   is `9.38.0`, so `octopus doctor` never ran; the SessionStart banner was
   permanently degraded. Worse, the probe ran the 30-67 s `octopus doctor` under
   a 5 s hook timeout → killed on cold cache. **Fix:** full v2 rewrite — dynamic
   semver version resolution, direct fast-path detection of all 5 voices
   (env + PATH walk + one Ollama HTTP probe, <3 s cold), env-fingerprint cache
   invalidation (a fresh CLI install / new key is picked up next session, not
   after a 6 h TTL). 2-reviewer per-file gate ×2 rounds PASS.

2. **Grok had no CLI path** — `GrokClientEngine` (HTTP) needs `XAI_API_KEY`.
   **Fix:** new `GrokCLIClientEngine` — subprocess wrapper for xAI's "Grok Build"
   CLI (released 2026-05-15) / community `grok` CLI. Agentic CLI → boxed: temp
   cwd, **prompt on stdin only** (never argv — argv under `shell:true` on Windows
   is a shell-injection vector + blows the 32 KB limit), stdin closed, hard
   timeout. Config-driven (`PRISM_GROK_CLI_{BIN,ARGS,TIMEOUT_MS,MODEL}`). Wired
   into `MultiModelConsensusEngine.callGrok` — HTTP when `XAI_API_KEY` set, else
   CLI (auths via the user's Grok account, no key). 24 tests + real-subprocess
   oracle.

3. **The Ollama voice was dead on a model-name mismatch** — live `consensus_decide`
   failed every Ollama voice: engine hard-codes `deepseek-r1:14b` /
   `qwen2.5-coder:14b`, host only had `mistral:7b`/`codellama:7b`/`qwen2.5-coder:3b`.
   **Fix:** new pure `pickBestOllamaModel` + `resolveOllamaModels` — `ask()` now
   calls `listModels()` and substitutes the best installed generation-capable
   model (embedding models excluded, larger param + coder bonus, distinct dual
   voices). Daemon-down → requested names kept → no regression. 21 tests incl. a
   producer-contract guard on the `listModels()` envelope.

Also: `/octopus` skill (provider fleet status + per-provider setup guidance).

## Known follow-ups (NOT fixed — separate units)
- `consensus-queue-drain.mjs` looks for per-file `dist/engines/*.js`; `build:fast`
  emits a bundled `dist/index.js` → the async drain has never processed an entry.
- `PRISMContextInjectorEngine` + `ConsensusModelPerformanceEngine` are STUBS
  (`buildContext`/`loadState` throw) → 3 pre-existing tsc errors in
  `MultiModelConsensusEngine.ts` (`ctx.text`/`rec.ranked`/implicit-any), verified
  on HEAD; PRISM-context injection + perf-weighting are silently dead.
- P2: a Grok CLI on PATH but not logged in makes `includeGrok` true → suppresses
  the dual-Ollama backfill while contributing only failures (pool can shrink 4→2).
- P2: a `voices`-requested but unreachable voice is dropped without a
  `droppedVoices` signal to the caller.

## Verify
- `"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/octopus-provider-probe.mjs` → full 5-voice banner, `octopus v9.38.0`.
- `vitest run GrokCLIClientEngine.test.ts MultiModelConsensusOllamaResolve.test.ts` → 24 + 21 pass.

Related: [[reference_ollama_pipeline_ms0_2026_05_15]] · [[reference_slot_bind_enforce_2026_05_18]] (subprocess-oracle lesson applied).

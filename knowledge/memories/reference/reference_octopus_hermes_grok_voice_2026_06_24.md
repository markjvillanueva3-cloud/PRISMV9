---
name: reference_octopus_hermes_grok_voice_2026_06_24
description: Opt-in FREE Grok-via-Hermes voice for the local-only octopus runner (3-voice consensus) + the stale per-file dist that kept the hermes octopus voice DARK.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.669Z
aliases: reference_octopus_hermes_grok_voice_2026_06_24
---


**OCTOPUS-HERMES/U-OCT-HERMES-GROK-VOICE (`e3080308e8`, slot:alpha, 2026-06-24).**

## The unit
`scripts/octopus-first-live-record.mjs` (bravo's local-only octopus runner) ran with
only the 2 co-resident Ollama voices. The Grok-via-Hermes-proxy voice is **$0**
(managed OAuth, no metered spend) and a cross-FAMILY 3rd voice. Added OPT-IN
`--with-hermes-grok` / `includeHermesGrok` (default OFF, **byte-identical** local-only):
sets `askOverrides.includeGrok:true`; the engine self-gates on a live FREE backend
(keyless `grok` CLI or Hermes proxy :8645). `buildLocalOnlyEnv()` STILL clears
`XAI_API_KEY` unconditionally → the **METERED HTTP Grok path can never fire** (zero-
metered-spend bound preserved; verified vs engine `callGrok` ordering L955/983/1004).
Default run does NOT pass `localOnly`, so `octopus-dispatch` spreads `askOverrides`
last and `includeGrok:true` wins. 27/27 tests (5 new), 3-of-3 PASS.

**LIVE:** default = successCount 2 (qwen2.5-coder:32b + gpt-oss:20b);
`--with-hermes-grok` = successCount **3**, voices **xai + qwen2.5-coder:32b +
gpt-oss:20b** (Grok via the free proxy, :8645/v1 → 200).

## The finding (stale per-file dist hid the hermes octopus voice — bug class)
`dispatchOctopus` lazy-imports the **per-file** `mcp-server/dist/engines/
MultiModelConsensusEngine.js`. That file was STALE (Jun-23) — **0 refs** to the
2026-06-23 OCTOPUS-HERMES-SYNERGY `hermesProxyReachable`/`execViaHermesProxy`
backend. So even with the proxy UP and `includeGrok:true`, the engine gated on
`XAI_API_KEY||grokCLI` (both absent) → **no grok voice**. `build:fast` (esbuild →
`dist/index.js` bundle) does NOT regenerate the per-file `dist/engines/*.js`;
`build:incremental` (tsc emit) does. `dist` is gitignored → regenerated locally to
validate. **The octopus hermes voice requires a fresh per-file dist to fire in the
live dispatch path** — "committed source != live behavior" when a consumer imports a
stale gitignored dist.

**Lesson (how to apply):** a feature committed to `.ts` source is NOT live for any
consumer that imports a compiled `dist/` artifact until that exact artifact is
regenerated — and `build:fast` only rebuilds the esbuild bundle, not per-file tsc
outputs. When validating a "wired" capability live and it doesn't fire, check the
ACTUAL imported artifact's freshness (`grep` the symbol in the dist file), not just
the source. Sibling of [[feedback_read_full_content_not_titles]] (existence != works).
Octopus lineage: [[reference_octopus_include_codex_2026_06_10]],
[[reference_consensus_drain_local_2026_06_09]].

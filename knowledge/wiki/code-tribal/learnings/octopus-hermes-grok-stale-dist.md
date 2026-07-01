---
title: Octopus opt-in free Grok-via-Hermes voice + the stale per-file dist that hid it
type: code-tribal
slug: octopus-hermes-grok-stale-dist
commit: e3080308e8
slot: alpha
date: 2026-06-24
tags: [octopus, hermes, consensus, dist-staleness, build, utilization]
---

# Octopus: opt-in FREE Grok voice — and the stale per-file dist bug class

## The capability
The local-only octopus runner (`scripts/octopus-first-live-record.mjs`) ran with only
2 Ollama voices. The Grok-via-Hermes-proxy voice (`:8645`) is **$0** (managed OAuth,
no metered spend) and a cross-FAMILY voice. New OPT-IN `--with-hermes-grok` /
`includeHermesGrok` (default OFF, byte-identical) sets `askOverrides.includeGrok:true`;
the engine self-gates on a live FREE backend. `buildLocalOnlyEnv()` still clears
`XAI_API_KEY` unconditionally → the **metered HTTP path can never fire**, so the
zero-metered-spend bound holds. Live: `--with-hermes-grok` → 3 voices (xai + 2 ollama).

## The bug class: a 2026-06-23 feature DARK in the live path via a stale gitignored dist
`dispatchOctopus` lazy-imports the **per-file** `mcp-server/dist/engines/
MultiModelConsensusEngine.js`. That compiled file was STALE — it had **0** references
to the 2026-06-23 OCTOPUS-HERMES-SYNERGY `hermesProxyReachable`/`execViaHermesProxy`
backend that lives in the `.ts` source. So with the proxy UP and `includeGrok:true`,
the engine still gated on `XAI_API_KEY || grok CLI` (both absent) → no Grok voice.

Key trap: **`build:fast` (esbuild) only rebuilds the `dist/index.js` bundle — it does
NOT regenerate the per-file `dist/engines/*.js`** that this consumer imports. Only a
`tsc`-emit build (`build:incremental`) does. `dist` is gitignored, so the freshness is
per-machine.

## Lesson
A feature committed to `.ts` is NOT live for any consumer that imports a compiled
`dist/` artifact until that exact artifact is regenerated. When a "wired" capability
won't fire live, `grep` the symbol in the ACTUAL imported dist file before blaming the
source or the runtime — and know which build step regenerates that artifact
(`build:fast` ≠ per-file tsc emit). "Committed source != live behavior."

See also: `[[reference_octopus_hermes_grok_voice_2026_06_24]]`,
`[[reference_octopus_include_codex_2026_06_10]]`.

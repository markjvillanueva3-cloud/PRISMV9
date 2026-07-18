---
title: Octopus consensus hardening -- local-only reliability arc
type: architecture
domain: orchestration
slot: bravo
created: 2026-06-10
commits: [d1fafa2e1f, 4fdf30e8f5, 801237de5c, 1b7bce6a91, ea45b16481, 2c992e40c2, bb3503a5b8]
related:
  - "[[reference_octopus_include_codex_2026_06_10]]"
  - "[[reference_consensus_drain_local_2026_06_09]]"
  - "[[ollama-pipeline-ms0]]"
---

# Octopus consensus hardening (local-only reliability arc)

The octopus = `MultiModelConsensusEngine.ask()` fans one prompt to Claude + Codex +
Grok + Gemini + Ollama and records a verdict-pattern cluster signature. The
**local-only** path (Ollama voices only, $0, no Anthropic rate limit) is what the
`octopus-first-live-record.mjs` proof runner and the fleet-wide
`consensus-queue-drain.mjs` (fires every Stop) actually use. This entry records the
2026-06-10 arc that took local-only consensus from "structurally cannot seat 2
voices + leaks paid spend" to "clean + reliable-2-voice + diagnosable".

## Finding 1 -- the fleet-wide paid-spend leak (the real bug)

`ask()` called codex **unconditionally**: `available.push("openai")` + a
`callCodex` push with NO `includeCodex` guard, unlike `includeClaude` /
`includeGrok` / `includeGemini` (all `input.includeX !== false`). Two consequences:

- Every local-only run recorded a phantom `{id:"openai",
  verdict:"failed:spawn-enoent"}` voice -- the only way to neutralize codex without
  an engine edit was pointing `PRISM_CODEX_BIN` at a sentinel binary (a hack). It
  dragged the cluster toward 1 voice.
- **Higher impact:** `consensus-queue-drain.mjs` (RATE-LIMIT-FIX, "LOCAL-ONLY by
  default, NO Anthropic limit") set `includeClaude:false` but **could not disable
  codex** -- so on any host with the codex CLI installed/authed it spawned a REAL
  ChatGPT-subscription call per drained prompt, fleet-wide. The exact rate-limit
  amplifier the drain claimed to remove. On this host codex is ENOENT (harmless),
  which is why it stayed latent.

**Fix (d1fafa2e1f, back-compat, R11-consistent):** added `includeCodex?:boolean`
(default true) guarding both the pool-push and the codex call; adopted
`includeCodex:false` in the runner + the drain. Also added the drain's MISSING
`isDirect` main guard -- `main()` ran unconditionally at module top level, so
*importing* the module ran a LIVE drain as a side effect (it drained 3 entries
during verification before the guard landed).

## Finding 2 -- 2-voice was structurally impossible at 102GB

The runner's panel was `[gpt-oss:120b (65GB), qwen2.5-coder:32b (37GB)] = 102GB`
on a 96GB Blackwell box. `resolveDiverseOllamaPanel` intersects the requested panel
with the capability-probe's free-VRAM `runnableModelIds`, so the 120b was dropped
-> a SINGLE voice -> `requireMinVoices:2` never met -> the 2-voice proof was dormant.

**Fix (4fdf30e8f5):** adopted the drain's proven co-resident diverse pair
`qwen2.5-coder:32b (37GB) + gpt-oss:20b (13GB) = 50GB < 96GB` (two distinct
families). Live-validated voiceCount:2, meetsFloor:true.

**Caveat (honest, not overclaimed):** co-residency is TRANSIENT -- even the 50GB
pair can regress to 1 voice under VRAM pressure. The fix proved 2-voice CAN seat;
a hard guarantee needed the prewarm step below.

## Hardening -- diagnosability, vendor-norm, prewarm guarantee

- **Voice-id diagnosability (1b7bce6a91):** the ledger collapsed both local voices
  to `id:"ollama"`, so a dropped voice was UNdiagnosable. `mapConsensusToLedger`
  now tags ollama voices `ollama:<model>` (single-model vendors stay bare). The
  cluster signature is verdict-pattern based, NOT id-based, so cross-run
  comparability is unaffected. This is the honest answer to the transient-co-residency
  caveat (R9): make the regression OBSERVABLE rather than build coordination for an
  unreproduced edge case.
- **Vendor-norm (ea45b16481):** per-model ids made `computeVoiceStats` bucket
  reliability per-model, so HOC04 `proposeVoiceWeightAdjustments` emitted per-model
  voiceIds that don't map to the vendor-keyed `octopus-setup.mjs`. `computeVoiceStats`
  now normalizes `ollama:<model>` -> `ollama` for its byId aggregation ONLY (the
  ledger keeps per-model). HOC04 stays vendor-level, byte-identical to pre-diag.
- **Prewarm hard-guarantee (2c992e40c2):** the failure MECHANISM is verified (the
  probe's free-VRAM gate demonstrably drops models), so hardening is comprehensive,
  not speculative (R13). Added engine `forceProbe` flag (default false -> bypasses
  the 5-min probe cache) + runner `prewarmPanel(models)` (loads each panel model
  resident, SEQUENTIAL since one GPU serializes loads, fail-soft) then dispatches
  `forceProbe:true`. Live: prewarm both -> forceProbe -> voiceCount:2.
- **Prewarm-wiring test (bb3503a5b8):** refactored runLive's prewarm default
  selection so the wiring is directly spy-testable (prewarm called with the panel
  strictly before dispatch; dry/injected-dispatch skips it).

## Net

Local-only octopus consensus is now: CLEAN (no phantom codex, no fleet-wide paid
leak) + RELIABLE-2-voice (prewarm + forceProbe, not co-resident-lucky) +
DIAGNOSABLE (per-model ledger ids) + HOC04-consistent (vendor-norm). 9 commits on
`cad-fusion-live-ms0`, all 3-of-3 scrutiny PASS, LF-clean, live-validated against
`octopus-runs.jsonl`.

## Lesson

When an `includeX` family exists for every external voice EXCEPT one, the unguarded
one is a latent paid-spend leak the moment a "local-only" caller appears -- audit
the whole family for symmetry, not just the voice you are adding. And a panel of
named models on a fixed-VRAM box is only as wide as `freeVRAM / sum(modelSizes)` --
size the panel to co-reside, then prewarm+force-probe to make the width a guarantee
rather than a probe-timing accident.

---
title: Octopus capability-aware default voice (U-OCTOPUS-PANEL)
tags: [architecture, ai-systems, octopus, consensus, model-routing, blackwell-ai-ms0]
slot: india
created: 2026-06-08
commit: c1b40183c1
---

# Octopus capability-aware default voice

The octopus (`MultiModelConsensusEngine`) fans a prompt out to Claude + Codex +
local Ollama voices and scores consensus. Before U-OCTOPUS-PANEL its local-voice
**default** was a static string (`DEFAULT_OLLAMA_MODEL`), so it could request a
model that was `ollama rm`'d — the live `model 'deepseek-r1:14b' not found` bug.

## The keystone it wires to

`OllamaCapabilityProbeEngine` (U-CAP-PROBE) is the single capability oracle:
`probe()` reads `nvidia-smi` + Ollama `/api/tags` + `/api/ps` (5-min cached) and
computes `runnableModelIds` = catalog models that are **present AND fit free VRAM
AND `runsOn` this host**. U-OCTOPUS-PANEL added the *selector* on top:

```ts
ollamaCapabilityProbeEngine.getBestReasoningModel()  // highest qualityTier runnable
ollamaCapabilityProbeEngine.getBestChatModel()       // highest codeTier runnable (distinct 2nd voice)
ollamaCapabilityProbeEngine.getBestLocalModel(axis)  // shared impl
```

- Returns the highest catalog-tier RUNNABLE local model, or `null` when none is
  runnable (Ollama down / nothing pulled / VRAM-starved / cloud_only host).
- **Chat-capability gate is by TAG, not id-regex:** `tags.includes("chat") &&
  !tags.includes("vision")`. This excludes embedders, **rerankers**
  (`tags:["rerank"]` — id has no `embed` substring, so an `/embed/i` filter would
  have wrongly seated `dengcao/Qwen3-Reranker-4B` as a reasoning voice), and
  vision-only VLMs (matching `resolveDiverseOllamaPanel`'s vision rejection — one
  chat-capability rule across both octopus selectors, R7).
- Ranks by capability **tier, not size**: on a 4080, `qwen3-vl:8b` (qualityTier
  66) beats `phi3:14b` (62). A tuned 8b can out-reason a generic 14b.
- Ties: higher `paramsB`, then lexical `id` (deterministic, iteration-order-independent).

## The wire (MMCE.ask, legacy branch)

```
input.ollamaModel ?? probedPrimary ?? DEFAULT_OLLAMA_MODEL
```

- Explicit caller `ollamaModel` ALWAYS wins (override is sacred).
- Probe consulted only when the slot is unset; `getBestChatModel` only when
  `dualOllama && secondaryOllamaModel` unset.
- `try/catch` + probe-`null` → static `DEFAULT_*_MODEL`, so the daemon-down /
  no-GPU degrade path is fully preserved. `resolveOllamaModels` still
  list-substitutes against the live `listModels()` set downstream.

## Tests

`OllamaCapabilityProbeEngine.test.ts` — 11 selector tests (reasoning/code rank, 2
variability profiles, 3 failure modes, 3 adversarial incl. reranker exclusion).
`MultiModelConsensusEngine.test.ts` — probe-default-voice wire + override-wins;
probe→null mocked in every orchestration `beforeEach` to keep the suite hermetic
(no live nvidia-smi/HTTP).

## Both branches wired (U-OCTOPUS-DIVERSE-PROBE, 2026-06-08)

The diverse-panel branch now also consults the probe. `resolveDiverseOllamaPanel`
took an optional 3rd param `runnable?: readonly string[]` (the probe
`runnableModelIds`): when present it intersects the panel with the runnable set
and the empty-panel fallback prefers a runnable model over the size-only
heuristic; when `undefined` it is byte-identical to the prior 2-arg behavior. The
diverse-branch call site `probe()`s (try/catch → undefined on fail) and passes
`snap.runnableModelIds`. **Fail-OPEN:** an empty `[]` is treated as
*no-probe-signal* (→ install-gate), NOT seat-nothing — the probe is a VRAM-fit
oracle, not a can-execute oracle (`[]` on cloud_only/CPU hosts + the WDDM
artifact), so honoring `[]` literally would silence the local voice on every
GPU-less host. Both octopus selectors (legacy + diverse) now share one
capability oracle + one chat-capability rule.

## Still open

- MMCE header L9/L92 doc-drift (still says `deepseek-r1:14b` — P3).

## Related

- [[architecture/gnn-selective-deploy]] · [[reference_model_retired_test_stale_2026_06_08]]
- Plan: `state/shared/specs/BLACKWELL-AI-UPGRADE-PLAN-2026-06-03.md` line 224 (U-OCTOPUS-PANEL)

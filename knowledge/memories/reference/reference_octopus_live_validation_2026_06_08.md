---
name: reference_octopus_live_validation_2026_06_08
description: "R15-step-3 LIVE validation (not tests-only) of the octopus capability-probe wiring (U-OCTOPUS-PANEL + U-OCTOPUS-DIVERSE-PROBE) against the live Ollama host — PASS with numbers; one P3 hardcoded-fallback noted as documented-not-defect."
type: reference
galaxy: ai-training
source: prism-memory
synced: 2026-06-27T20:30:46.669Z
aliases: reference_octopus_live_validation_2026_06_08
---


# Octopus cap-probe wiring — LIVE validated (2026-06-08, slot:india)

Closed the R15-step-3 gap on U-OCTOPUS-PANEL / U-OCTOPUS-DIVERSE-PROBE: they
shipped through *tests* but had never been proven against the LIVE Ollama host.
Validated directly (no cloud voices → no rate-limit risk), with numbers.

## What was measured (DESKTOP-N7MI1VB, RTX PRO 6000 Blackwell 96GB)

| Check | Result |
|---|---|
| `ollamaCapabilityProbeEngine.probe()` snapshot keys | `hardware, gpu, presentModels, loadedModels, backendUp, runnableModelIds, warnings, probedAt, source` |
| `runnableModelIds` (present + fits free VRAM + runsOn host) | `[qwen2.5-coder:32b, qwen3-vl:8b, gpt-oss:20b]` (3) |
| VRAM-awareness proof | `gpt-oss:120b` is in `presentModels` but **excluded from runnable** — correctly dropped a model that won't fit free VRAM (qwen2.5-coder:32b already resident @37.5GB) |
| `getBestReasoningModel()` | `qwen2.5-coder:32b` ✓ (workhorse) |
| `getBestChatModel()` | `qwen2.5-coder:32b` ✓ (vision-gate excluded `qwen3-vl:8b`) |
| selected model produces real output | direct `/api/generate` → `"READY"`, eval 2 tok, **84 tok/s, 614ms total** |

**Both octopus branches are wired** (the india MEMORY.md previously mislabeled the
diverse-panel branch "STILL UNWIRED / deferred" — corrected):
- default-voice branch: `MultiModelConsensusEngine.ts:540` (`getBestReasoningModel`) → `:551` (`?? probedPrimary ??`)
- diverse-panel branch: `:505-518` feeds `snap.runnableModelIds` into `resolveDiverseOllamaPanel(diverseModels, installedOllama, runnableIds)` (U-OCTOPUS-DIVERSE-PROBE, shipped).

## P3 finding (documented-not-defect — left as-is)

The terminal fallback `input.ollamaModel ?? probedPrimary ?? DEFAULT_OLLAMA_MODEL`
(`DEFAULT_OLLAMA_MODEL = "gpt-oss:120b"`, `:245/551`) is the **last hardcoded model
id** — the exact bug-class the cap-probe keystone exists to kill (deepseek-r1:14b-not-installed).
But it is reachable ONLY when the probe returns null (nothing runnable / probe threw),
and `resolveOllamaModels` then list-substitutes it against `installedOllama`; a failed
local voice simply drops out while the cloud voices (Claude/Codex/Grok/Gemini) carry
consensus. The comment at `:525-534` documents this as the intended legacy degrade
path. So it is graceful, not a defect — NOT changed (surgical-change discipline; don't
rewrite deliberately-designed degrade logic over a narrow edge).

**Future hardening (if revisited):** when `probedPrimary` is null, prefer OMITTING the
ollama voice over seating a non-runnable hardcoded model — cloud voices already carry
consensus, so an always-failing local voice adds latency for no signal.

Related: [[reference_model_retired_test_stale_2026_06_08]] · [[reference_api_ratelimit_wsl_commit_2026_06_08]]. Wiki [[octopus-capability-aware-voice]].

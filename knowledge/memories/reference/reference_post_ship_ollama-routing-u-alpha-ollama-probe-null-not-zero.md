---
name: reference_post_ship_ollama-routing-u-alpha-ollama-probe-null-not-zero
description: Auto-distilled learnings from shipping OLLAMA-ROUTING/U-ALPHA-OLLAMA-PROBE-NULL-NOT-ZERO (commit b2d527b12). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.960Z
aliases: reference_post_ship_ollama-routing-u-alpha-ollama-probe-null-not-zero
---


# OLLAMA-ROUTING/U-ALPHA-OLLAMA-PROBE-NULL-NOT-ZERO

[MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-PROBE-NULL-NOT-ZERO (slot:alpha): close the 3-of-3 P2 (reviewer C) on 69b31cbfbf -- the capability-probe wrote FALSE-0 for generation-failed models. New excludeNoSignalModels guard: a model scoring rate-0 on EVERY measured task (a big model cold-load timing out under VRAM contention -> callOllama '' -> false 0, OR a reasoner emitting <think> that breaks exact-match) is recorded ABSENT, not a misleading 'measured incapable' 0. Wired into the probe write path AFTER the outage clobber-guard (which stays on the RAW matrix so a total outage is still caught). Re-filtered the committed matrix: it revealed 6/9 models were false-0 (qwen2.5-coder:32b, qwen3-coder:30b, gpt-oss:20b/120b, deepseek-r1:14b/32b ALL failed to generate in the probe's single-process unload-between-models 9-model run -- the per-model stress runs succeeded, which is why the SEPARATE stress-frontier has valid big-model data). Clean matrix now honestly carries the 3 positive-signal models (1.5b/7b/14b) + an excludedNoSignal audit field; ROUTING UNCHANGED (classify->14b extract->1.5b format->7b -- the cheap ladder was always the pick, so dropping the never-picked false-0 big models is routing-neutral but honest, and removes the latent trap where a future big-model-only class would have its valid offload suppressed by a false 0). 12/12 probe (6 new R9: drop-all-0, keep-any-positive, total-0!=no-signal, purity, fast-path, adversarial) + 36/36 policy. FOLLOW-UP noted: the probe's single-process 9-model run is unreliable for big models under contention -- adopt the per-model-invocation pattern (the stress runner already does) for a future clean big-model probe.

**Shipped:** 2026-06-25T11:48:53-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[ollama-routing-u-alpha-ollama-probe-null-not-zero]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._
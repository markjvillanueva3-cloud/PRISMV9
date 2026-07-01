---
name: reference_ollama_stress_capability_2026_06_24
description: Ollama stress-test harness + measured capability/diminishing-returns frontier on the Blackwell box (7b is the sweet spot; c=8 wedges)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.682Z
aliases: reference_ollama_stress_capability_2026_06_24
---


**U-ALPHA-OLLAMA-STRESS** (slot:alpha, 2026-06-24). Empirical answer to the operator's "stress test ollama to see how far we can push it before diminishing returns + what tasks it's truly capable of."

**Harness:** `scripts/ollama-stress-test.mjs` (19/19 tests) -- composes india's `ollama-capability-battery.mjs` (tasks+verifiers, NOT a dup of `ollama-capability-probe.mjs` which does pass-rate at concurrency-1) and adds 3 scaling sweeps: model-tier frontier, concurrency knee, output-length. Pure analysis core (tokPerSec/percentile/findConcurrencyKnee/smallestPassingModel/classifyTaskFrontier) + injectable callFn. Discloses sample size + flags low-n verdicts (R12). Both scrutiny arms PASS.

**Measured frontier (DESKTOP-N7MI1VB, RTX PRO 6000 Blackwell 96GB):**
- **7b (qwen2.5-coder:7b) is the SWEET SPOT** -- 100% on classify/unit-convert/arithmetic at ~80-200 tok/s; 1.5b is flaky there (33-67%); 14b is 2-4x slower (~36-44 tok/s) for marginal gain.
- 1.5b suffices for simple extraction/formatting (extract-number, json-extract, list-sort).
- 14b needed only for light reasoning (boolean-judgment).
- **Concurrency knee = c=2** (agg throughput saturates ~255 tok/s; c=4 = latency not throughput; **c=8 WEDGES the server** -- generate hangs, recover via `ollama-wedge-guard.mjs --recover`).
- Output length: flat ~47-48 tok/s 32->1024 num_predict (no diminishing returns; long gen is fine).

**Two failure modes found (the "how far before it breaks"):** (1) model-swap thrash wedges Ollama mid-sweep -> benchmark MODEL-OUTER (load each model once), keep hot model resident; (2) large models (32b OR 120b) co-loaded with smaller ones thrash VRAM and wedge (observed 3x) -- usable solo, not in a mixed sweep. **R12 CORRECTION:** an earlier note said NUM_PARALLEL/MAX_LOADED_MODELS were "unset (defaults)" -- WRONG, I only checked Machine scope; both are SET at USER scope (`OLLAMA_NUM_PARALLEL=4`, `OLLAMA_MAX_LOADED_MODELS=4`, `OLLAMA_CONTEXT_LENGTH=131072`, KEEP_ALIVE=10m, FLASH_ATTENTION=1). The wedge persists DESPITE good parallelism config, so raising those is NOT the lever -- the likely cause is KV-cache VRAM pressure (131072 context x 4 parallel slots) + MAX_LOADED=4 letting total weights exceed 96GB with a 120b. Real levers (operator tradeoffs, not auto-applied): lower CONTEXT_LENGTH for the offload path, app-layer concurrency cap, or lower MAX_LOADED when large models are in rotation.

**Routing implication:** mechanical offload -> 7b (not 1.5b, not 14b/32b); reasoning -> 14b; cap concurrency <=4 (ideally 2); reserve 120b for solo deep reasoning. Full matrix: wiki [[ollama-stress-capability-frontier]]. Builds on india's [[reference_ollama_pipeline_ms0_2026_05_15]].

**PROVEN no-tradeoff fix + WIRED (R15 complete, commits a77b245691 + 07c67700df):** the c=8 wedge is KV-cache VRAM reservation (131072 global context x parallel slots). Re-ran c=1,2,4,8 on 7b at PER-REQUEST num_ctx=4096: c=8 completed 8/8 (was a hard wedge) AND knee improved c=2->c=4 (peak 255->303 tok/s). Per-request num_ctx needs NO global OLLAMA_CONTEXT_LENGTH change (long-context preserved). WIRED into `scripts/ask-ollama.mjs::callModel` -> defaults num_ctx to `defaultNumCtxForPrompt(prompt,numPredict,system)` (input-sized, chars/3 overshoot + margin, clamp [2048,131072]) when caller doesn't pin it; provably output-safe (num_ctx>=real tokens -> identical output, only KV reservation shrinks). Every fleet offload now reserves a right-sized KV cache by default -> safe concurrency + freed VRAM, zero capability loss. 56/56 ask-ollama tests + 23/23 harness; live offload validated.

---
title: Ollama Stress Test - Capability + Diminishing-Returns Frontier (Blackwell)
type: architecture
created: 2026-06-24
slot: alpha
status: built
tags: [ollama, stress-test, capability, routing, blackwell, diminishing-returns]
---

# Ollama Stress / Capability Frontier (Blackwell box, 2026-06-24)

Empirical answer to "how far can we push the local Ollama stack before diminishing
returns, and what tasks is it truly capable of." Harness: `scripts/ollama-stress-test.mjs`
(U-ALPHA-OLLAMA-STRESS). Composes india's `ollama-capability-battery.mjs` (tasks +
verifiers) and adds three scaling sweeps the existing `ollama-capability-probe.mjs`
does not measure: model-tier frontier, concurrency knee, output-length scaling.
Host: DESKTOP-N7MI1VB (RTX PRO 6000 Blackwell 96GB, 9950X3D, 136GB RAM).

## 1. Capability frontier -- smallest model that passes (clean, model-outer run)

Tasks scored with the battery's own deterministic verifiers (temp 0). `n` = cases/task.

| task | smallest passing | 1.5b | 7b | 14b | notes |
|---|---|---|---|---|---|
| classify-enum | **7b** | 67% | 100% | 100% | n=3 |
| unit-convert | **7b** | 33% | 100% | 100% | n=3 |
| extract-number | **1.5b** | 100% | 100% | 100% | n=2 (low-n) |
| json-extract | **1.5b** | 100% | 100% | 100% | n=1 (low-n) |
| list-sort | **1.5b** | 100% | 100% | 100% | n=2 (low-n) |
| arithmetic | **7b** | 67% | 100% | 100% | n=3 |
| boolean-judgment | **14b** | 67% | 67% | 100% | n=3 -- reasoning needs 14b |
| keyword-extract | NONE | 0% | 0% | 0% | n=1 -- beyond small-local (or strict verifier) |

**Verdict:** 1.5b handles simple extraction/formatting; **7b is the workhorse**
(classification, unit conversion, arithmetic -- 1.5b is flaky 33-67% there); 14b is
needed only for light reasoning (boolean judgment). Low-n rows are advisory (wide CI).

> SCOPE CAVEAT (R12): this battery tests MECHANICAL tasks (classify / extract /
> unit-convert / arithmetic / short structured output), NOT heavy code generation.
> The "7b sweet spot" verdict applies to mechanical offload. For heavy CODE tasks,
> qwen2.5-coder:32b is the code specialist and was NOT benchmarked here -- do not
> route code-gen to 7b on the strength of this table. A clean 32b row could not be
> obtained: every multi-model sweep that included 32b (or 120b) WEDGED the box (see
> section 5), so the 32b/120b numbers anywhere here are from a single run that later
> destabilized -- directional only, not pristine.

## 2. Throughput (tokens/sec, generation)

| model | tok/s range | note |
|---|---|---|
| 1.5b | ~85-170 | fast but accuracy-flaky on non-trivial tasks |
| **7b** | **~80-200** | as fast or FASTER than 1.5b (better batching) AND 100% accurate = sweet spot |
| 14b | ~36-44 | 2-4x slower for marginal accuracy gain |

Bigger is NOT faster: 14b runs at ~1/4 the 7b tok/s. The diminishing-returns point on
model size for mechanical tasks is **7b** -- past it you pay 2-4x latency for accuracy
you mostly already had.

## 3. Concurrency ceiling (qwen2.5-coder:7b)

| concurrency | agg tok/s | p95 latency | result |
|---|---|---|---|
| 1 | 67 | 3797ms (incl cold load) | baseline |
| **2** | **255** | 1400ms | throughput peak (GPU batches well) |
| 4 | 249 | 2924ms | no throughput gain, 2x latency |
| 8 | -- | -- | **WEDGES the server** (generate hangs, VRAM stuck) |

**Knee = c=2.** Aggregate throughput saturates at 2 concurrent requests; c=4 buys
latency, not throughput; **c=8 wedges Ollama** (had to recover via
`ollama-wedge-guard.mjs --recover`). Cap concurrency at <=4 (ideally 2).

> CORRECTION (R12, verified 2026-06-24): an earlier draft said `OLLAMA_NUM_PARALLEL`
> / `OLLAMA_MAX_LOADED_MODELS` were "unset = defaults" and raising them might lift the
> ceiling. WRONG -- I only checked Machine-scope env; both are ALREADY set at USER
> scope: `OLLAMA_NUM_PARALLEL=4`, `OLLAMA_MAX_LOADED_MODELS=4` (also
> `OLLAMA_KEEP_ALIVE=10m`, `OLLAMA_FLASH_ATTENTION=1`, `OLLAMA_GPU_OVERHEAD=2GB`,
> `OLLAMA_KV_CACHE_TYPE=f16`, **`OLLAMA_CONTEXT_LENGTH=131072`**). So the wedge
> persists DESPITE good parallelism config -- raising those is NOT the lever.
> The likely real cause: `OLLAMA_CONTEXT_LENGTH=131072` is very large, and
> `NUM_PARALLEL=4` reserves KV cache for 4 concurrent slots EACH at that context ->
> at c=8 the KV-cache VRAM reservation (131072 x parallel x f16) starves the GPU and
> the runner hangs. And `MAX_LOADED_MODELS=4` permits total loaded weights to exceed
> 96GB once a 120b (65GB) joins smaller models -> the multi-model wedge. Both point at
> VRAM accounting (context + loaded-model headroom), NOT a missing parallelism knob.
> Genuine levers (each a deliberate tradeoff for the operator, NOT auto-applied):
> lower `OLLAMA_CONTEXT_LENGTH` for the offload path, or cap concurrency at the app
> layer, or set `MAX_LOADED_MODELS` lower when large models are in rotation.

> PROVEN (2026-06-24, the KV-cache hypothesis CONFIRMED with a no-tradeoff fix):
> re-running c=1,2,4,8 on 7b with a PER-REQUEST `num_ctx=4096` (vs the global 131072):
> **c=8 completed cleanly (8/8, no wedge)** -- the exact case that wedged the server at
> default context -- AND concurrency scaled BETTER: knee moved c=2 -> **c=4**, peak
> throughput **255 -> 303 tok/s**. So the wedge was KV-cache VRAM reservation
> (131072 x parallel slots), and the fix is a **per-request `num_ctx`** (the harness now
> takes `--num-ctx`), which needs **NO global `OLLAMA_CONTEXT_LENGTH` change** -- long-context
> capability is preserved for consumers that need it. Measured: c=8 @ num_ctx=4096 ->
> agg 271 tok/s p95 7371ms, all 8 ok.
>
> WIRED (R15 complete): `scripts/ask-ollama.mjs::callModel` now defaults num_ctx to
> `defaultNumCtxForPrompt(prompt, numPredict, system)` -- sized by UTF-8 BYTE length
> (`bytes + numPredict + 1024 margin`, clamped [2048, 131072]) -- whenever the caller
> doesn't pin num_ctx. Provably output-safe for ANY script: for byte-level BPE
> (qwen/gpt-oss/deepseek) real tokens <= utf8 bytes, so num_ctx >= bytes >= real tokens
> -> whole prompt fits -> identical output; only the KV reservation shrinks. (An initial
> chars/3 estimate undershot CJK + accented Latin -> truncation risk; caught by 2-arm
> scrutiny, fixed to byte-based -- commit 4ec7e7c1e3.) So EVERY fleet offload reserves a
> right-sized KV cache by default: short tasks ~2048 (safe concurrency, freed VRAM), long
> inputs scale to 131072. Pinned-num_ctx callers untouched. 56/56 ask-ollama tests
> (incl. CJK + Polish byte-coverage regression guards). Live offload validated (correct
> output through the adaptive ctx).

## 4. Output-length scaling (qwen2.5-coder:7b)

tok/s is **flat ~47-48** across num_predict 32 -> 1024. Long generation is NOT a
bottleneck -- latency scales linearly with actual tokens, throughput holds.

## 5. The two failure modes found (the real "how far before it breaks")

1. **Model-swap thrash wedge.** A task-outer benchmark loop (swap model every task)
   accumulated VRAM evictions and **wedged Ollama mid-sweep** -- classify-enum passed
   on 14b/32b, then every later task returned `fetch failed`. Fix: benchmark
   model-outer (load each model once). Operationally: keep the hot model resident.
2. **Large-model co-load wedge.** Including a LARGE model (gpt-oss:120b 65GB OR
   qwen2.5-coder:32b 20GB) in a multi-model sweep thrashed VRAM (forced evictions of
   the resident smaller models) and wedged the server -- observed 3 separate times
   (120b run, a task-outer run, and a 4-model 1.5b-32b run that hung Ollama until a
   `--recover` serve-restart). The clean, repeatable characterization band on this box
   (default Ollama config) is models <= 14b co-resident; larger models are reliable
   only SOLO. This is the dominant "how far before it breaks" result: the ceiling is
   VRAM-thrash stability, not raw capability.

## Routing implications (evidence-based)

- Route classification / unit-convert / arithmetic / simple extraction -> **qwen2.5-coder:7b** (the cost+accuracy sweet spot), NOT 1.5b (flaky) and NOT 14b/32b (slower, no gain).
- Route light reasoning (boolean judgments) -> 14b.
- Keep concurrency <= 2-4; never fan 8 local requests at once.
- Long outputs are fine (throughput holds).
- Reserve the 120b for solo deep-reasoning, never in a mixed multi-model sweep.

## Surfaces

| | |
|---|---|
| Harness | `scripts/ollama-stress-test.mjs` (`--sweep tier\|concurrency\|output\|all`) |
| Tests (19/19) | `scripts/ollama-stress-test.test.mjs` |
| Composes | `scripts/lib/ollama-capability-battery.mjs` (india's verified battery) |
| Companion | `scripts/ollama-capability-probe.mjs` (task x model pass-rate, concurrency 1) |
| Recovery | `scripts/ollama-wedge-guard.mjs --recover` |

## Related
- [[ollama-pipeline-ms0]] - the offload pipeline these route decisions feed.
- [[octopus-utilization-driver]] - consumes the local panel this characterizes.

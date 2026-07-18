---
title: vLLM Serving Layer Incorporation Plan for PRISM
date: 2026-06-10
author: slot:golf
status: DRAFT-FOR-OPERATOR-REVIEW
scope: PLAN-ONLY-NO-BUILD
host: DESKTOP-N7MI1VB (single workstation)
supersedes: nothing
reconciles-against: LOCAL-LLM-FOUNDATION-BLUEPRINT-2026-06-03.md, BLACKWELL-AI-UPGRADE-PLAN-2026-06-03.md, CANONICAL-HOST-FACTS-2026-06-09.md, PSN-INCORPORATION-RESEARCH-R4-2026-05-25.md, NIM-ACTIVATION-MS0.md, BLACKWELL-SYNC-INVESTIGATION-2026-06-03.md
---

# vLLM Serving Layer Incorporation Plan for PRISM

**Status:** DRAFT-FOR-OPERATOR-REVIEW - go/no-go decision document. NOT an implementation. NO code shipped.
**Author:** slot:golf
**Date:** 2026-06-10
**Host:** DESKTOP-N7MI1VB (single Windows 11 workstation)

> ## CITATION + SOURCING NOTE (read first - this is the R12 backbone of the document)
> An earlier draft of this plan cited two external vLLM sources as "E1" and "E2" and attributed
> quantitative claims (0.41s health-check, "2-4x concurrent requests", "PagedAttention 50%+ less
> fragmentation", "Linux-only", fp8 flags) to them. **Those E1/E2 extracts are NOT present in this
> host's ground-truth files.** `CANONICAL-HOST-FACTS-2026-06-09.md` contains ONLY hardware specs +
> the 10-model Ollama roster (zero vLLM content); `X-ARTICLE-SYNERGY-AUDIT-2026-06-10.md` is a
> doctrine/enforcement audit (zero vLLM content). Therefore, in THIS final version:
> - Every claim that came from the un-resolvable E1/E2 is re-marked `[HYPOTHESIS - external vLLM docs, NOT in PRISM ground truth; validate in POC]`.
> - Every claim that IS backed by an in-repo PRISM artifact is cited to that file:line.
> - The ONLY in-repo throughput figure for vLLM/PagedAttention is `PSN-INCORPORATION-RESEARCH-R4-2026-05-25.md:22` = **"24x higher throughput for production serving"** (a generic vendor/literature figure, NOT a Blackwell or PRISM-prompt-mix measurement). The earlier "2-4x" was unsourced; see P1-1 reconciliation in Section 2.3.
> Net: the *direction* of the throughput case is supported by in-repo research; the *magnitude for
> PRISM's prompt mix on this exact card is UNMEASURED* and the POC (Phase 0) exists to produce it.

---

## 1. Executive Summary

**What:** Add vLLM (`vllm serve`, OpenAI-compatible) as a high-throughput serving layer for a small set
of *hot, single-model* workloads on the RTX PRO 6000 Blackwell 96GB, **building on the vLLM recipe PRISM
has ALREADY specced** in `LOCAL-LLM-FOUNDATION-BLUEPRINT-2026-06-03.md` (do not re-derive it), while
keeping native Ollama for the workloads vLLM structurally cannot serve well on one box (multi-model
consensus/OCR ensembles, on-demand model swap, embeddings parity).

**Critical reconciliation (R8 - read the existing design before adding):** PRISM is NOT starting from
zero on vLLM. The foundation blueprint already specifies:
- a concrete vLLM compose service `vllm-qwen3next` on `8020:8000` (matches `local-llm-bridge.mjs:113`),
  launched `--model Qwen/Qwen3-Next-80B-A3B-Instruct --quantization fp8 --max-model-len 262144
  --gpu-memory-utilization 0.45` (blueprint Section 3 TIER 0.3, line 34);
- an **88GB soft ceiling with >=8GB headroom** (blueprint Section 2) - NOT 96GB/90%;
- the explicit **"run 80B on vLLM (time-slices) keeping Ollama resident; OR 80B as Ollama swap-in;
  NEVER both"** co-residency rule (blueprint Section 2 CONTENTION FLAG, line 28);
- `ModelRoutingEngine.ts` Blackwell catalog work ALREADY SHIPPED (`f737e23661`, 3-of-3 PASS): the
  `home_blackwell` HardwareProfile enum + 5 qwen3 models as conservative-floor catalog rows.
- NIM->vLLM->Ollama capability-aware routing with bit-exact Ollama fallback is already modeled in
  `NIM-ACTIVATION-MS0.md` + `BLACKWELL-SYNC-INVESTIGATION-2026-06-03.md`.

This plan therefore positions itself as a **decision + sequencing layer on top of the blueprint**, not
a fresh serving design. Everything below that overlaps the blueprint is marked "ALREADY-SPECCED" so the
operator does not fund duplicate work.

**Why:** PRISM's defining load pattern - **26 concurrent Claude agent slots fanning grunt work at one
local endpoint** - is the high-concurrency-single-box case vLLM's PagedAttention + continuous batching
target. PSN-R4:22 records PagedAttention at "24x higher throughput for production serving" as the
"production-serving prerequisite when PRISM serves multiple slots simultaneously." That is the
strongest in-repo argument; it is a generic figure, not a measurement on our hardware.

**Recommendation posture:** **CONDITIONAL GO for Architecture Option A (vLLM ALONGSIDE Ollama),
POC-gated.** Do NOT replace Ollama. Three load-bearing Ollama-only capabilities (multi-model-on-one-
endpoint for octopus + OCR ensemble, embeddings-corpus parity, auto model-swap) have no clean vLLM
equivalent on a single GPU, and the *measured* throughput win for OUR access pattern is unproven.
Proceed only through a POC that proves the throughput gain on a real 26-slot fan-out before any
consumer code is touched.

**The single hardest blocker** is not code volume - it is **FLAG-3 (multi-model-on-one-endpoint)**:
octopus consensus and the OCR ensemble require 2-4 distinct model families resident and queried
concurrently on one endpoint, native to Ollama and structurally foreign to single-model-per-process
vLLM.

**The single most dangerous omission an earlier draft made** (now fixed in Section 5): the GPU
**training/torch stack lives on the same 96GB card** - GNN GPU retrain (~6-12GB peak), full-corpus
sentence-transformers embed (bs=512, ~4-5GB peak), and 32B QLoRA (~35GB), per
`BLACKWELL-AI-UPGRADE-PLAN-2026-06-03.md:163-172`. Any VRAM budget that does not subtract this is a
guaranteed OOM. The co-residency math below is now a **three-way partition** against the 88GB ceiling.

---

## 2. Why vLLM for PRISM on Blackwell - the concrete wins

### 2.1 The hardware + load-pattern fit

| PRISM fact (sourced) | vLLM property | Source / status |
|---|---|---|
| 26 concurrent agent slots offload to one local endpoint | high-concurrency single-box serving is vLLM's target regime | PRISM fleet fact (CLAUDE.md PER-CHAT HANDOFF: 26 NATO slots). vLLM property = `[HYPOTHESIS - external vLLM docs; validate in POC]` |
| 96GB VRAM, one Blackwell GPU (97,887 MiB) | larger KV-cache headroom for in-flight sequences | Hardware: `CANONICAL-HOST-FACTS-2026-06-09.md:10`. PagedAttention benefit = PSN-R4:22 (generic 24x) |
| RTX PRO 6000 Blackwell, fp8-capable | `--quantization fp8` on this card | ALREADY-SPECCED: blueprint:34 launches qwen3-next fp8 on this card. fp8-runs-on-Blackwell = blueprint assertion, not yet a live PRISM benchmark |
| Heavy concurrent grunt work (summarize/classify/triage) | throughput-bound regime where batching wins | PRISM offload fact (token-economy doctrine). Magnitude = UNMEASURED |

### 2.2 The named mechanisms, tied to our workload (sourcing corrected)

- **fp8 weights + fp8 KV cache** - ALREADY-SPECCED in the blueprint (`--quantization fp8`, line 34).
  Halves KV-cache bytes vs bf16 -> more concurrent-sequence context on a fixed card. The blueprint
  *assumes* this runs on the card (it launches it); there is no live PRISM throughput number yet.
  `[HYPOTHESIS for resulting tokens/sec - validate in POC]`.
- **PagedAttention** - in-repo figure PSN-R4:22 "24x higher throughput for production serving."
  **[GENERIC literature figure - NOT a Blackwell/PRISM-mix measurement; the POC must produce our own.]**
- **Continuous / in-flight batching** - vLLM's core mechanism; **[KNOWN vLLM feature, NOT separately
  sourced in PRISM ground truth - validate in POC]**.
- **Automatic prefix caching** - PRISM agents share a large stable prefix (the CLAUDE.md/system-reminder
  preamble injected into every slot), so prefix caching would be high-value here. **[HYPOTHESIS for our
  setup - verify the feature is enabled AND that our prompts actually share a cacheable prefix.]**
- **Chunked prefill** - helps when long-context callers (transcript mining; the blueprint sizes
  qwen3-next at `--max-model-len 262144`) would otherwise stall short requests. **[KNOWN vLLM feature,
  not separately sourced - verify in POC.]**
- **OpenAI-compatible API** - ALREADY-SPECCED integration lever: `local-llm-bridge.mjs:113` already
  targets the `8020` vLLM endpoint. PRISM's `ask-ollama.mjs` Docker fallback and
  `ollama-prism-bridge.mjs` tool-calling can move to this standard surface.

### 2.3 Expected throughput gain - honest accounting (P1-1 reconciliation)

- **Two in-tree figures disagree and an earlier draft cited a third unsourced one.** PSN-R4:22 =
  "24x higher throughput for production serving." The earlier draft's "2-4x more concurrent requests"
  has **no resolvable source** in PRISM ground truth. These are not the same metric: "24x" is a raw
  serving-throughput literature figure (large-batch saturation); "2-4x" framed concurrency headroom.
  **Resolution:** cite only the in-repo PSN-R4 "24x" figure, label it explicitly as a generic
  production-serving figure (not concurrency, not Blackwell, not our mix), and treat BOTH as
  non-binding until the POC measures our own number. Neither is passed off as a measurement.
- **There is ZERO sourced tokens/sec or $/token for this exact card + PRISM prompt mix in any
  ground-truth file.** (The earlier draft's "0.41s health-check" was from the un-resolvable E1 and is
  struck.)
- **Conclusion:** direction (throughput up, concurrency up) is supported by in-repo research; magnitude
  for PRISM's prompt mix is **[HYPOTHESIS - the POC must produce our own tokens/sec at the 26-slot
  fan-out before anyone signs off].**

---

## 3. What we would LOSE / risk vs Ollama (honest)

These come from the Ollama-surface inventory's load-bearing flags and are reconciled with the blueprint.
None are cosmetic.

1. **Auto model-swap + install-gating off `/api/tags` (FLAG-1).** PRISM's routing layer
   (`OllamaHookBridgeEngine.resolveInstalledModel`, `OllamaTaskOffloaderEngine.selectModel`,
   `ollama-cost-router`, `host-aware-synthesis-model`, `vision-model-select`) is built on "ask
   `/api/tags` which of MANY models are pulled, pick the best installed one." **vLLM serves ONE model
   per process**; `/v1/models` returns just that one. The install-gate + tier-escalation machinery
   (cheap/balanced/strong/best) goes inert under vLLM. Mitigation = a router in front of N vLLM
   processes OR a fixed model per task class - both add weight Ollama gives free. (Note: PRISM lacks an
   `/api/tags` presence gate in `ModelRoutingEngine` today - blueprint line 9 P1 - so even the Ollama
   side has a known gap here.)

2. **`keep_alive` / on-demand eviction warm-loop (FLAG-4).** `keep_alive:"10m"`, the prewarm-on-pipeline
   hook, and `/api/ps` resident probing all assume models load/unload. Under vLLM the one model is
   permanently resident - these paths become dead code (harmless but must be neutralized, not left
   lying). Note the blueprint's Ollama side moves to `OLLAMA_KEEP_ALIVE=-1` (line 33), so keep_alive
   semantics already differ between the two stacks.

3. **GGUF pulls + LoRA-via-Modelfile (FLAG-5).** `ollama pull <model>` and Modelfile-based LoRA deploy
   (`LatheLoRAOllamaDeployerEngine`, `setup-embedding-model.mjs`, golf's model-pull lane) are
   Ollama-specific. vLLM consumes HF safetensors + `--enable-lora` adapters - a different acquisition +
   deploy pipeline. **Cost sizing (P1-3):** the vLLM candidate (qwen3-next:80b-a3b) is acquired by the
   blueprint AS an HF checkpoint already (`--model Qwen/Qwen3-Next-80B-A3B-Instruct`), so for the *hot
   model* there is no GGUF->safetensors re-download. The re-acquisition cost lands only if we ever try
   to move Ollama-only GGUF models or the lathe LoRA to vLLM - which Option A does NOT do. Sizing for
   those is deferred with the LoRA decision (Section 9 Q8).

4. **One-endpoint-many-models for consensus + OCR ensemble (FLAG-3) - THE big one.**
   `MultiModelConsensusEngine` (octopus) and the vision ensemble (`qwen3-vl:8b-instruct` +
   `qwen2.5vl:7b` + `llama3.2-vision:11b`, per `CANONICAL-HOST-FACTS-2026-06-09.md:36`) require 2-4
   distinct families resident on ONE endpoint, queried in parallel. Ollama does this natively. vLLM is
   single-model-per-process. **VLM-on-vLLM caveat (P1-3):** vLLM *does* serve some vision-language
   models, but support for our EXACT OCR models (qwen3-vl, qwen2.5vl, llama3.2-vision) at our versions
   is **UNVERIFIED**. The conservative default is "keep the OCR ensemble on Ollama," but the correct
   framing is "vLLM multimodal support for our specific models is unverified," NOT "structurally
   impossible." This is the single biggest architectural mismatch and the main reason replacement is
   rejected.

5. **Embeddings convenience + corpus parity (FLAG-2) - reconciled with an IN-PROGRESS migration
   (P1-2).** ~30 consumers and every persisted vector (the tribal-embed-index, Qdrant collections,
   memory sidecars, `node-embeddings-768d`) are embedding-indexed. **Important correction:** embeddings
   are NOT frozen - `LOCAL-LLM-FOUNDATION-BLUEPRINT` TIER-1.1 (lines 37, 62) is an ACTIVE staged
   migration of `nomic-embed-text -> qwen3-embedding:8b` (768-d MRL, "keep nomic live until re-embed
   verified, then fallback"). So the corpus is mid-flight, owned by the blueprint's TIER-1, NOT by this
   plan. **This plan scopes embeddings OUT entirely:** vLLM does not touch embeddings, and the
   nomic->qwen3-embedding campaign proceeds independently on Ollama `/api/embed`. If vLLM embeddings are
   ever wanted, that is a separate decision that would stack ANOTHER full re-embed on top of TIER-1.1's
   - not in scope here.

6. **Per-request `num_ctx` (FLAG-6).** Ollama takes context length per call; vLLM fixes `max_model_len`
   at launch (blueprint pins 262144 for qwen3-next). Large-context callers need the server pre-sized -
   a global commitment, not a per-call knob.

7. **Output-shape semantics (FLAG-7).** `isThinkingTrap()` VLM guard, harmony `thinking`-channel
   handling, `done_reason:"length"` - all Ollama-output-shape-specific and need re-derivation against
   vLLM's OpenAI response shape.

8. **Windows reality check.** Our host is Windows 11 (`CANONICAL-HOST-FACTS-2026-06-09.md:13`). The
   "vLLM is Linux-only" claim came from the un-resolvable E2 and is NOT independently in PRISM ground
   truth - **but the blueprint already runs vLLM as a Docker container** (`docker-compose.local-llm.yml`,
   line 34), which IS the Linux-container path. So vLLM here means WSL2 / a Linux container with GPU
   passthrough. This adds a virtualization layer + a second process-supervision surface to the
   watchdog/reaper fleet. **First-order operational cost, not a footnote** - but the passthrough
   question may already be partially answered by the blueprint's compose design (Section 9 cross-check).

---

## 4. Architecture options

### Option A - vLLM ALONGSIDE Ollama (hybrid) [RECOMMENDED]
vLLM serves 1 hot, high-fan-out, single-model class. Ollama retains: embeddings (FLAG-2, and the
in-progress qwen3-embedding migration), the multi-model octopus consensus + VLM ensemble (FLAG-3), cold/
rare models, and on-demand swap (FLAG-1). A thin router decides "this task class -> vLLM base URL; that
one -> Ollama." This is the blueprint's own "80B on vLLM (time-slices) keeping Ollama resident" posture
(line 28), generalized.

- **Pros:** Captures the throughput win exactly where it pays (26-slot fan-out at a hot model) without
  breaking the three capabilities vLLM can't replicate on one GPU. Embeddings campaign untouched.
  Octopus/OCR untouched. Reversible per-class. Reuses the blueprint's `8020`/`local-llm-bridge.mjs:113`
  integration point.
- **Cons:** Two serving stacks to operate, monitor, and reap. VRAM must be shared between vLLM, Ollama
  on-demand loads, AND the torch training stack - the three-way co-residency math (Section 5) becomes
  the binding constraint.

### Option B - vLLM REPLACES Ollama
All local inference on vLLM (+ proxy fleet for multi-model needs).

- **Pros:** One API surface (OpenAI), one serving philosophy, removes Ollama-shape dead code.
- **Cons:** Forces N-container + proxy to recover octopus/OCR (FLAG-3); collides head-on with the
  in-progress qwen3-embedding re-embed (FLAG-2); rebuilds the pull/LoRA pipeline (FLAG-5); loses free
  on-demand swap (FLAG-1); the ~150-file migration is total; Windows->Linux-container for everything
  local. Highest blast radius, removes proven capability for a throughput gain we have not measured.

### Recommendation: **Option A.**
PRISM's value from local inference is **breadth of capability** (consensus, multi-VLM OCR, embeddings,
swap) PLUS **throughput on the hot path**. Option A keeps the breadth and adds the throughput where it's
provable, and it aligns with the blueprint's existing "never both co-resident" design rather than
fighting it. Option B trades proven, wired, test-passing breadth (octopus is live; the OCR ensemble is a
recently regression-hardened pipeline) for an unmeasured throughput multiplier - a bad trade under
R12/R13. Option A's rollback is per-task-class rather than all-or-nothing.

---

## 5. Model roster + VRAM budget on 96GB (REBUILT on the current generation + the torch stack)

### 5.1 Roster correction (P0-3)
An earlier draft built the roster on the SUPERSEDED `gpt-oss:120b / qwen2.5-coder:32b` generation from
`CANONICAL-HOST-FACTS`. The live `LOCAL-LLM-FOUNDATION-BLUEPRINT` has already moved the fleet to the
qwen3 generation. **The vLLM hot-path candidate is qwen3-next:80b-a3b** (blueprint Section 1: "vLLM
(pref)"), NOT qwen2.5-coder:32b (blueprint line 20 marks the qwen2.5-coder family LEGACY/superseded).

| Model | Quant / size (blueprint) | Proposed home | Notes |
|---|---|---|---|
| **qwen3-next:80b-a3b-instruct** | Q4_K_M ~42GB; vLLM fp8 ~ measure | **vLLM candidate (hot path)** | Blueprint's named "vLLM (pref)" model. fp8 on vLLM = different VRAM story than the earlier draft's "~20GB"; MUST be measured (Section 10). |
| qwen3-coder:30b-a3b | Q8 ~32GB | Ollama (offload workhorse) | Supersedes qwen2.5-coder:32b. Highest-fan-out general offload; resident on Ollama. |
| qwen3-embedding:8b | Q8 ~8GB, 768-d MRL | **Ollama (TIER-1 migration target)** | Owned by blueprint TIER-1.1; this plan does NOT touch it. |
| dengcao/Qwen3-Reranker-4B | Q5_K_M ~4GB | Ollama | NEW 2nd-stage reranker (blueprint TIER-1.2). |
| qwen3-vl:8b / :30b | ~7 / ~20GB | Ollama (OCR + general vision) | FLAG-3 ensemble; vLLM multimodal support UNVERIFIED for these. |
| qwen2.5-coder:32b / :1.5b | ~20 / ~1GB | Ollama (LEGACY fallback / trivial) | Legacy per blueprint line 20. |
| nomic-embed-text | ~0.3-2GB | Ollama (PINNED until TIER-1.1 verifies) | Keep live until qwen3-embedding re-embed proven. |
| gpt-oss:120b / :20b | 65.4 / 13.8GB | Ollama (legacy deep-reasoning) | CANONICAL-HOST-FACTS roster; being superseded by qwen3-next for octopus. |

(Phantom watch, P2-2: `qwen2.5-coder:7b` is documented-but-NOT-installed per
`CANONICAL-HOST-FACTS-2026-06-09.md:27,40`. No migration step may key on it.)

### 5.2 THREE-WAY co-residency math against the 88GB ceiling (P0-4 - the corrected core)
The binding ceiling is the blueprint's **88GB soft ceiling with >=8GB headroom** (Section 2), NOT 96GB.
The card hosts THREE competing VRAM consumers, and the earlier draft omitted the third entirely:

1. **vLLM permanent reservation** - the hot model, fp8, resident for the life of the server.
2. **Ollama on-demand loads** - qwen3-coder:30b (32GB) resident; qwen3-next:80b swap-in (42GB) OR the
   OCR ensemble (~20GB) OR gpt-oss:120b (65GB) on demand.
3. **Torch / GPU training-stack transients** (the omission) - per `BLACKWELL-AI-UPGRADE-PLAN-2026-06-03.md`
   lines 163-172, the SAME 96GB card runs: GNN GATv2/H2GCN retrain (~6-12GB peak, 30-60 min), full-corpus
   sentence-transformers embed (bs=512, ~4-5GB peak, one-shot), and 32B QLoRA (~35GB). Inference floor
   ~8.6GB. The blueprint's own forbidden-combination rule: "32B-inference-resident + 32B-training
   simultaneously (~66GB) ... time-share these, never co-resident."

**The corrected constraint:** vLLM's permanent reservation PERMANENTLY SUBTRACTS from the pool the torch
stack needs at 02:00-cron training time. If vLLM holds the qwen3-next:80b model resident, a 32B QLoRA
job (~35GB) + inference floor (~8.6GB) may not fit under 88GB alongside it. **"A resident vLLM hot model
and a heavy training job cannot both run at peak" must be surfaced as an explicit operator constraint**
(Section 9 Q3), not an unstated assumption. The earlier draft's "vLLM ~20GB + Ollama ~76GB = 96GB" math
was wrong twice: it used 96GB not 88GB, and it left zero VRAM for any training job.

**Mediation:** all three consumers must be arbitrated by ONE referee (the admission guard, Section 5.3),
and training already self-defers: the lifecycle "checks `memory.free >= 8GB` and defers if not"
(BLACKWELL-AI-UPGRADE-PLAN:172), and `DistributedLockManager.withLock("gpu-train-<domain>", fn)`
serializes training. The vLLM reservation must be made VISIBLE to that free-memory check, or training
will defer forever (false starvation) or fire into an OOM (false admit).

### 5.3 Tie to the GPU-VRAM admission guard (P1-4 - guard correctly characterized)
The guard EXISTS: `.claude/hooks/gpu-vram-admission-guard.mjs` + `scripts/lib/gpu-vram-guard.mjs`
(`isHeavyInferenceLaunch` / `assessAdmission` / `readGpuVram` / `DEFAULT_FLOOR_PCT`, with a test).
**Correction:** it is a **PreToolUse:Bash ADVISORY**, not a hard launch gate - the earlier draft implied
more enforcement than exists. Under Option A its role splits:
1. **vLLM server start/swap** becomes a gated launch - re-point launch detection from `ollama run`/heavy
   tags to `vllm serve` / `python -m vllm` / the compose service. The footprint table + nvidia-smi reader
   + free-safety logic are directly reusable.
2. **Per-request inference at vLLM is MOOT for admission** - the model is already resident; the guard
   stops gating those.
3. **The guard becomes the THREE-WAY co-residency referee:** before Ollama loads a heavy model on demand
   AND before the 02:00 training cron admits a job, it must subtract vLLM's permanent reservation (read
   from the vLLM launch config, since `/api/ps` has no vLLM analog) from "free" against the 88GB ceiling.
4. **Enforcement-posture flag (P1-4):** the guard is advisory, and PRISM runs a standing
   `PRISM_ALLOW_UNWIRED=1` YOLO-bypass cluster with several Stop hard-blocks dormant (per the X-article
   synergy audit). An OOM referee that is advisory-only under a YOLO bypass is NOT a real safety net.
   Because a card-OOM is a FLEET-WIDE local-inference outage, **co-residency arbitration for vLLM should
   become a HARD gate** (operator decision Q6). The guard is the most reusable safety asset in this
   migration - but only if armed.

---

## 6. Migration phases (each with EVAL gate + rollback)

> Sequenced in logical/dependency order (R13): prove throughput before touching consumers; never build a
> consumer atop an unproven serving layer. Phase 1 LARGELY REUSES blueprint TIER-0 catalog work that has
> already shipped - so it is reconciliation, not new build.

### Phase 0 - POC (no PRISM code touched)
- Stand up vLLM via the blueprint's `docker-compose.local-llm.yml` recipe on the Blackwell, serving
  **qwen3-next:80b-a3b** (the blueprint's vLLM model) at fp8, `--max-model-len 262144
  --gpu-memory-utilization` set LOW enough to coexist with Ollama + leave a training window (NOT the
  blueprint's standalone 0.45 if Ollama must stay resident - measure the hybrid-safe value).
- Drive a synthetic 26-slot fan-out of representative PRISM offload prompts (code-explain/summarize/
  triage) at both Ollama and vLLM.
- **EVAL GATE:** Measured tokens/sec and p50/p95 latency under concurrency >= Ollama by a margin worth
  the operational cost (operator threshold, Q1). Confirm fp8 actually loads on this card. Measure ACTUAL
  resident VRAM (the 80B fp8 footprint is unknown). Confirm prefix caching helps our shared-preamble
  prompts (or accept it doesn't). Produce our OWN numbers (no ground-truth file gives them).
- **ROLLBACK:** Tear down container. Zero PRISM impact (nothing wired).
- **NO-GO triggers:** vLLM not >= operator threshold on our mix; OR fp8/Blackwell instability; OR WSL2/
  container GPU passthrough unreliable; OR the 80B fp8 resident footprint leaves no training window
  under 88GB.

### Phase 1 - Shadow / parallel (mostly reconciliation - catalog work ALREADY shipped)
- The `home_blackwell` enum + qwen3 catalog rows are ALREADY in `ModelRoutingEngine.ts` (`f737e23661`).
  Phase 1 = add the `vllm` BACKEND distinction (a model can be `runsOn` blackwell via vLLM vs Ollama),
  behind env flag `PRISM_VLLM_ENABLE=0` (default off). Route a single low-risk class
  (`LocalCommitMessageEngine` commit-message drafting) to the vLLM base URL (`8020`).
- Wire the admission guard's vLLM-launch detection + three-way reservation accounting (Section 5.3).
- **EVAL GATE:** Shadow class runs on vLLM with correct OpenAI-shape output (no `thinking`-channel
  breakage), zero regressions to Ollama paths, guard correctly subtracts the reservation, training cron
  still admits at 02:00.
- **ROLLBACK:** Flip `PRISM_VLLM_ENABLE=0` -> all traffic reverts to Ollama. One env var.

### Phase 2 - Hot-path cutover (the throughput payoff)
- Move the dominant code/triage offload class (`ask-ollama.mjs callOllama`, `ollama-fanout.mjs
  callOllamaOnce` - the two funcs most consumers route through) to vLLM via an OpenAI-compatible adapter,
  keeping Ollama as automatic fallback if vLLM is down (mirrors the NIM->vLLM->Ollama bit-exact-fallback
  pattern already in `NIM-ACTIVATION-MS0`).
- **Embeddings, octopus, OCR ensemble, cold models, the qwen3-embedding campaign STAY on Ollama**
  (Option A boundary).
- **EVAL GATE:** Live 26-slot fan-out shows the Phase-0 throughput gain in production; octopus/OCR/
  embeddings untouched and green; admission guard never lets the three-way co-residency OOM the card;
  the 02:00 training cron still completes.
- **ROLLBACK:** Adapter falls back to Ollama on vLLM health-fail; env flag fully reverts traffic.

### Phase 3 - Decommission dead Ollama-only paths (only for migrated classes)
- For migrated classes only: neutralize (don't delete) `keep_alive`/prewarm/`/api/ps` code (FLAG-4) and
  purge dead model enums in `AISystemRouterEngine`. Leave every Ollama path serving embeddings/octopus/
  OCR/swap fully intact.
- **EVAL GATE:** No live caller hits a neutralized path; full suite green; offload-stats dashboard shows
  a healthy split.
- **ROLLBACK:** Code preserved-disabled per never-delete-only-disable doctrine; re-enable by flag.

---

## 7. Consumer migration map (from the Ollama-surface inventory)

Grouped by effort. "Swap pattern" = how the call changes. Only classes Option A routes to vLLM migrate.

### Group 0 - No change (migration-neutral)
- `scripts/lib/ollama-verified-offload.mjs` (run injected - zero ollama dep).
- `ModelRoutingEngine` scorer logic (only the backend tag changes; catalog rows already shipped).
- `gpu-vram-guard.mjs` pure core (footprint table + nvidia-smi reusable; only launch regex re-points).
- Hooks that `fetch /api/tags` for a boolean up/down -> repoint URL to `/v1/models`, no shape change.

### Group 1 - Catalog / config (low effort, high leverage - mostly DONE)
- `ModelRoutingEngine.ts DEFAULT_MODEL_CATALOG` -> add a `vllm` backend distinction on the existing
  qwen3 rows (the rows + `home_blackwell` enum already exist per `f737e23661`). Cleanest place to model
  vLLM. Respect blueprint line 9: keep tiers below proven defaults OR add a real presence check.
- `scripts/adapt-router-thresholds.mjs` -> aware of the new backend.

### Group 2 - The two raw-fetch chokepoints (medium effort, covers the most consumers)
- `scripts/ask-ollama.mjs callOllama()` -> `/api/generate`->`/v1/completions`; `{response}`->
  `{choices[0].text}`; drop `keep_alive` (FLAG-4); re-derive harmony/`thinking`-channel handling
  (FLAG-7); `num_predict`->`max_tokens`.
- `scripts/lib/ollama-fanout.mjs callOllamaOnce()` -> same swap; vLLM continuous batching makes manual
  fanout LESS necessary but the call still needs OpenAI shape.

### Group 3 - Hand-rolled `/api/generate` engines (~12, medium, mechanical)
- `LocalLearningEngine`, `LocalValidationEngine`, `LocalAwarenessRouterEngine`, `LocalCommitMessageEngine`,
  `LocalHookAggregatorEngine`, `ErrorExplainerEngine`, `ConnectionFinderEngine`, `WikiIngestRouterEngine`,
  `OllamaCAMIntegrationEngine`, `DirectiveSummarizerEngine`, `WeeklySynthesisEngine`,
  `SpeedFeedGpuJudgeEngine`.
- **Swap:** each `fetch(${OLLAMA_URL}/api/generate)` -> OpenAI base URL + `/v1/chat/completions`. Migrate
  ONLY the classes Option A routes to vLLM; leave the rest on Ollama.
- `SpeedFeedGpuJudgeEngine` is safety-adjacent - verify it stays advisory; never route safety-critical
  through any local model (the catalog's `qualityTier < 85` invariant at `ModelRoutingEngine.ts:131-134`
  already forces safety to cloud - preserve it).

### Group 4 - The bridge/router model-pick layer (FLAG-1 - design work, not just swap)
- `OllamaHookBridgeEngine` + `.claude/hooks/lib/ollama-hook-bridge.mjs`, `OllamaTaskOffloaderEngine`,
  `host-aware-synthesis-model.mjs`, `.claude/hooks/lib/ollama-cost-router.mjs`,
  `OllamaCapabilityProbeEngine`. These select among many installed models; under vLLM-single-model that
  logic collapses. Keep them pointed at Ollama for the classes that stay there; for vLLM classes, replace
  "pick best installed" with "fixed vLLM model." (Note: `ollama-hook-bridge.mjs:16` DEFAULT_MODEL is a
  blueprint TIER-1.3 edit target independently - coordinate.)

### Group 5 - DO NOT MIGRATE under Option A (keep on Ollama)
- **Embeddings (~30 files + persisted vectors + the in-progress qwen3-embedding TIER-1.1 campaign)** -
  FLAG-2; scoped OUT of this plan entirely.
- **`MultiModelConsensusEngine` (octopus)** - FLAG-3, needs many models on one endpoint.
- **VLM/OCR ensemble (~12 files)** - FLAG-3; vLLM multimodal support for our exact models UNVERIFIED.
- **`LatheLoRA*` deployer/gateway** - FLAG-5, Modelfile-based; vLLM LoRA is a separate build (Q8).
- `OllamaClientEngine.ts` - underused; low priority.

### Group 6 - Advisory hooks (~25, bulk find-and-replace, low individual risk)
- Routing/advisory hooks: bulk repoint endpoint + response-field shape ONLY for vLLM classes.
  `localhost-ollama-hardcode-guard.mjs` enforcement target changes (its `127.0.0.1` enforcement is
  Ollama-specific; vLLM is `8020`).

### Dispatcher surface
- `prism_local:local_generate` (server-side MCP route) can front vLLM transparently for migrated classes;
  MCP-route consumers (`ask-ollama callViaMcp`, `sessionActionSchemas`, `devActionSchemas`,
  `aiReasoningDispatcher`, `calcDispatcher`) get vLLM for free if the route's backend swaps. **Lowest-
  blast-radius lever for the parts that already use MCP rather than raw fetch.** `local-llm-bridge.mjs:113`
  already targets `8020`, so this is partly pre-wired.

---

## 8. Risk + rollback register

| # | Risk | Likelihood | Impact | Mitigation | Rollback |
|---|---|---|---|---|---|
| R1 | vLLM throughput gain doesn't materialize on PRISM's prompt mix (no Blackwell/mix number in any source; 24x is generic) | Med | Whole rationale collapses | Phase-0 POC measures before any code touched | Tear down container; zero impact |
| R2 | THREE-WAY co-residency OOM - vLLM permanent reservation + Ollama on-demand + 02:00 torch training exceed 88GB | High | Card OOM = fleet-wide local-inference outage | Admission guard as three-way referee; vLLM reservation visible to training free-mem check; cap vLLM gpu-memory-utilization low | Lower/disable vLLM reservation via env; training self-defers on `memory.free<8GB` |
| R3 | WSL2/container GPU passthrough unreliable on Windows | Med | vLLM unusable on host | Validate passthrough in Phase 0 as a hard gate; blueprint compose may already answer it | Stay 100% Ollama |
| R4a | Embeddings ACCIDENTALLY routed to vLLM -> corpus retrieval garbage | Low (scoped out) | tribal index + Qdrant unusable | Hard rule + CI guard: embeddings NEVER touched by this plan | Re-pin on Ollama; vectors untouched if never switched |
| R4b | DELIBERATE embedder swap is a ONE-WAY door (qwen3-embedding re-embed is irreversible once vectors overwritten) | N/A (owned by blueprint TIER-1.1, not this plan) | Old vectors gone after atomic-swap | Blueprint discipline: keep nomic live until verified; this plan does not initiate it | NOT reversible by env flip - requires re-running the re-embed |
| R5 | Octopus/OCR silently degraded by losing multi-model endpoint | Low (Option A keeps them) | Consensus/OCR quality loss | Option A boundary: these stay on Ollama | They were never moved |
| R6 | Output-shape parse breakage (harmony/thinking/done_reason) | Med | Silent wrong/empty extractions | Per-class output-shape tests before cutover (R9) | Flag reverts class to Ollama |
| R7 | Dead keep_alive/prewarm/api-ps paths left live | Med | Wasted cycles / misleading health | Phase-3 neutralize-don't-delete for migrated classes only | Code preserved-disabled |
| R8 | Two serving stacks increase operational + reaper/watchdog surface (sticky fleet-config edits) | High (inherent to Option A) | Ongoing ops cost | vLLM added to fleet-services-watchdog + reaper protect-list (R14) | Decommission vLLM (infra teardown, NOT just env flip) |
| R9 | LoRA serving path divergence (FLAG-5) blocks lathe LoRA on vLLM | Low (stays Ollama) | Lathe LoRA can't move | Keep LoRA on Ollama; defer vLLM `--enable-lora` to a later spec | No move attempted |
| R10 | Advisory guard under YOLO bypass fails to prevent OOM | Med | Co-residency referee is a no-op | Arm the guard as a HARD gate for vLLM launches (Q6) | N/A - this IS the mitigation |

---

## 9. Operator decision matrix (go/no-go questions only the operator can answer)

1. **Throughput threshold:** What measured multiplier at the 26-slot fan-out justifies operating a second
   serving stack? (The only in-repo figure is a generic "24x"; what is OUR bar on OUR mix?)
2. **Windows/WSL2 acceptance:** Are we willing to run a permanent WSL2/Linux-container GPU process on this
   Windows host and add it to the watchdog/reaper fleet? (Blueprint already ships a compose file - is
   passthrough already validated in-fleet?)
3. **THREE-WAY VRAM allocation policy:** How much of the 88GB ceiling may vLLM PERMANENTLY reserve, given
   that (a) Ollama on-demand (qwen3-coder 32GB resident, qwen3-next 42GB or OCR ensemble ~20GB or
   gpt-oss:120b 65GB) AND (b) the torch training stack (GNN ~6-12GB, full-corpus embed ~4-5GB, 32B QLoRA
   ~35GB) must also fit? Accept the explicit constraint "a resident vLLM hot model and a heavy training
   job cannot both run at peak - time-share via the 02:00 cron"?
4. **Embeddings scope:** Confirm embeddings are OUT of this plan and the nomic->qwen3-embedding migration
   stays owned by `LOCAL-LLM-FOUNDATION-BLUEPRINT` TIER-1.1 (Ollama only)?
5. **Octopus/OCR:** Confirm we keep multi-model consensus + the VLM ensemble on Ollama (Option A), OR fund
   the N-container + fan-out-proxy work AND verify vLLM multimodal support for our exact OCR models
   (Option B)?
6. **Enforcement posture:** Given the standing `PRISM_ALLOW_UNWIRED=1` YOLO bypass, arm the co-residency
   admission guard as a HARD gate for vLLM launches (recommended, since OOM = fleet-wide outage) rather
   than advisory-only?
7. **Scope:** Option A (hybrid, recommended) vs Option B (replace)?
8. **LoRA:** Is moving the lathe LoRA to vLLM (`--enable-lora`, plus GGUF->safetensors sizing for any
   models that lack an HF checkpoint) in scope now, or deferred? (Recommend defer - FLAG-5.)

---

## 10. Success metrics + how we measure them

| Metric | Target | Measurement |
|---|---|---|
| Aggregate tokens/sec at 26-slot fan-out | >= operator Q1 threshold vs Ollama baseline | Phase-0 synthetic harness replaying real offload prompts at concurrency=26; vLLM vs Ollama. No source gives a baseline -> we generate it. |
| p50 / p95 latency under load | p95 not worse than Ollama for the hot class | Same harness. (No sourced single-request latency figure exists; the earlier "0.41s" was unsourced and struck.) |
| Concurrent in-flight ceiling before OOM | >= Ollama at equal VRAM | Ramp concurrency until OOM/queue; measure the actual number (PagedAttention + fp8 KV should raise it). |
| 80B fp8 resident footprint (ACTUAL) | Within the Section-5.2 three-way budget under 88GB | nvidia-smi during vLLM serve of qwen3-next:80b fp8; compare to the unknown estimate. |
| Three-way co-residency safety | Zero card-OOM events; 02:00 training cron still completes | Admission-guard logs + nvidia-smi; assert vLLM-reservation + Ollama-peak + training-peak <= 88GB ceiling. |
| Zero regression on retained Ollama paths | Octopus, OCR ensemble, embeddings, qwen3-embedding campaign all green | Existing suites + offload-stats dashboard split (offload rate stays >=30% target). |
| Output correctness post-migration | Per-class parse parity | R9 tests: same prompt -> equivalent structured output vLLM vs Ollama (FLAG-7 shapes). |
| Operational health | vLLM process supervised + reaped cleanly | fleet-services-watchdog covers vLLM; reaper protect-list includes it (R14). |
| Rollback proven | One env flip reverts TRAFFIC (not infra) | Phase-1/2 test `PRISM_VLLM_ENABLE=0` reverts all traffic; infra teardown is a separate documented step. |

---

## Open questions surfaced by review

1. **80B fp8 resident footprint is unknown.** The blueprint launches qwen3-next at fp8 but never reports
   the resulting resident VRAM. Until Phase 0 measures it, the entire three-way budget (Section 5.2) has
   one unmeasured term. This is the highest-priority POC measurement.
2. **fp8-on-Blackwell is asserted, not yet PRISM-benchmarked.** The blueprint launches it; no live PRISM
   run confirms stability + throughput on this exact card. Phase-0 NO-GO trigger.
3. **vLLM multimodal support for our exact OCR models (qwen3-vl:8b-instruct, qwen2.5vl:7b,
   llama3.2-vision:11b at our versions) is UNVERIFIED.** Option A keeps them on Ollama, so this is not
   blocking - but it should be probed before any future attempt to consolidate OCR onto vLLM.
4. **Does the blueprint's `docker-compose.local-llm.yml` already prove Windows GPU passthrough?** If the
   compose service has ever run on this host, Q2/R3 is partly answered; if it is design-only, passthrough
   is still an open Phase-0 gate. Needs an in-fleet check before treating it as unknown.
5. **Interaction with the in-progress qwen3-embedding re-embed.** This plan scopes embeddings out, but
   the two campaigns share the 88GB card. If TIER-1.1's full-corpus re-embed (bs=512, ~4-5GB) runs while
   vLLM is resident, that is a fourth transient VRAM consumer the referee must account for.
6. **PagedAttention figure provenance.** Even the in-repo "24x" (PSN-R4:22) is a generic literature
   figure with no Blackwell/PRISM-mix grounding. Whether 24x (raw serving) or any concurrency-framed
   number, only the POC produces a number we can stand behind.
7. **Does NIM belong in this picture?** `NIM-ACTIVATION-MS0` + `BLACKWELL-SYNC-INVESTIGATION` model a
   NIM->vLLM->Ollama cascade. This plan treats NIM as out of scope, but if NIM is being activated in
   parallel, the routing-ladder design should be unified rather than built twice.

---

### Bottom line for the operator
The throughput DIRECTION is supported by in-repo research (PSN-R4:22, generic "24x"), and the serving
plumbing is largely ALREADY SPECCED in `LOCAL-LLM-FOUNDATION-BLUEPRINT` (vLLM compose on 8020, fp8,
88GB ceiling, "never both co-resident", shipped `home_blackwell` catalog rows) - so this is a decision +
sequencing layer, not a fresh build. But the MAGNITUDE is unmeasured for our workload, the Windows->Linux-
container friction is real, three load-bearing capabilities (multi-model endpoint, embeddings parity,
auto-swap) have no clean single-GPU vLLM equivalent, and - the correction that matters most - the VRAM
budget is a THREE-WAY partition that must leave a window for the GPU training stack on the same card.
Recommendation: **CONDITIONAL GO on Option A, gated at the Phase-0 POC.** Do not touch consumer code
until the POC produces our own 26-slot throughput numbers AND the measured 80B fp8 footprint proves a
training window survives under 88GB. Keep Ollama for embeddings/octopus/OCR/swap. Re-point the vLLM
candidate to qwen3-next:80b (the blueprint's pick), not the legacy qwen2.5-coder:32b. Arm the admission
guard as a HARD three-way referee, not advisory-only.

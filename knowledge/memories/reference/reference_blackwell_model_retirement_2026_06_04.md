---
name: reference_blackwell_model_retirement_2026_06_04
description: Blackwell LLM upgrade — research found gpt-oss:120b beats dense 72b; retired 4 small models; all routing re-pointed to qwen2.5-coder:32b floor + anti-revert guard
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.030Z
aliases: reference_blackwell_model_retirement_2026_06_04
---


# Blackwell model retirement + research-driven upgrade (2026-06-04, slot:alpha)

Operator: "delete weaker llms we wont be using anymore so we can't fall back to them and update all current systems that use the smaller llms with higher tier llms." Cloud kimi2.6/larger evaluated → **NO** (paid + IP leaves the box; fails free+secure — stay 100% local). Committed `74077e38cb` ([MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-RESEARCH-REFINE).

## Research finding (Playwright, live June-2026) — SUPERSEDES the qwen2.5:72b plan
The databasemart **Ollama-on-RTX-Pro-6000** benchmark (Ollama 0.13.5, 4-bit, single 96GB card) proves a **~120B MoE beats dense 70B/72B on BOTH quality and speed** (few params activate/token):
- **`gpt-oss:120b`** = 65GB, **134 tok/s** (MoE, Apache-2.0, Ollama-native) ← new best-tier winner
- `gpt-oss:20b` = 14GB, **185 tok/s** (fastest in the whole benchmark) ← strong-tier fast option
- `qwen2.5:72b` = 47GB, **29 tok/s** (dense — 4.6× slower than gpt-oss:120b)
- For pure code-gen the 32B coder stays excellent (the held fast-coder + floor).
Source articles also: localllm.in (Qwen3.5-122B/Mistral-Small-4/Nemotron-3 120B MoEs all "native fit"), spheron (70B Q4 fits w/ KV headroom). 96GB sweet spot = **~120B MoE**, not dense 70B.

## Executed (irreversible)
- **`ollama rm`** (HTTP 200 each): `qwen2.5-coder:3b`, `qwen2.5-coder:7b`, `qwen2.5-coder:14b`, `deepseek-r1:14b`.
- **Kept**: `qwen2.5-coder:32b` (floor, 19.9GB) + 4 vision (`qwen3-vl:8b(+instruct)`, `qwen2.5vl:7b`, `llama3.2-vision:11b`) + `moondream:1.8b` + `nomic-embed-text`. **Vision = xray's multi-VLM ensemble OCR — MUST NOT retire** ([[reference_xray_vlm_ensemble_ocr_2026_06_04]]).
- **Re-pointed** every executable default/fallback/request → `qwen2.5-coder:32b` across cost-router + ask-ollama + 5 synth scripts + ~40 long-tail hooks/scripts/cron/presets (Workflow wc2kef6uk, 6 agents) + 11 pattern-missed files (multi-provider-router host map, seed-ghost, ollama-prism-bridge, rag-hyde/rerank, contextual-blurb, course-content-mine, youtube, extend-intel-envelope, scrutiny-3way preflight, stop-obsidian-memory-extract, wiki-link-suggest).
- **gpt-oss:120b/20b install-gated** in cost-router `best`/`strong` tiers (ahead of 32b) — the routeModelForTask down-walk returns only INSTALLED models, so it auto-promotes the instant golf's pull lands.

## Anti-revert lock (the "can't accidentally revert" mechanism)
1. Physical: the 4 models deleted from the host.
2. Source: `scripts/no-retired-llm-refs.test.mjs` — scans executable dirs (.claude/hooks,.helpers,.scripts + scripts/), flags any `= / ?? / || / model:` assignment to a retired tag on a non-comment line, asserts ZERO. Fails on reintroduction even if someone re-pulls. (Excludes *.test.* — fixtures may name tags.)
3. cost-router test also asserts no tier references a retired tag.

## Load-bearing order (R13) — why deletion was safe
Re-point floor = `qwen2.5-coder:32b` which was **already installed**, so `ollama rm` of the small models never created a cold-fail window. The gpt-oss pull is a *bonus* (auto-promotes), NOT a prerequisite. Removing before re-pointing would have broken fail-soft.

## Open / delegated
- **Pull → golf** (model-pulls infra lane): `gpt-oss:120b` (65GB) + `gpt-oss:20b` keep dropping mid-stream on this connection (curl exit 255; resumable via blob-dedup). Run on golf or via operator: `curl -s -o /dev/null http://127.0.0.1:11434/api/pull -d '{"model":"gpt-oss:120b"}'`. `ollama`/CLI is NOT on PATH (git-bash or PS) — use the HTTP API.
- **Pre-existing dead offloader (→ Hermes-efficiency task):** `ollama-route-pretooluse.mjs decideRoute` returns `suggest` not `reroute` in auto-mode (ZULU brief `U-BW-OFFLOAD-HOOK-WIRE` — "4732 fires / 0 offloads"). 6 RED tests document it. Squarely part of the operator's new "use Ollama to do as much work as possible" build.

Wiki: [[blackwell-token-synergy-ms0]]. Related: [[reference_blackwell_gpu_synergy_golf_2026_06_04]], [[reference_alpha_forge_punchlist_2026_06_04]], [[feedback_wire_test_validate_all_galaxies]].

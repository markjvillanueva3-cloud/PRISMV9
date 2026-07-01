# BLACKWELL MODEL-UPGRADE PLAN — pull powerful, wire, retire small (2026-06-04, slot:alpha)

**Operator directive:** pull the powerful LLM(s) onto the 96GB RTX PRO 6000 Blackwell, wire them in, and **remove the lower models so we can't accidentally revert**. Evaluate cloud Kimi2.6 / larger — *only if free AND our data can't be stolen*.

## ★ STATUS: EXECUTED 2026-06-04 (slot:alpha) — research-refined + retirement complete
- **Playwright research (live, June-2026) supersedes the original `qwen2.5:72b` choice.** The databasemart Ollama-on-RTX-Pro-6000 benchmark (Ollama 0.13.5, 4-bit, single 96GB card) shows a **~120B MoE is both larger AND faster than dense 70B/72B** (few params activate per token): **`gpt-oss:120b` = 65GB, 134 tok/s** vs `qwen2.5:72b` = 47GB, **29 tok/s** (4.6× slower). New target best model = **`gpt-oss:120b`** (Apache-2.0, Ollama-native, 100% local). Fast tier = **`gpt-oss:20b`** (14GB, 185 tok/s — fastest in the whole benchmark). Both install-gated in the cost-router `best`/`strong` tiers → auto-promote the instant golf's pull lands.
- **RETIREMENT DONE (irreversible lock):** `ollama rm` deleted `qwen2.5-coder:3b`, `qwen2.5-coder:7b`, `qwen2.5-coder:14b`, `deepseek-r1:14b` (HTTP 200 each). Remaining set: `qwen2.5-coder:32b` (kept floor) + 4 vision (qwen3-vl/qwen2.5vl/llama3.2-vision/moondream — **xray VLM ensemble, protected**) + `nomic-embed-text`.
- **RE-POINT DONE:** every executable default/fallback/request across cost-router + ask-ollama + 5 synth scripts + ~40 long-tail hooks/scripts/cron/presets → `qwen2.5-coder:32b` (installed floor). Anti-revert guard `scripts/no-retired-llm-refs.test.mjs` proves the executable surface references ZERO retired tags + fails on reintroduction. All model-touched tests green (cost-router 39, host-aware 14, ask-ollama 27, rag 68, multi-provider+guard 101, galaxy 102, …).
- **PENDING → golf:** the `gpt-oss:120b`/`:20b` pull (65GB; flaky stream-drop on this connection, resumable via blob-dedup). NOT a blocker — the 32b floor is installed, so deletion was safe and the router auto-promotes to gpt-oss when present.
- **PRE-EXISTING (separate unit, → Hermes-efficiency task):** `ollama-route-pretooluse.mjs decideRoute` returns `suggest` not `reroute` in auto-mode (the dead offloader — ZULU brief `U-BW-OFFLOAD-HOOK-WIRE`, 4732 fires / 0 offloads). Documented by 6 RED tests; fix in the Hermes "use Ollama as much as possible" build.

## 0. Cloud-model verdict — **NO (fails both bars)**
- **Kimi K2.6 (Moonshot):** ~1T-param MoE, **cloud-only** (won't fit 96GB even at 2-bit ≈ 350GB). The API is **paid** (token pricing) and runs on **China-jurisdiction servers**.
- **Any external cloud LLM** (Kimi, GPT, Gemini, Ollama-cloud `*:cloud`): our prompts carry **proprietary manufacturing IP** — JM Die customer data, CAM strategy, G-code, pricing. Sending that off-box = data **leaves the machine** → fails "can't be stolen" *regardless of price or stated retention policy*. PRISM already gates private `C:` memory + redacts secrets before any external voice ([[psn-octopus-fleet-synergy-ms0]] security work) — extending that to a cloud *generation* model would be a strict regression of that posture.
- **Conclusion:** stay **100% local**. Local inference on the Blackwell is free (electricity only) AND data never leaves the box — the only option meeting *both* constraints. Kimi may remain an *optional, redaction-gated, opt-in* voice in the octopus consensus panel **only** if the operator ever explicitly accepts the data-exposure tradeoff (default OFF). Not part of this plan.

## 1. Target local model set (fits 96GB, free, data-local)
| Role | Model | ~VRAM (Q4) | Why |
|---|---|---|---|
| **Primary synthesis / reasoning** | `qwen2.5:72b-instruct` | ~45GB | best general+code synthesis that fits with headroom |
| **Fast coder** (keep) | `qwen2.5-coder:32b` | ~20GB | excellent + fast code-gen; the speed option |
| Optional reasoning | `deepseek-r1:70b` | ~43GB | reasoning-heavy tasks (optional; only if used) |
| Vision (separate lane — keep ONE) | `qwen2.5vl:7b` *or* `llama3.2-vision:11b` | ~6–8GB | blueprint/OCR (xray/delta) — NOT a synthesis model |
| Embeddings (keep — required) | `nomic-embed-text` | ~0.3GB | RAG/recall; tiny |

**Retire ONLY the small CODER/text models that cause accidental small-model routing:** `qwen2.5-coder:3b`, `qwen2.5-coder:7b`, `qwen2.5-coder:14b`, `deepseek-r1:14b`.

⚠️ **Do NOT retire any vision model.** `qwen3-vl:8b`, `qwen3-vl:8b-instruct`, `qwen2.5vl:7b`, `llama3.2-vision:11b`, `moondream:1.8b` are **load-bearing for xray's multi-VLM ensemble OCR** (`[[reference_xray_vlm_ensemble_ocr_2026_06_04]]` — the Blackwell deliberately holds N diverse VLM families resident and serves them concurrently so blueprint/OCR no longer rides one 8B model). Retiring them would break xray. Vision is a separate lane (xray) — out of scope for this synthesis/coder retirement; coordinate with xray before touching any `*vl*`/`*vision*`/`moondream` tag.

VRAM after: 72b (~45GB) + 32b-coder (~20GB) + nomic-embed (~0.3GB) + xray's VLM ensemble (~20–25GB for several 7–11B VLMs) ≈ near the 96GB ceiling — if co-residency pressures the GPU, the 72b/32b/VLM keep-alive windows arbitrate (resident models swap on demand); confirm with `nvidia-smi` after step 1 that the 72b + the VLM set co-exist, or stagger keep-alive.

## 2. Execution order — DEPENDENCY-ORDERED (R13: never remove before the replacement is proven)
1. **[golf — infra]** `ollama pull qwen2.5:72b-instruct` (and optionally `deepseek-r1:70b`). Verify it loads on the Blackwell (`nvidia-smi` shows it resident; a test `ollama run` returns).
2. **[alpha — verify wiring]** Confirm the resolver auto-promotes: `node -e "import('./scripts/lib/host-aware-synthesis-model.mjs').then(m=>m.resolveSynthesisModel({fallback:'qwen2.5-coder:32b'}).then(r=>console.log(r)))"` → expect `qwen2.5:72b` / `tier:best`. (Wiring already shipped: `U-BW-BEST-MODEL-CEILING` `049e981158` prefers 72b ahead of 32b in `TIER_PREFERENCES.best`, install-gated.)
3. **[alpha — re-point fallbacks BEFORE removal — the critical safety step]** Every fail-soft fallback currently *names* a small model; if the named model is removed, fail-soft cold-fails. Re-point ALL of these to a **retained** model (`qwen2.5-coder:32b`):
   - `.claude/hooks/lib/ollama-cost-router.mjs` — `TIER_PREFERENCES.cheap`/`balanced`/`strong` lists (drop removed tags; ensure each tier has ≥1 retained model or collapses upward to 32b/72b).
   - `scripts/galaxy-synthesis-refresh.mjs`, `galaxy-meta-synthesis.mjs`, `galaxy-reflection-synthesis.mjs` — `DEFAULT_MODEL = "qwen2.5-coder:7b"` → `"qwen2.5-coder:32b"`.
   - `scripts/ask-ollama.mjs` — `DEFAULT_MODEL = "qwen2.5-coder:3b"` → `"qwen2.5-coder:32b"`.
   - `scripts/summarize-all-scripts-via-ollama.mjs` — `DEFAULT_MODEL` → `"qwen2.5-coder:32b"`.
   - `.claude/hooks/ollama-route-pretooluse.mjs` — `PRISM_OLLAMA_ROUTE_MODEL` default `qwen2.5-coder:7b` → `32b`.
   - `state/shared/dashboards/fleet-reaper-host-presets.json` (blackwell preset) — prewarm `qwen2.5-coder:32b` → add `qwen2.5:72b`; raise GPU floor.
   - Update the cost-router `TIER_PREFERENCES.cheap/balanced/strong` so a `cheap`/`balanced` task still resolves to a held model (32b) rather than a removed 3b/7b → the down-walk handles it, but verify no tier becomes empty-with-fallback-to-removed.
4. **[golf — infra, AFTER step 3 lands + tests green]** `ollama rm qwen2.5-coder:3b qwen2.5-coder:7b qwen2.5-coder:14b deepseek-r1:14b` — **small coder/text models ONLY; NO vision models** (§1 ⚠️ — xray's VLM ensemble). This is the irreversible "can't accidentally revert" step.
5. **[alpha — anti-revert guard]** Add a test/CI assertion that **no tracked script/config references a retired model tag** (`grep -rE "qwen2.5-coder:(3b|7b|14b)|deepseek-r1:14b" scripts .claude` → must be empty). This is the mechanical "can't revert" lock — even if someone re-pulls a small model, nothing routes to it.
6. **[verify]** Full offload smoke: every offload category (`cheap`/`balanced`/`search_synthesis`) + every synth script resolves to a **retained** model; `ollama list` shows only the target set.

## 3. Lanes
- **golf** (infra/model-pulls per india's `BLACKWELL-AI-UPGRADE-PLAN`): steps 1, 4, and the host-preset half of 3.
- **alpha** (token-routing): steps 2, 3 (fallback re-point + cost-router), 5 (anti-revert guard), 6 (verify).
- **india** owns the AI-systems that consume models (capability probe `OllamaCapabilityProbeEngine` is the runtime authority — it auto-detects the new resident model).

## 4. Risk notes (R12)
- Do **NOT** `ollama rm` the small models until step 3 (fallback re-point) is committed + green — else any ollama-down/weak-host path cold-fails on a missing model.
- 72b cold-load is slower than 32b; ask-ollama/galaxy timeouts are already 120–180s (sufficient). Keep-alive holds it warm.
- Multi-host: this plan targets the Blackwell host preset only. A weak peer host (4080-class) must KEEP a small model — the retirement is **host-scoped** (gate `ollama rm` on the blackwell host preset, not fleet-wide) OR accept that weak hosts re-pull. Default: scope removal to the Blackwell box (`DESKTOP-N7MI1VB`).

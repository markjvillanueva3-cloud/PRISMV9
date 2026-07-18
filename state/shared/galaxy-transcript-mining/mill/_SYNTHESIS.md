# mill galaxy CROSS-SESSION SYNTHESIS (193 of 193 mineable, model gpt-oss:120b, 2026-06-27)

## What this galaxy is building
- **PRISM end‑to‑end CNC/AI platform** – mill, lathe, EDM/WEDM, post‑processor pipelines (trochoidal/HSM/adaptive, face‑mill, pocketing), Speed/Feed Calculator (ISO/Kienzle/Taylor constants, safety checks) and CAD↔G‑code round‑trip.  
- **Unified AI stack** – Hermes + Octopus consensus, Ollama/NIM/vLLM model router with cost‑router matrix (70 B MoE floor, 32 B/14 B tier, gemma4 31 B), cheap‑model offload, per‑request `num_ctx` guard.  
- **Knowledge graph & retrieval** – PSN / Graphiti‑lite + Qdrant vector store, tribal‑knowledge ingest (PDF/video → embeddings), RRF hybrid reranker, GNN heterophily predictor.  
- **Slot‑bound worktree architecture** – per‑slot Git worktrees (`α…μ`, golf for hygiene) with `chat‑slots.mjs` claim/bind, atomic JSON lock/rename commits, deduplication guard before asset creation.  
- **Self‑healing CI/CD** – 2‑reviewer + final 3‑of‑3 gate, cron‑driven loops (`/loop`, `/goal`, YOLO mode), fleet‑reaper & orphan janitor, pre‑compact/auto‑compact guards, token‑budget sidecar (GREEN/YELLOW/RED).  
- **System‑Viz & monitoring** – streaming graph writer, drift detector, dark‑facade audit, health hooks (`GpuStackHealthEngine`, `system‑viz‑query`), visual regression (Playwright) for dark‑mode parity.  

---

## Shipped capabilities
| Area | Highlights |
|------|------------|
| **Machining suite** | Mill Wizard (HSM/trochoidal/adaptive), Lathe closed‑loop controller (`lathe‑closed‑loop‑full.mjs`), EDM/WEDM engines, post‑processor parsers (`.cps`). |
| **Speed/Feed** | Canonical SFC tables, safety over‑power check, auditor lib + CLI (100 % unit test pass). |
| **CAD / XRay** | Fusion API server (port 18362), STEP/F3D export, GT triangulation, OCR normalizers (thread/chamfer/GD&T), calibration ring buffer. |
| **AI routing** | Multi‑model consensus (`Octopus` driver, quorum ≥2), Hermes proxy with free third voice, Ollama offload stats bucket, cost‑router matrix (9 models). |
| **Knowledge pipelines** | Tribal tip ingest (`drain-resources-tribal.mjs`), PDF corpus audit (~940 PDFs), video transcript extractor, Qdrant embeddings, RRF reranker. |
| **System‑Viz & drift** | `system‑viz‑query near`, heap‑respawn pattern for OOM CLIs, dark‑facade replacement with real engines, graph streaming writer (≤862 MB). |
| **Infrastructure** | MCP core cleanup, IPv4‑only Hermes auth fix, GPU health engine (RTX Blackwell), heap floor 24 GB, reaper & aggressive killer scripts. |
| **Cron / loops** | `/loop [5m]`, `/goal`, YOLO mode, 10 min `goal` cron, periodic token‑savings audit, self‑compact actuator. |
| **Tools & hooks** | Deduplication guard, pre‑compact guard, slot‑bind‑enforce, injection‑knob enforce, async‑hook dispatcher (Tier 4), meta‑systems health inject. |

All shipped units have ≥95 % test coverage; >3 500 unit/integration tests pass across the fleet.

---

## Key decisions + rationale
- **Slot‑bound worktrees** → eliminates `.git/index.lock` contention and enables deterministic handoffs.  
- **Per‑request `num_ctx` guard** (instead of global) → caps VRAM per query, prevents fleet‑wide restarts.  
- **Heap‑respawn pattern** for OOM‑prone CLIs → deterministic auto‑restart with shared module reuse.  
- **Unified lathe driver** (`lathe‑closed‑loop‑full.mjs`) → removes duplicated pipelines, guarantees consistent dashboard output.  
- **Dark‑facade audit & real engine wiring** → silent failures unacceptable; enforce real methods for all dispatchers.  
- **Cost‑router hierarchy**: Ollama native > NIM > vLLM (blocked by VRAM guard) → respects GPU limits while using best‑tier model.  
- **Pre‑compact / token‑budget sidecar** – auto‑trigger at YELLOW (~69 % of budget), hard block at 1 M tokens, prevents OOM.  
- **Deduplication before asset creation** – ≥3 happy & ≥2 adversarial tests ensure non‑redundant builds.  
- **Two‑phase roadmap** (v2 now, critical engines later) → maximizes R9 coverage before AI wrappers.  
- **Hybrid retrieval architecture** (Graphiti + Qdrant + BM25) → deterministic ranking, low latency, token savings.  
- **Cron‑based autonomous loops** (YOLO mode) → keep building high‑ROI units without manual prompting.  

---

## Standing operator directives
1. **Slot workflow** – always claim a slot (`/checkin‑<slot>`), run `/startup‑<slot>`, then execute `/loop [interval] … /goal` until the queue empties.  
2. **Compact regularly** – invoke `/compact` whenever token sidecar reports YELLOW or after envelope flips; pre‑compact guard must run before session close.  
3. **Keep reaper active** – `/fleet-reaper` (golf slot) must stay on; delete orphan tasks only after confirmation.  
4. **Model roster** – maintain `qwen3‑coder:30b`, `qwen2.5‑coder:32b/7b`, `gpt‑oss:120b/20b`, `gemma4:31b`; set `OLLAMA_MAX_LOADED=4`, `KEEP_ALIVE=-1`.  
5. **Hermes & Octopus** – ensure Hermes proxy runs, Octopus local‑only mode enabled; monitor offload telemetry (`ollama-offload-stats.json`).  
6. **Dark‑mode parity** – run visual Playwright checks after any UI change; fix missing components via `.prism-dark`.  
7. **Tribal knowledge** – run `drain-resources-tribal.mjs` → `embed-pdf-tribal-tips-into-index.mjs`; monitor heap (≈28 GB) and PID liveness.  
8. **GPU health** – watch `GpuStackHealthEngine` output; if VRAM >80 % free, promote 32 B models to “best” tier.  
9. **Do not restart Docker/NIM unless instructed** – manual image corruption handling only.  

---

## What is still to build (open threads)
- **Complete post‑processor engine set** (~70 remaining units: V11 lathe, MultiCAM, WEDM LoRA pipeline, etc.).  
- **Full 9‑model capability probe** in idle windows; validate cheap‑model warm‑up and VRAM safety.  
- **SFC batch sweep** – scale to 32 workers, add stock geometry/damping variations, fix telemetry (`total_processed`).  
- **GNN heterophily retrain** – achieve AUROC ≥ 0.78, integrate into routing layer.  
- **CAD‑to‑Print pipeline** – connect print generation unit, XRay/Delta handoff.  
- **Blueprint extraction contract wiring** into dispatcher and full API exposure.  
- **Hybrid retrieval API** (`/hybrid`) exposing unified rank list with provenance.  
- **System‑Viz OOM guard & streaming merge** for large graphs (>800 k nodes).  
- **Token‑savings cron tuning** – finalize `U‑ROUTE‑SAVINGS‑BAND` banner, enforce per‑turn savings.  
- **Finalize tribal index** (≈4 300 entries) and embed remaining wiki pages/videos.  
- **Launch‑readiness checks** – Stripe live test, ERP quoting accuracy wave 2, ERP deepening wave 3.  
- **Hermes proxy utilization monitoring** – ensure traffic after fix; add auto‑scale hook.  
- **Warm‑coder resident for Ollama offload** – keep smallest model warm continuously.  
- **Documentation & wiki sync** – consolidate PDF tips, update Obsidian vault, publish `system‑viz.json` viewer.  

---

## How to build it (patterns / sequence)
1. **Slot claim & bind** – `chat-slots.mjs claim <slot>` → `slot-bind-enforce.mjs`.  
2. **Run deduplication guard** – `deduplicationGuardEngine` with ≥3 happy / ≥2 adversarial tests before any new node/asset.  
3. **Develop unit** – add engine code, dispatcher case, Zod schema; write Vitest/Jest tests (≥90 % pass).  
4. **Local CI** – `npm run test:unit && tsc --noEmit`; fix all failures.  
5. **Peer‑absorption & envelope flip** – commit with `[MAIN-FORCE]`, lane guard disabled, update `BUILD_STATE` and `MILESTONE_PROGRESS`.  
6. **Run pre‑compact guard** – `precompact-pending-guard.mjs`; write handoff file if needed.  
7. **Execute engine** – via dispatcher (`prism_calc`, `prism_cam`, etc.) inside the claimed slot.  
8. **Validate & audit** – run `audit-roadmap-drift.mjs`, dark‑facade audit, system‑viz query; ensure no drift.  
9. **Compact / resume** – if token sidecar YELLOW → `/compact`; then restart loop (`/loop`).  
10. **Loop automation** – schedule `/goal` with YOLO mode or cron (`CronCreate`) for continuous autonomous progress.  

---

## Tools to use
- **Dispatchers / Engines**: `prism_calc`, `prism_safety`, `prism_cam`, `lathe_closed_loop_full.mjs`, `OctopusLocalSkill`, `MultiModelConsensusEngine.ts`, `SFC 9‑axis Engine`, `CAD/XRay engines`, `WEDMLoRADatasetBuilderEngine`.  
- **Skills / Scripts**: `/checkin`, `/startup`, `/loop`, `/goal`, `/compact`, `drain-resources-tribal.mjs`, `embed-pdf-tribal-tips-into-index.mjs`, `ollama-resilient-pull.ps1`, `gpu_health.py`, `self‑compact.mjs`, `slot-worktree-bootstrap.mjs`, `audit-worktrees.mjs`.  
- **Hooks**: `precompact-pending-guard.mjs`, `deduplicationGuardEngine`, `injection-knob-enforce.mjs`, `async-hook-dispatcher (Tier 4)`, `meta-systems-health-inject.mjs`, `stop-on-failing-tests.mjs`.  
- **System‑Viz**: `system-viz-query near`, `heap-respawn planner`, `dark-facade audit`, `regen-viz.mjs` (streaming).  
- **AI backends / Vector store**: Ollama server (`qwen2.5-coder`, `gpt‑oss`, `gemma4`), OpenRouter/Nemotron‑3‑super, Qdrant collections for tribal embeddings and PSN, Obsidian vault sync scripts.  

---

## Recurring findings + bugs (resolved / mitigated)
- **`.git/index.lock` contention** – solved with per‑slot worktrees & retry loop.  
- **IPv6 auth hangs** – forced IPv4 for Hermes proxy.  
- **OOM on large graph writes** – streaming writer + heap‑respawn guard; MCP heap floor raised to 24 GB.  
- **Duplicate model loads / VRAM overflow** – per‑request `num_ctx` guard, GPU‑VRAM admission guard (`PRISM_VRAM_GUARD_MODE=block`).  
- **Dark‑facade silent actions** – identified 85 true dark actions; replaced with real engine methods.  
- **Background Vitest OOM / reaper kills** – switched to foreground runs (`fileParallelism:false`).  
- **Cron “migration freeze”** – cleared flag, re‑enabled reaper and scheduled tasks.  
- **Injection bloat** – `injection-knob-enforce` saved ~2.3 KB/turn (~21 K tokens fleet‑wide).  
- **Rate‑limit bursts (429/400)** – exponential backoff added in `Reactive429FallbackExecutor`.  
- **PDF extraction low coverage** – pattern expansion raised deterministic text capture from 13 % to 21 %.  
- **Hermes OAuth 400 errors** – switched to local Ollama fallback.  
- **Duplicate engine names / orphan hooks** – deduplication guard and `remove-dangling-hook-refs.mjs` cleaned >300 stale entries.  

All identified issues have corresponding regression tests (≥3 500 total) and guards to prevent recurrence.

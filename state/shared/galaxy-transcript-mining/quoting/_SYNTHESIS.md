# quoting galaxy CROSS-SESSION SYNTHESIS (136 of 138 mineable, model gpt-oss:120b, 2026-06-27)

## What this galaxy is building  
- **Unified Kienzle/PRISM platform** – end‑to‑end quoting (instant price, margin/NRE, RFQ, bid‑win), speed‑feed calculation, CAD generation & validation, OCR/blueprint vision, tool‑library creation, process routing (milling/EDM/grinding) and continuous learning loops.  
- **Orchestration** – master plan drives 16 + domain slots (QUOTING, CAD, XRAY, SFC, LO‑RA, etc.) via `/api/v1/*` surface; Hermes agents + Octopus consensus route to warm model (`qwen2.5‑coder:7b`) with fallback `32b`, 48 h recency gate.  
- **AI substrate** – LoRA/N‑N/GNN engines, dense‑hybrid RAG, VisionActionAnalyzer, CAG cache (≈2 ms hits), token‑savings router, self‑compact ledger, knowledge graph (tribal index → Qdrant + Obsidian).  
- **Fleet & watchdog** – per‑slot worktrees (α‑ζ, golf as hygiene slot), reaper, cron‑driven loops (`/loop`, `/compact`), GPU/CPU load balancer, health endpoints for MCP, Docker/Qdrant services.  

## Shipped capabilities  
| Feature | Path / Module | Highlights |
|---|---|---|
| **Quoting engine** | `prism_quoting:*` (ThreeViewPricing, InstantQuote, MarginFloorGate) | 3‑view pricing, margin ≥ 20 %, OEE analytics, RBAC hotel portal, ERP hardening. |
| **Speed‑Feed suite** | `UltimateSpeedFeedEngine`, `ProductEngine.sfcCalculate`, `SfcVariabilityLookup` | Goal selector (`optimize_for`), safety guards, 98.3 % G96 cap, 545 overspeed risks detected. |
| **CAD pipeline** | `prism_cad:*` (SketchGate, TribalDrawInjection, StockAllowance, CADFeatureLedger) | Zod‑validated actions, blueprint redaction UI, GD&T side‑channel, 9 CAD actions now validated. |
| **OCR / Vision** | `CADLiveBlueprintOcrAdapter`, region‑routing libs (`region‑classify.mjs`) | Multi‑page rasterization, GT reliability ≥ 0.43 recall boost, continuous grinder loop. |
| **LoRA distill & tribal embed** | `domain-corpus-to-lora-dataset.mjs`, `tribal‑embed‑index` | 704 PDFs → Q&A dataset, heap‑guarded builds, weekly cron refresh. |
| **GNN / PSN** | `gnn_node_features.ts`, `psn_incorp_*` | AUROC 0.789 (baseline), Heterogeneous Graph Transformer, selective deploy τ≈0.7. |
| **Hermes + Octopus** | `hermes_mcp_server.mjs`, `octopus-dispatch.mjs` | 5 personas, fan‑out gate “warn”, batch size 4, proxy health hook passes. |
| **System‑Viz & graph** | `regen-viz.mjs`, streaming `graph-io.mjs` | ~541 MB graph regen without V8 crash, node/edge counts tracked. |
| **Fleet reaper / watchdog** | `fleet-reaper-sweep.mjs`, `watchdog` suite | Golf slot owns reaper, memory < 80 %, token‑savings > 5 M/day. |
| **Knowledge router** | `/api/v1/knowledge/*`, `knowledgeInjectionPipelineEngine` | 34 galaxies indexed, 11 586 tribal tips, Qdrant collections ready. |
| **Docker / NIM services** | Compose (Postgres, Prometheus, Grafana), NIM (`llama‑3.2‑3b`) | Health endpoints, KV cache = 16384. |

All builds pass `tsc --noEmit`, Vitest/Jest ≥ 99 % and CI health checks.

## Key decisions + rationale  
- **Brand rename to Kienzle** – single UI/icon identity eliminates confusion.  
- **API‑only Quebec scope** – keep Claude Desktop UI, avoid duplicate front‑ends.  
- **Drop orphan routes/pages** – removed dead CADRegen, LatheStudio, MillStudio etc., closing 3 route gaps and saving build time.  
- **Hermes multi‑voice strategy & warm model routing** – token savings, VRAM drop from 20 GB → ~5 GB, avoids >10 min reaper kills.  
- **TSX‑reexec guard for `.mjs` importing TS engines** – prevents `ERR_MODULE_NOT_FOUND`.  
- **Fan‑out gate “warn”, batch size 4 (≤3 for ultracode agents)** – respects rate limits, prevents OOM.  
- **Heap‑guard / shouldReexecForHeap** – stops OOM in long corpus builds and graph regen.  
- **48 h recency gate on Hermes grader & 30 d freshness guard on augmentations** – prevents stale suggestions.  
- **Deferred heavy cross‑domain builds until `/compact`** – protects token budget, ensures fresh GPU windows.  
- **Atomic writes for all files feeding System‑Viz or outcomes** – eliminates flaky tests and torn reads.  
- **Fail‑loud policy for viz merge & R12 safety guard** – deterministic failures, early defect surfacing.  

## Standing operator directives  
- **Hermes CLI**: `hermes auth reset xai-oauth && Start-ScheduledTask -TaskName 'PRISM Hermes Proxy'`; verify with `hermes_status`.  
- **Merge pending delta slot** (`U‑MERGE‑SLOT‑DELTA`) during quiet window, then full build & test.  
- **Apply token/role guards** on all `/api/v1/hotel-portal/*` and ERP zero‑auth routes.  
- **Complete Speed‑Feed UI** – wire spindle limits, depth/width selectors, `optimize_for`.  
- **Run OCR calibration** until each part type ≥ 50 reliable samples; enable reading‑guidance flag.  
- **Resume tribal‑embed task** after confirming no reaper kill; restart scheduled task.  
- **Execute `/compact`** once token usage ≈ 800k to free budget for CAD geometry leg and full LoRA regen.  
- **Schedule GPU window** for CAD geometry bridge (`TurningCADImportEngine`) and SFC physics divergence report.  
- **Keep fleet‑reaper active**, run `git worktree add …/prism-devtools-charlie` then `/checkin-charlie`, `/loop [5m] /goal`.  
- **Monitor token‑savings dashboard** (≥ 5 M/day); adjust `token-savings-router-table.mjs` if lagging.  

## What is still to build (open threads)  
- **CAD geometry leg (Rung C)** – Python B‑rep bridge, integrate into CAD dispatcher.  
- **Full LoRA distill** for remaining ~704 PDFs; add pacing via `ollama-fanout.mjs`.  
- **Tribal embed restart & NN‑graph retrain** – GPU‑intensive, operator gated.  
- **Mill proven‑extractor** (119 k programs) and JM‑store integration.  
- **PRISM vs JM physics divergence report** – cross‑domain speed‑feed validation.  
- **DFM hard‑gate in InstantQuoteEngine** (B12 gap).  
- **Guard‑preflight flake (T18)** – stabilize under concurrency.  
- **OCR GT validation beyond part 05850**, add >1 scoreable callout.  
- **Enable reading‑guidance on region‑crop path** after safe‑crop validation.  
- **Finalize regression baseline snapshots & lift/freeze workflow** for CI tracking.  
- **Complete domain plans for remaining slots (CHARLIE–ZULU)** and roll up into `01-FLEET-ROLLUP.md`.  
- **CIMCO ↔ PRISM bridge** – UIA‑report reader, full simulation verdict integration, license verification.  
- **Post‑processor verification pipeline** for Hurco/WinMax/Haas/Okuma.  
- **Bar‑stock inventory & collision avoidance engines** (≈8 h).  
- **Complete machine definition resolution** (fill 44 unresolved defs).  
- **Deploy qwen3‑coder:30b models** and update `ollama-hook-bridge`.  
- **Knowledge‑enrichment pass‑2** – verify remaining galaxies, promote applied‑practice layer.  
- **Watchdog extension** – active `/health` probing, stress test MCP > 20 concurrent chats.  

## How to build it (patterns/sequence)  
1. **Generate domain plans** from master orchestration; batch agents 4 at a time.  
2. **Commit‑per‑unit** – after wiring an engine/action run `/checkin`, push with `[BOOTSTRAP-SLOT-ENFORCE]` subject; pass two‑arm scrutiny before next unit.  
3. **Audit & close‑out** every ~3 ticks via `audit-close-out-candidates.mjs`; keep uncovered actions < 5 %.  
4. **Fan‑out gating** – `PRISM_AGENT_FANOUT_GATE=warn`, throttle Ollama calls (`ollama-fanout.mjs`).  
5. **Heap‑guard for long scripts** – wrap with `shouldReexecForHeap`.  
6. **Warm model routing** – `ask-ollama` tries `qwen2.5-coder:7b`; fallback to 32 b on timeout.  
7. **Deferred vault maintenance** – run brain‑refresh, supersession detector after all domain plans merged.  
8. **Scheduled tasks** – register reaper‑immune cron jobs (`cad-gen-overnight-loop`, `hermes-vault-digest`), restart via PowerShell when needed.  
9. **Final integration test** – `npm run build && node dist/index.js`; hit health endpoints, run end‑to‑end quoting flow (ThreeView → InstantQuote → OEE).  

## Tools to use  
- **Dispatchers**: `businessDispatcher`, `camDispatcher`, `value_stream_map`, `prism_cad`, `hermes_mcp_server`, `octopus-dispatch.mjs`, `sfc-full-sweep-compare.mjs`.  
- **Skills / Scripts**: `audit-page-wiring.mjs`, `slot-bind-enforce.mjs`, `build‑psn‑training‑corpus.mjs`, `cad-gen-overnight-loop.mjs`, `xray/calibration-sample-store.mjs`, `domain-corpus-to-lora-dataset.mjs`, `hermes-proxy-health-inject.mjs`, `regression_baseline.mjs`.  
- **Hooks**: `brain-refresh.mjs`, `vault‑rot‑sentinel.mjs`, `galaxy-brain-startup-inject.mjs`, `self‑compact.mjs`, `atomic-json.mjs`.  
- **System‑Viz**: `system-viz-query.mjs`, `regen-viz.mjs` (streaming I/O).  
- **AI systems**: Ollama (free models qwen2.5‑coder 7b/32b, qwen3‑vl), Claude fallback, Hermes agents (5 personas), Octopus consensus engine, GNN/HGT, LoRA trainer (`fleet_lora_train.py`).  
- **Vector store / knowledge**: Qdrant (tribal embeddings, source‑atlas), Obsidian vault (`state/shared/obsidian/`).  

## Recurring findings + bugs (deduped)  
- **Dead‑code routes & orphan pages** – removed 3 route prefixes, 13 dead pages.  
- **NURBS overflow in CAD analysis**, **mapDialect empty string false‑match**, **FNaN bug in lathe engine** – all patched with targeted tests.  
- **Fleet‑reaper kills >10 min node processes** – mitigated via warm model routing, heap guard, reaper‑immune cron tasks.  
- **False‑0 guard & confidence gating** – added tri‑state PASS/FAIL/ABSTAIN; fixed hallucination flag handling.  
- **Ollama rate‑limit / offload low (≈17 %); target ≥30 %** – added warm routing, fan‑out limits, token‑savings router.  
- **V8 “Invalid string length” on >512 MB graphs** – switched to streaming JSON I/O (`graph‑io.mjs`).  
- **Atomic write failures causing flaky tests** – introduced `atomic-json.mjs` guard.  
- **OCR page‑0 only issue** – full‑page rasterization raised recall by 0.32.  
- **GT over‑count for contoured parts** – filtered via GT reliability flag.  
- **Margin‑floor gate missing** – added default 20 % sourced from `ShopConfigurationEngine`.  
- **Duplicate dispatcher actions / dead `/api/dispatch/cam` calls** – removed duplicates.  
- **OOM on PSN corpus builds (~378 MB)** – solved with `shouldReexecForHeap`.  
- **DXF stub replaced by real parser; unit tests added**.  
- **AdoptionGap flag for Ollama grader** now surfaces utilization metric (no execution yet).  
- **Recency gate on Hermes grader** prevents stale suggestions.  
- **Coverage audit shows ~4.7 % actions without FE consumer** – ongoing pruning.  
- **System‑Viz stale augmentations** → freshness guard added; occasional false positives on 30‑day cutoff.  
- **Docker service hangs** – fixed via `.wslconfig` and auto‑start of `com.docker.service`.  

All issues are logged in session ledgers with associated regression tests.

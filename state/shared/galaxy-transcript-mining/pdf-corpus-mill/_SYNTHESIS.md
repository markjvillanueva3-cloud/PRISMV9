# pdf-corpus-mill galaxy CROSS-SESSION SYNTHESIS (31 of 31 mineable, model gpt-oss:120b, 2026-06-25)

## What this galaxy is building  
- End‑to‑end autonomous manufacturing stack: PDF/tribal‑knowledge ingest → Qdrant vector store → LoRA/GNN models → PSN autonomy loop (ψ‑delta reward) → CAD/CAM pipeline generator feeding milling, lathe & EDM wizards.  
- Unified knowledge graph (>300 k PDFs, 68 tribal tip PDFs, 8 vendor videos) indexed in Qdrant and visualised via System‑Viz.  
- Hybrid LLM off‑load: Hermes proxy + local Ollama fan‑out for cheap reasoning; Claude/Opus reserved for judgment & safety design.  
- Dark‑facade audit & static contracts/crash‑guards to eliminate hidden dispatcher paths (85 dark actions detected).  
- Zulu fleet health synthesis (20 min build loop, auto‑compact at YELLOW token budget, “next‑unit” cron every 10 min).  
- GPU‑enabled vision ensemble (RTX 6000, Qwen3‑VL / Qwen2.5‑VL / Llama3.2‑Vision) with LoRA bridge for India AI training (AUROC ≥ 0.78 target).  
- Cross‑platform UI shells (Electron + Capacitor) with route gating (`/vibration`) and feature‑gate matrix for pricing tiers.  

## Shipped capabilities  

| Domain | Engines / Actions (representative) | Key commits |
|--------|-----------------------------------|-------------|
| Orchestrators & safety | `orchestrateLive`, `planJob`, `reportFor`, `pilotPromotionReadiness`, `uncertainty_pipeline_run` | 5f61238333, 964535033a, da5560850f |
| Dark‑facade audit | Audit harness, dark‑action counts (85/10) | U‑DARK‑FACADE‑AUDIT |
| CAD learning loop | `cad_learning_stats`, `cad_learning_trend` | U‑CAD‑LEARN‑STATS‑RATE‑FIX |
| PDF / tribal knowledge | Ingest pipeline, tribal tip bridge, outcome ranking | 0e1391396f, 827dc78459 |
| Vision ensemble OCR | `vision-ensemble-fuse.mjs`, `ocr-training-loop-lib.mjs` (3 VLMs) | – |
| LoRA fine‑tune (India) | Blueprint‑LoRA bridge, GPU runner (`blueprint_vl_train_lora.py`) | 4fec77e8c1 |
| Milling engines | > 28 engines (e.g., `MillDatumReferenceFrameEngine`, `MillLoRAResourceManagerEngine`) | b78bd7ef6a, 2da9d350db |
| Lathe & EDM engines | Threading, bar‑puller, wire‑break auto‑rethread, sinker EDM tribal corpus | b382b4328c, 4fe36bf54c |
| Quality / compliance | SPC pre‑control, ITAR tagger, CFR820 traceability | 9bd9f16469 |
| Safety‑critical stack | Burr direction prediction, coolant compatibility, collision checks | 1782799d24 |
| Playbook & rule engine | `MachiningPlaybookEngine`, 27 rule commits | a9244bdafa |
| PSN / SVI loop | `PSNAutonomyLoopEngine`, `SVIEnhancedCalculatorEngine` | – |
| Quoting pipeline | JM‑Die data ingest, photo‑to‑price, live chat AI | – |
| Session & alerting | `SessionReplayEngine`, `PagerDutyAlertsEngine` | e5ada2a32c |
| Hermes off‑load stack | `ask-hermes.mjs`, proxy keepalive, fan‑out pressure gate | 54a7183de0 |
| Zulu fleet engines | Scheduler, continuity, health synthesis (C4–C8) | c907480111 … 1602f254ba |
| Electron/Capacitor shells | Desktop & mobile builds, route gating (`/vibration`) | 13ba7f2e1a |
| Self‑compact / token guard | `self-compact.mjs`, loop‑state CLI flag alias | ca56a34cd8 |
| GNN re‑embed (stronger model) | GPU embedder, AUROC 0.835, macroF1 0.381 | – |

All units pass their test suites (e.g., 92/92, 29/29) and type‑check with `tsc --noEmit`.

## Key decisions + rationale  
- **Dark‑facade detection → static contracts / crash guards** – eliminates hidden dispatcher paths that bypass safety.  
- **Hybrid LLM routing** – Ollama fan‑out for cheap XPROC live, Claude/Opus for judgment; fallback to local on proxy failure.  
- **Self‑compact & token budget gating** – auto‑compact at YELLOW, checkpoint after each shipped unit; prevents RED shutdowns.  
- **Slot‑binding wrappers (`/checkin‑foxtrot`, `/checkin‑xray`)** – guarantee deterministic ownership before any build.  
- **Unified MachiningPlaybookEngine** – central rule evaluation replaces cross‑dispatcher calls.  
- **PSN autonomy loop with ψ‑delta reward** – ties LoRA training to real‑time profit/quality metrics.  
- **Token‑dedup gate (`loop-inject-dedup.mjs`)** – saves ~400 tokens per iteration.  
- **GPU health pre‑gate** – prevents OOM before vision/LoRA jobs; requires sm_120 support (torch ≥ 2.7).  
- **Cron “next‑unit” every 10 min & 20 min Zulu build loop** – steady progress without manual prompting.  
- **Never run heavy builds in RED context** – defer until auto‑compact or operator approval.  

## Standing operator directives  
- `/loop [20m] /goal AUTONOMOUS OVERNIGHT BUILD` – keep autonomous loop running; pause only on RED token limit.  
- Prioritise India AI & CAD learning: finish print‑to‑program replication, LoRA fine‑tune, GNN full‑coverage (AUROC ≥ 0.78).  
- Keep `PRISM_SFC_CONVERGE` off until safety‑gated evidence; run ISO material DB update only when flag enabled.  
- Ensure Hermes proxy (`/ask-hermes`) stays alive; monitor usage metrics.  
- Ship Electron/Capacitor shells after deps & tests pass; protect `/vibration` routes.  
- Let Zulu fleet health drive next capability units (C4–C8) and auto‑compact after each.  
- Run nightly PDF/tribal ingestion (`/pdf-learn`) until all vendor PDFs & videos are indexed.  
- Do **not** start new heavy builds when token budget is RED – wait for auto‑compact or `/clear`.  

## What is still to build (open threads)  
1. Complete India AI pipeline: full GNN retrain (AUROC ≥ 0.78), LoRA fine‑tune on ≥ 50 reliable samples, integrate BlueprintLoRABridgeEngine into production.  
2. Wire remaining dark‑facade actions (≈ 72 dispatchers still un‑wired).  
3. Finish PDF corpus: ingest remaining vendor PDFs, OCR all 85 K pages, generate augmentation files for System‑Viz.  
4. Video transcription pipeline – VLM caption extraction for all vendor videos; integrate into tribal tip index.  
5. Zulu fleet galaxies 5–7 (12 galaxies) and physics‑fence verification; tune `ZuluTaskContinuityEngine`.  
6. SFC convergence UI & mobile shells – Vite rebuild, dark‑mode pass, bridge to Electron/Capacitor.  
7. Full Hermes integration: auto‑recovery on crash, performance tuning under load, optional paid‑provider fallback.  
8. Lathe & EDM replication engines – wire `MillProgramCorpusEngine` output into lathe/EDM pipelines; add axis‑escalation gating.  
9. Universal routing for Hermes self‑reflection dispatcher (B3) – extend key‑override pattern beyond `agent_memory_remember`.  
10. Final memory compact & token budget verification – ensure MEMORY.md < 50 MB, RTK hit‑rate < 5 %.  
11. OOM fix for `regen-viz` / heap ≥ 16 GB; build Claude‑graph index viewer (HTML).  
12. Complete MS0 modules: obsidian brain, session continuity, remaining PSN legs (U‑P2…U‑P5), ProgramProofMS0 units PP04–PP10.  
13. Quote engine UI (web/phone), photo extraction pipeline, live chat AI integration.  
14. Resolve branch = null & claims = 0 gaps in `chat-slots.json`; implement `U‑SLOT‑BRANCH‑RESTORE` and `U‑CLAIM‑PERSIST‑FIX`.  

## How to build it (patterns/sequence)  
1. **Claim slot** – run `slot-bind-enforce.mjs` + `/checkin-<slot>` wrapper.  
2. **Ingest & extract** – execute `/pdf-learn`; Ollama extracts tribal tips; embed via `embed-wiki-into-tribal-index.mjs`.  
3. **Vector store sync** – push embeddings to Qdrant; verify counts.  
4. **Engine wiring loop** – for each unwired engine: add action to dispatcher enum, Zod schema, lazy import; commit with path‑spec only; run unit + integration tests (Vitest/Jest, Playwright).  
5. **Safety & quality envelope** – integrate engines into `prism_safety` (collision checks, material compatibility, 5‑stage quality envelope).  
6. **PSN autonomy** – start `psn-automate`; `PSNAutonomyLoopEngine` emits ψ‑delta → LoRA trainer (`MillLoRAMasterOrchestratorEngine`).  
7. **Self‑compact checkpoint** – run `self-compact.mjs` after each merge; auto‑compact on YELLOW token budget.  
8. **Cron & loop** – enable `/yolo-mode` (5 min) and “next‑unit” cron (10 min); keep Zulu fleet build loop (20 min).  
9. **Audit & dedup** – run `U-DARK-FACADE-AUDIT`, `loop-inject-dedup.mjs`, token‑audit scripts; fix reported drifts.  
10. **Deploy UI** – ship Electron/Capacitor shells, quoting engine UI, Claude‑graph viewer; bind routes (`/vibration`).  

## Tools to use (dispatchers / scripts / AI systems)  

- **Dispatchers**: `aiReasoningDispatcher`, `intelligenceDispatcher`, `orchestrationDispatcher`, `camDispatcher`, `millDispatcher`, `prism_calc`, `prism_safety`, `prism_quoting`, `prism_session`.  
- **Scripts / Hooks**: `slot-bind-enforce.mjs`, `audit-roadmap-drift.mjs`, `self‑compact.mjs`, `system‑viz‑graph.mjs`, `dual‑reg‑auditor.mjs`, `agent-fanout-pressure-gate.mjs`, `ask-hermes.mjs`, `hermes-proxy-ensure.mjs`, `pdf-learn-batch.mjs`, `vision-ensemble-fuse.mjs`, `generate-slot-synergy-features.mjs`, `loop-inject-dedup.mjs`, `token-audit.mjs`, `phase21-split-containers.py`.  
- **AI systems**: Ollama (local qwen2.5‑coder, qwen3‑VL, Llama3.2‑Vision), Hermes proxy (Anthropic/Claude routing), Sonnet (router coding), Opus (safety design), Claude (via `.claude`), Qdrant vector store.  
- **Knowledge bases**: Obsidian vault (`state/shared/audits/*.md`), System‑Viz graphs (`SYSTEM-VIZ-GALAXY-MS0.json`).  
- **Build / Test**: Vitest (sharded), Jest, Playwright UI tests, `tsc --noEmit`, `npm run build:fast`.  
- **Observability**: `PagerDutyAlertsEngine`, `SessionReplayEngine`, token‑cost audit scripts, GPU health monitor (`gpu_health.py`).  

## Recurring findings + bugs (deduped)  
- Double‑wrap payloads (`data.data`) → fixed envelope convention.  
- Missing crash guards on many dispatchers; added fail‑loud wrappers.  
- OOM on full graph reads / `regen-viz` merges – introduced bounded reads and heap ≥ 16 GB requirement.  
- Token budget spikes (RED) caused loop halts; mitigated by auto‑compact, YELLOW checkpoint, dedup gate (~400 tokens saved).  
- Hermes proxy stale / Anthropic 400 errors → added usage credit guard & fallback to local Ollama.  
- Dark‑facade audit uncovered 85 actions across 10 dispatchers; 72 remain un‑wired.  
- Vision ensemble JSON repair bugs (leading dot/plus decimals) fixed with string‑aware scanner.  
- Git lock contention and peer‑absorption bugs – switched to pathspec‑only commits.  
- Ghost refs & orphan hooks (`linear-roadmap-sync.mjs`, `supabase-state-sync.mjs`) still pending removal.  
- Branch = null / claims = 0 in `chat-slots.json` → created restore/fix utilities.  
- ENOSPC temp dir errors blocking Claude operations; cleared `%TEMP%\claude`.  
- Token cost overcount (~7×) – corrected audit scripts (`audit-hook-stack-cost.mjs`).  
- NaN/precedence bugs in several engines (e.g., `HybridProgramComposerEngine`); added validation.  
- Docker daemon failures (API 500) halted GPU OCR/VLM stages; ensured daemon restart before vision jobs.  

*All items above are deduplicated across sessions and presented tersely.*

# lathe galaxy CROSS-SESSION SYNTHESIS (19 of 19 mineable, model gpt-oss:120b, 2026-06-27)

## What this galaxy is building
- End‑to‑end PRISM turning/lathe pipeline (Lathe Wizard) covering design → program generation → CNC execution for Okuma JM die fleet (CSS G96/G97, boring, grooving/parting, threading, nose‑radius, sub‑spindle).  
- Supporting infra: slot‑worktree enforcement, duplication guard, audit‑close‑out pipeline, system‑viz graph (~7.3k nodes), GPU offload orchestration (Ollama q8_0, FLASH_ATTENTION), Hermes/Zebra dashboard, curriculum academy (35 courses), PSN health & reward loop.  
- Unified engine ecosystem: Customer Management, ERP Quality, Docker Hook Broker, Ollama Agent Loop, pending Tier‑A AI coordinators (FullSystemAICoordinator, U‑BRIDGE‑LEARN‑*).  

## Shipped capabilities
- Core driver `lathe‑closed-loop‑full.mjs` (U‑W2) with safety envelope 3800 rpm / 11 kW, G50 RPM clamp, overspeed detection (545 programs).  
- STEP → profile pipeline (`lathe‑rungc‑step‑loop.mjs`) pure‑JS geometry leg, multi‑body segmentation.  
- Collision & tooling fixes: boring overhang guard, flat stickout replacement, parting blade width helper, residual collision instrumentation.  
- PDF/video ingest (`pdf‑parse‑extract.mjs`, `/pdf‑learn`, `/video‑learn`), tribal corpus (~1 200 nodes, 23 tips, hallucination guard).  
- AI training runs: LoRA engines wired (15 new actions) on archives of 2k/5k/10k programs; backend Flow Nexus/Ollama.  
- PSN health strip & ψ‑delta reward integration.  
- Hermes/Zebra control server (dashboard :8767) with parallel fan‑out planner.  
- Curriculum Academy: 35 courses covering VMC/HMC/5‑axis lathe/EDM, tooling tables, speed/feed orchestrator.  
- Engine modules shipped (selected): muS‑B14/B15/A18, U‑WIRE‑CUSTOMER‑PORTFOLIO‑MINER, U‑WIRE‑ERP‑QUALITY, U‑CK11, U‑DOCKER‑HOOK‑BROKER (P1‑P5), U‑OE‑L3 (Ollama agent loop). All passed type‑check and unit tests.  

## Key decisions + rationale
- Pure‑JS STEP leg over GPU OCR for deterministic geometry.  
- Fleet‑floor safety envelope set to most restrictive JM lathe; guarantees universal safe operation.  
- Duplication guard mandatory before creating assets (saved ~30 % compile time).  
- Slot‑worktree & `[BOOTSTRAP-SLOT-ENFORCE]` to eliminate peer absorption misattribution and lock contention.  
- GPU offload config (`KEEP_ALIVE=-1`, `FLASH_ATTENTION=1`, `KV_CACHE_TYPE=q8_0`, `NUM_PARALLEL=4`) deployed before AI training for max throughput.  
- OCR fallback via Ollama vision (qwen2.5vl) kept optional until fire‑rate > 8 %.  
- Early PSN integration drives continuous safety compliance via reward loop.  
- YOLO mode & ROI‑first looping for rapid iteration; three‑way scrutiny gate (unit tests, type check, lint) enforced on each commit.  
- Mobile‑first UI for curriculum; union‑type quiz schema and optional chaining for slot stability.  

## Standing operator directives
- Commit pattern: `[MAIN-FORCE] [KIENZLE-LATHE-WIZARD]/U-ID` or `[PRISM-ACAD]/U-ID`; only slot‑owned files, then `loop-state.mjs`.  
- Run reference tests (≥3 happy, ≥2 failures, ≥2 adversarial) via `turningDispatcher`.  
- Loop control: `/loop [5m] /goal` or `/yolo-mode` for autonomous execution; stop only on genuine safety breach.  
- Never exceed safety envelope; use G50 clamp.  
- Duplication guard must pass (`duplicationGuardEngine.mustCheckBeforeCreating()`).  
- Audit cadence: run `audit-close-out-candidates.mjs` every ~3rd fire, commit report.  
- Slot binding via `/checkin‑whiskey`, `/checkin‑bravo`, `/checkin‑charlie`.  
- Trigger PDF/video ingest with `/college-extract <slug>`; bulk commits retried by cron until lock cleared.  

## What is still to build (open threads)
1. Rung C CAD geometry bridge (Python B‑rep → `TurningCADImportEngine`).  
2. GPU‑bound OCR auto mode activation.  
3. Bulk commit of 1401 college spec files (git lock clearance).  
4. Remaining unwired lathe AI actions (~15 engines) and other domain engines (123 others, 64 lathe, 12 machine).  
5. Full Hermes/Zebra UI & endpoint integration with PSN reward loop.  
6. Complete collision‑zone logic (`U‑W7`) and post‑cut verification engine.  
7. Boring‑bar selection feature.  
8. Finish PSN coverage for PROGRAM‑PROOF‑MS0 units PP04‑PP10.  
9. Curriculum expansion: entry‑level modules, alarm‑code mapping, 3D viewer content.  
10. LoRA training backend wired to `psn-coverage-report` and AI corpus pointers.  
11. System‑viz regeneration pipeline for new nodes/edges from college specs, PDF tips, lathe engines.  
12. Memory & Qdrant hybrid indexing for tribal corpus and AI embeddings.  
13. Tier‑A AI coordinators (FullSystemAICoordinator, U‑BRIDGE‑LEARN‑*).  
14. Engine wiki gap: generate missing docs for remaining 67 % of engines; schedule `system-viz-build.mjs` after audit.  

## How to build it (patterns/sequence)
- **Dependency‑ordered shipping:** `U‑W2 → U‑W3A/B/C → U‑W4/5 → U‑W6 → U‑W8 → U‑W9 → U‑W10/11`, then AI/PSN layers.  
- **Guard‑first, test‑then‑commit:** run duplication guard, full reference suite, audit, commit with `[MAIN-FORCE]`.  
- **Slot isolation:** work in dedicated slot worktree; enforce via `.claude/hooks/slot-commit-worktree-enforce`.  
- **Cron‑driven autonomy:** create `/goal` loops (e.g., every 5 min) to auto‑retry failed commits, bulk PDF/spec generation, AI training jobs.  
- **Introspect router wiring:** use `lathe_engine_registry`; run `introspect-router.mjs` after each batch.  
- **GPU offload activation:** when Ollama fire count > 8, set `mode:"auto"` in `ollama-route-config.json`, restart service.  
- **System‑viz refresh:** invoke `regen-viz.mjs --fast` after any new node/edge batch; verify with `system-viz-query.mjs`.  
- **AI training pipeline:** `scripts/train-lathe-full-archive.mjs` → LoRA → `psn-coverage-report` → ψ‑delta reward update.  
- **Wiki sync:** run `regen-wiki-from-viz.mjs` then `build-node-capability-index.mjs`; commit markdown to `/docs/engines`.  
- **Three‑way scrutiny gate:** after build, execute `scrutiny-3way.mjs` (unit tests + type check + lint) before merge.  

## Tools to use
- **Dispatchers / Skills:** `turningDispatcher`, `prism_turning_program`, `prism_business`, `prism_ai`, `sessionDispatcher`.  
- **CLI wrappers / skills:** `/checkin‑whiskey`, `/checkin‑bravo`, `/loop`, `/goal`, `/compact`, `/college-extract`, `/psn-integration-test`, `/system-viz-validate`.  
- **Core scripts:** `lathe-closed-loop-full.mjs`, `lathe-rungc-step-loop.mjs`, `pdf-parse-extract.mjs`, `auto-college-course-spec-emit.mjs`, `generate-adaptivity-tests.mjs`, `node-capability-injector.mjs`, `build-node-capability-index.mjs`, `train-lathe-full-archive.mjs`, `psn-coverage-report.mjs`, `ollama-route-pretooluse.mjs`, `system-viz-query.mjs`, `regen-viz.mjs`, `audit-close-out-candidates.mjs`.  
- **Hooks:** `duplicationGuardEngine`, `audit-close-out-candidates.mjs`, `stop-wiki-from-nodes-autopopulate.mjs`, `node-capability-inject.mjs`.  
- **AI backends:** Ollama (q8_0, FLASH_ATTENTION), Claude, Flow Nexus LoRA trainer, Qdrant vector store.  
- **Knowledge stores:** Obsidian vault (`/knowledge/wiki/*`), JSON/MD dashboards (`state/shared/*`), Qdrant collections (`lathe-tribal-corpus`).  
- **Infrastructure:** Docker Compose (Docker Hook Broker), Hermes/Zebra dashboard (:8767), Termius + WSL2 tmux for remote terminals.  

## Recurring findings + bugs
- EMFILE / OOM in `MaterialRegistry.load()` solved with bounded concurrency.  
- Path‑casing double‑count fixed by lower‑case normalization.  
- `sfm_max` drift clamped to `[20,3000] ft/min`.  
- Hallucination guard added to tribal classifier.  
- GPU OCR remains blocker; fallback to Ollama vision in place.  
- Git `index.lock` contention mitigated with retry loops and `/compact` resets.  
- Peer absorption misattribution fixed by slot‑commit enforcement.  
- Duplicate telemetry unified via `recordHookFire()`.  
- Overspeed programs identified, G50 clamp added (10 % of corpus unsafe).  
- Collision false flags reduced after tooling helpers.  
- Regex/parsing bugs fixed (global flag, decimal regex, ghost node detection).  
- Rate‑limit & server errors on Hermes/Zebra endpoints handled with exponential backoff.  
- System‑viz regeneration OOM avoided using `--fast` and memory‑light cache.  
- PDF extraction switched to `pdf-parse`; path slash issues resolved.  
- Telemetry row missing for Ollama offload added to `ollama-offload-stats.json`.  
- Duplicate engine detection now mandatory guard.  
- Stale git lock causing hangs fixed with pre‑run cleanup.  
- Broker P1 race conditions solved with atomic Map swap and permission checks.  
- PowerShell version mismatch standardized on `pwsh.exe`.  
- Winget unavailable in SYSTEM context; manual MSI install used.  
- Termius private key issue resolved, documented in `/ops/ssh_setup.md`.

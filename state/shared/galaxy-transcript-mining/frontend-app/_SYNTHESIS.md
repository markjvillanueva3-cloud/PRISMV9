# frontend-app galaxy CROSS-SESSION SYNTHESIS (8 of 140 mineable, model gpt-oss:120b, 2026-06-10)

## What this galaxy is building
- Full‑stack PRISM frontend (React / Next.js / Vite) for web + phone: UI/UX, routes, state mgmt, component library.  
- Hermes LLM agent surface (`:3100/mcp`) wired to Claude Code (primary) & local Ollama (`gpt‑oss:20b` fallback `qwen2.5‑coder:32b`).  
- Central vector store (Qdrant `:6333`) with collections `prism_engines`, `prism_skills`, `prism_formulas`.  
- Obsidian memory bridge (`hermes‑obsidian‑memory‑bridge.mjs`) syncing to `knowledge/hermes-brain/`.  
- Business dispatcher (`prism_business`) handling payroll, quoting, marketplace, ERP.  
- Speed‑Feed physics suite (calcDispatcher, TriComparator, ClampingForceEngine, CalibrationPersistEngine, GPU judge).  
- Quote & Cost routing matrix (CostBridgeDispatch, QuoteEstimatorEngine, Margin‑Floor guard).  
- CIMCO CNC simulation pipeline (PrismCimcoUI.exe, SIM‑4…SIM‑7 units).  
- Galaxy‑wide synergy matrix, tribal index sharding, system‑viz graph streaming.  
- Fleet‑reaper guardian (golf slot) and ASCII PreToolUse guard across all slots.

## Shipped capabilities
- **Hermes**: config v28 migration, model defaults (`gpt‑oss:20b` primary, Claude Opus 4.8 fallback), headless CLI `hermes -z`.  
- **MCP server** alive at `:3100/mcp`; request semaphore 64, queue 512; watchdog RSS floor 18 GB.  
- **Ollama stack** (RTX PRO 6000 Blackwell): `gpt‑oss:20b`, `gpt‑oss:120b`, `qwen2.5‑coder:32b`, `nomic‑embed‑text`.  
- **Qdrant** container healthy, collections verified.  
- **Speed‑Feed engines**: CalibrationPersistEngine, TriComparator (102 k combos, 733 Vc values), ClampingForceEngine, CoolantVcModifier, tool‑material speed factor table, finish‑RA cap, full axis sweep (16 live axes).  
- **Business**: PayrollLiabilityFilingEngine wired (compute940, generateW2, etc.), SQLite WAL store in CustomerPortalEngine, allowlist role‑gate for handoff writes.  
- **CIMCO**: SIM‑4…SIM‑7 units passed 3‑of‑3 scrutiny; single‑process `invoke-read` op; PowerShell fleet sweep (`cimco-fleet-sweep.ps1`).  
- **Quote system**: QuoteEstimatorEngine, CostSavingsTrackerEngine, margin‑floor guard, outbound promotion gate, calibration freshness preflight.  
- **Galaxy synergy**: `GALAXY‑SYNERGY‑MATRIX‑2026‑06‑09.md`, 8 × GNN tier‑5 runs, cross‑cutting CLAUDE/Memory docs, tribal index shard writer (`writeTribalIndex`).  
- **System‑viz**: streaming graph degree pipeline, OOM guard, node‑card fixes.  
- **Hooks & guards**: ASCII‑guard (diff‑aware), stop‑on‑hook‑unregistration JSON protocol, migration‑freeze marker cleared, auto‑reenable crash‑critical task guard.  
- **Fleet‑reaper**: enabled on golf slot, periodic guardian sweep, orphan daemon cleanup.  

## Key decisions + rationale
- **Model routing**: primary `gpt‑oss:20b` for most tasks; local Ollama as cheap fallback; Claude Opus 4.8 only on 429 errors → avoids extra‑usage billing.  
- **Provider policy**: drop OpenAI, use `custom`/`anthropic`; simplifies config and cost control.  
- **Ultracode workflow**: parallel ≤3 agents to stay under Anthropic rate limits; deterministic 3‑of‑3 review for all substantive changes.  
- **Reset‑first commit discipline** (`git reset -q && git add … && git commit`) → eliminates massive diff bloat.  
- **Buffered tribal index loader**: incremental parse avoids V8 512 MiB string cap, prevents OOM.  
- **Cost‑router tiers**: map tasks to model size (cheap→`gpt‑oss:20b`, balanced→`qwen2.5‑coder:32b`, best→`gpt‑oss:120b`).  
- **Golf slot ownership**: fleet‑reaper runs automatically on `/checkin‑golf`; eliminates manual cleanup.  
- **ASCII guard**: block non‑ASCII punctuation in code files; diff‑aware to avoid false positives.  
- **MCP heap & watchdog**: raise floor to 24 GB, RSS threshold to 18 GB for new 136 GB RAM hardware.  
- **NIM containers**: stopped (GPU saturation) → rely solely on Ollama offload.  

## Standing operator directives
- Restart Hermes after any config/model change.  
- Verify Qdrant (`curl localhost:6333/collections`) is up; restart Docker Desktop if it stops.  
- Enable “extra‑usage” billing or adjust fallback logic to handle HTTP 400 from Anthropic.  
- Monitor system memory (commit ~96 %); avoid heavy parallel builds until RAM stabilizes.  
- Apply `PRISM_ROOT` cwd fix for CapabilityIndexEngine path conflict.  
- Re‑enable Hermes‑Obsidian bridge scheduled task.  
- Run `/compact` before any large UI foundation build or full speed‑feed sweep.  
- Execute hotel portal persistence tests (`U‑HOTEL‑PORTAL‑PERSISTENCE`) and allowlist role‑gate verification.  
- Trigger CIMCO live simulation on VMC‑01 then run fleet sweep (`cimco-fleet-sweep.ps1`).  
- Start Qdrant, Docker, Ollama; ensure `OLLAMA_MAX_LOADED_MODELS=3`.  
- Periodically invoke `/checkin‑golf` to fire fleet‑reaper guardian.  

## What is still to build (open threads)
- **Hermes**: make HTTP 400 trigger local fallback (use billing flag or route to Ollama).  
- Implement `PRISM_ROOT` cwd correction for CapabilityIndexEngine vs repo root.  
- Re‑enable and schedule Hermes‑Obsidian bridge task.  
- Regenerate `ai-training_synthesis.md` via local stack when owner available.  
- Complete closed‑loop speed‑feed driver: exclude unaligned external data from consensus, finish remaining axes (rigidity, spindle, controller, workholding, insert).  
- Fix routing logic to prefer `gpt‑oss:120b` for “search_synthesis” tier.  
- Finish galaxy docs: 23 of 34 galaxies still missing content; run ultracode synthesis on X‑articles.  
- Finalize cost‑router integration and verify model mapping across all routes.  
- Implement vision OCR batch (Blackwell, `qwen2.5‑VL`) for vendor catalogs.  
- Complete role‑gate mapping for all manager roles; ensure audit logs capture true `req.userId`.  
- Wire buffered tribal index loader into remaining consumers (PSN leg 5, quoting pipeline).  
- Resolve migration‑freeze marker persistence after PC upgrade.  
- Deploy inflight‑aware MCP watchdog & bounded request semaphore leak fix.  
- Re‑register Zombie Reaper v2 and Blueprint OCR bridge adapters.  

## How to build it (patterns/sequence)
1. **Reset‑first commit** → `git reset -q && git add … && git commit -m "<msg>"`.  
2. Run `/compact` to prune memory & reduce repo size.  
3. Use **ultracode**: `ultracode parallel(≤3) { agentX(); agentY(); }` for any fan‑out work.  
4. For LLM tasks: call local Ollama (`ask-ollama.mjs`) first; on 429 fallback to Claude Opus, on 400 trigger local model via `routeModelForTask`.  
5. Wire new engines through **calcDispatcher** / **prism_business** enum‑case pattern; expose only public contract methods.  
6. Deploy **buffered tribal index loader** (`loadTribalIndexIncremental`) before any consumer that reads the index.  
7. Apply **ASCII‑guard** hook in `PreToolUse` stage; ensure diff‑aware regex excludes comments.  
8. Enable **fleet‑reaper** on golf slot: `/checkin‑golf && fleet-reaper-sweep.mjs`.  
9. After each config change, run `hermes -z restart`; verify model via simple prompt.  
10. Run full test suites (`npm test`, `vitest`) with 3‑of‑3 scrutiny; fix any failures before merge.  

## Tools to use
- **Dispatchers/engines**: `ModelRoutingEngine.ts`, `AISystemRouterEngine.ts`, `OllamaTaskOffloaderEngine.ts`, `CostBridgeDispatch.mjs`, `SpeedFeedCalibrationPersistEngine`, `QuoteEstimatorEngine`, `CIMCO simulation scripts`.  
- **Scripts/hooks**: `hermes config migrate`, `hermes -z`, `fleet-reaper-sweep.mjs`, `ascii-guard.mjs`, `stop-on-hook-unregistration.mjs`, `slot-bind-enforce.mjs`, `loop-iteration-inject.mjs`, `goal-prereq-inject.mjs`.  
- **System‑viz**: `graph-stream-degree.mjs`, `system-viz.md` viewer, `docker-service-health-stop.mjs`.  
- **AI systems**: Ollama (local models), Claude Opus 4.8 API, qwen2.5‑coder/ VL for vision OCR.  
- **Vector store**: Qdrant container (`docker compose up qdrant`).  
- **Knowledge base**: Obsidian REST API (`:27123`), `MEMORY.md`, `PATHS.md`, `CLAUDE.md`.  
- **CI/automation**: Ultracode workflow engine, Git hooks (`slot-commit-enforce`), Cron jobs (`8c5e63fe` every 10 min).  

## Recurring findings + bugs
- Hermes HTTP 400 does not trigger fallback → only 429 does.  
- Stale MCP daemon path (`N:\`) caused “not connected” Qdrant cache; required restart.  
- Qdrant down after container start → needed health check and restart.  
- EPERM rename leak in `OutcomeCaptureBusEngine.ts` fixed with `fs.appendFileSync`.  
- Tribal index OOM due to V8 512 MiB string limit; solved by incremental loader & size guard.  
- GUI launcher stuck on git‑pull because of dirty `package-lock.json`; cleared manually.  
- Claude rate limiting (429) correctly falls back, but 400 errors were missed → added fallback logic.  
- Offload router roster stale (0 % offload) fixed in U1 refresh.  
- Route‑hook default pointed to retired model; corrected in U2.  
- Compressor safety denylist breach fixed (P0).  
- NIM containers crashed on GPU memory, stopped permanently.  
- ASCII guard initially advisory only → made blocking diff‑aware.  
- Migration‑freeze marker persisted after PC upgrade; cleared manually.  
- Large uncommitted backlog (~31 K files) deferred to quiet window via `/compact`.  
- Watchdog RSS preempt threshold too low (3 GB); raised to 18 GB.  
- RequestSemaphore leak on client disconnect fixed.  
- System‑viz node‑card OOM (~458 MB) solved by streaming graph.  
- Offload hooks fire many times with near‑zero conversion; no new mute needed.  
- Token‑budget knob missing in Hermes output → added to config.  
- Vision model duplicate literals removed; single‑source selector created.  

*All sections reflect the current consolidated state of the PRISM galaxy.*

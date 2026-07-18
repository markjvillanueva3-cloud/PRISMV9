# bug-hunting galaxy CROSS-SESSION SYNTHESIS (6 of 262 mineable, model gpt-oss:120b, 2026-06-09)

## What this galaxy is building
- Unified PRISM OS that stitches together **Hermes LLM gateway**, **Obsidian vault**, **Qdrant vector store**, and domain‑specific engines (Payroll, Hotel, OCR, Part‑library, etc.) into a single knowledge‑capture & action platform.  
- Slot‑binding framework (`/checkin-*` wrappers) that guarantees exclusive ownership, drift detection, and lane‑protected commits.  
- Resumable, fail‑loud / zero‑drop ingest pipelines for part libraries, OCR corpora, and business actions (R12 compliance).  
- Automatic model routing & offload to local Ollama instances with tiered fallback and VRAM caps.

## Shipped capabilities
- **Hermes config v28** migrated; provider primary `gpt‑oss:20b`, fallback `anthropic/claude‑opus‑4.8` (later overridden to keep Claude as secondary).  
- Hermes backend **4 processes** listening on `:9120` (`config_version 28`).  
- **Qdrant container** `prism-qdrant` healthy on `:6333`; collections `prism_engines`, `prism_formulas`, `prism_skills`.  
- Headless Zulu CLI functional (`hermes -z`).  
- `MEMORY.md` for all **34 galaxies** filled (commit 28b72e4dee). Deterministic test suite added (**13 tests**, all pass).  
- Unit commits: 7d79f345c2 (CLAUDE.md domains), 1ab785c21d (PSN edge), 3ea4f40192 (soul realignments), 2579da89a4 (thin filler removal), e6eba32eec (misc).  
- Cron job `180007b9` retired.  
- Slots/units **U5b, U5c, U6, U7, U9, U10** committed to slot/bravo; also **U1‑U3**, **U2**, **U9**.  
- **B2 ingest**: 30 890 orphan `part.json` sidecars merged into `jm-part-library.jsonl` (39 MB) via `JMDiePartLibraryEngine`.  
- Updated `PATHS.md` with three large inventories; DB_MANIFEST entries **33→36**.  
- Archived dead indexes (`.archive.2026‑06‑08.json`).  
- Silent‑skip counter added to ingest script; malformed rows (24 R12) now reported.  
- Ultraflow audit completed: cheap‑token read path **≈136 tokens** vs prior 186 k.  
- Memory artifact fix (`45225e0cc3`), hook heap cap set to **384 MB**, commit charge dropped from **92 % → 52 %** after WSL shutdown.  
- MCP maxConnections raised to **512**.  
- `TRANSIENT_PRESSURE_CODES` added; false alarms suppressed.  
- GPU offload patterns widened; target **≈30 %** offload coverage (currently ~8 %).  
- `EXPECTED_UNREGISTERED_TASKS` suppresses intentional vault‑cron banners.  
- **Call‑engine harness** (`scripts/call-engine.mjs`) with 8‑case test suite (**8/8 pass**).  
- **WSL memory guard** (`27-wsl-memory-guard.mjs`) – 15 pure‑logic tests (**15/15 pass**) + PowerShell installer for 15 min scheduled task.  
- PayrollLiabilityFilingEngine wired (methods `compute940`, `generateW2`, `reconcileW2_941`, `contractor1099_totals`, `remit_liability`) into `businessDispatcher`.  
- Hotel transcript miner (`scripts/mine-hotel-transcripts.mjs`) added; false‑wire regression guard ensures **20/20** allowlisted actions pass.  
- Resumable OCR corpus loop with cursor `processed-cursor.jsonl`; multi‑page PDF rasterizer `pdf-to-png.py --count`. Ensemble VLMs: `qwen3-vl:8b-instruct`, `qwen2.5vl:7b`.  
- PowerShell launcher + Task Scheduler for unattended OCR training (`install-blueprint-ocr-batch-task.ps1`).  
- True‑test harness `find-perfect-parts.mjs` (91‑part report).  

## Key decisions + rationale
- **Provider strategy** – primary `gpt‑oss:20b`, fallback Claude; upgrade to `gpt‑oss:120b` when available. Keeps cost low, uses local fallback on 429/400 errors, bills only for higher‑tier/external API.  
- **Path D** – reuse existing MCP `:3100` for Hermes→Obsidian reads; avoids a second filesystem server and reduces latency.  
- **Offload router extension** – extend `OllamaTaskOffloaderEngine` with optional tier field, drop retired models, set `NUM_PARALLEL=2`, `MAX_LOADED=3` to keep VRAM < 95 GB.  
- **Slot‑binding wrappers** (`/checkin-*`) enforce exclusive commit lanes via `PRISM_GIT_ADD_LANE_DISABLE`; prevents peer‑claim races.  
- **Fail‑loud / zero‑drop pattern** for all ingest scripts (e.g., `build-jm-document-ledger.mjs`, OCR loop) to surface errors immediately.  
- **Hook heap cap 384 MB** – limits node process count, reduces system pressure; proved by commit charge drop.  
- **MCP maxConnections 512** – supports 26 slots + spawned agents without throttling.  
- **Transient pressure codes** treated as non‑failing to stop false alarms from `vmmemWSL`.  
- **GPU offload target ≈30 %** – broadened `OFFLOADABLE_PATTERNS` (lint, classify, diff‑summary, triage, extract, rename).  
- **Resumable cursor for OCR** guarantees R12 compliance; avoids re‑OCR after kill.  
- **Default coder model** set to `qwen2.5-coder:32b` (20 GB) for code‑heavy tasks; Ollama used for bulk summarization.

## Standing operator directives
- Restart Hermes daemon after any config change (`systemctl restart hermes` or `hermes doctor`).  
- Verify status: `curl :9120/api/status` → `config_version:28`, correct provider strings.  
- Test CLI: `hermes -z "Hello"`.  
- Use PowerShell wrapper `zulu-cli.ps1` for headless Zulu; schedule if needed.  
- Monitor memory pressure; if **commit charge >95 %** for >30 s, clear idle chat logs.  
- Run `/compact` after heavy memory usage or WSL guard actions.  
- Install & run WSL guard: `powershell -File install-wsl-memory-guard-task.ps1 -RunNow`.  
- Use slot wrappers before work: `/checkin-sierra`, `/checkin-hotel`, `/checkin-xray`, etc.  
- Run ultraflow audit (`/ultraflow-audit`) to recover cheap‑token context.  
- Re‑enable Hermes‑Obsidian Bridge scheduled task; confirm health via `hermes doctor`.  
- Coordinate with slot owners (Papa, etc.) before editing stubs.  
- For OCR pipeline: run `pdf-to-png.py --count`, then `batch-ollama-vision-extract.mjs`.  

## What is still to build (open threads)
- Enable extra‑usage billing in Claude account or guarantee local fallback on 400 errors.  
- Pull and integrate **gpt‑oss:120b** when released; update provider config.  
- Finalize auxiliary model routing (`ask‑ollama/OllamaTaskOffloaderEngine`) for all engines.  
- Sync `ask‑ollama.mjs` & `host-aware-synthesis-model.mjs` into bravo (U4).  
- Implement **U‑WIZ‑NARRATIVE** regeneration from system‑viz (`regen-wiki-from-viz.mjs`).  
- Wire **U‑OLLAMA‑PIPELINE‑INJECTOR‑WIRE** across system‑viz, vault, memory, wiki.  
- Build **U‑HOTEL‑PORTAL‑PERSISTENCE** (SQLite‑WAL maps) and decide on `/compact` ordering.  
- Resolve false wires flagged by regression guard (e.g., marketplace lead param mismatch).  
- Complete domain‑shift calibration harness for OCR (real‑scan gold comparison).  
- Run full LoRA fine‑tune on OCR corpus; verify checkpoint creation.  
- Mitigate GPU contention for VLM ensemble (throttle concurrency or schedule off‑peak).  
- Expand VLM ensemble beyond current two models when new ones become stable.  
- Publish final honest verdict report for OCR recall/precision and commit.  
- Clean up duplicate MCP daemons (currently 3); ensure single instance runs.  
- Verify slot coordination after Qdrant restart (no stale connections).  
- Integrate `call-engine.mjs` as a `/call-engine` skill in PRISM UI.

## How to build it (patterns/sequence)
1. **Claim slot** with `/checkin‑<name>` → drift check → lock commit lane.  
2. **Run fail‑loud script** (e.g., `build-jm-document-ledger.mjs`, OCR loop). Abort on first non‑zero exit.  
3. For long‑running loops, **write cursor** (`processed-cursor.jsonl`) after each batch; on restart resume from last entry.  
4. **Wrap all file writes** with `writeWithRetry` to handle transient FS errors.  
5. **Refresh offload roster** by updating `ollama-route-config.json`; reload engine via `OllamaTaskOffloaderEngine`.  
6. **Enforce hook heap cap** (`export HOOK_HEAP_MAX=384M`) before spawning node processes.  
7. Deploy **WSL memory guard** as scheduled task; on overrun execute `wsl --shutdown` then restart services.  
8. **Run ultraflow audit** (six agents) to capture cheap‑token reads and persist node‑access maps (`system-viz/MEMORY.md`).  
9. **Commit lane enforcement** via `PRISM_GIT_ADD_LANE_DISABLE` & `PRISM_MAINTREE_WRITE_BLOCK_DISABLE`.  
10. After each major batch, run `/compact` to prune memory and reset commit charge.

## Tools to use
- **Dispatchers/Skills:** `prism_memory`, `prism_session`, `prism_knowledge`, `businessDispatcher`; engines – `HermesBackend`, `PayrollLiabilityFilingEngine`, `CustomerPortalEngine`, `JMDiePartLibraryEngine`, `WikiIndexMaintainerEngine`, `ObsidianMemorySyncEngine`, `OCRCorpusLoopEngine`, `VisionEnsembleEngine`.  
- **Scripts/Hooks:** `scripts/call-engine.mjs`, `27-wsl-memory-guard.mjs`, `install-wsl-memory-guard-task.ps1`, `ollama-route-pretooluse.mjs`, `OllamaTaskOffloaderEngine.ts`, `writeWithRetry.js`, `zulu-cli.ps1`, `find-perfect-parts.mjs`.  
- **System‑viz:** `system-viz/MEMORY.md`, `regen-wiki-from-viz.mjs`.  
- **AI Systems:** Ollama (local models: `gpt‑oss:20b/120b`, `qwen2.5-coder:32b`, `qwen3‑vl:8b`, `qwen2.5‑vl:7b`), Anthropic Claude opus 4.8, Qdrant vector store.  
- **Databases:** Qdrant (`prism_engines`, etc.), SQLite (hotel persistence).  
- **Obsidan Vault:** REST API on `:27123`.  
- **PRISM CLI/Commands:** `hermes config migrate`, `hermes doctor`, `/checkin-*`, `/compact`, `/ultraflow-audit`, `/call-engine`.  

## Recurring findings + bugs
- **Memory inflation** – node_* graph dumps counted as memories; filtered out in recent commit.  
- **Commit charge spikes** (>90 %) caused by hook processes; mitigated with 384 MB heap cap and WSL guard.  
- **Hermes 400 errors** from Anthropic when extra‑usage balance exhausted; fallback not triggered – need billing enable or local model switch.  
- **Offload router initially 0 %** due to retired models; after roster refresh now ~8 % (target ≈30 %).  
- **Stale MCP daemon connections** after Qdrant downtime; required daemon restart.  
- **Duplicate MCP daemons** (3 instances) detected – pending cleanup.  
- **Silent‑skip counters** added to ingest scripts to expose unreadable dirs/files.  
- **OCR page‑0‑only bug** fixed by `pdf-to-png.py --count`.  
- **GPU contention** causing VLM timeouts, halving ensemble coverage; schedule off‑peak or throttle concurrency.  
- **Stale wiki‑link‑fix candidates** caused over‑apply; regenerated with correct scorer.  
- **Transient pressure codes** mis‑treated as failures – now ignored via `TRANSIENT_PRESSURE_CODES`.  
- **Missing‑task banner noise** from intentional unregistered vault crons suppressed by `EXPECTED_UNREGISTERED_TASKS`.

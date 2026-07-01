# cad-fusion-live galaxy CROSS-SESSION SYNTHESIS (6 of 214 mineable, model gpt-oss:120b, 2026-06-10)

## What this galaxy is building  
- **Unified PRISM‑OS automation layer** that stitches live Fusion 360 sketch/extrude/fillet actions into a persistent `.f3d` round‑trip, backed by a *single source of truth* (vault ↔ wiki ↔ tribal index).  
- **End‑to‑end knowledge graph**: Obsidian vault → Qdrant tribal embeddings → indexed Wiki backlinks → live “sidecar” engines (quote, quoting, cost‑bridge, GNN edge‑predict, speed‑feed calibrator).  
- **Scalable compute offload**: OllamaTaskOffloaderEngine routes cheap code‑generation to `qwen2.5‑coder:32b`, heavy synthesis to `gpt‑oss:120b` (GPU Blackwell), with automatic fallback to local Node when over‑cap.  
- **Self‑healing fleet**: MCP server with 384 MiB hook heap cap, 4096 MiB spawn floor, maxConnections = 512, pressure‑code guards, and health‑watch (`fleet-task-health-watch.mjs`).  
- **Full‑cycle verification**: atomic stage+commit (`CLAUDE_SESSION_ID`), gap‑map audit, sidecar freshness RAM gate, and weekly synthesis resolver that re‑validates every galaxy’s memory sections.

---

## Shipped capabilities  

| Area | Commit / Engine | Core Feature |
|------|-----------------|--------------|
| **Resilience** | `B1 writeWithRetry (168c202646)` | Guarded `ensureDir/writeFileSync` with retry. |
| **Metadata** | `B2 index‑meta (ea21008f25)` | Auto‑stamp `last_verified`; regen‑wiki‑index‑meta.mjs. |
| **Cron / Tasks** | `B3 maint‑cron installers (8c4dff660a)` | Disabled Windows tasks for promote‑memory & vault‑rot sentinel. |
| **Scorer** | `C2 link‑heal scorer (984313825e + d948b85a74)` | Tier recalibration; autoApplyCount ↓ 33k→2; Levenshtein ≤ 2 gating. |
| **Tribal coverage** | `C3 tribal‑coverage refresh (838123429b)` | Coverage 83.7 %; stale banner cleared (31.5 %). |
| **RAG wire** | `9e4376b3b2` | Memory‑RAG inject hook wired. |
| **MCP capacity** | `43e1b8e449` | Hook heap cap 384 MiB; maxConnections 512; GPU offload widened. |
| **Fleet health** | `fleet-task-health-watch.mjs (3d796dcf5c)` | EXPECTED_UNREGISTERED_TASKS, aggregateHealth, WSL memory guard – 62/62 tests. |
| **Vault backlink** | `vault-backlink-schema.mjs (96ed5222e2)` | Normalized keys, sorted node‑ids, backlink records – 17 tests. |
| **Viz regen** | `regen-viz stage (0e2724871a)` | Auto‑refresh `vault-backlinks.json` on graph regen. |
| **Doc nodes dispatcher** | `14aba14e3a + 4a44b5393c` | Enum, case, schema wrapper – 14 tests. |
| **Canvas lib / CLI** | `canvas-read-lib.mjs & subcommands (2d49bf0d33)` | Added `canvas`, `canvas-doc`; staleness flag; Lgit regex fix – 15 tests. |
| **Narrative generation** | `U‑VIZ‑WIKI‑NARRATIVE (cd54edb940)` | Ollama “what/why” blurb for wiki→wiki entries. |
| **Ollama pipelines** | `U‑OLLAMA‑PIPELINE‑INJECTOR‑WIRE (7ec4a5ea02)`, `U‑OLLAMA‑PREWARM‑WIRE (65a29220e5)` | Local model routes `/rgs`, `/scrutinize`; prewarm. |
| **Memo throttle / user‑type** | `f1b69db664, 1ecf50b6be` | Per‑session throttle; correct transcript path; replace execSync curl with `callOllama`. |
| **Loop auto‑advance** | `U‑LOOP‑AUTO‑ADVANCE (c2045b3f5a)` | `next` injection, roll cap (`PRISM_LOOP_MAX_ROLLS`). |
| **Octopus probe panel** | `U‑OCTOPUS‑PANEL (c1b40183c1)`, `U‑OCTOPUS‑DIVERSE‑PROBE` | Capability probing, optional `runnableModelIds`. |
| **GNN edge predict core** | `U‑GNN‑EDGE‑PREDICT‑CORE / CLI / VIZ` | Pure‑JS scoring lib, candidate generator, visual report. |
| **India transcript miner** | `U‑MINE‑INDIA` | 84 sessions mined via Ollama; synthesis written to vault. |
| **Local generate bridge** | `prism_local:local_generate` | Added `num_ctx`, IPv6 localhost fix, fail‑soft routing. |
| **Speed‑feed calibration persist** | `SpeedFeedCalibrationPersistEngine (16d6eecef4)` | Persisted calibrations; unit tests. |
| **GPU judge engine** | `U‑GPU‑JUDGE (f31398a1a5)` | GPU residency probe, limit guard, silent exclusion note. |
| **Full sweep mode** | `runStreaming` generator (3a1c20fca2) | ≈69 k cells processed; cell‑cap removed. |
| **Axis‑awareness constants** | `constants.ts` updates (658c8280fe … 835df42c74) | Tool‑material, coolant, rigidity multipliers; safety guard. |
| **Vault front‑matter fix** | `fix-hookify-frontmatter.mjs` | Repaired 110 `.local.md` files, removed non‑ASCII. |
| **Dangling hook removal** | `remove-dangling-hook-refs.mjs` | Cleaned six dead module refs from `settings.json`. |
| **Unwired engines audit** | `audit-unwired-engines.mjs` | Identified 90 unwired engines (core, bridges, scaffolds). |
| **Ollama pull & synergy fix** | `c593b096fb` | Resumed stalled `gpt‑oss:120b`; GPU smoke test passed. |
| **MCP fixes** | `U‑MCP‑FIXSTART`, `U‑MCP‑BOOT‑HEAP‑FLOOR (6ca2f6afd2)` | Reap‑then‑start, 4096 MiB heap floor. |
| **Cost‑bridge wiring & margin‑floor gates** | `U‑Q P‑COST‑BRIDGE‑WIRING‑TRUTH`, `U‑Q P‑MARGIN‑FLOOR‑GATE` | Router consolidation; warn/bail on <20 % margin. |
| **Provenance gate** | `4c12a75a8d` | Blocks synthetic calibration factor promotion. |
| **Outbound price gate** | `U‑QP‑OUTBOUND‑PROMOTE‑GATE (d294957c4d)` | Fail‑closed alignment of sold‑price distribution. |
| **Sidecar freshness RAM gate** | `U‑SIDECAR‑FRESHNESS‑RAMGATE` | RAM‑gate on sidecar start; 15 tests. |
| **Galaxy synthesis refresh** | `galaxy-synthesis-refresh.mjs`, `brain-refresh.mjs` | Deterministic fill scripts, sharded tribal index writer (24 tests). |
| **Docker health CLI** | `docker-service-health-check.mjs` | 5/5 tests; guards fleet containers. |

---

## Key decisions + rationale  

- **Gap‑first verification** – run `gap‑map` audit before any build (R8) to avoid wasted wiring.  
- **Commit ordering B1→B2→…C3** – linearizes dependency chain, simplifies lane‑guard bypass (`PRISM_GIT_ADD_LANE_DISABLE=1`).  
- **Hook heap cap 384 MiB → spawn floor 4096 MiB** – prevents massive commit reservation (≈210 GB) while guaranteeing enough memory for MCP.  
- **MCP maxConnections = 512** – future‑proofing for high‑throughput fleet agents.  
- **Scorer gating** – require exact match or Levenshtein ≤ 2; demote prefix/substring to medium tier, cutting autoApplyCount from 33k to 2.  
- **Offloadable patterns widened** – include lint, classify, docstring, diff‑summary, triage → more work delegated to Ollama/Blackwell.  
- **Atomic stage+commit with `CLAUDE_SESSION_ID`** – ensures reproducible snapshots across galaxies.  
- **Backend‑first for speed‑feed** – fix data spine before closed‑loop comparison; use CPU calibration then GPU judge.  
- **Streaming generators (`runStreaming`)** – replace hard 50‑cell cap, enable full 69 k sweep without OOM.  
- **De‑inline physics constants** into `constants.ts`; apply via `alts.balanced.vc` to keep a single source of truth.  
- **Fail‑open guard for tribal index over‑cap** – shrink‑guard on write, abort with minimal stub instead of crash.  
- **Node heap `--max-old-space-size=8192`** – accommodates large sharded indexes (<150 MiB).  
- **Migration‑freeze marker** (`MIGRATION-FREEZE-ACTIVE.flag`) + partitioned `EXPECTED_DISABLED_TASKS` – isolates freeze‑related tasks without hard‑coding a static list.  
- **Router consolidation for cost‑bridge** – eliminates double execution and false “cry‑wolf” alerts.  
- **Source‑lock extension to dispatcher tree** – prevents accidental use of retired model defaults (`:3b`, `:7b`).  
- **Deterministic galaxy fill scripts** – avoid nondeterministic agent fan‑out; bound agents ≤ 4 per batch.  

---

## Standing operator directives  

- **Fill all gaps B1–C3** and verify vault/backlink integrity after each commit.  
- **Run `/startup‑<galaxy>` then `/loop [10m] /goal …`** for every galaxy (charlie, hotel, india, golf, etc.) until “all units wired, tested, validated”.  
- **Use Ollama for grunt work** – code generation (`qwen2.5-coder:32b`) and heavy synthesis (`gpt‑oss:120b`).  
- **Compact / handoff** when prompted; keep sidecar RAM gate active.  
- **Restart MCP daemon only after migration freeze cleared** (operator must issue `/restart-mcp`).  
- **Register vault crons post‑freeze** – ensure `EXPECTED_UNREGISTERED_TASKS` list is up‑to‑date.  
- **Monitor GPU offload coverage; aim for ≥ 30 %** of heavy tasks on Blackwell.  
- **Run weekly synthesis resolver** (`/weekly-synth-resolver`) to keep tribal index fresh.  
- **Execute `/checkin‑hotel`, `/startup‑hotel`** after persistence engine is wired.  
- **Trigger full sweep validation** (`/run-full-sweep`) once axis‑awareness constants are stable.  

---

## What is still to build (open threads)  

1. **Full‑corpus wiki‑link‑fix regeneration** – OOM; need streaming/chunked pipeline.  
2. **Scorer Levenshtein gating refinement** – tune threshold, add prefix/substring penalties.  
3. **MCP daemon restart & heap‑floor verification** post‑migration freeze.  
4. **Vault cron registration** (expected‑unregistered tasks).  
5. **WSL memory‑guard drift test** – ensure `.wslconfig` cap respected.  
6. **GPU offload expansion** – target ≥ 30 % coverage, add more Blackwell‑compatible engines.  
7. **Ollama usage optimizer** – route all cheap agents through `OllamaTaskOffloaderEngine`.  
8. **Canvas reader staleness detection** – refresh flag logic.  
9. **Wiki‑NLI lint & memo‑cache consolidation** (tasks #4, #6).  
10. **Unset/handle `num_predict` for 120 b model** in local generate bridge.  
11. **U‑OLLAMA‑FORGE‑ASSIST (Gap C)** – final integration.  
12. **Semantic reranker (Gap B) build** – cross‑galaxy ranking.  
13. **Complete GNN edge‑predict unit** (training, inference, viz).  
14. **Remove or restart `nim‑llama32‑3b` container** (resource hog).  
15. **Full sweep validation against vendor data** – add missing axes (controller, workholding, insert).  
16. **OCR catalog extraction for Kennametal & others** – vision pipeline, noise cleanup.  
17. **Qdrant tribal migration finalization** – sharding 33 k entries, stable queries.  
18. **Fleet‑task‑health EXPECTED_DISABLED_TASKS partition** – monitor freeze completion.  
19. **Unwired engine triage (90 engines)** – assign owner, wire or archive.  
20. **Charlie domain closed‑loop provenance & outbound gates** – build OCR bridge adapter (`U‑QP‑BLUEPRINT‑OCR‑BRIDGE‑ADAPTER`).  
21. **ERP/QuickBooks integration for AccountingHardeningEngine**.  
22. **Frontend UI refinements** (margin‑floor banner, quote analytics).  
23. **Rate‑limit back‑off implementation** for multi‑agent scrutiny.  
24. **OCR noise removal in `jm-sold-orders.json`** – enable outbound price gate.  

---

## How to build it (patterns / sequence)  

- **Gap‑first → atomic stage+commit**: run `gap‑map audit`, then `stage && commit --session $CLAUDE_SESSION_ID`.  
- **Bootstrap slot‑enforce** (`[BOOTSTRAP-SLOT-ENFORCE]`) for any shared‑tree edit; use lane‑guard bypass env var when needed.  
- **Deterministic fill scripts**: `fill-galaxy-memory-sections.mjs` → `galaxy-synthesis-refresh.mjs` → `brain-refresh.mjs`.  
- **Streaming large sweeps**: invoke `runStreaming` generator, pipe to `SpeedFeedCalibrationPersistEngine`, then to `GPU‑judge` (if `OFFLOADABLE_PATTERNS` matches).  
- **Fail‑open / shrink‑guard** for tribal index: on over‑cap parse emit minimal stub, log `OVER_CAP_SHRINK`.  
- **Ollama offload routing**: all cheap agents call `ask‑ollama.mjs`; heavy tasks go through `OllamaTaskOffloaderEngine` with model selector (`routeModelForTask`).  
- **Health watch loop**: `fleet-task-health-watch.mjs` runs every 5 min, updates `EXPECTED_UNREGISTERED_TASKS`, triggers `/compact` on pressure codes.  
- **MCP restart pattern**: `U‑MCP‑FIXSTART` → shutdown old daemon → spawn new with `--max-old-space-size=8192` and heap floor env.  
- **Qdrant migration**: `writeTribalIndex` → `loadShardedIndex` (shard size ≤ 150 MiB) → verify via `system-viz-query`.  
- **OCR pipeline**: `BlueprintOCREngine` → `cleanNoise` → feed into `CostBridgeEngine`.  

---

## Tools to use  

- **Dispatchers / Skills**: `doc_nodes`, `businessDispatcher.ts`, `speed_feed_dispatcher.ts`, `quoteEstimatorDispatcher`, `QpCostBridgeDispatcher`, `GnnEdgePredictDispatcher`.  
- **Hooks / Scripts**: `writeWithRetry`, `ensureDir/writeFileSync`, `fix-hookify-frontmatter.mjs`, `remove-dangling-hook-refs.mjs`, `audit-unwired-engines.mjs`, `fill-galaxy-memory-sections.mjs`, `galaxy-synthesis-refresh.mjs`, `brain-refresh.mjs`, `sidecar-freshness-ramgate.mjs`.  
- **System‑viz**: `fleet-task-health-watch.mjs`, `system-viz-query` (heap, pressure codes), `docker-service-health-check.mjs`.  
- **AI systems**: Ollama (`qwen2.5-coder:32b`, `gpt‑oss:120b`, vision models), Blackwell GPU offload, Claude session IDs.  
- **Vector store**: Qdrant collections (`prism_skills`, `prism_engines`, `prism_formulas`).  
- **Knowledge base**: Obsidian vault (`H:/prism/knowledge/memories` ≈ 12k md files).  
- **Container / Runtime**: Docker (health guard), WSL (`.wslconfig memory=16GB`, `wsl --shutdown`).  
- **Build & Test**: Vitest, node:test, tsc –noEmit, esbuild, Git lane‑guard env vars.  

---

## Recurring findings + bugs  

- **Unprotected file writes** → data loss (`ensureDir/writeFileSync`); fixed with `writeWithRetry`.  
- **Stale front‑matter / index metadata** (last_verified out of date).  
- **Scorer overconfidence** – autoApply on substrings; mitigated by Levenshtein ≤ 2 rule.  
- **OOM on full corpus scans** → streaming generators required; context‑window caps (~2000 chars) enforced.  
- **Hook heap mis‑configuration** caused ~210 GB commit reservation; capped to 384 MiB, later floor 4096 MiB.  
- **GPU offload low (≈8 %)** – added more Blackwell‑compatible engines.  
- **IPv6 localhost bug** in fetches → fixed to `127.0.0.1`.  
- **EPERM rename bugs** left orphan `.tmp` files; now atomic‑append + retry with cleanup.  
- **Dead module refs** in `settings.json`; removed via `remove-dangling-hook-refs.mjs`.  
- **Duplicate MCP daemons** → reaped by `U‑MCP‑FIXSTART`.  
- **Migration‑freeze static task list mismatch** – replaced with marker + dynamic partition.  
- **Retired model defaults still present** (`:3b`, `:7b`); source‑lock guard added.  
- **Rate‑limit errors** when >10 agents run concurrently; back‑off now enforced.  
- **Missing axes in speed‑feed calculations** (controller, workholding, insert) – flagged for wiring.  
- **OCR extraction failures & noise (`$1`)** → pending cleanup before outbound price gate activation.  
- **Frontend UI missing margin‑floor banner** – added via `U‑QP‑MARGIN‑FLOOR‑GATE`.  
- **TSC/Vitest OOMs** on large test suites; mitigated with increased Node heap and sharding.  

---

# ZULU MASTER CONTEXT LEDGER -- 2026-06-11

Executive summary: This ledger merges three miner passes (Miner 1 returned 61 classified items from zulu/india/sierra/tango/bravo/alpha session threads + git log since 2026-06-01; Miners 2 and 3 returned nothing, so the article and milestone/memory passes are empty and folded into the relevant sections from CLAUDE.md context). After dedup the open landscape is: A. TO-COMPLETE = 30 planned-never-started items, B. STARTED-UNFINISHED = 15 in-flight items (several are uncommitted git-status deltas at risk of loss), C. DONE-DORMANT-OR-UNWIRED = 16 shipped-but-not-fully-live items. The single highest-ROI recommendation: unblock Obsidian galaxy reflection (A-16/B-06) -- the per-galaxy `patterns/<galaxy>_synthesis.md` reflection job is the compounding arm for fleet-wide persistent recall AND the data source that powers the documented-by cross-substrate edges, and it is blocked only on the Ollama `/api/generate` keep-alive wedge (1-behind commit 24c14de4b1). Fixing that one wedge unblocks A-16, B-06, A-09 (AI-state in Obsidian), and B-11 (offload-rate lift) at once. Right behind it: commit the at-risk uncommitted git-status hooks (B-05/B-10/B-12/B-13/B-14) before they are lost, and grow the GNN ref-pool + H2GCN (A-07/A-08) for the only structural path to GNN full-coverage.

---

## RECONCILE UPDATE -- 2026-06-20 (slot:zulu; the A/B/C tables below are 9 DAYS STALE -- READ THIS FIRST)
> Run `node scripts/reconcile-zulu-ledger.mjs` for the live $0 probe. As of 2026-06-20:
> - **A-06 galaxy-brain-read = SHIPPED** (was reported phantom-OPEN by a reconciler WRONG-PATH bug, FIXED `d87070e367`: the probe checked `scripts/galaxy-brain-read.mjs` but the file is at `scripts/lib/`). Wired into `galaxy-reasoning-bridge.mjs`.
> - **A-13 / A-14 / Ollama-gen wedge / AI-synergy = SHIPPED** (ledger-stale; reconciler confirms).
> - **A-16 galaxy synthesis = CONTINUOUS cron** (live moving stale-count as the fleet adds memories; NOT a one-shot-to-zero). Refresh via `galaxy-synthesis-refresh.mjs --model qwen2.5-coder:32b` -- the gpt-oss:120b default gets REAPED on bulk sweeps (proven: 120b killed at 5/19, 32b completed exit 0).
> - **Octopus consensus = FUNCTIONAL but intentionally TRICKLE-drained** (`stop-consensus-drain.mjs --max=1` + fleet-wide process-lock = deliberate GPU protection, NOT a backlog bug; 49 queued drain slowly BY DESIGN -- do not "fix" throughput).
> - **A-04 consensus_ask = peer-owned**; A-01/07/08 = india GPU lane; A-21 orchestrator sweep = LIVE in dry-run (live actuation is operator-gated governance).
> - **obsidian-learning-revival** timeout-under-load now classified benign `deferred` not `failed` (`fec401d371`) -- kills the false "compounding loop did not run" SessionStart alarm.
> - **Ollama offload rate 17.9% < 30%** + bulk-synth-on-120b = alpha's token-optimization lane (R7 quality-vs-speed; do not unilaterally flip).
> NET: the TRUE-open in-lane zulu set is essentially EMPTY; zulu hunts any-domain or awaits operator governance on orchestrator live-actuation. Detail: `reference_zulu_revival_timeout_deferred_2026_06_20`.

---

## A. TO-COMPLETE (planned, never started)

| ID | Title | Source | ROI | Next action |
|----|-------|--------|-----|-------------|
| A-01 | U-TRAIN-GALAXY (WEDM LoRA fine-tune parametric run) | zulu.md:1 | high | Fix dataset_path (stale slot-worktree absolute path) at mcp-server/data/training/wedm-knowledge/lora-bundle/; stop Ollama (frees ~13.2GB VRAM); design execution-based eval scorer (not reward-model, mean_reward was negative); run train_wedm_lora.py |
| A-02 | U-FLEET-AI-BROADCAST (fleet-wide AI-output broadcasting) | zulu.md:1 | high | Spec broadcast schema in EventBus; wire WEDM AI output to prism_ai:broadcast action; coordinate with india for bus subscription pattern (consumer side of A-01) |
| A-03 | INFRA-AGI-ROUTER-MS2 (production AI router tier-2/3 wiring) | bravo.md 13/18/19/21/25; alpha.md 20/23/24/25/29/31/32 | high | Recurring next-item in 10+ threads, 0 shipped. Read INFRA-AGI-ROUTER-MS2 spec; build tier-routing dispatch table in prism_ai; connect FullSystemAICoordinatorEngine as Tier-2 hub |
| A-04 | INFRA-CONSENSUS-WIRE-MS0 (consensus wiring to all dispatchers) | bravo.md 18/19/21/22/23/25; alpha.md 25/29/31/32 | high | MultiModelConsensusEngine.ask() LIVE but per-dispatcher wiring incomplete. Generate consensus-of edges; wire prism_ai:consensus_ask to all 7 domain dispatchers |
| A-05 | U-NN-TIER05 / XPROC-NEURAL-OPTIMIZE-MS0 (neural cross-process optimization layer) | bravo.md 1/2 | high | Active /loop iter 8/20. Read XPROC-NEURAL-OPTIMIZE-MS0 spec; coordinate with india to avoid double-build of tier-5 infra (distinct from GNN tier-5) |
| A-06 | U-CLOSE-LOOP-BRIDGE consumer side (each galaxy READS the master brain) | india.md:3 | high | Producer SHIPPED; consumer NOT built. Design galaxy brain read API in prism_session/prism_memory; implement galaxy-brain-read.mjs; wire to all 34 galaxy CLAUDE.md startup hooks |
| A-07 | H2GCN integration into graphsage-trainer.mjs (heterophily fix) | india.md:1 | high | 0 heterophily-aware conv refs currently. Port H2GCN torch layers; multi-seed validation (>=3 seeds before claiming AUROC lift); GPU retrain via reaper-immune task |
| A-08 | Grow GNN ref-pool + GPU retrain (reaper-immune scheduled task) | india.md:1 | high | Run nn-graph-eval.buildHoldout against live graph; add high-confidence ghost nodes to ref-pool (currently 62 holdout); create install-nn-graph-gpu-retrain-task.ps1 (SYSTEM principal, --max-old-space-size=8192) |
| A-09 | AI-functionality-in-Obsidian (surface NN/GNN/LoRA/RAG/selective-deploy state as vault notes) | india.md:1 #11 | high | Extend scripts/mine-india-transcripts.mjs to emit Obsidian notes for NN/GNN/LoRA state; add note-emit path to stop-obsidian-memory-feed.mjs; wire ask-ollama RAG to retrieve synthesis |
| A-10 | ask-ollama.mjs codegen mode (U-P3-FORGE-OLLAMA-CODEGEN) | sierra.md:3 | high | Add `codegen` mode to scripts/ask-ollama.mjs (only viz/summarize/explain/triage/ask exist); integrate at /forge-triple seam; test on qwen2.5-coder:32b |
| A-11 | U-P1-QDRANT-EPISODIC-RECALL (Qdrant flaky episodic recall fix) | sierra.md:3 | high | Diagnose Qdrant at localhost:6333; implement circuit-breaker fallback to BM25 sidecar (pattern in memory-index-search-lib.mjs); add health check to SessionStart |
| A-12 | U-LLM-DEV-CORPUS + U-LLM-TRAINER (PRISM custom LoRA MVP / prism-dev adapter) | bravo.md:20 | high | Feasibility doc SHIPPED. Confirm operator greenlight; start U-LLM-DEV-CORPUS first (corpus from tribal/wiki/engine-digest, no GPU); target unsloth Qwen2.5-Coder |
| A-13 | consensus-of cross-substrate edge type materialization | CLAUDE.md CROSS-SUBSTRATE-SYNERGY-MS0 | high | 4th typed edge (3 shipped). Extend generate-cross-substrate-edges.mjs with consensus-of producer from MultiModelConsensusEngine ledger; add EDGE_TYPES.CONSENSUS_OF |
| A-14 | U-SLOT-TASK-CLAIM-DRIFT (VALID_SLOTS frozen at 12) | sierra.md:7 | med | slot-task-claim.mjs hardcodes 12 slots; fleet is 26. Replace hardcoded array with dynamic import of SLOT_NAMES from chat-slots.mjs; add test for slot 'zulu' (26) |
| A-15 | OBSIDIAN DREAM-CYCLE nightly task registration (operator-gated) | alpha.md:4 | high | install-hermes-dream-cycle-task.ps1 validated; operator runs it elevated; then set PRISM_WEEKLY_LLM_SYNTH=1 in fleet env |
| A-16 | B1 importance-triggered per-galaxy reflection (cluster reference_* -> patterns/<galaxy>_synthesis.md) | alpha.md:9 | high | THE compounding arm for Obsidian recall. Blocked on Ollama GENERATION wedge; fix = 1-behind commit 24c14de4b1 OLLAMA_KEEP_ALIVE + containerize; then run galaxy-scaffold-pt.mjs per galaxy |
| A-17 | U-NN-INTEG-03 + U-NN-INTEG-04 (ConsensusNeuralFeedbackEngine bus sub + ConformalCalibrationMonitor) | alpha.md:33 | high | In worktree H:/prism-nn-stack-integ. Apply DRY fix to File 1; build ConsensusNeuralFeedbackEngine.ts + CrossProcessConformalClassificationEngine.ts; per-file 2-reviewer between each; dispatcher round-trip tests |
| A-18 | U-ALL03 AutoResearchOrchestratorEngine (dep: U-ALL02 shipped) | bravo.md:38 | high | Fork to H:/prism-auto-learning-loop. Build rate-limited orchestrator (semaphore max-3, day-budget 12, queue persistence, prompt-injection sanitization, subagent timeout 15min); wire prism_ai:auto_research_dispatch |
| A-19 | U-P2PFS-HARNESS-WIRE (PrintToProgramRegressionHarnessEngine -> prism_cam) | alpha.md:22 | med | Engine exists, 0 wiring. Add print_to_program_regression_run(filter) + _run_one(id) to camDispatcher.ts + camActionSchemas.ts; integration test |
| A-20 | U-GAP-TRIBAL-KNOWLEDGE-GRAPH (tribal -> graph wiring, 994 LOC) | india.md:15 | high | Largest of 7 heavy-builds. Spec tribal->graph edge schema; extend merge-augmentations.mjs to include tribal-tip nodes; wire to tribe-by-domain-inject |
| A-21 | ZEBRA-ORCHESTRATOR-MS0 U-ZEBRA02 (main loop wiring CHO01+02+04 per slot) | bravo.md:16 | high | Backbone SHIPPED. Build scripts/zebra-orchestrator-sweep.mjs (5s stagger, JSONL log, AGENT_CHAT advisory, per-slot opt-in, dry-run 24h default, PRISM_ZEBRA_DISABLE kill switch); add zebraOptIn to chat-slots.json |
| A-22 | ZEBRA-ORCHESTRATOR-MS0 U-ZEBRA03/05 (scheduled task + priority routing) | bravo.md:16 | med | Blocked on A-21. Complete A-21 first |
| A-23 | ZEBRA-HERMES-GAPS wiki commit + CLAUDE.md regression entries | bravo.md:14 | med | Campaign COMPLETE (13/13 gaps), wiki entry UNCOMMITTED. Commit wiki entry; append 4 regression entries (G1b/G13/G5+G6/campaign) to CLAUDE.md; write reference_zebra_hermes_gaps_campaign memory |
| A-24 | U-CK02..U-CK05 (COMMAND-KERNEL-MS0 psk whoami/manifest/position/handoff syscalls) | bravo.md:30 | high | U-CK01 shipped. Implement cmdWhoami() resolving {sessionId,slot,branch,topic} from CLAUDE_CODE_SESSION_ID + chat-slots.json (no hardcoded wompu literals); per-file 2-reviewer each unit |
| A-25 | HERMES-MS2 (awareness ranking wired into zebra-orchestrator-sweep.mjs as primary picker) | bravo.md:15 | high | Substrate live (102 tests). Depends on U-ZEBRA02 (A-21); then scripts/zebra-awareness-run.mjs --rank feeds zebra sweep ranker |
| A-26 | /smart resolveExecutor() auto-fire wiring + reconcile 4 divergent /smart copies | alpha.md:1/2 | high | resolveExecutor() SHIPPED + wired into /smart Step 3.5. Glob .claude/commands/ for *smart*.md; replace step-routing with resolveExecutor() in each of 4 variants; test ollama-offload route |
| A-27 | ollama-loop-narrate wire into loop-state.mjs as cmdNarrate subcommand | alpha.md:3 | high | Design complete. Add cmdNarrate(flags) to loop-state.mjs (calls narrateIteration; stores narration + verdictMismatch honesty flag; async-capable, fail-soft); wire /loop to call narrate after each iter |
| A-28 | U-LLM-DEV-CORPUS / U-LLM-TRAINER (CLEANUP-MS0 B12 LedgerLoRAExporter nightly cron) | bravo.md:31 | med | Build scripts/ledger-lora-exporter-cron.mjs (exports bug_attribution rows in cam_lora_* schema to state/shared/lora-training/peer-audit-<date>.jsonl); add to golf cron; wire CLEANUP-MS0 B12 |
| A-29 | Q13 Hermes-Obsidian bridge repoint (operator-gated) | alpha.md:4 | high | Operator confirms; then remap HermesMemoryVaultEngine vault paths to Obsidian .base file locations (after HMEMV08 Bases shipped) |
| A-30 | docker batch-processor (>100 files) verify wired + operational post-Blackwell | CLAUDE.md AI SYSTEM ROUTING | med | Run docker ps; check PRISM batch-processor image tag; smoke-test >100-file corpus; fix any refs pointing at retired :3b/:7b/:14b model tags |

---

## B. STARTED-UNFINISHED (in-flight, abandoned)

| ID | Title | Source | ROI | Next action | Why stalled |
|----|-------|--------|-----|-------------|-------------|
| B-01 | HERMES-MEMORY-VAULT-MS0 active /loop iter 6/20 | HANDOFF-claude-4b1bbdf2-zulu-hermes-memory-v.md | high | /startup-zulu /loop [10m] /goal; read HERMES-MEMORY-VAULT-MS0 envelope for next concrete unit (L8-P0/P1/P2-MS2) | Loop paused mid-run at iter 6/20 after U-HMEMV03 + U-HMEMV08 committed; next units pending pickup |
| B-02 | PSN-OCTOPUS-FLEET-SYNERGY-MS0 Wave 3 per-galaxy corpus tuning | bravo.md:4; CLAUDE.md | high | Pick wedm corpus (highest domain-density); tune octopus loader leg weights per wedm tribal concentration; validate ledger grows | Build-once layer (P0-P6) shipped; Wave 3 per-galaxy work never started |
| B-03 | NN-STACK-INTEG-MS0 (MultiModelConsensusEngine -> FeedbackBus) | alpha.md:33 | high | cd H:/prism-nn-stack-integ; apply P1 DRY fix (extract resolvedSession const shared by persist+publish); re-dispatch Reviewer B; proceed to Files 2+3 | File 1 EDITED+UNCOMMITTED; Reviewer B was quota-blocked; stopped mid-unit |
| B-04 | RAG hybrid dense-arm fleet-wide backfill (U-DENSE-POOL-BACKFILL) | git 3f0a9aef11; CLAUDE.md | high | Run scripts/build-memory-embeddings-sidecar.mjs per galaxy lacking dense sidecar; verify embeddings_search returns for all 34 galaxy domains | Committed to main but 34-galaxy validation sweep not yet confirmed |
| B-05 | CAG cold-cache-anchor.mjs + test (modified, uncommitted) | git status | high | git diff .claude/hooks/cag-cold-cache-anchor.mjs; run test first; commit if complete | Both hook + test show modified/uncommitted; delta not read this session |
| B-06 | OBSIDIAN hybrid BM25+dense+RRF recall (A6 shipped) but B1 galaxy reflection BLOCKED | alpha.md:9 | high | Check Ollama health 127.0.0.1:11434/api/generate; apply keep-alive fix if wedged; run B1 reflection for all 34 galaxies | A6 shipped; B1 blocked on Ollama GENERATION wedge (commit 24c14de4b1) |
| B-07 | SYSTEM-VIZ-BRAIN-MS0 (22/26 shipped, envelope claims completed) | sierra.md:7 | high | node scripts/build-milestone-progress.mjs to identify the 4 unshipped units; regen-viz --full to confirm integrity; ship remaining 4 | Envelope drifted (says completed, real 22/26); 4 remaining units not explicitly identified |
| B-08 | ZEBRA-HERMES substrate LIVE but HERMES-MS2 not wired | bravo.md:15 | high | Ship U-ZEBRA02 first (A-21); then wire zebra-awareness-run.mjs output as zebra sweep ranker input | zebra-orchestrator-sweep.mjs itself not built (= A-21) |
| B-09 | NN feature separability study (DEFINITIVE NEGATIVE recorded, closure pending) | alpha.md:7; india.md:2 | low | Verify wiki lesson at knowledge/wiki/lessons/ for GNN-feature-separability definitive-negative; if absent write 1-page lesson | Committed (44702e0cac) but downstream lesson capture beyond commit not propagated |
| B-10 | docker-intel-autostart.mjs (modified, uncommitted) | git status | med | git diff .claude/hooks/docker-intel-autostart.mjs; commit or complete | Hook modified per git status; intent = autostart Docker at session boot; delta unknown |
| B-11 | FLEET-OLLAMA-ROUTING-MS0 wiki canon + LoRA trainingReady flip | git 5ffc77fb35 | med | node scripts/ollama-offload-dashboard.mjs; confirm offload rate >=30%; identify hooks routing to Claude instead of Ollama | Shipped but fleet-wide >=30% offload validation not confirmed |
| B-12 | mcp-http-bridge.mjs (modified, uncommitted) | git status | high | git diff .claude/helpers/mcp-http-bridge.mjs; if complete+tested commit immediately; if incomplete assess blast radius before revert | Gateway for ALL prism_* HTTP dispatcher access; uncommitted delta could break fleet dispatcher access |
| B-13 | mcp-tool-domains.mjs + test (modified, uncommitted) | git status | high | git diff .claude/helpers/mcp-tool-domains.mjs; run test; commit if green | Domain-routing table for prism_* dispatcher sharding; uncommitted with modified test |
| B-14 | handoff-memory-seed-stop.mjs (modified, uncommitted) | git status | high | git diff .claude/hooks/handoff-memory-seed-stop.mjs; run node --test if test exists; commit | Stop hook distills memory seed for next-session handoff; if broken the memory-seed injections go stale |
| B-15 | PRISM-SELF-AWARENESS via india awareness hook (U-INDIA-AWARENESS-HOOK-TRACK/WORKLIST) | git 81166fcb95 + 8016636bb6 | med | Check india-awareness-inject.mjs for zulu/hermes-memory-vault topic labels; add hermes-zulu galaxy to active-label list if missing | Awareness surfaces wired but per-slot zulu/hermes labels not yet in active-label worklist |

---

## C. DONE-DORMANT-OR-UNWIRED (built, not live)

| ID | Title | Source | ROI | Wiring/activation gap |
|----|-------|--------|-----|-----------------------|
| C-01 | PSN-OCTOPUS-FLEET-SYNERGY-MS0 build-once layer (P0-P6) SHIPPED | bravo.md:4; CLAUDE.md | n/a | Operational (ledger 9244B, knobs present). Live next step = Wave 3 per-galaxy corpus tuning (B-02) |
| C-02 | U-HMEMV03 temporal recall + U-HMEMV08 Obsidian Bases SHIPPED | HANDOFF; git d0c28a2d0e + a493e4ac0b | n/a | prism_memory:recall_as_of live (40/40), 8 .base pivot views; fully shipped, 3-of-3 PASS |
| C-03 | GNN tier-5 selective deploy AUROC 0.808 / minConf=0.7 SHIPPED (full-coverage DEFERRED) | CLAUDE.md NN-GRAPH; india.md:2 | n/a | Dormant at 32% coverage; lift requires ref-pool growth + H2GCN (A-07/A-08), NOT calibration (Murphy analysis proved dead end) |
| C-04 | U-NN-FEATURE-SEPARABILITY-CLOSE (definitive non-separable) SHIPPED | india.md:2; alpha.md:7 | n/a | Closed; tier-5 correctly dormant; only structural (H2GCN + ref-pool) can lift the text-feature path |
| C-05 | CROSS-SUBSTRATE-SYNERGY-MS0 owned-by-slot(82) + documented-by(320) + embeds(948) SHIPPED | CLAUDE.md | n/a | 3 of 4 typed edges materialized; consensus-of is the single remaining type (A-13) |
| C-06 | CHEAP-NODE-ACCESS-MS0 node-card offset index SHIPPED | CLAUDE.md | n/a | 301,185 cards, seekCard() O(1), prefetch hook wired; use node-card CLI instead of reading 548MB graph |
| C-07 | FLEET-OLLAMA-ROUTING-MS0 LoRA trainingReady wiki canon SHIPPED | git 5ffc77fb35 | n/a | Wiki wiring done; offload-rate validation is B-11 |
| C-08 | RAG dense-arm URL fix localhost->127.0.0.1 (U-RAG-DENSE-EMBED-127) SHIPPED | git 1a59c2233 | n/a | Dense arm now hits 127.0.0.1:11434 (IPv6 ECONNREFUSED root cause); hybrid BM25+dense+RRF operational |
| C-09 | prism_local:local_generate (U-LOCAL-GENERATE) SHIPPED | git e07e8011b | n/a | Routes any local-LLM prompt; available for A-09 Obsidian vault surfacing |
| C-10 | ALGO-SYNERGY goal COMPLETE (tango-solo) NOT to resume | tango.md:4 | n/a | Done; next algo work (Kabsch/P-square) needs domain-slot coordination, not solo tango |
| C-11 | ZEBRA-HERMES-GAPS campaign (13/13 gaps) CODE DONE, commit pending | bravo.md:14 | n/a | Wiki entry written but UNCOMMITTED; needs commit + CLAUDE.md append + memory write (A-23); if lost = bucket A |
| C-12 | U-SMART-EXECUTOR-CONTRACT resolveExecutor() core SHIPPED | alpha.md:1/2; git 51f3615975 | n/a | Core shipped (14 tests, wired /smart Step 3.5); 4-copy reconciliation is open work (A-26) |
| C-13 | PSN-SYNERGY-COLLECT-MS3 / U-NN-LEG-SCHEMA-READ-FIX SHIPPED | git f436b2c614 | n/a | classifyGnn reads canonical path; fabricated "embeddingSource mismatch" permanently closed; 81/81 |
| C-14 | Tribal index V8-cap fix + fail-loud clobber-guard + MANIFEST-AWARE shard guard SHIPPED | CLAUDE.md Recent regressions | n/a | 182788232a + a3e6d3ca97 + 8bf1873577 committed; buffer-safe load, >50% shrink block; re-embed in progress to restore 29K+ lost entries |
| C-15 | OBSIDIAN vault fully operational (2026-06-09) | reference_obsidian_fully_operational_2026_06_09.md | n/a | CAG-gated recall + master-index OOM fix + durable cron-runners + reverse mirror + vault-to-gnn-refpool + vault-to-lora-dataset wired; A-09 builds on top |
| C-16 | docker-intel-autostart.mjs hook exists + wired | git status | n/a | Base wiring in settings.json; uncommitted delta is the open item (B-10) |

---

## D. ARTICLES FED

| Title | Lesson | Applied? | Implied PRISM action |
|-------|--------|----------|----------------------|
| (none) | Miner 2 (articles fed) returned no content this pass. No new external articles to merge. | n/a | None this pass. Standing article-derived doctrine (Karpathy R1-R4, @Mnilax R5-R15, dunik 4-Layer memory, Bibryam context cascade, rody anti-fabrication) already lives in CLAUDE.md and is in force fleet-wide. |

---

## E. AI-SYSTEMS STATE (DL/NN/GNN/LoRA/CAG/RAG/GSD/agentic)

| System | Current measured state | Next lift |
|--------|------------------------|-----------|
| GNN (GraphSAGE tier-5) | Selective deploy SHIPPED: full-coverage AUROC 0.808, macro-F1 0.439, Brier 0.179 (below 0.78 gate at full coverage); at production gate minConf=0.7 -> emitted-set Brier 0.041, macro-F1 1.0, 32% coverage, robust. Calibration proven a DEAD END (Murphy reliability 0.0197 of 0.179). Text-feature path NOT separable (LOO 0.339 < 0.5). | Structural only: H2GCN heterophily layers (A-07) + ref-pool growth (A-08, currently 62 holdout nodes) + GPU retrain on SYSTEM-principal reaper-immune task with --max-old-space-size=8192. Multi-seed (>=3) before any AUROC claim. |
| LoRA | WEDM LoRA bundle exists (train_wedm_lora.py + requirements at lora-bundle/) but stale dataset_path + negative mean_reward eval. FLEET-OLLAMA-ROUTING trainingReady flipped to real wiki-data-backed. PRISM custom-dev LoRA feasibility doc SHIPPED. vault-to-lora-dataset.mjs wired (245/247 feedback memories). | A-01 (repoint dataset_path, execution-based eval, stop Ollama for ~13.2GB VRAM) + A-12 (U-LLM-DEV-CORPUS first, no GPU) + A-28 (LedgerLoRAExporter nightly cron). Target unsloth Qwen2.5-Coder. |
| RAG (hybrid retrieval) | Dense-arm URL fixed localhost->127.0.0.1 (C-08); hybrid BM25+dense+RRF operational; U-DENSE-POOL-BACKFILL committed to main (all-34-galaxy lift claimed). Obsidian hybrid recall A6 shipped (10892 int8 768-d vecs). | B-04 (per-galaxy dense sidecar backfill + 34-galaxy validation sweep) + A-11 (Qdrant circuit-breaker fallback to BM25 sidecar). |
| CAG (cold-cache anchor) | cag-cold-cache-anchor.mjs LIVE (cold-tier doctrine: claude-md/memory-md/engine-digest/dispatcher-digest/physics-constants/wiki-index per SessionStart); modified+uncommitted delta pending. | B-05 (diff + commit). Staged: node-card cold-tier skip for CHEAP-NODE-ACCESS. |
| Octopus / consensus | MultiModelConsensusEngine.ask() LIVE (ledger 522B->9244B, redact-secrets wired). Octopus->WeeklySynthesis wired (P5). | A-04 (wire consensus_ask to all 7 domain dispatchers) + A-13 (materialize consensus-of cross-substrate edge from ledger) + A-17 (ConsensusNeuralFeedbackEngine bus subscription). |
| Ollama offload | local_generate live; FLEET-OLLAMA-ROUTING wiki-canon shipped; offload-rate >=30% NOT confirmed; GENERATION endpoint (/api/generate) WEDGED (blocks B1 galaxy reflection). | Fix Ollama keep-alive wedge (commit 24c14de4b1 OLLAMA_KEEP_ALIVE + containerize) -- unblocks A-16/B-06/A-09; then B-11 (verify >=30% rate); A-10 (codegen mode). |
| Docker | docker-intel-autostart.mjs wired in settings.json; batch-processor (>100 files) path not smoke-tested post-Blackwell (:3b/:7b/:14b retired). | B-10 (commit autostart delta) + A-30 (smoke-test batch-processor, fix retired model-name refs). |
| Agentic / GSD-loops | ATCS file-system state machine behind /loop; ZEBRA-HERMES awareness substrate LIVE (102 tests); HERMES + zebra-awareness pipelines operational. Auto-learning loop: U-ALL02 NoveltyDetectionEngine shipped. | A-21/A-22 (zebra-orchestrator-sweep + scheduled task) + A-25 (HERMES-MS2 awareness ranking as primary picker) + A-18 (AutoResearchOrchestratorEngine rate-limited) + A-27 (ollama-loop-narrate honesty-flag into loop-state). |
| Obsidian persistent-memory (the stated goal) | Vault fully operational (CAG recall, master-index OOM fix, durable cron, reverse mirror); HERMES-MEMORY-VAULT temporal recall + Bases shipped; vault-to-gnn-refpool + vault-to-lora-dataset feeders wired. GAP: per-galaxy reflection synthesis blocked on Ollama wedge. | A-16/B-06 (galaxy reflection -- THE compounding arm) + A-06 (galaxy READS master brain consumer side) + A-09 (AI-state as vault notes) + A-15/A-29 (dream-cycle + Hermes-Obsidian bridge, operator-gated). |

---

## F. ROI-RANKED QUEUE (top 15)

Ranked by (impact x reach x confidence) / effort. Weighted toward items that compound Obsidian+Hermes persistent-memory / fleet-wide recall (the stated goal) and AI-systems lifts that compound (RAG/CAG/GNN/LoRA).

| Rank | Item | Bucket | Why it compounds | Rough effort |
|------|------|--------|------------------|--------------|
| 1 | Fix Ollama /api/generate keep-alive wedge (24c14de4b1) -> unblock A-16/B-06 galaxy reflection | A-16/B-06 | THE compounding arm: per-galaxy patterns/<galaxy>_synthesis.md feeds the documented-by cross-substrate edges, powers per-session recall, and reflection runs free on local LLM. One wedge fix unblocks A-16+B-06+A-09+B-11. | S (1 commit + run reflection job for 34 galaxies) |
| 2 | Commit the at-risk uncommitted hooks: mcp-http-bridge / mcp-tool-domains / handoff-memory-seed-stop / cag-cold-cache-anchor / docker-intel-autostart | B-12/B-13/B-14/B-05/B-10 | These are the dispatcher gateway, domain-routing table, and memory-seed substrate -- losing the uncommitted delta breaks fleet-wide dispatcher access AND next-session memory seeding. Zero new build; pure preservation of work already done. | S (diff + test + commit each) |
| 3 | A-06 U-CLOSE-LOOP-BRIDGE consumer side (each galaxy READS master brain) | A | Closes the closed loop: producer (octopus ledger + galaxy MEMORY mirror) is shipped; the consumer read API makes every galaxy's startup recall the master brain. Direct fleet-wide recall lift. | M (design read API + galaxy-brain-read.mjs + wire 34 startup hooks) |
| 4 | A-08 Grow GNN ref-pool + reaper-immune GPU retrain | A | The only path to GNN full-coverage (vs 32% selective). Ref-pool growth is the proven lever; SYSTEM-principal task survives reaper. Compounds every wiring-inference classification. | M (buildHoldout + add ghosts + install PS task) |
| 5 | A-13 consensus-of cross-substrate edge materialization | A | 4th/final typed edge; connects octopus consensus output directly to graph topology so consensus-resolved ghosts are queryable in system-viz. Completes CROSS-SUBSTRATE-SYNERGY-MS0. | S (extend generate-cross-substrate-edges.mjs from existing ledger) |
| 6 | A-09 AI-state (NN/GNN/LoRA/RAG/selective-deploy) as durable Obsidian notes | A | Surfaces live AI-systems state into the persistent brain so every session is aware without re-deriving. Compounds with #1 (reflection) and uses C-09 local_generate. | M (extend mine-india-transcripts + stop-obsidian-memory-feed emit path) |
| 7 | A-07 H2GCN integration into graphsage-trainer.mjs | A | The structural fix for GNN heterophily (text features proven non-separable). Pairs with #4; multi-seed validation required. Unlocks GNN full-coverage that calibration cannot. | L (port torch layers + multi-seed validation + GPU retrain) |
| 8 | B-04 RAG dense-arm fleet-wide backfill + 34-galaxy validation | B | Hybrid retrieval lift across ALL galaxies = fleet-wide recall quality jump; committed but unvalidated. Directly serves the stated recall goal. | M (run sidecar builder per galaxy + verify embeddings_search) |
| 9 | A-11 Qdrant circuit-breaker fallback to BM25 sidecar | A | Removes a flaky single-point-of-failure in episodic recall; pattern already exists in memory-index-search-lib. Makes higher-order memory-recall features reliable. | M (health check + circuit breaker + SessionStart wire) |
| 10 | A-21 ZEBRA-ORCHESTRATOR-MS0 U-ZEBRA02 main loop | A | Unblocks A-22, A-25, B-08 (the entire Hermes-awareness orchestration chain). Backbone shipped; this is the keystone sweep loop with kill switch. | M (build zebra-orchestrator-sweep.mjs + chat-slots schema field) |
| 11 | A-12 U-LLM-DEV-CORPUS (start before U-LLM-TRAINER) | A | Lowest-risk LoRA step (no GPU); builds the corpus from existing tribal/wiki/engine-digest. Compounds into a PRISM-native dev adapter. Operator greenlight needed. | M (corpus builder from existing assets) |
| 12 | A-26 /smart resolveExecutor() reconcile 4 divergent copies | A | Core shipped + wired; the 4 unreconciled copies silently bypass the executor, leaking Ollama-offload routing decisions. Fixing them propagates offload routing fleet-wide. | S (Glob + replace routing logic in 4 files) |
| 13 | A-27 ollama-loop-narrate -> loop-state cmdNarrate (verdictMismatch honesty flag) | A | Adds an honesty/self-check arm to every /loop iteration at near-zero cost (local LLM), surfacing verdict mismatches before they propagate. Compounds across all looping slots. | S (add cmdNarrate, async-capable, fail-soft) |
| 14 | A-04 INFRA-CONSENSUS-WIRE-MS0 (consensus_ask to all 7 dispatchers) | A | Makes multi-model consensus a first-class dispatcher action fleet-wide instead of a singleton; pairs with A-13. Raises answer quality on every domain dispatcher. | M (wire prism_ai:consensus_ask + per-dispatcher round-trip tests) |
| 15 | A-15 OBSIDIAN dream-cycle nightly task (operator-gated) | A | Nightly LLM dream-cycle pass continuously synthesizes the vault -- the autonomous compounding loop for persistent memory. Installer validated; just needs elevated registration + PRISM_WEEKLY_LLM_SYNTH=1. | S (operator runs PS installer + sets env knob) |


---

## G. MILESTONE STRATUM (deterministic extraction, 2026-06-11 -- fills the thrashed Miner-3 gap)

R5 deterministic envelope read (NOT an agent -- the stratum Miner 3 thrashed on). 28 AI/Hermes/Obsidian/NN/GNN/LoRA/Ollama milestones, 293 open units.

**R12 caveat:** many "claimed complete/in_progress but 0/N units done" rows are ENVELOPE-STATUS-DRIFT (work shipped per git/CLAUDE.md, per-unit status never flipped) -- NOT zero-work. Reconcile via `node scripts/build-milestone-progress.mjs` before flagging a milestone un-built.

**Genuinely-open large AI-systems surfaces:** AI-STACK-PER-DOMAIN-MS0 (104 units, the biggest), LATHE-LORA-MS0 (50), HERMES-CAPABILITY-EXPANSION-MS0 (16), HERMES-MCP-PLUGIN-INVENTORY-MS0 (14), HERMES-AGI-ARCHITECTURE-MS0 (12 SAFETY-CRITICAL), MS-P5-GNN (6), MS-P4-DL-CORE (5).
**In-progress (real partial):** HERMES-MEMORY-VAULT-MS0 7/11 (this pass HMEMV03+08; remaining HMEMV07/09-tribal/10/11), HERMES-MASTER-ORCHESTRATOR-MS0 6/11 (U-HMO-AUTO-FANOUT).

| milestone | claimed | done/total | derived |
|---|---|---|---|
| AI-STACK-PER-DOMAIN-MS0 | in_progress | 0/104 | not_started_real *(drift)* |
| LATHE-LORA-MS0 | in_progress | 0/50 | not_started_real *(drift)* |
| DOMAIN-GALAXY-DOCTRINE-MS1 | complete | 0/26 | not_started_real *(drift)* |
| HERMES-CAPABILITY-EXPANSION-MS0 | not_started | 0/16 | not_started_real |
| HERMES-MCP-PLUGIN-INVENTORY-MS0 | not_started | 0/14 | not_started_real |
| HERMES-AGI-ARCHITECTURE-MS0 | not_started | 0/12 | not_started_real |
| KNOWLEDGE-WIKI-MS0 | planned | 0/10 | not_started_real *(drift)* |
| WEDM-AI-DEEP-MAX | complete | 0/10 | not_started_real *(drift)* |
| CADCAM-DAGI-MS0 | complete | 6/14 | in_progress_real *(drift)* |
| S-LORA-DOMAIN-STACK-MS0 | pending | 0/7 | not_started_real *(drift)* |
| MS-P5-GNN | not_started | 0/6 | not_started_real |
| HERMES-MASTER-ORCHESTRATOR-MS0 | in_progress | 6/11 | in_progress_real |
| MS-P4-DL-CORE | not_started | 0/5 | not_started_real |
| GPU-OFFLOAD-MAXIMIZE-MS0 | in_progress | 0/4 | not_started_real *(drift)* |
| HERMES-MEMORY-VAULT-MS0 | in_progress | 7/11 | in_progress_real |
| LOCAL-LLM-MS0 | complete | 0/4 | not_started_real *(drift)* |
| OBSIDIAN-MS0 | complete | 0/4 | not_started_real *(drift)* |
| NN-STACK-INTEG-MS0 | complete | 0/3 | not_started_real *(drift)* |
| CADCAM-DEEPAGI-MASTER | not_started | 0/1 | not_started_real |
| BLUEPRINT-OCR-TRAINING-MS1 | completed | 8/8 | completed_real |
| CAM-ML-CLOSEDLOOP-MS0 | not_started | 0/0 | n/a |
| COMBO-EFFICIENCY-MS0 | not_started | 0/0 | n/a |
| FLEET-REAPER-MS1 | completed | 6/6 | completed_real |
| GRAPH-OCTOPUS-AUTOWIRE-MS0 | completed | 17/17 | completed_real |
| HITL-OPERATOR-UI-MS24 | not_started | 0/0 | n/a |
| KNOWLEDGE-VAULT-MS0 | not_started | 0/0 | n/a |
| MS-DOCFLOW | not_started | 0/0 | n/a |
| TWIN-SIM-GATE-MS23 | not_started | 0/0 | n/a |


---

## D. ARTICLES FED (live-chat direct mine, 2026-06-11)

Sourced by grepping author-handles across knowledge/wiki + specs (the agent fan-out rate-limited -- org throttle from 10 parallel Sonnet miners, per feedback_workflow_concurrency_and_local_routing; this is the bounded live-chat mine). Alpha already cataloged a fuller ARTICLES-FED set in its galaxy MEMORY.md (alpha-context-retention-u-alpha-sonnet-mine-synth).

| Author/Source | Article | Lesson | Applied? | Evidence / implied action |
|---|---|---|---|---|
| akshay_pachaar (2026-05-19) | RAG vs CAG clearly explained | cache-augmented gen for static doctrine | YES | CAG-router built from it (cag-router.md:17) |
| dunik_7 (2026-05-25) | Give Your Claude Agent a Memory: 4 Layers | tiered memory layers | YES/partial | 4-layer pattern in tiered memory; H2 unit needs operator tweet-paste (X-blocked) |
| cyrilXBT (2026-05-22) | Link Notes in Obsidian | MOC + connection/gap-finder + unlinked-mentions | YES | PSN-ENHANCE-MS0 (moc-psn, connection-finder, moc-gaps, unlinked-mentions) |
| cyrilXBT (2026-05-07) | Obsidian article (delta) | vault linking | YES | reference_cyrilxbt_obsidian_article_delta |
| cyrilXBT | bidirectional vault | H->C reverse mirror | YES | h-to-c-obsidian-mirror.mjs (HMEMV04) |
| cyrilXBT | 12 MIT-Press AI/ML textbooks | AI corpus | YES | ACADEMY-CORPUS-MS0/U-A2 registered |
| Boris Cherny | Claude Code workflow | loop/agent doctrine | YES | spec-boris-loop-agent-doctrine.md |
| Bibryam | context cascade / large codebase | per-galaxy sentinel CLAUDE.md | YES | DOMAIN-GALAXY-DOCTRINE galaxy cascade |
| Thariq | HTML companion pattern | SVG-matrix audit dashboards | YES | mdToHtml + audit HTML companions |
| darkzodchi | viz agent layer | U-VIZ-AGENT-LAYER | YES | system-synergy audit H3 |
| Mnemosyne | temporal/point-in-time memory | recall-as-of belief query | YES | HMEMV03 recall_as_of shipped THIS session |
| Akshay/Shann/Simback | Hermes trilogy | Hermes agent memory/recall (the current goal subject) | PARTIAL | HERMES-MEMORY-VAULT-MS0; HMEMV01-09 shipped (03/08 this pass); remaining 07/10/11 |
| Humza Khalid | Obsidian 2nd-brain | low-token vault protocol | verify | reference_humza_khalid_obsidian_article_2026_06_08 |

**NOT-APPLIED article-derived asks (from alpha catalog -- the actionable gaps):** semantic-cache, targeted-compact, agent-team-cap, lazy-skill-body, cache-breakpoint-sweeper, CLAUDE.md<=200-lines.

COUNTS: ~13 articles found; ~11 applied / 1 partial (Hermes trilogy, in-progress via HMEMV) / 6 never-built derived asks.

---

## H. RECONCILIATION (2026-06-11T19:21Z, slot:zulu -- evidence-verified, re-runnable)

> **The fleet ships faster than this ledger is curated.** A re-runnable deterministic reconciler
> (`scripts/reconcile-zulu-ledger.mjs`, 15/15 tests, sidecar `ZULU-LEDGER-RECONCILE-LATEST.json`)
> probed every checkable claim. **5 of 7 "OPEN" items were already SHIPPED** -- the ROI queue above
> was routing the fleet at phantom-blocked work. Re-run anytime: `node scripts/reconcile-zulu-ledger.mjs`.

| Item | Ledger said | **Verified** | Evidence (probe) |
|------|-------------|--------------|------------------|
| #1 ROI / E. Ollama wedge | blocked (gates A-16/B-06/A-09) | **SHIPPED** | `/api/generate` OK ~190ms -> "READY" (india keep-alive fix `e5f29a5df` cleared it) |
| A-13 consensus-of edge | "single remaining type" | **SHIPPED** | `EDGE_TYPES` has consensus-of (4 types); generator L554, `U-XSUB-CONSENSUS-OF` slot:sierra |
| A-16 galaxy reflection | blocked on Ollama | **SHIPPED** | 35 synthesis files, all fresh <24h (stalest 16h) |
| A-14 slot-task-claim VALID_SLOTS | "frozen at 12" | **SHIPPED** | imports dynamic `SLOT_NAMES` from chat-slots.mjs (L35/52) |
| AI-synergy (all galaxies) | "improve weak" | **SHIPPED** | AI-SYNERGY-AUDIT mean=1, weak galaxies=0 (34/34 strong) |
| A-06 galaxy READS master brain | open (#3 ROI) | **OPEN (real)** | no dedicated `galaxy-brain-read.mjs`; injectors read galaxy-LOCAL synthesis, not the master brain |
| A-04 consensus_ask -> 7 dispatchers | open | **UNKNOWN (peer-owned)** | `infra-consensus-wire` handoff present; per-dispatcher wiring, verify manually |

**Corrected ROI queue (the TRUE remaining-open set, highest leverage first):**
1. **A-06** -- dedicated `galaxy-brain-read` consumer API (each galaxy startup reads the *master* brain, not only its own synthesis). The only fully-open, in-lane (zulu/bravo) compounding item. *(Note: partial master-context already injected via cross-galaxy cards; A-06 is the dedicated read API.)*
2. **A-09** -- AI-state (NN/GNN/LoRA/RAG/selective-deploy) as durable Obsidian notes (uses C-09 `local_generate`; Ollama now confirmed healthy, so unblocked).
3. **A-01 / A-07 / A-08** -- WEDM LoRA run + H2GCN heterophily layers + GNN ref-pool growth. **india GPU lane** (coordinate; not zulu-buildable -- needs GPU + multi-seed).
4. **A-04** -- consensus_ask dispatcher wiring. **peer-owned** (`infra-consensus-wire`); do not double-build.
5. **A-21** -- zebra-orchestrator-sweep.mjs keystone (unblocks A-22/A-25/B-08). Governance-gated.

**Lesson (master-brain doctrine):** a hand-curated task ledger is a *snapshot*; on a fleet shipping dozens of commits/hour it rots in hours and mis-routes the fleet at phantom-blocked work. Reconcile against deterministic artifact/health probes ($0 local) BEFORE trusting the ROI order. The reconciler is the loss-function form of "keep the brain's task-truth current." See [[reference_zulu_ledger_reconciler_2026_06_11]] + wiki [[zulu-ledger-reconciler]].

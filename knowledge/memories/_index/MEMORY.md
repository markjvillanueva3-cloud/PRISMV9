# PRISM Project Memory
## Last synced: 2026-05-26 (U-MWO02 — Recent work overflowed to state/shared/MEMORY-RECENT.md)

## Primary Roadmap
**File:** `C:\Users\wompu\.claude\plans\sleepy-chasing-prism.md` — the ONLY roadmap. Ignore old phase docs (R15, etc.) in `data/docs/roadmap/`.

## Omega Target
Omega = 1.0 for ALL milestones. Not 0.75.

## Working Mode
- YOLO autonomous; auto-commit each unit. Commit format: `[SCOPE]/U-ID: title`.
- ALWAYS BUILD: never skip, logical order, comprehensive route (no shortcuts) — `feedback_always_build.md`, `feedback_build_in_logical_order.md`.
- Max token efficiency: parallelize independent tool calls, RTK-prefix bash.

## Key Counts
Read `PRISM-INVENTORY-LATEST.md` (live).

## Architecture
- MCP: `H:\prism\mcp-server\` · build: `npm run build` (tsc+esbuild, 16GB heap) · fast: `npm run build:fast`
- Tests: `npx vitest run` · Web: `mcp-server/web/` · State: `mcp-server/data/state/` (HEALTH_CHECK_REPORT.json, BASELINE_INVENTORY.json)

## PRISM SYSTEM MAP (always-loaded core)
- **Purpose** — PRISM is a manufacturing-intelligence platform: print-to-program (CAD/blueprint in → physics-optimized CNC G-code out) across mill/lathe/wire-EDM. CLAUDE.md §EXPERT ROLE + §DOMAIN-PIPELINE-MS0.
- **What's built / building** — read `PRISM-INVENTORY-LATEST.md` (live counts) + `state/shared/BUILD_STATE.md` (built/needs-wiring/pending/frontend) + `state/shared/specs/ROADMAP-CONSOLIDATED.md` (5826-item master remaining-work set). CLAUDE.md §CANONICAL SOURCES.
- **/system-viz** — visual 3D system map + search surface; PRISM's canonical task/roadmap tracking surface (ghost roosts render every remaining unit). CLAUDE.md §MASTER INDEX; `reference_system_viz.md`.
- **Obsidian memory = the persistent brain/OS** — this memory namespace IS PRISM's cross-session brain; auto-fed every Stop by `stop-obsidian-memory-feed.mjs`. CLAUDE.md §Doc reflection rule; `feedback_auto_memory_feeds_obsidian_stophook.md`.
- **wiki + tribal injection** — `knowledge/wiki/` (Karpathy LLM-wiki, query before re-deriving); `tribal-by-domain-inject` surfaces top-3 tribal hits by slot domain. CLAUDE.md §WIKI PROTOCOL; `reference_tribal_by_domain_inject.md`.
- **Master-index search-first** — hit the unified index before Grep/Glob/Agent; auto-injects top-5 hits per UserPromptSubmit. CLAUDE.md §MASTER INDEX + AWARENESS STACK.
- **Auto-compaction + session-continuity** — precompact handoff auto-write on /compact, terminal-pin keeps the slot, auto-resume continues across compact. CLAUDE.md §SESSION CONTINUITY STACK.
- **Chat-slot system** — 26 NATO slots (alpha..) + SLOT-RECLAIM (post-/compact a chat force-reclaims its terminal slot). CLAUDE.md §PER-CHAT HANDOFF; `reference_slot_reclaim_2026_05_19.md`.
- **golf slot** — the permanent fleet-reaper + fleet-hygiene/orchestration slot. CLAUDE.md §GOLF SLOT + §FLEET-REAPER; `feedback_golf_owns_reaper.md`.
- **Internal PRISM AI routing** — `aiSystemRouterEngine.route()`, Ollama local-LLM offload, prism_* MCP dispatchers (calc/cam/ai/safety/dev/memory). CLAUDE.md §AI SYSTEM ROUTING + §MCP DISPATCHERS.
- **PRISM neural network** — GraphSAGE GNN as tier-5 of the wiring-inference cascade (UNKNOWN ghost-node → dispatcher classification). CLAUDE.md §NN-GRAPH-MS0/MS1/MS2.
- **Impact awareness + mistake-learning** — upstream/downstream blast-radius via /impact + master-index; error-pattern capture → unified ledger → memory auto-feed. CLAUDE.md §`/checkin-<nato> /loop` §5; `feedback_always_capture_lessons.md`.

## Indexed memories
> Older index entries are archived to [MEMORY-ARCHIVE.md](MEMORY-ARCHIVE.md) — discoverable, read on demand. This index keeps the most recent.

### Galaxy brain back-pointers (master-index edges → per-domain brains)
> The master→galaxy discovery edge (CONN-4 in `state/shared/specs/MASTER-BRAIN-TEMPLATE.md`). Each slot appends ONE row here via galaxy-buildout STEP 5d so the master index is never blind to a per-domain brain. Alpha owns this registry (Obsidian-brain domain owner, 2026-05-28).
> Federation feed-up: `galaxy-cards/MASTER-DIGEST.md` (ranked 34-card digest — inject 1 vs 34 brains) + `KNOWS-MAP.json` + `INDEX.json`. [[reference_galaxy_context_federation_viz_roost_2026_06_01]]
### This PC — DESKTOP-N7MI1VB config (2026-05-28)
### Canonical order flow (locked 2026-05-27)
### JM Die shop floor facts (2026-05-27)
### CAM corpus map (kilo, 2026-05-27)
### SFC domain map (oscar, 2026-05-27)
### Wire-EDM domain atlas (for mike slot, all wire-machining work)
### Blueprint / OCR / CAD-file-reading atlas (fleet — kilo, delta, echo, foxtrot, oscar, whiskey, mike)
### Standing doctrine (feedback_*)
### Mill-domain atlas (for foxtrot slot, all mill-machining work)
### Recent work (reference_*) — moved out for size discipline (U-MWO02, 2026-05-26 slot:bravo)
> The chronological list of recent reference memories lives in `H:/prism/state/shared/MEMORY-RECENT.md` (~67 entries, periodically pruned). Per the dunik 4-Layer rule ("keep the file lean") and Hermes' 2.2 KB MEMORY.md cap, this index keeps only standing doctrine and the system map. For any topic search semantically via `memory_search "<query>"`; per-file memories at `C:/Users/wompu/.claude/projects/H--prism/memory/reference_*.md` remain authoritative and unchanged.
> Index entries are ≤140-char pointers; detail lives in the linked files. Size watchdog: scripts/memory-size-watch.mjs (24576-byte truncation ceiling). Per-file memories: 641 in C:/auto-memory; mirror at H:/knowledge/memories.
- [galaxy:token-optimization] mcp-server/src/engines/token-optimization/MEMORY.md — token-economy + efficiency + Obsidian-brain ownership; first compliant exemplar of MASTER-BRAIN-TEMPLATE (slot:alpha, 2026-05-28)
- [galaxy:hermes-zulu] mcp-server/src/engines/hermes-zulu/MEMORY.md — Hermes/Zulu agent-fleet orchestration + per-slot souls + stub-hunting; completed alpha scaffold, corrected 3 asset-hallucination errors (slot:bravo, 2026-05-28)
- [galaxy:business] mcp-server/src/engines/business/MEMORY.md — ERP/HR/accounting/CRM/quote-to-ship; financial-invariant + PII discipline (slot:hotel). STATE->[[reference_hotel_domain_status_2026_06_10]] (NETPLAT wired; QB-PARITY done; next=seed JM customers)
- [galaxy:quoting] mcp-server/src/engines/quoting/MEMORY.md — print-to-quote + multi-process quote routing + quote-vs-actual reconciliation + DocuStrata pricing; 78 cost/quote engines, QUOTING-SYNERGY-MS0 iter9-59 (slot:charlie, 2026-05-28)
- [galaxy:post-processor] mcp-server/src/engines/post-processor/MEMORY.md — CAM→controller G-code emission + dialects + MasterPost product + JM .cps fleet; 14-controller AGI surface, 8 stub-wired engines mapped (slot:echo, 2026-05-28)
- [galaxy:mill] mcp-server/src/engines/mill/MEMORY.md — mill galaxy (~222 engines, prism_mill 49 actions, JM Die VMC-01..05); recovered from cad-fusion-live-ms0 + connected to master brain (slot:foxtrot, 2026-05-28)
- [galaxy:speed-feed] mcp-server/src/engines/speed-feed/MEMORY.md — SFC physics core (Kienzle/Taylor/Merchant/Altintas SLD); 9-axis orchestrator + 3 modes, 401-assert gauntlet, 41K-tool HSMAdvisor/G-Wizard vendor parity (slot:oscar, 2026-05-28)
- [galaxy:ai-training] mcp-server/src/engines/ai-training/MEMORY.md — full-system AI training: GraphSAGE GNN tier-5, ~95 LoRA engines, RAG corpus, closed-loop outcome backbone; corrected ~6 alpha-hallucinated paths + realigned india soul off post-processor (slot:india, 2026-05-28)
- [galaxy:cad] mcp-server/src/engines/cad/MEMORY.md — CAD: feature-recognition + STEP AP242 round-trip + electrode/trilobe gen; 75/75 engines wired (cad_atomic_ops + cad_creo_ribbon), [[cad-knowledge-index]] (compiled wiki+tribal+GSD+corpus-paths), [[cad-corpus-paths]] (129K files/seats/launchers), custom delta-cad-awareness-inject hook + cad-step-lint guard (slot:delta, 2026-05-29)
- [galaxy:cam] mcp-server/src/engines/cam/MEMORY.md — CAM toolpath strategy + generation + validation + cross-vendor transfer; 60+ CAM*.ts + hyperMILL family, 6 tier-1 bridges, prism_cam triad (cam_strategy_recommend→toolpath_generate→collision_check_full) (slot:kilo, 2026-05-28)
- [galaxy:academy] mcp-server/src/engines/academy/MEMORY.md — PRISM Academy: courses/curriculum/lessons/MIT-OCW/certification/instructor; 16 academy engines (5 dispatcher-unwired), course-0a..60 (63 ids, 3-leg complete), 3-leg ship contract, custom academy-awareness.mjs (🟢9/🔴1-tribal/⚪1), pypdf 8,752-page corpus (slot:lima, 2026-05-29)
- [galaxy:frontend-app] mcp-server/src/engines/frontend-app/MEMORY.md — frontend web app + future phone app; Next.js 15 App Router / React 19 / TanStack Query / Zustand / Recharts / Tailwind, ~18 routes under mcp-server/web/app; pure consumer of all prism_* dispatchers via lib/api.ts → HTTP bridge port 3100; 3 PSN legs were GAP (wiki/memory/tribal — seeded this buildout), 2 pending merges (cqask/ui, mcp-cadquery/frontend) (slot:quebec, 2026-05-28)
- [galaxy:lathe] mcp-server/src/engines/lathe/MEMORY.md — Lathe Wizard: physics-first safety (G50/CSS, chuck-jaw); ~238 engines + turningDispatcher; +5 DB actions wired; self-improving AI wires to india substrate (slot:whiskey 2026-05-29)
- [galaxy:fleet-hygiene] mcp-server/src/engines/fleet-hygiene/MEMORY.md — fleet reaper + orphan/zombie reaping + chat-slot hygiene + GPU/Ollama coordinator; sweep/memory-monitor/task-health watchdogs, ancestry-confirmed-orphan rule (slot:golf, 2026-05-29)
- [galaxy:discovery] mcp-server/src/engines/discovery/MEMORY.md — algorithm/engine/pipeline discovery + anti-duplication (DuplicationGuard THROWS) + master-index search-first + coverage/orphan audits (slot:tango, 2026-05-29)
- [galaxy:system-viz] mcp-server/src/engines/system-viz/MEMORY.md — system-viz upgrades/integration/utilization: regen-viz ONE-canonical-writer of the 548MB graph, ~48 ghost-roost generators (FAST[]+splice dual-reg), GNN tier-5 ref-pool feed, the graph IS the fleet search substrate; completed+owned alpha scaffold, corrected stale hook/script names + added PATHS/TOOLBELT/master-brain-link (slot:sierra, 2026-05-29)
- [galaxy:wedm] mcp-server/src/engines/wedm/MEMORY.md — Wire Wizard: WEDM = PRISM's deepest domain; brain center + 15 cited discharge gotchas; synergy gaps = AI-router/OS/algorithms (slot:mike, 2026-05-29)
- [galaxy:blueprint-vision] mcp-server/src/engines/blueprint-vision/MEMORY.md — OCR + blueprint + multi-print-PDF split + CAD-file extraction; ~30 engines, cadDispatcher ~40 actions; fixed 21 phantom seed engine names (slot:xray, 2026-05-29)
- [galaxy:database-expansion] mcp-server/src/engines/database-expansion/MEMORY.md - all persistence stores (Qdrant/AgentDB/SQLite-WAL/JSONL/state-JSON); ~18 engines, prism_memory primary; atomic-write+schema-version+migration discipline; found 46x tmp-orphan leak (~16GB) + realigned soul off speed-feed (slot:juliett, 2026-05-29)
- [galaxy:agent-orchestration] mcp-server/src/engines/agent-orchestration/MEMORY.md — orchestrates all galaxies + model routing (golf 5-29)
- [galaxy:wiring] mcp-server/src/engines/wiring/MEMORY.md — engine→dispatcher wiring closure, romeo (golf 5-29)
- [galaxy:bug-hunting] mcp-server/src/engines/bug-hunting/MEMORY.md — silent-no-op + route-verify, uniform (golf 5-29)
- [galaxy:backend-helper] mcp-server/src/engines/backend-helper/MEMORY.md — build/TSC assist every slot, papa (golf 5-29)
- [galaxy:dormant-data] mcp-server/src/engines/dormant-data/MEMORY.md — dormant/orphan-data ledger, victor (golf 5-29)
- [galaxy:compliance-safety] mcp-server/src/engines/compliance-safety/MEMORY.md — S(x) gate+alarm+compliance (golf 5-29)
- [galaxy:quality] mcp-server/src/engines/quality/MEMORY.md — Cpk/SPC gates for mill/lathe/wedm+business (golf 5-29)
- [galaxy:shop-floor] mcp-server/src/engines/shop-floor/MEMORY.md — live machine status → adaptive+ERP (golf 5-29)
- [galaxy:knowledge-conversion] mcp-server/src/engines/knowledge-conversion/MEMORY.md — MIT+monolith → 6-node router (golf 5-29)
- [galaxy:corpus-aggregation] mcp-server/src/engines/corpus-aggregation/MEMORY.md — pdf+mit+tribal → academy/NN (golf 5-29)
- [galaxy:mit-curriculum] mcp-server/src/engines/mit-curriculum/MEMORY.md — MIT-OCW course source corpus (golf 5-29)
- [galaxy:pdf-corpus] mcp-server/src/engines/pdf-corpus/MEMORY.md — pypdf 8,752-page extraction corpus (golf 5-29)
- [galaxy:pdf-corpus-mill] mcp-server/src/engines/pdf-corpus-mill/MEMORY.md — mill PDF extraction Haas/Mazak (golf 5-29)
- [galaxy:tribal-knowledge] mcp-server/src/engines/tribal-knowledge/MEMORY.md — tribal-tip store, all emit/consume (golf 5-29)
- [galaxy:cad-fusion-live] mcp-server/src/engines/cad-fusion-live/MEMORY.md — long-running CAD/Fusion session pattern (golf 5-29)
- [OneDrive desktop redirect + fleet launcher location](reference_this_pc_onedrive_desktop_2026_05_28.md) — Windows shows `C:\Users\wompu\OneDrive\Desktop` as Desktop (NOT local…
- [Order flow canonical](reference_order_flow_canonical_2026_05_27.md) — Fusion CAD (delta) → hyperMILL CAM mill (echo) + Fusion/Mastercam CAM lathe pick-feature-packed (echo/india). Operator-locked.
- [Shop floor speaks Polish + Spanish (project)](project_jm_die_shop_floor_languages.md) — Majority of JM Die operators are Polish/Spanish-primary, not English-first. Operator-facing…
- [Delta seat-UI knowledge](reference_delta_cad_ui_seat_knowledge_2026_06_12.md) — Fusion/hyperMILL/Mastercam UI nav hard-coded; Fusion API unit=cm (2.54 trap); :18365 navigate-by-reference
- [CAM corpus locations](reference_cam_corpus_locations.md) — Every CAM asset path on H: (Mastercam X8 + hyperMILL 31/33 + OPEN MIND E-Learning + JM Die in-house). Read BEFORE webscraping CAM samples.
- [3 critical resource roots — all galaxies wired](reference_critical_resource_roots_2026_05_30.md) — H:/PRISM/{resources,JM DIE,Docustrata} wired into all 34 galaxy PATHS.md via canonical registry…
- [SFC domain map](reference_oscar_sfc_domain_map_2026_05_27.md) — Every engine/algorithm/data/wiki/tribal/dispatcher/skill/bridge file related to Speed-Feed Calculator. Path + 1-line role…
- [SFC awareness surface + synergy audit (oscar, 2026-05-28)](reference_oscar_sfc_awareness_surface_2026_05_28.md) — `scripts/sfc-awareness-snapshot.mjs` → SFC-AWARENESS.md = live 11-leg PSN synergy…
- [Wire-EDM domain atlas](reference_wire_domain_atlas_for_mike_2026_05_27.md) — Every WEDM backend node (586) + knowledge node (879) + archive path (4,058 files / 99 customers) + post-processor (16)…
- [Blueprint/OCR/CAD-reading atlas](reference_blueprint_ocr_cad_reading_atlas_2026_05_27.md) — 14 blueprint+OCR engines · 15 CAD-format native readers · 12 live CAD bridges · format→engine quick-map…
- [Whiskey = lathe-specialist slot (2026-05-27)](reference_whiskey_lathe_soul_designation_2026_05_27.md) — operator-codified. Soul rewritten physics-first + 5 refuses + lathe domain_filter; closes…
- [All slots free access](feedback_all_slots_free_access.md) — Any slot can edit settings.json, merge worktrees, wire hooks. Golf is constrained (allowlist), not privileged. Don't defer to "golf…
- [Backend builders: galaxy gates don't block](feedback_primary_backend_builders_no_galaxy_gate_block.md) — alpha/bravo/golf/sierra/papa/quebec/india: domain-OWNERSHIP gate never blocks building…
- [PAPA: no gates, full pathways unlocked](feedback_papa_no_gates_full_pathways.md) — op 2026-06-10: papa blocked by NO ownership/lane/claim/deference/permission gate; builds+wires+merges all 34…
- [Primary domains EXHAUSTIVE (papa 2026-06-10)](reference_primary_domain_exhaustive_2026_06_10.md) — 8 primary mfg domains: 5 wiki layers each + TOOLBELT op-context (7 items) + local trove linked…
- [SIERRA: no gates / full reign](feedback_sierra_no_gates_full_reign_2026_06_10.md) — op 2026-06-10: full authority across all 34 galaxies (same elevation as papa); universal rails still bind.
- [BRAVO all-galaxy build](feedback_bravo_all_galaxy_navigate_build.md) — op 2026-06-10: galaxy_access:all-galaxies; safety/scrutiny bind.
- [net-benefit → auto-build if safe](feedback_net_benefit_auto_build.md) — net-benefit idea → quick safety check → auto-build if safe; "safe" includes multi-chat (peer-claimed/locked surface →…
- [build for Blackwell hardware](feedback_build_for_blackwell_hardware.md) — operator 2026-06-09: target RTX PRO 6000 Blackwell 96GB + 9950X3D 32T + 136GB RAM + NVMe; GPU torch stack LIVE (3.13 venv…
- [auto-fix inline + Blackwell — FLEET-WIDE auto-enforced](feedback_auto_fix_and_blackwell_fleet_enforced.md) — operator 2026-06-09: fix issues as you hit them (don't defer) + size builds to the…
- [multi-seed before AUROC claim](feedback_multiseed_before_auroc_claim.md) — never report a single-seed AUROC lift; link-pred AUROC on capped subgraphs is high-variance (H2GCN +0.118 on seed5 was…
- [india transcript miner](reference_india_transcript_mine_2026_06_09.md) — `scripts/mine-india-transcripts.mjs` (U-MINE-INDIA): Ollama-mined india/AI-systems transcripts → Obsidian vault synthesis…
- [Enumerate before Read](feedback_enumerate_before_read.md) — When operator names a folder/scope, Glob the full tree + report total count BEFORE any Read. Never silently narrow.
- [Never claim absence without a DEEP search](feedback_never_claim_absence_without_deep_search.md) — before "no X exists in <scope>", exhaust Glob(full…
- [USE LIMA pypdf page-by-page extractor (CANONICAL)](feedback_use_lima_pypdf_page_extractor.md) — All chats use lima's pypdf script; 76x deeper than whiskey pdf-parse. domain-tagged…
- [Mill domain atlas](reference_mill_domain_atlas_for_foxtrot_2026_05_27.md) — foxtrot entry-point: 222+ engines (+17 hyperMILL), 49 dispatcher actions, 8 schemas/registries, 5-VMC fleet…
- [Math exhaustive completeness](feedback_mathematical_exhaustive_completeness.md) — High-ROI surfaces: CIs not scalars, informed priors not 0.5 defaults, statistical comparisons, sensitivity…
- [PSN — PRISM Synergy Network (11 legs)](feedback_psn_definition.md) — Obsidian brain + PRISM OS + Wiki + Memories + Tribal + System Viz + Engines + Algorithms + Formulas + NN/GNN + PRISM AI.
- [R1-R12 doctrine](feedback_r5_thru_r12_doctrine.md) — Karpathy R1-R4 + agent-era R5-R12 (model-for-judgment/budgets/conflicts/read-first/test-intent/checkpoint/conventions/fail-loud).
- [Karpathy 5-step pre-coding](feedback_karpathy_discipline.md) — CLASSIFY → TECHNIQUE → EDGE CASES → FAILURE MODES → THEN WRITE. Every hook header cites it. R1's mechanism.
- [PSK — Syscall Kernel](feedback_psk_kernel.md) — 10 fail-soft syscalls at `.claude/kernel/psk.mjs` wired `prism_session:psk`. /startup /checkin /handoff /pick compose it.
- [Obsidian brain — PSN leg #1](feedback_obsidian_brain.md) — `C:/.claude/projects/H--prism/memory/*.md` → `H:/knowledge/memories/<type>/` auto-feed every Stop. Cross-session brain.
- [PRISM OS — PSN leg #2](feedback_prism_os.md) — `prism_operating_system` dispatcher (~45 actions). Shell/desk/program-release/scheduling/shop-floor role-aware workspace.
- [SVI / Ψ](feedback_svi_psi.md) — System Viability Index + delta-per-hour ranking. SessionStart inject. SVIRankedBacklogEngine → `prism_dev:svi_ranked_backlog`. Pick by Ψ.
- [ATCS — Autonomous Task Completion](feedback_atcs.md) — `prism_atcs` dispatcher (12 actions). File-system state machine behind `/loop` /autopilot-full /yolo. Survives /compact.
- [slot-query by name + recency](feedback_slot_query_by_name_and_recency.md) — "pull tasks/sessions/commits/handoffs for slot X" → `/slot-query` (`node scripts/slot-query.mjs <slot>`); 5…
- [commit to slot/<nato>, not trunk](feedback_delta_commit_to_slot_branch.md) — slot worktree private lock=no contention; [MAIN] only for integrator on shared H:/prism
- [CHARLIE→slot/charlie](feedback_charlie_commit_own_slot_branch.md) — commit own NATO branch not shared tree (op 2026-06-11)
- [BRAVO→slot/bravo](feedback_bravo_commit_to_slot_branch.md) own branch not shared (op 2026-06-11)
- [autonomous-loop drift discipline](feedback_autonomous_loop_drift_discipline.md) — In a /loop, cap anomaly investigation at ≤1 extra tick, record a memory, return to the loop's stated purpose.
- [PRIORITIZE devtools+backend over all tasks](feedback_prioritize_devtools_backend.md) — Dev-tooling + backend-infra units are P0 ahead of app/revenue/CAD-CAM/docs in every pickup. Compounding…
- [high-ROI backend-dev first for slot-task queue](feedback_high_roi_backend_first_slot_queue.md) — When the operator points a chat at its slot-task queue (/checkin-<slot>, /pick-unit, /loop…
- [R13 task-freshness pre-build](feedback_task_freshness_pre_build.md) — Check task gen-date vs fleet activity BEFORE building; hard PreToolUse gate at slot-task-claim. --ack-stale knob.
- [auto-memory auto-feeds Obsidian (Stop hook)](feedback_auto_memory_feeds_obsidian_stophook.md) — stop-obsidian-memory-feed.mjs copies C: memory/*.md → H: knowledge/memories/<type>/ every Stop.
- [missing file → copy it back](feedback_missing_file_copy_back.md) — Restore missing files from canonical source by convention, don't route around. H:/C: .claude = one inode.
- [verify actual contract](feedback_verify_actual_contract_not_proxy.md) — Repro must check JSON.parse not byte-length; PS 5.1 codepage mangles non-ASCII stdout.
- [GOLF owns reaper (SUPERSEDES alpha)](feedback_golf_owns_reaper.md) — golf-slot-reaper-guardian.mjs wired; alpha unwired+preserved. PRISM_GOLF_GUARDIAN_DISABLE knob.
- [Obsidian fully operational (2026-06-09)](reference_obsidian_fully_operational_2026_06_09.md) — CAG-gated recall re-enabled + master-index OOM fix + durable cron-runners + reverse mirror…
- [Vault -> AI feeders (2026-06-09)](reference_vault_to_ai_feeders_2026_06_09.md) — vault-to-gnn-refpool.mjs (+4 confirmed wirings into GNN ref-pool) + vault-to-lora-dataset.mjs (245/247 feedback…
- [Galaxy transcript miner (2026-06-09)](reference_galaxy_transcript_mine_2026_06_09.md) — mine-galaxy-transcripts.mjs + lib/galaxy-mining-registry.mjs: ONE registry-driven Ollama miner for all 34…

---
source: prism-memory
synced: 2026-06-27T20:30:46.456Z
aliases: MEMORY-ARCHIVE
---

# PRISM Memory — Archived Index Entries

> Overflow of MEMORY.md `## Indexed memories`, rotated by `scripts/memory-compact.mjs` (U-OBF03) and the memory-coordination pointer-index restructure. NOT auto-loaded into context — discoverable, read on demand. Newest archived batch on top.

## Archived 2026-06-09T14:11:04.854Z — 14 entries

- [/checkin args ARE the work order](feedback_checkin_args_are_primary_work_order.md) — Trailing text after /checkin-<slot> is the PRIMARY deliverable; slot-bind = minimal preamble, then act.
- [always build, never skip](feedback_always_build.md) — Standing rule: always build, never skip; enforced by always-build-guard Stop hook + PENDING_GAP_ENGINES.json.
- [always capture lessons](feedback_always_capture_lessons.md) — 4-piece MISTAKE-LEARNING-LOOP flags via PostToolUse+Stop; operator captures via /learn-from-mistake.
- [always close out](feedback_always_close_out.md) — Finish EVERY task before reporting done — doc-sync tail, tests, pre-existing follow-ups. Only [SCOPED] opts out.
- [R15 build rule](feedback_wire_test_validate_all_galaxies.md)
- [crossroad → brainstorm-workflow](feedback_crossroad_brainstorm_workflow.md) — At a genuine fork (≥2 paths, real consequences, no obvious default) auto-run the `brainstorm-path-forward` 5-lens Workflow; don't guess or ask a bare either/or. Wiki [[crossroad-brainstorm-workflow]].
- [always fill gaps](feedback_always_fill_gaps.md) — Audit/search surfaces a gap (timed-out sweep, missing data, unverified claim) → FILL it in-session, or own+route it; never log-and-drop. R12 + close-out sibling.
- [roadmap close-out 4 surfaces](feedback_roadmap_close_out.md) — envelope+roadmap-index+MILESTONE_PROGRESS+BUILD_STATE+chat-bus. `node scripts/close-out-milestone.mjs`.
- [auto close-out audit](feedback_auto_close_out.md) — Audit shipped-but-pending in roadmaps; 5 surfaces; NEVER auto-flips — human-verify.
- [never delete only disable](feedback_never_delete_only_disable.md) — Reversibility rule. `hooks:[]`+_disabled_by, `// WIRE-EXEMPT:`, `<name>.archive.<date>`.
- [per-file scrutiny gate](feedback_parallel_scrutiny_per_file.md) — 2 parallel reviewers per file in multi-file builds BEFORE the next file. Complements end-of-task 3-of-3.
- [engine tests go in src/__tests__/](feedback_engine_tests_in_tests_dir.md) — stop_on_unwired_assets scans ONLY mcp-server/src/__tests__/; src/engines/__tests__/ is NOT scanned.
- [reflect all changes post-update](feedback_reflect_all_changes_post_update.md) — Every change-set updates 4 surfaces (CLAUDE.md + MEMORY.md + wiki + Obsidian). No silent drift.
- [domains own their AI training (fleet rule)](feedback_domains_own_ai_training_systems.md) — each domain owns its self-improving AI, cloned from india. [[domain-self-improving-ai-template]].- [Infra: NIM dropped for Ollama-only](reference_infra_nim_drop_ollama_2026_06_09.md) — WSL 16GB cap OOM-killed NIM (exit137); Qdrant 768-dim verified match, no re-embed

## Archived 2026-05-29T14:02:04.884Z — 14 entries

- [conflict-fork rule](feedback_conflict_fork_rule.md) — Fork to a sibling worktree after the first hollow commit; main-tree retries waste cycles in multi-chat.
- [commit to your slot worktree](feedback_commit_to_slot_worktree.md) — every chat commits in H:/prism-slot-<nato>; shared-tree commits absorb into peer commits (3 absorbed in one golf session…
- [fleet design — up to 12 chats](feedback_fleet_design_10_chats.md) — Read SLOT_NAMES from chat-slots.mjs, never hard-code the chat count.
- [system-viz-first doctrine (broadened 2026-05-27)](feedback_system_viz_first_audit.md) — For ANY assessment / deep system search / discovery, automatically use the trio /system-viz + master-index + system-graphs BEFORE Grep/Glob/Agent. Grep is fallback <0.5 confidence.
- [pick-unit guides to system-viz](feedback_pick_unit_system_viz_guidance.md) — pick-unit emits a research block: /system-viz → find → blast-radius → master_index_query → /dedup.
- [AI training first before revenue](feedback_ai_training_first_before_revenue.md) — Pre-revenue, train per-domain AI engines on the full corpus (JM-DIE 76K, MIT-OCW, monolith).
- [no public H: drive](feedback_no_public_h_drive.md) — HARD: nothing from H:/prism may be published publicly. Internal-only OK.
- [no git stash in shared tree](feedback_no_git_stash_shared_tree.md) — `git stash`/pop in H:/prism clobbers peers. Use `git show <ref>:<path>` for old versions.
- [no ScheduleWakeup in /loop](feedback_no_schedule_wakeup_in_loop.md) — NEVER ScheduleWakeup between /loop iters; cache cost not worth the round-trip.
- [Playwright for online sources](feedback_playwright_for_online_sources.md) — Fetch URLs via mcp__playwright__*, not WebFetch/WebSearch; fall back only if unavailable + say so.
- [Read strips C0 control chars](feedback_read_tool_strips_control_chars.md) — Prefer `"\x1f"` source-escape; verify control bytes via node, not the Read tool.
- [scrutiny finds hostile-payload class](feedback_scrutiny_gate_finds_hostile_payload_class.md) — Greedy slice(firstBrace,lastBrace+1) exploitable; Arm B catches LLM-input hostile-payload bugs.
- [scrutiny codex captures peer diffs](feedback_scrutiny_codex_captures_peer_work.md) — Codex captures session-base→HEAD; fork at /checkin BEFORE picking so peer commits aren't noise.
- [lint-staged no-op eats commits](reference_lintstaged_noop_config_eats_commits.md) — A fake .lintstagedrc.json drops doc-only commits; `--no-verify` for pure-doc, or delete the config.

## Archived 2026-05-22 (MEMORY.md ceiling rotation) — 2 entries
- [U-WIRE-SWARM-GROUP](reference_u_wire_swarm_group_2026_05_18.md) — 2026-05-18 charlie. Wired SwarmGroupExecutor; BUILD_STATE.NEEDS_WIRING has false positives — grep -rl before wiring.
- [U-P0-U02 recovery — Ollama model-resolve](reference_u_p0_u02_recovery_2026_05_18.md) — 2026-05-18 charlie. R12: a handoff's "shipped" is a claim — verify with git log -S; passing spec test ≠…

## Archived 2026-05-19T (pointer-index restructure) — 33 entries

- [U-MASTER-INDEX-HIT-COUNTER](reference_master_index_hit_counter_2026_05_18.md) — 2026-05-18 charlie. Per-query telemetry wired into master-index-precheck-inject; pure-core + atomic write + R12 corrupt-aside. 32 tests.
- [U-OE-DOCKER-COMPOSE](reference_u_oe_docker_compose_2026_05_18.md) — 2026-05-18 echo. docker-compose.ollama-bridge.yml additive override flips prism-server stdio→http; profile-gated one-shot bridge svc. 8 tests.
- [U-BRIDGE-WIRE-MASTERCAM](reference_u_bridge_wire_mastercam_2026_05_18.md) — 2026-05-18 echo `2f2c5b0ef5`. Wires MastercamCADFunctionIndexEngine to camDispatcher via 10 actions. 18 tests.
- [fleet-task-health recovery (5 tasks)](reference_fleet_task_health_recovery_2026_05_18.md) — 2026-05-18 delta. 5-installer elevated recovery for fleet-task-health WARN; slug≠task name (grep $TaskName).
- [OLLAMA-EXPAND charlie iter 2+3](reference_ollama_expand_charlie_iter_2026_05_18.md) — 2026-05-18 charlie. Dashboard adjusted offload rate; wiki_lookup scans 22,734 architecture leaves. 96 tests.
- [OLLAMA-EXPAND-MS0 ollama-prism-bridge L2](reference_ollama_prism_bridge_l2.md) — 2026-05-18 charlie. Ollama agent-loop harness chains 3 read-only PRISM knowledge tools via /api/chat. 86 tests.
- [NVIDIA NIM local setup](reference_nvidia_nim_local_setup_2026_05_18.md) — 2026-05-18 golf. Local NIM llama-3.2-3b on 127.0.0.1:8000 (RTX 4080); daemon-side pull, NIM_MAX_MODEL_LEN fix. 49 tests.
- [Codex review arm](reference_codex_review_arm_2026_05_18.md) — 2026-05-18 lima. Codex CLI added as an ADVISORY scrutiny-3way arm; never marks the ledger, degrades to skipped. 21 tests.
- [CAD-Fusion training run](reference_cad_fusion_training_2026_05_18.md) — 2026-05-18 `bf6ec9af`. Fusion cloud unreachable → pivoted to Inventor/STEP corpus; 11,762-file similarity index trained.
- [loop-inject-dedup gate](reference_loop_inject_dedup_2026_05_18.md) — 2026-05-18 foxtrot `f89dfe893d`. Session-scoped dedup: re-injected byte-identical content → compact pointer. 41 tests.
- [loop-inject-cost-audit](reference_loop_inject_cost_audit_2026_05_18.md) — 2026-05-18 foxtrot `f88cc94705`. Per-/loop-iter hook-inject token-cost audit; ~518 tok/iter stable-redundant. 53 tests.
- [U-CAMX22-FIX-SILENT-SKIP](reference_u_camx22_fix_silent_skip_2026_05_18.md) — 2026-05-18 juliett `05c57a0289`. Sync AutoSpeedFeed in PrintToProgram pipeline; was async-only → emitted UNOPTIMIZED gcode.
- [OLLAMA-EXPAND-MS0 ask-ollama](reference_ollama_expand_ms0.md) — 2026-05-18 charlie U-OE01. Local Ollama callable: viz graph-search + summarize/explain/triage/ask. 55 tests, 80MB OOM-cap.
- [U-CLEANUP-B9 conformal drift gate](reference_u_cleanup_b9_2026_05_18.md) — 2026-05-18 charlie `405ac15be7`. R4-P1-8 split-conformal gate; conformal supersedes slope, floor always-on. 62 tests.
- [U-SLOT-BIND-ENFORCE](reference_slot_bind_enforce_2026_05_18.md) — 2026-05-18 hotel `679feae088`. Deterministic stdin-session_id slot-claim hook fixes /checkin-<nato> non-binding. 33 tests + 8 oracles.
- [master-index filter-contract fix (3 iters)](reference_master_index_filter_contract_fix_2026_05_18.md) — 2026-05-18 hotel. min_confidence post-blend filter; stopwords config; R12 silent bug caught. 29 tests.
- [cross-chat commit misattribution](reference_cross_chat_commit_misattribution_2026_05_18.md) — 2026-05-18 hotel. Master-index work swept into peer `git commit -a`; work correct, banner wrong. Migrate to slot worktree.
- [token-efficiency playbook + watchdog ACT](reference_token_efficiency_playbook_2026_05_18.md) — 2026-05-18 echo. MEMORY.md recompacted; stop-memory-size-watchdog warn→auto-compact; close writer-without-reader loops.
- [TASK-FRESHNESS-GATE-MS0 build](reference_task_freshness_gate_ms0_2026_05_18.md) — 2026-05-18 foxtrot U-TFG01. Pure core + bundled hook; bundled sub-hook MUST exit-0 (block via stdout JSON). 36 tests.
- [U-CAMX23 probe→PrintToProgram](reference_u_camx23_2026_05_17.md) — 2026-05-17 kilo. Wires ProbeRoutineGeneratorEngine into generateProgram at semi→finish for tol<0.025/Ra<0.8. 20 tests.
- [silent close-out drift detector](reference_silent_close_out_drift_2026_05_17.md) — 2026-05-17 alpha. 51 ms / 329 hidden units (envelope-complete + MILESTONE_PROGRESS-zero). Pure lib, ADVISORY only. 16 tests.
- [U-DPM0-CELL-EXTRACT](reference_domain_pipeline_cell_extract_2026_05_17.md) — 2026-05-17 juliett. DOMAIN-PIPELINE-MS0-CONFIG.json → 62 slot-routed roadmap units; idempotent. 36 tests.
- [predictWithTrend chatter method](reference_predict_with_trend_2026_05_17.md) — 2026-05-17 alpha `2581b08eac`. R8 dedup-preflight re-scoped "new engine" → "method addition"; WIRE-EXEMPT. 35 tests.
- [U-OBF-F2 claude-md-collapse tool](reference_claude_md_collapse_tool_2026_05_17.md) — 2026-05-17 bravo `d19c488fba`. Collapses 22 milestone-narrative sections in CLAUDE.md to one-line wiki pointers. 17 tests.
- [FEATURE-GAP-AUDIT CAD dedup-wins](reference_feature_gap_audit_cad_dedup_wins_2026_05_18.md) — 2026-05-18 delta. 8 CAD/lathe units: 5 R8 dedup-wins, 3 real ports. Glob engines/ BEFORE porting any "absent" unit.
- [Hermes + evolving-skills gap](reference_hermes_evolving_skills_gap_2026_05_17.md) — 2026-05-17 juliett. User-surfaced gap: Hermes + closed-loop harness-writes-skills not queued; 3 units queued.
- [U-WIRE-ENERGY](reference_u_wire_energy_2026_05_17.md) — 2026-05-17 kilo `7fab606fa9`. Wires half-orphan MachiningEnergyModelEngine→prism_calc; ghost-wired orphan class. 16 tests.
- [U-WIRE-ARCFIT](reference_u_wire_arcfit_2026_05_17.md) — 2026-05-17 kilo `409cf71f80`. Wires orphan ArcFittingEngine→prism_calc:arc_fit_kasa. WEAK-SIGNAL test-only IS unwired. 13 tests.
- [FLEET-TASK-HEALTH-MS0](reference_fleet_task_health_ms0_2026_05_17.md) — 2026-05-17 mike. Watchdog over ~8 crash-prevention scheduled tasks + critical-pressure /compact nudge hook.
- [JULIETT 12chat allocation](reference_juliett_12chat_allocation_2026_05_17.md) — 2026-05-17 juliett. 5-wave / 12 slots / CLEAR-NOT-COMPACT doctrine / 11 bypass / 5 spec bootstrap.
- [JULIETT devtools synergy](reference_juliett_devtools_synergy_map_2026_05_17.md) — 2026-05-17 juliett. 10 synergy (S1-S10) + 5 fan-out (T1-T5) + 5 silent-degrade (F1-F5).
- [SDF13-19 sticky chatId→slot cache](reference_slot_identity_cache_2026_05_17.md) — 2026-05-17 bravo. chat-slot-history/<chatId>.json closes /compact slot-drift; U-SDF19 wires cache into heartbeat().
- [KNOWLEDGE-CONVERSION-MS0](reference_knowledge_conversion_ms0_2026_05_17.md) — 2026-05-17 india. 4 phases / 7 units. 3-lane A/B/C routes MIT-OCW + monolith into 6 PRISM node-types.
- [SVB-MS0 hook-orphan-reconcile](reference_hook_orphan_reconcile_2026_05_17.md) — 2026-05-17 echo. audit-hook-wiring (39/39, 16 WIRE candidates) + 3 supersede closeouts. SVB-MS0 16→19/26.
- [DEV-TOOLS META scripts](reference_dev_tools_audit_meta_scripts_2026_05_17.md) — 2026-05-17 echo. 8 commits: tribal-bridge, stale-milestone-rank, dev-tool-leverage-rank, hook-fire-rank. 500/510 hooks never fire.

## Archived 2026-05-19T01:39:25.668Z — 20 entries

- [GOLF owns reaper (SUPERSEDES alpha)](feedback_golf_owns_reaper.md) — 2026-05-16 golf. golf-slot-reaper-guardian.mjs wired; alpha unwired+preserved. PRISM_GOLF_GUARDIAN_DISABLE knob. Smoke-tested.
- [Fleet Memory Monitor MS0](reference_fleet_memory_monitor_2026_05_16.md) — 2026-05-16 golf. 5-min RAM monitor, claude.exe-tree attribution (NOT slot.pid — ephemeral). Advisory names /compact target. 28 tests. WT scheduled task.
- [Token/Context/Memory audit](reference_audit_token_context_memory_2026_05_16.md) — 2026-05-16 juliett. META: audit-hook-stack-cost.mjs + memory-size-watch.mjs. Peer review caught phantom fix + missed memory axis.
- [/checkin args ARE the work order](feedback_checkin_args_are_primary_work_order.md) — 2026-05-16. Trailing text after /checkin-<slot> is PRIMARY deliverable. Slot-bind = minimal preamble, then act on request.
- [PER-SLOT-CLAIM-MS0 unit locks](reference_per_slot_claim_ms0_2026_05_16.md) — 2026-05-16 bravo 6/6. slot-task-claim.mjs lockfile-JSON; --chatId filter; auto-release on commit. 64 tests.
- [synergy-regression-watch](reference_synergy_regression_watch_2026_05_16.md) — 2026-05-16 foxtrot. scripts/synergy-regression-watch.mjs catches week-over-week drift; baseline 22.2%→21.1%. Exit 0/1/2 cron-ready.
- [PRIORITY-QUEUE-MS0 — master pickup queue](reference_priority_queue_ms0_2026_05_16.md) — 2026-05-16 juliett. ghost.priority_queue roost + 3588 color-coded children. priority-queue.mjs --pick filters shipped+claimed. Stop hooks deferred.
- [/checkin-<nato> /loop full-stack contract](reference_checkin_loop_fullstack_2026_05_16.md) — 2026-05-16 juliett. Pointer: slot-claim → slot-worktree → routing-hooks → inject-chain → roadmap-pickup → error-learn → slot-routed-commits → auto-handoff-across-/compact.
- [slot-worktree activation](reference_slot_worktree_activation_2026_05_16.md) — 2026-05-16 b8dfbf208+912f10fff. SLOT-WORKTREE-MS0 already-built; fixed juliett/lima drift, /checkin Step 2c cutover, 0 pipeline wrappers needed.
- [roadmap consolidation](reference_roadmap_consolidation_2026_05_16.md) — 2026-05-16 juliett. 849 milestones / 4497 pending / 26 wiring + 16 bridge → ROADMAP-CONSOLIDATED. Trust units.length not prose.
- [NN-GRAPH MS1+MS2+NN-1](reference_nn_graph_ms2_nn1_768d_features_2026_05_17.md) — 2026-05-17 alpha. Stratified-neg + U1 seed-ghost + U2 self-retrain + NN-1 8d→768d feature swap (model-side AUROC lever; embeddings already in _embeddings.jsonl).
- [RGS-TOOL-AUTOINVOKE-MS1 P0 fixes](reference_rgs_tool_autoinvoke_ms1_2026_05_16.md) — 2026-05-16 charlie. 10 P0 bugs MS0 hermetic tests missed. Rule: pure-core + injected-readers MUST ship one real-data E2E test.
- [U-DOMAIN-RULES MS1](reference_u_domain_rules_2026_05_16.md) — 2026-05-16 lima. 5 mill/lathe/wedm/cam/cad rules + structural Wire-EDM exclusion + /lathe polysemy guard + 5 skill-trigger frontmatters. 31/31.
- [/checkin autonomous loop](reference_checkin_autonomous_loop_2026_05_16.md) — 2026-05-16 alpha 9c459d1b2. Step 12 + Step 2b loop-resume. P0: loop-state read never returns stale → reap-then-read.
- [unblock detector](reference_unblock_detect_2026_05_16.md) — 2026-05-16 echo 44ac1b52c. scripts/unblock-detect.mjs DONE/READY/BLOCKED via 1-level dep + git cross-ref. Status spellings chaotic → DONE_STATUSES allowlist.
- [/goal ship-report](reference_goal_ship_report_2026_05_16.md) — 2026-05-16 echo 96d9c3ee8+d771c9e3e. git×SCRUTINY×CLOSE-OUT joiner → READY/BLOCKED/UNCERTAIN. Control bytes via String.fromCharCode, never raw.
- [misc-tasks extraction](reference_misc_tasks_extraction_2026_05_16.md) — 2026-05-16 juliett. 522→318 orphaned tasks. extract-misc-tasks + augment FAST+merge.
- [TRIBAL-GRAPH-MS0 content mining](reference_tribal_graph_ms0_content_mine.md) — 2026-05-16 india 67895484f. MIT-OCW→Ollama→65 ranked candidates ADVISORY (never auto-build). 226/227 zips.
- [verify actual contract](feedback_verify_actual_contract_not_proxy.md) — 2026-05-16. ~5 turns lost: repro checked byte-length not JSON.parse. PS 5.1 codepage mangles non-ASCII stdout.
- [error-fix-vault-bridge](reference_error_fix_vault_bridge_2026_05_16.md) — 2026-05-16 echo 27c28fabb. T3 Stop reads error-memory.json → idempotent daily error-fixes/*.md. Re-scope: detection was 4×-built.

## Archived 2026-05-19T00:58:58.458Z — 14 entries

- [PRIORITY-QUEUE-MS0 — master pickup queue](reference_priority_queue_ms0_2026_05_16.md) — 2026-05-16 juliett. ghost.priority_queue roost + 3588 color-coded children. priority-queue.mjs --pick filters shipped+claimed. Stop hooks deferred.
- [/checkin-<nato> /loop full-stack contract](reference_checkin_loop_fullstack_2026_05_16.md) — 2026-05-16 juliett. Pointer: slot-claim → slot-worktree → routing-hooks → inject-chain → roadmap-pickup → error-learn → slot-routed-commits → auto-handoff-across-/compact.
- [slot-worktree activation](reference_slot_worktree_activation_2026_05_16.md) — 2026-05-16 b8dfbf208+912f10fff. SLOT-WORKTREE-MS0 already-built; fixed juliett/lima drift, /checkin Step 2c cutover, 0 pipeline wrappers needed.
- [roadmap consolidation](reference_roadmap_consolidation_2026_05_16.md) — 2026-05-16 juliett. 849 milestones / 4497 pending / 26 wiring + 16 bridge → ROADMAP-CONSOLIDATED. Trust units.length not prose.
- [NN-GRAPH MS1+MS2+NN-1](reference_nn_graph_ms2_nn1_768d_features_2026_05_17.md) — 2026-05-17 alpha. Stratified-neg + U1 seed-ghost + U2 self-retrain + NN-1 8d→768d feature swap (model-side AUROC lever; embeddings already in _embeddings.jsonl).
- [RGS-TOOL-AUTOINVOKE-MS1 P0 fixes](reference_rgs_tool_autoinvoke_ms1_2026_05_16.md) — 2026-05-16 charlie. 10 P0 bugs MS0 hermetic tests missed. Rule: pure-core + injected-readers MUST ship one real-data E2E test.
- [U-DOMAIN-RULES MS1](reference_u_domain_rules_2026_05_16.md) — 2026-05-16 lima. 5 mill/lathe/wedm/cam/cad rules + structural Wire-EDM exclusion + /lathe polysemy guard + 5 skill-trigger frontmatters. 31/31.
- [/checkin autonomous loop](reference_checkin_autonomous_loop_2026_05_16.md) — 2026-05-16 alpha 9c459d1b2. Step 12 + Step 2b loop-resume. P0: loop-state read never returns stale → reap-then-read.
- [unblock detector](reference_unblock_detect_2026_05_16.md) — 2026-05-16 echo 44ac1b52c. scripts/unblock-detect.mjs DONE/READY/BLOCKED via 1-level dep + git cross-ref. Status spellings chaotic → DONE_STATUSES allowlist.
- [/goal ship-report](reference_goal_ship_report_2026_05_16.md) — 2026-05-16 echo 96d9c3ee8+d771c9e3e. git×SCRUTINY×CLOSE-OUT joiner → READY/BLOCKED/UNCERTAIN. Control bytes via String.fromCharCode, never raw.
- [misc-tasks extraction](reference_misc_tasks_extraction_2026_05_16.md) — 2026-05-16 juliett. 522→318 orphaned tasks. extract-misc-tasks + augment FAST+merge.
- [TRIBAL-GRAPH-MS0 content mining](reference_tribal_graph_ms0_content_mine.md) — 2026-05-16 india 67895484f. MIT-OCW→Ollama→65 ranked candidates ADVISORY (never auto-build). 226/227 zips.
- [verify actual contract](feedback_verify_actual_contract_not_proxy.md) — 2026-05-16. ~5 turns lost: repro checked byte-length not JSON.parse. PS 5.1 codepage mangles non-ASCII stdout.
- [error-fix-vault-bridge](reference_error_fix_vault_bridge_2026_05_16.md) — 2026-05-16 echo 27c28fabb. T3 Stop reads error-memory.json → idempotent daily error-fixes/*.md. Re-scope: detection was 4×-built.

## Archived 2026-05-18T22:55:32.367Z — 31 entries

- [RGS-TOOL-AUTOINVOKE-MS0](reference_rgs_tool_autoinvoke_ms0_2026_05_16.md) — 2026-05-16 12 units. Composes findCapabilities+skill-triggers+system-viz+tribal; rule table only net-new. Beta re-rank Stop hook.
- [docustrata pipeline + 104K debunk](reference_docustrata_pipeline_2026_05_16.md) — 2026-05-16 foxtrot. Real delta=7235 PDFs (not 104K). 7-stage taint-prop orchestrator + customer-folder match.
- [WIRE-UNWIRED-MS0 — 861 pool is 96% noise](reference_wire_unwired_ms0_u_wire01_2026_05_16.md) — 2026-05-16 alpha. validate-unwired-signal: only 3 truly-unwired backend orphans wired. PATHS.STATE_DIR=legacy gotcha.
- [/checkin auto-invoke rollout](reference_checkin_autoinvoke_2026_05_16.md) — 2026-05-16 bravo. checkin-recall.mjs §6k+§6l. 324MB graph→system-viz-query; node fetch fails→curl.
- [/compact precompact bare-node ENOENT](reference_precompact_bare_node_enoent_2026_05_16.md) — 2026-05-16 bravo. spawnSync("node")→ENOENT on portable-node. Fix: process.execPath + fail-loud parser.
- [D3 conflict-resolution](reference_d3_conflict_resolution_2026_05_16.md) — 2026-05-16 charlie a6a119663. MemoryConflictResolverEngine: SHA256+window+policy resolve, append-only diff. Lesson: fail-PRESERVE not fail-throw.
- [G2 agent-overlay](reference_g2_agent_overlay_2026_05_16.md) — 2026-05-16 charlie c1e7c6d06. Agent-status overlay (typing/parsing/idle/errored) from heartbeat+AGENT_CHAT. Sibling JSON, not in graph.
- [D4 action-traces](reference_d4_action_traces_2026_05_16.md) — 2026-05-16 charlie f432ace7. Append-only JSONL + query + system-viz overlay. ts-normalize at write boundary; path-leak strip through MCP.
- [U-PPL-A1+B1 turning + reopt](reference_u_ppl_a1_b1_shipped_2026_05_16.md) — 2026-05-16 foxtrot. Okuma spindle is S[Vnn] not Fanuc S\d (regex trap); MAX_GCODE_BYTES guard for O(n) orchestrators.
- [SYSTEM-VIZ-FS-COVERAGE-MS1](reference_system_viz_fs_coverage_ms1_2026_05_16.md) — 2026-05-16 alpha a0b7091266. 3-phase: truncation recovery + cron re-walk + drift detector. spread→push fix (130K-edge stack overflow).
- [SYSTEM-VIZ-DSL-MS0](reference_system_viz_dsl_ms0_2026_05_16.md) — 2026-05-16 alpha. CODE_SYSTEM_INDEX +438 codes (ML+GH). Use kind ONLY not layer; L8 has 21K wiki_entries not skills.
- [E1 IdeaBlockExtractor](reference_e1_ideablock_extractor_2026_05_15.md) — 2026-05-15 hotel. Schema v1+alias + engine (NFC id, depth-aware brace, refusal detector, U+001F sep). 21 tests, per-file gate.
- [Read strips C0 control chars](feedback_read_tool_strips_control_chars.md) — 2026-05-15. Reviewer Arm A misread U+001F as empty. Prefer `"\x1f"` source-escape; verify bytes via node.
- [scrutiny finds hostile-payload class](feedback_scrutiny_gate_finds_hostile_payload_class.md) — 2026-05-15. Greedy slice(firstBrace,lastBrace+1) exploitable. Arm B catches LLM-input hostile-payload bugs.
- [always capture lessons](feedback_always_capture_lessons.md) — 2026-05-16. 4-piece MISTAKE-LEARNING-LOOP flags via PostToolUse+Stop; operator captures via /learn-from-mistake.
- [ollama-cost-routing](reference_ollama_cost_routing.md) — 2026-05-15 bravo 831d04c2b. Pure routeModelForTask 4-tier ladder, escalate-up-only never-de-escalate. FLEET-REAPER hints preserved.
- [token-budget-telemetry](reference_token_budget_telemetry.md) — 2026-05-15 bravo 97185f094. JSONL on token-budget-gate + dashboard sid→slot join. p95 nearest-rank.
- [tribal-by-domain-inject](reference_tribal_by_domain_inject.md) — 2026-05-15 delta 173291ff7. UserPromptSubmit top-3 tribal hits by slot milestone domain. ownStr() prototype-pollution guard.
- [AUTOCOMPACT-AUTONOMOUS-MS0](reference_autocompact_autonomous_ms0_2026_05_15.md) — 2026-05-15 alpha 1f76f0355. CLAUDE_AUTOCOMPACT_PCT 95; SOFT/HARD 880K/940K; auto-resume injects /checkin.
- [OLLAMA-PIPELINE-MS0](reference_ollama_pipeline_ms0_2026_05_15.md) — 2026-05-15 bravo c34405927. health probe + pipeline-injector + prewarm hook. Skills doc + injector hook canonical.
- [viz-first-redirect Glob/Grep](reference_viz_first_redirect_glob.md) — 2026-05-15 alpha d06cdefa9. PreToolUse top-5 graph hits before tool. Skips regex/ext-wildcard.
- [wiki-domain-bias](reference_wiki_domain_bias.md) — 2026-05-15 alpha 590ba4a77. +4.5 BM25 boost from slot's domain tokens (below curated +12). chatId-without-slot returns [].
- [per-subagent presearch](reference_subagent_per_task_presearch_2026_05_15.md) — 2026-05-15 bravo d7797a6e7. Agent spawn gets master-index+tribal hits keyed on its prompt. master-index-search-lib.mjs shared.
- [U-PPL-D5-BRIDGE mill-gcode](reference_u_ppl_d5_bridge_shipped.md) — 2026-05-15 echo. Wires MccProgramParser+BatchExtractor as 3rd ProgramEquivalentKind. 31/31 tests.
- [U-PPL-D5 already built](reference_u_ppl_d5_already_built.md) — 2026-05-15 echo. McxProgramParser (LATHE-PROD-READY/U-LPR26) already shipped. Real work=bridge into D4.
- [U-PPL-D4 ProgramEquivalentIndex](reference_u_ppl_d4_program_equivalent_index.md) — 2026-05-15 echo 81ead2a7b. Composes UniversalCADIndex+lathe MIN; DI lookupFn; sibling JSON.
- [handoff memory-seed](reference_handoff_memory_seed.md) — 2026-05-15 bravo. Stop hook appends MEMORY_SEED to handoff: top-3 errors + 2 post-ship + 1 wiki tribal.
- [error-learn-loop extension](reference_error_learn_loop_extension.md) — 2026-05-15. error-pattern-capture adds 6 detectors (fork-storm, rg-timeout, git-lock, edit-mismatch, tsc-error, test-fail).
- [system-viz-first doctrine](feedback_system_viz_first_audit.md) — 2026-05-15. Query /system-viz BEFORE Grep/Glob/Agent for exists/wired/orphan/duplicate. Grep is fallback <0.5 confidence.
- [twid cache-hit auto-upgrade](reference_twid_cache_hit_autoupgrade_2026_05_15.md) — 2026-05-15 alpha. Throttled 30s upgrade probe when cached tier < MAX; preserves never-downgrade.
- [Stop advisory wiring cluster](reference_stop_advisory_wiring_cluster_2026_05_15.md) — 2026-05-15. Stop[6→8] is natural T3-advisory zone. Verify {continue:true,suppressOutput:true} no-find path.

## Archived 2026-05-18T02:39:53.891Z — 1 entry

- [/compact auto-precompact](reference_precompact_hook_autowrite_2026_05_15.md) — 2026-05-15 bravo 5c4778b59. --source precompact-hook strict (≥30 chars resume, anti-clobber <5min). 4096B pad.

## Archived 2026-05-18T02:37:40.189Z — 4 entries

- [twid resolver cache](reference_twid_resolver_cache_2026_05_15.md) — 2026-05-15 bravo 5c4778b59. Cache by sessionId; never-downgrade (wt>ps>pa>pp). PS Get-CimInstance replaces wmic.
- [lint-staged no-op eats commits](reference_lintstaged_noop_config_eats_commits.md) — fake .lintstagedrc.json drops doc-only commits. `--no-verify` for pure-doc; proper fix: delete config.
- [SLOT-WORKTREE-MS0 P3 cutover](reference_slot_worktree_ms0_p3_cutover_complete.md) — 2026-05-15 charlie. 11 canonical worktrees + 3 routing hooks default-ON. Fleet 51→38.
- [SLOT-WORKTREE-MS0 P1 routing](reference_slot_worktree_ms0_p1_routing_complete.md) — 2026-05-15. 3 routing hooks default-OFF; slots.slots schema (object-keyed); atomic-commit mitigation.

## Archived 2026-05-18T02:09:03.968Z — 31 entries

- [SLOT-WORKTREE-MS0 phase 0](reference_slot_worktree_ms0_phase0_rescue.md) — 2026-05-14 charlie e460e9326. Audit + cherry-pick + bootstrap + architecture (244 LOC). 48-tree baseline KEEP27/PRUNE1.
- [U-AIMAX10 — 46 AI actions](reference_u_aimax10_ship.md) — 2026-05-14 charlie eb0a8ca60+935e8c8ae. Schema-merge spread + snake/camel remap + .finite() metrics. 108 tests.
- [harness hang prevention](reference_harness_hang_prevention.md) — 2026-05-11..12. 35 dead exit-0 entries removed, node-process-janitor, stop+sessionstart bundles. Hooks 106→74.
- [conflict-fork rule](feedback_conflict_fork_rule.md) — fork to sibling worktree after first hollow commit; main-tree retries waste cycles in multi-chat.
- [MILESTONE_PROGRESS surface](reference_milestone_progress_surface.md) — `state/shared/MILESTONE_PROGRESS.{md,json}` is the envelope-vs-shipped delta; subtract shipped[] from gap lists.
- [BUILD_STATE surface](reference_build_state_surface.md) — `state/shared/BUILD_STATE.{md,json}` answers built/needs-wiring/pending/frontend; auto-injected via build-state-inject hook. /build-state.
- [system-viz live 3D map](reference_system_viz.md) — 10-layer 334-node interactive map at port 8765. /system-viz; query: scripts/system-viz-query.mjs; directive: PRISM-SYSTEM-VIZ-DIRECTIVE.md.
- [JM Die program practice](reference_jm_die_program_save_practice.md) — Mazak/Okuma saves .MIN w/ $<INTERNAL>% header; Inventor/Fusion/SW saves NO G-code (CAD IS the program).
- [docustrata multi-print PDFs](reference_docustrata_multi_print_pdfs.md) — 96% multi-page; single PDFs hold 5-10 prints. Use phase8-tiered-blueprint-classifier (image→OCR→vision LLM).
- [never delete only disable](feedback_never_delete_only_disable.md) — Reversibility rule. `hooks:[]`+_disabled_by, `// WIRE-EXEMPT:`, `<name>.archive.<date>`. Only own-session files freely deletable.
- [Playwright for online sources](feedback_playwright_for_online_sources.md) — fetch URLs via mcp__playwright__*, not WebFetch/WebSearch. Fall back only if unavailable + say so.
- [no public H: drive](feedback_no_public_h_drive.md) — HARD: nothing from H:/prism may be published publicly (no GitHub, no agentskills.io). Internal-only OK. Rescope "publish" units.
- [no git stash in shared tree](feedback_no_git_stash_shared_tree.md) — `git stash`/pop in H:/prism (6 chats) clobbers peers. Use `git show <ref>:<path> > <path>` for old file versions.
- [v8.89 monolith extraction](reference_monolith_extraction.md) — H:/prism/extracted/ = decomposed v8.89 (1469 modules, ~1350 orphan .js). PATHS.MATERIALS_DB misconfigured. Tracked REVENUE-ROADMAP §R6.
- [always close out](feedback_always_close_out.md) — Standing rule: finish EVERY task before reporting done — doc-sync tail, tests, pre-existing follow-ups. Only [SCOPED] opts out.
- [per-file scrutiny gate](feedback_parallel_scrutiny_per_file.md) — Standing rule: 2 parallel reviewers per file in multi-file builds BEFORE next file. Complements end-of-task 3-of-3.
- [reverse-merge then ff-only](reference_reverse_merge_then_ff_only.md) — Land into busy shared tree: merge backward in sibling worktree, then ff-only forward into shared. Atomic, no conflicts.
- [AUTO-LEARNING-LOOP-MS0/U-ALL01](reference_u_all01_ship.md) — 2026-05-13 charlie. ReputableSourceMonitorEngine+CLI+cron+dispatcher. install-source-monitor-task.ps1 to activate.
- [TRAINING-LEARNING-MS0/U1 collision](reference_training_learning_ms0_u1_collision.md) — 2026-05-13 5ae6f77c7. 7 files absorbed into peer commit. Fork to H:/prism-training-learning for U2+.
- [BLUEPRINT-OCR-TRAINING-MS1 collision](reference_blueprint_ocr_training_ms1_collision.md) — 2026-05-12 bravo 847b8ec8b. 3 forge4 files absorbed. Source of truth = spec doc. Fork for U1-U8.
- [H8 CoordinationStoreEngine SQLite WAL](reference_h8_coordination_store.md) — 2026-05-13 HOOK-SYNERGY. SQLite WAL replaces WORK_CLAIMS.json. 11-mode coord_sqlite action. 41 tests.
- [H7 AsyncHookDispatcher](reference_h7_async_hook_dispatcher.md) — 2026-05-13. T4 hooks decoupled via JSONL queue + detached runner. Stop returns <50ms. ASYNC_HOOK_LIMITS exported.
- [roadmap close-out 4 surfaces](feedback_roadmap_close_out.md) — Standing rule: envelope+roadmap-index+MILESTONE_PROGRESS+BUILD_STATE+chat-bus. `node scripts/close-out-milestone.mjs --milestone <ID>`.
- [Master Index surface](reference_master_index_surface.md) — 2026-05-12 alpha. ONE search replaces N Grep/Glob. master_index_query + node_status + /master-index + precheck-inject hook.
- [Awareness Stack — 6 surfaces](reference_awareness_stack.md) — 2026-05-12..13 alpha. master-index + utilization + snapshot + injects + /deep-search + /orphan-inventory. Use master_index_query FIRST.
- [git history strip recipe](reference_git_history_strip_recipe.md) — PowerShell+git-filter-repo for >100MB blobs. robocopy .git/ backup (not bundle, OOM). Quarantine corrupt loose objects.
- [git history strip 2026-05-12](reference_git_history_strip_event_2026_05_12.md) — Stripped models/*.bin (3.2GB) + system-viz JSONs (1GB). 4567 commits rewritten. cad-fusion-live-ms0 → 04d41edf7.
- [DEV-VELOCITY-AUTOTRIGGER-MS0](reference_dev_velocity_autotrigger.md) — 2026-05-12..13. 13 units: 11 skills + 3 hook changes + skill-auto-trigger.mjs. _skill-triggers.jsonl ledger.
- [no ScheduleWakeup in /loop](feedback_no_schedule_wakeup_in_loop.md) — Standing rule 2026-05-13: NEVER ScheduleWakeup between /loop iters. Cache cost not worth round-trip.
- [AI training first before revenue](feedback_ai_training_first_before_revenue.md) — 2026-05-17 juliett. Sequencing rule: pre-revenue, train per-domain AI engines on full corpus (JM-DIE 76K, MIT-OCW, monolith MIT kernels) so revenue ships at full potential.
- [Domain-pipeline MS0](domain-pipeline-ms0.md) — 2026-05-17 juliett. 18-stage print→part canonical pipeline × 13 domains; status-tagged engine map; ghost.domain_pipelines roost in /system-viz. Adaptive orchestrator = highest-leverage missing engine.

## Archived 2026-05-17T21:08:22.439Z — 24 entries

- [SkillTier wire pattern](reference_skill_tier_wire_pattern.md) — 2026-05-13 bravo 4765820a1+d1e6af9fd. 5-file orphan-rescue recipe: schemas+ACTION, dispatcher+remap, engine test, wire test, vitest+tsc.
- [U-COORD11 IPC named pipe](reference_u_coord11_ipc.md) — 2026-05-13 alpha 3b36fe5b4+a2ffc5025. NDJSON RPC over pipe/UDS. 3-tier fallback ipc→file→literal. ~1-2ms warm vs 20-80ms.
- [COORD-MS0/U4 collision](reference_coord_ms0_u4_collision.md) — 2026-05-13 alpha b12074821. U-COORD04 (+396 LOC + 36 tests) absorbed into peer's TRAINING-LEARNING commit.
- [AI-MAX-MS0/U-AIMAX07+08](reference_aimax_07_08_shipped.md) — 2026-05-13 bravo. ContextCompression+Checkpoint wired (14 actions). build-milestone-progress: walk flat units[] not phases[].units[].
- [U-COORD08 harden + collisions 5+6](reference_u_coord08_harden_ship.md) — 2026-05-13 alpha. CrossTerminalBroadcast trim + setMaxListeners. Engine→f26565281, test→d912739b1 (both mine).
- [INTEL-OLLAMA-OBSIDIAN P22-U03 collision](reference_intel_ollama_p22_u03_collision.md) — 2026-05-13 alpha. /pre-review (DeepSeek-R1) absorbed into peer f2c0ae42a. 3rd collision in 48h → fork EARLIER.
- [U-COORD05 hook wiring](reference_u_coord05_hook_wiring.md) — 2026-05-13 alpha 2a5666de2. cross-session-orchestrator T1 PreToolUse+PostToolUse. getBroadcaster() shim.
- [U-CINF04.x worker_threads runner](reference_u_cinf04x_shipped.md) — 2026-05-13 charlie. CADRegressionWorkerThreadRunner: 1-64 pool, abort honoring, storm-breaker. CAD-INFRA-MS0 15/15.
- [slimResponse strips empty arrays](reference_slimresponse_strips_empty_arrays.md) — responseSlimmer.ts drops null/undefined/empty. Wire tests: toBe(undefined) on empty path + non-empty proof test.
- [auto close-out audit](feedback_auto_close_out.md) — 2026-05-13 bravo. Standing rule: audit shipped-but-pending in roadmaps. 5 surfaces integrated. NEVER auto-flips — human-verify.
- [COORD-MS0/U1 collision](reference_coord_ms0_u1_collision.md) — 2026-05-13 charlie. Silent close-out: SUMMARY.json extant; envelope never flipped. Absorbed into peer b1e73b4e8.
- [scrutiny codex captures peer diffs](feedback_scrutiny_codex_captures_peer_work.md) — Standing rule: codex captures session-base→HEAD. Peer commits become noise. Fork at /checkin BEFORE picking.
- [pick-unit guides to system-viz](feedback_pick_unit_system_viz_guidance.md) — Standing rule: pick-unit emits research block: /system-viz → find → blast-radius → master_index_query → /awareness-snapshot → /dedup.
- [U-COORD06 startup banner](reference_u_coord06_ship.md) — 2026-05-14 alpha. coordination-startup-banner offline+TTL hint+defensive count, T4→T2 fix. Content absorbed via f650a8ebd.
- [Fleet Reaper MS0](reference_fleet_reaper.md) — 2026-05-14. Slot-aware orphan-process reaper; confirm-after-N-ticks gate (10min). 3 runners. /fleet-reaper in ONE chat only.
- [Fleet Reaper ship collision](reference_fleet_reaper_ship_collision.md) — Collision #7 2026-05-14 golf 307de0713. All 9 files committed under peer's CLEANUP-MS0 subject. Files correct; don't re-create.
- [COMMAND-KERNEL-MS0 collision split](reference_command_kernel_ms0_register_collision.md) — 2026-05-14. 29-unit synthesis on BACKEND-DEVTOOLS. Split 7e01cd12b + 3366a9c74. pick-dev.md devtools-locked.
- [Fleet Reaper Tier1+2](reference_fleet_reaper_tier1_2026_05_17.md) — 2026-05-17 alpha. tierFromPressure 3-band gate + 256MB ballast + critical service auto-restart. readDockerHealth top-level-key P0 fixed (real-shape E2E). 55 tests.
- [Fleet Reaper autonomy+robust](reference_fleet_reaper_autonomy_robust_2026_05_16.md) — 2026-05-16b alpha 2cd22c52. PS5.1 ConvertTo-Json raw C0→JSON.parse throws→reaper BLIND. Fix: strip C0. Installer S4U/AtStartup.
- [fleet design — up to 12 chats](feedback_fleet_design_10_chats.md) — Standing rule 2026-05-15 (expanded to 12 chats 2026-05-16): SLOT_NAMES from chat-slots.mjs, never hard-code count.
- [reflect all changes post-update](feedback_reflect_all_changes_post_update.md) — Standing rule 2026-05-15: every change-set updates 4 surfaces (CLAUDE.md + MEMORY.md + wiki + Obsidian). No silent drift.
- [U-CK06 command frontmatter schema](reference_u_ck06_command_frontmatter_schema.md) — 2026-05-15 alpha. Draft 2020-12, 14 properties. Validator. Baseline 33/167 valid.
- [U-VAULT01 5-namespace schema](reference_u_vault01_knowledge_vault_schema.md) — 2026-05-15 alpha. memory+wiki+commands+handoffs+specs. CLAUDE.md is pointer index NOT 6th namespace. Promotion: fleeting→memory→wiki→CLAUDE.md.
- [Session Continuity Stack](reference_session_continuity_stack_2026_05_15.md) — 2026-05-15. compact-boundary byte estimate + auto-resume on compact + terminal-window-id pin. 10 windows = 10 deterministic slots.
- [Obsidian memory routing](reference_obsidian_memory_routing.md) — Memory namespace `C:\Users\wompu\.claude\projects\H--prism\memory\` (76+ .md files). MEMORY.md is the index, target <200 lines.

---
name: zulu-domain-status-2026-06-11
description: "ZULU/hermes-zulu domain status -- every open/unfinished/unwired/dormant thread across Hermes+Obsidian+HMEMV, ROI-ranked, for fast context-regain"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.282Z
aliases: reference_zulu_domain_status_2026_06_11
---


**ZULU (galaxy hermes-zulu) domain status, verified 2026-06-11 (4-subagent gather against git+envelopes). One-stop context-regain for the Hermes-orchestration + Obsidian-memory-vault domain.**

## What the domain IS
hermes-zulu = PRISM's agent-fleet orchestration substrate. bravo BUILDS it; zulu IS the slot-less runtime conductor (Hermes desktop app embodies ZULU above the 25 worker slots). Owned engines (in `mcp-server/src/engines/`, NOT the galaxy subdir): HermesParallelFanoutPlanner/FileScopePartitioner/BudgetEnvelope/VerdictAggregator/SelfCorrection, ZuluTaskAuction/DashboardControl/FleetGovernor, MoonshotClient + DreamMarkerScanner/ModelAttribution/OpusCapability. Galaxy brain dir (`engines/hermes-zulu/`) holds only CLAUDE/MEMORY/PATHS/TOOLBELT/SOUL/AWARENESS.md. Surface = `prism_session` actions (zulu_authority_check, zulu_task_auction, hermes_fanout_plan, dream_scan, opus_assess_complexity).

## HMEMV ledger (HERMES-MEMORY-VAULT-MS0, in_progress)
- DONE: HMEMV01 (tiered consolidation, dd38559c21), HMEMV02 (explainable recall BOTH surfaces, 8d2521afff+722ee58a55), HMEMV03 (temporal recall_at_time/recall_as_of, wired prism_memory, BM25 prefilter+15s budget, 40/40, shipped 2026-06-11 -- envelope-sync d0c28a2d0e), HMEMV04 (dream cycle, 23de0e7881), HMEMV05 (memory-router intercept, 0b905a6c5c), HMEMV06 (reflect-on-memory, f3dce73b8d), HMEMV08 (Obsidian Bases, 3 .base pivot views memory-by-type/wiki-by-domain/wiki-by-slot, 8/8, 8dd0491369).
- IN-PROGRESS: HMEMV09 (Qdrant migration) = 2-of-3 corpora: memory (17,032 -> prism_memories) + wiki (53,930 -> prism_wiki, 7f01daa8ec) DONE; TRIBAL DEFERRED (sierra tribal-index sharded/mid-clobber-recovery). `streamPopulateQdrant` (OOM-proof) is the ready producer.
- NOT-STARTED: HMEMV07 (predictive warmup, dep HMEMV09), HMEMV10 (Hermes-MemoryProvider, ~200 LOC, dep HMEMV09), HMEMV11 (Dataview queries -- now UNBLOCKED since HMEMV08 shipped 2026-06-11).

## Other domain milestones (open counts)
- HERMES-AGI-ARCHITECTURE-MS0: not_started, 12 units (durable workflow, control plane, fanout swarm, kill-switch -- SAFETY-CRITICAL, human-verify).
- HERMES-CAPABILITY-EXPANSION-MS0: not_started, 16 units (trace replay, schema-output, cost telemetry, Excel surface, council/debate).
- HERMES-MASTER-ORCHESTRATOR-MS0: in_progress, 5 open -- U-HMO-AUTO-FANOUT (120 LOC, "biggest reason orchestrator at 28% used"), U-HMO-AUTO-CONSENSUS, U-HMO-CRON-REFLECT+DREAM (installers exist, tasks unregistered -> golf), U-HMO-P4 (ghost roost).
- HERMES-MCP-PLUGIN-INVENTORY-MS0: not_started, 14 units (GitHub/Postgres/SeqThinking/Stripe/Slack/Twilio MCP servers).
- INTEL-OLLAMA-OBSIDIAN-MS0: in_progress 37/92 (55 open: KIP pipeline, AUTO chain, cross-session bridge, vision pipeline).
- INTEL-OLLAMA-OBSIDIAN-MS1: in_progress 19/23 (4 open: P4-U05 personas-weighted consensus, P5-U02/03/04 auto-fork+directive-detector+arbitration-log).
- KNOWLEDGE-VAULT-MS0: not_started, 6 units (U-VAULT01 schema doc = root, unblocks promotion/back-flow/MOC/rot-sentinel).
- OBSIDIAN-COMPOUND-MS1: complete. OBSIDIAN-MS0: complete. OBSIDIAN-INTELLIGENCE-MS3: 17/24 (Track A1 docker-broker burn-in pending).

## Hermes/Obsidian linkage (operator's "link galaxy to hermes+obsidian")
- Hermes->PRISM: CONCRETE+LIVE. config.yaml mcp_servers.prism -> :3100/mcp (~103 dispatchers as Hermes tools). SlotBriefEngine + slot-brief-inject wired. hermes-workflow-planner.mjs bridges intent->Workflow.
- Obsidian: HALF-BUILT. WRITE path live (hermes-obsidian-memory-bridge.mjs -> knowledge/hermes-brain/, scheduled 15m). READ/query path MISSING: no mcp-obsidian stdio bridge in Hermes mcp_servers (Obsidian REST :27123 installed but REST not MCP). Hermes can write flat files but cannot query/link the vault graph. = the #1 Obsidian gap.

## Bravo open-tasks ledger keystone + cross-track
- KEYSTONE: 5h-quota populator -- `quota.fiveHour.pct` null on all sidecars (Claude Code doesn't emit rate_limits.five_hour on this host); gates account-switch->cron-enable->overnight-Hermes autonomy. Need alternate source (parse ~/.claude usage / ccusage / API headers).
- Open: injection-budget snapshot refresh (CAP gate fail-opens >24h stale); cron_mode deny->enable (needs Hermes restart); mcp-obsidian bridge; awareness#4 (memory->wiki auto-promote), #5 (per-edit /impact nudge); stale bravo=mill in orchestrator reader (source = SLOT_GALAXY_MAP not soul).
- Accel levers (papa-routed): L5 source-chain propagation (engine built, wiring absent), L2 psn-attribution ledger, L1 context-utilization telemetry.

## Orphaned (genuine, >10d, no pickup)
- HANDOFF-claude-21ee5ef6-zulu-rename-ms0.md (257h): the RENAME itself SHIPPED (71c7be4e38). Its RESUME payload (WEDM LoRA fine-tune in mike's galaxy + knowledge-eval build + wedm/CLAUDE.md S10 doc-fix) was NEVER picked up = ORPHANED.

## Top ROI next (ranked)
1. HMEMV09 tribal->Qdrant (blocked on sierra; producer ready). 2. mcp-obsidian stdio bridge (Hermes vault-QUERY -- the #1 Obsidian gap: Hermes can WRITE flat files but cannot query/link the vault graph). 3. HMEMV11 Dataview queries (now UNBLOCKED, dep HMEMV08 shipped). 4. HMEMV10 MemoryProvider (dep HMEMV09). 5. U-HMO-AUTO-FANOUT ("biggest reason orchestrator at 28% used"). 6. L5 source-chain wiring. [SHIPPED 2026-06-11: HMEMV03 temporal recall + HMEMV08 Obsidian Bases. DEFERRED: 5h-quota keystone -- needs cacheRead-exclude + real-ceiling calibration before activate, [[5h-quota-keystone-needs-calibration-2026-06-11]].]

## Regain pointers
Memories: reference_session_zulu_2026-06-11/-10, reference_hmemv09_wiki_qdrant_streaming_2026_06_11, reference_obsidian_fully_operational_2026_06_09, reference_hermes_control_readiness_nogo_2026_06_01. Specs: BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER.md, OBSIDIAN-HERMES-CONTEXT-LEARNING-ACCEL-2026-06-06.md, ZULU-HERMES-ARTICLE-VERIFY-2026-06-09.md. Commit discipline: [[zulu-commit-own-slot-branch]].

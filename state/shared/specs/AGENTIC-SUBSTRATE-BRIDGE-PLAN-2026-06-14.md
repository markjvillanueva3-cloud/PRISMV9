# Agentic-Substrate Bridge — Research + Design + Build Plan (2026-06-14, slot:bravo)

> Produced by the `agentic-substrate-bridge-research` ultracode Workflow (run `wf_5f29fddb-c96`, 15 agents / 2.19M tokens / 90 min). Deep research → adversarial gap-verify → bridge-graph design → adversarial plan critique. Full raw output: `C:\Users\wompu\AppData\Local\Temp\claude\H--PRISM\17b9f42e-5285-413f-8c56-b660acd6e74e\tasks\w2zgadb1a.output`. Operator directive: research the 7 agentic-infra topics, assess built-vs-gap, design a bridging graph that fires efficiently + synergizes with PSN, then build/wire/test/validate via forge/rgs/hermes.

## Topics assessed (7)
Hermes Agent · Claude Code & Codex Handoffs · Obsidian + QMD Memory · Run Agentic Loops · Fleet Tailscale Mesh · Cron Jobs + Kanban Board · Agentic Workflows.

> NOTE: `research:hermes-agent` arm hit a transient API rate-limit → assessment null. Re-run that single arm or rely on bravo's own hermes-zulu galaxy knowledge. The other 6 + verify + design + critique completed.

## System state (built vs gap, verified)
- **Run Agentic Loops** = BUILT/deep (loop-state.mjs, loop-iteration-inject, stop-force-loop-continue, planning-loop.mjs, prism_atcs 12 actions, AgenticLoopEngine). Gaps: ATCS replan is a `deferred` stub; no `loop_state` MCP query action; ScheduleWakeup↔loop-state decoupled.
- **Handoffs** = BUILT (per-agent-handoff, precompact, session-start-auto-resume, enforce-handoff-topic). Real gaps: `stop_on_stale_handoff.mjs` scans WRONG dir (dead check); 3/26 consolidated summaries missing (victor/quebec/yankee); `pre-commit-conflict-sim.mjs` unwired; no Codex-native handoff reader. (Refuted: HS-01 env anchor — refuses-to-guess, not silent; memory-seed consumer — already wired.)
- **Obsidian + QMD Memory** = BUILT/partial. Gaps: predictive QMD warmup (U-HMEMV07) not started; tribal Qdrant migration (U-HMEMV09) deferred; Hermes MemoryProvider compliance wrapper (U-HMEMV10) not started; Ollama .md offload only ~3.4% vs 30% target.
- **Cron + Kanban** = BUILT (many `PRISM *` scheduled tasks). Gaps: golf-cron-registry drift (defined vs live) only operator-piped; some install-*-task.ps1 lack dedup guard; Hermes kanban.db (:9120) has no PRISM dispatcher bridge; cron_mode operator-gated.
- **Agentic Workflows** = BUILT (Workflow tool, ATCS, forge, rgs). Gaps: AgentWorkflowEngine wired list-only (no start/status/resume/cancel); no unified workflow observability dashboard; forge-queue.jsonl not persisted.
- **Fleet Tailscale Mesh** = LARGEST GAP / essentially NOT BUILT. Only `setup-phone-ssh.ps1` touches tailscale; cross-host today = file-locks + hostname-keyed slots, no programmatic tailnet layer.

## REVISED IMMEDIATE ACTIONS (adversarially vetted — safe, non-duplicate, dependency-ready; BUILD FIRST)
1. **fix-stale-handoff-scan-dir** [hermes-zulu] — repoint ONLY the HANDOFF glob in `.claude/hooks/stop_on_stale_handoff.mjs:36` to `state/shared/handoffs/` (+ `consolidated/`); KEEP the `.compaction-survival.md` root check (lines 24-31). R9 found-fixture test. Zero new wiring, reversible. **Highest value — restores a dead production Stop check.**
2. **backfill-consolidated-handoffs** [hermes-zulu] — generate `state/shared/handoffs/consolidated/{victor,quebec,yankee}.md` from slot history. Pure data; completes 26/26. (november already present.)
3. **loop-state-query-dispatcher** [hermes-zulu] — add `prism_session:loop_state_query` (read-only over `state/shared/loop-state/*.json`). Verified absent; foundation for atcs-queue-push / agentworkflow-control / fleet-network.
4. **ollama-verified-offload-wire** [ai-training/india] — wire the verified 0-caller `scripts/lib/ollama-verified-offload.mjs` into PostToolUse + `.md` REPORTISH_EXT routing, fail-soft/detached. Attacks 3.4%→30% offload gap. → chat-bus india first.
5. **cross-pc-handoff-verify-wire** [fleet-hygiene/golf] — wire the verified `scripts/cross-pc-handoff-verify.mjs` into a Stop hook (DROP the false mesh dependency — ships independently). Advisory, reversible.
6. **cron-registry-autoreconcile** [fleet-hygiene/golf] — advisory SessionStart feed of a CronList snapshot into `cron-registry-reconcile.mjs`. Read-only.

## HOLD — spec-corrected before build (critique caught fabricated API names, R12)
- **psn-hermes-memory-provider** — plan claimed a "6-method semantic_search/store/forget/list_recent" contract; the REAL `memory-provider-abc.mjs` is **5-method: list/read/write/delete/stats** (4 provider files exist, not 5). Re-map PSN onto the real contract or it fails `validateProvider`.
- **stop-memory-promotion-suggest** — plan called `TieredMemoryEngine.scoreForPromotion`; the REAL API is `static promote(...)` + `PromotionPolicy`. Fix wireTo before building.

## HOLD — operator-gated, NEVER in /loop (highest blast radius)
- **zulu-fleet-direct-gate** (fleet auto-direction; behind zuluOptIn + governance verdict, never default-on).
- **kanban-db-prism-bridge** (touches healthy Hermes :9120 runtime; unverified service contract).
- **cron_mode enable** (touches healthy Opus 4.8 Hermes; restart risk).

## RE-SCOPE before build
- **scheduled-task-dedup-guard** — `install-fleet-reaper-task.ps1:78-80` ALREADY unregisters-before-register; many scripts self-dedup. Re-scope to ONLY the subset lacking the idiom + cross-script name collisions.
- **atcs-queue-push** — drop the false `dependsOn: loop-state-query-dispatcher` (queue_push lives in atcsDispatcher); confirm it isn't better as an extension of the existing `replan` action.

## Bridge-graph design (how they fire together — to-build edges)
- handoffs→loops: `stop_on_stale_handoff` (fix) + RESUME_LOOP handoff carries loop state across sessions (exists).
- loops→workflows: `prism_atcs` gates `queue_next`; `planning-loop.decidePlanningAction` → ATCS (exists, deepen).
- obsidian→psn: Ollama .md offload (wire) + memory-promotion Stop driver (build on real `promote()`).
- cron→hermes: cron-registry reconcile (build) + kanban.db bridge (gated).
- tailscale→fleet: `prism_fleet_network` dispatcher (greenfield) + cross-pc-handoff-verify (wire) + multi-host wiki.
- ALL roosts → system-viz MUST splice via regen-viz/merge-augmentations (single-writer), NEVER a direct 548MB graph write.

## Top risks
single-writer graph collision (use ghost-roost splice) · Hermes runtime restart (cron_mode/zulu gated) · cross-owner absorption (chat-bus + file-claim, clone-don't-fork) · zulu_fleet_direct blast radius (opt-in + governance) · duplication (WIRE-only units must edit-in-place) · host load (prewarm/offload fail-soft) · silent-failure regression (R9 found-fixture tests, not run-without-error).

## PLAN CORRECTIONS (R12 -- verified against live code AFTER the workflow; re-verify EVERY unit's premise before building)
- **#4 ollama-verified-offload-wire is NOT a real gap (premise falsified 2026-06-14).** The critique claimed `scripts/lib/ollama-verified-offload.mjs` has "ZERO callers (orphan to wire)". FALSE -- grep shows 6 live consumers: ollama-search-rerank.mjs, worklist-label-proposer.mjs, ollama-commit-msg.mjs, ollama-file-digest.mjs, ollama-loop-narrate.mjs, ollama-nav-rerank.mjs. It is an already-used shared library, not an orphan. "Wiring" it again = duplication. The ACTUAL (different, larger) opportunity would be extending Ollama AUTO-offload to `.md` vault reads in the PostToolUse routing -- a routing change with safety implications, NOT a cheap wire. DO NOT build #4 as framed.
- This is the 3rd fabrication in the design (after `TieredMemoryEngine.scoreForPromotion` and the 6-method provider contract). LESSON: the workflow's research/critique agents asserted several non-existent facts; treat the plan as a HYPOTHESIS, not ground truth. Before building ANY remaining unit, re-verify its premise live (grep/read the actual file). R8+R12.

## SHIPPED (this session, slot:bravo)
- U-FIX-STALE-HANDOFF-SCAN (commit 1438960f58) -- dead stop_on_stale_handoff hook fixed + 10 R9 tests + 2/2 scrutiny + live-validated.
- U-BACKFILL-CONSOLIDATED-HANDOFFS (commit da66478fbc) -- consolidated/{victor,quebec,yankee}.md via canonical generator -> 26/26 slot coverage.
- U-PLAN-CORRECT-OFFLOAD (commit cd2ad2979b) -- corrected the falsified #4 premise (ollama-verified-offload has 6 live consumers, not a 0-caller orphan; R12).
- U-CAG-HITRATE-TELEMETRY (commit 5d08e32cc1) -- DIRECT AI-substrate improvement: fleet-wide CAG hit/miss observability on the reasoning bridge (PSN leg #10, all 34 galaxies), fail-soft + CLI consumer + 9 R9 tests + 2/2 scrutiny + live-validated (2 misses recorded). Memory [[reference_cag_hitrate_telemetry_2026_06_14]].
- U-LOOP-STATE-READ-API (commit 4c0410301b) -- exported readFleetLoops() from loop-state.mjs (the .mjs foundation for #3); 6 R9 tests; live-verified on 289 loops. Memory [[reference_loop_state_read_api_2026_06_14]].
- **U-LOOP-STATE-QUERY-DISPATCHER (commit 79f452a2bf) -- round-1 #3 COMPLETE end-to-end:** prism_session:loop_state_query wired (ACTIONS + case in sessionDispatcher.ts) consuming the readFleetLoops on-disk contract; 7 dispatcher round-trip tests + 2/2 scrutiny + NaN-guard fixed inline; tsc clean. Cross-agent loops now queryable via MCP.
- **U-CROSS-PC-VERIFY-WIRE (commit f9f5770cd2) -- round-1 #5 COMPLETE:** advisory Stop hook wiring the unwired cross-pc audit (newest-5 handoffs) + fixed a latent superstring-main-guard OOM; 9 tests + 2/2 scrutiny. Memory [[reference_cross_pc_verify_wire_2026_06_14]].
- **U-CAG-STATS-DISPATCH (commit 0babcb5f2f) -- R15 WIRE-closure on the CAG telemetry:** prism_session:cag_stats surfaces the CAG hit-rate (the telemetry was CLI-only); inline-mirrors summarizeCagStats (TS can't import the .mjs), total-desc array, divide-by-zero guarded, 8 e2e + 2/2 scrutiny; live 3h/1m=0.75.
- **U-CROSS-PC-VERIFY-CLI-BOUND (commit 59c4ca58f6) -- R12 queued follow-up:** bound the CLI scan with a 16MB stat-and-skip (pure partitionBySize) so it no longer OOMs on the 700MB+ generated dumps; reports skips (content UNVERIFIED, not a clean assertion); 8+9 tests + 2/2 scrutiny; live exit 0, 26 skipped.
- **U-CAG-HITRATE-HEADLINE (commit d24f48cd16) -- R15 surface-closure:** SessionStart hook surfacing the CAG hit-rate into awareness (record->query->surface chain complete); imports the canonical summarizer (R8); settings.json wired C:+H:; 7 tests + 2/2 scrutiny; live "75% hit-rate over 4 lookups across 2 galaxies".

## PLAN CORRECTIONS round 2 (R12 -- #6 + round-2 falsified 2026-06-14; HARNESS-ONLY-TOOLS wall)
- **#6 cron-registry-autoreconcile is NOT buildable as a hook (premise falsified).** `cron-registry-reconcile.mjs`'s own header: *"Claude's CronList tool is not callable from Node -- it lives in the harness. So this helper consumes a CronList SNAPSHOT."* A SessionStart HOOK (.mjs) is under the EXACT same limitation -- it cannot produce a live cron snapshot. The reconcile fundamentally needs the chat MODEL to call CronList. A hook could only surface a registry-staleness advisory, not an autoreconcile. Do NOT build #6 as framed.
- **round-2 agentworkflow-control-actions is REDUNDANT (dedup violation).** orchestrationDispatcher ALREADY has `plan_create / plan_execute / plan_status / agent_execute / agent_parallel / agent_pipeline / swarm_*` -- that IS the agentic-workflow control surface. The harness `Workflow` tool is model-only (a dispatcher can't drive it). Building workflow_start/status/resume/cancel duplicates the existing surface. Do NOT build.
- **round-2 atcs-queue-push likely redundant.** atcsDispatcher already has `task_init / queue_next / replan / unit_complete / checkpoint`. Re-verify against those before building anything.
- **round-3 psn-hermes-memory-provider builds on an ORPHAN framework (premise falsified 2026-06-14).** `scripts/memory-providers/` (ABC + obsidian-feed + obsidian-receipt + prism-kg, built 2026-05-26) has NO live code consumer -- grep for importers returns ONLY conversation transcripts/cache (`.claude/projects/**/*.jsonl`), zero production `.ts`/`.mjs`. So (a) Obsidian is ALREADY a provider (feed+receipt), making a PSN/Obsidian provider redundant; (b) adding a 4th provider to a consumer-less framework is building dead code (R15 no-orphans violation). The REAL gap, if pursued, is wiring the EXISTING framework to a live consumer -- an architectural decision (what consumes it? worth reviving a 3-week-dormant abstraction?), NOT an autonomous /loop unit. DO NOT build a new provider until the framework has a consumer.
- **AUTONOMOUS-BUILDABLE WORK IN THIS PLAN IS EXHAUSTED (2026-06-14, evidence-backed).** Every remaining planned unit is now disqualified by live verification: #6 (harness-only wall), round-2 agentworkflow/atcs (redundant w/ orchestration/atcs dispatchers), round-3 psn-hermes-provider (orphan framework), round-3 stop-memory-promotion (cross-boundary wall + needs real promote() API verify + re-scope), round-4 Tailscale (operator-gated, never-in-loop). No honest, wired, non-fabricated, non-operator-gated unit remains. Next move requires an OPERATOR DECISION (see report) -- continuing to emit units against the unbounded keeper would be fabrication (R12).
- **DOCTRINE (4th/5th/6th fabrication in this plan): harness-only tools (CronCreate/CronList/Workflow/Agent) CANNOT be driven from a hook (.mjs) or a dispatcher (.ts) -- they live in the harness, callable only by the chat model.** Many "agentic" bridge units silently assumed a Node-side surface could drive them; it can't. The genuinely-buildable on-goal units are pure-file/compute (hooks) + engine-wrapping (dispatchers) -- which is exactly what the 3 substituted units (cag_stats dispatch, cli-bound, cag-headline) are. Round-3 (memory-promotion, psn-hermes-provider) + round-4 (Tailscale mesh) remain; re-verify each premise live (R8) and respect the cross-boundary wall before building.

## Build order (dependency-ordered)
Round 1 (parallel-safe, no deps): #1 fix-stale-handoff · #2 backfill-consolidated · #3 loop-state-query · #5 cross-pc-verify-wire · #6 cron-registry-autoreconcile.
Round 2 (after #3): atcs-queue-push (re-scoped) · agentworkflow-control-actions · #4 ollama-offload-wire (india chat-bus).
Round 3 (after spec-correction): stop-memory-promotion (real promote()) · psn-hermes-provider (5-method abc).
Round 4 (greenfield/gated): prism_fleet_network · fleet-multi-host-wiki · [operator-gated: zulu-fleet-direct, kanban-bridge, cron_mode].

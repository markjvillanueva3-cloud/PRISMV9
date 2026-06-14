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

## Build order (dependency-ordered)
Round 1 (parallel-safe, no deps): #1 fix-stale-handoff · #2 backfill-consolidated · #3 loop-state-query · #5 cross-pc-verify-wire · #6 cron-registry-autoreconcile.
Round 2 (after #3): atcs-queue-push (re-scoped) · agentworkflow-control-actions · #4 ollama-offload-wire (india chat-bus).
Round 3 (after spec-correction): stop-memory-promotion (real promote()) · psn-hermes-provider (5-method abc).
Round 4 (greenfield/gated): prism_fleet_network · fleet-multi-host-wiki · [operator-gated: zulu-fleet-direct, kanban-bridge, cron_mode].

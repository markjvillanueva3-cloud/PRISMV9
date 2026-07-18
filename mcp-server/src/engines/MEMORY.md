# Engines Baseline MEMORY.md — dev/build/mistake-learning/token-saving memory index (2026-05-27)

> **Cascade position:** root memory (via auto-load) → THIS BASELINE (when editing any engine) → per-galaxy `mill/MEMORY.md`, `lathe/MEMORY.md`, etc. Universal mistake-learning + token-saving + context-retention memories live here; domain-specific ones live under per-galaxy.

---

## Critical standing-doctrine feedback (always-load when in engines/)

These are the feedback memories that protect ALL engine work (not domain-specific). Read once, internalize. Each `[[link]]` resolves via memory_search MCP if the auto-mirror landed.

### Development discipline
- [[feedback_karpathy_discipline]] — CLASSIFY → TECHNIQUE → EDGE CASES → FAILURE MODES → THEN WRITE (R1)
- [[feedback_r5_thru_r12_doctrine]] — agent-era R5-R12 (model-for-judgment / budgets / conflicts / read-first / test-intent / checkpoint / conventions / fail-loud)
- [[feedback_engine_tests_in_tests_dir]] — tests go in src/__tests__/ ONLY (stop_on_unwired_assets scans only there)
- [[feedback_always_build]] — no stub engines; always-build-guard Stop hook + PENDING_GAP_ENGINES.json
- [[feedback_verify_actual_contract_not_proxy]] — repro must check the real contract not a byte-length proxy

### Mistake learning + close-out
- [[feedback_always_capture_lessons]] — 4-piece MISTAKE-LEARNING-LOOP (observe → root-cause → memory file → wiki gate)
- [[feedback_always_close_out]] — finish EVERY task before reporting done (doc-sync tail, tests, pre-existing follow-ups)
- [[feedback_always_update_wiki_on_bug_finding]] — wiki gate fires advisory if bug fix lacks wiki entry
- [[feedback_reflect_all_changes_post_update]] — every change-set propagates to 4 surfaces (CLAUDE.md + MEMORY.md + wiki + Obsidian)
- [[feedback_parallel_scrutiny_per_file]] — 2 reviewer agents per file in multi-file builds BEFORE next file
- [[feedback_scrutiny_3of3_readonly]] — strict 3-of-3 reviewer consensus on the WORKING-TREE diff (not just authored edits)

### Token saving + context retention
- [[reference_mcp_route_takeup_window_extend_2026_05_26]] — 60s→600s window-extend that improved take-rate measurement
- [[reference_phase1_token_savings_ship_batch_2026_05_26]] — 10-unit catalog of token-noise cleanups alpha shipped earlier this session
- [[reference_domain_galaxy_doctrine_2026_05_26]] — 8-pillar × 20-galaxy partition; per-galaxy CLAUDE.md = 5-8K tokens/SessionStart × 26 slots saved
- [[reference_session_continuity_stack_2026_05_15]] — terminal-pin + auto-resume on /compact + auto-precompact + per-subagent pre-search
- [[reference_session_continuity_stack_2026_05_15]] + [[reference_twid_resolver_cache_2026_05_15]] — TWID cache lookups
- [[reference_compaction_survival_2026_05_15]] — /compact survival discipline

### Multi-chat coordination
- [[feedback_commit_to_slot_worktree]] — slot-worktree commits don't get absorbed; shared-tree commits often do
- [[feedback_commit_prefix_main_on_shared_tree]] — `[MAIN]` prefix on shared H:/prism tree
- [[feedback_conflict_fork_rule]] — R7 surface-don't-average; fork to sibling worktree on lane conflict
- [[feedback_fleet_design_10_chats]] — read SLOT_NAMES from chat-slots.mjs (never hard-code count)
- [[feedback_golf_owns_reaper]] — golf is the hygiene slot (SUPERSEDES alpha-reaper)
- [[feedback_psk_kernel]] — 10 fail-soft syscalls at .claude/kernel/psk.mjs (powering /checkin /handoff /startup)

### Install vs build policy
- See [`./CLAUDE.md`](CLAUDE.md) §6 — install if domain-agnostic+stateless+1:1 marketplace match; build if PRISM-state-coupled
- 25 official Anthropic plugins enabled in C:/Users/wompu/.claude/settings.json `enabledMcpjsonServers`

### Anti-reinvention
- [[feedback_dedup_before_create]] (if exists) — duplicationGuardEngine.mustCheckBeforeCreating() THROWS on dup
- ENGINE_DIGEST.md auto-search before forging anything new
- 25-plugin marketplace inventory (per `./CLAUDE.md` §6)

---

## Candidate dev-baseline memories (flat → to-migrate)

Filename heuristic (broad — these touch many galaxies):

- `feedback_*` standing-doctrine files (most apply universally; the per-galaxy MEMORY.md indexes link the domain-specific ones)
- `reference/reference_*_session_continuity_*` — context-retention infrastructure
- `reference/reference_phase*_token_savings_*` — token-saving milestones
- `reference/reference_hook_*_2026_*` — hook learnings (apply to all dev work)
- `reference/reference_scrutiny_*` — review process learnings

## Cascade load order (when migration ships)

1. **universal/** memories (always, includes all `feedback_*` standing doctrine listed above)
2. **engines/baseline/** memories (THIS DIRECTORY's children, loaded when CWD enters any galaxy)
3. **galaxy-of-CWD/** memories (e.g. mill/ when editing a mill engine)
4. **slot-soul** (per chat)
5. **cross-galaxy/** memories (when current edit touches 2+ galaxies)

## Until migration: discoverability cheat-sheet

- `memory_search "<query>"` MCP — semantic search across all 641 flat memories
- `master_index_query "<query>"` MCP — unified search system-viz + wiki + memory + BUILD_STATE
- `grep -r "<term>" knowledge/memories/feedback/` — direct grep for standing doctrine
- `/master-index <query>` skill — friendlier wrapper

## Cross-refs

- Baseline doctrine: [`./CLAUDE.md`](CLAUDE.md)
- Sibling galaxy MEMORY.md: `./academy/MEMORY.md`, `./post-processor/MEMORY.md`, `./quoting/MEMORY.md`, `./business/MEMORY.md` (mill/lathe/wedm pending — same pattern)
- Migration unit: `mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json` → `U-GALAXY-MS1-C1-PER-GALAXY-MEMORY-MIGRATE` (bravo, mill pilot first)
- Root memory: `C:/Users/wompu/.claude/projects/H--PRISM/memory/MEMORY.md` (auto-loaded by harness, 2.2KB cap)
- Root memory overflow: `H:/prism/state/shared/MEMORY-RECENT.md` (U-MWO02 chronological recent-entries log)

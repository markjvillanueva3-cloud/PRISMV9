# Scrutiny Report — Operational Integrity + Plugin Ecosystem Activation
**Date:** 2026-04-15
**Subject:** `H:\prism\UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN-2026-04-15.md` (post 0.1-0.15)
**Scrutiny angle:** What happens when the plan meets reality? And why are 175 slash commands + dozens of agents + claude-flow / superpowers going unused?

**Method:** operational pressure-test of deployed plan + audit of `~/.claude/commands/` (175 files), `~/.claude/agents/` (12 files), plus available Task-tool agents (100+ specialized agents across claude-flow, flow-nexus, hive-mind, superpowers, pr-review-toolkit, SPARC).

---

## Part 1 — Operational Integrity Gaps

### O1. Bootstrap paradox (existential)
Phase 0.1 ships `PreTool Write` blocker hook that calls `mustCheckBeforeCreating`. **But the session implementing Phase 0.1 itself must write files without that hook active** — or it cannot ship. Plan has no `BOOTSTRAP_MODE` flag.

**Fix:** `state/shared/BOOTSTRAP_MODE.flag` + `hook_pre_tool_dedup` skips enforcement when flag present. Flag is removed by the Phase 0.1 exit gate. Flag presence is audit-logged.

### O2. Hook execution order is undefined
Final PreTool Write stack (post-Phase 0): dedup + svi-projection + managed-block-guard + awareness-floor + lock-acquire + claim-verify + triple-sync + domain-fanout + test-exists. What order? Wrong order = wrong semantics. E.g., lock-acquire must come BEFORE dedup (to prevent race); svi-projection must come AFTER dedup (no point projecting a blocked write).

**Fix:** `HOOK_ORDER_REGISTRY.json` with numeric priority per hook per event. Registry is versioned + schema-validated. Loader fails hard on ambiguous priority.

### O3. Retrofit gap — 1,660+ existing engines are un-wired
Phase 0.6 catches NEW writes. 1,660 existing engines may be un-reverse-indexed, lack awareness entries, or be orphaned. Phase 0.9 orphan hooks fire PostWrite → won't retroactively scan.

**Fix:** `scripts/retrofit-existing-artifacts.ts` — one-time batch pass + idempotent re-runnable. Ingests every existing engine/action/hook/skill/formula into reverse indexes + registry + AwarenessQueryEngine cache. Runs in `--dry-run` mode to report count; then `--apply`. Must run ONCE as the first action of Phase 0.7.

### O4. Performance budget is unstated
SessionStart now runs: 6 awareness engine loads + MIT embedding warm-up + SVI inject + capability manifest + doc-freshness scan + directive filter + metacog scheduler init. Could be 10-30 sec cold. Post-compact SessionStart also runs recovery. User experience dies.

**Fix:** budget declared and measured.
- SessionStart p95 ≤ 2s for warm boot, ≤ 5s cold
- First UserPrompt acceptance ≤ 3s after SessionStart
- Heavy loads (MiniLM embeddings, full registry scan) run **async after greeting** via `hook_post_greeting_warmup`
- Every boot step emits a trace span to `BOOT_TELEMETRY.jsonl`; regression > 20% auto-alerts

### O5. Per-tool-call overhead is unstated
Every PostTool runs: awareness-sync + doc-cascade + svi-watch-refresh + insights-check + orphan-detect + drift-detect + metacog (every 15th). Tool latency inflates linearly.

**Fix:** budget = p99 ≤ 200ms PostTool overhead. Hooks that exceed enter `DEGRADED_MODE` (async fallback + alert). Structural doc regen debounced (60s) and async; never synchronous on hot path.

### O6. No kill switch per hook
If `hook_metacognition_check` has an infinite-loop bug, every session hangs. No runtime disable.

**Fix:** `state/shared/HOOK_FEATURE_FLAGS.json` — per-hook runtime toggle (default on; flip to off without git). SessionStart reads at boot. `/hook-disable <hook-id>` skill for emergency.

### O7. Ledger unbounded growth
`SESSION_INSIGHTS_LEDGER.jsonl`, `SVI_DELTA_LEDGER.jsonl`, `DOC_CHANGE_LEDGER.jsonl`, `AWARENESS_SCORE_PER_SESSION.jsonl`, `DEPRECATION_LEDGER.jsonl`, `INVOCATION_TELEMETRY.json`, `ai-intelligence-log.jsonl` — all append-only with no retention.

**Fix:** `LEDGER_RETENTION_POLICY.json` per-ledger: `{hotDays, warmDays, coldArchive, maxSize}`. `scripts/ledger-compactor.ts` nightly rotates hot → warm → `state/archives/YYYY-MM/`. Query engines transparently span hot+warm.

### O8. Observability — no correlation IDs
When a forge-quint fails, we don't know which hook in the chain failed. No session→prompt→tool→hook trace.

**Fix:** inject `correlationId` (ULID) per user turn; propagate through every hook + engine call. Emit to `SESSION_TRACE.jsonl` as structured span records. `/trace <correlationId>` skill reconstructs the call tree.

### O9. Rollback incompleteness
Forge-quint says "on failure: `git checkout -- <files>`". But what about: registry delta already written? in-memory awareness cache? `SESSION_INSIGHTS_LEDGER` entries? cross-terminal broadcasts already sent?

**Fix:** `TransactionLogEngine.ts` with full undo-log. Every forge-quint step writes `{op, target, beforeHash, afterHash, undoFn}`. Rollback replays undo-log. Registry + cache + ledgers all participate. Cross-terminal broadcast is COMPENSATED (send `retract:{ulid}` message) not replayed.

### O10. Cross-file atomicity beyond registry
U-AWR25 locks `cross-session-asset-registry.json`. But forge-quint also writes: engine.ts, test.ts, skill.md, hook.ts, action schema, dispatcher edit. Lock on one file ≠ atomicity across all six.

**Fix:** `scripts/atomic-multifile-write.ts` — 2-phase commit across N files: phase 1 writes to `.pending/` shadow copies + checksums; phase 2 renames atomically under single lockfile. Any failure = clean `.pending/` deletion.

### O11. No feature flag / staging / canary for plan rollout itself
All 560 artifacts ship to every session simultaneously. No way to enable Phase 0.13 for 1 session and verify before going system-wide.

**Fix:** `HOOK_FEATURE_FLAGS.json` supports `{enabled: bool, rolloutPercent: 0-100, enabledSessions: []}`. `/phase-canary 0.13` enables a phase for the current session only.

### O12. State-file versioning is ad-hoc
`SESSION_HANDOFF_v2.json` has v2 in the filename, but no schema migration. When v3 ships, do v2 handoffs still read?

**Fix:** every state file has `schemaVersion` field + `src/migrations/state/<v1-to-v2>.ts`. `AwarenessBootstrapEngine` refuses to load unmigrated state.

### O13. No regression gate on Phase 0 introduction
Adding 90+ hooks risks breaking the 2,837-test suite. Plan has no "Phase 0 introduces 0 regressions" gate.

**Fix:** Phase 0 exit gate adds: `npx vitest run` must show same pass/fail count as pre-Phase-0 baseline (±0 regressions; failing tests may only be net-new Phase 0 tests, which must themselves pass).

### O14. Borderline semantic-similarity cases
`SemanticSimilarityGuardEngine` gate is cosine > 0.85. What about 0.82? Silent pass = potential duplicate. Silent block = false positives.

**Fix:** 3-band gate: `{≥0.85 BLOCK, 0.70-0.85 PROMPT-USER, <0.70 PASS}`. Prompt band asks in-session: "candidate X is similar to existing Y at 0.82 — extend Y or create new?". Decision recorded in `SIMILARITY_DECISIONS.jsonl` and becomes training signal for U-MIT04 active learning.

### O15. No explicit safety-file protection
Phase 0.15 managed blocks guard docs. What about CRITICAL code files (Kienzle coefficients, Taylor constants, S(x) logic)? Plan says "don't auto-regen in safety files" but no hard hook.

**Fix:** `hook_pre_tool_critical_file_guard` (PreTool Edit|Write) — reads `state/shared/CRITICAL_FILES.json`; any edit to listed files requires explicit `--critical-ack` flag in the tool call OR blocks and emits audit event.

---

## Part 2 — Plugin / Agent / Extension Activation Gaps

### Audit

**What is installed but unused:**

| Resource | Count | Usage |
|----------|-------|-------|
| Slash commands in `~/.claude/commands/` | **175** | <20 used regularly |
| Installed agents in `~/.claude/agents/` | 12 | build-doctor, catalog-enricher, code-archaeologist, dispatcher-wirer, doc-generator, physics-reviewer, regression-hunter, test-runner, wiring-review-agent (some used) |
| Available Task-tool agents | **~100+** | **~5 used regularly** |
| claude-flow multi-agent coordinators | mesh/hierarchical/adaptive/queen/raft/byzantine/gossip/quorum/crdt/consensus | **NEVER USED** |
| flow-nexus ecosystem | swarm/sandbox/neural/workflow/payments/app-store/challenges/auth | **NEVER USED** |
| hive-mind agents | collective-intelligence-coordinator/queen-coordinator/scout-explorer/worker-specialist/swarm-memory-manager | **NEVER USED** |
| superpowers | code-reviewer | **NEVER USED** |
| pr-review-toolkit | code-reviewer/code-simplifier/comment-analyzer/pr-test-analyzer/silent-failure-hunter/type-design-analyzer | **RARELY USED** |
| SPARC methodology | sparc-coord/sparc-coder/specification/pseudocode/architecture/refinement | **NEVER USED** |
| GitHub integration | swarm-pr/swarm-issue/pr-manager/release-manager/release-swarm/multi-repo-swarm | **NEVER USED** |
| Goal planners | goal-planner/code-goal-planner/sublinear-goal-planner | **NEVER USED** |
| Consensus builders | byzantine-coordinator/crdt-synchronizer/gossip-coordinator/raft-manager/quorum-manager | **NEVER USED** |
| MCP servers installed | prism, prism_safe only | no claude-flow, no flow-nexus MCP |

**The asymmetry:** the plan says "build forge-quint atomically." But forge-team agent exists (3-agent team for feature development). Why hand-roll when a specialized team is one delegation away?

### Why this matters

1. **Duplicated effort** — Phase 0 reinvents `task-orchestrator` + `perf-analyzer` + `consensus-coordinator` in-house
2. **Missing leverage** — `queen-coordinator` could orchestrate 15-agent concurrent swarms for the 180-artifact Phase-0 buildout
3. **Review gaps** — `silent-failure-hunter`, `pr-test-analyzer`, `type-design-analyzer` should fire on every PR; they don't
4. **Planning gaps** — `goal-planner` + `sublinear-goal-planner` could produce optimal Phase 0 build order with GOAP
5. **Knowledge gaps** — 155+ unused slash commands likely cover tasks we manually perform
6. **AGI shape** — true AGI infrastructure uses ensemble intelligence; current sessions are solo

### G-PLG1. No agent recommendation engine
Session doesn't know: "for THIS task, agent X is better than me solo." No routing table.

**Fix:** `AgentRegistryEngine.ts` — indexes all available Task-tool agents + their specialties + when-to-invoke. `hook_pre_tool_agent_suggest` (PreTool, when complex work detected): suggests agent delegation BEFORE starting. Session can accept/reject.

### G-PLG2. No slash-command recommendation
175 slash commands; session typically remembers 10-20. No suggest-on-intent.

**Fix:** `SlashCommandRecommenderEngine.ts` — embeds user prompt via MiniLM (Phase 0.12 U-MIT04); kNN against slash-command descriptions; suggests top-3 commands in session brief. `hook_user_prompt_submit_command_suggest` surfaces them.

### G-PLG3. No plugin inventory — what's installed vs available
No audit of `~/.claude/plugins/`, `~/.claude/marketplaces/`, `installed_plugins.json`. Session doesn't know what's there.

**Fix:** `PluginInventoryEngine.ts` — scans plugin dirs + marketplaces + generates `CAPABILITY_MANIFEST.json` (Phase 0.13) with installed+available tools. `/plugins` skill lists them. `/plugin-install <name>` wraps marketplace install.

### G-PLG4. Claude-flow MCP server is not configured
`.mcp.json` has prism + prism_safe only. claude-flow MCP tools (`mcp__claude-flow__swarm_init`, `mcp__claude-flow__agent_spawn`, `mcp__claude-flow__task_orchestrate`, `mcp__claude-flow__memory_usage`, `mcp__claude-flow__github_repo_analyze`, etc.) are referenced in agent definitions but unavailable.

**Fix:** add `claude-flow` MCP server to `.mcp.json` (spec from agent definitions). Also add `flow-nexus` MCP if the user wants neural/sandbox/workflow features. Verify via `/mcp-health` skill after install.

### G-PLG5. No "dogfood" rule
Phase 0 builds awareness infrastructure WITHOUT using the swarm/consensus/coordination agents already available.

**Fix:** Phase 0 build order includes delegation waypoints:
- `queen-coordinator` orchestrates Phase 0 units in parallel
- `consensus-coordinator` handles U-AWR25 cross-terminal coordination (Byzantine + CRDT)
- `perf-analyzer` benchmarks hook overhead (O4, O5)
- `goal-planner` computes build-order DAG
- `code-reviewer` (superpowers) reviews every Phase 0 commit
- `silent-failure-hunter` reviews every catch block added
- `type-design-analyzer` reviews every new schema

### G-PLG6. No SPARC methodology adoption for new features
Plan proceeds via ad-hoc forge-quint. SPARC (Specification → Pseudocode → Architecture → Refinement → Code) is an existing structured methodology we never use.

**Fix:** forge-quint becomes SPARC-backed optionally:
- Complex engines: `sparc-coord` orchestrates S→P→A→R→C phases
- Simple engines: ad-hoc forge-quint as today
- Flag: `--sparc` opt-in; engines tagged CRITICAL default to SPARC

### G-PLG7. No active exploration of unused commands
15 existing unused slash commands probably already solve Phase 0 problems. Nobody discovers them because nobody browses.

**Fix:** `/commands-audit` skill (lightweight): groups commands by category, flags "never invoked this session/week"; `hook_idle_curiosity` (Phase 0.13) surfaces one unused command per idle tick to promote awareness.

### G-PLG8. No github-integration for PRs
Phase 0-4 ships hundreds of commits. `swarm-pr`, `pr-manager`, `swarm-issue`, `release-manager` agents exist for PR orchestration. We commit directly to master.

**Fix:** Phase 0.17 includes `/pr-swarm` orchestrating review + test + type + comment analysis via pr-review-toolkit agents before any non-trivial merge.

---

## Phase 0.16 — Operational Integrity Layer (NEW)

**Goal:** make the plan deployable, rollback-able, observable, and bounded before any of the 560 artifacts ship.

### Units
| Unit | Artifact | Purpose |
|------|----------|---------|
| U-OI1 | `state/shared/BOOTSTRAP_MODE.flag` + loader | Escape hatch for Phase 0.1 implementation session |
| U-OI2 | `HOOK_ORDER_REGISTRY.json` + loader | Deterministic per-event hook ordering |
| U-OI3 | `scripts/retrofit-existing-artifacts.ts` | Backfill reverse indexes + awareness cache for 1,660+ existing engines |
| U-OI4 | `BOOT_TELEMETRY.jsonl` + boot budget gate | Measure + enforce SessionStart p95 ≤ 2s |
| U-OI5 | PostTool overhead budget gate | Enforce p99 ≤ 200ms; degraded-mode fallback |
| U-OI6 | `state/shared/HOOK_FEATURE_FLAGS.json` + `/hook-disable` skill | Runtime kill switch per hook |
| U-OI7 | `LEDGER_RETENTION_POLICY.json` + `scripts/ledger-compactor.ts` | Hot/warm/cold tiering + archival |
| U-OI8 | `correlationId` propagation + `SESSION_TRACE.jsonl` + `/trace` skill | End-to-end observability |
| U-OI9 | `TransactionLogEngine.ts` + full rollback | Undo log for forge-quint across registry, cache, ledgers, cross-terminal broadcasts |
| U-OI10 | `scripts/atomic-multifile-write.ts` | 2-phase commit across N files in a single lockfile |
| U-OI11 | Phase-canary flag + `/phase-canary <0.XX>` skill | Enable one phase for one session before system-wide rollout |
| U-OI12 | State file schema-versioning + migrations directory | Forward/backward compatibility |
| U-OI13 | Phase 0 regression gate | `npx vitest run` baseline comparison: 0 regressions allowed |
| U-OI14 | Semantic 3-band gate + `SIMILARITY_DECISIONS.jsonl` | BLOCK/PROMPT/PASS; decisions feed active learning |
| U-OI15 | `hook_pre_tool_critical_file_guard` + `CRITICAL_FILES.json` | Hard protection for safety-critical files |

### Exit gates
- Fresh session from cold boots in ≤ 5s; warm boots in ≤ 2s (measured 10× each)
- Every PostTool overhead ≤ 200ms p99 (measured over 500 tool calls)
- `scripts/retrofit-existing-artifacts.ts --apply` completes with 0 errors on full codebase
- Kill switch verified — flipping `hook_metacognition_check` off mid-session stops it within 1 tool call
- Ledger compactor reduces `SESSION_INSIGHTS_LEDGER.jsonl` hot size by ≥80% after simulated 1-month growth
- `/trace <id>` reconstructs a full call tree for a test prompt
- Forge-quint failure canary: deliberately fail at step 4 → all prior steps rolled back + registry + cache + ledgers all consistent
- 0 regressions: vitest pass count unchanged (pre-baseline vs post-Phase-0)

---

## Phase 0.17 — Plugin/Agent/Extension Activation Layer (NEW)

**Goal:** make every session aware of — and actively route to — the 175 slash commands, 100+ Task-tool agents, and uninstalled-but-available plugins (claude-flow, flow-nexus, superpowers).

### Units
| Unit | Artifact | Purpose |
|------|----------|---------|
| U-PLG1 | `AgentRegistryEngine.ts` | Index available Task-tool agents + specialties + when-to-invoke |
| U-PLG2 | `SlashCommandRecommenderEngine.ts` + `hook_user_prompt_command_suggest` | kNN prompt → top-3 slash-command suggestions in brief |
| U-PLG3 | `PluginInventoryEngine.ts` + `/plugins` + `/plugin-install <name>` | Installed+available plugin manifest |
| U-PLG4 | `.mcp.json` update + `/mcp-health` | Add `claude-flow` MCP (and optionally `flow-nexus`) + health check |
| U-PLG5 | Phase 0 delegation waypoints | `queen-coordinator` orchestrates buildout; `consensus-coordinator` for U-AWR25; `perf-analyzer` for budgets; `silent-failure-hunter` for review |
| U-PLG6 | SPARC opt-in for CRITICAL artifacts | `sparc-coord` wraps forge-quint for CRITICAL-classified work |
| U-PLG7 | `/commands-audit` skill + idle-curiosity integration | Promote unused commands during idle ticks |
| U-PLG8 | PR orchestration via `/pr-swarm` | `pr-manager` + `swarm-pr` + `pr-review-toolkit` agents on non-trivial PRs |
| U-PLG9 | `AGENT_UTILIZATION_LEDGER.jsonl` | Record every agent invocation; report weekly utilization distribution |
| U-PLG10 | Capability brief injection (Phase 0.13 extension) | `SituationalAwarenessFilterEngine` always includes top-3 relevant agents/commands for current prompt |

### Integration with prior phases
- Phase 0.13 `CAPABILITY_MANIFEST.json` gains `agents`, `slashCommands`, `plugins`, `mcpServers` keys
- Phase 0.13 `SituationalAwarenessFilterEngine` adds plugin/agent/command relevance ranking
- Phase 0.14 SVI backlog ranker is wrapped by `sublinear-goal-planner` for GOAP ordering
- Phase 0.15 doc-propagation uses `doc-generator` agent for JSDoc batch runs
- Phase 0.16 `U-OI3 retrofit` is orchestrated by `queen-coordinator` across 15 parallel workers

### Exit gates
- `/commands-audit` shows ≥40% of 175 slash commands invoked at least once across a 7-day window
- `AGENT_UTILIZATION_LEDGER.jsonl` shows ≥30 distinct agent types invoked weekly (up from ~5)
- `claude-flow` MCP server verified active (`/mcp-health` returns green)
- Every CRITICAL artifact added during Phase 1-4 uses SPARC methodology
- Every non-trivial PR (>100 LOC) invokes `/pr-swarm`
- Session brief contains top-3 relevant agents + top-3 relevant slash commands on ≥95% of UserPromptSubmit (measured)

### Anti-patterns
- Do NOT force-delegate every task — lightweight / known tasks remain solo
- Do NOT install flow-nexus / superpowers blindly — audit value-per-credit first (flow-nexus paid tier)
- Do NOT replace tribal `/forge-triple` — SPARC wraps CRITICAL work only
- Do NOT let agent recommendation become spam — rate-limit: max 1 suggestion per prompt

**Artifact count delta:** Phase 0.16 = ~15 units + 10 new artifacts; Phase 0.17 = ~10 units + 8 new artifacts. Combined ≈ +33 artifacts. Total plan: ~560 → ~593.

---

## Coupled Verdict

**Without Phase 0.16**, the 560-artifact Phase 0 is a loaded gun pointing at its own foot: first bad hook hangs every session; first bad rollback corrupts the registry; first ledger hits 10GB; first regression breaks 2,837 tests silently.

**Without Phase 0.17**, PRISM runs on 10% of available intelligence. 100+ specialist agents sit idle while the main session hand-rolls tasks they were built for. The plan says "build awareness"; the biggest awareness gap is *the agents don't know the agents exist*.

Combined, these two phases convert the plan from "ambitious blueprint" to "shippable infrastructure with leverage."

**Revised build order insert:**
```
...0.10 (Codex) → 0.13 (AGI) → 0.14 (SVI) → 0.15 (Docs)
  → 0.16 (Operational Integrity)   ← NEW — must land before any canary
  → 0.17 (Plugin Activation)        ← NEW — unlocks 10× leverage for 1-4
  → 0.12 (MIT exit gate)
  → 0.11 (Consolidated gate)
  → Phase 1
```

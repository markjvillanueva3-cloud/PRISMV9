# PRISM Dev Protocol v8.0

## Approach Decision — Before Writing Any Code

### Simple fix (<20 lines, single file)
→ Read → Edit → verify → done. No brainstorm. Skip ralph.

### Medium task (20-100 lines, 1-3 files)
→ Plan in your head → implement → self-review.
Optional: `prism_ralph:scrutinize` if it touches safety or core
infrastructure.

### Large task (>100 lines or >3 files)
→ `prism_sp:brainstorm` (MANDATORY — present to user, AWAIT APPROVAL)
→ `prism_sp:plan` (define steps, checkpoints, quality gates)
→ Implement in chunks (plan-first for each >50 line block)
→ `prism_ralph:loop` for validation (4-phase with API calls)
→ `prism_ralph:assess` for final grade (Opus-level review)

### Safety-critical (forces, speeds, G-code, anything that hits a real machine)
ALL of the above PLUS:
→ `prism_validate:safety` (S(x)≥0.70 HARD BLOCK)
→ `prism_omega:compute` (Ω≥0.70 sim, 0.95+ shop floor)
→ Evidence ≥ L4 (reproducible, not just sampled)

## Implementation Rules

### Code Editing
- Always READ before editing (never assume file contents).
- Use Edit / str_replace for surgical changes.
- NEVER retype entire files — Edit, don't rewrite.
- State exact line numbers changed after every edit.
- Verify changes compile: `npm run build:fast` (esbuild, ~3s).

### Anti-Regression (MANDATORY)
- `prism_validate:anti_regression` before ANY file replacement.
- Doc anti-regression: warn >30% loss, BLOCK >60% loss
  (automatic via hooks).
- New dispatcher / action / hook counts must ≥ old counts.
- When removing code: justify removal, confirm with user.

### File Operations Priority
1. `prism_doc` — for PRISM docs (todo, ACTION_TRACKER, roadmaps).
2. `prism_dev:file_read/file_write` — source code within mcp-server.
3. Direct `Read`/`Write`/`Edit` — general project files.
4. `Bash` — last resort, for container/system operations.

### Build Protocol
- Full: `npm run build` (tsc + esbuild, ~30s, pre-commit gate).
- Incremental: `npm run build:incremental` (~10s).
- Fast iteration: `npm run build:fast` (esbuild only, ~3s).
- After build: Phase Checklist + gsd_sync_v2.py auto-fire.
- Server restart needed to load new build (restart Claude app).

### Schema Versioning Protocol
- See `data/docs/protocols/SCHEMA_VERSIONING_PROTOCOL.md`.
- All state files MUST include `schemaVersion`.
- Breaking changes require migration in `src/migrations/`.
- Use `getVersionMetadata()` in dispatcher responses.

### Orchestration Protocol
- See `data/docs/protocols/ORCHESTRATION_PROTOCOL.md`.
- Use `withLock(resourceId, fn)` for exclusive resource access.
- Lock timeout: 30s default, increase for long ops.

## Auto-Fire Systems (Zero Token Cost)

Fire automatically — never call manually:

### Every Call
- `autoSkillHint` — loads SKILL.md excerpt for current tool:action.
- `autoKnowledgeCrossQuery` — enriches with material/formula/machine.
- `autoScriptRecommend` — suggests Python scripts from domain mapping.
- `autoInputValidation` — pre-dispatch parameter checking.

### Error Handling (auto)
- `autoD3ErrorChain` — extractor → pattern → learning store.
- Errors become learning data; warnings emerge BEFORE repeat.

### Success Tracking (auto)
- `autoD3LkgUpdate` — last-known-good per subsystem.
- `lkg_tracker` — rollback target on break.

### Context Management (auto)
- `autoTodoRefresh @5` — attention anchor.
- `autoContextPressure @8` — window monitor.
- `autoAttentionScore @8` — importance score for trim.
- `autoCheckpoint @10` — state snapshot.
- `autoCompactionDetect @12` — predict compaction.
- `autoCompactionSurvival @15/@41+/@60%+` — triple-redundant save.

### Performance (auto)
- `ComputationCache` — 3-tier LRU (30/120/300s).
- `DiffEngine` — CRC32 dedup, skips redundant writes.
- `BatchProcessor` — priority queue, fail-fast isolation.

## INTEL-OLLAMA-OBSIDIAN-MS0 Surfaces (in-flight milestone)

These are auto-wired and require no manual invocation:

### Vault Re-Chunk on Edit
- `claudemd-section-update.mjs` (PostToolUse) — re-chunks
  `H:/prism/CLAUDE.md` and global `~/.claude/CLAUDE.md` whenever they
  change. Idempotent; re-embeds only deltas.
- `gsd-section-update.mjs` (PostToolUse) — same for the three GSD
  source files (`GSD_QUICK.md`, `DEV_PROTOCOL.md`, `GSD_MICRO.md`).

### Semantic Routing Auto-Inject (UserPromptSubmit)
- `claudemd-ollama-enforcer` — top-3 CLAUDE.md sections per prompt.
- `gsd-section-retrieve` — top-3 GSD sections on GSD keywords.
- `ollama-skill-suggester` — top-5 skills via semantic_search.
- `ollama-route-recommender` — top-3 dispatcher actions.
- `ollama-obsidian-rag` — vault top-5 hits + Ollama summary on
  memory keywords.

### Error Capture & Recall Loop
- 4 PostToolUse capture hooks (`error-block-capture`,
  `error-pattern-memory`, `error-recovery-memory`, `error-learner-hook`)
  mirror to `UNIFIED_ERROR_LEDGER.jsonl` via
  `unified-ledger-mirror.mjs` helper → `prism_guard:error_ledger_append`.
- `error-block-prewarn` (PreToolUse) queries
  `prism_guard:error_ledger_recall_similar` for top-3 past errors and
  injects them into the prompt — 100% capture coverage (was ~25%).

### Session-End Consolidation
- `session-consolidate-graph` (Stop) increments
  `consolidation-counter.json` and runs
  `MemoryConsolidationEngine.consolidate()` at N=5 sessions.
- Patterns mirror to `knowledge/tribal/pattern-<id>.md`.

### One-Shot Embed / Mirror Scripts (re-runnable, idempotent)
- `scripts/populate-tribal-vault.mjs` — 4245 tips
- `scripts/chunk-claudemd-vault.mjs` — ~30 CLAUDE.md sections
- `scripts/chunk-gsd-vault.mjs` — 28 GSD sections
- `scripts/embed-all-skills.mjs` — 503 skills
- `scripts/embed-all-engines.mjs` — 3013 engines
- `scripts/embed-all-actions.mjs` — 6346 actions
- `scripts/mirror-memories-bootstrap.mjs` — MEMORY.md mirror
- `scripts/summarize-all-scripts-via-ollama.mjs` — 364 scripts
- `scripts/migrate-error-ledgers.mjs` — legacy → unified ledger

## Compaction Recovery (v21.1 — 3-layer automatic)

- **L1 `_context`** — every MCP response includes `task/resume/next`.
  Always present, zero cost.
- **L2 `_COMPACTION_RECOVERY`** — 5-call injection on 30s gap OR
  session_boot-mid-session.
- **L3 Aggressive hijack** — first call after detection → response
  REPLACED with full recovery payload.
- If `_COMPACTION_DETECTED: true` → follow `_MANDATORY_RECOVERY`. DO NOT
  re-audit. DO NOT ask user.
- If unclear: read `/mnt/transcripts/` latest + `state/RECENT_ACTIONS.json`
  → continue.
- User should NEVER need to say "check your logs" or "continue".

## Quality Tiers

### Tier 1 — Quick (no API calls)
`prism_validate:safety` → check S(x)≥0.70.
Use for: routine calculations, data lookups, simple fixes.

### Tier 2 — Standard (1 API call)
`prism_ralph:scrutinize` → single validator pass.
Use for: code changes, feature additions, bug fixes.

### Tier 3 — Deep (4-7 API calls)
`prism_ralph:loop` → SCRUTINIZE → IMPROVE → VALIDATE → ASSESS.
Use for: infrastructure changes, new features, refactors.
Expect: 30-60s, scored findings.

### Tier 4 — Release (Deep + Omega)
`prism_ralph:loop` THEN `prism_omega:compute`.
Use for: production ship, safety-critical paths.
Expect: Ω with component breakdown.

## When To Use What

### Understand a problem
`prism_sp:brainstorm` (7-lens analysis, grounded in PRISM knowledge).

### Find an asset
- Skills: `prism_memory:semantic_search kind=skill` or `prism_skill_script:skill_search`
- Scripts: `prism_skill_script:script_search`
- Engines: `prism_memory:semantic_search kind=engine` or
  `duplicationGuardEngine.checkBeforeCreatingSemantic`
- Actions: `prism_memory:semantic_search kind=action` or
  `prism_session:tool_route_best`
- Cross-registry: `prism_knowledge:search`
- Specific registry: `prism_data:material_search/machine_search/tool_search`

### Validate
- Physics: `prism_validate:material/kienzle/taylor/johnson_cook`
- Quality: `prism_validate:safety/completeness`
- Code: `prism_ralph:scrutinize` or `prism_ralph:loop`
- Release: `prism_omega:compute`

### Orchestrate
- Single agent: `prism_orchestrate:agent_execute`
- Parallel: `prism_orchestrate:agent_parallel`
- Vote: `prism_orchestrate:swarm_consensus`
- Multi-session: `prism_atcs:task_init`
- Background: `prism_autonomous:auto_execute`

### Manufacturing calculations
- `prism_calc`: cutting_force_kienzle, tool_life, speed_feed, mrr,
  power, chip_load, surface_finish, deflection, thermal, trochoidal,
  hsm, scallop, cycle_time, cost_optimize, multi_optimize
- `prism_safety`: check_toolpath_collision, validate_rapid_moves,
  check_spindle_torque, predict_tool_breakage,
  calculate_clamp_force_required, validate_workholding_setup
- `prism_thread`: calculate_tap_drill, calculate_thread_mill_params,
  generate_thread_gcode

### Recall memory
- `prism_memory:semantic_search { query, kind, limit }`
- `prism_guard:error_ledger_recall_similar` (past errors)
- `prism_memory:trace_decision` (graph trace)

### Track progress
- `prism_context:todo_update` — anchor current focus.
- `prism_doc:append name=ACTION_TRACKER.md` — log completed work.
- `prism_session:state_save` — persist for resume.

### Coordinate with other chats
- `prism_context:chat_post` — broadcast intent.
- `state/shared/AGENT_WORKBOARD.md` — claim a unit.
- `file-claim-guard` auto-tags edits with stable session id.

## Error Handling

Brief acknowledgment ("my bad") → immediate fix → todo update for
prevention. Add fixable errors to todo via
`prism_context:todo_update`. System automatically learns from errors
(D3 error chain + UNIFIED_ERROR_LEDGER). Check
`prism_guard:failure_library` and `prism_guard:error_ledger_recent`
for known failure patterns.

## Orchestrator Usage

When implementing features or fixes that span >4 steps:
1. `prism_autopilot_d:autopilot` for full lifecycle (GSD → state →
   brainstorm → execute → ralph → update).
2. For multi-session work: `prism_atcs:task_init` to create persistent
   tasks.
3. For parallel independent subtasks: `prism_orchestrate:swarm_parallel`.
4. For lightweight automation: `prism_autopilot_d:autopilot_quick`.

EXCEPTION: Do NOT orchestrate simple data lookups, single calculations,
or session management.

## Multi-Chat Coordination

```
Per-chat handoff:    state/shared/handoffs/HANDOFF-<id>-<topic>.md
                     Topic enforced by Stop hook enforce-handoff-topic.

File claims:         file-claim-guard (PreToolUse) tags edits with
                     stable session id. 15-minute lease. Other chats
                     warn before editing claimed files.

Commit ownership:    commit-ownership-guard (PreToolUse Bash) checks
                     staged files against ownership ledger. Accepts
                     both `claude-XXX` payload IDs and
                     `host-${hostname()}` fallback as "ours"
                     (HOOK-FIX-5/C).

Chat bus:            state/shared/AGENT_CHAT.md — post via
                     prism_context:chat_post when starting non-trivial
                     edits or when changing direction.

Workboard:           state/shared/AGENT_WORKBOARD.md — claim a unit
                     before starting; release on completion.
```

## Roadmap

```
Completed:
  D1-D4         Session, Context, Learning, Performance
  W1-W4         File-based GSD, wiring, orchestration, MCP wrappers
  W6.1-W6.3    Workflows, bug fixes, memory migration + audit
  W7            GSD consolidation to v22.0
  F1-F8         PFP, MemGraph, Telemetry, Certs, MultiTenant,
                NL Hooks, Bridge, Compliance

In progress:
  ENGINE-WIRE-MS0
  CAM-EXHAUST-MS0/U-CAM-FIDX-*

Active milestone — INTEL-OLLAMA-OBSIDIAN-MS0 (92 units):
  Phase 0  ✅ Embedder + Qdrant infrastructure (1 unit)
  Phase 1  ✅ Vault chunking + memory mirror (5 units)
  Phase 2  ✅ Unified error ledger + Qdrant prewarn (4 units)
  Phase 3  ✅ Asset routing — skills/scripts/engines/actions (5 units)
  Phase 4  → Knowledge routing — GSD/directives/wiki (1/4 done)
  Phase 5+ → Reasoning orphans, BIM facade, fleet learning (76 units)
```

## Changelog
- 2026-04-28: v8.0 — INTEL milestone refresh. Added Vault Re-Chunk on
  Edit, Semantic Routing Auto-Inject, Error Capture & Recall Loop,
  Session-End Consolidation, Multi-Chat Coordination sections. Updated
  asset finding section to reference semantic_search backends. Counts
  rolled to 3018 engines / 95 dispatchers / 6346 actions / 357 hooks.
- 2026-02-13: v7.2 — F1-F8 complete. 31 dispatchers, 368 actions, 37 engines.
- 2026-02-11: v7.1 — Updated roadmap (W2-W4/W6 complete).
- 2026-02-10: v7.0 — Content-optimized. Decision trees, quality tiers,
  when-to-use-what guide.

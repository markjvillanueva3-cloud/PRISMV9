# PRISM Dev Protocol v7.0

## APPROACH DECISION (before writing any code)

### Simple fix (<20 lines, single file)?
→ READ → edit_block → verify → done
No brainstorm needed. Just fix it.

### Medium task (20-100 lines, 1-3 files)?
→ Plan in your head → implement → self-review
Call prism_ralph→scrutinize on the result if it touches safety or core infrastructure.

### Large task (>100 lines or >3 files)?
→ prism_sp→brainstorm (MANDATORY — present to user, AWAIT APPROVAL)
→ prism_sp→plan (define steps, checkpoints, quality gates)
→ Implement in chunks (plan-first for each >50 line block)
→ prism_ralph→loop for validation (4-phase with API calls)
→ prism_ralph→assess for final grade (Opus-level review)

### Safety-critical (touches calculations, forces, speeds)?
→ ALL of the above PLUS:
→ prism_validate→safety (S(x)≥0.70 HARD BLOCK)
→ prism_omega→compute (Ω≥0.70 for release)
→ Evidence≥L4 (reproducible, not just sampled)

## IMPLEMENTATION RULES

### Code Editing
- Always READ before editing (never assume file contents)
- Use edit_block or str_replace for surgical changes
- NEVER retype entire files — append, don't rewrite
- State exact line numbers changed after every edit
- Verify changes compile: npm run build (esbuild, NEVER tsc)

### Anti-Regression (MANDATORY)
- prism_validate→anti_regression before ANY file replacement
- Doc anti-regression: warn >30% loss, BLOCK >60% loss (automatic via hooks)
- New dispatcher/action/hook counts must ≥ old counts
- When removing code: justify removal, confirm with user

### File Operations Priority
1. prism_doc (for PRISM docs: todo, ACTION_TRACKER, roadmaps)
2. prism_dev→file_read/file_write (for source code within MCP server)
3. Desktop Commander (for files outside MCP server, non-PRISM operations)
4. bash_tool (last resort, for container operations)

### Build Protocol
- See `data/docs/protocols/BUILD_PROTOCOL.md` for full specification
- Command: npm run build (alias for build:verify — tsc + esbuild, ~30s)
- Fast iteration: npm run build:fast (esbuild only, ~3s)
- After every build: Phase Checklist fires automatically
- gsd_sync_v2.py runs automatically on build success
- Server restart needed to load new build (restart Claude app)

### Schema Versioning Protocol
- See `data/docs/protocols/SCHEMA_VERSIONING_PROTOCOL.md` for full specification
- All state files MUST include `schemaVersion` field
- Breaking changes require migration script in `src/migrations/`
- Use `getVersionMetadata()` in dispatcher responses

### Orchestration Protocol
- See `data/docs/protocols/ORCHESTRATION_PROTOCOL.md` for full specification
- Use `withLock(resourceId, fn)` for exclusive resource access
- Orchestration dispatchers require distributed locks
- Lock timeout: 30s default, increase for long operations

## AUTO-FIRE SYSTEMS (zero token cost)

These fire automatically — never call them manually:

### Every Call
- autoSkillHint: Loads relevant SKILL.md excerpt for current tool:action
- autoKnowledgeCrossQuery: Enriches with material/formula/machine knowledge
- autoScriptRecommend: Suggests Python scripts from domain mapping
- autoInputValidation: Pre-dispatch parameter checking

### Error Handling (automatic)
- autoD3ErrorChain: error_extractor→pattern_detector→learning_store
- Errors become learning data — patterns detected, stored, recalled
- Next occurrence: system warns BEFORE you repeat the mistake

### Success Tracking (automatic)
- autoD3LkgUpdate: Records last-known-good state per subsystem
- lkg_tracker provides rollback targets when things break

### Context Management (automatic)
- autoTodoRefresh @5: Keeps attention anchored on current task
- autoContextPressure @8: Monitors context window usage
- autoAttentionScore @8: Scores content importance for trimming
- autoCheckpoint @10: Automatic state snapshot
- autoCompactionDetect @12: Predicts when compaction will occur
- autoCompactionSurvival @15/@41+/@60%+: Triple-redundant save

### Performance (automatic)
- ComputationCache: 3-tier LRU (SAFETY=30s, STANDARD=120s, STABLE=300s)
- DiffEngine: CRC32 dedup, skips redundant writes
- BatchProcessor: Priority queue, fail-fast isolation

## COMPACTION RECOVERY (v21.1 — 3-layer automatic)

**L1 (_context)**: Every MCP response includes task/resume/next. Always present, zero cost.
**L2 (_COMPACTION_RECOVERY)**: 5-call injection on 30s gap OR session_boot-mid-session.
**L3 (Aggressive hijack)**: First call after detection → response REPLACED with full recovery payload.
- If `_COMPACTION_DETECTED: true` → follow `_MANDATORY_RECOVERY`. DO NOT re-audit. DO NOT ask user.
- If unclear: read /mnt/transcripts/ latest file + C:\PRISM\state\RECENT_ACTIONS.json → continue.
- Survival reads ACTION_TRACKER pending items + RECENT_ACTIONS flight recorder.
- User should NEVER need to tell Claude to "check your logs" or "continue".

## QUALITY TIERS

### Tier 1: Quick (no API calls)
prism_validate→safety → check if S(x)≥0.70
Use for: routine calculations, data lookups, simple fixes

### Tier 2: Standard (1 API call)
prism_ralph→scrutinize → single validator pass with findings
Use for: code changes, feature additions, bug fixes

### Tier 3: Deep (4-7 API calls)
prism_ralph→loop → SCRUTINIZE→IMPROVE→VALIDATE→ASSESS
Use for: infrastructure changes, new features, refactors
Expect: 30-60s total, detailed findings with scores

### Tier 4: Release (Deep + Omega)
prism_ralph→loop THEN prism_omega→compute
Use for: anything shipping to production, safety-critical paths
Expect: Ω score with component breakdown

## WHEN TO USE WHAT

### I need to understand a problem
prism_sp→brainstorm (7-lens analysis, grounded in PRISM knowledge)

### I need to find something
prism_skill_script→skill_search or script_search (by keyword)
prism_knowledge→search (cross-registry: materials, formulas, machines)
prism_data→material_search/machine_search/tool_search (specific registries)

### I need to validate something
prism_validate→material/kienzle/taylor/johnson_cook (physics models)
prism_validate→safety/completeness (quality checks)
prism_ralph→scrutinize or loop (code/architecture review)

### I need to orchestrate complex work
prism_orchestrate→agent_execute (single agent task)
prism_orchestrate→agent_parallel (multiple agents simultaneously)
prism_orchestrate→swarm_consensus (agents vote on best approach)
prism_atcs→task_init (multi-session autonomous task)
prism_autonomous→auto_execute (background processing)

### I need manufacturing calculations
prism_calc: cutting_force, tool_life, speed_feed, mrr, power, chip_load, surface_finish, deflection, thermal, trochoidal, hsm, scallop, cycle_time, cost_optimize, multi_optimize
prism_safety: check_toolpath_collision, validate_rapid_moves, check_spindle_torque, predict_tool_breakage, calculate_clamp_force_required, validate_workholding_setup
prism_thread: calculate_tap_drill, calculate_thread_mill_params, generate_thread_gcode

### I need to track progress
prism_context→todo_update (anchor current focus)
prism_doc→append name=ACTION_TRACKER.md (log completed work)
prism_session→state_save (persist state for resume)

## ERROR HANDLING

Brief acknowledgment ("my bad") → immediate fix → todo update for prevention.
Add fixable errors to todo via prism_context→todo_update.
System automatically learns from errors (D3 error chain).
Check prism_guard→failure_library for known failure patterns.

## ORCHESTRATOR USAGE

When implementing features or fixes that span >4 steps:
1. Consider `prism_autopilot_d→autopilot` for full lifecycle (GSD→State→Brainstorm→Execute→Ralph→Update)
2. For multi-session work, use `prism_atcs→task_init` to create persistent tasks
3. For parallel independent subtasks, use `prism_orchestrate→swarm_parallel`
4. For lightweight automation, use `prism_autopilot_d→autopilot_quick`

EXCEPTION: Do NOT orchestrate simple data lookups, single calculations, or session management.

## ROADMAP
D1-D4: ✅ COMPLETE (Session, Context, Learning, Performance)
W1-W4: ✅ COMPLETE (File-based GSD, wiring, orchestration, MCP wrappers)
W6.1-W6.3: ✅ COMPLETE (Workflows, bug fixes, memory migration + audit)
W7: ✅ COMPLETE (GSD consolidation to v22.0)
F1-F8: ✅ COMPLETE (PFP, MemGraph, Telemetry, Certs, MultiTenant, NL Hooks, Bridge, Compliance)
W5: PENDING P3 (Knowledge recovery — registry loading fix)

## Multi-Model Consensus Pipeline (added 2026-05-04, INTEL-OLLAMA-OBSIDIAN-MS0)

PRISM now ships a multi-model consensus pipeline that fans high-stakes prompts to 3-4 independent reasoners in parallel and scores their agreement. Use it for: roadmap drafting, architecture decisions, bug-cause hypotheses, gap analysis, test scrutiny, build/release validation, anywhere a single model's blind spots are unacceptable.

### Voices in the pool
- **Claude** (this session — when called from outside via `claude -p` subprocess; skip with `includeClaude:false` if caller IS Claude)
- **gpt-5.5** (Codex CLI, ChatGPT auth, default reasoning_effort=xhigh — drop to medium/low for routine drafts to save tokens)
- **Grok-4** (xAI HTTP — only fans out when `XAI_API_KEY` env var is set; auto-skipped otherwise)
- **Ollama deepseek-r1:14b** (local CoT) + **Ollama qwen2.5-coder:14b** (auto-added 4th voice when Grok is unavailable — keeps the pool at 4 for $0)

### How to invoke
```jsonc
// Direct dispatcher action — full result with factCheck + recommendation
{ "tool": "prism_ai", "action": "consensus", "params": {
    "prompt": "Draft a 3-phase roadmap for X with units, dependencies, exit conditions",
    "includeClaude": false,
    "codexEffort": "medium"
}}
// Or auto-fire via TaskInput.consensus + ModelRouter
{ "kind": "code", "consensus": true }                    // → tier 6 explicit
{ "kind": "code", "domain": "physics" }                  // → tier 6 (auto for safety/Kienzle/Taylor/etc)
```

### Auto-injected PRISM context (Layer 1)
Every consensus model now reasons WITH PRISM knowledge — `PRISMContextInjectorEngine` auto-prepends CLAUDE.md essentials, PRISM-INVENTORY, GSD_QUICK, DEV_PROTOCOL, omega-thresholds, 6-terminal protocol, plus top-K relevance-ranked engines from ENGINE_DIGEST. Per-model context budget (Claude/Codex 100K, Grok 50K, Ollama 24K). Suppress with `prismContext:false`.

### Auto fact-check (Layer 3)
`ConsensusFactCheckerEngine` scans every model answer for engine names + dispatcher actions and validates them against the live ENGINE_DIGEST + caller-supplied dispatcher allowlist. Hallucinations land in `result.factCheck[modelName].hallucinations` with closest-match suggestions (Levenshtein-1). `factualityScore = verified/total`. **Treat any answer with hallucinations as suspect — likely it's also wrong about something less detectable.**

### 6-terminal coordination (already wired)
`ConsensusCoordinatorEngine` enforces: 1 in-flight per terminal, 3 globally, 500K daily Codex token budget, atomic cross-process file lock, 1-hour result cache by sha256(prompt+taskType+context), graceful degrade on rate-limit / budget-exhausted.

### Cost guidance
| Model | ~tokens/call | Latency | When |
|---|---|---|---|
| gpt-5.5 xhigh | 40-60K | 1-3 min | Code review, architecture decisions |
| gpt-5.5 medium | 5-15K | 30-90s | Roadmap drafting, gap analysis |
| gpt-5.5 low | 2-8K | 10-30s | Routine multi-eyes drafts |
| Grok-4 medium | 3-10K | 5-30s | Cross-vendor sanity check |
| Ollama 14b | 0 | 1-90s | Cheap independent voice |
| Claude (subprocess) | session tokens | 10-60s | Self-review or outside-of-session call |

### Failure modes
- `recommendation: "escalate"` — models disagreed wildly OR all failed; escalate to human
- `recommendation: "review"` — partial agreement (40-70% Jaccard); treat as a hypothesis
- `recommendation: "accept"` — ≥70% agreement; safe to refine and adopt
- `kind: "rate-limited"` — peer terminal is consensusing; retry in 5-10s
- `kind: "budget-exceeded"` — hit daily cap; degrade to claude-only or wait 24h

Full reference: `state/shared/CONSENSUS-USAGE.md`.

## Changelog
- 2026-05-04: Multi-Model Consensus Pipeline added — Codex (gpt-5.5) + Grok (HTTP, optional) + Dual-Ollama + auto-PRISM-context-injection + auto-fact-check + 6-terminal-safe coordinator. 314/314 tests across 13 files green. INTEL-OLLAMA-OBSIDIAN-MS0 commits 9cef312b0 → 2adc384d2.
- 2026-02-13: v7.2 — F1-F8 complete. 31 dispatchers, 368 actions, 37 engines. Updated roadmap.
- 2026-02-11: v7.1 — Updated roadmap (W2-W4/W6 complete). Verified 324 actions across 27 dispatchers.
- 2026-02-10: v7.0 — Content-optimized. Decision trees, quality tiers, when-to-use-what guide.

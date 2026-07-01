# GSD (GET SHIT DONE) v20
## PRISM Manufacturing Intelligence — Operating Protocol
## Updated: 2026-02-10 | D1-D4 COMPLETE | Context Optimization LIVE

---

# 6 LAWS
1. **S(x) ≥ 0.70** or BLOCKED — non-negotiable safety threshold
2. **No placeholders** — every value real, every function implemented
3. **New ≥ Old** — anti-regression: new versions always equal or exceed old
4. **MCP-first** — use prism:DISPATCHER action=ACTION before any alternative
5. **No duplicates** — one source of truth for everything
6. **100% utilization** — use all available tools, skills, hooks

# BOOT SEQUENCE
```
1. prism_dev → session_boot (loads state, identifies resume)
2. prism_context → todo_update (get current task)
3. Read _cadence for pressure/zone/survival data
4. If _COMPACTION_RECOVERY present → follow instruction immediately
```

# END SEQUENCE
```
1. prism_session → state_save
2. prism_doc → append(ACTION_TRACKER.md)
3. prism_context → todo_update
```

# BUFFER ZONES (v2 — ADVISORY ONLY)
No forced caps. No session death. Pressure-based truncation is sole governor.
```
🟢 GREEN  0-20 calls  — Normal operation
🟡 YELLOW 21-30 calls — Plan checkpoint soon
🔴 RED    31-40 calls — Checkpoint recommended
⚫ BLACK  41+ calls   — Advisory: monitor pressure, auto-save fires
```

# TRUNCATION CAPS (PRESSURE-ONLY)
```
Normal (0-59%):   20KB per response
Elevated (60%+):  12KB per response
High (70%+):      8KB per response
Critical (85%+):  5KB per response
```
Oversized results externalized to C:\PRISM\state\externalized\ with summary kept in context.

# COMPACTION RECOVERY PROTOCOL
When any tool response contains `_COMPACTION_RECOVERY`:
1. STOP whatever you were about to say
2. Read the `instruction` field — do exactly what it says
3. Read `context.you_were_doing` for orientation
4. Continue seamlessly WITHOUT asking user what to do
5. Do NOT explain compaction. Do NOT apologize. Just continue.

# SURVIVAL SAVE SCHEDULE
```
Every 15 calls:  COMPACTION_SURVIVAL.json updated (periodic safety net)
At 41+ calls:    COMPACTION_SURVIVAL.json + CURRENT_STATE.json saved
At 60%+ pressure: COMPACTION_SURVIVAL.json saved during auto-compress
```
Survival data includes: current_task, todo_snapshot, quick_resume, active_files,
recent_decisions, key_findings, next_action, session_id, phase.

# CADENCE AUTO-FUNCTIONS (25 total, zero-token-cost)
```
@5 calls:   todo_update
@8 calls:   pressure_check, attention_score, d4_batch_tick
@10 calls:  auto_checkpoint
@12 calls:  compaction_detect, compaction_predict
@15 calls:  survival_save, d4_cache_check, telemetry_snapshot
@20 calls:  variation_check
@error:     error_learn chain (extract→pattern→learn)
@success:   lkg_update, failure_pattern_resolve
@70%+:      python_compress
@<40%:      python_expand, context_pullback
```

# DISPATCHERS (24 active)
```
#1  prism_data         14 actions  Material/Machine/Tool/Alarm/Formula CRUD
#2  prism_orchestrate  14 actions  Agent/Swarm/Plan/Queue orchestration
#3  prism_hook          18 actions  Hook & event management
#4  prism_skill_script  23 actions  Skills + Scripts + Knowledge
#5  prism_calc          21 actions  Manufacturing physics calculations
#6  prism_session       26 actions  Session state + lifecycle
#7  prism_generator     6 actions   Hook generator
#8  prism_validate      7 actions   Validation dispatcher
#9  prism_omega         5 actions   Quality equation (Ω)
#10 prism_manus        11 actions   Manus AI agent + dev hooks
#11 prism_sp           19 actions   Development protocol (Superpowers)
#12 prism_context      18 actions   Context Engineering (Manus 6 Laws)
#13 prism_gsd           6 actions   GSD protocol access
#14 prism_autopilot_d   8 actions   AutoPilot workflow orchestration
#15 prism_ralph         3 actions   4-phase Ralph validation
#16 prism_doc           7 actions   Document management
#17 prism_dev           9 actions   Dev workflow tools
#18 prism_guard        14 actions   Reasoning + Enforcement + AutoHook
#19 prism_atcs         10 actions   Autonomous Task Completion System
#20 prism_autonomous    8 actions   Autonomous execution engine
#21 prism_telemetry     7 actions   Dispatcher telemetry (F3, rebuilt v2.0)
#22 prism_pfp           6 actions   Predictive Failure Prevention (F1)
#23 prism_memory        6 actions   Cross-session memory graph (F2)
#24 prism_thread       12 actions   Threading calculations
#25 prism_toolpath      8 actions   Toolpath strategy engine
#26 prism_safety       29 actions   Safety-critical validations
#27 prism_knowledge     5 actions   Unified knowledge query
```

# QUALITY GATES
```
S(x) ≥ 0.70:     HARD BLOCK — safety score must pass
Ω ≥ 0.70:        Release ready
Evidence ≥ L3:    Required for manufacturing claims
Anti-regression:  validate_anti_regression before ANY file replacement
```

# EDITING PROTOCOL
```
1. READ file first (view or read_file)
2. Edit with edit_block/str_replace (never retype)
3. VERIFY exact changes after edit
4. State line numbers changed
5. Append don't rewrite when possible
6. Plan first for >50 lines, get approval
7. Ask when ambiguous, don't assume
```

# BUILD
```
ALWAYS: npm run build (esbuild) — NEVER tsc (OOM)
AFTER BUILD: Phase Checklist → skills→hooks→GSD→memories→orchestrators→state→scripts
```

# KEY PATHS
```
MCP Server:  C:\PRISM\mcp-server\
Skills:      C:\PRISM\skills-consolidated\
State:       C:\PRISM\state\
Autonomous:  C:\PRISM\autonomous-tasks\
Scripts:     C:\PRISM\scripts\core\
System:      DIGITALSTORM-PC
```

# ROADMAP STATUS
```
D1 Session Resilience:    ✅ COMPLETE
D2 Context Intelligence:  ✅ COMPLETE
D3 Learning & Patterns:   ✅ COMPLETE
D4 Performance & Caching: ✅ COMPLETE
D5 Session Orchestration: ⏳ NEXT — seamless handoffs, resume validation
D6 Code Intelligence:     📋 PLANNED
D7 Append-Only State:     📋 PLANNED
D8 Test Infrastructure:   📋 PLANNED
D9 Remaining Modules:     📋 PLANNED
```

# RECENT CRITICAL FIXES (2026-02-10)
- Buffer zone fix: removed 500B/2KB caps, pressure-only truncation
- cadenceExecutor zones raised: BLACK@41, RED@31, YELLOW@21
- TelemetryEngine.ts rebuilt from scratch (609 lines, v2.0)
- PredictiveFailureEngine validateConfig fixed (flat→nested bridge)
- Defensive engine init (server starts even with missing engines)
- autoHookWrapper recovered from dist bundle after file_write wipe
- Survival save added: every 15 calls + at 41+ calls

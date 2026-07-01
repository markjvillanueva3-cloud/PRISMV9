# PRISM GSD v14.0 — Operational Playbook
# 332 MCP tools | 13,429 registry entries | esbuild build

## 1. RULES — ALWAYS / NEVER

### ALWAYS
- S(x) ≥ 0.70 before any output (HARD BLOCK)
- validate_anti_regression before replacing ANY file
- npm run build (esbuild, 150ms) — NEVER tsc (OOM crash)
- Restart Claude Desktop after every build
- Check file exists (DC:get_file_info) before creating
- Read ACTION_TRACKER.md before starting work — never duplicate done items

### NEVER
- Never use tsc/npx tsc (hits OOM at ~1.3MB source, crashed 4+ sessions)
- Never overwrite files without counting items first
- Never assume agent/swarm tools return real data without API key
- Never skip validation on safety-critical outputs
- Never create files without checking if they already exist
- Never trust placeholder/simulation responses as real results

---

## 2. SESSION PROTOCOL

### Start (3 steps)
```
1. prism_quick_resume             → Load state, see where we left off
2. DC:read_file ACTION_TRACKER.md → See DONE vs PENDING, avoid redoing work
3. prism_todo_update              → Anchor attention on current task
```

### End (3 steps)
```
1. prism_state_save               → Persist full state to CURRENT_STATE.json
2. DC:write_file ACTION_TRACKER.md → Mark completed items, add new pending
3. prism_todo_update              → Final anchor for next session pickup
```

### Simple questions — SKIP THE CEREMONY
If user asks "what's 4140 hardness?" or "decode alarm 100" — just answer.
Boot protocol is for development sessions, not quick lookups.

### Cadence
- Every 5 tool calls → prism_todo_update (attention anchor)
- Every 10 tool calls → prism_state_checkpoint (crash recovery)
- Buffer zones: 🟢0-8 | 🟡9-14 checkpoint | 🔴15-18 save urgently | ⚫19+ STOP

---

## 3. BUILD & DEPLOY

### Build
```
cd C:\PRISM\mcp-server
npm run build                    → esbuild bundle (~150ms, outputs dist/index.js)
```

### Config
```
C:\Users\Admin.DIGITALSTORM-PC\AppData\Roaming\Claude\claude_desktop_config.json
→ command: node, args: C:/PRISM/mcp-server/dist/index.js
→ env: ANTHROPIC_API_KEY, OPUS_MODEL, SONNET_MODEL, HAIKU_MODEL
```

### After ANY code change
```
1. npm run build        (150ms)
2. Restart Claude Desktop
3. Run phase checklist:  skills → hooks → GSD → memories → orchestrators → state → scripts
```

### Troubleshooting
| Problem | Fix |
|---------|-----|
| tsc OOM / heap crash | Use npm run build (esbuild). NEVER tsc. |
| Server won't start | Check dist/index.js exists. Check config JSON syntax. |
| Tool not found | Check TOOL_REGISTRY.md for renames (e.g., skill_stats → skill_stats_v2) |
| Ralph returns BLOCKED | API key not configured. Check claude_desktop_config.json env section. |
| Context compaction | prism_compaction_detect → prism_transcript_read → prism_state_reconstruct |
| Build hangs | Kill node processes (DC:kill_process), retry npm run build |

---

## 4. DECISION TREE — Which Tool?

### "I need to calculate..."
```
Cutting forces        → calc_cutting_force (Kienzle) or prism_cutting_force (material ID)
Speeds & feeds        → prism_speed_feed (material+tool ID, optimizes for target)
                        calc_speed_feed (quick, by hardness)
Tool life             → calc_tool_life or prism_tool_life (Taylor equation)
Surface finish        → calc_surface_finish (Ra/Rz from feed + nose radius)
Stability/chatter     → calc_stability (stability lobe diagram)
Deflection            → calc_deflection (cantilever beam model)
Thermal               → calc_thermal (cutting temperature)
MRR & cycle time      → calc_mrr, calc_cycle_time
Cost optimization     → calc_cost_optimize (min cost speed)
Multi-objective       → calc_multi_optimize (balance productivity/cost/quality/life)
Trochoidal/HSM        → calc_trochoidal, calc_hsm
Threading             → calculate_tap_drill, get_thread_specifications, generate_thread_gcode
```

### "I need to look up..."
```
Material properties   → material_get (by ID/name), material_search (by ISO group/hardness)
Material comparison   → material_compare (2-5 side by side)
Machine specs         → machine_get, machine_search, machine_capabilities
Cutting tools         → tool_get, tool_search, tool_recommend
Alarm codes           → alarm_decode (auto-detects controller family)
Formulas              → formula_get, knowledge_formula
Cross-registry        → knowledge_cross_query ("machine Ti-6Al-4V on DMG MORI")
```

### "I need to validate..."
```
Material data quality → validate_material (S(x) + completeness combined)
Kienzle coefficients  → validate_kienzle (range check by ISO group)
Taylor coefficients   → validate_taylor (range check by ISO group)
Johnson-Cook params   → validate_johnson_cook (cross-validate vs yield/tensile)
File replacement safe → validate_anti_regression (new count ≥ old count)
Overall quality       → omega_compute (Ω ≥ 0.70 for release)
```

### "I need to check safety..."
```
Collision detection   → check_toolpath_collision, validate_rapid_moves
Spindle limits        → check_spindle_torque, check_spindle_power, get_spindle_safe_envelope
Tool breakage risk    → predict_tool_breakage, get_safe_cutting_limits
Workholding adequacy  → validate_workholding_setup, calculate_clamp_force_required
Coolant adequacy      → validate_coolant_flow, check_through_spindle_coolant
```

### "I need to validate code/content quality..."
```
Full 4-phase review   → prism_ralph_loop (LIVE API — needs ANTHROPIC_API_KEY)
Quick scrutiny        → prism_ralph_scrutinize (single pass, LIVE)
OPUS assessment       → prism_ralph_assess (standalone Phase 4)
Spec conformance      → prism_sp_review_spec (requirements vs deliverables)
Code quality          → prism_sp_review_quality (structure, edge cases, safety)
```

### "I need to orchestrate..."
```
Find right skill      → skill_recommend, skill_find_for_task
Find right agent      → agent_find_for_task, prism_agent_list
Run agent             → prism_agent_invoke (LIVE with API key)
Run multi-agent       → prism_agent_swarm (LIVE with API key)
Optimal combination   → prism_combination_ilp (ILP solver for skill/agent selection)
AutoPilot             → prism_autopilot_v2 (registry-aware task execution)
```

### "I need session/context management..."
```
Quick resume          → prism_quick_resume or prism_quick_resume_v2
Save state            → prism_state_save
Context pressure      → prism_context_pressure (check buffer zone)
Compress context      → prism_context_compress (when hitting orange/red)
Recovery after crash  → prism_session_recover (full workflow)
Externalize to disk   → prism_memory_externalize (unlimited expansion)
```

---

## 5. API KEY — What's LIVE vs Placeholder

### LIVE (works now, real calculations/data)
All calc_* tools, all material/machine/tool/alarm queries, all safety tools,
all threading tools, all toolpath tools, all validation tools, all omega tools,
all hook/event tools, all state/memory tools, all context tools, all GSD tools.

### LIVE WITH API KEY (needs ANTHROPIC_API_KEY in env)
prism_ralph_loop, prism_ralph_scrutinize, prism_ralph_assess — 4-phase validation
prism_agent_invoke, agent_invoke — real Claude API agent execution
prism_agent_swarm — real multi-agent swarm patterns

### PLACEHOLDER (return structured mock data, useful for testing workflows)
agent_execute, agent_execute_parallel, agent_execute_pipeline — simulation responses
swarm_execute, swarm_parallel, swarm_consensus, swarm_pipeline — simulation
script_execute (legacy) — returns command string, doesn't run
prism_manus_* — Manus integration not connected

### API Key Location
```
PRIMARY: claude_desktop_config.json → env.ANTHROPIC_API_KEY
BACKUP:  C:\PRISM\mcp-server\.env
MODELS:  OPUS=claude-opus-4-20250514, SONNET=claude-sonnet-4-20250514, HAIKU=claude-haiku-4-5-20241022
```

---

## 6. REGISTRY STATUS (13,429 entries)

| Registry | Count | Status | Notes |
|----------|-------|--------|-------|
| Materials | 2,805 | ✅ Full | Kienzle/Taylor/JC coefficients |
| Alarms | 10,033 | ✅ Full | 12 controller families (FANUC, HAAS, SIEMENS, etc.) |
| Skills | 156 | ✅ Loaded | Markdown skill files |
| Scripts | 325 | ✅ Loaded | Automation scripts |
| Agents | 75 | ✅ Loaded | 3 tiers: OPUS/SONNET/HAIKU |
| Hooks | 25 | ✅ Loaded | Lifecycle hooks |
| Formulas | 10 | ✅ Loaded | Core physics (Kienzle, Taylor, JC, etc.) |
| Machines | 0 | ⚠️ Empty | Need data files in registries/data/ |
| Tools | 0 | ⚠️ Empty | Need data files in registries/data/ |

---

## 7. KEY PATHS

| What | Where |
|------|-------|
| MCP Server | C:\PRISM\mcp-server\ |
| Built bundle | C:\PRISM\mcp-server\dist\index.js |
| Skills | C:\PRISM\skills-consolidated\ |
| State files | C:\PRISM\state\ |
| Action tracker | C:\PRISM\state\ACTION_TRACKER.md |
| Tool registry | C:\PRISM\mcp-server\TOOL_REGISTRY.md |
| Claude config | C:\Users\Admin.DIGITALSTORM-PC\AppData\Roaming\Claude\claude_desktop_config.json |
| .env (backup) | C:\PRISM\mcp-server\.env |

---

## 8. QUALITY GATES

```
Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L

S(x) ≥ 0.70         → HARD BLOCK. No exceptions.
Ω(x) ≥ 0.70         → Release ready
Evidence ≥ L3        → No claiming "done" without proof
New ≥ Old            → validate_anti_regression on every file replace
First response=final → No placeholders, no "I'll fill this in later"
```

---

## 9. COLLISION RENAMES

| Original | Renamed To | Why |
|----------|-----------|-----|
| skill_stats | skill_stats_v2 | Collision with knowledgeV2.ts |
| skill_search | skill_search_v2 | Collision with knowledgeV2.ts |
| script_search | script_search_v2 | Collision with knowledgeV2.ts |
| script_execute | script_execute_v2 | Collision with knowledgeV2.ts |
| prism_ralph_loop | prism_ralph_loop_lite | Collision with ralphLoopTools.ts (LIVE version) |
| hook_get | hook_get_v2 | Collision with hookTools.ts |
| hook_list | hook_list_v2 | Collision with hookTools.ts |
| 9 hook mgmt | *_v2 suffix | hookManagementTools.ts vs hookToolsV3.ts |
| 3 session | *_v2 suffix | sessionLifecycleTools.ts vs contextEngineering |

Full tool list: C:\PRISM\mcp-server\TOOL_REGISTRY.md

---

**v14.0 | 2026-02-05 | 332 tools | esbuild | prism-mcp-server v2.9.0**

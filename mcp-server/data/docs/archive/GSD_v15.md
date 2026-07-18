# PRISM GSD v15.0 — Operational Playbook
# 346 MCP tools | 14 new doc/workflow tools | MCP-native first

## 1. RULES — ALWAYS / NEVER

### ALWAYS
- S(x) ≥ 0.70 before any output (HARD BLOCK)
- validate_anti_regression before replacing ANY file
- prism_build for builds (esbuild, 150ms) — NEVER tsc (OOM crash)
- Restart Claude Desktop after every build
- MCP-native tools first, DC only for files OUTSIDE mcp-server/
- prism_doc_read/write for state & planning docs (NOT DC:read_file)

### NEVER
- Never use tsc/npx tsc (hits OOM at ~1.3MB source)
- Never overwrite files without counting items first
- Never assume agent/swarm tools return real data without API key
- Never skip validation on safety-critical outputs
- Never create files without checking if they already exist
- Never use DC:read_file for ACTION_TRACKER, PRIORITY_ROADMAP, todo, or GSD docs

---

## 2. SESSION PROTOCOL

### Start (2 steps — was 3 in v14)
```
1. prism_session_boot             → ONE call: resume + action_tracker + roadmap
2. prism_todo_update              → Anchor attention on current task
```
Token savings: ~70% vs old 3-call boot (prism_quick_resume + DC:read + prism_todo_update)

### End (3 steps)
```
1. prism_state_save               → Persist full state to CURRENT_STATE.json
2. prism_doc_write(ACTION_TRACKER.md) → Mark completed items, add new pending
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

### Build (MCP-native)
```
prism_build → returns PASS/FAIL + errors only (not full stdout)
```
Falls back to: cd C:\PRISM\mcp-server && npm run build

### Config
```
C:\Users\Admin.DIGITALSTORM-PC\AppData\Roaming\Claude\claude_desktop_config.json
→ command: node, args: C:/PRISM/mcp-server/dist/index.js
→ env: ANTHROPIC_API_KEY, OPUS_MODEL, SONNET_MODEL, HAIKU_MODEL
```

### After ANY code change
```
1. prism_build          (150ms, errors only)
2. Restart Claude Desktop
3. Run phase checklist:  skills → hooks → GSD → memories → orchestrators → state → scripts
```

### Troubleshooting
| Problem | Fix |
|---------|-----|
| tsc OOM / heap crash | Use prism_build or npm run build (esbuild). NEVER tsc. |
| Server won't start | Check dist/index.js exists. Check config JSON syntax. |
| Tool not found | Check TOOL_REGISTRY.md for renames (e.g., skill_stats → skill_stats_v2) |
| Ralph returns BLOCKED | API key not configured. Check claude_desktop_config.json env section. |
| Context compaction | prism_compaction_detect → prism_transcript_read → prism_state_reconstruct |

---

## 4. MCP-NATIVE TOOL PRIORITY (NEW in v15)

### Document Management (use INSTEAD of DC for state/planning)
```
prism_doc_list          → List all managed docs with sizes
prism_doc_read          → Read doc (compact summary by default, detail=true for full)
prism_doc_write         → Write/update doc in MCP data/docs/
prism_doc_append        → Append to existing doc
prism_roadmap_status    → Parse PRIORITY_ROADMAP.md → compact JSON
prism_action_tracker    → Parse ACTION_TRACKER.md → compact JSON
prism_doc_migrate       → One-click migration from C:\PRISM\state\ to MCP
```

### Dev Workflow (use INSTEAD of DC for dev tasks)
```
prism_session_boot      → Combined resume + tracker + roadmap (ONE call)
prism_build             → Run build, return pass/fail + errors only
prism_code_template     → Cached patterns (tool_registration, index_import, etc.)
prism_code_search       → Regex search src/ or dist/ directories
prism_file_read         → Read any file within mcp-server/
prism_file_write        → Write files within mcp-server/
prism_server_info       → Overview of tool files, data dirs, docs
```

### When to still use DC
- Files outside C:\PRISM\mcp-server\ (e.g., C:\PRISM\skills-consolidated\)
- Binary files, images, PDFs
- Process management (start_process, interact_with_process)
- File search across entire filesystem
- Directory listings outside mcp-server/

---
## 5. DECISION TREE — Which Tool?

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
Quick boot            → prism_session_boot (combined: resume+tracker+roadmap)
Save state            → prism_state_save
Read/write docs       → prism_doc_read, prism_doc_write (NOT DC:read_file)
Check roadmap         → prism_roadmap_status (compact JSON)
Check tracker         → prism_action_tracker (compact JSON)
Context pressure      → prism_context_pressure (check buffer zone)
Compress context      → prism_context_compress (when hitting orange/red)
Recovery after crash  → prism_session_recover (full workflow)
Externalize to disk   → prism_memory_externalize (unlimited expansion)
```

---

## 6. API KEY — What's LIVE vs Placeholder

### LIVE (works now, real calculations/data)
All calc_* tools, all material/machine/tool/alarm queries, all safety tools,
all threading tools, all toolpath tools, all validation tools, all omega tools,
all hook/event tools, all state/memory tools, all context tools, all GSD tools,
all doc_* tools, all dev workflow tools (session_boot, build, code_search, etc.)

### LIVE WITH API KEY (needs ANTHROPIC_API_KEY in env)
prism_ralph_loop, prism_ralph_scrutinize, prism_ralph_assess — 4-phase validation
prism_agent_invoke, agent_invoke — real Claude API agent execution
prism_agent_swarm — real multi-agent swarm patterns

### PLACEHOLDER (return structured mock data)
agent_execute, agent_execute_parallel, agent_execute_pipeline — simulation
swarm_execute, swarm_parallel, swarm_consensus, swarm_pipeline — simulation
script_execute (legacy) — returns command string, doesn't run
prism_manus_* — Manus integration not connected

---

## 7. REGISTRY STATUS

| Registry | Count | Status | Notes |
|----------|-------|--------|-------|
| Materials | 2,805 | ✅ Full | Kienzle/Taylor/JC coefficients |
| Alarms | 10,033 | ✅ Full | 12 controller families |
| Formulas | 515 | ✅ Full | Was 10 in v14, now loading from FORMULA_REGISTRY.json |
| Machines | 402 | ⚠️ Bootstrap bug | Data loads but manufacturer.toLowerCase fails |
| Skills | 156 | ✅ Loaded | Markdown skill files |
| Scripts | 325 | ✅ Loaded | Automation scripts |
| Agents | 75 | ✅ Loaded | 3 tiers: OPUS/SONNET/HAIKU |
| Hooks | 25 | ✅ Loaded | Lifecycle hooks |
| Tools (cutting) | 0 | ⚠️ Empty | Need data files in registries/data/ |

---

## 8. KEY PATHS

| What | Where |
|------|-------|
| MCP Server | C:\PRISM\mcp-server\ |
| Built bundle | C:\PRISM\mcp-server\dist\index.js |
| MCP Docs | C:\PRISM\mcp-server\data\docs\ (ACTION_TRACKER, ROADMAP, todo) |
| Skills | C:\PRISM\skills-consolidated\ |
| State files | C:\PRISM\state\ (legacy, migrating to MCP docs) |
| Claude config | C:\Users\Admin.DIGITALSTORM-PC\AppData\Roaming\Claude\claude_desktop_config.json |

---

## 9. QUALITY GATES

```
Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L

S(x) ≥ 0.70         → HARD BLOCK. No exceptions.
Ω(x) ≥ 0.70         → Release ready
Evidence ≥ L3        → No claiming "done" without proof
New ≥ Old            → validate_anti_regression on every file replace
First response=final → No placeholders, no "I'll fill this in later"
```

---

## 10. COLLISION RENAMES

| Original | Renamed To | Why |
|----------|-----------|-----|
| skill_stats | skill_stats_v2 | Collision with knowledgeV2.ts |
| skill_search | skill_search_v2 | Collision with knowledgeV2.ts |
| script_search | script_search_v2 | Collision with knowledgeV2.ts |
| script_execute | script_execute_v2 | Collision with knowledgeV2.ts |
| prism_ralph_loop | prism_ralph_loop_lite | Collision with ralphLoopTools.ts |
| hook_get | hook_get_v2 | Collision with hookTools.ts |
| hook_list | hook_list_v2 | Collision with hookTools.ts |
| 9 hook mgmt | *_v2 suffix | hookManagementTools.ts vs hookToolsV3.ts |
| 3 session | *_v2 suffix | sessionLifecycleTools.ts vs contextEngineering |

---

**v15.0 | 2026-02-06 | 346 tools | MCP-native first | esbuild | prism-mcp-server v3.0.0**

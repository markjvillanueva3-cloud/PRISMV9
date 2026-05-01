# PRISM Context Budget Audit — Session 50
> Date: 2026-02-06
> Purpose: Identify why context compaction happens fast, recommend reductions

## Executive Summary

The PRISM MCP server exposes **346+ tools** to Claude's context window. Each tool contributes its name, description, and full JSON schema to every conversation. Conservative estimate: **~70,000-100,000 tokens** consumed by tool schemas alone before any conversation begins.

Combined with system prompt (~5K tokens), memory (~3K tokens), and project instructions (~2K tokens), approximately **80,000-110,000 tokens** are consumed before the first user message — roughly **40-55% of a 200K context window**.

This means every session starts at ~50% capacity, leaving only ~100K tokens for actual work before compaction.

## Tool Count by Category

| Category | Count | Duplication Issue |
|----------|-------|-------------------|
| Hooks | 27 | v1 + v2 + prism_ variants (3 generations!) |
| Calculations | 25 | calc_* + prism_* overlap |
| Safety | 29 | Many with empty `{}` params but long descriptions |
| Threading | 12 | All with empty `{}` params |
| Toolpath | 8 | All with empty `{}` params |
| Knowledge/Skills | 12 | v1 + v2 duplication |
| Scripts | 11 | v1 + v2 duplication |
| Session/Context | 35 | Many overlapping state tools |
| Orchestration | 22 | autopilot v1 + v2 + quick, multiple swarm tools |
| Data | 14 | Clean, minimal duplication |
| Documents | 14 | Clean |
| Validation | 14 | Clean |
| **TOTAL** | **~223 unique + ~123 duplicates** | |

## Top Offenders (Highest Token Waste)

### 1. Hook Tools: 27 tools → recommend 8
Three generations of the same functionality:
- **v1:** hook_list, hook_get, hook_search, hook_fire, hook_cognitive, hook_stats (6)
- **v2:** hook_list_v2, hook_get_v2, hook_execute, hook_chain, hook_toggle (5)
- **prism_:** prism_hook_fire_v2, prism_hook_chain_execute, prism_hook_status_v2, prism_hook_history_v2, prism_hook_enable_v2, prism_hook_disable_v2, prism_hook_coverage_v2, prism_hook_gaps_v2, prism_hook_performance_v2, prism_hook_failures_v2 (10)
- **Extra:** prism_autohook_status, prism_autohook_test, prism_hook_chain_v2, event_emit, event_list, event_history (6)

**Recommendation:** Keep only 8: list, get, fire, chain, enable, disable, coverage, status. Remove 19 tools = ~3,800 tokens saved.

### 2. Skill Tools: 12 tools → recommend 6
- **v1:** skill_list, skill_get, skill_search, skill_find_for_task, skill_content, skill_stats (6)
- **v2/extended:** skill_load, skill_recommend, skill_analyze, skill_chain, skill_search_v2, skill_stats_v2 (6)

**Recommendation:** Keep v2 only + skill_load + skill_chain. Remove 6 = ~1,200 tokens saved.

### 3. Script Tools: 11 tools → recommend 5
- **v1:** script_list, script_get, script_search, script_command, script_execute, script_stats (6)
- **v2:** script_execute_v2, script_queue, script_recommend, script_search_v2, script_history (5)

**Recommendation:** Keep v2 + script_get. Remove 5 = ~1,000 tokens saved.

### 4. Parameterless Safety/Threading/Toolpath: 49 tools
These have `{"properties": {}, "type": "object"}` but still carry full descriptions (~200 tokens each).
- 29 safety tools
- 12 threading tools
- 8 toolpath tools

**Recommendation:** Create single dispatcher tools:
- `prism_safety_check(operation, params)` replaces 29 individual tools = ~5,000 tokens saved
- `prism_threading_calc(operation, params)` replaces 12 individual tools = ~2,000 tokens saved
- `prism_toolpath(operation, params)` replaces 8 individual tools = ~1,400 tokens saved

### 5. Duplicate Calculations: 25 tools → recommend 15
- calc_cutting_force AND prism_cutting_force (same calculation)
- calc_tool_life AND prism_tool_life (same calculation)  
- calc_speed_feed AND prism_speed_feed (same + enhanced)

**Recommendation:** Keep prism_* versions (material-aware), remove calc_* duplicates = ~2,000 tokens saved.

### 6. Session/State Tools: 35 tools → recommend 15
Heavy overlap:
- prism_quick_resume_v2 vs prism_resume_session vs prism_session_boot
- prism_state_save vs prism_state_checkpoint vs prism_auto_checkpoint
- prism_session_start_v2 vs prism_session_start_full
- prism_context_pressure vs prism_context_size
- Multiple memory tools with overlapping function

**Recommendation:** Consolidate to core set of ~15 = ~4,000 tokens saved.

### 7. Orchestration: 22 tools → recommend 8
- 3 autopilot variants (v1, quick, v2)
- Multiple swarm execution tools
- Multiple agent execution tools (execute, execute_parallel, execute_pipeline, plan_*)

**Recommendation:** Keep autopilot_v2, ralph_loop, swarm_execute, agent_execute + 4 core = ~2,800 tokens saved.

## Summary of Savings

| Area | Current | Target | Tokens Saved |
|------|---------|--------|-------------|
| Hooks | 27 | 8 | ~3,800 |
| Skills | 12 | 6 | ~1,200 |
| Scripts | 11 | 5 | ~1,000 |
| Safety dispatcher | 29 | 1 | ~5,000 |
| Threading dispatcher | 12 | 1 | ~2,000 |
| Toolpath dispatcher | 8 | 1 | ~1,400 |
| Calc dedup | 25 | 15 | ~2,000 |
| Session consolidation | 35 | 15 | ~4,000 |
| Orchestration | 22 | 8 | ~2,800 |
| **TOTAL** | **181** | **60** | **~23,200** |

## Impact Estimate

- Current tool schema burden: ~80K-100K tokens
- After consolidation: ~55K-75K tokens  
- **Net savings: ~25K tokens = ~12% of context window recovered**
- That's roughly 5-8 more tool calls per session before compaction

## Implementation Priority

1. **Quick wins (no code changes):** Remove v1 tools where v2 exists → ~6K tokens
2. **Medium effort:** Safety/threading/toolpath dispatchers → ~8.4K tokens  
3. **Larger effort:** Session/orchestration consolidation → ~6.8K tokens
4. **Careful work:** Calc deduplication → ~2K tokens

## Risk: What NOT to Remove

- All 14 Data tools (clean, no duplication)
- All 14 Document tools (actively used)
- All 14 Validation tools (safety-critical)
- Core session tools: session_boot, todo_update, state_save, auto_checkpoint
- Core enforcement: error_capture, decision_log, failure_library, pre_write_gate, pre_call_validate, pre_write_diff

## Notes

- The system prompt itself (~5K tokens) is not under our control
- Memory section is well-optimized already (~3K tokens)
- The project instructions (~2K tokens) should stay lean
- Desktop Commander adds another ~30 tool schemas (~6K tokens) — not under our control
- PDF Tools adds ~10 tool schemas (~2K tokens) — not under our control

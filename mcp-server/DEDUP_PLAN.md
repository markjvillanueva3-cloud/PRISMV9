"""
PRISM MCP Server - Collision Deduplication Fix
===============================================
Fixes 9 disabled tool groups (66+ tools) blocked by 14 name collisions.

STRATEGY:
---------
GROUP A: ZERO COLLISIONS - Just uncomment to enable
  1. manusTools.ts (11 tools) - All unique names
  2. ralphLoopTools.ts (3 tools) - All unique names  
  3. knowledgeQueryTools.ts (5 tools) - All unique names

GROUP B: RENAME COLLISIONS - Rename 2-3 conflicting tools, then enable
  4. hookToolsV2.ts (8 tools) - Rename hook_list→hook_list_v2, hook_get→hook_get_v2
  5. sessionLifecycleTools.ts (12 tools) - Rename 3 collisions with _v2 suffix
  6. skillToolsV2.ts (6 tools) - Rename skill_search→skill_search_v2, skill_stats→skill_stats_v2
  7. scriptToolsV2.ts (5 tools) - Rename script_execute→script_execute_v2, script_search→script_search_v2

GROUP C: SPECIAL HANDLING
  8. hookManagementTools.ts (10 tools) - 9/10 duplicate hookToolsV3 → DROP. Merge 1 unique tool
  9. generatorTools.ts (6 tools) - Uses old SDK API → Rewrite to server.tool() pattern

TOTAL TOOLS RECOVERED: ~56 (minus hookManagementTools duplicates and generatorTools rewrite)
"""

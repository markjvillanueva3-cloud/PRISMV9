import re, os

tools_dir = r"C:\PRISM\mcp-server\src\tools"

# Renames to apply: (filename, old_name, new_name)
renames = [
    # skillToolsV2.ts - 1 collision
    ("skillToolsV2.ts", '"skill_search"', '"skill_search_v2"'),
    
    # scriptToolsV2.ts - 2 collisions  
    ("scriptToolsV2.ts", '"script_search"', '"script_search_v2"'),
    ("scriptToolsV2.ts", '"script_execute"', '"script_execute_v2"'),
    
    # sessionLifecycleTools.ts - 3 collisions
    ("sessionLifecycleTools.ts", '"prism_quick_resume"', '"prism_quick_resume_v2"'),
    ("sessionLifecycleTools.ts", '"prism_session_start_full"', '"prism_session_start_v2"'),
    ("sessionLifecycleTools.ts", '"prism_session_end_full"', '"prism_session_end_v2"'),
    
    # hookManagementTools.ts - 9 collisions with hookToolsV3
    ("hookManagementTools.ts", '"prism_hook_fire"', '"prism_hook_fire_v2"'),
    ("hookManagementTools.ts", '"prism_hook_status"', '"prism_hook_status_v2"'),
    ("hookManagementTools.ts", '"prism_hook_history"', '"prism_hook_history_v2"'),
    ("hookManagementTools.ts", '"prism_hook_enable"', '"prism_hook_enable_v2"'),
    ("hookManagementTools.ts", '"prism_hook_disable"', '"prism_hook_disable_v2"'),
    ("hookManagementTools.ts", '"prism_hook_coverage"', '"prism_hook_coverage_v2"'),
    ("hookManagementTools.ts", '"prism_hook_gaps"', '"prism_hook_gaps_v2"'),
    ("hookManagementTools.ts", '"prism_hook_performance"', '"prism_hook_performance_v2"'),
    ("hookManagementTools.ts", '"prism_hook_failures"', '"prism_hook_failures_v2"'),
]

for fname, old, new in renames:
    fpath = os.path.join(tools_dir, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Only replace the first occurrence in server.tool() context (tool name registration)
    count = content.count(old)
    if count > 0:
        # Replace FIRST occurrence only (the server.tool registration line)
        content = content.replace(old, new, 1)
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"OK: {fname}: {old} -> {new} (had {count} occurrences, replaced 1st)")
    else:
        print(f"SKIP: {fname}: {old} not found!")

print("\nDone! All renames applied.")

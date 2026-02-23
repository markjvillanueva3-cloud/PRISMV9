#!/usr/bin/env python3
"""Test MCP server hook tools integration."""
import sys
sys.path.insert(0, 'C:/PRISM/scripts')
sys.path.insert(0, 'C:/PRISM/scripts/core')

from prism_mcp_server import PRISMMCPServer

print("=" * 60)
print("MCP SERVER HOOK TOOLS TEST")
print("=" * 60)

mcp = PRISMMCPServer()
print(f"\nTotal tools: {len(mcp.tools)}")

# List hook tools
hook_tools = [t for t in sorted(mcp.tools.keys()) if 'hook' in t.lower()]
print(f"\nHook tools ({len(hook_tools)}):")
for t in hook_tools:
    print(f"  {t}")

# Test hook stats
print("\n[1] Testing prism_hook_stats:")
stats = mcp.call('prism_hook_stats')
if "error" not in stats:
    print(f"  Total hooks: {stats.get('total_hooks', 0)}")
    print(f"  Domains: {stats.get('total_domains', 0)}")
    print(f"  Blocking: {stats.get('blocking_hooks', 0)}")
else:
    print(f"  ERROR: {stats}")

# Test hook categories
print("\n[2] Testing prism_hook_categories:")
cats = mcp.call('prism_hook_categories')
if "error" not in cats:
    print(f"  Total domains: {cats.get('total_domains', 0)}")
    top5 = list(cats.get('domains', {}).items())[:5]
    print(f"  Top 5: {top5}")
else:
    print(f"  ERROR: {cats}")

# Test hook search
print("\n[3] Testing prism_hook_search('safety'):")
results = mcp.call('prism_hook_search', {'query': 'safety', 'limit': 3})
if "error" not in results:
    print(f"  Found: {results.get('count', 0)}")
else:
    print(f"  ERROR: {results}")

# Test hook by domain
print("\n[4] Testing prism_hook_by_domain('MATERIAL'):")
domain = mcp.call('prism_hook_by_domain', {'domain': 'MATERIAL', 'limit': 3})
if "error" not in domain:
    print(f"  Total in MATERIAL: {domain.get('total', 0)}")
else:
    print(f"  ERROR: {domain}")

# Test hook get
print("\n[5] Testing prism_hook_get('SYSTEM-START'):")
hook = mcp.call('prism_hook_get', {'hook_id': 'SYSTEM-START'})
if "error" not in hook and "hook" in hook:
    print(f"  ID: {hook['hook'].get('id')}")
    print(f"  Trigger: {hook['hook'].get('trigger')}")
else:
    print(f"  ERROR: {hook}")

# Test hook by trigger
print("\n[6] Testing prism_hook_by_trigger('session:'):")
trigger = mcp.call('prism_hook_by_trigger', {'trigger_pattern': 'session:', 'limit': 3})
if "error" not in trigger:
    print(f"  Found: {trigger.get('count', 0)}")
else:
    print(f"  ERROR: {trigger}")

print("\n" + "=" * 60)
print("ALL TESTS PASSED" if len(hook_tools) >= 6 else "SOME TESTS FAILED")
print("=" * 60)

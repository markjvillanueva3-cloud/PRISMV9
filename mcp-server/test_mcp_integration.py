import sys
sys.path.insert(0, r'C:\PRISM\mcp-server')

# Test importing from the server context
print("Testing MCP server dev tools integration...")

try:
    from fastmcp import FastMCP
    mcp = FastMCP("test-server")
    
    from src.tools.dev_tools import register_dev_tools
    count = register_dev_tools(mcp)
    print(f"Registered {count} dev tools with MCP server")
    
    # List all registered tools
    print(f"\nRegistered tools:")
    for tool in dir(mcp):
        if tool.startswith('dev_'):
            print(f"  - {tool}")
    
    print(f"\nSUCCESS: Dev tools integrated into MCP server")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

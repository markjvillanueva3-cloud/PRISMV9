#!/usr/bin/env python3
"""
PRISM True MCP Server v2.0
Using official MCP SDK for Claude Desktop integration.
"""
import sys
import os
import warnings
import asyncio

# Suppress warnings before imports
warnings.filterwarnings("ignore")
os.environ["PYTHONWARNINGS"] = "ignore"

# Add PRISM paths
sys.path.insert(0, "C:/PRISM/scripts")
sys.path.insert(0, "C:/PRISM/scripts/core")

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Load PRISM
try:
    from prism_mcp_server import PRISMMCPServer
    PRISM = PRISMMCPServer()
except Exception as e:
    PRISM = None

# Create MCP server
server = Server("prism")

@server.list_tools()
async def list_tools():
    """Return all PRISM tools."""
    if not PRISM:
        return []
    
    tools = []
    for name in sorted(PRISM.tools.keys()):
        tools.append(Tool(
            name=name,
            description=f"PRISM tool: {name}",
            inputSchema={
                "type": "object",
                "properties": {},
                "additionalProperties": True
            }
        ))
    return tools

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    """Execute a PRISM tool."""
    if not PRISM:
        return [TextContent(type="text", text='{"error": "PRISM not loaded"}')]
    
    try:
        result = PRISM.call(name, arguments or {})
        import json
        return [TextContent(type="text", text=json.dumps(result, indent=2, default=str))]
    except Exception as e:
        return [TextContent(type="text", text=f'{{"error": "{str(e)}"}}')]

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())

"""
PRISM MCP <-> LangChain Bridge
==============================
Utility module that wraps PRISM's MCP server (localhost:3000) as LangChain-compatible
tools using langchain-mcp-adapters v0.2.2.

Usage patterns:
  1. get_prism_tools()           -- async, returns list of LangChain BaseTool
  2. MultiServerMCPClient        -- context manager for persistent connection
  3. Integration with LangGraph  -- see create_prism_agent() example

Requirements:
  pip install langchain-mcp-adapters langchain-anthropic  (anthropic for the agent example)
"""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

from langchain_mcp_adapters.client import (
    MultiServerMCPClient,
    load_mcp_tools,
)

if TYPE_CHECKING:
    from langchain_core.tools import BaseTool

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PRISM_MCP_URL = "http://localhost:3000/sse"
PRISM_STREAMABLE_URL = "http://localhost:3000/mcp"  # if using streamable HTTP

# Connection dict for MultiServerMCPClient.
# Switch transport to "streamable_http" if the PRISM MCP server supports it.
PRISM_CONNECTION = {
    "prism": {
        "transport": "sse",
        "url": PRISM_MCP_URL,
        "timeout": 30,
    }
}

PRISM_CONNECTION_STREAMABLE = {
    "prism": {
        "transport": "streamable_http",
        "url": PRISM_STREAMABLE_URL,
    }
}


# ---------------------------------------------------------------------------
# 1. One-shot: get tools list
# ---------------------------------------------------------------------------

async def get_prism_tools(
    url: str = PRISM_MCP_URL,
    transport: str = "sse",
) -> list[BaseTool]:
    """Connect to PRISM MCP server and return LangChain tools.

    Example::

        tools = asyncio.run(get_prism_tools())
        for t in tools:
            print(f"{t.name}: {t.description[:80]}")
    """
    async with MultiServerMCPClient(
        {"prism": {"transport": transport, "url": url}}
    ) as client:
        tools = client.get_tools()
        return tools


# ---------------------------------------------------------------------------
# 2. Context-manager pattern (keeps session alive for multiple calls)
# ---------------------------------------------------------------------------

async def run_with_prism_session():
    """Example: open a persistent session, list tools, invoke one."""
    async with MultiServerMCPClient(PRISM_CONNECTION) as client:
        tools = client.get_tools()
        print(f"Connected to PRISM MCP -- {len(tools)} tools available:")
        for tool in tools:
            print(f"  - {tool.name}: {tool.description[:100]}")

        # Invoke a tool by name (example -- adjust to your actual tool names)
        # result = await tools[0].ainvoke({"input": "some_value"})
        # print(result)


# ---------------------------------------------------------------------------
# 3. LangGraph agent with PRISM tools (requires langchain-anthropic)
# ---------------------------------------------------------------------------

async def create_prism_agent():
    """Create a LangGraph ReAct agent backed by PRISM MCP tools.

    Requires: pip install langchain-anthropic langgraph

    Example::

        agent = asyncio.run(create_prism_agent())
    """
    try:
        from langchain_anthropic import ChatAnthropic
        from langgraph.prebuilt import create_react_agent
    except ImportError as exc:
        raise ImportError(
            "Agent example requires: pip install langchain-anthropic langgraph"
        ) from exc

    async with MultiServerMCPClient(PRISM_CONNECTION) as client:
        tools = client.get_tools()

        model = ChatAnthropic(model="claude-sonnet-4-20250514")
        agent = create_react_agent(model, tools)

        # Example invocation
        response = await agent.ainvoke(
            {"messages": [{"role": "user", "content": "List available CNC operations"}]}
        )
        return response


# ---------------------------------------------------------------------------
# CLI entry point -- quick connectivity check
# ---------------------------------------------------------------------------

async def _main():
    print(f"Connecting to PRISM MCP server at {PRISM_MCP_URL} ...")
    try:
        tools = await get_prism_tools()
        print(f"Success -- {len(tools)} LangChain tools loaded from PRISM MCP:")
        for t in tools:
            desc = t.description[:100] if t.description else "(no description)"
            print(f"  [{t.name}] {desc}")
    except Exception as exc:
        print(f"Connection failed: {exc}")
        print("Make sure PRISM MCP server is running on localhost:3000")


if __name__ == "__main__":
    asyncio.run(_main())

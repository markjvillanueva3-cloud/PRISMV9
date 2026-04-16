"""
PRISM MCP Python Client

Python bindings for PRISM Manufacturing Intelligence Platform.

Phase 0.10 from AGI proximity plan. Provides:
    - Engine method invocation
    - Formula calculations
    - Tribal knowledge search
    - Material/tool lookups

Usage:
    from prism_mcp import Client

    client = Client()  # Uses default localhost:3000

    # Call an engine method
    result = client.engine.call("KienzleForceModelEngine", "calculate", ap=2.0, fz=0.1)

    # Calculate a formula
    force = client.formula.calculate("kienzle_force", ap=2, fz=0.1, kc1_1=1800, mc=0.25)

    # Search tribal knowledge
    tips = client.tribal.search("thin wall milling", limit=5)

    # Look up materials
    materials = client.material.lookup(name="4140", iso_group="P")

    # Search for tools
    tools = client.tool.search(type="endmill", diameter=12)

Environment:
    PRISM_API_URL - API endpoint (default: http://localhost:3000/api/py)
"""

from .client import Client
from .exceptions import PRISMError, EngineNotFoundError, ValidationError, APIError

__version__ = "1.0.0"
__all__ = [
    "Client",
    "PRISMError",
    "EngineNotFoundError",
    "ValidationError",
    "APIError",
]

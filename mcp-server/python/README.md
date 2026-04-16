# PRISM MCP Python Client

Python bindings for PRISM Manufacturing Intelligence Platform.

## Installation

```bash
pip install prism-mcp
```

Or install from source:

```bash
cd mcp-server/python
pip install -e .
```

## Quick Start

```python
from prism_mcp import Client

# Connect to PRISM API
client = Client()  # Uses localhost:3000 by default
# Or: client = Client("http://prism.example.com:3000/api/py")

# Check health
print(client.health())

# List available engines
engines = client.engine.list()
print(f"Found {len(engines)} engines")

# Call an engine method
result = client.engine.call(
    "KienzleForceModelEngine",
    "calculate",
    ap=2.0,      # depth of cut [mm]
    fz=0.1,      # feed per tooth [mm]
    kc1_1=1800,  # specific cutting force [N/mm²]
    mc=0.25      # Kienzle exponent
)
print(f"Cutting force: {result}")

# Calculate a formula
force = client.formula.calculate(
    "kienzle_force",
    ap=2, fz=0.1, kc1_1=1800, mc=0.25
)
print(f"Force: {force}")

# Search tribal knowledge
tips = client.tribal.search("thin wall milling", limit=5)
for tip in tips:
    print(f"- {tip['title']}: {tip['content']}")

# Look up materials
materials = client.material.lookup(name="4140", iso_group="P")
for mat in materials:
    print(f"- {mat['name']}: hardness={mat.get('hardness')}")

# Search for tools
tools = client.tool.search(type="endmill", diameter=12)
for tool in tools:
    print(f"- {tool['name']}")
```

## API Reference

### Client

Main client class.

```python
client = Client(base_url=None)
```

- `base_url`: API URL (default: `PRISM_API_URL` env var or `http://localhost:3000/api/py`)

### Engine Operations

```python
# List all engines
engines = client.engine.list()

# Call an engine method
result = client.engine.call("EngineName", "methodName", param1=value1, ...)
```

### Formula Operations

```python
# List all formulas
formulas = client.formula.list()

# Calculate a formula
result = client.formula.calculate("formula_name", param1=value1, ...)
```

### Tribal Knowledge

```python
# Search tips
tips = client.tribal.search("query", limit=10, category="machining")
```

### Material Lookup

```python
# Search materials
materials = client.material.lookup(
    name="4140",           # partial name match
    iso_group="P",         # ISO group: P, M, K, N, S, H
    hardness_min=20,       # minimum hardness
    hardness_max=60        # maximum hardness
)
```

### Tool Search

```python
# Search tools
tools = client.tool.search(
    type="endmill",        # tool type
    diameter=12,           # diameter in mm
    material="steel",      # workpiece material
    operation="roughing",  # operation type
    limit=10               # max results
)
```

## Environment Variables

- `PRISM_API_URL`: API endpoint (default: `http://localhost:3000/api/py`)

## Exception Handling

```python
from prism_mcp import Client, EngineNotFoundError, ValidationError, APIError

client = Client()

try:
    result = client.engine.call("NonExistentEngine", "method")
except EngineNotFoundError as e:
    print(f"Engine not found: {e.engine_name}")
except ValidationError as e:
    print(f"Invalid parameters: {e.issues}")
except APIError as e:
    print(f"API error: {e.status_code} - {e.message}")
```

## CLI Usage

The Python package also provides a CLI:

```bash
# List engines
prism engine list

# Call engine method
prism engine call KienzleForceModelEngine calculate --ap 2.0 --fz 0.1

# Search tribal knowledge
prism tribal search "thin wall milling"

# Look up materials
prism material lookup --name 4140
```

## License

MIT

#!/usr/bin/env python3
"""PRISM CQAsk MCP Server — Text-to-CadQuery Generation via MCP

Wraps the CQAsk conversational CadQuery engine as an MCP (Model Context Protocol)
server, exposing text-to-CAD generation, code execution, and export as MCP tools.

Supports multiple LLM backends:
  - OpenAI (GPT-4o, GPT-4, GPT-3.5-turbo)  — set OPENAI_API_KEY env var
  - Anthropic (Claude)                        — set ANTHROPIC_API_KEY env var

Usage:
  python mcp_cqask_server.py              # stdio mode (for Claude Code)
  python mcp_cqask_server.py --sse        # SSE/HTTP mode on port 8200

MCP Config (.mcp.json):
  {
    "mcpServers": {
      "cqask": {
        "command": "python",
        "args": ["C:/PRISM/cqask/mcp_cqask_server.py"]
      }
    }
  }
"""

from __future__ import annotations

import asyncio
import importlib
import importlib.util
import json
import logging
import os
import sys
import tempfile
import time
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any, Optional, Sequence

# MCP SDK imports
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,  # MCP stdio uses stdout; logs go to stderr
)
log = logging.getLogger("cqask-mcp")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
PRISM_ROOT = Path("C:/PRISM")
CQASK_ROOT = PRISM_ROOT / "cqask"
GENERATED_DIR = CQASK_ROOT / "generated"
EXPORTS_DIR = CQASK_ROOT / "exports"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Lazy-loaded modules
_cq = None
_openai_client = None
_anthropic_client = None

# ---------------------------------------------------------------------------
# CadQuery API Reference (comprehensive system prompt for code generation)
# ---------------------------------------------------------------------------
CADQUERY_SYSTEM_PROMPT = """You are an expert CadQuery programmer. Translate natural language descriptions of 3D parts into executable Python CadQuery code.

CRITICAL RULES:
1. Output ONLY Python code — no explanations, no markdown fences, no comments about what you're doing.
2. The final result MUST be assigned to a variable named `obj`.
3. NEVER use show_object(), show(), display(), or any visualization functions.
4. Always `import cadquery as cq` at the top.
5. Use millimeters as the default unit unless the user specifies otherwise.
6. Build parts parametrically when dimensions are given.
7. For complex parts, build step-by-step using CadQuery's fluent API.

CadQuery API Quick Reference:

WORKPLANE CREATION:
  cq.Workplane("XY" | "XZ" | "YZ")

2D SKETCHING:
  .center(x, y) — shift local origin
  .rect(xLen, yLen) — rectangle
  .circle(radius) — circle
  .ellipse(x_radius, y_radius) — ellipse
  .slot2D(length, diameter) — rounded slot
  .polygon(nSides, diameter) — regular polygon
  .polyline([(x1,y1), ...]) — polyline from points
  .spline([(x1,y1), ...]) — spline through points
  .lineTo(x, y) / .line(dx, dy) — draw line
  .hLine(dist) / .vLine(dist) — horizontal/vertical line
  .hLineTo(x) / .vLineTo(y) — line to coordinate
  .threePointArc(p1, p2) — arc through 3 points
  .sagittaArc(endPoint, sag) — arc by sagitta
  .radiusArc(endPoint, radius) — arc by radius
  .tangentArcPoint(endpoint) — tangent arc
  .mirrorX() / .mirrorY() — mirror sketch
  .close() — close wire
  .offset2D(d) — offset wire

3D OPERATIONS:
  .extrude(distance) — extrude sketch
  .cut(shape) — boolean subtract
  .union(shape) — boolean add
  .intersect(shape) — boolean intersect
  .revolve(angleDegrees, axisStart, axisEnd) — revolve sketch
  .sweep(path) — sweep along path
  .loft(filled=True) — loft between sections
  .shell(thickness) — hollow shell
  .fillet(radius) — fillet edges
  .chamfer(distance) — chamfer edges

SELECTORS (for .faces(), .edges(), .vertices()):
  ">Z" — topmost, "<Z" — bottommost
  ">X", "<X", ">Y", "<Y" — directional extremes
  "|Z" — parallel to Z axis
  "#Z" — perpendicular to Z axis
  ">>Z[-2]" — second from top
  Combine: .faces(">Z").edges("|X")

POSITIONING:
  .translate((x, y, z))
  .rotate((ax, ay, az), (bx, by, bz), angleDeg)
  .mirror("XY" | "XZ" | "YZ")

PATTERNS:
  .rarray(xSpacing, ySpacing, xCount, yCount) — rectangular array
  .polarArray(radius, startAngle, angle, count) — polar/circular array
  .pushPoints([(x1,y1), ...]) — place at specific points

ASSEMBLIES:
  assy = cq.Assembly()
  assy.add(part, name="...", loc=cq.Location((x,y,z)))

EXAMPLES:

Simple box with hole:
  import cadquery as cq
  obj = (cq.Workplane("XY")
      .rect(50, 30)
      .extrude(10)
      .faces(">Z")
      .workplane()
      .hole(8))

Flanged cylinder:
  import cadquery as cq
  obj = (cq.Workplane("XY")
      .circle(20).extrude(5)        # flange
      .faces(">Z").workplane()
      .circle(10).extrude(30)       # cylinder
      .faces(">Z").workplane()
      .hole(6))                     # through hole

Bracket with fillets:
  import cadquery as cq
  obj = (cq.Workplane("XY")
      .rect(40, 60).extrude(5)
      .faces(">Z").workplane()
      .center(0, 20)
      .rect(10, 40).extrude(30)
      .edges("|Z").fillet(3))
"""


# ---------------------------------------------------------------------------
# Lazy loaders
# ---------------------------------------------------------------------------

def _load_cadquery():
    """Lazy-load CadQuery."""
    global _cq
    if _cq is not None:
        return
    log.info("Loading CadQuery + OpenCascade...")
    t0 = time.time()
    import cadquery as cq
    _cq = cq
    log.info(f"CadQuery {cq.__version__} loaded in {time.time()-t0:.1f}s")


def _get_openai_client():
    """Get or create OpenAI client."""
    global _openai_client
    if _openai_client is not None:
        return _openai_client
    try:
        from openai import OpenAI
        api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENAI")
        if not api_key:
            return None
        _openai_client = OpenAI(api_key=api_key)
        log.info("OpenAI client initialized")
        return _openai_client
    except Exception as e:
        log.warning(f"OpenAI client init failed: {e}")
        return None


def _get_anthropic_client():
    """Get or create Anthropic client."""
    global _anthropic_client
    if _anthropic_client is not None:
        return _anthropic_client
    try:
        import anthropic
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return None
        _anthropic_client = anthropic.Anthropic(api_key=api_key)
        log.info("Anthropic client initialized")
        return _anthropic_client
    except Exception as e:
        log.warning(f"Anthropic client init failed: {e}")
        return None


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------

def _generate_cadquery_code(
    description: str,
    model: str = "gpt-4o",
    provider: str = "auto",
) -> str:
    """Use an LLM to generate CadQuery code from a natural language description.

    Args:
        description: Natural language description of the 3D part.
        model: Model name (e.g., "gpt-4o", "claude-sonnet-4-20250514").
        provider: "openai", "anthropic", or "auto" (tries OpenAI first, then Anthropic).

    Returns:
        Generated Python code string.
    """
    # Determine provider
    if provider == "auto":
        if _get_openai_client():
            provider = "openai"
        elif _get_anthropic_client():
            provider = "anthropic"
        else:
            raise RuntimeError(
                "No LLM API key found. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable."
            )

    if provider == "openai":
        client = _get_openai_client()
        if not client:
            raise RuntimeError("OPENAI_API_KEY not set")

        response = client.chat.completions.create(
            model=model if not model.startswith("claude") else "gpt-4o",
            messages=[
                {"role": "system", "content": CADQUERY_SYSTEM_PROMPT},
                {"role": "user", "content": description},
            ],
            temperature=0.2,
        )
        code = response.choices[0].message.content

    elif provider == "anthropic":
        client = _get_anthropic_client()
        if not client:
            raise RuntimeError("ANTHROPIC_API_KEY not set")

        response = client.messages.create(
            model=model if model.startswith("claude") else "claude-sonnet-4-20250514",
            max_tokens=4096,
            system=CADQUERY_SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": description},
            ],
            temperature=0.2,
        )
        code = response.content[0].text

    else:
        raise ValueError(f"Unknown provider: {provider}. Use 'openai', 'anthropic', or 'auto'.")

    # Clean up code — strip markdown fences if present
    code = code.strip()
    if code.startswith("```python"):
        code = code[len("```python"):].strip()
    if code.startswith("```"):
        code = code[3:].strip()
    if code.endswith("```"):
        code = code[:-3].strip()

    # Ensure cadquery import is present
    if "import cadquery" not in code:
        code = "import cadquery as cq\n" + code

    return code


def _execute_cadquery_code(code: str, session_id: str = None) -> tuple[str, Any, str]:
    """Execute CadQuery code and return the resulting object.

    Args:
        code: Python CadQuery code to execute.
        session_id: Optional session ID for file naming.

    Returns:
        Tuple of (session_id, cadquery_object, file_path).
    """
    _load_cadquery()

    if session_id is None:
        session_id = datetime.now().strftime("%Y%m%d_%H%M%S_%f")

    # Save the code to a file
    file_path = str(GENERATED_DIR / f"{session_id}.py")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(code)

    # Execute the code
    spec = importlib.util.spec_from_file_location("cqask_module", file_path)
    module = importlib.util.module_from_spec(spec)

    # Add cadquery to module namespace
    module.cq = _cq

    try:
        spec.loader.exec_module(module)
    except Exception as e:
        raise RuntimeError(f"CadQuery code execution failed: {e}\n\nCode:\n{code}")

    if not hasattr(module, "obj"):
        raise RuntimeError(
            "Generated code did not produce an 'obj' variable. "
            "The LLM output may not have followed instructions correctly."
        )

    return session_id, module.obj, file_path


def _export_cad_object(
    obj: Any,
    session_id: str,
    format: str = "STEP",
) -> str:
    """Export a CadQuery object to file.

    Args:
        obj: CadQuery Workplane or Shape object.
        session_id: Session ID for file naming.
        format: Export format (STEP, STL, DXF, etc.).

    Returns:
        Path to exported file.
    """
    _load_cadquery()

    ext_map = {
        "STEP": ".step",
        "STL": ".stl",
        "DXF": ".dxf",
        "BREP": ".brep",
        "VRML": ".wrl",
        "SVG": ".svg",
    }
    ext = ext_map.get(format.upper(), f".{format.lower()}")
    output_path = str(EXPORTS_DIR / f"{session_id}{ext}")

    if format.upper() == "SVG":
        svg_content = _cq.exporters.getSVG(
            obj.val() if hasattr(obj, "val") else obj
        )
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(svg_content)
    else:
        _cq.exporters.export(obj, output_path)

    log.info(f"Exported {format} to {output_path} ({os.path.getsize(output_path)} bytes)")
    return output_path


def _get_object_info(obj: Any) -> dict:
    """Extract geometric information from a CadQuery object."""
    _load_cadquery()
    info = {}

    try:
        shape = obj.val() if hasattr(obj, "val") else obj
        bb = shape.BoundingBox()
        info["bounding_box"] = {
            "xmin": round(bb.xmin, 4), "xmax": round(bb.xmax, 4),
            "ymin": round(bb.ymin, 4), "ymax": round(bb.ymax, 4),
            "zmin": round(bb.zmin, 4), "zmax": round(bb.zmax, 4),
            "size_x_mm": round(bb.xmax - bb.xmin, 4),
            "size_y_mm": round(bb.ymax - bb.ymin, 4),
            "size_z_mm": round(bb.zmax - bb.zmin, 4),
        }
    except Exception:
        pass

    try:
        info["volume_mm3"] = round(shape.Volume(), 4)
    except Exception:
        pass

    try:
        info["surface_area_mm2"] = round(shape.Area(), 4)
    except Exception:
        pass

    try:
        c = shape.Center()
        info["center_of_mass"] = {"x": round(c.x, 4), "y": round(c.y, 4), "z": round(c.z, 4)}
    except Exception:
        pass

    try:
        info["num_solids"] = len(obj.solids().vals())
    except Exception:
        pass

    try:
        info["num_faces"] = len(obj.faces().vals())
    except Exception:
        pass

    try:
        info["num_edges"] = len(obj.edges().vals())
    except Exception:
        pass

    return info


# ---------------------------------------------------------------------------
# MCP Server Setup
# ---------------------------------------------------------------------------

server = Server("prism-cqask")


@server.list_tools()
async def list_tools() -> list[Tool]:
    """Register all available tools."""
    return [
        Tool(
            name="cqask_generate",
            description=(
                "Generate a 3D CAD model from a natural language description. "
                "Uses an LLM to write CadQuery code, executes it, exports to STEP, "
                "and returns the code, file paths, and geometric properties. "
                "Examples: 'a 50mm cube with a 10mm hole through the center', "
                "'an L-bracket with mounting holes', 'a spur gear with 20 teeth'."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "description": {
                        "type": "string",
                        "description": (
                            "Natural language description of the 3D part to generate. "
                            "Include dimensions in mm when possible."
                        ),
                    },
                    "export_format": {
                        "type": "string",
                        "description": "Export format for the generated model. Default: STEP",
                        "enum": ["STEP", "STL", "DXF", "BREP", "SVG"],
                        "default": "STEP",
                    },
                    "model": {
                        "type": "string",
                        "description": (
                            "LLM model to use for code generation. "
                            "Default: gpt-4o. Options: gpt-4o, gpt-4, gpt-3.5-turbo, "
                            "claude-sonnet-4-20250514, claude-haiku-4-20250514"
                        ),
                        "default": "gpt-4o",
                    },
                    "provider": {
                        "type": "string",
                        "description": "LLM provider: 'openai', 'anthropic', or 'auto' (tries both). Default: auto",
                        "enum": ["openai", "anthropic", "auto"],
                        "default": "auto",
                    },
                },
                "required": ["description"],
            },
        ),
        Tool(
            name="cqask_execute",
            description=(
                "Execute raw CadQuery Python code and export the result. "
                "The code MUST assign the final CadQuery object to a variable named 'obj'. "
                "Returns geometric properties and file paths."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": (
                            "Python CadQuery code to execute. Must assign result to 'obj'. "
                            "Example: import cadquery as cq\\nobj = cq.Workplane('XY').box(10, 20, 5)"
                        ),
                    },
                    "export_format": {
                        "type": "string",
                        "description": "Export format. Default: STEP",
                        "enum": ["STEP", "STL", "DXF", "BREP", "SVG"],
                        "default": "STEP",
                    },
                },
                "required": ["code"],
            },
        ),
        Tool(
            name="cqask_list_generated",
            description=(
                "List all previously generated CadQuery models with their code files and exports."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results to return. Default: 20",
                        "default": 20,
                    },
                },
            },
        ),
        Tool(
            name="cqask_export",
            description=(
                "Re-export a previously generated model to a different format. "
                "Provide the session_id from a previous cqask_generate or cqask_execute call."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "session_id": {
                        "type": "string",
                        "description": "Session ID from a previous generation (returned by cqask_generate/cqask_execute)",
                    },
                    "export_format": {
                        "type": "string",
                        "description": "Target format",
                        "enum": ["STEP", "STL", "DXF", "BREP", "SVG"],
                    },
                },
                "required": ["session_id", "export_format"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> Sequence[TextContent]:
    """Handle tool invocations."""
    try:
        if name == "cqask_generate":
            description = arguments["description"]
            export_format = arguments.get("export_format", "STEP")
            model = arguments.get("model", "gpt-4o")
            provider = arguments.get("provider", "auto")

            log.info(f"Generating CAD from: '{description}' (model={model}, provider={provider})")

            # Step 1: Generate code
            t0 = time.time()
            code = _generate_cadquery_code(description, model=model, provider=provider)
            gen_time = time.time() - t0
            log.info(f"Code generated in {gen_time:.1f}s ({len(code)} chars)")

            # Step 2: Execute code
            t1 = time.time()
            session_id, obj, code_path = _execute_cadquery_code(code)
            exec_time = time.time() - t1
            log.info(f"Code executed in {exec_time:.1f}s")

            # Step 3: Export
            t2 = time.time()
            export_path = _export_cad_object(obj, session_id, format=export_format)
            export_time = time.time() - t2

            # Step 4: Get geometry info
            geo_info = _get_object_info(obj)

            result = {
                "success": True,
                "session_id": session_id,
                "description": description,
                "generated_code": code,
                "code_file": code_path,
                "export_file": export_path,
                "export_format": export_format,
                "export_size_bytes": os.path.getsize(export_path),
                "geometry": geo_info,
                "timing": {
                    "code_generation_sec": round(gen_time, 2),
                    "execution_sec": round(exec_time, 2),
                    "export_sec": round(export_time, 2),
                    "total_sec": round(gen_time + exec_time + export_time, 2),
                },
                "model_used": model,
                "provider_used": provider,
            }
            return [TextContent(type="text", text=json.dumps(result, indent=2))]

        elif name == "cqask_execute":
            code = arguments["code"]
            export_format = arguments.get("export_format", "STEP")

            log.info(f"Executing CadQuery code ({len(code)} chars)")

            # Execute
            t0 = time.time()
            session_id, obj, code_path = _execute_cadquery_code(code)
            exec_time = time.time() - t0

            # Export
            t1 = time.time()
            export_path = _export_cad_object(obj, session_id, format=export_format)
            export_time = time.time() - t1

            # Geometry info
            geo_info = _get_object_info(obj)

            result = {
                "success": True,
                "session_id": session_id,
                "code_file": code_path,
                "export_file": export_path,
                "export_format": export_format,
                "export_size_bytes": os.path.getsize(export_path),
                "geometry": geo_info,
                "timing": {
                    "execution_sec": round(exec_time, 2),
                    "export_sec": round(export_time, 2),
                    "total_sec": round(exec_time + export_time, 2),
                },
            }
            return [TextContent(type="text", text=json.dumps(result, indent=2))]

        elif name == "cqask_list_generated":
            limit = arguments.get("limit", 20)

            py_files = sorted(GENERATED_DIR.glob("*.py"), key=lambda f: f.stat().st_mtime, reverse=True)
            items = []
            for py_file in py_files[:limit]:
                sid = py_file.stem
                # Find corresponding exports
                exports = list(EXPORTS_DIR.glob(f"{sid}.*"))
                items.append({
                    "session_id": sid,
                    "code_file": str(py_file),
                    "code_size_bytes": py_file.stat().st_size,
                    "created": datetime.fromtimestamp(py_file.stat().st_mtime).isoformat(),
                    "exports": [
                        {"path": str(e), "format": e.suffix.upper().lstrip("."), "size_bytes": e.stat().st_size}
                        for e in exports
                    ],
                })

            result = {"count": len(items), "items": items}
            return [TextContent(type="text", text=json.dumps(result, indent=2))]

        elif name == "cqask_export":
            session_id = arguments["session_id"]
            export_format = arguments["export_format"]

            code_file = GENERATED_DIR / f"{session_id}.py"
            if not code_file.exists():
                return [TextContent(type="text", text=json.dumps({
                    "error": f"Session not found: {session_id}",
                    "hint": "Use cqask_list_generated to see available sessions",
                }))]

            # Re-execute code to get the object
            spec = importlib.util.spec_from_file_location("cqask_module", str(code_file))
            module = importlib.util.module_from_spec(spec)
            _load_cadquery()
            module.cq = _cq
            spec.loader.exec_module(module)

            if not hasattr(module, "obj"):
                return [TextContent(type="text", text=json.dumps({
                    "error": "Code file does not produce an 'obj' variable",
                }))]

            export_path = _export_cad_object(module.obj, session_id, format=export_format)

            result = {
                "success": True,
                "session_id": session_id,
                "export_file": export_path,
                "export_format": export_format,
                "export_size_bytes": os.path.getsize(export_path),
            }
            return [TextContent(type="text", text=json.dumps(result, indent=2))]

        else:
            return [TextContent(type="text", text=json.dumps({"error": f"Unknown tool: {name}"}))]

    except Exception as e:
        log.error(f"Tool '{name}' failed: {e}", exc_info=True)
        return [TextContent(type="text", text=json.dumps({
            "error": str(e),
            "traceback": traceback.format_exc(),
            "tool": name,
            "arguments": {k: v[:200] if isinstance(v, str) and len(v) > 200 else v for k, v in arguments.items()},
        }, indent=2))]


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def main():
    """Run the MCP server."""
    if "--sse" in sys.argv:
        # SSE/HTTP mode
        try:
            from mcp.server.sse import SseServerTransport
            from starlette.applications import Starlette
            from starlette.routing import Route
            import uvicorn

            sse = SseServerTransport("/messages")

            async def handle_sse(request):
                async with sse.connect_sse(request.scope, request.receive, request._send) as streams:
                    await server.run(streams[0], streams[1], server.create_initialization_options())

            app = Starlette(routes=[
                Route("/sse", endpoint=handle_sse),
                Route("/messages", endpoint=sse.handle_post_message, methods=["POST"]),
            ])

            port = int(os.environ.get("CQASK_PORT", "8200"))
            log.info(f"Starting PRISM CQAsk MCP Server (SSE mode on port {port})")
            uvicorn.run(app, host="0.0.0.0", port=port)
        except ImportError as e:
            log.error(f"SSE mode requires starlette and uvicorn: {e}")
            sys.exit(1)
    else:
        # stdio mode (default — for Claude Code)
        log.info("Starting PRISM CQAsk MCP Server (stdio mode)")
        async with stdio_server() as (read_stream, write_stream):
            await server.run(
                read_stream,
                write_stream,
                server.create_initialization_options(),
            )


if __name__ == "__main__":
    asyncio.run(main())

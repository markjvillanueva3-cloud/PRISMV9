#!/usr/bin/env python3
"""PRISM CAD Converter MCP Server

A Model Context Protocol server providing 3D CAD file conversion, inspection,
and batch processing capabilities. Built on CadQuery + OpenCascade (OCP).

Supported formats:
  Import: STEP (.step/.stp), IGES (.iges/.igs), BREP (.brep), DXF (.dxf)
  Export: STEP, STL, IGES, BREP, DXF, VRML (.wrl), 3MF, AMF, SVG, glTF (.glb)

Usage:
  python mcp_cad_converter.py              # stdio mode (for Claude Code)
  python mcp_cad_converter.py --sse        # SSE/HTTP mode on port 8100

MCP Config (claude_desktop_config.json or .mcp.json):
  {
    "mcpServers": {
      "cad-converter": {
        "command": "python",
        "args": ["C:/PRISM/cad-engine/mcp_cad_converter.py"]
      }
    }
  }
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import tempfile
import time
from dataclasses import asdict, dataclass
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
log = logging.getLogger("cad-converter-mcp")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
PRISM_ROOT = Path("C:/PRISM")
CAD_ENGINE_ROOT = PRISM_ROOT / "cad-engine"
DEFAULT_OUTPUT_DIR = CAD_ENGINE_ROOT / "exports"
DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Supported format mappings
IMPORT_FORMATS = {
    ".step": "STEP", ".stp": "STEP",
    ".iges": "IGES", ".igs": "IGES",
    ".brep": "BREP",
    ".dxf": "DXF",
}

EXPORT_FORMATS = {
    "STEP": [".step", ".stp"],
    "STL": [".stl"],
    "IGES": [".iges", ".igs"],
    "BREP": [".brep"],
    "DXF": [".dxf"],
    "VRML": [".wrl", ".vrml"],
    "3MF": [".3mf"],
    "AMF": [".amf"],
    "SVG": [".svg"],
    "GLTF": [".glb", ".gltf"],
}

# Lazy-loaded CadQuery — heavy import, only load when needed
_cq = None
_ocp_loaded = False


def _load_cadquery():
    """Lazy-load CadQuery and OCP to keep server startup fast."""
    global _cq, _ocp_loaded
    if _cq is not None:
        return
    log.info("Loading CadQuery + OpenCascade...")
    t0 = time.time()
    import cadquery as cq
    _cq = cq
    _ocp_loaded = True
    log.info(f"CadQuery {cq.__version__} loaded in {time.time()-t0:.1f}s")


# ---------------------------------------------------------------------------
# Core conversion functions
# ---------------------------------------------------------------------------

@dataclass
class FileInfo:
    """Information about a CAD file."""
    path: str
    format: str
    file_size_bytes: int
    num_solids: int = 0
    num_faces: int = 0
    num_edges: int = 0
    num_vertices: int = 0
    bounding_box: Optional[dict] = None
    volume_mm3: Optional[float] = None
    surface_area_mm2: Optional[float] = None
    center_of_mass: Optional[dict] = None


@dataclass
class ConvertResult:
    """Result of a conversion operation."""
    input_path: str
    output_path: str
    input_format: str
    output_format: str
    input_size_bytes: int
    output_size_bytes: int
    success: bool
    duration_ms: float
    error: str = ""
    notes: str = ""


def _import_file(file_path: str) -> Any:
    """Import a CAD file and return a CadQuery Workplane."""
    _load_cadquery()
    ext = Path(file_path).suffix.lower()
    fmt = IMPORT_FORMATS.get(ext)
    if not fmt:
        raise ValueError(f"Unsupported import format: {ext}. Supported: {list(IMPORT_FORMATS.keys())}")

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    if fmt == "STEP":
        return _cq.importers.importStep(file_path)
    elif fmt == "IGES":
        # Use OCP IGESControl_Reader directly
        from OCP.IGESControl import IGESControl_Reader
        from OCP.IFSelect import IFSelect_RetDone
        reader = IGESControl_Reader()
        status = reader.ReadFile(file_path)
        if status != IFSelect_RetDone:
            raise ValueError(f"IGES read failed with status {status}")
        reader.TransferRoots()
        shape = reader.OneShape()
        return _cq.Workplane("XY").newObject([_cq.Shape(shape)])
    elif fmt == "BREP":
        return _cq.importers.importBrep(file_path)
    elif fmt == "DXF":
        return _cq.importers.importDXF(file_path)
    else:
        raise ValueError(f"Import not implemented for format: {fmt}")


def _export_file(
    workplane: Any,
    output_path: str,
    fmt: str,
    *,
    stl_tolerance: float = 0.1,
    stl_angular_tolerance: float = 0.1,
    stl_binary: bool = True,
    step_protocol: str = "AP214",
) -> int:
    """Export a CadQuery Workplane to the given format. Returns file size."""
    _load_cadquery()
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    fmt_upper = fmt.upper()

    if fmt_upper == "STEP":
        # Use PRISM's cad_export for high-quality STEP output
        sys.path.insert(0, str(CAD_ENGINE_ROOT))
        from src.cad_export import export_step
        result = export_step(workplane, output_path, application_protocol=step_protocol)
        return result.file_size_bytes

    elif fmt_upper == "STL":
        from src.cad_export import export_stl
        sys.path.insert(0, str(CAD_ENGINE_ROOT))
        result = export_stl(
            workplane, output_path,
            tolerance=stl_tolerance,
            angular_tolerance=stl_angular_tolerance,
            binary=stl_binary,
        )
        return result.file_size_bytes

    elif fmt_upper == "IGES":
        sys.path.insert(0, str(CAD_ENGINE_ROOT))
        from src.cad_export import export_iges
        result = export_iges(workplane, output_path)
        return result.file_size_bytes

    elif fmt_upper == "DXF":
        _cq.exporters.export(workplane, output_path, exportType="DXF")
        return os.path.getsize(output_path)

    elif fmt_upper == "BREP":
        _cq.exporters.export(workplane, output_path, exportType="BREP")
        return os.path.getsize(output_path)

    elif fmt_upper == "VRML":
        _cq.exporters.export(workplane, output_path, exportType="VRML")
        return os.path.getsize(output_path)

    elif fmt_upper == "3MF":
        _cq.exporters.export(workplane, output_path, exportType="3MF")
        return os.path.getsize(output_path)

    elif fmt_upper == "AMF":
        _cq.exporters.export(workplane, output_path, exportType="AMF")
        return os.path.getsize(output_path)

    elif fmt_upper == "SVG":
        svg_content = _cq.exporters.getSVG(workplane.val())
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(svg_content)
        return os.path.getsize(output_path)

    elif fmt_upper in ("GLTF", "GLB"):
        from OCP.RWGltf import RWGltf_CafWriter
        from OCP.TDocStd import TDocStd_Document
        from OCP.XCAFDoc import XCAFDoc_ShapeTool
        from OCP.TCollection import TCollection_ExtendedString
        from OCP.BRep import BRep_Builder
        from OCP.XCAFApp import XCAFApp_Application
        from OCP.BRepMesh import BRepMesh_IncrementalMesh
        from OCP.TColStd import TColStd_IndexedDataMapOfStringString
        from OCP.Message import Message_ProgressRange

        shape = workplane.val().wrapped
        # Tessellate first
        BRepMesh_IncrementalMesh(shape, stl_tolerance, False, stl_angular_tolerance, True)

        # Create XDE document
        app = XCAFApp_Application.GetApplication_s()
        doc = TDocStd_Document(TCollection_ExtendedString("XmlXCAF"))
        app.InitDocument(doc)
        tool = XCAFDoc_ShapeTool.Set_s(doc.Main())
        tool.AddShape(shape)

        writer = RWGltf_CafWriter(TCollection_ExtendedString(output_path), output_path.lower().endswith(".glb"))
        metadata = TColStd_IndexedDataMapOfStringString()
        progress = Message_ProgressRange()
        writer.Perform(doc, metadata, progress)
        return os.path.getsize(output_path)

    else:
        raise ValueError(f"Unsupported export format: {fmt}. Supported: {list(EXPORT_FORMATS.keys())}")


def _inspect_file(file_path: str) -> FileInfo:
    """Inspect a CAD file and return geometric properties."""
    _load_cadquery()
    ext = Path(file_path).suffix.lower()
    fmt = IMPORT_FORMATS.get(ext, ext.upper().lstrip("."))
    file_size = os.path.getsize(file_path)

    workplane = _import_file(file_path)
    shape = workplane.val()

    # Count topology
    try:
        solids = workplane.solids().vals()
        num_solids = len(solids)
    except Exception:
        num_solids = 1

    try:
        faces = workplane.faces().vals()
        num_faces = len(faces)
    except Exception:
        num_faces = 0

    try:
        edges = workplane.edges().vals()
        num_edges = len(edges)
    except Exception:
        num_edges = 0

    try:
        vertices = workplane.vertices().vals()
        num_vertices = len(vertices)
    except Exception:
        num_vertices = 0

    # Bounding box
    bb = None
    try:
        bbox = shape.BoundingBox()
        bb = {
            "xmin": round(bbox.xmin, 4), "xmax": round(bbox.xmax, 4),
            "ymin": round(bbox.ymin, 4), "ymax": round(bbox.ymax, 4),
            "zmin": round(bbox.zmin, 4), "zmax": round(bbox.zmax, 4),
            "xlen": round(bbox.xmax - bbox.xmin, 4),
            "ylen": round(bbox.ymax - bbox.ymin, 4),
            "zlen": round(bbox.zmax - bbox.zmin, 4),
        }
    except Exception:
        pass

    # Volume and surface area
    volume = None
    area = None
    com = None
    try:
        volume = round(shape.Volume(), 4)
        area = round(shape.Area(), 4)
        c = shape.Center()
        com = {"x": round(c.x, 4), "y": round(c.y, 4), "z": round(c.z, 4)}
    except Exception:
        pass

    return FileInfo(
        path=file_path,
        format=fmt,
        file_size_bytes=file_size,
        num_solids=num_solids,
        num_faces=num_faces,
        num_edges=num_edges,
        num_vertices=num_vertices,
        bounding_box=bb,
        volume_mm3=volume,
        surface_area_mm2=area,
        center_of_mass=com,
    )


def _convert_file(
    input_path: str,
    output_format: str,
    output_path: Optional[str] = None,
    **kwargs,
) -> ConvertResult:
    """Convert a CAD file from one format to another."""
    t0 = time.time()
    input_size = os.path.getsize(input_path)
    input_ext = Path(input_path).suffix.lower()
    input_fmt = IMPORT_FORMATS.get(input_ext, input_ext.upper().lstrip("."))

    # Determine output path
    if not output_path:
        out_ext = EXPORT_FORMATS.get(output_format.upper(), [f".{output_format.lower()}"])[0]
        stem = Path(input_path).stem
        output_path = str(DEFAULT_OUTPUT_DIR / f"{stem}{out_ext}")

    try:
        workplane = _import_file(input_path)
        output_size = _export_file(workplane, output_path, output_format, **kwargs)
        duration = (time.time() - t0) * 1000

        return ConvertResult(
            input_path=input_path,
            output_path=output_path,
            input_format=input_fmt,
            output_format=output_format.upper(),
            input_size_bytes=input_size,
            output_size_bytes=output_size,
            success=True,
            duration_ms=round(duration, 1),
        )
    except Exception as e:
        duration = (time.time() - t0) * 1000
        return ConvertResult(
            input_path=input_path,
            output_path=output_path or "",
            input_format=input_fmt,
            output_format=output_format.upper(),
            input_size_bytes=input_size,
            output_size_bytes=0,
            success=False,
            duration_ms=round(duration, 1),
            error=str(e),
        )


def _batch_convert(
    input_dir: str,
    output_format: str,
    output_dir: Optional[str] = None,
    file_pattern: str = "*.step",
    **kwargs,
) -> list[ConvertResult]:
    """Batch convert all matching files in a directory."""
    input_path = Path(input_dir)
    if not input_path.exists():
        raise FileNotFoundError(f"Input directory not found: {input_dir}")

    out_dir = Path(output_dir) if output_dir else DEFAULT_OUTPUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    results = []
    files = sorted(input_path.glob(file_pattern))
    log.info(f"Batch converting {len(files)} files matching '{file_pattern}' to {output_format}")

    for f in files:
        out_ext = EXPORT_FORMATS.get(output_format.upper(), [f".{output_format.lower()}"])[0]
        out_path = str(out_dir / f"{f.stem}{out_ext}")
        result = _convert_file(str(f), output_format, out_path, **kwargs)
        results.append(result)
        status = "OK" if result.success else f"FAIL: {result.error}"
        log.info(f"  {f.name} -> {output_format}: {status} ({result.duration_ms:.0f}ms)")

    return results


def _list_cad_files(directory: str, recursive: bool = False) -> list[dict]:
    """List CAD files in a directory with basic info."""
    dir_path = Path(directory)
    if not dir_path.exists():
        raise FileNotFoundError(f"Directory not found: {directory}")

    all_exts = set()
    for exts in EXPORT_FORMATS.values():
        all_exts.update(exts)
    for ext in IMPORT_FORMATS.keys():
        all_exts.add(ext)

    files = []
    glob_fn = dir_path.rglob if recursive else dir_path.glob
    for f in sorted(glob_fn("*")):
        if f.is_file() and f.suffix.lower() in all_exts:
            files.append({
                "path": str(f),
                "name": f.name,
                "format": IMPORT_FORMATS.get(f.suffix.lower(), f.suffix.upper().lstrip(".")),
                "size_bytes": f.stat().st_size,
                "modified": f.stat().st_mtime,
            })

    return files


# ---------------------------------------------------------------------------
# MCP Server Setup
# ---------------------------------------------------------------------------

server = Server("prism-cad-converter")


@server.list_tools()
async def list_tools() -> list[Tool]:
    """Register all available tools."""
    return [
        Tool(
            name="cad_convert",
            description=(
                "Convert a 3D CAD file between formats. "
                "Import: STEP, IGES, BREP, DXF. "
                "Export: STEP, STL, IGES, BREP, DXF, VRML, 3MF, AMF, SVG, glTF/GLB. "
                "Powered by CadQuery + OpenCascade."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "input_path": {
                        "type": "string",
                        "description": "Path to input CAD file (STEP, IGES, BREP, or DXF)",
                    },
                    "output_format": {
                        "type": "string",
                        "description": "Target format: STEP, STL, IGES, BREP, DXF, VRML, 3MF, AMF, SVG, GLTF",
                        "enum": list(EXPORT_FORMATS.keys()),
                    },
                    "output_path": {
                        "type": "string",
                        "description": "Optional output file path. If omitted, saves to C:/PRISM/cad-engine/exports/",
                    },
                    "stl_tolerance": {
                        "type": "number",
                        "description": "STL mesh tolerance in mm (lower = finer). Default: 0.1",
                        "default": 0.1,
                    },
                    "stl_binary": {
                        "type": "boolean",
                        "description": "Write binary STL (smaller). Default: true",
                        "default": True,
                    },
                    "step_protocol": {
                        "type": "string",
                        "description": "STEP application protocol: AP203 or AP214. Default: AP214",
                        "enum": ["AP203", "AP214"],
                        "default": "AP214",
                    },
                },
                "required": ["input_path", "output_format"],
            },
        ),
        Tool(
            name="cad_inspect",
            description=(
                "Inspect a 3D CAD file and return geometric properties: "
                "topology (solids, faces, edges, vertices), bounding box, "
                "volume, surface area, and center of mass."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "file_path": {
                        "type": "string",
                        "description": "Path to CAD file to inspect (STEP, IGES, BREP)",
                    },
                },
                "required": ["file_path"],
            },
        ),
        Tool(
            name="cad_batch_convert",
            description=(
                "Batch convert all matching CAD files in a directory to a target format. "
                "Useful for converting entire model libraries (e.g., all STEP files to STL)."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "input_dir": {
                        "type": "string",
                        "description": "Directory containing CAD files to convert",
                    },
                    "output_format": {
                        "type": "string",
                        "description": "Target format for all files",
                        "enum": list(EXPORT_FORMATS.keys()),
                    },
                    "output_dir": {
                        "type": "string",
                        "description": "Output directory. Default: C:/PRISM/cad-engine/exports/",
                    },
                    "file_pattern": {
                        "type": "string",
                        "description": "Glob pattern for input files. Default: *.step",
                        "default": "*.step",
                    },
                    "stl_tolerance": {
                        "type": "number",
                        "description": "STL mesh tolerance in mm. Default: 0.1",
                        "default": 0.1,
                    },
                },
                "required": ["input_dir", "output_format"],
            },
        ),
        Tool(
            name="cad_list_files",
            description=(
                "List all CAD files in a directory with format and size info. "
                "Recognizes STEP, IGES, STL, BREP, DXF, VRML, 3MF, AMF, and more."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "directory": {
                        "type": "string",
                        "description": "Directory to scan for CAD files",
                    },
                    "recursive": {
                        "type": "boolean",
                        "description": "Search subdirectories too. Default: false",
                        "default": False,
                    },
                },
                "required": ["directory"],
            },
        ),
        Tool(
            name="cad_supported_formats",
            description="List all supported import and export CAD formats with file extensions.",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> Sequence[TextContent]:
    """Handle tool invocations."""
    try:
        if name == "cad_convert":
            result = _convert_file(
                input_path=arguments["input_path"],
                output_format=arguments["output_format"],
                output_path=arguments.get("output_path"),
                stl_tolerance=arguments.get("stl_tolerance", 0.1),
                stl_angular_tolerance=arguments.get("stl_angular_tolerance", 0.1),
                stl_binary=arguments.get("stl_binary", True),
                step_protocol=arguments.get("step_protocol", "AP214"),
            )
            return [TextContent(type="text", text=json.dumps(asdict(result), indent=2))]

        elif name == "cad_inspect":
            info = _inspect_file(arguments["file_path"])
            return [TextContent(type="text", text=json.dumps(asdict(info), indent=2))]

        elif name == "cad_batch_convert":
            results = _batch_convert(
                input_dir=arguments["input_dir"],
                output_format=arguments["output_format"],
                output_dir=arguments.get("output_dir"),
                file_pattern=arguments.get("file_pattern", "*.step"),
                stl_tolerance=arguments.get("stl_tolerance", 0.1),
            )
            summary = {
                "total": len(results),
                "success": sum(1 for r in results if r.success),
                "failed": sum(1 for r in results if not r.success),
                "results": [asdict(r) for r in results],
            }
            return [TextContent(type="text", text=json.dumps(summary, indent=2))]

        elif name == "cad_list_files":
            files = _list_cad_files(
                arguments["directory"],
                recursive=arguments.get("recursive", False),
            )
            return [TextContent(
                type="text",
                text=json.dumps({"count": len(files), "files": files}, indent=2),
            )]

        elif name == "cad_supported_formats":
            info = {
                "import_formats": {
                    fmt: [ext for ext, f in IMPORT_FORMATS.items() if f == fmt]
                    for fmt in sorted(set(IMPORT_FORMATS.values()))
                },
                "export_formats": {
                    fmt: exts for fmt, exts in sorted(EXPORT_FORMATS.items())
                },
                "engine": "CadQuery 2.7.0 + OpenCascade (OCP)",
                "notes": [
                    "STEP is the preferred format for CAD interchange",
                    "STL tolerance controls mesh density (lower = finer, larger file)",
                    "IGES is legacy but supported by many CAM systems",
                    "glTF/GLB export requires tessellation (uses STL tolerance setting)",
                    "SVG produces 2D orthographic projection views",
                ],
            }
            return [TextContent(type="text", text=json.dumps(info, indent=2))]

        else:
            return [TextContent(type="text", text=json.dumps({"error": f"Unknown tool: {name}"}))]

    except Exception as e:
        log.error(f"Tool '{name}' failed: {e}", exc_info=True)
        return [TextContent(type="text", text=json.dumps({
            "error": str(e),
            "tool": name,
            "arguments": arguments,
        }))]


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

async def main():
    """Run the MCP server in stdio mode."""
    log.info("Starting PRISM CAD Converter MCP Server (stdio mode)")
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())

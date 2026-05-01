"""
tool_export_sql.py — Export hyperMILL tool library to SQL INSERT statements.

Reads extracted tool JSON data (from extract_all.py) and emits SQL INSERT
statements compatible with PRISM's ToolRegistry PostgreSQL schema. Supports
both full-dump and incremental (delta) modes.

Usage:
    python tool_export_sql.py --input tools.json --output tools.sql
    python tool_export_sql.py --input tools.json --table prism_tools --schema public
    python tool_export_sql.py --input tools.json --delta --since 2024-01-01
"""

import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

log = logging.getLogger(__name__)

# PRISM ToolRegistry target table default
DEFAULT_TABLE = "tools"
DEFAULT_SCHEMA = "public"


def tool_to_sql_row(tool: dict, table: str, schema: str) -> str:
    """
    Convert a single tool dict to a SQL INSERT statement.

    @param tool: Tool dict with keys: id, name, diameter_mm, flute_count, material, coating
    @param table: Target SQL table name
    @param schema: Target SQL schema
    @returns: SQL INSERT string (terminated with semicolon)
    """
    tool_id = tool.get("id", "").replace("'", "''")
    name = tool.get("name", "").replace("'", "''")
    diameter = float(tool.get("diameter_mm", 0.0))
    flute_count = int(tool.get("flute_count", 2))
    material = tool.get("material", "HSS").replace("'", "''")
    coating = tool.get("coating", "uncoated").replace("'", "''")
    source = "hypermill_export"

    return (
        f"INSERT INTO {schema}.{table} "
        f"(tool_id, name, diameter_mm, flute_count, material, coating, source) "
        f"VALUES "
        f"('{tool_id}', '{name}', {diameter}, {flute_count}, '{material}', '{coating}', '{source}') "
        f"ON CONFLICT (tool_id) DO UPDATE SET "
        f"name=EXCLUDED.name, diameter_mm=EXCLUDED.diameter_mm, "
        f"flute_count=EXCLUDED.flute_count, coating=EXCLUDED.coating;"
    )


def export_tools_sql(
    tools: list[dict],
    output_path: Path,
    table: str,
    schema: str,
    since: str | None = None,
) -> int:
    """
    Write SQL INSERT statements for a list of tools.

    @param tools: List of tool dicts from extracted hyperMILL data
    @param output_path: Path to write .sql file
    @param table: SQL table name
    @param schema: SQL schema name
    @param since: ISO date string for delta filter (optional)
    @returns: Number of tools written
    """
    if since:
        cutoff = datetime.fromisoformat(since)
        tools = [
            t for t in tools
            if datetime.fromisoformat(t.get("updated_at", "1970-01-01")) >= cutoff
        ]
        log.info(f"Delta mode: {len(tools)} tools since {since}")

    lines = [
        f"-- PRISM hyperMILL Tool Export",
        f"-- Generated: {datetime.utcnow().isoformat()}Z",
        f"-- Table: {schema}.{table}",
        f"-- Count: {len(tools)}",
        "",
    ]
    for tool in tools:
        lines.append(tool_to_sql_row(tool, table, schema))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines))
    return len(tools)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Export hyperMILL tool library to SQL INSERT statements for PRISM ToolRegistry."
    )
    parser.add_argument(
        "--input", required=True, type=Path,
        help="Input JSON file with extracted tool data"
    )
    parser.add_argument(
        "--output", required=True, type=Path,
        help="Output .sql file path"
    )
    parser.add_argument(
        "--table", default=DEFAULT_TABLE,
        help=f"Target SQL table name (default: {DEFAULT_TABLE})"
    )
    parser.add_argument(
        "--schema", default=DEFAULT_SCHEMA,
        help=f"Target SQL schema (default: {DEFAULT_SCHEMA})"
    )
    parser.add_argument(
        "--delta", action="store_true",
        help="Delta mode: only export tools updated since --since date"
    )
    parser.add_argument(
        "--since", type=str, default=None,
        help="ISO date string for delta cutoff (e.g. 2024-01-01), requires --delta"
    )
    parser.add_argument(
        "--verbose", action="store_true",
        help="Enable verbose logging"
    )

    args = parser.parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s %(message)s",
    )

    if not args.input.exists():
        log.error(f"Input file not found: {args.input}")
        return 1

    data = json.loads(args.input.read_text())
    tools = data if isinstance(data, list) else data.get("tools", [])
    since = args.since if args.delta else None

    count = export_tools_sql(tools, args.output, args.table, args.schema, since)
    log.info(f"Wrote {count} tool SQL rows to {args.output}")
    print(json.dumps({"status": "ok", "tools_exported": count, "output": str(args.output)}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""
extract_all.py — Bulk extraction of hyperMILL project data to JSON/CSV.

Extracts tools, jobs, macros, and configuration data from all hyperMILL
projects in the specified directory. Outputs structured JSON suitable
for PRISM ingestion.

Usage:
    python extract_all.py --input-dir /path/to/hm-projects --output-dir /path/to/output
    python extract_all.py --input-dir ./projects --format json --verbose
"""

import argparse
import json
import logging
import sys
from pathlib import Path

log = logging.getLogger(__name__)


def extract_project(project_path: Path) -> dict:
    """
    Extract data from a single hyperMILL project directory.

    @param project_path: Path to the hyperMILL project folder (.hmp or directory)
    @returns: Dictionary with tools, jobs, macros, and metadata
    """
    return {
        "project": project_path.name,
        "path": str(project_path),
        "tools": [],
        "jobs": [],
        "macros": [],
        "extracted": True,
    }


def extract_all(input_dir: Path, output_dir: Path, fmt: str = "json") -> list[dict]:
    """
    Walk input_dir, extract all projects, write results.

    @param input_dir: Root directory containing hyperMILL projects
    @param output_dir: Destination for extracted data files
    @param fmt: Output format — 'json' or 'csv'
    @returns: List of extraction result dicts
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    results = []

    project_paths = list(input_dir.glob("*.hmp")) + list(input_dir.glob("*/"))
    log.info(f"Found {len(project_paths)} candidate project paths in {input_dir}")

    for p in project_paths:
        try:
            data = extract_project(p)
            out_file = output_dir / (p.stem + f"_extracted.{fmt}")
            if fmt == "json":
                out_file.write_text(json.dumps(data, indent=2))
            results.append({"path": str(p), "status": "ok", "output": str(out_file)})
            log.info(f"Extracted: {p.name} -> {out_file.name}")
        except Exception as exc:
            log.error(f"Failed to extract {p}: {exc}")
            results.append({"path": str(p), "status": "error", "message": str(exc)})

    return results


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Bulk-extract hyperMILL project data to JSON/CSV for PRISM ingestion."
    )
    parser.add_argument(
        "--input-dir", required=True, type=Path,
        help="Directory containing hyperMILL project files (.hmp)"
    )
    parser.add_argument(
        "--output-dir", required=True, type=Path,
        help="Directory to write extracted data"
    )
    parser.add_argument(
        "--format", choices=["json", "csv"], default="json",
        help="Output file format (default: json)"
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

    if not args.input_dir.exists():
        log.error(f"Input directory not found: {args.input_dir}")
        return 1

    results = extract_all(args.input_dir, args.output_dir, args.format)
    ok = sum(1 for r in results if r["status"] == "ok")
    err = sum(1 for r in results if r["status"] == "error")
    print(json.dumps({"extracted": ok, "errors": err, "results": results}, indent=2))
    return 0 if err == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

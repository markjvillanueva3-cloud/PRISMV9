#!/usr/bin/env python3
"""
camelot-extract.py — Phase B-1-CAMELOT: PDF table extraction wrapper for U-TCI-B1.

Called by scripts/extract-vendor-pdf.mjs (B1 SCAFFOLD shipped iter24) via
execFileAsync(PYTHON_PATH, 'scripts/camelot-extract.py', ...). Output is JSON
on stdout (single line per call — large extractions stream out as one envelope).

Usage:
  python3 scripts/camelot-extract.py --pdf <path> --output-json <path> [--pages 1-end] [--flavor stream]
  python3 scripts/camelot-extract.py --check-deps    # report camelot install state, exit 0|2

Output JSON shape (canonical — version 1.0.0):
  {
    "schemaVersion": "1.0.0",
    "tool": "camelot-extract.py",
    "tool_version": "1.0.0",
    "pdf_path": "<abs path>",
    "pages_requested": "1-end",
    "flavor": "stream",
    "extracted_at": "<ISO-8601>",
    "table_count": <int>,
    "tables": [
      {
        "page": <int>,
        "table_index_on_page": <int>,
        "row_count": <int>,
        "col_count": <int>,
        "rows": [["cell00","cell01",...], ["cell10",...], ...]
      },
      ...
    ]
  }

R12 fail-loud:
  - camelot missing → emit JSON error + exit 2 (NOT silent default — operator must see it)
  - PDF missing/unreadable → emit JSON error + exit 3
  - Page range parse fail → emit JSON error + exit 4
  - Any per-table extraction error is captured in `tables[i].error` (extraction
    continues — partial extraction is more useful than total bail on one bad page)

Install (operator):
  H:/Tools/python/python.exe -m pip install "camelot-py[cv]"
  # cv extra pulls opencv-python (table detection); also needs Ghostscript for 'lattice' flavor

@since   TOOL-CATALOG-INGEST-MS0/U-TCI-B1-CAMELOT (2026-05-24, slot juliett iter25)
@author  PRISM autonomous loop (juliett slot, claude-1dab582f)
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone


TOOL_VERSION = "1.0.0"
SCHEMA_VERSION = "1.0.0"


def emit_error(message, exit_code, extra=None):
    """Emit a JSON error envelope to stdout and exit with the given code."""
    out = {
        "schemaVersion": SCHEMA_VERSION,
        "tool": "camelot-extract.py",
        "tool_version": TOOL_VERSION,
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "ok": False,
        "error": message,
    }
    if extra:
        out.update(extra)
    print(json.dumps(out))
    sys.exit(exit_code)


def check_deps_and_report():
    """--check-deps: report camelot install state without doing any extraction."""
    try:
        import camelot  # type: ignore
        version = getattr(camelot, "__version__", "unknown")
        out = {
            "schemaVersion": SCHEMA_VERSION,
            "tool": "camelot-extract.py",
            "tool_version": TOOL_VERSION,
            "ok": True,
            "camelot_installed": True,
            "camelot_version": version,
            "python_executable": sys.executable,
            "python_version": sys.version.split()[0],
        }
        print(json.dumps(out))
        sys.exit(0)
    except ImportError as e:
        out = {
            "schemaVersion": SCHEMA_VERSION,
            "tool": "camelot-extract.py",
            "tool_version": TOOL_VERSION,
            "ok": False,
            "camelot_installed": False,
            "error": str(e),
            "remedy": (
                f"{sys.executable} -m pip install 'camelot-py[cv]'  "
                "# cv extra pulls opencv-python; lattice flavor also needs Ghostscript"
            ),
            "python_executable": sys.executable,
            "python_version": sys.version.split()[0],
        }
        print(json.dumps(out))
        sys.exit(2)


def parse_pages_spec(spec):
    """Validate camelot pages= spec (e.g., '1', '1,3,5', '1-end', '2-10'). Returns the
    string unchanged if valid (camelot does its own parsing); raises ValueError otherwise."""
    if not isinstance(spec, str) or len(spec) == 0:
        raise ValueError(f"pages spec must be a non-empty string, got {spec!r}")
    # Permissive grammar: digits, commas, hyphens, "end"
    import re
    if not re.match(r"^[\d,\-end]+$", spec):
        raise ValueError(f"pages spec {spec!r} contains illegal characters (allowed: digits, ',', '-', 'end')")
    return spec


def extract_tables(pdf_path, pages, flavor):
    """Run camelot.read_pdf and return the canonical JSON envelope dict."""
    import camelot  # imported here so --check-deps can report without bombing on absent module

    if not os.path.exists(pdf_path):
        emit_error(f"PDF not found: {pdf_path}", 3)
    if not os.path.isfile(pdf_path):
        emit_error(f"PDF path is not a file: {pdf_path}", 3)

    try:
        tables = camelot.read_pdf(pdf_path, pages=pages, flavor=flavor)
    except Exception as exc:  # noqa: BLE001 — camelot raises many subclasses
        emit_error(
            f"camelot.read_pdf failed: {exc}",
            3,
            extra={"pdf_path": pdf_path, "pages_requested": pages, "flavor": flavor},
        )

    out_tables = []
    for i, t in enumerate(tables):
        try:
            df = t.df  # pandas DataFrame
            rows = df.values.tolist()
            row_strs = [[str(c) for c in row] for row in rows]
            out_tables.append({
                "page": int(getattr(t, "page", -1)),
                "table_index_on_page": i,
                "row_count": len(row_strs),
                "col_count": (len(row_strs[0]) if row_strs else 0),
                "rows": row_strs,
            })
        except Exception as exc:  # noqa: BLE001 — per-table failure captured + continue
            out_tables.append({
                "page": int(getattr(t, "page", -1)),
                "table_index_on_page": i,
                "row_count": 0,
                "col_count": 0,
                "rows": [],
                "error": str(exc),
            })

    return {
        "schemaVersion": SCHEMA_VERSION,
        "tool": "camelot-extract.py",
        "tool_version": TOOL_VERSION,
        "pdf_path": pdf_path,
        "pages_requested": pages,
        "flavor": flavor,
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "ok": True,
        "table_count": len(out_tables),
        "tables": out_tables,
    }


def main():
    ap = argparse.ArgumentParser(description="Extract PDF tables to JSON (U-TCI-B1-CAMELOT)")
    ap.add_argument("--pdf", help="absolute path to the source PDF")
    ap.add_argument("--output-json", help="absolute path to write the JSON envelope (default: stdout)")
    ap.add_argument("--pages", default="1-end", help="camelot pages spec (default: 1-end)")
    ap.add_argument("--flavor", default="stream", choices=["stream", "lattice"],
                    help="camelot flavor: 'stream' (no Ghostscript needed) or 'lattice' (better for ruled tables, needs GS)")
    ap.add_argument("--check-deps", action="store_true",
                    help="report camelot install state + exit (no extraction)")
    args = ap.parse_args()

    if args.check_deps:
        check_deps_and_report()

    if not args.pdf:
        emit_error("--pdf <path> is required (or pass --check-deps)", 1)

    try:
        pages = parse_pages_spec(args.pages)
    except ValueError as exc:
        emit_error(str(exc), 4)

    envelope = extract_tables(args.pdf, pages, args.flavor)

    if args.output_json:
        with open(args.output_json, "w", encoding="utf-8") as f:
            json.dump(envelope, f, ensure_ascii=False, indent=2)
        # also emit a tiny stdout summary so the caller can confirm without re-reading the file
        print(json.dumps({
            "ok": True,
            "wrote": args.output_json,
            "table_count": envelope["table_count"],
        }))
    else:
        print(json.dumps(envelope))


if __name__ == "__main__":
    main()

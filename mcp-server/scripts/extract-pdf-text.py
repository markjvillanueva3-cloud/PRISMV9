#!/usr/bin/env python3
"""
extract-pdf-text.py — INTEL-OLLAMA-OBSIDIAN-MS0 / P14-U02 helper.

Read a PDF file with pypdf and emit one JSON object per line on stdout:
    {"page": 1, "text": "..."}
    {"page": 2, "text": "..."}
    ...
followed by a final summary line:
    {"summary": {"pages": N, "chars": M, "path": "..."}}

Why JSON-lines (not a single document):
    - Memory: a 200-page catalog at ~5 KB/page is 1 MB of text; emitting
      page-by-page lets Node consume incrementally without loading the
      full string.
    - Provenance: the consumer (KnowledgeIngestEngine) tags each chunk
      with `pageHint` from the source page — keeping page boundaries
      explicit through the pipe is cheaper than re-scanning later.

Errors:
    - File-not-found / pypdf parse failure → exit 2 with stderr message
    - Empty PDF (no extractable text) → emits summary with chars=0,
      exit 0 (caller decides whether to skip)

Tested with pypdf 6.10.2.
"""

from __future__ import annotations

import json
import sys
import os
from pathlib import Path

# Force UTF-8 stdout so non-ASCII text from PDFs (em-dashes, unicode quotes,
# scientific notation) does not crash on Windows consoles defaulting to cp1252.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # pragma: no cover — old Python without reconfigure()
    pass

MAX_PAGES_DEFAULT = 5_000  # sentinel — nothing in PRISM corpus is bigger


def emit(obj: dict) -> None:
    """Write one JSON object per stdout line and flush."""
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        sys.stderr.write("usage: extract-pdf-text.py <pdfPath> [maxPages]\n")
        return 2
    pdf_path = Path(argv[1])
    max_pages = int(argv[2]) if len(argv) > 2 else MAX_PAGES_DEFAULT

    if not pdf_path.exists() or not pdf_path.is_file():
        sys.stderr.write(f"file not found: {pdf_path}\n")
        return 2

    try:
        from pypdf import PdfReader
    except ImportError as e:
        sys.stderr.write(f"pypdf not installed: {e}\n")
        return 2

    try:
        reader = PdfReader(str(pdf_path))
    except Exception as e:
        sys.stderr.write(f"pypdf open failed: {e}\n")
        return 2

    total_chars = 0
    page_count = 0
    pages_to_read = min(len(reader.pages), max_pages)
    for i in range(pages_to_read):
        page_count += 1
        try:
            text = reader.pages[i].extract_text() or ""
        except Exception as e:  # pragma: no cover — pypdf raises mostly on encrypted/odd PDFs
            sys.stderr.write(f"page {i+1} extract failed: {e}\n")
            text = ""
        emit({"page": i + 1, "text": text})
        total_chars += len(text)

    emit({
        "summary": {
            "pages": page_count,
            "chars": total_chars,
            "path": str(pdf_path),
            "size": pdf_path.stat().st_size,
        }
    })
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

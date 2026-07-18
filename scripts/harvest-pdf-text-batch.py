#!/usr/bin/env python3
# scripts/harvest-pdf-text-batch.py
#
# U-TDP07 corpus harvest helper (Python half).
#
# Walks a directory of PDFs, extracts first-page embedded text via PyMuPDF,
# emits one JSONL line per PDF: {path, char_count, text}. Pipes into the
# Node-side consumer that runs the U-TDP07 parser.
#
# USAGE:
#   python scripts/harvest-pdf-text-batch.py <root> [--max N] [--min-chars M]
#
# Tested at 76K-PDF scale: one Python process for the whole corpus is ~50x
# faster than spawn-per-PDF (avoids interpreter startup × N).

import sys
import os
import json
import argparse

import fitz  # PyMuPDF


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("root")
    ap.add_argument("--max", type=int, default=None)
    ap.add_argument("--min-chars", type=int, default=200,
                    help="Skip PDFs with fewer chars on page 1 (default 200).")
    args = ap.parse_args()

    # Force UTF-8 on stdout so engineering glyphs (Ø, °, ±, ✓) round-trip.
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    walked = 0
    emitted = 0
    skipped_thin = 0
    skipped_err = 0
    for d, _, fs in os.walk(args.root):
        for f in fs:
            if not f.lower().endswith(".pdf"):
                continue
            walked += 1
            if args.max is not None and emitted >= args.max:
                break
            path = os.path.join(d, f)
            try:
                doc = fitz.open(path)
                if len(doc) == 0:
                    skipped_thin += 1
                    doc.close()
                    continue
                # Use up to 3 pages; engineering drawings rarely exceed that.
                pages = min(3, len(doc))
                text = "\n".join(doc[i].get_text() for i in range(pages))
                doc.close()
                if len(text) < args.min_chars:
                    skipped_thin += 1
                    continue
                # JSONL line — one PDF per line, downstream Node consumer parses.
                sys.stdout.write(json.dumps({
                    "path": path.replace("\\", "/"),
                    "char_count": len(text),
                    "text": text,
                }) + "\n")
                emitted += 1
            except Exception as e:
                skipped_err += 1
                sys.stderr.write(f"err {path}: {e}\n")
        if args.max is not None and emitted >= args.max:
            break

    sys.stderr.write(json.dumps({
        "walked": walked, "emitted": emitted,
        "skipped_thin": skipped_thin, "skipped_err": skipped_err,
    }) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())

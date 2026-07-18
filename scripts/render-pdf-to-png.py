#!/usr/bin/env python3
# scripts/render-pdf-to-png.py
#
# U-TDP11 — PDF page -> base64 PNG render helper for the vision-OCR tier.
#
# The deterministic text extractor (pdf-text-extract-lib.mjs) reads a PDF's
# embedded text layer. The vision-OCR tier (pdf-vision-ocr-lib.mjs) instead
# needs a RASTER IMAGE of the page to feed a vision LLM. This helper renders
# one PDF page to PNG via PyMuPDF and emits it base64-encoded on stdout so a
# Node consumer can pass it straight to Ollama's /api/generate `images` field.
#
# USAGE:
#   python scripts/render-pdf-to-png.py <pdf_path> [--page N] [--dpi D] [--json]
#
#   --page N   0-indexed page to render (default 0)
#   --dpi D    render DPI (default 150 — legible for OCR, ~0.5 MB/page)
#   --json     emit {"ok":true,"base64":"...","width":W,"height":H,"bytes":N}
#              instead of the bare base64 string
#
# EXIT CODES:
#   0  rendered OK
#   2  PDF unreadable / page out of range / fitz error
#   3  bad arguments
#
# Run with the portable Python that has PyMuPDF:
#   H:/Tools/python/python.exe scripts/render-pdf-to-png.py <pdf>

import sys
import os
import json
import base64
import argparse

# DPI bounds — too low is illegible to the vision model, too high wastes
# memory / inference time on a memory-pressured host.
DPI_MIN = 50
DPI_MAX = 600
DEFAULT_DPI = 150


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf_path")
    ap.add_argument("--page", type=int, default=0)
    ap.add_argument("--dpi", type=int, default=DEFAULT_DPI)
    ap.add_argument("--json", action="store_true")
    try:
        args = ap.parse_args()
    except SystemExit:
        return 3

    if args.dpi < DPI_MIN or args.dpi > DPI_MAX:
        sys.stderr.write(
            f"err: --dpi must be {DPI_MIN}..{DPI_MAX} (got {args.dpi})\n"
        )
        return 3
    if args.page < 0:
        sys.stderr.write("err: --page must be >= 0\n")
        return 3
    if not os.path.isfile(args.pdf_path):
        sys.stderr.write(f"err: not a file: {args.pdf_path}\n")
        return 2

    try:
        import fitz  # PyMuPDF
    except ImportError:
        sys.stderr.write("err: PyMuPDF (fitz) not installed in this Python\n")
        return 2

    try:
        doc = fitz.open(args.pdf_path)
    except Exception as e:  # noqa: BLE001 - fail-soft on any fitz error
        sys.stderr.write(f"err: cannot open PDF: {e}\n")
        return 2

    try:
        if len(doc) == 0:
            sys.stderr.write("err: PDF has zero pages\n")
            return 2
        if args.page >= len(doc):
            sys.stderr.write(
                f"err: page {args.page} out of range (PDF has {len(doc)})\n"
            )
            return 2
        page = doc[args.page]
        pix = page.get_pixmap(dpi=args.dpi)
        png = pix.tobytes("png")
        width, height = pix.width, pix.height
    except Exception as e:  # noqa: BLE001
        sys.stderr.write(f"err: render failed: {e}\n")
        return 2
    finally:
        doc.close()

    b64 = base64.b64encode(png).decode("ascii")
    if args.json:
        sys.stdout.write(json.dumps({
            "ok": True,
            "base64": b64,
            "width": width,
            "height": height,
            "bytes": len(png),
            "page": args.page,
            "dpi": args.dpi,
        }))
    else:
        sys.stdout.write(b64)
    return 0


if __name__ == "__main__":
    sys.exit(main())

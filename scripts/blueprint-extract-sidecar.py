#!/usr/bin/env python
# scripts/blueprint-extract-sidecar.py
#
# U-TDP07 - Python sidecar for blueprint PDF extraction.
#
# Single-shot CLI invoked by node from blueprint-extract-io.mjs. PyMuPDF
# (fitz) handles BOTH:
#   - vector-text extraction with bounding boxes (page.get_text("words"))
#   - raster rendering of each page (page.get_pixmap) for VLM input
#
# Why a Python sidecar (and not node pdfjs+canvas):
#   - PyMuPDF is one library doing both jobs cleanly
#   - canvas needs Cairo; portable node on this fleet lacks it
#   - PRISM ships portable Python with PyMuPDF already (verified 1.27.2)
#
# Why one-shot (and not a long-running daemon):
#   - The U-TDP04 benchmark walks a finite GT corpus; a daemon would be over-
#     engineering. A daemon makes sense if/when the extractor becomes a
#     live service. Until then, fork+exec per file is fine on 76k prints
#     (PyMuPDF init is ~50ms).
#
# CONTRACT:
#   stdin:  JSON  {pdf_path: str, dpi?: int=180, max_pages?: int=8,
#                  skip_raster_when_vector?: bool=true}
#   stdout: JSON  {
#     ok: bool,
#     page_count: int,         # PDF's real count (NOT capped)
#     pages: [
#       {
#         page: int,           # 1-based
#         width_px: int,
#         height_px: int,
#         text_word_count: int,    # post-filter (after dropping non-str / empty)
#         is_vector_text: bool,    # text_word_count >= VECTOR_TEXT_FLOOR
#         tokens: [{text,x0,y0,x1,y1}, ...],  # always an array; populated only
#                                              # when is_vector_text is true
#         png_b64: str | null,     # null when not rendered (vector + skip
#                                  #   OR render-failed OR png-budget exhausted)
#         render_failed: bool,     # surfaces the silent-failure mode
#         render_failed_reason: str | null,
#         png_b64_chars: int,      # base64 string length; what transits stdio
#         png_raw_bytes: int,      # PNG-encoded image size pre-base64
#       }, ...
#     ],
#     stats: {
#       vector_pages,            # is_vector_text == true AND load succeeded
#       raster_pages,            # is_vector_text == false AND load succeeded
#       load_failed_pages,       # placeholder entries for load-failed pages
#       total_pages,             # == vector_pages + raster_pages + load_failed_pages
#       png_total_b64_chars,     # accumulator; governs MAX_TOTAL_PNG_B64_CHARS cap
#       png_total_raw_bytes,     # for caller-side disk/memory budgeting
#     },
#     warnings: [str, ...]
#   }
#
# DESIGN INVARIANTS:
#   - Fail-loud R12: PDF open / page_count / page-load / page-render failures
#     ALL surface either as ok:false (preflight) or as warnings[] +
#     render_failed:true on the page (per-page). NEVER silent.
#   - Bounded: caps pages (max_pages), DPI (max 300), per-page raster
#     (downscaled to MAX_LONGEST_PX), TOTAL base64 chars across all PNGs
#     (MAX_TOTAL_PNG_B64_CHARS) -- cap on what transits stdio, not raw bytes.
#   - No filesystem writes. Caller owns I/O sequencing.
#
# EXIT CODES:
#   0 - JSON written to stdout (ok may be true or false; CALLER MUST check ok)
#   2 - bad stdin / no PDF / fatal preflight failure (no JSON written)

import sys
import json
import base64

# ---- bounded knobs (no env reads; sidecar is invoked by trusted node parent) ----
VECTOR_TEXT_FLOOR     = 25                   # >=25 word tokens => vector page
MAX_PAGES_HARD        = 12                   # safety cap above caller's max_pages
DEFAULT_MAX_PAGES     = 8                    # matches docstring
MAX_DPI               = 300
MIN_DPI               = 72
MAX_LONGEST_PX        = 2400                 # per-page raster longest-edge cap
MAX_TOTAL_PNG_B64_CHARS = 80 * 1024 * 1024   # node stdio safety cap; counts
                                             # base64 chars (what transits
                                             # stdin/stdout), NOT raw bytes.
                                             # Caller must set maxBuffer to at
                                             # least this + JSON overhead
                                             # (~96 MB safe).
PDF_POINTS_PER_INCH   = 72                   # PDF physical constant
WORDS_TUPLE_MIN_LEN   = 5                    # get_text("words") returns 8-tuples
                                             # (x0,y0,x1,y1,text,block,line,word);
                                             # we only need index 0-4

# Top-level import (P2 from reviewer): avoids per-call re-import and surfaces a
# missing-fitz failure at preflight (exit 2) rather than mid-page rendering.
try:
    import fitz  # PyMuPDF
    _FITZ_IMPORT_ERR = None
except Exception as e:  # noqa: BLE001
    fitz = None
    _FITZ_IMPORT_ERR = str(e)


def _empty_stats():
    """Stats dict for preflight-failure paths (ok:false). Keep keys identical
    to the success-path stats so consumers can read either uniformly."""
    return {
        "vector_pages": 0,
        "raster_pages": 0,
        "load_failed_pages": 0,
        "total_pages": 0,
        "png_total_b64_chars": 0,
        "png_total_raw_bytes": 0,
    }


def _err_exit(reason):
    """Bad-input path: fail before opening anything. Exit 2, NO stdout JSON."""
    sys.stderr.write("[sidecar] " + str(reason) + "\n")
    sys.exit(2)


def _safe_int(v, default):
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def _clamp(n, lo, hi):
    if n < lo:
        return lo
    if n > hi:
        return hi
    return n


def _extract_tokens(page):
    """Return (tokens, is_vector_text). PyMuPDF's get_text('words') returns
    8-tuples (x0,y0,x1,y1, word, block_no, line_no, word_no)."""
    try:
        words = page.get_text("words") or []
    except Exception:  # noqa: BLE001
        return [], False
    tokens = []
    for w in words:
        if not w or len(w) < WORDS_TUPLE_MIN_LEN:
            continue
        text = w[4]
        if not isinstance(text, str) or not text:
            continue
        tokens.append({
            "text": text,
            "x0": float(w[0]),
            "y0": float(w[1]),
            "x1": float(w[2]),
            "y1": float(w[3]),
        })
    return tokens, len(tokens) >= VECTOR_TEXT_FLOOR


def _render_page_png_b64(page, dpi):
    """Render page to base64-PNG; downscale longest-edge to <= MAX_LONGEST_PX.

    Returns (b64_or_None, width_px, height_px, reason_or_None, raw_bytes).
    On success: (str, int, int, None, int)
    On failure: (None, 0, 0, "<exception class>: <message>", 0)  -- the caller
                surfaces the SPECIFIC error class into warnings[] (P0 from
                reviewer-B: don't swallow the exception class).

    Two byte-counts surface up the stack:
      - b64 string length (= len(returned_b64))  -- what transits stdio
      - raw_bytes (returned here) -- size of the PNG before base64
    Caller stores both so consumers can pick the right one for their budget.
    """
    try:
        pix = page.get_pixmap(dpi=dpi, alpha=False)
        longest = max(pix.width, pix.height)
        if longest > MAX_LONGEST_PX:
            scale = MAX_LONGEST_PX / float(longest)
            # Re-render at lower zoom rather than post-resize (cleaner output).
            zoom = (dpi / float(PDF_POINTS_PER_INCH)) * scale
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat, alpha=False)
        png_bytes = pix.tobytes("png")
        return (
            base64.b64encode(png_bytes).decode("ascii"),
            int(pix.width),
            int(pix.height),
            None,
            int(len(png_bytes)),
        )
    except Exception as e:  # noqa: BLE001
        return (None, 0, 0, type(e).__name__ + ": " + str(e), 0)


def main():
    # Preflight: PyMuPDF import. Fail loud (exit 2) — no point continuing.
    if fitz is None:
        _err_exit("PyMuPDF import failed: " + str(_FITZ_IMPORT_ERR))

    raw = sys.stdin.read()
    if not raw or not raw.strip():
        _err_exit("empty stdin")
    try:
        req = json.loads(raw)
    except Exception as e:  # noqa: BLE001
        _err_exit("stdin not JSON: " + str(e))
    if not isinstance(req, dict):
        _err_exit("stdin not a JSON object")

    pdf_path = req.get("pdf_path")
    if not isinstance(pdf_path, str) or not pdf_path:
        _err_exit("missing pdf_path")

    dpi = _clamp(_safe_int(req.get("dpi"), 180), MIN_DPI, MAX_DPI)
    caller_max = _safe_int(req.get("max_pages"), DEFAULT_MAX_PAGES)
    max_pages = _clamp(caller_max, 1, MAX_PAGES_HARD)
    skip_raster_when_vector = bool(req.get("skip_raster_when_vector", True))

    warnings = []
    if caller_max > MAX_PAGES_HARD:
        warnings.append(
            "caller-max-clamped: " + str(caller_max) + " -> " + str(MAX_PAGES_HARD)
        )

    # PDF open — corrupt-PDF path emits ok:false JSON (NOT a raised exception).
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:  # noqa: BLE001
        out = {
            "ok": False,
            "page_count": 0,
            "pages": [],
            "stats": _empty_stats(),
            "warnings": ["pdf-open-failed: " + type(e).__name__ + ": " + str(e)],
        }
        sys.stdout.write(json.dumps(out))
        return

    # Encrypted-PDF guard (P1-3 reviewer-B): fitz.open succeeds on encrypted
    # PDFs but page_load throws. Refuse early with ok:false.
    try:
        if getattr(doc, "needs_pass", False):
            doc.close()
            out = {
                "ok": False,
                "page_count": 0,
                "pages": [],
                "stats": _empty_stats(),
                "warnings": ["pdf-encrypted: " + pdf_path],
            }
            sys.stdout.write(json.dumps(out))
            return
    except Exception:  # noqa: BLE001
        pass  # needs_pass introspection failure is non-fatal

    # page_count access guard (P1-2 reviewer-B): can throw on broken indices.
    try:
        page_count_actual = int(doc.page_count)
    except Exception as e:  # noqa: BLE001
        try:
            doc.close()
        except Exception:  # noqa: BLE001
            pass
        out = {
            "ok": False,
            "page_count": 0,
            "pages": [],
            "stats": _empty_stats(),
            "warnings": [
                "page-count-failed: " + type(e).__name__ + ": " + str(e)
            ],
        }
        sys.stdout.write(json.dumps(out))
        return

    if page_count_actual == 0:
        warnings.append("pdf-has-zero-pages: " + pdf_path)

    pages_out = []
    vector_pages = 0
    raster_pages = 0
    load_failed_pages = 0
    png_total_b64_chars = 0
    png_total_raw_bytes = 0
    n_to_walk = min(page_count_actual, max_pages)

    if page_count_actual > max_pages:
        warnings.append(
            "page-cap-applied: " + str(page_count_actual)
            + " pages, walking " + str(max_pages)
        )

    for i in range(n_to_walk):
        try:
            page = doc.load_page(i)
        except Exception as e:  # noqa: BLE001
            warnings.append(
                "page-" + str(i + 1) + "-load-failed: "
                + type(e).__name__ + ": " + str(e)
            )
            # Emit a placeholder entry so the caller's per-page indexing
            # matches PDF page numbers, not just successfully-loaded ones.
            # Counted in load_failed_pages so total_pages = vector + raster +
            # load_failed (conservation invariant the test suite pins).
            load_failed_pages += 1
            pages_out.append({
                "page": i + 1,
                "width_px": 0, "height_px": 0,
                "text_word_count": 0,
                "is_vector_text": False,
                "tokens": [],
                "png_b64": None,
                "render_failed": True,
                "render_failed_reason": "load-failed: " + type(e).__name__,
                "png_b64_chars": 0,
                "png_raw_bytes": 0,
            })
            continue

        tokens, is_vector = _extract_tokens(page)
        png_b64 = None
        w_px = 0
        h_px = 0
        render_failed = False
        render_reason = None
        b64_chars_this = 0
        raw_bytes_this = 0

        will_raster = not (is_vector and skip_raster_when_vector)
        if will_raster:
            if png_total_b64_chars >= MAX_TOTAL_PNG_B64_CHARS:
                # Budget exhausted: emit page without PNG, explicit warning.
                warnings.append(
                    "png-budget-exhausted-at-page-" + str(i + 1)
                    + " (cap=" + str(MAX_TOTAL_PNG_B64_CHARS) + " b64-chars)"
                )
                render_failed = True
                render_reason = "png-budget-exhausted"
            else:
                png_b64, w_px, h_px, render_reason, raw_bytes_this = (
                    _render_page_png_b64(page, dpi)
                )
                if png_b64 is None:
                    render_failed = True
                    warnings.append(
                        "page-" + str(i + 1) + "-render-failed: "
                        + (render_reason or "unknown")
                    )
                else:
                    b64_chars_this = len(png_b64)
                    png_total_b64_chars += b64_chars_this
                    png_total_raw_bytes += raw_bytes_this

        if is_vector:
            vector_pages += 1
        else:
            raster_pages += 1

        pages_out.append({
            "page": i + 1,
            "width_px": int(w_px),
            "height_px": int(h_px),
            "text_word_count": len(tokens),
            "is_vector_text": is_vector,
            "tokens": tokens if is_vector else [],
            "png_b64": png_b64,
            "render_failed": render_failed,
            "render_failed_reason": render_reason if render_failed else None,
            "png_b64_chars": int(b64_chars_this),
            "png_raw_bytes": int(raw_bytes_this),
        })

    try:
        doc.close()
    except Exception:  # noqa: BLE001
        pass

    out = {
        "ok": True,
        "page_count": page_count_actual,
        "pages": pages_out,
        "stats": {
            "vector_pages": vector_pages,
            "raster_pages": raster_pages,
            "load_failed_pages": load_failed_pages,
            "total_pages": len(pages_out),
            "png_total_b64_chars": png_total_b64_chars,
            "png_total_raw_bytes": png_total_raw_bytes,
        },
        "warnings": warnings,
    }
    sys.stdout.write(json.dumps(out))


if __name__ == "__main__":
    main()

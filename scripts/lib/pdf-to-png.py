#!/usr/bin/env python3
# scripts/lib/pdf-to-png.py
#
# U-TDP06 / U-PSGB-XRAY-MULTIPAGE helper — render ONE page of a PDF to PNG via
# PyMuPDF. The Ollama vision extractor CLI calls this once per page so a
# multi-print container PDF yields one extraction object per print (doctrine:
# split before OCR — the runner formerly rendered page 0 ONLY, silently dropping
# ~76% of all corpus pages).
#
# USAGE:
#   python3 pdf-to-png.py <pdf_path> <png_out_path> [--dpi 300] [--page 0]
#   python3 pdf-to-png.py <pdf_path> --count            # print page count, exit 0
#
# EXIT CODES:
#   0 - success (PNG written, or count printed)
#   2 - PDF unreadable / page out of range
#   3 - args / unexpected error

import sys
import argparse
import os

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERR: PyMuPDF (fitz) not installed", file=sys.stderr)
    sys.exit(3)


def preprocess_scan(png_path, do_deskew):
    """Clean a scanned grayscale PNG IN PLACE: Otsu binarize + connected-component
    despeckle (thin-line-safe) (+ optional conservative small-angle deskew). R12: if cv2/numpy are absent
    the file is LEFT as the already-saved grayscale image and a loud
    'degraded-grayscale' status is returned — NEVER a silent skip.

    Returns a human-readable status string (never raises).
    """
    try:
        import cv2
        import numpy as np
    except Exception as e:  # ImportError or a broken partial install
        return f"degraded-grayscale (cv2/numpy unavailable: {type(e).__name__})"
    try:
        img = cv2.imread(png_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return "degraded-grayscale (cv2.imread returned None)"
        deskew_note = ""
        if do_deskew:
            try:
                inv = cv2.bitwise_not(img)
                _, th = cv2.threshold(inv, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                coords = np.column_stack(np.where(th > 0))
                if coords.shape[0] > 100:
                    angle = cv2.minAreaRect(coords)[-1]
                    if angle < -45:
                        angle = 90 + angle
                    # CONSERVATIVE: only correct genuine small page skew. A large
                    # angle on an engineering drawing is dominant part geometry, not
                    # page skew — rotating to it would WORSEN the image.
                    if 0.1 < abs(angle) <= 10.0:
                        h, w = img.shape
                        M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
                        img = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
                        deskew_note = f"+deskew({angle:.1f}deg)"
                    else:
                        deskew_note = f"+deskew(skipped angle={angle:.1f})"
            except Exception as e:
                deskew_note = f"+deskew(failed: {type(e).__name__})"  # best-effort; binarize still proceeds
        # Otsu binarize — separates ink from scan-background gradient.
        _, binimg = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        # Speckle removal that PRESERVES thin lines: drop only isolated tiny ink
        # blobs (<=2px) via connected components. A thin dimension/leader/witness
        # line is a LARGE connected component → kept; a scanner speck is tiny →
        # dropped. (A pre-binarize medianBlur(3) would have erased genuine 1px
        # lines at 300dpi — reviewer-flagged; this is the line-safe form.)
        despeckle_note = ""
        try:
            inv = cv2.bitwise_not(binimg)  # ink → white foreground for CC labelling
            nlab, labels, stats, _ = cv2.connectedComponentsWithStats(inv, connectivity=8)
            keep = np.zeros_like(inv)
            for lab in range(1, nlab):
                if stats[lab, cv2.CC_STAT_AREA] > 2:
                    keep[labels == lab] = 255
            binimg = cv2.bitwise_not(keep)
            despeckle_note = "+despeckle"
        except Exception:
            despeckle_note = ""  # binarize result stands if despeckle fails (best-effort)
        # R12: imwrite returns False (not raise) on many write failures — check it,
        # else we'd report success while the on-disk PNG is the un-binarized base.
        if not cv2.imwrite(png_path, binimg):
            return "degraded-grayscale (cv2.imwrite returned False)"
        return f"preprocessed (binarize{despeckle_note}{deskew_note})"
    except Exception as e:
        return f"degraded-grayscale (preprocess error: {type(e).__name__}: {e})"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("pdf_path")
    p.add_argument("png_out_path", nargs="?", default=None)
    p.add_argument("--dpi", type=int, default=300)
    p.add_argument("--page", type=int, default=0)
    p.add_argument("--count", action="store_true", help="print page count and exit (no render)")
    p.add_argument("--grayscale", action="store_true", help="render single-channel grayscale (fitz.csGRAY) — pure PyMuPDF, removes color-channel noise for the VLM encoder")
    p.add_argument("--preprocess", action="store_true", help="scan cleanup: grayscale base + opencv Otsu binarize + connected-component despeckle (thin-line-safe). Degrades to grayscale-only (loud) if cv2/numpy absent")
    p.add_argument("--deskew", action="store_true", help="(with --preprocess) conservative small-angle deskew (<=10deg) of scanned text; skipped on large angles (likely geometry, not page skew)")
    args = p.parse_args()

    if not os.path.exists(args.pdf_path):
        print(f"ERR: pdf not found: {args.pdf_path}", file=sys.stderr)
        sys.exit(2)

    try:
        doc = fitz.open(args.pdf_path)
    except Exception as e:
        print(f"ERR: failed to open pdf: {e}", file=sys.stderr)
        sys.exit(2)

    # --count mode: print the page count and exit (the runner uses this to loop pages).
    if args.count:
        n = len(doc)
        doc.close()
        print(n)
        sys.exit(0)

    if args.png_out_path is None:
        print("ERR: png_out_path required unless --count", file=sys.stderr)
        doc.close()
        sys.exit(3)

    if args.page >= len(doc):
        print(f"ERR: page {args.page} out of range (doc has {len(doc)} pages)", file=sys.stderr)
        doc.close()
        sys.exit(2)

    try:
        page = doc[args.page]
        zoom = args.dpi / 72.0  # PDF base DPI is 72
        mat = fitz.Matrix(zoom, zoom)
        # Grayscale base for --grayscale OR --preprocess (single-channel removes
        # color-channel noise from the VLM's fixed-resize ViT encoder).
        if args.grayscale or args.preprocess:
            pix = page.get_pixmap(matrix=mat, colorspace=fitz.csGRAY)
        else:
            pix = page.get_pixmap(matrix=mat)

        # Ensure output dir exists
        out_dir = os.path.dirname(args.png_out_path)
        if out_dir and not os.path.exists(out_dir):
            os.makedirs(out_dir, exist_ok=True)

        pix.save(args.png_out_path)
        doc.close()

        mode = "rgb"
        if args.preprocess:
            status = preprocess_scan(args.png_out_path, args.deskew)
            mode = status
        elif args.grayscale:
            mode = "grayscale"
        print(f"OK: {args.png_out_path} ({pix.width}x{pix.height} @{args.dpi}dpi) [{mode}]")
        sys.exit(0)
    except Exception as e:
        print(f"ERR: render failed: {e}", file=sys.stderr)
        try:
            doc.close()
        except Exception:
            pass
        sys.exit(3)


if __name__ == "__main__":
    main()

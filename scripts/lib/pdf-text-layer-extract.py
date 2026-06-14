#!/usr/bin/env python
"""
pdf-text-layer-extract.py

U-QP-DOCUSTRATA-RUN-ALL (slot:charlie, 2026-06-12) -- the CHEAP route of the
run-all-documents pipeline.

A born-digital PDF (most modern quotes / sales orders / invoices) carries a real
text layer. pypdf reads it in milliseconds with NO GPU -- so we never spend the
~49s/page vision model on a document we can read for free. Only true scans fall
through to the vision-OCR route.

General + slot-agnostic by design (the existing lima corpus extractor is coupled
to jm-die-corpus-queue.json + a tribal-emit shape + a pinned worktree -- not
reusable here). This one only does: worklist of PDF paths -> {path,text,ok} JSONL.

USAGE:
  python pdf-text-layer-extract.py --worklist <paths.txt> [--out <file.jsonl>] [--min-chars 200]

  --worklist : file with one PDF path per line ('#' comments + blanks skipped)
  --out      : append JSONL here (default: stdout)
  --min-chars: a doc whose extracted text is shorter than this is emitted ok=false
               (its text layer is effectively empty -> the orchestrator routes it
               to vision OCR instead). Default 200.

OUTPUT: one JSON line per input path:
  {"path": "...", "ok": true,  "text": "...", "chars": 1234, "pages": 3}
  {"path": "...", "ok": false, "reason": "no-text-layer", "chars": 12, "pages": 2}
  {"path": "...", "ok": false, "reason": "read-error: ...", "chars": 0, "pages": 0}

EXIT: 0 always (per-file failures are data, not a process failure -- R12 fail-loud
      surfaces them in the JSONL, never crashes the batch).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    import pypdf  # type: ignore
except ImportError:
    print("FAIL: pypdf not installed. Run: H:/Tools/python/python.exe -m pip install pypdf", file=sys.stderr)
    sys.exit(1)


def parse_worklist(text: str) -> list[str]:
    """One path per line; skip blanks and '#' comments; de-dup, order-preserving."""
    seen: set[str] = set()
    out: list[str] = []
    for line in text.splitlines():
        p = line.strip()
        if not p or p.startswith("#"):
            continue
        if p in seen:
            continue
        seen.add(p)
        out.append(p)
    return out


def extract_one(path: str, min_chars: int) -> dict:
    """Extract the full text layer of a PDF. Never raises -- failures become data."""
    try:
        reader = pypdf.PdfReader(path)
        parts: list[str] = []
        for page in reader.pages:
            try:
                parts.append(page.extract_text() or "")
            except Exception as e:  # one bad page must not kill the doc
                parts.append(f"[page-error: {e}]")
        text = "\n".join(parts).strip()
        chars = len(text)
        pages = len(reader.pages)
        if chars < min_chars:
            return {"path": path, "ok": False, "reason": "no-text-layer", "chars": chars, "pages": pages}
        return {"path": path, "ok": True, "text": text, "chars": chars, "pages": pages}
    except Exception as e:
        return {"path": path, "ok": False, "reason": f"read-error: {e}", "chars": 0, "pages": 0}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--worklist", required=True)
    ap.add_argument("--out", default=None)
    ap.add_argument("--min-chars", type=int, default=200)
    args = ap.parse_args()

    wl_path = Path(args.worklist)
    if not wl_path.exists():
        print(f"FAIL: worklist not found: {wl_path}", file=sys.stderr)
        return 2
    paths = parse_worklist(wl_path.read_text(encoding="utf-8", errors="replace"))

    out_fh = open(args.out, "a", encoding="utf-8") if args.out else sys.stdout
    ok_count = 0
    try:
        for p in paths:
            rec = extract_one(p, args.min_chars)
            if rec.get("ok"):
                ok_count += 1
            out_fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
            out_fh.flush()
    finally:
        if args.out:
            out_fh.close()

    print(f"[pdf-text-layer] {ok_count}/{len(paths)} had a usable text layer", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())

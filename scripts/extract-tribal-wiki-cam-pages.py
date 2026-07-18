#!/usr/bin/env python
"""extract-tribal-wiki-cam-pages.py — pypdf-based per-page extractor on
the H:/PRISM/JM DIE/TRIBAL + WIKI corpus, filtered to CAM + CAD-software
PDFs. Mirrors lima's NOTABLE_CONFIG scoring (cutting params + formulas
+ safety regex hits + heading-penalty) so the output is compatible with
lima's pages.jsonl downstream consumers.

Per /goal 2026-05-26 (kilo /loop): "use lima's method for pdf extraction
on H:\\PRISM\\JM DIE\\TRIBAL + WIKI pdfs pertaining to cad cam software".

Output: state/shared/cam-tribal-pages-from-tribal-wiki.jsonl
        (one row per notable page, schema mirrors lima's emit)

Kilo soul: provenance per row (sourcePdf + pageNumber + extractedAt);
no claim without citation. Idempotent on relPath+pageIndex via seen-set.

Usage:
  python extract-tribal-wiki-cam-pages.py             # default — all CAM+CAD TW PDFs
  python extract-tribal-wiki-cam-pages.py --limit 10  # cap for sample run
  python extract-tribal-wiki-cam-pages.py --notable-floor 0.4  # higher cutoff
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

try:
    import pypdf  # type: ignore
except ImportError:
    print("FAIL: pypdf not installed", file=sys.stderr)
    sys.exit(1)

MANIFEST_PATH = Path(
    "H:/prism/mcp-server/data/state/cad-cam-resources-pdf-index.json"
)
JM_DIE_ROOT = Path("H:/PRISM/JM DIE")
OUT_PATH = Path(
    "H:/prism-slot-kilo/state/shared/cam-tribal-pages-from-tribal-wiki.jsonl"
)

CAM_OR_CAD_DOMAINS = {"cam", "cad"}
NOTABLE_FLOOR_DEFAULT = 0.35
PER_PDF_PAGE_TIMEOUT_S = 60

# --- Lima's NOTABLE_CONFIG (verbatim regexes) ---
CUTTING_PARAM_RE = re.compile(
    r"\b(\d+[\.,]?\d*)\s*(rpm|sfm|ipm|ipr|ipt|sfpm|mm/min|m/min|mm/rev|"
    r"mm/tooth|mm\b|in\b|inch|degree)",
    re.IGNORECASE,
)
FORMULA_RE = re.compile(r"\b[A-Za-z][A-Za-z0-9_]*\s*=\s*[^=\n]{2,80}")
SAFETY_RE = re.compile(
    r"\b(warning|caution|danger|safety|never|always|must|emergency|hazard|injury)\b",
    re.IGNORECASE,
)
HEADING_RE = re.compile(r"^[A-Z][A-Z0-9 \-\&]+$", re.MULTILINE)


def notability_score(text: str) -> tuple[float, dict]:
    if not text or len(text) < 50:
        return 0.1, {"too_short": True}
    params = len(CUTTING_PARAM_RE.findall(text))
    formulas = len(FORMULA_RE.findall(text))
    safety = len(SAFETY_RE.findall(text))
    headings = len(HEADING_RE.findall(text))
    length = len(text)
    score = 0.3
    if length > 500:
        score += 0.1
    if length > 2000:
        score += 0.1
    score += min(0.2, params * 0.04)
    score += min(0.15, formulas * 0.02)
    score += min(0.10, safety * 0.02)
    if length > 0 and headings / max(1, length / 100) > 0.3:
        score -= 0.15
    score = max(0.0, min(1.0, score))
    return score, {
        "params": params,
        "formulas": formulas,
        "safety": safety,
        "headings": headings,
        "length": length,
    }


def extract_pdf_pages(pdf_path: Path) -> list[dict]:
    """Per-page text extraction; mirrors lima's failure-mode contract."""
    if not str(pdf_path).lower().endswith(".pdf"):
        return [{"error": "not_a_pdf", "page_index": 0}]
    try:
        reader = pypdf.PdfReader(str(pdf_path))
    except Exception as e:
        return [{"error": f"open_failed:{type(e).__name__}:{e}", "page_index": 0}]
    if reader.is_encrypted:
        return [{"error": "encrypted_pdf", "page_index": 0}]
    try:
        page_count = len(reader.pages)
    except Exception as e:
        return [{"error": f"page_count_failed:{type(e).__name__}:{e}", "page_index": 0}]
    pages: list[dict] = []
    deadline = time.time() + PER_PDF_PAGE_TIMEOUT_S
    for idx in range(page_count):
        if time.time() > deadline:
            pages.append({"error": "per_pdf_timeout", "page_index": idx})
            break
        try:
            txt = reader.pages[idx].extract_text() or ""
        except Exception as e:
            pages.append(
                {"error": f"page_extract_failed:{type(e).__name__}", "page_index": idx}
            )
            continue
        pages.append({"page_index": idx, "text": txt})
    return pages


def load_seen(out_path: Path) -> set[str]:
    seen: set[str] = set()
    if not out_path.exists():
        return seen
    with out_path.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                key = f"{obj.get('relPath')}#{obj.get('pageNumber')}"
                seen.add(key)
            except Exception:
                pass
    return seen


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--notable-floor", type=float, default=NOTABLE_FLOOR_DEFAULT)
    args = ap.parse_args()

    if not MANIFEST_PATH.exists():
        print("FAIL: manifest missing — run build-cad-cam-resources-pdf-index.mjs first")
        sys.exit(1)
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

    # Filter to TRIBAL+WIKI entries in CAM or CAD domains.
    queue = [
        e
        for e in manifest.get("entries", [])
        if str(e.get("relPath", "")).startswith("TRIBAL + WIKI/")
        and e.get("domain") in CAM_OR_CAD_DOMAINS
    ]
    queue.sort(key=lambda e: e.get("sizeBytes", 0))  # ease-first by size
    if args.limit > 0:
        queue = queue[: args.limit]

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    seen = load_seen(OUT_PATH)

    stats = {
        "pdfs_attempted": 0,
        "pdfs_extracted": 0,
        "pdfs_failed": 0,
        "notable_pages": 0,
        "skipped_pages": 0,
        "skipped_already_seen": 0,
    }
    started = time.time()
    with OUT_PATH.open("a", encoding="utf-8") as out_fh:
        for entry in queue:
            stats["pdfs_attempted"] += 1
            rel_path = entry["relPath"]
            abs_path = JM_DIE_ROOT / rel_path
            pages = extract_pdf_pages(abs_path)
            if pages and pages[0].get("error"):
                stats["pdfs_failed"] += 1
                continue
            stats["pdfs_extracted"] += 1
            for p in pages:
                if p.get("error"):
                    continue
                key = f"{rel_path}#{p['page_index']}"
                if key in seen:
                    stats["skipped_already_seen"] += 1
                    continue
                text = p.get("text") or ""
                score, diag = notability_score(text)
                if score < args.notable_floor:
                    stats["skipped_pages"] += 1
                    continue
                row = {
                    "schemaVersion": "1.0.0",
                    "source": "tribal-wiki-pypdf",
                    "relPath": rel_path,
                    "domain": entry["domain"],
                    "software": entry["software"],
                    "pageNumber": p["page_index"] + 1,
                    "textChars": len(text),
                    "notabilityScore": round(score, 3),
                    "notabilityDiag": diag,
                    "text": text,
                    "extractedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }
                out_fh.write(json.dumps(row, ensure_ascii=False) + "\n")
                seen.add(key)
                stats["notable_pages"] += 1
    stats["elapsedSec"] = round(time.time() - started, 2)
    print(json.dumps({"ok": True, "out": str(OUT_PATH), **stats}))


if __name__ == "__main__":
    main()

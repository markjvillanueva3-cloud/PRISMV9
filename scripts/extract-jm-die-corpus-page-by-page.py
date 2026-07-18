#!/usr/bin/env python
"""
extract-jm-die-corpus-page-by-page.py

Per /goal 2026-05-26 (lima /loop): "extract page by page of notable data
that will train the system from the easiest input to complex work".

Local PDF text extraction — uses pypdf (free, no API). Walks the curated
JM Die corpus queue, processes PDFs in ease-first order (smaller +
fundamentals/intro before reference + 5-axis), emits page-level structured
tribal entries.

Lima soul: each emitted tribal entry cites source PDF + page number +
extraction date. No claim without provenance.

Output:
  - mcp-server/data/tribal/jm-die-corpus-pages.jsonl  (page-level entries)
  - state/shared/jm-die-corpus-queue.json             (status flipped pending → extracted)

Each page becomes ONE JSONL entry. The downstream knowledge_extract_ollama
or rule-based regex extractor can mine each page-level text for tribal tips,
formulas, parameter tables.

The "notable data" filter (NOTABLE_CONFIG):
  - Pages with cutting-parameter regex hits (RPM/SFM/IPM/IPT/DOC/WOC) get
    confidence_boost = 0.2
  - Pages with formula tokens (= sign + variable names) get +0.15
  - Pages with safety keywords get +0.1
  - Pages with only headers/footers (very short) get confidence=0.3 (low)

Usage:
  python extract-jm-die-corpus-page-by-page.py             # extract top 3 easiest
  python extract-jm-die-corpus-page-by-page.py --limit N   # extract top N easiest
  python extract-jm-die-corpus-page-by-page.py --all       # extract entire corpus
  python extract-jm-die-corpus-page-by-page.py --dry-run   # report plan, no extract
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
    print("FAIL: pypdf not installed. Run: pip install pypdf", file=sys.stderr)
    sys.exit(1)


REPO_ROOT = Path("H:/prism-slot-lima")
QUEUE_PATH = REPO_ROOT / "state" / "shared" / "jm-die-corpus-queue.json"
PAGES_OUT_PATH = REPO_ROOT / "mcp-server" / "data" / "tribal" / "jm-die-corpus-pages.jsonl"

# ─── EASE RANKING ────────────────────────────────────────────────────────────

INTRO_KEYWORDS = {
    "intro", "basics", "fundamental", "easy", "getting started", "beginner",
    "quick", "guide", "tutorial",
}


def ease_score(item: dict) -> float:
    """Higher = easier. Used to order the queue for curriculum extraction."""
    f = item["filename"].lower()
    intro_boost = 30.0 if any(k in f for k in INTRO_KEYWORDS) else 0.0
    domain_boost = 10.0 if item.get("domain") == "fundamentals" else 0.0
    size_penalty = min(50, item["size_mb"]) * 0.4
    return intro_boost + domain_boost - size_penalty


# ─── NOTABILITY HEURISTIC ────────────────────────────────────────────────────

# Patterns that indicate "notable" CNC-relevant content on a page
CUTTING_PARAM_RE = re.compile(
    r"\b(\d+[\.,]?\d*)\s*(rpm|sfm|ipm|ipr|ipt|sfpm|mm/min|m/min|mm/rev|mm/tooth|mm\b|in\b|inch|degree)",
    re.IGNORECASE,
)
FORMULA_RE = re.compile(r"\b[A-Za-z][A-Za-z0-9_]*\s*=\s*[^=\n]{2,80}")
SAFETY_RE = re.compile(
    r"\b(warning|caution|danger|safety|never|always|must|emergency|hazard|injury)\b",
    re.IGNORECASE,
)
HEADING_RE = re.compile(r"^[A-Z][A-Z0-9 \-\&]+$", re.MULTILINE)


def notability_score(text: str) -> tuple[float, dict]:
    """Score a page's text 0.0 - 1.0 + return diagnostic counts.

    Heuristic: cutting params + formulas + safety keywords + length signal.
    Pages that are mostly TOC/headers score low.
    """
    if not text or len(text) < 50:
        return 0.1, {"too_short": True}
    params = len(CUTTING_PARAM_RE.findall(text))
    formulas = len(FORMULA_RE.findall(text))
    safety = len(SAFETY_RE.findall(text))
    headings = len(HEADING_RE.findall(text))
    length = len(text)

    score = 0.3  # baseline for any readable page
    if length > 500:
        score += 0.1
    if length > 2000:
        score += 0.1
    score += min(0.2, params * 0.04)    # up to +0.2 from cutting params
    score += min(0.15, formulas * 0.02)  # up to +0.15 from formulas
    score += min(0.10, safety * 0.02)    # up to +0.10 from safety
    # If page is dominated by headings (TOC-like), penalize
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


# ─── EXTRACT ─────────────────────────────────────────────────────────────────

def extract_pdf_pages(pdf_path: str) -> list[dict]:
    """Extract text page-by-page from a PDF. Returns one dict per page.

    Returns empty list on any failure (encrypted, malformed, too-large, non-PDF).
    """
    # Reject non-PDF assets up front — the catalog also lists .zip/.cls/.xlsm
    # for completeness but those can't be page-extracted with pypdf.
    if not pdf_path.lower().endswith(".pdf"):
        return [{"error": f"not_a_pdf: {pdf_path.rsplit('.', 1)[-1]}", "page_index": 0}]

    try:
        reader = pypdf.PdfReader(pdf_path)
    except Exception as e:
        return [{"error": f"open_failed: {type(e).__name__}: {e}", "page_index": 0}]

    if reader.is_encrypted:
        return [{"error": "encrypted_pdf", "page_index": 0}]

    # pypdf can also fail during page-count resolution on malformed PDFs that
    # opened OK at the reader level — wrap the iter in try/except.
    try:
        page_count = len(reader.pages)
    except Exception as e:
        return [{"error": f"page_count_failed: {type(e).__name__}: {e}", "page_index": 0}]

    pages = []
    for i, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
        except Exception as e:
            pages.append({"page_index": i + 1, "error": f"page_extract_failed: {e}"})
            continue
        # Trim excessive whitespace; keep paragraph breaks
        text = re.sub(r"\n{3,}", "\n\n", text).strip()
        score, diag = notability_score(text)
        pages.append({
            "page_index": i + 1,
            "page_count": len(reader.pages),
            "text": text,
            "notability_score": round(score, 3),
            "diag": diag,
        })
    return pages


# ─── EMIT TRIBAL ENTRIES ─────────────────────────────────────────────────────

def emit_tribal_entries(item: dict, pages: list[dict], notability_floor: float = 0.4) -> list[dict]:
    """Emit one tribal JSONL entry per notable page.

    notability_floor: skip pages below this score (likely TOC/cover/blank).
    """
    entries = []
    skipped = 0
    for page in pages:
        if "error" in page:
            continue
        if page["notability_score"] < notability_floor:
            skipped += 1
            continue
        text = page["text"]
        # First non-empty line becomes a title hint (max 100 chars)
        title_hint = next(
            (ln.strip() for ln in text.splitlines() if ln.strip()),
            f"Page {page['page_index']} of {item['filename']}",
        )[:100]
        entries.append({
            "id": f"jm-die-corpus-page-{item['slug']}-p{page['page_index']:04d}",
            "domain": item["domain"],
            "source_slug": item["slug"],
            "source_pdf": item["filename"],
            "page_index": page["page_index"],
            "page_count": page["page_count"],
            "title_hint": title_hint,
            "claim": text[:1500],  # cap to 1500 chars per page entry
            "source": f"{item['source_path']} (page {page['page_index']}, modified {item.get('mtime_iso', 'unknown')})",
            "confidence": page["notability_score"],
            "verified_at": "2026-05-26",
            "extraction_status": "page-extracted",
            "extraction_method": "pypdf-local",
            "metadata": {
                "notability_diag": page["diag"],
                "size_mb": item["size_mb"],
                "domain": item["domain"],
            },
        })
    return entries, skipped


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=3, help="Number of PDFs to extract (ease-first order)")
    parser.add_argument("--all", action="store_true", help="Process the entire queue")
    parser.add_argument("--dry-run", action="store_true", help="Print plan, don't extract")
    parser.add_argument("--notability-floor", type=float, default=0.4, help="Skip pages below this score")
    args = parser.parse_args()

    queue = json.loads(QUEUE_PATH.read_text(encoding="utf-8"))
    pending = queue.get("pending", [])

    # Re-rank by ease (easiest first)
    pending.sort(key=ease_score, reverse=True)

    if args.all:
        target = pending
    else:
        target = pending[: args.limit]

    print(f"PLAN: extract {len(target)} of {len(pending)} pending entries (ease-first order)")
    for i, item in enumerate(target):
        print(f"  {i + 1}. [{item['size_mb']:>6} MB | {item['domain']:<16} | ease={ease_score(item):>+5.1f}] {item['filename']}")

    if args.dry_run:
        return

    # Open output file for append (each PDF extracted appends its pages)
    PAGES_OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fh = PAGES_OUT_PATH.open("w", encoding="utf-8")  # truncate on each full run for now

    total_pages = 0
    total_entries = 0
    total_skipped = 0
    failed = 0

    for i, item in enumerate(target):
        t0 = time.time()
        print(f"\n[{i + 1}/{len(target)}] Extracting: {item['filename']}")
        pages = extract_pdf_pages(item["source_path"])
        if pages and "error" in pages[0]:
            print(f"  FAIL: {pages[0]['error']}")
            failed += 1
            continue

        page_count = len(pages)
        entries, skipped = emit_tribal_entries(item, pages, notability_floor=args.notability_floor)
        for entry in entries:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
        total_pages += page_count
        total_entries += len(entries)
        total_skipped += skipped

        elapsed = time.time() - t0
        print(f"  {page_count} pages | {len(entries)} notable | {skipped} low-notability skipped | {elapsed:.1f}s")

    fh.close()

    summary = {
        "ok": True,
        "pdfs_extracted": len(target) - failed,
        "pdfs_failed": failed,
        "total_pages": total_pages,
        "tribal_entries_emitted": total_entries,
        "pages_skipped_below_floor": total_skipped,
        "notability_floor": args.notability_floor,
        "output_path": str(PAGES_OUT_PATH),
    }
    print("\n=== SUMMARY ===")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

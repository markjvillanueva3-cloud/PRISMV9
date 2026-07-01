#!/usr/bin/env python3
"""catalog-cutting-page-extract.py -- select speed/feed-bearing pages from a tooling catalog PDF.

Phase B of the catalog cutting-parameter program (slot:papa, PDF-TRIBAL-HERMES family).
The per-vendor extractors (extract-accupro.py etc.) pull tool GEOMETRY only; the actual
SFM/feed RECOMMENDATION tables (Vc/fz by ISO material group x coating x operation) are never
read. This helper is the deterministic front-end: it opens a catalog, finds the pages that
ACTUALLY carry cutting-data tables, and emits their text for an LLM to structure.

Deterministic + cheap: pure fitz text scan (no find_tables by default -- that is what made the
earlier whole-catalog probes time out on image-heavy PDFs). A page is selected when its text
carries BOTH a cutting-parameter signal (Vc/fz/sfm/ipt/feed/cutting speed/m-min/ft-min) AND a
material-or-coating signal (ISO P/M/K/N/S/H / steel / stainless / coating name). Bounded by
--max-pages so a 1000-page catalog produces a manageable work-list.

Usage:
  python scripts/catalog-cutting-page-extract.py "<pdf path>" [--max-pages 80] [--page-chars 3500] [--tables]
Output (stdout): one JSON object {pdf, total_pages, selected, pages:[{page, text, tables?}]}
"""
import sys
import re
import json
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

try:
    import pymupdf  # fitz
except Exception as e:  # pragma: no cover - environment guard
    print(json.dumps({"error": f"pymupdf import failed: {e}"}))
    sys.exit(2)

SIG = re.compile(
    r"(vc\b|f\s*z\b|feed per tooth|cutting speed|ft/min|sfm\b|\bipt\b|m/min|ipr\b|rev\b|feed rate)",
    re.I,
)
MAT = re.compile(
    r"(ISO\s*[PMKNSH]\b|\bP\d{2}\b|TiAlN|AlTiN|TiCN|AlCrN|uncoated|low[-\s]?carbon|stainless|cast iron|"
    r"\bsteel\b|alumin|titanium|hardened|inconel|nickel|\bHRC\b)",
    re.I,
)


def main():
    argv = sys.argv[1:]
    if not argv:
        print(json.dumps({"error": "no pdf path given"}))
        sys.exit(2)
    pdf = argv[0]
    max_pages = 80
    page_chars = 3500
    want_tables = False
    i = 1
    while i < len(argv):
        a = argv[i]
        if a == "--max-pages":
            i += 1
            max_pages = int(argv[i])
        elif a == "--page-chars":
            i += 1
            page_chars = int(argv[i])
        elif a == "--tables":
            want_tables = True
        i += 1

    try:
        doc = pymupdf.open(pdf)
    except Exception as e:
        print(json.dumps({"error": f"open failed: {e}", "pdf": pdf}))
        sys.exit(2)

    selected = []
    for p in range(doc.page_count):
        if len(selected) >= max_pages:
            break
        try:
            page = doc[p]
            text = page.get_text()
        except Exception:
            continue
        if not text or len(text) < 40:
            continue
        if not (SIG.search(text) and MAT.search(text)):
            continue
        rec = {"page": p + 1, "text": text[:page_chars]}
        if want_tables:
            try:
                tabs = page.find_tables()
                rows = []
                for t in tabs.tables[:4]:
                    ext = t.extract()
                    if ext and len(ext) >= 2:
                        rows.append(ext[:40])
                if rows:
                    rec["tables"] = rows
            except Exception:
                pass
        selected.append(rec)

    print(json.dumps({
        "pdf": pdf,
        "total_pages": doc.page_count,
        "selected": len(selected),
        "pages": selected,
    }))


if __name__ == "__main__":
    main()

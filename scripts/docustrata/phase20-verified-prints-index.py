#!/usr/bin/env python3
"""
phase20-verified-prints-index.py — consolidate phase-15 deep-OCR per-page records
into a canonical verified-prints index.

Context: MS-DOCU-FINISH / U-DOCU-02. The roadmap unit was originally written as
"run the phase-8 tiered classifier over the full 120K candidate pages", but
phase-15 (deep-rescan-parallel) SUPERSEDED phase-8 — it deep-OCR'd ~21,545 docs
with full title-block extraction (part_numbers, drawing_number, revision,
material, customer, is_drawing_likely), whereas phase-8 only ever covered 2,480
docs. phase16-blueprint-program-join-v5.py already consumes phase-15 directly.
So the actual U-DOCU-02 gap is not "run phase-8" — it's "roll phase-15's noisy
per-page output up into a clean per-print index that downstream join + catalog
ingestion can consume."

This script:
  1. Reads phase15-deep-rescan-parallel.jsonl (per-page records).
  2. Dedups on (doc_id, page_index) — the phase-15 parallel run + memsafe run
     both appended to the same file, so duplicate page records exist. The
     record with the most populated fields wins.
  3. Applies a STRICTER part-number filter than phase-15's inline is_garbage
     (phase-15 keeps short numerics like "1177"/"F001" and lets dates/phones
     through; a real JM-Die print PN is >= 4 chars, has a structural shape,
     and is not a date / phone / year / pure-digit run / OCR-noise token).
  4. Classifies each page as a verified print when it is drawing-likely AND has
     >= 1 strong PN, OR has >= 2 strong PNs, OR has a drawing_number + >=1 PN.
  5. Emits phase20-verified-prints.jsonl — one record per verified print page.
  6. Emits phase20-verified-prints-by-doc.jsonl — one record per doc that has
     >= 1 verified print page (the multi-print container rollup).
  7. Emits phase20-summary.md.

Outputs land in H:/PRISM/Docustrata/.index/ alongside the other phase artifacts
(the script itself lives in the git-tracked PRISM scripts tree).

Idempotent: re-running overwrites the three outputs from scratch.

Usage:
  H:/Tools/python/python.exe scripts/docustrata/phase20-verified-prints-index.py [--min-pn-len N]
"""
from __future__ import annotations
import json
import re
import sys
import io
from pathlib import Path
from collections import Counter

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

INDEX = Path(r"H:\PRISM\Docustrata\.index")
P15 = INDEX / "phase15-deep-rescan-parallel.jsonl"
OUT_PAGES = INDEX / "phase20-verified-prints.jsonl"
OUT_DOCS = INDEX / "phase20-verified-prints-by-doc.jsonl"
SUMMARY = INDEX / "phase20-summary.md"

MIN_PN_LEN = 4
for i, a in enumerate(sys.argv):
    if a == "--min-pn-len" and i + 1 < len(sys.argv):
        MIN_PN_LEN = int(sys.argv[i + 1])

# -- strict part-number filter -------------------------------------------------
# A real JM-Die print PN looks like: D946-1, FX34L, T3136-031-3D, 232454-A,
# MCF-1234, PF-22-1A, 442A19-0114. Reject: pure short digit runs, years, dates,
# phone numbers, single-letter+digit, OCR-noise, dimension callouts.
_YEAR_RE = re.compile(r"^(19|20)\d{2}$")
_PURE_DIGIT_RE = re.compile(r"^\d{1,5}$")
_SINGLE_ALPHA_DIGIT_RE = re.compile(r"^[A-Z]\d{0,2}$", re.I)
_DIM_CALLOUT_RE = re.compile(r"^\.?\d+\.?\d*(MM|IN|DEG|R|X)?$", re.I)
_REPEATED_RE = re.compile(r"(.)\1{3,}")
_OCR_NOISE_RE = re.compile(r"^[BCDFGHJKLMNPQRSTVWXZ]{5,}$", re.I)
# date forms: 10-24-20, 10/24/2020, 2020-10-26, 2024_09_11
_DATE_RE = re.compile(
    r"^(?:\d{1,4}[-/_]\d{1,2}[-/_]\d{2,4})$"
)
# US phone: 630-948-5952, (630) 948-5952 → normalized to 6309485952 / 630-948-5952
_PHONE_RE = re.compile(r"^\d{3}[-.]?\d{3}[-.]?\d{4}$")
# structural shape: alnum start+end, dashes/slashes/dots allowed in the middle
_STRUCT_RE = re.compile(r"^[A-Z0-9][A-Z0-9\-/.]{2,18}[A-Z0-9]$", re.I)


def is_strong_pn(pn: str) -> bool:
    if not isinstance(pn, str):
        return False
    s = pn.strip().upper()
    if len(s) < MIN_PN_LEN or len(s) > 20:
        return False
    if _YEAR_RE.match(s):
        return False
    if _DATE_RE.match(s):
        return False
    if _PHONE_RE.match(s):
        return False
    if _PURE_DIGIT_RE.match(s) and len(s) < 6:  # pure 4-5 digit = ambiguous, reject
        return False
    if _SINGLE_ALPHA_DIGIT_RE.match(s):
        return False
    if _DIM_CALLOUT_RE.match(s):
        return False
    if _REPEATED_RE.search(s):
        return False
    if _OCR_NOISE_RE.match(s):
        return False
    if not _STRUCT_RE.match(s):
        return False
    if not any(c.isdigit() for c in s):
        return False
    # require either a structural separator, OR an alpha+digit mix of len>=5,
    # OR a pure-digit run of len>=6
    has_sep = any(c in "-/." for c in s)
    has_mix = any(c.isalpha() for c in s) and any(c.isdigit() for c in s) and len(s) >= 5
    return has_sep or has_mix or (s.isdigit() and len(s) >= 6)


def page_is_verified_print(fields: dict, strong_pns: list[str]) -> bool:
    if not strong_pns:
        return False
    is_drawing = bool(fields.get("is_drawing_likely"))
    dn = fields.get("drawing_number")
    has_drawing_no = bool(dn) and isinstance(dn, str) and dn.upper() not in ("FILE", "MUST", "NONE")
    if is_drawing and len(strong_pns) >= 1:
        return True
    if len(strong_pns) >= 2:
        return True
    if has_drawing_no and len(strong_pns) >= 1:
        return True
    return False


def _field_score(rec: dict) -> int:
    """How populated is this page record — used to break (doc_id,page) dup ties."""
    fields = rec.get("fields", {}) or {}
    score = 0
    for k in ("part_numbers", "drawing_number", "revision", "material", "customer"):
        v = fields.get(k)
        if v:
            score += len(v) if isinstance(v, list) else 1
    score += int(fields.get("strong_indicators", 0))
    return score


def main() -> int:
    if not P15.exists():
        print(f"ERROR: {P15} not found", file=sys.stderr)
        return 1

    # -- pass 1: dedup raw page records on (doc_id, page_index) ----------------
    best_page: dict[tuple, dict] = {}
    doc_meta: dict[str, dict] = {}
    n_lines = 0
    n_dups = 0
    with open(P15, "r", encoding="utf-8") as f:
        for line in f:
            try:
                r = json.loads(line)
            except json.JSONDecodeError:
                continue
            n_lines += 1
            did = r.get("doc_id")
            if not did:
                continue
            doc_meta.setdefault(did, {
                "filename": r.get("filename"),
                "disk_path": r.get("disk_path"),
            })
            key = (did, r.get("page_index"))
            if key in best_page:
                n_dups += 1
                if _field_score(r) > _field_score(best_page[key]):
                    best_page[key] = r
            else:
                best_page[key] = r

    # -- pass 2: group deduped pages by doc -----------------------------------
    docs: dict[str, list[dict]] = {}
    for (did, _pidx), r in best_page.items():
        docs.setdefault(did, []).append(r)

    verified_pages: list[dict] = []
    verified_doc_records: list[dict] = []
    all_strong_pns: set[str] = set()
    customer_counter: Counter = Counter()
    material_counter: Counter = Counter()

    for did, pages in docs.items():
        meta = doc_meta[did]
        doc_verified_pages = []
        for p in pages:
            fields = p.get("fields", {}) or {}
            raw_pns = fields.get("part_numbers", []) or []
            strong = sorted({pn.strip().upper() for pn in raw_pns if is_strong_pn(pn)})
            if not page_is_verified_print(fields, strong):
                continue
            cust = fields.get("customer")
            mat = fields.get("material")
            rec = {
                "doc_id": did,
                "filename": meta["filename"],
                "disk_path": meta["disk_path"],
                "page_index": p.get("page_index"),
                "part_numbers": strong,
                "drawing_number": fields.get("drawing_number"),
                "revision": fields.get("revision"),
                "material": mat,
                "customer": cust,
                "is_drawing_likely": bool(fields.get("is_drawing_likely")),
                "strong_indicators": fields.get("strong_indicators", 0),
            }
            verified_pages.append(rec)
            doc_verified_pages.append(rec)
            all_strong_pns.update(strong)
            if cust:
                customer_counter[cust] += 1
            if mat:
                material_counter[mat] += 1

        if doc_verified_pages:
            doc_pns = sorted({pn for r in doc_verified_pages for pn in r["part_numbers"]})
            doc_customers = sorted({r["customer"] for r in doc_verified_pages if r["customer"]})
            verified_doc_records.append({
                "doc_id": did,
                "filename": meta["filename"],
                "disk_path": meta["disk_path"],
                "total_pages": len(pages),
                "verified_print_pages": sorted(
                    r["page_index"] for r in doc_verified_pages
                    if r["page_index"] is not None
                ),
                "verified_print_count": len(doc_verified_pages),
                "part_numbers": doc_pns,
                "customers": doc_customers,
            })

    # -- write outputs ---------------------------------------------------------
    with open(OUT_PAGES, "w", encoding="utf-8") as f:
        for rec in verified_pages:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    with open(OUT_DOCS, "w", encoding="utf-8") as f:
        for rec in verified_doc_records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    multi_print_docs = sum(1 for r in verified_doc_records if r["verified_print_count"] >= 2)
    big_container_docs = sum(1 for r in verified_doc_records if r["verified_print_count"] >= 5)

    with open(SUMMARY, "w", encoding="utf-8") as f:
        f.write("# Phase 20 — Verified Prints Index\n\n")
        f.write("Consolidates `phase15-deep-rescan-parallel.jsonl` (per-page deep-OCR)\n")
        f.write("into a clean verified-prints index. MS-DOCU-FINISH / U-DOCU-02.\n\n")
        f.write(f"- **phase-15 input lines:** {n_lines}\n")
        f.write(f"- **duplicate page records dropped:** {n_dups}\n")
        f.write(f"- **deduped pages:** {len(best_page)}\n")
        f.write(f"- **input docs:** {len(docs)}\n")
        f.write(f"- **verified print pages:** {len(verified_pages)}\n")
        f.write(f"- **docs with >=1 verified print:** {len(verified_doc_records)}\n")
        f.write(f"- **multi-print container docs (>=2 prints):** {multi_print_docs}\n")
        f.write(f"- **big container docs (>=5 prints):** {big_container_docs}\n")
        f.write(f"- **unique strong part numbers:** {len(all_strong_pns)}\n")
        f.write(f"- **min PN length:** {MIN_PN_LEN}\n\n")
        f.write("## Top customers (by verified print page count)\n\n")
        for cust, cnt in customer_counter.most_common(25):
            f.write(f"- {cust}: {cnt}\n")
        f.write("\n## Top materials\n\n")
        for mat, cnt in material_counter.most_common(25):
            f.write(f"- {mat}: {cnt}\n")
        f.write("\n## Outputs\n\n")
        f.write(f"- `{OUT_PAGES.name}` — one record per verified print page\n")
        f.write(f"- `{OUT_DOCS.name}` — one record per container doc (multi-print rollup)\n")

    print(f"phase-15 input:        {n_lines} lines ({n_dups} dups dropped)")
    print(f"deduped pages:         {len(best_page)} / {len(docs)} docs")
    print(f"verified print pages:  {len(verified_pages)}")
    print(f"verified print docs:   {len(verified_doc_records)}")
    print(f"  multi-print (>=2):   {multi_print_docs}")
    print(f"  big container (>=5): {big_container_docs}")
    print(f"unique strong PNs:     {len(all_strong_pns)}")
    print(f"wrote: {OUT_PAGES.name}, {OUT_DOCS.name}, {SUMMARY.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

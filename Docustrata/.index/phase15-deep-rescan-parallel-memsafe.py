"""
Phase 15 (parallel, memory-safe) — variant of phase15-deep-rescan-parallel.py
that survives Windows memory fragmentation by:

  1. Render scale 1.8 (down from 2.4) — raster ~14MB vs ~36MB per letter-size
     page. Still produces ~130 DPI which is sufficient for title-block OCR.
  2. Skip docs with >MAX_CAND_PAGES (=30) candidate pages — the memory file
     says drawings come in batches of 5-10 per container PDF; 30+ candidate
     pages indicates a giant import-batch that thrashes memory with diminishing
     returns. These are written to phase15-skipped-huge.jsonl for follow-up.
  3. Default 6 workers (down from 12) — fits 8GB headroom with ~1GB/worker.
  4. Explicit `del img, pix; gc.collect()` per page to release fitz buffers
     immediately rather than waiting for refcount.
  5. Per-page try/except around render so a single malloc failure doesn't
     poison the worker's whole doc.
  6. Append to phase15-deep-rescan-parallel.jsonl (same output as original
     so doc_id resume set unifies; the original script's resume logic
     already handles unioned skip set).

Companion script — do NOT delete the original. Use this when the original
hits FzErrorSystem: malloc failed messages on huge PDFs.

Usage:
  OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 \\
    H:/Tools/python/python.exe phase15-deep-rescan-parallel-memsafe.py [N_DOCS] [N_WORKERS]

  N_DOCS=0 -> all pending; N_WORKERS default 6.

Outputs:
  phase15-deep-rescan-parallel.jsonl   (appended, shared with original)
  phase15-skipped-huge.jsonl           (NEW — docs skipped for >30 cand pages)
  phase15-memsafe-summary.md
"""
from __future__ import annotations
import gc
import io
import json
import os
import re
import sys
import time
from multiprocessing import Pool, cpu_count
from pathlib import Path
from collections import Counter

import fitz
import pytesseract
from PIL import Image

INDEX = Path(r"H:\PRISM\Docustrata\.index")
CANDIDATES = INDEX / "phase7-drawing-candidates.jsonl"
P8_CLEAN = INDEX / "phase8-classified-pages.cleaned.jsonl"
P15_PRIOR = INDEX / "phase15-deep-rescan.jsonl"           # seq smoke (50)
OUT = INDEX / "phase15-deep-rescan-parallel.jsonl"        # shared with original
SKIPPED = INDEX / "phase15-skipped-huge.jsonl"            # NEW
SUMMARY = INDEX / "phase15-memsafe-summary.md"

TESS_CMD = r"H:\Tools\Tesseract-OCR\tesseract.exe"
TESS_DATA = r"H:\Tools\Tesseract-OCR\tessdata"

RENDER_SCALE = 1.8       # was 2.4 in original — ~14MB raster vs ~36MB
MAX_CAND_PAGES = 30      # skip giant import-batch PDFs (chunk later if needed)

# -- Regex (identical to original) ---------------------------------------------
PART_NUMBER_RE = re.compile(r"\b([A-Z]{0,3}[-]?\d{2,8}[-A-Z0-9]{0,15})\b")
GARBAGE_PATTERNS = [
    re.compile(r"^0+$"),
    re.compile(r"^(19|20)\d{2}$"),
    re.compile(r"^\d{1,3}$"),
    re.compile(r"^[A-Z]{2,}\d{3,5}$"),
    re.compile(r"^\d{1,3}-\d{1,3}$"),
    re.compile(r"^\d{1,2}TH$", re.I),
    re.compile(r"^[A-Z]\d{0,2}$", re.I),
]
def is_garbage(pn: str) -> bool:
    pn = pn.strip()
    if len(pn) < 4: return True
    return any(p.match(pn) for p in GARBAGE_PATTERNS)

STRONG_INDICATORS = [
    re.compile(p, re.I) for p in [
        r"\bPART\s*N[O.]", r"\bDRAWING\s*N[O.]", r"\bDWG\s*N[O.]",
        r"\bREV(?:ISION)?[\s:]+[A-Z0-9]", r"\bSCALE[\s:]+[\d:./]",
        r"\bMATERIAL[\s:]+", r"\bSHEET\s*\d+\s*OF\s*\d+",
        r"\bUNLESS\s*OTHERWISE\s*SPECIFIED",
    ]
]

CUSTOMER_LINE_RE = re.compile(
    r"(?:CUSTOMER|BILL\s*TO|SHIP\s*TO|COMPANY|CLIENT|PURCHASER|SOLD\s*TO)"
    r"\s*[:.]?\s*([^\n\r]{0,80})",
    re.I,
)
KEYWORD_TOKENS = re.compile(
    r"^(?:CUSTOMER|BILL\s*TO|SHIP\s*TO|COMPANY|CLIENT|PURCHASER|SOLD\s*TO|"
    r"JOB|ATTN|VENDOR|PO|NUMBER|INVOICE|TOTAL|EACH|SHIPMENT)\b",
    re.I,
)

def clean_customer(s: str) -> str | None:
    s = re.sub(r"\s+", " ", s).strip(" :.,-")
    if len(s) < 4: return None
    if KEYWORD_TOKENS.match(s): return None
    if not re.search(r"[A-Za-z]", s): return None
    letters = sum(1 for c in s if c.isalpha())
    if letters < max(4, int(len(s) * 0.5)): return None
    return s[:60]

def extract_customer(text: str) -> str | None:
    for m in CUSTOMER_LINE_RE.finditer(text):
        cand = m.group(1)
        cleaned = clean_customer(cand)
        if cleaned:
            return cleaned
        post = text[m.end():m.end() + 200]
        for line in post.splitlines():
            line = line.strip()
            if line:
                cleaned = clean_customer(line)
                if cleaned:
                    return cleaned
                break
    return None

DRAWING_NUMBER_RE = re.compile(r"(?:DWG|DRAWING)\s*(?:N[O.]|#)?\s*[:.]?\s*([A-Z0-9][A-Z0-9\-/]{2,20})", re.I)
REVISION_RE = re.compile(r"\bREV(?:ISION)?\s*[:.]?\s*([A-Z0-9]{1,4})\b", re.I)
MATERIAL_RE = re.compile(r"\bMATERIAL\s*[:.]?\s*([A-Z0-9 \-,/.]{3,40})", re.I)

REGIONS = {
    "br": (0.55, 0.55, 1.00, 1.00),
    "tr": (0.55, 0.00, 1.00, 0.40),
    "tl": (0.00, 0.00, 0.45, 0.30),
    "ct": (0.20, 0.30, 0.80, 0.70),
}

def init_worker():
    pytesseract.pytesseract.tesseract_cmd = TESS_CMD
    os.environ["TESSDATA_PREFIX"] = TESS_DATA
    # Belt-and-suspenders: ensure thread limits propagate to workers
    os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
    os.environ.setdefault("OMP_NUM_THREADS", "1")
    os.environ.setdefault("MKL_NUM_THREADS", "1")

def ocr_region(img, region):
    w, h = img.size
    x1, y1, x2, y2 = region
    crop = img.crop((int(w * x1), int(h * y1), int(w * x2), int(h * y2)))
    parts = []
    for psm in (6, 11):
        try:
            t = pytesseract.image_to_string(crop, config=f"--psm {psm}")
            parts.append(t)
        except Exception:
            continue
    del crop
    return "\n".join(parts)

def extract_fields(text: str) -> dict:
    text = text or ""
    pn_raw = list({m for m in PART_NUMBER_RE.findall(text) if len(m) >= 4})
    pn_clean = [p for p in pn_raw if not is_garbage(p)]
    pn_garbage = [p for p in pn_raw if is_garbage(p)]
    strong = sum(1 for pat in STRONG_INDICATORS if pat.search(text))
    dwg = DRAWING_NUMBER_RE.search(text)
    rev = REVISION_RE.search(text)
    mat = MATERIAL_RE.search(text)
    return {
        "part_numbers": pn_clean[:10],
        "garbage_partnums": pn_garbage[:5],
        "drawing_number": dwg.group(1) if dwg else None,
        "revision": rev.group(1) if rev else None,
        "material": mat.group(1).strip() if mat else None,
        "customer": extract_customer(text),
        "strong_indicators": strong,
        "is_drawing_likely": strong >= 2 or (strong >= 1 and len(pn_clean) >= 1),
        "ocr_chars": len(text),
    }

def render_page_memsafe(page):
    """Render with explicit cleanup. Returns PIL Image or None on failure."""
    try:
        pix = page.get_pixmap(matrix=fitz.Matrix(RENDER_SCALE, RENDER_SCALE))
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        del pix  # release fitz buffer immediately
        return img
    except Exception:
        return None

def process_doc(doc_meta: dict) -> list[dict]:
    out_rows = []
    path = doc_meta["disk_path"]
    cands = doc_meta.get("candidate_pages", [])
    try:
        with fitz.open(path) as doc:
            for cp in cands:
                pi = cp["page_index"]
                if pi >= len(doc):
                    continue
                try:
                    img = render_page_memsafe(doc[pi])
                    if img is None:
                        out_rows.append({
                            "doc_id": doc_meta["doc_id"],
                            "filename": doc_meta["filename"],
                            "page_index": pi,
                            "error": "render_failed_oom",
                        })
                        continue
                    parts = []
                    for region in REGIONS.values():
                        parts.append(ocr_region(img, region))
                    combined = "\n".join(parts)
                    fields = extract_fields(combined)
                    out_rows.append({
                        "doc_id": doc_meta["doc_id"],
                        "filename": doc_meta["filename"],
                        "disk_path": path,
                        "page_index": pi,
                        "fields": fields,
                    })
                    del img, parts, combined
                    gc.collect()
                except Exception as e:
                    out_rows.append({
                        "doc_id": doc_meta["doc_id"],
                        "page_index": pi,
                        "error": f"page: {type(e).__name__}: {e}",
                    })
    except Exception as e:
        out_rows.append({
            "doc_id": doc_meta["doc_id"],
            "error": f"open: {type(e).__name__}: {e}",
        })
    return out_rows

def main():
    n_limit = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    n_workers = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    print(f"[memsafe] target: N_DOCS={n_limit or 'ALL'} N_WORKERS={n_workers} "
          f"SCALE={RENDER_SCALE} MAX_CAND_PAGES={MAX_CAND_PAGES}", flush=True)

    print("Loading Phase 7 candidates...", flush=True)
    candidates = []
    with CANDIDATES.open(encoding="utf-8") as f:
        for ln in f:
            try: candidates.append(json.loads(ln))
            except json.JSONDecodeError: continue
    print(f"  {len(candidates)} candidates", flush=True)

    print("Loading Phase 8 doc_ids (skip)...", flush=True)
    p8_ids = set()
    with P8_CLEAN.open(encoding="utf-8") as f:
        for ln in f:
            try:
                r = json.loads(ln)
                if r.get("doc_id"): p8_ids.add(r["doc_id"])
            except json.JSONDecodeError: continue
    print(f"  {len(p8_ids)} in Phase 8", flush=True)

    p15_ids = set()
    if P15_PRIOR.exists():
        with P15_PRIOR.open(encoding="utf-8") as f:
            for ln in f:
                try:
                    r = json.loads(ln)
                    if r.get("doc_id"): p15_ids.add(r["doc_id"])
                except json.JSONDecodeError: continue
    if OUT.exists():
        with OUT.open(encoding="utf-8") as f:
            for ln in f:
                try:
                    r = json.loads(ln)
                    if r.get("doc_id"): p15_ids.add(r["doc_id"])
                except json.JSONDecodeError: continue
    if SKIPPED.exists():
        with SKIPPED.open(encoding="utf-8") as f:
            for ln in f:
                try:
                    r = json.loads(ln)
                    if r.get("doc_id"): p15_ids.add(r["doc_id"])
                except json.JSONDecodeError: continue
    print(f"  combined skip set: {len(p15_ids)}", flush=True)

    pending_all = [c for c in candidates if c["doc_id"] not in p8_ids and c["doc_id"] not in p15_ids]
    skip_huge = [c for c in pending_all if len(c.get("candidate_pages", [])) > MAX_CAND_PAGES]
    pending = [c for c in pending_all if len(c.get("candidate_pages", [])) <= MAX_CAND_PAGES]

    if skip_huge:
        skip_fh = SKIPPED.open("a", encoding="utf-8")
        for c in skip_huge:
            skip_fh.write(json.dumps({
                "doc_id": c["doc_id"],
                "filename": c["filename"],
                "disk_path": c["disk_path"],
                "n_candidate_pages": len(c["candidate_pages"]),
                "reason": f"exceeds MAX_CAND_PAGES={MAX_CAND_PAGES}",
            }) + "\n")
        skip_fh.close()
        print(f"  skipped {len(skip_huge)} huge docs (>{MAX_CAND_PAGES} cand pages) -> {SKIPPED.name}", flush=True)

    if n_limit:
        pending = pending[:n_limit]
    print(f"PENDING: {len(pending)} docs", flush=True)

    out_fh = OUT.open("a", encoding="utf-8")
    n_pages = 0
    n_drawing = 0
    n_with_pns = 0
    n_pn_total = 0
    n_with_cust = 0
    n_render_failures = 0
    customers = Counter()
    t0 = time.time()
    n_done_docs = 0

    with Pool(processes=n_workers, initializer=init_worker) as pool:
        for rows in pool.imap_unordered(process_doc, pending, chunksize=1):
            for r in rows:
                out_fh.write(json.dumps(r, ensure_ascii=False) + "\n")
                n_pages += 1
                if r.get("error", "").startswith("render_failed"):
                    n_render_failures += 1
                f_ = r.get("fields") or {}
                if f_.get("is_drawing_likely"): n_drawing += 1
                pns = f_.get("part_numbers") or []
                if pns:
                    n_with_pns += 1
                    n_pn_total += len(pns)
                if f_.get("customer"):
                    n_with_cust += 1
                    customers[f_["customer"][:40]] += 1
            out_fh.flush()
            n_done_docs += 1
            if n_done_docs % 25 == 0 or n_done_docs == len(pending):
                el = time.time() - t0
                rate_p = n_pages / el if el else 0
                rate_d = n_done_docs / el if el else 0
                eta = (len(pending) - n_done_docs) / rate_d if rate_d else 0
                print(
                    f"  [{n_done_docs}/{len(pending)}] pages={n_pages} "
                    f"draw={n_drawing} pn={n_with_pns} cust={n_with_cust} "
                    f"oom={n_render_failures} "
                    f"{rate_p:.1f}p/s {rate_d:.2f}d/s ETA={eta/60:.0f}min",
                    flush=True,
                )

    out_fh.close()
    el = time.time() - t0

    lines = [
        "# Phase 15 (memsafe parallel) Summary\n",
        f"**Generated:** {time.strftime('%Y-%m-%dT%H:%M:%S%z')}",
        f"**Workers:** {n_workers}  ·  **Render scale:** {RENDER_SCALE}  ·  **Max cand pages:** {MAX_CAND_PAGES}",
        f"**Docs processed:** {len(pending)}",
        f"**Docs skipped (huge):** {len(skip_huge)}  (see {SKIPPED.name})",
        f"**Pages OCR'd:** {n_pages}",
        f"**Drawing-likely:** {n_drawing} ({100*n_drawing/max(n_pages,1):.1f}%)",
        f"**Pages with PNs:** {n_with_pns} ({100*n_with_pns/max(n_pages,1):.1f}%)",
        f"**Total clean PNs:** {n_pn_total}",
        f"**Pages with customer:** {n_with_cust} ({100*n_with_cust/max(n_pages,1):.1f}%)",
        f"**Render failures (OOM):** {n_render_failures}",
        f"**Runtime:** {el/60:.1f}min  ·  {n_pages/max(el,1):.1f} p/s",
        "",
        "## Top customers (post-filter)\n",
    ]
    for c, k in customers.most_common(30):
        lines.append(f"- {c}: {k}")
    SUMMARY.write_text("\n".join(lines), encoding="utf-8")
    print(f"\n=== Phase 15 memsafe done ({el/60:.1f}min) ===")
    print(f"  pages={n_pages} pn={n_with_pns} cust={n_with_cust} oom={n_render_failures}")

if __name__ == "__main__":
    main()

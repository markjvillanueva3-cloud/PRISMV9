"""
Phase 15 (huge-chunked) — companion to phase15-deep-rescan-parallel-memsafe.py
for the 673 large container PDFs auto-deferred by MAX_CAND_PAGES=30.

WHY a separate script:
  Memsafe's per-page render is fine when a worker holds ~5-10 candidate pages
  at most. For docs with 50-200+ candidate pages, MuPDF's internal page cache
  grows monotonically inside a single fitz.open() context — eventually
  triggering the 36MB raster malloc failures that crashed the original
  parallel.py. Closing+reopening the doc every N pages bounds the cache
  growth.

CHUNKING STRATEGY:
  - Process candidate_pages in chunks of CHUNK_SIZE (10) per doc
  - Open PDF, process chunk, close PDF → release MuPDF buffers
  - Reopen for next chunk
  - Per-page OCR pipeline identical to memsafe variant

EXECUTION DISCIPLINE:
  - Do NOT run concurrently with phase15-deep-rescan-parallel-memsafe.py
  - System memory budget cannot hold both worker pools (6 + 4 = 10 python
    processes + ~6 claude processes would exceed 16GB free working set)
  - Wait for memsafe parallel run to complete, then launch this

INPUT:
  phase15-skipped-huge.jsonl — 673 docs deferred by memsafe's MAX_CAND_PAGES gate

OUTPUT:
  phase15-deep-rescan-parallel.jsonl (append — shared with memsafe)
  phase15-huge-chunked-summary.md

USAGE:
  OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 \\
    H:/Tools/python/python.exe phase15-deep-rescan-huge-chunked.py [N_DOCS] [N_WORKERS]

  N_DOCS=0 -> all huge; N_WORKERS default 4 (fewer than memsafe — bigger PDFs).
"""
from __future__ import annotations
import gc
import json
import os
import re
import sys
import time
from multiprocessing import Pool
from pathlib import Path
from collections import Counter

import fitz
import pytesseract
from PIL import Image

INDEX = Path(r"H:\PRISM\Docustrata\.index")
HUGE_INPUT = INDEX / "phase15-skipped-huge.jsonl"
P7_CANDIDATES = INDEX / "phase7-drawing-candidates.jsonl"
OUT = INDEX / "phase15-deep-rescan-parallel.jsonl"
SUMMARY = INDEX / "phase15-huge-chunked-summary.md"

TESS_CMD = r"H:\Tools\Tesseract-OCR\tesseract.exe"
TESS_DATA = r"H:\Tools\Tesseract-OCR\tessdata"

RENDER_SCALE = 1.8     # match memsafe
CHUNK_SIZE = 10        # close+reopen PDF every N candidate pages

# Regex (identical to memsafe variant — keep field shape compatible)
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

def clean_customer(s):
    s = re.sub(r"\s+", " ", s).strip(" :.,-")
    if len(s) < 4: return None
    if KEYWORD_TOKENS.match(s): return None
    if not re.search(r"[A-Za-z]", s): return None
    letters = sum(1 for c in s if c.isalpha())
    if letters < max(4, int(len(s) * 0.5)): return None
    return s[:60]

def extract_customer(text):
    for m in CUSTOMER_LINE_RE.finditer(text):
        cand = m.group(1)
        cleaned = clean_customer(cand)
        if cleaned: return cleaned
        post = text[m.end():m.end() + 200]
        for line in post.splitlines():
            line = line.strip()
            if line:
                cleaned = clean_customer(line)
                if cleaned: return cleaned
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

def extract_fields(text):
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

def render_page_safe(page):
    try:
        pix = page.get_pixmap(matrix=fitz.Matrix(RENDER_SCALE, RENDER_SCALE))
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        del pix
        return img
    except Exception:
        return None

def process_huge_doc(doc_meta):
    """Process a huge doc in CHUNK_SIZE-page chunks, closing+reopening fitz between."""
    out_rows = []
    path = doc_meta["disk_path"]
    cands = doc_meta.get("candidate_pages", [])
    doc_id = doc_meta["doc_id"]
    filename = doc_meta["filename"]

    # Process candidates in chunks
    for chunk_idx in range(0, len(cands), CHUNK_SIZE):
        chunk = cands[chunk_idx:chunk_idx + CHUNK_SIZE]
        try:
            with fitz.open(path) as doc:
                n_pages_in_doc = len(doc)
                for cp in chunk:
                    pi = cp["page_index"]
                    if pi >= n_pages_in_doc:
                        continue
                    try:
                        img = render_page_safe(doc[pi])
                        if img is None:
                            out_rows.append({
                                "doc_id": doc_id, "filename": filename, "page_index": pi,
                                "error": "render_failed_oom_chunked",
                            })
                            continue
                        parts = [ocr_region(img, region) for region in REGIONS.values()]
                        combined = "\n".join(parts)
                        fields = extract_fields(combined)
                        out_rows.append({
                            "doc_id": doc_id, "filename": filename, "disk_path": path,
                            "page_index": pi, "fields": fields,
                        })
                        del img, parts, combined
                    except Exception as e:
                        out_rows.append({
                            "doc_id": doc_id, "page_index": pi,
                            "error": f"page: {type(e).__name__}: {e}",
                        })
        except Exception as e:
            out_rows.append({
                "doc_id": doc_id, "page_index": -1,
                "error": f"open_chunk_{chunk_idx}: {type(e).__name__}: {e}",
            })
        # Release MuPDF buffers between chunks
        gc.collect()

    return out_rows

def load_huge_candidates():
    """Read phase15-skipped-huge.jsonl AND backfill from phase7 candidates
    (skipped-huge only stores summaries; we need the candidate_pages list)."""
    if not HUGE_INPUT.exists():
        raise FileNotFoundError(f"Expected {HUGE_INPUT} — run memsafe variant first to populate")

    skipped_ids = set()
    with HUGE_INPUT.open(encoding="utf-8") as f:
        for ln in f:
            try:
                r = json.loads(ln)
                if r.get("doc_id"): skipped_ids.add(r["doc_id"])
            except json.JSONDecodeError:
                continue

    # Load full candidate metadata (which has candidate_pages) from phase7
    huge_docs = []
    with P7_CANDIDATES.open(encoding="utf-8") as f:
        for ln in f:
            try:
                c = json.loads(ln)
                if c.get("doc_id") in skipped_ids:
                    huge_docs.append(c)
            except json.JSONDecodeError:
                continue
    return huge_docs

def main():
    n_limit = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    n_workers = int(sys.argv[2]) if len(sys.argv) > 2 else 4
    print(f"[huge-chunked] target: N_DOCS={n_limit or 'ALL'} N_WORKERS={n_workers} "
          f"SCALE={RENDER_SCALE} CHUNK_SIZE={CHUNK_SIZE}", flush=True)

    huge_docs = load_huge_candidates()
    print(f"  loaded {len(huge_docs)} huge docs from {HUGE_INPUT.name}", flush=True)

    # Resume: skip docs already in OUT
    done_ids = set()
    if OUT.exists():
        with OUT.open(encoding="utf-8") as f:
            for ln in f:
                try:
                    r = json.loads(ln)
                    if r.get("doc_id") and not r.get("error", "").startswith("render_failed_oom"):
                        done_ids.add(r["doc_id"])
                except json.JSONDecodeError:
                    continue
        print(f"  {len(done_ids)} doc_ids already in OUT — will skip", flush=True)

    pending = [d for d in huge_docs if d["doc_id"] not in done_ids]
    if n_limit:
        pending = pending[:n_limit]
    print(f"PENDING: {len(pending)} huge docs", flush=True)

    if not pending:
        print("Nothing to do.", flush=True)
        return

    out_fh = OUT.open("a", encoding="utf-8")
    n_pages = 0; n_drawing = 0; n_with_pns = 0; n_pn_total = 0
    n_with_cust = 0; n_render_failures = 0
    customers = Counter()
    t0 = time.time()
    n_done = 0

    with Pool(processes=n_workers, initializer=init_worker) as pool:
        for rows in pool.imap_unordered(process_huge_doc, pending, chunksize=1):
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
            n_done += 1
            if n_done % 10 == 0 or n_done == len(pending):
                el = time.time() - t0
                rate_p = n_pages / el if el else 0
                rate_d = n_done / el if el else 0
                eta = (len(pending) - n_done) / rate_d if rate_d else 0
                print(
                    f"  [{n_done}/{len(pending)}] pages={n_pages} "
                    f"draw={n_drawing} pn={n_with_pns} cust={n_with_cust} "
                    f"oom={n_render_failures} "
                    f"{rate_p:.1f}p/s {rate_d:.2f}d/s ETA={eta/60:.0f}min",
                    flush=True,
                )

    out_fh.close()
    el = time.time() - t0

    lines = [
        "# Phase 15 (huge-chunked) Summary\n",
        f"**Generated:** {time.strftime('%Y-%m-%dT%H:%M:%S%z')}",
        f"**Workers:** {n_workers}  ·  **Render scale:** {RENDER_SCALE}  ·  **Chunk size:** {CHUNK_SIZE}",
        f"**Docs processed:** {len(pending)}",
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
    print(f"\n=== Phase 15 huge-chunked done ({el/60:.1f}min) ===")
    print(f"  pages={n_pages} pn={n_with_pns} cust={n_with_cust} oom={n_render_failures}")

if __name__ == "__main__":
    main()

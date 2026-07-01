"""HMACOLOR batch extractor — U-HMT-HMACOLOR-EXTRACT.

Closes the 36-unprocessed-PDF gap from HM-TRAINING-EXHAUSTION-AUDIT-2026-05-20.
The main batch_extract.py walks 4 ROOTS that miss hyperMILL/{31,33}.0/{AddIns,
addins project}/hmAutoColor/**/*.pdf — this sidecar covers exactly that tree.

Same pattern as batch_extract.py: skip already-logged paths, dedupe by
(basename, size-kb), run extract_from_document, write doc-hmautocolor-*.json,
append extraction-log inline.

Version-prefixed doc_id (`hmac31` / `hmac33`) keeps v31 and v33 entries
distinct when basenames collide.

Run with:
    PRISM_DOCEXTRACT_OLLAMA_MODEL=qwen2.5-coder:7b \\
        H:/prism/cad-engine/.venv/Scripts/python.exe \\
        H:/prism/cad-engine/scripts/batch_extract_hmautocolor.py [--limit N] [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import pypdf

sys.path.insert(0, "H:/prism/cad-engine")
from src.document_extract import extract_from_document  # noqa: E402

ROOTS = [
    "H:/prism/Resources/OPEN MIND/hyperMILL/31.0/AddIns/hmAutoColor",
    "H:/prism/Resources/OPEN MIND/hyperMILL/31.0/addins project/hmAutoColor",
    "H:/prism/Resources/OPEN MIND/hyperMILL/33.0/AddIns/hmAutoColor",
    "H:/prism/Resources/OPEN MIND/hyperMILL/33.0/addins project/hmAutoColor",
]

EXTRACTION_LOG = "H:/prism/mcp-server/data/state/extraction-log.json"
KNOWLEDGE_DIR = "H:/prism/cad-engine/knowledge_store"


def slugify(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", name).strip("-").lower()
    return re.sub(r"-+", "-", s)[:60]


def derive_version_tag(path: str) -> str:
    p = path.replace(os.sep, "/")
    if "/hyperMILL/31.0/" in p:
        return "hmac31"
    if "/hyperMILL/33.0/" in p:
        return "hmac33"
    return "hmac"


def derive_doc_id(path: str) -> str:
    tag = derive_version_tag(path)
    stem = Path(path).stem
    return f"doc-hmautocolor-{tag}-{slugify(stem)}"


def load_extraction_log():
    with open(EXTRACTION_LOG, encoding="utf-8") as f:
        return json.load(f)


def save_extraction_log(data):
    data["lastUpdated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(EXTRACTION_LOG, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def already_extracted_paths(log_data) -> set:
    paths = set()
    for e in log_data.get("extractions", []):
        src = e.get("source")
        if src:
            paths.add(src)
    return paths


def discover_pdfs():
    results = []
    for root in ROOTS:
        if not os.path.isdir(root):
            continue
        for dp, _, fn in os.walk(root):
            for f in fn:
                if not f.lower().endswith(".pdf"):
                    continue
                full = os.path.join(dp, f).replace(os.sep, "/")
                try:
                    pages = len(pypdf.PdfReader(full).pages)
                except Exception:
                    continue
                size_kb = round(os.path.getsize(full) / 1024.0, 1)
                results.append((pages, size_kb, full))
    # Dedupe by (version_tag, basename.lower(), size_kb) — keeps v31 + v33
    # distinct when sizes/basenames otherwise match
    seen = set()
    deduped = []
    for p, kb, f in results:
        key = (derive_version_tag(f), os.path.basename(f).lower(), kb)
        if key in seen:
            continue
        seen.add(key)
        deduped.append((p, kb, f))
    deduped.sort()
    return deduped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="Cap PDFs processed (0=unlimited)")
    ap.add_argument("--dry-run", action="store_true", help="List PDFs without extracting")
    args = ap.parse_args()

    log_data = load_extraction_log()
    done_paths = already_extracted_paths(log_data)
    candidates = discover_pdfs()
    pending = [(p, kb, f) for p, kb, f in candidates if f not in done_paths]
    if args.limit > 0:
        pending = pending[: args.limit]

    total_pages = sum(p for p, _, _ in pending)
    print(f"=== HMACOLOR BATCH {time.strftime('%Y-%m-%d %H:%M:%S')} ===")
    print(f"Discovered: {len(candidates)}  Already done: {len(candidates) - len(pending)}  Pending: {len(pending)}  Pages: {total_pages}")
    print()

    if args.dry_run:
        for idx, (pages, kb, path) in enumerate(pending, start=1):
            print(f"  [{idx}] {pages:4d}p  {kb:7.1f}KB  {derive_doc_id(path)}")
            print(f"         {path}")
        return

    if not pending:
        print("Nothing to do.")
        return

    grand_t0 = time.time()
    cumulative_tips = 0
    for idx, (pages, kb, path) in enumerate(pending, start=1):
        doc_id = derive_doc_id(path)
        title = Path(path).stem
        print(f"[{idx}/{len(pending)}] {time.strftime('%H:%M:%S')} START  {pages:4d}p  {kb:7.1f}KB  {doc_id}")
        t0 = time.time()
        try:
            res = extract_from_document(file_path=path, title=title, document_id=doc_id)
        except Exception as e:
            elapsed = time.time() - t0
            print(f"            EXCEPTION after {elapsed:.0f}s: {e}")
            log_data.setdefault("extractions", []).append({
                "id": doc_id, "name": title, "source": path, "type": "pdf",
                "description": f"Extraction exception: {e}",
                "tipsGenerated": 0, "pageCount": pages, "extractor": "ollama:qwen2.5-coder:7b",
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "unit": "U-HMT-HMACOLOR-EXTRACT", "milestone": "HM-TRAINING-WIRING-PLAN-2026-05-20",
                "status": "failed",
            })
            save_extraction_log(log_data)
            continue
        elapsed = time.time() - t0
        d = res.to_dict()
        out_path = f"{KNOWLEDGE_DIR}/{doc_id}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(d["knowledge"], f, indent=2)
        s = d["knowledge"]["extraction_stats"]
        tips_n = s["tips_unique"]
        cumulative_tips += tips_n
        status = "completed" if tips_n > 0 else "completed_no_content"
        log_data.setdefault("extractions", []).append({
            "id": doc_id,
            "name": title,
            "source": path,
            "type": "pdf",
            "description": f"{tips_n} unique tribal tips extracted via Ollama qwen2.5-coder:7b",
            "tipsGenerated": tips_n,
            "pageCount": s["page_count"],
            "chunks": s["chunk_count"],
            "extractor": "ollama:qwen2.5-coder:7b",
            "knowledgePath": out_path,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "unit": "U-HMT-HMACOLOR-EXTRACT",
            "milestone": "HM-TRAINING-WIRING-PLAN-2026-05-20",
            "status": status,
        })
        save_extraction_log(log_data)
        print(f"            DONE       {elapsed:5.0f}s  tips={tips_n:4d}  errors={s['chunk_errors']}  cumulative_tips={cumulative_tips}")

    grand_elapsed = time.time() - grand_t0
    print()
    print(f"=== HMACOLOR DONE {time.strftime('%Y-%m-%d %H:%M:%S')}  total_time={grand_elapsed/60:.1f}min  cumulative_tips={cumulative_tips} ===")


if __name__ == "__main__":
    main()

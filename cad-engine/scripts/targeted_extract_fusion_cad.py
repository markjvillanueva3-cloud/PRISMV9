"""Targeted fusion-cad re-extract for U-HMT-FUSION-CAD-FIX.

The 2026-04-24 extraction of `resources/RESOURCE PDFS/FUSION CAD.pdf` (252p,
23 chunks) produced 0 tips / 0 formulas / 0 tables despite zero chunk errors
— a silent extraction failure, same class as the doc-cad-manual-en-us
silent-fail closed by U-HMT-HYPERCAD-REEXTRACT.

Re-runs extract_from_document() against the same source PDF. Overwrites the
existing log entry + knowledge_store JSON. Idempotent — only acts if the
existing entry still has tipsGenerated == 0.

Run:
  PRISM_DOCEXTRACT_OLLAMA_MODEL=qwen2.5-coder:7b \\
    H:/prism/cad-engine/.venv/Scripts/python.exe \\
    H:/prism/cad-engine/scripts/targeted_extract_fusion_cad.py
"""
from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import pypdf

sys.path.insert(0, "H:/prism/cad-engine")
from src.document_extract import extract_from_document  # noqa: E402

EXTRACTION_LOG = "H:/prism/mcp-server/data/state/extraction-log.json"
KNOWLEDGE_DIR = "H:/prism/cad-engine/knowledge_store"
MILESTONE = "HM-TRAINING-WIRING-PLAN-2026-05-20"
UNIT = "U-HMT-FUSION-CAD-FIX"
SOURCE = "H:/prism/resources/RESOURCE PDFS/FUSION CAD.pdf"
DOC_ID = "doc-fusion-cad"


def load_extraction_log():
    with open(EXTRACTION_LOG, encoding="utf-8") as f:
        return json.load(f)


def save_extraction_log(data):
    data["lastUpdated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(EXTRACTION_LOG, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def remove_existing_entry(log_data, doc_id):
    entries = log_data.get("extractions", [])
    log_data["extractions"] = [e for e in entries if e.get("id") != doc_id]


def main():
    if not os.path.isfile(SOURCE):
        print(f"SOURCE MISSING: {SOURCE}")
        sys.exit(1)

    log_data = load_extraction_log()
    existing = next(
        (e for e in log_data.get("extractions", []) if e.get("id") == DOC_ID),
        None,
    )
    if existing and existing.get("tipsGenerated", 0) > 0:
        print(f"SKIP — existing entry already has {existing['tipsGenerated']} tips")
        sys.exit(0)

    pages = len(pypdf.PdfReader(SOURCE).pages)
    size_mb = os.path.getsize(SOURCE) / (1024 * 1024)
    title = Path(SOURCE).stem
    print(f"START  {pages}p  {size_mb:.1f}MB  {DOC_ID}")
    t0 = time.time()

    try:
        res = extract_from_document(file_path=SOURCE, title=title, document_id=DOC_ID)
    except Exception as e:
        elapsed = time.time() - t0
        print(f"EXCEPTION after {elapsed:.0f}s: {e}")
        sys.exit(2)

    elapsed = time.time() - t0
    d = res.to_dict()
    out_path = f"{KNOWLEDGE_DIR}/{DOC_ID}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(d["knowledge"], f, indent=2)

    s = d["knowledge"]["extraction_stats"]
    tips_n = s.get("tips_unique", 0)
    status = "completed" if tips_n > 0 else "completed_no_content"

    remove_existing_entry(log_data, DOC_ID)
    log_data.setdefault("extractions", []).append({
        "id": DOC_ID,
        "name": title,
        "source": SOURCE,
        "type": "pdf",
        "description": f"{tips_n} unique tribal tips extracted via Ollama qwen2.5-coder:7b",
        "tipsGenerated": tips_n,
        "pageCount": s.get("page_count", pages),
        "chunks": s.get("chunk_count", 0),
        "extractor": "ollama:qwen2.5-coder:7b",
        "knowledgePath": out_path,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "unit": UNIT,
        "milestone": MILESTONE,
        "status": status,
    })
    save_extraction_log(log_data)
    print(f"DONE  {elapsed:.0f}s  tips={tips_n}  errors={s.get('chunk_errors', 0)}")


if __name__ == "__main__":
    main()

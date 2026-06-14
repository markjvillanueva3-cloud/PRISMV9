"""Targeted HM-training extraction for U-HMT-HYPERCAD-REEXTRACT + U-HMT-V31-EXTRACT.

Ships TWO units of HM-TRAINING-WIRING-PLAN-2026-05-20:

  U-HMT-HYPERCAD-REEXTRACT:
    - Re-extract Resources/OPEN MIND/doc/33.0/PDF/CAD/CAD_Manual-en-US.pdf (622p)
    - Original 2026-04-24 extraction produced 0 tips (silent fail with empty extraction_stats)
    - Bypass already-done check; overwrites old log entry + knowledge file

  U-HMT-V31-EXTRACT:
    - Extract the 8 unprocessed v31.0/33.0 PDFs from hm-extraction-coverage --json
    - Version-tag doc IDs with -vol31 / -vol33 suffix so they never collide with v33 master extracts
    - Hand-built TARGETS list (NOT discovered) so peer additions can't expand scope mid-run

Run:
  PRISM_DOCEXTRACT_OLLAMA_MODEL=qwen2.5-coder:7b \\
    H:/prism/cad-engine/.venv/Scripts/python.exe \\
    H:/prism/cad-engine/scripts/targeted_extract_hm_training.py

Idempotent: re-running re-extracts CAD_Manual + any v31 PDFs whose log entry still has
status="completed_no_content" or is missing. Already-content-rich extractions are preserved.
"""
from __future__ import annotations

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

EXTRACTION_LOG = "H:/prism/mcp-server/data/state/extraction-log.json"
KNOWLEDGE_DIR = "H:/prism/cad-engine/knowledge_store"
MILESTONE = "HM-TRAINING-WIRING-PLAN-2026-05-20"

# (source-path, doc-id, unit, force_reextract)
TARGETS = [
    # U-HMT-HYPERCAD-REEXTRACT — re-extract the 622p CAD_Manual that silent-failed 2026-04-24
    (
        "H:/prism/Resources/OPEN MIND/doc/33.0/PDF/CAD/CAD_Manual-en-US.pdf",
        "doc-cad-manual-en-us",
        "U-HMT-HYPERCAD-REEXTRACT",
        True,
    ),
    # U-HMT-V31-EXTRACT — v31.0 hyperCAD-S Manual (canonical CAD AI training source for v31)
    (
        "H:/prism/Resources/OPEN MIND/doc/31.0/PDF/hyperCAD-S/hyperCAD-S_Manual-en.pdf",
        "doc-hypercad-manual-en-vol31",
        "U-HMT-V31-EXTRACT",
        False,
    ),
    # U-HMT-V31-EXTRACT — VIRTUAL Machining Center 31.0
    (
        "H:/prism/Resources/OPEN MIND/doc/31.0/PDF/VIRTUAL Machining Center/VIRTUAL_Machining_Center_Manual-en.pdf",
        "doc-virtual-machining-center-en-vol31",
        "U-HMT-V31-EXTRACT",
        False,
    ),
    # U-HMT-V31-EXTRACT — VIRTUAL Machining Center 33.0
    (
        "H:/prism/Resources/OPEN MIND/doc/33.0/PDF/VIRTUAL Machining Center/VIRTUAL_Machining_Center_Manual-en-US.pdf",
        "doc-virtual-machining-center-en-vol33",
        "U-HMT-V31-EXTRACT",
        False,
    ),
    # U-HMT-V31-EXTRACT — hyperMILL Readme 33.0
    (
        "H:/prism/Resources/OPEN MIND/doc/33.0/Readme/hyperMILL_Readme-en-US.pdf",
        "doc-hypermill-readme-en-vol33",
        "U-HMT-V31-EXTRACT",
        False,
    ),
    # U-HMT-V31-EXTRACT — hyperCAD-S BatchConverter Readmes (31.0 + 33.0, en+de)
    (
        "H:/prism/Resources/OPEN MIND/hyperCAD-S/31.0/BatchConverter/Readme_HMC_Batch_Converter-en.pdf",
        "doc-hypercad-batchconverter-readme-en-vol31",
        "U-HMT-V31-EXTRACT",
        False,
    ),
    (
        "H:/prism/Resources/OPEN MIND/hyperCAD-S/31.0/BatchConverter/Readme_HMC_Batch_Converter-de.pdf",
        "doc-hypercad-batchconverter-readme-de-vol31",
        "U-HMT-V31-EXTRACT",
        False,
    ),
    (
        "H:/prism/Resources/OPEN MIND/hyperCAD-S/33.0/BatchConverter/Readme_HMC_Batch_Converter-en.pdf",
        "doc-hypercad-batchconverter-readme-en-vol33",
        "U-HMT-V31-EXTRACT",
        False,
    ),
    (
        "H:/prism/Resources/OPEN MIND/hyperCAD-S/33.0/BatchConverter/Readme_HMC_Batch_Converter-de.pdf",
        "doc-hypercad-batchconverter-readme-de-vol33",
        "U-HMT-V31-EXTRACT",
        False,
    ),
]


def load_extraction_log():
    with open(EXTRACTION_LOG, encoding="utf-8") as f:
        return json.load(f)


def save_extraction_log(data):
    data["lastUpdated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    with open(EXTRACTION_LOG, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def remove_existing_entry(log_data, doc_id):
    """Remove any existing extraction-log entry with the given doc_id."""
    entries = log_data.get("extractions", [])
    log_data["extractions"] = [e for e in entries if e.get("id") != doc_id]


def main():
    log_data = load_extraction_log()
    grand_t0 = time.time()
    cumulative_tips = 0

    print(f"=== TARGETED HM-TRAINING EXTRACT START {time.strftime('%Y-%m-%d %H:%M:%S')} ===")
    print(f"Targets: {len(TARGETS)}")
    print()

    for idx, (path, doc_id, unit, force) in enumerate(TARGETS, start=1):
        if not os.path.isfile(path):
            print(f"[{idx}/{len(TARGETS)}] SKIP (missing): {path}")
            continue

        # Skip non-force if already has content
        if not force:
            existing = next(
                (e for e in log_data.get("extractions", []) if e.get("id") == doc_id),
                None,
            )
            if existing and existing.get("tipsGenerated", 0) > 0:
                print(
                    f"[{idx}/{len(TARGETS)}] SKIP (already has {existing['tipsGenerated']} tips): {doc_id}"
                )
                continue

        try:
            pages = len(pypdf.PdfReader(path).pages)
        except Exception as e:
            print(f"[{idx}/{len(TARGETS)}] PDF READ ERROR: {e}")
            continue

        size_mb = os.path.getsize(path) / (1024 * 1024)
        title = Path(path).stem
        print(
            f"[{idx}/{len(TARGETS)}] {time.strftime('%H:%M:%S')} START  {pages:5d}p  {size_mb:5.1f}MB  {unit}  {doc_id}"
        )
        t0 = time.time()

        try:
            res = extract_from_document(file_path=path, title=title, document_id=doc_id)
        except Exception as e:
            elapsed = time.time() - t0
            print(f"            EXCEPTION after {elapsed:.0f}s: {e}")
            remove_existing_entry(log_data, doc_id)
            log_data.setdefault("extractions", []).append({
                "id": doc_id,
                "name": title,
                "source": path,
                "type": "pdf",
                "description": f"Extraction exception: {e}",
                "tipsGenerated": 0,
                "pageCount": pages,
                "extractor": "ollama:qwen2.5-coder:7b",
                "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "unit": unit,
                "milestone": MILESTONE,
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
        tips_n = s.get("tips_unique", 0)
        cumulative_tips += tips_n
        status = "completed" if tips_n > 0 else "completed_no_content"

        # Replace any existing entry for this doc_id
        remove_existing_entry(log_data, doc_id)
        log_data.setdefault("extractions", []).append({
            "id": doc_id,
            "name": title,
            "source": path,
            "type": "pdf",
            "description": f"{tips_n} unique tribal tips extracted via Ollama qwen2.5-coder:7b",
            "tipsGenerated": tips_n,
            "pageCount": s.get("page_count", pages),
            "chunks": s.get("chunk_count", 0),
            "extractor": "ollama:qwen2.5-coder:7b",
            "knowledgePath": out_path,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "unit": unit,
            "milestone": MILESTONE,
            "status": status,
        })
        save_extraction_log(log_data)
        print(
            f"            DONE       {elapsed:5.0f}s  tips={tips_n:4d}  errors={s.get('chunk_errors', 0)}  cumulative_tips={cumulative_tips}"
        )

    grand_elapsed = time.time() - grand_t0
    print()
    print(
        f"=== TARGETED HM-TRAINING EXTRACT DONE {time.strftime('%Y-%m-%d %H:%M:%S')}  "
        f"total_time={grand_elapsed / 60:.1f}min  cumulative_tips={cumulative_tips} ==="
    )


if __name__ == "__main__":
    main()

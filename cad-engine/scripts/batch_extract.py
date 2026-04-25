"""Master batch extraction for U-CAM59-69 PDF track.

Walks every CAM-relevant PDF (filtered by inventory_pdfs.py), skips ones already
in extraction-log.json, runs them in ascending page-count order (small first),
saves knowledge_store/<doc_id>.json + appends to extraction-log inline.

Run with:
    PRISM_DOCEXTRACT_OLLAMA_MODEL=qwen2.5-coder:7b \\
        H:/prism/cad-engine/.venv/Scripts/python.exe \\
        H:/prism/cad-engine/scripts/batch_extract.py
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

ROOTS = [
    "H:/prism/resources/OPEN MIND/doc/33.0/PDF",
    "H:/prism/resources/RESOURCE PDFS",
    "H:/prism/resources/PDF/CAM-Training-Downloaded",
    "H:/prism/resources/OPEN MIND/Shared/33.0/python/docs",
]

SKIP_PATHS = {
    # User-deferred (overnight)
    "H:/prism/resources/OPEN MIND/doc/33.0/PDF/CAM/CAM_Manual-en-US.pdf",
    # Superseded
    "H:/prism/resources/PDF/hyperMILL/hyperMILL_Manual-en.pdf",
}

KEYWORDS = (
    "hypermill", "inventorcam", "inventorhsm", "fusion", "fusion360",
    "cam_manual", "cad_manual", "automation_center", "tool_builder",
    "synchronization_tool", "virtual_machining", "virtual_tool",
    "sql_macro", "sql_tool_database",
    "cadcam_api", "py_cadcam",
    "solidcam", "edgecam", "mastercam", "esprit", "powermill",
)

SKIP_DIR_FRAGMENTS = ("/static_resources/",)

EXTRACTION_LOG = "H:/prism/mcp-server/data/state/extraction-log.json"
KNOWLEDGE_DIR = "H:/prism/cad-engine/knowledge_store"
RESOURCES_PREFIX = "H:/prism/resources/"


def slugify(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "-", name).strip("-").lower()
    return re.sub(r"-+", "-", s)[:60]


def is_cam_relevant(path: str) -> bool:
    p = path.lower()
    if any(skip in p for skip in SKIP_DIR_FRAGMENTS):
        return False
    return any(kw in os.path.basename(p) for kw in KEYWORDS)


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
                if full in SKIP_PATHS or not is_cam_relevant(full):
                    continue
                try:
                    pages = len(pypdf.PdfReader(full).pages)
                except Exception:
                    continue
                size_mb = os.path.getsize(full) / (1024 * 1024)
                results.append((pages, size_mb, full))
    seen = set()
    deduped = []
    for p, mb, f in results:
        key = (os.path.basename(f).lower(), round(mb, 1))
        if key in seen:
            continue
        seen.add(key)
        deduped.append((p, mb, f))
    deduped.sort()
    return deduped


def derive_doc_id(path: str) -> str:
    stem = Path(path).stem
    s = slugify(stem)
    if "hypermill" in s.lower():
        return f"doc-hypermill-{s}"
    if "inventorcam" in s.lower():
        return f"doc-{s}"
    return f"doc-{s}"


def derive_unit(path: str) -> str:
    name = os.path.basename(path).lower()
    if "cam_manual" in name:
        return "U-CAM59"
    if "tool_builder" in name or "tool_database" in name or "synchronization_tool" in name:
        return "U-CAM60"
    if "virtual_machining" in name or "virtual_tool" in name:
        return "U-CAM61"
    if "automation_center" in name:
        return "U-CAM62"
    if "inventorcam" in name and "2.5d" in name:
        return "U-CAM63"
    if "inventorcam" in name and ("3d_hsm" in name or "3d_hsr" in name or "pro3d" in name):
        return "U-CAM64"
    if "inventorcam" in name and "5-axis" in name:
        return "U-CAM65"
    if "inventorcam" in name and ("multiaxis" in name or "sim_5x" in name or "swarf" in name or "contour_5x" in name):
        return "U-CAM66"
    if "inventorcam" in name and "turning" in name:
        return "U-CAM67"
    if "inventorcam" in name:
        return "U-CAM68"
    if "hypermill" in name:
        return "U-CAM69"
    if "sql_macro" in name or "inventorhsm" in name:
        return "U-CAM71"
    return "U-CAM-OTHER"


def main():
    log_data = load_extraction_log()
    done_paths = already_extracted_paths(log_data)
    candidates = discover_pdfs()
    pending = [(p, mb, f) for p, mb, f in candidates if f not in done_paths]
    total_pages = sum(p for p, _, _ in pending)
    print(f"=== BATCH START {time.strftime('%Y-%m-%d %H:%M:%S')} ===")
    print(f"Total candidates: {len(candidates)}  Already done: {len(candidates) - len(pending)}  Pending: {len(pending)}  Pages: {total_pages}")
    print()
    grand_t0 = time.time()
    cumulative_tips = 0
    for idx, (pages, mb, path) in enumerate(pending, start=1):
        doc_id = derive_doc_id(path)
        unit = derive_unit(path)
        title = Path(path).stem
        short = path.replace(RESOURCES_PREFIX, "")
        print(f"[{idx}/{len(pending)}] {time.strftime('%H:%M:%S')} START  {pages:5d}p  {mb:5.1f}MB  {unit}  {short[:70]}")
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
                "unit": unit, "milestone": "CAM-EXHAUST-MS0", "status": "failed",
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
            "unit": unit,
            "milestone": "CAM-EXHAUST-MS0",
            "status": status,
        })
        save_extraction_log(log_data)
        print(f"            DONE       {elapsed:5.0f}s  tips={tips_n:4d}  errors={s['chunk_errors']}  cumulative_tips={cumulative_tips}")
    grand_elapsed = time.time() - grand_t0
    print()
    print(f"=== BATCH DONE {time.strftime('%Y-%m-%d %H:%M:%S')}  total_time={grand_elapsed/60:.1f}min  cumulative_tips={cumulative_tips} ===")


if __name__ == "__main__":
    main()

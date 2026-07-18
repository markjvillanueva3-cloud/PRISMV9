"""
OCR Tools Benchmark — runs eDOCr, PaddleOCR, MinerU, and Tesseract baseline on
the same set of blueprint pages, emits per-tool extracted-fields JSONL for
comparison.

Designed to run inside the prism-ocr-tools container with these mounts:
  /work/Docustrata    -> H:/PRISM/Docustrata (read-only)
  /work/index         -> H:/prism/Docustrata/.index (read-write)
  /root/.cache/huggingface -> persistent HF model cache

Inputs:
  /work/index/phase10-miss-sample.json  (50 part-numbers + their blueprint pages)
  /work/index/phase8-classified-pages.cleaned.jsonl  (for disk_path resolution)

Outputs:
  /work/index/phase13-ocr-tools-benchmark.jsonl
  /work/index/phase13-ocr-tools-summary.md

Usage:
  python /app/run-benchmark.py [N]    # default N=5 for smoke-test, pass 50 for full
"""
from __future__ import annotations
import json
import os
import re
import sys
import time
import traceback
from pathlib import Path
from collections import Counter

INDEX = Path("/work/index")
SAMPLE = INDEX / "phase10-miss-sample.json"
P8 = INDEX / "phase8-classified-pages.cleaned.jsonl"
OUT = INDEX / "phase13-ocr-tools-benchmark.jsonl"
SUMMARY = INDEX / "phase13-ocr-tools-summary.md"

# Convert Windows-style paths in P8 to container-mounted Linux paths
def winpath_to_container(p: str) -> str:
    if not p:
        return ""
    s = p.replace("\\", "/")
    s = re.sub(r"^[Hh]:/PRISM/", "/work/Docustrata/../Docustrata/", s)
    s = s.replace("/work/Docustrata/../Docustrata/", "/work/Docustrata/")
    return s


# Field-extraction regexes (same as Phase 10)
PART_NUMBER_RE = re.compile(r"\b([A-Z]{0,3}[-]?\d{2,8}[-A-Z0-9]{0,15})\b")
DRAWING_NUMBER_RE = re.compile(r"(?:DWG|DRAWING)\s*(?:N[O.]|#)?\s*[:.]?\s*([A-Z0-9][A-Z0-9\-/]{2,20})", re.I)
REVISION_RE = re.compile(r"\bREV(?:ISION)?\s*[:.]?\s*([A-Z0-9]{1,4})\b", re.I)
MATERIAL_RE = re.compile(r"\bMATERIAL\s*[:.]?\s*([A-Z0-9 \-,/.]{3,40})", re.I)


def extract_fields(text: str) -> dict:
    text = text or ""
    pns = list({m for m in PART_NUMBER_RE.findall(text) if len(m) >= 4})
    dwg = DRAWING_NUMBER_RE.search(text)
    rev = REVISION_RE.search(text)
    mat = MATERIAL_RE.search(text)
    return {
        "part_numbers": pns[:15],
        "drawing_number": dwg.group(1) if dwg else None,
        "revision": rev.group(1) if rev else None,
        "material": mat.group(1).strip() if mat else None,
        "ocr_chars": len(text),
    }


# ── Tool wrappers ─────────────────────────────────────────────────────────────

def render_page_png(pdf_path: str, page_index: int, scale: float = 3.0) -> bytes | None:
    """Render PDF page to PNG bytes via PyMuPDF."""
    try:
        import fitz
    except ImportError:
        return None
    try:
        with fitz.open(pdf_path) as doc:
            if page_index >= len(doc):
                return None
            pix = doc[page_index].get_pixmap(matrix=fitz.Matrix(scale, scale))
            return pix.tobytes("png")
    except Exception:
        return None


def render_page_image(pdf_path: str, page_index: int, scale: float = 3.0):
    """Return PIL.Image of the page."""
    png = render_page_png(pdf_path, page_index, scale)
    if not png:
        return None
    from PIL import Image
    import io
    return Image.open(io.BytesIO(png)).convert("RGB")


def run_tesseract(pdf_path: str, page_index: int) -> dict:
    """Baseline: Tesseract on full page (not cropped)."""
    t0 = time.time()
    try:
        import pytesseract
        img = render_page_image(pdf_path, page_index, scale=3.0)
        if img is None:
            return {"ok": False, "error": "render_failed"}
        text = pytesseract.image_to_string(img, config="--psm 6")
        return {"ok": True, "elapsed_s": round(time.time() - t0, 2),
                "fields": extract_fields(text)}
    except Exception as e:
        return {"ok": False, "elapsed_s": round(time.time() - t0, 2),
                "error": f"{type(e).__name__}: {e}"}


_PADDLE_OCR = None
def get_paddleocr():
    global _PADDLE_OCR
    if _PADDLE_OCR is None:
        from paddleocr import PaddleOCR
        _PADDLE_OCR = PaddleOCR(use_angle_cls=False, lang="en", show_log=False)
    return _PADDLE_OCR


def run_paddleocr(pdf_path: str, page_index: int) -> dict:
    t0 = time.time()
    try:
        img = render_page_image(pdf_path, page_index, scale=3.0)
        if img is None:
            return {"ok": False, "error": "render_failed"}
        import numpy as np
        arr = np.array(img)
        ocr = get_paddleocr()
        result = ocr.ocr(arr, cls=False)
        # PaddleOCR returns nested list: [[box, (text, confidence)], ...]
        lines = []
        if result and result[0]:
            for line in result[0]:
                if line and len(line) >= 2 and line[1]:
                    lines.append(line[1][0])
        text = "\n".join(lines)
        return {"ok": True, "elapsed_s": round(time.time() - t0, 2),
                "fields": extract_fields(text), "n_lines": len(lines)}
    except Exception as e:
        return {"ok": False, "elapsed_s": round(time.time() - t0, 2),
                "error": f"{type(e).__name__}: {str(e)[:300]}"}


_EDOCR_PIPELINE = None
def get_edocr():
    global _EDOCR_PIPELINE
    if _EDOCR_PIPELINE is None:
        # Try canonical eDOCr first (Pipeline class)
        try:
            from eDOCr import keras_ocr
            _EDOCR_PIPELINE = keras_ocr.pipeline.Pipeline()
        except Exception as e:
            raise RuntimeError(f"eDOCr unavailable: {e}")
    return _EDOCR_PIPELINE


def run_edocr(pdf_path: str, page_index: int) -> dict:
    t0 = time.time()
    try:
        img = render_page_image(pdf_path, page_index, scale=3.0)
        if img is None:
            return {"ok": False, "error": "render_failed"}
        import numpy as np
        arr = np.array(img)
        pipe = get_edocr()
        # keras-ocr pipeline returns list of (text, box) per image
        predictions = pipe.recognize([arr])
        text_tokens = [t for t, _box in predictions[0]]
        text = " ".join(text_tokens)
        return {"ok": True, "elapsed_s": round(time.time() - t0, 2),
                "fields": extract_fields(text), "n_tokens": len(text_tokens)}
    except Exception as e:
        return {"ok": False, "elapsed_s": round(time.time() - t0, 2),
                "error": f"{type(e).__name__}: {str(e)[:300]}"}


def run_mineru(pdf_path: str, page_index: int) -> dict:
    """MinerU pipeline backend on the specific page."""
    t0 = time.time()
    work_out = Path(f"/tmp/mineru-out/{Path(pdf_path).stem}_{page_index}")
    work_out.mkdir(parents=True, exist_ok=True)
    try:
        import subprocess
        proc = subprocess.run([
            "mineru", "-p", pdf_path, "-o", str(work_out),
            "-b", "pipeline",
            "-s", str(page_index), "-e", str(page_index),
            "-l", "en",
        ], capture_output=True, timeout=120)
        if proc.returncode != 0:
            return {"ok": False, "elapsed_s": round(time.time() - t0, 2),
                    "stderr": proc.stderr.decode("utf-8", errors="replace")[:600]}
        # Find produced .md
        stem = Path(pdf_path).stem
        md_files = sorted(work_out.glob(f"**/{stem}*.md"))
        text = ""
        if md_files:
            text = md_files[0].read_text(encoding="utf-8", errors="replace")
        return {"ok": True, "elapsed_s": round(time.time() - t0, 2),
                "fields": extract_fields(text), "md_chars": len(text)}
    except Exception as e:
        return {"ok": False, "elapsed_s": round(time.time() - t0, 2),
                "error": f"{type(e).__name__}: {str(e)[:300]}"}


# ── Main orchestrator ─────────────────────────────────────────────────────────

def build_disk_path_map() -> dict[str, str]:
    """doc_id -> /work/Docustrata/... path"""
    m: dict[str, str] = {}
    with P8.open(encoding="utf-8") as f:
        for ln in f:
            try:
                r = json.loads(ln)
                if r.get("doc_id") and r.get("disk_path"):
                    m[r["doc_id"]] = winpath_to_container(r["disk_path"])
            except json.JSONDecodeError:
                continue
    return m


def main():
    n_limit = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    print(f"[phase13] target N={n_limit} per tool", flush=True)

    sample = json.loads(SAMPLE.read_text(encoding="utf-8"))[:n_limit]
    disk_map = build_disk_path_map()
    print(f"[phase13] loaded {len(sample)} sample PNs, {len(disk_map)} disk_path entries", flush=True)

    out_fh = OUT.open("w", encoding="utf-8")
    tool_stats = {t: {"ok": 0, "fail": 0, "elapsed_total": 0.0,
                      "new_pns": 0, "drawing_no": 0, "rev": 0, "mat": 0}
                  for t in ("tesseract", "paddleocr", "edocr", "mineru")}

    t_start = time.time()
    for i, row in enumerate(sample, 1):
        pn = row["part_number"]
        bp = row["blueprints"][0]
        doc_id = bp["doc_id"]
        page_idx = bp["page_index"]
        disk_path = disk_map.get(doc_id)
        if not disk_path or not Path(disk_path).exists():
            print(f"  [{i}/{len(sample)}] {pn}: SKIP (no disk_path: {disk_path})", flush=True)
            continue

        print(f"\n[{i}/{len(sample)}] PN={pn} doc={Path(disk_path).name} page={page_idx}", flush=True)
        per_tool = {}
        for tool, fn in [("tesseract", run_tesseract),
                          ("paddleocr", run_paddleocr),
                          ("edocr", run_edocr),
                          ("mineru", run_mineru)]:
            r = fn(disk_path, page_idx)
            per_tool[tool] = r
            stats = tool_stats[tool]
            stats["elapsed_total"] += r.get("elapsed_s", 0)
            if r.get("ok"):
                stats["ok"] += 1
                f = r.get("fields") or {}
                stats["new_pns"] += len(f.get("part_numbers") or [])
                if f.get("drawing_number"): stats["drawing_no"] += 1
                if f.get("revision"): stats["rev"] += 1
                if f.get("material"): stats["mat"] += 1
                pns = ",".join((f.get("part_numbers") or [])[:5])
                print(f"  {tool:>10}: ok ({r['elapsed_s']:.1f}s) pns=[{pns}] dwg={f.get('drawing_number')} rev={f.get('revision')}", flush=True)
            else:
                stats["fail"] += 1
                err = r.get("error") or r.get("stderr","")[:120]
                print(f"  {tool:>10}: FAIL ({r.get('elapsed_s','?')}s) {err}", flush=True)

        out_row = {
            "part_number": pn,
            "doc_id": doc_id,
            "page_index": page_idx,
            "disk_path": disk_path,
            "results": per_tool,
        }
        out_fh.write(json.dumps(out_row, ensure_ascii=False) + "\n")
        out_fh.flush()

    out_fh.close()
    total = time.time() - t_start

    # Summary
    lines = []
    lines.append("# Phase 13 — OCR Tools Benchmark (Docker container)\n")
    lines.append(f"**Generated:** {time.strftime('%Y-%m-%dT%H:%M:%S%z')}")
    lines.append(f"**Sample size:** {len(sample)} part-numbers")
    lines.append(f"**Container:** prism-ocr-tools (Linux + Python 3.11 + GPU)")
    lines.append(f"**Total runtime:** {total:.0f}s\n")

    lines.append("## Per-tool results\n")
    lines.append("| tool | ok | fail | avg s/page | total PNs found | dwg# | rev | mat |")
    lines.append("|---|---|---|---|---|---|---|---|")
    for t, s in tool_stats.items():
        avg = s["elapsed_total"] / max(s["ok"], 1)
        lines.append(f"| {t} | {s['ok']} | {s['fail']} | {avg:.1f} | {s['new_pns']} | {s['drawing_no']} | {s['rev']} | {s['mat']} |")
    lines.append("")
    lines.append("## Decision criteria")
    lines.append("- **Production tier-2.5 candidate**: any tool with ok-rate > 80% AND drawing-number recall > 30%.")
    lines.append("- **Compare to Phase 8 Tesseract baseline**: included as 'tesseract' row above; new tool must beat it on at least one of {drawing#, revision, material} recall.")

    SUMMARY.write_text("\n".join(lines), encoding="utf-8")
    print(f"\n=== Phase 13 done ({total:.0f}s) ===")
    for t, s in tool_stats.items():
        print(f"  {t:>10}: ok={s['ok']} fail={s['fail']} avg={s['elapsed_total']/max(s['ok'],1):.1f}s")


if __name__ == "__main__":
    main()

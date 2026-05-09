"""
Phase 8 — Tier 3 vision LLM classifier (Gemini 2.5 Pro).

Sibling of phase8-tiered-blueprint-classifier.py. Tier 3 was originally
DEFERRED in the tiered pipeline ("flagged in output for later batch processing
once Ollama vision is back"). Now that we are paying for Gemini Pro and using
gemini-2.5-pro for the scrutiny long-context arm, the same model is the right
fit for the ~24K Docustrata multi-page PDFs whose Tier-1/Tier-2 verdicts are
ambiguous: Tier 1 score in the 0.3-0.6 grey zone, OR Tier 2 produced no strong
title-block hit but tier1 still suggested drawing.

Read input  : phase8-classified-pages.jsonl (output of the tiered classifier)
Filter rule : tier1_score in [0.3, 0.6] OR (tier1 >= 0.3 AND no strong tier2 indicator)
Output      : phase8-tier3-gemini-results.jsonl  (resumable — append-only)

Resume mode (default): skip rows already present in the output JSONL.

Cost / rate-limit notes:
  - Each call ships a single page rendered at 1.5x as PNG (~150-400 KB).
  - gemini-2.5-pro free tier permits ~2 RPM, paid tier ~360 RPM. Sleep is
    governed by GEMINI_REQUEST_INTERVAL_SEC (env, default 0.5s).
  - Batch size cap GEMINI_MAX_PAGES (env, default 200). Run repeatedly to
    drain the queue without flooding the API.

Sample mode :  python phase8-tier3-gemini-vision.py 5  --> only first 5 hits.
"""
from __future__ import annotations
import io
import json
import os
import sys
import time
from pathlib import Path

import fitz
from PIL import Image

try:
    import google.generativeai as genai
except ImportError:
    print("[fatal] google-generativeai not installed. Run: pip install google-generativeai", file=sys.stderr)
    sys.exit(2)

INDEX = Path(r"H:\PRISM\Docustrata\.index")
CLASSIFIED = INDEX / "phase8-classified-pages.jsonl"
OUT = INDEX / "phase8-tier3-gemini-results.jsonl"

API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
if not API_KEY:
    print("[fatal] GEMINI_API_KEY (or GOOGLE_API_KEY) not set in environment", file=sys.stderr)
    sys.exit(2)

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-pro")
REQUEST_INTERVAL_SEC = float(os.environ.get("GEMINI_REQUEST_INTERVAL_SEC", "0.5"))
MAX_PAGES = int(os.environ.get("GEMINI_MAX_PAGES", "200"))

# Filter thresholds — match what the tiered classifier writes.
T1_GREY_ZONE = (0.30, 0.60)
T1_MIN_FOR_NULL_T2 = 0.30

PROMPT = (
    "You are a strict mechanical-engineering drawing classifier. "
    "Given the rendered page image, decide whether this page is an engineering "
    "drawing (mechanical part print, assembly drawing, weldment, or sheet-metal "
    "flat) — NOT a quote, PO, packing slip, certificate, photograph, or "
    "process-routing sheet. Respond with EXACTLY this JSON on a single line:\n"
    '{"is_drawing": true|false, "confidence": 0.0-1.0, "drawing_kind": '
    '"part_print|assembly|weldment|sheet_metal_flat|other|none", '
    '"part_number": "<extracted or null>", "title": "<from title block or null>", '
    '"notes": "<<=140 chars: anything noteworthy>"}'
)


def load_already_done(path: Path) -> set[tuple[str, int]]:
    """Read existing OUT to support --resume on rerun."""
    done: set[tuple[str, int]] = set()
    if not path.exists():
        return done
    with path.open("r", encoding="utf-8") as fh:
        for line in fh:
            try:
                row = json.loads(line)
                done.add((row["pdf_path"], row["page_index"]))
            except (json.JSONDecodeError, KeyError):
                continue
    return done


def needs_tier3(row: dict) -> bool:
    """Match the filter rule documented at the top of the file."""
    t1 = row.get("tier1_score")
    if t1 is None:
        return False
    if T1_GREY_ZONE[0] <= t1 <= T1_GREY_ZONE[1]:
        return True
    if t1 >= T1_MIN_FOR_NULL_T2 and not row.get("tier2_strong_indicators"):
        return True
    return False


def render_page_png(pdf_path: str, page_index: int) -> bytes:
    """Render one PDF page to PNG bytes at 1.5x for vision input."""
    doc = fitz.open(pdf_path)
    try:
        page = doc.load_page(page_index)
        pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
        buf = io.BytesIO()
        Image.frombytes("RGB", (pix.width, pix.height), pix.samples).save(buf, format="PNG", optimize=True)
        return buf.getvalue()
    finally:
        doc.close()


def classify_with_gemini(model, pdf_path: str, page_index: int) -> dict:
    png = render_page_png(pdf_path, page_index)
    response = model.generate_content([PROMPT, {"mime_type": "image/png", "data": png}])
    raw = (response.text or "").strip()
    try:
        parsed = json.loads(raw.splitlines()[0])
    except (json.JSONDecodeError, IndexError):
        parsed = {"is_drawing": False, "confidence": 0.0, "parse_error": True, "raw": raw[:240]}
    return parsed


def main() -> int:
    sample = None
    if len(sys.argv) > 1:
        try:
            sample = int(sys.argv[1])
        except ValueError:
            print(f"[fatal] sample arg must be int, got: {sys.argv[1]!r}", file=sys.stderr)
            return 2

    if not CLASSIFIED.exists():
        print(f"[fatal] {CLASSIFIED} missing — run phase8-tiered-blueprint-classifier.py first", file=sys.stderr)
        return 2

    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel(GEMINI_MODEL)
    done = load_already_done(OUT)

    queued = []
    with CLASSIFIED.open("r", encoding="utf-8") as fh:
        for line in fh:
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            key = (row.get("pdf_path"), row.get("page_index"))
            if key in done or None in key:
                continue
            if needs_tier3(row):
                queued.append(row)
                if sample is not None and len(queued) >= sample:
                    break
                if len(queued) >= MAX_PAGES:
                    break

    print(f"[tier3] queued {len(queued)} pages (skipped {len(done)} already classified)")

    written = 0
    with OUT.open("a", encoding="utf-8") as out_fh:
        for i, row in enumerate(queued, start=1):
            pdf_path = row["pdf_path"]
            page_index = row["page_index"]
            t0 = time.time()
            try:
                verdict = classify_with_gemini(model, pdf_path, page_index)
                err = None
            except (OSError, ValueError, RuntimeError) as e:
                verdict = None
                err = f"{type(e).__name__}: {e}"
            record = {
                "pdf_path": pdf_path,
                "page_index": page_index,
                "tier1_score": row.get("tier1_score"),
                "tier2_strong_indicators": row.get("tier2_strong_indicators", []),
                "gemini_verdict": verdict,
                "error": err,
                "elapsed_sec": round(time.time() - t0, 2),
                "model": GEMINI_MODEL,
            }
            out_fh.write(json.dumps(record) + "\n")
            out_fh.flush()
            written += 1
            if i % 10 == 0 or i == len(queued):
                print(f"[tier3] {i}/{len(queued)} (last: {Path(pdf_path).name} p{page_index} -> {verdict})")
            if i < len(queued):
                time.sleep(REQUEST_INTERVAL_SEC)

    print(f"[tier3] wrote {written} records to {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

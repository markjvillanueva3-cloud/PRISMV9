---
type: "chat-session"
source: "claude-code-cli"
session_id: "571d4bdd-5118-4307-b29c-fa75fed32e14"
title: "Per-file scrutiny — review `H:\\prism\\scripts\\blueprint-extract-sidecar.py` end-t"
date: "2026-05-19"
first_ts: "2026-05-19T04:07:35.399Z"
last_ts: "2026-05-19T04:08:18.088Z"
cwd: "H:\\prism"
messages: 4
user_msgs: 2
assistant_msgs: 2
raw_file: "H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-a6527a3274a56be5b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Per-file scrutiny — review `H:\prism\scripts\blueprint-extract-sidecar.py` end-t

> **claude-code-cli** | 2026-05-19 | 4 msgs (2 user / 2 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/571d4bdd-5118-4307-b29c-fa75fed32e14/subagents/agent-a6527a3274a56be5b.jsonl`

## Transcript

### User | 2026-05-19T04:07:35.399Z

Per-file scrutiny — review `H:\prism\scripts\blueprint-extract-sidecar.py` end-to-end (read the WHOLE file, not split sections).

Context — this is U-TDP07 (BLUEPRINT-OCR-TRAINING-MS2): a Python sidecar invoked one-shot from node to extract text tokens + render PNG b64 from a blueprint PDF for the OCR pipeline. The corpus is 76k JM Die PDFs that turned out to be 98% raster (image-wrapped). The node parent (not yet written) will use the returned tokens for the 2% vector case and the png_b64 for the dominant 98% raster case as a Qwen2.5-VL VLM input.

Spec/contract (must hold):
- stdin: JSON `{pdf_path: str, dpi?: int=180, max_pages?: int=4, skip_raster_when_vector?: bool=true}`
- stdout (when input is well-formed, even if PDF is broken): JSON `{ok, page_count, pages:[{page,width_px,height_px,text_word_count,is_vector_text,tokens:[...],png_b64}], stats:{vector_pages,raster_pages,total_pages}, warnings:[...]}`
- Exit 2 + stderr on bad stdin / missing pdf_path / PyMuPDF import failure
- Exit 0 with ok:false JSON for a corrupt PDF (NOT a thrown exception escaping)
- Bounded: dpi ≤ 300, max_pages capped by MAX_PAGES_HARD=12, raster downscaled to MAX_LONGEST_PX=2400
- No filesystem writes
- Fail-loud R12: PDF open failure surfaces a warning entry, doesn't get silently treated as "0 pages"

Specific issues to flag (P0=ship-blocker, P1=must-fix, P2=defer):
1. Does `_render_page_png_b64` return a tuple `(b64,w,h)` on success but a single `None` on `except`? Look at the failure path — `return None, 0, 0` would be a 3-tuple, but if the import or get_pixmap throws, what does it return? Check this VERY carefully.
2. Does the caller-supplied `max_pages` of e.g. 100 get clamped to 12, with a warning emitted? Does the warning text actually surface to the caller? (It uses `caller_max` not `req.get("max_pages")` for the cap warning.)
3. ReDoS / security: are tokens, paths, or text fields ever passed unescaped to a shell or another subprocess?
4. Does `is_vector_text` get computed BEFO
... [+638 chars truncated]

### Assistant | 2026-05-19T04:07:46.791Z

[tool_use: Read]

### User | 2026-05-19T04:07:53.745Z

[tool_result] 1	#!/usr/bin/env python
2	# scripts/blueprint-extract-sidecar.py
3	#
4	# U-TDP07 - Python sidecar for blueprint PDF extraction.
5	#
6	# Single-shot CLI invoked by node from blueprint-extract-io.mjs. PyMuPDF
7	# (fitz) handles BOTH:
8	#   - vector-text extraction with bounding boxes (page.get_text("words"))
9	#   - raster rendering of each page (page.get_pixmap) for VLM input
10	#
11	# Why a Python
... [+8038 chars truncated]

### Assistant | 2026-05-19T04:08:18.088Z

## Per-file Scrutiny — `blueprint-extract-sidecar.py`

### P0 — none

### P1
1. **`_render_page_png_b64` failure-path return is fine, BUT the docstring lies** (lines 113-130). Docstring says "Returns None on failure" — the actual return is the 3-tuple `(None, 0, 0)`. The caller (line 196) tuple-unpacks `png_b64, w_px, h_px = _render_page_png_b64(...)` and then checks `if png_b64 is None` (line 197). That works correctly because element 0 IS `None`. **No bug, but docstring is misleading** — fix to "Returns (None, 0, 0) on failure" so future callers don't assume scalar-None.

2. **`page_count_actual == 0` cascade** — `n_to_walk = min(0, max_pages) = 0`, the for-loop is skipped, `pages_out=[]`, `vector_pages=raster_pages=0`. Stats serialize cleanly, **but** `ok:True` is emitted with `page_count:0` and an EMPTY warnings list. R12 fail-loud says: a zero-page PDF should surface a warning (`"pdf-has-zero-pages"`). Today the caller cannot distinguish "valid empty PDF" from "successfully extracted nothing meaningful." **Fix:** add `if page_count_actual == 0: warnings.append("pdf-has-zero-pages")` after line 178.

3. **`page_count_actual` not defended against PyMuPDF returning non-int / property failure** (line 178). If `doc.page_count` raises (rare but documented for encrypted PDFs that opened but won't enumerate), the whole `try` block is unprotected — exception escapes to runtime, exit nonzero with no stdout JSON, violates the "exit 0 with ok:false on corrupt PDF" contract. **Fix:** wrap `page_count_actual = doc.page_count` in try/except → emit ok:false JSON with `"page-count-failed"` warning.

### P2
4. **`import fitz` inside `_render_page_png_b64`** (line 123) — re-imports per call, but Python caches in `sys.modules` so it's ~free after the first call. Cosmetic. Move to top-level alongside the main-block import for clarity.

5. **`caller_max` warning surfaces correctly** (line 181 uses `max_pages`, the clamped value, but the warning text reports `page_count_actual` vs `m
... [+924 chars truncated]

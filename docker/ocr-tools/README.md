# PRISM OCR Tools Container

Linux + Python 3.11 + GPU container hosting the OCR stacks that wouldn't run on the host's portable Python 3.13: **eDOCr**, **PaddleOCR**, **MinerU**, plus a Tesseract baseline.

## Why a container?

Three independent failures on the host env:
- eDOCr → needs MSVC compiler for `editdistance` C extension
- PaddleOCR → needs Rust for `python-bidi`; paddlepaddle CUDA libs collide with torch
- MinerU pipeline backend → torch C++ crash inside subprocess (+ pagefile mmap on safetensors)

All three install cleanly on `python:3.11-slim-bookworm` with prebuilt wheels.

## What's inside

| Layer | Contents |
|---|---|
| Base | `nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04` (matches host driver/CUDA) |
| System | tesseract-ocr, poppler-utils, build-essential, libgl1, libglib2.0-0 |
| Common ML | numpy<2, pillow, pymupdf, pytesseract, shapely, pyclipper, rapidfuzz |
| PaddleOCR | paddlepaddle-gpu 3.0.0b1 (cu126) + paddleocr 2.7.3 (with CPU fallback) |
| MinerU | mineru[core] 3.1.x — uses pre-downloaded HF model cache |
| eDOCr | eDOCr canonical (keras-ocr based, pulls in TensorFlow) |
| App | `/app/run-benchmark.py` — orchestrator |

## Build

```powershell
cd H:/prism/docker/ocr-tools
docker compose build
```

First build is **slow** (~10-15 min) — downloads CUDA base layer (~2 GB), paddlepaddle-gpu (~700 MB), tensorflow (~600 MB). Subsequent builds are fast (cached layers).

## Run

### Smoke test (5 PDFs)
```powershell
docker compose run --rm ocr-tools
```

### Full benchmark (50 PDFs from miss subset)
```powershell
docker compose run --rm ocr-tools python /app/run-benchmark.py 50
```

## Volume layout

| Container path | Host path | Mode |
|---|---|---|
| `/work/Docustrata` | `H:/PRISM/Docustrata` | read-only (PDFs) |
| `/work/index` | `H:/prism/Docustrata/.index` | read-write (JSONL outputs) |
| `/root/.cache/huggingface` | `C:/Users/wompu/.cache/huggingface` | read-write (model cache) |

The container reads `phase10-miss-sample.json` from `/work/index/` and writes `phase13-ocr-tools-benchmark.jsonl` + `phase13-ocr-tools-summary.md` back to the same dir.

## Output schema

`phase13-ocr-tools-benchmark.jsonl` — one row per (PN, page) attempt:

```json
{
  "part_number": "M6103-02",
  "doc_id": "...",
  "page_index": 8,
  "disk_path": "/work/Docustrata/...",
  "results": {
    "tesseract": {"ok": true, "elapsed_s": 1.2, "fields": {...}},
    "paddleocr": {"ok": true, "elapsed_s": 0.8, "fields": {...}},
    "edocr":     {"ok": true, "elapsed_s": 2.4, "fields": {...}},
    "mineru":    {"ok": true, "elapsed_s": 3.1, "fields": {...}}
  }
}
```

`fields` uses the same schema as Phase 8/10/11 — `part_numbers[]`, `drawing_number`, `revision`, `material`.

## Decision criteria

A tool earns Phase-9 Tier-2.5 wiring if:
- ok-rate > 80% over the 50-PDF sample, AND
- recalls drawing-number on > 30% of pages, OR finds ≥ 2 new clean part-numbers per page on average vs the Tesseract baseline

If no tool clears the bar, the OCR enhancement track is genuinely exhausted — accept v3 (24.6% match rate) as the production join, ship.

## Cleanup

```powershell
docker compose down
docker rmi prism-ocr-tools:latest
```

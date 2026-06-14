---
name: reference-open-source-vision-options-2026-05-27
description: POINTER ONLY — full how-to + ranked candidates moved to wiki [[open-source-vision-options-for-blueprint-ocr]] per delta convention. Quick fact — Qwen2.5-VL-7B via Ollama is the canonical free Claude-Vision replacement; pull `ollama pull qwen2.5vl:7b`.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.240Z
aliases: reference_open_source_vision_options_2026_05_27
---


# Open-source vision/OCR alternatives to Claude Vision API

**Context:** Operator directive 2026-05-27 — find free alternatives to Claude Vision so PRISM can scale blueprint OCR + dimension extraction without per-page API costs. PRISM's current `BlueprintVisionOCREngine.ts` uses Claude Vision; this memory documents the open-source replacement options.

## Current state of the host (DESKTOP-N7MI1VB)

- **Tesseract:** NOT installed (`where tesseract` → not found)
- **Ollama models pulled:** `qwen2.5-coder:7b`, `mistral:7b`, `codellama:7b`, `qwen2.5-coder:3b`, `nomic-embed-text` — **NO vision models**
- **Ollama vision pull needed:** `ollama pull qwen2.5vl:7b` (or `llava:7b` for smaller footprint)
- **GPU:** verify with `nvidia-smi` before committing to 7B+ VLM

## Ranked candidates (best → fallback)

### 1. Qwen2.5-VL-7B — best accuracy ceiling

- **Why:** Top-tier on OCRBench_v2 + DocVQA. Built-in bounding-box + point-detection output. Handles complex blueprints that mix dimensions + diagrams + callouts. Spatial reasoning (associates dim values with features).
- **Hardware:** 7B → 13.17 GB VRAM (BF16) or 5.75 GB (3B variant). RTX 4090 (24GB) runs 7B comfortably.
- **Install:** `ollama pull qwen2.5vl:7b` — runs alongside existing Ollama infra at `http://localhost:11434`.
- **Accuracy benchmark:** ~75% JSON-extraction accuracy on 1,000-doc test (matches GPT-4o per GetOmni 2026-05 benchmark).
- **Tradeoff:** GPU-bound, slower than Tesseract for pure text OCR, but vastly better for blueprints w/ mixed text+graphic.
- **Source:** [Modal 8 Top OCR Models](https://modal.com/blog/8-top-open-source-ocr-models-compared), [GetOmni Benchmark](https://getomni.ai/blog/benchmarking-open-source-models-for-ocr)

### 2. PaddleOCR / PaddleOCR-VL-0.9B — best for layout + structured docs on modest hardware

- **Why:** PP-StructureV3 does table recognition, formulas, handwriting. Bounding-box precision is excellent. Multi-lingual (109 languages).
- **Hardware:** PaddleOCR-VL is only 0.9B params — runs on CPU acceptably, GPU-accelerated.
- **Install:** `pip install paddleocr paddlepaddle` (or `paddlepaddle-gpu` for CUDA).
- **Best use:** As the text+bbox detection layer BEFORE a VLM does semantic linking. Hybrid stack.
- **Source:** [Unstract OCR survey](https://unstract.com/blog/best-opensource-ocr-tools/)

### 3. docTR — best for clean field-level extraction + precise bboxes

- **Why:** 2-stage detector → recognizer. Strong on dense visually-complex pages. Bounding-box precision critical for dim-to-leader-line association.
- **Hardware:** GPU recommended; runs on CPU slower.
- **Install:** `pip install python-doctr[torch]`
- **Tradeoff:** Mindee-led; can require fine-tuning for specific domains. Significant engineering overhead.
- **Source:** [E2E Networks 7 Best OCR](https://www.e2enetworks.com/blog/complete-guide-open-source-ocr-models-2025)

### 4. olmOCR-2 — open-source SOTA (Oct 2025)

- **Why:** Allen Institute model built on Qwen2.5-VL-7B-Instruct, fine-tuned for OCR. Scored 82.4 ± 1.1 on olmOCR-Bench (top of leaderboard). Fully open data/models/code.
- **Hardware:** ~7B params, same VRAM as Qwen2.5-VL-7B.
- **Install:** `pip install olmocr` (or HuggingFace transformers).
- **Best use:** If you want a Qwen2.5-VL but pre-tuned for documents specifically.

### 5. DeepSeek-OCR — fastest VLM via token compression

- **Why:** Innovative token-compression for visual tokens — much faster inference. Good for high-throughput.
- **Hardware:** ~3B params. Lower VRAM than Qwen.
- **Install:** Via vLLM or transformers. Works in serverless GPU.
- **Best use:** Volume processing; if we need to scan 100K+ blueprints, this is the throughput candidate.

### 6. Nanonets OCR2 — Qwen2.5-VL-3B fine-tune for structured markdown

- **Why:** Specifically trained for "documents → LLM-ready markdown" with semantic tagging.
- **Hardware:** 4B params total. Runs on RTX 4060+.
- **Source:** Released Oct 2025.

### 7. Surya — strong layout-aware OCR (used inside Marker)

- **Why:** OCR + layout + reading-order in one. Marker (PDF→markdown) uses Surya as its OCR backbone.
- **Hardware:** GPU recommended.
- **Install:** `pip install surya-ocr`

### 8. Tesseract — classic fallback

- **Why:** Battle-tested, CPU-only, fast. Works on scanned PDFs after preprocessing.
- **Hardware:** CPU.
- **Install:** Windows: install via [UB-Mannheim build](https://github.com/UB-Mannheim/tesseract/wiki) → `tesseract.exe` to PATH. Python: `pip install pytesseract`.
- **Tradeoff:** Poor on handwriting, distorted scans, technical symbols (Ø, ±, GD&T frames). Best as the FALLBACK when VLM unavailable.

## Recommended PRISM architecture (replaces Claude Vision)

```
┌────────────────┐
│  Blueprint PDF │
└───────┬────────┘
        ▼
┌────────────────────┐
│ pypdf text extract │ ← Tier 1: text-PDF → existing blueprint-pmi-extract.py
└───────┬────────────┘
        │ if text-extractable: STOP, output PMI
        │ if scanned (chars/page < 50):
        ▼
┌────────────────────┐
│ OpenCV preprocess  │ deskew, denoise, line/arrow detect
└───────┬────────────┘
        ▼
┌────────────────────┐
│ PaddleOCR + bbox   │ ← Tier 2: text + bbox layer (lightweight, fast)
└───────┬────────────┘
        │ feeds dimensions w/ pixel coords
        ▼
┌────────────────────┐
│ Qwen2.5-VL-7B      │ ← Tier 3: semantic linking (dim→feature, GD&T datums)
│ (Ollama local)     │   replaces Claude Vision
└───────┬────────────┘
        ▼
┌────────────────────┐
│ structured PMI JSON │ → matches existing BlueprintOCREngine schema
└────────────────────┘
```

## Hybrid (most cost-effective)

- **Tier 1 (90% of vector PDFs):** pypdf text extract — already shipped, $0
- **Tier 2 (text-PDFs with poor layout):** Tesseract OR PaddleOCR — $0, CPU
- **Tier 3 (scanned + complex):** Qwen2.5-VL-7B via Ollama — $0 (GPU electricity), local
- **Tier 4 (last resort):** Claude Vision API — $$ per image, network-required

## Concrete next builds

1. **Ollama vision bridge** — `scripts/blueprint-ollama-vision-extract.py` that calls Ollama at `http://localhost:11434/api/generate` with a vision model. Stub the call shape; works once `ollama pull qwen2.5vl:7b` runs.
2. **Tesseract bridge** — `scripts/blueprint-tesseract-extract.py` for the CPU-only path. Detect `tesseract.exe` on PATH; install instructions in the README if missing.
3. **PaddleOCR bridge** — heavier install, lower priority.

## Sources

- [Best Open Source OCR Tools & Models for Developers in 2026 (Unstract)](https://unstract.com/blog/best-opensource-ocr-tools/)
- [8 Top Open-Source OCR Models Compared (Modal)](https://modal.com/blog/8-top-open-source-ocr-models-compared)
- [7 Best Open-Source OCR Models 2025: Benchmarks & Cost Comparison (E2E Networks)](https://www.e2enetworks.com/blog/complete-guide-open-source-ocr-models-2025)
- [The best open source OCR models (GetOmni benchmark)](https://getomni.ai/blog/benchmarking-open-source-models-for-ocr)
- [Top 7 Open source OCR tools you need to know (Mindee)](https://www.mindee.com/blog/top-open-source-ocr-tools)
- [Top 7 Open Source OCR Models (KDnuggets)](https://www.kdnuggets.com/top-7-open-source-ocr-models)
- [The Best Open-Source and Open-Weight AI Models for OCR (MerginIT)](https://merginit.com/blog/15072025-best-ocr-ai-models)
- [Open Source Vision Models in Production (Medium AI by Design)](https://medium.com/ai-by-design/open-source-vision-models-in-production-91531fc51d41)
- [UB-Mannheim Tesseract Windows builds](https://github.com/UB-Mannheim/tesseract/wiki)

## Cross-refs

- [[reference_blueprint_ocr_cad_reading_atlas_2026_05_27]] — fleet atlas (built today by mike)
- [[reference_cam_corpus_locations]] — CAM corpus map (kilo)
- [[feedback_use_lima_pypdf_page_extractor]] — canonical text-PDF extractor

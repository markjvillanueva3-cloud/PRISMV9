---
type: "chat-session"
source: "claude-code-cli"
session_id: "32a39c0c-ec85-4b35-bb0c-265f75d8b968"
title: "Web research task. I need a current (2026) state-of-the-art survey of the best o"
date: "2026-05-16"
first_ts: "2026-05-16T04:12:29.206Z"
last_ts: "2026-05-16T04:14:27.797Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-ae3980bb0a9a61249.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Web research task. I need a current (2026) state-of-the-art survey of the best o

> **claude-code-cli** | 2026-05-16 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/32a39c0c-ec85-4b35-bb0c-265f75d8b968/subagents/agent-ae3980bb0a9a61249.jsonl`

## Transcript

### User | 2026-05-16T04:12:29.206Z

Web research task. I need a current (2026) state-of-the-art survey of the best open-source / self-hostable tools for reading **engineering drawings / mechanical prints / scanned manufacturing blueprints** — extracting title-block fields (part no, revision, material, scale), dimensions, GD&T callouts, and general document text/layout — to combine the best of them into a GPU-accelerated pipeline. The target hardware is one NVIDIA RTX 4080 SUPER (16GB VRAM) + multi-core CPU + Docker, processing ~215,000 scanned PDFs (many are multi-page container scans).

Use WebSearch/WebFetch. Cover these and find any newer/better ones (search for 2025-2026 releases and benchmarks):

- **General doc OCR / layout**: PaddleOCR 3.x (PP-StructureV3), Surya, docTR, Tesseract 5, RapidOCR
- **Document→Markdown/structured converters**: MinerU (2.x), Marker, Docling (IBM), olmOCR (AllenAI), Nougat
- **OCR-free vision LLMs for documents**: GOT-OCR2.0, Qwen2.5-VL (3B/7B/72B), InternVL2.5/3, MiniCPM-V 2.6, dots.ocr, Granite-Docling, Llama-3.2-Vision
- **Engineering-drawing-specific**: eDOCr / eDOCr2, any GD&T / title-block / mechanical-drawing dimension-extraction projects on GitHub (search "engineering drawing OCR github", "GD&T extraction deep learning", "title block detection", "mechanical drawing dimension recognition 2026")

For each relevant tool report: (a) what it's best at for THIS use case, (b) license (must be self-hostable; flag non-commercial), (c) GPU/VRAM needs + whether it fits 16GB, (d) approx throughput, (e) maturity/last-release, (f) how it'd slot into a multi-stage pipeline (fast-filter vs deep-extract vs vision-fallback). Explicitly recommend a **best-of-breed combination**: which tool for the cheap page-classification filter, which for bulk title-block/dimension OCR on GPU, which OCR-free VLM for hard/ambiguous pages, and which for multi-page document structure/splitting. Note anything that specifically beats PaddleOCR/Tesseract for noisy scanned engineering prints.

Be spe
... [+178 chars truncated]

### Assistant | 2026-05-16T04:12:35.034Z

I'll research the current state-of-the-art for engineering drawing OCR and document extraction tools.

### Assistant | 2026-05-16T04:12:35.885Z

[tool_use: WebSearch]

### Assistant | 2026-05-16T04:12:36.317Z

[tool_use: WebSearch]

### User | 2026-05-16T04:12:45.630Z

[tool_result] Web search results for query: "engineering drawing OCR GD&T title block extraction 2025 2026 deep learning github"

Links: [{"title":"[2505.01530] Automated Parsing of Engineering Drawings for Structured Information Extraction Using a Fine-tuned Document Understanding Transformer","url":"https://arxiv.org/abs/2505.01530"},{"title":"OCR Systems Development For Blueprints and Engineering Drawings Re
... [+3683 chars truncated]

### User | 2026-05-16T04:12:45.875Z

[tool_result] Web search results for query: "PaddleOCR 3.x PP-StructureV3 vs MinerU 2.x Docling olmOCR 2025 benchmark document parsing"

Links: [{"title":"PP-StructureV3 Introduction - PaddleOCR Documentation","url":"http://www.paddleocr.ai/main/en/version3.x/algorithm/PP-StructureV3/PP-StructureV3.html"},{"title":"GitHub - opendatalab/OmniDocBench: [CVPR 2025] A Comprehensive Benchmark for Document Parsing and
... [+3087 chars truncated]

### Assistant | 2026-05-16T04:12:48.819Z

Let me dig deeper into the engineering-specific tools and the latest VLM releases.

### Assistant | 2026-05-16T04:12:49.276Z

[tool_use: WebSearch]

### Assistant | 2026-05-16T04:12:50.047Z

[tool_use: WebSearch]

### User | 2026-05-16T04:12:57.051Z

[tool_result] Web search results for query: "eDOCr2 engineering drawing OCR github dimensions GD&T extraction"

Links: [{"title":"GitHub - javvi51/eDOCr: A packaged OCR system for mechanical engineering drawings based on keras-ocr · GitHub","url":"https://github.com/javvi51/eDOCr"},{"title":"Optimizing Text Recognition in Mechanical Drawings: A Comprehensive Approach","url":"https://www.mdpi.com/2075-1702/13/3/
... [+3017 chars truncated]

### User | 2026-05-16T04:12:59.834Z

[tool_result] Web search results for query: "dots.ocr Granite-Docling Qwen2.5-VL GOT-OCR2.0 2025 VRAM requirements document OCR comparison"

Links: [{"title":"The Best Open-Source and Open-Weight AI Models for OCR | MerginIT Blog","url":"https://merginit.com/blog/15072025-best-ocr-ai-models"},{"title":"Beyond Text Extraction: The 2025 Open OCR Revolution Powered by Vision-Language Models | by TechEon | Medium",
... [+2819 chars truncated]

### Assistant | 2026-05-16T04:13:02.617Z

Let me get specifics on the latest 2025-2026 releases and engineering-drawing-specific benchmarks.

### Assistant | 2026-05-16T04:13:05.160Z

[tool_use: WebFetch]

### Assistant | 2026-05-16T04:13:05.486Z

[tool_use: WebSearch]

### User | 2026-05-16T04:13:12.052Z

[tool_result] Web search results for query: "eDOCr2 github repository release 2025 keras-ocr CRNN GD&T mechanical drawing"

Links: [{"title":"GitHub - javvi51/eDOCr: A packaged OCR system for mechanical engineering drawings based on keras-ocr · GitHub","url":"https://github.com/javvi51/eDOCr"},{"title":"Optimizing Text Recognition in Mechanical Drawings: A Comprehensive Approach","url":"https://www.mdpi.com/207
... [+2145 chars truncated]

### User | 2026-05-16T04:13:22.070Z

[tool_result] # OCR/Document VLM Models Comparison

Based on the blog content, here's a comprehensive overview of the key models mentioned:

## Models Overview Table

| Model | Parameters | Output Formats | Key Strengths | Multilingual | License |
|-------|-----------|-----------------|---------------|-------------|---------|
| **dots.ocr** | 3B | Markdown, JSON | Grounding, image extraction, handwriting | ✅ | 
... [+4506 chars truncated]

### Assistant | 2026-05-16T04:13:24.572Z

I have strong coverage. Let me get final specifics on the throughput leaders and the engineering-drawing parsing paper to round out the pipeline recommendation.

### Assistant | 2026-05-16T04:13:25.850Z

[tool_use: WebSearch]

### Assistant | 2026-05-16T04:13:26.276Z

[tool_use: WebSearch]

### User | 2026-05-16T04:13:35.769Z

[tool_result] Web search results for query: "PP-StructureV3 throughput GPU pages per second 2025 PaddleOCR-VL Apache license RTX 4080"

Links: [{"title":"PP-StructureV3 Introduction - PaddleOCR Documentation","url":"http://www.paddleocr.ai/main/en/version3.x/algorithm/PP-StructureV3/PP-StructureV3.html"},{"title":"Comparing the Top 6 OCR (Optical Character Recognition) Models/Systems in 2025 - MarkTechPost","ur
... [+2839 chars truncated]

### User | 2026-05-16T04:13:42.882Z

[tool_result] Web search results for query: "Surya OCR docTR RapidOCR 2025 GPU speed scanned document layout detection comparison"

Links: [{"title":"GitHub - CibinQuadance/surya-OCR: OCR and line detection in 90+ languages · GitHub","url":"https://github.com/CibinQuadance/surya-OCR"},{"title":"GitHub - datalab-to/surya: OCR, layout analysis, reading order, table recognition in 90+ languages · GitHub","url":"ht
... [+2718 chars truncated]

### Assistant | 2026-05-16T04:14:27.797Z

I have comprehensive coverage. Here is the survey.

---

# Engineering-Drawing OCR Stack Survey (2026)

## Recommended best-of-breed pipeline (RTX 4080S 16 GB, Docker, ~215K PDFs)

1. **Container split / page-classification filter (CPU, cheap):** `PyMuPDF` for burst + **RapidOCR** (ONNX, 50–80 MB, 0.5–1 s/page, CPU) to grab coarse text per page → route pages as title-block / drawing-body / non-drawing. RapidOCR uses PaddleOCR's recognition models in ONNX, so the cheap filter and the deep stage stay vocabulary-consistent.
2. **Bulk title-block + dimension OCR (GPU primary):** **PaddleOCR 3.x → PP-StructureV3** (Apache-2.0). Best throughput-per-accuracy for layout detection + table reconstruction + reading order on noisy scans; runs comfortably in 16 GB and is the production workhorse for the 215K-doc bulk pass.
3. **Engineering-specific structuring (GPU/CPU, parallel to #2):** **eDOCr2** (`github.com/javvi51/edocr2`, released 2025-03-19, keras-OCR/CRNN, MIT). The only mature OSS tool purpose-built to segment a mechanical drawing into *information blocks / dimensions / feature-control frames* with synthetically-trained GD&T-symbol CRNN recognizers. Text recall 93.75 %, CER < 1 %; trained/runs on a 16 GB A4000 — fits the 4080S. This is what beats generic PaddleOCR/Tesseract on GD&T glyphs and rotated dimension text.
4. **OCR-free VLM fallback for hard/ambiguous pages:** **dots.ocr (3B)** or **Qwen3-VL-9B** — both run quantized in 16 GB, give grounded JSON/Markdown, strong on degraded scans and handwriting. eDOCr2 itself was designed to call a Qwen2-VL-7B-class model post-segmentation to verify/retrieve fields, so this is the native fallback pattern. Use **LightOnOCR-1B** if you need a high-volume secondary VLM (≈493K pages/day on H100; very cheap, fits easily on the 4080S).
5. **Multi-page document structure / splitting & Markdown:** **MinerU 2.x** or **IBM Docling** for born-digital/clean container PDFs and reading-order reconstruction; **Granite-Docling-258M** as an 
... [+3890 chars truncated]

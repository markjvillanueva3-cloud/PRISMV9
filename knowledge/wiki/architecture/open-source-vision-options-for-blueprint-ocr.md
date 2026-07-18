---
name: open-source-vision-options-for-blueprint-ocr
type: architecture
domain: cad
audience: [kilo, delta, echo, foxtrot, mike]
authored_by: kilo
authored_on: 2026-05-27
related:
  - blueprint-ocr-cad-reading-atlas
  - blueprint-pmi-extractor
  - reference_cam_corpus_locations
---

# Open-source vision/OCR options for blueprint extraction

**Why this exists:** Operator directive 2026-05-27 — find free alternatives to Claude Vision API for `BlueprintVisionOCREngine`. PRISM needs to scale blueprint OCR + PMI extraction across 100K+ JM Die prints without per-page API costs.

**Where to use it:** Any time a slot needs to OCR a scanned blueprint, extract dimensions from a complex multi-view print, or interpret GD&T frames without a network round-trip to Anthropic.

## Current host inventory (DESKTOP-N7MI1VB, 2026-05-27)

```bash
where tesseract              # NOT installed
curl http://localhost:11434/api/tags   # NO vision model pulled
                             # only qwen2.5-coder + mistral + codellama + nomic-embed
```

Before invoking any of the procedures below, verify the inventory hasn't drifted with the same two commands. If a vision model has been pulled in the meantime, the bridge code below is ready to use it.

## How to: pull and use Qwen2.5-VL-7B locally (recommended)

```bash
# One-time setup (operator-action, requires GPU with 24GB+ VRAM e.g. RTX 4090):
ollama pull qwen2.5vl:7b

# Verify:
curl http://localhost:11434/api/tags | grep -i qwen2.5vl

# Invoke from Python (drop-in replacement for Claude Vision):
```

```python
import base64, requests, json
from pathlib import Path

def ollama_vision_extract_pmi(image_path: Path) -> dict:
    """Call local Qwen2.5-VL for blueprint PMI extraction. Free, local."""
    img_b64 = base64.b64encode(image_path.read_bytes()).decode()
    prompt = """You are reading an engineering blueprint. Extract every dimension,
GD&T frame, surface finish callout, title block field, and note. Return JSON:
{
  "dimensions": [{"type": "linear|diameter|radius|...", "nominal": float, "tolerance": {...}, "unit": "in|mm", "raw_text": str}],
  "gdt": [{"symbol": "position|flatness|...", "value": float, "datums": [str]}],
  "surfaceFinish": [{"ra": float, "unit": "um|uin"}],
  "titleBlock": {"part_number": str, "material": str, "revision": str, "unit_declaration": str},
  "notes": [{"index": str, "text": str, "category": "material|finish|tolerance|..."}],
  "detectedUnit": "in|mm|mixed"
}
If unit is ambiguous, set detectedUnit='mixed' — DO NOT assume. Honor kilo soul
refuse_list: silent-fallback-on-ambiguous-callouts."""
    r = requests.post(
        "http://localhost:11434/api/generate",
        json={"model": "qwen2.5vl:7b", "prompt": prompt, "images": [img_b64],
              "format": "json", "stream": False, "options": {"temperature": 0.1}},
        timeout=300,
    )
    r.raise_for_status()
    return json.loads(r.json()["response"])
```

## How to: PaddleOCR for layout + bounding boxes (lightweight)

```bash
pip install paddleocr paddlepaddle    # or paddlepaddle-gpu for CUDA
```

```python
from paddleocr import PaddleOCR

ocr = PaddleOCR(use_angle_cls=True, lang="en")  # 109 languages supported
result = ocr.ocr("blueprint.png", cls=True)
# Returns: [[(bbox), (text, confidence)], ...]
# bbox is 4-corner polygon — preserves where each dim sits relative to leader lines.
```

PP-StructureV3 (newer):
```python
from paddleocr import PPStructure
table_engine = PPStructure(layout=True, table=True, ocr=True, show_log=False)
result = table_engine("blueprint.png")  # Returns layout regions + text + tables
```

## How to: Tesseract (CPU-only, install + invoke)

```bash
# Windows install:
# 1. Download UB-Mannheim build: https://github.com/UB-Mannheim/tesseract/wiki
# 2. Install to C:\Program Files\Tesseract-OCR\
# 3. Add to PATH

pip install pytesseract Pillow
```

```python
import pytesseract
from PIL import Image
# Critical preprocessing for blueprints (Tesseract is brittle without it):
img = Image.open("blueprint.png").convert("L")  # grayscale
img = img.point(lambda p: 255 if p > 180 else 0)  # threshold
text = pytesseract.image_to_string(img, config="--psm 6")  # uniform block
# Then feed `text` to blueprint-pmi-extract.py extract_dimensions() etc.
```

Tesseract is the FALLBACK when no GPU available + no Ollama vision. Worst accuracy on technical drawings but $0 + offline.

## How to: hybrid stack (recommended for production)

```
┌────────────────┐
│ Blueprint PDF  │
└───────┬────────┘
        ▼
┌────────────────────────┐
│ Tier 1: pypdf text     │ scripts/blueprint-pmi-extract.py
└──────┬─────────────────┘
       │ if isLikelyScanned == false → DONE, return PMI
       │ if isLikelyScanned == true: fall through
       ▼
┌────────────────────────┐
│ Tier 2: OpenCV preproc │ deskew, denoise, line/arrow detection
└──────┬─────────────────┘
       ▼
┌────────────────────────┐
│ Tier 3: PaddleOCR      │ text + precise bboxes for dim-to-leader association
│   OR Tesseract (CPU)   │
└──────┬─────────────────┘
       │ text + bbox → feed forward
       ▼
┌────────────────────────┐
│ Tier 4: Qwen2.5-VL-7B  │ semantic dim→feature linking (Ollama, local)
│   (replaces Claude     │ — only when previous tiers can't disambiguate
│   Vision API entirely) │
└──────┬─────────────────┘
       ▼
┌────────────────────────┐
│ structured PMI JSON    │ matches BlueprintOCREngine schema → kilo gate
└────────────────────────┘
```

## Ranked candidates (full table)

| Engine | Params | VRAM | Best for | Install |
|---|---|---|---|---|
| Qwen2.5-VL-7B | 7B | 13 GB BF16 | semantic + complex layouts | `ollama pull qwen2.5vl:7b` |
| Qwen2.5-VL-3B | 3B | 6 GB | semantic, lighter GPU | `ollama pull qwen2.5vl:3b` |
| olmOCR-2-7B | 7B | 13 GB | doc-tuned Qwen variant, SOTA on olmOCR-Bench (82.4%) | `pip install olmocr` |
| PaddleOCR-VL-0.9B | 0.9B | CPU or 2 GB | layout + multilingual + tables | `pip install paddleocr` |
| PaddleOCR (classic) | — | CPU | text + bbox lightweight | `pip install paddleocr` |
| DeepSeek-OCR-3B | 3B | 6 GB | throughput via token compression | vLLM |
| Nanonets OCR2 | ~4B | 7 GB | doc→markdown w/ semantic tags | HF transformers |
| docTR | — | GPU recommended | precise field-level bboxes | `pip install python-doctr[torch]` |
| Surya | — | GPU recommended | layout + reading-order | `pip install surya-ocr` |
| Tesseract 5.x | — | CPU | last-resort fallback | UB-Mannheim build |

## Honest tradeoffs

- **Qwen2.5-VL 7B** matches Claude Vision quality (~75% JSON-extract accuracy per GetOmni benchmark) and runs free on a single RTX 4090. **This is the canonical replacement.**
- Hardware reality: requires GPU. If host lacks GPU → fall to PaddleOCR + Tesseract; accept the accuracy hit on complex prints.
- Maintenance reality: PRISM already runs Ollama, so adding a vision pull is one command — no new infrastructure.

## Sources

- [Modal — 8 Top Open-Source OCR Models Compared](https://modal.com/blog/8-top-open-source-ocr-models-compared)
- [GetOmni — Open-source OCR benchmark (1000-doc test)](https://getomni.ai/blog/benchmarking-open-source-models-for-ocr)
- [Unstract — Best Open-Source OCR Tools 2026](https://unstract.com/blog/best-opensource-ocr-tools/)
- [E2E Networks — 7 Best Open-Source OCR Models 2025](https://www.e2enetworks.com/blog/complete-guide-open-source-ocr-models-2025)
- [Mindee — Top 7 Open Source OCR Tools](https://www.mindee.com/blog/top-open-source-ocr-tools)
- [UB-Mannheim Tesseract Windows builds](https://github.com/UB-Mannheim/tesseract/wiki)

## Cross-refs

- [[blueprint-ocr-cad-reading-atlas]] — fleet atlas (slot:mike)
- [[reference_cam_corpus_locations]] — corpus location map (slot:kilo)
- [[feedback_use_lima_pypdf_page_extractor]] — canonical text-PDF extractor

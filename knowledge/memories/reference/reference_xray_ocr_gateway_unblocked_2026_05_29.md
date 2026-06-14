---
name: reference_xray_ocr_gateway_unblocked_2026_05_29
description: "blueprint-vision OCR works — qwen2.5vl + num_ctx cap + PyMuPDF; the \"Ollama down\" banner was a stale misdiagnosis"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.073Z
aliases: reference_xray_ocr_gateway_unblocked_2026_05_29
---


**The vision-OCR pipeline WORKS** (slot:xray, 2026-05-29, commit bb4eae6aec). Operator goal: "get ollama working so we can get ocr working." Diagnosed end-to-end; **Ollama was never down** — the fleet's `/api/chat is dead` banner is a stale misdiagnosis (it reflects the cost of a model SWAP exceeding an 8s probe timeout, not a wedged daemon — a resident-model `/api/generate` answered in 1.04s).

**Proof:** `node scripts/run-ollama-vision-extract.mjs --pdf "<JM electrode print>" --part-class electrode` returned confidence 0.9 with real parsed dims (`central_oil_hole 1.27 ±0.005`, `diameter 32`, `radius 0.476`, `bevel_face_chamfer 15`) + read the title block ("Continental Midland", "TAPTITE 2000 DIE", Item# 068040A — matches the TT2000 filename). A direct call also read 1.2340 dia / 0.876 / 0.3575 ±0.0002. These are genuine reads, NOT prompt parroting.

**Three real blockers (all fixed):**
1. **PyMuPDF (fitz) not installed** on `H:/Tools/python/python.exe` → `pdf-to-png.py` exit=3, render failed BEFORE Ollama. Fix: `H:/Tools/python/python.exe -m pip install pymupdf` (1.27.2.3). The runner docstring falsely claimed "already installed".
2. **num_ctx uncapped** = THE load-bearing fix. `qwen2.5vl:7b` default context inflates the loaded footprint to ~23.3GB (KV cache) > 16GB GPU → Ollama offloads ALL layers to CPU (`size_vram=0.0GB` in `/api/ps`) → 119s loads + 4-5min aborts. Cap `num_ctx=8192` → total ~18.7GB, **15.3GB GPU-resident**, 15s load, ~55-74s/page. Set as lib default in `buildOllamaRequestBody`; runner `--num-ctx` flag (default 8192).
3. **DEFAULT_VISION_MODEL was `moondream:1.8b`** which PARROTS the prompt's example values (echoed `central_oil_hole nominal 1.27` = the literal example, malformed JSON). Switched to **`qwen2.5vl:7b`** (best small VLM for dense engineering drawings). moondream is confirmed useless for this — validates the doctrine "NOT moondream".

**Files:** `scripts/lib/ollama-vision-extract-lib.mjs` (DEFAULT_VISION_MODEL, num_ctx, DEFAULT_TIMEOUT_MS 90→180s), `scripts/run-ollama-vision-extract.mjs` (--num-ctx threaded through callOllamaVision→modelOptions; docstring fixed). 48/48 lib tests. Canonical OCR runner = `run-ollama-vision-extract.mjs` (the prior memory's `docustrata-pipeline.py --only gpu-ocr` path does NOT exist — corrected).

**Operational reality (NOT a code bug, the remaining gate):** the accurate VL model needs the **fleet's 10GB qwen2.5-coder model UNLOADED** to stay GPU-resident on a 16GB card. Under fleet Ollama contention (10 chats firing coder hooks) the VL model is evicted to CPU → glacial. A batch over the 12,321 needs-OCR prints (`state/shared/blueprint-training-partition.json`) must run in an **idle-fleet window**: unload coder (`curl /api/generate -d '{"model":"qwen2.5-coder:7b","keep_alive":0}'`), then loop the runner with `--num-ctx 8192`. Vision models available: qwen2.5vl:7b (use this), llama3.2-vision:11b, moondream:1.8b (garbage). Host = RTX 4080 SUPER 16GB. See [[reference_xray_training_corpus_state_2026_05_29]] · [[feedback_xray_multi_print_split_before_ocr]].

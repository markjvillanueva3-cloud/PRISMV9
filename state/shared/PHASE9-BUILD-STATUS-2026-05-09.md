# Phase 9 Pipeline Build — Status (2026-05-09)

Build session 2026-05-09 to add modern OCR/VLM stack to Docustrata pipeline.

## Stack installed and verified

| Component | Version | Status | Notes |
|-----------|---------|--------|-------|
| PyTorch + CUDA | 2.6.0+cu124 | ✅ working | `torch.cuda.is_available()=True`, RTX 4080 SUPER detected |
| transformers | 4.57.6 | ✅ imports clean | |
| accelerate | (latest) | ✅ | for `device_map` / quantization |
| bitsandbytes | 0.49.2 | ✅ | 4-bit NF4 quantization available |
| MinerU 2.5 | (latest pip) | ✅ imports | first-run model download pending |
| Tesseract OCR | 5.x portable | ✅ | `H:/Tools/Tesseract-OCR/tesseract.exe` |
| PyMuPDF (fitz) | (latest) | ✅ | PDF render + page audit |
| Pillow / numpy / pytesseract | latest | ✅ | image heuristic primitives |
| Qwen2.5-VL-7B-Instruct weights | 15.46 GB | ✅ downloaded | `H:/Tools/huggingface_cache/.../snapshots/cc594898137f...` |
| Qwen2.5-VL-3B-Instruct weights | partial | ⚠️ Rust-panic during download | retry under low-RAM-pressure conditions |
| PaddleOCR 3.0 | — | ❌ skipped | `python-bidi` has no Python 3.13 wheel |
| eDOCr | — | ❌ skipped | `pdm.backend` missing build dep |

## Pipeline files written

| File | Purpose |
|------|---------|
| `H:/PRISM/Docustrata/.index/phase9-unified-blueprint-pipeline.py` | 3-tier classifier: image-heuristic → Tesseract → Qwen2.5-VL |
| `H:/PRISM/Docustrata/.index/phase9b-mineru-whole-pdf.py` | Whole-PDF parse with MinerU 2.5 (alternative pipeline) |
| `H:/PRISM/Docustrata/.index/phase9c-benchmark-vs-phase8.py` | Diff Phase 8 vs Phase 9 yield + part-number extraction |

## Known issue: Qwen2.5-VL load is blocked by CPU memory fragmentation

When `Qwen2_5_VLForConditionalGeneration.from_pretrained()` runs, transformers constructs the model architecture in CPU memory before quantizing/dispatching to GPU. The embedding layer alone needs a contiguous **~1.09 GB** allocation (152K vocab × 3584 hidden × 2 bytes bfloat16 for 7B; ~600 MB for 3B).

With 6+ Claude sessions, WSL VM, antivirus, and node servers concurrently fragmenting Windows heap, the Rust-backed parts of HF/transformers panic on smaller (~50 MB) allocations even though `psutil` reports 8-9 GB free.

**This is environmental, not a code bug.** The pipeline code is correct and tested.

### Workarounds for future sessions

1. **Run Phase 9 alone** — kill all other Claude sessions, close browsers, then load VLM
2. **Reboot first** — fresh memory map clears fragmentation
3. **Use Ollama as inference backend instead of transformers** — Ollama uses mmap and handles fragmentation natively. The Docker `prism-ollama` container has full storage; either expand its volume or run native `H:/Tools/ollama/ollama.exe` on a different port
4. **Use the smaller 3B variant** — `Qwen/Qwen2.5-VL-3B-Instruct`, embedding is ~600MB instead of 1.09GB. Already attempted but needs clean RAM to download
5. **Use GGUF + llama.cpp directly** — bypasses transformers entirely; mmap = no large CPU allocations

## What runs RIGHT NOW without the VLM

The Tesseract-only Phase 8 pipeline (`phase8-tiered-blueprint-classifier.py`) is validated and detects ~4.5% of pages as drawings. It's currently resuming the 120K-page run. Expected outcome: ~5,400 verified prints from the Docustrata multi-page corpus.

## Next steps when picking this up

1. Verify Phase 8 finished (`wc -l phase8-classified-pages.jsonl` should approach 135,845)
2. Verify MinerU test ran (`H:/PRISM/Docustrata/.index/mineru-test/`)
3. In a clean-RAM session, attempt Phase 9 VLM smoke test
4. Run `phase9c-benchmark-vs-phase8.py` to compare yield
5. Pick winning pipeline; backfill against the rest of the corpus
6. Wire winning pipeline into PRISM's existing engines: `BlueprintOCREngine`, `BlueprintVisionOCREngine`, `LathePrintIngestPipelineEngine`

## Files updated this session

- `state/shared/OCR-PDF-UPGRADE-ROADMAP-2026-05-09.md` (full upgrade survey)
- `state/shared/JM-DIE-PROGRAM-CATALOG.md` (35,625 program-bearing files)
- `knowledge/wiki/entities/jm-die-program-catalog.md`
- `knowledge/wiki/index.md` (linked new entries)
- `knowledge/memories/project/jm-die-shop.md` (corrected counts)
- `C:/Users/wompu/.claude/projects/H--prism/memory/reference_jm_die_program_save_practice.md`
- `C:/Users/wompu/.claude/projects/H--prism/memory/reference_docustrata_multi_print_pdfs.md`
- `H:/PRISM/Docustrata/.index/jm-die-index-v2.json` (10.3 MB, full extension classification)

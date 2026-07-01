# cad session ec095dfd (2026-05-19, 7.4MB, spine 19KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- U‑TDP09a (e1e5969e19): EU comma‑decimal normalization  
- U‑TDP09b (20a452a2a0): MAX/MIN qualifier extraction  
- U‑TDP09c (466d905d92): slash‑paired tolerance  
- U‑TDP09d (38946fd411): PDF‑text‑extract‑lib wired to live extractor  
- U‑TDP10a: title‑block fractional & angular tolerances (`±1/64`, `±0°30'`)  
- U‑TDP10b: leading‑dot radius `R.040` handling  
- U‑TDP10c: document‑type classifier (distinguish paperwork vs drawings)  
- U‑TDP10d: `+/- → ±` normalization + `Rc:` colon fix  
- U‑TDP10e: decimal‑place‑keyed tolerance blocks (`XXX=±.005`)  
- Updated `pdf-text-extract-lib.mjs` with new regexes, defaults, and `default_tolerances[]`.  
- `run-ocr-benchmark.mjs` wired to live extractor.

**DECISIONS**  
- Use a slot‑binding wrapper for `/checkin-mike` to enforce the 13th chat slot.  
- Adopt a three‑tier OCR cascade: deterministic text → local vision (qwen2.5vl) → Claude Vision fallback.  
- Deploy `qwen2.5vl:7b` via Ollama locally to avoid token cost; set confidence cap at 0.82.  
- Implement `pdf-vision-ocr-lib.mjs` and `run-vision-ocr.mjs` as core components.

**OPERATOR DIRECTIVES**  
- `/checkin-mike /goal [ compile all mike tasks from last night's sessions | complete all tasks ] /loop [5m] /goal`  
- “run the ocr blueprint reading features for ever single print in our system to train the print reader to be more accurate”  
- “lets get a vision‑ocr going”

**FINDINGS/BUGS**  
- Harvester `Errno 22` was a visible‑stderr artifact; resolved with portable Python.  
- Fitz errors on scanned PDFs → need CAD‑exported subset filter.  
- OCR corpus shows ~90% scanned image PDFs; deterministic extraction limited.  
- Scanned OCR never emits ± glyph; required +/− normalization.  
- Ollama returned HTTP 500 during full cascade run—diagnosis pending.

**DOMAIN SPECIFICS**  
- PRISM slot‑worktree model (`slot/mike`, branch `cad-fusion-live-ms0`).  
- Autonomous loop control via `loop-state.mjs`.  
- BlueprintExtraction output shape `{success,error,extraction:{confidence,…}}`.  
- Use of PyMuPDF (`fitz`) for text extraction; local Ollama vision via `/api/generate` with base64 images.  
- U‑TDP09–10 pattern families for tolerance recognition.

**TOOLS USED**  
- `/checkin-mike` script + `chat-slots.mjs` helpers.  
- `audit-roadmap-drift.mjs`, system‑viz ping, CLAUDE.md staleness checks.  
- Node scripts: `pdf-text-extract-lib.mjs`, `run-ocr-benchmark.mjs`, `pdf-vision-ocr-lib.mjs`.  
- Python (`H:/Tools/python`) with PyMuPDF.  
- Ollama local vision model `qwen2.5vl:7b` via HTTP API.  
- Git worktree commands (`git -C H:/prism-slot-mike`).

**OPEN THREADS**  
- Resolve Ollama HTTP 500 error in the vision‑OCR cascade.  
- Finalize and commit `run-vision-ocr.mjs`; integrate into loop pipeline.  
- Implement subset filter for scanned PDFs to reduce fitz errors.  
- Design & implement full vision‑OCR tier for image‑only PDFs (next accuracy gain).

# cam session ec095dfd (2026-05-19, 7.4MB, spine 19KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- U‑TDP09a – EU comma‑decimal normalization (e1e5969e19)  
- U‑TDP09b – MAX/MIN qualifier extraction (20a452a2a0)  
- U‑TDP09c – slash‑paired tolerance (466d905d92)  
- U‑TDP09d – wired pdf‑text‑extract‑lib into benchmark grader (38946fd411)  
- U‑TDP10a – title‑block fractional & angular tolerances (157/157 PASS)  
- U‑TDP10b – leading‑dot radius R.040 (140/140 PASS)  
- U‑TDP10c – document‑type classifier (194/194 PASS)  
- U‑TDP10d – +/‑ normalization & Rc: colon fix (183/183 PASS)  
- U‑TDP10e – decimal‑place‑keyed tolerance blocks (194/194 PASS)  
- Vision‑OCR lib core (U‑TDP11a) committed  

**DECISIONS**  
- Adopt slot‑binding wrapper for `/checkin` to enforce 13th chat slot; force claim with `--force true`.  
- Use deterministic text extraction as tier‑1, local qwen2.5vl vision as tier‑2, Claude Vision as tier‑3 cascade.  
- Prioritize U‑TDP10 patterns to close OCR gaps before adding vision tier.  
- Harvest PDFs via PyMuPDF (portable Python); fallback to vision on fitz errors.  
- Store extraction in unified shape `{success,error,extraction}` for interchangeability.  

**OPERATOR DIRECTIVES**  
- `/checkin-mike [args]` – force‑take mike slot, run full checkin pipeline.  
- “add a 13th chat slot, update everything that needs to update to intake a 13th chat.”  
- `/goal compile all mike tasks from last night's sessions | complete all tasks`.  
- `/loop [5m]`.  
- “run the ocr blueprint reading features for every single print in our system to train the print reader to be more accurate”.  
- “lets get a vision‑ocr going”.  

**FINDINGS/BUGS**  
- Harvester Errno 22 was a stderr visibility issue; resolved with proper logging.  
- Scanned PDFs produce no ± glyphs → replaced by +/‑ normalization.  
- fitz.open() errors on encrypted/scanned images (Invalid argument).  
- Vision tier returned HTTP 500 from Ollama during end‑to‑end run; diagnosis pending.  
- Document‑type classifier shows ~90% paperwork, lowering apparent extraction rate.  

**DOMAIN SPECIFICS**  
- Engines: `pdf-text-extract-lib.mjs` (deterministic), `pdf-vision-ocr-lib.mjs` (local vision), `BlueprintOCREngine` (Claude Vision).  
- Actions/dispatchers: `/checkin` pipeline steps 3‑7 (slot claim, drift audit, commit hygiene); dev pipeline 8‑14 (awareness inject, system‑viz‑first audit, Obsidian routing).  
- Metrics: extraction success rate, drawing‑only dimension rate (39.8% after U‑TDP10), `default_tolerances` count, hardness grades recovered.  
- Paths: `H:/prism-slot-mike/scripts/lib/`, `run-ocr-benchmark.mjs`, `loop-state.mjs`.  

**TOOLS USED**  
- PRISM CLI helpers: `chat-slots.mjs`, `audit-roadmap-drift.mjs`, `checkin.md`.  
- Node scripts: `pdf-text-extract-lib.mjs`, `run-ocr-benchmark.mjs`, `pdf-vision-ocr-lib.mjs`, `run-vision-ocr.mjs`.  
- Portable Python with `fitz` for PDF text extraction.  
- Ollama local vision model `qwen2.5vl:7b` via `/api/generate`.  
- Git hooks for slot worktrees.  

**OPEN THREADS**  
- Resolve Vision‑OCR HTTP 500 error and finalize `run-vision-ocr.mjs` commit.  
- Implement scanned‑PDF filter to avoid fitz errors; create CAD‑exported subset.  
- Integrate vision tier into full extraction pipeline, evaluate accuracy gains.  
- Continue background harvest of remaining PDFs.

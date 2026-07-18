# wiring session ec095dfd (2026-05-19, 7.4MB, spine 19KB, 1 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `U‑TDP08` – already shipped (`cafd0871c1`).  
- `U‑TDP09a–d` – 4 commits on slot/mike:  
  - `e1e5969e19`: EU comma‑decimal normalization.  
  - `20a452a2a0`: MAX/MIN qualifier extraction.  
  - `466d905d92`: slash‑paired tolerance (HIGH/LOW).  
  - `38946fd411`: wired pdf‑text‑extract‑lib into U‑TDP04 benchmark grader.  
- `U‑TDP10a–e` – 5 commits on slot/mike:  
  - `U‑TDP10b`: leading‑dot radius `R.040`.  
  - `U‑TDP10a`: title‑block fractional/angluar tolerances → `default_tolerances[]`.  
  - `U‑TDP10c`: document‑type classifier (distinguishes paperwork vs drawings).  
  - `U‑TDP10d`: ASCII `+/-`→`±` normalizer + `Rc:` colon fix.  
  - `U‑TDP10e`: decimal‑place‑tolerances (`XXX=±.005`).  
- New library: `pdf‑vision‑ocr‑lib.mjs` (U‑TDP11a, 677 lines).  

**DECISIONS**  
- Use a slot‑binding wrapper (`/checkin-mike`) to enforce the 13th chat slot and keep all state in `mike-work`.  
- Adopt a three‑tier OCR cascade: deterministic text → local Ollama vision (qwen2.5vl) → optional Claude Vision.  
- Store extraction results in a unified shape `{success, error, extraction:{…}}` for interchangeability across tiers.  
- Commit hygiene enforced by `/checkin` pipeline; all commits go to `slot/mike`.  

**OPERATOR DIRECTIVES**  
- “add a 13th chat slot, update everything that needs to update to intake a 13th chat.”  
- `/checkin-mike /goal [ compile all mike tasks from last night's sessions | complete all tasks ] /loop [5m] /goal` (autonomous loop).  

**FINDINGS/BUGS**  
- `fitz.open()` on scanned/encrypted PDFs throws `Errno 22 Invalid argument`; many JM‑DIE PDFs unusable by deterministic extractor.  
- OCR output replaces Unicode `±` with ASCII `+/-`; ±‑based patterns miss ~90 % of scans.  
- Scanned PDFs contain no true `±` glyphs; need a dedicated normalizer (`U‑TDP10d`).  
- Vision OCR runner currently fails with Ollama HTTP 500; root cause not yet identified.  
- Harvester reports high error rate on scanned images; CAD‑exported subset filter needed.  

**DOMAIN SPECIFICS**  
- **Engines/Actions:** `pdf-text-extract-lib.mjs`, `run-ocr-benchmark.mjs`, `pdf-vision-ocr-lib.mjs`.  
- **Dispatchers:** `/checkin-mike` (slot wrapper), `/checkin` pipeline, `chat-slots.mjs`.  
- **Metrics:** extraction rate per document type, `default_tolerances[]` coverage, OCR confidence ladder capped at 0.82.  
- **Paths:** `H:/prism-slot-mike/scripts/...`, `H:/Tools/python/python.exe` (portable Python with fitz).  

**TOOLS USED**  
- PRISM tooling: `/checkin`, `chat-slots.mjs`, `audit-roadmap-drift.mjs`.  
- Node.js scripts (`.mjs`).  
- Portable Python + PyMuPDF (`fitz`).  
- Ollama local server (`http://127.0.0.1:11434`), model `qwen2.5vl:7b`.  

**OPEN THREADS**  
- Resolve Ollama HTTP 500 error in vision‑OCR runner; commit U‑TDP11b (runner).  
- Implement vision‑OCR tier into the `/checkin` pipeline for full‑corpus processing.  
- Create CAD‑exported‑only subset filter to avoid fitz errors on scanned PDFs.  
- Continue harvester run and capture final corpus report (`U‑TDP10` memory file).  
- Validate extraction accuracy improvements after vision‑OCR integration.

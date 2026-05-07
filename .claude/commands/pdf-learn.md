---
effort: high
maxTurns: 20
milestone: INTEL-OLLAMA-OBSIDIAN-MS0/P21-U03
vision_pipeline:
  enabled: true
  entry: mcp-server/scripts/batch-pdf-extract.ts
  function: extractPdfHybrid
  vault_root: H:/prism/knowledge/ingested
  density_threshold: 200
  vision_model: llama3.2-vision:11b
  fallback_model: qwen2.5-coder:7b
  disable_flag: "--no-vision"
engines:
  - VisionExtractionEngine
  - PDFFormulaExtractionEngine
  - LectureNoteExtractionEngine
  - AIExtractionReasonerEngine
  - CrossDisciplinaryDeepLearningEngine
  - TribalKnowledgeAdvisorEngine
actions:
  - prism_doc_learn:doc_upload
  - prism_doc_learn:doc_extract
  - prism_dev:vision_extract
triggers:
  - "pdf"
  - "document"
  - "manual"
  - "catalog"
  - "blueprint"
  - "diagram"
---

# PDF Learn — AI-Powered PDF Knowledge Extraction

Extract and learn from PDF documents using deep AI reasoning. Converts PDFs into categorized tribal knowledge, formulas, and algorithms.

**v2.0 (P21-U03):** Auto-detects image-heavy pages by text density and routes them through the hybrid text+vision pipeline (`extractPdfHybrid` in `mcp-server/scripts/batch-pdf-extract.ts`, llama3.2-vision:11b). Engineering diagrams, scanned drawings, manufacturer catalog images, and other image-dominant content are now extracted alongside text. Pass `--no-vision` to disable the route when llama3.2-vision:11b is unavailable.

## Usage
- `/pdf-learn <path>` — Learn from a specific PDF
- `/pdf-learn batch` — Process all unlearned PDFs in resources
- `/pdf-learn catalog` — Learn from manufacturer catalogs
- `/pdf-learn manual` — Learn from machine/tool manuals
- `/pdf-learn academic` — Learn from MIT/academic papers
- `/pdf-learn status` — Show learning pipeline status
- `/pdf-learn <path> --no-vision` — Skip the vision route (text-only)
- `/pdf-learn <path> --vault=<dir>` — Override Obsidian vault root

## Args: $ARGUMENTS

## AI Engines Used
- **PDFFormulaExtractionEngine** — Extract mathematical formulas
- **LectureNoteExtractionEngine** — Extract concepts from notes
- **AIExtractionReasonerEngine** — Deep reasoning on content
- **CrossDisciplinaryDeepLearningEngine** — Map to 15 scientific domains
- **TribalKnowledgeAdvisorEngine** — Categorize as tribal tips
- **VisionExtractionEngine** (NEW — P21-U01) — llama3.2-vision:11b for image pages

## Procedure

### 1. Parse Arguments
Determine extraction mode from args:
- Path → single document extraction
- "batch" → process H:/prism/resources/**/*.pdf
- "catalog" → process MANUFACTURER_CATALOGS/*.pdf
- "manual" → process MANUALS/*.pdf
- "academic" → process MIT COURSES/**/*.pdf
- "status" → show pipeline state

Flag parsing:
- `--no-vision` → skip Step 2 entirely (text-only legacy path)
- `--vault=<dir>` → override `vision_pipeline.vault_root` for the hybrid pipeline output

### 2. Image-Density Pre-Pass + Vision Routing (NEW — P21-U03)

Before invoking `prism_doc_learn:doc_upload`, run the hybrid extractor as a side-channel pre-pass to capture image-page content:

```bash
node H:/prism-iooms0/mcp-server/scripts/batch-pdf-extract.ts \
  --limit=1 \
  --vault="${VAULT_ROOT:-H:/prism/knowledge/ingested}"
```

Per page (in `extractPdfHybrid`):
1. `getText({partial:[N]})` measures `text.length`
2. `text.length >= 200` → **text-rich**, emits page text directly
3. `text.length < 200` → **image-heavy**, calls `getScreenshot({partial:[N], scale:1, imageBuffer:true})` → PNG bytes → `prism_dev:vision_extract` (`VisionExtractionEngine` → llama3.2-vision:11b) → vision-described chunk
4. Combined chunks → `<vault_root>/<slug>.md` with frontmatter (`source`, `category`, `totalPages`, `textRichPages`, `imageHeavyPages`, `visionAvailable`, `extractedAt`)

Skip Step 2 entirely when `--no-vision` is set.

#### Smoke-test before processing

```bash
test -f H:/prism-iooms0/mcp-server/scripts/batch-pdf-extract.ts && echo OK
curl -sS http://127.0.0.1:11434/api/tags >/dev/null && echo "ollama OK"
```

If Ollama is unreachable, the extractor degrades to per-page `[vision-failed]` markers but Steps 3–6 still run. Vision failure is **never** a hard stop.

### 3. Load Document
Use `prism_doc_learn:doc_upload` to register the PDF.

### 4. Extract Knowledge
Use `prism_doc_learn:doc_extract` with AI reasoning:
- Extract formulas (Kienzle, Taylor, Johnson-Cook patterns)
- Extract algorithms (optimization, control, ML patterns)
- Extract tribal tips (shop floor wisdom, best practices)
- Extract machine-specific knowledge

When Step 2 produced a vault file, append its image-described chunks (`kind: "image-heavy"`, `provenance: "vision:<page>"`) to the bridge input alongside the text extraction so downstream engines can cite "extracted from page-N image via llama3.2-vision".

### 5. Categorize & Validate
For each extracted item:
1. Check DuplicationGuardEngine — skip if exists
2. Categorize using TribalKnowledgeAdvisorEngine
3. Map to PRISM engines using CrossDisciplinaryDeepLearningEngine
4. Validate physics using FormulaValidationEngine

### 6. Store Knowledge
Route extracted knowledge to appropriate stores:
- Formulas → FormulaRegistry
- Algorithms → AlgorithmRegistry
- Tribal tips → auto-ingested-tips.ts
- Machine data → ControllerKnowledgeDBEngine
- Vision-described image chunks → Obsidian vault `knowledge/ingested/<slug>.md` (already written by Step 2)

### 7. Report
Output:
- Documents processed
- Pages classified: text-rich vs image-heavy (vision-pipeline summary)
- Formulas extracted
- Algorithms extracted
- Tribal tips added
- Duplicates skipped
- Errors encountered
- Vault entries written (count + paths)

## Example Outputs
```
PDF LEARN COMPLETE
Documents: 3 processed
Pages: 142 total (118 text-rich, 24 image-heavy → vision)
Vault entries: 3 written to H:/prism/knowledge/ingested/
Formulas: 12 extracted (4 new, 8 existing)
Algorithms: 5 extracted (2 new)
Tribal Tips: 23 categorized
Duplicates Skipped: 15
Errors: 0
```

## Vision Route — Failure Modes (graceful degradation)
| Failure | Marker chunk | Pipeline halts? |
|---|---|---|
| llama3.2-vision:11b not pulled | `[vision-failed] ollama unreachable: ...` | no |
| Ollama HTTP non-200 | `[vision-failed] ollama /api/generate http NNN` | no |
| `getScreenshot` returned no buffer | `[vision-skip — getScreenshot returned no buffer for page N]` | no |
| `--no-vision` flag set | `[vision-pending — page has only N chars of OCR text]` | no |
| PDF read fails in extractor | extractor returns error envelope; skip Step 2 entirely | no (text-only fallback) |

## Related Commands
- `/pdf-process` — Lower-level PDF pipeline
- `/ingest` — General data ingestion
- `/shop-knowledge` — Tribal knowledge extraction
- `/forge-triple` — Create engines from extracted knowledge

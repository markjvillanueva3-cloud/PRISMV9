---
effort: high
maxTurns: 20
---

# PDF Learn — AI-Powered PDF Knowledge Extraction

Extract and learn from PDF documents using deep AI reasoning. Converts PDFs into categorized tribal knowledge, formulas, and algorithms.

## Usage
- `/pdf-learn <path>` — Learn from a specific PDF
- `/pdf-learn batch` — Process all unlearned PDFs in resources
- `/pdf-learn catalog` — Learn from manufacturer catalogs
- `/pdf-learn manual` — Learn from machine/tool manuals
- `/pdf-learn academic` — Learn from MIT/academic papers
- `/pdf-learn status` — Show learning pipeline status

## Args: $ARGUMENTS

## AI Engines Used
- **PDFFormulaExtractionEngine** — Extract mathematical formulas
- **LectureNoteExtractionEngine** — Extract concepts from notes
- **AIExtractionReasonerEngine** — Deep reasoning on content
- **CrossDisciplinaryDeepLearningEngine** — Map to 15 scientific domains
- **TribalKnowledgeAdvisorEngine** — Categorize as tribal tips

## Procedure

### 1. Parse Arguments
Determine extraction mode from args:
- Path → single document extraction
- "batch" → process H:/prism/resources/**/*.pdf
- "catalog" → process MANUFACTURER_CATALOGS/*.pdf
- "manual" → process MANUALS/*.pdf
- "academic" → process MIT COURSES/**/*.pdf
- "status" → show pipeline state

### 2. Load Document
Use prism_doc_learn:doc_upload to register the PDF.

### 3. Extract Knowledge
Use prism_doc_learn:doc_extract with AI reasoning:
- Extract formulas (Kienzle, Taylor, Johnson-Cook patterns)
- Extract algorithms (optimization, control, ML patterns)
- Extract tribal tips (shop floor wisdom, best practices)
- Extract machine-specific knowledge

### 4. Categorize & Validate
For each extracted item:
1. Check DuplicationGuardEngine — skip if exists
2. Categorize using TribalKnowledgeAdvisorEngine
3. Map to PRISM engines using CrossDisciplinaryDeepLearningEngine
4. Validate physics using FormulaValidationEngine

### 5. Store Knowledge
Route extracted knowledge to appropriate stores:
- Formulas → FormulaRegistry
- Algorithms → AlgorithmRegistry
- Tribal tips → auto-ingested-tips.ts
- Machine data → ControllerKnowledgeDBEngine

### 6. Report
Output:
- Documents processed
- Formulas extracted
- Algorithms extracted
- Tribal tips added
- Duplicates skipped
- Errors encountered

## Example Outputs
```
PDF LEARN COMPLETE
Documents: 3 processed
Formulas: 12 extracted (4 new, 8 existing)
Algorithms: 5 extracted (2 new)
Tribal Tips: 23 categorized
Duplicates Skipped: 15
Errors: 0
```

## Related Commands
- `/pdf-process` — Lower-level PDF pipeline
- `/ingest` — General data ingestion
- `/shop-knowledge` — Tribal knowledge extraction
- `/forge-triple` — Create engines from extracted knowledge

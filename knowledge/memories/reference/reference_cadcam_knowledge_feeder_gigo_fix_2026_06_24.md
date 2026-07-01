---
name: reference_cadcam_knowledge_feeder_gigo_fix_2026_06_24
description: CAD/CAM tribal knowledge feeders hardened GIGO-safe + grown; the tribal pointer-index is a DIFFERENT layer than the closed-loop training-pair audit (slot:zulu 2026-06-24)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.492Z
aliases: reference_cadcam_knowledge_feeder_gigo_fix_2026_06_24
---


Work order: "improve knowledge for cad/cam to improve closed loop training." slot:zulu 2026-06-24.

**What was done (verified):**
- Ran the existing pipeline (`auto-resource-pdf-spec-emit.mjs` -> `consolidate-cadcam-corpus.mjs` -> `extract-cadcam-tribal-wiki.mjs`) over the resources corpus: specs 901 -> 1210, CAM tribal feeder 598 -> 809 verified entries (all citing real files), CAD feeder cleaned to 12 valid.
- **Hardened `scripts/extract-cadcam-tribal-wiki.mjs` GIGO-safe**: added a `sourceExists` filter (`e.source && fs.existsSync(e.source)`) before writing `state/shared/{cad,cam}-tribal-corpus.jsonl`. It dropped **10 cad + 58 cam dead/empty pointers** (the regen had introduced/exposed broken pointers; CAD was 22 entries but only 12 valid). Every future regen is now 100%-integrity. A closed-loop knowledge feeder must NEVER point at a missing source -- broken pointers are GIGO for delta/kilo RAG + downstream training (R9).

**Key non-obvious finding (R12 -- corrects the naive assumption):**
The **tribal pointer-index** (`{cad,cam}-tribal-corpus.jsonl`, what delta/kilo read as RAG references) is a **DIFFERENT LAYER** than what the closed-loop **training-coverage audit** (`scripts/audit-closed-loop-training-coverage.mjs`) measures. The audit counts extracted training **PAIRS** (e.g. CAD 82 rows / 29 pairs from the OCR/capture pipeline), NOT the pointer index. So growing the tribal index from 598->809 did **NOT** move the audit (cad still 82/29, cam still ABSENT). Improving "knowledge" (the index) and improving "closed-loop training coverage" (the extracted pairs) are separate work items.

**Built this session:** `scripts/cadcam-reclassify-ollama.mjs` -- a resumable Ollama path/id/kind reclassifier writing a durable `state/shared/cadcam-classify-overrides.json` sidecar that `consolidate-cadcam-corpus.mjs` now OR-applies (conf>=0.7, never un-sets a regex hit). Reusable for when OCR text is available.

**CONCLUSIVE empirical result (R12 -- proves the CAD lever):** ran the path-classifier over 224 of 861 not-cad entries -> 58 cam, 166 neither, **0 CAD recovered**, 0 net change to the feeders. Path/filename/kind metadata **cannot** recover CAD -- the CAD docs are **content-locked** (which is exactly why their filenames carry no CAD signal). Did NOT scale to the remaining 637 (proven-null; more would yield ~0).

**OCR-CONTENT PROOF (R15 validate-with-numbers, REFRAMES the problem):** extracted FIRST-PAGE TEXT (pdftotext) for 8 path-"neither" PDFs and content-classified via Ollama -> **cad:0, cam:7, neither:1**. Content-classify WORKS (correctly recovered 7 CAM docs the regex missed -- CIMCO post-processor samples / milling cycles, conf 0.8-0.9 with real reasons) -- but found **0 CAD**. So the "neither" pool is **genuinely CAM/manual**, NOT hidden CAD. **CORRECTION of the earlier assumption:** the CAD feeder is thin (12) NOT because of a classifier bug -- the `resources/` PDF corpus is genuinely CAM/post-processor/manual-heavy. **CAD knowledge for the closed loop must source from JM DIE part DRAWINGS (xray blueprint-OCR pipeline) + the CAD FILES geometry dir -- NOT from reclassifying resources/ PDFs.** Re-routing: CAD-feeder growth -> xray (JM-drawing OCR) + delta; resources/ content-reclassify -> kilo (it grows the CAM feeder, ~7+ recoverable per 8). The path-reclassifier + OCR-content method both work; the corpus just doesn't contain the CAD.

**Open / routed (next phases):**
1. **CAD starvation** (12 valid CAD vs 809 CAM): root-caused above -- needs OCR content-classification, NOT more metadata classification. Owner: delta/india.
2. **Closed-loop training PAIRS** (the audit metric): needs feeding the extraction/converter pipeline (CAM is "absent"; post-processor/post-machine/ghost-wiring are "no-converter"). Owner: india (training) + xray (OCR) + kilo (CAM).

Related: [[reference_cadcam_tribal_wiki_extract_2026_05_24]] (iter24 original generator) - [[feedback_use_lima_pypdf_page_extractor]] (canonical PDF extractor for content reads).

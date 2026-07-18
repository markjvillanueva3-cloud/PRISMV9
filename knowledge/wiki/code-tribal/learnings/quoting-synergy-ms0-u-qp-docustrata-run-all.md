# QUOTING-SYNERGY-MS0/U-QP-DOCUSTRATA-RUN-ALL — end-to-end document->pair pipeline

**Commit:** `635b41af7641` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T15:29:59-05:00
**Tags:** quoting-synergy-ms0, u-qp-docustrata-run-all, auto-distilled

## Subject
[QUOTING-SYNERGY-MS0]/U-QP-DOCUSTRATA-RUN-ALL: end-to-end document->pair pipeline

## Body
```
[QUOTING-SYNERGY-MS0]/U-QP-DOCUSTRATA-RUN-ALL: end-to-end document->pair pipeline

Run ALL 35,231 JM quote/order PDFs through text-extraction/OCR -> the existing
extractor -> coverage. The .index never covered these folders (0 records inside
them); they were un-indexed + un-OCR'd raw on disk. Folder name = ground-truth role.

- buildTranscriptionPrompt + --transcribe (vision runner): document verbatim text
  transcription vs blueprint dimensions. Additive; blueprint path byte-unchanged.
- scripts/lib/docustrata-doc-pipeline-lib.mjs: pure core (work-set, folder source,
  cheap-first routing, merge, coverage funnel). 31 node:test cases.
- scripts/lib/pdf-text-layer-extract.py: pypdf cheap route (lima's method,
  generalized to worklist->jsonl). 120/120 sampled docs born-digital -> no GPU.
- scripts/docustrata-run-all-documents.mjs: orchestrator. --from-folders globs the
  real corpus; --dry-run/--limit/--routes/--ocr-time-budget-min; resumable.

Quantified finding (120-doc stratified sample): Quotes=engineering drawings,
Sales Orders=customer/part travelers (0 $), Orders Closed=actual-price source
(~35% carry $). The price-pair ceiling was never data-absence; the $ data lives
in Orders Closed + the accounting system (hotel), not the Quotes folder. Next
leg: retarget extract-docustrata-outcomes field-mining per doc-type.
```

## Files touched (7)
- scripts/docustrata-run-all-documents.mjs         | 339 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/docustrata-doc-pipeline-lib.mjs      | 273 ++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/docustrata-doc-pipeline-lib.test.mjs | 293 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/ollama-vision-extract-lib.mjs        |  36 +++++++
- scripts/lib/pdf-text-layer-extract.py            | 115 ++++++++++++++++++++++
- scripts/run-ollama-vision-extract.mjs            |  26 ++++-
- 6 files changed, 1078 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 635b41af7641`
- Milestone envelope: `mcp-server/data/milestones/QUOTING-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
# CAD-LEARNING-AI/U-BPA-RAG-RECORDOUTCOME — [MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-RAG-RECORDOUTCOME (slot:india): wire blueprint_rag_extract recordOutcome IO to canonical shared ledger writer

**Commit:** `e2fa23c46fe6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T14:09:19-05:00
**Tags:** cad-learning-ai, u-bpa-rag-recordoutcome, auto-distilled

## Subject
[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-RAG-RECORDOUTCOME (slot:india): wire blueprint_rag_extract recordOutcome IO to canonical shared ledger writer

## Body
```
[MAIN-FORCE] [CAD-LEARNING-AI]/U-BPA-RAG-RECORDOUTCOME (slot:india): wire blueprint_rag_extract recordOutcome IO to canonical shared ledger writer

The MCP blueprint_rag_extract path dropped its prediction->outcome signal: the
cadDispatcher io block (engine accepts io.recordOutcome) never supplied it, so
only the script-driven pipelines (harvest / print-to-cam / vision-extract) fed
the shared closed-loop ledger. Every MCP-path extraction was lost to retrain.

Fix: supply recordOutcome in the io block, backed by the CANONICAL writer
scripts/lib/blueprint-accuracy-event-writer.mjs (recordExtractionOutcome) via a
CWD-independent dynamic import -- NEVER a raw append. Resolves repo-root via the
proven in-file import.meta.url idiom (~L2447: dist/tools/dispatchers ../../.. =
mcp-server, +1 .. = repo root where scripts/ lives; identical depth under tsx
from src). The builder emits the typed outcome_record (kind:rag_extraction,
accurate:null = unconfirmed prediction) the consumer-lib routes -- not the
unknown drop bucket. Engine wraps recordOutcome in try/catch (advisory) and
appendAccuracyEvent is fail-soft on I/O, so a record failure never breaks the
returned extraction.

This is the .mjs/.ts seam decided in reference_recordoutcome_mjs_ts_seam (option
B: server-injected, single-source the event shape -- NO drift-prone TS dup).

TEST (new cadDispatcher.blueprint-rag-recordoutcome.test.ts, 6/6): round-tripped
THROUGH the prism_cad handler + the REAL consumer-lib -- happy + floor-
independence + append-only invariant + 2 guard-reject failure modes + adversarial
mixed-blob. tsc clean on both files.
```

## Files touched (3)
- ...dDispatcher.blueprint-rag-recordoutcome.test.ts | 166 +++++++++++++++++++++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts  |  20 +++
- 2 files changed, 186 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e2fa23c46fe6`
- Milestone envelope: `mcp-server/data/milestones/CAD-LEARNING-AI.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
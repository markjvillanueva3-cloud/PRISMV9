# BLUEPRINT-OCR-TRAINING-MS1/U-PSN-AI-ROUTING — [MAIN] [BLUEPRINT-OCR-TRAINING-MS1]/U-PSN-AI-ROUTING (slot:papa iter2): AISystemRouterEngine +blueprint_extraction +corpus_harvest task classes

**Commit:** `fb15ea5badaf` · **By:** markjvillanueva3-cloud · **At:** 2026-05-23T17:05:20-05:00
**Tags:** blueprint-ocr-training-ms1, u-psn-ai-routing, auto-distilled

## Subject
[MAIN] [BLUEPRINT-OCR-TRAINING-MS1]/U-PSN-AI-ROUTING (slot:papa iter2): AISystemRouterEngine +blueprint_extraction +corpus_harvest task classes

## Body
```
[MAIN] [BLUEPRINT-OCR-TRAINING-MS1]/U-PSN-AI-ROUTING (slot:papa iter2): AISystemRouterEngine +blueprint_extraction +corpus_harvest task classes

Trains PSN AI-routing leg to recognize the 6 new docu/OCR engine capabilities
(BlueprintExtractionRAG, PDFBlueprintPatternRescue, BlueprintCoverageAudit,
BlueprintLoRABridge, BlueprintCorpusHarvest, JMDieArchiveBackAnnotation). Before
this, route() returned "unknown" for "extract blueprint" / "harvest corpus" /
"ocr title block" — routing layer was PSN-blind to MS1's shipped engines.

Changes (surgical, per Karpathy R3):
- TaskClass union: +blueprint_extraction +corpus_harvest (9 -> 11)
- classify(): 2 new regex tests placed AFTER code_review + search (so "review
  the ocr engine" still routes to code_review and "find blueprints with X"
  still routes to search — ordering preservation tests added)
- route() switch: 2 new cases, both -> local-mcp (these are local MCP actions;
  vision LLM is invoked inside the RAG engine, not by the router)
- getStats() task_classes: 9 -> 11

Tests: 24/24 PASS. +6 new (2 per new class + 2 ordering-preservation +
getStats verification). Existing 18 still pass — ordering preserved.

PSN leg trained: #11 (PRISM AI routing). The 6 new engines were dispatcher-
wired (cad/cam/dev) but the router classifier was blind to them — now intent
"extract the title block from this blueprint" deterministically routes to
local-mcp via blueprint_extraction taskClass.
```

## Files touched (3)
- .../src/__tests__/AISystemRouterEngine.test.ts     | 62 ++++++++++++++++++++++
- mcp-server/src/engines/AISystemRouterEngine.ts     | 28 +++++++++-
- 2 files changed, 89 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- till routes to code_review and "find blueprints with X"
- till routes to search — ordering preservation tests added)
- till pass — ordering preserved.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fb15ea5badaf`
- Milestone envelope: `mcp-server/data/milestones/BLUEPRINT-OCR-TRAINING-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
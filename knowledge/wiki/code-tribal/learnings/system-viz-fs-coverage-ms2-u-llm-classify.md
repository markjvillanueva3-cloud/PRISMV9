# SYSTEM-VIZ-FS-COVERAGE-MS2/U-LLM-CLASSIFY — Ollama LLM-judgment routes 126/139 of UNKNOWN tail

**Commit:** `06f3fa418fce` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T20:37:53-05:00
**Tags:** system-viz-fs-coverage-ms2, u-llm-classify, auto-distilled

## Subject
[SYSTEM-VIZ-FS-COVERAGE-MS2]/U-LLM-CLASSIFY: Ollama LLM-judgment routes 126/139 of UNKNOWN tail

## Body
```
[SYSTEM-VIZ-FS-COVERAGE-MS2]/U-LLM-CLASSIFY: Ollama LLM-judgment routes 126/139 of UNKNOWN tail

Final-tier dispatcher inference for engines that survived keyword + sibling-prefix inference. Reads each engine file's top-30 lines (imports + class signature + JSDoc), batches 10 engines per Ollama qwen2.5-coder:7b call, parses JSON response with defensive markdown-stripping + dispatcher-whitelist validation.

Results:
  Batches: 14 × ~2s = ~28s total Ollama time
  Classified: 126/139 (91% success rate)
  Failures: batch 4 (2/10), batch 8 (10/10 — likely malformed JSON), batch 13 (1/10)

Cumulative UNKNOWN tail collapse (810 unwired engines, 4-tier inference):
  Initial keyword-only:             494 UNKNOWN (61%)
  After 17 new keyword patterns:    331 UNKNOWN (41%)
  After sibling-prefix inference:   139 UNKNOWN (17%)
  After LLM classification:          13 UNKNOWN (1.6%)

Coverage: 316/810 → 797/810 (39% → 98% confident proposed-wire edges)

Confidence tiers (capped + non-overlapping):
  keyword:  0.50 - 0.85  (deterministic pattern match)
  sibling:  0.40 - 0.65  (statistical inference from wired siblings)
  LLM:      0.55         (qwen2.5-coder:7b judgment, capped below sibling tier)

Graph state: 373,635 nodes · 592,239 → 592,365 edges (+126 LLM-derived ghost-wires)

New artifact: scripts/seed-ghost-llm-classify.mjs (13 exports, fully pure-extractable):
  readEngineHeader(path, maxLines) — file-header slicer
  buildBatchPrompt(engines) — generates classifier prompt with dispatcher whitelist
  callOllamaBatch(engines, opts) — Promise<{ok, parsed | error}>, injectable fetch + timeoutMs
  parseBatchResponse(raw, engines) — markdown-fence-tolerant, dispatcher-whitelist-filtered
  chunkBatches(arr, n) — pure splitter
  loadUnknownGhosts(graphPath) — reads graph for kind=ghost.unwired-engine, proposed_wiring='UNKNOWN'
  VALID_DISPATCHERS (16) · LLM_CONFIDENCE (0.55) · DEFAULT_MODEL (qwen2.5-coder:7b)

Tests: 24/24 PASS (readEngineHeader, buildBatchPrompt, parseBatchResponse 8 cases including markdown-fence + dispatcher-whitelist rejection + partial-valid + adversarial JSON, callOllamaBatch 4 cases with injected fetch+timeout, chunkBatches 3 cases)

Failure modes handled: Ollama unreachable → skip, batch timeout → log+skip, malformed JSON → fall back to UNKNOWN, invalid dispatcher → reject.

Cumulative session: 8 commits, 810 unwired engines now 98% have proposed-wire path.
```

## Files touched (3)
- scripts/seed-ghost-llm-classify.mjs      | 310 +++++++++++++++++++++++++++++++
- scripts/seed-ghost-llm-classify.test.mjs | 191 +++++++++++++++++++
- 2 files changed, 501 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 06f3fa418fce`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-FS-COVERAGE-MS2.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
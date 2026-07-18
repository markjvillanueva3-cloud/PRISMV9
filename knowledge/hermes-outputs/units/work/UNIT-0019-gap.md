# UNIT-0019 — Exception Pattern Learning and Automated Rule Generation — GAP ANALYSIS
_Analyst: india (ai-training soul) · 2026-07-02 · every claim cited file:line, read-verified_

## Existing coverage

**Exception detection + learning engine — EXISTS AND IS WIRED (the unit's headline deliverable):**
- `mcp-server/src/engines/ExceptionLearningEngine.ts:55-300` (read end-to-end) — `handleUnexpected()` capture/analyze/fail-decision (:64-87), `analyzeException()` per-type cause/recommendation/pattern lists (:92-142), `recordOutcome()` success→tribal-tip + envelope-expansion proposal (:176-201), `generateTribalTip()` (:206-220), `getEnvelopeProposals()` (:249-253), `export()/import()` persistence surface (:280-297).
- Wired to prism_ai: `aiReasoningDispatcher.ts:2816-2858` — `ai_exception_handle / ai_exception_record_outcome / ai_exception_pending / ai_exception_stats` (U-WIRE31).
- Registered: `AISubsystemRegistry.ts:137`. Tested: `__tests__/aiReasoningDispatcher.uwire31.test.ts:22-77` (engine-direct + dispatcher round-trip) and `__tests__/aiReasoningDispatcher.devProcess.test.ts:169-171`.

**Rule generation with physics grounding — partial, lathe-domain:**
- `mcp-server/src/engines/TurningRulesGeneratorEngine.ts:1-59` — generates structured machining-rule envelopes (velocity/feed/DoC/spindle/chatter) per material × tool × machine × operation; rule `source` field cites Kienzle/Sandvik/Machinery's Handbook/JM Die tribal (:43); JSON-serializable (:17).
- `mcp-server/src/engines/WEDMJobPatternLearnerEngine.ts` — exists with test file (PARTIAL-UNVERIFIED: body not read this session).
- Error-pattern promotion pipeline: `.claude/hooks/error-pattern-promote.mjs` exists (verified by ls; Stop hook per root CLAUDE.md §HOOK ENFORCEMENT GATES).

**Digital thread auditor (also demanded here, primary home is UNIT-0020):**
- `mcp-server/src/engines/DigitalThreadEngine.ts:66-107` — `trace()` computes completeness, coverage %, broken links, propagation risks, traceability score; wired at `automationDispatcher.ts:20,65-67` (`digital_thread` action).

## Real gaps
1. **No actual pattern LEARNING** — `analyzeException()` returns CANNED per-type cause/recommendation lists (:97-133); there is no clustering, frequency analysis, or cross-event pattern mining. "Learning" today = accumulating a list, not generalizing from it.
2. **No persistence wiring** — state is an in-memory ring buffer (`maxEvents 2000`, :59,72-74); `export()/import()` (:280-297) exist but no dispatcher action or store calls them (grep of dispatcher wiring at aiReasoningDispatcher.ts:2816-2858 shows only handle/record/pending/stats). Learned exceptions die with the process.
3. **Generated tribal tips are orphaned** — `generateTribalTip()` returns an object; no call site pushes it into the TribalKnowledgeEngine store (not found in the engine or its dispatcher block; absence within those read files verified, repo-wide absence NOT exhaustively proven).
4. **No generic exception→rule pipeline** — TurningRulesGeneratorEngine is lathe-only and generates rules from catalogs/physics, not from learned exceptions; the unit's "automated rule generation" from exceptions has no producer-consumer link.
5. **No real JM Die exception validation** (acceptance criterion) — no evidence of a JM Die exception corpus feeding the engine; all tests use synthetic events (uwire31.test.ts:47-77).

## Verdict
**extend**

## Recommended next action
Skip the "build ExceptionLearner" step entirely — it exists, is wired, and is tested. The genuine unit is a three-part extension in logical order (R13): (1) persistence — wire `export()/import()` to a schemaVersioned state JSON (or the existing outcome backbone) plus a dispatcher `ai_exception_export/import` pair so learned exceptions survive restarts; (2) close the tribal-tip loop — on `recordOutcome(success)`, persist the generated tip through the existing tribal-knowledge store instead of returning it into the void; (3) real pattern mining + validation — mine actual JM Die exceptions (scrap ledger / NCR / regression entries) into `handleUnexpected()` events, then add frequency/cluster analysis over the persisted corpus and emit envelope proposals into TurningRulesGeneratorEngine-style rule envelopes for at least one non-lathe domain. Gate any "learning improves rules" claim on measured before/after numbers per the metrics-gated escalation rule.

## ROI
**6/10** — the expensive core (engine + prism_ai wiring + tests) is done; the remaining work (persistence, tip-loop closure, real-data mining) is moderate effort with high compounding value for the closed-loop learning backbone, but the canned-analysis→real-mining upgrade is nontrivial.

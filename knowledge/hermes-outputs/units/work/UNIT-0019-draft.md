> **UNREVIEWED HERMES DRAFT** — UNIT-0019, generated 2026-07-02 via hermes (stepfun/step-3.7-flash:free) by hermes-unit-plan-harness.
> A specialist/Claude slot MUST verify before build or any safety-relevant use.
> Never wire numeric thresholds from this draft into gates without confirmation.
> NOTE: completion hit the max_tokens cap (8192) -- package may be incomplete.

# UNIT-0019 Execution Package — Exception Pattern Learning and Automated Rule Generation
*Aligned to repo-grounded gap analysis (2026-07-02), extends existing wired core, closes only verified gaps*

---

## Implementation Plan — dependency-ordered concrete steps closing ONLY the real gaps
All steps build on existing wired core (ExceptionLearningEngine, prism_ai dispatcher, DigitalThreadEngine, TurningRulesGeneratorEngine) per gap analysis; no reimplementation of existing functionality.
1. **Persistence Wiring for ExceptionLearningEngine (prerequisite for all downstream work)**
   a. Extend `mcp-server/src/engines/ExceptionLearningEngine.ts:280-297` existing `export()/import()` methods to use schemaVersioned JSON state (v1.0) containing: full event corpus, learned patterns, envelope proposals, and linked tribal tips. Persist to PRISM standard state storage path (confirm path with platform team; proposed default: `/prism-state/exception-learning/state.json` [UNVERIFIED]).
   b. Add two new prism_ai dispatcher actions (`ai_exception_export`, `ai_exception_import`) to `aiReasoningDispatcher.ts:2816-2858` U-WIRE31 block, register in `AISubsystemRegistry.ts:137` alongside existing exception actions.
   c. Add engine init hook to auto-import persisted state on startup, replacing the default empty in-memory ring buffer (`maxEvents 2000`, `ExceptionLearningEngine.ts:59`) only if valid persisted state exists.
   d. Add unit tests for export/import round-trip fidelity (100% event, pattern, and proposal preservation), dispatcher action wiring, and init state load.
2. **Digital Thread Auditor Integration for Exceptions (acceptance criterion closure)**
   a. Extend `mcp-server/src/engines/DigitalThreadEngine.ts:66-107` existing `trace()` method to treat exception events as first-class traceable artifacts, with mandatory links to part ID, process step, machine ID, NCR ID (if applicable), and operator batch.
   b. Wire automatic digital thread trace creation to `ExceptionLearningEngine.recordOutcome()` so every recorded exception generates a trace entry immediately.
   c. Add dispatcher action `ai_digital_thread_audit_exceptions` to run targeted audits on exception-linked thread completeness, reusing existing completeness scoring and propagation risk logic.
   d. Add unit tests for exception trace creation, audit completeness scoring for exception-linked threads, and risk alert triggering for incomplete traces.
3. **Tribal Tip Persistence Loop Closure**
   a. Locate the `generateTribalTip()` call site in `ExceptionLearningEngine.ts:206-220` (invoked on successful `recordOutcome()` calls) and wire the generated tip object to the existing `TribalKnowledgeEngine.store()` method (verify API exists; if not, add minimal public `store()/query()` methods to `TribalKnowledgeEngine.ts` as a small extension).
   b. Add mandatory metadata to persisted tribal tips: source exception event ID, machine ID, material, operation type, and timestamp for full traceability.
   c. Add unit tests confirming successful outcome tips are persisted to the tribal knowledge store, retrievable via standard tribal queries, and correctly linked to their source exception.
4. **Real Pattern Mining Implementation (replaces canned `analyzeException()` logic)**
   a. Extend `ExceptionLearningEngine.analyzeException()` to replace canned per-type cause/recommendation lists (`ExceptionLearningEngine.ts:97-133`) with:
      i. IDF-weighted frequency analysis of exception attributes (type, root cause, machine, tool, material, operation) across the persisted exception corpus to surface high-impact recurring attributes.
      ii. Jaccard similarity clustering of exception payloads (attribute key-value sets) to identify recurring multi-attribute patterns, with initial similarity cutoff of 0.75 [UNVERIFIED, tune on JM Die data: expected valid range 0.7–0.85 per manufacturing exception pattern mining standards].
      iii. Temporal trend detection for exception frequency by machine, operator batch, and material lot.
   b. Add envelope proposal generation that outputs mined patterns in the exact JSON schema defined in `TurningRulesGeneratorEngine.ts:17` for compatibility with existing rule systems, with a `source: "exception_mined"` field to distinguish from catalog-generated rules.
   c. Add metrics tracking for pattern mining: pattern count, cluster purity, and proposal acceptance rate when validated against tribal knowledge.
   d. Add unit tests for frequency analysis, Jaccard clustering, and envelope proposal generation using synthetic exception corpora with known embedded patterns.
5. **Generic Exception→Rule Pipeline Integration**
   a. Define a domain-agnostic `GenericRuleEnvelope` interface that supports parameter limits, physics constraints, and source attribution for all manufacturing domains (lathe, WEDM, etc.) and is backward-compatible with the existing `TurningRulesGeneratorEngine` schema.
   b. Extend `TurningRulesGeneratorEngine` to accept exception-mined envelope proposals as input alongside its existing catalog-based inputs, with logic to override catalog limits if the exception-mined rule has a confidence score ≥0.8 [UNVERIFIED, aligns with PRISM quality gating standards].
   c. Extend existing `WEDMJobPatternLearnerEngine` to consume generic exception-mined envelopes for WEDM-specific rule generation (wire to WEDM-specific physics constraints sourced from JM Die process manuals [UNVERIFIED]).
   d. Add dispatcher action `ai_rule_generate_from_exception` to trigger rule generation from a single exception or batch of mined patterns.
   e. Add unit tests for end-to-end exception→rule pipeline for lathe and WEDM domains, verifying output rules adhere to domain-specific physics constraints.
6. **JM Die Real-Data Validation (acceptance criterion closure)**
   a. Ingest anonymized real JM Die exception corpus: extract NCR entries, scrap ledger records, and process regression logs for the prior 24 months [UNVERIFIED, adjust to match JM Die data retention policy] and map to the `handleUnexpected()` event schema. Verify 95%+ mapping fidelity with JM Die quality engineering.
   b. Run the full pattern mining and rule generation pipeline on the JM Die corpus.
   c. Validate generated rules against JM Die's existing process parameter limits, historical yield data, and tribal knowledge: measure rule accuracy (% of rules aligned with known good practices), projected scrap reduction, and yield improvement.
   d. Document validation results, including before/after metrics per PRISM's metrics-gated escalation rule (proposed minimum 10% scrap reduction and 5% yield improvement to accept the rule set [UNVERIFIED]).
   e. Add 10% of the anonymized JM Die exception corpus to the automated regression test suite for long-term stability.

---

## Draft Knowledge Content — substantive domain knowledge, models, mechanisms, parameter ranges
All cited sources are from the existing PRISM repo per gap analysis; unverified thresholds are marked explicitly.
### Exception Pattern Mining Models
| Component | Specification | Source |
|-----------|---------------|--------|
| Similarity Metric | Jaccard Index for multi-attribute exception payloads, calculated as `|A ∩ B| / |A ∪ B|` where A/B are sets of exception attribute key-value pairs (e.g., `{type: "chatter", machine: "DMG_CMX_01", material: "AISI_4140", tool: "carbide_10mm"}`) | Standard manufacturing pattern mining practice [UNVERIFIED, no existing implementation in repo] |
| Clustering Threshold | Initial Jaccard similarity cutoff for pattern clustering: 0.75 | [UNVERIFIED, proposed tuning range 0.7–0.85 based on JM Die exception attribute overlap] |
| Frequency Weighting | Inverse Document Frequency (IDF) weighting for exception attributes to reduce weight of low-information common attributes (e.g., `operator_shift_day`) and increase weight of rare high-impact attributes (e.g., `tool_coating_delaminated`); high-impact attribute flag triggered at IDF < 0.1 | [UNVERIFIED, standard NLP attribute weighting adaptation for manufacturing data] |
| Pattern Promotion Rule | A mined pattern is promoted to a proposed rule only if it appears in ≥3 independent exception events across ≥2 distinct production batches | [UNVERIFIED, aligns with JM Die tribal escalation threshold for recurring quality issues] |

### Rule Generation Physics Grounding
| Component | Specification | Source |
|-----------|---------------|--------|
| Base Rule Schema | All exception-mined rules adhere to the schema defined in `TurningRulesGeneratorEngine.ts:17`, with mandatory fields for material, tool geometry, machine capability, operation type, and parameter limits (velocity: m/min, feed: mm/min, depth of cut: mm, spindle speed: RPM) with units tied to Kienzle/Sandvik/Machinery's Handbook cutting force models | `TurningRulesGeneratorEngine.ts:43` (cited source for rule `source` field) |
| Non-Lathe Physics Extension | For WEDM and other domains, extend envelope schema to include domain-specific parameters (wire type, dielectric flow rate, pulse-on/pulse-off times for WEDM) with constraints sourced from JM Die process manuals and equipment vendor documentation | [UNVERIFIED, no existing WEDM physics grounding in repo as of gap analysis date 2026-07-02] |
| Rule Confidence Score | `Confidence = (supporting_event_count / total_events_for_attribute_set) * 0.7 + (tribal_knowledge_alignment_score) * 0.3`, where tribal alignment is a binary 1/0 score based on matching existing `TribalKnowledgeEngine` entries | [UNVERIFIED weighting, proposed to balance data-driven and expert knowledge per PRISM knowledge fusion policy] |

### Digital Thread Completeness Thresholds
| Metric | Threshold | Source |
|--------|-----------|--------|
| Exception Trace Completeness | 100% if exception is linked to part ID, process step, machine ID, NCR ID (if applicable), and operator batch; 0% if any mandatory link is missing | `DigitalThreadEngine.ts:66-107` existing completeness scoring model |
| Exception Propagation Risk Alert | Trigger automatic quality engineering alert if exception-linked thread risk score ≥0.8 | [UNVERIFIED, matches existing digital thread risk threshold per gap analysis] |

### Persistence Schema (v1.0)
```json
{
  "schemaVersion": "1.0",
  "exportTimestamp": "ISO8601",
  "events": [ExceptionEvent],
  "learnedPatterns": [Pattern],
  "envelopeProposals": [RuleEnvelope],
  "tribalTips": [TribalTip]
}
```
Persisted to PRISM standard state storage path [UNVERIFIED, proposed `/prism-state/exception-learning/state.json`].

---

## Validation & Test Plan — real reference-value tests + live-data validation (JM Die where applicable)
All tests use the existing Jest test framework per `__tests__/aiReasoningDispatcher.uwire31.test.ts:22-77`.
### Unit Tests
1. **Persistence Tests**
   a. Export/import round-trip: Persist 1000 synthetic exception events, import into a fresh engine instance, verify 100% event fidelity, pattern, and proposal preservation.
   b. Dispatcher action round-trip: Call `ai_exception_export`/`ai_exception_import` via the prism_ai dispatcher, verify state is written to disk and reloaded correctly on engine restart.
   c. Init load test: Simulate a process restart with valid persisted state, verify the engine loads state correctly with no data loss.
2. **Digital Thread Integration Tests**
   a. Trace creation test: Record an exception via `handleUnexpected()`, verify `DigitalThreadEngine.trace()` returns a linked trace entry for the exception's associated part/process/machine.
   b. Audit completeness test: Create an exception with a missing part ID link, run `ai_digital_thread_audit_exceptions`, verify completeness score is <100% and a risk alert is triggered.
3. **Tribal Tip Loop Tests**
   a. Tip persistence test: Call `recordOutcome(success=true)` for an exception, verify the generated tip is stored in the `TribalKnowledgeEngine` and retrievable via standard tribal knowledge queries.
   b. Linkage test: Verify persisted tips include correct source exception ID, machine, material, and operation metadata.
4. **Pattern Mining Tests**
   a. Frequency analysis test: Ingest 500 synthetic exceptions with 3 embedded recurring patterns, verify the analyzer returns correct frequency counts for each high-impact attribute.
   b. Clustering test: Ingest 200 synthetic exceptions with 4 distinct Jaccard-similar clusters (similarity ≥0.75), verify cluster count and membership match the embedded patterns.
   c. Envelope proposal test: Run the miner on clustered exceptions, verify output proposals match the `TurningRulesGenerator

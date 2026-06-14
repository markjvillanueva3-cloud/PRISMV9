---
name: reference_mill_tribal_training_bridge_unwired_2026_06_02
description: "Mill training assessment (foxtrot 2026-06-02): the tribal↔training plumbing for print→mill-program MOSTLY EXISTS + is wired — content/injection is NOT the bottleneck. Real gaps are narrow: TribalKnowledgeTrainingEngine is orphaned, and MillingPrintToProgramEngine's tribal import depth is unverified. The synthetic closed-loop template trainer is tribal-agnostic by design."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.218Z
aliases: reference_mill_tribal_training_bridge_unwired_2026_06_02
---


# Mill print→program training: knowledge plumbing mostly wired — gap is narrow, not content (foxtrot, 2026-06-02)

**Question (operator /goal):** does the milling-wizard galaxy need MORE wiki/tribal *injection* to train its print→mill-program pipelines?

**Answer: largely NO.** Wiki/tribal CONTENT is adequate and the tribal↔training plumbing mostly exists. The opportunities are small verify-and-wire tasks, not a content/injection shortage. (Assessed via direct bounded reads — two Workflow attempts stalled on Explore-subagent throttling, [[reference_alpha_explore_agent_schema_incompat]]; the pre-write graph context caught a too-narrow first draft and forced this correction — R12.)

## Verified evidence
- **Wiki content adequate.** ~50 mill-relevant entries in `knowledge/wiki/index.md` (1338 total); mill is NOT in the worst-3 coverage domains (dev-infra/logistics/post-processor are).
- **Tribal PRODUCTION is wired.** `MillProgramLearningEngine` ("Statistical learning from JM DIE mill archive → feeds/speeds norms + tribal tips") learns from the JM archive and EMITS tips via `millTribalKnowledgeEngine.add(tip)` (L266). Archive→tribal-corpus flows.
- **Tribal CONSUMPTION path exists.** `MillingPrintToProgramEngine` imports `tribalKnowledgeEngine` (L67) and is dispatcher-wired (millDispatcher). `MillingKnowledgeOrchestratorEngine` consumes `MillTribalIntegrationEngine`. `MillPartFamilyTemplateExtractorEngine` consumes `TribalKnowledgeEntry`.
- **Tribal→NN-signal bridge exists + wired.** `MillTribalIntegrationEngine` (`@milestone MILL-TRIBAL-MS0`: "Converts tips to neural network training signals; Speeds/feeds tribal rules") → wired to knowledgeDispatcher. `CAMTribalRAGEngine` → camDispatcher. CAM already ran `U-CAM-TRIBAL-WIRE` (928 tips). Prior milestone `AUDIT-TRIBAL-BRIDGE-FIX/U-MILL-TRIBAL-LOOP` exists.

## The narrow REAL gaps (not "need more content")
1. **`TribalKnowledgeTrainingEngine` is ORPHANED (unwired)** — a genuine wiring gap.
2. ~~MillingPrintToProgramEngine's tribal import looks thin~~ **RESOLVED — it genuinely consumes tribal**: L2231 `tribalKnowledgeEngine.search(...)` is called during program generation and `tribal_tips` is surfaced in its output (L355). Not a dead import; the print→program pipeline already searches the tribal corpus.
3. **The synthetic closed-loop template trainer** (`MillTemplateTrainingHarnessEngine`, `source:"template_training"` + deterministic inject_failure/chatter) is tribal-agnostic. This is arguably BY DESIGN (a coverage/stress harness, not the real-data learning path) — but tribal-grounding its starting conditions is a possible enhancement, not a blocker.
4. Chat-context injectors (`wiki-precheck-inject`, `wiki-recall-on-read`, `tribal-inject-on-edit`) feed the operator's chat, distinct from the training corpus — fine as-is.

## Recommended next units (foxtrot lane unless tagged)
- **U-MILL-PTP-TRIBAL-DEPTH-VERIFY** — confirm MillingPrintToProgramEngine actually uses its tribal import end-to-end (fix or remove the thin import). Cheap, high-signal.
- **U-MILL-TRIBAL-TRAINER-ENGINE-WIRE** — wire the orphaned `TribalKnowledgeTrainingEngine` to a dispatcher (or mark WIRE-EXEMPT if superseded by MillTribalIntegrationEngine).
- (optional) tribal-ground the synthetic trainer's starting conditions.
- Cross-lane: deeper RAG/LoRA corpus health = india-lane ([[feedback_domains_own_ai_training_systems]]).

## How to apply
- For any "need more knowledge injection?" question: distinguish content-missing from content-exists-but-thin-wiring, AND grep BROADLY (not 3 files) before declaring an orphan — the pre-write graph context is a real backstop against stale gap claims.
- Relates: [[reference_jm_vmc_spindle_envelopes_2026_06_02]] · [[reference_mill_domain_atlas_for_foxtrot_2026_05_27]] · [[feedback_domains_own_ai_training_systems]].

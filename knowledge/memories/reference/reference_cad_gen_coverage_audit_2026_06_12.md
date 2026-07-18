---
name: reference_cad_gen_coverage_audit_2026_06_12
description: "CAD-generation-technique coverage audit - 361-technique taxonomy, ~7% real coverage, the gap map + the agent-spawning rate-limit workaround (2026-06-12 slot:india)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.494Z
aliases: reference_cad_gen_coverage_audit_2026_06_12
---


# CAD-generation-technique coverage audit (2026-06-12, slot:india)

**Goal:** assess whether wiki+tribal cover every possible CAD generation technique (corpus-readiness
for "draw any part from print 100%"). Workflow `wf_980af3a7-06e`.

**Denominator built:** **361 canonical CAD generation techniques**, 33 categories. Authoritative,
reusable. Full list: `state/shared/specs/CAD-GEN-TECHNIQUE-COVERAGE-AUDIT-2026-06-12.raw.txt`.

**VERDICT: ~7% real coverage / ~19% concept-touched. NOT enough.** ~291 techniques (80%) ZERO coverage.
Whole domains absent: sheet-metal(40), surfacing(32), sub-D(23), mold/die/casting(28), weldments(12).
Tribal corpus had 23 tips, 0 CAD-gen, 5 test fixtures (PURGED 23->18). CAD wiki is theory/strategy/DFM,
not a generation cookbook. Only ~1.5 galaxies (cad + cad-fusion-live's 8 Fusion bindings) are real
CAD-gen sources, prismatic-primitive core only. A generator trained on this draws a simple milled
bracket, NOT a flange/weld/parting-line/loft/draft/thread.

**Gap-closure ROI (the real "resume training" work):** (1) ingest CAD-system command references
(SolidWorks/Fusion/Onshape/Creo/NX help) -> ~7%->70% in one pass; (2) sheet-metal+weldment material;
(3) mine the JM Die corpus (24,545 files, first-party mold/die); (4) surfacing/sub-D docs; (5)
restructure CAD wiki around the 361-technique taxonomy (measurable coverage).

**METHOD CAVEAT (R12):** the 34 per-galaxy coverage agents ALL rate-limited (Anthropic server-side,
16-wide tool-heavy burst, 5.8M tokens mostly wasted -- the [[feedback_workflow_concurrency_and_local_routing_2026_06_08]]
class). The verdict is a single synthesis agent's grounded file reads, NOT 34 independent reports.

**AGENT-SPAWNING WORKAROUND (operator asked):** to spawn more agents without the Anthropic limit:
(1) batch <=4-6 concurrent, sequential batches; (2) **route mechanical agents to LOCAL Ollama**
(qwen3-coder:30b 100%/8-task; NO Anthropic RPM limit, $0, GPU-bound) -- exactly what MODEL-ROUTING-MS0
offload enables; (3) BEST: do the deterministic inventory in CODE (grep per technique-keyword),
reserve the model only for synthesis (R5) -- a coverage audit is a search problem, not a 34-agent job.

Spec: `state/shared/specs/CAD-GEN-TECHNIQUE-COVERAGE-AUDIT-2026-06-12.md`. Pairs with
[[reference_model_routing_ms0_2026_06_11]] (the offload system that IS the workaround).

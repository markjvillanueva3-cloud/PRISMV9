---
name: feedback-domains-own-ai-training-systems
description: Fleet-wide rule — every PRISM domain builds & owns its own self-improving AI training system, customized to its domain, cloned from india's ai-training galaxy (the main full-system AI = the reference template).
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.422Z
aliases: feedback_domains_own_ai_training_systems
---


**Rule (operator directive, 2026-05-29):** every PRISM domain handles its OWN AI training system, customized to that domain. India's `ai-training` galaxy (`mcp-server/src/engines/ai-training/`) is the MAIN full-system AI and the canonical TEMPLATE every domain clones. A domain does NOT defer its self-improving-AI build to india — it builds the domain-local engines + wiring itself, mirroring india's architecture.

**Why:** a domain's AI is only as good as its domain-specific knowledge / outcomes / physics. A single central AI cannot be deeply customized per domain (lathe physics ≠ WEDM discharge ≠ CAD feature-recog ≠ quoting cost models). Per-domain ownership = each loop learns from its own corpus, tribal knowledge, and real machining outcomes. India provides the proven architecture so domains CLONE, not reinvent (R8).

**Boundary (load-bearing):** the domain owns the *engines + wiring + the gated retrain-lifecycle script*. The GPU training / inference COMPUTE still defers to india's shared ai-training infra (`graphsage-train-pipeline.mjs`, the Ollama deploy path). Domains produce the training *signal* (experience ledger, fused knowledge); india runs the trainer.

**How to apply (any domain slot — foxtrot/mill, kilo/cam, mike/wedm, delta/cad, charlie/quoting, oscar/speed-feed, echo/post, hotel/business, …):**
1. Read india's template: `mcp-server/src/engines/ai-training/{CLAUDE,MEMORY}.md` + the 14-layer blueprint in [[domain-self-improving-ai-template]].
2. Inventory your domain's EXISTING AI/LoRA stack (most domains already have a partial stack — do not rebuild it).
3. Map coverage to india's layers: knowledge-extraction → semantic-context(RAG) → featurize → experience-ledger → feedback-bus → fusion → train → inference → uncertainty → model-selection → ensemble → outcome→drift→retrain-lifecycle → continual → meta-adaptation → master-orchestrator.
4. Build ONLY the MISSING layers (dedup-check first — `duplicationGuardEngine.mustCheckBeforeCreating()` THROWS); wire the closed loop through `feedbackBusEngine` (every outcome publish goes through the bus, never a direct cross-engine call); ship the gated retrain-lifecycle script (mirror `nn-graph-retrain-lifecycle.mjs`; **promote IFF `deferred===false && grade.pass===true`** — never auto-promote on regression).
5. Per-file scrutiny + 3-of-3 + commit `[<slot>] [<DOMAIN>-LORA-MS#]/U-…`.

First instance: whiskey/lathe — plan at `state/shared/specs/LATHE-SELFIMPROVE-AI-PLAN.md` ([[reference_whiskey_lathe_selfimprove_ai_plan_2026_05_29]]): loop ~90% built, 8 fusion/feedback engines + a gated lifecycle to add. Related: [[feedback_ai_training_first_before_revenue]] · [[feedback_prioritize_devtools_backend]].

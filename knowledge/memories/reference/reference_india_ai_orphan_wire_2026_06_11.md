---
name: reference_india_ai_orphan_wire_2026_06_11
description: India-AI orphan-wire sweep -- 21 dark AI engines classified (sonnet fan-out); 2 wired (KnowledgeLineage+LocalEmbedding) DATA-only; durable queue + galaxy-brain link-in
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.614Z
aliases: reference_india_ai_orphan_wire_2026_06_11
---


**INDIA-AI-ORPHAN-WIRE (slot:bravo cross-galaxy, 2026-06-11). Operator: "link in with india galaxy and do it for india."** bravo galaxy_access:all-galaxies + [[feedback_bravo_free_reign_backend_incl_india]]. The SFC-style orphan-wire treatment ([[reference_sfc_orphan_wire_sweep_2026_06_11]]) applied to india's AI-systems galaxy.

**Why orthogonal (dedup):** india's own survey (`AI-SYSTEMS-IMPROVEMENTS-2026-06-10.md` / `INDIA-CONTEXT-LEDGER.md`) is exhaustive on the NN-GRAPH deploy gate + LoRA training ("no clean runnable-now india CODE unit remains -- levers are operator/GPU-gated") but NEVER surveyed dispatcher REACHABILITY of india's AI engines. So wiring built-but-dark AI engines' DATA surfaces is a NEW axis, not a dup.

**Recon (ultracode, fallback-ladder-correct):** Workflow `wf_4ebeaa0f-2cc` -- 21 **sonnet** Explore agents (NOT Opus; mechanical read+classify routed local-tier per [[feedback_ollama_fallback_sonnet_agents]]), 757K sonnet tok. Classified all 21 dispatcher-DARK AI-net engines: **8 WIRE_SAFE_DATA, 7 exempt/inference, 8 other-domain, 1 NO_SAFE_SURFACE.** Full output in the workflow transcript dir (`tasks/wg05n04kk.output`).

**R12 INVARIANT (load-bearing, carried from SFC):** expose deterministic DATA / stats / readiness / provenance ONLY -- NEVER trained-model NN inference (india keeps inference gated until trained). Same invariant the `speedfeed_*_stats` + SFC wires honor.

**SHIPPED (prism_ai / aiReasoningDispatcher INDIA_AI_ORPHAN group):**
- **#1 KnowledgeLineageEngine `f7ae1ac016`** -- `knowledge_lineage_{report,stats,pending_conflicts}` (7/7, 2-agent PASS). Pure read-only provenance graph; getLineageReport never throws (atom:undefined for missing). Test monkeypatches the singleton's `save()`->no-op (zero disk pollution; reads never call save).
- **#2 LocalEmbeddingEngine `894be27d1f`** -- `local_embedding_{status,similarity}` (7/7, 2-agent PASS). RAG embedding backbone; status=isLoaded+getModel, similarity=cosineSimilarity (all 3 throw-conditions guarded + finite-number guard vs silent NaN). embed() NOT surfaced (lazy-loads ~90MB ONNX -> would put inference on the wire). Distinct from the prior EMBEDDING-FILTER-WIRE (that wired a CONSUMER, not the backbone).

**6 REMAINING WIRE_SAFE_DATA + exempt list:** durable queue `state/shared/specs/INDIA-AI-ORPHAN-WIRE-QUEUE-2026-06-11.md`. india can finish or leave to bravo. NEXT highest-value = IntentClassifierEngine (pure regex classifier; header docs pending U-INTENT-WIRE).

**Cross-slot finding (resolves bravo's open #6):** `SFCInferenceGateWireEngine` is in-process MIDDLEWARE (chain UltimateSpeedFeed->SFCInferenceGateWire->SFCProvenanceWire), NEVER dispatcher-wired. [[reference_sfc_inference_gate_wire_la1_2026_06_01]] claiming it's wired via `ultimate_speed_feed` is STALE/unmerged on cad-fusion-live-ms0 (grep: zero refs). Also: `ConsensusModelPerformanceEngine` is a build-unblock STUB (methods throw) -- bravo soul refuses stub-wiring.

**aiReasoningDispatcher wire gotchas (vs calcDispatcher):** (1) actions need a `*_ACTIONS as const` array + `*_SCHEMAS` Record + a `*Action` type, all spread into ALL_AI_ACTIONS/ALL_AI_SCHEMAS/the AIAction union (else the exhaustive `default: _exhaustive:never` won't compile). (2) Results wrap as `{success:true, data: slimResponse(result)}` -- payload under `.data`, empty arrays STRIPPED (ledger-wire sibling reads top-level because it routes differently). (3) test-legitimacy gate blocks `.toBeUndefined()` (empty parens) -- use `.toBe(undefined)`. (4) ASCII guard blocks em-dashes in code comments -- use `--`.

Galaxy-brain link-in: `mcp-server/src/engines/ai-training/MEMORY.md` NEW AXIS section (commit with the queue). Coordinate: india owns AI-systems (chat-bus posted).

**ECHO extension (post-processor galaxy, 2026-06-11, "do it for echo"):** applied the same axis to echo. **HONEST FINDING (R8/R12): echo's backend is ALREADY wired -- my first dark-scan was SHALLOW** (it grepped only cam/camFunction/aiReasoning dispatchers and reported "40 dark"; re-scanning across ALL dispatchers including `prism_pp`/ppDispatcher -- echo's 654-action primary surface -- gave **TRUE-DARK = 0**). Lesson: when auditing post-processor reachability ALWAYS include ppDispatcher; echo already self-applied the orphan-wire treatment (prism_pp re-registration `ab0c5d5193`). **ONE genuine gap closed:** `PPGOutcomeCaptureWireEngine` (false `// WIRE-EXEMPT`, 0 real callers -- only a doc ref in wiring/PATHS.md) -> wired `prism_pp:pp_outcome_emit` (`0777fda9d2`, 7/7, 2-agent PASS). It publishes post-emit recommendations to the cross-galaxy OutcomeCaptureBus (`domain:"post_processor"`, `kind:"recommendation_emitted"`), closing the post->india self-learning EMIT side (echo's "PUBLISHES post outcomes to india's closed loop" bridge was PHANTOM until now). Dedup-verified distinct from `pp_online_outcome` (a different OnlineLearningEngine substrate). Echo brain link-in `d3a2446685`. Remaining echo facets are blocked (MasterPost legal-gate, WEDMPost*/HurcoV11* collision, dormant slot/echo branch) -- NOT orphan-wires. **CROSS-SESSION LESSON: the false-WIRE-EXEMPT-naming-a-phantom-consumer pattern recurs across galaxies (SFC, india, echo) -- a fleet sweep for `// WIRE-EXEMPT` markers that name no real wrapper/caller would surface more dark self-learning emit/foldback engines.**

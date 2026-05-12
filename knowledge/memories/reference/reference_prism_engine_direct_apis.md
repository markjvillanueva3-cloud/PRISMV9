---
name: PRISM engine direct APIs — call before re-implementing
description: Engine methods to invoke directly (some hook-fired, some not); avoids reinventing logic
type: reference
originSessionId: cee63f1f-130d-4ed3-baf2-1d8812d9acb2
---
**Anti-duplicate / pre-create (hooks fire these on PreToolUse, but explicit calls in scripts/tools required):**
- `duplicationGuardEngine.mustCheckBeforeCreating({ assetType, proposedName, keywords, description })` — THROWS on duplicate. Required before any new engine.
- `duplicationGuardEngine.mustNotReExtract(source)` — THROWS if source already extracted. Pre-extracted: Mastercam(45), hyperMILL(25), Okuma(63), Fanuc(35), Haas(28), Titans(42).

**Self-awareness / discovery:**
- `prismSelfAwarenessEngine.recommendAIFeatures(query)` — multi-agent strategy for build/audit/investigate
- `prismSelfAwarenessEngine.searchTribalKnowledge(query)` — JM Die shop tribal tips (3,700+)
- `prismSelfAwarenessEngine.searchPlaybookRules(query)` — playbook best-practice rules
- `prismSelfAwarenessEngine.getJMDieCustomerPath(customer)` — file path for ITW/ALCOA/OPTIMAS/SFS/HOLO-KROME

**Cross-domain reasoning (use for genuinely cross-disciplinary problems, NOT single-domain physics):**
- `prismCreativeReasoningEngine.explore(problem, "optimal")` — modes: conventional → exploratory → hybrid → innovative → optimal
- 15 scientific domains, 120+ formulas via `CrossDisciplinaryDeepLearningEngine` (PID, LQR, Kalman, Johnson-Cook, NURBS, S-curve, CNN, K-means, Abbe error, etc.)

**Routing:**
- `aiSystemRouterEngine.route(task)` — picks Claude vs Ollama vs MCP dispatcher based on task class

**Master orchestrators (Tier-1 routes):**
- `MillMasterOrchestratorFacadeEngine` — unified mill routing (P1-U12)
- `MillingAGIMasterEngine` — deep reasoning for mill intent
- `MillAISelfAwarenessIntegrationEngine` — mill registry / capability lookup
- `MillFullSystemAICoordinator` (Tier-2) — sub-domain coordinator
- `machining-ai` skill — super-orchestrator coordinating 348 AI subsystems for print-to-G-code

**How to apply:**
- BEFORE creating any new engine: call `duplicationGuardEngine.mustCheckBeforeCreating()` explicitly. The PreToolUse hook fires it for Edit/Write but Bash/scripts must do it manually.
- For "what should I use for X" questions: `prismSelfAwarenessEngine.recommendAIFeatures(X)` over manual grep.
- For shop-floor problems mentioning JM Die / ITW / Alcoa: tribal-knowledge query FIRST before deriving from physics.
- For cross-domain (e.g. control + materials + ML): `prismCreativeReasoningEngine.explore(problem, "optimal")`. For pure single-domain physics, route to `prism_calc` instead.
- For mill intent: route via `mill-master` skill or `MillMasterOrchestratorFacadeEngine` rather than calling sub-engines directly.

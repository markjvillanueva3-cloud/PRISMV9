---
source: global
section: AI SYSTEM ROUTING
slug: ai-system-routing
indexed_at: 2026-04-30T16:38:31.269Z
---

## AI SYSTEM ROUTING

Default route: Claude for deep reasoning + safety; Ollama qwen2.5-coder:7b for code explain/summarize/docstring/classify/lint; Docker batch-processor for >100 files; `prism_calc` dispatcher for physics; `prism_safety:validate_physics` for safety gates; `prismCreativeReasoningEngine` for cross-domain synthesis.

**Engine APIs (direct):** `aiSystemRouterEngine.route(task)` · `prismSelfAwarenessEngine.{recommendAIFeatures,searchTribalKnowledge}(q)` · `prismCreativeReasoningEngine.explore(prob,"optimal")` · `duplicationGuardEngine.mustCheckBeforeCreating({...})` (THROWS on dup).

**Dispatchers:** `prism_calc` (physics) · `prism_cam` (toolpath) · `prism_ai` (reasoning) · `prism_safety` (S(x)) · `prism_dev` (build/test) · `prism_session` (context) · `prism_memory` (store). Full map with action counts: `DISPATCHER_DIGEST.md` or `prism_session:dispatcher_map_compact`.

---

---
source: global
section: AI SYSTEM ROUTING
slug: ai-system-routing
indexed_at: 2026-06-21T04:20:36.246Z
---

## AI SYSTEM ROUTING

Default route: Claude for deep reasoning + safety; Ollama qwen2.5-coder:32b for code explain/summarize/docstring/classify/lint (gpt-oss:120b for deep local reasoning); Docker batch-processor for >100 files; `prism_calc` dispatcher for physics; `prism_safety:validate_physics` for safety gates; `prismCreativeReasoningEngine` for cross-domain synthesis.

**FALLBACK LADDER (operator rule 2026-06-11, fleet-wide): Ollama (free) -> SONNET agent (cheap) -> Opus/higher (expensive).** If Ollama fails / is reaped / is GPU-starved, route read/search/summarize/classify/lint to a SONNET subagent (`model:'sonnet'`), NOT the session Opus. Only reasoning/planning/deep-synthesis/heavy-coding-and-building escalate to Opus/higher. NEVER silently promote mechanical work to Opus on an Ollama miss (the old "silently falls back to Claude" path is a token leak). In Workflows: mine/read/summarize agents = `model:'sonnet'`, judgment/synthesis = inherit. -> [[feedback_ollama_fallback_sonnet_agents]]

**Engine APIs (direct):** `aiSystemRouterEngine.route(task)` · `prismSelfAwarenessEngine.{recommendAIFeatures,searchTribalKnowledge}(q)` · `prismCreativeReasoningEngine.explore(prob,"optimal")` · `duplicationGuardEngine.mustCheckBeforeCreating({...})` (THROWS on dup).

**Dispatchers:** `prism_calc` (physics) · `prism_cam` (toolpath) · `prism_ai` (reasoning) · `prism_safety` (S(x)) · `prism_dev` (build/test) · `prism_session` (context) · `prism_memory` (store). Full map with action counts: `DISPATCHER_DIGEST.md` or `prism_session:dispatcher_map_compact`.

---

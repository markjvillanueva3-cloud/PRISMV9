---
source: global
section: AI SYSTEM ROUTING (utilize full AI stack)
slug: ai-system-routing-utilize-full-ai-stack
indexed_at: 2026-04-28T00:49:50.583Z
---

## AI SYSTEM ROUTING (utilize full AI stack)

### When to use which system
| Task Type | Route To | How |
|-----------|----------|-----|
| Code explanation | Ollama qwen2.5-coder:32b | `ollama-task-offloader.mjs` |
| Deep reasoning | Claude (current) | Default |
| Physics validation | `prism_safety:validate_physics` | MCP dispatcher |
| Batch processing (>100 files) | Docker batch-processor | `prism_orchestrate` |
| ML inference | Ollama codellama/deepseek | Local GPU |
| Manufacturing calcs | `prism_calc` dispatcher | 180+ physics actions |
| Creative exploration | `prismCreativeReasoningEngine` | 15 disciplines |

### AI Engine Direct API
```typescript
// Routing recommendation
aiSystemRouterEngine.route(task) // → {system, reason, confidence}

// Feature recommendation
prismSelfAwarenessEngine.recommendAIFeatures(task) // → engines[]

// Creative reasoning (complex problems)
prismCreativeReasoningEngine.explore({domain, objective, constraints}, "optimal")

// Tribal knowledge search
prismSelfAwarenessEngine.searchTribalKnowledge(query) // → tips[]

// Duplication guard (THROWS if duplicate)
duplicationGuardEngine.mustCheckBeforeCreating({assetType, proposedName, keywords})
```

### MCP Dispatcher Quick Reference
| Dispatcher | Actions | Use For |
|------------|---------|---------|
| `prism_calc` | 180+ | Force, thermal, deflection, chatter, surface |
| `prism_cam` | 120+ | Toolpath, feeds/speeds, program optimization |
| `prism_ai` | 90+ | Reasoning, learning, pattern recognition |
| `prism_safety` | 60+ | S(x) validation, collision, limit checks |
| `prism_dev` | 80+ | Build, test, quality, inventory |
| `prism_session` | 40+ | Context, handoff, coordination |
| `prism_memory` | 30+ | Persistent storage, recall, search |

Full list: `DISPATCHER_DIGEST.md` or `prism_session:dispatcher_map_compact`

---

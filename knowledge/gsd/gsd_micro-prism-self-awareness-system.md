---
source: gsd_micro
section: PRISM Self-Awareness System
slug: prism-self-awareness-system
indexed_at: 2026-04-28T02:50:03.681Z
---

## PRISM Self-Awareness System

The runtime introspection brain. Use it instead of re-deriving from
file scans:

```typescript
import { prismSelfAwarenessEngine } from "@engines/PRISMSelfAwarenessEngine";

// Routing decisions
prismSelfAwarenessEngine.recommendAIFeatures(task)
  // → engines[] ranked by relevance + confidence

// Workflow lookup
prismSelfAwarenessEngine.searchTribalKnowledge(query)
  // → tips[] from 4245-tip tribal vault

prismSelfAwarenessEngine.searchPlaybookRules(query)
  // → playbook entries

// JM Die test shop
prismSelfAwarenessEngine.getJMDieCustomerPath("ALCOA")
  // → "H:/PRISM/JM DIE/CNC LATHE/ALCOA"

// AI feature catalog
prismSelfAwarenessEngine.findAIFeature(name)
prismSelfAwarenessEngine.listAIDomains()
```

Companion engines:
- `PRISMCreativeReasoningEngine` — 6 exploration modes for cross-
  domain synthesis. Modes: conventional → exploratory → hybrid →
  innovative → optimal.
- `CrossDisciplinaryDeepLearningEngine` — 15 scientific domains, 120
  formulas. Entry point for unfamiliar physics + ML problems.
- `MetaAIOrchestrationEngine` — coordinates 150+ engines, runs
  metacognition cycles.
- `NeuralIntegrationEngine` — auto-routes to 3018 engines.

---
source: project
section: CREATIVE REASONING
slug: creative-reasoning
indexed_at: 2026-05-02T20:38:22.515Z
---

## CREATIVE REASONING

For complex problems, use cross-domain synthesis:
```typescript
import { prismCreativeReasoningEngine } from "mcp-server/src/engines/PRISMCreativeReasoningEngine.js";
const result = prismCreativeReasoningEngine.explore(problem, "optimal");
// Modes: conventional → exploratory → hybrid → innovative → optimal
```
**15 scientific domains** (control theory, materials science, robotics, ML, precision, etc.) · **120+ formulas/algorithms** (PID, LQR, Kalman, Johnson-Cook, NURBS, S-curve, CNN, K-means, Abbe error). Entry point: `CrossDisciplinaryDeepLearningEngine`.

---
schema_version: 1.0.0
source: project
section: CREATIVE REASONING
slug: creative-reasoning
start_line: 158
end_line: 166
indexed_at: 2026-05-05T13:49:55.474Z
content_hash: a589a22bf8bbd5103a8a68c29535a553db141fff13ca4bd90244a1ce94ddc60f
mirror_engine: ClaudeMdChunkerEngine
---
## CREATIVE REASONING
For complex problems, use cross-domain synthesis:
```typescript
import { prismCreativeReasoningEngine } from "mcp-server/src/engines/PRISMCreativeReasoningEngine.js";
const result = prismCreativeReasoningEngine.explore(problem, "optimal");
// Modes: conventional → exploratory → hybrid → innovative → optimal
```
**15 scientific domains** (control theory, materials science, robotics, ML, precision, etc.) · **120+ formulas/algorithms** (PID, LQR, Kalman, Johnson-Cook, NURBS, S-curve, CNN, K-means, Abbe error). Entry point: `CrossDisciplinaryDeepLearningEngine`.

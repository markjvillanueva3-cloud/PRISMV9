---
paths:
  - "**/src/tools/dispatchers/calc*"
  - "**/src/engines/calc*"
---

# PRISM Manufacturing Calculation Conventions

- All calc dispatchers use `(server as any).tool()` cast pattern
- Units: always metric (mm, m/min, N, kW) unless user specifies imperial
- Formula sources: cite MIT course skill or registry entry when applicable
- 50 calc actions available — check `calcDispatcher.ts` before adding new ones
- Cutting parameters: feed (mm/rev), speed (m/min), depth (mm), force (N)
- Always validate input ranges before calculation (no negative speeds, etc.)
- Return results with units labeled in the response

---
name: warn-collision-stub
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: mcp-server/src/tools/dispatchers/camDispatcher\.ts$
---

**[warn-collision-stub]**
**CAM dispatcher modified — check for stub/fallback results.**

SAFETY CRITICAL: The camDispatcher must never silently return stub results for safety-critical actions. Before proceeding:

1. **Search** for `?? {` fallback patterns — these indicate actions that silently return fake results when engine methods don't exist
2. **Verify** `collision_check_full` calls `checkFull(bodies, moves, margin)` (NOT `check(params)`)
3. **Verify** `stock_update` calls `create()`, `removeVolume()`, or `analyze()` (NOT `update(params)`)
4. **Verify** `nesting_optimize` calls NestingEngine.`nest()` (NOT CAMKernelEngine)
5. **Verify** `toolpath_simulate` calls ToolpathSimulationEngine.`simulate()` (NOT CAMKernelEngine)
6. **Run** wiring tests: `npx vitest run src/__tests__/cam-wiring-fixes.test.ts`

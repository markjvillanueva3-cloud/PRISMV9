Run a PRISM manufacturing safety verification:
1. Run `cd mcp-server && npx vitest run --reporter=verbose tests/safety/ 2>&1` to execute all safety tests
2. Run `node scripts/prebuild-gate.cjs` to verify all 17 critical safety files exist and are non-empty
3. Check that PFPEngine, CollisionEngine, SpindleProtectionEngine, ToolBreakageEngine are all present in src/engines/
4. Report: X/Y safety tests passing, all critical files verified, any warnings

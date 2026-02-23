Run PRISM anti-regression and wiring audit:
1. Run `cd mcp-server && node scripts/phantom-skill-detector.cjs` — check skill index integrity
2. Run `cd mcp-server && node scripts/prebuild-gate.cjs` — verify critical files
3. Run `cd mcp-server && node scripts/session_preflight.cjs` — full health check
4. Read `mcp-server/data/docs/roadmap/BUILD_SIZE_BASELINE.json` — compare current build size to baseline
5. Report: Phantoms, orphans, build size delta, critical file status, overall health

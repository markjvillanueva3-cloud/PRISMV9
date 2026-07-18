# CAD-COMPLETE-MS0/U-AI-01 — [MAIN] [CAD-COMPLETE-MS0]/U-AI-01: CADFallbackRoutingEngine — preferred→next-best CAD-app routing

**Commit:** `224f3a66e49b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T12:35:26-05:00
**Tags:** cad-complete-ms0, u-ai-01, auto-distilled

## Subject
[MAIN] [CAD-COMPLETE-MS0]/U-AI-01: CADFallbackRoutingEngine — preferred→next-best CAD-app routing

## Body
```
[MAIN] [CAD-COMPLETE-MS0]/U-AI-01: CADFallbackRoutingEngine — preferred→next-best CAD-app routing

Routes a CAD operation to a CAD app: when the preferred app is unavailable
(circuit-broken, disabled, or lacking the capability) the router picks the
next-best available + capable app by priority. Decoupled from the circuit
breaker — the caller passes the unavailable-app set, so routing stays pure
and deterministically testable. Stateful registry + stateless inline mode.

Wired into prism_cad: cad_fallback_route / register / list / reset (4 actions)
with Zod schemas. 19 tests — preferred/fallback/no-route paths, stable
priority tie-break, capability filtering, disabled-app exclusion.
```

## Files touched (5)
- .../src/engines/CADFallbackRoutingEngine.test.ts   | 151 ++++++++++++++++
- mcp-server/src/engines/CADFallbackRoutingEngine.ts | 197 +++++++++++++++++++++
- mcp-server/src/schemas/cadActionSchemas.ts         |  35 ++++
- mcp-server/src/tools/dispatchers/cadDispatcher.ts  |  41 +++++
- 4 files changed, 424 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 224f3a66e49b`
- Milestone envelope: `mcp-server/data/milestones/CAD-COMPLETE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
# BACKEND-DEVTOOLS-HVA/U-HVA-REWIRE-ITER32 — [MAIN] [BACKEND-DEVTOOLS-HVA]/U-HVA-REWIRE-ITER32: GapEscalationControllerEngine — TSC -4

**Commit:** `f05984bd593a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-15T19:56:01-05:00
**Tags:** backend-devtools-hva, u-hva-rewire-iter32, auto-distilled

## Subject
[MAIN] [BACKEND-DEVTOOLS-HVA]/U-HVA-REWIRE-ITER32: GapEscalationControllerEngine — TSC -4

## Body
```
[MAIN] [BACKEND-DEVTOOLS-HVA]/U-HVA-REWIRE-ITER32: GapEscalationControllerEngine — TSC -4

GapAnalysis (PRISMSelfAwarenessEngine.ts L131) does NOT carry `canHandle`
or `reason` fields — its actual interface is { query, hasCapability,
confidence, matches, suggestions, missingCapabilities, timestamp }.
makeDecision() was reading two non-existent properties (4 TSC errors,
silent runtime undefined).

Fix: derive the same semantics from real fields:
- canHandle ≡ gap.hasCapability (clean rename)
- reason   ≡ synthesized:
    when hasCapability=true:  "Capability available: <matches[0].capability> (N matches)"
    when hasCapability=false: "Missing capabilities: <missingCapabilities.join>"

This is also a real runtime-correctness fix — every call to makeDecision()
was constructing decisions with undefined `reason` strings being interpolated
into log messages and downstream gates.

TSC: 1140 -> 1136 (-4). Cumulative session: 1259 -> 1136 (-123).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- .../src/engines/GapEscalationControllerEngine.ts     | 20 ++++++++++++++++++--
- 1 file changed, 18 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f05984bd593a`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-DEVTOOLS-HVA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
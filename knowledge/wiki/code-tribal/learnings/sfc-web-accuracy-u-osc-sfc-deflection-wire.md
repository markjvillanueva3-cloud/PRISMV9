# SFC-WEB-ACCURACY/U-OSC-SFC-DEFLECTION-WIRE — [MAIN-FORCE] [SFC-WEB-ACCURACY]/U-OSC-SFC-DEFLECTION-WIRE (slot:oscar): fix dead frontend->backend wiring on POST /api/v1/sfc/deflection. The SFC web client (web/src/api/sfc.ts DeflectionRequest -> useSfcDeflection) posts 'stickout', but prism_calc:deflection's schema requires 'overhang_length' (the SAME quantity -- cantilever length L in delta=F*L^3/3EI). Live-verified on :3100: every frontend deflection call failed Zod ('overhang_length: expected number, received undefined'). Fix: bridgeDeflectionParams() at the route boundary maps stickout->overhang_length (deflection-SCOPED -- a global alias would break other calc actions that legitimately use 'stickout' per calcActionSchemas:1715/1746/1763; non-destructive -- never overwrites an explicit overhang_length). Carries forward to the redesign (HTTP-path fix, stable contract). 6/6 reference-value tests (map/no-overwrite/no-weaken/non-object/shallow-copy); 0 new tsc errors. Found during R16 gap-closing of the SFC frontend wiring -- siblings cycle-time (field-name) + power-torque/tool-life (machine-gate scope) flagged for follow-up.

**Commit:** `6f280e1914ae` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T10:16:26-05:00
**Tags:** sfc-web-accuracy, u-osc-sfc-deflection-wire, auto-distilled

## Subject
[MAIN-FORCE] [SFC-WEB-ACCURACY]/U-OSC-SFC-DEFLECTION-WIRE (slot:oscar): fix dead frontend->backend wiring on POST /api/v1/sfc/deflection. The SFC web client (web/src/api/sfc.ts DeflectionRequest -> useSfcDeflection) posts 'stickout', but prism_calc:deflection's schema requires 'overhang_length' (the SAME quantity -- cantilever length L in delta=F*L^3/3EI). Live-verified on :3100: every frontend deflection call failed Zod ('overhang_length: expected number, received undefined'). Fix: bridgeDeflectionParams() at the route boundary maps stickout->overhang_length (deflection-SCOPED -- a global alias would break other calc actions that legitimately use 'stickout' per calcActionSchemas:1715/1746/1763; non-destructive -- never overwrites an explicit overhang_length). Carries forward to the redesign (HTTP-path fix, stable contract). 6/6 reference-value tests (map/no-overwrite/no-weaken/non-object/shallow-copy); 0 new tsc errors. Found during R16 gap-closing of the SFC frontend wiring -- siblings cycle-time (field-name) + power-torque/tool-life (machine-gate scope) flagged for follow-up.

## Body
```
[MAIN-FORCE] [SFC-WEB-ACCURACY]/U-OSC-SFC-DEFLECTION-WIRE (slot:oscar): fix dead frontend->backend wiring on POST /api/v1/sfc/deflection. The SFC web client (web/src/api/sfc.ts DeflectionRequest -> useSfcDeflection) posts 'stickout', but prism_calc:deflection's schema requires 'overhang_length' (the SAME quantity -- cantilever length L in delta=F*L^3/3EI). Live-verified on :3100: every frontend deflection call failed Zod ('overhang_length: expected number, received undefined'). Fix: bridgeDeflectionParams() at the route boundary maps stickout->overhang_length (deflection-SCOPED -- a global alias would break other calc actions that legitimately use 'stickout' per calcActionSchemas:1715/1746/1763; non-destructive -- never overwrites an explicit overhang_length). Carries forward to the redesign (HTTP-path fix, stable contract). 6/6 reference-value tests (map/no-overwrite/no-weaken/non-object/shallow-copy); 0 new tsc errors. Found during R16 gap-closing of the SFC frontend wiring -- siblings cycle-time (field-name) + power-torque/tool-life (machine-gate scope) flagged for follow-up.
```

## Files touched (3)
- mcp-server/src/__tests__/sfc-deflection-bridge.test.ts | 54 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/sfc.ts                           | 29 ++++++++++++++++++++++++++++-
- 2 files changed, 82 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- tilever length L in delta=F*L^3/3EI). Live-verified on :3100: every frontend deflection call failed Zod ('overhang_length: expected number, received undefined'). Fix: bridgeDeflectionParams() at the route boundary maps stickout->overhang_length (deflection-SCOPED -- a global alias would break other calc actions that legitimately use 'stickout' per calcActionSchemas:1715/1746/1763; non-destructive --

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6f280e1914ae`
- Milestone envelope: `mcp-server/data/milestones/SFC-WEB-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
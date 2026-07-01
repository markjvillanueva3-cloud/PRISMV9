---
name: reference_post_ship_sfc-web-accuracy-u-osc-sfc-deflection-wire
description: Auto-distilled learnings from shipping SFC-WEB-ACCURACY/U-OSC-SFC-DEFLECTION-WIRE (commit 6f280e191). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.039Z
aliases: reference_post_ship_sfc-web-accuracy-u-osc-sfc-deflection-wire
---


# SFC-WEB-ACCURACY/U-OSC-SFC-DEFLECTION-WIRE

[MAIN-FORCE] [SFC-WEB-ACCURACY]/U-OSC-SFC-DEFLECTION-WIRE (slot:oscar): fix dead frontend->backend wiring on POST /api/v1/sfc/deflection. The SFC web client (web/src/api/sfc.ts DeflectionRequest -> useSfcDeflection) posts 'stickout', but prism_calc:deflection's schema requires 'overhang_length' (the SAME quantity -- cantilever length L in delta=F*L^3/3EI). Live-verified on :3100: every frontend deflection call failed Zod ('overhang_length: expected number, received undefined'). Fix: bridgeDeflectionParams() at the route boundary maps stickout->overhang_length (deflection-SCOPED -- a global alias would break other calc actions that legitimately use 'stickout' per calcActionSchemas:1715/1746/1763; non-destructive -- never overwrites an explicit overhang_length). Carries forward to the redesign (HTTP-path fix, stable contract). 6/6 reference-value tests (map/no-overwrite/no-weaken/non-object/shallow-copy); 0 new tsc errors. Found during R16 gap-closing of the SFC frontend wiring -- siblings cycle-time (field-name) + power-torque/tool-life (machine-gate scope) flagged for follow-up.

**Shipped:** 2026-06-25T10:16:26-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[sfc-web-accuracy-u-osc-sfc-deflection-wire]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._
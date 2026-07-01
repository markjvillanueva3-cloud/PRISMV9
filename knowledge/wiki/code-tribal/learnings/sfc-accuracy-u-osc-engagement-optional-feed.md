# SFC-ACCURACY/U-OSC-ENGAGEMENT-OPTIONAL-FEED — [MAIN-FORCE] [SFC-ACCURACY]/U-OSC-ENGAGEMENT-OPTIONAL-FEED (slot:oscar): prism_calc:engagement schema over-required feed_per_tooth/cutting_speed for a GEOMETRIC calc -> dead-wires the SFC web /engagement endpoint

**Commit:** `3da3bcc600d5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T17:23:36-05:00
**Tags:** sfc-accuracy, u-osc-engagement-optional-feed, auto-distilled

## Subject
[MAIN-FORCE] [SFC-ACCURACY]/U-OSC-ENGAGEMENT-OPTIONAL-FEED (slot:oscar): prism_calc:engagement schema over-required feed_per_tooth/cutting_speed for a GEOMETRIC calc -> dead-wires the SFC web /engagement endpoint

## Body
```
[MAIN-FORCE] [SFC-ACCURACY]/U-OSC-ENGAGEMENT-OPTIONAL-FEED (slot:oscar): prism_calc:engagement schema over-required feed_per_tooth/cutting_speed for a GEOMETRIC calc -> dead-wires the SFC web /engagement endpoint

SFC-web-prove-100% audit of the SFC API client (web/src/api/sfc.ts -> 7 endpoints) vs the backend schemas
(the dead-wiring class fixed this session for deflection + cycle-time). Result: surface-finish CLEAN
(fields match exactly); ENGAGEMENT dead-wired. The SFC web EngagementRequest posts only
{ tool_diameter, radial_depth, strategy? } (engagement geometry is purely geometric: arc/entry/exit/radial%
= D + ae + climb), but the `engagement` Zod schema REQUIRED feed_per_tooth + cutting_speed (posNum) -> every
geometry-only call fails Zod ("feed_per_tooth: Required"). Physically wrong: fz/Vc only drive the SECONDARY
chip-thickness + effective-speed outputs the geometry request does not consume. (Latent: no web page calls
useSfcEngagement today, but the API + prism_calc:engagement MCP action are exposed and would fail.)

FIX: feed_per_tooth + cutting_speed -> optPosNum in the engagement schema; `calculateEngagementAngle` makes
feed_per_tooth OPTIONAL (`feed_per_tooth?`) + `const fz = feed_per_tooth ?? 0`, so the chip-thickness outputs
report 0 (never NaN: undefined*sin = NaN was the trap) and the spurious "chip thickness very thin" warning is
guarded behind a real feed. The engagement GEOMETRY formulas are UNCHANGED (no physics-formula change).
cutting_speed was already optional in the engine signature (effective_cutting_speed = cutting_speed || 0).
Backward-compatible: making a required positional param optional never breaks existing callers (all of which
pass fz -- calcDispatcher + the toolpath-calculations tests).

VALIDATION: 86/86 (route-contract-sfc-speedfeed + toolpath-calculations) incl 3 new R9 cases (schema accepts
geometry-only + with-feed; engine geometry-only returns valid arc + 0 chip-thickness + no NaN + no spurious
warning; with-feed still positive chip-thickness) + all 13 existing engagement engine tests; tsc exit 0.
Blast radius: calculateEngagementAngle called only by calcDispatcher + tests (verified). 3rd SFC-web dead-wiring
fixed this session (after deflection + cycle-time); the SFC API surface audit is the "prove-100%" discipline.
```

## Files touched (4)
- mcp-server/src/__tests__/route-contract-sfc-speedfeed.test.ts | 34 ++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/ToolpathCalculations.ts                | 15 ++++++++++-----
- mcp-server/src/schemas/calcActionSchemas.ts                   |  9 +++++++--
- 3 files changed, 51 insertions(+), 7 deletions(-)

## Lessons surfaced in commit body
- wrong: fz/Vc only drive the SECONDARY
- till positive chip-thickness) + all 13 existing engagement engine tests; tsc exit 0.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3da3bcc600d5`
- Milestone envelope: `mcp-server/data/milestones/SFC-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._
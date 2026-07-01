---
name: reference-u-cw-01-false-positive-2026-05-20
description: MS-CRITWIRE/U-CW-01 (MachineAwareSpeedFeedEngine wire) is a BUILD_STATE.NEEDS_WIRING false positive — engine has an explicit WIRE-EXEMPT marker and is already consumed by middleware/sfcOutcomeWire.ts. Verify consumers before wiring an engine flagged as needs-wiring.
aliases: reference_u_cw_01_false_positive_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.236Z
---


**2026-05-20 juliett `claude-2e325ed5`.** MS-CRITWIRE::U-CW-01 says wire `MachineAwareSpeedFeedEngine` → `prism_calc` + `prism_safety` (claim age 214h, 1605 commits since gen — `--ack-stale` bypass got past the freshness gate). On read, the engine file at `mcp-server/src/engines/MachineAwareSpeedFeedEngine.ts:525-528` carries an explicit `// WIRE-EXEMPT: internal speed/feed constraint layer — consumed programmatically by the SFC outcome-wire middleware (src/middleware/sfcOutcomeWire.ts); not a standalone MCP dispatcher action.` Verified: `middleware/sfcOutcomeWire.ts` exists (1.8KB) and 4 consumers reference the engine (sfcOutcomeWire.ts + SFCOutcomeCaptureWireEngine.ts + 3 tests). Engine is NOT actually unwired — it's middleware-tier, exactly as the marker says.

**Lesson.** Same class as the documented [[reference_u_wire_swarm_group_2026_05_18]] regression: "BUILD_STATE.NEEDS_WIRING has false positives — grep -rl before wiring." Sister rule: any engine carrying `// WIRE-EXEMPT:` is by definition NOT in the unwired backlog and must be excluded from `audit-unwired-engines.mjs` results (verify the audit honors the marker before picking the next U-CW-*).

**Why (R12 fail-loud).** Wiring a WIRE-EXEMPT engine would (a) duplicate the middleware path with no behavior gain, (b) bypass the SFC outcome-capture layer the marker exists to preserve, (c) entrench a doctrine-violating action in `z.enum` that future cleanup can't easily remove. Better to close the unit as false-positive with this paper trail than to silently ship a no-value action.

**Apply.** Before claiming any MS-CRITWIRE::U-CW-* unit: `rtk grep -nE "WIRE-EXEMPT" mcp-server/src/engines/<Engine>.ts` → if hit, close-out as false-positive (this memory + a CLOSE-OUT-DEFERRED entry); do NOT call `--ack-stale` past the freshness gate without re-verifying the engine is genuinely unwired.

**Action taken.** U-CW-01 closed as false positive; slot-task claim released; iter 2 picks a different juliett speed-feed unit (a real backend-dev one, not a middleware-already-wired one).
